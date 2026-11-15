import { Vector3 } from "three";
import { CamPose, ShotSize, arc, drift, frameOn, impact, pullOut, pushIn, reframe, shot, smootherstep, telephoto } from "../../../kit/toon/camera";
import { actionPose, blinkAt, posed, reactSquash, walkPose } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { DOF, Dof, POST } from "../../../kit/toon/Composer";
import type { Look as ShotLook } from "../../../kit/toon/grade";
import { laughFlap, talkAt } from "../../../kit/toon/face";
import type { Expr, MouthFrame } from "../../../kit/toon/face";
import MOUTH from "../../../videos/zombie-supermarket-30-days/voice/mouth.json";
import { headHeight } from "../../../kit/toon/figure";
import type { CastSpec, Plan, Shot } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import type { PresetName } from "../../../kit/toon/build/presets";
import { POSES, blendPose, fidget } from "../../../kit/toon/poses";
import { act, actingKeys } from "../../../kit/toon/acting";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { CART_IN, CHAD, CHAD_DOOR, CHAD_ROOF, CHART_AT, DOCK, FLOODS, FRONT, GENERATOR, GRILL, HEAP, IN, PALLET, RAMP_TOP, ROOF_Y, SHUTTER_AT, WINDOW_SPOT, at } from "./build";
import { BEAT, CART_RUN, FPS, LAST, LEAD, cartAt, chadLook, chadPyjamas, daveLook, exprAt, words } from "./roles";

/**
 * Shot plan v2 for zombie-supermarket-30-days (80.8 s), rebuilt after the critique (2026-11-13): shoot the GAG on its
 * word, close (MCU/CU, the face carries the joke), 1-3 s per shot, cut on the punch word, real fast moves in the
 * climax. Every shot is its own canvas; a shot that starts before the previous one ends dissolves in over XF frames.
 *   ext-day / ext-dawn  the main street (FRESHMART left, CHAD'S HARDWARE right), the horde as an instanced crowd
 *   int-day / int-night the supermarket inside (windows show the street across)
 * Characters are placed by COMPOSITION frame (continuity across cuts); shots convert to shot-local frames.
 */
export const XF = 10;
const wordsStart = (t: string, n: number) => {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
  const w = words.filter((x) => norm(x.text) === t)[n];
  if (!w) throw new Error(`word ${t} #${n}`);
  return Math.round(w.start * FPS);
};
const W_ = {
  batteries: wordsStart("batteries", 0), talking: wordsStart("talking", 0), chad1: wordsStart("chad", 0), he: wordsStart("he", 0),
  eating: wordsStart("eating", 0), winning: wordsStart("winning", 0), cart: wordsStart("cart", 0), daveAsks: wordsStart("dave", 3),
  onDay30: wordsStart("on", 5), youSee: wordsStart("you", 8), thirty: wordsStart("30", 1),
};
/** Expression-ladder steps land on words (QA "Reaction timing"): the start of the first word at or after F. */
const onWord = (F: number) => {
  const w = words.find((x) => Math.round(x.start * FPS) >= F);
  return w ? Math.round(w.start * FPS) : F;
};
const wordEnd = (t: string, n: number) => {
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9']/g, "");
  return Math.round(words.filter((x) => norm(x.text) === t)[n].end * FPS);
};
/** Lip sync (R13): the words each on-screen character speaks, composition frames. */
const MOUTH_T = MOUTH as MouthFrame[];
const SPEAKS = { chadMorning: [[BEAT.morning - LEAD, wordEnd("boy", 0) + 2]] as [number, number][] };
export const FRAMES = LAST + 6; // house rule (scripts/audio/events.py "auto")

export type World = "ext-day" | "ext-dawn" | "int-day" | "int-night";
export const WORLD: Record<World, { preset: PresetName; light: keyof typeof LIGHTS; scene: string; sun: Vector3 }> = {
  "ext-day": { preset: "modern_main_street", light: "day", scene: "street day", sun: sunDirection(LIGHTS.day, at(32, -2, 1.6), at(32, 8, 3)) },
  // Dawn: the low sun from behind the supermarket, raking warm across Chad's front (critique: backlit dawn turned the
  // whole street violet). az 150 = behind and to the right of a lens looking across at Chad's.
  "ext-dawn": { preset: "modern_main_street", light: "dawn", scene: "street dawn", sun: sunDirection({ ...LIGHTS.dawn, az: 150, el: 14 }, at(32, -2, 1.6), at(32, 8, 3)) },
  "int-day": { preset: "supermarket_dark_day", light: "sunInterior", scene: "store day", sun: new Vector3(0.3, Math.sin((26 * Math.PI) / 180), 1).normalize() },
  "int-night": { preset: "supermarket_abandoned", light: "moonInterior", scene: "store night", sun: new Vector3(0.25, Math.sin((24 * Math.PI) / 180), 1).normalize() },
};

export type S = Shot & { from: number; frames: number; dof: Dof; w: World; look?: ShotLook; crowd?: boolean; cartClear?: number; motes?: { center: Vector3; size: Vector3; color: string } };

// ---------------------------------------------------------------- helpers

const H = (look: Look) => headHeight(look) + 0.17;
/** frameOn with the character's own head height (frameOn handles characters standing above the ground). */
const fo = (pos: Vector3, from: Vector3, size: ShotSize, look: Look = youLook, o: Parameters<typeof frameOn>[3] = {}) => frameOn(pos, from, size, { head: H(look), ...o });
/** A hold: a barely-there push (refs hold still on beats, then move fast). */
// R14 measured bar: refs keep the camera travelling (still frames 7-8 %, ours were 12.9 %): every hold pushes >= 22 % (10 % moved the measured still share only 12.9 -> 11.8 %).
const creep = (p: { pos: Vector3; look: Vector3; fov: number }, frames: number, k = 0.1, exact = false) =>
  shot(p, [pushIn((exact ? k : Math.max(k, 0.22)) * p.pos.distanceTo(p.look)), drift(0.03 * p.pos.distanceTo(p.look))], frames);
