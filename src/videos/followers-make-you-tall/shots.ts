import { Group, Mesh, Object3D, PlaneGeometry, Vector3 } from "three";
import { CamPose, impact } from "../../../kit/toon/camera";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { V, clamp01, litTex, canvasTex, rnd } from "./common";
import type { CritterKind, CritterState } from "./critters";
import { BAG, breadBag, breadSlice, bubbleTea, bun, bus, flower, jet, lunchbox, mug, newsVan, phone, phoneHeld, setLid, townMap } from "./props";
import { DESK, DESK_TOP, HOME } from "./rooms";
import type { Place } from "./scene";
import { DAY_SUN, IN_SUN, MORNING_SUN, NIGHT_SUN } from "./scene";
import {
  B, BUS_Z, CAT_SIZE, DESK_CAT, DUCK_LOT, DUCK_SIZE, FRAMES, KIDS, L, PARENTS, PHONE_AT, POND_DUCK, PILE_TOP, Role, STREET_A, TYLER_N, YOU_LOT, YOU_PILE,
  busX, cashier, catAt, catState, duckLot, duckWalk, duckWalkAt, grandpa, grandpaDesk, handAt, headOf, held, kaylaA, kaylaBus, kaylaDance, lerpV, mia, mom, pondDuck, pondDuckY,
  scaleOf, span, tylerDay, tylerNight, tylerWin, vanAt, words, youBun, youClass, youFrame, youHall, youLot, youLunch, youMap, youPhone, youPile, youScheme, youWalk, zoe, zoeNight,
} from "./story";

/**
 * followers-make-you-tall shot plan: one canvas per shot, hard cuts on the words. Each shot's `does:` comment names its
 * visible change.
 */
export type Lit = "day" | "morning" | "home" | "school" | "mart" | "night";
export type Fx = "pigeons" | "rain" | "clouds" | "smoke" | "flood" | "sparks";
export type CritterSpec = { kind: CritterKind; at: (F: number) => Vector3; state: (F: number) => CritterState; size: number };
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: Place; lit: Lit; fx?: Fx[]; critters?: CritterSpec[]; scales?: ((f: number) => number)[] };
const PLACE: Record<Lit, Place> = { day: "town", morning: "town", night: "town", home: "home", school: "school", mart: "mart" };
const QA_LIGHT: Record<Lit, "day" | "golden" | "sunInterior" | "interior" | "night"> = { day: "day", morning: "golden", home: "sunInterior", school: "interior", mart: "interior", night: "night" };
const SUNS: Record<Lit, Vector3> = { day: DAY_SUN, morning: MORNING_SUN, night: NIGHT_SUN, home: IN_SUN, school: IN_SUN, mart: IN_SUN };
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: r.look, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit, scale: r.scale ? r.scale(from) : undefined }));
let cursor = 0;
export const SHOTS: S[] = [];
const shot = (id: string, to: number, lit: Lit, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof; props?: MovingProp[]; crit?: CritterSpec[] }): S => {
  const from = cursor;
  cursor = to;
  const { dof, props, crit, allow, ...rest } = o;
  const s: S = {
    id: `fmt/${id}`, from, frames: to - from, w: PLACE[lit], lit, scene: lit, light: QA_LIGHT[lit], sun: SUNS[lit],
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: roles[0]?.name,
    moving: props, critters: crit, scales: roles.map((r) => (f: number) => scaleOf(r, f + from)),
    allow: { ...(roles.some((r) => r.sit) ? { "Card penetration": "seated cards rest on their seat (a bus roof, a cat's back)" } : {}), ...allow }, ...rest,
  };
  SHOTS.push(s);
  return s;
};
/** Depth of field scaled for tiny or giant subjects (`d` = focus distance in m). */
const close = (d: number) => () => ({ ...DOF.closeup(d), maxPx: 4 }), mid = (d: number) => () => ({ ...DOF.medium(d), maxPx: 3.5 });
const NONE = () => DOF.none;
/** A framing that creeps (push + a little side drift). */
const creep = (f0: CamPose, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.2) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  drift *= Math.min(1, d.length() / 6);
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const glideCam = (a: CamPose, b: CamPose, F: number, f0: number, f1: number) => { const t = span(F, f0, f1); return P(lerpV(a.pos, b.pos, t), lerpV(a.look, b.look, t), a.fov + (b.fov - a.fov) * t); };
/** Frame a (possibly scaled) role's head from direction `dir`, `dist` metres per unit of its scale. */
const on = (r: Role, F: number, dir: Vector3, dist: number, fov: number, o: { up?: number; down?: number } = {}) => {
  const k = scaleOf(r, F), h = headOf(r, F);
  return P(h.clone().addScaledVector(dir.clone().normalize(), dist * k).add(V(0, (o.up ?? -0.08) * k, 0)), h.clone().add(V(0, -(o.down ?? 0.12) * k, 0)), fov);
};
const free = (name: string, make: () => Object3D, at: (o: Object3D, F: number) => boolean | void, touches?: string[]): MovingProp => ({ name, make, pose: at, touches });
/** An effect the guard cannot see (a texture swap, sprites): an empty marker that appears on its frame. */
const fxOn = (name: string, f0: number) => free(`fx: ${name}`, () => new Object3D(), (o, F) => { o.position.set(0, -50, 0); return F >= f0; });
const SKY_OK = { "Empty sky": "the giant in the sky is the story here" };
const TINY_OK = { "Feet on the ground": "a 4-inch card on a desk / a table: the guard's ground probe is for 1:1 cards", Scale: "you are 4 inches tall: the story" };
const GIANT_OK = { Scale: "a giant: the story", "Camera clearance": "the lens is far from the giant's card", "Subject in frame": "a giant card: the head leaves frame on the tilt" };
const CROWD_OK = { "Cast overlap": "the parade: runners overlap in depth", "Card penetration": "runners pass close", "Caption vs face": "a crowd of extras; the caption sits over the far heads" };

