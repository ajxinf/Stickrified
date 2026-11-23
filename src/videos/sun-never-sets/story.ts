import { Object3D, Vector3 } from "three";
import { flow, perform } from "../../../kit/toon/acting";
import { CamPose, glide } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Hand, Look } from "../../../kit/toon/cast";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { laughFlap, talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import { headHeight } from "../../../kit/toon/figure";
import type { MovingProp } from "../../../kit/toon/guard";
import { POSES, REST, alive, moveCurve, movePose, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import SCRIPT from "../../../videos/sun-never-sets/script.json";
import MOUTH from "../../../videos/sun-never-sets/voice/mouth.json";
import WORDS from "../../../videos/sun-never-sets/voice/words.json";
import { QUEUE_LOOKS, brotherLook, closetLook, dadLook, fridgeLook, kidALook, kidBLook, kyleLook, momLook, tvDadLook, tvMomLook } from "./cast";
import { V, clamp01 } from "./common";
import { MAT_SIZE, MOWER_SEAT } from "./props";
import { CLOSET_SEAT, FRIDGE_SEAT, LIVING, ROWS, SEATS_X } from "./rooms";
import { FENCE_X, MOWER_START, QUEUE, SLEEP_CHAIRS, STAIR, STAIR_TOP } from "./street";
import type { ToastFace } from "./props";

/**
 * sun-never-sets (episode 7, scenario), timing + cast. Every beat is locked to words.json through the script's lines:
 * L(line, word) = composition frame of that word's start. Shots live in shots.ts.
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
  n29: L(1, 4), toaster: L(1, 8), relax: L(1, 13),
  stopped: L(2, 6), sky: L(2, 9), set: L(2, 12),
  awesome: L(3, 3), kids: L(3, 4), dad: L(3, 7), eleven: L(3, 12),
  dark: L(4, 10),
  nobody: L(5, 1), darkness: L(5, 4), earth: L(5, 11),
  closet: L(6, 1), hotels: L(6, 11),
  fridge: L(7, 8),
  paints: L(8, 3), sells: L(8, 8), hour: L(8, 13),
  hey: L(9, 0), cash: L(9, 5),
  afford: L(10, 2), weird: L(10, 7),
  hole: L(11, 4), box: L(11, 8),
  phone: L(12, 5), dot: L(12, 11), window: L(12, 14),
  drag: L(13, 1), street: L(13, 9), alarm: L(13, 13),
  snapped: L(14, 4), toaster14: L(14, 9),
  cool: L(15, 5), stove: L(15, 16),
  line: L(16, 1), mom: L(16, 7), car: L(16, 11),
  rings: L(17, 5),
  nothing: L(18, 4), ten: L(18, 6), still: L(18, 8),
  nice: L(19, 0),
  look20: L(20, 2), bite: L(20, 12),
  didnt: L(21, 8),
  dots: L(22, 1), moon22: L(22, 8),
  walks: L(23, 4), tv: L(23, 18),
  dim: L(24, 3), air: L(24, 5), flick: L(24, 11),
  vanishes: L(25, 6),
  stars: L(26, 9),
  empties: L(27, 3), up: L(27, 9),
  my: L(28, 2),
  asleep: L(29, 8),
  minutes: L(30, 1), toaster30: L(30, 11),
};

// ------------------------------------------------------------------ what the sets show at frame F
const pw = (F: number, keys: [number, number][]) => {
  if (F <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) if (F <= keys[i + 1][0]) { const [a, va] = keys[i], [b, vb] = keys[i + 1]; return va + (vb - va) * ((F - a) / (b - a)); }
  return keys[keys.length - 1][1];
};
/** The Moon's offset from the sun's centre, in sun radii (2.04 = first contact). */
export const moonOff = (F: number) => pw(F, [[2300, 2.2], [B.bite - 6, 1.62], [B.didnt, 1.22], [L(23, 0), 0.82], [B.dim, 0.42], [L(25, 0), 0.24], [B.vanishes - 6, 0.04], [B.vanishes, 0]]);
/** Totality 0..1: the last bead goes on "vanishes". */
export const totality = (F: number) => clamp01((F - B.vanishes + 3) / 6);
export type WorldState = {
  dots: number; toast: ToastFace; toastUp: number; moon: number; total: number; lamps: number; temp: number;
  fridgeDoor: number; fridgeLamp: boolean; tvBlock: number; neon: boolean;
};
export const worldAt = (F: number): WorldState => ({
  dots: F < L(22, 0) ? (F < B.dot ? 7 : 8) : 9,
  toast: F >= B.toaster30 - 2 ? "smile" : F >= B.toaster14 - 3 && F < L(15, 0) ? "roll" : (F >= L(1, 10) - 2 && F < L(1, 14) + 8) ? (Math.floor(F / 4) % 2 ? "talk" : "neutral") : "neutral",
  toastUp: F < B.relax ? 0 : clamp01((F - B.relax) / 4),
  moon: moonOff(F),
  total: totality(F),
  lamps: F < B.flick - 2 ? 0 : F - (B.flick - 2),
  temp: F < L(15, 0) ? 96 : pw(F, [[L(15, 0), 96], [B.cool, 104], [L(15, 9), 112]]),
  fridgeDoor: F < B.fridge - 10 ? 1 : clamp01(1 - (F - B.fridge + 10) / 10),
  fridgeLamp: F < B.fridge + 1,
  tvBlock: F < B.walks ? 0 : clamp01((F - (B.tv - 34)) / 40),
  neon: !(F >= L(28, 0) && Math.floor(F / 5) % 3 === 0),
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
export const role = (name: string, look: Look, at: Vector3 | ((F: number) => Vector3), raw: (F: number) => CharState, o: { sit?: boolean; crowd?: boolean } = {}): Role => ({
  name, look, at: typeof at === "function" ? at : () => at.clone(), sit: o.sit,
  state: (F) => { const s = flow(raw, F, o.crowd ? 0.5 : 1); return o.sit ? { ...s, pose: { ...s.pose, sit: 1 } } : s; },
});
export const SIT: Pose = { ...REST, sit: 1 };
export const face = (from: Vector3, to: Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
export const arms = (l: [number, number], r: [number, number], o: { gl?: Pose["arms"][0]["grip"]; gr?: Pose["arms"][0]["grip"]; front?: boolean } = {}): Pose["arms"] =>
  [{ at: l, grip: o.gl ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }, { at: r, grip: o.gr ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }];
export const headOf = (r: Role, F: number) => r.at(F).add(V(0, headHeight(r.look, r.state(F).pose), 0));
const talk = (F: number, line: number) => talkAt(MOUTH_T, F, [[L(line, 0), LEND(line)]]);
/** Asleep: eyes shut (the blink), a slow breathing nod. */
const asleep = (s: CharState, F: number, seed: number): CharState => ({ ...s, expr: "tired", blink: true, pose: { ...s.pose, tilt: (s.pose.tilt ?? 0) + 9 + 2 * Math.sin(F / 23 + seed), bob: (s.pose.bob ?? 0) - 4 } });

// ================================================================== you
// Kitchen, line 1: 3 AM, eyes red, the toaster talks.
export const YOU_K1 = V(-0.38, 0, -1.25);
export const youK1 = role("you", youLook, YOU_K1, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.62], [0.3, 0.6]), tilt: 6 }], [B.toaster - 4, { ...REST, arms: arms([0.25, 0.62], [0.55, 0.3], { gr: "open" }), tilt: -4, look: -0.5 }], [B.relax, { ...REST, arms: arms([0.6, 0.0], [0.6, 0.0], { gl: "open", gr: "open" }), shrug: 14, bob: 4 }]], F);
  return st({ ...alive(p, F, 3, [0, -0.4]), squash: reactSquash(F - B.relax) }, F, 3, [[0, "tired"], [B.n29, "deadpan"], [B.toaster, "confused"], [L(1, 10), "suspicious"], [B.relax, "shocked"]], { heading: -0.55, fx: F >= snap(B.relax) ? { ringEyes: F < B.relax + 20 } : {} });
});
// The fence, line 9: Kyle mocks you; line 10: the empty wallet, then the scheme.
export const YOU_FENCE = V(FENCE_X - 0.95, 0, -7.55);
export const youFence = role("you", youLook, YOU_FENCE, (F) => {
  const p = pose([[0, POSES.crossed], [L(10, 0) - 6, { ...REST, arms: arms([-0.15, 0.3], [-0.12, 0.28], { gl: "open", gr: "open" }), bob: -4, tilt: 8 }], [B.weird - 6, { ...POSES.chin, look: 0.2 }]], F);
  return st(alive(p, F, 3, [0.5, -0.2]), F, 3, [[0, "tired"], [B.cash, "deadpan"], [L(10, 0), "sad"], [B.afford, "crying"], [L(10, 4), "suspicious"], [B.weird, "scheming"]], { heading: F < L(10, 0) ? Math.PI / 2 - 0.2 : 0.4 });
});
// Kitchen, line 11: a pencil through the box, then the box up to your eye.
export const YOU_K11 = V(-1.8, 0, -1.25);
export const youK11 = role("you", youLook, YOU_K11, (F) => {
  const BOX_L: Pose["arms"][0] = { at: [0.3, 0.1], grip: "mitt" };
  const p = pose([
    [0, { ...REST, arms: [BOX_L, { at: [0.55, 0.05], grip: "fist" }], tilt: 4 }],
    [B.hole - 8, { ...REST, arms: [BOX_L, { at: [-0.4, 0.1], grip: "fist", layer: "front" }], tilt: 6, look: -0.3 }],
    [L(11, 6), { ...REST, arms: [{ at: [0.25, 0.6], grip: "fist" }, { at: [-0.05, -0.12], grip: "mitt", layer: "front" }], tilt: -6, look: 0.4 }],
  ], F);
  return st(alive(p, F, 3, [0.3, 0]), F, 3, [[0, "determined"], [B.hole - 8, "scheming"], [B.hole, "excited"], [B.box, "grin"]], { heading: 0.35 });
});
// Kitchen, line 12: you lean over the sink and draw today's dot on the glass.
export const YOU_K12 = V(0.05, 0, -1.86); // right at the glass (no counter under the window)
export const youK12 = role("you", youLook, YOU_K12, (F) => {
  // the marker up at the glass, then a little tap on "dot"
  const p = pose([[0, { ...REST, arms: [{ at: [0.25, 0.6], grip: "fist" }, { at: [0.3, -0.45], grip: "fist", layer: "front" }], lean: 0.2 }], [B.dot - 8, { ...REST, arms: [{ at: [0.25, 0.6], grip: "fist" }, { at: [0.05, -0.5], grip: "fist", layer: "front" }], lean: 0.35, tilt: -5 }], [B.dot + 4, { ...REST, arms: [{ at: [0.25, 0.6], grip: "fist" }, { at: [0.1, -0.45], grip: "fist", layer: "front" }], lean: 0.3, tilt: -3 }]], F);
  return st(p, F, 3, [[0, "tired"], [L(12, 3), "deadpan"], [B.dot, "determined"], [B.window, "proud"]], { heading: Math.PI });
});
// Line 13: drag the mattress down the drive into the road (leaning into it), the toaster riding on it.
export const DRAG_A = V(-1.4, 0, -7.4), DRAG_B = V(-2.3, 0, 0.46);
export const YOU_MAT = DRAG_B.clone(); // sitting on the south end of the mattress
export const MATTRESS_C = V(DRAG_B.x, 0, DRAG_B.z - 0.11 - MAT_SIZE.l / 2); // long side along z
export const TOASTER_MAT = V(MATTRESS_C.x + 0.34, MAT_SIZE.h, DRAG_B.z - 0.36);
const DRAG = [L(13, 0) - 4, L(13, 9) - 2] as const;
export const dragAt = (F: number) => lerpV(DRAG_A, DRAG_B, span(F, DRAG[0], DRAG[1]));
export const DRAG_END = DRAG[1];
const PULL: Pose = { ...REST, arms: arms([-0.55, 0.62], [-0.5, 0.6], { gl: "fist", gr: "fist" }), sway: -18, bob: -8 };
const SIT_PHONE: Pose = { ...SIT, arms: arms([0.3, 0.45], [-0.18, 0.05], { gr: "fist", front: true }), tilt: 4 };
const dragWalk = (F: number): Pose => {
  const w = walkPose(DRAG_A.distanceTo(DRAG_B) * span(F, DRAG[0], DRAG[1]), Math.min(clamp01((F - DRAG[0]) / 10), clamp01((DRAG[1] + 6 - F) / 12)) * 0.75);
  return { ...w, arms: PULL.arms, sway: PULL.sway, bob: w.bob + PULL.bob };
};
export const youDrag = role("you", youLook, (F) => (F < DRAG[1] ? dragAt(F) : YOU_MAT.clone()), (F) => {
  if (F < DRAG[1]) return st(dragWalk(F), F, 3, [[0, "determined"], [B.street, "proud"]], { heading: face(DRAG_A, DRAG_B) });
  // drop onto the mattress end, phone out for the alarm
  const p = pose([[0, dragWalk(DRAG[1] - 1)], [DRAG[1], SIT_PHONE]], F);
  return st(p, F, 3, [[0, "proud"], [B.alarm, "scheming"]], { heading: 0 });
});
/** On the mattress, lines 14-30: Kyle laughs, the heat, the alarm, the wait, the box, the stars, sleep. */
const HOLD_PHONE: Pose = { ...SIT, arms: arms([0.3, 0.45], [-0.18, 0.05], { gr: "fist", front: true }), tilt: 6 };
const BOX_UP: Pose = { ...SIT, arms: arms([-0.2, -0.28], [-0.15, -0.3], { gl: "mitt", gr: "mitt", front: true }), tilt: -4 };
const FOOT_UP: Pose = { ...REST, lift: [0, 18], arms: arms([0.45, 0.2], [0.5, 0.1], { gl: "open", gr: "open" }), sway: -6, shrug: 8 };
export const YOU_GUM = V(MATTRESS_C.x + 1.0, 0, DRAG_B.z + 0.2);
/** Line 15: you stand by the mattress; your sneaker peels off the soft road. */
export const youGum = role("you", youLook, YOU_GUM, (F) => {
  const p = pose([[0, REST], [B.stove - 30, FOOT_UP]], F);
  return st(p, F, 3, [[0, "tired"], [B.stove - 30, "disgusted"]], { heading: 0.6, fx: { sweat: ((F % 30) / 30) } });
});
export const youMat = role("you", youLook, YOU_MAT, (F) => {
  const keys: [number, Pose][] = [[0, { ...SIT, arms: arms([0.3, 0.45], [0.3, 0.4]) }], [L(17, 0), { ...SIT, arms: arms([0.3, 0.45], [0.3, 0.4]), tilt: 4 }], [B.rings - 26, HOLD_PHONE], [L(18, 0), { ...SIT, arms: arms([0.35, 0.5], [0.3, 0.45]), tilt: -8 }], [L(20, 0) - 4, BOX_UP], [L(21, 0), { ...SIT, arms: arms([0.6, -0.1], [0.6, -0.12], { gl: "open", gr: "open" }), tilt: -10, shrug: 10 }], [L(24, 0), { ...SIT, arms: arms([-0.35, 0.3], [-0.3, 0.25]), tilt: -8 }], [L(26, 0), { ...SIT, arms: arms([0.35, 0.5], [0.3, 0.45]), tilt: -10 }], [L(30, 3) - 4, { ...SIT, arms: arms([0.55, -0.7], [0.55, -0.72], { gl: "open", gr: "open" }), tilt: 8, bob: 6 }], [L(30, 6), { ...SIT, arms: arms([0.3, 0.5], [0.3, 0.48]), tilt: 12 }]];
  const p = pose(keys, F);
  const sweat = F >= L(14, 0) && F < L(24, 0) ? { sweat: ((F % 36) / 36) } : {};
  const s = st({ ...alive(p, F, 3, [0.5, -0.3]), squash: reactSquash(F - B.bite) }, F, 3, [
    [0, "tired"], [L(14, 0), "smug"], [B.snapped, "deadpan"], [L(17, 0), "nervous"], [B.rings, "excited"], [L(18, 0), "determined"], [B.nothing, "nervous"], [B.ten, "worried"], [B.still, "scared"],
    [L(19, 0), "sad"], [L(20, 0), "suspicious"], [B.bite, "excited"], [B.didnt, "proud"], [B.dim, "relieved"], [B.stars, "excited"], [L(27, 0), "relieved"], [L(30, 0), "tired"],
  ], { heading: 0, fx: { ...sweat, ...(F >= snap(B.bite) && F < B.bite + 24 ? { bang: F - snap(B.bite) } : {}) } });
  return F >= B.toaster30 - 30 ? asleep(s, F, 3) : s;
}, { sit: true });

