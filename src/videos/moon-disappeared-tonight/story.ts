import { Line3, Object3D, Vector3 } from "three";
import { perform } from "../../../kit/toon/acting";
import { CamPose, frameOn, glide, impact, telephoto } from "../../../kit/toon/camera";
import { exprAt, handWorld, viewYaw } from "../../../kit/toon/cast";
import { headHeight } from "../../../kit/toon/figure";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { EXTRAS } from "../../../kit/toon/extras";
import { talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { POSES, REST, alive, moveCurve, movePose, posed, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose, PoseName } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import MOUTH from "../../../videos/moon-disappeared-tonight/voice/mouth.json";
import WORDS from "../../../videos/moon-disappeared-tonight/voice/words.json";
import { BEACH, BED, SOLD_SIGN, seatIn, BRAD_AT, FLOOD_HEAD, PIER_END, STICK_GRIP, hillY, alertPhone, cobwebDog, tinyWave, bradLook, crab, fishBag, fleeProp, foldedChair, kernel, lawnChair, miaLook, pan, pathAt, popcornBucket, selfieStick, sheetHeight, stick, tideAt } from "./world";

/**
 * moon-disappeared-tonight (episode 4, scenario), shot plan. Every beat is locked to words.json (composition frames,
 * 30 fps). One place: the beach at night (the analogy cuts once to a bedroom). The sea is toward -z, the town's hill
 * toward +z. Every role goes through kit `perform`.
 */
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
const MOUTH_T = MOUTH as MouthFrame[];
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
const word = (t: string, n = 0) => {
  const w = words.filter((x) => norm(x.text) === norm(t))[n];
  if (!w) throw new Error(`word "${t}" #${n} not in words.json`);
  return w;
};
export const W = (t: string, n = 0) => Math.round(word(t, n).start * FPS);
const E = (t: string, n = 0) => Math.round(word(t, n).end * FPS);
export const LAST = Math.round(words[words.length - 1].end * FPS);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const FRAMES = LAST + 8;

export const B = {
  carry: W("carry"), chair0: W("chair"), ocean0: W("ocean"), n4000: W("4000"), hill: W("hill"),
  because: W("because"), moon0: W("moon"), switched: W("switched"), off0: W("off"),
  and0: W("and"), phone: W("phone"), giant: W("giant"), wave0: W("wave"),
  but0: W("but"), grandmas: W("grandma's"), shack0: W("shack"),
  it4: W("it"), hasnt: W("hasn't"), hot: W("hot"), dog: W("dog"), month: W("month"), tomorrow: W("tomorrow"), brad0: W("brad"), realtor: W("realtor"), buys: W("buys"),
  up0: W("brad's"), n500: W("500"), sandbags: W("sandbags"), flood0: W("floodlights"), live: W("live"), stream: W("stream"),
  enjoy: W("enjoy"), wave1: W("wave", 1), guy: W("guy"), guyEnd: E("guy"),
  even: W("even"), sister: W("sister"), mia0: W("mia"), lost: W("lost"),
  were: W("we're"), drown: W("drown"), drownEnd: E("drown"),
  dont: W("don't"), answer: W("answer"), push: W("push"), tide0: W("tide"), stick0: W("stick"), water0: W("water"),
  then0: W("then"), sw: W("switch"), every1: W("every", 1), light: W("light"), shack1: W("shack", 1),
  make: W("make"), popcorn: W("popcorn"),
  then1: W("then", 1), ocean1: W("ocean", 1), back0: W("back"),
  it0: W("it", 3), tsunami: W("tsunami"), tsunamiEnd: E("tsunami"),
  ten: W("ten"), twenty: W("twenty"), thirty: W("thirty"), stick1: W("stick", 1), sand1: W("sand", 1),
  see: W("see"), moon1: W("moon", 1), bump: W("bump"), hand: W("hand"), bedsheet: W("bedsheet"),
  letgo: W("let"), sheet: W("sheet"), slam: W("slam"), settles: W("settles"),
  no: W("no"), boring: W("boring"), tide: W("tide", 1),
  when: W("when"), lantern: W("lantern"), burns: W("burns"), water1: W("water", 1), crawls: W("crawls"), quits: W("quits"), third: W("third"), stick2: W("stick", 2),
  but1: W("but", 1), moon2: W("moon", 2), nightlight: W("nightlight"), without: W("without"), darker: W("darker"),
  so: W("so"), flood1: W("floodlights", 1), brightest: W("brightest"), moth: W("moth"), finds: W("finds"), brad1: W("brad", 1),
  up2: W("up", 2), nobody: W("nobody"), down1: W("but", 2), dark: W("dark"), looks: W("sky"), explodes: W("explodes"), stars: W("stars"),
  next: W("so", 1), n4000b: W("4000", 1), bring: W("carry", 1), chair1: W("chair", 2), straight: W("straight"), popcorn1: W("popcorn", 1),
};
// The sea pulls back on "back", lies still from "No wave", crawls back on "crawls" and quits on "quits".
const TIDE_K = { back: B.back0, stops: B.no, comes: B.crawls, stick: B.quits };
export const tide = (F: number) => tideAt(F, TIDE_K);
/** Stars visible (0..1): a few at dusk (lines 1-6), the night's from Mia on, the Milky Way on "explodes". The sky
 * itself tells the time (R26: no stamp cards): dusk -> night -> the darkest night -> the next night. */
const DUSK_UNTIL = B.even;
export const starsAt = (F: number) => (F < DUSK_UNTIL ? 0.3 : F < B.explodes - 4 ? 0.95 : Math.min(0.85 + (F - (B.explodes - 4)) / 30, 1));
export const milkyAt = (F: number) => (F < B.explodes - 4 ? 0 : Math.min((F - (B.explodes - 4)) / 24, 1));
/** Line 18 time-lapse: the lantern's candle (1 = new) burns down from "lantern" to "quits". */
export const burnAt = (F: number) => 1 - 0.7 * clamp01((F - B.lantern) / (B.quits - B.lantern));
/** The shack's lights: on until line 10 switches them off one by one; back on the next night. */
export const shackOn = (F: number) => {
  if (F >= B.next - 2) return { fridge: true, bulbs: true, neon: 1 };
  return { fridge: F < B.sw + 2, bulbs: F < B.every1 + 6, neon: F < B.shack1 - 6 ? 1 : F < B.shack1 + 4 ? (Math.floor(F / 2) % 2 ? 1 : 0.5) : 0 };
};

// ------------------------------------------------------------------ helpers
type Role = { name: string; look: Look | ((F: number) => Look); at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean };
export const snap = (k: number) => { const w = words.find((x) => Math.round(x.start * FPS) >= k); return w ? Math.round(w.start * FPS) - 1 : k; };
const st = (pose: Pose, F: number, seed: number, keys: [number, Expr][], extra: Partial<CharState> = {}, act = 1): CharState => {
  const e = exprAt<Expr>(keys.map(([k, x], i) => [i ? snap(k) : k, x] as [number, Expr]), F, seed);
  return perform({ pose, expr: e.expr, blink: e.blink, fx: {}, ...extra }, F, seed, e, act);
};
const pose = (keys: [number, PoseName | Pose][], F: number, ease = 5): Pose => {
  const P = (k: PoseName | Pose) => (typeof k === "string" ? posed(k, F / FPS) : k);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  const step = (a: Pose, b: Pose, d: number) => movePose(a, b, moveCurve(d, ease), moveCurve(d - 1, ease), moveCurve(d - 2, ease));
  let out = P(keys[i][1]);
  if (i > 0 && F - keys[i][0] < ease + 7) out = step(P(keys[i - 1][1]), out, F - keys[i][0]);
  if (i + 1 < keys.length && keys[i + 1][0] - F <= 3) out = step(out, P(keys[i + 1][1]), F - keys[i + 1][0]);
  return out;
};
const span = (F: number, a: number, b: number) => glide((F - a) / Math.max(b - a, 1));
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const SEA = Math.PI; // heading toward the sea (-z)

// ------------------------------------------------------------------ you
/** Arms for the props: the folded chair under the right arm, the popcorn bucket held in the lap. */
const CARRY: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.3, 0.42], grip: "fist" }] };
const LAP: Pose = { ...POSES.hold, arms: [{ at: [-0.22, 0.42], grip: "mitt" }, { at: [-0.22, 0.42], grip: "mitt" }] };
const STICK_HOLD: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.36, 0.3], grip: "fist" }] };
const STICK_PUSH: Pose = { ...POSES.idle, arms: [{ at: [0.15, 0.55], grip: "fist" }, { at: [0.5, 0.78], grip: "fist" }], lean: 0.5, bob: -18, knee: 18, sway: 6 };
const FLICK: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.62, 0.1], grip: "fist" }], sway: 6 };
const SWITCH: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.55, -0.35], grip: "point" }], look: 0.4 };
/** Where you are: walking down the path (line 1), at the chair, seated, walking to the water, inside the shack. */
const WALK_A = V(0.3, 0, 9.6), WALK_B = V(0.55, 0, 6.2);
const STAND_CHAIR = V(-0.05, 0, 4.35);
const WATER_A = V(1.2, 0, 3.4), WATER_B = V(1.58, 0, 0.45); // beside the stick (behind it, its rag hid your eyes)
export const IN_SHACK = V(BEACH.shack.x + 0.1, 0.1, BEACH.shack.z - 0.55);
export const STOVE = V(BEACH.shack.x + 0.55, 1.19, BEACH.shack.z - 1.45);
const youAt = (F: number): Vector3 => {
  if (F < B.because) return WALK_A.clone().lerp(WALK_B, clamp01(F / B.because));
  if (F < B.but0 + 26) return STAND_CHAIR.clone();
  if (F < B.dont) return BEACH.seat.clone();
  if (F < B.push) return WATER_A.clone().lerp(WATER_B, clamp01((F - B.dont) / (B.push - 4 - B.dont)));
  if (F < B.then0) return WATER_B.clone();
  if (F < B.make) return IN_SHACK.clone();
  return BEACH.seat.clone();
};
const seated = (F: number) => (F >= B.but0 + 26 && F < B.dont) || F >= B.make;
const youState = (F: number): CharState => { const s: CharState = { heading: SEA, ...youStateRaw(F) }; return seated(F) ? { ...s, pose: { ...s.pose, sit: 1 } } : s; };
const youStateRaw = (F: number): CharState => {
  const seed = 3;
  if (F < B.because) {
    // Line 1: down the path toward the sea, back to the lens, the folded chair under your arm.
    const d = (F / B.because) * WALK_A.distanceTo(WALK_B);
    return st({ ...walkPose(d * 1.3, 1), arms: CARRY.arms }, F, seed, [[0, "determined"]], { heading: SEA });
  }
  if (F < B.but0 + 26) {
    // Line 4: one flick and the chair snaps open.
    const p = pose([[0, CARRY], [B.but0 + 4, FLICK], [B.but0 + 12, { ...POSES.hips }]], F);
    return st({ ...p, squash: reactSquash(F - (B.but0 + 6)) }, F, seed, [[0, "determined"], [B.but0 + 6, "smug"], [B.grandmas, "proud"]], { heading: SEA + 0.6 });
  }
  if (F < B.dont) {
    // Seated like a king: arms crossed; the doubter beat; Brad's jeer.
    const p = pose([[0, { ...POSES.crossed, sway: -4 }], [B.enjoy, { ...POSES.crossed, tilt: -9 }], [B.even, POSES.crossed]], F);
    return st(alive(p, F, seed, [0, 0.4, -0.3]), F, seed, [[0, "proud"], [B.tomorrow, "worried"], [B.buys, "determined"], [B.up0, "suspicious"], [B.guy, "deadpan"], [B.sister, "neutral"], [B.lost, "smirk"], [B.drown, "determined"]]);
  }
  if (F < B.push) {
    const d = ((F - B.dont) / FPS) * 1.3;
    return st({ ...walkPose(d, 1), arms: STICK_HOLD.arms }, F, seed, [[0, "determined"], [B.answer, "sneaky"]], { heading: SEA });
  }
  if (F < B.then0) {
    const p = pose([[0, STICK_HOLD], [B.push + 4, STICK_PUSH], [B.stick0 + 16, { ...POSES.hips }]], F);
    return st(p, F, seed, [[0, "determined"], [B.stick0 + 10, "scheming"], [B.water0, "smug"]], { heading: SEA });
  }
  if (F < B.make) {
    // Line 10: inside the shack, switching every light off.
    const flick = (k: number) => Math.max(0, 1 - Math.abs(F - k) / 5);
    const p = pose([[0, POSES.idle], [B.sw - 6, SWITCH], [B.shack1 + 8, { ...POSES.hips }]], F);
    return st({ ...p, squash: (flick(B.sw) + flick(B.every1 + 4) + flick(B.shack1 - 4)) * 0.3 }, F, seed, [[0, "sneaky"], [B.light, "scheming"], [B.shack1, "smug"]]);
  }
  if (F < B.ten) {
    // Line 11: the bucket in your lap, a kernel pops into your mouth; the sea pulls back; Brad screams.
    return st(alive(LAP, F, seed, [0, 0.3]), F, seed, [[0, "excited"], [B.popcorn + 14, "relieved"], [B.back0, "confused"], [B.tsunami, "neutral"]],
      { fx: { talk: F >= B.popcorn + 12 && F < B.popcorn + 22 ? { open: 0.7, shape: "o" } : undefined } });
  }
  if (F < B.next) {
    // The tension, the bump, the calm, the dark: you never move from the chair.
    return st(alive(LAP, F, seed, [0, -0.3, 0.3]), F, seed, [[0, "nervous"], [B.twenty, "worried"], [B.sand1, "determined"], [B.no, "relieved"], [B.boring, "deadpan"], [B.burns, "tired"], [B.quits, "relieved"], [B.third, "smug"], [B.darker, "suspicious"], [B.down1, "relieved"], [B.looks, "excited"], [B.explodes, "proud"]]);
  }
  // Line 22: the next night, smug in the chair, arms crossed.
  return st(alive({ ...POSES.crossed, sway: -5 }, F, seed, [0, 0.2]), F, seed, [[0, "proud"], [B.chair1 - 4, "smug"]]);
};
const YOU: Role = { name: "you", look: youLook, at: youAt, state: youState };
const YOU_SEATED: Role = { ...YOU, sit: true };

