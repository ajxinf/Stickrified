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
import { POSES, actionPose, alive, moveCurve, movePose, posed, reactSquash, runPose, walkPose } from "../../../kit/toon/poses";
import { perform } from "../../../kit/toon/acting";
import type { Pose, PoseName } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import MOUTH from "../../../videos/trapped-in-this-world/voice/mouth.json";
import WORDS from "../../../videos/trapped-in-this-world/voice/words.json";
import { DOOR_S, GARY_X, SIGN_AT, WALL_X, YOU_SPOT, at, garyLook, jar, ladder, pigeonLook } from "./world";

/**
 * trapped-in-this-world, shot plan (77.7 s voice, 2026-11-16 rewrite: one street, the plan said plainly). Every beat is locked to words.json (composition frames, 30 fps);
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

/** Start frame of the first occurrence of a word at or after composition frame `F0`. */
const after = (t: string, F0: number) => {
  const w = words.find((x) => norm(x.text) === norm(t) && Math.round(x.start * FPS) >= F0);
  if (!w) throw new Error(`word "${t}" after f${F0} not in words.json`);
  return Math.round(w.start * FPS);
};

// ------------------------------------------------------------------ beats (composition frames)
const b0 = {
  screen: W("screen"), because: W("because"), ends: W("end"), loops: W("loops"), loop9000: W("9,000"),
  gary: W("gary"), second: W("second"), nobody: W("nobody"), kid: W("kid"), time: W("time"),
  narrator: W("and", 1), me: W("me"), read: W("read"), whatever: W("whatever"), tru: W("true"),
  door: W("door"), on: W("on", 0), shoes: W("shoes"), soup: W("soup"),
  so: W("so"), stealing: W("stealing"), captions: W("captions"), keep: W("keep"),
  need: W("need"), word: W("word"), free0: W("free"), sign: W("sign"),
};
const b1 = {
  tIn: after("in", b0.keep + 30), andNever: after("and", b0.word), soThis: after("so", b0.free0),
  iNever: after("i", b0.free0 + 60), leave: W("leave"), resist: after("and", W("leave")), gIn: after("in", W("resist")),
  snatch: W("snatch"), free1: after("free", W("snatch")), out: after("out", W("snatch")), mid: W("mid-sentence"),
  then: W("then"), notice: W("notice"), cant: after("can't", W("notice")), move: W("move"),
  red: after("red", W("move")), p90: W("90%"), p95: W("95%"), p99: W("99"),
  andAt: after("and", W("99")), gary2: after("gary", W("99")), always: W("always"),
  his: after("his", W("always")), jar: after("jar", W("always")), your: after("your", after("jar", W("always")) + 1), help: W("help"), // your = "Your words land...", not "smashes your jar"
};
export const B = {
  ...b0, ...b1,
  tThis: after("this", b1.tIn), tWorld: after("world", b1.tIn), tYoure: after("you're", b1.tIn),
  inThis: after("in", b1.help), youre2: after("you're", b1.help), free: after("free", b1.help),
  youDive: after("you", b1.help + 40), dive: W("dive"), video: after("video", W("dive")), into: W("into"), loopOne: after("one", W("into")),
  end: LAST,
};
/** The quoted line Gary says (and you mouth along with him), start of "Nobody" to the end of "kid". */
const GARY_SAYS: [number, number][] = [[B.nobody - 2, B.kid + 10]];
/** Your one line: "I never want to leave!" */
const YOU_SAY: [number, number][] = [[B.iNever - 2, B.leave + 14]];

// ------------------------------------------------------------------ cast helpers
type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState; sit?: boolean };
/** QA "Reaction timing": a face change lands 0-3 frames before a word start; snap a key to 1 frame before the first
 * word that starts at or after it. */
