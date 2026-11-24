import { Object3D, Vector3 } from "three";
import { CamPose, impact } from "../../../kit/toon/camera";
import { DOF, Dof } from "../../../kit/toon/Composer";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { V, boardTex, plane, unlit } from "./common";
import { MAT_SIZE, tarString, cashFan, cerealBox, keys, marker, mattress, mower, pencil, phone, pillow, roller, setThermo, thermometer, toastFaceMat, toaster, wallet } from "./props";
import { BOX, EYE, HOME_SUN, LIVING, SILL, TOASTER, dotAt, moonDayDir } from "./rooms";
import type { Place } from "./scene";
import { DAY, FUN_SUN, HEAT_SUN, IN_SUN, KITCHEN_SUN, SKYWIDE_SUN, SUN } from "./scene";
import {
  B, CLIMBERS, FRAMES, words, DRAG_A, DRAG_B, DRAG_END, L, MATTRESS_C, QUEUERS, Role, SHOPPERS, SLEEPERS, TOASTER_MAT, YOU_FENCE, YOU_GUM, YOU_K11, YOU_K12, YOU_MAT, waterer,
  brother, closetMan, dad, dragAt, face, fridgeMan, handAt, held, kidA, kidB, kyleFence, kyleStair, lerpV, mom, mowerAt, sleepersCinema, span, tvDad, tvMom,
  worldAt, youDrag, youFence, youGum, youK1, youK11, youK12, youMat,
} from "./story";
import { DISPLAY, KYLE_HOUSE, NEON, OWL_AT, PRICE_BOARD, QUEUE, STAIR, STAIR_TOP, SUNDIAL, THERMO, TALLY, wireY } from "./street";

/**
 * sun-never-sets shot plan: one canvas per shot, hard cuts (place and time jumps cut on the word). Each shot's
 * `does:` comment names its visible change.
 */
export type Lit = "kitchen" | "fun" | "day" | "heat" | "dim" | "night" | "skywide" | "closet" | "cinema" | "ohio" | "tv" | "box";
export type Fx = "moth" | "owl" | "fireflies" | "cash" | "heat";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: Place; lit: Lit; fx?: Fx[]; sunAt?: (F: number) => Vector3 };
const PLACE: Record<Lit, Place> = { kitchen: "home", fun: "street", day: "street", heat: "street", dim: "street", night: "street", skywide: "street", closet: "closet", cinema: "cinema", ohio: "ohio", tv: "tv", box: "box" };
const QA_LIGHT: Record<Lit, "day" | "interior" | "night" | "dusk"> = { kitchen: "interior", fun: "day", day: "day", heat: "day", dim: "dusk", night: "night", skywide: "day", closet: "night", cinema: "night", ohio: "interior", tv: "night", box: "night" };
const SUNS: Record<Lit, Vector3> = { kitchen: KITCHEN_SUN, fun: FUN_SUN, day: SUN, heat: HEAT_SUN, dim: SUN, night: SUN, skywide: SKYWIDE_SUN, closet: IN_SUN, cinema: IN_SUN, ohio: IN_SUN, tv: IN_SUN, box: IN_SUN };
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: r.look, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Moving props": "seated: the chair / mattress holds the seated card" };
let cursor = 0;
export const SHOTS: S[] = [];
const shot = (id: string, to: number, lit: Lit, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof; props?: MovingProp[] }): S => {
  const from = cursor;
  cursor = to;
  const { dof, props, allow, ...rest } = o;
  const lead = roles[0]?.name;
  // street life: the neighbour watering his lawn is in every day street shot (dimmed away by the eclipse)
  if ((lit === "fun" || lit === "day" || lit === "heat") && from < L(24, 0) && !roles.includes(waterer)) roles = [...roles, waterer];
  const s: S = {
    id: `snc/${id}`, from, frames: to - from, w: PLACE[lit], lit, scene: lit, light: QA_LIGHT[lit], sun: SUNS[lit],
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: lead,
    moving: props, allow: { ...(roles.some((r) => r.sit) ? SEATED : {}), ...allow }, ...rest,
  };
  SHOTS.push(s);
  return s;
};
const close = (d: number) => () => ({ ...DOF.closeup(d), maxPx: 4 }), mid = (d: number) => () => ({ ...DOF.medium(d), maxPx: 3.5 });
const NONE = () => DOF.none;
/** A framing that creeps (push ~10 % + a little side drift). */
const creep = (f0: { pos: Vector3; look: Vector3; fov: number }, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.2) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  drift *= Math.min(1, d.length() / 6);
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const glideCam = (a: CamPose, b: CamPose, F: number, f0: number, f1: number) => { const t = span(F, f0, f1); return P(lerpV(a.pos, b.pos, t), lerpV(a.look, b.look, t), a.fov + (b.fov - a.fov) * t); };
const free = (name: string, make: () => Object3D, at: (o: Object3D, F: number) => boolean | void, touches?: string[]): MovingProp => ({ name, make, pose: at, touches });
const SKY_TEXT = { "Empty sky": "the sky is the story here (the frozen sun / the eclipse)" };
/** An effect the guard cannot see (a sky disc, a texture swap): an empty marker that appears on its frame, so the
 * static-hold check sees the change. */
const fxOn = (name: string, f0: number) => free(`fx: ${name}`, () => new Object3D(), (o, F) => { o.position.set(0, -20, 0); return F >= f0; });
const QUEUE_OK = { "Cast overlap": "a queue of extras: heads overlap like a real line (no lead in it)", "Card penetration": "extras in a queue stand close" };
const SEAT_OK = { "Card penetration": "seated cards turn toward an oblique lens and swing into their seat edge" };