// ------------------------------------------------------------------ Mia
const MIA_AT = BEACH.mia;
const TUG: Pose = { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, { at: [-0.45, 0.2], grip: "fist" }], lean: 0.3, look: 0.6 };
const CLING: Pose = { ...POSES.idle, arms: [{ at: [0.15, 0.45], grip: "fist" }, { at: [-0.5, 0.0], grip: "fist" }], shrug: 14, bob: -10, look: 0.7 };
const miaState = (F: number): CharState => {
  const seed = 9;
  const talk = talkAt(MOUTH_T, F, [[B.were, B.drownEnd]]);
  if (F < B.dont) {
    const p = pose([[0, TUG], [B.were - 4, { ...POSES.panic, arms: [{ at: [0.3, 0.45], grip: "fist" }, POSES.panic.arms[1]] as Pose["arms"] }]], F);
    return st(p, F, seed, [[0, "worried"], [B.lost, "nervous"], [B.were, "scared"], [B.drown, "shocked"]], { fx: { talk, ringEyes: F >= B.were - 2, sweat: F >= B.were ? ((F - B.were) % 30) / 30 : undefined } });
  }
  if (F < B.see) {
    const p = pose([[0, TUG], [B.ten, CLING]], F);
    return st(p, F, seed, [[0, "worried"], [B.back0, "scared"], [B.tsunami, "shocked"], [B.twenty, "scared"], [B.sand1, "crying"]], { fx: { ringEyes: F >= B.tsunami && F < B.tsunami + 20, tears: F >= B.sand1 ? (F - B.sand1) / FPS : undefined } });
  }
  if (F < B.down1) {
    // Line 18 (time passing): she nods off against your chair while the lantern burns down, wakes on "darker".
    const ASLEEP: Pose = { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]], tilt: 16, look: 0.8, bob: -6, shrug: 8 };
    const p = pose([[0, TUG], [B.boring, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]] }], [B.burns, ASLEEP], [B.darker, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]] }]], F, 8);
    return st(alive(p, F, seed, [0.6, 0.2]), F, seed, [[0, "confused"], [B.boring, "relieved"], [B.burns, "tired"], [B.darker, "nervous"]], F >= B.burns + 10 && F < B.darker ? { blink: true } : {});
  }
  // Line 21: she looks up and her jaw drops.
  const p = pose([[0, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]] }], [B.looks, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, { at: [0.3, 0.6], grip: "open" }], tilt: -12 }]], F);
  return st(p, F, seed, [[0, "nervous"], [B.looks, "confused"], [B.explodes, "excited"]], { fx: { ringEyes: F >= B.explodes && F < B.explodes + 30, talk: F >= B.looks + 4 && F < B.looks + 26 ? { open: 0.9, shape: "o" } : undefined } });
};
const MIA: Role = { name: "mia", look: miaLook, at: () => MIA_AT.clone(), state: miaState };

