import type { CharState } from "./figure";
import type { Arm, Pose } from "./poses";

/**
 * Acting layer (R15, review round 4 "characters don't act": one held pose + a face swap for 1.5-3 s read as cheap).
 * Pose-to-pose: on stressed words, at most one key every MIN_GAP frames, the body moves to a new ATTITUDE (weight
 * shift, lean in, head tilt, shrug, look away) and, when an arm hangs free and nothing is held, a hand gesture. Each
 * key has a 3-frame anticipation the other way, hits on the word with a small overshoot and settles; the attitude
 * holds until the next key (refs: hold, then move). Breathing runs under everything. Added on top of whatever pose
 * the role computed, so action poses (kick, knock, tape) keep their own arms and only gain body life.
 */
type Attitude = { sway: number; lean: number; tilt: number; bob: number; shrug: number; look: number; arm?: Arm };
const ATTITUDES: Attitude[] = [
  { sway: 5, lean: 0, tilt: -6, bob: -3, shrug: 0, look: 0.15, arm: { at: [0.5, 0.35], grip: "open" } }, // open palm, "see?"
  { sway: -4, lean: 0.25, tilt: 5, bob: 2, shrug: 0, look: -0.1 }, // lean in
  { sway: 2, lean: 0, tilt: 8, bob: 0, shrug: 6, look: 0, arm: { at: [0.42, 0.12], grip: "open" } }, // shrug, hand up
  { sway: -6, lean: 0.1, tilt: -4, bob: -4, shrug: 0, look: -0.2, arm: { at: [0.38, 0.0], grip: "point" } }, // point out
  { sway: 3, lean: 0.15, tilt: 0, bob: 3, shrug: 3, look: 0.2 }, // perk up
  { sway: -2, lean: 0, tilt: 7, bob: -2, shrug: 0, look: 0.05, arm: { at: [-0.12, -0.45], grip: "mitt", layer: "front" } }, // hand to chin
];
const MIN_GAP = 30; // frames between keys (~1 s): faster reads as jitter
const NEUTRAL: Attitude = { sway: 0, lean: 0, tilt: 0, bob: 0, shrug: 0, look: 0 };

/** Key frames from word starts: the first stressed word at least MIN_GAP after the previous key. */
export const actingKeys = (words: { text: string; start: number }[], fps = 30): number[] => {
  const keys: number[] = [];
  for (const w of words) {
    const t = w.text.replace(/[^A-Za-z0-9*]/g, "");
    const stressed = t.includes("*") || t.length >= 5 || /^[0-9]+$/.test(t);
    const f = Math.round(w.start * fps);
    if (stressed && (keys.length === 0 || f - keys[keys.length - 1] >= MIN_GAP)) keys.push(f);
  }
  return keys;
};

const free = (a: Arm) => Math.abs(a.at[0] - 0.2) < 0.06 && a.at[1] > 0.85 && !a.grip && !a.layer;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Attitude, b: Attitude, t: number): Attitude => ({
  sway: lerp(a.sway, b.sway, t), lean: lerp(a.lean, b.lean, t), tilt: lerp(a.tilt, b.tilt, t),
  bob: lerp(a.bob, b.bob, t), shrug: lerp(a.shrug, b.shrug, t), look: lerp(a.look, b.look, t),
});
/** 0 -> 1 over 8 frames from the key, with a 3-frame dip before it (anticipation) and 10 % overshoot. */
const hit = (d: number) => {
  if (d < -3) return 0;
  if (d < 0) return -0.18 * Math.sin(((d + 3) / 3) * Math.PI);
  if (d < 8) { const s = d / 8; return 1.1 * s * s * (3 - 2 * s); } // eased move, ~2.5 deg/f at most
  return d < 16 ? 1.1 - 0.1 * ((d - 8) / 8) : 1;
};

/**
 * `p` acted at frame F. `keys` from actingKeys (shared by everyone on screen; `seed` shifts the choice of attitude and
 * offsets the key by 0-2 frames so two characters never move in lockstep). `amount` 0..1 scales it (0 = off).
 */