// ------------------------------------------------------------------ story props shared by many shots
const toasterAt = (where: (F: number) => Vector3, ry = 0) => free("toaster", toaster, (o, F) => {
  const w = worldAt(F);
  o.position.copy(where(F));
  o.rotation.y = ry;
  (o.getObjectByName("face") as unknown as { material: unknown }).material = toastFaceMat(w.toast);
  const toast = o.getObjectByName("toast")!;
  toast.position.y = 0.16 + 0.07 * Math.sin(Math.PI * Math.min(w.toastUp, 1) * 0.5); // popped: half out of the slots, the bottom still inside
  toast.visible = F < L(2, 0); // (eaten: the street toaster is empty)
}, ["kitchen", "mattress"]);
const kitchenToaster = toasterAt(() => TOASTER.clone());
/** The mattress: dragged behind you (its far end trailing), then lying in the road. */
const matAt = (F: number) => {
  if (F >= DRAG_END) return MATTRESS_C.clone();
  const y = dragAt(F), d = DRAG_B.clone().sub(DRAG_A).normalize();
  const gap = 0.24 - 0.13 * Math.min(Math.max((F - DRAG_END + 10) / 10, 0), 1); // settles to the seated 11 cm as you sit
  return y.addScaledVector(d, -(gap + MAT_SIZE.l / 2));
};
const theMattress = free("mattress", mattress, (o, F) => { if (F < L(13, 0) - 6) return false; o.position.copy(matAt(F)); o.rotation.y = Math.PI / 2 + (F < DRAG_END ? Math.atan2(DRAG_B.x - DRAG_A.x, DRAG_B.z - DRAG_A.z) : 0); }, ["ground", "mattress"]);
const matToaster = toasterAt((F) => (F < DRAG_END ? matAt(F).add(V(0.3, MAT_SIZE.h, 0.3)) : TOASTER_MAT.clone()), 0);
const thermo = free("thermometer", thermometer, (o, F) => { o.position.copy(THERMO); setThermo(o, worldAt(F).temp); }, ["house 1"]);
const theMower = free("mower", mower, (o, F) => { o.position.copy(mowerAt(F)); o.rotation.y = 0; }, ["ground"]);
const STREET_PROPS = (F0: number) => (F0 >= L(13, 0) - 6 ? [theMattress, matToaster, thermo, theMower] : [thermo, theMower]);

// ================================================================== line 1: 3 AM, the sun blazing, the toaster talks
// does: you at the counter, red-eyed and twitching, the microwave says 3:00 AM, white sun blasts through the window
const A1 = P(V(0.25, 1.38, 0.85), V(-0.55, 1.12, -1.65), 50);
shot("A1-3am", B.n29, "kitchen", [youK1], (F) => creep(A1, F, 0, B.n29, 0.06), { dof: mid(2.2), props: [kitchenToaster] });
// does: hard cut up to the sun itself, huge and glaring over the south rooftops (heat shimmer of motes)
const A2p = V(-6, 1.5, -1.6), A2 = P(A2p, A2p.clone().addScaledVector(V(0, 0, 0).add(skyDirDeg(150, 26)), 20), 52);
shot("A2-the-sun", L(1, 6), "day", [], (F) => creep(A2, F, B.n29, L(1, 6), 0.02, 0.15, 0), { wide: true, subject: undefined, dof: NONE, allow: SKY_TEXT, fx: ["heat"] });
// does: you and the toaster side by side (user 2026-11-24: the old tight close was "messy for the eyes"): the whole
// toaster on the left, its face says "relax", the toast pops up, you jump ring-eyed on the right; no shake
const A3 = P(V(0.05, 1.3, 1.6), V(-0.69, 1.0, -1.6), 40);
shot("A3-relax", L(2, 0), "kitchen", [youK1], (F) => creep(A3, F, L(1, 6), L(2, 0), 0.1, 0, 0.12), { dof: mid(3.2), props: [kitchenToaster, fxOn("toaster talks", L(1, 10) - 2)] });

// ================================================================== line 2: the sun stops
// does: the sun slides down toward the roofs, then brakes dead with a bounce on "stopped" (the lens shakes)
const B1p = V(-2.5, 2.0, -8.6), B1 = P(B1p, B1p.clone().addScaledVector(skyDirDeg(150, 28), 30), 56);
const sunSlide = (F: number) => { const el = F < B.stopped ? 43 + 19 * (1 - span(F, L(2, 0), B.stopped)) : 43 - 1.6 * Math.exp(-(F - B.stopped) / 5) * Math.sin((F - B.stopped) / 2.2); return skyDirDeg(150, el); };
shot("B1-sun-stops", B.sky + 4, "skywide", [], impact((F) => creep(B1, F, L(2, 0), B.sky, 0.02, 0, 0), B.stopped, 0.02, 7), { wide: true, subject: undefined, dof: NONE, kicks: [[B.stopped - L(2, 0), B.stopped - L(2, 0) + 7]], sunAt: sunSlide, allow: SKY_TEXT, props: [fxOn("the sun slides", L(2, 0) + 4), fxOn("the sun brakes", B.stopped)] });
// does: macro on the garden sundial: its shadow sits frozen on III while the lens creeps round it
const B2 = P(SUNDIAL.clone().add(V(0.5, 1.55, 0.95)), SUNDIAL.clone().add(V(0, 0.9, 0)), 38);
shot("B2-sundial", L(3, 0), "day", [], (F) => creep(B2, F, B.sky + 4, L(3, 0), 0.18, 0, 0.25), { subject: undefined, dof: close(0.75), props: STREET_PROPS(B.sky) });