const tele = (from: Vector3, who: Vector3, look: Look, span: number) => telephoto(from, who, H(look), span);
type Role = { name: string; look: Look; at: (F: number) => Vector3; state: (F: number) => CharState };
const inShot = (from: number, roles: Role[]): CastSpec[] => roles.map((r) => ({ name: r.name, look: r.look, at: (f) => r.at(f + from), state: (f) => r.state(f + from) }));
const still = (p: Vector3) => () => p;
// R15 acting layer (kit/toon/acting.ts): every role moves pose-to-pose on the stressed words, not just a face swap.
const ACT_KEYS = actingKeys(words);
const st = (pose: Pose, expr: Expr, F: number, seed: number, extra: Partial<CharState> = {}): CharState => ({ pose: act(fidget(pose, F, seed, !!extra.prop), F, ACT_KEYS, seed, { hasProp: !!extra.prop }), expr, blink: blinkAt(F, FPS, seed), fx: {}, ...extra });
const withSquash = (p: Pose, squash: number): Pose => ({ ...p, squash });
const shake = impact;
/** A smooth jolt (a damped wobble, not impact()'s every-frame flip): stays under the guard's acceleration cap. */
const jolt = (pose: (f: number) => CamPose, at: number, amp = 0.03, len = 14) => (f: number): CamPose => {
  const p = pose(f), k = f - at, d = k >= 0 && k < len ? amp * Math.sin(k * 0.9) * (1 - k / len) ** 2 : 0;
  return { ...p, pos: p.pos.clone().add(new Vector3(d, 0.6 * d, 0)), look: p.look.clone().add(new Vector3(d, 0.6 * d, 0)) };
};

// ---------------------------------------------------------------- roles (composition frames)

const youHeap: Role = {
  name: "you", look: youLook, at: still(HEAP),
  state: (F) => {
    const e = exprAt([[0, "determined"], [W_.batteries, "smirk"], [onWord(W_.batteries + 10), "sneaky"], [BEAT.laughs, "confused"], [onWord(BEAT.laughs + 6), "angry"]], F);
    return st(withSquash(posed("hold", F / FPS, 0.2), e.squash), e.expr, F, 1);
  },
};
/**
 * Chad's megaphone poses (props.ts puts the megaphone in his RIGHT hand): never across the chest or face, or the
 * megaphone cuts through his head card. low = hanging at his side, up = raised out to the side, mouth = beside his mouth.
 */
const MEGA: Record<"low" | "up" | "mouth", Pose["arms"]> = {
  low: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.3, 0.86], grip: "fist" }],
  up: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.78, -0.25], grip: "fist" }],
  mouth: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.64, -0.12], grip: "fist" }],
};
const chadPose = (arms: keyof typeof MEGA, F: number, extra: Partial<Pose> = {}): Pose => ({ ...posed("hips", F / FPS, -0.2), arms: MEGA[arms], ...extra });
const chadMock: Role = {
  name: "chad", look: chadLook, at: still(CHAD_ROOF),
  state: (F) => {
    const e = exprAt([[0, "smug"], [BEAT.laughs, "laughing"], [BEAT.that, "smirk"], [BEAT.megaphone, "grin"]], F);
    // Arm changes ease over 4 frames (review M8: the megaphone arm snapped in one frame at f398).
    const keys: [number, keyof typeof MEGA][] = [[0, "low"], [BEAT.laughs - LEAD, "up"], [BEAT.that, "low"], [BEAT.megaphone - LEAD - 4, "up"]];
    let k = 0;
    while (k + 1 < keys.length && keys[k + 1][0] <= F) k++;
    const cur = chadPose(keys[k][1], F), t = k > 0 ? (F - keys[k][0]) / 4 : 1;
    const pose = t >= 1 ? cur : blendPose(chadPose(keys[k - 1][1], F), cur, t);
    return st(withSquash(pose, e.squash), e.expr, F, 7, { blink: false, fx: { talk: laughFlap(F, BEAT.laughs - LEAD) } });
  },
};
const YOU_SHUTTER = at(CHAD.s + 0.95, FRONT - 0.75, 0.02);
const youKnock: Role = {
  name: "you", look: youLook, at: still(YOU_SHUTTER),
  state: (F) => {
    const e = exprAt([[0, "relieved"], [BEAT.members, "confused"], [BEAT.only, "shocked"], [onWord(BEAT.only + 6), "scared"], [onWord(BEAT.so + 4), "deadpan"]], F);
    const knocking = F >= BEAT.knocked - LEAD && F < W_.he - 4;
    // R14: the raps are locked to the knock_steel hits (knocked - 2, knocked + 7): fist out on contact, back between.
    const rap = Math.max(...[BEAT.knocked - 2, BEAT.knocked + 7].map((h) => Math.max(0, 1 - Math.abs(F - h) / 4)));
    const kp = POSES.knock, pose = knocking ? { ...kp, look: -0.6, arms: [kp.arms[0], { ...kp.arms[1], at: [0.3 + 0.14 * rap, 0.08 - 0.04 * rap] }] as Pose["arms"], bob: 3 * rap } : posed("idle", F / FPS, -0.6);
    // On "only" the slam blows your fringe back: a big squash, ring eyes, the "!" pop.
    return st(withSquash(pose, e.squash || reactSquash(F - BEAT.only + LEAD) * 1.6), e.expr, F, 2, { fx: F >= BEAT.only - LEAD ? { ringEyes: true, bang: F - BEAT.only + LEAD } : {} });
  },
};
const YOU_PALLET = PALLET.clone().add(new Vector3(-0.75, 0, 1.25)), DAVE_PALLET = PALLET.clone().add(new Vector3(0.55, 0, 1.15));
/** Eating beans off your pinky (review r2/r3 C2: the kit "eat" pose was too small to read): the can comes up beside
 * your chin, the pinky dips into it and back to your mouth on a ~0.8 s loop. */
