import { Object3D, Vector3 } from "three";
import { flow, perform, turnTo } from "../../../kit/toon/acting";
import { CamPose, glide } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Hand, Look } from "../../../kit/toon/cast";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import { headHeight } from "../../../kit/toon/figure";
import type { MovingProp } from "../../../kit/toon/guard";
import { POSES, REST, alive, moveCurve, movePose, reactSquash, walkPose } from "../../../kit/toon/poses";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import SCRIPT from "../../../videos/antwerp-diamond-heist/script.json";
import MOUTH from "../../../videos/antwerp-diamond-heist/voice/mouth.json";
import WORDS from "../../../videos/antwerp-diamond-heist/voice/words.json";
import { copLook, geniusLook, guardLook, kingLook, monsterLook, oldManLook, speedyLook, youSuit } from "./cast";
import { V } from "./common";
import { OLD_MAN, PILE, SANDWICH } from "./outside";
import { HEAP, OFFICE_DOOR, TABLE } from "./rooms";
import type { WorldState } from "./scene";
import { CRATE_TOP, DOOR, GUARD_SEAT, LADDER, SENSOR } from "./vault";

/**
 * antwerp-diamond-heist (episode 6, strange true history), timing + cast. Every beat is locked to words.json through the
 * script's lines: L(line, word) = composition frame of that word's start. Shots live in shots.ts.
 */
export const FPS = 30;
export const words: CaptionWord[] = WORDS as CaptionWord[];
export const MOUTH_T = MOUTH as MouthFrame[];
const LINE_START: number[] = [];
{
  let i = 0;
  for (const l of SCRIPT.lines as { narration: string; spoken?: string }[]) {
    LINE_START.push(i);
    i += (l.spoken ?? l.narration.replace(/\*/g, "")).replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter(Boolean).length;
  }
  if (i !== words.length) throw new Error(`script has ${i} words, words.json ${words.length}`);
}
export const L = (n: number, k = 0) => Math.round(words[LINE_START[n - 1] + k].start * FPS);
const LE = (n: number, k: number) => Math.round(words[LINE_START[n - 1] + k].end * FPS);
const lastWord = (n: number) => (n < LINE_START.length ? LINE_START[n] - 1 : words.length - 1) - LINE_START[n - 1];
export const LEND = (n: number) => LE(n, lastWord(n));
export const LAST = Math.round(words[words.length - 1].end * FPS);
export const FRAMES = LAST + 8;
export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const span = (F: number, a: number, b: number) => glide((F - a) / Math.max(b - a, 1));
export const lerpV = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t);
const WORD_F = words.map((x) => Math.round(x.start * FPS));
const SNAP = new Map<number, number>();
/** One frame before the first word starting at or after k (reactions land 0-3 f before their word). */
export const snap = (k: number) => {
  let v = SNAP.get(k);
  if (v === undefined) { const w = WORD_F.find((x) => x >= k); v = w === undefined ? k : w - 1; SNAP.set(k, v); }
  return v;
};