// ================================================================== Kyle
export const KYLE_STAIR = STAIR_TOP.clone().add(V(-0.95, 0, 0.35));
export const KYLE_FENCE = V(FENCE_X + 0.45, 0, -7.3);
const ROLLER: Pose = { ...REST, arms: arms([0.62, 0.3], [0.2, 0.55], { gl: "fist" }), sway: -5, bob: 2 };
const FAN: Pose = { ...REST, arms: arms([0.55, -0.1], [0.3, 0.45], { gl: "fist", gr: "fist" }), sway: 8, lean: 0.25 };
export const kyleStair = role("kyle", kyleLook, KYLE_STAIR, (F) => {
  if (F < L(9, 0)) {
    // line 8: paint roller on his shoulder, proud of the neon, then the hustle
    const p = pose([[0, ROLLER], [B.sells - 6, { ...ROLLER, arms: arms([0.62, 0.3], [0.7, 0.1], { gl: "fist", gr: "point" }), sway: 6 }]], F);
    return st(alive(p, F, 9, [0.4]), F, 9, [[0, "proud"], [B.paints, "smug"], [B.sells, "grin"], [B.hour, "scheming"]], { heading: 0.45 });
  }
  if (F < L(17, 0)) {
    // line 16: Mom hands him the car keys; he spins them
    const spin = F > B.car ? { at: [0.62 + 0.06 * Math.cos(F / 2), -0.42 + 0.06 * Math.sin(F / 2)] as [number, number], grip: "point" as const } : { at: [0.6, 0.05] as [number, number], grip: "open" as const };
    const p = pose([[0, POSES.crossed], [B.mom - 4, { ...REST, arms: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.6, 0.05], grip: "open" }] as Pose["arms"] }]], F);
    return st({ ...p, arms: [p.arms[0], F > B.car ? spin : p.arms[1]] as Pose["arms"] }, F, 9, [[0, "smug"], [B.mom, "grin"], [B.car, "smug"]], { heading: -0.9 });
  }
  if (F < L(27, 0)) {
    // line 19: "Nice alarm, Sunshine!", pointing at you with the keys, laughing
    const p = pose([[0, POSES.point], [L(19, 2), { ...POSES.point, sway: 9, bob: 6 }]], F);
    return st(p, F, 9, [[0, "laughing"], [L(19, 2), "grin"]], { heading: -1.2, fx: { talk: talk(F, 19) ?? laughFlap(F, L(19, 0), LEND(19) - L(19, 0)) } });
  }
  // lines 27-28: his customers stream past; he shakes his fist at the sky
  const shake = (k: number) => [0.55 + 0.05 * Math.sin(F * 1.6 + k), -0.6 + 0.07 * Math.sin(F * 1.9 + k)] as [number, number];
  const p = F < L(28, 0) - 6 ? pose([[0, POSES.panic]], F) : F < L(28, 2) - 4 ? { ...REST, arms: [{ at: [0.25, 0.55], grip: "fist" }, { at: shake(0), grip: "fist" }] as Pose["arms"], sway: -6, bob: 5 } : { ...REST, arms: [{ at: shake(1), grip: "fist" }, { at: shake(0), grip: "fist" }] as Pose["arms"], sway: 4, bob: 10, squash: reactSquash(F - L(28, 2) + 4) };
  return st(p, F, 9, [[0, "shocked"], [B.empties, "worried"], [L(28, 0), "angry"]], { heading: -0.3, fx: { talk: talk(F, 28), ...(F >= L(28, 0) ? { steam: (F - L(28, 0)) / 30 } : {}) } });
});
export const kyleFence = role("kyle", kyleLook, KYLE_FENCE, (F) => {
  if (F < L(13, 0)) {
    // line 9: leaning over the fence, fanning cash at you
    const fanK = 0.05 * Math.sin(F / 3);
    const p = pose([[0, FAN], [B.cash - 4, { ...FAN, arms: arms([0.62, -0.25 + fanK], [0.3, 0.45]), sway: 10 }]], F);
    return st(p, F, 9, [[0, "smug"], [L(9, 2), "grin"], [B.cash, "smug"]], { heading: -Math.PI / 2 + 0.25, fx: { talk: talk(F, 9) } });
  }
  // line 14: laughing at you on your mattress
  return st(pose([[0, { ...REST, arms: arms([-0.2, 0.3], [0.65, -0.3], { gr: "point" }), sway: 10 }]], F), F, 9, [[0, "laughing"]], { heading: face(KYLE_FENCE, YOU_MAT), fx: { talk: laughFlap(F, L(14, 0), L(14, 6) - L(14, 0)) } });
});