const pinkyEat = (F: number, look: number, phase: number): Pose => {
  const p = posed("eat", F / FPS, look), k = 0.5 + 0.5 * Math.sin(((F + phase) / FPS) * Math.PI * 2.4);
  return { ...p, arms: [{ at: [0.32, 0.18], grip: "mitt" }, { at: [-0.3 + 0.12 * k, -0.28 + 0.34 * k], grip: "point", layer: "front" }] }; // x inward = toward the mouth
};
const youBeans: Role = {
  name: "you", look: youLook, at: still(YOU_PALLET),
  state: (F) => st(F >= W_.eating - LEAD ? pinkyEat(F, 0.3, 0) : posed("hold", F / FPS, 0.3), F < BEAT.silence - LEAD ? "tired" : "deadpan", F, 3, { prop: "can" }),
};
const daveBeans: Role = { name: "dave", look: daveLook, at: still(DAVE_PALLET), state: (F) => st(F >= W_.eating + 10 ? pinkyEat(F, -0.3, 11) : posed("hold", F / FPS, -0.3), F < BEAT.silence - LEAD ? "worried" : "sad", F, 4, { prop: "can" }) };
const chadMorning: Role = {
  name: "chad", look: chadLook, at: still(CHAD_ROOF),
  state: (F) => {
    const e = exprAt([[0, "smug"], [BEAT.morning, "laughing"], [BEAT.heads, "smirk"], [BEAT.give, "laughing"]], F);
    const dance = F >= BEAT.heads && F < BEAT.dave ? Math.sin((F / FPS) * Math.PI * 4) * 6 : 0;
    const pose = F < BEAT.grabs ? chadPose("low", F) : F < BEAT.heads ? chadPose("mouth", F) : chadPose("up", F, { sway: dance });
    return st(withSquash(pose, e.squash), e.expr, F, 7, { blink: false, fx: { talk: talkAt(MOUTH_T, F, SPEAKS.chadMorning) ?? laughFlap(F, BEAT.give - LEAD) } });
  },
};
const CHAD_GRILL = at(CHAD.s - 0.15, FRONT + 1.15, ROOF_Y); // clear of the edge wire (his shins were in the coil)
const chadGrill: Role = {
  name: "chad", look: chadLook, at: still(CHAD_GRILL),
  // Flipping a fat steak with a spatula (right hand), floodlights on, grinning: he is winning.
  state: (F) => st(chadPose("mouth", F, { arms: [{ at: [0.2, 0.58], grip: "fist" }, { at: [0.55 + 0.08 * Math.sin(F * 0.5), 0.2], grip: "fist" }] }), F < W_.winning - LEAD ? "smirk" : "grin", F, 7, { blink: false }),
};
const YOU_WIN = WINDOW_SPOT.clone().add(new Vector3(-1.3, 0, -0.6)), DAVE_WIN = WINDOW_SPOT.clone();
const daveWindow: Role = {
  name: "dave", look: daveLook, at: still(DAVE_WIN),
  state: (F) => {
    const e = exprAt([[0, "worried"], [BEAT.daveMight, "sad"], [onWord(BEAT.daveMight + 8), "worried"], [BEAT.asks, "confused"]], F);
    return st(withSquash(posed("hold", F / FPS, F < BEAT.right ? 0.8 : -0.7), e.squash), e.expr, F, 4, { prop: "can" });
  },
};
const youWindow: Role = {
  name: "you", look: youLook, at: still(YOU_WIN),
  state: (F) => {
    const e = exprAt([[0, "tired"], [BEAT.point, "smirk"]], F);
    return st(withSquash(posed(F >= BEAT.point - LEAD ? "point" : "hold", F / FPS, 0.6), e.squash), e.expr, F, 3, { prop: F < BEAT.point - LEAD ? "can" : undefined });
  },
};
const YOU_CART = CART_IN.clone().add(new Vector3(0.95, 0, -0.65));
const youTape: Role = {
  name: "you", look: youLook, at: still(YOU_CART),
  // Taping: the arm pulls strips across (actionPose "tape"), then hands on hips and a grin on "hedgehog".
  state: (F) => {
    const e = exprAt([[0, "determined"], [BEAT.hedgehog, "grin"]], F);
    // R14 (tape_rip SFX with no picture): each rip (tape - 28, tape) is the end of a pull, then the strip slaps down
    // onto the toys (hand drops, squash) and the hand comes back to the roll.
    const pull = (rip: number) => {
      const d = F - rip, k = (a: number, b: number) => smootherstep(Math.min(Math.max((d - a) / (b - a), 0), 1));
      return { out: k(-12, 0) * (1 - k(8, 16)), slap: k(1, 5) * (1 - k(8, 16)) };
    };
    const a = pull(BEAT.tape - 28), b = pull(BEAT.tape), out = Math.max(a.out, b.out), slap = Math.max(a.slap, b.slap);
    const base = POSES.tape;
    const taping: Pose = { ...base, look: -0.5, arms: [base.arms[0], { ...base.arms[1], at: [0.05 + 0.5 * out - 0.1 * slap, 0.36 + 0.22 * slap] }], lean: 0.4 + 0.3 * slap };
    const slapSq = reactSquash(F - BEAT.tape - 3) + reactSquash(F - BEAT.tape + 25);
    return st(withSquash(F < BEAT.hedgehog - LEAD ? taping : posed("hips", F / FPS, -0.5), e.squash || slapSq * 0.6), e.expr, F, 3, F < BEAT.hedgehog - LEAD ? { prop: "tape" } : {});
  },
};
const YOU_DINO = CART_IN.clone().add(new Vector3(-1.0, 0, -0.2)), DAVE_DINO = CART_IN.clone().add(new Vector3(-0.75, 0, 1.25));
const youDino: Role = {
  name: "you", look: youLook, at: still(YOU_DINO),
  // R14 (battery SFX with no picture): the right hand waits out to the side with the battery, slides it to the hatch on
  // "battery" (battery_slide), creeps in through "very, very" and pushes home on the click (gently + 8).
  state: (F) => {
    const p = posed("hold", F / FPS, 0.2), click = BEAT.gently + 8; // plastic_click lead -8 = 8 f after the word
    const k = (a: number, b: number) => smootherstep(Math.min(Math.max((F - a) / (b - a), 0), 1));
    const slide = k(BEAT.battery - 8, BEAT.battery + 2), creep = k(BEAT.battery + 6, click - 2), push = k(click - 2, click) * (1 - 0.4 * k(click + 2, click + 10));
    const shake = 0.012 * Math.sin(F * 1.9) * (1 - push); // nervous hand
    const x = 0.52 - 0.34 * slide - 0.12 * creep - 0.1 * push, y = 0.22 + 0.16 * slide + 0.06 * creep + 0.04 * push + shake;
    const arms: Pose["arms"] = [p.arms[0], { ...p.arms[1], at: [x, y], grip: "mitt" }];
    const e = { expr: (F < BEAT.very - LEAD ? "worried" : F < BEAT.gently - LEAD ? "scared" : "relieved") as Expr, squash: 0 };
    return st(withSquash({ ...p, arms }, reactSquash(F - click) * 0.8), e.expr, F, 3, { fx: { sweat: Math.min(Math.max((F - BEAT.battery) / 40, 0), 1) } });
  },
};
const daveTorch: Role = { name: "dave", look: daveLook, at: still(DAVE_DINO), state: (F) => st(posed("hold", F / FPS, -0.6), "scared", F, 4, { prop: "flashlight" }) };
const chadWake: Role = {
  name: "chad", look: chadPyjamas, at: still(CHAD_DOOR),
  state: (F) => {
    const e = exprAt([[0, "tired"], [onWord(BEAT.up - 16), "confused"], [BEAT.up, "shocked"], [onWord(BEAT.up + 8), "scared"]], F);
    return st(withSquash(posed(F < BEAT.up - LEAD ? "hold" : "panic", F / FPS, 0), e.squash), e.expr, F, 7, { fx: F >= BEAT.up - LEAD ? { ringEyes: true, bang: F - BEAT.up + LEAD, sweat: 0.6 } : {} });
  },
};
// R14 B26 (the kick never touched the cart): the cart-side foot (lift[0], negative reach = screen-right at look 0.8) winds back, swings out
// and meets the cart on the kick_cart SFX (kick - 2), then follows through as the cart starts to roll (kick + 2).
const YOU_KICK = at(DOCK.s - 1.0, -FRONT + 0.4, DOCK.floor);
const kickAt = (F: number): Pose => {
  const k = F - (BEAT.kick - 2), ease = (a: number, b: number, x: number) => smootherstep(Math.min(Math.max((x - a) / (b - a), 0), 1));
  const back = ease(-12, -4, k) * (1 - ease(-4, 0, k)), out = ease(-4, 0, k), settle = ease(6, 14, k);
  return { ...POSES.kick, look: 0.8, lift: [(30 * back + 55 * out) * (1 - settle), 0], reach: (14 * back - 95 * out) * (1 - settle), sway: -7 * out + 4 * back, knee: 20 };
};
const youKick: Role = {
  name: "you", look: youLook, at: still(YOU_KICK),
  state: (F) => {
    const kicking = F >= BEAT.kick - 14 && F < BEAT.kick + 12;
    return st(withSquash(kicking ? kickAt(F) : posed("hips", F / FPS, 0.8), reactSquash(F - BEAT.kick + 2)), F < BEAT.kick - LEAD ? "smirk" : "determined", F, 3);
  },
};
const chadRoofEnd: Role = {
  name: "chad", look: chadPyjamas, at: still(CHAD_ROOF),
  state: (F) => {
    const late = F >= W_.thirty - 6;
    const tremble = late ? 0 : Math.sin(F * 0.8) * 2.5;
    const q = late ? 0 : 0.035 * Math.sin(F * 2.3); // the megaphone shakes in his hands (pack gag; review r3: a 3 s frozen hold)
    const arms: Pose["arms"] = [{ at: [0.2 + q, 0.92 - q] }, { at: [-0.24 - q, 0.5 + q], grip: "mitt" }];
    // R14 (one face for 2 s): a word-synced ladder on the roof: scared on "roof", worried on "still", a scared clutch on "megaphone".
    const early = exprAt([[0, "scared"], [onWord(BEAT.roof + 10), "worried"], [BEAT.megaphone2, "scared"]], F);
    return st(withSquash({ ...posed("hold", F / FPS, -0.1), arms, sway: tremble }, late ? 0 : early.squash), F >= BEAT.doesnt - LEAD ? "worried" : late ? "shocked" : early.expr, F, 7, { fx: { ringEyes: late, sweat: late ? 0.35 + 0.65 * Math.min((F - W_.thirty) / 60, 1) : (F % 45) / 45 } });
  },
};
// The payoff two-shot: you and Dave in the empty street, Chad's shop stuffed with zombies behind you; you wave up at him.
const YOU_END = at(31.0, 0.9, 0.0), DAVE_END = at(32.4, 1.7, 0.0);
// Review C3: the kit wave (x 0.55) hid the hand behind your big head. Arm 1 (screen right), hand out past the head.
const youWave: Role = {
  name: "you", look: youLook, at: still(YOU_END),
  state: (F) => {
    const p = actionPose("wave", F / FPS, 0.5), s = Math.sin((F / FPS) * Math.PI * 4);
    const e = exprAt([[0, "smirk"], [onWord(BEAT.but + 10), "relieved"], [BEAT.thirty, "grin"]], F); // R14 ladder
    return st(withSquash({ ...p, arms: [{ at: [0.4 + 0.12 * s, -1.0], grip: "open", layer: "front" }, p.arms![1]] }, e.squash), e.expr, F, 3); // review r3: the right hand vanished against the dark zombie-stuffed window; wave on the bright yellow-wall side
  },
};
const daveEnd: Role = { name: "dave", look: daveLook, at: still(DAVE_END), state: (F) => st(posed("hold", F / FPS, 0.6), F < onWord(BEAT.but + 10) - LEAD ? "worried" : "grin", F, 4, { prop: "can" }) };

