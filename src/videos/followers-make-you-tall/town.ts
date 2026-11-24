import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Vector3 } from "three";
import INDEX from "../../../public/models/index.json";
import { grassTufts } from "../../../kit/toon/build/ground";
import { model } from "../../../kit/toon/build/models";
import { water } from "../../../kit/toon/build/water";
import { lightPatch } from "../../../kit/toon/glow";
import { FONT, MATS, V, boardTex, canvasTex, glowMat, place, plane, rnd, slab, unlit, wall } from "./common";

/**
 * followers-make-you-tall: the town (every outdoor line, day and night). One city street along x: a north row of
 * apartment blocks with shopfronts facing +z (your stoop, the bus stop), a south row facing -z, the park and its pond at
 * the west end (south side), Westbrook High's gym and parking lot at the east end (south side).
 *   Lighting idea (day): a high late-morning sun from the south-east (behind the lens when we look north at the shops),
 *   crisp blue sky, warm sun on the facades, cool shade under the awnings. Night (prom): a navy sky, sodium street lamps
 *   in pools along the kerb, the gym's floodlights and its doorway the warm key in the lot, a cool moon rim.
 *   Materials: road (asphalt_02), sidewalks (concrete_pavement), the lot (concrete_floor_painted), the plaza in front of
 *   the gym (herringbone_pavement), park lawn (leafy_grass) and paths (cobblestone_floor_04), the pond's beach
 *   (damp_beach_sand_02), block walls behind the facades (brick_wall_001 / concrete_block_wall), roofs (painted_concrete).
 *   Every facade, door, window, lamp, bench, tree, bin and car is a Poly Haven model (user 2026-11-24: everything except
 *   the characters is a realistic model).
 */
export const ROAD = { z0: -4, z1: 4 };
export const WALK_N = -7, WALK_S = 7;
export const BUS_STOP = V(9, 0, WALK_N + 1.1); // the bench's front edge faces +z
export const STOOP = V(-10.5, 0, WALK_N); // your building's door (north row)
export const POND = { x: -36, z: 17, w: 10, d: 6 };
export const GYM = { x0: 24, x1: 48, front: 30 }; // the gym's front faces -z
export const LOT = { x0: 22, x1: 50, z0: WALK_S, z1: GYM.front - 3 };
export const GYM_DOOR = V(36, 0, GYM.front);
export const LAMPS = [-30, -18, -6, 6, 18, 30].flatMap((x, i) => [V(x, 0, WALK_N + 0.6), V(x + 6, 0, WALK_S - 0.6)]).filter((p) => !(p.z > 0 && p.x > 20));
export const LOT_LAMPS = [V(26, 0, 14), V(36, 0, 14), V(46, 0, 14), V(26, 0, 22), V(46, 0, 22)];
export const lampHead = (p: Vector3) => p.clone().add(V(0, 3.7, 0));
/** Tyler stands north of town, past the blocks; his head is in the clouds. */
export const TYLER_AT = V(14, 0, -150);

// ------------------------------------------------------------------ modular facades (Poly Haven "urban apartments")
type Entry = { nodes: Record<string, [number[], number[]]> };
const IDX = INDEX as unknown as Record<string, Entry>;
const FAC = "modular_urban_apartments_facade";
const baseCentre = (part: string) => {
  const b = IDX[FAC].nodes[part];
  if (!b) throw new Error(`facade part ${part} missing`);
  return V((b[0][0] + b[1][0]) / 2, b[0][1], (b[0][2] + b[1][2]) / 2);
};
/** A facade part placed so its reference wall's base centre lands on `at` (they keep their kit-relative offset). */
const fpart = (part: string, ref: string, at: Vector3, tint?: string) => {
  const o = model(FAC, { part, collider: false, tint });
  o.position.copy(at).add(baseCentre(part).sub(baseCentre(ref)));
  return o;
};
type Col = "shop" | "plain" | "large" | "small" | "double" | "door";
/**
 * A block: `cols` 3 m bays along +x from the origin, `floors` 3 m storeys, the front facing +z (turn the group). Ground
 * floor per bay: a glazed shop door, a plain wall, a big window or the building's own door. Upper floors: windows of one
 * kind. A brick/block volume stands behind the facade (roof on top) so aerials and side views see a building.
 */
