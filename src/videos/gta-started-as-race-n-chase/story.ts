import { stampBox } from "../../../kit/toon/Stamp";
import { Object3D, Vector3 } from "three";
import { perform } from "../../../kit/toon/acting";
import { CamPose, glide, impact, smootherstep } from "../../../kit/toon/camera";
import { exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { CaptionWord } from "../../../kit/toon/Captions";
import { EXTRAS } from "../../../kit/toon/extras";
import type { Expr } from "../../../kit/toon/face";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { POSES, actionPose, alive, moveCurve, movePose, posed, reactSquash, walkPose } from "../../../kit/toon/poses";
import type { Pose, PoseName } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import WORDS from "../../../videos/gta-started-as-race-n-chase/voice/words.json";
import { spine } from "../../../kit/toon/build/street";
import { CITY, OFFICE, cancelledCup, cupStack, daveLook, gameBox, lordLook, mikeLook, newspaper, publisherLook, roadAt, stamp, stickyNote, testerLooks, youCop, youRobber } from "./world";
import type { ScreenMode } from "./screen";

/**
 * gta-started-as-race-n-chase (episode 3, strange true history), shot plan. Every beat is locked to words.json
 * (composition frames, 30 fps). Places: the office (1995, night), the game (a top-down toy city), the Lords, a queue
 * outside a games shop. Monitors show the game drawn per frame (screen.ts). Every role goes through kit `perform`.
 */
export const FPS = 30;
export const words: CaptionWord[] = WORDS;
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
export const W = (t: string, n = 0) => {
  const w = words.filter((x) => norm(x.text) === norm(t))[n];
  if (!w) throw new Error(`word "${t}" #${n} not in words.json`);
  return Math.round(w.start * FPS);
};
export const LAST = Math.round(words[words.length - 1].end * FPS);
export const FRAMES = LAST + 8;

export const B = {
  started: W("started"), cop0: W("cop"), and0: W("and"), kill0: W("kill"), bug: W("bug"), grand0: W("grand"), auto0: W("auto"),
  year: W("year"), mike: W("mike"), side: W("side"), then0: W("then"), floor: W("floor"), suddenly: W("suddenly"), down: W("down"),
  boss: W("boss"), lemmings: W("lemmings"), builds: W("builds"), called: W("called"), cop1: W("cop", 2), robbers: W("robbers"),
  n18: W("18"), problem: W("problem"), boring: W("boring"), crashes: W("crashes"), constantly: W("constantly"), shopping: W("shopping"),
  week: W("week"), cancel: W("cancel"), month: W("month"), m20: W("20"), m24: W("24"), legend: W("legend"), brk: W("break"),
  stop: W("stop"), ram: W("ram"), road: W("road"), testers: W("testers"), chase: W("chase", 1), team: W("team"), fun: W("fun"),
  police2: W("police", 2), flip: W("flip"), anymore: W("anymore"), robber: W("robber"), steal: W("steal"), after: W("after"),
  publisher2: W("publisher", 1), cancel2: W("cancel", 1), rnc2: W("race'n'chase", 1), auto2: W("auto", 1), before: W("before"),
  thugs: W("thugs"), parliament: W("parliament"), banning: W("banning"), best: W("best"), had: W("had"), today: W("today"),
  n400: W("400"), copies: W("copies"), cops3: W("cops", 1), still: W("still"), kill2: W("kill", 1),
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

// ------------------------------------------------------------------ the office cast
const SEATED_TYPE: Pose = { ...POSES.idle, arms: [{ at: [0.32, 0.42], grip: "mitt" }, { at: [0.32, 0.42], grip: "mitt" }] }; // hands on the keyboard
const YOU_AT = OFFICE.you;
const youLookAt = (F: number): Look => (F >= B.robber - 3 && F < B.steal ? youRobber : F >= B.anymore - 30 && F < B.robber - 3 ? youCop : youLook);
const youState = (F: number): CharState => {
  const seed = 3;
  if (F < B.year) {
    // Lines 1-3: playing, then shocked as your own cops ram you, then the grin (leans back) on "Grand Theft Auto".
    const p = pose([[0, SEATED_TYPE], [B.kill0 - 4, { ...POSES.panic, bob: 4 }], [B.grand0 - 20, { ...POSES.crossed, sway: -10, tilt: -8 }]], F);
    return st(alive(p, F, seed, [0, 0.2]), F, seed, [[0, "determined"], [B.and0, "confused"], [B.kill0, "shocked"], [B.bug, "suspicious"], [B.grand0 - 20, "excited"]],
      { fx: { ringEyes: F >= B.kill0 && F < B.bug } });
  }
  if (F < B.problem) return st(alive(SEATED_TYPE, F, seed, [-0.4, 0.2]), F, seed, [[0, "neutral"]]);
  if (F < B.week) {
    // Line 9: being the cop is boring (a huge yawn), line 10: it crashes.
    const p = F < B.crashes - 6 ? { ...POSES.idle, arms: [{ at: [0.2, 0.92] }, { at: [-0.12, -0.32], grip: "open", layer: "front" }] as Pose["arms"], tilt: 10, bob: -8 } : pose([[B.crashes - 6, SEATED_TYPE], [B.constantly, POSES.facepalm]], F);
    return st(p, F, seed, [[0, "tired"], [B.boring - 2, "deadpan"], [B.crashes, "shocked"], [B.constantly, "angry"]]);
  }
  if (F < B.legend) {
    // The publisher, the months: worn down, a tower of cups.
    const p = pose([[0, SEATED_TYPE], [B.cancel - 2, { ...POSES.panic, bob: -6 }], [B.month, { ...POSES.idle, tilt: 12, bob: -14 }]], F);
    return st(alive(p, F, seed, [0.5, 0.3]), F, seed, [[0, "nervous"], [B.cancel, "scared"], [B.month, "tired"], [B.m24, "crying"]],
      { fx: { sweat: F >= B.week && F < B.month ? ((F - B.week) % 30) / 30 : undefined } });
  }
  if (F < B.flip) {
    const p = pose([[0, SEATED_TYPE], [B.ram, { ...POSES.panic, bob: 6 }], [B.testers, SEATED_TYPE], [B.team - 4, { ...POSES.idle, look: -0.6 }]], F);
    return st(alive(p, F, seed, F < B.team ? [0, 0.2] : [-0.7, -0.5]), F, seed, [[0, "suspicious"], [B.brk, "shocked"], [B.ram, "scared"], [B.testers, "excited"], [B.team, "confused"], [B.police2, "scheming"]],
      { fx: { ringEyes: F >= B.brk && F < B.brk + 14 } });
  }
  if (F < B.steal) {
    // Line 17: you swap the police cap for a robber's beanie (the look swaps on "robber").
    const p = pose([[0, SEATED_TYPE], [B.robber - 10, { ...POSES.idle, arms: [{ at: [0.35, -0.95], grip: "mitt" }, { at: [0.35, -0.95], grip: "mitt" }] }], [B.robber + 4, { ...POSES.crossed, sway: -6 }]], F);
    return st(p, F, seed, [[0, "excited"], [B.robber, "scheming"]], { fx: { blush: F >= B.robber ? 1 : undefined } });
  }
  if (F < B.cops3) {
    const p = pose([[0, SEATED_TYPE], [B.cancel2 - 6, { ...POSES.crossed }], [B.thugs, POSES.panic], [B.best, SEATED_TYPE]], F);
    return st(alive(p, F, seed, [0.4, 0.2]), F, seed, [[0, "smug"], [B.cancel2, "laughing"], [B.thugs, "shocked"], [B.best, "grin"]]);
  }
  // Line 24: the same pile-up, and you grin.
  const p = pose([[0, SEATED_TYPE], [B.still - 4, { ...POSES.crossed, sway: -8 }]], F);
  return st(p, F, seed, [[0, "excited"], [B.still, "smug"]]);
};
const YOU: Role = { name: "you", look: youLookAt, at: () => YOU_AT.clone(), state: youState, sit: true };

const MIKE_AT = OFFICE.mike;
const mikeState = (F: number): CharState => {
  const seed = 11;
  // Lines 4-5 (1994): Mike pokes at his side-on engine, has the idea, slides the floor in; line 7: Dave's note.
  const p = F < B.then0 ? SEATED_TYPE : F < B.floor + 10 ? pose([[B.then0, { ...POSES.chin }], [B.floor - 12, { ...POSES.point, look: 0 }]], F) : SEATED_TYPE;
  return st(alive(p, F, seed, [0, 0.4, -0.2]), F, seed,
    [[0, "neutral"], [B.mike, "determined"], [B.then0, "confused"], [B.floor - 8, "excited"], [B.boss, "proud"], [B.builds, "excited"], [B.problem, "neutral"], [B.testers, "laughing"], [B.team, "confused"], [B.flip, "excited"]]);
};
const MIKE: Role = { name: "mike", look: mikeLook, at: () => MIKE_AT.clone(), state: mikeState, sit: true };

/** Dave: beside Mike (line 7), at the whiteboard (line 16). */
const DAVE_MIKE = V(-1.95, 0, 0.1), DAVE_BOARD = V(-0.2, 0, -5.35);
const daveAt = (F: number) => (F < B.called ? DAVE_MIKE.clone() : DAVE_BOARD.clone());
const daveState = (F: number): CharState => {
  const seed = 17;
  if (F < B.called) {
    // Leans in to look, then slaps the sticky note on Mike's monitor on "builds".
    const slap: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [-0.5, -0.1], grip: "open" }], lean: 0.4, look: -0.7 };
    const p = pose([[0, { ...POSES.hips, look: -0.6 }], [B.lemmings - 6, { ...POSES.idle, lean: 0.6, look: -0.7 }], [B.builds - 3, slap]], F);
    return st(p, F, seed, [[0, "suspicious"], [B.lemmings, "excited"], [B.builds, "proud"]]);
  }
  // At the board: thinking, then rubs out the cop's hat (line 16).
  const rub = (F - B.fun) / FPS;
  const p = F < B.fun ? posed("chin", F / FPS, 0.6) : { ...POSES.wave, arms: [{ at: [0.55 + 0.12 * Math.sin(rub * 18), -0.45], grip: "open" }, POSES.idle.arms[1]] as Pose["arms"], look: -0.6 };
  return st(p, F, seed, [[0, "confused"], [B.fun, "scheming"], [B.police2, "excited"]]);
};
const DAVE: Role = { name: "dave", look: daveLook, at: daveAt, state: daveState };

