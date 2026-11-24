import { Object3D, Vector3 } from "three";
import { flow, perform } from "../../../kit/toon/acting";
import { CamPose, glide } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Hand, Look } from "../../../kit/toon/cast";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { laughFlap, talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import { SEAT_M, headHeight } from "../../../kit/toon/figure";
import type { MovingProp } from "../../../kit/toon/guard";
import { POSES, REST, alive, moveCurve, movePose, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import SCRIPT from "../../../videos/followers-make-you-tall/script.json";
import MOUTH from "../../../videos/followers-make-you-tall/voice/mouth.json";
import WORDS from "../../../videos/followers-make-you-tall/voice/words.json";
import { KID_LOOKS, PARENT_LOOKS, cashierLook, grandpaLook, kaylaLook, miaLook, momLook, tylerLook, zoeLook } from "./cast";
import { V, clamp01 } from "./common";
import type { CritterState } from "./critters";
import { BUS, LUNCH_FLOOR } from "./props";
import { CLASS, DESK, DOOR_FRAME, HOME, KITCHEN, ZOE_LOCKER, BELT } from "./rooms";
import { BUS_STOP, GYM, LOT, POND, WALK_N, WALK_S } from "./town";

/**
 * followers-make-you-tall (episode 8, "In this world..."), timing + cast. Every beat is locked to words.json through the
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
export const FRAMES = LAST + 40; // ~1.3 s of the last shot still moving after the last word (user 2026-11-24)
export const span = (F: number, a: number, b: number) => glide((F - a) / Math.max(b - a, 1));
export const lerpV = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t);
const WORD_F = words.map((x) => Math.round(x.start * FPS));
/** One frame before the first word starting at or after k (reactions land 0-3 f before their word). */
export const snap = (k: number) => { const w = WORD_F.find((x) => x >= k); return w === undefined ? k : w - 1; };

// ------------------------------------------------------------------ story beats
export const B = {
  ding: 4, more: L(1, 4), taller: L(1, 9),
  mom: L(2, 1), normal: L(2, 7),
  kayla: L(3, 0), dance: L(3, 3), now: L(3, 5), rides: L(3, 11), roof: L(3, 15),
  grandpa: L(4, 1), phone4: L(4, 5), inches4: L(4, 7), cat: L(4, 13), bingo: L(4, 15),
  have: L(5, 1), three: L(5, 2), bot: L(5, 10), hot: L(5, 12),
  four: L(6, 2), school: L(6, 9), lunchbox: L(6, 12),
  friday: L(7, 2), zoe: L(7, 7), prom: L(7, 9), loves: L(7, 15), ducks: L(7, 16),
  tyler: L(8, 3), million: L(8, 7), he8: L(8, 9), tall8: L(8, 12),
  sneezes9: L(9, 2), rains: L(9, 4),
  hey: L(10, 0), ladder10: L(10, 4),
  notice: L(11, 2), every: L(11, 5), duck11: L(11, 9), stop: L(11, 15),
  morning12: L(12, 2), taller12: L(12, 7),
  weird: L(13, 3), buy: L(13, 5), loaves: L(13, 7), bread13: L(13, 9),
  map: L(14, 3), pond: L(14, 6),
  kid: L(15, 0), friday15: L(15, 7),
  pass: L(16, 3), bread16: L(16, 5),
  night: L(17, 1), writes: L(17, 3), promQ: L(17, 4), jet: L(17, 10),
  yes18: L(18, 4), standing: L(18, 7), bag: L(18, 13),
  sees: L(19, 1), laughs: L(19, 3), sneezes: L(19, 5),
  blasts: L(20, 2), town20: L(20, 6),
  quack: L(21, 4),
  ducks22: L(22, 1), kids: L(22, 6), parents: L(22, 11),
  van: L(23, 2), all: L(23, 7), you23: L(23, 9),
  ten: L(24, 0), fifty: L(24, 2), three00: L(24, 3), nine: L(24, 5),
  eye: L(25, 1), actually: L(25, 6), up: L(25, 9),
  lean: L(26, 1), heyT: L(26, 3), ladder: L(26, 7),
  kneel: L(27, 2), zoe27: L(27, 5), ducks27: L(27, 8),
  yes: L(28, 2),
  duck29: L(29, 2), still: L(29, 3), follower: L(29, 6),
};

// ------------------------------------------------------------------ helpers
export type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean; scale?: (F: number) => number };
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
export const role = (name: string, look: Look, at: Vector3 | ((F: number) => Vector3), raw: (F: number) => CharState, o: { sit?: boolean; crowd?: boolean; scale?: number | ((F: number) => number) } = {}): Role => ({
  name, look, at: typeof at === "function" ? at : () => at.clone(), sit: o.sit,
  scale: o.scale === undefined ? undefined : typeof o.scale === "number" ? ((k: number) => () => k)(o.scale) : o.scale,
  state: (F) => { const s = flow(raw, F, o.crowd ? 0.5 : 1); return o.sit ? { ...s, pose: { ...s.pose, sit: 1 } } : s; },
});
export const SIT: Pose = { ...REST, sit: 1 };
export const face = (from: Vector3, to: Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
export const arms = (l: [number, number], r: [number, number], o: { gl?: Pose["arms"][0]["grip"]; gr?: Pose["arms"][0]["grip"]; front?: boolean } = {}): Pose["arms"] =>
  [{ at: l, grip: o.gl ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }, { at: r, grip: o.gr ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }];
export const scaleOf = (r: Role, F: number) => r.scale?.(F) ?? 1;
export const headOf = (r: Role, F: number) => r.at(F).add(V(0, headHeight(r.look, r.state(F).pose) * scaleOf(r, F), 0));
const talk = (F: number, line: number) => talkAt(MOUTH_T, F, [[L(line, 0), LEND(line)]]);
/** A size that pops from a to b at frame f0: 6-frame rise with a 6 % overshoot settling over 8 frames. */
const pop = (a: number, b: number, f0: number) => (F: number) => {
  const t = (F - f0) / 6;
  if (t <= 0) return a;
  if (t < 1) return a + (b - a) * moveCurve(t * 10);
  const s = Math.max(0, 1 - (F - f0 - 6) / 8);
  return b * (1 + 0.06 * s * Math.sin(((F - f0 - 6) / 8) * Math.PI));
};
/** A chain of pops: [frame, size] keys. */
const pops = (k0: number, keys: [number, number][]) => (F: number) => {
  let v = k0;
  for (const [f, s] of keys) if (F >= f) v = pop(v, s, f)(F);
  return v;
};
const TINY = 0.075; // 4 inches: you, all through lines 4-23
const GRAMPS = 0.036; // 2 inches

// ================================================================== line 1-2: the rule in the street (day)
/** The girl whose phone dings (Kayla, before the bus): she shoots up two storeys. */
export const KAYLA_A = V(-3.2, 0.12, -5.5);
export const kaylaA = role("kayla", kaylaLook, KAYLA_A, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [-0.12, 0.05], { gr: "fist", front: true }), tilt: 8 }], [B.ding + 6, { ...REST, arms: arms([0.6, -0.4], [-0.1, 0.0], { gl: "open", front: true }), bob: 8, tilt: -10 }], [B.more, { ...REST, arms: arms([0.25, 0.55], [-0.12, 0.05], { front: true }), tilt: -6 }]], F);
  return st({ ...alive(p, F, 41, [0.2, -0.2]), squash: reactSquash(F - B.ding - 2) }, F, 41, [[0, "neutral"], [B.ding + 2, "shocked"], [B.more - 10, "excited"], [L(1, 6), "proud"]], { heading: 0.1, fx: F >= B.ding + 2 && F < B.ding + 22 ? { ringEyes: true } : {} });
}, { scale: pops(1, [[B.ding + 4, 4.6]]) });
/** Line 1's "the taller you get": a street of people at their follower heights, one grows on "taller". */
const streetPerson = (name: string, look: Look, at: Vector3, s: number | ((F: number) => number), seed: number, keys: [number, Expr][], p0: Pose = REST) =>
  role(name, look, at, (F) => st(alive(p0, F, seed, [0.3, -0.3]), F, seed, keys, { heading: 0.0 }, 0.6), { scale: s, crowd: true });
