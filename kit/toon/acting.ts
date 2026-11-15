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
