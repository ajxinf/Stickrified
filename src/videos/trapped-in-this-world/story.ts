import { Object3D, Vector3 } from "three";
import { CamPose, frameOn, glide, impact, smootherstep } from "../../../kit/toon/camera";
import { blinkAt, exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { CaptionWord } from "../../../kit/toon/Captions";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import type { Look as ShotLook } from "../../../kit/toon/grade";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { POSES, actionPose, alive, blendPose, posed, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import type { Pose, PoseName } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import MOUTH from "../../../videos/trapped-in-this-world/voice/mouth.json";
import WORDS from "../../../videos/trapped-in-this-world/voice/words.json";
import { BR, BED_JAR, DOOR_S, GARY_X, SIGN_AT, WALL_X, YOU_SPOT, at, garyLook, jar, ladder, pigeonLook } from "./world";

/**
 * trapped-in-this-world, shot plan (69.3 s voice). Every beat is locked to words.json (composition frames, 30 fps);
 * characters are placed by composition frame F and shots convert to shot-local frames. Hard cuts inside a place,
 * the punch/rewind, the dive and the climax carry the meta layer (Video.tsx).
 * Emotion density (R22): every character runs an exprAt ladder, a face change every ~1.5 s on the words.
 */
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
/** Start frame of the n-th occurrence of a word. */
export const W = (t: string, n = 0) => {
  const w = words.filter((x) => norm(x.text) === norm(t))[n];
  if (!w) throw new Error(`word "${t}" #${n} not in words.json`);
  return Math.round(w.start * FPS);
};
export const LAST = Math.round(words[words.length - 1].end * FPS);
export const FRAMES = LAST + 6;
const MOUTH_T = MOUTH as MouthFrame[];
const talk = (F: number, spans: [number, number][]) => (spans.some(([a, b]) => F >= a && F < b) ? MOUTH_T[Math.min(Math.max(F, 0), MOUTH_T.length - 1)] : undefined);

// ------------------------------------------------------------------ beats (composition frames)
export const B = {
  screen: W("screen"), because: W("because"), ends: W("ends"), loops: W("loops"), loop9000: W("9,000"),
  gary: W("gary"), years: W("years"), nobody: W("nobody"), kid: W("kid"), time: W("time"),
  narrator: W("narrator"), me: W("me"), whatever: W("whatever"), tru: W("true"),
  door: W("door"), on: W("on", 0), shoes: W("shoes"), soup: W("soup"),
  so: W("so"), jump: W("jump"), grab: W("grab"), hide: W("hide"), near: W("near"),
  timed: W("timed"), frame: W("frame"), aWord: W("a", 2), one: W("one", 0),
  then: W("then"), notice: W("notice"), cant: W("can't"), move: W("move"),
  red: W("red"), p90: W("90%"), p95: W("95%"), p99: W("99"),
  but: W("but"), clips: W("clips"), jar: W("jar", 1), they: W("they"), captions: W("captions"), help: W("help"),
  inThis: W("in", 7), free: W("free"), loops9000: W("9,000", 3), never: W("never", 1), free2: W("free", 1),
  dive: W("dive"), something: W("something"), video: W("video", 1), into: W("into", 0), loopOne: W("one", 2),
  end: LAST,
};
/** The quoted line Gary says (and you mouth along with him), start of "Nobody" to the end of "kid". */
const GARY_SAYS: [number, number][] = [[B.nobody - 2, B.kid + 10]];

// ------------------------------------------------------------------ cast helpers
type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean };
/** QA "Reaction timing": a face change lands 0-3 frames before a word start; snap a key to 1 frame before the first
 * word that starts at or after it. */
export const snap = (k: number) => { const w = words.find((x) => Math.round(x.start * FPS) >= k); return w ? Math.round(w.start * FPS) - 1 : k; };
/** Where the tally-wall scene starts: "This is loop 9,000" (after the rewind). */
const T_WALL = W("this", 1);
const st = (pose: Pose, F: number, seed: number, keys: [number, Expr][], extra: Partial<CharState> = {}): CharState => {
  const e = exprAt<Expr>(keys.map(([k, x], i) => [i ? snap(k) : k, x] as [number, Expr]), F, seed);
  return { pose, expr: e.expr, blink: e.blink, fx: {}, ...extra };
};
const pose = (keys: [number, PoseName | Pose][], F: number, ease = 5): Pose => {
  const P = (k: PoseName | Pose) => (typeof k === "string" ? posed(k, F / FPS) : k);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  return i === 0 || F - keys[i][0] >= ease ? P(keys[i][1]) : blendPose(P(keys[i - 1][1]), P(keys[i][1]), (F - keys[i][0]) / ease);
};
const headingTo = (from: Vector3, to: Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
const lerpV = (a: Vector3, b: Vector3, t: number) => a.clone().lerp(b, Math.min(Math.max(t, 0), 1));
// Front view by default (heading undefined: the card faces whichever lens sees it); profiles only where the angle
// is the point (the wall, the door run, the dive). v1 used a fixed world heading and half the shots saw your back.
const BACK = undefined, TO_WALL = Math.PI / 2;

// ------------------------------------------------------------------ the rewind (line 2): the street plays backwards
export const REWIND: [number, number] = [B.ends + 6, B.loops - 2];
/** Composition frame the world is showing: during the rewind it runs backwards 3x fast from REWIND[0]. */
export const worldF = (F: number) => (F < REWIND[0] || F >= REWIND[1] ? F : REWIND[0] - 3 * (F - REWIND[0]));

// ------------------------------------------------------------------ "you"
const FREEZE_AT = snap(B.cant + 4), UNFREEZE = snap(B.free);
const PUNCH0 = 4;
/** Where you are, section by section (each line is another loop, so places jump between sections). */
const youAt = (F: number): Vector3 => {
  F = worldF(F);
  if (F < T_WALL) return YOU_SPOT.clone();
  if (F < B.gary) return at(17.25, 5.55, 0.02); // the tally wall
  if (F < B.narrator) {
    const s = 15.6 - (1.12 * (F - B.gary)) / FPS; // jogging beside Gary (past the lamp post at s 17)
    return at(s, 3.8, 0.02); // clear of the lamp posts (x 4.45)
  }
  if (F < B.door - 2) return at(12.6, 4.0, 0.02); // under the sign
  if (F < B.shoes) {
    const u = smootherstep((F - (B.door - 2)) / (B.on - (B.door - 2)));
    return lerpV(at(19.0, 4.7, 0.02), at(DOOR_S, WALL_X - 0.45, 0.02), u);
  }
  if (F < B.so) return at(DOOR_S, WALL_X - 0.45, 0.02); // soup shoes, where the door run ended (no jump in E2)
  if (F < B.hide) {
    const k = F - B.grab, hop = k >= -4 && k < 22 ? toss(new Vector3(), new Vector3(), k + 4, { air: 22, height: 0.55, bounces: 1 }).pos.y : 0;
    return YOU_SPOT.clone().setY(0.02 + hop);
  }
  if (F < B.timed) return BR(1.5, 0, -2.3); // the bedroom, between the bed and the window
  if (F < B.aWord) return at(15.9, 5.4, 0.02); // the chalk plan
  if (F < B.dive) return YOU_SPOT.clone(); // the last loop: crouch, notice, freeze, free
  // The dive: run at the right edge of the frame and leap.
  const u = (F - B.dive) / (B.into - B.dive), hop = u > 0.55 ? Math.sin(Math.min((u - 0.55) / 0.45, 1) * Math.PI * 0.8) * 0.7 : 0;
  if (F < B.into) return lerpV(YOU_SPOT, at(13.6, 3.2, 0.02), smootherstep(u)).setY(0.02 + hop);
  return PINK_YOU.clone();
};
export const PINK_YOU = at(14, 0.6, 0.0); // the next video (its own scene, so it reuses the street's coordinates)
const youState = (F: number): CharState => {
  const seed = 3, Fw = worldF(F);
  if (F < T_WALL) {
    // Punching the edge of the screen (to your right on screen), every ~14 frames; the face sets as it fails.
    const punching = Fw >= PUNCH0 && Fw < B.ends;
    const p = punching ? actionPose("knock", (Fw - PUNCH0) / FPS, 0.6) : F >= REWIND[1] ? posed("panic", F / FPS) : posed("hips", Fw / FPS);
    return st({ ...p, squash: punching ? reactSquash(((Fw - PUNCH0) % 14) - 1) * 0.6 : reactSquash(F - REWIND[1]) }, F, seed,
      [[0, "angry"], [B.screen - 2, "scheming"], [B.because, "determined"], [B.ends, "shocked"], [REWIND[1], "crying"]],
      { heading: BACK, fx: { tears: F >= REWIND[1] ? F / FPS : undefined, ringEyes: Fw >= B.ends && F < REWIND[1] } });
  }
  if (F < B.gary) {
    // Tally wall: you scratch mark 9,000 (arm to the wall), the chalk snaps on "9,000".
    const p = F < B.loop9000 + 4 ? { ...POSES.point, look: 0.5, arms: [POSES.point.arms[0], { at: [0.62, -0.28], grip: "point" }] as Pose["arms"] } : posed("hips", F / FPS, 0.3);
    return st(alive(p, F, seed, [0.4, 0.1, 0.5]), F, seed, [[0, "tired"], [B.loop9000, "deadpan"], [B.loop9000 + 22, "tired"]], { heading: TO_WALL });
  }
  if (F < B.narrator) {
    // Jogging beside Gary, pleading; then mouthing his line along with him.
    const d = (1.12 * (F - B.gary)) / FPS;
    const p = F < B.nobody - 6 ? { ...walkPose(d, 1, -0.4), arms: POSES.panic.arms } : walkPose(d, 0.8, -0.35);
    return st(alive(p, F, seed, [-0.45, -0.3, 0]), F, seed,
      [[0, "pleading"], [B.years, "sad"], [B.nobody, "disgusted"], [B.kid + 4, "deadpan"], [B.time, "tired"]],
      { heading: BACK, fx: { talk: talk(F, GARY_SAYS) } });
  }
  if (F < B.door - 2) {
    // The sign rises behind you: you look up, nervous, sweat; on "me" ring eyes.
    const p = pose([[0, "idle"], [B.me, "panic"], [B.whatever, "crossed"]], F);
    return st(alive({ ...p, tilt: -8 }, F, seed, [0.3, 0.2, 0.4]), F, seed,
      [[0, "confused"], [B.narrator + 10, "nervous"], [B.me, "scared"], [B.whatever, "suspicious"], [B.tru, "nervous"]],
      { heading: BACK, fx: { sweat: F >= B.narrator + 10 && F < B.whatever ? ((F - B.narrator) % 30) / 30 : undefined, ringEyes: F >= B.me && F < B.me + 18 } });
  }
  if (F < B.shoes) {
    // Sprint at the painted door, smack flat on "on", slide down crying.
    const run = F < B.on, slid = Math.min(Math.max((F - B.on - 6) / 14, 0), 1);
    const p: Pose = run ? runPose((3.2 * (F - (B.door - 2))) / FPS, 0.3) : { ...POSES.panic, bob: -40 * slid, squash: reactSquash(F - B.on) };
    return st(p, F, seed, [[0, "determined"], [B.on, "shocked"], [B.on + 12, "crying"]],
      { heading: F < B.on + 8 ? headingTo(at(19.0, 4.7), at(DOOR_S, WALL_X)) : undefined, fx: { ringEyes: F >= B.on && F < B.on + 12, tears: F >= snap(B.on + 12) ? F / FPS : undefined } });
  }
  if (F < B.so) {
    // Soup shoes: one foot lifts, soup sloshes out; disgusted.
    const lift = Math.sin(Math.min(Math.max((F - B.soup + 10) / 26, 0), 1) * Math.PI);
    return st({ ...posed("hips", F / FPS), lift: [0, 60 * lift], knee: 18 * lift, sway: -4 * lift }, F, seed,
      [[0, "suspicious"], [B.soup - 2, "disgusted"]], { heading: BACK });
  }
  if (F < B.hide) {
    // Crouch under the captions, scheming; jump and grab on "grab".
    const p = F < B.grab - 4 ? { ...POSES.lean, look: 0.2, tilt: -12 } : F < B.grab + 14 ? { ...POSES.wave, arms: [POSES.wave.arms[0], { at: [0.3, -1.05], grip: "fist" }] as Pose["arms"], look: 0.3, lift: [30, 30] as [number, number] } : posed("hips", F / FPS);
    return st(alive(p, F, seed, [0.2, 0.35]), F, seed, [[0, "suspicious"], [B.jump - 4, "scheming"], [B.grab, "excited"], [B.grab + 16, "proud"]], { heading: BACK });
  }
  if (F < B.timed) {
    // Bedroom: guard the jar, slap Gary's hand on "near".
    const p = pose([[0, "crossed"], [B.near - 3, { ...POSES.wave, arms: [POSES.wave.arms[0], { at: [0.75, -0.1], grip: "open" }] as Pose["arms"] }], [B.near + 10, "hips"]], F, 3);
    return st(alive(p, F, seed, [0.6, 0.4]), F, seed, [[0, "suspicious"], [B.near - 3, "angry"], [B.near + 12, "smug"]], {});
  }
  if (F < B.aWord) {
    return st(alive(posed("crossed", F / FPS, -0.3), F, seed, [-0.4, -0.2, 0]), F, seed, [[0, "smug"], [B.frame, "proud"]], { heading: BACK });
  }
  if (F < FREEZE_AT) {
    // The last loop: crouch under the captions, jar under your arm; the sign notices you.
    const p = F < B.then ? { ...POSES.lean, look: 0.35, tilt: -10 } : pose([[B.then, "hold"], [B.notice, { ...POSES.hold, shrug: 14, bob: -6 }]], F, 4); // the jar stays low in your hands
    return st(alive(p, F, seed, [0.35, 0.5, 0.2]), F, seed,
      [[0, "excited"], [B.one - 2, "scheming"], [B.then, "suspicious"], [B.notice, "nervous"]],
      { heading: BACK, prop: undefined, fx: { sweat: F >= B.notice ? ((F - B.notice) % 30) / 30 : undefined } });
  }
  if (F < UNFREEZE) {
    // Frozen mid-step, grey; only the eyes move (pupils dart between the bar, the sign and Gary).
    const grey = Math.min((F - FREEZE_AT) / 10, 1);
    const darts = F < B.red ? [0.6, 0.2] : F < B.but ? [0.9, -0.2, 0.5] : [0.9, 0.7];
    const p = { ...POSES.hold, bob: 0, sway: 0, look: 0, lift: [0, 34] as [number, number], knee: 12 };
    return st(alive(p, F, seed, darts), F, seed, [[0, "nervous"], [B.but, "pleading"], [B.clips, "excited"], [B.they, "nervous"]],
      { heading: BACK, fx: { fill: { color: "rgba(150,150,160,0.85)", t: grey } } });
  }
  if (F < B.dive) {
    const thaw = 1 - Math.min((F - UNFREEZE) / 12, 1);
    return st(alive(pose([[UNFREEZE, "panic"], [B.never, "hips"]], F, 4), F, seed, [0, 0.4]), F, seed,
      [[0, "shocked"], [UNFREEZE + 8, "excited"], [B.loops9000, "proud"], [B.free2, "grin"]],
      { heading: BACK, fx: { fill: thaw > 0 ? { color: "rgba(150,150,160,0.85)", t: thaw } : undefined, blush: F >= snap(UNFREEZE + 8) && F < B.loops9000 ? 1 : undefined } });
  }
  if (F < B.into) {
    const u = (F - B.dive) / (B.into - B.dive);
    const p = u < 0.55 ? runPose((3.6 * (F - B.dive)) / FPS, 0.2) : { ...POSES.panic, lean: 1, lift: [60, 60] as [number, number], bob: 10 };
    return st(p, F, seed, [[0, "determined"], [B.video - 4, "excited"]], { heading: headingTo(YOU_SPOT, at(13.6, 3.2)), fx: { blush: 1 } });
  }
  // The next video: you land among pigeons; crying, then scheming, fist up at the edge of the screen.
  const p = pose([[0, "panic"], [B.loopOne, { ...POSES.knock, look: 0.6 }]], F, 4);
  return st(alive(p, F, seed, [0.3, -0.3]), F, seed, [[0, "shocked"], [B.into + 10, "crying"], [B.loopOne, "scheming"]],
    { heading: BACK, fx: { tears: F < B.loopOne ? F / FPS : undefined } });
};
const YOU: Role = { name: "you", look: youLook, at: youAt, state: youState };
/** For the meta layer (the grabbed word follows your fist on screen). */
export const youAtF = youAt, youStateF = youState;

// ------------------------------------------------------------------ Gary
const GV = 1.12;
/** Gary walks his line toward -s; `s0` = where he is at frame `F0`. */
const garyWalk = (F: number, F0: number, s0: number) => at(s0 - (GV * (F - F0)) / FPS, GARY_X, 0.02);
const STOP_AT = B.clips - 8; // the climax: he stops beside you, turns, the ladder swings
const garyAt = (F: number): Vector3 => {
  F = worldF(F);
  if (F < T_WALL) return garyWalk(F, 0, 30);
  if (F < B.gary) return at(60, GARY_X, 0.02); // not on the street while you scratch the tally
  if (F < B.narrator) return garyWalk(F, B.gary, 16.0);
  if (F < B.so) return at(DOOR_S + 1.8, GARY_X, 0.02); // behind you at the door, sipping soup
  if (F < B.hide) return garyWalk(F, B.so, 26);
  if (F < B.timed) return BR(2.75, 0, -1.45); // outside the bedroom window
  if (F < B.red) return garyWalk(F, B.timed, 32);
  if (F < B.red) return at(60, GARY_X, 0.02); // off down the street while the sign notices you and you freeze
  if (F < STOP_AT) return garyWalk(F, STOP_AT, 12.5);
  if (F < B.into) return at(12.5, GARY_X, 0.02);
  return at(200, 0, 200); // not in the next video (his pigeon twin is)
};
/** How far round Gary has turned at the climax (0 = walking, 1 = facing you): the ladder swings with him. */
const garyTurn = (F: number) => smootherstep((F - STOP_AT) / 14);
const garyState = (F: number): CharState => {
  const seed = 9, Fw = worldF(F);
  const walking = !(F >= B.so - 80 && F < B.so) && !(F >= B.hide && F < B.timed) && !(F >= STOP_AT);
  const d = (GV * Fw) / FPS;
  let p: Pose = walking ? walkPose(d, 1, 0.1) : posed("idle", F / FPS);
  if (F >= B.soup - 20 && F < B.so) p = { ...POSES.eat, look: -0.2 }; // sips his soup
  if (F >= B.hide && F < B.timed) p = pose([[B.hide, "idle"], [B.near - 14, { ...POSES.point, look: -0.6 }], [B.near + 2, "facepalm"]], F, 3);
  if (F >= STOP_AT && F < B.dive) p = pose([[STOP_AT, "idle"], [B.jar + 4, "panic"], [B.free + 6, "shrug"]], F, 4);
  if (F >= B.dive) p = { ...POSES.wave, look: -0.3 };
  const keys: [number, Expr][] = [[0, "deadpan"], [B.time, "tired"], [B.soup, "smug"], [B.hide, "sneaky"], [B.near, "pleading"], [B.near + 14, "sad"],
    [B.red, "deadpan"], [B.jar, "shocked"], [B.help, "confused"], [B.free + 6, "shocked"], [B.free2, "relieved"], [B.dive, "grin"]];
  const mug = F < B.narrator || (F >= B.shoes - 30 && F < B.so) || F >= B.dive;
  return st(alive(p, F, seed, [0, -0.3, 0.2]), F, seed, keys, { prop: mug ? "mug" : undefined, fx: { talk: talk(F, GARY_SAYS), bang: F >= B.jar && F < B.jar + 14 ? F - B.jar : undefined } });
};
const GARY: Role = { name: "gary", look: garyLook, at: garyAt, state: garyState };

// ------------------------------------------------------------------ pigeon people (the next video)
const PIGEONS: Role[] = [[-1.0, 0.4, 31], [-1.6, 12.0, 33]].map(([dx, ds, seed], i) => ({ // spread wide so no pigeon hides behind you
  name: `pigeon${i}`, look: pigeonLook(seed), at: () => at(14 + ds, 0.6 + dx, 0.0),
  state: (F: number) => st(alive(posed(i % 2 ? "crossed" : "idle", F / FPS), F, seed, [-0.4, 0.2]), F, seed, [[0, "neutral"], [B.loopOne - 6 + i * 2, "confused"]], { fx: {} }),
}));
const LADDER_PIGEON: Role = {
  name: "ladderPigeon", look: pigeonLook(41), at: (F) => at(22, 3.2 - (0.45 * (F - B.into)) / FPS, 0.0), // walks in from the right, far behind you (on the road)
  state: (F) => st(walkPose((0.45 * (F - B.into)) / FPS, 0.9), F, 41, [[0, "deadpan"]], {}),
};

// ------------------------------------------------------------------ shots
export type World = "street" | "bedroom" | "pink";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World; look?: ShotLook; signY?: (F: number) => number };
export const WORLDS: Record<World, { light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  street: { light: "sunset", scene: "street sunset", sun: sunDirection(LIGHTS.sunset, at(0, 0, 1.5), at(30, 0, 1.5)) },
  bedroom: { light: "night", scene: "bedroom night", sun: new Vector3(-0.4, 0.5, 0.6).normalize() },
  pink: { light: "dawn", scene: "next video", sun: sunDirection({ ...LIGHTS.dawn, az: -40, el: 18 }, at(0, 0, 1.5), at(30, 0, 1.5)) },
};
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const lerpPose = (a: CamPose, b: CamPose, t: number): CamPose => ({ pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t), fov: a.fov + (b.fov - a.fov) * t, roll: a.roll + (b.roll - a.roll) * t });
const head = (F: number, y = 1.45) => youAt(F).setY(youAt(F).y + y);
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: r.look, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const ALLOW = {};
let cursor = 0;
/** A shot from the running cursor to composition frame `to` (hard cuts, no gaps). */
const shot = (id: string, to: number, w: World, roles: Role[], cam: (F: number, f: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof }): S => {
  const from = cursor;
  cursor = to;
  const { dof, ...rest } = o;
  return {
    id: `trapped/${id}`, from, frames: to - from, w, scene: WORLDS[w].scene, light: WORLDS[w].light, sun: WORLDS[w].sun, allow: ALLOW,
    pose: (f) => cam(f + from, f), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: "you", ...rest,
  };
};
const span = (F: number, a: number, b: number) => glide((F - a) / Math.max(b - a, 1));
const close = (d: number) => DOF.closeup(d), mid = (d: number) => DOF.medium(d);
const NONE: Dof = { maxPx: 0, near: 40, far: 80 };