export const STREET_A = [
  streetPerson("p1", PARENT_LOOKS[0], V(13.2, 0.12, -5.9), 1, 51, [[0, "neutral"], [B.taller, "shocked"]], { ...REST, arms: arms([0.25, 0.6], [-0.12, 0.05], { front: true }) }),
  streetPerson("p2", KID_LOOKS[3], V(15.6, 0.12, -5.5), 2.3, 53, [[0, "smug"], [B.taller, "confused"]]),
  streetPerson("p3", PARENT_LOOKS[2], V(21.2, 0.12, -5.6), 6, 55, [[0, "proud"], [B.taller, "smirk"]], POSES.hips),
  streetPerson("p4", PARENT_LOOKS[4], V(18.2, 0.12, -4.9), pops(1.1, [[B.taller - 2, 3.4]]), 57, [[0, "neutral"], [B.taller - 2, "excited"]], { ...REST, arms: arms([0.25, 0.6], [-0.12, 0.05], { front: true }) }),
];

// ================================================================== line 2: Mom, a perfectly normal 5'6"
export const MOM_AT = KITCHEN.clone().add(V(-0.05, 0, 0.55));
export const mom = role("mom", momLook, MOM_AT, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [-0.2, 0.1], { front: true }) }], [B.normal - 12, { ...REST, arms: arms([0.25, 0.6], [-0.15, -0.28], { front: true }), tilt: -4 }], [B.normal + 14, { ...REST, arms: arms([0.6, 0.1], [-0.2, 0.1], { gl: "open", front: true }), shrug: 10 }]], F);
  return st(alive(p, F, 61, [0.2, -0.3]), F, 61, [[0, "relieved"], [B.normal - 12, "deadpan"], [L(2, 9), "smug"]], { heading: 0.35 });
});