export const block = (o: { cols: Col[]; floors: number; upper: "large" | "small" | "double"; tint?: string; back: () => import("three").Material; depth?: number; seed: number }) => {
  const g = new Group(), n = o.cols.length, H = o.floors * 3, D = o.depth ?? 12;
  o.cols.forEach((c, i) => {
    const at = V(1.5 + 3 * i, 0, 0);
    if (c === "shop" || c === "door") {
      const w = c === "shop" ? "wall_door_centered_large_01" : "wall_door_centered_small_01";
      g.add(fpart(w, w, at, o.tint), fpart(c === "shop" ? "door_centered_large_01" : "door_centered_small_01", w, at));
    } else if (c === "plain") {
      g.add(fpart("wall_standard_standard_01", "wall_standard_standard_01", at, o.tint), fpart("base_standard_01", "wall_standard_standard_01", at.clone().add(V(0, 2, 0)), o.tint));
    } else {
      const w = `wall_window_centered_${c}_01`;
      g.add(fpart(w, w, at, o.tint), fpart(`window_centered_${c}_01`, w, at));
    }
    for (let f = 1; f < o.floors; f++) {
      const k = Math.min(f, 3), w = `wall_window_centered_${o.upper}_0${k}`;
      const a = at.clone().add(V(0, 3 * f, 0));
      g.add(fpart(w, w, a, o.tint), fpart(`window_centered_${o.upper}_0${k}`, w, a));
    }
    g.add(fpart("cornice_standard_standard_01", "cornice_standard_standard_01", at.clone().add(V(0, 3.0, 0)), o.tint));
    g.add(fpart("crown_standard_standard_01", "crown_standard_standard_01", at.clone().add(V(0, H, 0)), o.tint));
  });
  for (const x of [0, 3 * n]) for (let f = 0; f < o.floors; f++) g.add(fpart("wall_pier_standard_01", "wall_pier_standard_01", V(x, 3 * f, 0), o.tint));
  // the building behind the facade (architecture surfaces, photo materials): sides, back, a flat roof
  const back = o.back(), W = 3 * n;
  g.add(wall(D, H, back, V(0, 0, -D / 2 - 0.3), -Math.PI / 2)); // surface: west side
  g.add(wall(D, H, back, V(W, 0, -D / 2 - 0.3), Math.PI / 2)); // surface: east side
  g.add(wall(W, H, back, V(W / 2, 0, -D - 0.3), Math.PI)); // surface: back
  const roof = slab(0, W, -D - 0.3, -0.25, H + 0.02, MATS.roof());
  roof.userData.ground = false;
  g.add(roof);
  const hull = new Mesh(new BoxGeometry(W, H, D), new MeshBasicMaterial({ visible: false })); // surface: QA collider of the block
  hull.position.set(W / 2, H / 2, -D / 2 - 0.3);
  g.add(hull);
  g.userData.collider = `block ${o.seed}`;
  return g;
};
/** A block placed with its front-left corner at (x, z), facing +z (north row) or -z (south row, turned). */
const put = (b: Group, x: number, z: number, south = false) => {
  if (south) { b.rotation.y = Math.PI; b.position.set(x + b.userData.w, 0, z); } else b.position.set(x, 0, z);
  return b;
};
const sized = (b: Group, cols: number) => { b.userData.w = 3 * cols; return b; };

/** A tree: the canopy is dressing; only the trunk is a QA collider (a canopy box swallowed lamps and kerbs). */
const tree = (id: string, x: number, y: number, z: number, o: { height?: number; scale?: number }) => {
  const g = new Group();
  g.add(place(model(id, { collider: false, ...o }), 0, 0, 0, rnd(x + z) * 6));
  const t = new Mesh(new BoxGeometry(0.4, 2.4, 0.4), new MeshBasicMaterial({ visible: false })); // surface: the trunk's QA hull
  t.position.set(0, 1.2, 0);
  t.userData.collider = "tree trunk";
  g.add(t);
  g.position.set(x, y, z);
  return g;
};