// ================================================================== line 1: the rule, on the first word (day)
// does: a girl's phone dings, she shoots up two storeys past the shop signs, pigeons scatter off the ledge
const A1a = P(V(-2.2, 1.35, -1.6), V(-3.2, 1.2, -5.5), 50);
shot("A1-ding-grow", B.more, "day", [kaylaA], (F) => { const h = headOf(kaylaA, F); const c = glideCam(A1a, P(V(-1.4, 1.9, 0.9), V(-3.2, 4.0, -5.5), 58), F, B.ding + 2, B.ding + 18); c.look.y = Math.max(c.look.y, h.y - 0.8 * scaleOf(kaylaA, F) * 0.5); return c; },
  { dof: NONE, fx: ["pigeons"], props: [held("phone", () => phoneHeld("ding"), kaylaA, "right", (F) => P(V(-1.6, 1.6, 0.5), V(0, 0, 0), 50), { fwd: 0.05 })], allow: { "Subject in frame": "she shoots up out of the frame top for a beat, the tilt catches her", "Subject size": "she grows from a medium to a giant" } });
// does: a street of people at their follower heights; on "taller" a man's phone dings and he pops up a storey
const A2 = P(V(17.3, 1.4, 6.4), V(17.3, 4.4, -5.6), 60);
shot("A2-street-heights", L(2, 0), "day", STREET_A, (F) => creep(A2, F, B.more, L(2, 0), 0.06, 0.2), { wide: true, subject: "p4", dof: NONE, fx: ["pigeons"], props: [fxOn("he grows", B.taller - 2)], allow: { ...CROWD_OK, Scale: "people at their follower heights: the story" } });

// ================================================================== line 2: Mom, 400 followers, 5'6"
// does: Mom at the stove sips from her WORLD'S OKAYEST MOM mug, then shrugs a perfectly normal shrug on "normal"
const momCam = (F: number) => { const a = on(mom, B.mom, V(0.45, 0, 1), 1.95, 40, { down: 0.22 }), b = on(mom, B.normal, V(0.3, 0, 1), 2.6, 44, { down: 0.35 }); return glideCam(a, b, F, B.normal - 14, B.normal + 6); };
shot("B1-mom-mug", L(3, 0), "home", [mom], momCam, { dof: mid(1.8), props: [held("mug", mug, mom, "right", momCam, { fwd: 0.07 }), fxOn("the sip", B.normal - 12)] });

// ================================================================== line 3: Kayla's dance video, then the bus roof
// does: Kayla dances at her own phone on the sidewalk, filming herself
const kdCam = (F: number) => creep(on(kaylaDance, L(3, 0), V(0.4, 0, -1), 2.4, 44, { down: 0.3 }), F, L(3, 0), B.now, 0.12);
shot("C1-dance", B.now, "day", [kaylaDance], kdCam, { dof: mid(2.4), props: [held("selfie phone", () => phoneHeld("ding"), kaylaDance, "right", kdCam, { fwd: 0.05 })] });
// does: the bus pulls through the street with giant Kayla sitting on its roof, sipping a bubble tea the size of a bin
const C2 = P(V(-12.5, 1.0, 6.3), V(-5, 4.6, -2), 62);
const busProp = free("bus", bus, (o, F) => { o.position.set(busX(F), 0, BUS_Z); }, ["ground", "road"]);
shot("C2-bus-roof", L(4, 0), "day", [kaylaBus], (F) => creep(C2, F, B.now, L(4, 0), 0.03, 0.1), { wide: true, dof: NONE, props: [busProp, held("bubble tea", bubbleTea, kaylaBus, "right", () => C2, { fwd: 0.04 })], allow: { "Feet on the ground": "her legs hang down the bus side to the road", "Moving props": "the bus drives through", "Card penetration": "she sits on the moving bus" } });