/** The publisher: in through the door (line 11), the stamp; back again (line 19), stamping a cup instead. */
const PUB_DOOR0 = V(6.7, 0, -1.8), PUB_DOOR1 = V(5.0, 0, -1.8), PUB_DESK = V(1.05, 0, -0.3);
const pubAt = (F: number) => {
  if (F < B.cancel - 14) return PUB_DOOR0.clone().lerp(PUB_DOOR1, smootherstep(clamp01((F - (B.week - 4)) / 26)));
  if (F < B.month) return PUB_DESK.clone();
  return PUB_DESK.clone();
};
const STAMP_UP: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [0.45, 0.6], grip: "fist" }] }; // held low at the hip: raised, it clipped his head card
const STAMP_DOWN: Pose = { ...POSES.idle, arms: [POSES.idle.arms[0], { at: [-0.1, 0.62], grip: "fist" }], lean: 0.4, bob: -10 };
const pubState = (F: number): CharState => {
  const seed = 23;
  const slamAt = F < B.month ? B.cancel : B.cancel2;
  const p = pose([[0, F < B.cancel - 14 ? walkPose((1.2 * F) / FPS, 1) : STAMP_UP], [slamAt - 4, STAMP_DOWN], [slamAt + 14, STAMP_UP]], F, 3);
  const keys: [number, Expr][] = F < B.month ? [[0, "smug"], [B.cancel, "angry"]] : [[0, "suspicious"], [B.cancel2 - 6, "confused"], [B.cancel2 + 4, "grin"]];
  return st({ ...p, squash: reactSquash(F - slamAt) * 0.6 }, F, seed, keys);
};
const PUB: Role = { name: "publisher", look: publisherLook, at: pubAt, state: pubState };

