import { Object3D, Vector3 } from "three";
import { flow, perform } from "../../../kit/toon/acting";
import { CamPose, frameOn, glide, impact } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Hand, Look } from "../../../kit/toon/cast";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import { headHeight } from "../../../kit/toon/figure";
import type { Flower } from "../../../kit/toon/flowers";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { POSES, REST, alive, moveCurve, movePose, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import SCRIPT from "../../../videos/promise-flowers/script.json";
import MOUTH from "../../../videos/promise-flowers/voice/mouth.json";
import WORDS from "../../../videos/promise-flowers/voice/words.json";
import { TOWN_LOOKS, callGuyLook, dadLook, dateManLook, dateWomanLook, derekFlowers, derekLook, grandmaLook, joggerLook, kidLook, lindaLook, mailLook, neighbourLook, townFlowers, yourFlowers } from "./cast";
import { petal } from "./scene";
import { BENCH, CHAIR_SPOTS, DAD_SEAT, GRANDMA_DOOR_X, HIVES, LIVE_LIGHT, PANELS, PLAN_BOARD, PODIUM, PORCH, STAGE, STORE_SIGN, V, YOU_SOFA, binoculars, flowerPile, glueTube, newspaper, notebook, perfume, phone, shoebox } from "./world";

/**
 * promise-flowers (episode 5, "In this world..."), shot plan. Every beat is locked to words.json through the script's
 * lines (L(line, word) = composition frame of that word's start). One town (the park, its plaza, Grandma's porch and
 * hives, the stage) plus the home interior. Each SHOT names its visible change in a `does:` comment.
 */
export const FPS = 30;
export const words: CaptionWord[] = WORDS as CaptionWord[];
const MOUTH_T = MOUTH as MouthFrame[];
// ------------------------------------------------------------------ word timing by script line
const LINE_START: number[] = [];
{
  let i = 0;
  for (const l of SCRIPT.lines as { narration: string; spoken?: string }[]) {
    LINE_START.push(i);
    const sp = (l.spoken ?? l.narration.replace(/\*/g, "")).replace(/\[[^\]]*\]/g, " ");
    i += sp.split(/\s+/).filter(Boolean).length;
  }
  if (i !== words.length) throw new Error(`script has ${i} words, words.json ${words.length}`);
}
/** Start frame of word k (0-based) of script line n (1-based). */
export const L = (n: number, k = 0) => Math.round(words[LINE_START[n - 1] + k].start * FPS);
const LE = (n: number, k: number) => Math.round(words[LINE_START[n - 1] + k].end * FPS);
const lastWord = (n: number) => (n < LINE_START.length ? LINE_START[n] - 1 : words.length - 1) - LINE_START[n - 1];
/** End frame of script line n. */
export const LEND = (n: number) => LE(n, lastWord(n));
export const LAST = Math.round(words[words.length - 1].end * FPS);
export const FRAMES = LAST + 8;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const span = (F: number, a: number, b: number) => glide((F - a) / Math.max(b - a, 1));
const lerpV = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, t);

// ------------------------------------------------------------------ story beats (composition frames)
export const B = {
  pop: L(1, 9) - 2, // the bud shoots out of his elbow on "flower"
  bloom: L(2, 4) - 2,
  rot: L(3, 4),
  stinks: L(3, 6),
  ear: L(5, 10),
  fly: L(7, 7),
  textA: L(8, 0) + 10, textB: L(8, 6), // flashback pops
  signFlip: L(9, 6) + 8,
  derekIn: L(10, 0),
  pizza: L(11, 8), park: L(11, 11), mondays: L(11, 15),
  second: L(12, 4),
  bulldoze: L(13, 6), hives: L(13, 10),
  budPop: L(15, 15),
  christmas: L(16, 8),
  shoebox: L(17, 8),
  brown: L(18, 13),
  shout: L(19, 4), laughs: L(19, 12),
  lid: L(20, 4),
  pour: L(21, 3),
  linda: L(22, 0), mailman: L(22, 2), roses: L(22, 5),
  except: L(23, 2),
  never: L(24, 10),
  promise25: L(25, 3), real: L(25, 6),
  nosePop: L(26, 4),
  rots: L(27, 2), tv: L(27, 7),
  sweats: L(28, 0), melts: L(28, 5), slide: L(28, 9),
  underneath: L(29, 0), rotten: L(29, 3),
  flyGo: L(30, 2), toDerek: L(30, 5),
  loses: L(31, 0), mall2: L(31, 9),
  one: L(32, 4), blooms: L(32, 7),
};
/** Derek's state of ruin: how far the glued flowers have slid (0..1.3) and the rotten ones underneath (0..1). */
export const derekSlide = (F: number) => (F < B.melts ? 0 : F < B.slide ? 0.35 * clamp01((F - B.melts) / (B.slide - B.melts)) : 0.35 + 0.95 * clamp01((F - B.slide) / 40));
export const derekRot = (F: number) => (F < B.melts ? 0 : 1);
/** His nose flower: grows on "shoots", rots from "rots". */
const noseFlower = (F: number): Flower | null => F < B.nosePop ? null : { at: { part: "head", x: 0.1, y: 0.16 }, color: "#f6a0c8", open: clamp01((F - B.nosePop - 3) / 8), grow: clamp01((F - B.nosePop) / 5), rot: clamp01((F - B.rots + 6) / 24), size: 1.3, ang: 40, seed: 99, F, flies: F > B.rots + 12 };