// ================================================================== line 3: Kayla's dance video, then the bus roof
export const KAYLA_DANCE = V(-6.5, 0.12, WALK_S - 1.4);
export const kaylaDance = role("kayla", kaylaLook, KAYLA_DANCE, (F) => {
  const beat = Math.floor((F - B.kayla) / 8) % 4;
  const moves: Pose[] = [
    { ...REST, arms: arms([0.7, -0.6], [-0.1, -0.35], { gl: "open", gr: "fist", front: true }), sway: 9, bob: 6, lift: [0, 18] },
    { ...REST, arms: arms([0.6, 0.0], [-0.1, -0.3], { gl: "open", front: true }), sway: -6, bob: -4 },
    { ...REST, arms: arms([0.72, -0.7], [-0.1, -0.35], { gl: "point", front: true }), sway: -9, bob: 8, lift: [18, 0] },
    { ...REST, arms: arms([0.5, 0.2], [-0.1, -0.3], { gl: "open", front: true }), sway: 5, bob: -2 },
  ];
  const p = pose([[0, moves[3]], [B.kayla + 4 + Math.floor((F - B.kayla) / 8) * 8, moves[beat]]], F);
  return st(p, F, 43, [[0, "excited"], [B.dance, "grin"], [L(3, 4), "proud"]], { heading: Math.PI + 0.3 });
});
/** The bus drives east along the north lane; Kayla sits on its roof edge, legs hanging down its side. */
export const BUS_Z = -2.0;
export const busX = (F: number) => -34 + 0.42 * (F - L(3, 5));
export const KAYLA_K = 8; // her size on the bus (an eight-times girl: the bus is up to her knees)
export const kaylaBus = role("kaylaBus", kaylaLook, (F) => V(busX(F) + 1.6, BUS.h - SEAT_M * KAYLA_K, BUS_Z + BUS.w / 2 + 0.08), (F) => {
  const sip = Math.floor((F - B.rides) / 20) % 2 === 0;
  const p = { ...SIT, arms: arms([0.4, 0.5], sip ? [-0.12, -0.32] : [0.2, 0.3], { gr: "fist", front: true }), tilt: sip ? -8 : 4, sway: 2 * Math.sin(F / 6) } as Pose;
  return st(p, F, 45, [[0, "smug"], [B.rides, "relieved"], [B.roof, "grin"]], { heading: 0.1 });
}, { sit: true, scale: KAYLA_K });

// ================================================================== line 4: Grandpa rides the cat to bingo
export const CAT_Z = WALK_N + 1.0;
export const catX = (F: number) => -16 + 0.045 * (F - L(4, 0));
export const catAt = (F: number) => V(catX(F), 0.12, CAT_Z);
export const CAT_SIZE = 0.34;
export const catState = (F: number): CritterState => ({ phase: (F / 11) % 1, facing: 1, expr: F > B.bingo - 6 ? "happy" : "neutral", look: 0.3 * Math.sin(F / 20) });
/** Grandpa's seat on the cat's back (the drawn body top, toward the lens). */
const CAT_BACK = (CAT_SIZE * (500 - 150 - 64)) / 512;
export const grandpa = role("grandpa", grandpaLook, (F) => catAt(F).add(V(-0.02, CAT_BACK - SEAT_M * GRAMPS + 0.004 * Math.abs(Math.sin((F / 11) * Math.PI * 2)), 0.03)), (F) => {
  const p = pose([[0, { ...SIT, arms: arms([0.62, 0.15], [0.55, -0.45], { gr: "fist" }), tilt: -4 }], [B.bingo - 8, { ...SIT, arms: arms([0.62, 0.15], [0.7, -0.75], { gr: "open" }), tilt: -10, bob: 4 }]], F);
  return st(p, F, 71, [[0, "determined"], [B.inches4, "smug"], [B.bingo, "excited"]], { heading: Math.PI / 2 });
}, { sit: true, scale: GRAMPS });