const A1 = shot("A1-punch", B.because, "street", [YOU], (F) => {
  // MCU, you left of centre so the knocking fist lands on the frame's right edge (the 2D ripple and crack).
  const base = frameOn(YOU_SPOT.clone().setY(0), at(8.6, 2.4), "mcu", { head: 1.7, side: 0.32 });
  return P(base.pos.clone().lerp(base.pos.clone().add(new Vector3(0.05, 0, -0.25)), span(F, 0, B.because)), base.look, base.fov);
}, { dof: () => close(2.3) });
const A2 = shot("A2-loop-wide", REWIND[1], "street", [YOU, GARY], (F) => lerpPose(P(at(3.0, 1.9, 0.75), at(16, 4.2, 1.6), 46), P(at(4.4, 2.0, 1.2), at(16, 4.2, 1.5), 42), span(worldF(F), A1.frames, REWIND[0])),
  { wide: true, dof: () => NONE });
/** The rewind snaps you back to mid-punch: an MCU on your face going shocked -> crying. */
const A3 = shot("A3-snap-back", T_WALL, "street", [YOU], (F) => {
  const base = frameOn(YOU_SPOT.clone().setY(0), at(8.6, 2.4), "mcu", { head: 1.7, side: 0.12 });
  return P(base.pos.clone().lerp(base.pos.clone().add(new Vector3(0, 0, -0.2)), span(F, REWIND[1], T_WALL)), base.look, base.fov);
}, { dof: () => close(2.3) });
const B1 = shot("B1-tally-wall", B.gary, "street", [YOU], (F) => lerpPose(P(at(15.0, 3.4, 1.55), at(17.2, 5.4, 1.4), 44), P(at(14.6, 3.0, 1.65), at(17.2, 5.35, 1.42), 46), span(F, T_WALL, B.gary)),
  { dof: () => mid(3.2) });
