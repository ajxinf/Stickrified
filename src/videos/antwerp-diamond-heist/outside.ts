import { BoxGeometry, CylinderGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry } from "three";
import { Kit, M } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { grassTufts } from "../../../kit/toon/build/ground";
import { lightShafts } from "../../../kit/toon/glow";
import { toonMaterial } from "../../../kit/toon/shade";
import { MATS, V, boardTex, box, canvasTex, colMat, glassMat, glowMat, place, plane, rnd, slab, unlit } from "./common";

/**
 * Two exteriors.
 *   street   the diamond district at night (line 13): a cobbled street along x, brick and stone facades on the north
 *            side (z < 0), the diamond centre's grey stone front with its brass plate, a shop window full of
 *            Valentine's hearts. Lighting idea: navy photo night sky, cold moon key from behind the buildings, warm
 *            pools from three street lamps and the shop window on the wet cobbles. Materials: cobblestone_floor_04
 *            (wet), concrete_pavement, brick_wall_001 (two tints), granite_tile (the centre), grey_roof_tiles.
 *   forest   the woods by the E19 at dawn (lines 2, 21-26): leaf floor, firs and pines at three depths, ferns,
 *            stumps, a fallen trunk; the motorway on a bank behind with a guardrail and the blue E19 sign; the car
 *            on the verge. Lighting idea: misty morning photo sky, low cold sun from the east through the trees (soft
 *            shafts), heavy blue-grey haze from ~8 m. Materials: forest_leaves_02, asphalt_02, bark (models), steel.
 */
