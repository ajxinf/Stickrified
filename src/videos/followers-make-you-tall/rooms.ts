import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { model } from "../../../kit/toon/build/models";
import { lightPatch, lightShafts } from "../../../kit/toon/glow";
import { FONT, MATS, V, boardTex, canvasTex, litTex, place, plane, rnd, slab, unlit, wall } from "./common";

/**
 * followers-make-you-tall: the interiors, each its own small set (one per canvas).
 *   home    your family's apartment (lines 2, 5, 12, 14-16): a kitchen wall (stove, microwave, cabinets), your desk under
 *           the window, the bedroom door frame with the height marks. Lighting idea: bright morning sun through the
 *           desk window (warm key, a hard patch on the desk and floor), a cool fill from the open kitchen; the desk lamp
 *           a small warm practical. Materials: floor (wood_floor), walls (painted_plaster_wall, mint / cream), the
 *           kitchen splash-back (floor_tiles_06), the worktop (granite_tile), trim (white_planks_clean).
 *   school  Westbrook High (lines 7, 10): a locker hallway (lockers modelled from galvanised photo metal), a classroom
 *           with desks and a chalkboard. Lighting idea: cool fluorescent overheads (mounted_fluorescent_lights) as the
 *           practicals, daylight from the classroom windows. Materials: floor (floor_tiles_06), walls
 *           (painted_plaster_wall, pale blue / cream), lockers (metal_plate, painted), skirting (white_planks_clean).
 *   mart    Fresh Mart's checkout (line 13): steel grocery shelves of real food behind a conveyor counter, the till.
 *           Lighting idea: flat bright supermarket overheads, a warm spill from the window. Materials: floor
 *           (floor_tiles_06), walls (painted_plaster_wall), counter (granite_tile on painted metal), belt (asphalt_02 dark).
 */