// ---------------------------------------------------------------- shots

const ROOF_HEAD = CHAD_ROOF.clone().setY(CHAD_ROOF.y + H(chadLook) - 0.25);
const ACROSS = at(CHAD.s + 2.6, -4.9, 1.9); // the far walk, for telephoto shots of Chad on his roof
const ACROSS2 = at(CHAD.s - 2.0, -4.9, 1.8);
/** Drop the lens and keep the look point: a low angle that brings far rooftops down into the frame (B01 window). */
const lowAngle = (p: { pos: Vector3; look: Vector3; fov: number }, dy: number) => ({ ...p, pos: p.pos.clone().add(new Vector3(0, -dy, 0)) });
/** Aim lower so the subject sits higher in the frame, clear of the caption band (y 0.64-0.76 H). */
const liftSubject = <P extends { look: Vector3 }>(p: P, dy: number): P => ({ ...p, look: p.look.clone().add(new Vector3(0, -dy, 0)) });
const motes = (c: Vector3, color: string) => ({ center: c.clone().setY(1.5), size: new Vector3(4.5, 2.6, 4.5), color });


/**
 * R13 in-world transitions: a WHIP-PAN cut. `whipOut` yaws the lens hard over the last `len` frames of a shot, `whipIn`
 * comes out of the same swing over the first `len` frames of the next; the motion blur hides the hard cut between.
 * Declare both spans in the shots' `whips` so the QA camera-curve check treats them as planned.
 */