// ================================================================== line 4: Grandpa rides the cat to bingo
const catCam = (F: number) => { const c = catAt(F); return P(c.clone().add(V(-0.55, 0.16, 0.7)), c.clone().add(V(0.05, 0.14, 0)), 40); };
const CAT = (at: (F: number) => Vector3): CritterSpec => ({ kind: "cat", at, state: catState, size: CAT_SIZE });
// does: ground-level track: the family cat trots along the sidewalk with 2-inch Grandpa riding on its back
shot("D1-cat-ride", L(4, 13), "day", [grandpa], catCam, { dof: close(0.9), crit: [CAT(catAt)], allow: { ...TINY_OK, "Subject size": "Grandpa is 2 inches tall on the cat (the cat is the frame)" } });
// does: close on Grandpa: he raises his bingo dauber like a sword as the cat purrs on toward bingo
shot("D2-bingo", L(5, 0), "day", [grandpa], (F) => { const h = headOf(grandpa, B.bingo); return creep(P(h.clone().add(V(0.12, 0.0, 0.3)), h.clone().add(V(-0.02, -0.03, 0)), 36), F, L(4, 13), L(5, 0), 0.08); }, { dof: close(0.25), crit: [CAT(catAt)], allow: TINY_OK });

// ================================================================== line 5: your 3 followers
// does: on your desk, tiny you stand beside your own phone (as tall as you); FOLLOWERS 3 glows on it
const phoneProp = free("phone on desk", () => phone("followers"), (o) => { o.position.copy(PHONE_AT); o.rotation.y = 0.3; }, ["desk"]);
shot("E1-three", B.bot, "home", [youPhone], (F) => creep(on(youPhone, L(5, 0), V(1.1, 0.3, 1), 4.0, 42, { down: 0.6, up: 0.4 }), F, L(5, 0), B.bot, 0.14), { dof: close(0.3), props: [phoneProp], allow: TINY_OK });
// does: over the screen: Mom, Grandma and the sparkly HotSingles4U; you point at it, then facepalm on its name
shot("E2-bot", L(6, 0), "home", [youPhone], (F) => creep(P(PHONE_AT.clone().add(V(0.0, 0.27, 0.06)), PHONE_AT.clone().add(V(0, 0, 0.035)), 40), F, B.bot, L(6, 0), 0.08), { dof: close(0.32), props: [phoneProp, fxOn("the facepalm", B.hot)], allow: { ...TINY_OK, "Subject in frame": "the phone screen is the subject; you stand at its edge" } });

// ================================================================== line 6: Mia's lunchbox (morning)
const miaCam = (F: number) => creep(on(mia, L(6, 0), V(0.35, 0, 1), 2.0, 42, { down: 0.32 }), F, L(6, 0), B.school, 0.1);
const MIA_LENS = (F: number) => miaCam(F);
const boxAt = (F: number) => handAt(mia, F, MIA_LENS(F).pos, "right");
const theBox = (cam: (F: number) => CamPose) => held("lunchbox", lunchbox, mia, "right", cam, { fwd: 0.04, orient: (ob, F) => { setLid(ob, 1 - span(F, B.lunchbox - 4, B.lunchbox + 1)); ob.rotation.y += 0.4; } });
const inBox = youLunch(boxAt);
// does: your sister Mia at the bus stop swings her open lunchbox, you standing in it with your head over the rim
shot("F1-bus-stop", B.school, "morning", [mia, inBox], miaCam, { dof: mid(2.0), props: [theBox(miaCam)], allow: { ...TINY_OK, "Subject size": "a medium of Mia; you are in the box she holds", "Card penetration": "you ride inside the lunchbox" } });
// does: close on the lunchbox: your sad face over the rim, then the lid slams shut on "lunchbox"
const F2 = (F: number) => { const b = boxAt(F); return P(b.clone().add(V(0.12, -0.06, 0.34)), b.clone().add(V(0.02, -0.1, 0)), 36); };
shot("F2-lid-shut", L(7, 0), "morning", [inBox, mia], F2, { subject: "you", dof: close(0.35), props: [theBox(MIA_LENS), fxOn("the lid slams", B.lunchbox - 4)], kicks: [[B.lunchbox - B.school, B.lunchbox - B.school + 7]], allow: { ...TINY_OK, "Subject covered": "the lid shuts over you: the gag", "Subject in frame": "the lid shuts over you: the gag", "Card penetration": "you ride inside the lunchbox" } });