// ================================================================== home
export const HOME = { x0: -3.2, x1: 3.2, z0: -2.6, z1: 2.8, h: 2.7 };
export const DESK_TOP = 0.79 * 0.85; // the desk model at 0.85 scale
export const DESK = V(1.6, DESK_TOP, -2.18); // desktop centre
export const KITCHEN = V(-1.8, 0, -2.0); // where Mom stands at the counter
export const DOOR_FRAME = { x: HOME.x0, z: 0.8, w: 0.9, h: 2.1 }; // the bedroom door in the west wall
export const WIN = { x0: 0.8, x1: 2.4, y0: 1.0, y1: 2.25 };
/** Pencil marks of your height on the door frame (4 inches tall: they live just above the skirting). */
const marksTex = () => canvasTex(128, 1024, (g) => {
  g.clearRect(0, 0, 128, 1024);
  g.strokeStyle = "#3a3a44"; g.fillStyle = "#3a3a44"; g.lineWidth = 3; g.font = `700 15px ${FONT}`;
  // y 1024 = floor, 0 = 0.5 m up: marks at 0.085 .. 0.102 m (old dates), the last one today's
  const marks = [[0.08, "MAR 3"], [0.084, "APR 9"], [0.088, "MAY 2"], [0.092, "JUN 1"], [0.096, "JUN 30"], [0.1, "AUG 5"]] as const;
  marks.forEach(([m, d], i) => {
    const y = 1024 - (m / 0.5) * 1024 - i * 0.0;
    g.beginPath(); g.moveTo(8, y); g.lineTo(60, y); g.stroke();
    g.fillText(d, 64, y + 5);
  });
});
export const MARK_TODAY_Y = 0.104; // today's mark, drawn as its own sheet on line 12
export const home = () => {
  const g = new Group(), { x0, x1, z0, z1, h } = HOME;
  g.add(slab(x0, x1, z0, z1, 0, MATS.wood()));
  const W = MATS.plaster("#cfe6dc"), W2 = MATS.plaster("#f2e6d0");
  // back wall round the desk window
  g.add(wall(WIN.x0 - x0, h, W, V((x0 + WIN.x0) / 2, 0, z0))); // surface
  g.add(wall(x1 - WIN.x1, h, W, V((WIN.x1 + x1) / 2, 0, z0))); // surface
  g.add(wall(WIN.x1 - WIN.x0, WIN.y0, W, V((WIN.x0 + WIN.x1) / 2, 0, z0))); // surface
  g.add(wall(WIN.x1 - WIN.x0, h - WIN.y1, W, V((WIN.x0 + WIN.x1) / 2, WIN.y1, z0))); // surface
  // west wall round the bedroom door, east wall, front wall (behind the lens)
  const D = DOOR_FRAME;
  g.add(wall(D.z - D.w / 2 - z0, h, W2, V(x0, 0, (z0 + D.z - D.w / 2) / 2), Math.PI / 2)); // surface
  g.add(wall(z1 - (D.z + D.w / 2), h, W2, V(x0, 0, (D.z + D.w / 2 + z1) / 2), Math.PI / 2)); // surface
  g.add(wall(D.w, h - D.h, W2, V(x0, D.h, D.z), Math.PI / 2)); // surface
  g.add(wall(z1 - z0, h, W2, V(x1, 0, (z0 + z1) / 2), -Math.PI / 2)); // surface
  g.add(wall(x1 - x0, h, W2, V(0, 0, z1), Math.PI)); // surface
  const ceil = slab(x0, x1, z0, z1, h, MATS.plaster("#f6f2ea")); ceil.rotation.x = Math.PI / 2; ceil.userData.ground = false; g.add(ceil);
  // trim: the door casing, skirting, the window frame + sill (architecture)
  const T = MATS.trim();
  const trim = (w: number, hh: number, d: number, x: number, y: number, z: number) => { const m = new Mesh(new BoxGeometry(w, hh, d), T); m.position.set(x, y, z); g.add(m); }; // surface: trim boards
  for (const s of [-1, 1]) trim(0.05, D.h, 0.09, x0 + 0.02, D.h / 2, D.z + s * (D.w / 2 + 0.045)); // surface
  trim(0.05, 0.09, D.w + 0.18, x0 + 0.02, D.h + 0.045, D.z); // surface
  trim(0.03, 0.1, z1 - z0, x0 + 0.015, 0.05, (z0 + z1) / 2); // surface
  trim(x1 - x0, 0.1, 0.03, 0, 0.05, z0 + 0.015); // surface
  trim(WIN.x1 - WIN.x0 + 0.2, 0.05, 0.22, (WIN.x0 + WIN.x1) / 2, WIN.y0 - 0.025, z0 + 0.08); // surface: sill
  for (const x of [WIN.x0 - 0.03, WIN.x1 + 0.03]) trim(0.06, WIN.y1 - WIN.y0, 0.12, x, (WIN.y0 + WIN.y1) / 2, z0); // surface
  trim(WIN.x1 - WIN.x0 + 0.12, 0.06, 0.12, (WIN.x0 + WIN.x1) / 2, WIN.y1 + 0.03, z0); // surface
  // the height marks on the door casing (south side, facing the room)
  g.add(plane(0.05, 0.5, litTex("marks", marksTex, { rough: 0.8 }), V(x0 + 0.05, 0.25, D.z + D.w / 2 + 0.045), Math.PI / 2));
  // through the door: a glimpse of your bedroom (bed, nightstand) so it opens onto a room
  g.add(slab(x0 - 3, x0, D.z - 1.5, D.z + 1.5, 0, MATS.carpet("#8aa0c8")));
  g.add(wall(3, h, MATS.plaster("#c8d8f0"), V(x0 - 1.5, 0, D.z - 1.5))); // surface
  g.add(wall(3, h, MATS.plaster("#c8d8f0"), V(x0 - 3, 0, D.z), Math.PI / 2)); // surface
  g.add(place(model("old_bed_frame", { collider: "bed" }), x0 - 1.8, 0, D.z - 0.4, Math.PI / 2));
  g.add(place(model("painted_wooden_nightstand", { part: "painted_wooden_nightstand", collider: "nightstand" }), x0 - 1.8, 0, D.z + 0.9, Math.PI / 2));
  // kitchen run along the back wall (west half): cabinets, the stove, the microwave on top, a splash-back
  g.add(place(model("painted_wooden_cabinet", { collider: "kitchen cabinet", tint: "#f2e8d8" }), -2.45, 0, z0 + 0.32, 0));
  g.add(place(model("electric_stove", { collider: "stove" }), -1.55, 0, z0 + 0.33, 0));
  g.add(place(model("modern_wooden_cabinet", { collider: "counter", scale: 0.55 }), -0.62, 0, z0 + 0.15, 0));
  g.add(place(model("vintage_microwave", { collider: false, scale: 0.5 }), -2.45, 1.186, z0 + 0.3, 0));
  g.add(plane(1.9, 0.6, MATS.tiles(), V(-1.65, 1.5, z0 + 0.01))); // surface: splash-back
  g.add(place(model("jug_01", { collider: false }), -0.5, 0.375, z0 + 0.2, 0.4));
  g.add(place(model("potted_plant_02", { collider: false, scale: 0.4 }), -0.85, 0.375, z0 + 0.2, 0.6));
  g.add(place(model("wall_clock", { collider: false }), -1.4, 2.15, z0 + 0.03, 0));
  // your desk under the window: lamp, laptop, alarm clock, pens, a binder
  g.add(place(model("metal_office_desk", { collider: "desk", scale: 0.85, tint: "#9a968e" }), DESK.x, 0, z0 + 0.42, 0));
  g.add(place(model("desk_lamp_arm_01", { collider: false }), DESK.x + 0.62, DESK_TOP, z0 + 0.2, -0.6));
  g.add(place(model("alarm_clock_01", { part: "alarm_clock_01", collider: false }), DESK.x - 0.65, DESK_TOP, z0 + 0.18, 0.3));
  g.add(place(model("stationery_supplies", { collider: false }), DESK.x - 0.4, DESK_TOP, z0 + 0.14, 0));
  g.add(place(model("binder_notebook", { part: "binder_notebook_closed", collider: false }), DESK.x + 0.3, DESK_TOP, z0 + 0.16, 0.1));
  g.add(place(model("painted_wooden_chair_01", { collider: "desk chair" }), DESK.x + 0.45, 0, z0 + 1.45, Math.PI + 0.3));
  g.add(place(model("wooden_bookshelf_worn", { collider: "bookshelf", scale: 0.9 }), x1 - 0.32, 0, 0.6, -Math.PI / 2));
  g.add(place(model("potted_plant_01", { collider: "plant" }), x1 - 0.42, 0, z0 + 1.3, 0.3));
  // outside the window: the street's facades across the road (a photo of morning brick), sun streaming in
  g.add(wall(8, 6, MATS.brick("#c89a7a"), V((WIN.x0 + WIN.x1) / 2, -1, z0 - 7))); // surface: the block across the street
  g.add(lightPatch(V(DESK.x, DESK_TOP + 0.003, z0 + 0.45), V(0, 1, 0), 1.2, 0.5, "#fff2d8", 0.22, [2, 1]));
  g.add(lightPatch(V(DESK.x - 0.3, 0.012, z0 + 1.9), V(0, 1, 0), 1.4, 1.2, "#fff0d0", 0.25, [2, 2]));
  g.add(lightShafts(V((WIN.x0 + WIN.x1) / 2, 1.9, z0 + 0.1), V(-0.15, -0.45, 0.88), { length: 3, width: 1.2, color: "#fff2dc", strength: 0.12, count: 5 }));
  return g;
};

