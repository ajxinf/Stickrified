import { Object3D, Vector3 } from "three";
import { perform } from "../../../kit/toon/acting";
import { CamPose, frameOn, glide, impact, telephoto } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { EXTRAS } from "../../../kit/toon/extras";
import { talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { POSES, alive, moveCurve, movePose, posed, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose, PoseName } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { stampBox } from "../../../kit/toon/Stamp";
import MOUTH from "../../../videos/moon-disappeared-tonight/voice/mouth.json";
import WORDS from "../../../videos/moon-disappeared-tonight/voice/words.json";
import { BEACH, BED, BRAD_AT, FLOOD_HEAD, PIER_END, STICK_GRIP, alertPhone, tinyWave, bradLook, crab, fishBag, fleeProp, foldedChair, kernel, lawnChair, miaLook, pan, pathAt, popcornBucket, selfieStick, sheetHeight, stick, tideAt } from "./world";

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
export const FRAMES = LAST + 8;

export const B = {
  carry: W("carry"), chair0: W("chair"), ocean0: W("ocean"), n4000: W("4000"), hill: W("hill"),
  because: W("because"), moon0: W("moon"), blinked: W("blinked"), out: W("out"),
  and0: W("and"), phone: W("phone"), giant: W("giant"), wave0: W("wave"),
  but0: W("but"), grandmas: W("grandma's"), shack0: W("shack"),
  up0: W("up", 1), brad0: W("brad"), n500: W("500"), sandbags: W("sandbags"), flood0: W("floodlights"), live: W("live"), stream: W("stream"),
  enjoy: W("enjoy"), wave1: W("wave", 1), guy: W("guy"), guyEnd: E("guy"),
  even: W("even"), sister: W("sister"), mia0: W("mia"), lost: W("lost"),
  were: W("we're"), drown: W("drown"), drownEnd: E("drown"),
  dont: W("don't"), answer: W("answer"), push: W("push"), stick0: W("stick"), water0: W("water"),
  then0: W("then"), sw: W("switch"), every1: W("every", 1), light: W("light"), shack1: W("shack", 1),
  make: W("make"), popcorn: W("popcorn"),
  then1: W("then", 1), ocean1: W("ocean", 1), back0: W("back"),
  it0: W("it", 1), tsunami: W("tsunami"), tsunamiEnd: E("tsunami"),
  ten: W("ten", 1), twenty: W("twenty"), thirty: W("thirty"), stick1: W("stick", 1), sand1: W("sand", 1),
  see: W("see"), moon1: W("moon", 1), bump: W("bump"), hand: W("hand"), bedsheet: W("bedsheet"),
  letgo: W("let"), sheet: W("sheet"), slam: W("slam"), settles: W("settles"),
  water1: W("water", 1), stops0: W("stops"), no: W("no"), boring: W("boring"), tide: W("tide"),
  when: W("when"), comes: W("comes"), stops1: W("stops", 1), third: W("third"), stick2: W("stick", 2), now: W("now"), sun: W("sun"),
  but1: W("but", 1), moon2: W("moon", 2), nightlight: W("nightlight"), without: W("without"), darker: W("darker"),
  so: W("so"), flood1: W("floodlights", 1), brightest: W("brightest"), moth: W("moth"), finds: W("finds"), brad1: W("brad", 1),
  down1: W("down", 1), mia1: W("mia", 1), looks: W("looks"), exploding: W("exploding"), stars: W("stars"),
  next: W("next"), n4000b: W("4000", 1), bring: W("bring"), chair1: W("chair", 2),
};
const TIDE_K = { back: B.back0, stops: B.stops0, comes: B.comes, stick: B.stick2 };
export const tide = (F: number) => tideAt(F, TIDE_K);
/** Stars visible (0..1): a few under the moon, more once it is gone, the Milky Way on "exploding". */
export const starsAt = (F: number) => (F < B.blinked && F >= B.because ? 0.12 : F < B.darker ? 0.45 : F < B.exploding - 4 ? 0.7 : Math.min(0.7 + (F - (B.exploding - 4)) / 20, 1));
export const milkyAt = (F: number) => (F < B.exploding - 4 ? 0 : Math.min((F - (B.exploding - 4)) / 24, 1));
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
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const SEA = Math.PI; // heading toward the sea (-z)

// ------------------------------------------------------------------ you
/** Arms for the props: the folded chair under the right arm, the popcorn bucket held in the lap. */
const CARRY: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.3, 0.42], grip: "fist" }] };
const LAP: Pose = { ...POSES.hold, arms: [{ at: [-0.22, 0.42], grip: "mitt" }, { at: [-0.22, 0.42], grip: "mitt" }] };
const STICK_HOLD: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.36, 0.3], grip: "fist" }] };
const STICK_PUSH: Pose = { ...POSES.idle, arms: [{ at: [-0.1, 0.5], grip: "fist" }, { at: [0.2, 0.62], grip: "fist" }], lean: 0.5, bob: -18, knee: 18 };
const FLICK: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.62, 0.1], grip: "fist" }], sway: 6 };
const SWITCH: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.55, -0.35], grip: "point" }], look: 0.4 };
/** Where you are: walking down the path (line 1), at the chair, seated, walking to the water, inside the shack. */
const WALK_A = V(0.3, 0, 9.6), WALK_B = V(0.55, 0, 6.2);
const STAND_CHAIR = V(-0.05, 0, 4.35);
const WATER_A = V(0.95, 0, 3.4), WATER_B = V(1.25, 0, 0.75);
export const IN_SHACK = V(BEACH.shack.x + 0.1, 0.1, BEACH.shack.z - 0.55);
const youAt = (F: number): Vector3 => {
  if (F < B.because) return WALK_A.clone().lerp(WALK_B, clamp01(F / B.because));
  if (F < B.but0 + 26) return STAND_CHAIR.clone();
  if (F < B.dont) return BEACH.seat.clone();
  if (F < B.push) return WATER_A.clone().lerp(WATER_B, clamp01((F - B.dont) / (B.push - 4 - B.dont)));
  if (F < B.then0) return WATER_B.clone();
  if (F < B.make) return IN_SHACK.clone();
  return BEACH.seat.clone();
};
const youState = (F: number): CharState => {
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
    return st(alive(p, F, seed, [0, 0.4, -0.3]), F, seed, [[0, "proud"], [B.up0, "suspicious"], [B.guy, "deadpan"], [B.sister, "neutral"], [B.lost, "smirk"], [B.drown, "determined"]]);
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
    return st(alive(LAP, F, seed, [0, -0.3, 0.3]), F, seed, [[0, "nervous"], [B.twenty, "worried"], [B.sand1, "determined"], [B.water1, "relieved"], [B.boring, "deadpan"], [B.third, "smug"], [B.darker, "suspicious"], [B.down1, "relieved"], [B.looks, "excited"], [B.exploding, "proud"]]);
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
    return st(p, F, seed, [[0, "worried"], [B.lost, "nervous"], [B.were, "scared"], [B.drown, "shocked"]], { fx: { talk, sweat: F >= B.were ? ((F - B.were) % 30) / 30 : undefined } });
  }
  if (F < B.see) {
    const p = pose([[0, TUG], [B.ten, CLING]], F);
    return st(p, F, seed, [[0, "worried"], [B.back0, "scared"], [B.tsunami, "shocked"], [B.twenty, "scared"], [B.sand1, "crying"]], { fx: { ringEyes: F >= B.tsunami && F < B.tsunami + 20, tears: F >= B.sand1 ? (F - B.sand1) / FPS : undefined } });
  }
  if (F < B.down1) {
    const p = pose([[0, TUG], [B.boring, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]] }]], F);
    return st(alive(p, F, seed, [0.6, 0.2]), F, seed, [[0, "confused"], [B.boring, "relieved"], [B.third, "excited"], [B.darker, "nervous"]]);
  }
  // Line 21: she looks up and her jaw drops.
  const p = pose([[0, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, POSES.idle.arms[1]] }], [B.looks, { ...POSES.idle, arms: [{ at: [0.2, 0.4], grip: "fist" }, { at: [0.3, 0.6], grip: "open" }], tilt: -12 }]], F);
  return st(p, F, seed, [[0, "nervous"], [B.looks, "confused"], [B.exploding, "excited"]], { fx: { ringEyes: F >= B.exploding && F < B.exploding + 30 } });
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
    return st({ ...p, squash: reactSquash(F - B.tsunami) }, F, seed, [[0, "scared"], [B.tsunami, "shocked"]], { fx: { talk, bang: F >= B.tsunami ? F - B.tsunami : undefined, sweat: ((F % 24) / 24) } });
  }
  // Lines 20: proud in his floodlights, then the moths find him.
  const p = pose([[0, SELFIE], [B.moth + 10, SWAT], [B.finds, { ...SWAT, sway: 10 }]], F);
  return st(p, F, seed, [[0, "proud"], [B.brightest, "smug"], [B.moth, "confused"], [B.moth + 20, "scared"], [B.finds, "disgusted"], [B.brad1, "crying"]],
    { fx: { tears: F >= B.brad1 ? (F - B.brad1) / FPS : undefined } });
};
const BRAD: Role = { name: "brad", look: bradLook, at: () => BRAD_POS.clone(), state: bradState };
/** The next night: Brad, still covered in moths, sneaks down with a chair. */
const BRAD_SNEAK_A = V(5.2, 0, 3.6), BRAD_SNEAK_B = V(3.8, 0, 1.6);
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
const PHONE_AT = [V(-0.85, 0, 0), V(0, 0, 0.45), V(0.85, 0, 0.1)].map((p) => p.add(V(-2, 0, 26)).setY(0));
const PHONE_UP: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.3, -0.2], grip: "fist" }] };
const PHONERS: Role[] = PHONE_AT.map((p, i) => ({
  name: `phone${i}`, look: look(i + 3, 230 + i), at: () => p.clone(),
  state: (F: number) => st(alive(PHONE_UP, F, 230 + i, [0, 0.3]), F, 230 + i, [[0, "worried"], [B.giant, "scared"], [B.wave0, "shocked"]], { fx: { ringEyes: F >= B.wave0 } }, 0.6),
}));
/** Line 22: the town back on the beach with lawn chairs. */
export const CROWD_SPOTS: Vector3[] = Array.from({ length: 36 }, (_, i) => {
  const r = i % 6, c = Math.floor(i / 6);
  const x = -9 + c * 3.1 + (r % 2) * 1.4, z = -1.8 + r * 1.55;
  return V(x, 0, z);
}).filter((p) => p.z < 5.0 && p.distanceTo(BEACH.chair) > 2.2 && p.distanceTo(BEACH.mia) > 1.6 && Math.abs(p.x - BEACH.pierX) > 2 && p.distanceTo(V(-7.6, 0, 1.6)) > 2.4 && p.distanceTo(V(-5.2, 0, 5.4)) > 1.8 && p.distanceTo(V(-6.0, 0, 0.9)) > 1 && p.distanceTo(BRAD_SNEAK_A) > 1 && p.distanceTo(BRAD_SNEAK_B) > 1);
const CROWD: Role[] = CROWD_SPOTS.slice(0, 12).map((p, i) => ({
  name: `town${i}`, look: look(i, 260 + i), at: () => p.clone().add(V(0.55, 0, 0.05)),
  state: (F: number) => st(alive(posed(i % 3 ? "idle" : "crossed", (F + i * 9) / FPS, i % 2 ? -0.4 : 0.4), F, 260 + i, [0.3, -0.2]), F, 260 + i, [[0, i % 2 ? "excited" : "grin"]], {}, 0.5),
}));