// ================================================================== street
export const STREET = { z0: -3, z1: 3, front: -5 };
export const CENTRE_DOOR = V(2, 0, STREET.front);
export const SHOP = V(-5.5, 1.3, STREET.front + 0.02);
export const LAMPS = [V(-8, 0, -3.6), V(1.2, 0, -3.6), V(9, 0, -3.6)];
const heartsTex = () => canvasTex(768, 512, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffe2c0"); gr.addColorStop(1, "#ffb08a");
  c.fillStyle = gr; c.fillRect(0, 0, 768, 512);
  const heart = (x: number, y: number, s: number, col: string) => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y + s * 0.9); c.bezierCurveTo(x - s * 1.3, y, x - s * 0.6, y - s, x, y - s * 0.35); c.bezierCurveTo(x + s * 0.6, y - s, x + s * 1.3, y, x, y + s * 0.9); c.fill(); };
  for (let i = 0; i < 26; i++) heart(30 + rnd(i) * 708, 40 + rnd(i + 7) * 300, 18 + rnd(i + 3) * 34, ["#e0243a", "#ff5a7a", "#c8142a", "#ff8aa0"][i % 4]);
  c.fillStyle = "#3a1a2a"; c.fillRect(0, 380, 768, 132);
  for (let i = 0; i < 9; i++) { c.fillStyle = "#f2e2c0"; c.fillRect(40 + i * 80, 400, 50, 40); c.fillStyle = "#e8c050"; c.beginPath(); c.arc(65 + i * 80, 470, 14, 0, 7); c.fill(); } // jewellery boxes, rings
  c.fillStyle = "#c8142a"; c.font = "900 64px sans-serif"; c.textAlign = "center"; c.fillText("VALENTIJN", 384, 360);
});
const facadeWindows = (g: Group, x0: number, x1: number, y0: number, rows: number, seed: number, litShare: number) => {
  const lit = glowMat("#ffc27a", 1.8), dark = glassMat();
  for (let r = 0; r < rows; r++) for (let x = x0 + 0.5; x < x1 - 0.6; x += 1.25) {
    const on = rnd(seed + r * 31 + Math.round(x * 7)) < litShare;
    g.add(plane(0.75, 1.15, on ? lit : dark, V(x + 0.35, y0 + r * 2.2, STREET.front + 0.02)));
    g.add(box(0.9, 0.08, 0.18, MATS.trim(), V(x + 0.35, y0 + r * 2.2 - 0.62, STREET.front + 0.08)));
  }
};
export const street = () => {
  const g = new Group();
  g.add(slab(-40, 40, STREET.z0, STREET.z1, 0, MATS.cobbles()));
  g.add(slab(-40, 40, STREET.front, STREET.z0, 0.12, MATS.walk()));
  g.add(slab(-40, 40, STREET.z1, STREET.z1 + 2.2, 0.12, MATS.walk()));
  g.add(box(80, 0.12, 0.16, MATS.granite(), V(0, 0.06, STREET.z0)));
  g.add(box(80, 0.12, 0.16, MATS.granite(), V(0, 0.06, STREET.z1)));
  // north facades: x -30..-1 brick, the centre x -1..6 stone, x 6..30 brick
  const k = new Kit();
  k.box(MATS.brick("#a86a5a"), 29, 11, 1, -15.5, 5.5, STREET.front - 0.5);
  k.box(MATS.granite(), 7, 13, 1, 2.5, 6.5, STREET.front - 0.5);
  k.box(MATS.brick("#8a6a62"), 24, 10, 1, 18, 5, STREET.front - 0.5);
  k.box(MATS.roof(), 29, 0.4, 1.4, -15.5, 11.2, STREET.front - 0.4);
  k.box(MATS.granite(), 7.2, 0.5, 1.3, 2.5, 13, STREET.front - 0.4);
  // south side (behind the lens in most shots): a low brick terrace so reverse angles see buildings, not void
  k.box(MATS.brick("#9a5a4a"), 70, 9, 1, 0, 4.5, STREET.z1 + 2.7);
  const walls = k.build();
  walls.userData.collider = "facades";
  g.add(walls);
  facadeWindows(g, -29, -1.5, 3.6, 3, 11, 0.45);
  facadeWindows(g, 6.2, 29, 3.6, 3, 23, 0.4);
  facadeWindows(g, -1, 6, 3.6, 4, 37, 0.15);
  // the centre's entrance: glass doors, steel canopy, the brass plate
  g.add(plane(1.8, 2.3, glowMat("#cfe0e8", 0.5), V(CENTRE_DOOR.x, 1.27, STREET.front + 0.02)));
  g.add(box(2.6, 0.12, 1.0, MATS.steel(), V(CENTRE_DOOR.x, 2.6, STREET.front + 0.45)));
  g.add(plane(0.9, 0.36, M("adh-brass", () => toonMaterial({ map: boardTex(["DIAMOND CENTRE", "ANTWERP"], "#c8a050", "#2a1e10", 900, 360), color: "#ffffff", spec: 0.9, gloss: 0.5, rough: 0.25 })), V(CENTRE_DOOR.x + 1.5, 1.6, STREET.front + 0.03)));
  // the jeweller's shop window full of hearts
  g.add(plane(3.0, 1.9, M("adh-hearts", () => new MeshBasicMaterial({ map: heartsTex(), toneMapped: false })), SHOP));
  g.add(box(3.3, 0.14, 0.2, MATS.darkWood(), V(SHOP.x, SHOP.y + 1.02, SHOP.z + 0.08)));
  g.add(box(3.3, 0.5, 0.2, MATS.darkWood(), V(SHOP.x, 0.37, SHOP.z + 0.08)));
  const heart = plane(0.5, 0.45, unlit("neonheart", () => canvasTex(128, 116, (c) => { c.strokeStyle = "#ff3a6a"; c.lineWidth = 12; c.beginPath(); c.moveTo(64, 104); c.bezierCurveTo(-10, 50, 20, 0, 64, 34); c.bezierCurveTo(108, 0, 138, 50, 64, 104); c.stroke(); }), true), V(SHOP.x + 1.8, SHOP.y + 1.45, SHOP.z + 0.03));
  heart.name = "neonHeart";
  g.add(heart);
  g.add(plane(2.4, 0.42, unlit("shopsign", () => boardTex(["JUWELEN"], "#1c1c22", "#e8c860", 1024, 180)), V(SHOP.x, SHOP.y + 1.45, SHOP.z + 0.02)));
  // a red awning over the next shop, bikes, bins, a bollard row
  g.add(place(new Mesh(new BoxGeometry(3.2, 0.06, 1.3), colMat("#9a2a2a", { rough: 0.8 })), -10.5, 2.55, STREET.front + 0.6, 0));
  for (const x of [-12, -2.5, 6.5, 12]) g.add(place(new Mesh(new CylinderGeometry(0.07, 0.08, 0.8, 10), MATS.darkSteel()), x, 0.52, STREET.z0 + 0.25));
  g.add(place(model("metal_trash_can", { collider: "bin" }), -3.8, 0.12, STREET.front + 0.8, 0.3));
  for (const p of LAMPS) g.add(place(model("street_lamp_01", { collider: "lamp", glow: ["glass", "#ffd08a", 5] }), p.x, 0.12, p.z, 0));
  return g;
};