// ================================================================== school (hallway at x < 0, classroom at x > 6)
export const HALL = { x0: -6, x1: 4, z0: -1.6, z1: 1.6, h: 3 };
export const ZOE_LOCKER = V(-0.6, 0, HALL.z0); // her locker's centre on the north wall
export const CLASS = { x0: 8, x1: 16, z0: -4, z1: 4, h: 3.2 };
export const CLASS_WIN = { z0: -1.6, z1: 1.6, y0: 0.9, y1: 2.8 }; // in the east wall (x = CLASS.x1)
const lockerTex = (duck: boolean) => canvasTex(256, 768, (g) => {
  g.clearRect(0, 0, 256, 768);
  g.fillStyle = "rgba(20,24,30,0.55)";
  for (let i = 0; i < 6; i++) g.fillRect(60, 40 + i * 18, 136, 7); // vent slots
  g.fillStyle = "rgba(220,226,232,0.9)"; g.fillRect(28, 330, 14, 60); // handle
  g.fillStyle = "rgba(20,24,30,0.6)"; g.fillRect(100, 700, 56, 20); // number plate
  if (!duck) return;
  // Zoe's duck stickers
  const duckD = (x: number, y: number, s: number, r: number) => {
    g.save(); g.translate(x, y); g.rotate(r); g.scale(s, s);
    g.fillStyle = "#ffd23f"; g.strokeStyle = "#1c1414"; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, 10, 34, 24, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.arc(22, -18, 18, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#f28a2a"; g.beginPath(); g.moveTo(38, -20); g.lineTo(56, -14); g.lineTo(38, -10); g.fill(); g.stroke();
    g.fillStyle = "#1c1414"; g.beginPath(); g.arc(26, -22, 4, 0, 7); g.fill();
    g.restore();
  };
  [[128, 200, 1, 0.1], [90, 470, 0.8, -0.3], [180, 560, 0.7, 0.4], [120, 640, 0.6, 0.0], [190, 420, 0.55, -0.2]].forEach(([x, y, s, r]) => duckD(x, y, s, r));
  g.fillStyle = "#ff6aa8"; g.font = `900 46px ${FONT}`; g.textAlign = "center"; g.fillText("QUACK!", 128, 290);
});
/** A run of lockers (modelled: no CC0 locker exists): painted photo-metal bodies, vents and handles on a decal. */
const lockers = (x0: number, n: number, z: number, cols: string[], duckAt = -1) => {
  const g = new Group();
  for (let i = 0; i < n; i++) {
    const x = x0 + 0.42 * i + 0.21, c = cols[i % cols.length];
    const b = new Mesh(new BoxGeometry(0.4, 1.8, 0.45), MATS.paint(c)); // modelled: locker body (painted photo metal)
    b.position.set(x, 0.9 + 0.12, z + 0.23);
    g.add(b);
    g.add(plane(0.38, 1.14, litTex(`locker-${i === duckAt}`, () => lockerTex(i === duckAt), { rough: 0.5, spec: 0.4 }), V(x, 0.12 + 1.15, z + 0.456)));
  }
  const base = new Mesh(new BoxGeometry(0.42 * n, 0.12, 0.42), MATS.darkWood()); // surface: the plinth the lockers stand on
  base.position.set(x0 + 0.21 * n, 0.06, z + 0.23);
  g.add(base);
  g.userData.collider = "lockers";
  return g;
};
export const school = () => {
  const g = new Group();
  // ---- hallway
  const { x0, x1, z0, z1, h } = HALL;
  g.add(slab(x0, x1, z0, z1, 0, MATS.tiles()));
  g.add(wall(x1 - x0, h, MATS.plaster("#cfe0ee"), V((x0 + x1) / 2, 0, z0))); // surface
  g.add(wall(x1 - x0, h, MATS.plaster("#cfe0ee"), V((x0 + x1) / 2, 0, z1), Math.PI)); // surface
  g.add(wall(z1 - z0, h, MATS.plaster("#f2e6d0"), V(x0, 0, 0), Math.PI / 2)); // surface
  const hc = slab(x0, x1, z0, z1, h, MATS.plaster("#f6f2ea")); hc.rotation.x = Math.PI / 2; hc.userData.ground = false; g.add(hc);
  g.add(lockers(x0 + 0.3, 21, z0, ["#3a6ab8", "#3a6ab8", "#3a6ab8", "#e85a3a"], 13));
  for (let i = 0; i < 4; i++) g.add(place(model("mounted_fluorescent_lights", { part: "mounted_fluorescent_lights_a", collider: false, glow: ["", "#f4f8ff", 2.5] }), x0 + 1.5 + i * 2.6, h - 0.04, 0, 0));
  g.add(plane(1.4, 0.7, unlit("prom-poster", () => boardTex(["PROM", "FRIDAY 8PM"], "#2a1450", "#ffd6f2", 512, 256)), V(x1 - 1.2, 1.7, z1 - 0.01), Math.PI));
  g.add(plane(1.0, 0.7, unlit("vote-poster", () => boardTex(["VOTE", "TYLER", "2M FOLLOWERS!"], "#f2c23a", "#1c1c22", 512, 360)), V(x0 + 1.6, 1.75, z1 - 0.01), Math.PI));
  g.add(place(model("WetFloorSign_01", { collider: "wet floor sign" }), x1 - 0.8, 0, z1 - 0.5, -0.4));
  // ---- classroom (separate room; its east windows look out at the town)
  const C = CLASS, CW = CLASS_WIN;
  g.add(slab(C.x0, C.x1, C.z0, C.z1, 0, MATS.floor()));
  const cw = MATS.plaster("#f2e6c8");
  g.add(wall(C.x1 - C.x0, C.h, cw, V((C.x0 + C.x1) / 2, 0, C.z0))); // surface
  g.add(wall(C.x1 - C.x0, C.h, cw, V((C.x0 + C.x1) / 2, 0, C.z1), Math.PI)); // surface
  g.add(wall(C.z1 - C.z0, C.h, cw, V(C.x0, 0, 0), Math.PI / 2)); // surface
  g.add(wall(CW.z0 - C.z0, C.h, cw, V(C.x1, 0, (C.z0 + CW.z0) / 2), -Math.PI / 2)); // surface
  g.add(wall(C.z1 - CW.z1, C.h, cw, V(C.x1, 0, (CW.z1 + C.z1) / 2), -Math.PI / 2)); // surface
  g.add(wall(CW.z1 - CW.z0, CW.y0, cw, V(C.x1, 0, 0), -Math.PI / 2)); // surface
  g.add(wall(CW.z1 - CW.z0, C.h - CW.y1, cw, V(C.x1, CW.y1, 0), -Math.PI / 2)); // surface
  const cc = slab(C.x0, C.x1, C.z0, C.z1, C.h, MATS.plaster("#f6f2ea")); cc.rotation.x = Math.PI / 2; cc.userData.ground = false; g.add(cc);
  for (const z of [CW.z0 - 0.04, CW.z1 + 0.04, 0]) { const m = new Mesh(new BoxGeometry(0.12, CW.y1 - CW.y0, 0.08), MATS.trim()); m.position.set(C.x1, (CW.y0 + CW.y1) / 2, z); g.add(m); } // surface: window mullions
  const sill = new Mesh(new BoxGeometry(0.3, 0.05, CW.z1 - CW.z0 + 0.2), MATS.trim()); sill.position.set(C.x1 - 0.1, CW.y0, 0); g.add(sill); // surface: sill
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    g.add(place(model("SchoolDesk_01", { collider: `desk ${r}${c}` }), C.x0 + 2.4 + r * 1.9, 0, -2.4 + c * 2.1, Math.PI / 2));
    g.add(place(model("SchoolChair_01", { collider: false }), C.x0 + 1.75 + r * 1.9, 0, -2.4 + c * 2.1, Math.PI / 2));
  }
  g.add(place(model("standing_chalkboard_01", { collider: "chalkboard" }), C.x0 + 0.7, 0, C.z1 - 1.2, Math.PI / 2 + 0.4));
  for (let i = 0; i < 2; i++) g.add(place(model("mounted_fluorescent_lights", { part: "mounted_fluorescent_lights_a", collider: false, glow: ["", "#f4f8ff", 2.5] }), C.x0 + 2.5 + i * 3.5, C.h - 0.04, 0, Math.PI / 2));
  g.add(place(model("wall_clock", { collider: false }), C.x0 + 4, 2.4, C.z0 + 0.03, 0));
  // outside the classroom windows: the far side of the schoolyard (a photo-brick block) and the sky
  g.add(wall(30, 14, MATS.brick("#b88a74"), V(C.x1 + 60, 0, 0), -Math.PI / 2)); // surface: distant block
  g.add(slab(C.x1, C.x1 + 70, -40, 40, -0.02, MATS.lot()));
  return g;
};