/** Testers round the test desk (line 15), cheering. */
const TESTERS: Role[] = testerLooks.map((look, i) => ({
  name: `tester${i}`, look, at: () => V(2.35 + i * 0.6, 0, -0.15 + (i % 2) * 0.32),
  state: (F: number) => st(alive(F >= B.testers ? actionPose(i === 1 ? "bang" : "wave", (F + i * 7) / FPS, -0.3) : posed("crossed", F / FPS), F, 31 + i, [-0.3, 0]), F, 31 + i,
    [[0, "neutral"], [B.testers + i * 2, "laughing"], [B.team, "confused"]]),
}));

// ------------------------------------------------------------------ the Lords and the queue
const LORDS: Role[] = [0, 1, 2, 3, 4].map((i) => ({
  name: `lord${i}`, look: lordLook(41 + i), at: () => V(-2.0 + i * 1.0, 0, -0.2 - (i % 2) * 0.3),
  state: (F: number) => st(F >= B.banning - 6 ? actionPose("bang", (F + i * 5) / FPS, 0) : alive(posed("crossed", F / FPS), F, 41 + i, [0]), F, 41 + i, [[0, "angry"], [B.banning - 6, "disgusted"]]),
}));
const at = spine(0).at;
/** Queue spots down the right pavement from the shop door (s 13) to the street's end, clear of the lamps at s 17, 31. */
const QUEUE_S = Array.from({ length: 22 }, (_, i) => 13.4 + i * 1.15).filter((s) => Math.abs(s - 17) > 0.6 && Math.abs(s - 31) > 0.6 && s < 37);
const QUEUE: Role[] = QUEUE_S.map((qs, i) => ({
  name: `queue${i}`, look: { ...EXTRAS[i % EXTRAS.length].look, seed: 60 + i }, at: () => at(qs, 3.85 - 0.6 * (i % 2), 0.02),
  state: (F: number) => st(alive(posed(i % 3 ? "idle" : "crossed", (F + i * 9) / FPS), F, 60 + i, [0.5, 0.2, -0.2]), F, 60 + i, [[0, i % 2 ? "excited" : "grin"]], {}, 0.6),
}));