/** Walking toward the lens side by side: the lens backs up at their pace. */
const pair = (F: number) => garyAt(F).clone().lerp(youAt(F), 0.5).setY(1.3);
const C1 = shot("C1-walk-wide", B.nobody - 4, "street", [YOU, GARY], (F) => {
  const m = pair(F), d = 5.4 - 0.4 * span(F, B.gary, B.years + 12);
  return P(m.clone().add(new Vector3(0.1, -0.05, d)), m.clone().setY(1.05), 46);
}, { subject: "gary", dof: () => mid(4.2) });
const C3 = shot("C3-says", B.kid + 14, "street", [YOU, GARY], (F) => {
  const m = pair(F);
  const l = m.clone().lerp(garyAt(F).setY(1.3), 0.15);
  return P(l.clone().add(new Vector3(0.1, -0.05, 4.6)), l.setY(1.25), 46);
}, { subject: "gary", dof: () => mid(2.7) });
const C4 = shot("C4-mouth-along", B.narrator, "street", [YOU, GARY], (F) => {
  const h = head(F, 1.3);
  return P(h.clone().add(new Vector3(-0.35, -0.05, 2.15)), h.clone().setY(1.2), 38);
}, { dof: () => close(1.75) });
export const SIGN_RISE: [number, number] = [B.narrator - 4, B.me - 4];
const D1 = shot("D1-sign-rises", B.whatever, "street", [YOU, GARY], (F) => lerpPose(P(at(8.5, 4.6, 0.25), at(14.0, 3.2, 2.2), 54), P(at(8.9, 4.6, 0.27), at(14.0, 3.2, 2.25), 52), span(F, B.narrator, B.whatever)),
  { dof: () => NONE, look: { dim: [[0, 1], [12, 0.82]] } });