// ================================================================== lines 5, 12-16: tiny you at home
export const YOU_DESK = DESK.clone().add(V(-0.3, 0, 0.12));
export const PHONE_AT = DESK.clone().add(V(-0.16, 0, 0.12));
export const youPhone = role("you", youLook, YOU_DESK, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.62, 0.25], { gr: "point" }) }], [B.bot - 6, { ...REST, arms: arms([0.25, 0.6], [0.7, -0.1], { gr: "point" }), sway: 4 }], [B.hot, { ...POSES.facepalm }]], F);
  return st(alive(p, F, 3, [0.5, 0.3]), F, 3, [[0, "proud"], [B.three, "deadpan"], [L(5, 4), "smug"], [B.bot, "suspicious"], [B.hot, "disgusted"]], { heading: Math.PI / 2 });
}, { scale: TINY });
/** Line 12: your back to the door casing, today's pencil mark lands a hair above your head. */
export const YOU_FRAME = V(HOME.x0 + 0.07, 0, DOOR_FRAME.z + DOOR_FRAME.w / 2 + 0.07);
export const youFrame = role("you", youLook, YOU_FRAME, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.25, 0.6]), tilt: -2 }], [B.taller12 - 4, { ...REST, arms: arms([0.7, -0.5], [0.7, -0.5], { gl: "open", gr: "open" }), bob: 10, tilt: -12 }]], F);
  return st(p, F, 3, [[0, "suspicious"], [B.morning12, "confused"], [B.taller12, "excited"]], { heading: Math.PI / 2 - 0.4, fx: F >= snap(B.taller12) && F < B.taller12 + 14 ? { bang: F - snap(B.taller12) } : {} });
}, { scale: TINY });
/** Line 13: your face goes scheming (at the desk). */
export const youScheme = role("you", youLook, YOU_DESK, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.25, 0.6]) }], [B.weird - 8, POSES.chin]], F);
  return st(p, F, 3, [[0, "confused"], [B.weird - 6, "scheming"]], { heading: 0.2 });
}, { scale: TINY });
/** Line 14: on the map, you circle the last pond with a pen bigger than you. */
export const YOU_MAP = DESK.clone().add(V(0.12, 0.001, 0.1));
export const youMap = role("you", youLook, YOU_MAP, (F) => {
  const k = Math.sin(F / 4);
  const p = { ...REST, arms: arms([0.5, 0.2], [-0.2 + 0.12 * k, 0.2 + 0.1 * Math.cos(F / 4)], { gl: "open", gr: "fist", front: true }), lean: 0.3, bob: -10, sway: 6 * k } as Pose;
  return st(p, F, 3, [[0, "determined"], [B.pond, "scheming"]], { heading: -0.4 });
}, { scale: TINY });
/** Lines 15-16: Grandpa rides the cat onto the desk; you hold up a bun like a shield. */
export const DESK_CAT = DESK.clone().add(V(-0.36, 0, 0.12));
export const grandpaDesk = role("grandpa", grandpaLook, () => DESK_CAT.clone().add(V(-0.02, CAT_BACK - SEAT_M * GRAMPS, 0.03)), (F) => {
  const poke = Math.max(0, Math.sin((F - B.kid) / 5)) * (F > B.kid && F < B.friday15 + 10 ? 1 : 0);
  const p = { ...SIT, arms: arms([0.62, 0.15], [0.7 + 0.1 * poke, 0.15 - 0.2 * poke], { gr: "point" }), tilt: -6 } as Pose;
  return st(p, F, 71, [[0, "suspicious"], [B.kid, "angry"], [B.friday15, "deadpan"]], { heading: Math.PI / 2 - 0.3, fx: { talk: talk(F, 15) } });
}, { sit: true, scale: GRAMPS });
export const YOU_BUN = DESK.clone().add(V(-0.05, 0, 0.14));
export const youBun = role("you", youLook, YOU_BUN, (F) => {
  const p = pose([[0, POSES.crossed], [B.pass - 8, { ...REST, arms: arms([-0.25, 0.1], [-0.2, 0.05], { gl: "mitt", gr: "mitt", front: true }), tilt: 6 }]], F);
  return st(p, F, 3, [[0, "deadpan"], [B.pass, "smug"]], { heading: -0.5 });
}, { scale: TINY });

// ================================================================== line 6: the bus stop, Mia's lunchbox (morning)
export const MIA_AT = BUS_STOP.clone().add(V(-1.0, 0.12, 0.95));
export const mia = role("mia", miaLook, MIA_AT, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.55, 0.25], { gr: "fist" }) }], [B.lunchbox - 10, { ...REST, arms: arms([0.15, 0.2], [0.55, 0.25], { gl: "open", gr: "fist" }), tilt: 6 }]], F);
  return st(alive(p, F, 81, [0.4, -0.2]), F, 81, [[0, "excited"], [B.school, "grin"], [B.lunchbox, "smug"]], { heading: 0.3 });
});
/** You ride in the lunchbox: standing on a bun inside, your head over the rim (the lid snaps shut on "lunchbox"). */
export const youLunch = (box: (F: number) => Vector3) => role("you", youLook, (F) => box(F).add(V(0.03, LUNCH_FLOOR + 0.062, 0.0)), (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.62, 0.15], [0.62, 0.12], { gl: "open", gr: "open" }) }], [B.lunchbox - 8, { ...REST, arms: arms([0.72, -0.5], [0.72, -0.5], { gl: "open", gr: "open" }), bob: -4 }]], F);
  return st(p, F, 3, [[0, "tired"], [B.four, "deadpan"], [B.school, "sad"], [B.lunchbox - 4, "shocked"]], { heading: 0.2 });
}, { scale: TINY });

