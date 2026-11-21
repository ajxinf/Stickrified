import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BoxGeometry, CylinderGeometry, Group, Material, Mesh, Object3D, PlaneGeometry, PointLight, SphereGeometry, Vector3 } from "three";
import { perform } from "../../../kit/toon/acting";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { photo } from "../../../kit/toon/build/photo";
import { setShoreFoam, setWater, shoreFoam, water } from "../../../kit/toon/build/water";
import { CamPose, frameOn, impact, smootherstep } from "../../../kit/toon/camera";
import { Character, exprAt, handWorld } from "../../../kit/toon/cast";
import type { CharState } from "../../../kit/toon/cast";
import { Composer, DOF, Dof } from "../../../kit/toon/Composer";
import { Embers, Flames, Smoke } from "../../../kit/toon/fire";
import { glowSprite, lightPatch, practicalGlows } from "../../../kit/toon/glow";
import { MovingProp, Plan, QAPlan, Shot, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { Pose, REST, moveCurve, movePose, reactSquash, walkPose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { practicalLights, toonMaterial } from "../../../kit/toon/shade";
import { photoSky } from "../../../kit/toon/sky";
import { ToonWorld } from "../../../kit/toon/world";

/**
 * _look-test-r27 (R27b, 2026-11-21): 10 s look test of the R27 kit work against docs/style/r27/REPORT.md. Not an
 * episode, not for posting. A night cove: photo sky (kit sky.ts), moving sea with shore foam (build/water.ts), every
 * surface a different CC0 photo material with normal/ARM maps, Poly Haven rocks/pier/props, fire life (kit fire.tsx).
 * Lighting idea: cool moon key low over the sea (a glint path on the water, rim light when we look seaward), the warm
 * fire pool as the face key, the lit window, porch lantern and string lights as secondary pools, half the frame in shadow.
 * Materials: wet sand (damp_beach_sand_02, glossy), dry sand (dense_sand), dune (sparse_grass + grass models), siding
 * (weathered_plank_siding), deck/posts (weathered_planks), trim (white_planks_clean), roof (clay_roof_tiles), awning
 * (rusty_metal_sheet), sandbags (hessian_230), sea wall + kiosk (painted_plaster_wall, grey_roof_tiles).
 *   S1   0-89  wide from the waterline  // does: you haul a driftwood log up the beach toward the fire, foam laps below
 *   S2  90-164 MS by the fire           // does: wind-up (log overhead), heave; the camera follows the log to the fire
 *   S3 165-214 insert at the fire       // does: the log lands, sparks burst, the flames flare, smoke puffs, light jumps
 *   S4 215-299 MCU reaction             // does: soot rises over your face, ring eyes, smoke from your hair, blink, sheepish grin
 */
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);

// ------------------------------------------------------------------ light
const NIGHT: LightPreset = { ...LIGHTS.night, lit: [0.42, 0.5, 0.72], shade: [0.1, 0.12, 0.2], lift: [0.01, 0.012, 0.025], sunDisc: "#f4f6ff", sunGlow: ["#8fa6d8", 0.25], fogNear: 25, fogFar: 260 };
const SKY = photoSky(NIGHT, "kloppenheim_07_puresky", { exposure: 0.32, tint: "#bccbe8", yaw: -43 });
export const LIGHT = SKY.preset, MOON = SKY.key;

// ------------------------------------------------------------------ ground: the beach rises from the sea (-z) to the dunes (+z)
export const H = (x: number, z: number) => 0.26 * Math.tanh(z / 3.6) + 0.9 * smooth(10.5, 17, z) + 0.035 * smooth(1, 4, z) * Math.sin(x * 0.8 + z * 0.5) * Math.sin(x * 0.33 - 0.2 * z);
export const at = (x: number, z: number) => V(x, H(x, z), z);
const FIRE = at(1.7, 5.6), P_START = at(5.9, 3.3), P2 = at(3.3, 4.95);
const lap = (F: number) => 0.03 * Math.sin((F / 110) * Math.PI * 2) + 0.012 * Math.sin(F / 23); // sea level (m): a wave runs up and drains
const waterline = (F: number) => lap(F) / 0.072; // z where the sea meets the sand (beach slope ~.072 at the shore)
const flare = (F: number) => (F < 170 ? 0 : 0.3 + 0.55 * Math.exp(-(F - 170) / 28)); // the log feeds the fire

const field = (x0: number, x1: number, z0: number, z1: number, tile: number, mat: () => Material) => {
  const g = new PlaneGeometry(x1 - x0, z1 - z0, Math.ceil((x1 - x0) * 1.5), Math.ceil((z1 - z0) * 2));
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    p.setY(i, H(p.getX(i), p.getZ(i)));
    uv.setXY(i, p.getX(i) / tile, p.getZ(i) / tile);
  }
  g.computeVertexNormals();
  const m = new Mesh(g, mat());
  m.receiveShadow = true;
  return m;
};
// One photo material per surface; Kit boxes map world metres, so repeat = 1 / tile size (m).
const PM = (name: string, tile: number, color: string, o: Parameters<typeof toonMaterial>[0] = {}) => () =>
  M(`r27-${name}-${color}`, () => toonMaterial({ map: photo(name), repeat: [1 / tile, 1 / tile], color, mottle: 0.1, ...o }));