// ------------------------------------------------------------------ signs (in-world text: unlit faces)
const sign = (text: string, bg: string, fg: string, w: number, h: number, pos: Vector3, ry = 0, key = text) =>
  plane(w, h, unlit(`sign-${key}`, () => boardTex([text], bg, fg, 1024, Math.round((1024 * h) / w))), pos, ry);
const busSignTex = () => canvasTex(256, 512, (g) => {
  g.fillStyle = "#1e5aa8"; g.beginPath(); g.roundRect(8, 8, 240, 300, 24); g.fill();
  g.fillStyle = "#fff"; g.textAlign = "center"; g.font = `900 120px ${FONT}`; g.fillText("BUS", 128, 150);
  g.font = `800 46px ${FONT}`; g.fillText("STOP 12", 128, 240);
  g.fillStyle = "#f6f2ea"; g.fillRect(16, 330, 224, 170); g.fillStyle = "#1c1c22"; g.font = `800 30px ${FONT}`;
  ["7:40  SCHOOL", "8:10  MALL", "8:40  PARK"].forEach((t, i) => g.fillText(t, 128, 380 + i * 44));
});

// ------------------------------------------------------------------ the street
const ground = () => {
  const g = new Group();
  g.add(slab(-120, 120, ROAD.z0, ROAD.z1, 0, MATS.road()));
  g.add(slab(-120, 120, WALK_N, ROAD.z0, 0.12, MATS.walk()));
  g.add(slab(-120, LOT.x0, ROAD.z1, WALK_S, 0.12, MATS.walk()));
  g.add(slab(LOT.x1, 120, ROAD.z1, WALK_S, 0.12, MATS.walk()));
  for (const z of [ROAD.z0, ROAD.z1]) { const c = new Mesh(new BoxGeometry(240, 0.14, 0.18), MATS.walk()); c.position.set(0, 0.07, z); c.userData.ground = true; g.add(c); } // surface: kerbs
  // lane marks (painted on the road)
  const dash = glowMat("#e8d890", 0);
  for (let x = -118; x < 120; x += 5) { const m = new Mesh(new BoxGeometry(2.4, 0.004, 0.14), dash); m.position.set(x, 0.004, 0); g.add(m); } // surface: road paint
  // the parking lot + its bays, the plaza to the gym doors
  g.add(slab(LOT.x0, LOT.x1, ROAD.z1, LOT.z1, 0.01, MATS.lot()));
  g.add(slab(LOT.x0, LOT.x1, LOT.z1, GYM.front, 0.12, MATS.plaza()));
  for (let x = LOT.x0 + 2; x < LOT.x1 - 1; x += 2.8) for (const z of [11, 19]) { const m = new Mesh(new BoxGeometry(0.1, 0.004, 4.6), dash); m.position.set(x, 0.014, z); g.add(m); } // surface: bay lines
  // behind the blocks: back lots
  g.add(slab(-120, 120, -80, WALK_N - 13, 0, MATS.lot()));
  g.add(slab(-120, LOT.x0, WALK_S + 13, 80, 0, MATS.lot()));
  g.add(slab(LOT.x1, 120, WALK_S + 13, 80, 0, MATS.lot()));
  g.add(slab(LOT.x0, LOT.x1, GYM.front + 14, 80, 0, MATS.lawn()));
  // the park (south-west): lawn, cobbled path, the pond with a sandy rim
  g.add(slab(-50, -22, WALK_S, WALK_S + 13, 0.02, MATS.lawn()));
  g.add(slab(-30.5, -29, WALK_S, POND.z - POND.d / 2 - 1, 0.03, MATS.cobble()));
  g.add(slab(POND.x - POND.w / 2 - 1.2, POND.x + POND.w / 2 + 1.2, POND.z - POND.d / 2 - 1.2, POND.z + POND.d / 2 + 1.2, 0.025, MATS.sand()));
  g.children.forEach((c) => { if (c.userData.ground !== false) c.userData.ground = true; });
  return g;
};
export const pondWater = () => {
  const m = water({ size: [POND.w, POND.d], tile: 1.6, color: "#2f4a3a", strength: 0.8 });
  m.position.set(POND.x, 0.06, POND.z);
  m.name = "pond";
  return m;
};