// ------------------------------------------------------------------ story beats
export const B = {
  hundred: L(1, 3), spray: L(1, 6), sandwich: L(2, 10), gta: L(3, 13), history: L(3, 6),
  ten: L(4, 0), heat: L(4, 4), radar: L(4, 6), magnets: L(4, 7), combos: L(5, 7), dollar: L(5, 11),
  years: L(6, 7), glass: L(7, 5), serious: L(7, 11), belgium: L(7, 14), dealer: L(8, 8), vaultKey: L(8, 13),
  day1: L(9, 3), day10: L(9, 8), day500: L(9, 12), up: L(9, 19),
  genius: L(10, 5), monster: L(10, 9), king: L(10, 13), keys: L(10, 18), pigeons: L(11, 7), panics: L(11, 5),
  showtime: L(13, 5), blind: L(14, 18), breath: L(14, 13), foam: L(15, 10), box: L(15, 18), tape: L(16, 7),
  plate: L(17, 5), opened: L(17, 16), opens: L(18, 7), nobody: L(18, 8), boxes: L(19, 1), sunrise: L(19, 4), diamonds: L(19, 12),
  trash: L(20, 12), forest: L(21, 8), panicsS: L(22, 2), flings: L(22, 8), drive: L(23, 0), hates: L(24, 14), police: L(24, 20),
  envelopes: L(25, 3), tape25: L(25, 8), name: L(25, 14), remember: L(26, 1), dna: L(26, 10), speedy27: L(27, 9), because: L(27, 7),
  cuffs: L(28, 5), found: L(28, 12), hairspray29: L(29, 6), end: L(30, 4),
};
/** What the sets show at frame F. */
export const worldAt = (F: number): WorldState => ({
  door: F < B.opens - 22 || F >= L(20, 0) ? 0 : clamp01((F - B.opens + 22) / 30) ** 1.5,
  dial: F < L(5, 0) ? 0 : F < L(6, 0) ? (F - L(5, 0)) * 0.18 : F >= L(18, 0) && F < B.opens - 22 ? Math.floor((F - L(18, 0)) / 7) * 0.62 : 2.1,
  rings: F >= B.ten - 2 && F < L(5, 0) ? Math.min(10, Math.floor((F - B.ten + 2) / 4)) : 0,
  heat: (F >= B.heat - 2 && F < L(5, 0)) || (F >= L(15, 0) && F < L(16, 0)),
  radar: F >= B.radar - 2 && F < L(5, 0) ? F - B.radar : null,
  mag: (F >= B.magnets - 2 && F < L(5, 0)) || (F >= L(17, 0) && F < L(18, 0)),
  plate: F >= B.plate - 1 && F < L(28, 0),
  tape: F >= B.tape - 1 && F < L(28, 0),
  fogLens: F >= B.spray && F < L(6, 0) || F >= L(14, 0),
  heatLed: !(F >= L(14, 0) && F < L(29, 6)),
  lightLed: !(F >= B.tape - 1 && F < L(28, 0)),
  boxes: F < B.boxes ? 0 : (F - B.boxes) * 1.6,
  loot: F >= B.sunrise - 30 && F < L(20, 0),
  cal: F < L(6, 0) ? 0 : F < B.day10 - 4 ? 1 : F < B.day500 - 4 ? 2 : F < L(10, 0) ? 3 : 4,
  cups: F < B.years - 4 ? 0.25 : 0.25 + 0.75 * span(F, B.years - 4, B.years + 26),
  officeDoor: F < L(28, 0) + 4 ? 0 : clamp01((F - L(28, 0) - 4) / 6),
  hatch: F < L(21, 8) ? 0 : clamp01((F - L(21, 8)) / 14),
  litter: F >= B.flings + 6,
  horror: F < L(3, 0),
  torch: null, // the flashlight pool is a shot prop (shots.ts torch)
  lightsOn: (F >= L(8, 0) && F < L(10, 0)) || (F >= L(28, 0) && F < L(29, 0)),
});