// ================================================================== line 7: the school hallway
export const ZOE_AT = ZOE_LOCKER.clone().add(V(0.35, 0, 0.62));
export const zoe = role("zoe", zoeLook, ZOE_AT, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.55, -0.15], { gr: "open" }) }], [B.prom - 6, { ...REST, arms: arms([0.25, 0.6], [-0.2, 0.25], { gr: "fist", front: true }) }], [B.loves - 6, { ...REST, arms: arms([-0.25, 0.25], [-0.2, 0.25], { gl: "mitt", gr: "mitt", front: true }), tilt: 8 }]], F);
  return st(alive(p, F, 91, [0.3, -0.4]), F, 91, [[0, "relieved"], [B.prom, "neutral"], [B.loves, "excited"], [B.ducks, "proud"]], { heading: F < B.prom ? Math.PI : 0.2 });
});
export const YOU_HALL = ZOE_AT.clone().add(V(0.3, 0, 0.32));
export const youHall = role("you", youLook, YOU_HALL, (F) => {
  const p = { ...REST, arms: arms([0.25, 0.6], [-0.15, 0.1], { gr: "fist", front: true }), tilt: -12 } as Pose;
  return st(alive(p, F, 3, [-0.4]), F, 3, [[0, "nervous"], [B.loves, "pleading"], [B.ducks, "excited"]], { heading: -0.4, fx: { sweat: (F % 40) / 40 } });
}, { scale: TINY });

// ================================================================== lines 8-10: Tyler (giant, north of town; then at the classroom window)
export const TYLER_DAY = V(14, 0, -150), TYLER_K = 170;
export const tylerDay = role("tyler", tylerLook, TYLER_DAY, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.75, -0.75], { gr: "fist" }), tilt: -6 }], [B.sneezes9 - 10, { ...REST, arms: arms([-0.1, -0.2], [0.75, -0.6], { gl: "open", gr: "fist", front: true }), tilt: -14, bob: -10 }], [B.sneezes9 + 4, { ...REST, arms: arms([0.6, 0.2], [0.75, -0.6], { gl: "open" }), tilt: 12, bob: 14, squash: 1 }], [B.rains, { ...REST, arms: arms([0.25, 0.6], [0.75, -0.75]), tilt: -4 }]], F);
  return st(p, F, 101, [[0, "smug"], [B.million, "proud"], [B.sneezes9 - 10, "nervous"], [B.sneezes9, "shocked"], [B.rains, "grin"]], { heading: 0 });
}, { scale: TYLER_K });
/** Line 10: he crouches outside the classroom so his face fills the east windows. */
export const TYLER_WIN_K = 13;
export const TYLER_WIN = V(CLASS.x1 + 3.6, 0, 0.1);
export const tylerWin = role("tyler", tylerLook, (F) => TYLER_WIN.clone().setY(1.95 - 1.12 * TYLER_WIN_K + 0.25 * span(F, B.hey - 20, B.hey)), (F) => {
  const p = { ...REST, arms: arms([0.25, 0.6], [0.25, 0.6]), lean: 0.4, tilt: -6 + 4 * Math.sin(F / 9) } as Pose;
  return st(p, F, 101, [[0, "grin"], [B.ladder10 - 6, "laughing"]], { heading: -Math.PI / 2, fx: { talk: talk(F, 10) ?? laughFlap(F, LEND(10), 20) } });
}, { scale: TYLER_WIN_K });
export const YOU_CLASS = V(CLASS.x0 + 2.4 + 2 * 1.9 + 0.05, 0.765, -0.3);
export const youClass = role("you", youLook, YOU_CLASS, (F) => st(pose([[0, POSES.crossed], [B.hey - 4, { ...REST, arms: arms([0.6, 0.2], [0.6, 0.2], { gl: "open", gr: "open" }), bob: -6, shrug: 12 }]], F), F, 3, [[0, "deadpan"], [B.hey, "shocked"], [B.ladder10, "angry"]], { heading: Math.PI / 2 }), { scale: TINY });

// ================================================================== lines 11-12: the duck follows you (morning)
export const WALK_Z = WALK_N + 1.3;
export const walkX = (F: number) => -12 + 0.022 * (F - L(11, 0));
export const youWalk = role("you", youLook, (F) => V(walkX(F), 0.12, WALK_Z), (F) => {
  const d = 0.022 * (F - L(11, 0)) / TINY;
  const w = walkPose(d, 1);
  const glanceBack = F > B.duck11 - 4 && F < B.duck11 + 30;
  return st(w, F, 3, [[0, "tired"], [B.notice, "suspicious"], [B.duck11, "confused"], [B.stop, "suspicious"]], { heading: glanceBack ? -Math.PI / 2 + 0.6 : Math.PI / 2 });
}, { scale: TINY });
export const DUCK_SIZE = 0.3;
export const duckWalkAt = (F: number) => V(walkX(F - 10) - 0.42, 0.12, WALK_Z + 0.06);
export const duckWalk = (F: number): CritterState => ({ phase: (F / 9) % 1, facing: 1, expr: F > B.duck11 && F < B.duck11 + 30 ? "happy" : "neutral" });