// ================================================================== Mom, Dad, kids
export const MOM_KEYS = KYLE_STAIR.clone().add(V(-0.75, 0, 0.35));
export const mom = role("mom", momLook, MOM_KEYS, (F) => {
  const p = pose([[0, REST], [B.mom - 6, { ...REST, arms: arms([0.25, 0.6], [0.7, 0.05], { gr: "fist" }) }], [B.car + 6, { ...REST, arms: arms([0.25, 0.6], [0.3, -0.2], { gr: "open" }), tilt: 8 }]], F);
  return st(p, F, 13, [[0, "tired"], [B.mom, "pleading"], [B.car, "relieved"]], { heading: 1.0 });
});
const MOW_A = MOWER_START.clone(), MOW_B = MOWER_START.clone().add(V(1.9, 0, 0.3));
export const mowerAt = (F: number) => (F < L(29, 0) ? lerpV(MOW_A, MOW_B, span(F, B.dad - 10, L(4, 0) + 20)) : MOW_B.clone().add(V(-1.0, 0, 0.6)));
export const DAD_ON_MOWER = V(-0.25, 0.0, 0.56); // his card in front of the mower body (a card inside it clipped through the hood) // the card in the mower's frame (seat at x -0.25)
export const dad = role("dad", dadLook, (F) => mowerAt(F).add(DAD_ON_MOWER), (F) => {
  if (F < L(29, 0)) {
    const p = pose([[0, { ...SIT, arms: arms([0.6, 0.25], [0.6, 0.25]) }], [B.eleven - 6, { ...SIT, arms: arms([0.6, 0.25], [0.6, -0.6], { gr: "open" }) }]], F);
    return st(p, F, 17, [[0, "excited"], [B.eleven, "proud"]], { heading: 0.35 });
  }
  // asleep at the wheel; one arm slides off it on "asleep"
  return asleep(st(pose([[0, { ...SIT, arms: arms([0.6, 0.25], [0.6, 0.25]) }], [L(29, 8), { ...SIT, arms: arms([0.6, 0.25], [0.3, 0.75]), sway: -6 }]], F), F, 17, [[0, "tired"]], { heading: 0.4 }), F, 17);
}, { sit: true });
export const DAD_SEAT_H = MOWER_SEAT;
const KID_A = [V(-8, 0, 6.6), V(1.2, 0, 5.9)] as const, KID_B = [V(-9.2, 0, 7.3), V(0.2, 0, 6.8)] as const;
const runner = (name: string, look: Look, [a, b]: readonly [Vector3, Vector3], seed: number, off: number) => role(name, look, (F) => lerpV(a, b, clamp01((F - L(3, 0) - off) / 70)), (F) => {
  const t = clamp01((F - L(3, 0) - off) / 70);
  const r = t > 0 && t < 1 ? runPose(a.distanceTo(b) * t * 0.9) : REST;
  return st({ ...r, arms: arms([0.75, -0.45], [0.7, -0.5], { gl: "open", gr: "open" }) }, F, seed, [[0, "excited"], [L(3, 5), "laughing"]], { heading: face(a, b) });
});
export const kidA = runner("kidA", kidALook, KID_A, 21, 10);
export const kidB = runner("kidB", kidBLook, KID_B, 23, 0);