// ------------------------------------------------------------------ helpers
type Role = { name: string; look: Look | ((F: number) => Look); at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean };
const lookAt = (r: Role, F: number) => (typeof r.look === "function" ? r.look(F) : r.look);
const WORD_F = words.map((x) => Math.round(x.start * FPS));
const SNAP = new Map<number, number>();
/** One frame before the first word starting at or after k (cached: the QA plan checks call it millions of times). */
const snap = (k: number) => {
  let v = SNAP.get(k);
  if (v === undefined) { const w = WORD_F.find((x) => x >= k); v = w === undefined ? k : w - 1; SNAP.set(k, v); }
  return v;
};
/** Expression keys snap to 1 frame before the next word start (reactions land 0-3 f before their word). */
const st = (pose: Pose, F: number, seed: number, keys: [number, Expr][], extra: Partial<CharState> = {}, act = 1): CharState => {
  const e = exprAt<Expr>(keys.map(([k, x], i) => [i ? snap(k) : k, x] as [number, Expr]), F, seed);
  return perform({ pose, expr: e.expr, blink: e.blink, fx: {}, ...extra }, F, seed, e, act);
};
/** Keyed poses: R28 10-frame moves with anticipation and overlap (movePose + moveCurve). */
const pose = (keys: [number, Pose][], F: number): Pose => {
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  const step = (a: Pose, b: Pose, d: number) => movePose(a, b, moveCurve(d), moveCurve(d - 2), moveCurve(d - 4));
  let out = keys[i][1];
  if (i > 0 && F - keys[i][0] < 18) out = step(keys[i - 1][1], out, F - keys[i][0] + 4);
  return out;
};
const role = (name: string, look: Role["look"], at: Vector3 | ((F: number) => Vector3), raw: (F: number) => CharState, o: { sit?: boolean; crowd?: boolean } = {}): Role => ({
  name, look, at: typeof at === "function" ? at : () => at.clone(), sit: o.sit,
  state: (F) => { const s = flow(raw, F, o.crowd ? 0.5 : 1); return o.sit ? { ...s, pose: { ...s.pose, sit: 1 } } : s; },
});
const SIT: Pose = { ...REST, sit: 1 };
const head = (r: Role, F: number) => { const s = r.state(F); return r.at(F).add(V(0, headHeight(lookAt(r, F), s.pose), 0)); };
const face = (from: Vector3, to: Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
const arms = (l: [number, number], r: [number, number], o: { gl?: Pose["arms"][0]["grip"]; gr?: Pose["arms"][0]["grip"]; front?: boolean } = {}): Pose["arms"] =>
  [{ at: l, grip: o.gl ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }, { at: r, grip: o.gr ?? "fist", ...(o.front ? { layer: "front" as const } : {}) }];

// ------------------------------------------------------------------ places
const MAN_AT = V(2.05, 0, BENCH.z + 0.32), WOMAN_AT = V(2.85, 0, BENCH.z + 0.32);
const YOU_PORCH = V(GRANDMA_DOOR_X + 1.05, 0, PORCH.z1 + 0.12);
const GRANNY_CHAIR = V(GRANDMA_DOOR_X + 1.55, PORCH.y, PORCH.z0 + 1.02);
const YOU_HIVE = V(-8.75, 0, 3.55), GRANNY_HIVE = V(-9.7, 0, 3.7);
const YOU_WALK = V(GRANDMA_DOOR_X + 0.45, 0, PORCH.z1 + 1.45);
const DEREK_WALK_A = V(2.0, 0, 16.6), DEREK_WALK_B = V(2.0, 0, 15.5);
const DEREK_PODIUM = V(PODIUM.x + 0.05, STAGE.h, PODIUM.z + 0.45);
const DEREK_SIDE = V(PODIUM.x + 1.0, STAGE.h, PODIUM.z + 0.2);
const DEREK_PLAN = V(PLAN_BOARD.x + 0.95, STAGE.h, PLAN_BOARD.z + 0.15);
const seatAt = (i: number) => CHAIR_SPOTS[i].clone().add(V(0, 0, 0.28)); // card at the seat's front edge
const YOU_SEAT = 5, LINDA_SEAT = 16, MAIL_SEAT = 20, DAD_SEAT_I = 26, MAN_SEAT = 31, WOMAN_SEAT = 32, JOGGER_SEAT = 39, NEIGHBOUR_SEAT = 7;
const YOU_STAND = seatAt(YOU_SEAT).add(V(0, 0, 0.18));
const GRANNY_SIDE = V(-4.75, 0, 11.4);
const MALL_GUY = V(44, 0, -7.0), MALL_DEREK = V(43.1, 0, -7.25);

// ------------------------------------------------------------------ you
const ROT_ALL = (F: number, bud?: { grow: number; open: number; rot: number }) => yourFlowers(F, { bud });
/** Your bud: pops on "pops" (line 15), browning by Thursday night, bursts open on "blooms". */
const budAt = (F: number) => F < B.budPop ? undefined : {
  grow: clamp01((F - B.budPop) / 5),
  open: F < B.blooms - 4 ? 0 : clamp01((F - B.blooms + 4) / 10),
  rot: F < L(18, 0) ? 0 : F < B.blooms - 4 ? 0.12 + 0.28 * clamp01((F - L(18, 8)) / 60) : Math.max(0, 0.4 - (F - B.blooms + 4) / 10),
};
const youFl = (F: number) => ROT_ALL(F, budAt(F));
const BINOC: Pose = { ...REST, sit: 1, arms: arms([-0.16, -0.32], [-0.16, -0.3], { front: true, gl: "mitt", gr: "mitt" }), tilt: -4 };
const HOLD_BOX: Pose = { ...POSES.hold, arms: arms([-0.22, 0.42], [-0.22, 0.42], { gl: "mitt", gr: "mitt" }) };
const BOX_POINT: Pose = { ...REST, arms: [{ at: [-0.2, 0.42], grip: "mitt" }, { at: [0.72, -0.5], grip: "point" }], sway: 5, bob: 4 };
const HANDS_OUT: Pose = { ...REST, arms: [REST.arms[0], { at: [0.62, 0.22], grip: "open" }], lean: 0.2 };
const PHONE_UP: Pose = { ...SIT, arms: [{ at: [-0.2, 0.42], grip: "mitt" }, { at: [-0.05, 0.05], grip: "fist" }], tilt: 6 };
const HAND_UP: Pose = { ...REST, arms: [REST.arms[0], { at: [0.26, -0.42], grip: "open" }], tilt: -6 };

/** "You" in each place: one role per scene (positions and acting by composition frame). */
const youPorch = role("you", youLook, YOU_PORCH, (F) => {
  if (F < L(14, 0)) {
    // line 7: the town flake on the steps, the fly orbiting; a tired look at it
    const p = pose([[0, { ...SIT, arms: arms([0.25, 0.62], [0.25, 0.6], { gl: "mitt", gr: "mitt" }) }], [B.fly + 4, { ...SIT, tilt: 10, look: 0.6, arms: arms([0.25, 0.62], [0.32, 0.3]) }]], F);
    return st(alive(p, F, 3, [0, 0.4, -0.2]), F, 3, [[0, "tired"], [L(7, 3), "sad"], [B.fly, "suspicious"], [L(7, 12), "deadpan"]], { heading: 0, flowers: youFl(F) });
  }
  // line 14: binoculars up, spying on the bees
  const p = pose([[0, BINOC], [L(14, 7), { ...BINOC, look: -0.3, tilt: 2 }]], F);
  return st(alive(p, F, 3, [0, 0.2]), F, 3, [[0, "sneaky"], [L(14, 3), "scheming"], [L(14, 9), "suspicious"]], { heading: 0.15, flowers: youFl(F) });
}, { sit: true });
const youHives = role("you", youLook, (F) => (F < L(32, 0) ? YOU_HIVE.clone() : V(-8.95, 0, 3.6)), (F) => {
  const toG = face(YOU_HIVE, GRANNY_HIVE);
  if (F < L(32, 0)) {
    // line 15: you take Grandma's hands and promise; the bud pops; the fly lands, you shoo it. line 16: her doubt.
    const p = pose([[0, REST], [L(15, 7) - 6, HANDS_OUT], [B.budPop + 26, { ...HANDS_OUT, arms: [{ at: [0.4, -0.2], grip: "open" }, HANDS_OUT.arms[1]] }], [B.budPop + 40, HANDS_OUT], [L(16, 0), { ...REST, arms: [REST.arms[0], { at: [0.4, 0.35], grip: "open" }] }]], F);
    return st({ ...p, squash: reactSquash(F - B.budPop) }, F, 3, [[0, "nervous"], [L(15, 7), "determined"], [B.budPop, "excited"], [B.budPop + 26, "disgusted"], [L(16, 0), "proud"], [L(16, 4), "nervous"], [B.christmas, "sad"]], { heading: toG, flowers: youFl(F) });
  }
  // line 32: golden ending, the hand comes up beside your face as the bud bursts
  const p = pose([[0, REST], [L(32, 2), HAND_UP]], F);
  return st({ ...p, squash: reactSquash(F - B.blooms) }, F, 3, [[0, "relieved"], [L(32, 3), "nervous"], [B.blooms - 2, "proud"]], { heading: 0.35, flowers: youFl(F) });
});
const youWalk = role("you", youLook, YOU_WALK, (F) => {
  const p = pose([[0, HOLD_BOX], [B.shoebox - 4, { ...HOLD_BOX, shrug: 8, bob: 6 }]], F);
  return st(alive(p, F, 3, [0, 0.3]), F, 3, [[0, "scheming"], [L(17, 6), "sneaky"], [B.shoebox, "grin"]], { heading: 0.1, flowers: youFl(F) });
});
const youSofa = role("you", youLook, YOU_SOFA, (F) => {
  if (F < L(18, 0)) {
    // line 8 flashback: texting from under the blanket; each cut a rotten flower pops out of your arm
    return st(alive(PHONE_UP, F, 3, [0, 0.2]), F, 3, [[0, "deadpan"], [B.textA, "nervous"], [B.textB, "deadpan"]], { heading: 0, flowers: yourFlowers(F, { count: F < L(8, 5) ? 13 : 14, pop: F < L(8, 5) ? F - B.textA : F - B.textB }) });
  }
  // line 18: Thursday night, staring at the browning bud
  const p = pose([[0, { ...SIT, arms: [REST.arms[0], { at: [-0.1, 0.15], grip: "open" }], tilt: 8 }]], F);
  return st(alive(p, F, 3, [0.3, 0.1]), F, 3, [[0, "worried"], [L(18, 5), "nervous"], [B.brown, "crying"]], { heading: 0.2, flowers: youFl(F), fx: F > B.brown ? { tears: (F - B.brown) / FPS } : {} });
}, { sit: true });
const youSquare = role("you", youLook, (F) => (F < L(9, 6) ? V(1.35, 0, 3.35) : V(1.35, 0, 3.35)), (F) => {
  const p = pose([[0, { ...REST, arms: [REST.arms[0], { at: [0.55, 0.05], grip: "open" }] }], [L(9, 4), { ...REST, shrug: 12, tilt: 8 }]], F);
  return st(alive(p, F, 3, [0.5, 0.2]), F, 3, [[0, "excited"], [L(9, 1), "confused"], [L(9, 5), "sad"]], { heading: 1.2, flowers: youFl(F), fx: F > L(9, 2) ? { sweat: ((F - L(9, 2)) % 36) / 36 } : {} });
});
/** At the debate: seated, then up with the box and pointing (line 19), the lid (20), the swarm (21), smug (24), the fly leaves (30). */
const youDebate = role("you", youLook, (F) => (F < B.shout - 8 ? seatAt(YOU_SEAT) : YOU_STAND.clone()), (F) => {
  if (F < B.shout - 8) return st({ ...SIT, arms: arms([-0.22, 0.42], [-0.22, 0.42], { gl: "mitt", gr: "mitt" }) }, F, 3, [[0, "determined"]], { heading: 0, flowers: youFl(F), pose: { ...SIT, arms: arms([-0.22, 0.42], [-0.22, 0.42], { gl: "mitt", gr: "mitt" }) } });
  const keys: [number, Pose][] = [[0, BOX_POINT], [B.laughs, { ...BOX_POINT, arms: [BOX_POINT.arms[0], { at: [0.4, 0.4], grip: "open" }], shrug: 14 }], [L(20, 0) - 4, HOLD_BOX], [B.lid - 6, { ...HOLD_BOX, arms: arms([-0.22, 0.32], [-0.12, 0.2], { gl: "mitt", gr: "fist" }) }], [B.pour, { ...HOLD_BOX, bob: -8, sway: -6 }], [L(24, 0), { ...POSES.crossed }], [B.flyGo + 14, POSES.wave]];
  const p = F >= B.flyGo + 14 ? { ...POSES.wave, arms: [POSES.wave.arms[0], { ...POSES.wave.arms[1], at: [0.55 + 0.12 * Math.sin(F / 3), -0.55] as [number, number] }] as Pose["arms"] } : pose(keys, F);
  return st({ ...p, squash: reactSquash(F - B.pour) }, F, 3, [[0, "angry"], [B.laughs, "sad"], [L(20, 0), "scheming"], [B.pour, "excited"], [L(22, 0), "grin"], [B.except, "smug"], [L(24, 3), "proud"], [B.never, "smug"], [B.flyGo, "confused"], [B.toDerek, "relieved"]], { heading: F < L(24, 0) ? 0 : 0.2, flowers: youFl(F) });
});

// ------------------------------------------------------------------ Grandma
const GR_ROSES = (F: number, bees = 0): Flower[] => ([
  { at: { part: "arm", side: 0, t: 0.55 }, color: "#d8243a", open: 1, size: 1.0, ang: -30, seed: 61 },
  { at: { part: "arm", side: 1, t: 0.45 }, color: "#d8243a", open: 1, size: 1.0, ang: 30, seed: 62 },
  { at: { part: "head", x: 1.05, y: -0.55 }, color: "#e8344a", open: 1, size: 1.1, ang: 60, seed: 63 },
  { at: { part: "torso", x: -0.55, y: -0.4 }, color: "#d8243a", open: 1, size: 0.9, ang: -40, seed: 64 },
] as Flower[]).slice(0, 4 - (bees > 0 ? 0 : 0)).map((f) => ({ ...f, F }));
const KNIT: Pose = { ...SIT, arms: arms([-0.25, 0.4], [-0.2, 0.36], { gl: "fist", gr: "fist" }), tilt: 6 };
const grannyPorch = role("grandma", grandmaLook, GRANNY_CHAIR, (F) => {
  const k = Math.sin(F / 5) * 0.04; // knitting needles tick
  const p = { ...KNIT, arms: arms([-0.25 + k, 0.4], [-0.2 - k, 0.36]) as Pose["arms"] };
  return st(alive(p, F, 7, [0, -0.3, 0.2]), F, 7, F < L(17, 0) ? [[0, "relieved"], [L(14, 6), "smug"], [L(14, 10), "relieved"]] : [[0, "suspicious"], [B.shoebox, "worried"]], { heading: 0.4, flowers: GR_ROSES(F) });
}, { sit: true });
const grannyHives = role("grandma", grandmaLook, (F) => (F < L(32, 0) ? GRANNY_HIVE.clone() : V(-9.85, 0, 3.8)), (F) => {
  const toY = face(GRANNY_HIVE, YOU_HIVE);
  const talk = talkAt(MOUTH_T, F, [[L(16, 0), LEND(16)]]);
  if (F < L(32, 0)) {
    const p = pose([[0, POSES.hips], [L(15, 7) - 4, { ...REST, arms: [{ at: [0.62, 0.22], grip: "open" }, REST.arms[1]] }], [L(16, 0), { ...POSES.hips, tilt: 8 }], [B.christmas - 10, { ...REST, arms: [{ at: [0.7, 0.05], grip: "point" }, { at: [0.2, 0.58], grip: "fist" }], tilt: 10 }]], F);
    return st(p, F, 7, [[0, "worried"], [L(15, 8), "pleading"], [B.budPop, "excited"], [L(16, 0), "smirk"], [L(16, 4), "suspicious"], [B.christmas, "smug"]], { heading: toY, flowers: GR_ROSES(F), fx: { talk } });
  }
  return st(alive({ ...REST, arms: [{ at: [0.5, 0.3], grip: "open" }, REST.arms[1]] }, F, 7, [0.6, 0.3]), F, 7, [[0, "relieved"], [B.blooms, "proud"]], { heading: toY + 0.3, flowers: GR_ROSES(F) });
});
const grannyDebate = role("grandma", grandmaLook, GRANNY_SIDE, (F) => {
  const p = pose([[0, POSES.crossed], [B.roses - 6, { ...POSES.panic, arms: arms([0.6, -0.3], [0.6, -0.3], { gl: "open", gr: "open" }) }]], F);
  return st(alive(p, F, 7, [0.4, 0.2]), F, 7, [[0, "worried"], [B.pour, "shocked"], [B.roses, "excited"], [B.roses + 30, "proud"]], { heading: 0.9, flowers: GR_ROSES(F) });
});

// ------------------------------------------------------------------ Derek
const SPRITZ: Pose = { ...REST, arms: [{ at: [0.3, 0.5], grip: "fist" }, { at: [-0.15, -0.3], grip: "fist" }], tilt: -10, look: 0.3 };
const PROMISE_UP: Pose = { ...REST, arms: [{ at: [0.62, -0.55], grip: "open" }, { at: [0.2, 0.58], grip: "fist" }], sway: -4, bob: 6 };
const PROMISE_R: Pose = { ...REST, arms: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.62, -0.55], grip: "open" }], sway: 4, bob: 6 };
const ARM_UP_GLUE: Pose = { ...REST, arms: [{ at: [0.7, -0.42], grip: "open" }, { at: [-0.25, 0.55], grip: "fist", layer: "back" }], sway: -3 };
const POINT_L: Pose = { ...REST, arms: [{ at: [0.78, -0.25], grip: "point" }, { at: [0.2, 0.58], grip: "fist" }], sway: -6, look: -0.5 };
const CHEST_SLAP: Pose = { ...REST, arms: [{ at: [-0.3, 0.25], grip: "open" }, { at: [0.55, -0.5], grip: "point" }], bob: 8, tilt: -8 };
const derekState = (base: Pose, F: number, keys: [number, Expr][], extra: Partial<CharState> = {}): CharState => {
  const talk = talkAt(MOUTH_T, F, [[L(25, 0), LEND(25)]]);
  const fl = [...derekFlowers(derekRot(F), F, derekSlide(F)), ...(noseFlower(F) ? [noseFlower(F)!] : [])];
  const sweat = F >= B.sweats ? { sweat: ((F - B.sweats) % 24) / 24 } : {};
  return st(base, F, 21, keys, { flowers: fl, ...extra, fx: { talk, ...sweat, ...(extra.fx ?? {}) } });
};
export const derekLookAt = (F: number) => derekLook({ slide: derekSlide(F), rotten: derekRot(F), F: Math.floor(F / 3) * 3 });
const derekWalk = role("derek", derekLookAt, (F) => lerpV(DEREK_WALK_A, DEREK_WALK_B, span(F, B.derekIn, B.derekIn + 40)), (F) => {
  const walking = F < B.derekIn + 40;
  const p = walking ? walkPose(((F - B.derekIn) / 40) * 1.1, 1 - clamp01((F - B.derekIn - 28) / 12)) : pose([[0, REST], [L(10, 6), SPRITZ]], F);
  return derekState(p, F, [[0, "proud"], [L(10, 4), "grin"], [L(10, 9), "smug"], [L(10, 13), "proud"]], { heading: Math.PI });
});
const derekPodium = role("derek", derekLookAt, DEREK_PODIUM, (F) => {
  const p = pose([[0, POSES.wave], [B.pizza - 6, PROMISE_UP], [B.park - 6, PROMISE_R], [B.mondays - 6, { ...PROMISE_UP, bob: 12 }]], F);
  return derekState(p, F, [[0, "grin"], [B.pizza, "excited"], [B.park, "proud"], [B.mondays, "laughing"]], { heading: Math.PI });
});
const derekSide = role("derek", derekLookAt, DEREK_SIDE, (F) => {
  if (F < L(13, 0)) {
    // line 12: the arm goes up, a flower is just THERE; the other hand hides the glue
    const p = pose([[0, REST], [B.second - 8, ARM_UP_GLUE]], F);
    const fl = F >= B.second ? [{ at: { part: "arm" as const, side: 0 as const, t: 0.62 }, color: "#fbf3f0", open: 1, size: 1.4, ang: -25, seed: 141 }] : [];
    const s = derekState(p, F, [[0, "proud"], [B.second, "smug"]], { heading: Math.PI });
    return { ...s, flowers: [...(s.flowers ?? []), ...fl] };
  }
  // lines 23-31 on stage: frozen grin; the promise; the nose; the rot; the sweat; the slide; the flies
  const keys: [number, Pose][] = [[0, { ...REST, arms: arms([0.2, 0.58], [0.2, 0.58]) }], [L(25, 0), CHEST_SLAP], [B.nosePop - 4, { ...POSES.panic, bob: 4 }], [B.rots, { ...REST, arms: arms([0.3, 0.2], [0.3, 0.2], { gl: "open", gr: "open" }), shrug: 14 }], [B.sweats, { ...POSES.panic }], [B.slide, { ...REST, arms: arms([0.62, 0.1], [0.62, 0.1], { gl: "open", gr: "open" }), bob: -10 }], [B.underneath, { ...POSES.panic, bob: -4 }]];
  return derekState({ ...pose(keys, F), squash: reactSquash(F - B.nosePop) + reactSquash(F - B.slide) }, F,
    [[0, "grin"], [B.except, "nervous"], [L(25, 0), "laughing"], [B.real, "smug"], [B.nosePop, "shocked"], [B.rots, "confused"], [L(27, 4), "nervous"], [B.sweats, "scared"], [B.slide, "shocked"], [B.rotten, "crying"], [B.toDerek, "disgusted"]],
    { heading: Math.PI, fx: { ringEyes: F >= B.nosePop && F < B.nosePop + 24 } });
});
const derekPlan = role("derek", derekLookAt, DEREK_PLAN, (F) => derekState(pose([[0, POSES.wave], [B.bulldoze - 8, POINT_L]], F), F, [[0, "grin"], [B.bulldoze, "scheming"]], { heading: Math.PI - 0.6 }));
const derekMall = role("derek", derekLookAt, MALL_DEREK, (F) => derekState(alive({ ...REST, arms: [{ at: [0.2, 0.62], grip: "fist" }, REST.arms[1]], shrug: 10 }, F, 21, [0.3, -0.2]), F, [[0, "sad"], [B.mall2, "crying"]], { heading: Math.PI / 2 }));