// ================================================================== line 3: at first it's awesome
// does: two kids sprint along the south lawn past the kicked-over BEDTIME? sign, the lens tracking with them
// a fixed lens (a tracking lens smears the kids with the camera's motion blur): they sprint at it, growing
const C1 = P(V(3.4, 1.0, 4.0), V(-2.6, 0.9, 6.9), 46);
shot("C1-kids", L(3, 7), "fun", [kidA, kidB], (F) => creep(C1, F, L(3, 0), L(3, 7), 0.16), { subject: undefined, wide: true, dof: NONE, allow: { "Text in frame": "the kicked-over BEDTIME? sign slides past the frame edge as the kids run", "Cast overlap": "the kids run past the neighbour watering his lawn" }, props: STREET_PROPS(L(3, 0)) });
// does: Dad rides his mower across a lawn mown to dirt, then waves at the chalk tally: 11 MOWS
// the lens pans with the mower; the MOWS chalkboard slides into frame behind him
const C2 = (F: number) => { const x = mowerAt(F).x; return P(V(x + 0.3, 1.3, -4.7), V(x + 0.05, 0.85, -9.4), 50); };
shot("C2-dad-mows", L(4, 0), "fun", [dad], C2, { wide: true, dof: NONE, props: STREET_PROPS(L(3, 7)), allow: { "Card penetration": "Dad rides the mower (the card sits on its seat)", "Feet on the ground": "Dad's feet rest on the mower's footboard", Shadows: "the mower carries Dad (his blob is on its footboard)" } });

// ================================================================== line 4: the 2D cutaway (Video.tsx) covers L(4,0) .. L(5,0)
cursor = L(5, 0);
export const INSERTS: [number, number][] = [[L(4, 0), L(5, 0)]];

// ================================================================== line 5: darkness, the most expensive thing on Earth
// does: from inside the corner mart: four red-eyed faces press against the glass behind the black box on its stand
const E1 = P(V(21.7, 1.42, -10.6), V(20.9, 1.3, -7.1), 50);
shot("E1-faces-glass", B.darkness + 6, "day", SHOPPERS, (F) => creep(E1, F, L(5, 0), B.darkness + 6, 0.1), { subject: undefined, wide: true, dof: mid(2.2), props: STREET_PROPS(L(5, 0)), allow: { "Card penetration": "faces pressed against the shop glass" } });
// does: between two heads, close on the box: the tag DARKNESS $10,000 under its spotlight
const E2 = P(V(21.1, 1.2, -6.45), DISPLAY.clone().add(V(0.02, -0.34, 0.25)), 36);
// the SOLD OUT! sticker slaps onto the tag on "Earth"
const soldOut = free("sold out sticker", () => { const g = new Object3D(); g.add(plane(0.3, 0.12, unlit("soldout", () => boardTex(["SOLD OUT!"], "#e8342c", "#fff8ec", 512, 200)), V(0, 0, 0))); return g; }, (o, F) => { const t = Math.min(1, Math.max(0, (F - B.earth + 3) / 4)); o.position.copy(DISPLAY).add(V(0.36, -0.06, 0.16)); o.rotation.set(0, -0.2, 0.22); o.scale.setScalar(1.6 - 0.6 * t); return F >= B.earth - 3; }, ["mart"]);
shot("E2-price-tag", L(6, 0), "day", [], (F) => creep(E2, F, B.darkness + 6, L(6, 0), 0.12), { subject: undefined, dof: close(1.6), props: [soldOut], allow: { "Subject covered": "foreground heads frame the box by design", "Cast overlap": "foreground heads frame the box", "Card penetration": "faces pressed against the shop glass" } });

// ================================================================== line 6: closets and cinemas
// does: a hallway closet, door open with FOR RENT $900 PER NIGHT taped on; a man curled up asleep among the coats
const F1 = P(V(-1.3, 1.3, 2.75), V(0.24, 1.05, 0.1), 58);
shot("F1-closet", L(6, 7), "closet", [closetMan], (F) => creep(F1, F, L(6, 0), L(6, 7), 0.12), { dof: mid(2.0), allow: { "Card penetration": "he sits curled up inside the closet among the coats", "Text in frame": "the FOR RENT sign on the open door at the frame edge" } });
// does: a dark cinema, rows of people asleep in the seats in the screen's blue glow, HOTEL hung over the back wall
const F2 = P(V(0.15, 2.0, -3.7), V(0.05, 1.55, 3.0), 56);
shot("F2-cinema", L(7, 0), "cinema", sleepersCinema, (F) => creep(F2, F, L(6, 7), L(7, 0), 0.08), { subject: undefined, wide: true, dof: NONE, allow: { ...SEAT_OK, "Cast overlap": "rows of sleepers, one behind the other", "Caption vs face": "a crowd of extras; the caption sits over the far heads" } });

// ================================================================== line 7: the guy in Ohio
// does: a man folded up inside his open fridge hugging his knees; the door swings shut on "fridge", the light clicks off
const G1 = P(V(0.7, 1.25, 2.6), V(0, 0.95, -0.95), 50);
shot("G1-fridge", L(8, 0), "ohio", [fridgeMan], (F) => creep(G1, F, L(7, 0), L(8, 0), 0.1), { dof: mid(2.2), allow: { "Card penetration": "he sits inside the fridge shell (the door closes in front of him)" } });