export const snap = (k: number) => { const w = words.find((x) => Math.round(x.start * FPS) >= k); return w ? Math.round(w.start * FPS) - 1 : k; };
/** Where the tally-wall scene starts: "This is loop 9,000" (after the rewind). */
const T_WALL = W("this", 1);
/** Expression ladder + the R21 performer (every face brings its body); `act` 0 = a body that must not move (frozen). */
const st = (pose: Pose, F: number, seed: number, keys: [number, Expr][], extra: Partial<CharState> = {}, act = 1): CharState => {
  const e = exprAt<Expr>(keys.map(([k, x], i) => [i ? snap(k) : k, x] as [number, Expr]), F, seed);
  return perform({ pose, expr: e.expr, blink: e.blink, fx: {}, ...extra }, F, seed, e, act);
};
const pose = (keys: [number, PoseName | Pose][], F: number, ease = 5): Pose => {
  const P = (k: PoseName | Pose) => (typeof k === "string" ? posed(k, F / FPS) : k);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  // R21: anticipation, overshoot and overlap (arms a frame, head two frames behind the body); hands on arcs.
  const step = (a: Pose, b: Pose, d: number) => movePose(a, b, moveCurve(d, ease), moveCurve(d - 1, ease), moveCurve(d - 2, ease));
  let out = P(keys[i][1]);
  if (i > 0 && F - keys[i][0] < ease + 7) out = step(P(keys[i - 1][1]), out, F - keys[i][0]);
  if (i + 1 < keys.length && keys[i + 1][0] - F <= 3) out = step(out, P(keys[i + 1][1]), F - keys[i + 1][0]);
  return out;
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
/** The bait: you hug the lamp post at s 17 (the street builder's third lamp, x 4.45). */
export const HUG_AT = at(17, 4.45, 0.02).add(new Vector3(0.55, 0, 0.06));
/** Spans where you hold the jar (it is stashed while you bait the narrator and jump for FREE). */
export const holdsJar = (F: number) => (F >= B.keep && F < B.soThis) || (F >= B.mid - 2 && F < B.into);
/** A jump for a caption word: hop height at frame F for a jump that peaks ~10 frames after `F0`. */
const hopAt = (F: number, F0: number) => { const k = F - F0; return k >= -4 && k < 22 ? toss(new Vector3(), new Vector3(), k + 4, { air: 22, height: 0.55, bounces: 1 }).pos.y : 0; };
/** Where you are, section by section (hard cuts hide the jumps between places). */
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
  if (F < B.so) return at(DOOR_S, WALL_X - 0.45, 0.02); // soup shoes, where the door run ended
  if (F < B.keep) return YOU_SPOT.clone().setY(0.02 + hopAt(F, B.captions - 4)); // jump for "captions"
  if (F >= B.iNever - 2 && F < B.resist) return HUG_AT.clone();
  if (F < B.dive) return YOU_SPOT.clone().setY(0.02 + (F < B.mid ? hopAt(F, B.snatch + 2) : 0)); // the last loop, on your chalk X
  // The dive: run at the right edge of the frame and leap.
  const u = (F - B.dive) / (B.into - B.dive), hop = u > 0.55 ? Math.sin(Math.min((u - 0.55) / 0.45, 1) * Math.PI * 0.8) * 0.7 : 0;
  if (F < B.into) return lerpV(YOU_SPOT, at(13.6, 3.2, 0.02), smootherstep(u)).setY(0.02 + hop);
  return PINK_YOU.clone();
};
export const PINK_YOU = at(14, 0.6, 0.0); // the next video (its own scene, so it reuses the street's coordinates)
/** Line 10: how far your right foot is lifted (0..1) as the soup pours out. */
export const soupLift = (F: number) => Math.sin(Math.min(Math.max((F - B.soup + 10) / 30, 0), 1) * Math.PI);
const JUMP = (look = 0.3): Pose => ({ ...POSES.wave, arms: [POSES.wave.arms[0], { at: [0.3, -1.05], grip: "fist" }] as Pose["arms"], look, lift: [30, 30] as [number, number] });
const HOLD_JAR: Pose = { ...POSES.hold, shrug: 6 };
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
      [[0, "pleading"], [B.second, "sad"], [B.nobody, "disgusted"], [B.kid + 4, "deadpan"], [B.time, "tired"]],
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
    const lift = soupLift(F);
    return st({ ...posed("hips", F / FPS), lift: [0, 60 * lift], knee: 18 * lift, sway: -4 * lift }, F, seed,
      [[0, "suspicious"], [B.soup - 2, "disgusted"]], { heading: BACK });
  }
  if (F < B.keep) {
    // Crouch under the captions, scheming; jump and yank "captions" out of the caption on "captions".
    const p = F < B.captions - 8 ? { ...POSES.lean, look: 0.2, tilt: -12 } : F < B.captions + 14 ? JUMP() : posed("hips", F / FPS);
    return st(alive(p, F, seed, [0.2, 0.35]), F, seed, [[0, "sneaky"], [B.stealing, "scheming"], [B.captions, "excited"], [B.captions + 16, "proud"]], { heading: BACK });
  }
  if (F < B.soThis) {
    // The jar: you show off IN THIS WORLD YOU'RE, need one more word, look up at the sign.
    return st(alive(HOLD_JAR, F, seed, F < B.need ? [0.1, -0.2] : [0.4, 0.6]), F, seed,
      [[0, "sneaky"], [B.tIn, "proud"], [B.need, "scheming"], [B.word, "determined"], [B.andNever, "suspicious"]], { heading: BACK });
  }
  if (F < B.iNever - 2) {
    // The bait: arms flung wide, a huge fake grin.
    const wide: Pose = { ...POSES.shrug, arms: [{ at: [0.85, -0.5], grip: "open" }, { at: [0.85, -0.5], grip: "open" }] as Pose["arms"], shrug: 10 };
    const p = pose([[B.soThis, "idle"], [B.sign - 4, wide]], F, 6);
    return st(alive(p, F, seed, [0.5, 0.6]), F, seed, [[0, "sneaky"], [B.sign - 4, "grin"]], { heading: BACK });
  }
  if (F < B.resist) {
    // "I never want to leave!": you hug the lamp post (on your card-left) like family.
    const p: Pose = { ...POSES.idle, arms: [{ at: [0.62, 0.0], grip: "open" }, { at: [-0.45, -0.02], grip: "open", layer: "front" }] as Pose["arms"], tilt: -8, sway: -8, look: -0.4 };
    return st(alive(p, F, seed, [0.2]), F, seed, [[0, "grin"], [B.leave, "laughing"]], { heading: BACK, fx: { talk: talk(F, YOU_SAY), blush: 1 } });
  }
  if (F < B.mid - 2) {
    // He gloats; you crouch, then jump and pull FREE out of his caption mid-sentence.
    const p = F < B.snatch - 4 ? { ...POSES.lean, look: 0.3, tilt: -10 } : F < B.snatch + 18 ? JUMP(0.35) : posed("hips", F / FPS);
    return st(alive(p, F, seed, [0.4, 0.5]), F, seed, [[0, "sneaky"], [B.gIn, "scheming"], [B.snatch, "excited"], [B.free1 + 8, "proud"]], { heading: BACK });
  }
  if (F < FREEZE_AT) {
    // FREE goes in the jar; the sign notices you.
    const p = F < B.then ? HOLD_JAR : pose([[B.then, "hold"], [B.notice, { ...POSES.hold, shrug: 14, bob: -6 }]], F, 4);
    return st(alive(p, F, seed, [0.35, 0.5, 0.2]), F, seed,
      [[0, "excited"], [B.then, "suspicious"], [B.notice, "nervous"]],
      { heading: BACK, fx: { sweat: F >= B.notice ? ((F - B.notice) % 30) / 30 : undefined } });
  }
  if (F < UNFREEZE) {
    // Frozen mid-step on your chalk X, grey; only the eyes move (the bar, the sign, then Gary coming: they scheme).
    const grey = Math.min((F - FREEZE_AT) / 10, 1);
    const darts = F < B.red ? [0.6, 0.2] : F < B.andAt ? [0.9, -0.2, 0.5] : [0.9, 0.7];
    const p = { ...POSES.hold, bob: 0, sway: 0, look: 0, lift: [0, 34] as [number, number], knee: 12 };
    return st(alive(p, F, seed, darts), F, seed, [[0, "nervous"], [B.p99, "pleading"], [B.gary2, "scheming"], [B.jar, "excited"], [B.your, "nervous"]],
      { heading: BACK, fx: { fill: { color: "rgba(150,150,160,0.85)", t: grey } } }, 0);
  }
  if (F < B.dive) {
    const thaw = 1 - Math.min((F - UNFREEZE) / 12, 1);
    return st(alive(pose([[UNFREEZE, "panic"], [B.youDive - 6, "hips"]], F, 4), F, seed, [0, 0.4]), F, seed,
      [[0, "shocked"], [UNFREEZE + 8, "excited"]],
      { heading: BACK, fx: { fill: thaw > 0 ? { color: "rgba(150,150,160,0.85)", t: thaw } : undefined, blush: F >= snap(UNFREEZE + 8) ? 1 : undefined } });
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
const STOP_AT = B.jar - 8; // the climax: he stops beside you, turns, the ladder swings
const garyAt = (F: number): Vector3 => {
  F = worldF(F);
  if (F < T_WALL) return garyWalk(F, 0, 30);
  if (F < B.gary) return at(60, GARY_X, 0.02); // not on the street while you scratch the tally
  if (F < B.narrator) return garyWalk(F, B.gary, 16.0);
  if (F < B.so) return at(DOOR_S + 1.8, GARY_X, 0.02); // behind you at the door, sipping soup
  if (F < B.keep) return garyWalk(F, B.so, 26);
  if (F < B.red) return at(60, GARY_X, 0.02); // off down the street until his usual second comes round
  if (F < STOP_AT) return garyWalk(F, STOP_AT, 12.5);
  if (F < B.into) return at(12.5, GARY_X, 0.02);
  return at(200, 0, 200); // not in the next video (his pigeon twin is)
};
/** How far round Gary has turned at the climax (0 = walking, 1 = facing you): the ladder swings with him. */
const garyTurn = (F: number) => smootherstep((F - STOP_AT) / 14);
const garyState = (F: number): CharState => {
  const seed = 9, Fw = worldF(F);
  const walking = !(F >= B.so - 80 && F < B.so) && !(F >= STOP_AT);
  const d = (GV * Fw) / FPS;
  let p: Pose = walking ? walkPose(d, 1, 0.1) : posed("idle", F / FPS);
  if (F >= B.soup - 20 && F < B.so) p = { ...POSES.eat, look: -0.2 }; // sips his soup
  if (F >= STOP_AT && F < B.dive) p = pose([[STOP_AT, "idle"], [B.jar + 4, "panic"], [B.free + 6, "shrug"]], F, 4);
  if (F >= B.dive) p = { ...POSES.wave, look: -0.3 };
  const keys: [number, Expr][] = [[0, "deadpan"], [B.time, "tired"], [B.soup, "smug"], [B.red, "deadpan"], [B.jar, "shocked"], [B.help, "confused"],
    [B.free + 6, "shocked"], [B.dive, "grin"]];
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
export type World = "street" | "pink";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World; look?: ShotLook; signY?: (F: number) => number };
export const WORLDS: Record<World, { light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  street: { light: "sunset", scene: "street sunset", sun: sunDirection(LIGHTS.sunset, at(0, 0, 1.5), at(30, 0, 1.5)) },
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

// --- 1. Hook: the punch, the loop, loop 9,000.
const A1 = shot("A1-punch", B.because, "street", [YOU], (F) => {
  // MCU, you left of centre so the knocking fist lands on the frame's right edge (the 2D ripple and crack).
  const base = frameOn(YOU_SPOT.clone().setY(0), at(8.6, 2.4), "mcu", { head: 1.7, side: 0.32 });
  return P(base.pos.clone().lerp(base.pos.clone().add(new Vector3(0.05, 0, -0.25)), span(F, 0, B.because)), base.look, base.fov);
}, { dof: () => close(2.3) });
const A2_CAM = (F: number) => lerpPose(P(at(3.0, 1.9, 0.75), at(16, 4.2, 1.6), 46), P(at(4.4, 2.0, 1.2), at(16, 4.2, 1.5), 42), span(worldF(F), A1.frames, REWIND[0]));
const A2 = shot("A2-loop-wide", W("red") - 2, "street", [YOU, GARY], A2_CAM, { wide: true, dof: () => NONE });
/** "...when the red bar hits the end": low on the street, the bar glowing along the bottom; the rewind plays here. */
const A2b = shot("A2b-loop-low", REWIND[1], "street", [YOU, GARY], (F) => P(at(6.2, 1.4, 0.45).lerp(at(6.8, 1.5, 0.5), span(worldF(F), W("red"), REWIND[0])), at(14, 4.0, 1.6), 50),
  { wide: true, dof: () => NONE });
/** The rewind snaps you back to mid-punch: an MCU on your face going shocked -> crying. */
const A3 = shot("A3-snap-back", T_WALL, "street", [YOU], (F) => {
  const base = frameOn(YOU_SPOT.clone().setY(0), at(8.6, 2.4), "mcu", { head: 1.7, side: 0.12 });
  return P(base.pos.clone().lerp(base.pos.clone().add(new Vector3(0, 0, -0.2)), span(F, REWIND[1], T_WALL)), base.look, base.fov);
}, { dof: () => close(2.3) });
const B1 = shot("B1-tally-wall", B.gary, "street", [YOU], (F) => lerpPose(P(at(15.0, 3.4, 1.55), at(17.2, 5.4, 1.4), 44), P(at(14.6, 3.0, 1.65), at(17.2, 5.35, 1.42), 46), span(F, T_WALL, B.gary)),
  { dof: () => mid(3.2) });
// --- 2. Gary, the doubter: same second every loop.
/** Walking toward the lens side by side: the lens backs up at their pace. */
const pair = (F: number) => garyAt(F).clone().lerp(youAt(F), 0.5).setY(1.3);
const C1 = shot("C1-walk-wide", B.nobody - 4, "street", [YOU, GARY], (F) => {
  const m = pair(F), d = 5.4 - 0.4 * span(F, B.gary, B.second + 12);
  return P(m.clone().add(new Vector3(0.1, -0.05, d)), m.clone().setY(1.05), 46);
}, { subject: "gary", dof: () => mid(4.2) });
const C3 = shot("C3-says", B.kid + 14, "street", [YOU, GARY], (F) => {
  const m = pair(F);
  const l = m.clone().lerp(garyAt(F).setY(1.3), 0.15);
  return P(l.clone().add(new Vector3(0.1, -0.05, 4.6)), l.setY(1.25), 46);
}, { subject: "gary", dof: () => mid(2.7) });
const C4 = shot("C4-mouth-along", B.narrator, "street", [YOU, GARY], (F) => {
  const h = head(F, 1.3);
  return P(h.clone().add(new Vector3(-0.4, -0.05, 2.9)), h.clone().setY(1.15), 40);
}, { dof: () => close(1.75) });
// --- 3. The narrator and his rule, shown twice.
export const SIGN_RISE: [number, number] = [B.narrator - 4, B.me - 4];
const D1 = shot("D1-sign-rises", B.read - 2, "street", [YOU, GARY], (F) => lerpPose(P(at(8.5, 4.6, 0.25), at(14.0, 3.2, 2.2), 54), P(at(8.9, 4.6, 0.27), at(14.0, 3.2, 2.25), 52), span(F, B.narrator, B.read)),
  { dof: () => NONE, look: { dim: [[0, 1], [12, 0.82]] } });
const D2 = shot("D2-sign-orbit", B.tru - 8, "street", [YOU, GARY], (F) => {
  const a = -0.5 + 0.45 * span(F, B.read, B.tru), c = SIGN_AT;
  return P(c.clone().add(new Vector3(Math.sin(a) * 9, -3.6, Math.cos(a) * 9)), c.clone().setY(5.2), 44);
}, { subject: undefined, wide: true, dof: () => NONE, look: { dim: [[0, 0.82]] } });
/** "...comes true": closer on the sign as it glows. */
const D3 = shot("D3-sign-true", B.door - 2, "street", [], (F) => P(SIGN_AT.clone().add(new Vector3(-1.2, -2.4, 5.6)).lerp(SIGN_AT.clone().add(new Vector3(-0.9, -2.2, 4.6)), span(F, B.tru - 8, B.door)), SIGN_AT.clone().setY(SIGN_AT.y + 0.3), 44),
  { subject: undefined, wide: true, dof: () => NONE, look: { dim: [[0, 0.82]] } });
const E1_BASE = (F: number) => P(at(17.6, 2.9, 1.25).lerp(at(17.75, 2.95, 1.25), span(F, B.door - 2, B.on)), youAt(F).setY(1.2).lerp(at(DOOR_S, WALL_X, 1.1), 0.45), 52);
const E1 = shot("E1-door", B.on + 24, "street", [YOU, GARY], (F) => impact((f) => E1_BASE(f), B.on, 0.025, 7)(F), { kicks: [[B.on - (B.door - 2), B.on - (B.door - 2) + 7]], dof: () => mid(2.4) });
/** Line 10: you feel the squelch (Gary sips his soup behind you), then a low close-up on your sneaker as it lifts
 * and soup pours over the rim into a puddle, landing on "soup". */
export const SHOE_INSERT: [number, number] = [B.soup - 14, B.so];
const E2 = shot("E2-soup-face", SHOE_INSERT[0], "street", [YOU, GARY], (F) => {
  const y = youAt(F);
  return P(y.clone().add(new Vector3(-0.9, 0.9, 1.7)).lerp(y.clone().add(new Vector3(-0.8, 0.85, 1.5)), span(F, B.on + 24, SHOE_INSERT[0])), y.clone().setY(1.2), 40);
}, { dof: () => close(1.9) });
const E3 = shot("E3-soup-shoe", SHOE_INSERT[1], "street", [YOU], (F) => {
  const y = youAt(F), t = span(F, SHOE_INSERT[0], SHOE_INSERT[1]);
  return P(y.clone().add(new Vector3(0.0, 0.3, 1.0)).lerp(y.clone().add(new Vector3(0.03, 0.27, 0.82)), t), y.clone().add(new Vector3(0.06, 0.04, 0)), 34);
}, { subject: undefined, dof: () => close(0.95) });
// --- 4. Your plan, said plainly: steal caption words; the jar needs FREE.
const F1 = shot("F1-crouch", B.stealing - 2, "street", [YOU], (F) => P(at(10.0, 3.3, 0.75).lerp(at(10.3, 3.35, 0.77), span(F, B.so, B.stealing)), head(F, 1.1), 42), { dof: () => mid(2.2) });
/** Low angle for a caption jump, creeping in. */
const jumpCam = (F: number, a: number, b: number) => P(at(9.6, 3.4, 0.6).lerp(at(10.0, 3.5, 0.62), span(F, a, b)), at(12, 4.0, 1.3), 50);
const F2 = shot("F2-jump-grab", B.keep, "street", [YOU], (F) => jumpCam(F, B.stealing, B.keep), { dof: () => mid(2.6), allow: { "Feet on the ground": "the jump for the caption word" } });
/** Insert on the jar in your hands (the jar is placed against this lens, so aim at your hands, not the jar). */
const jarCam = (F: number, d0: number, d1: number, a: number, b: number) => {
  const h = youAt(F).setY(0.95);
  return P(h.clone().add(new Vector3(-0.08, 0.12, d0)).lerp(h.clone().add(new Vector3(-0.06, 0.1, d1)), span(F, a, b)), h.clone().setY(0.92), 34);
};
const G1 = shot("G1-jar", B.need - 2, "street", [YOU], (F) => jarCam(F, 1.9, 1.4, B.keep, B.need), { subject: undefined, dof: () => close(1.0) });
const G1b = shot("G1b-jar-slot", B.andNever - 2, "street", [YOU], (F) => jarCam(F, 1.15, 0.95, B.need, B.andNever), { subject: undefined, dof: () => close(0.9) });
const eyes = (F: number, d0: number, d1: number, a: number, b: number) => {
  const h = head(F, 1.38);
  return P(h.clone().add(new Vector3(-0.12, -0.04, d0)).lerp(h.clone().add(new Vector3(-0.1, -0.03, d1)), span(F, a, b)), h.clone().setY(h.y - 0.24), 36);
};
/** Low angle on the sign (smug, then gloating: it leans down at you). */
const signLow = (F: number, a: number, b: number, push: number) => P(at(11.2, 2.6, 1.0).lerp(at(11.2 + push, 2.75, 1.25), span(F, a, b)), SIGN_AT.clone().setY(4.6), 40);
const H1 = shot("H1-smug-sign", B.soThis - 2, "street", [], (F) => signLow(F, B.andNever, B.soThis, 0.6), { subject: undefined, wide: true, dof: () => NONE });
// --- 5. The bait.
const I1 = shot("I1-bait-wide", B.iNever - 2, "street", [YOU], (F) => P(at(7.0, 2.6, 0.5).lerp(at(7.6, 2.7, 0.55), span(F, B.soThis, B.iNever)), at(13.4, 3.6, 1.7), 52), { wide: true, dof: () => NONE });
const I2 = shot("I2-hug-post", B.resist - 2, "street", [YOU], (F) => {
  const h = HUG_AT.clone().setY(1.25);
  return P(h.clone().add(new Vector3(-0.2, 0.0, 2.9)).lerp(h.clone().add(new Vector3(-0.15, 0.0, 2.5)), span(F, B.iNever, B.resist)), h.clone().add(new Vector3(-0.16, -0.1, 0)), 42);
}, { dof: () => mid(2.7) });
const J1 = shot("J1-gloat", B.snatch - 4, "street", [], (F) => signLow(F, B.resist, B.snatch, 1.6), { subject: undefined, wide: true, dof: () => NONE });
const K1 = shot("K1-snatch", B.mid - 2, "street", [YOU], (F) => jumpCam(F, B.snatch, B.mid), { dof: () => mid(2.6), allow: { "Feet on the ground": "the jump for FREE" } });
const K2 = shot("K2-jar-full", B.then - 2, "street", [YOU], (F) => jarCam(F, 1.55, 1.3, B.mid, B.then), { subject: undefined, dof: () => close(0.95) });
// --- 6. Setback, the red bar, Gary on time.
/** "Then I notice": close on the sign's eyes as they snap wide and swivel onto you. */
const L1 = shot("L1-sign-eyes", B.notice + 12, "street", [], (F) => {
  const e = SIGN_AT.clone().setY(SIGN_AT.y + 0.85);
  return P(e.clone().add(new Vector3(-0.6, -1.2, 6.4)).lerp(e.clone().add(new Vector3(-0.5, -1.0, 5.4)), span(F, B.then, B.notice + 12)), e.clone().setY(e.y - 0.15), 40);
}, { subject: undefined, wide: true, dof: () => NONE });
const L1b = shot("L1b-caught", B.cant - 2, "street", [YOU], (F) => eyes(F, 3.6, 3.1, B.notice + 12, B.cant), { dof: () => close(2.4) });
const L2 = shot("L2-freeze-arc", B.red - 2, "street", [YOU], (F) => {
  // Arc round the frozen you and pull back to show your feet on the chalk X.
  const a = 0.25 + 0.25 * span(F, B.cant, B.red), h = head(F, 1.25), down = span(F, B.cant + 6, B.red);
  const r = 2.3 + 1.0 * down;
  return P(h.clone().add(new Vector3(Math.sin(a) * r, -0.2 * down, Math.cos(a) * r)), h.clone().setY(1.15 - 0.45 * down), 38 + 8 * down);
}, { dof: () => close(2.3) });
const M1 = shot("M1-bar-wide", B.p95 - 4, "street", [YOU], (F) => P(at(4.6, 0.6, 1.2).lerp(at(5.2, 0.7, 1.2), span(F, B.red, B.p95)), at(13, 3.4, 1.2), 40), { wide: true, dof: () => NONE });
const M2 = shot("M2-eyes-99", B.andAt - 2, "street", [YOU], (F) => eyes(F, 3.2, 2.8, B.p95 - 4, B.andAt), { dof: () => close(2.2) });
const M3 = shot("M3-gary-comes", B.his - 10, "street", [YOU, GARY], (F) => P(at(9.4, 1.6, 0.9).lerp(at(9.6, 1.25, 0.95), span(F, B.andAt, B.his)), at(12.6, 4.2, 1.3), 46), { dof: () => mid(3.2) });
// --- 7. The payoff.
const N1 = shot("N1-ladder-clip", B.your, "street", [YOU, GARY], (F) => P(at(8.0, 3.0, 0.6).lerp(at(8.7, 3.12, 0.66), span(F, B.his, B.your)), at(12.4, 4.6, 1.15), 48),
  { dof: () => mid(3.6), allow: { "Moving props": "the ladder swings past you and clips the jar: the gag" } });
const READ_ALOUD = after("i", B.your + 30);
const O1 = shot("O1-captions-land", READ_ALOUD - 2, "street", [YOU, GARY], (F) => P(at(9.8, 2.8, 1.0).lerp(at(10.3, 2.9, 1.05), span(F, B.your, B.inThis)), SIGN_AT.clone().setY(4.4).lerp(head(F, 1.3), 0.35), 46),
  { subject: undefined, wide: true, dof: () => NONE, allow: { "Moving props": "the dropped ladder and the jar settle beside you after the clip" } });
const O2 = shot("O2-sign-sweats", B.inThis - 4, "street", [], (F) => signLow(F, READ_ALOUD, B.inThis, 1.2), { subject: undefined, wide: true, dof: () => NONE });
const P1 = shot("P1-free", B.youDive - 2, "street", [YOU, GARY], (F) => {
  const h = head(F, 1.3);
  return P(h.clone().add(new Vector3(-0.35, -0.08, 3.3)).lerp(h.clone().add(new Vector3(-0.25, -0.05, 2.7)), span(F, B.inThis, B.free + 10)), h.clone().setY(1.15), 42);
}, { dof: () => close(2.1) });
export const JAR_REST = at(11.2, 3.7, 0.0); // knocked toward the lens, clear of your head card
const Q1 = shot("Q1-dive", B.into, "street", [YOU, GARY], (F) => P(at(16.1, 3.3, 1.2).lerp(at(15.8, 3.25, 1.2), span(F, B.dive, B.into)), at(12.8, 3.3, 1.55), 58), { dof: () => mid(2.6), allow: { "Feet on the ground": "the dive" } });
const R1 = shot("R1-next-video", FRAMES, "pink", [YOU, ...PIGEONS, LADDER_PIGEON], (F) => {
  const h = PINK_YOU.clone().setY(1.35);
  return P(h.clone().add(new Vector3(0.0, -0.1, 3.6)).lerp(h.clone().add(new Vector3(0.05, -0.05, 3.1)), span(F, B.into, FRAMES)), h.clone().setY(1.1), 50);
}, { dof: () => mid(3.2) });

export const SHOTS: S[] = [A1, A2, A2b, A3, B1, C1, C3, C4, D1, D2, D3, E1, E2, E3, F1, F2, G1, G1b, H1, I1, I2, J1, K1, K2, L1, L1b, L2, M1, M2, M3, N1, O1, O2, P1, Q1, R1];
export const PLAN: Plan = { slug: "trapped-in-this-world", shots: SHOTS, words };

// ------------------------------------------------------------------ story props (same pose for render and QA)
/** The sign's height: under the street until it rises (D1), then over it; it sags when it sulks after "free". */
export const signY = (F: number) => (F < SIGN_RISE[0] ? -4 : F < SIGN_RISE[1] ? -4 + (SIGN_AT.y + 4) * smootherstep((F - SIGN_RISE[0]) / (SIGN_RISE[1] - SIGN_RISE[0])) : SIGN_AT.y - (F >= B.free + 20 ? 0.6 * smootherstep((F - B.free - 20) / 20) : 0));
/** Where the jar is at frame F (world), or null; the climax pops it out of your hands. */
const POP = B.jar + 2;
export const jarPose = (F: number, cam: Vector3): { pos: Vector3; spin: number } | null => {
  if (!holdsJar(F)) return null;
  const hand = handWorld(youLook, youState(F).pose, youAt(F), cam, "right", 0.08, youState(F).heading);
  if (F < POP) return { pos: hand.add(new Vector3(0, -0.1, 0)), spin: 0 };
  const t = toss(handWorld(youLook, youState(POP).pose, youAt(POP), cam, "right", 0.08, youState(POP).heading).add(new Vector3(0, -0.1, 0)), JAR_REST, F - POP, { air: 26, height: 0.35, spins: 1, bounces: 3 });
  return { pos: t.pos, spin: t.spin };
};
/** Jar tiles: when each word is in the jar (FREE goes in after the snatch) and when it pops as it is read. */
export const JAR_WORDS: { text: string; from: number; pop: number; until?: number }[] = [
  { text: "IN", from: 0, pop: B.tIn }, { text: "THIS", from: 0, pop: B.tThis }, { text: "WORLD", from: 0, pop: B.tWorld },
  { text: "YOU'RE", from: 0, pop: B.tYoure }, { text: "FREE", from: B.mid - 2, pop: B.mid + 4 },
  { text: "?", from: 0, until: B.mid - 2, pop: B.word },
];
const ladderPose = (o: Object3D, F: number) => {
  if (F >= B.into) return false; // the next video
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
  if (s.w === "street" && s.from >= B.keep - 2 && s.from < B.into)
    out.push({
      // "?" is last in JAR_WORDS: jar() puts it in FREE's slot.
      name: "jar", make: () => jar(JAR_WORDS.map((w) => w.text)), heldBy: "you", hand: "none",
      pose: (o, F) => {
        const lens = s.pose(F - s.from).pos, p = jarPose(F, lens);
        if (!p) return false;
        o.position.copy(p.pos);
        o.rotation.set(0, 0, p.spin);
        poseJarWords(o, F, lens);
        return true;
      },
    });
  return out;
};
/** Show the words that are in the jar at F, each facing the lens; a word pops (scales up) as it is read. */
const poseJarWords = (o: Object3D, F: number, lens: Vector3) => {
  for (const w of JAR_WORDS) {
    const t = o.getObjectByName(`word:${w.text}`);
    if (!t) continue;
    t.visible = F >= w.from && F < Math.min(w.until ?? Infinity, POP + 6);
    const k = F - w.pop, s = k >= -2 && k < 10 ? 1 + 0.45 * Math.sin(((k + 2) / 12) * Math.PI) : 1;
    t.scale.setScalar(s);
    t.lookAt(lens);
  }
};
export { blinkAt };