const MATS = {
  wet: () => M("r27-wet", () => toonMaterial({ map: photo("damp_beach_sand_02"), color: "#8f8579", gloss: 0.45, rough: 0.3, mottle: 0.15 })),
  dry: () => M("r27-dry", () => toonMaterial({ map: photo("dense_sand"), color: "#d6c7ad", mottle: 0.18 })),
  dune: () => M("r27-dune", () => toonMaterial({ map: photo("sparse_grass"), color: "#b8b29a", mottle: 0.2 })),
  siding: PM("weathered_plank_siding", 2, "#9fb4b8"),
  deck: PM("weathered_planks", 2, "#b8a48c"),
  post: PM("weathered_planks", 1, "#8c7a66"),
  trim: PM("white_planks_clean", 1.5, "#e8e2d4"),
  door: PM("white_planks_clean", 1.2, "#5f8f99"),
  roof: PM("clay_roof_tiles", 1.6, "#c98a6e"),
  tin: PM("rusty_metal_sheet", 1.5, "#b9a596"),
  sack: PM("hessian_230", 0.8, "#cdb48e"),
  plaster: PM("painted_plaster_wall", 2.5, "#d9d2c4"),
  grey: PM("grey_roof_tiles", 1.6, "#9aa0a8"),
};

/** Beach shack on short stilts: siding walls with a door and a lit window, trims, a tiled shed roof with a fascia, a
 * porch deck with steps and a rail, a rusty tin awning on posts, sandbags. Front (door) faces the sea (-z). */