// ------------------------------------------------------------------ the game: cars in the toy city
/** Lap of the middle block's ring road: position and heading at lap parameter p (1 = one lap). */
const R = roadAt(3); // 6.1 m: the ring road round the middle block
export const lapAt = (p: number): { pos: Vector3; h: number } => {
  const q = ((p % 1) + 1) % 1 * 4, s = R;
  if (q < 1) return { pos: V(-s + 2 * s * q, 0, -s), h: Math.PI / 2 };
  if (q < 2) return { pos: V(s, 0, -s + 2 * s * (q - 1)), h: 0 };
  if (q < 3) return { pos: V(s - 2 * s * (q - 2), 0, s), h: -Math.PI / 2 };
  return { pos: V(-s, 0, s - 2 * s * (q - 3)), h: Math.PI };
};
export type CarSpec = { kind: "police" | "robber"; pos: Vector3; h: number; flash: boolean; you?: boolean; spin?: number; barOff?: number };
/** Every car on the game's streets at frame F (the city's shots draw these). */
export const carsAt = (F: number): CarSpec[] => {
  const t = F / FPS;
  if (F < B.year) {
    // Line 1: your police car chased round the middle block by three police cars.
    const p = t * 0.22;
    return [{ kind: "police", ...lapAt(p), flash: true, you: true }, ...[1, 2, 3].map((i) => ({ kind: "police" as const, ...lapAt(p - i * 0.07), flash: true }))];
  }
  if (F < B.week) {
    // Line 6: traffic; line 10: one police car wobbling like a shopping cart.
    const wob = F >= B.constantly ? { kind: "police" as const, pos: V(-R + 3 * Math.sin(t * 2), 0, -2 + (t - B.constantly / FPS) * 3), h: Math.sin(t * 7) * 0.8 + t * 2.4, flash: false, spin: 1 } : null;
    return [...[0, 1, 2, 3, 4, 5].map((i) => ({ kind: (i % 3 ? "robber" : "police") as "robber" | "police", ...lapAt(t * 0.1 + i / 6), flash: false })), ...(wob ? [wob] : [])];
  }
  if (F < B.fun) {
    // Line 14: they ram you into the corner of a block.
    const k = smootherstep(clamp01((F - (B.stop - 10)) / (B.road + 6 - (B.stop - 10))));
    const you = V(R - 1.2, 0, R - 1.2).lerp(V(R - 2.4, 0, R - 2.0), clamp01((F - B.ram) / 12));
    return [{ kind: "police", pos: you, h: 0.4, flash: true, you: true },
      ...[[-14, 0], [0, -14], [12, 4], [4, 12]].map(([dx, dz], i) => ({ kind: "police" as const, pos: you.clone().add(V(dx * (1 - k) + Math.sign(dx) * 1.3 * k, 0, dz * (1 - k) + Math.sign(dz) * 1.3 * k)), h: Math.atan2(-dx, -dz), flash: true, spin: i }))];
  }
  if (F < B.steal - 3) {
    // Line 17: your light bar pops off and rolls away (barOff = frames since it popped); you are the robber now.
    const p = 0.15 + t * 0.02;
    return [{ kind: F >= B.anymore + 6 ? "robber" : "police", ...lapAt(p), flash: F < B.flip + 10, you: true, barOff: F >= B.flip + 10 ? F - (B.flip + 10) : undefined }];
  }
  // Line 18: you tear away down the long road; police pour after you from every street.
  const k = (F - (B.steal - 3)) / FPS, youZ = 20 - k * 9;
  const out: CarSpec[] = [{ kind: "robber", pos: V(roadAt(3), 0, youZ), h: Math.PI, flash: false, you: true }];
  for (let i = 0; i < 16; i++) {
    const lane = i % 4, delay = 0.25 + Math.floor(i / 4) * 0.35;
    const fromSide = lane === 1 || lane === 2;
    const z = youZ + 4 + delay * 9 + (fromSide ? 0 : lane * 1.5);
    const x = fromSide ? roadAt(3) + (lane === 1 ? -1 : 1) * Math.max(0, 16 - (k - delay) * 14) : roadAt(3) + (lane === 0 ? -0.8 : 0.8);
    if (k > delay - 0.4) out.push({ kind: "police", pos: V(x, 0, z), h: fromSide && Math.abs(x - roadAt(3)) > 0.5 ? (lane === 1 ? Math.PI / 2 : -Math.PI / 2) : Math.PI, flash: true });
  }
  return out;
};

// ------------------------------------------------------------------ monitors: what each screen shows at frame F
export const screenAt = (which: "you" | "mike" | "test", F: number): { mode: ScreenMode; k: number } => {
  if (which === "mike") return F < B.then0 ? { mode: "side", k: 0 } : F < B.suddenly ? { mode: "floor", k: clamp01((F - (B.floor - 30)) / 45) } : { mode: "chase", k: 0 };
  if (which === "test") return { mode: F >= B.testers - 30 && F < B.team ? "testers" : "chase", k: 0 };
  if (F < B.and0) return { mode: "chase", k: 0 };
  if (F < B.bug - 4) return { mode: "pileup", k: clamp01((F - B.and0) / (B.kill0 + 10 - B.and0)) };
  if (F < B.year) return { mode: "bug", k: clamp01((F - (B.bug - 4)) / 8) };
  if (F < B.problem) return { mode: "chase", k: 0 };
  if (F < B.crashes) return { mode: "boring", k: 0 };
  if (F < B.week) return { mode: "crash", k: 0 };
  if (F < B.legend - 10) return { mode: "chase", k: 0 };
  if (F < B.stop) return { mode: "red", k: 0 };
  if (F < B.cops3) return { mode: "chase", k: 0 };
  return { mode: "pileup", k: clamp01((F - B.cops3) / (B.kill2 + 6 - B.cops3)) };
};