// ------------------------------------------------------------------ the town
const look = (i: number) => TOWN_LOOKS[i % TOWN_LOOKS.length];
const manRaw = (F: number) => {
  const p = pose([[0, { ...SIT, arms: [REST.arms[0], { at: [0.5, 0.4], grip: "open" }] }], [L(1, 3), { ...SIT, arms: [REST.arms[0], { at: [0.66, 0.3], grip: "open" }], lean: 0.2 }]], F);
  const fl: Flower[] = F < B.pop ? [] : [{ at: { part: "arm", side: 1, t: 0.5 }, color: "#e84a3a", open: F < B.bloom ? 0 : clamp01((F - B.bloom) / 9), rot: F < B.rot ? 0 : clamp01((F - B.rot) / 26), grow: clamp01((F - B.pop) / 5), size: 1.7, ang: -15, seed: 3, F, flies: F > B.rot + 16 }];
  return st({ ...p, squash: reactSquash(F - B.pop) }, F, 31, [[0, "excited"], [B.pop, "shocked"], [B.bloom, "laughing"], [B.rot, "nervous"], [B.stinks, "disgusted"]], { heading: 0.6, flowers: fl, fx: { talk: F > L(1, 3) && F < L(1, 6) ? { open: 0.6, shape: "a" } : undefined } });
};
const MAN = role("man", dateManLook, MAN_AT, manRaw, { sit: true });
const WOMAN = role("woman", dateWomanLook, WOMAN_AT, (F) => st({ ...SIT, arms: [{ at: [0.55, 0.38], grip: "open" }, REST.arms[1]] }, F, 33, [[0, "pleading"], [B.pop, "excited"], [B.bloom, "proud"], [B.rot, "suspicious"], [B.stinks, "disgusted"]], { heading: -0.6 }), { sit: true });
const PLAZA_PEOPLE: Role[] = [
  role("mail", mailLook, V(3.7, 0, 8.4), (F) => st(alive(POSES.wave, F, 41, [0.3, -0.2]), F, 41, [[0, "grin"]], { heading: 2.4, flowers: [0.25, 0.5, 0.75].flatMap((t) => [0, 1].map((side) => ({ at: { part: "arm" as const, side: side as 0 | 1, t }, color: "#f6f0ea", open: 1, size: 0.85, ang: side ? 30 : -30, seed: Math.round(t * 10) + side }))) })),
  role("kid", kidLook, V(1.3, 0, 9.4), (F) => st(alive(POSES.hips, F, 43, [0.4, -0.3]), F, 43, [[0, "excited"]], { heading: 2.8, flowers: [{ at: { part: "leg", side: 1, t: 0.5 }, color: "#7ce86a", open: 0, size: 1.1, ang: 20, seed: 5 }] })),
  role("roses", look(5), V(3.2, 0, 10.8), (F) => st(alive(REST, F, 45, [0.2, 0.4]), F, 45, [[0, "proud"]], { heading: -2.6, flowers: townFlowers(5, F, 3) })),
  role("rothead", look(2), V(1.05, 0, 7.3), (F) => st(alive(POSES.hips, F, 47, [0.2, -0.3]), F, 47, [[0, "deadpan"]], { heading: 2.0, flowers: [{ at: { part: "head", x: 0.85, y: -0.75 }, color: "#b06ad8", open: 0.6, rot: 1, size: 1.2, ang: 50, seed: 7, F }] })),
];
const JOGGER = role("jogger", joggerLook, (F) => V(4.6 - (F - L(3, 0)) * 0.085, 0, 6.6), (F) => st({ ...runPose((F - L(3, 0)) * 0.085), squash: reactSquash(F - B.stinks) }, F, 49, [[0, "determined"], [B.stinks, "disgusted"]], { heading: -Math.PI / 2, fx: { fill: F > B.stinks ? { color: "#8ac85a", t: clamp01((F - B.stinks) / 8) * 0.5 } : undefined } }));
const LINDA_RUN = role("linda", lindaLook, (F) => V(-12.3 - (F - L(4, 0)) * 0.095, 0, -6.3), (F) => st(runPose((F - L(4, 0)) * 0.095), F, 51, [[0, "excited"], [L(4, 7), "proud"], [L(4, 13), "grin"]], { heading: -Math.PI / 2, flowers: [{ at: { part: "leg", side: 1, t: 0.5 }, color: "#f2c23a", open: 1, size: 2.3, ang: 10, seed: 8 }] }));
const DAD = role("dad", dadLook, DAD_SEAT.clone().add(V(0, 0, 0.12)), (F) => {
  const p = pose([[0, { ...SIT, ...POSES.hold, sit: 1 }], [L(5, 8), { ...SIT, arms: [POSES.hold.arms[0], { at: [0.05, -0.62], grip: "open", layer: "front" }], tilt: 8 }], [L(5, 10) + 10, { ...SIT, ...POSES.hold, sit: 1 }]], F);
  return st(alive(p, F, 55, [0, 0.2]), F, 55, [[0, "deadpan"], [L(5, 3), "tired"], [L(5, 8), "disgusted"], [LEND(5), "deadpan"]], { heading: 0, flowers: [{ at: { part: "head", x: -1.0, y: -0.05 }, color: "#d8423a", open: 0.6, rot: 1, size: 1.5, ang: -70, seed: 5, F }] });
}, { sit: true });
const CALL_GUY = role("callguy", callGuyLook, MALL_GUY, (F) => {
  const late = F > L(30, 0);
  const p = late ? { ...POSES.facepalm, arms: [REST.arms[0], { at: [-0.05, -0.62], grip: "open", layer: "front" }] as Pose["arms"] } : { ...REST, arms: [REST.arms[0], { at: [0.3, -0.2], grip: "fist" }] as Pose["arms"] };
  return st(alive(p, F, 57, [0.3, 0]), F, 57, late ? [[0, "disgusted"]] : [[0, "smug"], [L(6, 10), "grin"]], { prop: late ? undefined : "phone", heading: -Math.PI / 2 + 0.5, flowers: [{ at: { part: "torso", x: 0.75, y: -0.8 }, color: "#e84a6a", open: 0.6, rot: 1, size: 1.6, ang: 30, seed: 4, F }] });
});
const SHOPPERS: Role[] = [V(31, 0, -7.6), V(35.5, 0, -6.3), V(39, 0, -7.4)].map((p, i) => role(`shopper${i}`, look(i + 6), p, (F) => {
  const hit = L(6, 10) + i * 6 + (F > L(30, 0) ? 0 : 0);
  return st({ ...(F > hit ? POSES.facepalm : REST), squash: reactSquash(F - hit) }, F, 60 + i, [[0, "neutral"], [hit, "disgusted"]], { heading: Math.PI / 2 + (i % 2 ? 0.4 : -0.4) }, 0.6);
}));
const NEIGHBOUR = role("neighbour", neighbourLook, (F) => (F < L(9, 4) ? V(2.25, 0, 3.55) : V(2.25 + (F - L(9, 4)) * 0.045, 0, 3.55)), (F) => {
  const away = F >= L(9, 4);
  const p = away ? { ...walkPose((F - L(9, 4)) * 0.045, clamp01((F - L(9, 4)) / 8)), arms: [{ at: [-0.05, -0.62], grip: "open", layer: "front" }, REST.arms[1]] as Pose["arms"] } : pose([[0, REST], [L(9, 2), { ...REST, arms: [{ at: [-0.05, -0.62], grip: "open", layer: "front" }, REST.arms[1]], tilt: -8 }]], F);
  return st(p, F, 63, [[0, "suspicious"], [L(9, 2), "disgusted"]], { heading: away ? Math.PI / 2 : -1.4, flowers: townFlowers(63, F, 2) });
});