const SH = { x: -3.2, z: 11.6, w: 5, d: 3.2, hgt: 2.5, y0: 0.95 };
const shack = () => {
  const k = new Kit(), { x, z, w, d, hgt, y0 } = SH, fz = z - d / 2, t = 0.12, T = MATS.trim(), S = MATS.siding(), P = MATS.post();
  for (const px of [x - w / 2 + 0.15, x, x + w / 2 - 0.15]) for (const pz of [fz + 0.15, z + d / 2 - 0.15, fz - 1.45]) k.box(P, 0.16, y0 + 0.5, 0.16, px, (y0 - 0.5) / 2 + 0.25, pz); // stilts into the sand
  k.box(MATS.deck(), w + 0.3, 0.1, d + 1.6, x, y0 - 0.05, z - 0.8); // floor + porch deck
  // walls: back, sides, front in pieces round a door (x -1.3..-0.4) and a window (x 0.5..1.7, y 1.0..1.9)
  k.box(S, w, hgt, t, x, y0 + hgt / 2, z + d / 2);
  for (const s of [-1, 1]) k.box(S, t, hgt, d, x + (s * w) / 2, y0 + hgt / 2, z);
  const front = (a: number, b: number, lo: number, hi: number) => k.box(S, b - a, hi - lo, t, x + (a + b) / 2, y0 + (lo + hi) / 2, fz);
  front(-2.5, -1.3, 0, hgt); front(-1.3, -0.4, 2.05, hgt); front(-0.4, 0.5, 0, hgt); front(0.5, 1.7, 0, 1.0); front(0.5, 1.7, 1.9, hgt); front(1.7, 2.5, 0, hgt);
  k.box(MATS.door(), 0.9, 2.05, 0.05, x - 0.85, y0 + 1.025, fz + 0.03);
  for (const [a, b, lo, hi] of [[-1.3, -0.4, 0, 2.05], [0.5, 1.7, 1.0, 1.9]]) {
    k.box(T, b - a + 0.2, 0.1, 0.1, x + (a + b) / 2, y0 + hi + 0.05, fz - 0.04); // head
    for (const e of [a, b]) k.box(T, 0.1, hi - lo, 0.1, x + e, y0 + (lo + hi) / 2, fz - 0.04); // jambs
  }
  k.box(T, 1.45, 0.07, 0.22, x + 1.1, y0 + 0.97, fz - 0.08); // sill
  k.box(T, 0.06, 0.9, 0.06, x + 1.1, y0 + 1.45, fz - 0.03); // mullion
  for (const cx of [-1, 1]) for (const cz of [fz, z + d / 2]) k.box(T, 0.16, hgt + 0.05, 0.16, x + (cx * w) / 2, y0 + hgt / 2, cz); // corner boards
  // shed roof: falls toward the back, 0.45 m eaves, fascia board
  const roof = new BoxGeometry(w + 0.9, 0.1, d + 0.9);
  roof.rotateX(-0.2);
  k.add(MATS.roof(), roof, x, y0 + hgt + 0.2, z, { tile: true });
  k.box(T, w + 0.95, 0.22, 0.06, x, y0 + hgt + 0.33, fz - 0.47);
  // porch: rail on the right, three steps down at the left, tin awning on two posts
  for (const px of [x + 0.6, x + 2.45]) k.box(P, 0.1, 1.0, 0.1, px, y0 + 0.5, fz - 1.5);
  k.box(T, 1.95, 0.08, 0.08, x + 1.52, y0 + 0.95, fz - 1.5);
  k.box(T, 1.95, 0.06, 0.06, x + 1.52, y0 + 0.5, fz - 1.5);
  for (let i = 0; i < 3; i++) k.box(MATS.deck(), 1.1, 0.08, 0.32, x - 1.0, y0 - 0.32 * (i + 1) + 0.02, fz - 1.6 - 0.3 * (i + 0.5));
  for (const px of [x - 2.3, x + 2.3]) k.box(P, 0.12, 2.3, 0.12, px, y0 + 1.15, fz - 1.5);
  const awn = new BoxGeometry(w + 0.2, 0.04, 1.8);
  awn.rotateX(0.16);
  k.add(MATS.tin(), awn, x, y0 + 2.28, fz - 0.8, { tile: true });
  const g = k.build();
  g.userData.collider = "shack";
  // sandbags by the porch (soft hessian lumps)
  const bags = new Kit();
  for (let i = 0; i < 5; i++) {
    const bx = x + 1.4 + (i % 3) * 0.55 + (i > 2 ? 0.27 : 0);
    bags.add(MATS.sack(), new SphereGeometry(0.3, 10, 6).scale(1.25, 0.5, 0.75), bx, H(bx, fz - 2.05) + 0.13 + (i > 2 ? 0.24 : 0), fz - 2.05, { tile: true });
  }
  const b = bags.build();
  b.userData.collider = "sandbags";
  // the lit window (warm room behind the glass)
  const win = new Mesh(new PlaneGeometry(1.1, 0.85), MAT.winLit());
  win.position.set(x + 1.1, y0 + 1.45, fz - 0.005);
  win.rotation.y = Math.PI;
  const out = new Group();
  out.add(g, b, win);
  return out;
};