// ------------------------------------------------------------------ shots
export type World = "office" | "city" | "lords" | "street";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: World };
export const WORLDS: Record<World, { light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  office: { light: "moonInterior", scene: "office night", sun: V(-0.85, 0.42, 0.3).normalize() },
  city: { light: "day", scene: "the game", sun: V(0.45, 0.85, 0.3).normalize() },
  lords: { light: "sunInterior", scene: "the lords", sun: V(0.3, 0.6, 0.75).normalize() },
  street: { light: "dusk", scene: "street dusk", sun: sunDirection(LIGHTS.dusk, at(0, 0, 1.5), at(30, 0, 1.5)) },
};
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: typeof r.look === "function" ? r.look(from) : r.look, lookAt: typeof r.look === "function" ? r.look : undefined, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Feet on the ground": "seated behind a desk: the card stands sunk so the desk hides the legs", Shadows: "seated: the contact blob is under the floor", "Card penetration": "seated: the sunk card passes through the floor slab" };
let cursor = 0;
const shot = (id: string, to: number, w: World, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof }): S => {
  const from = cursor;
  cursor = to;
  const { dof, ...rest } = o;
  return {
    id: `gta/${id}`, from, frames: to - from, w, scene: WORLDS[w].scene, light: WORLDS[w].light, sun: WORLDS[w].sun,
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: "you",
    allow: roles.some((r) => r.sit) ? SEATED : undefined, ...rest,
  };
};
const close = (d: number) => DOF.closeup(d), mid = (d: number) => DOF.medium(d);
const NONE: Dof = { maxPx: 0, near: 40, far: 80 };
/**
 * A monitor from the owner's seat, a little to the right (R23: the full-frame flat screens read cheap and hid the
 * room): the CRT in its beige case and bezel, the desk, keyboard and lamp below, the room behind. `d` keeps the old
 * push (d0 -> d1: smaller = closer). Over-the-shoulder was tried: a seated card seen from behind fills half the frame.
 */
const screenCam = (scr: Vector3, F: number, a: number, b: number, d0 = 0.95, d1 = 0.8) => {
  const at = (d: number) => scr.clone().add(V(0.36, 0.1, 0.22 + d));
  return P(at(d0).lerp(at(d1), span(F, a, b)), scr.clone().add(V(0.03, -0.03, 0)), 48);
};
/** Your face over the corner of your monitor (from the desk's far side, off to the right). */
const youCam = (F: number, a: number, b: number, push = 0.2) => P(V(1.0, 1.5, -2.9).lerp(V(0.95, 1.48, -2.9 + push), span(F, a, b)), V(0.02, 1.05, YOU_AT.z), 40);
const HEAD = (p: Vector3) => p.clone().setY(1.25);
const cityTop = (F: number, a: number, b: number, h0: number, h1: number, c = V(0, 0, 0)) => P(c.clone().add(V(0, h0, h0 * 0.18)).lerp(c.clone().add(V(0, h1, h1 * 0.18)), span(F, a, b)), c, 40);