// ------------------------------------------------------------------ Brad
export const BRAD_POS = BRAD_AT.clone();
const SELFIE: Pose = { ...POSES.idle, arms: [{ at: [0.62, 0.05], grip: "point" }, { at: [0.5, -0.62], grip: "fist" }], sway: 3 };
const MOCK: Pose = { ...POSES.idle, arms: [{ at: [0.7, 0.4], grip: "point" }, { at: [0.5, -0.62], grip: "fist" }], sway: -4, bob: 6 };
const SCREAM: Pose = { ...POSES.panic, arms: [{ at: [0.72, -0.6], grip: "open" }, { at: [0.5, -0.62], grip: "fist" }], bob: 14 };
const SWAT: Pose = { ...POSES.panic, arms: [{ at: [0.5, -0.9], grip: "open" }, { at: [0.5, -0.62], grip: "fist" }], bob: -6 };
const bradState = (F: number): CharState => {
  const seed = 21;
  const talk = talkAt(MOUTH_T, F, [[B.enjoy, B.guyEnd], [B.it0, B.tsunamiEnd]]);
  if (F < B.enjoy) {
    const p = pose([[0, { ...SELFIE, sway: 8, bob: 8 }], [B.live - 6, SELFIE]], F);
    return st(p, F, seed, [[0, "proud"], [B.n500, "smug"], [B.flood0, "grin"], [B.live, "excited"]]);
  }
  if (F < B.it0) {
    const p = pose([[0, MOCK], [B.guy - 4, { ...MOCK, sway: -9, bob: 10 }]], F);
    return st(p, F, seed, [[0, "laughing"], [B.guy, "smug"]], { fx: { talk } });
  }
  if (F < B.so) {
    const p = pose([[0, SCREAM]], F);
    return st({ ...p, squash: reactSquash(F - B.tsunami) }, F, seed, [[0, "scared"], [B.tsunami, "shocked"]], { fx: { talk, ringEyes: true, bang: F >= B.tsunami ? F - B.tsunami : undefined, sweat: ((F % 24) / 24) } });
  }
  // Lines 20: proud in his floodlights, then the moths find him.
  const p = pose([[0, SELFIE], [B.moth + 10, SWAT], [B.finds, { ...SWAT, sway: 10 }]], F);
  return st(p, F, seed, [[0, "proud"], [B.brightest, "smug"], [B.moth, "confused"], [B.moth + 20, "scared"], [B.finds, "disgusted"], [B.brad1, "crying"]],
    { fx: { tears: F >= B.brad1 ? (F - B.brad1) / FPS : undefined } });
};
const BRAD: Role = { name: "brad", look: bradLook, at: () => BRAD_POS.clone(), state: bradState };
/** The next night: Brad, still covered in moths, sneaks down with a chair. */
const BRAD_SNEAK_A = V(2.6, 0, 1.4), BRAD_SNEAK_B = V(1.8, 0, 0.1);
const BRAD_LATE: Role = {
  name: "brad", look: bradLook, at: (F) => BRAD_SNEAK_A.clone().lerp(BRAD_SNEAK_B, clamp01((F - B.next) / (B.chair1 - B.next))),
  state: (F) => st({ ...walkPose(((F - B.next) / FPS) * 0.9, 0.7), arms: CARRY.arms, shrug: 10 }, F, 21, [[0, "sneaky"], [B.bring, "nervous"]]),
};

// ------------------------------------------------------------------ the town (extras)
const look = (i: number, seed: number): Look => ({ ...EXTRAS[i % EXTRAS.length].look, seed });
/** Line 1: the town runs up the path toward the lens (and the hill), three of them carrying a fridge, a TV, a fish tank. */
type Runner = { start: Vector3; end: Vector3; carry?: "fridge" | "tv" | "tank" };
export const RUNNERS: Runner[] = [
  { start: V(-1.3, 0, 3.4), end: V(-2.3, 0, 11.6), carry: "fridge" },
  { start: V(1.6, 0, 2.4), end: V(2.1, 0, 11.8), carry: "tv" },
  { start: V(-2.0, 0, 1.8), end: V(-2.9, 0, 10.4) },
  { start: V(2.3, 0, 4.4), end: V(2.5, 0, 12.4), carry: "tank" },
  { start: V(-3.4, 0, 2.6), end: V(-4.7, 0, 10.0) },
  { start: V(1.3, 0, 0.9), end: V(1.7, 0, 10.0) },
  { start: V(-0.6, 0, 0.8), end: V(-1.1, 0, 9.0) },
  { start: V(-3.6, 0, 1.2), end: V(-3.8, 0, 8.6) },
  { start: V(0.4, 0, 0.7), end: V(-0.2, 0, 5.0) },
];
const HOLD_UP: Pose = { ...POSES.panic, arms: [{ at: [0.25, -0.75], grip: "open" }, { at: [0.25, -0.75], grip: "open" }] };
const runnerAt = (r: Runner) => (F: number) => r.start.clone().lerp(r.end, clamp01(F / B.n4000));
const RUNNER_ROLES: Role[] = RUNNERS.map((r, i) => ({
  name: `runner${i}`, look: look(i, 200 + i), at: runnerAt(r),
  state: (F: number) => {
    const d = (F / B.n4000) * r.start.distanceTo(r.end);
    const p = runPose(d * 1.1 + i * 0.37);
    return st(r.carry ? { ...p, arms: HOLD_UP.arms } : p, F, 200 + i, [[0, i % 2 ? "scared" : "shocked"]], { fx: { sweat: ((F + i * 7) % 26) / 26 } }, 0.5);
  },
}));
/** Line 3: three of them on the hill road holding their phones up at the lens. */
// On the hill itself (y = hillY): at y 0 they stood on the beach's sand plane 3 m under the slope, and from their lens the
// hill (seen from below) vanished, so its houses floated (user 2026-11-21: 0:06 and 1:13).
const PHONE_AT = [V(-0.85, 0, 0), V(0, 0, 0.45), V(0.85, 0, 0.1)].map((p) => p.add(V(-2, 0, 26))).map((p) => p.setY(hillY(p.x, p.z)));
const ON_HILL = { "Feet on the ground": "on the hill mesh (2 m grid): within 4 cm of the smooth hill they stand on", Shadows: "contact blobs on the 2 m hill grid" };
const PHONE_UP: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.3, -0.2], grip: "fist" }] };
const PHONERS: Role[] = PHONE_AT.map((p, i) => ({
  name: `phone${i}`, look: look(i + 3, 230 + i), at: () => p.clone(),
  state: (F: number) => st(alive(PHONE_UP, F, 230 + i, [0, 0.3]), F, 230 + i, [[0, "worried"], [B.giant, "scared"], [B.wave0, "shocked"]], { fx: { ringEyes: F >= B.wave0 } }, 0.6),
}));
/** Line 21 ("Up there, nobody sees a thing"): the same three on the hill road, blinded by the floodlights and the moth
 * storm: one hand shading the eyes, squinting. */