const shopName = (b: Group, cols: number, text: string, bg: string, fg: string) => {
  b.add(sign(text, bg, fg, Math.min(3 * cols - 0.6, 7.5), 0.8, V((3 * cols) / 2, 3.45, 0.25), 0, `${text}-${bg}`));
  return b;
};

export const town = () => {
  const g = new Group();
  g.add(ground());
  // ---- north row (fronts at WALK_N, facing +z): west to east; your building at x -16..-7 (door bay at the stoop)
  const N: [number, Group][] = [
    [-46, shopName(sized(block({ cols: ["shop", "large", "plain", "shop"], floors: 4, tint: "#f8e0c0", upper: "double", back: () => MATS.brick("#b88a74"), seed: 1 }), 4), 4, "LAUNDRY", "#2a7ab8", "#fff")],
    [-33.5, shopName(sized(block({ cols: ["large", "shop", "large", "shop"], floors: 3, tint: "#b8c8d8", upper: "large", back: () => MATS.block("#c8bca8"), seed: 2 }), 4), 4, "PIZZA", "#c8342c", "#fff4d0")],
    [-20.5, sized(block({ cols: ["large", "plain", "door", "large"], floors: 5, tint: "#e0c8e8", upper: "small", back: () => MATS.brick("#9a7a6a"), seed: 3 }), 4)], // your building (door bay = third, x -12)
    [-7.5, shopName(sized(block({ cols: ["shop", "large", "shop"], floors: 3, tint: "#a8d0c8", upper: "double", back: () => MATS.block("#b8c0c4"), seed: 4 }), 3), 3, "PHONE FIX", "#1c1c22", "#5fe0ff")],
    [2.5, shopName(sized(block({ cols: ["large", "shop", "shop", "large"], floors: 4, tint: "#ffe0b0", upper: "large", back: () => MATS.brick("#c89a7a"), seed: 5 }), 4), 4, "BUBBLE TEA", "#f28ac0", "#fff")],
    [15.5, shopName(sized(block({ cols: ["shop", "plain", "large", "shop", "large"], floors: 4, tint: "#d8d0c0", upper: "small", back: () => MATS.block("#c8bca0"), seed: 6 }), 5), 5, "FRESH MART", "#3a8a4a", "#fff")],
    [32, sized(block({ cols: ["large", "door", "large", "large"], floors: 6, tint: "#c0c8e8", upper: "double", back: () => MATS.brick("#a8806a"), seed: 7 }), 4)],
    [45, shopName(sized(block({ cols: ["shop", "large", "shop"], floors: 3, tint: "#ffc8b8", upper: "large", back: () => MATS.block("#c8b0a0"), seed: 8 }), 3), 3, "DONUTS", "#f2c23a", "#6a2a1a")],
  ];
  for (const [x, b] of N) g.add(put(b, x, WALK_N - 0.05));
  // ---- south row (fronts at WALK_S facing -z), from the park to the lot
  const S: [number, Group][] = [
    [-21, shopName(sized(block({ cols: ["shop", "large", "large", "shop"], floors: 4, tint: "#f0d8b8", upper: "double", back: () => MATS.brick("#b8907a"), seed: 11 }), 4), 4, "BAKERY", "#8a5a3a", "#fff4d0")],
    [-8, sized(block({ cols: ["large", "door", "plain", "large"], floors: 5, tint: "#c8d0e0", upper: "large", back: () => MATS.block("#b8b8c0"), seed: 12 }), 4)],
    [5, shopName(sized(block({ cols: ["shop", "large", "shop", "large", "shop"], floors: 3, tint: "#e8d0b0", upper: "small", back: () => MATS.brick("#c8a08a"), seed: 13 }), 5), 5, "BOOKS & GAMES", "#4a3a8a", "#ffd23f")],
  ];
  for (const [x, b] of S) g.add(put(b, x, WALK_S + 0.05, true));
  // ---- Westbrook High's gym (south-east, behind its lot), facing -z
  const gym = sized(block({ cols: ["large", "large", "plain", "shop", "shop", "plain", "large", "large"], floors: 3, upper: "large", tint: "#f0c8b0", back: () => MATS.brick("#a86a5a"), depth: 30, seed: 20 }), 8);
  gym.add(sign("WESTBROOK HIGH", "#1e3a7a", "#ffd23f", 14, 1.6, V(12, 7.6, 0.3), 0, "westbrook"));
  g.add(put(gym, GYM.x0, GYM.front, true));
  // ---- street furniture: lamps, the bus stop, bins, hydrants, trees in pits, cars, AC units on the facades
  for (const p of LAMPS) g.add(place(model("street_lamp_01", { collider: "street lamp", height: 4.2 }), p.x, 0.12, p.z, p.z < 0 ? 0 : Math.PI));
  for (const p of LOT_LAMPS) g.add(place(model("street_lamp_01", { collider: "lot lamp", height: 4.2 }), p.x, 0.01, p.z, 0));
  g.add(place(model("modular_street_seating", { part: "seat", collider: "bus bench" }), BUS_STOP.x, 0.12, BUS_STOP.z - 0.3, 0));
  g.add(place(model("modular_street_seating", { part: "seat_back", collider: false }), BUS_STOP.x, 0.12, BUS_STOP.z - 0.3, 0));
  for (const s of [-1, 1]) g.add(place(model("modular_street_seating", { part: "legs_single", collider: false }), BUS_STOP.x + s * 0.92, 0.12, BUS_STOP.z - 0.3, 0));
  const pole = new Mesh(new BoxGeometry(0.07, 2.6, 0.07), MATS.metal()); // modelled: the bus-stop sign pole (galvanised photo metal)
  pole.position.set(BUS_STOP.x + 1.6, 1.42, BUS_STOP.z - 0.1);
  g.add(pole);
  g.add(plane(0.5, 1.0, unlit("bussign", busSignTex, true), V(BUS_STOP.x + 1.6, 2.2, BUS_STOP.z - 0.06)));
  for (const [x, z, ry] of [[-14, WALK_N + 0.5, 0], [12.6, WALK_N + 0.5, 0.2], [-2, WALK_S - 0.5, Math.PI], [28, WALK_N + 0.5, 0]] as const) g.add(place(model("metal_trash_can", { part: "metal_trash_can", collider: "bin" }), x, 0.12, z, ry));
  for (const [x, z] of [[-24, WALK_N + 0.5], [19, WALK_S - 0.5], [40, WALK_N + 0.5]] as const) g.add(place(model("fire_hydrant", { part: "fire_hydrant", collider: "hydrant" }), x, 0.12, z, 0.4));
  for (const [x, z] of [[-26, WALK_N + 1.2], [-1, WALK_N + 1.2], [24, WALK_N + 1.2], [-14, WALK_S - 1.2], [12, WALK_S - 1.2]] as const) g.add(tree(rnd(x) > 0.5 ? "island_tree_01" : "tree_small_02", x, 0.12, z, { height: 5.5 }));
  for (const [x, z, ry, t] of [[-30, -2.6, 0, "#c8d8f0"], [-3, 2.8, Math.PI, "#f0d8c8"], [25.4, 21, Math.PI / 2, "#d8f0d0"], [44, 11, -Math.PI / 2, "#f0e8c8"]] as const) g.add(place(model("covered_car", { collider: "car", tint: t }), x, 0.0, z, ry + Math.PI / 2));
  for (const [x, z] of [[-40, WALK_N - 0.3], [9, WALK_N - 0.3], [38, WALK_N - 0.3]] as const) g.add(place(model("exterior_aircon_unit", { part: "exterior_aircon_unit", collider: false }), x, 3.6, z + 0.25, 0));
  for (const [x, z] of [[-17, WALK_N + 0.4], [-11.4, WALK_N + 0.45], [22, WALK_N + 0.4]] as const) g.add(place(model("potted_plant_02", { collider: "planter" }), x, 0.12, z, rnd(x)));
  g.add(place(model("utility_box_01", { collider: "utility box" }), 20.5, 0.12, WALK_N + 0.4, 0));
  g.add(place(model("water_manhole_cover", { collider: false }), 0, 0.005, 1.6, 0));
  g.add(place(model("water_manhole_cover", { collider: false }), 30, 0.015, 15, 0));
  // ---- the park: trees, shrubs, benches, the pond's rocks, grass
  g.add(pondWater());
  for (const [x, z, s] of [[-44, 12, 0.42], [-27, 24, 0.36], [-46, 22, 0.32]] as const) g.add(tree("jacaranda_tree", x, 0.02, z, { scale: s }));
  for (const [x, z, ry] of [[-41.5, 16, 0.4], [-30.2, 18.6, -0.6], [-37, 20.6, 2.6], [-33, 13.4, 3.6]] as const) g.add(place(model("boulder_01", { collider: "pond rock", scale: 0.7 }), x, 0.02, z, ry));
  g.add(place(model("painted_wooden_bench", { collider: "park bench" }), -36, 0.02, 12.2, Math.PI));
  for (const [x, z] of [[-48, 9], [-24, 9.5], [-42, 25], [-24, 22]] as const) g.add(place(model("shrub_02", { part: "shrub_02_a", collider: false, scale: 0.7 }), x, 0.02, z, rnd(x) * 6));
  g.add(...grassTufts(500, (_t, r) => { const a = r() * Math.PI * 2, rr = 1 + r() * 0.35; return V(POND.x + Math.cos(a) * (POND.w / 2 + 1.3) * rr, 0.03, POND.z + Math.sin(a) * (POND.d / 2 + 1.3) * rr); }, ["#4e6a34", "#6e8a44", "#9aa86a"], 41, 0.3));
  // ---- the lot: a chain-link fence along its west edge, a dumpster corner, the gym's floodlights
  g.add(place(model("modular_chainlink_fence", { part: "modular_chainlink_fence", collider: "fence" }), LOT.x0 - 0.3, 0, 12, Math.PI / 2));
  g.add(place(model("modular_chainlink_fence", { part: "modular_chainlink_fence", collider: "fence" }), LOT.x0 - 0.3, 0, 21, Math.PI / 2));
  g.add(place(model("concrete_road_barrier", { collider: "barrier" }), LOT.x1 - 1, 0.01, 9, 0.2));
  // far town: more blocks past both ends and behind, so every sightline ends in city
  for (let i = 0; i < 6; i++) {
    const cols: Col[] = ["large", "large", "plain", "large"];
    const b = block({ cols, floors: 4 + (i % 3) * 2, upper: (["large", "small", "double"] as const)[i % 3], tint: ["#f2e0d0", "#e0e8f0", "#f0f0e0"][i % 3], back: () => MATS.brick(["#b88a74", "#a8806a", "#c8a08a"][i % 3]), seed: 30 + i });
    g.add(place(b, -60 + i * 22, 0, WALK_N - 30));
    const c = block({ cols, floors: 3 + (i % 2) * 3, upper: (["double", "large", "small"] as const)[i % 3], tint: ["#e8f0f8", "#f8e8d8", "#e0f0e0"][i % 3], back: () => MATS.block(["#c8bca8", "#b8c0c4", "#c8b0a0"][i % 3]), seed: 40 + i });
    c.rotation.y = Math.PI; c.position.set(-60 + i * 22 + 12, 0, -60 + i * 22 > 10 ? 76 : WALK_S + 34);
    g.add(c);
  }
  for (const [x, ry] of [[-66, Math.PI / 2], [66, -Math.PI / 2]] as const) {
    const b = block({ cols: ["large", "plain", "large", "large", "plain"], floors: 6, upper: "large", tint: "#f0e8e0", back: () => MATS.brick("#a88070"), seed: 50 + x });
    b.rotation.y = ry; b.position.set(x, 0, ry > 0 ? -7.5 : 7.5);
    g.add(b);
  }
  return g;
};

/** Night dressing: the PROM banner over the gym doors, the doorway's warm glow on the plaza. */
export const promNight = () => {
  const g = new Group();
  g.add(plane(9, 1.3, unlit("prom", () => boardTex(["PROM NIGHT ✦"], "#2a1450", "#ffd6f2", 1024, 148)), V(GYM_DOOR.x, 4.2, GYM.front - 0.35), Math.PI));
  g.add(lightPatch(V(GYM_DOOR.x, 0.13, GYM.front - 2.4), V(0, 1, 0), 7, 4, "#ffc27a", 0.6, [1, 1], 0));
  return g;
};
export type { Object3D };