// ================================================================== line 8: Kyle sells night
// does: low angle: Kyle with a black paint roller over his shoulder under his pink neon KYLE'S NIGHT CLUB sign
const H1 = P(V(7.5, 0.6, -5.3), V(8.75, 1.75, -8.7), 46);
shot("H1-kyle-neon", B.sells, "day", [kyleStair], (F) => creep(H1, F, L(8, 0), B.sells, 0.1, 0.1), { dof: mid(2.4), props: [...STREET_PROPS(L(8, 0)), held("roller", roller, kyleStair, "left", (F) => creep(H1, F, L(8, 0), B.sells, 0.1, 0.1))] });
// does: the price board (REAL DARK: 1 HR $500) and the line of people in pyjamas holding pillows and cash
const H2 = P(V(12.6, 1.4, -2.7), V(10.6, 1.1, -7.4), 44);
const pillowsFor = (rs: Role[], cam: (F: number) => CamPose) => rs.filter((_, i) => i % 3 === 0).map((r, i) => held(`pillow ${r.name}`, () => pillow(["#f2f0ea", "#c8d8f0", "#f6d8e2"][i % 3]), r, "right", cam, { fwd: 0.1 }));
const H2c = (F: number) => creep(H2, F, B.sells, L(9, 0), 0.08);
shot("H2-queue", L(9, 0), "day", QUEUERS.slice(0, 8), H2c, { subject: undefined, wide: true, dof: NONE, allow: QUEUE_OK, props: [...STREET_PROPS(B.sells), ...pillowsFor(QUEUERS.slice(0, 8), H2c)] });

// ================================================================== line 9: "Hey, Sunshine!"
// does: Kyle leans over the fence fanning a stack of cash at you, mouth going
const I1 = P(V(-2.9, 1.5, -6.4), V(0.45, 1.3, -7.3), 26);
const I1c = (F: number) => creep(I1, F, L(9, 0), B.cash, 0.06, 0, 0.1);
shot("I1-kyle-fence", B.cash, "day", [kyleFence], I1c, { dof: close(3.3), props: [...STREET_PROPS(L(9, 0)), held("cash", cashFan, kyleFence, "left", I1c)], allow: { "Text in frame": "the bills' 100s flutter behind his fingers" } });
// does: over the fence: you, red-eyed, deadpan, arms crossed
const I2 = P(V(1.9, 1.55, -6.6), V(-0.95, 1.25, -7.55), 30);
shot("I2-you-deadpan", L(10, 0), "day", [youFence], (F) => creep(I2, F, B.cash, L(10, 0), 0.08), { dof: close(2.9), props: STREET_PROPS(B.cash) });

// ================================================================== line 10: you can't afford it
// does: close on your hands: the wallet opens and a moth flutters out of it
const J1v = YOU_FENCE.clone().add(V(0.45, 1.3, 1.45));
const J1 = (F: number) => creep(P(J1v, YOU_FENCE.clone().add(V(0, 1.12, 0)), 40), F, L(10, 0), L(10, 4), 0.1);
shot("J1-wallet", L(10, 4), "day", [youFence], J1, { subject: undefined, dof: close(0.9), fx: ["moth"], props: [...STREET_PROPS(L(10, 0)), held("wallet", wallet, youFence, "right", J1, { fwd: 0.1, when: (F) => F < L(10, 4) + 6 })], allow: {} });
// does: your face narrows into a scheme, a hand to your chin
const J2 = P(V(-0.35, 1.45, -5.4), V(-0.95, 1.28, -7.55), 36);
shot("J2-scheme", L(11, 0), "day", [youFence], (F) => creep(J2, F, L(10, 4), L(11, 0), 0.14), { dof: close(1.3), props: STREET_PROPS(L(10, 4)), allow: { "Text in frame": "the MOWS chalkboard far behind, soft" } });

// ================================================================== line 11: a hole in a cereal box
// does: macro: a pencil pushes through the side of a SUNNY O's box on the worktop
// does: you hold the SUNNY O's box out in one hand and jab a pencil through its side with the other on "hole"
const K1 = P(YOU_K11.clone().add(V(0.35, 1.15, 2.2)), YOU_K11.clone().add(V(0.05, 1.0, 0)), 44);
const K1c = (F: number) => creep(K1, F, L(11, 0), L(11, 6), 0.12);
const boxLeft = held("cereal box (left)", () => cerealBox(), youK11, "left", K1c, { fwd: 0.06, up: -0.09, when: (F) => F < L(11, 6) });
const pencilRight = held("pencil", pencil, youK11, "right", K1c, { fwd: 0.08, orient: (ob) => { ob.rotation.y -= Math.PI / 2; } });
shot("K1-pencil", L(11, 6), "kitchen", [youK11], K1c, { dof: close(1.4), props: [boxLeft, pencilRight, kitchenToaster], allow: { "Props through props": "the pencil pokes through the box: the gag" } });
// does: you hold the box up to one eye and peer in, grinning
const K2 = P(V(-1.1, 1.5, 0.35), V(-1.8, 1.25, -1.25), 44);
const K2c = (F: number) => creep(K2, F, L(11, 6), L(12, 0), 0.1);
shot("K2-peer", L(12, 0), "kitchen", [youK11], K2c, { dof: close(1.1), props: [kitchenToaster, held("cereal box", () => cerealBox(), youK11, "right", K2c, { fwd: 0.12, up: -0.1, when: (F) => F >= L(11, 6) })], allow: { "Cast overlap": "the box at your eye is the gag", "Subject covered": "the box at your eye is the gag" } });