// ================================================================== the sleepless (queue, shop window, the street)
/** Queue member i: waiting (fidgeting, yawning), turning to stare at you (line 18), looking up (23-26), running out (27), asleep (29). */
export const queuer = (i: number) => {
  const at = QUEUE[i], look = QUEUE_LOOKS[i % QUEUE_LOOKS.length];
  return role(`q${i}`, look, () => at.clone(), (F) => {
    const pillow = i % 3 === 0;
    let p = pose([[0, pillow ? { ...REST, arms: arms([-0.25, 0.4], [-0.2, 0.38], { gl: "mitt", gr: "mitt" }) } : { ...REST, arms: arms([0.25, 0.6], [0.3, -0.05], { gr: "fist" }) }]], F);
    p = alive(p, F, 31 + i, [0.3, -0.3]);
    const lookUp = F >= L(23, 0) - 10 + (i % 4) * 2;
    const heading = F >= B.nothing + 6 + (i % 5) * 2 && F < L(19, 0) ? face(at, YOU_MAT) : lookUp ? 0.6 : Math.PI / 2;
    const keys: [number, Expr][] = [[0, i % 2 ? "tired" : "deadpan"], [B.nothing + 6, "suspicious"], [L(19, 0), "laughing"], [L(20, 0), "tired"], [B.walks, "confused"], [B.dim, "excited"], [B.stars, "relieved"]];
    const s = st({ ...p, tilt: lookUp ? -12 : p.tilt }, F, 31 + i, keys, { heading }, 0.5);
    return F >= L(29, 0) ? asleep(s, F, i) : s;
  }, { crowd: true });
};
export const QUEUERS = QUEUE.map((_, i) => queuer(i));
/** Line 5: faces pressed to the corner-mart window, staring at the box. */
export const SHOP_FACES = [V(19.3, 0, -7.1), V(20.35, 0, -6.75), V(21.75, 0, -7.1), V(22.65, 0, -6.75)];
export const shopper = (i: number) => role(`s${i}`, QUEUE_LOOKS[(i * 3 + 1) % QUEUE_LOOKS.length], SHOP_FACES[i], (F) => {
  const p = alive({ ...REST, arms: arms([0.62, -0.2], [0.6, -0.25], { gl: "open", gr: "open" }), lean: 0.3 }, F, 41 + i, [0, 0.2]);
  return st(p, F, 41 + i, [[0, "tired"], [B.darkness, "pleading"], [B.earth, "excited"]], { heading: Math.PI }, 0.5);
}, { crowd: true });
export const SHOPPERS = SHOP_FACES.map((_, i) => shopper(i));
/** Line 27: Kyle's customers climb out of the stairwell and run into the street to look up. */
const stairY = (z: number) => -STAIR.depth * clamp01((STAIR.z1 - z) / (STAIR.z1 - STAIR.z0 - 0.6));
export const climber = (i: number) => {
  const x = STAIR.x0 + 0.65, z0 = STAIR.z0 + 0.55, t0 = B.empties - 40 + i * 24;
  const at = (F: number) => {
    const t = clamp01((F - t0) / 60), z = z0 + (STAIR.z1 + 2.6 - z0) * t;
    return V(x + (t > 0.62 ? (i % 2 ? 2.6 : -2.6) * (t - 0.62) : 0), z < STAIR.z1 ? stairY(z) : 0, z);
  };
  return role(`c${i}`, QUEUE_LOOKS[(i * 2 + 3) % QUEUE_LOOKS.length], at, (F) => {
    const t = clamp01((F - t0) / 60);
    const r = t > 0 && t < 1 ? runPose(5 * t) : REST;
    return st({ ...r, arms: arms([0.6, -0.55], [0.65, -0.5], { gl: "open", gr: "open" }) }, F, 51 + i, [[0, "excited"], [B.up, "relieved"]], { heading: 0.15 }, 0.5);
  }, { crowd: true });
};
export const CLIMBERS = [0, 1, 2].map(climber);
/** Line 29: neighbours asleep where they stand or sit (lawn chairs on the lawn, the hood of a car). */
export const sleeper = (i: number) => role(`z${i}`, QUEUE_LOOKS[(i * 3 + 2) % QUEUE_LOOKS.length], SLEEP_CHAIRS[i].clone().add(V(0, 0, i < 3 ? 0.42 : -0.42)), (F) =>
  asleep(st({ ...SIT, arms: arms([0.35, 0.45], [0.4, 0.42]) }, F, 61 + i, [[0, "tired"]], { heading: i < 3 ? 0 : Math.PI }), F, i), { sit: true });