// ================================================================== line 13: the bread mountain at Fresh Mart
export const PILE_TOP = BELT.y + 0.42;
export const YOU_PILE = V(-0.15, PILE_TOP, 0.02);
export const youPile = role("you", youLook, YOU_PILE, (F) => {
  const p = pose([[0, { ...REST, arms: arms([0.55, -0.1], [0.55, -0.12], { gl: "open", gr: "open" }) }], [B.bread13 - 6, { ...POSES.hips, tilt: -6 }]], F);
  return st(p, F, 3, [[0, "scheming"], [B.loaves, "proud"], [B.bread13, "smug"]], { heading: 0.4 });
}, { scale: TINY });
export const CASHIER = V(0.55, 0, -0.78);
export const cashier = role("cashier", cashierLook, CASHIER, (F) => st(alive({ ...REST, arms: arms([0.3, 0.45], [0.3, 0.42]) }, F, 111, [0.5, 0.3]), F, 111, [[0, "neutral"], [B.loaves, "confused"], [B.bread13, "deadpan"]], { heading: 0.2 }));

// ================================================================== night: prom (lines 17-29)
export const TYLER_N = V(36, 0, 125), TYLER_NK = 170;
/** Tyler writes PROM? in the sky with a jet (right hand), laughs, sneezes; then is out-grown and looks up. */
const WRITE = [B.writes - 6, B.jet + 6] as const;
/** The writing hand's path on the card (design units of `at`): P, R, O, M, ? as a quick scribble. */
export const writeHand = (F: number): [number, number] => {
  const t = clamp01((F - WRITE[0]) / (WRITE[1] - WRITE[0]));
  const u = t * 5, k = Math.floor(Math.min(u, 4.999)), f = u - k;
  const x0 = -0.2 + k * 0.28;
  const strokes: ((f: number) => [number, number])[] = [
    (f) => (f < 0.5 ? [x0, -1.0 + f * 1.0] : [x0 + 0.18 * Math.sin((f - 0.5) * 2 * Math.PI), -1.0 + 0.25 * (1 - Math.cos((f - 0.5) * 2 * Math.PI))]),
    (f) => (f < 0.6 ? [x0 + 0.16 * Math.sin(f * 1.66 * Math.PI), -1.0 + 0.3 * f] : [x0 + 0.2 * (f - 0.6) * 2.5, -0.82 + 0.32 * (f - 0.6) * 2.5]),
    (f) => [x0 + 0.1 + 0.13 * Math.sin(f * 2 * Math.PI), -0.78 - 0.22 * Math.cos(f * 2 * Math.PI)],
    (f) => [x0 + 0.25 * f, -0.55 - 0.45 * Math.abs(Math.sin(f * 2 * Math.PI))],
    (f) => (f < 0.8 ? [x0 + 0.1 * Math.sin(f * 1.25 * Math.PI * 1.3), -1.0 + 0.4 * f] : [x0 + 0.02, -0.5]),
  ];
  return strokes[k](f);
};
export const tylerNight = role("tyler", tylerLook, TYLER_N, (F) => {
  if (F < L(19, 0)) {
    const writing = F >= WRITE[0] && F <= WRITE[1];
    const p = { ...REST, arms: [{ at: [0.25, 0.6], grip: "fist" }, { at: writing ? writeHand(F) : [0.62, -0.7], grip: "fist" }] as Pose["arms"], tilt: -4, sway: writing ? 3 * Math.sin(F / 7) : 0 } as Pose;
    return st(p, F, 101, [[0, "smug"], [B.promQ, "proud"], [B.yes18, "grin"], [B.bag, "suspicious"]], { heading: Math.PI });
  }
  if (F < L(24, 0)) {
    const p = pose([[0, { ...REST, arms: arms([0.6, 0.3], [0.62, 0.25], { gl: "open", gr: "open" }), sway: 6, bob: 8 }], [B.sneezes - 12, { ...REST, arms: arms([-0.1, -0.25], [-0.08, -0.22], { gl: "open", gr: "open", front: true }), tilt: -16, bob: -14 }], [B.sneezes + 2, { ...REST, arms: arms([0.7, -0.2], [0.7, -0.25], { gl: "open", gr: "open" }), tilt: 16, bob: 18, squash: 1 }], [B.blasts + 10, POSES.crossed]], F);
    return st(p, F, 101, [[0, "laughing"], [B.sneezes - 12, "nervous"], [B.sneezes, "shocked"], [B.blasts + 10, "smug"], [B.parents, "confused"], [B.you23, "worried"]], { heading: Math.PI, fx: { talk: laughFlap(F, B.laughs - 4, 22) } });
  }
  // you out-grow him: he cranes his neck up at you, then goes red
  const p = pose([[0, POSES.crossed], [B.nine, { ...REST, arms: arms([0.6, 0.1], [0.6, 0.1], { gl: "open", gr: "open" }), tilt: -20, bob: -6 }], [B.ladder, { ...REST, arms: arms([0.3, 0.5], [0.3, 0.5]), tilt: -24, shrug: 16 }]], F);
  return st(p, F, 101, [[0, "worried"], [B.three00, "shocked"], [B.actually, "scared"], [B.ladder, "sad"]], { heading: Math.PI + 0.5, fx: F >= B.ladder - 2 ? { fill: { color: "#e8342c", t: clamp01((F - B.ladder + 2) / 8) } } : {} });
}, { scale: TYLER_NK });
export const ZOE_N = V(37.2, 0.12, GYM.front - 4.2);
export const zoeNight = role("zoe", zoeLook, ZOE_N, (F) => {
  if (F < L(27, 0)) {
    const p = pose([[0, { ...REST, arms: arms([-0.1, -0.12], [-0.08, -0.1], { gl: "open", gr: "open", front: true }), tilt: -14 }], [B.yes18 + 10, { ...REST, arms: arms([0.25, 0.4], [-0.08, -0.12], { gr: "open", front: true }), tilt: -16 }], [B.you23, { ...REST, arms: arms([0.6, 0.2], [0.6, 0.2], { gl: "open", gr: "open" }), tilt: -20, bob: 6 }]], F);
    return st(alive(p, F, 91, [0.2]), F, 91, [[0, "excited"], [B.promQ, "pleading"], [B.blasts, "shocked"], [B.ducks22, "excited"], [B.three00, "shocked"]], { heading: Math.PI + 0.3 });
  }
  const jump = F >= B.yes - 4 ? Math.abs(Math.sin(((F - B.yes + 4) / 14) * Math.PI)) * 22 : 0;
  const p = pose([[0, { ...REST, arms: arms([-0.12, -0.15], [-0.1, -0.12], { gl: "open", gr: "open", front: true }), tilt: -18 }], [B.yes - 6, { ...REST, arms: arms([0.72, -0.75], [0.72, -0.75], { gl: "open", gr: "open" }), tilt: -18 }]], F);
  return st({ ...p, bob: (p.bob ?? 0) + jump, lift: [jump * 0.8, jump * 0.8] }, F, 91, [[0, "pleading"], [B.ducks27, "crying"], [B.yes, "laughing"], [B.duck29, "relieved"]], { heading: Math.PI + 0.4, fx: F >= B.yes ? { blush: 0.7 } : {} });
});
export const YOU_LOT = V(31.5, 0.01, 17);
/** You in the lot: tiny with your bag (18-23), then growing in four pops (24), then giant (25-29). */
export const youScale = pops(TINY, [[B.ten - 1, 2.2], [B.fifty - 1, 11], [B.three00 - 1, 66], [B.nine - 1, 200]]);
export const youLot = role("you", youLook, YOU_LOT, (F) => {
  if (F < L(24, 0)) {
    const p = pose([[0, { ...REST, arms: arms([0.25, 0.6], [0.35, 0.3], { gr: "fist" }) }], [B.sneezes - 4, { ...REST, arms: arms([0.7, -0.4], [0.72, -0.45], { gl: "open", gr: "open" }), bob: 8, sway: -10 }], [B.quack - 8, { ...REST, arms: arms([0.25, 0.6], [0.25, 0.6]), tilt: -4 }], [B.ducks22, { ...REST, arms: arms([0.62, 0.0], [0.62, 0.0], { gl: "open", gr: "open" }), tilt: -8 }]], F);
    return st(alive(p, F, 3, [0.4, -0.4]), F, 3, [[0, "worried"], [B.bag, "nervous"], [B.laughs, "sad"], [B.sneezes, "shocked"], [B.town20, "crying"], [B.quack, "suspicious"], [B.ducks22, "excited"], [B.you23, "shocked"]], { heading: Math.PI + 0.2 });
  }
  if (F < L(27, 0)) {
    const p = pose([[0, { ...REST, arms: arms([0.7, -0.5], [0.7, -0.5], { gl: "open", gr: "open" }), bob: 8 }], [B.eye - 4, POSES.hips], [B.lean - 4, { ...REST, arms: arms([0.2, 0.55], [0.2, 0.55]), lean: 1, bob: -20, tilt: 14 }]], F);
    return st(p, F, 3, [[0, "shocked"], [B.nine, "excited"], [B.eye, "proud"], [B.up, "smug"], [B.heyT, "grin"], [B.ladder, "smirk"]], { heading: 0.0, fx: { talk: talk(F, 26) } });
  }
  const p = pose([[0, POSES.crouch], [B.yes, { ...POSES.crouch, arms: arms([0.7, -0.4], [0.12, 0.9], { gl: "open", gr: "mitt" }) }]], F);
  const wink = F >= B.follower - 2 && F < B.follower + 14;
  return st(p, F, 3, [[0, "nervous"], [B.zoe27, "pleading"], [B.yes, "laughing"], [B.duck29, "proud"]], { heading: 0.0, blink: wink || undefined } as Partial<CharState>);
}, { scale: youScale });
/** The neighbour's duck: beside you in the lot, then at your giant sneaker. */
export const DUCK_LOT = YOU_LOT.clone().add(V(0.34, 0, 0.12));
export const duckLot = (F: number): CritterState => ({ phase: F > B.ducks22 ? (F / 9) % 1 : 0.0, facing: -1, expr: F > B.sneezes && F < B.quack ? "shocked" : F >= B.follower - 2 ? "proud" : F > B.quack ? "quack" : "neutral", look: F >= B.duck29 ? -0.5 : 0, bob: F >= B.still - 2 && F < B.still + 12 ? 10 : 0 });
/** Line 21: the pond duck surfaces with a quack. */
export const POND_DUCK = V(POND.x + 1.4, 0.04, POND.z - 0.8);
export const pondDuck = (F: number): CritterState => ({ phase: 0.25, facing: 1, expr: F >= B.quack - 3 && F < B.quack + 14 ? "quack" : "neutral", bob: 0 });
export const pondDuckY = (F: number) => -0.24 + 0.24 * span(F, B.quack - 26, B.quack - 8);