// ------------------------------------------------------------------ roles
export type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean };
/** Expression keys snap to one frame before the next word (reactions land on their word). */
export const st = (pose: Pose, F: number, seed: number, keys: [number, Expr][], extra: Partial<CharState> = {}, act = 1): CharState => {
  const e = exprAt<Expr>(keys.map(([k, x], i) => [i ? snap(k) : k, x] as [number, Expr]), F, seed);
  return perform({ pose, expr: e.expr, blink: e.blink, fx: {}, ...extra }, F, seed, e, act);
};
/** Keyed poses: R28 10-frame moves with anticipation and overlap. */
export const pose = (keys: [number, Pose][], F: number): Pose => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  let out = keys[i][1];
  if (i > 0 && F - keys[i][0] < 18) { const d = F - keys[i][0] + 4; out = movePose(keys[i - 1][1], out, moveCurve(d), moveCurve(d - 2), moveCurve(d - 4)); }
  return out;
};
export const role = (name: string, look: Look, at: Vector3 | ((F: number) => Vector3), raw: (F: number) => CharState, o: { sit?: boolean } = {}): Role => ({
  name, look, at: typeof at === "function" ? at : () => at.clone(), sit: o.sit,
  state: (F) => { const s = flow(raw, F); return o.sit ? { ...s, pose: { ...s.pose, sit: 1 } } : s; },
});
export const SIT: Pose = { ...REST, sit: 1 };
export const face = (from: Vector3, to: Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
export const arms = (l: [number, number], r: [number, number], o: { gl?: Pose["arms"][0]["grip"]; gr?: Pose["arms"][0]["grip"]; front?: boolean } = {}): Pose["arms"] =>
  [{ at: l, grip: o.gl ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }, { at: r, grip: o.gr ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }];
export const headOf = (r: Role, F: number) => r.at(F).add(V(0, headHeight(r.look, r.state(F).pose), 0));
/** A walker from a to b between frames f0 and f1 (strides, ramps in and out). */
const walker = (a: Vector3, b: Vector3, f0: number, f1: number) => ({
  at: (F: number) => lerpV(a, b, span(F, f0, f1)),
  pose: (F: number, base: Pose = REST) => (F <= f0 || F >= f1 + 10 ? base : walkPose(a.distanceTo(b) * span(F, f0, f1), Math.min(clamp01((F - f0) / 10), clamp01((f1 + 10 - F) / 12)))),
  heading: face(a, b),
});
const talk = (F: number, line: number) => talkAt(MOUTH_T, F, [[L(line, 0), LEND(line)]]);

// --- you
const SPRAY: Pose = { ...REST, arms: [{ at: [0.2, 0.3], grip: "open" }, { at: [0.62, -0.5], grip: "fist" }], tilt: -6, look: 0.4 };
export const YOU_LADDER = V(LADDER.x, CRATE_TOP, LADDER.z);
export const youLadder = role("you", youLook, YOU_LADDER, (F) => {
  const p = pose([[0, SPRAY], [B.sandwich - 30, { ...SPRAY, arms: [SPRAY.arms[0], { at: [0.3, 0.05], grip: "fist" }], tilt: 4 }], [L(3, 0), { ...REST, arms: [{ at: [0.62, -0.5], grip: "open" }, { at: [0.3, 0.05], grip: "fist" }], sway: -4 }], [B.gta - 8, { ...POSES.point, arms: [{ at: [0.62, -0.5], grip: "open" }, { at: [0.5, -0.1], grip: "point" }] }]], F);
  return st(alive(p, F, 3, [0.4, 0.1]), F, 3, [[0, "sneaky"], [B.hundred, "scheming"], [B.spray, "grin"], [L(2, 2), "suspicious"], [L(2, 6), "nervous"], [B.sandwich, "confused"], [L(3, 0), "smug"], [B.history, "proud"], [B.gta, "grin"]], { heading: F < L(3, 0) ? 0.45 : turnTo([[L(3, 0), 0.45], [L(3, 0) + 14, -0.4]], F, 14) });
});
const YOU_CUPS = V(1.05, 0, -1.25);
export const youCups = role("you", youLook, YOU_CUPS, (F) => {
  const p = pose([[0, POSES.hips], [B.years - 6, { ...REST, arms: [{ at: [0.62, -0.2], grip: "open" }, REST.arms[1]], tilt: 6 }]], F);
  return st(alive(p, F, 3, [0.6, 0.2]), F, 3, [[0, "tired"], [B.years, "shocked"], [B.years + 20, "proud"]], { heading: 0.4 });
});
export const YOU_MIRROR = V(0.25, 0, 0.6);
const LOUPE: Pose = { ...REST, arms: [REST.arms[0], { at: [0.08, -0.6], grip: "fist", layer: "front" }], tilt: -3 };
export const youMirror = role("you", youSuit, YOU_MIRROR, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.3, 0.05], [0.3, 0.05], { gl: "open", gr: "open" }) }], [B.glass - 8, LOUPE]], F);
  return st(p, F, 3, [[0, "proud"], [L(7, 3), "smug"], [B.glass, "suspicious"], [B.serious, "deadpan"], [L(7, 13), "determined"], [B.belgium, "grin"]], { heading: Math.PI / 2 });
});
export const YOU_DESK = V(-0.8, 0, -0.95);
export const youDesk = role("you", youSuit, YOU_DESK, (F) => st(alive(pose([[0, POSES.hips], [L(8, 3) - 4, { ...POSES.point, arms: [REST.arms[0], { at: [0.6, 0.05], grip: "point" }] }], [B.dealer - 4, { ...POSES.hips, tilt: 8, bob: 6 }]], F), F, 3, [0.5, 0.2]), F, 3, [[0, "proud"], [L(8, 3), "excited"], [B.dealer, "smug"]], { heading: 0.5 }));
// line 8b: your open hand at the guard desk (the key slides into it)
export const YOU_COUNTER = V(-0.2, 0, 7.75);
export const youCounter = role("you", youSuit, YOU_COUNTER, (F) => st({ ...REST, arms: [REST.arms[0], { at: [0.55, 0.2], grip: "open" }] }, F, 3, [[0, "smug"], [B.vaultKey, "grin"]], { heading: Math.PI / 2 }));
// line 9: three visits on one framing, each a walk from the stairs toward the vault
const VISIT = (a: number, b: number) => walker(V(-0.2, 0, 8.8), V(-0.15, 0, 6.6), a, b);
const V1 = VISIT(L(9, 3) - 12, L(9, 8) - 2), V2 = VISIT(L(9, 8) - 6, L(9, 12) - 4), V3 = VISIT(L(9, 12) - 8, L(10, 0) - 6);
const visit = (F: number) => (F < L(9, 8) - 6 ? V1 : F < L(9, 12) - 8 ? V2 : V3);
export const youVisits = role("you", youSuit, (F) => visit(F).at(F), (F) => { const v = visit(F); return st(v.pose(F), F, 3, [[0, "nervous"], [B.day10, "smug"], [B.day500, "grin"]], { heading: v.heading }); });
// line 12, 20, 27: in the hideout
export const YOU_HIDE = V(0.95, 0, 1.45);
export const YOU_DAWN = V(-0.35, 0, -0.85);
export const youHide = role("you", youLook, (F) => (F >= L(20, 0) && F < L(27, 0) ? YOU_DAWN.clone() : YOU_HIDE.clone()), (F) => {
  if (F < L(20, 0)) {
    // line 12: Speedy clutches your sleeve; you pat his shoulder, smug
    const p = pose([[0, REST], [L(12, 2), { ...REST, arms: [REST.arms[0], { at: [-0.55, -0.1], grip: "open" }] }]], F);
    return st(alive(p, F, 3, [-0.4]), F, 3, [[0, "smug"], [L(12, 3), "smirk"]], { heading: -2.3 });
  }
  if (F < L(27, 0)) {
    // line 20: dawn, proud beside the trash heap
    const p = pose([[0, { ...REST, arms: arms([0.62, -0.5], [0.62, -0.5], { gl: "open", gr: "open" }), bob: 8 }], [L(20, 3), POSES.hips], [L(20, 5), { ...POSES.hips, tilt: 8, bob: 6 }], [B.trash - 4, { ...REST, arms: [REST.arms[0], { at: [0.66, 0.1], grip: "open" }] }]], F);
    return st(alive(p, F, 3, [0.3, -0.2]), F, 3, [[0, "excited"], [L(20, 3), "proud"], [L(20, 5), "smug"], [B.trash, "deadpan"]], { heading: 0.75 });
  }
  // line 27: you turn slowly to Speedy
  return st(alive(pose([[0, POSES.crossed], [L(27, 3) - 4, { ...POSES.crossed, bob: 8, tilt: -6 }]], F), F, 3, [0, -0.5]), F, 3, [[0, "suspicious"], [L(27, 3), "angry"], [B.because, "disgusted"]], { heading: turnTo([[0, -3.0], [L(27, 0) + 4, -2.1]], F, 20), fx: F >= snap(L(27, 3)) ? { steam: (F - snap(L(27, 3))) / FPS } : {} });
});
// line 13: the walk (crew in a line on the sidewalk toward the lens, -x)
const WALK0 = L(13, 3) - 20;
const crewWalk = (dz: number, dx: number) => (F: number) => V(4 - 0.034 * Math.max(0, F - WALK0) + dx, 0, -1.3 + dz);
export const youStreet = role("you", youLook, crewWalk(0.6, 0), (F) => st({ ...walkPose(0.034 * Math.max(0, F - WALK0) * 0.8, 1), bob: 0 }, F, 3, [[0, "determined"], [B.showtime, "smug"]], { heading: -Math.PI / 2 + 0.25 }));
// lines 14-19: the heist
export const YOU_VAULT = V(-0.5, 0, 2.6);
export const youVault = role("you", youLook, (F) => (F < L(19, 0) ? YOU_VAULT.clone() : V(-2.25, 0, -3.2)), (F) => {
  if (F >= L(19, 0)) {
    const p = pose([[0, REST], [B.sunrise + 6, { ...POSES.panic, bob: 8 }], [L(19, 5) + 6, POSES.hips], [L(19, 7) - 4, { ...POSES.panic, bob: 10 }], [L(19, 9), POSES.hips], [B.diamonds - 8, { ...POSES.panic, bob: 4 }]], F);
    return st({ ...p, squash: reactSquash(F - B.diamonds) + reactSquash(F - B.sunrise - 8) }, F, 3, [[0, "excited"], [L(19, 5), "grin"], [L(19, 7), "excited"], [B.diamonds, "laughing"]], { heading: 0.6 });
  }
  const p = pose([[0, { ...REST, arms: [REST.arms[0], { at: [0.4, 0.05], grip: "fist" }] }], [B.opens - 6, { ...POSES.panic }]], F);
  return st(alive(p, F, 3, [0.4, -0.3]), F, 3, [[0, "determined"], [L(14, 5), "sneaky"], [B.blind, "grin"], [L(18, 0), "nervous"], [B.opens, "shocked"], [B.opens + 20, "excited"]], { heading: Math.PI, prop: F < L(18, 0) ? "flashlight" : undefined });
});
export const YOU_FOREST = V(-3.9, 0, -3.4);
export const youForest = role("you", youLook, YOU_FOREST, (F) => {
  const p = pose([[0, REST], [L(23, 0) - 2, { ...REST, sway: -8, tilt: -6, arms: [{ at: [0.55, 0.0], grip: "open" }, REST.arms[1]] }]], F);
  return st(p, F, 3, [[0, "determined"], [B.panicsS, "worried"], [B.flings, "shocked"], [L(23, 0), "worried"]], { heading: F < L(23, 0) ? 0.9 : turnTo([[L(23, 0), 0.9], [L(23, 0) + 10, 2.6]], F, 10) });
});
const CUFFED: Pose = { ...REST, arms: arms([-0.12, 0.35], [-0.08, 0.35], { gl: "fist", gr: "fist", front: true }), tilt: 4, bob: -4 };
export const YOU_CUFF = V(-0.9, 0, 0.35);
export const youCuffed = role("you", youSuit, YOU_CUFF, (F) => {
  const p = pose([[0, POSES.hips], [L(28, 0) + 4, POSES.panic], [B.cuffs - 6, CUFFED]], F);
  return st({ ...p, squash: reactSquash(F - L(28, 0) - 6) }, F, 3, [[0, "smug"], [L(28, 0) + 6, "shocked"], [B.cuffs, "crying"]], { heading: 1.5, fx: { sweat: ((F % 30) / 30) } });
});
export const YOU_CELL = V(0, 0, -0.35);
export const youCell = role("you", youLook, YOU_CELL, (F) => st(alive({ ...SIT, arms: arms([-0.2, 0.4], [-0.2, 0.4], { gl: "fist", gr: "fist" }) }, F, 3, [0, 0.3]), F, 3, [[0, "tired"], [B.end, "deadpan"]], { heading: 0 }), { sit: true });

