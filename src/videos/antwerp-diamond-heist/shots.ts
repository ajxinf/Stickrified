import { AdditiveBlending, CanvasTexture, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from "three";
import { CamPose, frameOn, impact } from "../../../kit/toon/camera";
import { DOF, Dof } from "../../../kit/toon/Composer";
import { headHeight } from "../../../kit/toon/figure";
import type { MovingProp, Plan, Shot } from "../../../kit/toon/guard";
import { V } from "./common";
import { SANDWICH } from "./outside";
import { aluPlate, cuffs, envelope, foamBoard, hairspray, heldBag, lockPick, loupe, newspaper, receipt, sandwich, stick, tapeRoll, vaultKey, videotape } from "./props";
import { ITABLE } from "./rooms";
import type { Place } from "./scene";
import { FOREST_SUN, IN_SUN, STREET_SUN } from "./scene";
import {
  B, COP_F, FRAMES, L, MON_TAPE, Role, SIT, YOU_DAWN, YOU_DESK, YOU_LADDER, YOU_MIRROR, copForest, copOffice, geniusFoamAt, geniusHide, geniusStreet, geniusVault,
  guard, handAt, held, kingHide, kingStreet, kingVault, lerpV, monsterHide, monsterStreet, monsterVault, oldMan, span, speedyForest, speedyHide, speedyPast, speedyStreet, speedyVault, speedyWin,
  words, youCell, youCounter, youCuffed, youCups, youDesk, youForest, youHide, youLadder, youMirror, youStreet, youVault, youVisits,
} from "./story";
import { CALENDAR, CRATE_TOP, DOOR, LADDER, LIGHT_S, MAG, RADAR, SENSOR } from "./vault";

/**
 * antwerp-diamond-heist shot plan: one canvas per shot, hard cuts (time and place jumps cut on the word). Each shot's
 * `does:` comment names its visible change.
 */
export type Lit = "vaultNight" | "vaultGold" | "vaultDay" | "office" | "hideNight" | "hideDawn" | "street" | "forest" | "interview";
export type Fx = "spray" | "glint" | "digits" | "pigeon" | "breath" | "gold" | "trashRain" | "forestMist";
export type S = Shot & { from: number; frames: number; dof: (f: number) => Dof; w: Place; lit: Lit; fx?: Fx[] };
const PLACE: Record<Lit, Place> = { vaultNight: "vault", vaultGold: "vault", vaultDay: "vault", office: "office", hideNight: "hideNight", hideDawn: "hideDawn", street: "street", forest: "forest", interview: "interview" };
const QA_LIGHT: Record<Lit, "night" | "interior" | "day"> = { vaultNight: "night", vaultGold: "night", vaultDay: "interior", office: "interior", hideNight: "night", hideDawn: "interior", street: "night", forest: "day", interview: "night" };
const SUN: Record<Lit, Vector3> = { vaultNight: IN_SUN, vaultGold: IN_SUN, vaultDay: IN_SUN, office: IN_SUN, hideNight: IN_SUN, hideDawn: IN_SUN, street: STREET_SUN, forest: FOREST_SUN, interview: IN_SUN };
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const castIn = (from: number, roles: Role[]) => roles.map((r) => ({ name: r.name, look: r.look, at: (f: number) => r.at(f + from), state: (f: number) => r.state(f + from), sit: r.sit }));
const SEATED = { "Moving props": "seated: the chair holds the seated card" };
const ON_LADDER = { "Feet on the ground": "you stand on the top crate of the stack (0.7 m)" };
const SIGN = { "Text in frame": "the KLUIS sign over the door is set dressing, cut by design" };
let cursor = 0;
export const SHOTS: S[] = [];
const shot = (id: string, to: number, lit: Lit, roles: Role[], cam: (F: number) => CamPose, o: Partial<S> & { dof: (F: number) => Dof; props?: MovingProp[] }): S => {
  const from = cursor;
  cursor = to;
  const { dof, props, ...rest } = o;
  const ladder = lit === "vaultNight" && (to <= L(6, 0) || from >= L(29, 0));
  const s: S = {
    id: `adh/${id}`, from, frames: to - from, w: ladder ? "vaultA" : PLACE[lit], lit, scene: lit, light: QA_LIGHT[lit], sun: SUN[lit],
    pose: (f) => cam(f + from), cast: castIn(from, roles), dof: (f) => dof(f + from), subject: roles[0]?.name,
    moving: props, allow: roles.some((r) => r.sit) ? SEATED : undefined, ...rest,
  };
  SHOTS.push(s);
  return s;
};
// close-ups keep a 4 px background blur (richness: the 5 px preset read soft across ~40 close shots)
const close = (d: number) => () => ({ ...DOF.closeup(d), maxPx: 4 }), mid = (d: number) => () => ({ ...DOF.medium(d), maxPx: 3.5 });
const NONE = () => DOF.none;
/** A framing that creeps (push ~10 % + a little side drift). */
const creep = (f0: { pos: Vector3; look: Vector3; fov: number }, F: number, a: number, b: number, push = 0.1, rise = 0, drift = 0.2) => {
  const t = span(F, a, b), d = f0.look.clone().sub(f0.pos), side = V(-d.z, 0, d.x).normalize();
  drift *= Math.min(1, d.length() / 6);
  return P(f0.pos.clone().addScaledVector(d, push * t).add(V(0, rise * t, 0)).addScaledVector(side, drift * (t - 0.5)), f0.look.clone().addScaledVector(side, drift * 0.4 * (t - 0.5)), f0.fov);
};
const glideCam = (a: CamPose, b: CamPose, F: number, f0: number, f1: number) => { const t = span(F, f0, f1); return P(lerpV(a.pos, b.pos, t), lerpV(a.look, b.look, t), a.fov + (b.fov - a.fov) * t); };
/** frameOn for a role standing (or seated) at `at`, the lens at `at + from`. */
const on = (r: Role, at: Vector3, from: Vector3, size: "cu" | "mcu" | "ms" | "fs", o: { fov?: number; side?: number; dy?: number } = {}) =>
  frameOn(at.clone(), at.clone().add(from), size, { head: headHeight(r.look, r.sit ? SIT : r.state(0).pose) + (o.dy ?? 0), fov: o.fov, side: o.side });
const free = (name: string, make: () => Object3D, at: (o: Object3D, F: number) => boolean | void, touches?: string[]): MovingProp => ({ name, make, pose: at, touches });
/** An effect the World draws (a cone firing, digits spilling): an empty marker that appears on its frame, so QA's
 * static-hold check (props appearing) sees the change it cannot render. */
const fxOn = (name: string, f0: number) => free(`fx: ${name}`, () => new Object3D(), (o, F) => { o.position.set(0, -20, 0); return F >= f0; });
/** The crew's flashlight sweeping the wall round the sensor (lines 14-17). */
const torchTex = () => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d")!; const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,236,190,0.75)"); r.addColorStop(0.5, "rgba(255,226,170,0.3)"); r.addColorStop(1, "rgba(255,220,160,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new CanvasTexture(c); };
const torch = free("flashlight pool", () => { const g = new Object3D(); const m = new Mesh(new PlaneGeometry(1.1, 1.1), new MeshBasicMaterial({ map: torchTex(), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false })); m.rotation.y = -Math.PI / 2; g.add(m); return g; }, (o, F) => { o.position.set(2.15, 2.0 + 0.35 * Math.sin(F / 11), 1.9 + 0.9 * Math.sin(F / 15)); }, ["vault"]);

// ================================================================== line 1-3: the cold open
// does: macro: a pink hairspray can hisses a glittery cloud onto the vault's heat sensor
// the empty can left lying on the top crate (line 29): it rolls a little toward the edge and stops
const canResting = free("hairspray", hairspray, (o, F) => { const t = span(F, L(29, 0), L(29, 4)); o.position.set(LADDER.x, CRATE_TOP + 0.033, LADDER.z - 0.3 + 0.4 * t); o.rotation.set(t * 8, 0, Math.PI / 2); }, ["crates"]);
const A1 = P(SENSOR.clone().add(V(-1.3, -0.75, 1.2)), SENSOR.clone().add(V(-0.35, -0.5, 0.2)), 42);
shot("A1-hairspray", B.hundred, "vaultNight", [youLadder], (F) => creep(A1, F, 0, B.hundred, 0.12), { subject: undefined, dof: close(1.4), fx: ["spray"], props: [held("hairspray", hairspray, youLadder, "right", (F) => creep(A1, F, 0, B.hundred, 0.12))], allow: { ...ON_LADDER, "Subject size": "macro on the can in your hand and the sensor" } });
// does: hard cut to the threat: the giant round vault door, its red alarm LED blinking, you on a ladder by the sensor
const A2a = P(V(-1.0, 0.55, 6.4), V(-0.35, 1.45, 0.4), 56), A2b = P(V(-0.85, 0.6, 5.8), V(-0.3, 1.5, 0.4), 56);
shot("A2-the-vault", L(1, 5), "vaultNight", [youLadder], (F) => glideCam(A2a, A2b, F, B.hundred, L(1, 5)), { wide: true, subject: undefined, dof: NONE, fx: ["spray"], allow: ON_LADDER });
// does: on the ladder you spray the sensor, a sneaky grin landing on "hairspray"
const A3 = on(youLadder, YOU_LADDER, V(-1.25, 0.0, 1.55), "ms", { fov: 44 });
const canHeld = (cam: (F: number) => CamPose) => held("hairspray", hairspray, youLadder, "right", cam, { when: (F) => F < L(3, 0) });
shot("A3-you-spray", L(2, 0), "vaultNight", [youLadder], (F) => creep(A3, F, L(1, 5), L(2, 0), 0.1), { dof: mid(2.0), fx: ["spray"], props: [canHeld((F) => creep(A3, F, L(1, 5), L(2, 0), 0.1))], allow: ON_LADDER });
// does: you freeze mid-spray and look down, suspicious to nervous
const B0 = on(youLadder, YOU_LADDER, V(-0.35, 0, 1.6), "mcu", { fov: 42 });
shot("B0-only-thing", B.sandwich - 2, "vaultNight", [youLadder], (F) => creep(B0, F, L(2, 0), B.sandwich, 0.12), { dof: close(1.7), props: [canHeld(() => B0 as CamPose)], allow: ON_LADDER });
// does: smash cut: a half-eaten salami sandwich alone on dead leaves in the mist, lit from below like a horror villain
const B1 = P(SANDWICH.clone().add(V(0.08, 0.2, 0.62)), SANDWICH.clone().add(V(0, 0.03, 0)), 40);
const groundSandwich = free("sandwich", () => sandwich(false), (o, F) => { o.position.copy(SANDWICH); o.rotation.set(0, 0.5, 0); return F < L(26, 0); }, ["ground"]);
shot("B1-the-sandwich", L(3, 0), "forest", [], (F) => creep(B1, F, B.sandwich - 2, L(3, 0), 0.25), { subject: undefined, dof: close(0.62), fx: ["forestMist"], props: [groundSandwich] });
// does: back in the vault, the camera pulls back down the corridor: you, the ladder, the door
const C1a = P(V(0.3, 1.7, 3.6), V(1.1, 1.75, 1.3), 46), C1b = P(V(-0.7, 1.55, 6.1), V(0.7, 1.55, 1.2), 46);
shot("C1-biggest-heist", L(3, 6), "vaultNight", [youLadder], (F) => glideCam(C1a, C1b, F, L(3, 0), L(3, 6)), { wide: true, subject: undefined, dof: NONE, allow: { ...ON_LADDER, ...SIGN } });
// does: the calendar by the guard post: FEBRUARY 2003, a red heart drawn round the 15th
const C2 = P(CALENDAR.clone().add(V(-0.78, -0.04, 0.12)), CALENDAR.clone().add(V(0, -0.02, 0)), 40);
shot("C2-calendar", L(3, 11), "vaultNight", [], (F) => creep(C2, F, L(3, 6), L(3, 11), 0.14), { subject: undefined, dof: close(0.78) });
// does: close on your grin: you point at the lens, a sparkle glints on "GTA"
const C3 = on(youLadder, YOU_LADDER, V(-0.75, 0, 1.25), "mcu", { fov: 42 });
shot("C3-like-gta", L(4, 0), "vaultNight", [youLadder], (F) => creep(C3, F, L(3, 11), L(4, 0), 0.1), { dof: close(1.7), fx: ["glint"], allow: ON_LADDER });

// ================================================================== line 4-5: ten layers, the lock
// does: ten glowing rings light up round the vault door one by one, like an onion
const D1 = P(V(0.15, 1.35, 4.6), DOOR.clone().add(V(0, 0.05, 0)), 52);
shot("D1-ten-layers", B.heat - 2, "vaultNight", [], (F) => creep(D1, F, B.ten, B.heat, 0.1), { wide: true, subject: undefined, dof: NONE });
// does: the lens pans across the defences as each fires on its word: the sensor's red cone, the radar ripples, the blue field on the door's magnets
shot("D2-heat-sensor", B.radar - 2, "vaultNight", [], (F) => creep(P(SENSOR.clone().add(V(-1.45, -0.55, 1.6)), SENSOR.clone().add(V(-0.25, -0.25, 0.15)), 40), F, B.heat - 2, B.radar - 2, 0.3), { subject: undefined, dof: close(2.2), props: [fxOn("heat cone", B.heat - 2)] });
// does: up at the ceiling: the radar dome pulses rings across the corridor
shot("D3-radar", B.magnets - 2, "vaultNight", [], (F) => creep(P(RADAR.clone().add(V(-0.9, -1.25, 1.6)), RADAR.clone().add(V(0, -0.2, 0)), 42), F, B.radar - 2, B.magnets - 2, 0.3), { subject: undefined, dof: close(2.0), props: [fxOn("radar", B.radar - 2)] });
// does: close on the door's magnets: the blue field snaps on between them
shot("D4-magnets", L(5, 0), "vaultNight", [], (F) => creep(P(MAG.clone().add(V(-0.3, 0.0, 1.15)), MAG.clone().add(V(-0.18, 0, 0.08)), 38), F, B.magnets - 2, L(5, 0), 0.25), { subject: undefined, dof: close(1.1), props: [fxOn("magnet field", B.magnets - 2)] });
// does: macro on the dial: it spins by itself and digits pour out of it like a jackpot
const DIAL = V(0, 1.8, 0.53);
const E1 = P(DIAL.clone().add(V(0.22, 0.05, 0.82)), DIAL.clone(), 38);
shot("E1-the-dial", B.dollar - 21, "vaultNight", [], (F) => creep(E1, F, L(5, 0), B.dollar - 21, 0.12), { subject: undefined, dof: close(0.85), fx: ["digits"], props: [fxOn("digits spill", L(5, 0) + 2), fxOn("digit waterfall", L(5, 6))] });
// does: tilt down to the floor: a heap of numbers piles up in front of the door
shot("E2-one-per-dollar", L(6, 0), "vaultNight", [], (F) => glideCam(P(V(0.35, 1.5, 2.6), V(0, 1.2, 0.6), 46), P(V(0.4, 1.4, 2.7), V(0, 0.68, 0.85), 46), F, B.dollar - 21, L(6, 0)), { subject: undefined, wide: true, dof: NONE, fx: ["digits"] });

// ================================================================== line 6: two years of setup missions
// does: the crew board slides by: photos, a vault floor plan, red string, the MISSION 1 / MISSION 2 / FINALE page
const BOARD_AT = V(0.2, 1.55, -2.18);
shot("F1-crew-board", B.years - 6, "hideNight", [], (F) => glideCam(P(V(-0.6, 1.55, 0.6), BOARD_AT.clone().add(V(-0.55, -0.1, 0)), 42), P(V(0.75, 1.55, 0.5), BOARD_AT.clone().add(V(0.45, -0.1, 0)), 42), F, L(6, 0), B.years - 6), { subject: undefined, dof: close(2.3) });
// does: the espresso-cup tower beside you shoots up past your head on "two years"; you gape, then look proud
shot("F2-cup-tower", L(7, 0), "hideNight", [youCups], (F) => creep(P(V(0.15, 1.25, 1.5), V(1.25, 1.2, -1.4), 44), F, B.years - 6, L(7, 0), 0.08), { dof: mid(2.9) });

// ================================================================== line 7-9: mission one
// does: mirror POV: you in a sharp new suit check yourself, the loupe goes up to your eye on "magnifying glass"
const G1 = P(V(2.05, 1.45, 0.6), V(0.25, 1.2, 0.6), 48);
const loupeHeld = (cam: (F: number) => CamPose) => held("loupe", loupe, youMirror, "right", cam, { when: (F) => F >= B.glass - 4, fwd: 0.12 });
shot("G1-the-suit", L(7, 9), "office", [youMirror], (F) => creep(G1, F, L(7, 0), L(7, 9), 0.1), { dof: mid(2.0), props: [loupeHeld((F) => creep(G1, F, L(7, 0), L(7, 9), 0.1))] });
// does: close: the most serious face in Belgium cracks into a grin
const G2 = on(youMirror, YOU_MIRROR, V(1.45, 0, 0.12), "cu", { fov: 46 });
shot("G2-serious-face", L(8, 0), "office", [youMirror], (F) => creep(G2, F, L(7, 9), L(8, 0), 0.1), { dof: close(1.4), props: [loupeHeld(() => G2 as CamPose)] });
// does: you stand proud by your desk, DIAMOND TRADING on the nameplate, sun through the window
const H1 = P(V(-0.1, 1.3, 1.7), V(-0.75, 1.12, -0.95), 44);
shot("H1-the-office", L(8, 9), "office", [youDesk], (F) => creep(H1, F, L(8, 0), L(8, 9), 0.1), { dof: mid(2.9) });
// does: at the guard desk a long brass key with a KLUIS tag slides across into your open hand
const KEY_A = V(0.95, 0.8, 7.75);
const KEY_B = V(0.3, 0.8, 7.75); // the desk's front edge
const keyProp = free("vault key", vaultKey, (o, F) => { o.position.copy(lerpV(KEY_A, KEY_B, span(F, L(8, 9) + 4, B.vaultKey - 4))); o.rotation.set(-Math.PI / 2, 0, 0); }, ["desk"]);
shot("H2-vault-key", L(9, 0), "vaultDay", [youCounter, guard], (F) => creep(P(V(-0.3, 1.12, 8.3), V(0.35, 0.8, 7.75), 36), F, L(8, 9), L(9, 0), 0.15), { subject: undefined, dof: close(1.0), props: [keyProp], allow: { ...SEATED, "Subject size": "insert on the key sliding across the desk" } });
// does: one locked framing, three visits: day one the guard stares you down; day ten he nods; day five hundred he waves you through from behind his newspaper (the calendar flips each time)
const I = P(V(-0.25, 1.35, 3.7), V(0.85, 1.2, 7.6), 60);
const Ic = (a: number, b: number) => (F: number) => creep(I, F, a, b, 0.1, 0, 0.04);
const paperHeld = (headline: string, when: (F: number) => boolean) => held("newspaper", () => newspaper(headline), guard, "left", () => I, { fwd: 0.08, when });
shot("I1-day-one", L(9, 8) - 3, "vaultDay", [youVisits, guard], Ic(L(9, 0), L(9, 8) - 3), { subject: "guard", wide: true, dof: NONE });
shot("I2-day-ten", L(9, 12) - 4, "vaultDay", [youVisits, guard], Ic(L(9, 8) - 3, L(9, 12) - 4), { subject: "guard", wide: true, dof: NONE });
shot("I3-day-500", L(10, 0), "vaultDay", [youVisits, guard], Ic(L(9, 12) - 4, L(10, 0)), { subject: "guard", wide: true, dof: NONE, props: [paperHeld("WEATHER: RAIN", () => true)], allow: { ...SEATED, "Subject covered": "gag: the guard waves you through without lowering his newspaper" } });

// ================================================================== line 10-12: mission two, the crew
// does: push in on the crew board's four name cards
shot("J1-the-crew", B.genius - 4, "hideNight", [], (F) => glideCam(P(V(-0.2, 1.65, -0.35), V(-0.25, 1.82, -2.18), 42), P(V(-0.2, 1.7, -1.0), V(-0.25, 1.84, -2.18), 40), F, L(10, 0), B.genius - 4), { subject: undefined, dof: close(1.6) });
// does: The Genius points up, smug, his tool roll on his belt
shot("J2-genius", B.monster - 6, "hideNight", [geniusHide], (F) => creep(on(geniusHide, V(-1.65, 0, 0.35), V(0.45, 0, 1.7), "mcu", { fov: 42 }), F, B.genius - 4, B.monster - 6, 0.1), { dof: close(1.8) });
// does: The Monster, huge, holds up a lock pick that looks like a toothpick in his fingers
const J3 = (F: number) => creep(on(monsterHide, V(1.5, 0, -0.55), V(-0.45, 0, 1.75), "mcu", { fov: 42, dy: 0.05 }), F, B.monster - 6, B.king - 4, 0.1);
shot("J3-monster", B.king - 4, "hideNight", [monsterHide], J3, { dof: close(1.8), props: [held("lock pick", lockPick, monsterHide, "right", J3, { when: (F) => F >= B.monster - 2, fwd: 0.08 })] });
// does: the King of Keys jangles the ring of keys on his belt, grinning
shot("J4-king", L(11, 0), "hideNight", [kingHide], (F) => creep(on(kingHide, V(-0.7, 0, -1.25), V(-0.9, 0, 1.5), "mcu", { fov: 42 }), F, B.king - 4, L(11, 0), 0.1), { dof: close(1.8) });
// does: Speedy at the window, a pigeon flaps down onto the sill beside him
shot("K1-speedy", B.panics - 2, "hideNight", [speedyWin], (F) => creep(P(V(-0.55, 1.35, 1.05), V(-2.0, 1.2, -0.4), 44), F, L(11, 0), B.panics, 0.08), { dof: mid(2.0), fx: ["pigeon"] });
// does: he jumps a foot in the air, ring-eyed (camera kick)
shot("K2-pigeon-jump", L(12, 0), "hideNight", [speedyWin], impact((F) => creep(on(speedyWin, V(-1.95, 0, -0.35), V(1.3, 0, 1.2), "mcu", { fov: 44, dy: 0.15 }), F, B.panics, L(12, 0), 0.06), B.panics, 0.03), { dof: close(1.8), fx: ["pigeon"], kicks: [[0, 7]] });
// does: two-shot: Speedy clutches your sleeve and says it; you pat his shoulder, smug
shot("K3-gonna-get-caught", L(13, 0), "hideNight", [speedyHide, youHide], (F) => creep(P(V(0.5, 1.35, -0.6), V(0.48, 1.22, 1.55), 46), F, L(12, 0), L(13, 0), 0.1), { dof: mid(2.1) });

// ================================================================== line 13: Valentine's weekend
// does: the jeweller's window full of red hearts on the night street
shot("L1-valentines", L(13, 4), "street", [speedyPast], (F) => creep(P(V(-4.6, 1.4, 0.2), V(-5.3, 1.25, -4.98), 46), F, L(13, 0), L(13, 4), 0.1), { subject: undefined, dof: mid(3.6) });
// does: the crew of five strides toward a low leading lens down the sidewalk, Speedy glancing back
const walkX = (F: number) => 4 - 0.034 * Math.max(0, F - (L(13, 3) - 20)) * 0.8;
shot("L2-showtime", L(14, 0), "street", [youStreet, kingStreet, geniusStreet, monsterStreet, speedyStreet], (F) => P(V(walkX(F) - 5.2, 0.7, -0.4), V(walkX(F) - 0.4, 1.3, -0.6), 46), { wide: true, dof: NONE });

// ================================================================== line 14-17: the layers
const HEIST = [youVault, geniusVault, monsterVault, kingVault, speedyVault];
// does: the crew creeps down the dark corridor toward the door, flashlights up
shot("M1-layer-one", L(14, 5), "vaultNight", HEIST, (F) => creep(P(V(0.35, 1.55, 7.2), V(0.0, 1.2, 0.6), 48), F, L(14, 0), L(14, 5), 0.12), { wide: true, subject: undefined, dof: NONE, allow: SIGN });
// does: close on the sensor: its lens is glazed and blurry with hairspray
const M2 = P(SENSOR.clone().add(V(-0.62, -0.2, 0.5)), SENSOR.clone().add(V(-0.1, -0.04, 0.02)), 38);
shot("M2-glazed-lens", B.breath - 6, "vaultNight", [], (F) => creep(M2, F, L(14, 5), B.breath, 0.18), { subject: undefined, dof: close(0.8), props: [torch] });
// does: The Genius breathes on his glasses: they fog over, the same blur
const M3 = on(geniusVault, V(0.2, 0, 2.9), V(0.3, 0, -1.7), "mcu", { fov: 42 });
shot("M3-fogged-glasses", L(14, 17), "vaultNight", [geniusVault], (F) => creep(M3, F, B.breath - 6, L(14, 17), 0.1), { dof: close(1.4), fx: ["breath"] });
// does: low under the sensor: its red light stays dead as Speedy tiptoes beneath it
shot("M4-blind", L(15, 0), "vaultNight", [speedyVault, youVault], (F) => creep(P(V(-0.6, 1.0, 4.2), V(1.4, 1.95, 1.9), 50), F, L(14, 17), L(15, 0), 0.08), { wide: true, subject: undefined, dof: NONE, props: [torch] });
// does: side-on track: The Genius shuffles across the corridor behind a white foam board through the red beam
const foamHeld = (cam: (F: number) => CamPose) => held("foam board", foamBoard, geniusVault, "both", cam, { fwd: 0.1 });
const N1 = (F: number) => { const g = geniusFoamAt(F); return P(V(g.x * 0.6 + 0.25, 1.45, 5.7), V(g.x * 0.8, 1.15, 2.2), 54); };
shot("N1-foam-board", L(15, 12), "vaultNight", [geniusVault], N1, { dof: mid(2.3), props: [foamHeld(N1)], allow: { "Subject covered": "gag: he hides behind the foam board", "Moving props": "the board slides through the beam" } });
// does: close: only his eyes and fingertips peek over the foam, like a kid behind a pizza box
const N2 = (F: number) => creep(P(V(-1.25, 1.5, 4.5), V(-1.4, 1.3, 2.2), 34), F, L(15, 12), L(16, 0), 0.1);
shot("N2-pizza-box", L(16, 0), "vaultNight", [geniusVault], N2, { dof: close(2.3), props: [foamHeld(N2)], allow: { "Subject covered": "gag: only his eyes peek over the board" } });
// does: The Monster lumbers up to the little light sensor, its green eye glowing
shot("O1-light-sensor", L(16, 5), "vaultNight", [monsterVault], (F) => P(V(0.5, 1.45, 1.4), monsterVault.at(F).lerp(MON_TAPE, 0.35).add(V(-0.15, 1.35, 0)), 46), { subjectFrom: 26, dof: mid(2.4) });
// does: macro: a strip of tape slaps over the sensor and its green light goes out
const tapeFree = free("tape roll", tapeRoll, (o, F) => { o.position.copy(LIGHT_S).add(V(0.12, -0.1 + 0.05 * span(F, L(16, 5), B.tape), 0.1)); return F < B.tape + 6; });
shot("O2-tape", L(17, 0), "vaultNight", [], (F) => creep(P(LIGHT_S.clone().add(V(0.72, 0.08, 0.32)), LIGHT_S.clone().add(V(0.02, 0, 0)), 38), F, L(16, 5), L(17, 0), 0.15), { subject: undefined, dof: close(0.75), props: [tapeFree] });
// does: close on the door frame: the blue magnetic field humming between the two blocks
shot("P1-magnets", B.plate - 2, "vaultNight", [], (F) => creep(P(MAG.clone().add(V(-0.25, 0.0, 1.05)), MAG.clone().add(V(-0.18, 0, 0.08)), 36), F, L(17, 0), B.plate, 0.12), { subject: undefined, dof: close(1.1) });
// does: The Genius tapes the aluminium plate across both blocks; the field stays a happy steady blue
const P2C = P(V(0.45, 1.62, 3.4), V(1.0, 1.3, 0.75), 46);
const plateHeld = held("aluminium plate", aluPlate, geniusVault, "right", () => P2C, { when: (F) => F < B.plate - 1 });
shot("P2-the-plate", L(18, 0), "vaultNight", [geniusVault], (F) => creep(P2C, F, B.plate - 2, L(18, 0), 0.1), { dof: mid(1.9), props: [plateHeld], allow: SIGN });

// ================================================================== line 18-19: it opens
// does: macro: the dial clicks round in jerks, the King of Keys' fingers on it
shot("Q1-dial-clicks", B.opens - 26, "vaultNight", [], (F) => creep(E1, F, L(18, 0), B.opens, 0.2), { subject: undefined, dof: close(0.85) });
// does: low wide: the huge round door swings open, warm gold light floods over the crew
shot("Q2-it-opens", B.nobody - 2, "vaultNight", HEIST, (F) => creep(P(V(-0.1, 0.75, 6.6), V(0.0, 1.3, 0.2), 50), F, B.opens - 26, B.nobody, 0.08), { wide: true, subject: undefined, allow: SIGN, dof: NONE, fx: ["gold"] });
// does: gold on their faces: the King of Keys shrugs, nobody knows how
const Q3 = P(V(0.45, 1.45, 0.4), V(1.0, 1.25, 2.3), 44);
shot("Q3-nobody-knows", L(19, 0), "vaultGold", [kingVault, youVault], (F) => creep(Q3, F, B.nobody - 2, L(19, 0), 0.1), { dof: close(1.8), fx: ["gold"] });
// does: inside the vault, a track along the wall of boxes: doors swing open one after another, The Monster cracking them
shot("R1-189-boxes", B.sunrise, "vaultGold", [monsterVault], (F) => glideCam(P(V(-0.9, 1.3, -1.5), V(-3.0, 1.2, -2.9), 46), P(V(-0.85, 1.3, -3.2), V(-3.0, 1.15, -4.7), 46), F, L(19, 0), B.sunrise), { subject: undefined, dof: mid(2.4), fx: ["gold"] });
// does: wide of the room: rows of open boxes, the floor glittering with gems
shot("R2-109-open", L(19, 8), "vaultGold", [monsterVault, youVault], (F) => creep(P(V(0.8, 1.9, -1.05), V(-1.6, 0.7, -4.4), 54), F, B.sunrise, L(19, 8), 0.1), { wide: true, subject: undefined, dof: NONE, fx: ["gold"] });
// does: crane down your laughing body to your shoes, ankle-deep in diamonds
shot("R3-ankle-deep", L(20, 0), "vaultGold", [youVault], (F) => glideCam(P(V(-0.95, 1.55, -1.45), V(-2.25, 1.45, -3.2), 46), P(V(-0.85, 1.05, -1.55), V(-2.2, 0.62, -3.2), 46), F, L(19, 8), B.diamonds + 20), { dof: close(1.7), fx: ["gold"], subjectFrom: 0, allow: { "Subject size": "the crane ends on your shoes in the gems", "Subject in frame": "the crane leaves your face for your shoes", "Caption vs face": "the crane passes the caption band" } });

// ================================================================== line 20-23: the trash
// does: dawn in the flat: you proud by a heap of black trash bags
shot("S1-perfect-heist", L(20, 7), "hideDawn", [youHide], (F) => creep(P(V(0.6, 1.3, 1.55), V(-0.6, 1.05, -1.0), 44), F, L(20, 0), L(20, 7), 0.08), { dof: mid(2.8) });
// does: pull back: the trash heap is bigger than the loot bag on the table; your face drops on "trash"
shot("S2-the-trash", L(21, 0), "hideDawn", [youHide], (F) => glideCam(P(V(0.6, 1.3, 1.55), V(-0.6, 1.05, -1.0), 44), P(V(1.5, 1.65, 2.25), V(-0.5, 0.75, -0.7), 50), F, L(20, 7), L(20, 11)), { wide: true, dof: NONE });
// does: misty dawn by the motorway: the little car pulls up on the verge under the blue E19 sign
shot("T1-the-woods", B.forest + 2, "forest", [youForest, speedyForest], (F) => creep(P(V(-1.0, 1.45, 0.2), V(-3.6, 1.05, -4.4), 48), F, L(21, 0), B.forest, 0.08), { wide: true, subject: undefined, dof: NONE });
// does: the hatch pops up on a trunk stuffed with bags; Speedy beside it, sweating
const HATCH_CAM = P(V(-6.6, 1.45, -1.6), V(-4.9, 1.2, -3.9), 46);
shot("T2-the-trunk", L(22, 0), "forest", [speedyForest, youForest], (F) => creep(HATCH_CAM, F, B.forest + 2, L(22, 0), 0.1), { wide: true, subject: "speedy", dof: NONE, allow: { "Text in frame": "the motorway sign far behind the trees, dressing" } });
// does: Speedy panics, spins and flings bag after bag into the trees
const bagHeld = (cam: (F: number) => CamPose) => held("trash bag", heldBag, speedyForest, "right", cam, { when: (F) => F < B.flings + 4 || (F >= B.flings + 14 && F < B.flings + 18) });
const T3 = P(V(-1.3, 1.45, -0.1), V(-2.6, 1.3, -3.35), 48);
shot("T3-flings", B.flings + 10, "forest", [speedyForest, youForest], (F) => creep(T3, F, L(22, 0), B.flings + 10, 0.08), { subject: "speedy", dof: mid(2.6), props: [bagHeld(() => T3)], fx: ["forestMist", "trashRain"], whips: [[B.flings - L(22, 0), B.flings + 6 - L(22, 0)]] });
// does: wide: paper and bags rain over the clearing like confetti
shot("T4-confetti", L(23, 0), "forest", [speedyForest, youForest], (F) => creep(P(V(2.6, 1.6, 3.6), V(-0.8, 1.5, -1.5), 52), F, B.flings + 10, L(23, 0), 0.06), { wide: true, subject: "speedy", dof: NONE, fx: ["forestMist", "trashRain"] });
// does: Speedy yanks you back to the car by the sleeve; you look back at the mess
shot("T5-just-drive", L(24, 0), "forest", [speedyForest, youForest], (F) => creep(P(V(-1.4, 1.4, -1.15), V(-2.95, 1.25, -3.25), 48), F, L(23, 0), L(24, 0), 0.08), { dof: NONE });

// ================================================================== line 24-26: the man who hates litter
// does: the next morning an old man with a stick walks into the clearing and stops dead at the trash
const stickHeld = (cam: (F: number) => CamPose) => held("stick", stick, oldMan, "right", cam, { when: (F) => F < B.police - 18 });
const U1 = P(V(0.9, 1.45, 0.6), V(3.5, 1.05, 4.0), 46);
shot("U1-old-man", L(24, 10), "forest", [oldMan], (F) => creep(U1, F, L(24, 0), L(24, 10), 0.08), { wide: true, dof: NONE, fx: ["forestMist"], props: [stickHeld(() => U1)] });
// does: close: his face goes red and steam puffs out of his ears on "HATES"
const U2 = on(oldMan, V(3.2, 0, 3.6), V(-0.6, 0, -1.6), "ms", { fov: 42 });
shot("U2-hates-litter", L(24, 16), "forest", [oldMan], (F) => creep(U2, F, L(24, 10), L(24, 16), 0.12), { dof: close(1.8), fx: ["forestMist"], props: [stickHeld(() => U2 as CamPose)] });
// does: he whips out his phone and calls the police
shot("U3-calls-police", L(25, 0), "forest", [oldMan], (F) => creep(on(oldMan, V(3.2, 0, 3.6), V(-1.4, 0, -1.7), "ms", { fov: 44 }), F, L(24, 16), L(25, 0), 0.1), { dof: mid(2.2), fx: ["forestMist"] });
// does: three inserts in a gloved hand among the leaves: an envelope from the vault, a CAM 2 videotape, a receipt with a name circled in red
const evidence = (name: string, make: () => Object3D, a: number, b: number, cam: CamPose) => held(name, make, copForest, "right", () => cam, { when: (F) => F >= a && F < b, fwd: 0.05 });
const handCam = (F: number) => { const h = handAt(copForest, F, COP_F.clone().add(V(0.3, 1.2, 1.4)), "right"); return P(h.clone().add(V(0.2, 0.12, 0.6)), h.clone().add(V(0.02, -0.08, 0)), 36); };
const V1 = handCam(B.envelopes), V2 = handCam(L(25, 8)), V3 = handCam(B.name);
shot("V1-envelope", L(25, 7), "forest", [copForest], (F) => creep(V1, F, L(25, 0), L(25, 7), 0.12), { subject: undefined, dof: close(0.6), props: [evidence("envelope", envelope, 0, L(25, 7) + 1, V1)], allow: { "Subject size": "insert on the evidence in his hand" } });
shot("V2-videotape", L(25, 10), "forest", [copForest], (F) => creep(V2, F, L(25, 7), L(25, 10), 0.12), { subject: undefined, dof: close(0.6), props: [evidence("videotape", videotape, L(25, 7), L(25, 10) + 1, V2)], allow: { "Subject size": "insert on the evidence in his hand" } });
shot("V3-receipt", L(26, 0), "forest", [copForest], (F) => creep(V3, F, L(25, 10), L(26, 0), 0.12), { subject: undefined, dof: close(0.6), props: [evidence("receipt", receipt, L(25, 10), L(26, 0) + 1, V3)], allow: { "Subject size": "insert on the evidence in his hand" } });
// does: the hero shot: the cop lifts the half-eaten salami sandwich out of the leaves into a shaft of morning light
const W1 = P(V(2.2, 0.65, 3.6), V(0.72, 1.15, 1.55), 46);
const sandwichHeld = held("sandwich", () => sandwich(false), copForest, "right", () => W1, { when: (F) => F >= L(26, 0), fwd: 0.05 });
shot("W1-that-sandwich", L(26, 6), "forest", [copForest], (F) => creep(W1, F, L(26, 0), L(26, 6), 0.14), { dof: mid(1.6), fx: ["forestMist", "gold"], props: [sandwichHeld, groundSandwich] });
// does: macro: the sandwich sealed in an evidence bag, its yellow tag: EVIDENCE DNA
const BAG_AT = SANDWICH.clone().add(V(0.25, 0, 0.2));
shot("W2-dna", L(27, 0), "forest", [], (F) => creep(P(BAG_AT.clone().add(V(0.05, 0.62, 0.42)), BAG_AT.clone().add(V(0, 0.03, 0)), 40), F, L(26, 6), L(27, 0), 0.16), { subject: undefined, dof: close(0.58), props: [free("evidence bag", () => sandwich(true), (o, F) => { const t = Math.min(1, Math.max(0, (F - L(26, 6)) / 10)); o.position.copy(BAG_AT).add(V(0, 0.45 * (1 - t * t), 0)); o.rotation.set(0, 0.3 + 0.4 * (1 - t), 0); }, ["ground"])] });

// ================================================================== line 27-30: caught
// does: back at the flat you turn slowly to Speedy, steam rising
shot("X1-speedy-was-right", B.because, "hideDawn", [youHide, speedyHide], (F) => creep(P(V(0.85, 1.35, -0.6), V(0.88, 1.22, 1.5), 48), F, L(27, 0), B.because, 0.1), { dof: mid(2.1) });
// does: Speedy, mid-bite of ANOTHER sandwich, freezes
const X2 = on(speedyHide, V(0.4, 0, 1.6), V(0.5, 0, -1.6), "mcu", { fov: 42 });
const sandwich2 = held("sandwich 2", () => sandwich(false), speedyHide, "right", () => X2 as CamPose, { fwd: 0.08 });
shot("X2-another-sandwich", L(28, 0), "hideDawn", [speedyHide], (F) => creep(X2, F, B.because, L(28, 0), 0.12), { dof: close(1.7), props: [sandwich2] });
// does: your office door bursts open, a cop points, you jump; on "handcuffs" your wrists click together
const Y1 = P(V(1.2, 1.45, 0.2), V(-1.05, 1.15, 0.5), 50);
shot("Y1-handcuffs", L(28, 6), "office", [youCuffed, copOffice], impact((F) => creep(Y1, F, L(28, 0), L(28, 6), 0.08), L(28, 0) + 8, 0.025), { subject: "you", dof: mid(2.6), kicks: [[8, 15]], props: [held("handcuffs", cuffs, youCuffed, "both", () => Y1, { when: (F) => F >= B.cuffs - 2, fwd: 0.08 })] });
// does: the guard finally lowers his newspaper: HEIST OF THE CENTURY, and he looks up at last
const Y2 = P(V(-0.35, 1.6, 8.05), V(1.6, 1.3, 7.55), 42);
shot("Y2-never-found", L(29, 0), "vaultDay", [guard], (F) => creep(Y2, F, L(28, 6), L(29, 0), 0.1), { subject: undefined, dof: close(1.7), props: [held("headline", () => newspaper("HEIST OF THE CENTURY"), guard, "left", () => Y2 as CamPose, { fwd: 0.1 })], allow: { ...SEATED, "Subject covered": "the newspaper comes down off his face (the reveal)" } });
// does: the cold-open sensor again, same framing, still glazed with hairspray
const Z1C = P(V(LADDER.x - 1.7, 1.45, LADDER.z + 1.7), V(LADDER.x - 0.05, 1.45, LADDER.z - 0.05), 48);
shot("Z1-beaten-by-hairspray", L(30, 0), "vaultNight", [], (F) => creep(Z1C, F, L(29, 0), L(30, 0), 0.1), { subject: undefined, dof: close(2.1), props: [canResting, fxOn("the sensor light blinks back on", L(29, 6))], flash: [[L(29, 6) - L(29, 0) - 1, L(29, 6) - L(29, 0) + 2]] });
// does: close on you in the police room, deadpan; the bagged sandwich soft in the foreground
const Z2 = P(V(0.12, 1.3, 1.75), V(0.02, 0.78, -0.2), 44);
shot("Z2-undone", FRAMES, "interview", [youCell], (F) => creep(Z2, F, L(30, 0), FRAMES, 0.08), { dof: close(1.85), props: [free("bagged sandwich", () => sandwich(true), (o) => { o.position.copy(ITABLE).add(V(0.1, 0.77, 0.32)); o.rotation.set(0, -0.4, 0); }, ["room"])] });

if (cursor !== FRAMES) throw new Error(`shots end at ${cursor}, composition ${FRAMES}`);
export const PLAN: Plan = { slug: "antwerp-diamond-heist", shots: SHOTS, words };
export { B, DOOR, MON_TAPE, YOU_DAWN, YOU_DESK, monsterVault };