// ------------------------------------------------------------------ shots
export type World = "beach" | "dark" | "bedroom";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World; moon?: boolean };
export const WORLDS: Record<World, { light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  beach: { light: "night", scene: "beach night", sun: V(0.25, 0.55, -0.8).normalize() },
  dark: { light: "night", scene: "beach dark", sun: V(0.25, 0.55, -0.8).normalize() },
  bedroom: { light: "interior", scene: "bedroom", sun: V(0.3, 0.9, 0.3).normalize() },
};
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: typeof r.look === "function" ? r.look(from) : r.look, lookAt: typeof r.look === "function" ? r.look : undefined, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Feet on the ground": "seated in the lawn chair: the card stands sunk so the chair's towel hides the legs", Shadows: "seated: the contact blob is under the sand", "Card penetration": "seated: the sunk card passes into the sand and the chair", "Moving props": "seated: the lawn chair holds the seated card (its back passes behind the head)" };
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
const creep = (f0: { pos: Vector3; look: Vector3; fov: number }, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.18) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const SEAT_HEAD = 1.55 - 0.42;
const seatFrame = (from: Vector3, size: "cu" | "mcu" | "ms", side = 0) => {
  const f = frameOn(BEACH.seat.clone().setY(0), from, size, { head: SEAT_HEAD + 0.05, side });
  return f;
};
const SEA_SIDE = V(0.6, 0, -6); // a point on the sea side of the chair (lens looking at you and the shack)
/** You in the chair and Mia beside you, from the sea side: both heads in, creeping in. */
const twoShot = (F: number, a: number, b: number, dist = 3.2, dx = 0) => {
  const mid0 = BEACH.seat.clone().add(MIA_AT).multiplyScalar(0.5).setY(0);
  const t = span(F, a, b);
  return P(mid0.clone().add(V(dx - 0.25 + 0.2 * t, 0.92, -dist + 0.35 * t)), mid0.clone().add(V(dx, 0.82, 0)), 50);
};