const D2 = shot("D2-sign-orbit", B.door - 2, "street", [YOU, GARY], (F) => {
  const a = -0.5 + 0.6 * span(F, B.whatever, B.door), c = SIGN_AT;
  return P(c.clone().add(new Vector3(Math.sin(a) * 9, -3.6, Math.cos(a) * 9)), c.clone().setY(5.2), 44);
}, { subject: undefined, wide: true, dof: () => NONE, look: { dim: [[0, 0.82]] } });
const E1_BASE = (F: number) => P(at(17.6, 2.9, 1.25).lerp(at(17.75, 2.95, 1.25), span(F, B.door - 2, B.on)), youAt(F).setY(1.2).lerp(at(DOOR_S, WALL_X, 1.1), 0.45), 52);
const E1 = shot("E1-door", B.on + 24, "street", [YOU, GARY], (F) => impact((f) => E1_BASE(f), B.on, 0.025, 7)(F), { kicks: [[B.on - (B.door - 2), B.on - (B.door - 2) + 7]], dof: () => mid(2.4) });
const E2 = shot("E2-soup", B.so, "street", [YOU, GARY], (F) => {
  const t = span(F, B.on + 28, B.so), y = youAt(F);
  return P(y.clone().add(new Vector3(-0.9, 0.9, 1.7)), y.clone().setY(0.55).lerp(y.clone().setY(1.25), t), 40);
}, { subjectFrom: B.soup - (B.on + 24), dof: () => close(1.9) });
const F1 = shot("F1-crouch", B.jump - 2, "street", [YOU], (F) => P(at(10.0, 3.3, 0.75), head(F, 0.95), 42), { dof: () => mid(2.2) });
const F2 = shot("F2-jump-grab", B.hide, "street", [YOU], (F) => P(at(9.6, 3.4, 0.6), at(12, 4.0, 1.3), 50), { dof: () => mid(2.6), allow: { "Feet on the ground": "the jump for the caption word" } });
const G1 = shot("G1-jar-pov", B.near - 18, "bedroom", [YOU], (F) => P(BR(0.15, 0.17, 0.75).lerp(BR(0.18, 0.16, 0.35), span(F, B.hide, B.near)), BED_JAR.clone().setY(0.13), 40),
  { subject: undefined, dof: () => close(1.5) });