const yawed = (p: { pos: Vector3; look: Vector3; fov: number; roll: number }, a: number) => ({ ...p, look: p.look.clone().sub(p.pos).applyAxisAngle(new Vector3(0, 1, 0), a).add(p.pos) });
const WHIP = 6;
const whipOut = (pose: S["pose"], frames: number, dir = 1): S["pose"] => (f) => {
  const t = Math.min(Math.max((f - (frames - WHIP)) / WHIP, 0), 1);
  return yawed(pose(f), -dir * 0.75 * t * t);
};
const whipIn = (pose: S["pose"], dir = 1): S["pose"] => (f) => {
  // Frame 0 of a shot has no motion blur (no previous frame): start mid-swing, not at full yaw (R14 QA f706 flash).
  const t = Math.min(Math.max(1 - (f + 1) / (WHIP + 1), 0), 1);
  return yawed(pose(f), dir * 0.45 * t * t);
};
let T = 0;
const sh = (id: string, from: number, to: number, w: World, rest: Omit<S, "id" | "from" | "frames" | "w">): S => ((T = to), { id: `zombie/${id}`, from, frames: to - from, w, ...rest });

const shots: S[] = [
  // Line 1. Cold open: you, holding a duck; its QUACK bubble pops off with the battery (props.ts).
  sh("B01-duck", 0, W_.talking - 6, "int-day", { pose: creep(lowAngle(fo(HEAP, IN(2.6, -8.3), "mcu", youLook, { side: 0.2 }), 0.55), 70, 0.2), cast: inShot(0, [youHeap]), subject: "you", dof: DOF.medium(2.0), motes: motes(HEAP, "#ffe6c0") }),
  // "212 talking toys": a low macro dolly along the pile.
  sh("B02-toys", W_.talking - 6, BEAT.street, "int-day", { pose: shot({ pos: HEAP.clone().add(new Vector3(-1.9, 0.42, 1.0)), look: HEAP.clone().add(new Vector3(-0.2, 0.25, -0.4)), fov: 44 }, [drift(1.1), pushIn(0.3)], 60), dof: DOF.closeup(1.2) }),
  // "the guy across the street laughs at you": Chad close on a long lens, laughing at you.
  sh("B03-chad-laughs", BEAT.street, BEAT.because - 2, "ext-day", { pose: creep(tele(ACROSS, CHAD_ROOF, chadLook, 2.3), 50, 0.04, true), cast: inShot(BEAT.street, [chadMock]), subject: "chad", crowd: true, dof: POST.dof }),
  // "Because outside, 400 zombies hunt by sound": a fast pull-out and crane up over the horde (whip, blurred).
  sh("B03b-horde", BEAT.because - 2, 270, "ext-day", {
    pose: (f) => {
      const p = reframe(creep(tele(ACROSS, CHAD_ROOF, chadLook, 2.6), 104, 0.02), { pos: at(21, -2.5, 7.5), look: at(34, 0.5, 0.8), fov: 46 }, 0, 30)(f); // R15 C2: zombies were 2-3 px dots from 15 m up
      const k = Math.max(f - 30, 0) * 0.025;
      return { ...p, pos: p.pos.clone().add(new Vector3(0, k * 0.5, -k)) };
    },
    whips: [[0, 30]], crowd: true, wide: true, dof: POST.dof,
    cast: inShot(BEAT.because - 2, [chadMock]), // R14 QA: Chad vanished on the cut from B03 (f163 -> f164)
  }),
  // "That guy is Chad": up the fortress: sandbags, MEMBERS ONLY, steel, barbed wire, to Chad on the roof.
  sh("B04-fortress", 262, BEAT.hardware - 2, "ext-day", {
    wide: true, // a reveal of the fortress: the place is the subject until Chad tops the crane
    pose: (f) => {
      const t = smootherstep(Math.min(Math.max((f - 2) / 70, 0), 1)); // R15 C2: lands closer, a Chad medium (was ~1/9 frame)
      const a = { pos: at(CHAD.s + 2.4, 1.6, 1.0), look: at(CHAD.s + 3.9, FRONT, 1.7) }, b = { pos: at(CHAD.s + 1.0, 1.2, 5.6), look: ROOF_HEAD.clone() };
      return { pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t), fov: 46 - 12 * t, roll: 0 };
    },
    whips: [[14, 60]], // a fast crane up the fortress (motion-blurred, like the refs' reveals)
    cast: inShot(262, [chadMock]), subject: "chad", subjectFrom: 64, crowd: true, dof: POST.dof,
  }),
  // "...hardware store, electric steel shutters, and a megaphone": the whole storefront (sign, steel shutters, Chad on the
  // roof) while the words list it, then a fast push to Chad's MCU as he flexes the megaphone up on "megaphone"
  // (review r2 C3: the old telephoto MCU showed none of what the words named).
  sh("B05-chad-flex", BEAT.hardware - 2, BEAT.on1 - 4, "ext-day", (() => {
    const F0 = BEAT.hardware - 2, m = BEAT.megaphone - F0;
    const mcu = { pos: at(CHAD.s - 3.0, FRONT - 9.0, 3.4), look: ROOF_HEAD.clone().add(new Vector3(0, -0.4, 0)), fov: 13 };
    // R14: a three-quarter storefront (it receded nowhere flat-on), the roofline leading to Chad.
    const front = creep({ pos: at(CHAD.s - 4.8, FRONT - 6.8, 1.7), look: at(CHAD.s + 0.6, FRONT, 3.4), fov: 60 }, 90, 0.1);
    return { pose: reframe(front, mcu, m - 16, m + 2), whips: [[m - 16, m + 2]] as [number, number][], cast: inShot(F0, [chadMock]), subject: "chad", subjectFrom: m + 2, crowd: true, dof: POST.dof };
  })()),
  // Line 4. Day 1: you knock on his shutter.
  // R14 (knock with no door in frame): the lens looks along the shopfront, the shutter recedes beside you.
  sh("B06-knock", BEAT.on1 - 4, W_.he - 2, "ext-day", { pose: creep(fo(YOU_SHUTTER, at(CHAD.s + 3.6, FRONT - 2.4), "mcu", youLook, { side: 0.2 }), 70, 0.08), cast: inShot(BEAT.on1 - 4, [youKnock]), subject: "you", dof: DOF.medium(2.2) }),
  // The slot slides open on two sunglasses ("He said"), and slams on "only" (impact shake).
  sh("B07-slot", W_.he - 2, BEAT.only + 4, "ext-day", {
    pose: shake(creep({ pos: SHUTTER_AT.clone().add(new Vector3(-1.9, 1.6, 0.35)), look: SHUTTER_AT.clone().add(new Vector3(0, 1.58, 0)), fov: 30 }, 40, 0.1), BEAT.only - (W_.he - 2), 0.012),
    kicks: [[BEAT.only - (W_.he - 2), BEAT.only - (W_.he - 2) + 7]], dof: DOF.closeup(1.0),
  }),
  // Your face: the slam blows your fringe back.
  sh("B08-slammed", BEAT.only + 4, BEAT.so, "ext-day", { pose: whipOut(creep(fo(YOU_SHUTTER, at(CHAD.s + 2.2, -1.5), "cu", youLook, { side: -0.2 }), 25, 0.05, true), BEAT.so - BEAT.only - 4), whips: [[BEAT.so - BEAT.only - 4 - WHIP, BEAT.so - BEAT.only - 4]], cast: inShot(BEAT.only + 4, [youKnock]), subject: "you", dof: DOF.closeup(1.4) }),
  // Line 5. Night: you and Dave on the pallet, a battery lantern between you.
  sh("B09-pallet", BEAT.so, W_.eating - 2, "int-night", { whips: [[0, WHIP]], pose: whipIn(shot({ pos: PALLET.clone().add(new Vector3(-0.1, 1.25, 5.0)), look: PALLET.clone().add(new Vector3(-0.25, 1.1, 1.2)), fov: 58 }, [drift(-0.2), pushIn(0.4)], 80)), /* R15 S1: you AND Dave on "with Dave" (he was off the right edge) */ cast: inShot(BEAT.so, [youBeans, daveBeans]), subject: "you", dof: DOF.medium(3.3), motes: motes(PALLET, "#ffc98a") }),
  // "eating cold beans in total silence": CU, beans off your pinky.
  sh("B10-pinky", W_.eating - 2, BEAT.every, "int-night", { pose: whipOut(creep(fo(YOU_PALLET, YOU_PALLET.clone().add(new Vector3(0.3, 0, 3.4)), "mcu", youLook), 90, 0.12), BEAT.every - W_.eating + 2, -1), whips: [[BEAT.every - W_.eating + 2 - WHIP, BEAT.every - W_.eating + 2]], cast: inShot(W_.eating - 2, [youBeans]), subject: "you", dof: DOF.closeup(1.4), motes: motes(YOU_PALLET, "#ffc98a") }),
  // Line 6. Dawn: "Morning, toy boy!" into the megaphone, sound rings.
  sh("B11-morning", BEAT.every, BEAT.heads - 20, "ext-dawn", { pose: whipIn(creep(tele(ACROSS2, CHAD_ROOF, chadLook, 2.6), 120, 0.03), -1), whips: [[0, WHIP]], cast: inShot(BEAT.every, [chadMorning]), subject: "chad", crowd: true, dof: POST.dof }),
  // Line 7. The horde surges, bangs, gives up (high crane).
  sh("B12-horde-bangs", BEAT.heads - 20, BEAT.dave - 2, "ext-dawn", { pose: shot({ pos: at(22, -3.5, 15), look: at(32.5, 3.2, 1), fov: 48 }, [arc(-12, 0.6), pushIn(2.5)], 110), cast: inShot(BEAT.heads - 20, [chadMorning]), crowd: true, dof: POST.dof }),
  // Line 8. "Dave thinks Chad is winning": Chad on his roof flipping a steak, floodlights on.
  sh("B13-steak", BEAT.dave - 2, BEAT.daveMight - 4, "ext-dawn", { pose: creep({ pos: at(CHAD.s + 1.3, FRONT - 2.9, ROOF_Y + 1.75), look: CHAD_GRILL.clone().add(new Vector3(0.1, 1.0, 0.35)), fov: 42 }, 60, 0.08, true), cast: inShot(BEAT.dave - 2, [chadGrill]), subject: "chad", dof: DOF.medium(3.2) }),
  // "Dave might be right": Dave with his cold can, the street (and Chad's shop) through the window.
  sh("B14-dave", BEAT.daveMight - 4, BEAT.then - 2, "int-day", { pose: creep(fo(DAVE_WIN, IN(1.0, 5.6), "mcu", daveLook), 50, 0.08), cast: inShot(BEAT.daveMight - 4, [daveWindow]), subject: "dave", dof: DOF.medium(2.4) }),
  // Line 9. Taping toys onto the cart (the arm pulls strips across).
  sh("B15-tape", BEAT.then - 2, W_.cart - 2, "int-day", { pose: creep(fo(YOU_CART, YOU_CART.clone().add(new Vector3(-1.4, 0, 2.6)), "mcu", youLook, { side: 0.35 }), 100, 0.08), cast: inShot(BEAT.then - 2, [youTape]), subject: "you", dof: DOF.medium(2.2), motes: motes(CART_IN, "#ffe6c0") }),
  // "...until it looks like a hedgehog": orbit the finished hedgehog.
  sh("B16-hedgehog", W_.cart - 2, BEAT.park - 4, "int-day", { pose: shot({ pos: CART_IN.clone().add(new Vector3(-1.2, 1.6, 2.6)), look: CART_IN.clone().add(new Vector3(0.6, 0.95, -0.4)), fov: 46 }, [arc(30, 0.8), pushIn(0.5)], 70), cast: inShot(W_.cart - 2, [youTape]), subject: "you", dof: DOF.medium(2.6) }),
  // Line 10. On the ramp, DO NOT PUSH on the handle, lined up on Chad's door.
  sh("B17-ramp", BEAT.park - 4, W_.daveAsks - 2, "ext-day", { pose: shot({ pos: RAMP_TOP.clone().add(new Vector3(-2.5, 1.95, 0.7)), look: at(CHAD.s, FRONT, 0.8), fov: 48 }, [pushIn(1.2)], 110), crowd: true, dof: POST.dof }),
  // Line 11. You point (the window shows Chad's generator across the street).
  sh("B18-point", W_.daveAsks - 2, BEAT.generator1 - 6, "int-day", {
    pose: reframe(creep({ pos: IN(1.2, 3.8, 1.3), look: YOU_WIN.clone().lerp(DAVE_WIN, 0.33).setY(1.3), fov: 50 }, 80) /* both of you on "Dave asks" (review r3) */, fo(YOU_WIN, IN(1.6, 4.2), "mcu", youLook), BEAT.point - (W_.daveAsks - 2) - 22, BEAT.point - (W_.daveAsks - 2) + 6),
    cast: inShot(W_.daveAsks - 2, [youWindow, daveWindow]), subject: "you", dof: DOF.medium(3.0),
  }),
  sh("B19-generator", BEAT.generator1 - 6, BEAT.counting - 12, "ext-day", { pose: creep({ pos: GENERATOR.clone().add(new Vector3(-3.3, 1.05, -2.7)), look: GENERATOR.clone().add(new Vector3(0.2, 0.6, 0.6)), fov: 44 }, 50, 0.12) /* R14: the same panel side as B23 */, dof: DOF.medium(3.2) }),
  // Line 12. The tally chart by flashlight: open on the whole chart (30 cans, the count reads), then push in on the
  // skull can on "day" (review r3: the pan ended one can short, the skull never showed, only 2 columns were visible).
  sh("B20-tally", BEAT.counting - 18, BEAT.day29 - 8, "int-night", {
    pose: (f) => {
      const F0 = BEAT.counting - 18, u = smootherstep(Math.min(Math.max(f / (BEAT.day - F0 + 6), 0), 1));
      const look = chartPoint(0.5, 0.5).lerp(chartPoint(0.879, 0.836), u);
      const dist = 4.4 - 2.9 * u;
      return { pos: look.clone().add(new Vector3(-dist, 0.05, 0)), look, fov: 32, roll: 0 };
    },
    dof: POST.dof,
  }),
  // Line 13. Day 29: the two of you and the dinosaur.
  sh("B21-dino", BEAT.day29 - 8, BEAT.very - 4, "int-night", { pose: creep(fo(YOU_DINO, YOU_DINO.clone().add(new Vector3(-3, 0, 0.7)), "mcu", youLook, { side: -0.15 }), 90, 0.18), cast: inShot(BEAT.day29 - 8, [youDino, daveTorch]), subject: "you", dof: DOF.medium(1.8), motes: motes(YOU_DINO, "#c8c0ff") }),
  // "Very, very gently": macro on your hands, the battery sliding into the hatch.
  sh("B22-gently", BEAT.very - 4, W_.onDay30 - 6, "int-night", {
    pose: whipOut(creep(fo(YOU_DINO, YOU_DINO.clone().add(new Vector3(-2.4, 0, 0.6)), "mcu", youLook), 60, 0.2), W_.onDay30 - 6 - (BEAT.very - 4)),
    whips: [[W_.onDay30 - 6 - (BEAT.very - 4) - WHIP, W_.onDay30 - 6 - (BEAT.very - 4)]],
    cast: inShot(BEAT.very - 4, [youDino]), subject: "you", dof: DOF.closeup(1.2), motes: motes(YOU_DINO, "#c8c0ff"), // R14 QA f1527: same air as B21
  }),
  // Line 14. Dawn, day 30: the generator coughs a smoke ring...
  sh("B23-coughs", W_.onDay30 - 6, BEAT.dies - 4, "ext-dawn", { pose: jolt(whipIn(creep({ pos: GENERATOR.clone().add(new Vector3(-3.6, 0.85, -2.9)), look: GENERATOR.clone().add(new Vector3(0.3, 0.95, 0.9)), fov: 50 }, 80, 0.4)), BEAT.coughs - 8 - (W_.onDay30 - 6)), whips: [[0, WHIP]], dof: POST.dof }), // R14: the cough jolts the frame
  // ...and dies: the floodlight goes dark against the sky.
  sh("B24-lights-out", BEAT.dies - 4, BEAT.electric - 12, "ext-dawn", { pose: creep({ pos: FLOODS[0].clone().add(new Vector3(-2.0, -1.0, -0.6)), look: FLOODS[0].clone(), fov: 36 }, 30, 0.08), dof: POST.dof,
    look: { dim: [[10, 0.84], [19, 0.7]] } }), // R14: each flood going out darkens the frame (flood i off = dies + 6 + 9 i)
  // Line 15. The shutter rolls up on Chad in pyjamas: tilt up to his face, ring-eyed on "up".
  sh("B25-shutter", BEAT.electric - 12, BEAT.thats - 2, "ext-dawn", {
    pose: (f) => {
      const t = smootherstep(Math.min(Math.max((f - 2) / (BEAT.up - (BEAT.electric - 12)), 0), 1));
      return { pos: at(CHAD.s - 0.1, FRONT - 3.3, 1.0 + 0.3 * t), look: CHAD_DOOR.clone().setY(0.4 + 1.05 * t), fov: 38 - 8 * t, roll: 0 };
    },
    cast: inShot(BEAT.electric - 12, [chadWake]), subject: "chad", subjectFrom: BEAT.up - (BEAT.electric - 12) - 4, crowd: true, dof: DOF.medium(4.2),
  }),
  // Line 16. The kick: low and close, your sneaker into the cart.
  sh("B26-kick", BEAT.thats - 2, BEAT.kick + 10, "ext-dawn", { pose: creep({ pos: at(DOCK.s - 3.4, -3.7, 2.05), look: at(DOCK.s - 0.8, -5.6, 2.05), fov: 54 }, 30, 0.1), cast: inShot(BEAT.thats - 2, [youKick]), subject: "you", crowd: true, dof: DOF.medium(2.0) }),
  // Riding the cart down the ramp (object POV, fast, rolling).
  sh("B27-pov", BEAT.kick + 10, BEAT.bump - 4, "ext-dawn", {
    pose: (f) => {
      // Review C1: the old lens sat above the cart looking past it (a blurred storefront, no cart). Now it rides 1.6 m
      // behind and above the cart, so the hedgehog of toys fills the bottom of the frame and Chad's door is ahead.
      const F = f + BEAT.kick + 10, c = cartAt(F), dir = cartAt(F + 4).sub(c).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
      dir.normalize();
      return { pos: c.clone().addScaledVector(dir, -2.0).add(new Vector3(0, 2.2, 0)), look: c.clone().addScaledVector(dir, 4).setY(1.05 + 0.12 * Math.sin(F * 0.9)), fov: 60, roll: 2.5 * Math.sin(F * 1.3) };
    },
    whips: [[0, BEAT.bump - 4 - (BEAT.kick + 10)]], crowd: true, dof: POST.dof,
  }),
  // Line 17. Side-on follow: the cart rattles across, a rainbow of noise behind it.
  sh("B28-trail", BEAT.bump - 4, W_.youSee, "ext-dawn", { pose: (f) => { const c = cartAt(f + BEAT.bump - 4); return { pos: c.clone().add(new Vector3(-0.7, 1.2, 3.3)), look: c.clone().add(new Vector3(0.4, 0.75, 0)), fov: 42, roll: 0 }; /* R15 C2: the cart was < 1/6 of the frame */ }, crowd: true, dof: POST.dof }),
  // (INSERT: the x-ray of a toy, 2D in Video.tsx, W_.youSee .. BEAT.now - 6)
  // Line 18. "...now that cart is the loudest thing in town": 400 heads swing toward it.
  sh("B29-heads", BEAT.now - 6, BEAT.and400 + 2, "ext-dawn", { pose: (f) => ({ pos: at(38.5, 1.2, 2.3), look: cartAt(f + BEAT.now - 6).add(new Vector3(0, 0.9, 0)), fov: 30, roll: 0 }), /* R15 C2: long lens on the cart */ crowd: true, dof: POST.dof }),
  // Line 19. The stampede: the whole street pours toward Chad's open door.
  sh("B30-stampede", BEAT.and400 - 4, BEAT.ball, "ext-dawn", { pose: shot({ pos: at(20, -1.5, 1.6), look: at(32, 4.5, 1.6), fov: 50 }, [pullOut(3), arc(-6, 0.8)], 90), crowd: true, wide: true, dof: POST.dof }),
  // "...straight through Chad's open door": ride behind the cart (crowd parted by the lens lane) as it barrels through the
  // open shutter, then hold on the doorway as the shop fills to the ceiling (review r3: the crash was a wall of faces).
  sh("B30b-crash", BEAT.ball, BEAT.chadRoof + 4, "ext-dawn", {
    pose: shake((f) => {
      const F = Math.min(f + BEAT.ball, CART_RUN.door - 6), c = cartAt(F), dir = cartAt(F + 4).sub(c).setY(0);
      if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
      dir.normalize();
      const k = smootherstep(Math.min(Math.max((f + BEAT.ball - (CART_RUN.door - 6)) / 24, 0), 1)); // settle on the doorway
      // R14 (the crash happened inside the crowd): the lens rises over the heads and looks down at the counter.
      const pos = c.clone().addScaledVector(dir, -3.4).add(new Vector3(0, 1.5, 0)).addScaledVector(dir, -1.2 * k).add(new Vector3(0, 1.6 * k, 0));
      return { pos, look: c.clone().addScaledVector(dir, 3).setY(1.0).lerp(CHAD_DOOR.clone().setY(0.7), k), fov: 52 - 4 * k, roll: 0 };
    }, BEAT.door2 - BEAT.ball, 0.05),
    kicks: [[BEAT.door2 - BEAT.ball, BEAT.door2 - BEAT.ball + 7]], crowd: true, cartClear: 2.4, wide: true, dof: POST.dof,
    flash: [[BEAT.chadRoof - 10 - BEAT.ball, BEAT.chadRoof + 4 - BEAT.ball]], // the DustWipe (Video.tsx), planned
  }),
  // Line 20. Chad made it to the roof, clutching the megaphone, trembling.
  sh("B31-chad-roof", BEAT.chadRoof, BEAT.but, "ext-dawn", { flash: [[0, 18]], pose: creep({ pos: at(CHAD.s - 2.4, 3.2, 8.2), look: ROOF_HEAD.clone().add(new Vector3(0, -0.4, 0)), fov: 30 }, 90, 0.22), cast: inShot(BEAT.chadRoof, [chadRoofEnd]), subject: "chad", crowd: true, dof: DOF.medium(4.2) }),
  // Line 21. You and Dave in the empty street, the shop stuffed with zombies behind you: a tiny wave up at him.
  sh("B32-wave", BEAT.but, W_.thirty + 24, "ext-dawn", { pose: creep({ pos: at(29.4, -1.5, 1.2), look: at(31.45, 1.1, 1.38), fov: 52 }, 60, 0.08), cast: inShot(BEAT.but, [youWave, daveEnd]), subject: "you", crowd: true, dof: DOF.medium(3.6) }),
  // "...the guy across the street doesn't make a sound": the opening telephoto, now a silent close-up (the loop).
  sh("B33-silence", W_.thirty + 24, FRAMES, "ext-dawn", { pose: shot(liftSubject(tele(ACROSS, CHAD_ROOF, chadPyjamas, 1.8), 0.35), [pushIn(1.4)], 80), cast: inShot(W_.thirty + 24, [chadRoofEnd]), subject: "chad", crowd: true, dof: POST.dof }),
];
void T;
function chartPoint(u: number, v: number) {
  return CHART_AT.clone().add(new Vector3(-0.03, (0.5 - v) * 1.34, (u - 0.5) * 1.9)); // +z is screen right from the room side
}
void GRILL;
void walkPose;

/** INSERT (x-ray of a toy, 2D in Video.tsx) is a hard cut between B28 and B29. */
export const INSERT = { from: W_.youSee, to: BEAT.now - 6 };
/** Every shot carries its world's scene tag, light and sun (QA "Light continuity"). */
export const SHOTS: S[] = shots.map((x) => ({ ...x, scene: WORLD[x.w].scene, light: WORLD[x.w].light, sun: WORLD[x.w].sun }));
export const PLAN: Plan = { slug: "zombie-supermarket-30-days", shots: SHOTS, words, inserts: [[INSERT.from, INSERT.to]] };