// --- lines 1-3
const A1 = shot("A1-game-open", B.started + 6, "city", [], (F) => cityTop(F, 0, B.started + 6, 24, 17, V(0, 0, 0.6)), { subject: undefined, wide: true, dof: () => NONE });
const A2 = shot("A2-your-screen", B.and0, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.started, B.and0), { subject: undefined, dof: () => close(0.9) });
const B1 = shot("B1-you-shock", B.kill0 - 2, "office", [YOU, MIKE], (F) => youCam(F, B.and0, B.kill0), { dof: () => close(1.3) });
const B2 = shot("B2-pileup", B.bug - 6, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.kill0, B.bug, 0.85, 0.7), { subject: undefined, dof: () => close(0.8) });
const B3 = shot("B3-bug", B.grand0 - 20, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.bug, B.grand0, 0.75, 0.95), { subject: undefined, dof: () => close(0.8) });
const B4 = shot("B4-grin", B.year - 2, "office", [YOU, MIKE], (F) => P(V(1.5, 1.6, -3.2).lerp(V(1.3, 1.55, -2.9), span(F, B.grand0 - 20, B.year)), V(0.0, 1.05, -0.4), 46), { dof: () => mid(2.6) });
// --- lines 4-6 (1994)
const C1 = shot("C1-mike-1994", B.side - 8, "office", [MIKE], (F) => P(V(-1.85, 1.5, -2.9).lerp(V(-1.9, 1.48, -2.6), span(F, B.year, B.side)), HEAD(MIKE_AT).setY(1.08), 42), { subject: "mike", dof: () => close(1.4) });
const C2 = shot("C2-side-engine", B.then0, "office", [], (F) => screenCam(OFFICE.mikeScreen, F, B.side - 8, B.then0), { subject: undefined, dof: () => close(0.9) });
const C3 = shot("C3-add-floor", B.suddenly - 4, "office", [], (F) => screenCam(OFFICE.mikeScreen, F, B.then0, B.suddenly, 0.9, 0.72), { subject: undefined, dof: () => close(0.85) });
const D1 = shot("D1-straight-down", B.boss - 4, "city", [], (F) => {
  const t = span(F, B.suddenly - 4, B.down + 8);
  return P(V(0, 12 + 34.5 * t, 30.5 - 23.5 * t), V(0, 0, -4 + 4 * t), 44);
}, { subject: undefined, wide: true, dof: () => NONE });
// --- lines 7-8
const E1 = shot("E1-dave", B.called - 2, "office", [MIKE, DAVE], (F) => P(V(-1.3, 1.55, -3.3).lerp(V(-1.4, 1.52, -3.0), span(F, B.boss, B.called)), V(-2.15, 1.15, 0.0), 46), { subject: "dave", dof: () => mid(1.8) });
const E2 = shot("E2-whiteboard", B.n18 - 6, "office", [], (F) => { const t = span(F, B.called, B.n18); return P(V(-1.15, 1.62, -3.45).lerp(V(-0.6, 1.95, -1.05), t), OFFICE.board.clone().add(V(-0.55 + 0.55 * t, -0.32 + 0.17 * t, 0)), 50); }, { subject: undefined, dof: () => NONE });
const E3 = shot("E3-calendar", B.problem - 6, "office", [], (F) => P(OFFICE.calendar.clone().add(V(0.25, -0.1, 2.1)).lerp(OFFICE.calendar.clone().add(V(0.15, -0.06, 1.75)), span(F, B.n18 - 6, B.problem)), OFFICE.calendar.clone().add(V(0, -0.22, 0)), 44), { subject: undefined, dof: () => NONE });
// --- lines 9-10
const F1 = shot("F1-boring-screen", B.boring - 8, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.problem - 6, B.boring), { subject: undefined, dof: () => close(0.9) });
const F2 = shot("F2-yawn", B.crashes - 2, "office", [YOU, MIKE], (F) => youCam(F, B.boring - 8, B.crashes), { dof: () => close(1.3) });
const F3 = shot("F3-crash", B.shopping - 12, "office", [], (F) => impact((f) => screenCam(OFFICE.yourScreen, f, B.crashes - 2, B.shopping), B.crashes + 2, 0.015, 6)(F), { subject: undefined, kicks: [[4, 10]], dof: () => close(0.9) });
const F4 = shot("F4-shopping-cart", B.week - 2, "city", [], (F) => cityTop(F, B.shopping - 12, B.week, 20, 16, V(-R, 0, 0)), { subject: undefined, wide: true, dof: () => NONE });
// --- lines 11-12
const G1 = shot("G1-door", B.cancel - 14, "office", [PUB], (F) => P(V(2.1, 1.6, 0.6).lerp(V(2.4, 1.6, 0.4), span(F, B.week - 2, B.cancel)), V(5.3, 1.25, -1.95), 44), { subject: "publisher", subjectFrom: 14, dof: () => mid(2.6) });
const G2 = shot("G2-stamp", B.month - 2, "office", [YOU, PUB], (F) => impact((f) => P(V(0.62, 1.6, -3.4).lerp(V(0.66, 1.58, -3.1), span(f, B.cancel - 14, B.month)), V(0.74, 1.05, -0.3), 52), B.cancel, 0.02, 7)(F), { subject: "publisher", kicks: [[14, 21]], dof: () => mid(1.6) });
// Line 12 (R23): the SHIP DATE sheet on the cork board gets struck and rewritten while the clock spins (G3), then
// you, a tower of cups, and "24!!" scrawled on the sheet behind you (G4).
const G3 = shot("G3-deadline", B.m24 - 19, "office", [], (F) => P(V(1.1, 1.8, -0.6).lerp(V(1.0, 1.85, -0.35), span(F, B.month - 2, B.m24 - 19)), V(0.68, 2.15, 2.46), 54), { subject: undefined, dof: () => NONE });
const G4 = shot("G4-cups", B.legend - 22, "office", [YOU, MIKE], (F) => P(V(0.95, 2.05, -2.75).lerp(V(0.85, 2.0, -2.5), span(F, B.m24 - 19, B.legend)), V(0.14, 0.98, 0.6), 56), { dof: () => mid(2.2) });
// --- lines 13-15
const H1 = shot("H1-red-lights", B.stop - 6, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.legend - 22, B.stop, 1.0, 0.7), { subject: undefined, dof: () => close(0.85) });
const H2 = shot("H2-ram", B.testers - 2, "city", [], (F) => impact((f) => cityTop(f, B.stop - 6, B.testers, 22, 18, V(R - 1.8, 0, R + 1.4)), B.ram + 2, 0.03, 7)(F), { subject: undefined, wide: true, kicks: [[B.ram + 2 - (B.stop - 6), B.ram + 9 - (B.stop - 6)]], dof: () => NONE });
const H3 = shot("H3-testers", B.team - 2, "office", TESTERS, (F) => P(V(3.85, 1.6, -2.4).lerp(V(3.7, 1.58, -2.15), span(F, B.testers - 2, B.team)), V(3.15, 1.2, -0.1), 46), { subject: "tester1", dof: () => mid(1.8) });
// --- line 16
const I0 = shot("I0-team-turns", B.fun - 2, "office", [YOU, MIKE, ...TESTERS], (F) => P(V(-0.2, 2.15, -4.5).lerp(V(-0.15, 2.1, -4.2), span(F, B.team - 2, B.fun)), V(0.1, 1.0, -0.3), 46), { wide: true, dof: () => NONE });
const I1 = shot("I1-rub-out", B.flip - 2, "office", [DAVE], (F) => P(V(-0.72, 1.7, -2.2).lerp(V(-0.72, 1.68, -2.45), span(F, B.fun - 2, B.flip)), V(-0.66, 1.3, -5.6), 60), { subject: "dave", dof: () => NONE });
// --- lines 17-18
export const YOUR_CAR = (F: number) => carsAt(F).find((c) => c.you)!.pos;
const J1 = shot("J1-lights-pop", B.robber - 12, "city", [], (F) => { const c = YOUR_CAR(F); return P(c.clone().add(V(-1.0, 5.0, 3.2)), c.clone().add(V(0.4, 0.4, 0)), 40); }, { subject: undefined, wide: true, dof: () => NONE });
const J2 = shot("J2-beanie", B.steal - 2, "office", [YOU, MIKE], (F) => youCam(F, B.robber - 12, B.steal, 0.25), { dof: () => close(1.3) });
const J3 = shot("J3-flood", B.publisher2 - 3, "city", [], (F) => { const c = YOUR_CAR(F), t = span(F, B.steal - 2, B.publisher2); return P(c.clone().add(V(0, 9 + 16 * t, -4 + 7 * t)), c.clone().add(V(0, 0, 4 + 5 * t)), 46); }, { subject: undefined, wide: true, dof: () => NONE, allow: { "Camera curve": "the chase: the lens rides with the getaway car" } });
// --- lines 19-21
const K1 = shot("K1-cup-stamp", B.rnc2 - 2, "office", [YOU, PUB], (F) => P(V(0.62, 1.6, -3.3).lerp(V(0.66, 1.58, -3.0), span(F, B.publisher2 - 3, B.rnc2)), V(0.74, 1.05, -0.3), 52), { subject: "publisher", dof: () => mid(1.6) });
export const BOX_AT = V(0.75, 1.25, -0.45);
const K2 = shot("K2-box", B.before - 2, "office", [], (F) => P(BOX_AT.clone().add(V(0.05, 0.05, 1.9)).lerp(BOX_AT.clone().add(V(0.02, 0.02, 1.55)), span(F, B.rnc2 - 2, B.before)), BOX_AT.clone(), 40), { subject: undefined, dof: () => close(1.0) });
export const PAPER_REST = V(0.55, 0.8, -0.98); // beside the CRT on the papers (it landed under the monitor)
const K3 = shot("K3-newspaper", B.parliament - 2, "office", [], (F) => P(PAPER_REST.clone().add(V(0.4, 1.4, 0.9)).lerp(PAPER_REST.clone().add(V(0.34, 1.27, 0.8)), span(F, B.before - 2, B.parliament)), PAPER_REST.clone().add(V(0.02, 0, 0)), 46), { subject: undefined, dof: () => NONE });
const K4 = shot("K4-lords", B.best - 2, "lords", LORDS, (F) => P(V(0.3, 1.55, 3.4).lerp(V(0.2, 1.5, 2.8), span(F, B.parliament - 2, B.best)), V(0, 1.2, -0.6), 48), { subject: "lord2", dof: () => mid(3.2) });
// --- lines 22-24
const K5 = shot("K5-queue", B.today - 2, "street", QUEUE, (F) => P(at(10.2, 0.2, 1.9).lerp(at(11.2, 0.3, 1.9), span(F, B.best - 2, B.today)), at(21, 3.3, 1.45), 50), { subject: "queue6", wide: true, dof: () => NONE, allow: { "Cast overlap": "a queue seen down its length: heads stack into the distance (the gag is how long it is)" } });
const K6 = shot("K6-billboard", B.cops3 - 2, "city", [], (F) => P(V(-3.2, 17.0, -span3 + 9.0).lerp(V(-2.6, 16.4, -span3 + 7.8), span(F, B.today - 2, B.cops3)), V(0, 12.4, -span3 - 1), 44), { subject: undefined, wide: true, dof: () => NONE });
const L1 = shot("L1-pileup-again", B.still + 2, "office", [], (F) => screenCam(OFFICE.yourScreen, F, B.cops3 - 2, B.still, 0.85, 0.7), { subject: undefined, dof: () => close(0.8) });
const L2 = shot("L2-grin", FRAMES, "office", [YOU, MIKE], (F) => youCam(F, B.still, FRAMES, 0.3), { dof: () => close(1.3) });
const span3 = CITY.block + CITY.road;