// ================================================================== line 12: a dot every morning
// does: your phone on the sill says 7:00 AM under the same blazing sun; marker dots trail across the glass
const L1 = P(V(0.3, 1.2, -1.52), V(0.34, 1.33, -2.2), 40);
const sillPhone = free("phone 7am", () => phone("7:00", "MORNING?"), (o, F) => { o.position.copy(SILL); o.rotation.set(-0.25, -0.3, 0); o.getObjectByName("screen")!.visible = F >= L(12, 1) - 2; }, ["kitchen"]);
shot("L1-7am", L(12, 8), "kitchen", [], (F) => creep(L1, F, L(12, 0), L(12, 8), 0.12), { subject: undefined, dof: close(0.75), props: [sillPhone, kitchenToaster, fxOn("the phone lights up", L(12, 1) - 2), fxOn("the phone buzzes 7:00", L(12, 6))] });
// does: from outside the window: you lean in with a marker and today's dot lands on the glass on "dot"
const L2tip = dotAt(2);
const L2 = P(L2tip.clone().add(V(0.12, 0.05, -2.15)), YOU_K12.clone().add(V(0, 1.2, 0)), 32);
const L2c = (F: number) => creep(L2, F, L(12, 8), L(13, 0), 0.08);
shot("L2-the-dot", L(13, 0), "kitchen", [youK12], L2c, { dof: close(1.7), props: [fxOn("today's dot lands", B.dot), held("marker", marker, youK12, "right", L2c, { fwd: 0.12, orient: (ob) => ob.rotation.set(-0.5, ob.rotation.y, 0.75) })] });

// ================================================================== line 13: the mattress into the street
// does: side-on track: you haul your mattress down the drive and into the road, leaning into it, the toaster riding on top
const M1c = (F: number) => creep(P(V(-2.6, 1.25, 3.4), V(-1.7, 0.95, -4.6), 48), F, L(13, 0), L(13, 11), 0.1);
shot("M1-drag", L(13, 11), "day", [youDrag], M1c, { dof: mid(3.0), props: STREET_PROPS(L(13, 0)), allow: { "Moving props": "the mattress is dragged (it touches the ground and you)", "Feet on the ground": "stepping down off the kerb", "Card penetration": "you drop onto the mattress end" } });
// does: close on your phone: you set an alarm for 2:14 PM
const M2h = handAt(youDrag, L(13, 13), V(-1.9, 1.0, 1.6), "right");
const M2c = (F: number) => creep(P(M2h.clone().add(V(0.12, 0.08, 0.42)), M2h.clone().add(V(0, 0.05, 0)), 34), F, L(13, 11), L(14, 0), 0.12);
shot("M2-alarm-set", L(14, 0), "day", [youDrag], M2c, { subject: undefined, dof: close(0.45), props: [...STREET_PROPS(L(13, 11)), held("phone alarm", () => phone("2:14", "ALARM SET"), youDrag, "right", () => P(V(-1.9, 1.0, 1.6), V(0, 0, 0), 40), { fwd: 0.1 })], allow: { "Subject size": "insert on the phone in your hand", ...SEATED, ...SEAT_OK } });

// ================================================================== line 14: Kyle thinks you've snapped
// does: telephoto: Kyle over his fence laughing, twirling a finger at his temple
const N1 = P(V(-1.4, 1.45, -1.4), V(0.25, 1.4, -7.3), 24);
shot("N1-kyle-laughs", B.snapped + 20, "day", [kyleFence], (F) => creep(N1, F, L(14, 0), B.snapped + 20, 0.05), { dof: close(5.8), props: STREET_PROPS(L(14, 0)) });
// does: close on the toaster on your mattress: its eyes roll up on "toaster", you blurred behind
// the whole toaster at three-quarters: chrome body, slots, lever, its face rolling its eyes
const N2 = P(TOASTER_MAT.clone().add(V(0.42, 0.36, 0.78)), TOASTER_MAT.clone().add(V(0.01, 0.11, 0)), 42);
shot("N2-toaster-rolls", L(15, 0), "day", [youMat], (F) => creep(N2, F, B.snapped + 20, L(15, 0), 0.14), { subject: undefined, dof: close(0.75), props: [...STREET_PROPS(L(14, 0)), fxOn("the toaster rolls its eyes", B.toaster14 - 3)], allow: { "Subject size": "insert on the toaster", ...SEAT_OK } });

// ================================================================== line 15: the town cooks
// does: macro on the porch thermometer: the needle creeps into the red, 96 -> 112
const O1 = P(THERMO.clone().add(V(0.1, 0.06, 0.55)), THERMO.clone(), 36);
shot("O1-thermo", L(15, 9), "heat", [], (F) => creep(O1, F, L(15, 0), L(15, 9), 0.15), { subject: undefined, dof: close(0.55), fx: ["heat"], props: [...STREET_PROPS(L(15, 0)), fxOn("the needle climbs", B.cool)] });
// does: low macro: your sneaker peels up off the melting road with a long string of tar
const gum = free("tar string", tarString, (o, F) => { o.position.copy(YOU_GUM).add(V(0.1, 0, 0.04)); o.scale.set(1, Math.min(1, Math.max(0.05, (F - B.stove + 30) / 10)), 1); return F >= B.stove - 30; }, ["ground"]);
const O2 = P(YOU_GUM.clone().add(V(0.5, 0.32, 0.95)), YOU_GUM.clone().add(V(0, 0.28, 0)), 38);
shot("O2-tar", L(16, 0), "heat", [youGum], (F) => creep(O2, F, L(15, 9), L(16, 0), 0.12), { subject: undefined, dof: close(1.1), fx: ["heat"], props: [...STREET_PROPS(L(15, 9)), gum], allow: { "Subject size": "a low insert on your foot peeling off the road" } });