// --- line 1: the cold open and the river of flashlights
const A1 = shot("A1-down-to-the-sea", B.n4000, "beach", [YOU, ...RUNNER_ROLES], (F) => P(V(0.5, 1.5, 14.6).lerp(V(0.5, 1.42, 13.9), span(F, 0, B.n4000)), V(0.5, 1.0, -2), 50), { wide: true, dof: () => NONE, subjectFrom: 0, allow: { "Cast overlap": "the town runs past the lens on both sides of you; the gag is the crowd going the other way" } });
const A2 = shot("A2-flashlight-river", B.because, "beach", [], (F) => P(V(1.2, 1.6, 2.0).lerp(V(2.0, 2.8, 3.2), span(F, B.n4000, B.because)), V(-1.5, 8.5 + 1.5 * span(F, B.n4000, B.because), 34), 52), { subject: undefined, wide: true, dof: () => NONE });
// --- line 2: ten minutes ago, the dog howls and the moon blinks out
const DOG_CAM = PIER_END.clone().add(V(0.6, 0.55, 3.2));
const B1 = shot("B1-moon-blinks-out", B.and0, "beach", [], (F) => {
  const t = span(F, B.because, B.blinked - 4);
  return P(DOG_CAM.clone(), PIER_END.clone().add(V(0, 0.9, 0)).lerp(PIER_END.clone().add(V(-6, 14, -40)), t * 0.42), 50);
}, { subject: undefined, wide: true, dof: () => NONE, moon: true });
// --- line 3: every phone says the same thing
const PH_MID = PHONE_AT[1];
const C1 = shot("C1-phones", B.wave0 - 14, "beach", PHONERS, (F) => {
  const f0 = frameOn(PH_MID, PH_MID.clone().add(V(0.2, 0, -5)), "fs", { fov: 44 });
  return creep({ ...f0, look: f0.look.clone().add(V(0, 0.35, 0)) }, F, B.and0, B.wave0 - 14, 0.18);
}, { subject: "phone1", dof: () => mid(3.2) });
const C2 = shot("C2-alert", B.but0, "beach", [PHONERS[1]], (F) => {
  const scr = phoneScreen(1, B.wave0);
  return P(scr.clone().add(V(0.05, 0.02, -0.56)).lerp(scr.clone().add(V(0.04, 0.01, -0.46)), span(F, B.wave0 - 14, B.but0)), scr.clone(), 40);
}, { subject: undefined, dof: () => close(0.5), allow: { "Caption vs face": "insert on the phone screen held up in front of his face (soft behind it)" } });
// --- line 4: Grandma's snack shack
const D1 = shot("D1-flick-open", B.but0 + 26, "beach", [YOU], (F) => {
  const f0 = frameOn(STAND_CHAIR, STAND_CHAIR.clone().add(V(-0.6, 0, -5)), "ms", { side: -0.3 });
  return creep(f0, F, B.but0, B.but0 + 26, 0.08);
}, { dof: () => mid(2.6) });
const D2 = shot("D2-king-of-the-shack", B.up0, "beach", [YOU_SEATED], (F) => {
  const f0 = seatFrame(SEA_SIDE.clone().add(V(-1.4, 0, 0)), "ms");
  return P(f0.pos.clone().setY(0.55).lerp(f0.pos.clone().setY(0.6).add(V(0.15, 0, 0.7)), span(F, B.but0 + 26, B.up0)), f0.look.clone().add(V(0, 0.25, 0)), 44);
}, { dof: () => mid(3.0) });
// --- line 5: Brad on the hill
const BRAD_HEAD = 1.72;
const brad = (from: Vector3, spanM: number) => telephoto(from, BRAD_POS, BRAD_HEAD, spanM);
const BRAD_LENS = BRAD_POS.clone().add(V(1.6, -0.6, -9.5));
const E1 = shot("E1-brad-crane", B.n500, "beach", [BRAD], (F) => {
  const t = span(F, B.up0, B.n500 - 4);
  const low = BRAD_POS.clone().add(V(0.3, -1.6, 0)), hi = BRAD_POS.clone().add(V(0, 1.1, 0));
  return P(BRAD_LENS.clone().add(V(0, 1.2 * t, 0)), low.lerp(hi, t), 40);
}, { subject: "brad", subjectFrom: 18, wide: true, dof: () => NONE });
const E2 = shot("E2-sandbags-floodlights", B.live - 6, "beach", [BRAD], (F) => {
  const t = span(F, B.n500, B.live);
  return P(BRAD_POS.clone().add(V(-1.4, -1.9, -9.6)).lerp(BRAD_POS.clone().add(V(-0.8, -1.8, -9.0)), t), BRAD_POS.clone().add(V(0.2, 1.6, 0)), 50);
}, { subject: "brad", wide: true, dof: () => NONE });
const E3 = shot("E3-live-stream", B.enjoy, "beach", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(0.6, 1.5, 2.2)), 1.9); return creep(b, F, B.live - 6, B.enjoy, 0.08); }, { subject: "brad", dof: () => mid(3.3) });
// --- line 6: "Enjoy the wave, chair guy!"
const F1 = shot("F1-brad-mocks", B.even, "beach", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(-0.5, 1.4, 2.1)), 1.6); return creep(b, F, B.enjoy, B.even, 0.12); }, { subject: "brad", dof: () => close(3.0) });
// --- lines 7-8: Mia
const G1 = shot("G1-mia-tugs", B.were, "beach", [YOU_SEATED, MIA], (F) => twoShot(F, B.even, B.were, 3.2, -0.15), { subject: "mia", dof: () => mid(3.0) });
const G2 = shot("G2-we-re-gonna-drown", B.dont, "beach", [MIA], (F) => {
  const f0 = frameOn(MIA_AT, MIA_AT.clone().add(V(-0.9, 0, -4)), "cu", { head: 1.3, height: 0.95 });
  return creep(f0, F, B.were, B.dont, 0.14);
}, { subject: "mia", dof: () => close(1.6) });
// --- line 9: the stick at the water
const H1 = shot("H1-walk-to-water", B.push, "beach", [YOU], (F) => {
  const at = youAt(F);
  const f0 = frameOn(at, at.clone().add(V(0.8, 0, -5)), "ms", { fov: 44 });
  return P(f0.pos, f0.look, f0.fov);
}, { dof: () => mid(2.6) });
const H2 = shot("H2-stick-macro", B.then0, "beach", [YOU], (F) => P(BEACH.stick.clone().add(V(0.45, 0.85, -2.7)).lerp(BEACH.stick.clone().add(V(0.4, 0.8, -2.4)), span(F, B.push, B.then0)), BEACH.stick.clone().add(V(0.12, 0.62, 0.3)), 46), { dof: () => mid(2.7) });
// --- line 10: the lights go off
const I1 = shot("I1-lights-off", B.make, "beach", [{ ...YOU, at: () => IN_SHACK.clone() }], (F) => creep(P(BEACH.hatch.clone().add(V(-0.4, -0.1, -3.7)), BEACH.hatch.clone().add(V(0, 0.2, 0)), 46), F, B.then0, B.make, 0.08), { dof: () => mid(3.7) });
// --- line 11: popcorn
export const STOVE = V(BEACH.shack.x + 0.55, 1.19, BEACH.shack.z - 1.45);
const J1 = shot("J1-popping", B.popcorn + 8, "beach", [], (F) => P(STOVE.clone().add(V(-0.35, 0.32, -0.62)).lerp(STOVE.clone().add(V(-0.3, 0.28, -0.52)), span(F, B.make, B.popcorn + 8)), STOVE.clone().add(V(0, 0.05, 0)), 44), { subject: undefined, dof: () => close(0.75) });
const J2 = shot("J2-kernel-in-mouth", B.then1, "beach", [YOU_SEATED], (F) => { const f0 = seatFrame(SEA_SIDE.clone().add(V(0.6, 0, 0)), "mcu"); return creep(f0, F, B.popcorn + 8, B.then1, 0.06); }, { dof: () => close(1.8) });
// --- line 12-13: the sea pulls back; Brad screams
const K1 = shot("K1-sea-pulls-back", B.it0, "beach", [], (F) => {
  const t = span(F, B.then1, B.it0);
  return P(BEACH.stick.clone().add(V(0.9, 0.7, 2.2)), BEACH.stick.clone().add(V(-0.3, 0.3, -2.5 - 2.5 * t)), 48);
}, { subject: undefined, wide: true, dof: () => NONE });
const K2 = shot("K2-tsunami", B.ten, "beach", [BRAD], (F) => impact((f) => { const b = brad(BRAD_POS.clone().add(V(0.4, 1.3, 2.0)), 1.75); return creep(b, f, B.it0, B.ten, 0.1); }, B.tsunami + 1, 0.03, 7)(F), { subject: "brad", kicks: [[B.tsunami + 1 - B.it0, B.tsunami + 8 - B.it0]], dof: () => close(2.8) });
// --- line 14: ten steps, twenty, thirty
const L1 = shot("L1-ten", B.twenty, "beach", [], (F) => P(BEACH.stick.clone().add(V(0.15, 0.75, 1.9)).lerp(BEACH.stick.clone().add(V(0.2, 0.8, 2.0)), span(F, B.ten, B.twenty)), BEACH.stick.clone().add(V(-0.2, 0.25, -4)), 46), { subject: undefined, wide: true, dof: () => NONE });
const L2 = shot("L2-twenty", B.thirty, "beach", [YOU_SEATED, MIA], (F) => P(V(1.9, 2.8, 6.6).lerp(V(2.0, 3.1, 6.8), span(F, B.twenty, B.thirty)), V(0.6, 0, -6), 50), { subject: undefined, wide: true, dof: () => NONE });
const L3 = shot("L3-thirty", B.stick1 - 4, "beach", [YOU_SEATED, MIA], (F) => P(V(3.0, 9.0, 9.5).lerp(V(3.1, 9.6, 10.0), span(F, B.thirty, B.stick1)), V(0.4, 0, -6), 50), { subject: undefined, wide: true, dof: () => NONE });
const L4 = shot("L4-dry-sand", B.see, "beach", [YOU_SEATED, MIA], (F) => twoShot(F, B.stick1 - 4, B.see, 2.9, 0.1), { dof: () => mid(2.7) });
// --- lines 15-16: the bedsheet
const BED_TOP = V(0, BED.sheetY, 0);
const M1 = shot("M1-bedsheet-lifts", B.letgo, "bedroom", [], (F) => P(V(0.9, 1.75, 3.1).lerp(V(0.7, 1.6, 2.5), span(F, B.see, B.letgo)), BED_TOP.clone().add(V(0, 0.45, 0)), 46), { subject: undefined, dof: () => NONE });
const M2 = shot("M2-sheet-settles", B.water1 - 2, "bedroom", [], (F) => P(V(-0.6, 1.4, 2.2).lerp(V(-0.5, 1.15, 1.9), span(F, B.letgo, B.water1)), BED_TOP.clone().add(V(0, 0.2 - 0.12 * span(F, B.letgo, B.settles + 10), 0)), 44), { subject: undefined, dof: () => NONE });
// --- line 17: the water stops
const N1 = shot("N1-calm-bay", B.boring - 22, "beach", [YOU_SEATED, MIA], (F) => P(V(0.45, 2.7, 7.6).lerp(V(0.3, 2.5, 6.7), span(F, B.water1, B.boring)), V(0.1, 1.2, -5), 50), { subject: undefined, wide: true, dof: () => NONE });
const N2 = shot("N2-tiny-wave", B.when - 6, "beach", [], (F) => { const z = tide(F).z; return P(V(1.4, 0.32, z + 1.6), V(0.4, 0.05, z - 0.4), 46); }, { subject: undefined, dof: () => close(1.8) });
// --- line 18: four hours later, a third of the way
const O1 = shot("O1-a-third", B.now, "beach", [], (F) => P(BEACH.stick.clone().add(V(0.15, 0.8, 1.8)).lerp(BEACH.stick.clone().add(V(0.15, 0.95, 1.6)), span(F, B.when, B.now)), BEACH.stick.clone().add(V(-0.1, 0.1, -8)), 44), { subject: undefined, wide: true, dof: () => NONE });
const O2 = shot("O2-stick-and-you", B.but1, "beach", [YOU_SEATED, MIA], (F) => P(BEACH.stick.clone().add(V(-0.15, 0.6, -2.2)).lerp(BEACH.stick.clone().add(V(-0.12, 0.65, -1.9)), span(F, B.now, B.but1)), V(0.6, 0.85, 4.2), 40), { subject: undefined, wide: true, dof: () => NONE });
// --- line 19: the world's biggest nightlight
const P1 = shot("P1-pull-out", B.without, "beach", [YOU_SEATED, MIA], (F) => {
  const t = span(F, B.but1, B.without);
  return P(V(1.5, 3.4, -3.5).lerp(V(-2, 6.5, -24), t), V(0.6, -0.2, 4.2).lerp(V(-2, 7, 30), t), 46);
}, { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Caption vs face": "the pull-out leaves you two as specks under the caption (heads < 3 % of the frame)" } });
const P2 = shot("P2-nightlight-wide", B.darker, "beach", [], (F) => P(V(-2, 6.5, -24).lerp(V(-2, 6.4, -23), span(F, B.without, B.darker)), V(-2, 7, 30), 46), { subject: undefined, wide: true, dof: () => NONE });
const Q1 = shot("Q1-darker", B.brightest, "dark", [], (F) => P(V(-2, 6.4, -23).lerp(V(-4, 9, -12), span(F, B.darker, B.brightest)), V(-6, 12, 40), 46), { subject: undefined, wide: true, dof: () => NONE });
// --- line 20: every moth finds Brad
const Q2 = shot("Q2-moths-arrive", B.moth + 6, "dark", [BRAD], (F) => { return creep(P(BRAD_POS.clone().add(V(1.2, -2.2, -6.5)), BRAD_POS.clone().add(V(0, 1.4, 0)), 50), F, B.brightest, B.moth + 6, 0.12); }, { subject: "brad", dof: () => NONE, wide: true });
const Q3 = shot("Q3-finds-brad", B.down1, "dark", [BRAD], (F) => { const b = brad(BRAD_POS.clone().add(V(-0.5, 1.4, 2.1)), 1.7); return creep(b, F, B.moth + 6, B.down1, 0.12); }, { subject: "brad", dof: () => close(2.9) });
// --- line 21: the stars
const R1 = shot("R1-mia-looks-up", B.exploding, "dark", [YOU_SEATED, MIA], (F) => twoShot(F, B.down1, B.exploding, 3.0, -0.18), { subject: "mia", dof: () => mid(2.8) });
const R2 = shot("R2-milky-way", B.next, "dark", [YOU_SEATED, MIA], (F) => {
  const t = span(F, B.exploding, B.next - 4);
  return P(V(0.1, 0.45, 3.0), V(0.05, 3.0, 4.6).lerp(V(0, 8.6, 6.0), t), 52);
}, { subject: undefined, wide: true, dof: () => NONE });
// --- line 22: the next night (mirror of the opening: the town comes DOWN to the sea, toward the lens)
const S1 = shot("S1-lawn-chairs", B.chair1 - 2, "dark", [YOU_SEATED, MIA, BRAD_LATE, ...CROWD], (F) => P(V(0.6, 1.6, -9.0).lerp(V(0.6, 1.5, -8.0), span(F, B.next, B.chair1)), V(0.5, 1.2, 6), 52), { subject: undefined, wide: true, dof: () => NONE, allow: { ...SEATED, "Cast overlap": "a beach packed with the town: heads stack into the distance (the gag is how many came)" } });
const S2 = shot("S2-smug", FRAMES, "dark", [YOU_SEATED, MIA], (F) => { const f0 = seatFrame(SEA_SIDE.clone().add(V(0.3, 0, 0)), "cu"); return creep(f0, F, B.chair1 - 2, FRAMES, 0.06); }, { dof: () => close(1.5) });

export const SHOTS: S[] = [A1, A2, B1, C1, C2, D1, D2, E1, E2, E3, F1, G1, G2, H1, H2, I1, J1, J2, K1, K2, L1, L2, L3, L4, M1, M2, N1, N2, O1, O2, P1, P2, Q1, Q2, Q3, R1, R2, S1, S2];
/** Dissolves: into and out of the bedroom (time and place change for the analogy). */
export const XFADE = [B.see, B.water1 - 2];
export const STAMPS = [
  { text: "10 MIN AGO", at: B.because + 2, hold: 50, top: "12%" },
  { text: "4 HOURS LATER", at: B.when - 4, hold: 54, top: "10%" },
];
export const PLAN: Plan = { slug: "moon-disappeared-tonight", shots: SHOTS, words, overlays: STAMPS.map((x) => stampBox(x.text, x.at, x.hold, x.top)) };

// ------------------------------------------------------------------ story props (same pose for render and QA)
const lensOf = (s: S, F: number) => s.pose(F - s.from).pos;
/** Where phone i's screen is at frame F (held up in the right hand). */
const phonePos = (i: number, F: number, lens: Vector3) => handWorld(PHONERS[i].look as Look, PHONERS[i].state(F).pose, PHONE_AT[i], lens, "right", 0.08);
const LENS_C1 = V(0, 1.4, 21);
export const phoneScreen = (i: number, F: number) => phonePos(i, F, LENS_C1).add(V(0, 0.085, 0));
const youHand = (s: S, F: number, hand: "left" | "right" | "both") => handWorld(youLook, youState(F).pose, youAt(F), lensOf(s, F), hand, 0.06, youState(F).heading);
const miaHand = (s: S, F: number) => handWorld(miaLook, miaState(F).pose, MIA_AT, lensOf(s, F), "left", 0.05);
const bradHand = (s: S, F: number) => handWorld(bradLook, bradState(F).pose, BRAD_POS, lensOf(s, F), "right", 0.05);
export const CHAIR_OPEN = B.but0 + 8;
export const propsFor = (s: S): MovingProp[] => {
  if (s.w === "bedroom") return [];
  const names = new Set(s.cast?.map((c) => c.name));
  const out: MovingProp[] = [];
  out.push({ name: "stick", make: stick, pose: (o, F) => { if (F < B.push + 10) return false; o.position.copy(BEACH.stick).add(V(0, STICK_GRIP - 0.35 * clamp01((F - (B.push + 10)) / 12), 0)); return true; } });
  out.push({ name: "chair", make: lawnChair, pose: (o, F) => { if (F < CHAIR_OPEN) return false; o.position.copy(BEACH.chair); o.rotation.set(0, 0, 0); return true; }, heldBy: "you", hand: "none" });
  if (names.has("you")) {
    out.push({ name: "folded", make: foldedChair, pose: (o, F) => { if (F >= CHAIR_OPEN || F >= B.because && F < B.but0) return false; o.position.copy(youHand(s, F, "right")); o.rotation.set(0, youState(F).heading ?? 0, 0); return true; }, heldBy: "you", hand: "right" });
    out.push({ name: "stickHeld", make: stick, pose: (o, F) => { if (F < B.dont || F >= B.push + 10) return false; o.position.copy(youHand(s, F, "right")); return true; }, heldBy: "you", hand: "right" });
    out.push({ name: "bucket", make: popcornBucket, pose: (o, F) => { if (F < B.popcorn + 8 || F >= B.next) return false; o.position.copy(youHand(s, F, "both")); return true; }, heldBy: "you", hand: "both" });
    out.push({ name: "kernel", make: kernel, pose: (o, F) => {
      const k = F - (B.popcorn + 2);
      if (k < 0 || k > 12) return false;
      const head = youAt(F).clone().add(V(0, SEAT_HEAD + 0.42 - 0.18, 0));
      o.position.copy(toss(youHand(s, B.popcorn + 2, "both").add(V(0, 0.2, 0)), head, k, { air: 12, height: 0.35 }).pos);
      return true;
    }, heldBy: "you", hand: "none" });
  }
  if (names.has("mia")) out.push({ name: "fish", make: fishBag, pose: (o, F) => { o.position.copy(miaHand(s, F)); return true; }, heldBy: "mia", hand: "left" });
  if (names.has("brad") && s.id !== "moon/S1-lawn-chairs") out.push({ name: "selfie", make: selfieStick, pose: (o, F) => { o.position.copy(bradHand(s, F)); o.rotation.set(0, 0.2, 0.15); return true; }, heldBy: "brad", hand: "right" });
  if (s.id === "moon/S1-lawn-chairs") out.push({ name: "bradChair", make: foldedChair, pose: (o, F) => { o.position.copy(handWorld(bradLook, BRAD_LATE.state(F).pose, BRAD_LATE.at(F), lensOf(s, F), "right", 0.05)); return true; }, heldBy: "brad", hand: "right" });
  PHONERS.forEach((r, i) => {
    if (names.has(r.name)) out.push({ name: `phone${i}`, make: () => alertPhone(i), pose: (o, F) => { o.position.copy(phonePos(i, F, lensOf(s, F))); o.rotation.set(0, Math.atan2(lensOf(s, F).x - o.position.x, lensOf(s, F).z - o.position.z), 0); return true; }, heldBy: r.name, hand: "right" });
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
  if (s.id === "moon/K1-sea-pulls-back") out.push({ name: "crab", make: crab, pose: (o, F) => { const z = tide(F).z; o.position.set(BEACH.stick.x - 0.7, 0, Math.min(z + 0.9, -0.3) + 0.035 * Math.sin(F * 1.4)); o.rotation.y = Math.PI / 2; return true; } });
  return out;
};
/** The dog's head on the pier: tipped up howling, then (moon gone) turned to the lens. */
export const dogHead = (F: number) => (F < B.blinked + 4 ? { rx: -0.7 + 0.08 * Math.sin(F / 3), ry: 0 } : { rx: -0.1, ry: Math.min((F - B.blinked - 4) / 6, 1) * 1.1 });
/** The giant hand over the bed: comes down, pinches and lifts on "bump", lets go on "let", rises out of frame. */
export const handAt = (F: number) => {
  const lift = span(F, B.bump - 6, B.hand + 4);
  const gone = span(F, B.letgo, B.letgo + 16);
  const y = F < B.bump - 6 ? 2.6 - 1.9 * span(F, B.see, B.bump - 8) : BED.sheetY + 0.72 * lift + 2.6 * gone;
  return { pos: V(0, y + 0.02, 0), visible: F < B.letgo + 18 };
};
export const humpAt = (F: number) => (F < B.bump - 6 ? 0 : F < B.letgo ? 0.72 * span(F, B.bump - 6, B.hand + 4) : 0.72 * (1 - span(F, B.letgo + 4, B.settles + 18)));
export const boatAt = (F: number) => V(0.05, BED.sheetY + sheetHeight(0.05, 0.05, humpAt(F)), 0.05);
/** The moths (line 20): they stream from the dark toward the floodlights, then onto Brad. 0..1 progress per moth. */
export const mothsAt = (F: number) => ({ come: clamp01((F - (B.moth - 12)) / 40), onBrad: clamp01((F - (B.finds - 14)) / 14) });
export { FLOOD_HEAD, pathAt, BRAD_HEAD };
export type { Object3D };