// ================================================================== line 7: Zoe at her duck locker (school)
// does: Zoe at her duck-sticker locker turns round on "prom"
shot("G1-zoe-locker", B.prom, "school", [zoe], (F) => creep(on(zoe, L(7, 0), V(0.55, 0, 1), 2.3, 42, { down: 0.3 }), F, L(7, 0), B.prom, 0.12), { dof: mid(2.3) });
// does: from the floor: 4-inch you at her sneaker holding up a flower three times your size; she hugs her duck notebook
const G2 = (F: number) => creep(P(youHall.at(0).add(V(0.14, 0.05, 0.42)), youHall.at(0).add(V(-0.22, 0.5, -0.3)), 62), F, B.prom, L(8, 0), 0.06, 0.02);
shot("G2-your-flower", L(8, 0), "school", [youHall, zoe], G2, { subject: "you", dof: close(0.4), props: [held("flower", flower, youHall, "right", G2, { fwd: 0.01, orient: (ob) => { ob.scale.setScalar(0.5); } })], allow: { ...TINY_OK, "Subject size": "you are 4 inches tall at her feet: the story" } });

// ================================================================== lines 8-9: Tyler, 800 feet tall (day)
// does: over the rooftops: Tyler's legs and body tower behind the blocks, phone up for a selfie with the sun
const H1 = P(V(2, 1.6, 6.4), V(13, 105, -150), 64), H2 = P(V(6, 1.6, 3.2), V(14, 190, -150), 52);
shot("H1-tyler-towers", B.he8, "day", [tylerDay], (F) => creep(H1, F, L(8, 0), B.he8, 0.0, 0.3, 0), { wide: true, dof: NONE, fx: ["clouds"], allow: { ...GIANT_OK, ...SKY_OK } });
// does: the lens tilts up his whole body to his grinning head in the clouds
shot("H2-head-in-clouds", L(9, 0), "day", [tylerDay], (F) => glideCam(H1, H2, F, B.he8, B.tall8 + 4), { wide: true, dof: NONE, fx: ["clouds"], allow: { ...GIANT_OK, ...SKY_OK } });
// does: in the sky: his face scrunches and he sneezes, clouds blasting away from his nose
const tyHead = (F: number) => headOf(tylerDay, F);
shot("I1-sneeze", B.rains - 4, "day", [tylerDay], impact((F) => { const h = tyHead(L(9, 0)); return creep(P(h.clone().add(V(38, -14, 82)), h.clone().add(V(0, -6, 0)), 42), F, L(9, 0), B.rains, 0.05); }, B.sneezes9 + 2, 0.03, 8), { wide: true, dof: NONE, fx: ["clouds"], kicks: [[B.sneezes9 + 2 - L(9, 0), B.sneezes9 + 10 - L(9, 0)]], props: [fxOn("the sneeze", B.sneezes9)], allow: { ...GIANT_OK, ...SKY_OK } });
// does: down in the street the sneeze arrives as rain: a sudden shower bounces off the bus stop and the bins
shot("I2-rain", L(10, 0), "day", [], (F) => creep(P(V(4.5, 1.5, 2.6), V(9, 1.6, -6.5), 48), F, B.rains - 4, L(10, 0), 0.12), { wide: true, subject: undefined, dof: NONE, fx: ["rain"], props: [fxOn("the rain falls", B.rains - 2)] });

// ================================================================== line 10: "Hey, Pocket! Need a ladder?" (classroom)
// does: Tyler crouches outside the classroom, his giant eye and grin filling the windows; tiny you on a desk jump back
const J1 = P(V(13.2, 1.25, 1.35), V(16, 1.5, 0.1), 54);
shot("J1-eye-window", L(11, 0), "school", [tylerWin, youClass], (F) => creep(J1, F, L(10, 0), L(11, 0), 0.1), { subject: "tyler", dof: NONE, props: [fxOn("he talks", B.hey)], allow: { ...TINY_OK, ...GIANT_OK, "Subject covered": "his face is behind the window frame: the gag", "Feet on the ground": "Tyler crouches below the window sill (his body is outside, below)" } });

// ================================================================== lines 11-12: the duck follows you (morning)
const DUCK = (at: (F: number) => Vector3, st: (F: number) => CritterState): CritterSpec => ({ kind: "duck", at, state: st, size: DUCK_SIZE });
const walkCam = (F: number) => { const x = Math.max(...[F].map((f) => youWalk.at(f).x)); return P(V(x - 0.3, 0.3, -5.7 + 1.55), V(x - 0.32, 0.14, -5.7), 44); };
// does: ground-level track: you trudge along the sidewalk; the neighbour's white duck waddles right behind you
shot("K1-duck-follows", B.duck11 + 8, "morning", [youWalk], walkCam, { dof: close(0.9), crit: [DUCK(duckWalkAt, duckWalk)], allow: TINY_OK });
// does: you glance back over your shoulder; the duck stops and smiles
shot("K2-glance", L(12, 0), "morning", [youWalk], (F) => { const h = headOf(youWalk, F); return P(h.clone().add(V(0.16, 0.01, 0.42)), h.clone().add(V(-0.08, -0.04, 0)), 40); }, { dof: close(0.5), crit: [DUCK(duckWalkAt, duckWalk)], allow: TINY_OK });
// does: at the door frame: your back to the casing, the old pencil marks below you, today's mark lands a hair higher
const markProp = free("today's mark", () => { const g = new Group(); const m = new Mesh(new PlaneGeometry(0.03, 0.03), litTex("mark", () => canvasTex(64, 64, (c) => { c.strokeStyle = "#2a2a34"; c.lineWidth = 4; c.beginPath(); c.moveTo(4, 32); c.lineTo(60, 32); c.stroke(); }), { rough: 0.8 })); m.rotation.y = Math.PI / 2; g.add(m); return g; }, (o, F) => { o.position.set(HOME.x0 + 0.052, 0.106, 1.29); return F >= B.taller12 - 2; });
const L1 = P(V(HOME.x0 + 0.42, 0.1, 1.42), V(HOME.x0 + 0.05, 0.08, 1.3), 34);
shot("L1-height-mark", L(13, 0), "home", [youFrame], (F) => creep(L1, F, L(12, 0), L(13, 0), 0.12), { dof: close(0.4), props: [markProp], allow: TINY_OK });