/** Background layer: a plaster kiosk with a grey tiled roof and a lit hatch on the dune, and a capped sea wall. */
const KIOSK = { x: 9.5, z: 17.5 };
const backSet = () => {
  const k = new Kit(), { x: kx, z: kz } = KIOSK, y = H(kx, kz) - 0.1;
  k.box(MATS.plaster(), 2.6, 2.3, 2.2, kx, y + 1.15, kz);
  const r = new BoxGeometry(3.2, 0.1, 2.8);
  r.rotateX(0.18);
  k.add(MATS.grey(), r, kx, y + 2.45, kz, { tile: true });
  k.box(MATS.trim(), 1.4, 0.08, 0.3, kx, y + 1.05, kz - 1.2);
  const g = k.build();
  g.userData.collider = "kiosk";
  const wall = new Kit();
  for (let i = 0; i < 9; i++) {
    const wx = 1.2 + i * 1.92, wz = 14.2 + 0.25 * Math.sin(i);
    wall.box(MATS.plaster(), 1.92, 1.0, 0.45, wx, H(wx, wz) + 0.35, wz);
    wall.box(MATS.trim(), 1.95, 0.1, 0.55, wx, H(wx, wz) + 0.9, wz);
  }
  const wg = wall.build();
  wg.userData.collider = "sea wall";
  wg.userData.joins = true;
  const hatch = new Mesh(new PlaneGeometry(1.2, 0.6), MAT.winLit());
  hatch.position.set(kx, y + 1.45, kz - 1.105);
  hatch.rotation.y = Math.PI;
  const out = new Group();
  out.add(g, wg, hatch);
  return out;
};

/** Fire pit: a ring of real rocks, crossed charred bark logs, a glowing coal bed (Flames sit on top). */
const firePit = () => {
  const k = new Kit(), rock = M("r27-rock", () => toonMaterial({ map: photo("dark_rock"), repeat: [1.5, 1.5], color: "#8a8178" }));
  const bark = M("r27-bark", () => toonMaterial({ map: photo("bark_brown_02"), repeat: [1, 2], color: "#6a5546" }));
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.3 * Math.sin(i * 7), r = 0.5 + 0.05 * Math.sin(i * 3);
    k.add(rock, new SphereGeometry(0.13, 12, 8).scale(1 + 0.3 * Math.sin(i * 5), 0.7 + 0.2 * Math.cos(i * 4), 0.9 + 0.25 * Math.sin(i * 2)), FIRE.x + Math.cos(a) * r, FIRE.y + 0.06, FIRE.z + Math.sin(a) * r, { ry: i });
  }
  for (const a of [0.2, 1.3, 2.4]) k.add(bark, new CylinderGeometry(0.055, 0.065, 0.75, 9).rotateZ(Math.PI / 2 - 0.25), FIRE.x, FIRE.y + 0.13, FIRE.z, { ry: a });
  k.add(MAT.glow("#ff5a1e", 1.6), new SphereGeometry(0.3, 14, 8).scale(1, 0.18, 1), FIRE.x, FIRE.y + 0.03, FIRE.z);
  const g = k.build();
  g.userData.collider = "campfire";
  return g;
};

const place = (o: Object3D, x: number, z: number, ry = 0, dy = 0) => {
  o.position.set(x, H(x, z) + dy, z);
  o.rotation.y = ry;
  return o;
};
/** The driftwood log; its origin is the grip, a third from the back end (the rest points where you face). */
const LOG_M = () => {
  const m = model("dead_tree_trunk", { scale: 0.55, collider: "log" }), g = new Group();
  delete m.userData.collider;
  m.position.x = 0.5;
  g.add(m);
  g.userData.collider = "log";
  return g;
};
const POLE = at(1.0, 8.6);
const BULBS = Array.from({ length: 11 }, (_, i) => {
  const u = i / 10, a = V(SH.x + 2.3, SH.y0 + 2.1, SH.z - SH.d / 2 - 1.75), b = POLE.clone().setY(POLE.y + 2.35);
  return a.clone().lerp(b, u).setY(a.y + (b.y - a.y) * u - 0.45 * Math.sin(Math.PI * u));
});