// ------------------------------------------------------------------ the parade: kids follow the ducks, parents follow the kids
const RUN_Z = [0.8, -0.9, 1.9, -1.8, 0.1, 2.6];
export const PARADE_V = 0.11; // m per frame (a jog)
export const kidAt = (i: number) => (F: number) => V(-30 + PARADE_V * (F - B.ducks22) - 1.6 * i - 6, 0, RUN_Z[i]);
export const parentAt = (i: number) => (F: number) => V(-30 + PARADE_V * (F - B.ducks22) - 1.5 * i - 16, 0, RUN_Z[(i + 3) % 6] * 1.1);
export const KIDS = KID_LOOKS.map((look, i) => role(`kid${i}`, look, kidAt(i), (F) => {
  const r = runPose(PARADE_V * (F - B.ducks22) * 2 + i);
  return st({ ...r, arms: arms([0.72, -0.5], [0.7, -0.55], { gl: "open", gr: "open" }) }, F, 121 + i, [[0, "excited"], [B.kids + i, "laughing"]], { heading: Math.PI / 2 }, 0.6);
}, { crowd: true }));
export const PARENTS = PARENT_LOOKS.map((look, i) => role(`parent${i}`, look, parentAt(i), (F) => {
  const r = runPose(PARADE_V * (F - B.ducks22) * 1.6 + i);
  return st({ ...r, arms: arms([0.6, -0.3], [0.65, 0.2], { gl: "open", gr: "open" }) }, F, 131 + i, [[0, "worried"], [B.parents + i, "shocked"], [B.you23, "excited"]], { heading: Math.PI / 2 }, 0.6);
}, { crowd: true }));
/** The duck flood: 260 sprite ducks pouring east along the road (then into the lot behind you). */
export const duckFlood = (i: number, F: number) => {
  const t0 = B.ducks22 - 30, x0 = -34 - (i % 26) * 0.9 - Math.floor(i / 26) * 0.35, z0 = ((i * 37) % 70) / 10 - 3.5;
  const x = x0 + 0.13 * (F - t0);
  if (F < t0 - 40) return null;
  if (x < LOT.x0) return V(x, 0.15 + 0.02 * Math.abs(Math.sin(F / 4 + i)), z0);
  // turn into the lot and fan out round you
  const k = clamp01((x - LOT.x0) / 10), ang = (i * 2.399) % (Math.PI * 2), r = 2.2 + (i % 9) * 0.55;
  return V(LOT.x0 + (YOU_LOT.x - LOT.x0) * k + Math.cos(ang) * r * k, 0.15, z0 * (1 - k) + (YOU_LOT.z + Math.sin(ang) * r * 0.8) * k);
};
/** The news van crawls behind the parents. */
export const vanAt = (F: number) => V(Math.min(-30 + PARADE_V * (F - B.ducks22) - 30, LOT.x0 - 6), 0, 1.6);

// ================================================================== held props
export const held = (name: string, make: () => Object3D, r: Role, hand: Hand, cam: (F: number) => CamPose, o: { fwd?: number; up?: number; orient?: (ob: Object3D, F: number) => void; when?: (F: number) => boolean; touches?: string[] } = {}): MovingProp => ({
  name, make, heldBy: r.name, hand, touches: o.touches, pose: (ob, F) => {
    if (o.when && !o.when(F)) return false;
    const s = r.state(F), k = scaleOf(r, F);
    ob.position.copy(handWorld(r.look, s.pose, r.at(F), cam(F).pos, hand, o.fwd ?? 0.06, s.heading, k));
    if (o.up) ob.position.y += o.up * k;
    ob.scale.setScalar(k);
    const c = cam(F).pos;
    ob.rotation.set(0, Math.atan2(c.x - ob.position.x, c.z - ob.position.z), 0);
    o.orient?.(ob, F);
  },
});
export const handAt = (r: Role, F: number, cam: Vector3, hand: "left" | "right") => { const s = r.state(F); return handWorld(r.look, s.pose, r.at(F), cam, hand, 0.06, s.heading, scaleOf(r, F)); };
export { WALK_S };