// --- the debate crowd: named seats + fill
type Seat = { i: number; look: Look; name: string; flowers: (F: number) => Flower[]; seed: number };
const SEATS: Seat[] = [
  { i: LINDA_SEAT, look: lindaLook, name: "linda", seed: 51, flowers: () => [{ at: { part: "leg", side: 1, t: 0.5 }, color: "#f2c23a", open: 1, size: 2.3, ang: 10, seed: 8 }] },
  { i: MAIL_SEAT, look: mailLook, name: "mail", seed: 41, flowers: () => [0.25, 0.5, 0.75].flatMap((t) => [0, 1].map((side) => ({ at: { part: "arm" as const, side: side as 0 | 1, t }, color: "#f6f0ea", open: 1, size: 0.95, ang: side ? 30 : -30, seed: Math.round(t * 10) + side }))) },
  { i: DAD_SEAT_I, look: dadLook, name: "dad", seed: 55, flowers: (F) => [{ at: { part: "head", x: -1.0, y: -0.05 }, color: "#d8423a", open: 0.6, rot: 1, size: 1.5, ang: -70, seed: 5, F }] },
  { i: MAN_SEAT, look: dateManLook, name: "man", seed: 31, flowers: (F) => [{ at: { part: "arm", side: 1, t: 0.5 }, color: "#e84a3a", open: 1, size: 1.2, ang: -15, seed: 3, F }] },
  { i: WOMAN_SEAT, look: dateWomanLook, name: "woman", seed: 33, flowers: (F) => townFlowers(33, F, 2) },
  { i: JOGGER_SEAT, look: joggerLook, name: "jogger", seed: 49, flowers: (F) => townFlowers(49, F, 2) },
  { i: NEIGHBOUR_SEAT, look: neighbourLook, name: "neighbour", seed: 63, flowers: (F) => townFlowers(63, F, 2) },
  ...[2, 9, 13, 15, 18, 22, 25, 28, 34, 36, 41, 44, 46, 50, 53].map((i, k) => ({ i, look: look(k), name: `crowd${i}`, seed: 300 + i, flowers: (F: number) => townFlowers(300 + i, F, 2) })),
];
const crowdRole = (s: Seat): Role => role(s.name, s.look, seatAt(s.i), (F) => {
  const laugh = F >= B.laughs - 2 && F < L(20, 0) + 6, stink = F >= B.underneath;
  const base: Pose = stink && s.i < 12 ? { ...POSES.panic, sit: 1, sway: -10, bob: 6 } : laugh ? { ...SIT, arms: [{ at: [-0.05, -0.62], grip: "open", layer: "front" }, REST.arms[1]], tilt: (s.seed % 2 ? 8 : -8) } : SIT;
  const keys: [number, Expr][] = [[0, s.seed % 3 ? "neutral" : "suspicious"], [B.shout, "confused"], [B.laughs, "laughing"], [L(20, 0) + 6, "neutral"], [B.pour, "shocked"], [B.pour + 20, "excited"], [B.except, "suspicious"], [B.nosePop, "shocked"], [B.rots, "disgusted"], [B.underneath, "scared"]];
  return st(alive(base, F, s.seed, [0, 0.3, -0.3]), F, s.seed, keys, { heading: 0, flowers: s.flowers(F), fx: laugh && F % 40 < 20 ? { talk: { open: 0.7, shape: "a" } } : {} }, 0.5);
}, { sit: true, crowd: true });
const CROWD = SEATS.map(crowdRole);
const crowdNear = (z0: number, z1: number, x0 = -9, x1 = 9) => CROWD.filter((r) => { const p = r.at(0); return p.z >= z0 && p.z <= z1 && p.x >= x0 && p.x <= x1; });

// ------------------------------------------------------------------ props
const held = (name: string, make: () => Object3D, r: Role, hand: Hand, cam: (F: number) => CamPose, o: { fwd?: number; up?: number; orient?: (ob: Object3D, F: number) => void; when?: (F: number) => boolean; touches?: string[] } = {}): MovingProp => ({
  name, make, heldBy: r.name, hand, touches: o.touches, pose: (ob, F) => {
    if (o.when && !o.when(F)) return false;
    const s = r.state(F);
    ob.position.copy(handWorld(lookAt(r, F), s.pose, r.at(F), cam(F).pos, hand, o.fwd ?? 0.06, s.heading));
    if (o.up) ob.position.y += o.up;
    const c = cam(F).pos;
    ob.rotation.set(0, Math.atan2(c.x - ob.position.x, c.z - ob.position.z), 0);
    o.orient?.(ob, F);
  },
});
const lidOpen = (F: number) => clamp01((F - B.lid + 2) / 10);
const boxProp = (r: Role, hand: Hand, cam: (F: number) => CamPose, from = 0): MovingProp => held("shoebox", shoebox, r, hand, cam, {
  fwd: 0.12, up: -0.07, when: (F) => F >= from, orient: (ob, F) => {
    const lid = ob.getObjectByName("lid")!;
    const hop = F < B.lid ? Math.max(0, Math.sin(F * 1.7)) * 0.012 + Math.max(0, Math.sin(F * 2.9 + 1)) * 0.006 : 0;
    lid.position.y = 0.125 + hop + lidOpen(F) * 0.03;
    lid.rotation.x = -lidOpen(F) * 1.9;
  },
});

// ------------------------------------------------------------------ shots
export type World = "town" | "home";
export type Light = "day" | "golden" | "homeDay" | "homeNight";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World; lit: Light; debate?: boolean; fx?: Fx[] };
/** Living things and effects a shot draws (Video.tsx). */
export type Fx = "hiveBees" | "porchBees" | "derekBee" | "swarm" | "fly" | "flyToDerek" | "stinkMall" | "stinkDerek" | "stinkBench" | "petal" | "speedNose" | "speedBees";
const LIGHT_OF: Record<Light, { light: "day" | "golden" | "interior" | "night"; scene: string }> = {
  day: { light: "day", scene: "town day" }, golden: { light: "golden", scene: "town golden" },
  homeDay: { light: "interior", scene: "home day" }, homeNight: { light: "night", scene: "home night" },
};
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: lookAt(r, from), lookAt: typeof r.look === "function" ? r.look : undefined, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Card penetration": "seated: the card stands at the seat's front edge, its lap over the seat", "Moving props": "seated: the chair holds the seated card" };
let cursor = 0;
export const SHOTS: S[] = [];
const shot = (id: string, to: number, w: World, lit: Light, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof; props?: MovingProp[] }): S => {
  const from = cursor;
  cursor = to;
  const { dof, props, ...rest } = o;
  const s: S = {
    id: `pf/${id}`, from, frames: to - from, w, lit, scene: LIGHT_OF[lit].scene, light: LIGHT_OF[lit].light,
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: roles[0]?.name,
    moving: props, allow: roles.some((r) => r.sit) ? SEATED : undefined, ...rest,
  };
  SHOTS.push(s);
  return s;
};
const close = (d: number) => () => DOF.closeup(d), mid = (d: number) => () => DOF.medium(d);
const NONE = () => DOF.none;
/** A framing that creeps (push ~10 % + a little side drift). */
const creep = (f0: { pos: Vector3; look: Vector3; fov: number }, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.25) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const seatHead = (look: Look) => headHeight(look, SIT);
/** frameOn for a role standing (or seated) at `at`. */
const on = (r: Role, at: Vector3, from: Vector3, size: "cu" | "mcu" | "ms" | "fs", o: { fov?: number; side?: number; dy?: number } = {}) =>
  frameOn(at.clone().setY(at.y), at.clone().add(from), size, { head: (r.sit ? seatHead(lookAt(r, 0)) : headHeight(lookAt(r, 0))) + (o.dy ?? 0), fov: o.fov, side: o.side });