const world = () => {
  const g = new Group();
  g.add(field(-40, 40, -12, 1.4, 3, MATS.wet), field(-40, 40, 1.4, 11.5, 3, MATS.dry), field(-40, 40, 11.5, 40, 4, MATS.dune));
  g.add(shack(), backSet());
  g.add(firePit());
  // Poly Haven models at three depths
  g.add(place(model("modular_wooden_pier", { collider: "pier" }), -10.5, -4, 0.06, -1.6));
  g.add(place(model("coast_rocks_01", { scale: 0.7, collider: "far rocks" }), 30, -32, 0.6, -0.6));
  g.add(place(model("coast_land_rocks_03", { scale: 0.9, collider: "rocks" }), 11, 0.6, -0.4, -0.25));
  g.add(place(model("wooden_barrels_01", { scale: 0.75 }), -8.4, 7.8, 0.4));
  g.add(place(model("wooden_crate_01"), 4.9, 8.6, 0.5));
  g.add(place(model("wooden_bucket_01"), 0.45, 4.9, 0.2));
  g.add(place(model("wooden_picnic_table"), -2.3, 5.4, 1.35));
  g.add(place(model("lambis_shell", { height: 0.12 }), 2.5, 3.4, 2.1));
  const buoy = model("lifebuoy", { collider: false });
  buoy.position.set(SH.x - 1.8, SH.y0 + 1.6, SH.z - SH.d / 2 - 0.12);
  buoy.rotation.y = Math.PI;
  g.add(buoy);
  const lantern = model("wooden_lantern_01", { glow: ["glass", "#ffb35a", 3], collider: false });
  lantern.position.set(SH.x + 2.0, SH.y0 + 0.99, SH.z - SH.d / 2 - 1.5);
  g.add(lantern);
  // dune grass: model clumps, varied size and turn
  const parts = ["large_a", "large_b", "large_c", "mid_a", "mid_b", "mid_c"];
  for (let i = 0; i < 22; i++) {
    const gx = -14 + ((i * 7.3) % 30), gz = 12.6 + ((i * 3.7) % 5.5);
    if (Math.abs(gx - SH.x) < 3.2 || (Math.abs(gx - KIOSK.x) < 2.2 && gz > 15.8) || Math.abs(gz - 14.2) < 0.6) continue;
    g.add(place(model("grass_medium_01", { part: `grass_medium_01_${parts[i % 6]}_LOD0`, scale: 0.9 + 0.5 * ((i * 0.37) % 1), collider: false }), gx, gz, i * 1.7, -0.02));
  }
  // string-light pole and bulbs
  const k = new Kit();
  k.box(MATS.post(), 0.12, 2.5, 0.12, POLE.x, POLE.y + 1.25, POLE.z);
  for (const b of BULBS) k.add(MAT.glow("#ffd08a", 4), new SphereGeometry(0.045, 8, 6), b.x, b.y - 0.06, b.z);
  const pole = k.build();
  pole.userData.collider = "pole";
  g.add(pole);
  for (const b of BULBS) g.add(glowSprite(b.clone().setY(b.y - 0.06), "#ffc27a", 0.55, 0.45));
  // window light on the porch deck
  g.add(lightPatch(V(SH.x + 1.1, SH.y0 + 0.01, SH.z - SH.d / 2 - 0.75), V(0, 1, 0), 1.2, 1.0, "#ffb46a", 0.5, [2, 2]));
  // the sea and its foam; extra flames that flicker and grow with the fire
  const sea = water({ size: [500, 320], color: "#1b2e44", tile: 4 });
  sea.position.set(0, 0, -158);
  const foam = shoreFoam(80, 0.7);
  g.add(sea, foam);
  return { g, sea, foam };
};