export const SHOTS: S[] = [A1, A2, B1, B2, B3, B4, C1, C2, C3, D1, E1, E2, E3, F1, F2, F3, F4, G1, G2, G3, G4, H1, H2, H3, I0, I1, J1, J2, J3, K1, K2, K3, K4, K5, K6, L1, L2];
/** The 2D stamp cards (Video.tsx draws them; QA checks they never cover a face). `top` clears the heads below. */
export const STAMPS = [
  { text: "DUNDEE, 1995", at: B.started + 8, hold: 46, top: "18%" },
  { text: "1994", at: B.year - 2, hold: 60, top: "9%" },
  { text: "1997", at: B.rnc2, hold: 60, top: "6%" },
];
export const PLAN: Plan = { slug: "gta-started-as-race-n-chase", shots: SHOTS, words, overlays: STAMPS.map((x) => stampBox(x.text, x.at, x.hold, x.top)) };

// ------------------------------------------------------------------ office story props (same pose for render and QA)
/** The sticky note slapped onto Mike's monitor (line 7). */
const notePose = (o: Object3D, F: number) => {
  if (F < B.builds) return false;
  o.position.copy(OFFICE.mikeScreen).add(V(0.17, 0.1, 0.03));
  o.rotation.set(0, 0, 0.12);
  const k = F - B.builds;
  o.scale.setScalar(k < 4 ? 1.3 - 0.3 * (k / 4) : 1);
  return true;
};
/** The publisher's stamp: in his right hand (line 11 and 19). */
const stampPose = (s: S) => (o: Object3D, F: number) => {
  if (F < B.week - 4 || (F >= B.month && F < B.publisher2 - 4) || F >= B.rnc2) return false;
  const lens = s.pose(F - s.from).pos;
  o.position.copy(handWorld(publisherLook, pubState(F).pose, pubAt(F), lens, "right", 0.06)).add(V(0, -0.02, 0));
  o.rotation.set(Math.PI, 0, 0);
  return true;
};
/** Line 12: the tower of coffee cups on your desk (it grows with the months). */
const cupsPose = (o: Object3D, F: number) => {
  if (F < B.month - 30 || F >= B.legend) return false;
  o.position.set(0.48, 0.77, -0.75);
  const n = 3 + Math.floor(11 * clamp01((F - B.month) / (B.m24 + 10 - B.month)));
  o.children.forEach((c, i) => (c.visible = i < n));
  return true;
};
/** Line 19: the cup he stamps CANCELLED instead of the game. */
const cupPose = (o: Object3D, F: number) => {
  if (F < B.publisher2 - 4 || F >= B.rnc2) return false;
  o.position.set(0.62, 0.83, -0.68);
  const mark = o.getObjectByName("mark");
  if (mark) mark.visible = F >= B.cancel2 + 2;
  return true;
};
/** Line 20: our box art spins up to the lens. */
const boxPose = (o: Object3D, F: number) => {
  if (F < B.rnc2 - 2 || F >= B.before - 2) return false;
  o.position.copy(BOX_AT);
  o.rotation.set(0.05, Math.PI * 2 * (1 - smootherstep(clamp01((F - B.rnc2) / 26))), 0);
  return true;
};
/** Line 21: the newspaper drops onto your desk and slaps flat on "thugs". */
const paperPose = (o: Object3D, F: number) => {
  // Thrown in from off-frame left on "thugs" (R23: hanging 0.45 m over the desk for 2 s, or dropping past the lens).
  if (F < B.thugs - 16 || F >= B.parliament) return false;
  const t = toss(PAPER_REST.clone().add(V(-0.95, 0.3, 0.05)), PAPER_REST, F - (B.thugs - 16), { air: 16, height: 0.25, bounces: 1 });
  o.position.copy(t.pos);
  o.rotation.set(-Math.PI / 2, 0, 0.12);
  return true;
};
/** Line 12: the SHIP DATE sheet's marker strokes (0..1 each), timed to "goes", "20" and "24". */
export const deadlineAt = (F: number) => ({
  strike18: clamp01((F - (B.month + 34)) / 8), write20: clamp01((F - (B.m20 - 8)) / 10),
  strike20: clamp01((F - (B.m24 - 16)) / 8), write24: clamp01((F - (B.m24 - 5)) / 10),
});
/** The wall clock (turns): normal time, a time-lapse spin through line 12, then it keeps the hour it reached. */
export const clockAt = (F: number) => {
  const t = Math.min(Math.max(F - (B.month - 4), 0), B.legend - (B.month - 4));
  return { hour: 0.35 + t / 110, minute: 0.1 + t / 9 + F / 54000 };
};
export const propsFor = (s: S): MovingProp[] => {
  if (s.w !== "office") return [];
  const out: MovingProp[] = [
    { name: "note", make: stickyNote, pose: notePose, touches: ["desk 2", "monitor"] },
    { name: "cups", make: cupStack, pose: cupsPose, touches: ["desk 1"] },
    { name: "cup", make: cancelledCup, pose: cupPose, touches: ["desk 1"] },
    { name: "box", make: gameBox, pose: boxPose },
    { name: "paper", make: newspaper, pose: paperPose, touches: ["desk 1"] },
  ];
  if (s.cast?.some((c) => c.name === "publisher")) out.push({ name: "stamp", make: stamp, pose: stampPose(s), heldBy: "publisher", hand: "right", touches: ["desk 1"] });
  return out;
};
/** The whiteboard's cop loses his hat on "police" (line 16). */
export const boardHatless = (F: number) => F >= B.police2 - 4;
export { R as RING };