const SHADE: Pose = { ...POSES.idle, arms: [{ at: [0.05, -0.95], grip: "open", layer: "front" }, { at: [0.3, -0.2], grip: "fist" }], tilt: 6, bob: -4 };
const BLINDED: Role[] = PHONE_AT.map((p, i) => ({
  name: `phone${i}`, look: look(i + 3, 230 + i), at: () => p.clone(),
  state: (F: number) => st(alive(SHADE, F, 240 + i, [0, 0.4]), F, 240 + i, [[0, "suspicious"], [B.nobody, i === 1 ? "angry" : "confused"]], { fx: { sweat: ((F + i * 9) % 30) / 30 } }, 0.6),
}));
/** Line 22: the town back on the beach with lawn chairs. */
export const CROWD_SPOTS: Vector3[] = Array.from({ length: 77 }, (_, i) => {
  const r = i % 7, c = Math.floor(i / 7);
  const x = -16 + c * 2.9 + (r % 2) * 1.4, z = -2.6 + r * 1.2;
  return V(x, 0, z);
}).filter((p) => p.z < 5.0 && p.distanceTo(BEACH.chair) > 2.2 && p.distanceTo(BEACH.mia) > 1.6 && Math.abs(p.x - BEACH.pierX) > 2 && p.distanceTo(V(-7.6, 0, 1.6)) > 2.4 && p.distanceTo(V(-5.2, 0, 5.4)) > 1.8 && p.distanceTo(V(-6.0, 0, 0.9)) > 1 && new Line3(BRAD_SNEAK_A, BRAD_SNEAK_B).closestPointToPoint(p, true, new Vector3()).distanceTo(p) > 1.2 && p.distanceTo(V(2.2, 0, 0.75)) > 1.0);
const CROWD: Role[] = [...CROWD_SPOTS].sort((a, b) => Math.abs(a.x - 0.6) + a.z * 0.5 - (Math.abs(b.x - 0.6) + b.z * 0.5)).slice(0, 22).map((p, i) => ({
  name: `town${i}`, sit: true, look: look(i, 260 + i), at: () => seatIn(CROWD_SPOTS, CROWD_SPOTS.indexOf(p)),
  state: (F: number) => st(alive({ ...posed(i % 3 ? "idle" : "crossed", (F + i * 9) / FPS, i % 2 ? -0.4 : 0.4), sit: 1 }, F, 260 + i, [0.3, -0.2]), F, 260 + i, [[0, i % 2 ? "excited" : "grin"]], {}, 0.5),
}));

/** Line 1: the town climbing the hill path, each one a little stickman with a flashlight whose beam reaches up the
 * path ahead (user 2026-11-18: the glow blobs did not read as people). `down`: the next night, coming back down. */
const PATH_SPEED = 0.0011; // path t per frame
const hillWalkers = (n: number, t0: number, t1: number, down = false, seed = 300, from = 0): Role[] => Array.from({ length: n }, (_, i) => {
  // Four lanes 0.6 m apart, ordered so path neighbours never share one (QA: bodies >= 0.5 m apart, 30 walkers ~1 m apart in z).
  const ti = t0 + (i / n) * (t1 - t0), side = [-0.1, 0.5, 1.1, 1.7][(i * 3) % 4]; // east of house 6 (-4, 30)
  const tAt = (F: number) => ti + (down ? -1 : 1) * (F - from) * PATH_SPEED;
  const at = (F: number) => { const p = pathAt(tAt(F)).add(V(side, 0, 0)); return p.setY(hillY(p.x, p.z)); };
  const heading = (F: number) => { const d = pathAt(tAt(F) + (down ? -0.01 : 0.01)).sub(pathAt(tAt(F))); return Math.atan2(d.x, d.z); };
  return { name: `hill${seed + i}`, look: look(i + 2, seed + i), at, state: (F: number) => st({ ...walkPose(F / 22 + i, 0.8) }, F, seed + i, [[0, down ? "excited" : "scared"]], { prop: "flashlight", heading: heading(F) }, 0.4) };
});
const HILL_WALKERS = hillWalkers(30, 0.47, 0.95); // from t .47: lower on the path they sit in the caption band (A2 projection)
const DOWN_WALKERS = hillWalkers(8, 0.1, 0.38, true, 340, B.next);
/** Each walker's flashlight spot (composition frame F): 0.6 m ahead of them at hand height, so every glow has a person. */
export const walkerBeams = (down: boolean) => (down ? DOWN_WALKERS : HILL_WALKERS).map((r) => (F: number) => {
  const h = r.state(F).heading ?? 0;
  return r.at(F).add(V(Math.sin(h) * 0.6, 0.75, Math.cos(h) * 0.6));
});

// ------------------------------------------------------------------ shots
export type World = "beach" | "dark" | "bedroom";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World; moon?: boolean; preset?: "dusk" };
export const WORLDS: Record<World, { light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  beach: { light: "night", scene: "beach night", sun: V(0.25, 0.55, -0.8).normalize() },
  dark: { light: "night", scene: "beach dark", sun: V(0.25, 0.55, -0.8).normalize() },
  bedroom: { light: "interior", scene: "bedroom", sun: V(0.3, 0.9, 0.3).normalize() },
};
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: typeof r.look === "function" ? r.look(from) : r.look, lookAt: typeof r.look === "function" ? r.look : undefined, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Card penetration": "seated: the card stands at the chair's front edge, its lap over the seat", "Moving props": "seated: the lawn chair holds the seated card (its back passes behind the head)" };
let cursor = 0;
const shot = (id: string, to: number, w: World, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof }): S => {
  const from = cursor;
  cursor = to;
  const { dof, ...rest } = o;
  return {
    id: `moon/${id}`, from, frames: to - from, w, scene: WORLDS[w].scene, light: WORLDS[w].light, sun: WORLDS[w].sun,
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: "you",
    allow: roles.some((r) => r.sit) ? SEATED : undefined, ...rest,
  };
};
const close = (d: number) => DOF.closeup(d), mid = (d: number) => DOF.medium(d);
const NONE: Dof = { maxPx: 0, near: 40, far: 80 };
/** A framing that creeps from `a` to `b` (push ~10 %). */
const creep = (f0: { pos: Vector3; look: Vector3; fov: number }, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.3) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const SEAT_HEAD = headHeight(youLook, { ...REST, sit: 1 });
const seatFrame = (from: Vector3, size: "cu" | "mcu" | "ms", side = 0) => {
  const f = frameOn(BEACH.seat.clone().setY(0), from, size, { head: SEAT_HEAD + 0.05, side });
  return f;
};
/** Over-the-shoulder cameras were set for the old sunk card (head 1.01 m, z 4.25): follow the real seated head. */
const SEAT_SHIFT = V(0, SEAT_HEAD - 1.01, BEACH.seat.z - 4.25);
const SEA_SIDE = V(0.6, 0, -6); // a point on the sea side of the chair (lens looking at you and the shack)
/** You in the chair and Mia beside you, from the sea side: both heads in, creeping in. */
const twoShot = (F: number, a: number, b: number, dist = 3.2, dx = 0) => {
  const mid0 = BEACH.seat.clone().add(MIA_AT).multiplyScalar(0.5).setY(0);
  const t = span(F, a, b);
  return P(mid0.clone().add(V(dx - 0.25 + 0.2 * t, 0.92, -dist + 0.35 * t)), mid0.clone().add(V(dx, 0.82, 0)), 50);
};