const PRACTICALS = [
  { pos: FIRE.clone().add(V(0, 0.7, 0)), kind: "fire" as const, color: ["#ff9a45", 2.3] as [string, number] },
  { pos: V(SH.x + 1.1, SH.y0 + 1.4, SH.z - SH.d / 2 - 0.6), kind: "window" as const, color: ["#ffb46a", 1.1] as [string, number] },
  { pos: V(SH.x + 2.0, SH.y0 + 1.3, SH.z - SH.d / 2 - 1.6), kind: "lamp" as const, color: ["#ffc070", 0.8] as [string, number] },
  { pos: BULBS[5].clone().setY(BULBS[5].y - 0.4), kind: "lamp" as const, color: ["#ffc27a", 0.9] as [string, number], noGlow: true },
  { pos: V(KIOSK.x, H(KIOSK.x, KIOSK.z) + 1.4, KIOSK.z - 1.5), kind: "window" as const, color: ["#ffb46a", 0.9] as [string, number] },
];

// ------------------------------------------------------------------ you
const HEAD_TO_FIRE = Math.atan2(FIRE.x - P2.x, FIRE.z - P2.z);
const WALK_END = 84, SOOT = 220, THROW = 136, LAND = 170;
const youAt = (F: number) => {
  const u = smootherstep(clamp01(F / WALK_END));
  return F < WALK_END ? at(P_START.x + (P2.x - P_START.x) * u, P_START.z + (P2.z - P_START.z) * u) : P2.clone();
};
const hold: Pose = { ...REST, sway: 7, bob: -4, arms: [{ at: [0.32, 0.5], grip: "fist" }, { at: [0.26, 0.55], grip: "fist" }] }; // log under the arm, leaning into it
const windup: Pose = { ...REST, sway: -13, bob: -12, knee: 8, arms: [{ at: [0.12, 0.72], grip: "fist" }, { at: [0.05, 0.75], grip: "fist" }], tilt: -6 }; // crouch, lean away, log low
const heave: Pose = { ...REST, sway: 14, bob: 4, arms: [{ at: [0.85, 0.45], grip: "open" }, { at: [0.8, 0.42], grip: "open" }], lean: 0.3 };
const recoil: Pose = { ...REST, sway: -6, bob: 2, arms: [{ at: [0.55, 0.1], grip: "open" }, { at: [0.6, 0.05], grip: "open" }], shrug: 10 };
const sheepish: Pose = { ...REST, shrug: 14, tilt: 8, arms: [{ at: [-0.2, -0.3], grip: "fist", layer: "front" }, { at: [0.2, 0.92] }] };
const POSE_KEYS: [number, Pose][] = [[WALK_END, hold], [112, windup], [THROW - 2, heave], [176, REST], [SOOT, recoil], [264, sheepish]];
const keyedPose = (F: number): Pose => {
  if (F < WALK_END) {
    const w = walkPose((clamp01(F / WALK_END) * 4.2), 0.75);
    return { ...w, arms: hold.arms, sway: hold.sway, bob: w.bob - 4 };
  }
  let i = 0;
  while (i + 1 < POSE_KEYS.length && F >= POSE_KEYS[i + 1][0] - 8) i++;
  const next = POSE_KEYS[i + 1], d = next ? F - (next[0] - 8) : -1;
  return d >= 0 && next ? movePose(POSE_KEYS[i][1], next[1], moveCurve(d), moveCurve(d - 1), moveCurve(d - 2)) : POSE_KEYS[i][1];
};
type E = "determined" | "angry" | "excited" | "shocked" | "deadpan" | "nervous";
const EXPR: [number, E][] = [[0, "determined"], [112, "angry"], [THROW, "excited"], [SOOT, "shocked"], [246, "deadpan"], [266, "nervous"]];
const youState = (F: number): CharState => {
  const e = exprAt(EXPR, F, 4);
  const heading = F < WALK_END ? Math.atan2(P2.x - P_START.x, P2.z - P_START.z) : F < SOOT - 2 ? HEAD_TO_FIRE : TO_S4; // turns to the lens for the reaction
  const fx: CharState["fx"] = {};
  if (F >= SOOT) fx.fill = { color: "#2b2522", t: clamp01((F - SOOT) / 8) * 0.92 };
  if (F >= SOOT && F < 246) fx.ringEyes = true;
  if (F >= SOOT + 4) fx.steam = (F - SOOT - 4) / 30;
  return perform({ pose: { ...keyedPose(F), squash: reactSquash(F - SOOT) }, expr: e.expr, blink: e.blink, fx, heading }, F, 4, e);
};