// ================================================================== line 16: the line wraps the block; Mom trades the car
// does: a crane up over the street: the pyjama line snakes from Kyle's stairwell down the sidewalk past the mart
const P1a = P(V(13.5, 2.2, 1.6), V(14.5, 0.8, -5.6), 50), P1b = P(V(13.0, 5.6, 3.4), V(15.5, 0.4, -5.2), 50);
const P1c = (F: number) => glideCam(P1a, P1b, F, L(16, 0), B.mom);
shot("P1-line-block", B.mom, "day", QUEUERS, P1c, { subject: undefined, wide: true, dof: NONE, allow: QUEUE_OK, props: [...STREET_PROPS(L(16, 0)), ...pillowsFor(QUEUERS, P1c)] });
// does: Mom hands Kyle the car keys; he spins them on his finger
const P2 = P(V(6.3, 1.45, -4.5), V(8.0, 1.3, -7.5), 42);
const P2c = (F: number) => creep(P2, F, B.mom, L(17, 0), 0.08);
shot("P2-the-car", L(17, 0), "day", [kyleStair, mom], P2c, { dof: mid(2.4), props: [...STREET_PROPS(B.mom), held("keys mom", keys, mom, "right", P2c, { when: (F) => F < B.car })] });

// ================================================================== line 17: 2:14 PM
// does: you wait on the mattress in the road, sweating, the toaster beside you
const Q1 = P(V(-1.95, 1.05, 2.65), V(-2.32, 1.0, 0.4), 40);
shot("Q1-waiting", B.rings - 17, "day", [youMat], (F) => creep(Q1, F, L(17, 0), B.rings - 17, 0.1), { dof: mid(2.1), props: STREET_PROPS(L(17, 0)), allow: SEAT_OK });
// does: the phone in your hand buzzes and jumps: ALARM 2:14 PM
const Q2h = handAt(youMat, B.rings + 6, V(-1.85, 1.05, 2.55), "right");
const Q2c = (F: number) => creep(P(Q2h.clone().add(V(0.1, 0.03, 0.46)), Q2h.clone().add(V(0, 0.0, 0)), 34), F, B.rings - 17, L(18, 0), 0.12);
const buzz = (ob: Object3D, F: number) => { ob.rotation.z = F >= B.rings - 2 ? 0.08 * Math.sin(F * 2.7) : 0; ob.position.x += F >= B.rings - 2 ? 0.004 * Math.sin(F * 3.3) : 0; };
shot("Q2-alarm-rings", L(18, 0), "day", [youMat], Q2c, { subject: undefined, dof: close(0.42), props: [...STREET_PROPS(B.rings), held("phone ringing", () => phone("2:14", "PM", true), youMat, "right", () => P(V(-1.85, 1.05, 2.55), V(0, 0, 0), 40), { fwd: 0.1, orient: buzz })], allow: { "Subject size": "insert on the ringing phone", ...SEAT_OK } });

// ================================================================== line 18: nothing happens
// does: low angle on your face looking up at the sky, waiting
const R1 = P(V(-2.12, 0.62, 2.4), V(-2.3, 1.02, 0.46), 44);
shot("R1-look-up", L(18, 6), "day", [youMat], (F) => creep(R1, F, L(18, 0), L(18, 6), 0.12), { dof: close(1.3), props: STREET_PROPS(L(18, 0)) });
// does: telephoto down the sidewalk: the whole pyjama line turns to stare at you
const R2 = P(V(-1.2, 1.45, 0.4), V(12.5, 1.3, -5.0), 16);
shot("R2-line-stares", L(18, 8), "day", QUEUERS.slice(3, 12), (F) => creep(R2, F, L(18, 6), L(18, 8), 0.03), { subject: undefined, wide: true, dof: NONE, allow: QUEUE_OK, props: STREET_PROPS(L(18, 6)) });
// does: push in on your face: a sweat drop runs down on "nothing"
const R3a = P(V(-2.22, 1.2, 2.6), V(-2.3, 0.98, 0.46), 38), R3b = P(V(-2.26, 1.18, 2.2), V(-2.3, 0.98, 0.46), 38);
shot("R3-still-nothing", L(19, 0), "day", [youMat], (F) => glideCam(R3a, R3b, F, L(18, 8), L(19, 0)), { dof: close(1.0), props: STREET_PROPS(L(18, 8)) });

// ================================================================== line 19: "Nice alarm, Sunshine!"
// does: Kyle at his stairwell, laughing, points at you with your mom's car keys
const S1 = P(V(5.4, 1.45, -1.6), V(8.4, 1.45, -7.65), 24);
const S1c = (F: number) => creep(S1, F, L(19, 0), L(20, 0), 0.14, 0, 0.35);
shot("S1-nice-alarm", L(20, 0), "day", [kyleStair], S1c, { dof: close(6.6), props: [...STREET_PROPS(L(19, 0)), held("keys kyle", keys, kyleStair, "right", S1c)], allow: { "Text in frame": "his neon sign behind him, cropped (read whole in H1)" } });

// ================================================================== line 20: a bite out of the sun
// does: you lift the cereal box over your head and peer into it
const T1 = P(V(-1.9, 1.15, 2.5), V(-2.3, 1.0, 0.46), 40);
const T1c = (F: number) => creep(T1, F, L(20, 0), L(20, 7), 0.1);
shot("T1-box-up", L(20, 7), "day", [youMat], T1c, { dof: close(1.3), props: [...STREET_PROPS(L(20, 0)), held("viewer", () => cerealBox(), youMat, "right", T1c, { fwd: 0.14, up: 0.02 })], allow: { "Cast overlap": "the box over your face is the gag", "Subject covered": "the box over your face is the gag" } });
// does: POV inside the box: the pinhole's little sun on the white card, a dark bite sliding into its edge on "bite"
shot("T2-the-bite", L(21, 0), "box", [], (F) => creep(P(V(0, BOX.h / 2 + 0.03, -0.03), V(0, BOX.h / 2, -BOX.l), 52), F, L(20, 7), L(21, 0), 0.12, 0, 0), { subject: undefined, dof: NONE, props: [fxOn("the bite slides in", B.bite - 2)], allow: { "Camera clearance": "POV inside the cereal-box viewer" } });