export const act = (p: Pose, F: number, keys: number[], seed: number, opts: { hasProp?: boolean; amount?: number } = {}): Pose => {
  const amount = opts.amount ?? 1, off = seed % 3;
  let i = -1;
  for (let k = 0; k < keys.length; k++) if (keys[k] + off - 3 <= F) i = k; else break;
  const pick = (k: number) => (k < 0 ? NEUTRAL : ATTITUDES[(k * 5 + seed * 3) % ATTITUDES.length]);
  const cur = pick(i), prev = pick(i - 1);
  const h = i < 0 ? 0 : hit(F - keys[i] - off);
  const a = mix(prev, cur, h);
  const breathe = 1.6 * Math.sin((F / 30) * Math.PI * 2 * 0.28 + seed);
  const out: Pose = {
    ...p,
    sway: p.sway + amount * a.sway,
    lean: (p.lean ?? 0) + amount * a.lean,
    tilt: (p.tilt ?? 0) + amount * a.tilt,
    bob: p.bob + amount * (a.bob + breathe),
    shrug: (p.shrug ?? 0) + amount * a.shrug,
    look: Math.max(-1, Math.min(1, p.look + amount * a.look)),
  };
  // A free arm takes the key's gesture (the right arm: arm 1), blended in and out with the attitude.
  const g = cur.arm, gp = prev.arm, arm = p.arms[1];
  if (!opts.hasProp && free(arm) && (g || gp)) {
    const from = gp ?? arm, to = g ?? arm, t = Math.max(0, Math.min(1, h));
    const at: [number, number] = [lerp(from.at[0], to.at[0], t), lerp(from.at[1], to.at[1], t)];
    out.arms = [p.arms[0], { ...(t > 0.5 ? to : from), at }];
  }
  return out;
};

/**
 * Body language per emotion (R21, visual-ref7): the face never acts alone. A laugh rocks the whole body with the head
 * a beat behind (5.4-7.0 s, 22.4-24.0 s), crying shakes the shoulders, fear shrinks and trembles, a shock jumps,
 * pride lifts the chest, sadness droops, scheming rocks slowly. t = seconds (phase-shifted per character so two
 * people never move in lockstep), f = frames since the emotion began. Arms are never touched (held props stay put).
 */
type Body = { sway?: number; bob?: number; tilt?: number; lean?: number; shrug?: number; squash?: number };
const w = (t: number, hz: number, ph = 0) => Math.sin(2 * Math.PI * hz * t + ph);
const take = (f: number) => (f < 0 || f > 3 ? 0 : [1, -0.8, -0.3, 0.1][Math.floor(f)]); // = poses.reactSquash
const EMOTES: Record<string, (t: number, f: number) => Body> = {
  // Measured on the first motion test (R21): +-7 deg read as a sway, not a laugh, on a medium two-shot; the ref rocks ~15.
  laughing: (t, f) => ({ sway: 11 * w(t, 1.7), tilt: 9 * w(t, 1.7, -1.0), bob: 11 * Math.abs(w(t, 3.4)), shrug: 8 * Math.abs(w(t, 3.4, 0.5)), squash: 0.8 * take(f) }),
  crying: (t) => ({ sway: 1.5 * w(t, 4.5), shrug: 5 * Math.abs(w(t, 4.5)), bob: -8 + 2 * w(t, 4.5), tilt: 8 }),
  shocked: (t, f) => ({ bob: 32 * Math.exp(-f / 6), squash: 1.3 * take(f), shrug: 12 * (1 - Math.exp(-f / 4)), sway: 1.2 * w(t, 6) }),
  scared: (t) => ({ sway: 1.2 * w(t, 6), shrug: 9, bob: -5, squash: 0.25 }),
  nervous: (t) => ({ sway: 0.9 * w(t, 5.5), shrug: 6, bob: -3, tilt: 3 * w(t, 0.5) }),
  worried: (t) => ({ shrug: 4, tilt: 5, sway: 1.5 * w(t, 0.4) }),
  excited: (t) => ({ bob: 12 * Math.abs(w(t, 2.4)), sway: 4 * w(t, 1.2), shrug: 4 }),
  proud: (t) => ({ bob: 6, tilt: -4, sway: 2 * w(t, 0.35), shrug: -2 }),
  smug: (t) => ({ bob: 4, tilt: -5 + 2 * w(t, 0.3), sway: 1.5 * w(t, 0.3) }),
  sad: (t) => ({ bob: -10, tilt: 9, shrug: -3, lean: 0.1, sway: 1.2 * w(t, 0.25) }),
  tired: (t) => ({ bob: -8, tilt: 6, shrug: -2, sway: 2 * w(t, 0.3) }),
  angry: (t) => ({ lean: 0.35, shrug: 7, bob: -3, sway: 1 * w(t, 7) }),
  scheming: (t) => ({ lean: 0.3, shrug: 6, sway: 3 * w(t, 0.7), tilt: 5 * w(t, 0.7, -0.8) }),
  sneaky: (t) => ({ lean: 0.25, shrug: 7, bob: -6, sway: 2 * w(t, 0.8) }),
  determined: () => ({ lean: 0.2, bob: 3, shrug: 2 }),
  pleading: (t) => ({ tilt: 10, shrug: 6, bob: -3, sway: 2 * w(t, 1.0) }),
  disgusted: () => ({ tilt: -8, shrug: 5, bob: 2 }),
  confused: (t) => ({ tilt: 11, sway: -2 + 1 * w(t, 0.4) }),
  relieved: (_t, f) => ({ bob: -6 * Math.min(1, f / 10), shrug: -4, tilt: 4 }),
  grin: (t) => ({ bob: 3, sway: 1.5 * w(t, 0.5) }),
  suspicious: () => ({ tilt: -6, lean: 0.15 }),
};
const ONSET = 8; // frames an emotion's body takes to arrive (and the previous one to leave)
/**
 * The performer: everything the face says, the body says too. On top of the role's pose: the emotion's body
 * (crossfading from the previous emotion over 8 frames) and, while the character speaks (`fx.talk`), small nods on
 * the open syllables (visual-ref7 40.5-42 s). `e` = exprAt's `since` and `prev`; without it the body starts at once.
 * Hands and held props are never touched; `amount` scales it (0 = off, 0.5 for crowds/extras).
 */