// --- the crew
const GEN_HIDE = V(-1.65, 0, 0.35), MON_HIDE = V(1.5, 0, -0.55), KING_HIDE = V(-0.7, 0, -1.25);
export const geniusHide = role("genius", geniusLook, GEN_HIDE, (F) => st(alive(pose([[0, REST], [B.genius - 6, { ...REST, arms: [{ at: [0.4, -0.5], grip: "point" }, REST.arms[1]], tilt: -4 }]], F), F, 61, [0, 0.4]), F, 61, [[0, "neutral"], [B.genius, "smug"], [L(10, 7), "scheming"]], { heading: 0.4 }));
export const monsterHide = role("monster", monsterLook, MON_HIDE, (F) => st(alive(pose([[0, POSES.crossed], [B.monster - 6, { ...REST, arms: [{ at: [0.2, -0.15], grip: "fist", layer: "front" }, { at: [0.35, 0.0], grip: "fist", layer: "front" }] }]], F), F, 67, [0, 0.3]), F, 67, [[0, "deadpan"], [B.monster, "grin"], [L(10, 11), "proud"]], { heading: -0.4 }));
export const kingHide = role("king", kingLook, KING_HIDE, (F) => {
  const j = F >= B.king ? Math.sin((F - B.king) * 0.9) * 0.08 : 0;
  return st(alive(pose([[0, POSES.hips], [B.king - 6, { ...REST, arms: [{ at: [0.45 + j, 0.45], grip: "fist" }, REST.arms[1]], tilt: 5 }]], F), F, 71, [0.3, 0]), F, 71, [[0, "suspicious"], [B.king, "smug"], [B.keys, "grin"]], { heading: 0.2 });
});
const SPEEDY_WIN = V(-1.95, 0, -0.35);
export const speedyWin = role("speedy", speedyLook, SPEEDY_WIN, (F) => {
  const p = pose([[0, POSES.chin], [B.panics - 4, { ...POSES.panic, bob: 26 }], [B.panics + 24, { ...POSES.panic, bob: 4 }]], F);
  return st({ ...p, squash: reactSquash(F - B.panics) }, F, 79, [[0, "nervous"], [L(11, 4), "suspicious"], [B.panics, "scared"]], { heading: turnTo([[0, -0.2], [B.panics, 0.6]], F, 8), fx: { sweat: (F % 24) / 24, ringEyes: F >= snap(B.panics) && F < B.panics + 30 } });
});
export const SPEEDY_HIDE = V(0.4, 0, 1.6);
export const speedyHide = role("speedy", speedyLook, SPEEDY_HIDE, (F) => {
  if (F < L(20, 0)) {
    const p = { ...REST, arms: [REST.arms[0], { at: [0.62, -0.05], grip: "fist" }] as Pose["arms"], sway: 5 };
    return st(p, F, 79, [[0, "nervous"], [L(12, 3), "scared"]], { heading: 1.4, fx: { talk: talk(F, 12), sweat: (F % 20) / 20 } });
  }
  // line 27: frozen mid-bite of another sandwich
  const BITE: Pose = { ...REST, arms: [REST.arms[0], { at: [0.05, -0.32], grip: "fist", layer: "front" }], tilt: -4 };
  return st(BITE, F, 79, [[0, "neutral"], [B.because, "nervous"], [B.speedy27, "shocked"]], { heading: 1.2, fx: F >= snap(B.speedy27) ? { sweat: ((F - snap(B.speedy27)) % 20) / 20 } : {} });
});
export const speedyPast = role("speedy", speedyLook, (F) => V(-2.6 - 0.05 * (F - L(13, 0)), 0.12, -3.7), (F) => st(walkPose(0.05 * (F - L(13, 0)) * 0.8, 1), F, 79, [[0, "nervous"], [L(13, 2), "scared"]], { heading: turnTo([[0, -Math.PI / 2], [L(13, 2), 0.3], [L(13, 2) + 22, -Math.PI / 2]], F, 10), fx: { sweat: (F % 20) / 20 } }));
export const kingStreet = role("king", kingLook, crewWalk(-1.0, 0.9), (F) => st(walkPose(0.034 * Math.max(0, F - WALK0) * 0.8, 1), F, 71, [[0, "smug"]], { heading: -Math.PI / 2 + 0.3 }));
export const geniusStreet = role("genius", geniusLook, crewWalk(-0.2, 0.5), (F) => st(walkPose(0.034 * Math.max(0, F - WALK0) * 0.8, 1), F, 61, [[0, "determined"]], { heading: -Math.PI / 2 + 0.2 }));
export const monsterStreet = role("monster", monsterLook, crewWalk(-1.55, 1.4), (F) => st(walkPose(0.034 * Math.max(0, F - WALK0) * 0.8, 1), F, 67, [[0, "deadpan"]], { heading: -Math.PI / 2 + 0.2 }));
export const speedyStreet = role("speedy", speedyLook, crewWalk(1.4, -0.4), (F) => st(walkPose(0.034 * Math.max(0, F - WALK0) * 0.8, 1), F, 79, [[0, "nervous"]], { heading: turnTo([[0, -Math.PI / 2], [WALK0 + 20, Math.PI / 2 - 0.3], [WALK0 + 40, -Math.PI / 2]], F, 10), fx: { sweat: (F % 24) / 24 } }));
// heist positions
export const GEN_V = V(0.2, 0, 2.9), MON_V = V(-1.25, 0, 3.4), KING_V = V(1.05, 0, 2.3), SPEEDY_V = V(1.6, 0, 4.1);
const FOG: Pose = { ...REST, arms: [{ at: [0.05, -0.55], grip: "open", layer: "front" }, REST.arms[1]], tilt: -6 };
const FOAM_GO = L(15, 2), FOAM_STOP = L(15, 12);
export const geniusFoamAt = (F: number) => lerpV(V(1.6, 0, 2.2), V(-1.4, 0, 2.2), span(F, FOAM_GO, FOAM_STOP));
export const geniusVault = role("genius", geniusLook, (F) => (F >= L(15, 0) && F < L(17, 0) ? geniusFoamAt(F) : F >= L(17, 0) && F < L(18, 0) ? V(0.85, 0, 1.05) : GEN_V.clone()), (F) => {
  if (F >= L(15, 0) && F < L(17, 0)) {
    const s = F >= FOAM_GO && F < FOAM_STOP ? walkPose(3 * span(F, FOAM_GO, FOAM_STOP), 0.6) : REST;
    return st({ ...s, arms: arms([-0.15, -0.3], [-0.15, -0.3], { gl: "mitt", gr: "mitt", front: true }), bob: -10 }, F, 61, [[0, "sneaky"], [B.foam, "scheming"], [L(15, 14), "nervous"]], { heading: -Math.PI / 2 });
  }
  if (F >= L(17, 0) && F < L(18, 0)) return st(pose([[0, { ...REST, arms: [{ at: [0.6, -0.42], grip: "fist" }, { at: [0.5, -0.3], grip: "fist" }], bob: -6, sway: 6 }], [B.plate + 10, { ...REST, arms: [{ at: [0.6, -0.42], grip: "open" }, { at: [0.55, -0.35], grip: "open" }], tilt: -4 }], [L(17, 9) - 4, { ...REST, arms: [{ at: [0.65, -0.3], grip: "open" }, { at: [0.3, 0.3], grip: "fist" }], bob: 6 }], [L(17, 13) - 4, POSES.hips]], F), F, 61, [[0, "nervous"], [B.plate, "determined"], [L(17, 9), "suspicious"], [L(17, 13), "relieved"], [B.opened, "smug"]], { heading: 0.75 });
  // line 14: he fogs his glasses with a breath (the hairspray analogy), then leads the crew; line 18 the gold
  const p = pose([[0, REST], [B.breath - 10, FOG], [B.breath + 26, REST]], F);
  return st(alive(p, F, 61, [0.2, -0.3]), F, 61, [[0, "determined"], [B.breath, "pleading"], [B.breath + 26, "smug"], [B.opens, "shocked"], [B.opens + 22, "excited"]], { heading: Math.PI + 0.3, prop: F < L(18, 0) ? "flashlight" : undefined });
});
const TAPE_P: Pose = { ...REST, arms: [{ at: [0.62, -0.1], grip: "fist" }, REST.arms[1]], sway: -4 };
export const MON_TAPE = V(-1.6, 0, 3.15);
export const monsterVault = role("monster", monsterLook, (F) => (F >= L(19, 0) ? V(-2.2, 0, -4.8) : F >= L(16, 0) && F < L(17, 0) ? lerpV(V(-0.7, 0, 3.9), MON_TAPE, span(F, L(16, 0), L(16, 4))) : MON_V.clone()), (F) => {
  if (F >= L(19, 0)) { const k = Math.sin(F * 0.7) * 0.06; return st({ ...REST, arms: [{ at: [0.62 + k, -0.15], grip: "fist" }, { at: [0.5, 0.05 - k], grip: "fist" }], sway: -6 }, F, 67, [[0, "determined"], [B.sunrise, "grin"]], { heading: -Math.PI / 2 + 0.2 }); }
  if (F >= L(16, 0) && F < L(17, 0)) return st(F < L(16, 4) + 8 ? walkPose(1.2 * span(F, L(16, 0), L(16, 4)), Math.min(1, (L(16, 4) + 8 - F) / 10)) : pose([[0, REST], [B.tape - 10, TAPE_P]], F), F, 67, [[0, "sneaky"], [B.tape, "proud"]], { heading: F < L(16, 4) ? face(V(-0.7, 0, 3.9), MON_TAPE) : Math.PI });
  return st(alive(REST, F, 67, [0.2]), F, 67, [[0, "deadpan"], [B.opens, "shocked"], [B.opens + 20, "laughing"]], { heading: Math.PI });
});
export const kingVault = role("king", kingLook, KING_V, (F) => {
  const p = pose([[0, REST], [L(18, 0) - 4, { ...REST, arms: [{ at: [0.38, -0.32], grip: "fist" }, REST.arms[1]], tilt: -4 }], [B.nobody - 4, { ...POSES.shrug }], [L(18, 11) - 4, { ...POSES.shrug, shrug: 30, bob: 10, tilt: -8 }]], F);
  return st(p, F, 71, [[0, "determined"], [L(18, 3), "scheming"], [B.opens, "smug"], [B.nobody, "smirk"], [L(18, 11), "laughing"]], { heading: face(KING_V, V(0.15, 0, 0)) });
});
export const speedyVault = role("speedy", speedyLook, SPEEDY_V, (F) => st(alive(pose([[0, POSES.chin], [B.opens - 4, POSES.panic]], F), F, 79, [0.6, -0.6, 0.6]), F, 79, [[0, "nervous"], [B.opens, "shocked"], [B.opens + 26, "excited"]], { heading: Math.PI, fx: { sweat: (F % 24) / 24 } }));
// the woods
export const SPEEDY_F = V(-5.1, 0, -3.7);
export const speedyForest = role("speedy", speedyLook, (F) => (F < L(22, 0) ? SPEEDY_F.clone() : F < L(23, 0) ? V(-2.4, 0, -3.4) : V(-2.75, 0, -3.25)), (F) => {
  if (F < L(22, 0)) return st(alive(REST, F, 79, [0.4, -0.4]), F, 79, [[0, "nervous"], [B.forest, "scared"]], { heading: -0.2, fx: { sweat: (F % 20) / 20 } });
  if (F < L(23, 0)) {
    // spins and flings: a bag at every turn (props.ts heldBag in his right hand until each release)
    const ph = (F - B.flings) / 14;
    const p = F < B.flings - 4 ? POSES.panic : { ...REST, arms: [{ at: [0.4, -0.2], grip: "open" }, { at: [0.62 + 0.1 * Math.sin(ph * 6.28), -0.45 + 0.3 * Math.cos(ph * 6.28)], grip: "fist" }] as Pose["arms"], sway: 8 * Math.sin(ph * 6.28) };
    return st({ ...p, squash: reactSquash(F - B.panicsS) }, F, 79, [[0, "scared"], [B.flings, "angry"]], { heading: turnTo([[0, 0.3], [B.flings, 0.9], [B.flings + 14, -0.3], [B.flings + 28, 0.6]], F, 8), fx: { sweat: (F % 16) / 16 } });
  }
  return st({ ...REST, arms: [{ at: [0.62, -0.05], grip: "fist" }, REST.arms[1]], sway: -10, tilt: 8 }, F, 79, [[0, "scared"]], { heading: -0.6, fx: { talk: talk(F, 23), sweat: (F % 16) / 16 } });
});
// --- the guard
const PAPER: Pose = { ...REST, arms: arms([-0.28, -0.05], [-0.18, -0.05], { gl: "mitt", gr: "mitt", front: true }) };
export const guard = role("guard", guardLook, GUARD_SEAT, (F) => {
  if (F >= L(28, 0)) return st(pose([[0, PAPER], [B.found - 14, { ...REST, arms: arms([-0.28, 0.25], [-0.18, 0.25], { gl: "mitt", gr: "mitt", front: true }) }]], F), F, 83, [[0, "neutral"], [B.found - 6, "shocked"]], { heading: -Math.PI / 2 - 0.3 });
  if (F < L(9, 0)) return st({ ...REST, arms: [REST.arms[0], { at: [0.25 + 0.4 * span(F, L(8, 9) + 4, B.vaultKey), 0.15], grip: "open" }] }, F, 83, [[0, "suspicious"], [B.vaultKey, "neutral"]], { heading: -Math.PI / 2 });
  // line 9: day 1 stares, day 10 nods, day 500 waves from behind the paper
  if (F < B.day500 - 8) return st({ ...REST, tilt: F >= B.day10 && F < B.day10 + 16 ? 12 * Math.sin((F - B.day10) / 16 * Math.PI) : 0 }, F, 83, [[0, "suspicious"], [B.day1 + 10, "angry"], [B.day10 - 4, "neutral"], [B.day10 + 16, "relieved"]], { heading: -Math.PI / 2 - 0.25 });
  const w = Math.sin(F * 0.5) * 0.1;
  return st({ ...REST, arms: [{ at: [-0.28, -0.05], grip: "mitt", layer: "front" }, { at: [0.5 + w, -0.6], grip: "open" }] }, F, 83, [[0, "relieved"], [B.day500, "tired"]], { heading: -Math.PI / 2 - 0.25 });
});
// --- the old man, the police
export const oldMan = role("oldman", oldManLook, (F) => (F < L(24, 9) ? lerpV(OLD_MAN.clone().add(V(1.6, 0, 1.4)), OLD_MAN, span(F, L(24, 0), L(24, 8))) : OLD_MAN.clone()), (F) => {
  const walk = F < L(24, 9) ? walkPose(2.1 * span(F, L(24, 0), L(24, 8)), 0.7) : REST;
  const p = F < L(24, 9) ? { ...walk, arms: [walk.arms[0], { at: [0.35, 0.45], grip: "fist" }] as Pose["arms"] } : pose([[0, { ...REST, arms: [REST.arms[0], { at: [0.35, 0.45], grip: "fist" }] }], [B.hates - 6, { ...REST, arms: [{ at: [0.6, -0.3], grip: "fist" }, { at: [0.35, 0.45], grip: "fist" }], bob: 6 }], [B.police - 18, { ...REST, arms: [{ at: [-0.02, -0.58], grip: "fist", layer: "front" }, { at: [0.35, 0.45], grip: "fist" }], tilt: 6 }]], F);
  return st({ ...p, squash: reactSquash(F - B.hates) }, F, 89, [[0, "neutral"], [L(24, 10), "confused"], [L(24, 12), "disgusted"], [B.hates, "angry"]], { heading: face(OLD_MAN, PILE), prop: F >= B.police - 18 ? "phone" : undefined, fx: F >= snap(B.hates) ? { steam: (F - snap(B.hates)) / FPS, fill: { color: "#e0443a", t: clamp01((F - snap(B.hates)) / 10) * 0.45 } } : {} });
});
export const COP_F = SANDWICH.clone().add(V(0.35, -0.02, 0.45));
export const copForest = role("cop", copLook, COP_F, (F) => {
  if (F < L(26, 0)) return st(pose([[0, POSES.crouch], [B.envelopes - 6, { ...POSES.crouch, arms: [POSES.crouch.arms[0], { at: [0.45, -0.1], grip: "fist" }] }]], F), F, 97, [[0, "suspicious"], [B.name, "smug"]], { heading: 0.9 });
  const lift = span(F, L(26, 0), L(26, 3));
  const p = { ...POSES.crouch, bob: -70 + 62 * lift, tilt: 0, lean: 0, arms: [{ at: [0.2, 0.55], grip: "fist" }, { at: [0.5 + 0.4 * lift, 0.6 - 0.3 * lift], grip: "fist" }] as Pose["arms"] };
  return st(p, F, 97, [[0, "suspicious"], [L(26, 4), "disgusted"], [B.dna, "proud"]], { heading: 0.95 });
});
export const COP_DOOR = OFFICE_DOOR.clone().add(V(0.55, 0, 0.0));
export const copOffice = role("cop", copLook, (F) => lerpV(OFFICE_DOOR.clone().add(V(0.3, 0, -0.05)), COP_DOOR, span(F, L(28, 0) + 6, L(28, 0) + 20)), (F) => st(pose([[0, REST], [L(28, 0) + 8, POSES.point]], F), F, 97, [[0, "angry"], [B.cuffs, "smug"]], { heading: face(COP_DOOR, V(-0.9, 0, 0.35)) + 0.6 }));

// ------------------------------------------------------------------ held props
export const held = (name: string, make: () => Object3D, r: Role, hand: Hand, cam: (F: number) => CamPose, o: { fwd?: number; up?: number; orient?: (ob: Object3D, F: number) => void; when?: (F: number) => boolean; touches?: string[] } = {}): MovingProp => ({
  name, make, heldBy: r.name, hand, touches: o.touches, pose: (ob, F) => {
    if (o.when && !o.when(F)) return false;
    const s = r.state(F);
    ob.position.copy(handWorld(r.look, s.pose, r.at(F), cam(F).pos, hand, o.fwd ?? 0.06, s.heading));
    if (o.up) ob.position.y += o.up;
    const c = cam(F).pos;
    ob.rotation.set(0, Math.atan2(c.x - ob.position.x, c.z - ob.position.z), 0);
    o.orient?.(ob, F);
  },
});
/** Where a hand is for a role at F, seen from `cam` (sprites that leave a hand). */
export const handAt = (r: Role, F: number, cam: Vector3, hand: "left" | "right") => { const s = r.state(F); return handWorld(r.look, s.pose, r.at(F), cam, hand, 0.06, s.heading); };
export { DOOR, HEAP, SENSOR, TABLE };