// ================================================================== forest
export const ROAD = { z: -16, w: 7 }; // the E19 on a bank behind the trees
export const CAR = V(-2.6, 0, -5.2);
export const SANDWICH = V(0.35, 0.02, 1.2); // where the sandwich lies on the leaves
export const PILE = V(0.6, 0, 0.4); // the middle of the scattered trash
export const OLD_MAN = V(3.2, 0, 3.6);
const sign = () => {
  const g = new Group();
  g.add(place(new Mesh(new CylinderGeometry(0.06, 0.06, 4.6, 10), MATS.steel()), -1.4, 2.3, 0), place(new Mesh(new CylinderGeometry(0.06, 0.06, 4.6, 10), MATS.steel()), 1.4, 2.3, 0));
  g.add(plane(3.4, 1.8, unlit("e19", () => canvasTex(1020, 540, (c) => {
    c.fillStyle = "#1e4a9a"; c.fillRect(0, 0, 1020, 540); c.strokeStyle = "#ffffff"; c.lineWidth = 14; c.strokeRect(14, 14, 992, 512);
    c.fillStyle = "#2a8a4a"; c.fillRect(60, 60, 260, 150); c.fillStyle = "#ffffff"; c.font = "900 110px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("E19", 190, 140);
    c.textAlign = "left"; c.font = "900 92px sans-serif"; c.fillText("Antwerpen", 360, 140); c.fillText("Brussel", 360, 300);
    c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(860, 440); c.lineTo(960, 440); c.lineTo(910, 370); c.fill();
  })), V(0, 4.0, 0.08)));
  return g;
};
/** A small 2000s hatchback from primitives (no CC0 car model exists): body, cabin, glass, wheels, lights. */
export const car = () => {
  const g = new Group();
  const paint = M("adh-carpaint", () => toonMaterial({ color: "#4a5a72", spec: 0.8, gloss: 0.55, rough: 0.25 }));
  const k = new Kit();
  k.box(paint, 3.7, 0.62, 1.66, 0, 0.62, 0);
  k.box(paint, 2.1, 0.55, 1.5, -0.35, 1.2, 0);
  k.box(colMat("#2a2a30", { rough: 0.6 }), 3.75, 0.14, 1.7, 0, 0.32, 0);
  for (const [x, z] of [[-1.15, 0.8], [1.2, 0.8], [-1.15, -0.8], [1.2, -0.8]]) k.add(colMat("#1c1c20", { rough: 0.8 }), new CylinderGeometry(0.31, 0.31, 0.22, 20).rotateX(Math.PI / 2), x, 0.31, z);
  const body = k.build();
  body.userData.collider = "car";
  g.add(body);
  g.add(box(2.12, 0.42, 1.52, glassMat(), V(-0.35, 1.22, 0)));
  for (const z of [-0.6, 0.6]) {
    g.add(place(new Mesh(new SphereGeometry(0.09, 12, 8), glowMat("#fff4d8", 4)), 1.86, 0.72, z));
    g.add(place(new Mesh(new BoxGeometry(0.04, 0.12, 0.22), glowMat("#ff2a1a", 2.2)), -1.86, 0.78, z));
  }
  // the open hatch (line 21) and the bags inside it
  const hatch = new Group();
  hatch.name = "hatch";
  hatch.position.set(-1.38, 1.46, 0);
  hatch.add(box(0.06, 0.9, 1.5, paint, V(-0.4, -0.2, 0)));
  g.add(hatch);
  for (let i = 0; i < 4; i++) g.add(place(model("trashbag", { collider: false, scale: 1.0 }), -1.35, 0.6, -0.45 + i * 0.3, i));
  return g;
};
/** Litter scattered over the leaves round the pile (papers, wrappers, envelopes, bags): visible from line 22. */
const litter = () => {
  const g = new Group();
  g.name = "litter";
  const n = 220, o = new Object3D();
  const sheets = new InstancedMesh(new PlaneGeometry(0.2, 0.14), colMat("#f2ece2", { rough: 0.9 }), n);
  const wraps = new InstancedMesh(new PlaneGeometry(0.12, 0.09), colMat("#d8423a", { rough: 0.6, spec: 0.4 }), 60);
  const at = (i: number, s: number) => { const a = rnd(i + s) * 6.28, r = Math.pow(rnd(i * 3 + s), 0.7) * 5.5; return V(PILE.x + Math.cos(a) * r, 0.015 + rnd(i + s + 5) * 0.02, PILE.z + Math.sin(a) * r * 0.8); };
  for (let i = 0; i < n; i++) { o.position.copy(at(i, 0)); o.rotation.set(-Math.PI / 2 + (rnd(i) - 0.5) * 0.4, 0, rnd(i + 1) * 6); o.updateMatrix(); sheets.setMatrixAt(i, o.matrix); }
  for (let i = 0; i < 60; i++) { o.position.copy(at(i, 400)); o.rotation.set(-Math.PI / 2, 0, rnd(i + 2) * 6); o.updateMatrix(); wraps.setMatrixAt(i, o.matrix); }
  sheets.userData.ground = true; wraps.userData.ground = true;
  g.add(sheets, wraps);
  for (let i = 0; i < 7; i++) {
    const b = model("trashbag", { collider: false, scale: 1.0 + rnd(i) * 0.3 });
    const p = at(i * 11, 900);
    b.position.set(p.x, 0, p.z);
    b.rotation.set(0, rnd(i + 4) * 6, i % 2 ? 1.3 : 0);
    g.add(b);
  }
  // papers caught in the low branches
  for (let i = 0; i < 16; i++) g.add(plane(0.2, 0.14, colMat("#f2ece2", { rough: 0.9 }), V(PILE.x + (rnd(i + 50) - 0.5) * 8, 0.6 + rnd(i + 51) * 1.6, PILE.z - 2 - rnd(i + 52) * 3), rnd(i + 53) * 6, 0.3, rnd(i + 54)));
  return g;
};
export const forest = () => {
  const g = new Group();
  g.add(slab(-60, 60, -12, 40, 0, MATS.leaves()));
  // the motorway on its bank
  g.add(box(120, 1.2, 4, MATS.leaves(), V(0, 0.6, ROAD.z + ROAD.w / 2 + 2)));
  const road = slab(-60, 60, ROAD.z - ROAD.w / 2, ROAD.z + ROAD.w / 2, 1.2, MATS.asphalt());
  g.add(road);
  g.add(slab(-60, 60, -12.6, -12, 0.6, MATS.leaves()));
  const k = new Kit();
  for (let x = -40; x <= 40; x += 2) k.add(MATS.steel(), new CylinderGeometry(0.05, 0.05, 0.75, 8), x, 1.55, ROAD.z + ROAD.w / 2 + 0.3);
  k.box(MATS.steel(), 80, 0.3, 0.06, 0, 1.85, ROAD.z + ROAD.w / 2 + 0.35);
  const rail = k.build();
  rail.userData.collider = "guardrail";
  g.add(rail);
  const s = sign();
  s.position.set(5, 1.2, ROAD.z + ROAD.w / 2 + 1.2);
  g.add(s);
  // trees: firs and pines at three depths, never on the trash clearing or the lens lanes (x -3..4, z -6..8)
  const spots: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const x = (rnd(i * 2) - 0.5) * 60, z = -11 + rnd(i * 2 + 1) * 40;
    if (x > -6 && x < 7 && z > -9 && z < 9) continue;
    spots.push([x, z]);
  }
  spots.forEach(([x, z], i) => {
    const t = model(i % 3 ? "fir_tree_01" : "pine_tree_01", { collider: false, height: 13 + rnd(i + 70) * 8 });
    t.position.set(x, 0, z);
    t.rotation.y = rnd(i + 80) * 6;
    g.add(t);
  });
  // near trunks framing the clearing
  for (const [x, z, hgt] of [[-5.2, 4.5, 16], [6.4, -1.5, 18], [-6.5, -4.5, 15], [7.2, 6.5, 14]] as const) g.add(place(model("fir_tree_01", { collider: false, height: hgt }), x, 0, z, x));
  for (let i = 0; i < 26; i++) {
    const f = model("fern_02", { collider: false, scale: 0.6 + rnd(i + 90) * 0.5 });
    const a = rnd(i + 91) * 6.28, r = 3.2 + rnd(i + 92) * 6;
    f.position.set(PILE.x + Math.cos(a) * r, 0, PILE.z + Math.sin(a) * r);
    f.rotation.y = rnd(i + 93) * 6;
    g.add(f);
  }
  g.add(place(model("tree_stump_01", { collider: "stump" }), -2.4, 0, 2.6, 0.5));
  g.add(place(model("tree_stump_02", { collider: "stump 2" }), 4.6, 0, -0.4, 1.5));
  g.add(place(model("dead_tree_trunk_02", { collider: "log" }), 2.6, 0, -3.2, 0.3));
  g.add(...grassTufts(260, (_t, r) => { for (;;) { const p = V(-9 + r() * 18, 0, -10 + r() * 20); if (p.distanceTo(PILE) > 1.6) return p; } }, ["#5a6a3a", "#7a7a4a", "#9a8a5a"], 19));
  // the car on the verge, hatch toward the clearing
  const c = car();
  c.position.copy(CAR);
  c.rotation.y = 0.35;
  g.add(c);
  g.add(litter());
  // soft morning shafts through the canopy
  g.add(lightShafts(V(-6, 9, -6), V(0.45, -1, 0.5).normalize(), { length: 14, width: 5, color: "#fff2d8", strength: 0.16, count: 7, seed: 4 }));
  return g;
};
