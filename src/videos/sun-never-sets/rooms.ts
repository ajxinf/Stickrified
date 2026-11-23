import { BoxGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { curvedScreen } from "../../../kit/toon/build/screen";
import { lightPatch, lightShafts } from "../../../kit/toon/glow";
import { skyDir } from "../../../kit/toon/sky";
import { toonMaterial } from "../../../kit/toon/shade";
import { FONT, MATS, V, boardTex, canvasTex, colMat, glassMat, glowMat, litTex, place, plane, rnd, slab, unlit } from "./common";

/**
 * sun-never-sets: the interiors, each its own small set (one per canvas).
 *   home    your kitchen at "3 AM" (lines 1, 10-12, 22). Lighting idea: the frozen sun stands low straight outside the
 *           back window (az 0, 19 deg up), a hard white beam across the worktop and floor, cool blue bounce in the
 *           shade; the microwave's green clock the only practical. Materials: floor (laminate_floor), walls
 *           (painted_plaster_wall), splash-back (floor_tiles_06), cabinets (white_planks_clean, mustard), worktop
 *           (granite_tile, dark), the yard outside (leafy_grass, weathered_planks fence, siding).
 *   closet  a hallway closet for rent (line 6): one bare warm bulb, dark corners; wood floor, plaster, coats in hessian.
 *   cinema  the theater-hotel (line 6): the screen's blue glow is the key on rows of sleepers, red aisle lights.
 *   ohio    a kitchen in Ohio (line 7): cool daylight + the fridge's own white interior light that clicks off.
 *   tv      the analogy (line 23): a warm evening living room, the TV's blue the key on the family; the little brother
 *           walks in front of it and the room goes dark.
 *   box     inside your cereal-box viewer (line 20): dim cardboard, the pinhole's bright sun disc on the white card.
 */
// ================================================================== home: the kitchen
export const HOME = { x0: -2.6, x1: 2.6, z0: -2.2, z1: 2.4, h: 2.6 };
export const WIN = { x0: -0.8, x1: 0.8, y0: 1.05, y1: 2.2 };
export const TOP = 0.92; // worktop height
export const TOASTER = V(-0.95, TOP, -1.9);
export const MICRO = V(-1.62, TOP, -1.93);
export const MICRO_CLOCK = V(-1.45, TOP + 0.17, -1.72);
export const SILL = V(0.35, WIN.y0 + 0.04, HOME.z0 + 0.12);
export const COUNTER_BOX = V(-2.2, TOP, -1.85); // the cereal box on the worktop (line 11)
/** The frozen sun as seen from the kitchen: low, straight out of the window. */
export const HOME_SUN_AZ = 0, HOME_SUN_EL = 19.3;
export const HOME_SUN = skyDir(HOME_SUN_AZ, HOME_SUN_EL);
/** Where your eye is when you draw the dots (and the lens of line 22): each dot lies on the line from it to the Moon. */
export const EYE = V(0.05, 1.5, -1.3);
const GLASS_Z = HOME.z0 + 0.03;
/** Sky direction of the Moon k "days" before the eclipse (3 deg a day here, an arc coming in from the lower left). */
export const moonDayDir = (k: number) => { const a = 3.0 * k; return skyDir(HOME_SUN_AZ - a, HOME_SUN_EL - 0.69 * a + 0.004 * a * a); };
/** Dot k on the glass (world): where the eye's ray toward the Moon k days out crosses the window. */
export const dotAt = (k: number) => { const d = moonDayDir(k), t = (GLASS_Z - EYE.z) / d.z; return EYE.clone().addScaledVector(d, t); };
export const DOTS_MAX = 9;
/** The marker dots on the glass: `n` of them, the newest (k = 1 is yesterday's ... ) nearest the sun. */
const dotsTex = (n: number) => canvasTex(1024, 768, (g) => {
  g.clearRect(0, 0, 1024, 768);
  for (let i = 0; i < n; i++) {
    const k = DOTS_MAX - i, p = dotAt(k);
    if (p.x < WIN.x0 || p.x > WIN.x1 || p.y < WIN.y0 || p.y > WIN.y1) continue;
    const u = ((p.x - WIN.x0) / (WIN.x1 - WIN.x0)) * 1024, v = ((WIN.y1 - p.y) / (WIN.y1 - WIN.y0)) * 768;
    g.fillStyle = "#141018"; g.beginPath(); g.ellipse(u, v, 4.2 + rnd(k), 3.8 + rnd(k + 1), rnd(k + 2), 0, 7); g.fill();
  }
});
const DOT_MATS = new Map<number, MeshBasicMaterial>();
export const dotsMat = (n: number) => {
  let m = DOT_MATS.get(n);
  if (!m) { m = new MeshBasicMaterial({ map: dotsTex(n), transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide }); DOT_MATS.set(n, m); }
  return m;
};
const fridgeArt = () => canvasTex(256, 320, (c) => {
  c.fillStyle = "#fbf8ee"; c.fillRect(0, 0, 256, 320);
  c.lineWidth = 6; c.strokeStyle = "#e8a020"; c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(128, 120, 50, 0, 7); c.fill(); c.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.28; c.beginPath(); c.moveTo(128 + Math.cos(a) * 62, 120 + Math.sin(a) * 62); c.lineTo(128 + Math.cos(a) * 92, 120 + Math.sin(a) * 92); c.stroke(); }
  c.fillStyle = "#1c1414"; c.beginPath(); c.arc(112, 112, 6, 0, 7); c.arc(144, 112, 6, 0, 7); c.fill();
  c.lineWidth = 4; c.strokeStyle = "#1c1414"; c.beginPath(); c.arc(128, 128, 20, 0.2, 2.9); c.stroke();
  c.fillStyle = "#3a6ab8"; c.font = `900 40px ${FONT}`; c.textAlign = "center"; c.fillText("GO AWAY", 128, 270);
});
export const home = () => {
  const g = new Group(), { x0, x1, z0, z1, h } = HOME;
  g.add(slab(x0, x1, z0, z1, 0, MATS.floor()));
  const k = new Kit(), W = MATS.wall("#d8e6e0"), T = MATS.trim();
  // back wall round the window hole
  k.box(W, WIN.x0 - x0, h, 0.12, (x0 + WIN.x0) / 2, h / 2, z0 - 0.06);
  k.box(W, x1 - WIN.x1, h, 0.12, (WIN.x1 + x1) / 2, h / 2, z0 - 0.06);
  k.box(W, WIN.x1 - WIN.x0, WIN.y0, 0.12, 0, WIN.y0 / 2, z0 - 0.06);
  k.box(W, WIN.x1 - WIN.x0, h - WIN.y1, 0.12, 0, (h + WIN.y1) / 2, z0 - 0.06);
  for (const s of [-1, 1]) k.box(W, 0.12, h, z1 - z0, (s < 0 ? x0 : x1) + s * 0.06, h / 2, (z0 + z1) / 2);
  k.box(W, x1 - x0 + 0.24, 0.1, z1 - z0, 0, h + 0.05, (z0 + z1) / 2);
  // window frame + cross bars
  k.box(T, WIN.x1 - WIN.x0 + 0.14, 0.07, 0.16, 0, WIN.y1 + 0.035, z0);
  k.box(T, WIN.x1 - WIN.x0 + 0.2, 0.06, 0.26, 0, WIN.y0 - 0.03, z0 + 0.06);
  for (const x of [WIN.x0 - 0.035, WIN.x1 + 0.035]) k.box(T, 0.07, WIN.y1 - WIN.y0, 0.16, x, (WIN.y0 + WIN.y1) / 2, z0);
  // the counter run along the back wall, upper cabinets on the left, a fridge on the right
  k.box(MATS.cabinet(), 4.1, 0.86, 0.6, -0.55, 0.43, z0 + 0.3);
  for (let i = 0; i < 6; i++) k.box(MAT.color("#c8962e"), 0.02, 0.7, 0.02, -2.35 + i * 0.68, 0.45, z0 + 0.61); // door gaps
  for (let i = 0; i < 6; i++) k.box(MAT.metal(), 0.14, 0.02, 0.03, -2.2 + i * 0.68, 0.78, z0 + 0.62); // handles
  k.box(MATS.worktop(), 4.2, 0.06, 0.66, -0.55, TOP - 0.03, z0 + 0.33);
  k.box(MATS.tiles(), WIN.x0 - x0, 0.58, 0.02, (x0 + WIN.x0) / 2, TOP + 0.29, z0 + 0.01);
  k.box(MATS.tiles(), 1.6, 0.58, 0.02, WIN.x1 + 0.4, TOP + 0.29, z0 + 0.01);
  k.box(MATS.cabinet(), 1.75, 0.68, 0.34, -1.72, 1.92, z0 + 0.17);
  for (let i = 0; i < 3; i++) k.box(MAT.color("#c8962e"), 0.02, 0.62, 0.02, -2.3 + i * 0.58, 1.92, z0 + 0.35);
  k.box(MAT.color("#eef0ec"), 0.8, 1.9, 0.7, 2.15, 0.95, z0 + 0.35); // fridge
  k.box(MAT.color("#c8ccd2"), 0.03, 0.55, 0.04, 1.82, 1.25, z0 + 0.72);
  // sink under the window
  k.box(MAT.metal(), 0.7, 0.03, 0.42, 0, TOP + 0.005, z0 + 0.3);
  k.add(MAT.metal(), new CylinderGeometry(0.02, 0.025, 0.3, 10), 0, TOP + 0.15, z0 + 0.1);
  k.add(MAT.metal(), new CylinderGeometry(0.016, 0.016, 0.2, 10).rotateX(Math.PI / 2), 0, TOP + 0.29, z0 + 0.19);
  const walls = k.build();
  walls.userData.collider = "kitchen";
  g.add(walls);
  g.add(place(model("electric_stove", { collider: "stove" }), 1.25, 0, z0 + 0.36, 0));
  g.add(place(model("vintage_microwave", { collider: "microwave", scale: 0.55 }), MICRO.x, TOP, MICRO.z, 0));
  g.add(place(model("potted_plant_02", { collider: false, scale: 0.32 }), -0.55, WIN.y0, z0 + 0.1, 0.3));
  g.add(plane(0.13, 0.05, unlit("clock", () => canvasTex(256, 100, (c) => { c.fillStyle = "#061008"; c.fillRect(0, 0, 256, 100); c.fillStyle = "#6aff8a"; c.shadowColor = "#6aff8a"; c.shadowBlur = 12; c.font = `900 70px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("3:00", 112, 54); c.font = `900 30px ${FONT}`; c.fillText("AM", 222, 66); })), MICRO_CLOCK));
  g.add(place(model("dining_table", { collider: "table", scale: 0.6 }), -0.2, 0, 1.5, 0));
  g.add(place(model("dining_chair_02", { collider: "chair" }), 0.95, 0, 1.4, -Math.PI / 2));
  g.add(plane(0.26, 0.32, litTex("fridgeArt", fridgeArt), V(2.0, 1.35, z0 + 0.705), 0, 0, 0.06));
  // a wall calendar of crossed-out days on the side wall
  g.add(plane(0.5, 0.62, litTex("calendar", () => canvasTex(400, 500, (c) => {
    c.fillStyle = "#fbf8ee"; c.fillRect(0, 0, 400, 500); c.fillStyle = "#c8342c"; c.fillRect(0, 0, 400, 80);
    c.fillStyle = "#fff"; c.font = `900 54px ${FONT}`; c.textAlign = "center"; c.fillText("JUNE", 200, 58);
    c.strokeStyle = "#c8342c"; c.lineWidth = 6;
    for (let i = 0; i < 35; i++) { const x = 30 + (i % 7) * 50, y = 120 + Math.floor(i / 7) * 72; c.strokeStyle = "#d8d0c0"; c.lineWidth = 2; c.strokeRect(x, y - 30, 46, 64); if (i < 29) { c.strokeStyle = "#c8342c"; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 6, y - 22); c.lineTo(x + 40, y + 26); c.moveTo(x + 40, y - 22); c.lineTo(x + 6, y + 26); c.stroke(); } }
  })), V(x0 + 0.02, 1.6, -0.6), Math.PI / 2));
  // the glass (marker dots drawn on it: Video.tsx swaps the dots material by count)
  const dots = new Mesh(new PlaneGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0), dotsMat(0));
  dots.position.set(0, (WIN.y0 + WIN.y1) / 2, GLASS_Z);
  dots.name = "dots";
  g.add(dots);
  // outside: the back yard, a fence, Kyle's house wall, a tree (the sun sits above them)
  const out = new Group();
  out.add(slab(-40, 40, -60, z0 - 0.12, -0.02, MATS.lawn()));
  const f = new Kit();
  for (let x = -12; x < 12; x += 0.16) f.box(MATS.fence(), 0.15, 1.6, 0.04, x, 0.8, -9);
  out.add(f.build());
  const kh = new Kit();
  kh.box(MATS.siding("#8ab8d8"), 9, 4.4, 6, 7.5, 2.2, -16);
  kh.add(MATS.roofRed(), new CylinderGeometry(4, 4, 9.8, 3), 7.5, 6.4, -16, { rx: -Math.PI / 2, ry: Math.PI / 2, tile: true });
  out.add(kh.build());
  out.add(place(model("island_tree_01", { collider: false, scale: 1.1 }), -7, -0.02, -14, 0.7));
  g.add(out);
  // the beam: a hard sun patch on the worktop and floor, faint dusty shafts
  g.add(lightPatch(V(0, TOP + 0.012, z0 + 0.42), V(0, 1, 0), 1.5, 0.5, "#fff6e6", 0.55, [2, 1]));
  g.add(lightPatch(V(0.05, 0.012, z0 + 2.3), V(0, 1, 0), 1.6, 1.6, "#fff4e0", 0.6, [2, 2]));
  g.add(lightShafts(V(0, 1.7, z0 + 0.1), V(0, -0.33, 0.94), { length: 3.2, width: 1.3, color: "#fff2dc", strength: 0.14, count: 5 }));
  return g;
};

// ================================================================== the small rooms (each its own canvas)
const coat = (k: Kit, x: number, col: string, z: number) => {
  k.box(MATS.cloth(col), 0.42, 0.95, 0.16, x, 1.42, z);
  k.box(MATS.cloth(col), 0.5, 0.18, 0.18, x, 1.86, z);
};
export const CLOSET = { x: 0, z: 0, w: 1.3, d: 0.85, h: 2.1 };
export const CLOSET_SEAT = V(0.05, 0, -0.38);
const rentTex = () => canvasTex(512, 384, (g) => {
  g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#c8342c"; g.textAlign = "center"; g.font = `900 92px ${FONT}`; g.fillText("FOR RENT", 256, 120);
  g.fillStyle = "#1c1414"; g.font = `900 120px ${FONT}`; g.fillText("$900", 256, 250);
  g.font = `800 54px ${FONT}`; g.fillText("PER NIGHT", 256, 330);
  g.fillStyle = "rgba(230,220,160,0.8)"; g.fillRect(200, 0, 112, 26);
});
export const closet = () => {
  const g = new Group(), { w, d, h } = CLOSET;
  g.add(slab(-4, 4, -1.2, 4, 0, MATS.wood()));
  const k = new Kit(), W = MATS.wall("#c8b8e0"), T = MATS.trim();
  // hallway wall with the closet opening, the closet box behind it
  k.box(W, 4 - w / 2, 2.7, 0.12, -(4 + w / 2) / 2, 1.35, 0.06);
  k.box(W, 4 - w / 2, 2.7, 0.12, (4 + w / 2) / 2, 1.35, 0.06);
  k.box(W, w, 2.7 - h, 0.12, 0, h + (2.7 - h) / 2, 0.06);
  k.box(MATS.plaster("#a89aa8"), w, h, 0.06, 0, h / 2, -d);
  for (const s of [-1, 1]) k.box(MATS.plaster("#a89aa8"), 0.06, h, d, (s * w) / 2, h / 2, -d / 2);
  k.box(MATS.plaster("#a89aa8"), w, 0.06, d, 0, h, -d / 2);
  for (const s of [-1, 1]) k.box(T, 0.08, h, 0.14, (s * (w + 0.08)) / 2, h / 2, 0.1);
  k.box(T, w + 0.16, 0.1, 0.14, 0, h + 0.05, 0.1);
  k.box(T, 8, 0.12, 0.03, 0, 0.06, 0.135); // skirting
  k.add(MAT.metal(), new CylinderGeometry(0.015, 0.015, w - 0.05, 6).rotateZ(Math.PI / 2), 0, 1.92, -d / 2);
  coat(k, -0.42, "#3a5a8a", -d / 2 + 0.05); coat(k, 0.45, "#8a3a3a", -d / 2 + 0.08); coat(k, 0.25, "#5a6a3a", -d / 2 - 0.12);
  k.box(MAT.color("#6a4a2a"), 0.5, 0.36, 0.4, CLOSET_SEAT.x, 0.18, CLOSET_SEAT.z - 0.2); // laundry box he sits on
  const b = k.build();
  b.userData.collider = "closet";
  g.add(b);
  // the open door with the sign taped on, swung out to the right
  const door = new Group(), dk = new Kit();
  dk.box(MATS.trim(), w, h - 0.02, 0.05, -w / 2, h / 2, 0);
  dk.add(MAT.color("#e2c25a"), new SphereGeometry(0.035, 8, 6), -w + 0.1, 1.0, 0.04);
  door.add(dk.build());
  door.add(plane(0.5, 0.38, unlit("rent", rentTex), V(-w / 2, 1.45, -0.03), Math.PI));
  door.position.set(w / 2, 0, 0.12);
  door.rotation.y = 1.4;
  g.add(door);
  g.add(place(model("potted_plant_01", { collider: false, scale: 0.7 }), -1.7, 0, 0.6, 0.4));
  // the bare bulb inside
  g.add(place(new Mesh(new SphereGeometry(0.05, 10, 8), glowMat("#ffd08a", 4)), 0, h - 0.12, -d / 2));
  return g;
};

export const CINEMA = { w: 8, d: 12, h: 4.6 };
export const ROWS = [-0.8, 0.5, 1.8, 3.1];
export const SEATS_X = [-2.4, -1.6, -0.8, 0.8, 1.6, 2.4];
const sheepTex = () => canvasTex(1024, 512, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#8fc8ff"); gr.addColorStop(1, "#e8f4ff"); c.fillStyle = gr; c.fillRect(0, 0, 1024, 512);
  c.fillStyle = "#6ab85a"; c.fillRect(0, 380, 1024, 132);
  c.fillStyle = "#8a5a3a"; for (let x = 380; x < 660; x += 60) c.fillRect(x, 300, 14, 90); c.fillRect(370, 320, 300, 12); c.fillRect(370, 350, 300, 12);
  for (const [x, y] of [[250, 330], [520, 230], [800, 330]]) {
    c.fillStyle = "#fbfbf6"; c.strokeStyle = "#1c1414"; c.lineWidth = 6;
    for (const [dx, dy] of [[-30, 0], [0, -20], [30, 0], [0, 15]]) { c.beginPath(); c.arc(x + dx, y + dy, 36, 0, 7); c.fill(); }
    c.fillStyle = "#1c1414"; c.beginPath(); c.ellipse(x + 62, y - 8, 22, 18, 0, 0, 7); c.fill();
  }
  c.fillStyle = "#1c1414"; c.font = `900 64px ${FONT}`; c.textAlign = "center"; c.fillText("COUNTING SHEEP 4", 512, 80);
});
export const cinema = () => {
  const g = new Group(), { w, d, h } = CINEMA, zf = -d / 2 + 1.5, zb = d / 2 - 1.5;
  g.add(slab(-w / 2, w / 2, zf - 1, zb + 1, 0, MATS.carpet("#6a2a3a")));
  const k = new Kit(), W = MATS.wall("#4a2a38");
  k.box(W, w, h, 0.12, 0, h / 2, zf - 1.06);
  k.box(W, w, h, 0.12, 0, h / 2, zb + 1.06);
  for (const s of [-1, 1]) k.box(W, 0.12, h, zb - zf + 2, (s * w) / 2, h / 2, (zf + zb) / 2);
  k.box(MAT.color("#1a1018"), w, 0.1, zb - zf + 2, 0, h, (zf + zb) / 2);
  // seats: velvet back + cushion + arms, facing the screen (-z)
  const R = MATS.cloth("#b8243a");
  for (const z of ROWS) for (const x of SEATS_X) {
    k.box(R, 0.62, 0.75, 0.14, x, 0.72, z + 0.32);
    k.box(R, 0.6, 0.14, 0.5, x, 0.4, z + 0.05);
    k.box(MAT.color("#2a1a20"), 0.08, 0.6, 0.5, x - 0.36, 0.3, z + 0.05);
  }
  // red aisle lights along the wall
  for (const z of [zf, (zf + zb) / 2, zb]) for (const s of [-1, 1]) k.box(glowMat("#ff3a3a", 3), 0.06, 0.1, 0.06, s * (w / 2 - 0.08), 0.35, z);
  const b = k.build();
  b.userData.collider = "cinema";
  g.add(b);
  g.add(plane(6.4, 3.2, unlit("sheep", sheepTex), V(0, 2.6, zf - 0.99)));
  g.add(plane(3.2, 0.9, unlit("hotel", () => boardTex(["HOTEL"], "#f2c23a", "#2a1018", 1024, 288)), V(0, 3.6, zb + 0.99), Math.PI));
  g.add(plane(2.4, 0.55, unlit("hotel2", () => boardTex(["$300 A SEAT"], "#2a1018", "#f2c23a", 1024, 236)), V(0, 2.95, zb + 0.99), Math.PI));
  return g;
};
export const CINEMA_SCREEN = V(0, 2.6, -CINEMA.d / 2 + 0.6);

export const FRIDGE = { x: 0, z: -1.0, w: 0.86, h: 1.92, d: 0.72 };
export const FRIDGE_SEAT = V(0, 0, FRIDGE.z + 0.06); // 10 cm in front of the crisper he sits on // inside, sitting on the crisper drawer
const ohioTex = () => canvasTex(256, 128, (c) => { c.fillStyle = "#c8342c"; c.beginPath(); c.roundRect(4, 4, 248, 120, 20); c.fill(); c.fillStyle = "#fff"; c.font = `900 50px ${FONT}`; c.textAlign = "center"; c.fillText("I ♥ OHIO", 128, 82); });
export const ohio = () => {
  const g = new Group(), { x, z, w, h, d } = FRIDGE, zf = z + d / 2;
  g.add(slab(-3, 3, -2, 3, 0, MATS.tiles()));
  const k = new Kit(), W = MATS.wall("#e8a888");
  k.box(W, 6, 2.7, 0.12, 0, 1.35, z - d / 2 - 0.08);
  for (const s of [-1, 1]) k.box(MATS.cabinet(), 1.8, 0.88, 0.6, x + s * 1.45, 0.44, z - 0.05);
  for (const s of [-1, 1]) k.box(MATS.worktop(), 1.84, 0.05, 0.64, x + s * 1.45, 0.905, z - 0.05);
  // the fridge shell (open front), shelves, crisper, a milk carton and leftovers
  const F = MAT.color("#f4f6f4");
  k.box(F, w, h, 0.05, x, h / 2, z - d / 2 + 0.025);
  for (const s of [-1, 1]) k.box(F, 0.05, h, d, x + (s * (w - 0.05)) / 2, h / 2, z);
  k.box(F, w, 0.05, d, x, h - 0.025, z);
  k.box(F, w, 0.16, d, x, 0.08, z);
  k.box(MAT.color("#dfe8ee"), w - 0.1, 0.22, d - 0.08, x, 0.27, z); // crisper drawer (his seat)
  for (const y of [1.15, 1.5]) k.box(MAT.color("#cfe0ea"), w - 0.1, 0.02, d - 0.1, x, y, z);
  k.box(MAT.color("#f8f8f2"), 0.1, 0.22, 0.1, x - 0.26, 1.27, z + 0.05); k.box(MAT.color("#3a7ad8"), 0.1, 0.05, 0.1, x - 0.26, 1.33, z + 0.05);
  k.box(MAT.color("#e84a3a"), 0.18, 0.1, 0.14, x + 0.2, 1.21, z); k.box(MAT.color("#f2c23a"), 0.16, 0.12, 0.12, x + 0.22, 1.56, z - 0.05);
  const b = k.build();
  b.userData.collider = "ohio kitchen";
  g.add(b);
  // the inside light (a glowing panel, Video.tsx turns it off) + the door on its right-hand hinge
  const lamp = new Mesh(new PlaneGeometry(w - 0.14, 0.05), glowMat("#f4fbff", 4));
  lamp.rotation.x = Math.PI / 2;
  lamp.position.set(x, h - 0.06, z);
  lamp.name = "fridgeLamp";
  g.add(lamp);
  const door = new Group(), dk = new Kit();
  dk.box(F, w, h, 0.06, -w / 2, h / 2, 0.03);
  dk.box(MAT.color("#c8ccd2"), 0.03, 0.6, 0.04, -w + 0.1, 1.2, 0.08);
  door.add(dk.build());
  door.add(plane(0.2, 0.1, unlit("ohio", ohioTex), V(-w / 2, 1.5, 0.065)));
  door.add(plane(0.16, 0.2, litTex("ohioArt", fridgeArt), V(-w / 2 + 0.15, 1.2, 0.065), 0, 0, -0.08));
  door.position.set(x + w / 2, 0, zf);
  door.name = "fridgeDoor";
  door.userData.door = h;
  door.userData.opens = true;
  door.userData.door = h;
  door.userData.opens = true;
  door.userData.door = h;
  door.userData.opens = true;
  g.add(door);
  g.add(place(model("potted_plant_01", { collider: false, scale: 0.5 }), 1.6, 0.93, z - 0.1, 0.4));
  return g;
};

export const LIVING = { sofa: V(0, 0, -1.1), tv: V(1.3, 0.55, 1.5) };
export const living = () => {
  const g = new Group();
  g.add(slab(-4, 4, -2, 3.5, 0, MATS.wood()));
  const k = new Kit(), W = MATS.wall("#e8c8a0");
  k.box(W, 8, 2.7, 0.12, 0, 1.35, -1.75);
  k.box(W, 0.12, 2.7, 5.5, -3.0, 1.35, 0.75);
  k.box(MATS.darkWood(), 1.1, 0.55, 0.45, LIVING.tv.x, 0.275, LIVING.tv.z);
  for (const [x, y, w, h] of [[-0.9, 1.75, 0.6, 0.45], [0.2, 1.85, 0.4, 0.5], [1.0, 1.7, 0.5, 0.36]]) k.box(MATS.darkWood(), w + 0.06, h + 0.06, 0.03, x, y, -1.68);
  const b = k.build();
  b.userData.collider = "living room";
  g.add(b);
  [["#f2c23a", -0.9, 1.75, 0.6, 0.45], ["#5ab0d8", 0.2, 1.85, 0.4, 0.5], ["#e86a8a", 1.0, 1.7, 0.5, 0.36]].forEach(([c, x, y, w, h], i) =>
    g.add(plane(w as number, h as number, litTex(`livArt${i}`, () => canvasTex(256, 200, (cc) => { cc.fillStyle = c as string; cc.fillRect(0, 0, 256, 200); cc.fillStyle = "#fbf8ee"; cc.beginPath(); cc.arc(128 + i * 20, 100, 50, 0, 7); cc.fill(); })), V(x as number, y as number, -1.66))));
  g.add(place(model("sofa_02", { collider: "sofa" }), LIVING.sofa.x, 0, LIVING.sofa.z, 0));
  g.add(place(model("throw_pillows_01", { collider: false, scale: 0.7 }), LIVING.sofa.x - 0.55, 0.42, LIVING.sofa.z - 0.05, 0.3));
  const tv = place(model("television_02", { collider: "tv", scale: 1.6 }), LIVING.tv.x, LIVING.tv.y, LIVING.tv.z, Math.PI + 0.35);
  const scr = curvedScreen(canvasTex(640, 480, (c) => { c.fillStyle = "#3a8ad8"; c.fillRect(0, 0, 640, 480); c.fillStyle = "#f6f0e6"; c.beginPath(); c.arc(320, 240, 120, 0, 7); c.fill(); c.fillStyle = "#1c1414"; c.font = `900 70px ${FONT}`; c.textAlign = "center"; c.fillText("THE BIG GAME", 320, 420); }), { x: -0.002, y: 0.266, w: 0.3, h: 0.224, z: 0.122, corner: 0.13, gain: 1.4 });
  tv.children[0].add(scr);
  g.add(tv);
  g.add(place(model("potted_plant_01", { collider: false, scale: 0.85 }), -2.4, 0, -1.2, 0.2));
  return g;
};

/** Inside the cereal-box viewer: a cardboard tube 0.26 w x 0.34 h x 0.5 long, the white card at the far end (-z). */
export const BOX = { w: 0.26, h: 0.34, l: 0.5 };
const cardboard = () => canvasTex(256, 256, (c) => {
  c.fillStyle = "#b8905e"; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(90,60,30,${0.05 + rnd(i) * 0.08})`; c.fillRect(0, rnd(i + 3) * 256, 256, 2 + rnd(i + 7) * 3); }
});
export const boxInside = () => {
  const g = new Group(), { w, h, l } = BOX;
  const C = M("snc-cardboard", () => toonMaterial({ map: cardboard(), color: "#ffffff", rough: 0.95 }));
  const k = new Kit();
  k.box(C, w, 0.01, l, 0, -0.005, -l / 2);
  k.box(C, w, 0.01, l, 0, h + 0.005, -l / 2);
  for (const s of [-1, 1]) k.box(C, 0.01, h, l, (s * (w + 0.01)) / 2, h / 2, -l / 2);
  k.box(C, w, h, 0.01, 0, h / 2, -l - 0.005);
  const b = k.build();
  b.userData.collider = "box";
  g.add(b);
  // the white card taped on the far end (the projection screen: Video.tsx draws the sun on `projection`)
  g.add(plane(w - 0.04, h - 0.06, litTex("card", () => canvasTex(64, 64, (c) => { c.fillStyle = "#d8d0c0"; c.fillRect(0, 0, 64, 64); })), V(0, h / 2, -l + 0.002)));
  const proj = new Mesh(new PlaneGeometry(0.14, 0.14), new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
  proj.material.color.setScalar(2.2);
  proj.position.set(0, h / 2 + 0.01, -l + 0.004);
  proj.name = "projection";
  g.add(proj);
  return g;
};
export { Object3D, Vector3, BoxGeometry, colMat, glassMat };