// ------------------------------------------------------------------ shots
const S1 = { pos: V(5.0, 0.8, -3.8), look: V(2.7, 1.5, 6.5), fov: 60 }; // looking inland: +x is screen-left
// S2 from the sea side of the fire: you face the fire and 3/4 toward the lens, the fire in the right foreground.
const S2_CAM0 = frameOn(P2, P2.clone().add(V(-0.6, 0, -0.8)), "ms", { side: 0.4 });
const S3 = { pos: FIRE.clone().add(V(1.35, 0.45, -1.8)), look: FIRE.clone().add(V(-0.05, 0.45, 0)), fov: 38 };
// S4 from the land side: you turn to the lens with the moonlit sea, the pier and its glint path behind you.
const S4 = frameOn(P2, P2.clone().add(V(0.9, 0, 3)), "mcu", { fov: 34 });
const TO_S4 = Math.atan2(S4.pos.x - P2.x, S4.pos.z - P2.z);
const lerpPose = (a: CamPose, b: Omit<CamPose, "roll">, u: number): CamPose => ({ pos: a.pos.clone().lerp(b.pos, u), look: a.look.clone().lerp(b.look, u), fov: a.fov + (b.fov - a.fov) * u, roll: 0 });
const s1Pose = (f: number): CamPose => ({ pos: S1.pos.clone().add(V(-0.012 * f, 0.002 * f, 0.02 * f)), look: S1.look.clone().add(V(-0.01 * f, 0, 0)), fov: S1.fov, roll: 0 });
// S2 holds on the wind-up, then pans with the log toward the fire (the camera follows the object of the sentence).
const s2Pose = (f: number) => lerpPose({ ...S2_CAM0, pos: S2_CAM0.pos.clone().add(V(0, 0, 0.004 * f)), roll: 0 }, { pos: S2_CAM0.pos.clone().add(V(-0.35, 0.1, 0.2)), look: P2.clone().lerp(FIRE, 0.12).setY(S2_CAM0.look.y), fov: S2_CAM0.fov }, smootherstep(clamp01((f - 36) / 39)));
/** The lens a composition frame is seen through (cards turn to it, so the hand does too). */
const lensAt = (F: number) => (F < 90 ? s1Pose(F).pos : s2Pose(F - 90).pos);

// ------------------------------------------------------------------ the log
const LOG_REST = FIRE.clone().add(V(0.05, 0.22, 0));
const handAt = (F: number) => handWorld(youLook, youState(F).pose, youAt(F), lensAt(F), "right", 0.06, youState(F).heading);
const MOVING: MovingProp[] = [
  { name: "log held", make: LOG_M, heldBy: "you", hand: "right", pose: (o, F) => {
    if (F >= THROW) return false;
    o.position.copy(handAt(F));
    o.rotation.set(0, (youState(F).heading ?? 0) - Math.PI / 2, 0.15);
  } },
  { name: "log thrown", make: LOG_M, heldBy: "you", hand: "none", touches: ["campfire"], pose: (o, F) => {
    if (F < THROW) return false;
    const t = toss(handAt(THROW), LOG_REST.clone().addScaledVector(V(Math.sin(HEAD_TO_FIRE), 0, Math.cos(HEAD_TO_FIRE)), -0.5), F - THROW, { air: LAND - THROW, height: 0.05, bounces: 1, restitution: 0.25 });
    o.position.copy(t.pos);
    o.rotation.set(0, HEAD_TO_FIRE - Math.PI / 2, 0.12 * Math.sin((F - THROW) / 5) * Math.max(0, 1 - (F - THROW) / 40));
  } },
];