// === line 1: the rule, a bud pops out of an elbow on "flower"; the square full of flowered people
// does: he takes her hands, POP a bud shoots out of his elbow, both jump
const A1F = on(MAN, MAN_AT.clone().add(V(0.4, 0, 0)), V(0.15, 0, 2.6), "mcu", { fov: 42 });
shot("A1-bench-promise", L(1, 10), "town", "day", [MAN, WOMAN], (F) => creep(A1F, F, 0, L(1, 10), 0.12), { dof: close(2.4) });
// does: the square: a mail carrier waving with daisies up both arms, a kid with a sprout, a woman in roses, a man with a rotten head-flower
shot("A2-square-of-flowers", L(2, 0), "town", "day", [...PLAZA_PEOPLE, MAN, WOMAN], (F) => P(V(2.5, 3.6, 15.4).lerp(V(2.5, 3.2, 14.6), span(F, L(1, 10), L(2, 0))), V(2.35, 0.4, 7.4), 52), { wide: true, subject: undefined, dof: NONE });
// === line 2-3: the same flower blooms, then (match cut) rots; a jogger gags
// does: the bud bursts open into a red bloom on "blooms", he laughs
const A3F = on(MAN, MAN_AT.clone().add(V(0.3, 0, 0)), V(0.25, 0, 2.0), "mcu", { fov: 38, dy: -0.15 });
shot("A3-bloom", L(3, 0), "town", "day", [MAN, WOMAN], (F) => creep(A3F, F, L(2, 0), L(3, 0), 0.14), { dof: close(2.0) });
// does: match cut, same framing: the flower wilts brown, petals drop, flies arrive, his face falls
shot("A4-rot", B.stinks - 2, "town", "day", [MAN, WOMAN], (F) => creep(A3F, F, L(2, 0), L(3, 0) + 60, 0.14), { dof: close(2.0), fx: ["stinkBench"] });
// does: a jogger runs into the stink and gags (face goes green) mid-stride
shot("A5-jogger-gags", L(4, 0), "town", "day", [JOGGER, MAN], (F) => { const j = JOGGER.at(F); return P(V(j.x + 0.1, 1.42, 9.0), V(j.x - 0.15, 1.3, 6.6), 40); }, { subject: "jogger", dof: close(2.4), fx: ["stinkBench"] });
// === line 4: Linda's marathon sunflower on her knee
// does: Linda jogs past your fence (tracked in profile), the sunflower bobbing on her knee, a medal round her neck
shot("B1-linda-jogs", L(4, 10), "town", "day", [LINDA_RUN], (F) => { const x = LINDA_RUN.at(F).x; return P(V(x + 0.5, 1.15, -2.6), V(x - 0.3, 1.0, -6.3), 42); }, { dof: mid(3.7) });
// does: close on the knee: the sunflower swings with every stride
shot("B2-knee-sunflower", L(5, 0), "town", "day", [LINDA_RUN], (F) => { const x = LINDA_RUN.at(F).x; return P(V(x + 0.15, 0.62, -4.75), V(x - 0.2, 0.55, -6.3), 44); }, { dof: close(1.6), allow: { "Subject size": "insert on her knee: the sunflower is the subject" } });
// === line 5: Dad, six years of a dripping sink, a dead tulip on his ear
// does: Dad reads at the table, the tap drips into the overflowing bucket, the puddle shines
shot("C1-dad-sink", L(5, 6), "home", "homeDay", [DAD], (F) => creep(P(V(-0.35, 1.3, 2.4), V(-1.15, 0.85, -1.2), 46), F, L(5, 0), L(5, 6), 0.1), { dof: mid(3.0) });
// does: push to his ear: a shrivelled tulip, a fly orbiting; he swats at it without looking up
shot("C2-dad-tulip", L(6, 0), "home", "homeDay", [DAD], (F) => { const f0 = on(DAD, DAD.at(0), V(-0.55, 0, 1.6), "cu", { fov: 40, side: -0.2 }); return creep(f0, F, L(5, 6), L(6, 0), 0.12); }, { dof: close(1.6) });
// === line 6: the "I'll call you" guy at the mall
// does: he scrolls his phone, smug, a rotten rose on his shoulder trailing stink lines
shot("D1-call-guy", L(6, 8), "town", "day", [CALL_GUY], (F) => creep(on(CALL_GUY, MALL_GUY, V(-2.0, 0, 1.0), "ms", { fov: 42 }), F, L(6, 0), L(6, 8), 0.1), { scene: "mall day", dof: mid(2.2) });
// does: down the whole mall: a green stink cloud rolls toward the lens, three shoppers clap hands over their noses
shot("D2-mall-stink", L(7, 0), "town", "day", [CALL_GUY, ...SHOPPERS], (F) => P(V(23.6, 1.5, -6.85), V(44, 1.1, -7.0).lerp(V(40, 1.05, -7.0), span(F, L(6, 8), L(7, 0))), 15), { wide: true, subject: "callguy", subjectFrom: 0, scene: "mall day", dof: NONE, fx: ["stinkMall"] });
// === line 7: you, fourteen rotten flowers and a fly since ninth grade
// does: you on Grandma's porch steps covered in rotten flowers; the fly orbits your head; you give it a tired look
shot("E1-you-the-flake", B.fly, "town", "day", [youPorch], (F) => creep(on(youPorch, YOU_PORCH, V(0.35, 0, 3.0), "ms", { fov: 42 }), F, L(7, 0), B.fly, 0.1), { dof: mid(3.0), fx: ["fly"] });
// does: close: the fly circles like a tiny moon, your eyes follow it round, deadpan on "grade"
shot("E2-the-fly", L(8, 0), "town", "day", [youPorch], (F) => creep(on(youPorch, YOU_PORCH, V(0.2, 0, 1.6), "cu", { fov: 40 }), F, B.fly, L(8, 0), 0.12), { dof: close(1.6), fx: ["fly"] });
// === line 8: "I'll be there in five minutes", flashback match cuts on the sofa
const SOFA_CAM = P(V(2.05, 1.0, 0.45), V(2.15, 0.78, -1.55), 42);
// does: you under the blanket, texting; a brown flower pops out of your arm
shot("F1-sofa-day", L(8, 5), "home", "homeDay", [youSofa], (F) => creep(SOFA_CAM, F, L(8, 0), L(8, 5), 0.05), { dof: mid(2.0), props: [held("phone", () => phone(["omw", "5 min"]), youSofa, "right", () => SOFA_CAM, { fwd: 0.1 })] });
// does: match cut, same framing at night (lamp on): the same text, another flower pops
shot("F2-sofa-night", L(8, 8), "home", "homeNight", [youSofa], (F) => creep(SOFA_CAM, F, L(8, 5), L(8, 8), 0.05), { dof: mid(2.0), props: [held("phone", () => phone(["omw", "5 min"]), youSofa, "right", () => SOFA_CAM, { fwd: 0.1 })] });
// does: the phone screen: "omw 5 min", Sent (you are clearly still in bed)
const PHONE_CAM = (F: number) => { const s = youSofa.state(F), h = handWorld(youLook, s.pose, YOU_SOFA, SOFA_CAM.pos, "right", 0.1, s.heading).add(V(0, 0.07, 0)); return P(h.clone().add(V(-0.04, 0.03, 0.32)), h, 40); };
shot("F3-phone-omw", L(9, 0), "home", "homeNight", [youSofa], PHONE_CAM, { subject: undefined, dof: close(0.32), props: [held("phone", () => phone(["omw", "5 min"]), youSofa, "right", () => SOFA_CAM, { fwd: 0.1 })], allow: { ...SEATED, "Caption vs face": "insert on the phone screen held in front of you (face soft behind)" } });
// === line 9: nobody believes a word you say
// does: you try to talk to a neighbour; she clamps her nose and walks off mid-sentence
shot("G1-neighbour-leaves", L(9, 6), "town", "day", [youSquare, NEIGHBOUR], (F) => creep(P(V(1.95, 1.3, 6.3), V(1.8, 1.05, 3.4), 44), F, L(9, 0), L(9, 6), 0.08), { dof: mid(2.9) });
// does: the corner store's door sign flips OPEN -> CLOSED as you come near
shot("G2-closed", L(10, 0), "town", "day", [], (F) => creep(P(V(STORE_SIGN.x + 0.2, 1.45, STORE_SIGN.z + 2.0), STORE_SIGN.clone().add(V(0, -0.05, 0)), 40), F, L(9, 6), L(10, 0), 0.15), { subject: undefined, dof: close(2.0) });
// === line 10: Derek, a thousand perfect flowers
// does: low angle, Derek strides in and stops: tilt up from flowered shoes to his gleaming grin, the banner behind
shot("H1-derek-arrives", L(10, 6), "town", "day", [derekWalk], (F) => { const t = span(F, L(10, 0), L(10, 6)); return P(V(2.25, 0.32, 13.2), V(2.0, 0.5 + 1.25 * t, 15.6), 48); }, { dof: NONE, subjectFrom: 30 });
// does: he spritzes himself with a pink perfume bottle, smug, the wedding-cake of flowers in full view
shot("H2-perfume", L(11, 0), "town", "day", [derekWalk], (F) => creep(on(derekWalk, DEREK_WALK_B, V(0.5, 0, -2.6), "ms", { fov: 42 }), F, L(10, 6), L(11, 0), 0.1), { dof: mid(2.6), props: [held("perfume", perfume, derekWalk, "right", (f) => creep(on(derekWalk, DEREK_WALK_B, V(0.5, 0, -2.6), "ms", { fov: 42 }), f, L(10, 6), L(11, 0), 0.1), { when: (f) => f >= L(10, 6) - 2 })] });
// === line 11: every morning a new promise: pizza, a water park, no more Mondays
// does: at the podium, arms up on each promise; the crowd's cheer is off-screen
shot("I1-podium", B.pizza, "town", "day", [derekPodium], (F) => creep(on(derekPodium, DEREK_PODIUM, V(0.3, 0, -2.5), "mcu", { fov: 42 }), F, L(11, 0), B.pizza, 0.1), { dof: close(2.5) });
// does: pizza panel slams into view (push)
shot("I2-pizza", B.park - 3, "town", "day", [], (F) => P(PANELS[0].clone().add(V(0.05, 0, -0.95)).lerp(PANELS[0].clone().add(V(0.02, 0, -0.8)), span(F, B.pizza, B.park)), PANELS[0], 40), { subject: undefined, dof: close(0.9) });
// does: water park panel
shot("I3-water-park", B.mondays - 4, "town", "day", [], (F) => P(PANELS[1].clone().add(V(-0.05, 0.02, -0.95)).lerp(PANELS[1].clone().add(V(0.0, 0.0, -0.8)), span(F, B.park, B.mondays)), PANELS[1], 40), { subject: undefined, dof: close(0.9) });
// does: the calendar with MONDAY crossed out (push hard on "Mondays")
shot("I4-no-mondays", L(12, 0), "town", "day", [], (F) => P(PANELS[2].clone().add(V(0, 0.02, -1.0)).lerp(PANELS[2].clone().add(V(0, 0, -0.72)), span(F, B.mondays - 4, B.mondays + 10)), PANELS[2], 40), { subject: undefined, dof: close(0.9) });
// === line 12: they bloom the second he says them (no bud!); the glue; a bee snubs him
// does: his arm goes up and a full bloom is just THERE on his sleeve; behind his back a glue tube; a bee sniffs it and flies off
const I5F = on(derekSide, DEREK_SIDE, V(0.15, 0, -2.0), "mcu", { fov: 44, side: 0.1 });
shot("I5-instant-bloom", L(13, 0), "town", "day", [derekSide], (F) => creep(I5F, F, L(12, 0), L(13, 0), 0.08), { dof: close(2.0), fx: ["derekBee"], props: [held("glue", glueTube, derekSide, "right", () => ({ ...I5F, roll: 0 }), { fwd: -0.08 })] });
// === line 13: he promises to bulldoze the park and Grandma's hives
// does: Derek points off-stage beside the NEW PARKING LOT board; whip pan away
shot("J1-plan-board", B.hives - 3, "town", "day", [derekPlan], (F) => creep(P(V(DEREK_PLAN.x + 0.35, 2.0, DEREK_PLAN.z - 3.0), V(DEREK_PLAN.x - 0.5, 1.85, DEREK_PLAN.z), 44), F, L(13, 0), B.hives, 0.1), { dof: mid(3.1), whips: [[B.hives - 3 - L(13, 0) - 6, B.hives - 3 - L(13, 0)]] });
// does: whip in to Grandma's three white hives under the apple tree, bees buzzing round them
shot("J2-the-hives", L(14, 0), "town", "day", [], (F) => P(V(-7.3, 1.1, 1.7).lerp(V(-7.6, 1.05, 2.2), span(F, B.hives - 3, L(14, 0))), V(-9.6, 0.75, 4.95), 46), { subject: undefined, wide: true, dof: NONE, fx: ["hiveBees"], whips: [[0, 6]] });
// === line 14: every summer on her porch, watching where those bees go
// does: you on the porch with binoculars up, Grandma knitting behind you; a bee zips past your nose
const K1F = P(V(GRANDMA_DOOR_X + 0.35, 1.2, PORCH.z1 + 2.6), V(GRANDMA_DOOR_X + 1.25, 0.92, PORCH.z1 - 0.3), 44);
shot("K1-binoculars", L(14, 9), "town", "day", [youPorch, grannyPorch], (F) => creep(K1F, F, L(14, 0), L(14, 9), 0.08), { dof: mid(2.6), fx: ["porchBees", "fly"], props: [held("binoculars", binoculars, youPorch, "both", () => K1F, { fwd: 0.09, up: 0.02 })] });
// does: the notebook on the step: bee doodles and arrows, LINDA - YES, MAILMAN - YES
const NB_AT = V(GRANDMA_DOOR_X + 0.35, PORCH.y + 0.012, PORCH.z1 - 0.28);
shot("K2-notebook", L(15, 0), "town", "day", [], (F) => P(NB_AT.clone().add(V(0.02, 0.55, 0.18)).lerp(NB_AT.clone().add(V(0.01, 0.47, 0.14)), span(F, L(14, 9), L(15, 0))), NB_AT, 40), { subject: undefined, dof: close(0.5), props: [{ name: "notebook", make: () => notebook(0), pose: (o) => { o.position.copy(NB_AT); o.rotation.set(0, 0.1, 0); } }] });
// === line 15: you promise to save them; a bud pops out of your hand
// does: at the hives you take Grandma's hands, swallow, and promise
const L1F = P(V(-9.15, 1.3, 0.95), V(-9.2, 1.12, 3.7), 48);
shot("L1-the-promise", L(15, 12), "town", "day", [youHives, grannyHives], (F) => creep(L1F, F, L(15, 0), L(15, 12), 0.1), { dof: mid(2.7), fx: ["hiveBees", "fly"] });
// does: close on your hand: POP, a fresh green bud among the brown ones; the fly lands on it, you shoo it
const HAND_CAM = (F: number) => { const s = youHives.state(L(15, 14)), h = handWorld(youLook, s.pose, YOU_HIVE, L1F.pos, "right", 0.06, s.heading); return P(h.clone().add(V(0.12, 0.12 + 0.02 * span(F, L(15, 12), L(16, 0)), -0.75)), h.clone().add(V(0, 0.05, 0)), 40); };
shot("L2-bud-pops", L(16, 0), "town", "day", [youHives, grannyHives], HAND_CAM, { subject: undefined, dof: close(0.75), fx: ["hiveBees", "fly"], allow: { "Subject size": "insert on your hand: the bud is the subject" } });
// === line 16: Grandma: "Sweetie, you promised to visit at Christmas. Three Christmases ago."
// does: Grandma talks, one eyebrow up, then points at your flowers
shot("M1-grandma-doubts", B.christmas - 4, "town", "day", [grannyHives, youHives], (F) => creep(on(grannyHives, GRANNY_HIVE, V(0.35, 0, -1.8), "mcu", { fov: 42, side: -0.15 }), F, L(16, 0), B.christmas, 0.1), { subject: "grandma", dof: close(1.8), fx: ["hiveBees"] });
// does: her finger taps your rotten Christmas flower: a petal drops off
const TAP_AT = V(-8.62, 1.02, 3.62);
shot("M2-petal-drops", L(17, 0), "town", "day", [youHives, grannyHives], (F) => P(TAP_AT.clone().add(V(0.3, 0.05, -0.85)), TAP_AT.clone().add(V(0, -0.05 - 0.15 * span(F, B.christmas, L(17, 0)), 0)), 40), { subject: undefined, dof: close(0.9), fx: ["petal"], allow: { "Subject size": "insert: the falling petal is the subject" } });
// === line 17: every bee she owns, in a shoebox
// does: you stride up holding a shoebox, smug; Grandma stops knitting and stares
const N1F = (F: number) => creep(on(youWalk, YOU_WALK, V(-0.15, 0, 3.0), "ms", { fov: 44, side: 0.15 }), F, L(17, 0), L(17, 6), 0.1);
shot("N1-shoebox", L(17, 6), "town", "day", [youWalk, grannyPorch], N1F, { subject: "you", dof: mid(3.0), props: [boxProp(youWalk, "both", N1F)] });
// does: close on the box: the lid hops from ten thousand bees, the sticker DO NOT SHAKE
const N2C = (F: number) => { const s = youWalk.state(L(17, 7)), h = handWorld(youLook, s.pose, YOU_WALK, N1F(L(17, 6)).pos, "both", 0.12, s.heading); return P(h.clone().add(V(0.08, 0.32, 0.62 - 0.08 * span(F, L(17, 6), L(18, 0)))), h.clone().add(V(0, 0.0, 0)), 40); };
shot("N2-lid-hops", L(18, 0), "town", "day", [youWalk], N2C, { subject: undefined, dof: close(0.7), props: [boxProp(youWalk, "both", N1F)], allow: { "Subject size": "insert: the hopping lid is the subject" } });
// === line 18: by Friday, 99 percent, and your bud turning brown
// does: night, over your shoulder: the TV says DEREK 99%; you slump
const O1C = P(V(2.35, 1.42, -2.25), V(1.2, 0.82, 1.4), 44);
shot("O1-tv-poll", L(18, 8), "home", "homeNight", [youSofa], (F) => creep(O1C, F, L(18, 0), L(18, 8), 0.1), { subject: undefined, dof: mid(3.4), allow: { ...SEATED, "Subject size": "over the shoulder: the TV poll is the subject" } });
// does: close on your bud: its edges go brown; tears; the fly lands next to it, waiting
const O2C = (F: number) => { const s = youSofa.state(L(18, 10)), h = handWorld(youLook, s.pose, YOU_SOFA, V(2.2, 1.0, -0.4), "right", 0.06, s.heading); return P(h.clone().add(V(0.05, 0.22, 0.75 - 0.1 * span(F, L(18, 8), L(19, 0)))), h.clone().add(V(0, 0.08, 0)), 40); };
shot("O2-bud-browning", L(19, 0), "home", "homeNight", [youSofa], O2C, { subject: undefined, dof: close(0.75), fx: ["fly"], allow: { ...SEATED, "Subject size": "insert: the browning bud is the subject" } });
// === line 19: the debate; you shout "He's a fake!"; the park laughs at the flake
const DEB = { debate: true, scene: "debate" };
// does: the morning debate: rows of chairs, the stage, Derek grinning in his flowers; you sit in the front row with the box
shot("P1-debate-wide", B.shout - 8, "town", "day", [youDebate, derekSide, ...CROWD], (F) => P(V(-4.6, 2.7, 8.2).lerp(V(-4.2, 2.6, 8.8), span(F, L(19, 0), B.shout)), V(2.0, 1.25, 16.8), 50), { ...DEB, wide: true, subject: undefined, dof: NONE });
// does: you jump up and point at Derek, the box under one arm
const P2F = (F: number) => creep(on(youDebate, YOU_STAND, V(-0.3, 0, 2.7), "ms", { fov: 44 }), F, B.shout - 8, B.laughs, 0.1);
shot("P2-he-is-a-fake", B.laughs - 4, "town", "day", [youDebate, ...crowdNear(10, 14.6, -1, 4.5)], P2F, { ...DEB, subject: "you", dof: mid(2.6), props: [boxProp(youDebate, "left", P2F, B.shout - 8)] });
// does: the whole crowd roars, every hand on its nose, laughing at you
shot("P3-crowd-laughs", L(20, 0), "town", "day", [youDebate, ...CROWD], (F) => P(V(2.1, 2.45, 17.6), V(2.0, 0.9, 11.6).lerp(V(1.8, 0.9, 12.2), span(F, B.laughs, L(20, 0))), 52), { ...DEB, wide: true, subject: undefined, dof: NONE, props: [boxProp(youDebate, "left", () => P(V(2.1, 2.45, 17.6), V(2, 0.9, 11.6), 52), B.shout - 8)] });
// === line 20: you lift the lid
// does: close on the box in both hands: the bands snap, the lid lifts, one scout bee climbs out
const Q1C = (F: number) => { const s = youDebate.state(B.lid), h = handWorld(youLook, s.pose, YOU_STAND, V(1.4, 1.5, 17.2), "both", 0.12, s.heading); return P(h.clone().add(V(0.12, 0.38, 0.75 - 0.1 * span(F, L(20, 0), L(21, 0)))), h.clone().add(V(0, 0.05, 0)), 40); };
shot("Q1-lid", L(21, 0), "town", "day", [youDebate], Q1C, { ...DEB, subject: undefined, dof: close(0.8), fx: ["swarm"], props: [boxProp(youDebate, "both", () => P(V(1.4, 1.5, 17.2), V(1.5, 1, 14), 44))], allow: { "Subject size": "insert: the lid and the scout bee are the subject" } });
// === line 21: ten thousand bees pour out
// does: a golden cloud of bees erupts from the box over your head, the front rows gape
const Q2F = (F: number) => creep(on(youDebate, YOU_STAND, V(-0.35, 0, 3.2), "ms", { fov: 50, dy: 0.4 }), F, L(21, 0), B.pour + 30, 0.06, 0.3);
shot("Q2-eruption", B.pour + 34, "town", "day", [youDebate, ...crowdNear(10, 14.6, -1.5, 5)], Q2F, { ...DEB, dof: mid(3.0), fx: ["swarm", "speedBees"], props: [boxProp(youDebate, "both", Q2F)] });
// does: ride with the swarm over the crowd's heads toward the stage (object POV)
shot("Q3-ride-the-swarm", L(22, 0), "town", "day", [derekSide, ...CROWD], (F) => { const t = span(F, B.pour + 34, L(22, 0)); return P(V(1.4, 3.3, 11.0).lerp(V(1.9, 2.9, 15.6), t), V(2.0, 1.3, 19.4).lerp(V(2.0, 1.8, 19.4), t), 54); }, { ...DEB, wide: true, subject: undefined, dof: NONE, fx: ["swarm"] });
// === line 22: Linda's knee, the mailman's elbow, Grandma's roses
const lindaSeat = CROWD.find((r) => r.name === "linda")!, mailSeat = CROWD.find((r) => r.name === "mail")!;
// does: bees pile onto Linda's knee sunflower like a fuzzy hat; she giggles
shot("R1-linda-knee", B.mailman, "town", "day", [lindaSeat, ...crowdNear(10, 12.5, -1.5, 2)], (F) => { const a = lindaSeat.at(0); return P(a.clone().add(V(0.25, 0.75, 1.3)), a.clone().add(V(0.05, 0.55, 0)), 44); }, { ...DEB, subject: "linda", dof: close(1.4), fx: ["swarm"] });
// does: the mail carrier's daisies vanish under bees, he laughs
shot("R2-mail-elbow", B.roses, "town", "day", [mailSeat], (F) => { const a = mailSeat.at(0); return creep(P(a.clone().add(V(-0.2, 0.95, 1.5)), a.clone().add(V(0, 0.82, 0)), 44), F, B.mailman, B.roses, 0.1); }, { ...DEB, subject: "mail", dof: close(1.6), fx: ["swarm"] });
// does: at the side, Grandma's roses fill with bees and she beams with her arms up
shot("R3-grandma-roses", L(23, 0), "town", "day", [grannyDebate], (F) => creep(on(grannyDebate, GRANNY_SIDE, V(1.0, 0, 2.0), "mcu", { fov: 44 }), F, B.roses, L(23, 0), 0.1), { ...DEB, subject: "grandma", dof: close(2.0), fx: ["swarm"] });
// === line 23: every flower... except Derek's
// does: the swarm sweeps onto the stage and splits round Derek, leaving him in a ring of empty air
shot("S1-swarm-parts", B.except - 2, "town", "day", [derekSide], (F) => P(V(2.6, 1.15, 15.4), V(PODIUM.x + 0.9, 1.9, 19.2), 50), { ...DEB, wide: true, subject: "derek", dof: NONE, fx: ["swarm"] });
// does: slow push on his frozen grin as every head turns his way
shot("S2-frozen-grin", L(24, 0), "town", "day", [derekSide], (F) => creep(on(derekSide, DEREK_SIDE, V(0.25, 0, -2.6), "mcu", { fov: 42 }), F, B.except - 2, L(24, 0), 0.18), { ...DEB, subject: "derek", dof: close(2.5), fx: ["swarm"] });
// === line 24: all summer you've watched those bees: DEREK - NEVER
// does: the notebook page you scribbled all summer: DEREK - NEVER, circled three times
shot("T1-derek-never", L(24, 8), "town", "day", [], (F) => P(NB_AT.clone().add(V(0.02, 0.5, 0.16)).lerp(NB_AT.clone().add(V(0.0, 0.42, 0.12)), span(F, L(24, 0), L(24, 8))), NB_AT, 40), { ...DEB, subject: undefined, dof: close(0.45), props: [{ name: "notebook", make: () => notebook(1), pose: (o) => { o.position.copy(NB_AT); o.rotation.set(0, 0.1, 0); } }] });
// does: back to you in the front row: arms crossed, the smuggest face of your life
shot("T2-smug", L(25, 0), "town", "day", [youDebate, ...crowdNear(10, 14.6, -0.5, 3.5)], (F) => creep(on(youDebate, YOU_STAND, V(-0.2, 0, 2.0), "mcu", { fov: 42 }), F, L(24, 8), L(25, 0), 0.12), { ...DEB, dof: close(2.0), fx: ["swarm"] });
// === line 25: "Pfft. Bees? I promise these flowers are real!"
// does: Derek laughs too loudly, slaps his flowered chest; a fake petal falls off
shot("U1-i-promise", L(26, 0), "town", "day", [derekSide], (F) => creep(P(V(DEREK_SIDE.x + 0.3, 1.75, DEREK_SIDE.z - 2.4), V(DEREK_SIDE.x, 2.25, DEREK_SIDE.z), 44), F, L(25, 0), L(26, 0), 0.1), { ...DEB, subject: "derek", dof: close(2.4) });
// === line 26: POP, a new flower shoots out of his nose
// does: crash in on his face: a real stem shoots out of the tip of his nose and opens; ring eyes
const U2F = on(derekSide, DEREK_SIDE, V(0.1, 0, -1.7), "cu", { fov: 40 });
shot("U2-nose-pop", L(27, 0), "town", "day", [derekSide], impact((F) => creep(U2F, F, L(26, 0), B.nosePop + 6, 0.22), B.nosePop, 0.03, 7), { ...DEB, subject: "derek", dof: close(1.7), kicks: [[B.nosePop - L(26, 0), B.nosePop - L(26, 0) + 7]], fx: ["speedNose"] });
// === line 27: and it rots, right there, on live TV
// does: the nose flower wilts brown in seconds, flies arrive, he goes cross-eyed and sweaty
shot("U3-nose-rots", L(27, 5), "town", "day", [derekSide], (F) => creep(U2F, F, L(27, 0), L(27, 5), 0.12), { ...DEB, subject: "derek", dof: close(1.7) });
// does: the news camera's red LIVE light burns, Derek soft behind it
shot("U4-live", L(28, 0), "town", "day", [derekSide], (F) => creep(P(LIVE_LIGHT.clone().add(V(-0.55, 0.05, -0.75)), LIVE_LIGHT.clone().add(V(0.1, 0, 0.3)), 40), F, L(27, 5), L(28, 0), 0.1), { ...DEB, subject: undefined, dof: close(0.9), allow: { "Subject size": "insert: the LIVE light is the subject" } });
// === line 28: he sweats, the glue melts, a thousand flowers slide off like wet stickers
// does: sweat pours, the first glued flowers peel; he grabs at them
shot("V1-sweat", B.slide - 2, "town", "day", [derekSide], (F) => creep(on(derekSide, DEREK_SIDE, V(0.2, 0, -2.4), "mcu", { fov: 44 }), F, B.sweats, B.slide, 0.1), { ...DEB, subject: "derek", dof: close(2.3) });
// does: tilt down with them: the flowers slide off in sheets and pile at his feet
shot("V2-slide", L(29, 0), "town", "day", [derekSide], (F) => { const t = span(F, B.slide - 2, L(29, 0)); return P(V(DEREK_SIDE.x + 0.4, 2.2 - 0.9 * t, DEREK_SIDE.z - 3.6), V(DEREK_SIDE.x, 2.2 - 1.2 * t, DEREK_SIDE.z), 46); }, { ...DEB, subject: "derek", dof: mid(3.6), props: [{ name: "flower pile", make: flowerPile, touches: ["stage"], pose: (o, F) => { const k = clamp01((F - B.slide) / 40); if (k <= 0) return false; o.position.copy(DEREK_SIDE).add(V(0, 0, -0.1)); o.scale.set(0.4 + 0.6 * k, k, 0.4 + 0.6 * k); } }, { name: "glue falls", make: glueTube, touches: ["stage"], pose: (o, F) => { if (F < B.slide) return false; const t = clamp01((F - B.slide) / 14); o.position.copy(DEREK_SIDE).add(V(0.35, STAGE_UP * (1 - t * t), -0.15)); o.rotation.set(0, 0, 1.4 * t); } }] });
// === line 29: underneath, a thousand rotten ones
// does: pull back fast: Derek covered in rot and flies, a green stink wave rolls off the stage, the front row recoils
shot("V3-stink-wave", L(30, 0), "town", "day", [derekSide, ...CROWD], (F) => { const t = span(F, L(29, 0), L(29, 0) + 26); return P(V(6.2, 2.3, 17.6).lerp(V(8.4, 3.2, 14.4), t), V(2.4, 1.6, 18.2).lerp(V(2.0, 1.2, 16.0), t), 50); }, { ...DEB, wide: true, subject: "derek", dof: NONE, fx: ["stinkDerek"], props: [{ name: "flower pile", make: flowerPile, touches: ["stage"], pose: (o) => { o.position.copy(DEREK_SIDE).add(V(0, 0, -0.1)); } }] });
// === line 30: even your fly leaves you, for Derek
// does: your fly lifts off your head, hesitates, and buzzes across to join Derek's cloud; you wave it goodbye
shot("W1-the-fly-leaves", L(31, 0), "town", "day", [youDebate, derekSide], (F) => { const t = span(F, B.flyGo, B.toDerek + 10); const a = head(youDebate, F), b = head(derekSide, F); return P(V(9.6, 2.1, 16.6), a.lerp(b, t).add(V(0, -0.1, 0)), 46); }, { ...DEB, subject: undefined, dof: NONE, fx: ["flyToDerek", "stinkDerek"], props: [{ name: "flower pile", make: flowerPile, touches: ["stage"], pose: (o) => { o.position.copy(DEREK_SIDE).add(V(0, 0, -0.1)); } }] });
// === line 31: Derek loses; you can smell him from across the mall
// does: the newspaper on the plaza bench: DEREK LOSES
const PAPER_AT = BENCH.clone().add(V(-0.25, 0.47, 0.02));
shot("X0-derek-loses", L(31, 2), "town", "day", [], (F) => creep(P(PAPER_AT.clone().add(V(0.1, 0.55, 0.55)), PAPER_AT, 40), F, L(31, 0), L(31, 2), 0.12), { subject: undefined, dof: close(0.75), props: [{ name: "newspaper", make: newspaper, touches: ["bench"], pose: (o) => { o.position.copy(PAPER_AT); } }] });
// does: the same mall telephoto as line 6: Derek now at the end, a cloud twice as big, even the "I'll call you" guy holds his nose
shot("X1-mall-again", L(32, 0), "town", "day", [derekMall, CALL_GUY, ...SHOPPERS], (F) => P(V(23.6, 1.5, -6.85), V(43.5, 1.1, -7.05).lerp(V(40, 1.05, -7.0), span(F, L(31, 2), L(32, 0))), 15), { wide: true, subject: "derek", scene: "mall day", dof: NONE, fx: ["stinkMall"] });
// === line 32: golden light: fourteen rotten flowers... and one that finally blooms
// does: golden hour at the hives, bees home, you and Grandma side by side; your rotten flowers sway
shot("Y1-golden-hives", L(32, 3), "town", "golden", [youHives, grannyHives], (F) => creep(P(V(-9.25, 1.35, 0.9), V(-9.35, 1.15, 3.7), 50), F, L(32, 0), L(32, 3), 0.08), { dof: mid(2.8), fx: ["hiveBees"] });
// does: your hand comes up by your face: the bud bursts into a big rust-orange flower, a bee lands on it, the proudest face
shot("Y2-it-blooms", FRAMES, "town", "golden", [youHives], (F) => creep(on(youHives, V(-8.95, 0, 3.6), V(0.25, 0, -1.6), "mcu", { fov: 42, side: 0.15 }), F, L(32, 3), FRAMES, 0.14), { dof: close(1.6), fx: ["hiveBees"] });
const STAGE_UP = 0.95;