export const SLEEPERS = SLEEP_CHAIRS.map((_, i) => sleeper(i));

// ================================================================== street life: a neighbour watering his lawn all day
export const WATERER = V(-12.9, 0, 7.4);
export const waterer = role("waterer", QUEUE_LOOKS[5], WATERER, (F) => {
  const p = alive({ ...REST, arms: [{ at: [0.25, 0.62], grip: "fist" }, { at: [0.55, 0.05], grip: "fist" }], sway: 2 }, F, 111, [0.5, -0.2, 0.3]);
  return st(p, F, 111, [[0, "relieved"], [L(15, 0), "tired"]], { heading: 1.2, fx: F >= L(15, 0) ? { sweat: (F % 40) / 40 } : {} }, 0.5);
});

// ================================================================== the small rooms
// he pulls a coat sleeve over himself like a blanket on "night"
export const closetMan = role("closet", closetLook, CLOSET_SEAT.clone().add(V(0, 0, 0.12)), (F) =>
  asleep(st(pose([[0, { ...SIT, arms: arms([-0.3, 0.32], [-0.28, 0.3]), tilt: 6 }], [L(6, 5) - 4, { ...SIT, arms: arms([-0.3, 0.32], [0.45, -0.55], { gr: "fist" }), tilt: 12, bob: -6 }]], F), F, 71, [[0, "relieved"]], { heading: 0 }), F, 71), { sit: true });