const G2 = shot("G2-slap", B.timed, "bedroom", [YOU, GARY], (F) => P(BR(-1.5, 1.45, 1.4).lerp(BR(-1.3, 1.42, 1.15), span(F, B.near - 18, B.timed)), BR(1.9, 1.25, -2.0), 46), { dof: () => mid(3.5) });
const H1 = shot("H1-plan", B.aWord, "street", [YOU], (F) => lerpPose(P(at(13.9, 3.8, 1.5), at(14.75, 6.1, 1.45), 46), P(at(13.3, 3.1, 1.9), at(15.9, 5.3, 1.22), 46), span(F, B.timed, B.frame + 50)),
  { subjectFrom: B.frame + 50 - B.timed, dof: () => mid(2.2) });
const I1 = shot("I1-crouch-last", B.one - 14, "street", [YOU, GARY], (F) => P(at(10.0, 3.2, 0.72).lerp(at(10.5, 3.3, 0.74), span(F, B.aWord, B.one)), head(F, 0.95).lerp(head(F, 1.4), 0.3), 44), { dof: () => mid(2.2) });
const eyes = (F: number, d0: number, d1: number, a: number, b: number) => {
  const h = head(F, 1.38);
  return P(h.clone().add(new Vector3(-0.12, -0.04, d0)).lerp(h.clone().add(new Vector3(-0.1, -0.03, d1)), span(F, a, b)), h.clone().setY(h.y - 0.24), 36);
};
const I2 = shot("I2-eyes", B.then - 2, "street", [YOU], (F) => eyes(F, 2.4, 2.15, B.one - 14, B.then), { dof: () => close(2.2) });
const J1 = shot("J1-notice", B.cant - 2, "street", [YOU], (F) => {
  const t = span(F, B.then, B.notice + 8);
  return P(SIGN_AT.clone().add(new Vector3(2.8, -1.2, 1.2)).lerp(at(15.2, 2.6, 3.0), t), head(F, 1.2).lerp(SIGN_AT, 0.1 * (1 - t)), 42);
}, { dof: () => NONE });
const J2 = shot("J2-freeze-arc", B.red - 2, "street", [YOU, GARY], (F) => {
  const a = 0.25 + 0.5 * span(F, B.cant, B.red), h = head(F, 1.25);
  return P(h.clone().add(new Vector3(Math.sin(a) * 2.3, 0.0, Math.cos(a) * 2.3)), h.clone().setY(1.15), 38);
}, { dof: () => close(2.3) });
const K1 = shot("K1-bar-wide", B.p95 - 4, "street", [YOU, GARY], (F) => P(at(4.6, 0.6, 1.2).lerp(at(5.2, 0.7, 1.2), span(F, B.red, B.p95)), at(13, 3.4, 1.2), 40), { wide: true, dof: () => NONE });
const K2 = shot("K2-eyes-95", B.p99 - 6, "street", [YOU], (F) => eyes(F, 2.4, 2.15, B.p95 - 4, B.p99), { dof: () => close(2.2) });
const K3 = shot("K3-gary-comes", B.but, "street", [YOU, GARY], (F) => P(at(9.4, 1.6, 0.9), at(13.5, 4.6, 1.3), 46), { dof: () => mid(3.2) });
const L1 = shot("L1-ladder-clip", B.they, "street", [YOU, GARY], (F) => P(at(8.0, 3.0, 0.6).lerp(at(8.7, 3.12, 0.66), span(F, B.but, B.they)), at(12.4, 4.6, 1.15), 48),
  { dof: () => mid(3.6), allow: { "Moving props": "the ladder swings past you and clips the jar: the gag" } });