export const PLAN: Plan = { slug: "promise-flowers", shots: SHOTS, words };

// ------------------------------------------------------------------ living things, per composition frame
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Where your head is in the shot that is on screen at F (the fly orbits it). */
const YOU_ROLES: [number, number, Role][] = [[L(7, 0), L(8, 0), youPorch], [L(14, 0), L(15, 0), youPorch], [L(15, 0), L(17, 0), youHives], [L(18, 0), L(19, 0), youSofa], [L(19, 0), FRAMES, youDebate]];
export const flyAt = (F: number): Vector3 | null => {
  const r = YOU_ROLES.find(([a, b]) => F >= a && F < b)?.[2];
  if (!r) return null;
  const h = head(r, F);
  // line 15: it lands on the new bud, you shoo it (hand cam); line 18: it lands beside the browning bud
  if (F >= B.budPop + 12 && F < B.budPop + 30) { const s = r.state(F); return handWorld(youLook, s.pose, r.at(F), L1F.pos, "right", 0.1, s.heading).add(V(0.03, 0.1, 0)); }
  if (F >= L(18, 8) + 20 && F < L(19, 0)) { const s = r.state(F); return handWorld(youLook, s.pose, r.at(F), V(2.2, 1.0, -0.4), "right", 0.1, s.heading).add(V(0.05, 0.06, 0)); }
  if (F >= B.flyGo) {
    const t = clamp01((F - B.flyGo) / (B.toDerek + 8 - B.flyGo)), d = head(derekSide, F);
    const p = h.clone().lerp(d, t * t * (3 - 2 * t)).add(V(0, 0.4 * Math.sin(Math.PI * t) + 0.04 * Math.sin(F / 2), 0));
    if (t >= 1) return d.add(V(0.35 * Math.cos(F / 4), 0.2 + 0.12 * Math.sin(F / 3), 0.25 * Math.sin(F / 4)));
    return p;
  }
  const a = F / 6;
  return h.add(V(0.34 * Math.cos(a), 0.18 + 0.06 * Math.sin(F / 4), 0.26 * Math.sin(a)));
};
/** Bees round the hives (ambient). */
export const hiveBee = (i: number, F: number) => {
  const h = HIVES[i % 3], a = F / (14 + 6 * rnd(i)) + rnd(i + 3) * 6.28, r = 0.35 + 0.9 * rnd(i + 7);
  return h.clone().add(V(Math.cos(a) * r, 0.6 + 0.6 * rnd(i + 11) + 0.15 * Math.sin(F / 5 + i), Math.sin(a) * r * 0.8));
};
/** Bees zipping past the porch (line 14), from the hives across the street. */
export const porchBee = (i: number, F: number) => {
  const t = ((F / 70 + rnd(i)) % 1), a = HIVES[i % 3].clone().add(V(0, 0.8, 0)), b = V(GRANDMA_DOOR_X + 1.0 + (rnd(i + 2) - 0.5) * 2, 1.0 + rnd(i + 4) * 0.6, PORCH.z1 + 0.4);
  return t < 0.5 ? a.lerp(b, t * 2) : b.lerp(a, (t - 0.5) * 2).add(V(0, 0.3 * Math.sin(t * 9), 0));
};
/** The single bee that snubs Derek (line 12). */
export const derekBee = (F: number): Vector3 | null => {
  const a = L(12, 0) + 4, arm = DEREK_SIDE.clone().add(V(-0.45, 1.25, -0.15));
  if (F < a) return null;
  const t = (F - a) / 50;
  if (t < 0.4) return V(DEREK_SIDE.x - 1.6, 1.6, DEREK_SIDE.z - 0.8).lerp(arm, t / 0.4);
  if (t < 0.55) return arm.clone().add(V(0.03 * Math.sin(F * 1.7), 0.02 * Math.cos(F * 2.3), 0));
  const u = (t - 0.55) / 0.45;
  return arm.clone().add(V(-1.6 * u + 0.25 * Math.sin(u * 14), 0.7 * u, -0.6 * u));
};
/** The swarm (lines 20-24): out of the box, a cloud over the crowd, onto every real flower, never Derek. */
const BOX_TOP = () => handWorld(youLook, youDebate.state(B.lid).pose, YOU_STAND, V(1.4, 1.5, 17.2), "both", 0.12, youDebate.state(B.lid).heading).add(V(0, 0.08, 0));
const TARGETS: Vector3[] = [];
for (const r of CROWD) {
  const at = r.at(0), name = r.name;
  const n = name === "linda" ? 26 : name === "mail" ? 22 : name === "dad" ? 0 : 6;
  for (let k = 0; k < n; k++) TARGETS.push(at.clone().add(name === "linda" ? V(0.12 + (rnd(k) - 0.5) * 0.22, 0.42 + rnd(k + 1) * 0.2, 0.08) : name === "mail" ? V((k % 2 ? 0.3 : -0.3) + (rnd(k) - 0.5) * 0.12, 0.55 + rnd(k + 2) * 0.35, 0.06) : V((rnd(k + r.name.length) - 0.5) * 0.6, 0.5 + rnd(k + 3) * 0.6, 0.06)));
}
for (let k = 0; k < 30; k++) TARGETS.push(GRANNY_SIDE.clone().add(V((rnd(k + 40) - 0.5) * 0.7, 0.7 + rnd(k + 41) * 0.8, 0.06)));
export const SWARM_N = 420;
export const swarmBee = (i: number, F: number): Vector3 | null => {
  if (F < B.lid - 2) return null;
  const box = BOX_TOP();
  if (i === 0 && F < B.pour) return box.clone().add(V(0.02 * Math.sin(F), 0.03 + 0.08 * clamp01((F - B.lid) / 20), 0)); // the scout
  if (F < B.pour - 2) return null;
  const t0 = B.pour - 2 + (i % 40), u = (F - t0) / 40;
  if (u < 0) return box.clone().add(V(0, 0.02, 0));
  // 1) erupt into a column over your head
  const col = box.clone().add(V(Math.cos(i * 2.4 + F / 6) * (0.2 + 0.5 * rnd(i)), 1.2 + 1.4 * rnd(i + 1), Math.sin(i * 2.4 + F / 6) * (0.2 + 0.5 * rnd(i))));
  if (u < 1) return box.clone().lerp(col, u * u * (3 - 2 * u));
  // 2) the cloud drifts over the crowd toward the stage
  const cloud = V(1.6 + (rnd(i + 5) - 0.5) * 7, 2.6 + rnd(i + 6) * 1.4, 12.5 + rnd(i + 7) * 4.5).add(V(0.3 * Math.sin(F / 8 + i), 0.2 * Math.cos(F / 7 + i), 0));
  const u2 = (F - t0 - 40) / 50;
  if (u2 < 1) return col.lerp(cloud, clamp01(u2));
  // 3) settle on a real flower (2 of 3 bees), or (the rest) swirl round Derek, never closer than ~1 m
  if (i % 3 !== 2 && F < B.except) {
    const tg = TARGETS[i % TARGETS.length], u3 = clamp01((F - t0 - 90) / 30);
    return cloud.lerp(tg.clone().add(V(0.03 * Math.sin(F * 1.3 + i), 0.02 * Math.cos(F * 1.1 + i), 0)), u3 * u3 * (3 - 2 * u3));
  }
  const d = DEREK_SIDE.clone().add(V(0, 1.2, 0)), a = i * 0.9 + F / 18, r = 1.05 + 0.5 * rnd(i + 9);
  const ring = d.clone().add(V(Math.cos(a) * r, (rnd(i + 10) - 0.4) * 1.6, Math.sin(a) * r * 0.6));
  if (F >= B.except) {
    const tg = TARGETS[i % TARGETS.length];
    return i % 3 === 2 ? ring : tg.clone().add(V(0.03 * Math.sin(F * 1.3 + i), 0.02 * Math.cos(F * 1.1 + i), 0));
  }
  return cloud.lerp(ring, clamp01((F - t0 - 90) / 40));
};
/** Stink puffs: the mall (rolling toward the lens), the bench rot (line 3), Derek's wave (lines 29-30). */
export const stinkAt = (kind: "mall" | "bench" | "derek", i: number, F: number): Vector3 | null => {
  if (kind === "mall") {
    const src = F > L(30, 0) ? MALL_DEREK : MALL_GUY, a = F > L(30, 0) ? L(31, 0) : L(6, 6);
    const age = (F - a + i * 4) / 90;
    if (age < 0) return null;
    return src.clone().add(V(-age * 16 * (0.7 + 0.5 * rnd(i)), 0.6 + 1.2 * rnd(i + 1) + age * 0.6, (rnd(i + 2) - 0.5) * 1.6));
  }
  if (kind === "bench") {
    const a = B.rot + 10 + i * 3;
    if (F < a) return null;
    const age = (F - a) / 40;
    return MAN_AT.clone().add(V(0.32 + age * 0.4 * Math.sin(i), 0.95 + age * 0.8, 0.1 + age * 0.2));
  }
  if (F < B.underneath - 4) return null;
  const age = (F - B.underneath + 4 + i * 2) / 50, d = DEREK_SIDE.clone().add(V(0, 1.0, 0));
  return d.add(V((rnd(i) - 0.5) * 2.2 * (1 + age), 0.2 + age * 0.9 * rnd(i + 1), -age * 4.5 * (0.6 + 0.6 * rnd(i + 2))));
};
/** The petal that drops off your Christmas flower (line 16). */
export const petalProp: MovingProp = { name: "petal", make: petal, pose: (o, F) => { if (F < B.christmas) return false; const t = (F - B.christmas) / 30; o.position.copy(TAP_AT).add(V(0.05 * Math.sin(t * 9), -0.95 * clamp01(t), 0)); o.rotation.set(0, 0, t * 5); } };