export const CINEMA_SEATS = ROWS.flatMap((z, r) => SEATS_X.filter((_, c) => (r + c) % 2 === 0).map((x) => V(x, 0, z - 0.3)));
export const sleepersCinema = CINEMA_SEATS.map((p, i) => role(`m${i}`, QUEUE_LOOKS[(i * 7) % QUEUE_LOOKS.length], p, (F) =>
  asleep(st({ ...SIT, arms: arms([0.35, 0.45], [0.4, 0.42]) }, F, 81 + i, [[0, "tired"]], { heading: Math.PI }), F, i), { sit: true }));
export const fridgeMan = role("fridgeguy", fridgeLook, FRIDGE_SEAT, (F) => {
  const p = { ...SIT, arms: arms([-0.25, 0.32], [-0.22, 0.3], { gl: "mitt", gr: "mitt" }), tilt: 4 } as Pose;
  return st(alive(p, F, 91, [0.2]), F, 91, [[0, "relieved"], [B.fridge - 6, "smug"]], { heading: 0 });
}, { sit: true });
export const TV_MOM = V(LIVING.sofa.x - 0.45, 0, LIVING.sofa.z + 0.52), TV_DAD = V(LIVING.sofa.x + 0.45, 0, LIVING.sofa.z + 0.52);
const TVK = (F: number) => clamp01((F - (B.tv - 30)) / 40);
export const tvMom = role("tvmom", tvMomLook, TV_MOM, (F) => st({ ...SIT, arms: arms([0.35, 0.45], [0.3, 0.42]) }, F, 101, [[0, "excited"], [B.tv - 12, "angry"]], { heading: face(TV_MOM, LIVING.tv) }), { sit: true });
export const tvDad = role("tvdad", tvDadLook, TV_DAD, (F) => {
  const p = pose([[0, { ...SIT, arms: arms([0.35, 0.45], [0.3, 0.42]) }], [B.tv - 10, { ...SIT, arms: arms([0.6, -0.2], [0.6, -0.25], { gl: "open", gr: "open" }), shrug: 14 }]], F);
  return st(p, F, 103, [[0, "excited"], [B.tv - 10, "disgusted"]], { heading: face(TV_DAD, LIVING.tv) });
}, { sit: true });
export const BRO_A = V(LIVING.tv.x - 2.6, 0, LIVING.tv.z - 0.75), BRO_B = V(LIVING.tv.x + 1.4, 0, LIVING.tv.z - 0.75);
export const brother = role("brother", brotherLook, (F) => lerpV(BRO_A, BRO_B, TVK(F)), (F) => {
  const t = TVK(F);
  const w = walkPose(BRO_A.distanceTo(BRO_B) * t, t > 0 && t < 1 ? 1 : 0);
  return st({ ...w, arms: arms([0.25, 0.6], [0.3, 0.0], { gr: "fist" }) }, F, 107, [[0, "smug"]], { heading: face(BRO_A, BRO_B) });
});

// ================================================================== held props
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
export const handAt = (r: Role, F: number, cam: Vector3, hand: "left" | "right") => { const s = r.state(F); return handWorld(r.look, s.pose, r.at(F), cam, hand, 0.06, s.heading); };
export { YOU_MAT as YOU_MATTRESS };
export const DAD_MOWER = { at: mowerAt };