// ================================================================== line 21: the Moon didn't stop
// does: telephoto on the sun: the Moon's disc slides further in, the bite growing on "didn't"
const sunCam = (pos: Vector3, fov: number) => P(pos, pos.clone().addScaledVector(SUN, 100), fov);
shot("U1-moon-slides", L(22, 0), "day", [], (F) => { const a = sunCam(V(-2.6, 1.3, -2.5), 17), b = sunCam(V(-2.6, 1.3, -2.5), 13); const c = glideCam(a, b, F, L(21, 0), L(22, 0)); c.look.add(V(0.0, 3.0, 4.5).multiplyScalar(span(F, L(21, 0), L(22, 0)) - 0.5)); return c; }, { wide: true, subject: undefined, dof: NONE, allow: { ...SKY_TEXT, "Camera curve": "telephoto on the bare sky: no set in frame to measure creep against; the Moon is the motion" }, props: [fxOn("the bite grows", L(21, 3)), fxOn("the Moon slides in", B.didnt - 2)] });

// ================================================================== line 22: the dots were the Moon
// does: back in the kitchen, from where you drew them: the dot trail on the glass runs straight to the Moon on the sun
const V1 = P(EYE.clone(), EYE.clone().addScaledVector(moonDayDir(3.5), 5), 64);
shot("V1-dots-moon", L(23, 0), "kitchen", [], (F) => creep(V1, F, L(22, 0), L(23, 0), 0.03, 0, 0), { subject: undefined, wide: true, dof: NONE, allow: SKY_TEXT, props: [fxOn("the Moon reaches the dots", B.moon22 - 2), fxOn("the bite deepens", L(22, 10))] });

// ================================================================== line 23: every 29 days
// does: behind the pyjama line, all of them turning their faces up to the bitten sun
const W1p = V(11.5, 0.8, -7.4), W1 = P(W1p, W1p.clone().addScaledVector(skyDirDeg(140, 22), 10), 60);
shot("W1-all-look-up", B.walks + 6, "day", QUEUERS.slice(3, 11), (F) => creep(W1, F, L(23, 0), B.walks + 6, 0.02, 0.05, 0), { subject: undefined, wide: true, dof: NONE, props: STREET_PROPS(L(23, 0)), allow: { ...SKY_TEXT, ...QUEUE_OK, "Caption vs face": "a crowd of extras; the caption sits over the far heads" } });
// does: a living room: the little brother strolls in front of the TV and the room goes dark; Mom and Dad groan
const W2 = P(V(-2.4, 1.35, 3.1), V(0.2, 0.75, -0.9), 46);
shot("W2-little-brother", L(24, 0), "tv", [tvMom, tvDad, brother], (F) => creep(W2, F, B.walks + 6, L(24, 0), 0.06), { subject: undefined, dof: mid(4.2), allow: { ...SEAT_OK, "Cast overlap": "the little brother walks in front of them: the gag" } });

// ================================================================== line 24: the street goes dim
// does: down the whole street in thin blue light: people hug themselves in the cold air, the lens drifting forward
const X1a = P(V(-9, 1.6, 0.8), V(12, 1.0, -3.5), 50), X1b = P(V(-7.8, 1.5, 0.6), V(12, 1.0, -3.5), 50);
shot("X1-dim", B.flick - 4, "dim", [youMat, ...QUEUERS.slice(3, 14)], (F) => glideCam(X1a, X1b, F, L(24, 0), B.flick - 4), { subject: undefined, wide: true, dof: NONE, props: STREET_PROPS(L(24, 0)), allow: { ...QUEUE_OK, ...SEAT_OK } });
// does: the streetlights flick on one after another, from the far end toward the lens
const X2 = P(V(20.5, 1.8, -2.4), V(0, 2.6, -4.0), 46);
shot("X2-lights-on", L(25, 0), "dim", QUEUERS.slice(5, 14), (F) => creep(X2, F, B.flick - 4, L(25, 0), 0.04), { subject: undefined, wide: true, dof: NONE, props: STREET_PROPS(B.flick - 4), allow: { ...QUEUE_OK, "Caption vs face": "a crowd of extras; the caption sits over the far heads" } });

// ================================================================== line 25: the last sliver
// does: telephoto: the last bead of sun shrinks to a point...
shot("Y1-last-bead", B.vanishes, "dim", [], (F) => creep(sunCam(V(-2.6, 1.3, -2.5), 15), F, L(25, 0), B.vanishes, 0.0), { wide: true, subject: undefined, dof: NONE, allow: SKY_TEXT });
// does: ...and vanishes: the sky snaps to night, the corona blooms white round a black disc
shot("Y2-corona", L(26, 0), "night", [], (F) => creep(sunCam(V(-2.6, 1.3, -2.5), 15), F, B.vanishes, L(26, 0), 0.0), { wide: true, subject: undefined, dof: NONE, allow: SKY_TEXT });