const M1 = shot("M1-captions-land", B.inThis - 4, "street", [YOU, GARY], (F) => P(at(9.8, 2.8, 1.0).lerp(at(10.3, 2.9, 1.05), span(F, B.they, B.inThis)), SIGN_AT.clone().setY(4.4).lerp(head(F, 1.3), 0.35), 46), { subject: undefined, wide: true, dof: () => NONE });
const N1 = shot("N1-free", B.loops9000 - 2, "street", [YOU, GARY], (F) => {
  const h = head(F, 1.3);
  return P(h.clone().add(new Vector3(-0.35, -0.08, 2.5)).lerp(h.clone().add(new Vector3(-0.25, -0.05, 1.95)), span(F, B.inThis, B.free + 10)), h.clone().setY(1.2), 40);
}, { dof: () => close(2.1) });
export const JAR_REST = at(11.2, 3.7, 0.0); // knocked toward the lens, clear of your head card
const O1 = shot("O1-jar-label", B.never + 4, "street", [], (F) => P(JAR_REST.clone().add(new Vector3(-0.3, 0.3, 0.65)).lerp(JAR_REST.clone().add(new Vector3(-0.22, 0.26, 0.5)), span(F, B.loops9000, B.never)), JAR_REST.clone().setY(0.12), 38), { subject: undefined, dof: () => close(0.6) });
const O2 = shot("O2-sign-sulks", B.dive, "street", [], (F) => P(at(11.2, 2.6, 1.0), SIGN_AT.clone().setY(4.6), 40), { subject: undefined, wide: true, dof: () => NONE });
const P1 = shot("P1-dive", B.into, "street", [YOU, GARY], (F) => P(at(16.1, 3.3, 1.2).lerp(at(15.8, 3.25, 1.2), span(F, B.dive, B.into)), at(12.8, 3.3, 1.55), 58), { dof: () => mid(2.6), allow: { "Feet on the ground": "the dive" } });
const Q1 = shot("Q1-next-video", FRAMES, "pink", [YOU, ...PIGEONS, LADDER_PIGEON], (F) => {
  const h = PINK_YOU.clone().setY(1.35);
  return P(h.clone().add(new Vector3(0.0, -0.1, 3.6)).lerp(h.clone().add(new Vector3(0.05, -0.05, 3.1)), span(F, B.into, FRAMES)), h.clone().setY(1.1), 50);
}, { dof: () => mid(3.2) });