// ================================================================== line 13: you get weird; 400 loaves
// does: close on you at the desk: your face narrows into a scheme, hand to chin
shot("M1-scheme", B.buy, "home", [youScheme], (F) => { const h = headOf(youScheme, F); return creep(P(h.clone().add(V(0.04, 0.0, 0.2)), h.clone().add(V(0, -0.02, 0)), 34), F, L(13, 0), B.buy, 0.15); }, { dof: close(0.2), allow: TINY_OK });
// does: at Fresh Mart's checkout: a mountain of buns on the belt, you on its peak, hands on hips; the cashier stares
const PILE: Vector3[] = [];
for (let layer = 0; layer < 7; layer++) { const n = 7 - layer; for (let i = 0; i < n; i++) for (let j = 0; j < Math.max(1, 3 - Math.floor(layer / 2)); j++) PILE.push(V(-0.15 + (i - (n - 1) / 2) * 0.115 + (layer % 2) * 0.03, 0.86 + layer * 0.06, (j - 1) * 0.1)); }
const pile = free("bread mountain", () => { const g = new Group(); PILE.forEach((p, i) => { const b = bun((i % 3) + 1); b.position.copy(p); b.rotation.y = rnd(i) * 3; g.add(b); }); return g; }, () => {}, ["counter", "till"]);
const M2 = P(V(-0.95, 1.52, 0.95), V(0.1, 1.17, -0.32), 50);
shot("M2-bread-mountain", L(14, 0), "mart", [youPile, cashier], (F) => creep(M2, F, B.buy, L(14, 0), 0.1), { subject: "cashier", dof: mid(2.0), props: [pile], allow: { ...TINY_OK, "Props through props": "the buns pile on each other" } });

// ================================================================== line 14: a map of every pond
// does: high over your desk: the town map with every pond circled in red; you drag a red pen round the last one
const mapProp = free("pond map", townMap, (o) => { o.position.set(DESK.x, DESK_TOP, DESK.z + 0.02); }, ["desk"]);
const N1 = P(V(1.82, 1.15, -1.62), V(1.66, DESK_TOP, -2.12), 42);
shot("N1-map", L(15, 0), "home", [youMap], (F) => creep(N1, F, L(14, 0), L(15, 0), 0.16), { subject: undefined, dof: close(0.6), props: [mapProp, fxOn("the pond gets its circle", B.pond)], allow: TINY_OK });

// ================================================================== line 15: Grandpa doubts you
// does: Grandpa rides the cat onto your map and pokes it with his dauber: "a million followers by Friday"
const N2 = P(V(0.98, 0.86, -1.52), V(1.24, 0.74, -2.06), 40);
shot("N2-grandpa-doubts", L(16, 0), "home", [grandpaDesk], (F) => creep(N2, F, L(15, 0), L(16, 0), 0.12), { dof: close(0.4), props: [mapProp], crit: [{ kind: "cat", at: () => DESK_CAT.clone(), state: (F) => ({ ...catState(F), phase: 0.25, facing: 1, expr: F > B.friday15 ? "happy" : "neutral" }), size: CAT_SIZE }], allow: TINY_OK });

// ================================================================== line 16: "Pass the bread."
// does: you hold up a whole bun like a shield, deadpan, then smug
const N3 = (F: number) => { const h = headOf(youBun, L(16, 0)); return creep(P(h.clone().add(V(0.1, 0.03, 0.42)), h.clone().add(V(0, -0.04, 0)), 34), F, L(16, 0), L(17, 0), 0.1); };
shot("N3-pass-bread", L(17, 0), "home", [youBun], N3, { dof: close(0.3), props: [mapProp, held("bun shield", () => bun(2), youBun, "right", N3, { fwd: 0.004, when: (F) => F >= B.pass - 6, orient: (ob) => { ob.scale.setScalar(0.38); ob.rotation.x = -0.3; } })], allow: TINY_OK });

