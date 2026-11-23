import { BoxGeometry, CylinderGeometry, Group, Material, Mesh, MeshBasicMaterial, Object3D, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { grassTufts } from "../../../kit/toon/build/ground";
import { lightPatch } from "../../../kit/toon/glow";
import { toonMaterial } from "../../../kit/toon/shade";
import { FONT, MATS, V, boardTex, canvasTex, colMat, glassMat, glowMat, place, plane, rnd, slab, unlit } from "./common";

/**
 * sun-never-sets: the street (every outdoor line). One suburban street along x; the north row faces +z (your house,
 * the fence, Kyle's house with his basement stairwell, the corner mart), the south row faces -z behind the power poles.
 *   Lighting idea: the frozen sun hangs south-east (+z) 43 deg up, so every north-facing lens (looking at the houses)
 *   gets the faces lit from behind the camera's shoulder and the houses' fronts in light; looking south sees the sun
 *   over the south roofs (the sky shots). Practicals: Kyle's pink neon sign (always), the mart's spotlight on the
 *   darkness box, and the streetlights + porch lamps that click on in the eclipse (scene.tsx `lampsOn`).
 *   Materials: lawn (leafy_grass; sparse_grass where it burns), road (asphalt_02), sidewalks (concrete_pavement),
 *   driveways (concrete_floor_painted), walls (white_stucco / weathered_plank_siding / brick_wall_001), roofs (clay and
 *   grey tiles), trim (white_planks_clean), fence (weathered_planks), stairwell (concrete_block_wall), sundial (granite).
 */
export const ROAD = { z0: -3.5, z1: 3.5 };
export const WALK_N = -5.5, WALK_S = 5.5;
export const YOU_HOUSE = { x: -7, front: -11, w: 7.2, d: 7, h: 5.2, door: -8.2 };
export const KYLE_HOUSE = { x: 7.2, front: -11, w: 7, d: 7, h: 4.8, door: 6.0 };
/** Kyle's basement stairwell: down from the lawn (z1) to his black basement door under the house front (z0). */
export const STAIR = { x0: 8.7, x1: 10.0, z0: -10.9, z1: -8.5, depth: 1.6 };
export const STAIR_TOP = V((STAIR.x0 + STAIR.x1) / 2, 0, STAIR.z1 + 0.5);
export const NEON = V((STAIR.x0 + STAIR.x1) / 2, 2.45, KYLE_HOUSE.front + 0.07);
export const PRICE_BOARD = V(11.0, 0, -8.3);
export const FENCE_X = 0, FENCE_H = 1.25;
export const TALLY = V(-2.6, 0.62, -9.95); // the chalk tally on a lawn chalkboard behind the mower line
export const PORCH_POST = V(YOU_HOUSE.door + 1.05, 0, YOU_HOUSE.front + 1.35);
export const THERMO = PORCH_POST.clone().add(V(0, 1.45, 0.09)); // the dial on the porch post, facing +z
export const SUNDIAL = V(-11.2, 0, -7.2);
export const MART = { x: 21, front: -7.6, w: 7, h: 4.4 };
export const DISPLAY = V(MART.x, 1.05, MART.front - 0.6); // the darkness box on its velvet stand behind the glass
export const TAG_AT = DISPLAY.clone().add(V(0, -0.26, 0.36));
export const MOWER_START = V(-4.6, 0, -8.6);
export const MATTRESS_AT = V(-3.6, 0, 0.6); // in the middle of the road in front of your house (long side along x)
export const BEDTIME = V(-1.5, 0, 8.4); // the kicked-over sign on the south lawn
/** Lawn chairs the neighbours fall asleep in (line 29): three on the north lawns facing +z, two on the south facing -z. */
export const SLEEP_CHAIRS = [V(-6.4, 0, -6.6), V(-8.9, 0, -6.4), V(4.2, 0, -6.6), V(2.6, 0, 8.7), V(-0.6, 0, 8.9)];
export const POLES = [-18, -6, 6, 18, 30].map((x) => V(x, 0, WALK_S - 0.7));
export const WIRE_Y = 5.45;
export const OWL_AT = V(-3.4, 0, POLES[1].z + 0.1); // perched on the wire between poles 1 and 2
export const LAMPS = [V(-12.5, 0, WALK_N + 1.6), V(3.0, 0, WALK_N + 1.6), V(16.8, 0, WALK_N + 1.6), V(-4.0, 0, WALK_S - 1.4), V(10.5, 0, WALK_S - 1.4), V(24, 0, WALK_S - 1.4)];
export const LAMP_HEAD = (p: Vector3) => p.clone().add(V(0, 3.62, 0));
export const PORCH_LAMPS = [V(YOU_HOUSE.door - 0.85, 2.2, YOU_HOUSE.front + 0.12), V(KYLE_HOUSE.door + 0.85, 2.2, KYLE_HOUSE.front + 0.12)];
/** The queue for Kyle's basement: up his path from the stairwell top to the sidewalk, then east past the mart. */
export const QUEUE: Vector3[] = [];
for (let i = 0; i < 18; i++) {
  if (i < 3) QUEUE.push(V(9.4 + 0.55 * (i % 2), 0, -7.6 + i * 0.85));
  else QUEUE.push(V(10.6 + (i - 3) * 0.95, 0, WALK_N + 0.55 + (i % 2 ? 0.17 : -0.17)));
}

// ------------------------------------------------------------------ ground
const ground = () => {
  const g = new Group();
  g.add(slab(-90, 90, ROAD.z0, ROAD.z1, 0, MATS.road()));
  g.add(slab(-90, 90, WALK_N, ROAD.z0, 0.004, MATS.walk()));
  g.add(slab(-90, 90, ROAD.z1, WALK_S, 0.004, MATS.walk()));
  // the north lawn, cut round Kyle's stairwell
  g.add(slab(-90, STAIR.x0 - 0.2, -60, WALK_N, 0.002, MATS.lawn()));
  g.add(slab(STAIR.x1 + 0.2, 90, -60, WALK_N, 0.002, MATS.lawn()));
  g.add(slab(STAIR.x0 - 0.2, STAIR.x1 + 0.2, STAIR.z1 + 0.2, WALK_N, 0.002, MATS.lawn()));
  g.add(slab(-90, 90, WALK_S, 60, 0.002, MATS.lawn()));
  // sun-burnt patches on the lawns (sparse grass) and the driveways
  for (const [x0, x1, z0, z1] of [[-12, -9, -10.5, -6.2], [11.5, 14.5, -10.6, -6], [-9, -4, 6.2, 9.8], [12, 15, 6, 9.5]]) g.add(slab(x0, x1, z0, z1, 0.003, MATS.lawnDry()));
  g.add(slab(-2.4, -0.4, YOU_HOUSE.front, WALK_N, 0.006, MATS.drive()));
  g.add(slab(12.2, 14.2, KYLE_HOUSE.front, WALK_N, 0.006, MATS.drive()));
  g.add(slab(STAIR.x0 - 0.1, STAIR.x1 + 0.1, STAIR.z1, WALK_N, 0.007, MATS.walk())); // Kyle's front path
  g.add(slab(YOU_HOUSE.door - 0.6, YOU_HOUSE.door + 0.6, YOU_HOUSE.front + 1.6, WALK_N, 0.007, MATS.walk()));
  for (const z of [ROAD.z0, ROAD.z1]) g.add(place(new Mesh(new BoxGeometry(180, 0.12, 0.2), MATS.trim()), 0, 0.06, z));
  const dash = M("snc-dash", () => toonMaterial({ color: "#f2d65a" }));
  for (let x = -88; x < 90; x += 4) g.add(place(new Mesh(new BoxGeometry(2, 0.01, 0.12), dash), x, 0.006, 0));
  g.children.forEach((c) => (c.userData.ground = true));
  return g;
};

// ------------------------------------------------------------------ houses (north fronts face +z; south ones are turned)
type HouseOpts = { x: number; front: number; w: number; d: number; h: number; wall: Material; roof: Material; door: string; doorX?: number; seed: number; porch?: boolean; lamp?: boolean };
const house = (o: HouseOpts) => {
  const k = new Kit(), T = MATS.trim(), { x, w, d, h } = o, fz = o.front, cz = fz - d / 2;
  k.box(MAT.darkStone(), w + 0.2, 0.42, d + 0.2, x, 0.21, cz); // plinth
  k.box(o.wall, w, h - 0.42, d, x, 0.42 + (h - 0.42) / 2, cz);
  for (const sx of [-1, 1]) for (const sz of [0, -d]) k.box(T, 0.16, h - 0.42, 0.16, x + (sx * w) / 2, 0.42 + (h - 0.42) / 2, fz + sz);
  k.box(T, w + 0.14, 0.2, d + 0.14, x, h - 0.1, cz); // eave board
  k.add(o.roof, new CylinderGeometry(d * 0.66, d * 0.66, w + 0.8, 3), x, h + d * 0.33, cz, { rx: -Math.PI / 2, ry: Math.PI / 2, tile: true });
  k.box(MAT.color("#8a4a3a"), 0.5, 1.4, 0.5, x + w * 0.3, h + d * 0.5, cz - d * 0.15); // chimney
  const dx = (o.doorX ?? x) - x;
  const win = (u: number, y: number) => {
    k.box(T, 1.12, 1.32, 0.08, x + u, y, fz + 0.04);
    k.box(glassMat(), 0.92, 1.12, 0.06, x + u, y, fz + 0.06);
    k.box(T, 0.06, 1.12, 0.07, x + u, y, fz + 0.08);
    k.box(T, 1.4, 0.08, 0.22, x + u, y - 0.72, fz + 0.12);
  };
  for (const u of [-0.3, 0.3]) if (Math.abs(u * w - dx) > 1.3) win(u * w, 1.55);
  if (h > 4.6) for (const u of [-0.3, 0, 0.3]) win(u * w, 3.65);
  k.box(T, 1.22, 2.22, 0.1, x + dx, 0.42 + 1.06, fz + 0.04);
  k.box(MAT.color(o.door), 1.0, 2.0, 0.08, x + dx, 0.42 + 1.0, fz + 0.07);
  k.box(MAT.color("#e2c25a"), 0.06, 0.06, 0.06, x + dx + 0.38, 0.42 + 1.0, fz + 0.14);
  k.box(MATS.stone(), 1.5, 0.2, 0.7, x + dx, 0.1, fz + 0.35); // step
  if (o.porch) {
    // a stoop roof on two posts in front of the door
    for (const s of [-1, 1]) k.box(T, 0.14, 2.6, 0.14, x + dx + s * 1.05, 1.3, fz + 1.35);
    const pr = new BoxGeometry(2.6, 0.08, 1.7);
    pr.rotateX(0.16);
    k.add(o.roof, pr, x + dx, 2.68, fz + 0.75, { tile: true });
  }
  if (o.lamp) k.box(MAT.color("#2a2a30"), 0.16, 0.26, 0.12, x + dx - 0.85, 2.2, fz + 0.08);
  const g = k.build();
  g.userData.collider = `house ${o.seed}`;
  const out = new Group();
  out.add(g);
  // an AC condenser by the side wall (grille top, fan)
  const ac = acUnit(o.seed);
  ac.position.set(x + w / 2 + 0.55, 0, fz - 1.4);
  out.add(ac);
  return out;
};
/** AC condenser: a metal cube with a dark fan grille on top and slatted sides (the heat line's dressing). */
const acUnit = (seed: number) => {
  const k = new Kit();
  k.box(MATS.metal(), 0.75, 0.72, 0.75, 0, 0.38, 0);
  k.box(MAT.color("#2a2c30"), 0.62, 0.02, 0.62, 0, 0.745, 0);
  for (let i = 0; i < 6; i++) k.box(MAT.color("#6a7078"), 0.02, 0.5, 0.76, -0.3 + i * 0.12, 0.36, 0);
  k.box(MATS.stone(), 0.9, 0.06, 0.9, 0, 0.03, 0);
  const g = k.build();
  g.userData.collider = `ac ${seed}`;
  return g;
};

// ------------------------------------------------------------------ Kyle's basement "night club"
const neonTex = () => canvasTex(1024, 512, (g) => {
  g.fillStyle = "#1a0e1e"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#ff4fa8"; g.lineWidth = 14; g.strokeRect(24, 24, 976, 464);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "#ff4fa8"; g.shadowBlur = 30;
  g.fillStyle = "#ffd6ef"; g.font = `900 150px ${FONT}`; g.fillText("KYLE'S", 512, 150);
  g.fillStyle = "#8ff0ff"; g.shadowColor = "#3ad8ff"; g.font = `900 120px ${FONT}`; g.fillText("NIGHT CLUB", 512, 300);
  g.fillStyle = "#ffe066"; g.shadowColor = "#ffb020"; g.font = `900 80px ${FONT}`; g.fillText("$500 / HR", 512, 420);
});
const priceTex = () => canvasTex(512, 640, (g) => {
  g.fillStyle = "#1c1c22"; g.fillRect(0, 0, 512, 640);
  g.strokeStyle = "#f6f0e6"; g.lineWidth = 8; g.strokeRect(16, 16, 480, 608);
  g.fillStyle = "#f6f0e6"; g.textAlign = "center"; g.font = `900 64px ${FONT}`; g.fillText("REAL DARK", 256, 92);
  g.font = `800 50px ${FONT}`;
  [["1 HR", "$500"], ["NAP", "$250"], ["NIGHT", "$4,000"]].forEach(([a, b], i) => {
    g.textAlign = "left"; g.fillText(a, 44, 210 + i * 110);
    g.textAlign = "right"; g.fillStyle = "#ffd23f"; g.fillText(b, 468, 210 + i * 110); g.fillStyle = "#f6f0e6";
  });
  g.textAlign = "center"; g.fillStyle = "#ff6a5a"; g.font = `900 56px ${FONT}`; g.fillText("CASH ONLY", 256, 580);
});
const kyleStairs = () => {
  const k = new Kit(), C = MATS.block(), { x0, x1, z0, z1, depth } = STAIR, cx = (x0 + x1) / 2;
  // side walls + a low parapet round the hole, steps down toward the house, the black door at the bottom
  for (const x of [x0 - 0.1, x1 + 0.1]) k.box(C, 0.2, depth + 0.35, z1 - z0, x, (0.35 - depth) / 2, (z0 + z1) / 2);
  k.box(C, x1 - x0 + 0.4, 0.35, 0.2, cx, 0.175, z1 + 0.1);
  const n = 7, run = (z1 - z0 - 0.6) / n, bottom = -depth - 0.05;
  for (let i = 0; i < n; i++) {
    const top = (-depth * (i + 1)) / n;
    k.box(C, x1 - x0, top - bottom, run, cx, (top + bottom) / 2, z1 - (i + 0.5) * run);
  }
  k.box(C, x1 - x0, 0.05, 0.6, cx, -depth - 0.025, z0 + 0.3); // landing
  k.box(MAT.color("#0c0a10"), x1 - x0 - 0.1, 1.9, 0.05, cx, -depth + 0.95, z0 + 0.03); // the black door
  k.box(MATS.trim(), x1 - x0 + 0.1, 0.1, 0.1, cx, -depth + 1.95, z0 + 0.06);
  // a rail on the open side
  for (let i = 0; i < 4; i++) k.box(MAT.metal(), 0.04, 0.9, 0.04, x1 + 0.1, 0.8, z0 + 0.3 + i * 0.65);
  k.box(MAT.metal(), 0.05, 0.05, z1 - z0, x1 + 0.1, 1.25, (z0 + z1) / 2);
  const g = k.build();
  g.userData.collider = "stairwell";
  const out = new Group();
  out.add(g);
  out.add(plane(1.9, 0.95, unlit("neon", neonTex), NEON));
  // the price board on an easel by the path
  const e = new Kit();
  for (const s of [-1, 1]) e.add(MATS.darkWood(), new CylinderGeometry(0.025, 0.025, 1.7, 6).rotateX(0.12), PRICE_BOARD.x + s * 0.32, 0.82, PRICE_BOARD.z - 0.05);
  e.add(MATS.darkWood(), new CylinderGeometry(0.025, 0.025, 1.7, 6).rotateX(-0.35), PRICE_BOARD.x, 0.8, PRICE_BOARD.z - 0.3);
  const eg = e.build();
  eg.userData.collider = "price easel";
  out.add(eg);
  out.add(plane(0.7, 0.88, unlit("price", priceTex), PRICE_BOARD.clone().add(V(0, 1.15, 0.04)), 0, -0.12));
  out.add(lightPatch(V(cx, 0.012, z1 + 0.8), V(0, 1, 0), 1.6, 1.0, "#ff5ab0", 0.35, [1, 1], 0));
  return out;
};
/** The dark hole the stairwell drops into, as one ground-level mask (the stairs sit inside it). */
export const STAIR_HOLE = { x0: STAIR.x0, x1: STAIR.x1, z0: STAIR.z0, z1: STAIR.z1 };

// ------------------------------------------------------------------ the fence (with the tally), the yard
const tallyTex = () => canvasTex(512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(250,250,245,0.92)"; g.lineWidth = 9; g.lineCap = "round";
  const stroke = (x: number) => { g.beginPath(); g.moveTo(x, 70 + rnd(x) * 10); g.lineTo(x + 4, 190 - rnd(x + 1) * 10); g.stroke(); };
  for (let grp = 0; grp < 2; grp++) {
    for (let i = 0; i < 4; i++) stroke(40 + grp * 190 + i * 32);
    g.beginPath(); g.moveTo(26 + grp * 190, 160); g.lineTo(156 + grp * 190, 90); g.stroke();
  }
  stroke(420); // 11
  g.fillStyle = "rgba(250,250,245,0.92)"; g.font = `900 46px ${FONT}`; g.textAlign = "left"; g.fillText("MOWS", 300, 240);
});
const fence = () => {
  const k = new Kit(), F = MATS.fence();
  for (let z = -14; z < WALK_N - 0.2; z += 0.16) k.box(F, 0.04, FENCE_H + 0.04 * Math.sin(z * 9), 0.15, FENCE_X, (FENCE_H + 0.04 * Math.sin(z * 9)) / 2, z);
  for (const y of [0.3, 1.0]) k.box(F, 0.06, 0.1, 14 + WALK_N - 0.2, FENCE_X + 0.05, y, (-14 + WALK_N - 0.2) / 2);
  for (let z = -13.5; z < WALK_N; z += 2.2) k.box(MATS.darkWood(), 0.1, FENCE_H + 0.15, 0.1, FENCE_X + 0.04, (FENCE_H + 0.15) / 2, z);
  const g = k.build();
  g.userData.collider = "fence";
  const out = new Group();
  out.add(g);
  // a little A-frame chalkboard on the lawn: 11 strokes and MOWS
  const cb = new Kit();
  for (const s of [-1, 1]) cb.add(MATS.darkWood(), new CylinderGeometry(0.02, 0.02, 0.95, 6).rotateX(0.18), TALLY.x + s * 0.4, 0.45, TALLY.z - 0.06);
  cb.box(MAT.color("#24302a"), 0.86, 0.5, 0.03, TALLY.x, TALLY.y, TALLY.z - 0.03);
  const cbg = cb.build();
  cbg.userData.collider = "chalkboard";
  out.add(cbg);
  out.add(plane(0.8, 0.42, M("snc-tally", () => new MeshBasicMaterial({ map: tallyTex(), transparent: true, toneMapped: false, depthWrite: false })), TALLY.clone().add(V(0, 0, 0.0))));
  return out;
};
const sundial = () => {
  const k = new Kit(), S = MATS.stone();
  k.add(S, new CylinderGeometry(0.16, 0.22, 0.85, 12), SUNDIAL.x, 0.425, SUNDIAL.z);
  k.add(S, new CylinderGeometry(0.34, 0.3, 0.06, 20), SUNDIAL.x, 0.88, SUNDIAL.z);
  const gnomon = new BoxGeometry(0.012, 0.11, 0.2);
  gnomon.translate(0, 0.055, 0);
  gnomon.rotateX(-0.5);
  k.add(MAT.metal(), gnomon, SUNDIAL.x, 0.91, SUNDIAL.z);
  const g = k.build();
  g.userData.collider = "sundial";
  const out = new Group();
  out.add(g);
  // the dial face: roman hours round a brass ring
  const face = plane(0.6, 0.6, M("snc-dialface", () => toonMaterial({ map: canvasTex(512, 512, (c) => {
    c.fillStyle = "#c8a860"; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill();
    c.strokeStyle = "#6a5020"; c.lineWidth = 8; c.beginPath(); c.arc(256, 256, 236, 0, 7); c.stroke();
    c.fillStyle = "#3a2810"; c.font = `900 44px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle";
    ["VI", "VII", "VIII", "IX", "X", "XI", "XII", "I", "II", "III", "IV", "V", "VI"].forEach((t, i) => { const a = Math.PI + (i / 12) * Math.PI; c.fillText(t, 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); });
  }), color: "#ffffff", rough: 0.5, spec: 0.5 })), V(SUNDIAL.x, 0.915, SUNDIAL.z), 0, -Math.PI / 2);
  out.add(face);
  return out;
};
const bedtimeSign = () => {
  const o = new Group();
  const k = new Kit();
  k.add(MATS.darkWood(), new CylinderGeometry(0.03, 0.03, 1.1, 6).rotateZ(Math.PI / 2), BEDTIME.x + 0.2, 0.03, BEDTIME.z);
  const g = k.build();
  g.userData.collider = "bedtime sign";
  o.add(g);
  o.add(plane(0.7, 0.45, unlit("bedtime", () => boardTex(["BEDTIME?"], "#f6f0e6", "#2a3a6a", 512, 256)), BEDTIME.clone().add(V(-0.45, 0.04, 0)), 0.3, -Math.PI / 2 + 0.12));
  return o;
};

// ------------------------------------------------------------------ the corner mart and its darkness box
const martTex = () => boardTex(["CORNER MART"], "#2a5a9a", "#fff8ec", 1024, 200);
const tagTex = () => canvasTex(512, 256, (g) => {
  g.fillStyle = "#fbf6e8"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#c8342c"; g.lineWidth = 10; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = "#1c1414"; g.textAlign = "center"; g.font = `900 66px ${FONT}`; g.fillText("DARKNESS", 256, 100);
  g.fillStyle = "#c8342c"; g.font = `900 92px ${FONT}`; g.fillText("$10,000", 256, 200);
});
const mart = () => {
  const k = new Kit(), T = MATS.trim(), { x, front: fz, w, h } = MART, d = 6, cz = fz - d / 2;
  const B = MATS.brick("#c88a74");
  // walls round a shop window (x - 2.1 .. x + 1.7, y 0.55 .. 2.75) and a door at the right
  k.box(B, w, h, 0.3, x, h / 2 + 0, fz - d + 0.15);
  for (const s of [-1, 1]) k.box(B, 0.3, h, d, x + (s * w) / 2, h / 2, cz);
  k.box(B, w, h - 2.75, 0.3, x, 2.75 + (h - 2.75) / 2, fz - 0.15);
  k.box(B, w, 0.55, 0.3, x, 0.275, fz - 0.15);
  k.box(B, x - 2.1 - (x - w / 2), 2.2, 0.3, (x - w / 2 + x - 2.1) / 2, 1.65, fz - 0.15);
  k.box(B, x + w / 2 - (x + 2.9), 2.2, 0.3, (x + 2.9 + x + w / 2) / 2, 1.65, fz - 0.15);
  k.box(MAT.color("#2a4a6a"), 0.9, 2.1, 0.06, x + 2.4, 1.05, fz - 0.1); // door
  k.box(T, w + 0.2, 0.3, d + 0.2, x, h + 0.15, cz);
  k.box(T, 4.0, 0.1, 0.4, x - 0.2, 0.55, fz + 0.05); // sill
  k.box(MATS.floor(), w - 0.6, 0.05, d - 0.6, x, 0.02, cz); // shop floor
  // shelves of colourful goods behind the display
  for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) k.box(MAT.color(["#e84a3a", "#f2c23a", "#3a8ad8", "#4ab86a", "#f28ac0", "#f6f0ea", "#f28a3a"][(i + r * 3) % 7]), 0.32, 0.36, 0.25, x - 2.4 + i * 0.6, 0.6 + r * 0.7, fz - d + 0.6);
  for (let r = 0; r < 3; r++) k.box(MATS.darkWood(), 5.6, 0.04, 0.35, x, 0.4 + r * 0.7, fz - d + 0.6);
  // the velvet stand with the black box on it
  k.add(MAT.color("#7a1a2a"), new CylinderGeometry(0.22, 0.3, DISPLAY.y - 0.05, 18), DISPLAY.x, (DISPLAY.y - 0.05) / 2, DISPLAY.z);
  k.add(MAT.color("#9a2238"), new CylinderGeometry(0.32, 0.32, 0.06, 24), DISPLAY.x, DISPLAY.y - 0.03, DISPLAY.z);
  k.box(MAT.color("#050508"), 0.3, 0.3, 0.3, DISPLAY.x, DISPLAY.y + 0.15, DISPLAY.z);
  const g = k.build();
  g.userData.collider = "mart";
  const out = new Group();
  out.add(g);
  const glass = new Mesh(new BoxGeometry(4.0, 2.2, 0.02), M("snc-shopglass", () => new MeshBasicMaterial({ color: "#d8ecf6", opacity: 0.1, transparent: true, depthWrite: false })));
  glass.position.set(x - 0.2, 1.65, fz - 0.12);
  out.add(glass);
  out.add(plane(4.2, 0.8, unlit("mart", martTex), V(x - 0.2, 3.3, fz + 0.01)));
  out.add(plane(0.36, 0.18, unlit("tag", tagTex), TAG_AT, 0, -0.18, 0.05)); // leaning on the stand's front, clear of it
  // the spotlight cone on the box (a soft painted pool on the stand + the box's rim)
  out.add(lightPatch(V(DISPLAY.x, DISPLAY.y + 0.005, DISPLAY.z), V(0, 1, 0), 0.7, 0.7, "#fff2d0", 0.7, [1, 1], 0));
  return out;
};

// ------------------------------------------------------------------ dressing
const tree = (x: number, z: number, s: number, ry: number, id = "island_tree_01") => {
  const g = new Group();
  g.add(place(model(id, { collider: false, scale: s }), x, 0, z, ry));
  const t = new Mesh(new BoxGeometry(0.35 * s, 2.2, 0.35 * s), new MeshBasicMaterial({ visible: false }));
  t.position.set(x, 1.1, z);
  t.userData.collider = "tree";
  g.add(t);
  return g;
};
/** Sagging wires between pole tops (three lines). */
const wires = () => {
  const k = new Kit(), mat = MAT.color("#1c1c20");
  for (let p = 0; p + 1 < POLES.length; p++) for (const dz of [-0.3, 0, 0.3]) {
    const a = POLES[p].clone().setY(WIRE_Y).add(V(0, 0, dz)), b = POLES[p + 1].clone().setY(WIRE_Y).add(V(0, 0, dz));
    const n = 12;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n, sag = (u: number) => -0.45 * Math.sin(Math.PI * u);
      const p0 = a.clone().lerp(b, u0).add(V(0, sag(u0), 0)), p1 = a.clone().lerp(b, u1).add(V(0, sag(u1), 0));
      const len = p0.distanceTo(p1), mid = p0.clone().add(p1).multiplyScalar(0.5);
      const geo = new CylinderGeometry(0.012, 0.012, len, 4).rotateZ(Math.PI / 2);
      k.add(mat, geo, mid.x, mid.y, mid.z, { rz: Math.atan2(p1.y - p0.y, p1.x - p0.x) });
    }
  }
  return k.build();
};
/** Wire height between poles 1 and 2 at x (for the owl). */
export const wireY = (x: number) => { const a = POLES[1].x, b = POLES[2].x, u = (x - a) / (b - a); return WIRE_Y - 0.45 * Math.sin(Math.PI * u); };
/** Where every lamp of the street is (the eclipse turns them on). */
export const STREET_LAMP_HEADS = LAMPS.map(LAMP_HEAD);
const lampHeads = () => {
  const g = new Group();
  for (const h of STREET_LAMP_HEADS) { const m = new Mesh(new CylinderGeometry(0.16, 0.22, 0.16, 12), glowMat("#ffd08a", 3)); m.position.copy(h); m.name = "lampGlass"; g.add(m); }
  for (const p of PORCH_LAMPS) { const m = new Mesh(new BoxGeometry(0.12, 0.18, 0.06), glowMat("#ffc27a", 3)); m.position.copy(p).add(V(0, 0, 0.06)); m.name = "lampGlass"; g.add(m); }
  g.name = "lampHeads";
  return g;
};

/** The whole street. */
// ------------------------------------------------------------------ depth + life (user 2026-11-23: "empty background", "does not feel alive")
/** Mailbox on a post at the end of a front path. */
const mailbox = (x: number, z: number, col: string, ry = 0) => {
  const k = new Kit();
  k.box(MATS.darkWood(), 0.08, 1.05, 0.08, 0, 0.52, 0);
  k.add(colMat(col, { spec: 0.5, gloss: 0.4, rough: 0.35 }), new CylinderGeometry(0.12, 0.12, 0.42, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), 0, 1.1, 0);
  k.box(colMat(col), 0.24, 0.12, 0.42, 0, 1.06, 0);
  k.box(colMat("#d8342c"), 0.02, 0.16, 0.04, 0.13, 1.2, 0.1); // the flag
  const g = k.build();
  g.userData.collider = "mailbox";
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  return g;
};
/** Basketball hoop on Kyle's drive. */
const hoop = (x: number, z: number) => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.05, 0.06, 3.0, 8), x, 1.5, z);
  k.box(colMat("#f6f2ea"), 1.1, 0.7, 0.04, x, 3.05, z + 0.25);
  k.box(colMat("#d8342c"), 0.45, 0.3, 0.045, x, 2.95, z + 0.25);
  k.add(colMat("#f28a2a"), new TorusGeometry(0.22, 0.015, 6, 20).rotateX(Math.PI / 2), x, 2.78, z + 0.5);
  const g = k.build();
  g.userData.collider = "hoop";
  return g;
};
/** A blue paddling pool with an inflatable ring on the south lawn. */
export const POOL = V(9.2, 0, 7.6);
const paddlingPool = () => {
  const k = new Kit();
  k.add(colMat("#3aa8e8", { spec: 0.5, gloss: 0.4 }), new TorusGeometry(0.95, 0.16, 10, 28).rotateX(Math.PI / 2), POOL.x, 0.16, POOL.z);
  k.add(colMat("#7ad0f2", { gloss: 0.9, rough: 0.05, spec: 0.9 }), new CylinderGeometry(0.95, 0.95, 0.04, 28), POOL.x, 0.2, POOL.z);
  k.add(colMat("#ff8ac8"), new TorusGeometry(0.22, 0.08, 8, 16).rotateX(Math.PI / 2), POOL.x + 0.3, 0.25, POOL.z - 0.2);
  const g = k.build();
  g.userData.collider = "paddling pool";
  return g;
};
/** Rows of houses behind both street rows, a treeline and low hills: the town goes on past the street. */
const backdrop = (g: Group) => {
  const cols = ["#f2d58a", "#9ad0c0", "#e8a87c", "#c8a0d8", "#a8c8f0", "#f2ece2", "#f28a8a", "#b8d8a0"];
  for (let i = 0; i < 11; i++) {
    const x = -44 + i * 8.6 + (rnd(i) - 0.5) * 1.5, c = cols[i % cols.length];
    g.add(house({ x, front: -21 - rnd(i + 3) * 1.5, w: 6.2, d: 6, h: 4.2 + rnd(i + 5) * 1.2, wall: i % 2 ? MATS.stucco(c) : MATS.siding(c), roof: i % 3 ? MATS.roofRed() : MATS.roofGrey(), door: "#3a6ab8", seed: 40 + i }));
    const h = house({ x: 0, front: 0, w: 6.2, d: 6, h: 4.2 + rnd(i + 9) * 1.2, wall: i % 2 ? MATS.siding(cols[(i + 3) % 8]) : MATS.stucco(cols[(i + 3) % 8]), roof: i % 3 ? MATS.roofGrey() : MATS.roofRed(), door: "#c8582c", seed: 60 + i });
    h.rotation.y = Math.PI;
    h.position.set(-40 + i * 8.6 + (rnd(i + 7) - 0.5) * 1.5, 0, 22.5 + rnd(i + 11) * 1.5);
    g.add(h);
  }
  for (let i = 0; i < 22; i++) {
    const x = -50 + i * 4.8 + rnd(i + 20) * 2;
    g.add(place(model(i % 3 ? "island_tree_01" : "island_tree_02", { collider: false, scale: 1.2 + rnd(i + 30) * 0.6 }), x, 0, -31 - rnd(i + 40) * 4, rnd(i) * 6));
    g.add(place(model(i % 3 ? "island_tree_02" : "island_tree_01", { collider: false, scale: 1.2 + rnd(i + 50) * 0.6 }), x + 2, 0, 33 + rnd(i + 60) * 4, rnd(i + 1) * 6));
  }
  for (const [x, z, sx, sy] of [[-60, -110, 70, 16], [30, -120, 90, 22], [-40, 115, 80, 18], [50, 125, 90, 24]]) {
    const hill = new Mesh(new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MATS.lawn());
    hill.scale.set(sx, sy, 30);
    hill.position.set(x, -1, z);
    g.add(hill);
  }
};
const dressing = (g: Group) => {
  g.add(mailbox(YOU_HOUSE.door + 1.0, WALK_N - 0.35, "#3a6ab8"), mailbox(KYLE_HOUSE.door - 1.1, WALK_N - 0.35, "#2a2a30"), mailbox(-21, WALK_N - 0.35, "#f2c23a"));
  for (const x of [-15, -4.5, 6.5, 17.5, 29]) g.add(mailbox(x + 2.2, WALK_S + 0.35, ["#d8342c", "#3a8a4a", "#f2ece2", "#3a6ab8", "#c8582c"][Math.abs(Math.round(x)) % 5], Math.PI));
  g.add(hoop(14.6, -9.6));
  g.add(paddlingPool());
  // parked cars under covers in driveways, flower beds along the fronts, hedges
  g.add(place(model("covered_car", { collider: "car" }), 13.2, 0, -8.2, 0));
  g.add(place(model("covered_car", { collider: "car", tint: "#c8d8f0" }), -10.8, 0, 8.4, 0.05));
  g.add(place(model("covered_car", { collider: "car", tint: "#f0d8c8" }), 21.2, 0, 8.6, -0.04));
  const flowers = ["flower_gazania", "flower_ursinia"];
  for (let i = 0; i < 26; i++) {
    const side = i % 2, x = -24 + (i >> 1) * 4.1 + rnd(i) * 1.2, z = side ? 11.0 - 0.4 : -10.75;
    if (Math.abs(x - YOU_HOUSE.door) < 1.2 || Math.abs(x - KYLE_HOUSE.door) < 1.2 || (x > STAIR.x0 - 0.8 && x < STAIR.x1 + 0.8 && !side) || (x > 17 && x < 25 && !side)) continue;
    g.add(place(model(flowers[i % 2], { collider: false, scale: 0.6 + rnd(i + 3) * 0.3 }), x, 0, z, rnd(i) * 6));
  }
  for (const [x, z] of [[-14, 10.4], [-2.6, 10.4], [8.4, 10.4], [19.6, 10.4], [-17, -10.6], [4.6, -10.4]] as const) g.add(place(model("shrub_01", { collider: false, scale: 0.8 }), x, 0, z, rnd(x) * 6));
  g.add(place(model("garden_hose_wall_mounted_01", { collider: false }), YOU_HOUSE.x - YOU_HOUSE.w / 2 + 0.6, 0.9, YOU_HOUSE.front + 0.02, 0));
};

export const street = () => {
  const g = new Group();
  g.add(ground());
  g.add(house({ ...YOU_HOUSE, wall: MATS.stucco("#f2d58a"), roof: MATS.roofGrey(), door: "#3a6ab8", doorX: YOU_HOUSE.door, seed: 1, porch: true, lamp: true }));
  g.add(house({ ...KYLE_HOUSE, wall: MATS.siding("#8ab8d8"), roof: MATS.roofRed(), door: "#2a2a30", doorX: KYLE_HOUSE.door, seed: 2, lamp: true }));
  g.add(kyleStairs(), fence(), sundial(), bedtimeSign(), mart());
  g.add(house({ x: -19, front: -11, w: 6.4, d: 7, h: 4.4, wall: MATS.siding("#c8a0d8"), roof: MATS.roofRed(), door: "#f2c23a", seed: 3 }));
  g.add(house({ x: 33, front: -11, w: 6.4, d: 7, h: 5.0, wall: MATS.stucco("#e8a87c"), roof: MATS.roofGrey(), door: "#2f8a6a", seed: 4 }));
  // the south row faces the street (-z): built facing +z at the origin, turned
  [[-15, "#9ad0c0", 1], [-4.5, "#f2ece2", 0], [6.5, "#e8a87c", 1], [17.5, "#a8c8f0", 0], [29, "#f2d58a", 1]].forEach(([x, c, s], i) => {
    const h = house({ x: 0, front: 0, w: 6.6, d: 7, h: 4.4 + (i % 2) * 0.8, wall: s ? MATS.stucco(c as string) : MATS.siding(c as string), roof: i % 2 ? MATS.roofGrey() : MATS.roofRed(), door: ["#d8423a", "#3a6ab8", "#2f8a6a", "#c8582c", "#7a4ab8"][i], seed: 10 + i, lamp: true });
    h.rotation.y = Math.PI;
    h.position.set(x as number, 0, 11.5);
    g.add(h);
  });
  // trees, shrubs, a gnome, bins, a hydrant
  for (const [x, z, s] of [[-14.5, -8, 0.9], [15.5, -8.5, 0.85], [-14.6, 9.8, 0.9], [1.5, 8.8, 0.8], [12.5, 8.5, 0.95], [24, 8.6, 0.85]] as const) g.add(tree(x, z, s, x));
  for (const [x, z] of [[-10.2, -10.6], [-5.5, -10.6], [4.2, -10.6], [10.6, -10.6]] as const) g.add(place(model("shrub_01", { collider: false, scale: 0.9 }), x, 0, z, 0));
  g.add(place(model("shrub_03", { collider: false }), -12.5, 0, -10.4, 0.2));
  g.add(place(model("garden_gnome", { collider: "gnome", height: 0.42 }), -10.4, 0, -7.9, 0.5));
  g.add(place(model("garden_sprinkler_01", { collider: "sprinkler" }), -5.0, 0, -7.6, 0));
  g.add(place(model("metal_trash_can", { part: "metal_trash_can_rust", collider: "bin" }), -11.8, 0, WALK_N - 0.4, 0));
  g.add(place(model("fire_hydrant", { part: "fire_hydrant", collider: "hydrant" }), 3.2, 0, WALK_S - 0.35, 0.3));
  g.add(place(model("potted_plant_02", { collider: "planter" }), YOU_HOUSE.door + 1.6, 0, YOU_HOUSE.front + 0.8, 0.4));
  for (const p of POLES) g.add(place(model("modular_electricity_poles", { part: "preset_01", collider: "pole" }), p.x, 0, p.z, 0));
  g.add(wires());
  for (const p of LAMPS) g.add(place(model("street_lamp_01", { collider: "street lamp" }), p.x, 0, p.z, p.z > 0 ? 0 : Math.PI));
  g.add(lampHeads());
  SLEEP_CHAIRS.forEach((p, i) => g.add(place(model("plastic_monobloc_chair_01", { collider: "lawn chair" }), p.x, 0, p.z, i < 3 ? 0 : Math.PI)));
  backdrop(g);
  dressing(g);
  // the porch thermometer's backing plate (the dial is a story prop: props.ts)
  g.add(place(new Mesh(new BoxGeometry(0.3, 0.3, 0.02), MATS.trim()), THERMO.x, THERMO.y, THERMO.z - 0.07));
  g.add(...grassTufts(900, (_t, r) => {
    const k = r();
    if (k < 0.4) return V(-30 + r() * 60, 0, WALK_N - 0.1 - r() * 0.6);
    if (k < 0.7) return V(-30 + r() * 60, 0, WALK_S + 0.1 + r() * 0.6);
    return V(-13 + r() * 12, 0, -10.6 + r() * 4.8);
  }, ["#4e6a34", "#6e8a44", "#b8b06a"], 31, 0.26));
  return g;
};
export { canvasTex, colMat, glowMat, rnd };
export type { Object3D };