export const SHOTS: S[] = [A1, A2, A3, B1, C1, C3, C4, D1, D2, E1, E2, F1, F2, G1, G2, H1, I1, I2, J1, J2, K1, K2, K3, L1, M1, N1, O1, O2, P1, Q1];
export const PLAN: Plan = { slug: "trapped-in-this-world", shots: SHOTS, words };

// ------------------------------------------------------------------ story props (same pose for render and QA)
/** The sign's height: under the street until it rises (D1), then over it; it sags when it sulks. */
export const signY = (F: number) => (F < SIGN_RISE[0] ? -4 : F < SIGN_RISE[1] ? -4 + (SIGN_AT.y + 4) * smootherstep((F - SIGN_RISE[0]) / (SIGN_RISE[1] - SIGN_RISE[0])) : SIGN_AT.y - (F >= B.never ? 0.6 * smootherstep((F - B.never) / 20) : 0));
/** Where the jar is at frame F (world), or null; the climax pops it out of your hands. */
const POP = B.jar + 2;
export const jarPose = (F: number, cam: Vector3): { pos: Vector3; spin: number } | null => {
  if (F >= B.timed && F < B.aWord) return null;
  if (F < B.aWord || F >= B.into) return null;
  const hand = handWorld(youLook, youState(F).pose, youAt(F), cam, "right", 0.08, youState(F).heading);
  if (F < POP) return { pos: hand.add(new Vector3(0, -0.1, 0)), spin: 0 };
  const t = toss(handWorld(youLook, youState(POP).pose, youAt(POP), cam, "right", 0.08, youState(POP).heading).add(new Vector3(0, -0.1, 0)), JAR_REST, F - POP, { air: 26, height: 0.35, spins: 1, bounces: 3 });
  return { pos: t.pos, spin: t.spin };
};
const ladderPose = (o: Object3D, F: number) => {
  if ((F >= B.hide && F < B.timed) || F >= B.into) return false; // the bedroom and the next video
  const walk = F >= STOP_AT && F < B.into ? 0 : 1;
  o.position.copy(garyAt(F)).setY(1.1 + (walk ? 0.02 * Math.sin((F * Math.PI) / 9) : 0)); // under his chin, never through the head card
  // After the clip Gary drops it: it falls flat beside him (and out of your face).
  const drop = F - (B.jar + 6);
  if (drop >= 0 && F < B.into) {
    const s = toss(garyAt(F).setY(1.1), garyAt(F).add(new Vector3(-0.2, 0, 0)).setY(0.04), drop, { air: 12, height: 0.05, bounces: 2 });
    o.position.copy(s.pos);
    o.rotation.set(0, -1.15 + 0.6 * Math.min(drop / 12, 1), 0.12 * (1 - Math.min(drop / 12, 1)));
    return true;
  }
  // Carried along his walk (local z = his path); at the climax he turns toward you and the front end swings round
  // through the jar (negative yaw swings +z toward -x, where you stand).
  o.rotation.set(0, -garyTurn(F) * 1.15, 0.12);
  return true;
};
/** Story props per shot (the held jar is placed against that shot's lens: cards turn to the lens). */
export const propsFor = (s: S): MovingProp[] => {
  const out: MovingProp[] = [];
  if (s.w === "street") out.push({ name: "ladder", make: ladder, pose: ladderPose, heldBy: "gary", hand: "none", touches: ["ladder", "grooves"] });
  if (s.w === "street" && s.from >= B.aWord - 2 && s.from < B.into)
    out.push({
      name: "jar", make: () => jar(7), heldBy: "you", hand: "none",
      pose: (o, F) => {
        const p = jarPose(F, s.pose(F - s.from).pos);
        if (!p) return false;
        o.position.copy(p.pos);
        o.rotation.set(0, 0, p.spin);
        return true;
      },
    });
  return out;
};
export { blinkAt };