// ================================================================== line 17-18: prom night; Tyler writes PROM? with a jet
const tyN = (F: number) => headOf(tylerNight, F);
/** The jet in Tyler's right hand; its smoke trail is the hand's path over the last 120 frames. */
const jetProp = held("jet", jet, tylerNight, "right", () => P(V(33, 1.4, 9.5), V(0, 0, 0), 60), { fwd: 0.02, when: (F) => F < L(19, 0), orient: (ob, F) => { ob.scale.setScalar(1.4); ob.rotation.set(0, Math.PI / 2, 0.4 * Math.sin(F / 6)); } });
const O1 = P(V(33.5, 1.4, 9.5), V(36, 92, 110), 64);
// does: from the lot: past the glowing gym, Tyler towers over the school, writing PROM? across the night sky in jet smoke
shot("O1-skywriting", L(18, 0), "night", [tylerNight], (F) => creep(O1, F, L(17, 0), L(18, 0), 0.0, 0.25, 0), { wide: true, dof: NONE, fx: ["smoke"], props: [jetProp], allow: { ...GIANT_OK, ...SKY_OK } });
// does: on the gym steps Zoe gazes up at the sky, both hands over her mouth
shot("O2-zoe-melts", B.standing - 6, "night", [zoeNight], (F) => creep(on(zoeNight, L(18, 0), V(-0.2, 0, -1), 1.7, 40, { up: -0.3 }), F, L(18, 0), B.standing, 0.1), { dof: close(1.7), fx: ["smoke"] });
// does: down in the empty lot: 4-inch you beside one paper bag of bread, the duck at your side, Tyler's grin glowing far above
const bagProp = free("bread bag", breadBag, (o, F) => { o.position.copy(YOU_LOT).add(V(-0.16, 0, 0.05)); o.visible = F < B.sneezes + 2; return o.visible; }, ["ground", "lot"]);
const P1 = P(YOU_LOT.clone().add(V(0.18, 0.14, 0.78)), YOU_LOT.clone().add(V(0.0, 0.1, 0)), 44);
shot("P1-one-bag", L(19, 0), "night", [youLot], (F) => creep(P1, F, B.standing - 6, L(19, 0), 0.12), { dof: close(0.6), props: [bagProp], crit: [DUCK(() => DUCK_LOT.clone(), duckLot)], allow: TINY_OK });

// ================================================================== line 19: he laughs, he sneezes
const tyFace = (F: number) => { const h = tyN(L(19, 0)); return creep(P(h.clone().add(V(14, -24, -88)), h.clone().add(V(0, -8, 0)), 40), F, L(19, 0), B.sneezes, 0.06); };
// does: in the night sky: Tyler points down at you and laughs, his face scrunching up into a sneeze
shot("Q1-laughs", B.sneezes - 2, "night", [tylerNight], tyFace, { wide: true, dof: NONE, fx: ["smoke"], allow: { ...GIANT_OK, ...SKY_OK } });
// does: the gust hits the lot: the bag bursts, buns and slices blow up out of it, you and the duck hang on
const burst = free("bun burst", () => { const g = new Group(); for (let i = 0; i < 3; i++) g.add(bun(i + 1)); for (let i = 0; i < 6; i++) g.add(breadSlice()); return g; }, (o, F) => {
  const t = (F - B.sneezes - 2) / 30;
  if (t < 0) return false;
  o.position.copy(YOU_LOT).add(V(-0.16, 0, 0.05));
  o.children.forEach((c, i) => { const a = i * 2.1, v = 1.4 + (i % 4) * 0.5; c.position.set(Math.cos(a) * v * t * 1.8 - 2 * t, BAG.h * 0.8 + v * 2.2 * t - 2.2 * t * t, Math.sin(a) * v * t); c.rotation.set(t * 8 + i, t * 5, t * 6 + i); });
});
shot("Q2-burst", L(20, 0), "night", [youLot], impact((F) => creep(P(YOU_LOT.clone().add(V(0.3, 0.2, 0.95)), YOU_LOT.clone().add(V(-0.1, 0.16, 0)), 52), F, B.sneezes - 2, L(20, 0), 0.04), B.sneezes + 2, 0.03, 8), { dof: close(0.7), props: [bagProp, burst], kicks: [[B.sneezes + 2 - (B.sneezes - 2), B.sneezes + 10 - (B.sneezes - 2)]], crit: [DUCK(() => DUCK_LOT.clone(), duckLot)], allow: { ...TINY_OK, "Moving props": "the bread blows out of the bag" } });