export const perform = (s: CharState, F: number, seed: number, e: { since?: number; prev?: string } = {}, amount = 1): CharState => {
  const f = e.since === undefined ? 99 : F - e.since, t = (F + seed * 17) / 30;
  const r = f >= ONSET ? 1 : f <= 0 ? 0 : (f / ONSET) ** 2 * (3 - (2 * f) / ONSET);
  const cur = EMOTES[s.expr]?.(t, f) ?? {}, prev = r < 1 && e.prev ? EMOTES[e.prev]?.(t, f + 99) ?? {} : {};
  const v = (k: keyof Body) => amount * ((cur[k] ?? 0) * r + (prev[k] ?? 0) * (1 - r));
  const open = s.fx.talk?.open ?? 0, p = s.pose;
  const pose: Pose = {
    ...p,
    sway: p.sway + v("sway"),
    bob: p.bob + v("bob") + 4 * amount * open,
    tilt: (p.tilt ?? 0) + v("tilt") + 2.5 * amount * open * w(t, 0.6),
    lean: Math.max(0, Math.min(1, (p.lean ?? 0) + v("lean"))),
    shrug: (p.shrug ?? 0) + v("shrug"),
    squash: (p.squash ?? 0) + v("squash"),
  };
  return { ...s, pose };
};

/**
 * R28 follow-through (user 2026-11-21: "a much more fluid body movement"; refs: heads and hands trail the body, bodies
 * settle after a move). Wraps a role's state function: the head and arms are low-pass copies of the body (an
 * exponential lag over the last `lag` frames), so when the body sways, bobs or jumps the head tilts against it and the
 * hands drag behind, then catch up. Frame-driven: it re-reads `stateAt` for earlier frames, no stored state.
 * `k` scales it (crowds .5). Use as the last step: `const st = (F) => flow(raw, F)`.
 */
export const flow = (stateAt: (F: number) => CharState, F: number, k = 1, lag = 10): CharState => {
  const s = stateAt(F), p = s.pose;
  let w = 0, sway = 0, bob = 0, sq = 0;
  for (let i = 1; i <= lag; i++) {
    const q = stateAt(F - i).pose, a = Math.exp(-i / 3.2);
    w += a;
    sway += a * q.sway;
    bob += a * q.bob;
    sq += a * (q.squash ?? 0);
  }
  sway /= w;
  bob /= w;
  sq /= w;
  const dSway = (p.sway - sway) * k, dBob = (p.bob - bob) * k;
  return {
    ...s,
    pose: {
      ...p,
      tilt: (p.tilt ?? 0) - 0.7 * dSway, // the head lags the lean
      shrug: (p.shrug ?? 0) - 0.25 * dBob, // shoulders drop a beat late on a rise, lift on a drop
      squash: (p.squash ?? 0) + 0.35 * ((p.squash ?? 0) - sq) * k,
      arms: p.arms.map((a) => ({ ...a, at: [a.at[0] - 0.006 * dSway, a.at[1] + 0.0025 * dBob] })) as typeof p.arms, // hands trail
    },
  };
};

/**
 * Eased heading changes: [frame, heading (rad)] keys; each turn takes `len` frames on a smootherstep along the
 * shorter way round (R28: headings that jump read as a card flipping, refs turn through the 3/4 views).
 */
export const turnTo = (keys: [number, number][], F: number, len = 12) => {
  let h = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f, to] = keys[i];
    if (F < f) break;
    const t = Math.min((F - f) / len, 1), e = t * t * t * (t * (t * 6 - 15) + 10);
    let d = to - h;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    h = h + d * e;
  }
  return h;
};