// ================================================================== mart: Fresh Mart's checkout
export const CHECKOUT = V(0, 0, 0); // the belt's centre; the cashier stands at -z, the bread on the belt
export const BELT = { x0: -1.4, x1: 1.2, z: 0, y: 0.86 };
export const mart = () => {
  const g = new Group();
  g.add(slab(-8, 8, -6, 6, 0, MATS.tiles()));
  g.add(wall(16, 3.4, MATS.plaster("#e8f0e0"), V(0, 0, -6))); // surface
  g.add(wall(12, 3.4, MATS.plaster("#e8f0e0"), V(-8, 0, 0), Math.PI / 2)); // surface
  g.add(wall(12, 3.4, MATS.plaster("#e8f0e0"), V(8, 0, 0), -Math.PI / 2)); // surface
  const ce = slab(-8, 8, -6, 6, 3.4, MATS.plaster("#f6f6f2")); ce.rotation.x = Math.PI / 2; ce.userData.ground = false; g.add(ce);
  // the checkout counter (architecture: a granite-topped painted-metal run) and its dark belt
  const body = new Mesh(new BoxGeometry(BELT.x1 - BELT.x0 + 0.6, BELT.y - 0.04, 0.7), MATS.paint("#3a8a4a")); // surface: counter body
  body.position.set((BELT.x0 + BELT.x1) / 2 + 0.3, (BELT.y - 0.04) / 2, 0);
  g.add(body);
  const top = new Mesh(new BoxGeometry(BELT.x1 - BELT.x0 + 0.62, 0.04, 0.74), MATS.granite()); // surface: worktop
  top.position.set((BELT.x0 + BELT.x1) / 2 + 0.3, BELT.y - 0.02, 0);
  g.add(top);
  g.add(slab(BELT.x0, BELT.x1, -0.26, 0.26, BELT.y + 0.002, MATS.road()));
  g.userData.counter = body;
  g.add(place(model("CashRegister_01", { collider: "till" }), BELT.x1 + 0.4, BELT.y, -0.05, -Math.PI / 2 + 0.2));
  // shelves of real food behind (steel grocery units), crates of fruit, a sign
  for (let i = 0; i < 9; i++) {
    const x = -6.6 + i * 0.62;
    g.add(place(model("steel_frame_shelves_02", { collider: `shelf ${i}` }), x, 0, -5.6, 0));
    for (const [y, item] of [[0.25, "long_life_food"], [0.78, "russian_food_cans_01"], [1.3, "long_life_food"], [1.8, "russian_food_cans_01"]] as const) {
      for (let k = 0; k < (item === "long_life_food" ? 1 : 3); k++) g.add(place(model(item, { collider: false, scale: item === "long_life_food" ? 1 : 1.2 }), x - 0.15 + k * 0.15, y, -5.55, rnd(i + y * 7 + k) * 0.4 - 0.2));
    }
  }
  for (let i = 0; i < 4; i++) {
    g.add(place(model("plastic_crate_01", { collider: `crate ${i}` }), 3.2 + i * 0.45, 0, -4.8, 0));
    g.add(place(model(i % 2 ? "bananas" : "food_apple_01", { collider: false, scale: i % 2 ? 0.6 : 1.4 }), 3.2 + i * 0.45, 0.26, -4.8, rnd(i) * 3));
  }
  for (let i = 0; i < 3; i++) g.add(place(model("mounted_fluorescent_lights", { part: "mounted_fluorescent_lights_a", collider: false, glow: ["", "#f4f8ff", 2.5] }), -3 + i * 3, 3.36, -1.5, 0));
  g.add(plane(3, 0.6, unlit("mart-sign", () => boardTex(["FRESH MART"], "#3a8a4a", "#ffffff", 1024, 205)), V(0, 2.8, -5.98)));
  g.add(plane(1.2, 0.5, unlit("bread-sale", () => boardTex(["BREAD", "LIMIT 2"], "#fff4d0", "#c8342c", 512, 214)), V(-4.2, 2.1, -5.4)));
  return g;
};
export const EMPTY = new MeshBasicMaterial({ visible: false });
export type { Vector3 };