// ================================================================== line 20: the bread storm over town
const STORM = 60;
const stormAt = (i: number, F: number) => { const t = (F - B.blasts + 8 - (i % 12)) / 70; if (t < 0) return null; const a = -2.2 + (i % 10) * 0.42 + rnd(i) * 0.3, r = 10 + 110 * t * (0.6 + rnd(i + 1) * 0.6); return V(YOU_LOT.x + Math.cos(a) * r - 20 * t, 4 + 60 * t - 30 * t * t + rnd(i + 2) * 10, YOU_LOT.z + Math.sin(a) * r * 0.6 - 30 * t); };
const storm = free("bread storm", () => { const g = new Group(); for (let i = 0; i < STORM; i++) { const s = breadSlice(); s.scale.setScalar(16); g.add(s); } return g; }, (o, F) => { o.children.forEach((c, i) => { const p = stormAt(i, F); c.visible = !!p; if (p) { c.position.copy(p); c.rotation.set(F / 5 + i, F / 7, i); } }); });
// does: high over the town: slices of bread cartwheel out over the rooftops toward the park and every street
shot("R1-bread-storm", L(21, 0), "night", [], (F) => creep(P(V(48, 34, 34), V(2, 8, -6), 58), F, L(20, 0), L(21, 0), 0.06, 0, 0.4), { wide: true, subject: undefined, dof: NONE, props: [storm] });

// ================================================================== line 21: Quack.
// does: the dark park pond ripples; the duck's head pops up out of the water and quacks
const S1 = P(V(-33.4, 0.42, 14.5), V(-34.6, 0.16, 16.2), 40);
shot("S1-quack", L(22, 0), "night", [], (F) => creep(S1, F, L(21, 0), L(22, 0), 0.12), { subject: undefined, dof: close(2.0), crit: [{ kind: "duck", at: (F) => POND_DUCK.clone().setY(pondDuckY(F)), state: pondDuck, size: DUCK_SIZE }], props: [fxOn("the duck surfaces", B.quack - 26), fxOn("quack", B.quack - 3)] });

// ================================================================== line 22: ducks follow the bread, kids the ducks, parents the kids
// does: low on the road: a flood of ducks waddles straight at the lens, filling the street kerb to kerb
shot("T1-duck-flood", B.kids - 2, "night", [], (F) => creep(P(V(-23, 0.3, 0.8), V(-29, 0.3, 0), 50), F, L(22, 0), B.kids, 0.04), { wide: true, subject: undefined, dof: NONE, fx: ["flood"], props: [fxOn("the flood arrives", L(22, 0))] });
// does: tracking with the kids running after the ducks, laughing
const kidsCam = (F: number) => { const k = KIDS[0].at(F); return P(k.clone().add(V(2.4, 1.1, -4.4)), k.clone().add(V(0.6, 0.8, 0)), 46); };
shot("T2-kids", B.parents - 2, "night", KIDS, kidsCam, { subject: "kid0", wide: true, dof: NONE, fx: ["flood"], allow: CROWD_OK });
// does: tracking with the parents running after the kids, arms out
const parentsCam = (F: number) => { const k = PARENTS[0].at(F); return P(k.clone().add(V(2.6, 1.3, -4.8)), k.clone().add(V(0.6, 1.0, 0)), 46); };
shot("T3-parents", L(23, 0), "night", PARENTS, parentsCam, { subject: "parent0", wide: true, dof: NONE, fx: ["flood"], allow: CROWD_OK });

// ================================================================== line 23: the news van; they're all following you
const vanProp = free("news van", newsVan, (o, F) => { o.position.copy(vanAt(F)); }, ["ground", "road"]);
// does: the CH 7 NEWS van crawls after the parents, its dish up
shot("U1-news-van", B.all - 2, "night", [], (F) => { const v = vanAt(F); return P(v.clone().add(V(7.5, 1.4, 5.2)), v.clone().add(V(0, 1.6, 0)), 46); }, { wide: true, subject: undefined, dof: NONE, props: [vanProp] });
// does: behind tiny you in the lot: the ducks fan out round you, the kids, parents and the van pour in after them
const U2 = P(V(33.2, 0.42, 19.4), V(28.5, 0.7, 15.2), 56);
shot("U2-following-you", L(24, 0), "night", [youLot, ...KIDS.slice(0, 3), ...PARENTS.slice(0, 2)], (F) => creep(U2, F, B.all - 2, L(24, 0), 0.06), { subject: "you", wide: true, dof: NONE, fx: ["flood"], props: [vanProp], allow: { ...TINY_OK, ...CROWD_OK } });