// --- line 1: the cold open at dusk (the moon is already a hole in the sky) and the river of flashlights
const DUSK = { preset: "dusk" as const };
const A1 = shot("A1-down-to-the-sea", B.n4000, "beach", [YOU, ...RUNNER_ROLES], (F) => P(V(0.5, 1.5, 14.6).lerp(V(0.5, 1.42, 13.9), span(F, 0, B.n4000)), V(0.5, 1.7, -2), 50), { ...DUSK, wide: true, dof: () => NONE, subjectFrom: 0, allow: { "Cast overlap": "the town runs past the lens on both sides of you; the gag is the crowd going the other way" } });
const A2 = shot("A2-flashlight-river", B.because, "beach", HILL_WALKERS, (F) => P(V(4.5, 7.0, 4.8).lerp(V(4.8, 7.4, 5.2), span(F, B.n4000, B.because)), V(-1.5, 8.9 + 0.3 * span(F, B.n4000, B.because), 34), 50) /* high over the SANDY COVE sign (fully below the frame): the whole path up the hill, clear of house 6 */, { ...DUSK, subject: undefined, wide: true, dof: () => NONE, allow: { "Cast overlap": "far walkers on the hill path (heads ~1 % of the frame) cross in front of each other", "Feet on the ground": "walkers on the far hill mesh (2 m grid): within 4 cm of the smooth hill they stand on", Shadows: "far hill walkers: contact blobs on the 2 m hill grid" } });
// --- line 2: the moon switched off: the dog on the pier howls at the empty outline, then looks at the lens on "off"
const DOG_CAM = PIER_END.clone().add(V(0.6, 0.55, 3.2));
const B1 = shot("B1-dog-howls-at-nothing", B.and0, "beach", [], (F) => {
  const t = span(F, B.because, B.and0); // the whole shot: a 26-frame tilt ran 37 px/f (layer 1)
  return P(DOG_CAM.clone(), PIER_END.clone().add(V(0, 0.9, 0)).lerp(PIER_END.clone().add(V(-6, 14, -40)), t * 0.36), 50);
}, { ...DUSK, subject: undefined, wide: true, dof: () => NONE });
// --- line 2b: every phone says the same thing
const PH_MID = PHONE_AT[1];
const C1 = shot("C1-phones", B.wave0 - 14, "beach", PHONERS, (F) => {
  const f0 = frameOn(PH_MID, PH_MID.clone().add(V(0.2, 0, -5)), "fs", { fov: 44 });
  return creep({ ...f0, look: f0.look.clone().add(V(0, 0.35, 0)) }, F, B.and0, B.wave0 - 14, 0.18);
}, { ...DUSK, subject: "phone1", dof: () => mid(3.2), allow: ON_HILL });
const C2 = shot("C2-alert", B.but0, "beach", [PHONERS[1]], (F) => {
  const scr = phoneScreen(1, B.wave0);
  return P(scr.clone().add(V(0.05, 0.02, -0.56)).lerp(scr.clone().add(V(0.04, 0.01, -0.46)), span(F, B.wave0 - 14, B.but0)), scr.clone(), 40);
}, { ...DUSK, subject: undefined, dof: () => close(0.5), allow: { "Caption vs face": "insert on the phone screen held up in front of his face (soft behind it)" } });
// --- line 3: Grandma's snack shack
const D1 = shot("D1-flick-open", B.but0 + 26, "beach", [YOU], (F) => {
  const f0 = frameOn(STAND_CHAIR, STAND_CHAIR.clone().add(V(-0.6, 0, -5)), "ms", { side: -0.3 });
  return creep(f0, F, B.but0, B.but0 + 26, 0.08);
}, { ...DUSK, dof: () => mid(2.6) });
const D2 = shot("D2-king-of-the-shack", B.it4, "beach", [YOU_SEATED], (F) => {
  const f0 = seatFrame(SEA_SIDE.clone().add(V(-1.4, 0, 0)), "ms");
  return P(f0.pos.clone().setY(0.55).lerp(f0.pos.clone().setY(0.6).add(V(0.15, 0, 0.7)), span(F, B.but0 + 26, B.it4)), f0.look.clone().add(V(0, 0.25, 0)), 44);
}, { ...DUSK, dof: () => mid(3.0) });
// The chair-snap speed lines (Video.tsx Sequence at CHAIR_OPEN - 2, 12 f) are a planned flash (pixel QA LIGHTJUMP f283).
D1.flash = [[B.but0 + 5 - D1.from!, B.but0 + 19 - D1.from!]]; // CHAIR_OPEN = but0 + 8 (declared below)
// --- line 4: the shack is dying (a cobweb on the last hot dog) and Brad buys it tomorrow (the sign on the door)
const DG1 = shot("DG1-cobweb-hot-dog", B.brad0, "beach", [], (F) => P(STOVE.clone().add(V(-0.3, 0.26, -0.55)).lerp(STOVE.clone().add(V(-0.24, 0.22, -0.44)), span(F, B.it4, B.brad0)), STOVE.clone().add(V(0, 0.06, 0)), 42), { ...DUSK, subject: undefined, dof: () => close(0.6) });
// Square on and looking a little below the notice, so it sits whole above the caption band (layer 1: cut at the edge).
const DG2 = shot("DG2-sold-to-brad", B.up0, "beach", [], (F) => P(SOLD_SIGN.clone().add(V(0, -0.25, -2.45)).lerp(SOLD_SIGN.clone().add(V(0, -0.24, -2.25)), span(F, B.brad0, B.up0)), SOLD_SIGN.clone().add(V(0, -0.27, 0)), 46), { ...DUSK, subject: undefined, dof: () => mid(2.3) });
// --- line 5: Brad on the hill
const BRAD_HEAD = 1.72;
const brad = (from: Vector3, spanM: number) => telephoto(from, BRAD_POS, BRAD_HEAD, spanM);
const BRAD_LENS = BRAD_POS.clone().add(V(1.6, -0.6, -9.5));
const E1 = shot("E1-brad-crane", B.n500, "beach", [BRAD], (F) => {
  const t = span(F, B.up0 - 16, B.n500 + 4); // R26 timing: the crane over 25 f ran 28 px/f (the tilt sets the speed)
  const low = BRAD_POS.clone().add(V(0.3, -1.6, 0)), hi = BRAD_POS.clone().add(V(0, 1.1, 0));
  return P(BRAD_LENS.clone().add(V(0, 1.05 * t, 0)), low.lerp(hi, t), 40);
}, { ...DUSK, subject: "brad", subjectFrom: 18, wide: true, dof: () => NONE });
const E2 = shot("E2-sandbags-floodlights", B.live - 6, "beach", [BRAD], (F) => {
  const t = span(F, B.n500, B.live);
  return P(BRAD_POS.clone().add(V(-1.4, -1.9, -9.6)).lerp(BRAD_POS.clone().add(V(-0.8, -1.8, -9.0)), t), BRAD_POS.clone().add(V(0.2, 1.6, 0)), 50);
}, { ...DUSK, subject: "brad", wide: true, dof: () => NONE });
const E3 = shot("E3-live-stream", B.enjoy, "beach", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(0.6, 1.5, 2.2)), 1.9); return creep(b, F, B.live - 6, B.enjoy, 0.08); }, { ...DUSK, subject: "brad", dof: () => mid(3.3) });
// --- line 6: "Enjoy the wave, chair guy!"
const F1 = shot("F1-brad-mocks", B.even, "beach", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(-0.5, 1.4, 2.1)), 1.6); return creep(b, F, B.enjoy, B.even, 0.12, 0, 0.1); }, { ...DUSK, subject: "brad", dof: () => close(3.0) });
// --- lines 7-8: Mia (night has fallen: the sky tells the time)
const G1 = shot("G1-mia-tugs", B.were, "beach", [YOU_SEATED, MIA], (F) => twoShot(F, B.even, B.were, 3.2, -0.15), { subject: "mia", dof: () => mid(3.0) });
const G2 = shot("G2-we-re-gonna-drown", B.dont, "beach", [MIA], (F) => {
  const f0 = frameOn(MIA_AT, MIA_AT.clone().add(V(-0.9, 0, -4)), "cu", { head: 1.3, height: 0.95 });
  return creep(f0, F, B.were, B.dont, 0.14, 0, 0.1);
}, { subject: "mia", dof: () => close(1.6) });
// --- line 9: Grandma's tide stick at the water
const H1 = shot("H1-walk-to-water", B.push, "beach", [YOU], (F) => {
  const at = youAt(F);
  const f0 = frameOn(at, at.clone().add(V(0.8, 0, -5)), "ms", { fov: 44 });
  return P(f0.pos, f0.look, f0.fov);
}, { dof: () => mid(2.6) });
const H2 = shot("H2-stick-push", B.stick0 + 8, "beach", [YOU], (F) => P(BEACH.stick.clone().add(V(0.7, 0.85, -2.7)).lerp(BEACH.stick.clone().add(V(0.62, 0.8, -2.4)), span(F, B.push, B.then0)), BEACH.stick.clone().add(V(0.3, 0.62, 0.3)), 46), { dof: () => mid(2.7) });
const H3 = shot("H3-stick-sinks", B.then0, "beach", [], (F) => P(BEACH.stick.clone().add(V(0.42, 0.24, -1.0)).lerp(BEACH.stick.clone().add(V(0.36, 0.22, -0.85)), span(F, B.stick0 + 8, B.then0)), BEACH.stick.clone().add(V(0, 0.14, 0.05)), 44), { subject: undefined, dof: () => close(1.0) });
// --- line 10: the lights go off
const I1 = shot("I1-lights-off", B.make, "beach", [{ ...YOU, at: () => IN_SHACK.clone() }], (F) => creep(P(BEACH.hatch.clone().add(V(-0.2, 0.25, -2.4)), BEACH.hatch.clone().add(V(0, 0.22, 0)), 50), F, B.then0, B.make, 0.08), { dof: () => mid(2.6) });
// The lights going off are planned brightness changes (pixel QA LIGHTJUMP/POP, R25 f977 + f999): spans are shot frames.
I1.flash = [[B.sw + 1, B.sw + 3], [B.every1 + 5, B.every1 + 7], [B.shack1 - 7, B.shack1 + 5]].map(([a, b]) => [a - I1.from!, b - I1.from!] as [number, number]);
// --- line 11: popcorn
const J1 = shot("J1-popping", B.popcorn + 8, "beach", [], (F) => P(STOVE.clone().add(V(-0.35, 0.32, -0.62)).lerp(STOVE.clone().add(V(-0.3, 0.28, -0.52)), span(F, B.make, B.popcorn + 8)), STOVE.clone().add(V(0, 0.05, 0)), 44), { subject: undefined, dof: () => close(0.75) });
const J2 = shot("J2-kernel-in-mouth", B.then1, "beach", [YOU_SEATED], (F) => { const f0 = seatFrame(SEA_SIDE.clone().add(V(0.6, 0, 0)), "mcu"); return creep(f0, F, B.popcorn + 8, B.then1, 0.06); }, { dof: () => close(1.8) });
// --- line 12-13: the sea pulls back; Brad screams
const K1 = shot("K1-sea-pulls-back", B.it0, "beach", [], (F) => {
  const t = span(F, B.then1, B.it0);
  return P(BEACH.stick.clone().add(V(0.9, 0.7, 2.2)), BEACH.stick.clone().add(V(-0.3, 0.3, -2.5 - 2.5 * t)), 48);
}, { subject: undefined, wide: true, dof: () => NONE });
const K2 = shot("K2-tsunami", B.ten, "beach", [BRAD], (F) => impact((f) => { const b = brad(BRAD_POS.clone().add(V(0.4, 1.3, 2.0)), 1.75); return creep(b, f, B.it0, B.ten, 0.1); }, B.tsunami + 1, 0.03, 7)(F), { subject: "brad", kicks: [[B.tsunami + 1 - B.it0, B.tsunami + 8 - B.it0]], dof: () => close(2.8) });
// --- line 14: ten steps, twenty, thirty
const L1 = shot("L1-ten", B.twenty, "beach", [], (F) => P(BEACH.stick.clone().add(V(0.15, 0.75, 1.9)).lerp(BEACH.stick.clone().add(V(0.45, 0.95, 2.5)), span(F, B.ten, B.twenty)), BEACH.stick.clone().add(V(-0.2, 0.25, -4)), 46), { subject: undefined, wide: true, dof: () => NONE });
const L2 = shot("L2-twenty", B.thirty, "beach", [YOU_SEATED, MIA], (F) => P(V(1.1, 2.3, 6.5).lerp(V(1.3, 2.5, 6.9), span(F, B.twenty, B.thirty)).add(SEAT_SHIFT).add(V(0, 0.08, 0)), V(0.5, 0.3, -6), 50), { subject: undefined, wide: true, dof: () => NONE });
const L3 = shot("L3-thirty", B.stick1 - 4, "beach", [YOU_SEATED, MIA], (F) => P(V(3.0, 9.0, 9.5).lerp(V(2.4, 10.4, 10.6), span(F, B.thirty, B.stick1)), V(0.4, 0, -6), 50), { subject: undefined, wide: true, dof: () => NONE });
const L4 = shot("L4-dry-sand", B.see, "beach", [YOU_SEATED, MIA], (F) => twoShot(F, B.stick1 - 4, B.see, 3.1, 0.1), { dof: () => mid(2.7) });
// --- lines 15-16: the bedsheet
const BED_TOP = V(0, BED.sheetY, 0);
const M1 = shot("M1-bedsheet-lifts", B.letgo, "bedroom", [], (F) => P(V(0.9, 1.75, 3.1).lerp(V(0.7, 1.6, 2.5), span(F, B.see, B.letgo)), BED_TOP.clone().add(V(0, 0.45, 0)), 46), { subject: undefined, dof: () => NONE });
const M2 = shot("M2-sheet-settles", B.settles - 4, "bedroom", [], (F) => P(V(-0.6, 1.4, 2.2).lerp(V(-0.5, 1.15, 1.9), span(F, B.letgo, B.no)), BED_TOP.clone().add(V(0, 0.2 - 0.12 * span(F, B.letgo, B.settles + 10), 0)), 44), { subject: undefined, dof: () => NONE });
// --- line 17: no wave, a boring tide
const N1 = shot("N1-calm-bay", B.boring - 22, "beach", [YOU_SEATED, MIA], (F) => P(V(0.45, 2.7, 7.6).lerp(V(0.3, 2.5, 6.7), span(F, B.settles - 4, B.boring)).add(SEAT_SHIFT), V(0.1, 1.2, -5), 50), { subject: undefined, wide: true, dof: () => NONE });
const N2 = shot("N2-tiny-wave", B.when - 6, "beach", [], (F) => { const z = tide(F).z, t = span(F, B.boring - 22, B.when - 6); return P(V(1.4 - 0.5 * t, 0.32, z + 1.6 - 0.3 * t), V(0.4, 0.05, z - 0.4), 46); }, { subject: undefined, dof: () => close(1.8) });
// --- line 18: time passes in the world (no card): the lantern burns down, Mia nods off, the tide crawls back and quits
// The lantern low in the foreground, you and Mia (nodding off) behind it: the chair filled a close lens (preflight sheet).
const O0 = shot("O0-lantern-burns", B.water1 - 2, "beach", [YOU_SEATED, MIA], (F) => P(V(2.3, 0.6, 0.6).lerp(V(2.2, 0.58, 0.95), span(F, B.when - 6, B.water1)), V(0.3, 0.5, 4.0), 54), { subject: "mia", dof: () => mid(3.3) });
const O1 = shot("O1-a-third", B.third - 4, "beach", [], (F) => P(BEACH.stick.clone().add(V(0.4, 2.6, 2.6)).lerp(BEACH.stick.clone().add(V(0.35, 2.75, 2.3)), span(F, B.water1, B.third)), BEACH.stick.clone().add(V(-0.3, -0.4, -6)), 50), { subject: undefined, wide: true, dof: () => NONE });
const O2 = shot("O2-stick-and-you", B.but1, "beach", [YOU_SEATED, MIA], (F) => P(BEACH.stick.clone().add(V(-0.15, 0.6, -2.2)).lerp(BEACH.stick.clone().add(V(-0.12, 0.65, -1.9)), span(F, B.third - 4, B.but1)), V(0.6, 0.85, 4.2), 40), { subject: undefined, wide: true, dof: () => NONE });
// --- line 19: the world's biggest nightlight
const P1 = shot("P1-pull-out", B.without, "beach", [YOU_SEATED, MIA], (F) => {
  const t = span(F, B.but1 - 10, B.without);
  return P(V(0.4, 3.4, -3.5).lerp(V(-2, 6.5, -24), t), V(0.4, -0.2, 4.2).lerp(V(-2, 7, 30), t), 46);
}, { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Caption vs face": "the pull-out leaves you two as specks under the caption (heads < 3 % of the frame)" } });
const P2 = shot("P2-nightlight-wide", B.darker, "dark", [YOU_SEATED, MIA], (F) => P(V(-2, 6.5, -24).lerp(V(-1.4, 6.0, -21), span(F, B.without, B.darker)), V(-2, 7, 30), 46), { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Caption vs face": "the widest shot: you two are specks under the caption" } });
const Q1 = shot("Q1-darker", B.brightest, "dark", [YOU_SEATED, MIA], (F) => P(V(-1.4, 6.0, -21).lerp(V(-4, 9, -12), span(F, B.darker, B.brightest)), V(-6, 12, 40), 46), { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Caption vs face": "the widest shot: you two are specks under the caption" } });
// --- line 20: every moth finds Brad
const Q2 = shot("Q2-moths-arrive", B.moth + 6, "dark", [BRAD], (F) => { return creep(P(BRAD_POS.clone().add(V(0.9, -1.4, -4.6)), BRAD_POS.clone().add(V(0, 1.3, 0)), 50), F, B.brightest, B.moth + 6, 0.12); }, { subject: "brad", dof: () => NONE });
const Q3 = shot("Q3-finds-brad", B.up2, "dark", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(-0.5, 1.4, 2.1)), 1.7); return creep(b, F, B.moth + 6, B.up2, 0.12); }, { subject: "brad", dof: () => close(2.9) });
// --- line 21: up on the hill nobody sees a thing; on your dark beach the sky explodes
const T1 = shot("T1-nobody-sees", B.down1, "dark", BLINDED, (F) => {
  const f0 = frameOn(PH_MID, PH_MID.clone().add(V(0.2, 0, -5)), "fs", { fov: 44 });
  return creep({ ...f0, look: f0.look.clone().add(V(0, 0.35, 0)) }, F, B.up2, B.down1, 0.14);
}, { subject: "phone1", dof: () => mid(3.2), allow: ON_HILL });
const R1 = shot("R1-mia-looks-up", B.explodes, "dark", [YOU_SEATED, MIA], (F) => twoShot(F, B.down1, B.explodes, 3.0, -0.18), { subject: "mia", dof: () => mid(2.8) });
const R2 = shot("R2-milky-way", B.next, "dark", [YOU_SEATED, MIA], (F) => {
  const t = span(F, B.explodes, B.next - 4);
  return P(V(0.5, 0.9, 6.0).lerp(V(0.4, 0.85, 6.3), t).add(SEAT_SHIFT), V(0.2, 7.2, -6).lerp(V(0.1, 8.8, -6), t), 52);
}, { subject: undefined, wide: true, dof: () => NONE });
// --- line 22: the next night (mirror of the opening: the town comes DOWN to the sea, toward the lens), to the popcorn
const S1 = shot("S1-lawn-chairs", B.straight, "dark", [YOU_SEATED, MIA, BRAD_LATE, ...CROWD, ...DOWN_WALKERS], (F) => P(V(0.6, 1.6, -9.0).lerp(V(0.95, 1.5, -7.3), span(F, B.next, B.straight)), V(2.8, 1.2, 6), 52) /* a real push: 100 f at the old 1 m creep read as a hold */, { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Cast overlap": "a beach packed with the town: heads stack into the distance (the gag is how many came)", "Feet on the ground": "brad: the ground ray starts inside the folded chair under his arm (his soles are on the sand)", Shadows: "brad: the same ray hits the folded chair he carries" } });
const S2 = shot("S2-smug", FRAMES, "dark", [YOU_SEATED, MIA], (F) => { const f0 = seatFrame(SEA_SIDE.clone().add(V(0.3, 0, 0)), "cu"); return creep(f0, F, B.straight, FRAMES, 0.06, 0, 0.08); }, { dof: () => mid(1.5) });

// ------------------------------------------------------------------ R26 look test (MoonLookTest composition)
/** One story moment per still with its own camera (no QA plan: render with stills.mjs --draft). Framed to the R26
 * reference rules: heads <= ~30 % of the frame width, the set deep behind, a practical pool on the ground. */
const lookShot = (id: string, F: number, w: World, roles: Role[], cam: CamPose, dof: Dof, o: Partial<S> = {}): S => ({
  id: `look/${id}`, from: F, frames: 1, w, scene: WORLDS[w].scene, light: WORLDS[w].light, sun: WORLDS[w].sun,
  pose: () => cam, cast: castIn(F, roles), dof: () => dof, subject: "you", ...o,
});
export const LOOK_SHOTS: S[] = [
  lookShot("dusk-open", 30, "beach", [YOU, ...RUNNER_ROLES], P(V(0.5, 1.45, 14.2), V(0.5, 1.9, -2), 50), NONE, { preset: "dusk" }),
  lookShot("shack-two-shot", B.were, "beach", [YOU_SEATED, MIA], P(V(-0.15, 1.2, -0.6), V(0.85, 1.0, 5.2), 42), mid(4.5)),
  lookShot("brad-fortress", B.live, "beach", [BRAD], P(BRAD_POS.clone().add(V(3.2, 0.9, -8.5)), BRAD_POS.clone().add(V(0, 1.1, 0)), 38), mid(9.0)),
  lookShot("darkest-night", B.next - 30, "dark", [YOU_SEATED, MIA], P(V(0.9, 0.9, 7.2), V(0.4, 4.5, -20), 62), NONE),
];

export const SHOTS: S[] = [A1, A2, B1, C1, C2, D1, D2, DG1, DG2, E1, E2, E3, F1, G1, G2, H1, H2, H3, I1, J1, J2, K1, K2, L1, L2, L3, L4, M1, M2, N1, N2, O0, O1, O2, P1, P2, Q1, Q2, Q3, T1, R1, R2, S1, S2];
/** Dissolves: into and out of the bedroom (time and place change for the analogy). */
export const XFADE = [B.see, B.settles - 4];
/** Dissolve length (frames): Video.tsx extends the outgoing shot by this much. */
export const XF = 10;
// No stamp cards (user 2026-11-21): time passing is shown in the world (lantern, tide line, sky).
export const PLAN: Plan = { slug: "moon-disappeared-tonight", shots: SHOTS, words, xfades: XFADE.map((f) => [f, f + XF]) };

// ------------------------------------------------------------------ story props (same pose for render and QA)
const lensOf = (s: S, F: number) => s.pose(F - s.from).pos;
/** Where phone i's screen is at frame F (held up in the right hand). */
const phonePos = (i: number, F: number, lens: Vector3) => handWorld(PHONERS[i].look as Look, PHONERS[i].state(F).pose, PHONE_AT[i], lens, "right", 0.08);
const LENS_C1 = V(0, 1.4, 21).add(V(0, PHONE_AT[1].y, 0)); // C1's lens height above the hill crowd
export const phoneScreen = (i: number, F: number) => phonePos(i, F, LENS_C1).add(V(0, 0.085, 0));
/** Seen from behind (|view yaw| > 100 deg), your body hides what your hands hold in front of you. */
const youBehind = (s: S, F: number) => Math.abs(viewYaw(youState(F).heading ?? 0, youAt(F), lensOf(s, F))) > 100;
const youHand = (s: S, F: number, hand: "left" | "right" | "both") => handWorld(youLook, youState(F).pose, youAt(F), lensOf(s, F), hand, 0.06, youState(F).heading);
const miaHand = (s: S, F: number) => handWorld(miaLook, miaState(F).pose, MIA_AT, lensOf(s, F), "left", 0.05);
const bradHand = (s: S, F: number) => handWorld(bradLook, bradState(F).pose, BRAD_POS, lensOf(s, F), "right", 0.05);
export const CHAIR_OPEN = B.but0 + 8;
export const propsFor = (s: S): MovingProp[] => {
  if (s.w === "bedroom") return [];
  const names = new Set(s.cast?.map((c) => c.name));
  const out: MovingProp[] = [];
  out.push({ name: "stick", make: stick, pose: (o, F) => { if (F < B.push + 10) return false; o.position.copy(BEACH.stick).add(V(0, STICK_GRIP - 0.12 - 0.3 * clamp01((F - (B.stick0 + 6)) / 22), 0)); return true; }, heldBy: "you", hand: "none" });
  out.push({ name: "chair", make: lawnChair, pose: (o, F) => { if (F < CHAIR_OPEN) return false; o.position.copy(BEACH.chair); o.rotation.set(0, 0, 0); return true; }, heldBy: "you", hand: "none" });
  if (names.has("you")) {
    out.push({ name: "folded", make: foldedChair, pose: (o, F) => { if (F >= CHAIR_OPEN || F >= B.because && F < B.but0) return false; o.position.copy(youHand(s, F, "right")); o.rotation.set(0, youState(F).heading ?? 0, 0); return true; }, heldBy: "you", hand: "right" });
    out.push({ name: "stickHeld", make: stick, pose: (o, F) => {
      if (F < B.dont || F >= B.push + 10) return false;
      o.position.copy(youHand(s, F, "right"));
      o.rotation.set(0, 0, (Math.PI / 2) * (1 - clamp01((F - (B.push - 8)) / 10))); // carried level, stood up to push
      return true;
    }, heldBy: "you", hand: "right" });
    out.push({ name: "bucket", make: popcornBucket, pose: (o, F) => { if (F < B.popcorn + 8 || F >= B.next || youBehind(s, F)) return false; o.position.copy(youHand(s, F, "both")); return true; }, heldBy: "you", hand: "both" });
    out.push({ name: "kernel", make: kernel, pose: (o, F) => {
      const k = F - (B.popcorn + 2);
      if (k < 0 || k > 12) return false;
      const head = youAt(F).clone().add(V(0, SEAT_HEAD - 0.18, 0));
      o.position.copy(toss(youHand(s, B.popcorn + 2, "both").add(V(0, 0.2, 0)), head, k, { air: 12, height: 0.35 }).pos);
      return true;
    }, heldBy: "you", hand: "none" });
  }
  if (s.id === "moon/DG1-cobweb-hot-dog") out.push({ name: "hotdog", make: cobwebDog, pose: (o) => { o.position.copy(STOVE); return true; }, touches: ["shack"] });
  if (s.id === "moon/R1-mia-looks-up") out.push({ name: "miaKernel", make: kernel, pose: (o, F) => {
    const k = F - (B.looks + 6);
    if (k < 0 || k > 14) return false;
    o.position.copy(toss(youHand(s, B.looks + 6, "both").add(V(0, 0.2, 0)), MIA_AT.clone().add(V(0, 0.98, 0)), k, { air: 14, height: 0.4 }).pos);
    return true;
  } });
  if (names.has("mia")) out.push({ name: "fish", make: fishBag, pose: (o, F) => { o.position.copy(miaHand(s, F)); return true; }, heldBy: "mia", hand: "left" });
  if (names.has("brad") && s.id !== "moon/S1-lawn-chairs") out.push({ name: "selfie", make: selfieStick, pose: (o, F) => { o.position.copy(bradHand(s, F)); o.rotation.set(0, 0.2, 0.15); return true; }, heldBy: "brad", hand: "right" });
  if (s.id === "moon/S1-lawn-chairs") out.push({ name: "bradChair", make: foldedChair, pose: (o, F) => { o.position.copy(handWorld(bradLook, BRAD_LATE.state(F).pose, BRAD_LATE.at(F), lensOf(s, F), "right", 0.05)); return true; }, heldBy: "brad", hand: "right" });
  const holders = s.id.startsWith("moon/T1") ? BLINDED : PHONERS; // T1: the same three, phones still in hand, blinded
  holders.forEach((r, i) => {
    if (names.has(r.name)) out.push({ name: `phone${i}`, make: () => alertPhone(i), pose: (o, F) => { o.position.copy(handWorld(r.look as Look, r.state(F).pose, PHONE_AT[i], lensOf(s, F), "right", 0.08)); o.rotation.set(0, Math.atan2(lensOf(s, F).x - o.position.x, lensOf(s, F).z - o.position.z), 0); return true; }, heldBy: r.name, hand: "right" });
  });
  RUNNERS.forEach((r, i) => {
    if (r.carry && names.has(`runner${i}`)) out.push({ name: `carry${i}`, make: () => fleeProp(r.carry!), pose: (o, F) => { o.position.copy(handWorld(RUNNER_ROLES[i].look as Look, RUNNER_ROLES[i].state(F).pose, runnerAt(r)(F), lensOf(s, F), "both", 0.05)); return true; }, heldBy: `runner${i}`, hand: "both" });
  });
  if (s.id === "moon/J1-popping") {
    out.push({ name: "pan", make: pan, pose: (o) => { o.position.copy(STOVE); return true; }, touches: ["shack"] });
    for (let i = 0; i < 6; i++) out.push({ name: `pop${i}`, make: kernel, pose: (o, F) => {
      const k = (F - B.make + i * 5) % 22;
      o.position.copy(toss(STOVE.clone().add(V((i - 2.5) * 0.04, 0.05, 0)), STOVE.clone().add(V((i - 2.5) * 0.09, 0.06, (i % 2) * 0.06)), k, { air: 16, height: 0.18 + 0.05 * (i % 3) }).pos);
      return true;
    }, touches: ["shack"] });
  }
  if (s.id === "moon/N2-tiny-wave") out.push({ name: "tinyWave", make: tinyWave, pose: (o, F) => {
    const k = F - (B.tide - 24);
    if (k < 0 || k > 34) return false;
    const z = tide(F).z;
    o.position.set(0.6, 0.02, z - 0.5 + 0.55 * clamp01(k / 24));
    o.scale.set(1, k < 24 ? 0.4 + 0.6 * clamp01(k / 8) : Math.max(1 - (k - 24) / 6, 0.05), 1);
    o.rotation.x = k < 24 ? 0 : 0.5;
    return true;
  } });
  if (s.id === "moon/K1-sea-pulls-back") out.push({ name: "crab", make: crab, pose: (o, F) => { const z = tide(F).z; o.position.set(BEACH.stick.x - 0.3, 0, Math.min(z + 0.9, -0.3) + 0.035 * Math.sin(F * 1.4)); o.rotation.y = Math.PI / 2; o.scale.setScalar(1.8); return true; } });
  return out;
};
/** The dog's head on the pier: howling at the empty outline, then on "off" it turns to the lens (the moon is gone). */
export const dogHead = (F: number) => (F < B.off0 + 4 ? { rx: -0.7 + 0.08 * Math.sin(F / 3), ry: 0 } : { rx: -0.1, ry: Math.min((F - B.off0 - 4) / 6, 1) * 1.1 });
/** The giant hand over the bed: comes down, pinches and lifts on "bump", lets go on "let", rises out of frame. */
export const handAt = (F: number) => {
  const lift = span(F, B.bump - 6, B.hand + 4);
  const gone = span(F, B.letgo, B.letgo + 16);
  const y = F < B.bump - 6 ? 2.6 - 1.9 * span(F, B.see, B.bump - 8) : BED.sheetY + 0.72 * lift + 2.6 * gone;
  return { pos: V(0, y + 0.02, 0), visible: F < B.letgo + 18 };
};
export const humpAt = (F: number) => (F < B.bump - 6 ? 0 : F < B.letgo ? 0.72 * span(F, B.bump - 6, B.hand + 4) : 0.72 * (1 - span(F, B.letgo + 4, B.settles + 18)));
export const boatAt = (F: number) => V(0.02, BED.sheetY + sheetHeight(0.02, 0.26, humpAt(F)), 0.26); // on the hump's lens-side shoulder (both bedroom cameras sit at +z), clear of the pinching dot
/** The moths (line 20): they stream from the dark toward the floodlights, then onto Brad. 0..1 progress per moth. */
export const mothsAt = (F: number) => ({ come: clamp01((F - (B.so + 20)) / 60), onBrad: clamp01((F - (B.finds - 14)) / 14) });
export const bradLateAt = (F: number) => BRAD_LATE.at(F);
export { FLOOD_HEAD, pathAt, BRAD_HEAD };
export type { Object3D };