const cast = [{ name: "you", look: youLook, at: youAt, state: youState }];
const local = (from: number) => cast.map((c) => ({ ...c, at: (f: number) => c.at(from + f), state: (f: number) => c.state(from + f) }));
const LS = { scene: "cove", light: "night" as const, sun: MOON, moving: MOVING };
type S = Shot & { from: number; dof: (f: number) => Dof };
const SHOTS: S[] = [
  { id: "r27/S1-haul", from: 0, frames: 90, ...LS, cast: local(0), subject: "you", subjectFrom: 46, wide: true, pose: s1Pose, dof: () => DOF.none },
  { id: "r27/S2-heave", from: 90, frames: 75, ...LS, cast: local(90), subject: "you", pose: s2Pose, dof: () => DOF.medium(3.2) },
  { id: "r27/S3-flare", from: 165, frames: 50, ...LS, kicks: [[5, 12]], dof: () => DOF.closeup(2.25),
    pose: impact((f) => ({ pos: S3.pos.clone().add(V(-0.006 * f, 0.003 * f, 0.008 * f)), look: S3.look, fov: S3.fov, roll: 0 }), 5, 0.02) },
  { id: "r27/S4-soot", from: 215, frames: 85, ...LS, cast: local(215), subject: "you", dof: () => DOF.closeup(2.6),
    pose: (f) => ({ pos: S4.pos.clone().lerp(P2.clone().setY(S4.pos.y), 0.0026 * f).add(V(-0.004 * f, 0.001 * f, 0)), look: S4.look, fov: S4.fov, roll: 0 }) },
];
export const LOOK_TEST_R27_FRAMES = 300;
const PLAN: Plan = { slug: "_look-test-r27", shots: SHOTS };

/** The cove for a composition frame; `story` false leaves out this test's log and its flare (other tests reuse the set). */
export const World: React.FC<{ F: number; story?: boolean }> = ({ F, story = true }) => {
  const w = useMemo(world, []);
  setWater(w.sea, F);
  w.sea.position.y = lap(F);
  setShoreFoam(w.foam, F, waterline(F), clamp01(0.5 + 0.5 * Math.sin((F / 110) * Math.PI * 2)));
  const fl = story ? flare(F) : 0;
  const lights = useMemo(() => practicalLights(PRACTICALS, LIGHT), []);
  const glows = useMemo(() => practicalGlows(PRACTICALS, LIGHT), []);
  (lights.children[0] as PointLight).intensity = PRACTICALS[0].color![1] * (1 + 0.07 * Math.sin(F * 1.3) + 0.05 * Math.sin(F * 3.1)) * (1 + 0.9 * fl);
  // the rendered copies are not colliders: the guard tests the moving props itself, frame by frame
  const props = useMemo(() => MOVING.map((m) => { const o = m.make(); delete o.userData.collider; return o; }), []);
  props.forEach((o, i) => (o.visible = story && MOVING[i].pose(o, F) !== false));
  return (
    <>
      <primitive object={w.g} />
      <primitive object={lights} />
      <primitive object={glows} />
      {props.map((o, i) => <primitive key={i} object={o} />)}
      <Flames at={FIRE.clone().add(V(0, 0.12, 0))} F={F} grow={fl} />
      <Embers at={FIRE.clone().add(V(0, 0.3, 0))} F={F} burst={story ? LAND : -1e9} />
      <Smoke at={FIRE} F={F} puffAt={story ? LAND : -1e9} wind={V(0.3, 0, 0.18)} />
    </>
  );
};

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={LIGHT} sunDir={MOON} shadow={{ center: V(1, 0, 6), size: 16 }} />
      <World F={s.from + f} />
      {(s.cast ?? []).map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} look={{ pool: [0.45, 0.55, 0.75, 0.28] }} />
    </ThreeCanvas>
  );
};

export const LookTestR27: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