// ================================================================== line 26: the stars come out
// does: from your amazed face on the mattress the lens cranes up into a sky full of stars
const Z1a = P(V(-1.9, 1.0, 2.4), V(-2.3, 0.8, 0.4), 44), Z1b = P(V(-1.85, 1.28, 2.6), V(-2.5, 3.8, -5.0), 52);
shot("Z1-stars", B.stars + 6, "night", [youMat], (F) => glideCam(Z1a, Z1b, F, L(26, 0), B.stars + 6), { subject: "you", subjectFrom: 0, dof: NONE, fx: ["fireflies"], props: STREET_PROPS(L(26, 0)), allow: { ...SKY_TEXT, ...SEAT_OK, "Subject in frame": "the crane leaves you for the stars", "Caption vs face": "the crane tilts up off your face to the stars" } });
// does: an owl on the power line hoots like it has waited a month, fireflies blinking below
export const OWL = V(-1.0, wireY(-1.0) + 0.08, OWL_AT.z - 0.4); // on the front wire (the one nearest the lens), feet on it: sprite size 0.42 at fov 44 = a 17 cm owl, feet 0.47 of it below the centre
const Z2 = P(OWL.clone().add(V(-0.3, -0.4, -1.95)), OWL.clone().add(V(0, -0.15, 0)), 44); // a real-size owl (user 2026-11-24: way too big)
shot("Z2-owl", L(27, 0), "night", [], (F) => creep(Z2, F, B.stars + 6, L(27, 0), 0.12), { subject: undefined, dof: NONE, fx: ["owl", "fireflies"], allow: { ...SKY_TEXT, "Camera clearance": "the lens floats below the wire" } });

// ================================================================== line 27: Kyle's basement empties
// does: low at the stairwell: his customers pour up out of the basement and run past the lens, dropping cash
const AA = P(V(9.2, 0.55, -4.7), V(9.35, 0.45, -9.8), 50);
shot("AA1-basement-empties", L(28, 0), "night", [kyleStair, ...CLIMBERS], (F) => creep(AA, F, L(27, 0), L(28, 0), 0.06), { subject: undefined, wide: true, dof: NONE, fx: ["cash", "fireflies"], props: STREET_PROPS(L(27, 0)), allow: { "Feet on the ground": "the customers climb the stairwell steps", "Card penetration": "the customers climb out between the stairwell walls", "Cast overlap": "the customers rush past Kyle", "Caption vs face": "a crowd of extras; the caption sits over the far heads" } });

// ================================================================== line 28: "That's MY night!"
// does: Kyle alone at his steps shaking his fist at the sky, steam off his head, the neon flickering behind
const AB = P(V(7.1, 1.15, -5.3), V(8.4, 1.25, -7.65), 38);
shot("AB1-my-night", L(29, 0), "night", [kyleStair], (F) => creep(AB, F, L(28, 0), L(29, 0), 0.12), { dof: close(2.4), fx: ["fireflies"], props: STREET_PROPS(L(28, 0)), allow: { "Text in frame": "his neon sign behind him, cropped (read whole in H1)" } });

// ================================================================== line 29: the whole street asleep
// does: a high crane drifts across the street: neighbours asleep in lawn chairs, you on your mattress in the road
const AC1a = P(V(-4.6, 2.6, 3.0), V(-2.4, -0.1, -2.0), 52), AC1b = P(V(-0.8, 2.5, 3.2), V(-2.0, -0.1, -2.2), 52);
shot("AC1-asleep", L(29, 3), "night", [youMat, ...SLEEPERS], (F) => glideCam(AC1a, AC1b, F, L(29, 0), L(29, 3) + 10), { subject: undefined, wide: true, dof: NONE, fx: ["fireflies"], props: STREET_PROPS(L(29, 0)), allow: SEAT_OK });
// does: Dad asleep on his mower, chin on his chest, two neighbours asleep in lawn chairs behind
const AC2 = P(V(-1.6, 1.15, -4.6), V(-4.2, 0.9, -7.6), 42);
shot("AC2-dad-asleep", L(30, 0), "night", [dad, ...SLEEPERS.slice(0, 2)], (F) => creep(AC2, F, L(29, 3), L(30, 0), 0.1), { dof: mid(3.6), fx: ["fireflies"], props: STREET_PROPS(L(29, 3)), allow: { ...SEAT_OK, "Card penetration": "Dad sits on the mower; the neighbours in their lawn chairs" } });

// ================================================================== line 30: three minutes of night
// does: you on the mattress under the stars, the toaster beside you, your eyes getting heavy
const AD1 = P(V(-1.7, 1.0, 2.9), V(-2.3, 0.9, 0.3), 44);
shot("AD1-three-minutes", L(30, 4), "night", [youMat], (F) => creep(AD1, F, L(30, 0), L(30, 4), 0.1), { dof: mid(2.4), fx: ["fireflies"], props: STREET_PROPS(L(30, 0)), allow: SEAT_OK });
// does: mirror of the cold open: you and the toaster close; your eyes close into a smile, the toaster smiles too
const AD2 = P(V(-2.22, 1.0, 2.15), V(-2.3, 0.9, 0.35), 44);
shot("AD2-listen", FRAMES, "night", [youMat], (F) => creep(AD2, F, L(30, 4), FRAMES, 0.07), { dof: close(1.25), fx: ["fireflies"], props: [...STREET_PROPS(L(30, 4)), fxOn("your eyes close", B.toaster30 - 30), fxOn("the toaster smiles", B.toaster30 - 2)], allow: SEAT_OK });

export const PLAN: Plan = { slug: "sun-never-sets", shots: SHOTS, words, inserts: INSERTS };
function skyDirDeg(az: number, el: number) { const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180; return new Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)); }
export { DAY, HOME_SUN, KYLE_HOUSE, LIVING, NEON, PRICE_BOARD, QUEUE, STAIR, STAIR_TOP, TALLY, YOU_MAT, face };