// ================================================================== line 24: ten feet, fifty, three hundred, nine hundred
// does: locked low on you: you pop to ten feet, then fifty, the lens snapping up after your head each time
const V1 = P(V(36.5, 1.4, 23.5), V(31.5, 1.2, 17), 62);
shot("V1-grow-small", B.three00 - 2, "night", [youLot], (F) => { const h = headOf(youLot, F); const c = creep(V1, F, L(24, 0), B.three00, 0.0, 0.3, 0); c.look.y = Math.min(h.y, 40) * 0.82; return c; }, { dof: NONE, fx: ["sparks", "flood"], props: [fxOn("ten feet", B.ten - 1), fxOn("fifty", B.fifty - 1)], kicks: [[B.ten - 1 - L(24, 0), B.ten + 6 - L(24, 0)], [B.fifty - 1 - L(24, 0), B.fifty + 6 - L(24, 0)]], allow: { ...GIANT_OK, "Camera curve": "the lens snaps up after your head on each pop (a whip)" } });
// does: down the street: you shoot up past the blocks to three hundred, then nine hundred feet, the town at your shins
const V2 = P(V(-150, 50, 260), V(31, 70, 17), 56);
shot("V2-grow-huge", L(25, 0), "night", [youLot], (F) => { const h = headOf(youLot, F); const c = creep(V2, F, B.three00 - 2, L(25, 0), 0.0, 0, 0); c.look.y = Math.max(40, h.y * 0.62); return c; }, { wide: true, dof: NONE, fx: ["sparks"], props: [fxOn("three hundred", B.three00 - 1), fxOn("nine hundred", B.nine - 1)], allow: { ...GIANT_OK, ...SKY_OK, "Camera curve": "the lens tilts up after you on each pop" } });

// ================================================================== line 25: eye to eye
const youHead = (F: number) => headOf(youLot, F);
// does: up in the clouds, side-on: you and Tyler face to face over the rooftops; his head drops back to look up at you
shot("W1-eye-to-eye", B.actually - 2, "night", [youLot, tylerNight], (F) => { const a = youHead(L(25, 0)), b = tyN(L(25, 0)), m = a.clone().lerp(b, 0.5); return creep(P(m.clone().add(V(330, -20, 0)), m.clone().add(V(0, -30, 0)), 50), F, L(25, 0), B.actually, 0.08); }, { wide: true, subject: undefined, dof: NONE, fx: ["clouds"], allow: { ...GIANT_OK, ...SKY_OK } });
// does: close on Tyler craning his neck up at you, mouth open
shot("W2-looking-up", L(26, 0), "night", [tylerNight], (F) => { const h = tyN(B.actually); return creep(P(h.clone().add(V(30, -40, -70)), h.clone().add(V(0, 10, 0)), 48), F, B.actually - 2, L(26, 0), 0.08); }, { dof: NONE, fx: ["clouds"], allow: { ...GIANT_OK, ...SKY_OK } });

// ================================================================== line 26: "Hey, Tyler. Need a ladder?"
// does: over Tyler's shoulder: your giant face leans down to him and grins; he goes red to the ears
shot("X1-need-a-ladder", L(27, 0), "night", [youLot, tylerNight], (F) => { const t = tyN(L(26, 0)), y = youHead(F); return P(t.clone().add(V(95, 55, 70)), y.clone().add(V(0, -10, 0)), 46); }, { dof: NONE, fx: ["clouds"], allow: { ...GIANT_OK, ...SKY_OK, "Cast overlap": "over Tyler's shoulder onto your face", "Camera curve": "the lens follows your head as you lean" } });

// ================================================================== lines 27-28: you kneel to Zoe; she says yes
// does: wide over the lot: you kneel down, giant, on one knee before the gym, a sea of ducks round your feet
shot("Y1-kneel", L(28, 0), "night", [youLot, zoeNight], (F) => creep(P(V(150, 30, 190), V(33, 62, 20), 56), F, L(27, 0), L(28, 0), 0.04, 0.2), { subject: "you", wide: true, dof: NONE, fx: ["flood"], allow: { ...GIANT_OK, ...CROWD_OK, "Subject size": "Zoe small against the giant you kneeling" } });
// does: Zoe jumps for joy with her arms up, crying and laughing, blushing
shot("Y2-yes", L(29, 0), "night", [zoeNight], (F) => creep(on(zoeNight, L(28, 0), V(-0.4, 0, -1), 1.8, 42, { up: -0.15 }), F, L(28, 0), L(29, 0), 0.1), { dof: close(1.8), fx: ["flood"] });

// ================================================================== line 29: the duck, your number one follower
// does: ground level: the duck at the toe of your giant sneaker looks up and puffs its chest; far above you wink
const duckEnd = YOU_LOT.clone().add(V(5, 0, 7.5));
const Z1 = P(duckEnd.clone().add(V(0.7, 0.15, 1.4)), duckEnd.clone().add(V(-3, 5.5, -6)), 60);
shot("Z1-number-one", FRAMES, "night", [youLot], (F) => creep(Z1, F, L(29, 0), FRAMES, -0.15, 0.06, 0.25), { subject: undefined, dof: close(1.2), fx: ["flood"], crit: [DUCK(() => duckEnd.clone(), duckLot)], props: [fxOn("the duck puffs up", B.still - 2), fxOn("you wink", B.follower - 2)], allow: { ...GIANT_OK } });

export const PLAN: Plan = { slug: "followers-make-you-tall", shots: SHOTS, words };
export { TYLER_N, PILE_TOP, YOU_PILE, clamp01 };
