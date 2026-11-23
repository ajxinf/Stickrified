import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial } from "three";
import { Kit, M } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { lightPatch, lightShafts } from "../../../kit/toon/glow";
import { MATS, V, boardTex, box, canvasTex, colMat, glassMat, litTex, place, plane, rnd, slab, unlit } from "./common";

/**
 * Three small interiors, each built round the origin and drawn alone:
 *   office      your rented "diamond dealer" office upstairs (lines 7-8, 28). Lighting idea: crisp late-morning sun
 *               through the back window (a warm patch on the floor and desk), cool sky fill, the desk lamp off.
 *               Materials: wood_floor, painted_plaster_wall (pale green), trim (white planks), the metal desk.
 *   hideout     the crew's rented flat (lines 6, 10-12, 20, 27). Lighting idea: night = one caged hanging lamp over
 *               the table (amber pool, half the room dark), the window cool blue; dawn = pale pink-blue window light
 *               with the lamp still on. Materials: dirty_carpet, grey_plaster (nicotine yellow), cork (hessian), wood.
 *   interview   the police room (line 30). Lighting idea: one hard lamp over the table, cold green-grey walls.
 *               Materials: painted_concrete, concrete floor, steel table.
 */
const room = (o: { x0: number; x1: number; z0: number; z1: number; h: number }, floor: ReturnType<typeof MATS.carpet>, wall: ReturnType<typeof MATS.carpet>, ceil: ReturnType<typeof MATS.carpet>) => {
  const g = new Group();
  g.add(slab(o.x0, o.x1, o.z0, o.z1, 0, floor));
  const k = new Kit();
  k.box(wall, o.x1 - o.x0, o.h, 0.12, (o.x0 + o.x1) / 2, o.h / 2, o.z0 - 0.06);
  k.box(wall, 0.12, o.h, o.z1 - o.z0, o.x0 - 0.06, o.h / 2, (o.z0 + o.z1) / 2);
  k.box(wall, 0.12, o.h, o.z1 - o.z0, o.x1 + 0.06, o.h / 2, (o.z0 + o.z1) / 2);
  k.box(ceil, o.x1 - o.x0 + 0.24, 0.1, o.z1 - o.z0, (o.x0 + o.x1) / 2, o.h + 0.05, (o.z0 + o.z1) / 2);
  k.box(MATS.trim(), o.x1 - o.x0, 0.1, 0.03, (o.x0 + o.x1) / 2, 0.05, o.z0 + 0.015);
  const w = k.build();
  w.userData.collider = "room";
  g.add(w);
  return g;
};
/** A rooftop view for a window: brick gables of the diamond district (day / night / dawn). */
const cityTex = (t: "day" | "night" | "dawn") => canvasTex(768, 512, (c) => {
  const sky = c.createLinearGradient(0, 0, 0, 512);
  if (t === "day") { sky.addColorStop(0, "#6aa8e8"); sky.addColorStop(1, "#d8e8f4"); }
  else if (t === "night") { sky.addColorStop(0, "#0c1430"); sky.addColorStop(1, "#2a3a6a"); }
  else { sky.addColorStop(0, "#7a8ac8"); sky.addColorStop(0.6, "#e8b0b8"); sky.addColorStop(1, "#ffd8b0"); }
  c.fillStyle = sky; c.fillRect(0, 0, 768, 512);
  let x = 0, i = 0;
  while (x < 768) {
    const w = 60 + rnd(i) * 70, h = 180 + rnd(i + 1) * 160, top = 512 - h;
    c.fillStyle = t === "day" ? ["#a85a44", "#8a4a3a", "#c87a5a", "#7a6a62"][i % 4] : t === "night" ? ["#1c1a2a", "#24202e", "#18182a"][i % 3] : ["#6a4a5a", "#5a4252", "#7a5262"][i % 3];
    c.beginPath(); c.moveTo(x, 512); c.lineTo(x, top + 30); for (let s = 0; s < 4; s++) { c.lineTo(x + (w * (s + 0.5)) / 4, top + (s % 2 ? 30 : 0) - 10); } c.lineTo(x + w, top + 30); c.lineTo(x + w, 512); c.fill(); // stepped gable
    for (let wy = top + 60; wy < 500; wy += 46) for (let wx = x + 10; wx < x + w - 16; wx += 24) {
      c.fillStyle = t === "night" ? (rnd(wx * 3 + wy) > 0.55 ? "#ffc070" : "#2a2a3a") : t === "dawn" ? (rnd(wx + wy) > 0.8 ? "#ffd8a0" : "#4a3a4a") : "#cfe0f0";
      c.fillRect(wx, wy, 12, 22);
    }
    x += w + 2; i++;
  }
});
const windowOn = (g: Group, at: ReturnType<typeof V>, ry: number, w: number, h: number, t: "day" | "night" | "dawn", name?: string) => {
  const view = plane(w, h, M(`adh-view-${t}`, () => new MeshBasicMaterial({ map: cityTex(t), toneMapped: false })), at, ry);
  if (name) view.name = name;
  g.add(view);
  const T = MATS.trim();
  const fr = new Group();
  fr.add(box(w + 0.12, 0.08, 0.1, T, V(0, h / 2 + 0.04, 0)), box(w + 0.12, 0.08, 0.1, T, V(0, -h / 2 - 0.04, 0)), box(0.08, h, 0.1, T, V(-w / 2 - 0.02, 0, 0)), box(0.08, h, 0.1, T, V(w / 2 + 0.02, 0, 0)), box(0.05, h, 0.06, T, V(0, 0, 0.01)));
  fr.add(box(w + 0.3, 0.05, 0.26, T, V(0, -h / 2 - 0.08, 0.1))); // sill
  fr.position.copy(at);
  fr.rotation.y = ry;
  g.add(fr);
};

// ================================================================== office
export const OFFICE = { x0: -2.4, x1: 2.4, z0: -2.1, z1: 2.6, h: 2.75 };
export const OFFICE_DESK = V(0.35, 0, -0.9);
export const OFFICE_CHAIR = V(0.35, 0, -1.75);
export const MIRROR = V(2.37, 1.5, 0.6); // on the right wall, facing -x
export const OFFICE_DOOR = V(-2.38, 0, 1.3); // the door on the left wall (hinge at its +z edge)
export const office = () => {
  const g = room(OFFICE, MATS.woodFloor(), MATS.wallPaint("#cfe0d0"), MATS.wallPaint("#f2efe8"));
  windowOn(g, V(0.35, 1.55, OFFICE.z0 + 0.01), 0, 1.7, 1.3, "day");
  g.add(lightPatch(V(0.3, 0.012, -0.2), V(0, 1, 0), 1.7, 1.4, "#ffd9a0", 0.5, [2, 2]));
  g.add(lightShafts(V(0.35, 1.7, OFFICE.z0 + 0.15), V(-0.1, -0.7, 1).normalize(), { length: 2.4, width: 1.2, color: "#ffe2b0", strength: 0.12, count: 5 }));
  g.add(place(model("metal_office_desk", { collider: "desk", scale: 0.8 }), OFFICE_DESK.x, 0, OFFICE_DESK.z, Math.PI));
  g.add(place(model("painted_wooden_chair_01", { collider: "chair" }), OFFICE_CHAIR.x, 0, OFFICE_CHAIR.z, 0));
  g.add(place(model("desk_lamp_arm_01", { collider: false, scale: 0.9 }), OFFICE_DESK.x + 0.65, 0.63, OFFICE_DESK.z - 0.15, -0.6));
  g.add(place(model("drawer_cabinet", { collider: "cabinet", scale: 0.85 }), -1.75, 0, OFFICE.z0 + 0.25, 0));
  g.add(place(model("potted_plant_01", { collider: "plant" }), 1.95, 0, OFFICE.z0 + 0.6, 0.4));
  g.add(place(model("wall_clock", { collider: false, scale: 1.1 }), -0.9, 2.2, OFFICE.z0 + 0.03, 0));
  const mirror = model("ornate_mirror_01", { collider: false, scale: 1.7 });
  mirror.position.copy(MIRROR); mirror.rotation.y = -Math.PI / 2;
  g.add(mirror);
  // desk top: a velvet tray of stones, scales, the nameplate
  const k = new Kit();
  k.box(colMat("#1a2a5a", { rough: 0.95 }), 0.34, 0.015, 0.24, OFFICE_DESK.x + 0.2, 0.638, OFFICE_DESK.z + 0.05);
  k.add(MATS.steel(), new CylinderGeometry(0.06, 0.07, 0.02, 16), OFFICE_DESK.x - 0.25, 0.64, OFFICE_DESK.z + 0.15);
  k.add(colMat("#c8a050", { spec: 0.8 }), new CylinderGeometry(0.008, 0.008, 0.16, 8), OFFICE_DESK.x - 0.25, 0.72, OFFICE_DESK.z + 0.15);
  k.box(colMat("#c8a050", { spec: 0.8 }), 0.16, 0.006, 0.006, OFFICE_DESK.x - 0.25, 0.8, OFFICE_DESK.z + 0.15);
  g.add(k.build());
  for (let i = 0; i < 7; i++) g.add(place(new Mesh(new BoxGeometry(0.018, 0.012, 0.018), M("adh-stone", () => colMat("#f0f8ff", { emissive: ["#cfe8ff", 0.8], spec: 1, rough: 0.05 }))), OFFICE_DESK.x + 0.1 + (i % 4) * 0.06, 0.652, OFFICE_DESK.z - 0.02 + Math.floor(i / 4) * 0.08));
  g.add(plane(0.36, 0.09, unlit("nameplate", () => boardTex(["DIAMOND TRADING"], "#1c1c22", "#e8c860", 1024, 256)), V(OFFICE_DESK.x, 0.7, OFFICE_DESK.z + 0.44), 0, -0.25));
  // a certificate and a world map on the walls; the door with its sign
  g.add(plane(0.44, 0.32, litTex("cert", () => boardTex(["CERTIFIED", "DEALER"], "#f2ead6", "#5a4a2a", 512, 360, (c) => { c.strokeStyle = "#c8a050"; c.lineWidth = 14; c.strokeRect(12, 12, 488, 336); })), V(-2.33, 1.7, -0.6), Math.PI / 2));
  g.add(plane(0.9, 0.6, litTex("map", () => canvasTex(512, 340, (c) => { c.fillStyle = "#9ac0d8"; c.fillRect(0, 0, 512, 340); c.fillStyle = "#d8c89a"; for (const [x, y, r] of [[120, 120, 60], [300, 160, 90], [420, 90, 40], [200, 260, 50]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0.4, 0, 7); c.fill(); } c.strokeStyle = "#5a4a3a"; c.lineWidth = 10; c.strokeRect(5, 5, 502, 330); })), V(1.2, 1.7, OFFICE.z0 + 0.02)));
  const door = new Group();
  door.name = "officeDoor";
  door.userData.door = 2.05;
  door.userData.opens = true;
  door.userData.out = V(-1, 0, 0);
  door.userData.doorway = OFFICE_DOOR.clone().add(V(0.1, 0, 0));
  door.position.set(OFFICE_DOOR.x + 0.02, 0, OFFICE_DOOR.z + 0.45);
  const leaf = box(0.05, 2.05, 0.9, MATS.darkWood(), V(0, 1.025, -0.45));
  door.add(leaf);
  door.add(plane(0.36, 0.1, unlit("doorplate", () => boardTex(["DIAMOND TRADING"], "#e8c860", "#1c1c22", 1024, 256)), V(0.03, 1.55, -0.45), Math.PI / 2));
  door.add(place(new Mesh(new CylinderGeometry(0.025, 0.025, 0.08, 10).rotateZ(Math.PI / 2), colMat("#c8a050", { spec: 0.8 })), 0.05, 1.0, -0.8));
  g.add(door);
  g.add(box(0.1, 2.15, 1.05, MATS.trim(), V(OFFICE_DOOR.x - 0.02, 1.07, OFFICE_DOOR.z))); // frame behind the leaf
  // the corridor outside the door (the cops come from it)
  g.add(slab(-4.4, OFFICE.x0, 0, 2.6, 0, MATS.carpet()));
  g.add(box(0.12, OFFICE.h, 2.6, MATS.wallPaint("#d8d0c0"), V(-4.45, OFFICE.h / 2, 1.3)));
  g.add(box(2.0, 0.1, 2.6, MATS.wallPaint("#f2efe8"), V(-3.4, OFFICE.h + 0.05, 1.3)));
  g.add(plane(0.6, 0.8, litTex("hallposter", () => boardTex(["FLOOR 3"], "#2a4a6a", "#ffffff", 300, 400)), V(-4.38, 1.6, 1.3), Math.PI / 2));
  return g;
};

// ================================================================== hideout
export const HIDE = { x0: -2.6, x1: 2.6, z0: -2.2, z1: 2.6, h: 2.6 };
export const BOARD = V(0.2, 1.55, HIDE.z0 + 0.02); // the crew board on the back wall
export const TABLE = V(0.1, 0, 0.3);
export const LAMP = V(0.1, 2.05, 0.3);
export const WIN = V(-2.58, 1.45, -0.6); // window on the left wall (faces +x)
export const SILL = V(-2.42, 0.86, -0.6);
export const CUPS = V(1.6, 0, -1.6); // the espresso-cup tower
export const HEAP = V(-1.55, 0, -1.25); // the trash heap at dawn
const crewCard = (name: string, col: string) => litTex(`card-${name}`, () => canvasTex(300, 360, (c) => {
  c.fillStyle = "#f6f2ea"; c.fillRect(0, 0, 300, 360);
  c.fillStyle = col; c.fillRect(20, 20, 260, 220);
  c.fillStyle = "#f7f4f0"; c.strokeStyle = "#1c1414"; c.lineWidth = 6; c.beginPath(); c.arc(150, 130, 70, 0, 7); c.fill(); c.stroke();
  c.fillStyle = "#1c1414"; for (const x of [124, 176]) { c.beginPath(); c.ellipse(x, 128, 7, 10, 0, 0, 7); c.fill(); }
  c.font = `900 ${name.length > 10 ? 30 : 40}px sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, 150, 300);
}), { rough: 0.9 });
export const CREW_NAMES = ["THE GENIUS", "THE MONSTER", "KING OF KEYS", "SPEEDY"] as const;
const missionTex = () => canvasTex(420, 520, (c) => {
  c.fillStyle = "#f8f4e8"; c.fillRect(0, 0, 420, 520);
  c.strokeStyle = "#a8c0e0"; c.lineWidth = 2; for (let y = 60; y < 520; y += 44) { c.beginPath(); c.moveTo(0, y); c.lineTo(420, y); c.stroke(); }
  c.fillStyle = "#1c1c4a"; c.font = "900 52px sans-serif"; c.textBaseline = "middle";
  ["MISSION 1", "MISSION 2", "FINALE"].forEach((t, i) => { c.fillText(t, 70, 130 + i * 140); });
  c.strokeStyle = "#2a8a4a"; c.lineWidth = 12;
  for (const i of [0, 1]) { const y = 130 + i * 140; c.beginPath(); c.moveTo(14, y); c.lineTo(32, y + 20); c.lineTo(58, y - 22); c.stroke(); }
  c.strokeStyle = "#c8342c"; c.lineWidth = 8; c.strokeRect(8, 390, 404, 70);
});
export const hideout = (t: "night" | "dawn") => {
  const g = room(HIDE, MATS.carpet(), MATS.plaster("#cdbb8a"), MATS.plaster("#d8ccaa"));
  windowOn(g, WIN, Math.PI / 2, 1.0, 1.15, t);
  g.add(place(model("caged_hanging_light", { collider: false, glow: ["glass", "#ffc070", 5] }), LAMP.x, HIDE.h - 0.75, LAMP.z, 0));
  g.add(place(new Mesh(new CylinderGeometry(0.008, 0.008, 0.4, 6), colMat("#2a2a2a")), LAMP.x, HIDE.h - 0.2, LAMP.z));
  g.add(place(model("dining_table", { collider: "table", scale: 0.65 }), TABLE.x, 0, TABLE.z, 0));
  g.add(place(model("dining_chair_02", { collider: "chair" }), TABLE.x - 1.05, 0, TABLE.z - 0.1, Math.PI / 2));
  g.add(place(model("dining_chair_02", { collider: "chair" }), TABLE.x + 1.1, 0, TABLE.z + 0.15, -Math.PI / 2));
  g.add(place(model("metal_stool_01", { collider: "stool" }), 1.9, 0, 1.4, 0.4));
  g.add(place(model("cardboard_box_01", { collider: "box" }), 2.15, 0, -1.7, 0.3));
  g.add(place(model("cardboard_box_01", { collider: false }), 2.1, 0.342, -1.75, 1.1));
  // the crew board: cork, four name cards, a floor plan of the vault, red string between pins, the mission page
  const k = new Kit();
  k.box(MATS.cork(), 2.4, 1.3, 0.04, BOARD.x, BOARD.y, BOARD.z + 0.02);
  k.box(MATS.darkWood(), 2.5, 0.06, 0.06, BOARD.x, BOARD.y + 0.68, BOARD.z + 0.03);
  k.box(MATS.darkWood(), 2.5, 0.06, 0.06, BOARD.x, BOARD.y - 0.68, BOARD.z + 0.03);
  g.add(k.build());
  const cols = ["#3a8ad8", "#5a6a4a", "#a8784a", "#e8a03a"];
  const cards = CREW_NAMES.map((n, i) => V(BOARD.x - 0.95 + i * 0.42, BOARD.y + 0.3, BOARD.z + 0.05));
  CREW_NAMES.forEach((n, i) => g.add(plane(0.3, 0.36, crewCard(n, cols[i]), cards[i], 0, 0, (rnd(i) - 0.5) * 0.12)));
  const plan = V(BOARD.x + 0.75, BOARD.y - 0.25, BOARD.z + 0.05);
  g.add(plane(0.6, 0.46, litTex("floorplan", () => canvasTex(480, 360, (c) => {
    c.fillStyle = "#e8eef6"; c.fillRect(0, 0, 480, 360); c.strokeStyle = "#2a4a8a"; c.lineWidth = 6;
    c.strokeRect(40, 40, 400, 120); c.beginPath(); c.arc(240, 220, 70, 0, 7); c.stroke(); c.strokeRect(60, 200, 90, 120);
    c.fillStyle = "#c8342c"; c.font = "900 30px sans-serif"; c.fillText("KLUIS -2", 300, 330); c.fillText("X", 225, 232);
  }), { rough: 0.9 }), plan, 0, 0, 0.05));
  const page = V(BOARD.x - 0.7, BOARD.y - 0.28, BOARD.z + 0.05);
  g.add(plane(0.34, 0.42, litTex("missions", missionTex, { rough: 0.9 }), page, 0, 0, -0.04));
  const red = colMat("#d8243a", { emissive: ["#d8243a", 0.2] });
  for (const [a, b] of [[cards[0], plan], [cards[1], plan], [cards[2], cards[3]], [cards[3], page], [cards[0], page]]) {
    const d = b.clone().sub(a), len = d.length();
    const s = new Mesh(new CylinderGeometry(0.004, 0.004, len, 4), red);
    s.position.copy(a.clone().add(b).multiplyScalar(0.5)).setZ(BOARD.z + 0.07);
    s.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2;
    g.add(s);
  }
  // the espresso-cup tower (line 6): one stacked column, grown by the scene (name "cups", scale y)
  const cups = new Group();
  cups.name = "cups";
  cups.position.copy(CUPS);
  const cupM = colMat("#f6f2ea", { spec: 0.5, rough: 0.3 }), sauce = colMat("#e8e2d6", { rough: 0.4 });
  for (let i = 0; i < 26; i++) {
    const y = i * 0.074, dx = (rnd(i) - 0.5) * 0.03;
    cups.add(place(new Mesh(new CylinderGeometry(0.075, 0.075, 0.012, 20), sauce), dx, y + 0.006, 0));
    cups.add(place(new Mesh(new CylinderGeometry(0.045, 0.035, 0.06, 16), cupM), dx, y + 0.042, 0));
  }
  cups.userData.collider = false;
  g.add(cups);
  g.add(box(0.5, 0.02, 0.5, MATS.darkWood(), CUPS.clone().setY(0.0)));
  // the trash heap (dawn only)
  if (t === "dawn") {
    const heap = new Group();
    heap.name = "heap";
    for (let i = 0; i < 9; i++) {
      const b = model("trashbag", { collider: i ? false : "trash", scale: 1.1 + rnd(i) * 0.35 });
      b.position.set(HEAP.x + (rnd(i + 1) - 0.5) * 1.3, i < 6 ? 0 : 0.42, HEAP.z + (rnd(i + 2) - 0.5) * 0.9);
      b.rotation.y = rnd(i + 3) * 6;
      heap.add(b);
    }
    g.add(heap);
    // the loot: one small velvet bag on the table
    g.add(place(new Mesh(new CylinderGeometry(0.06, 0.09, 0.14, 12), colMat("#3a2a6a", { rough: 0.95 })), TABLE.x + 0.15, 0.56, TABLE.z, 0));
  }
  g.add(place(new Mesh(new BoxGeometry(0.2, 0.06, 0.15), colMat("#e8d8b0", { rough: 0.9 })), TABLE.x - 0.25, 0.53, TABLE.z + 0.1, 0.3)); // a pizza box
  // the front wall (behind the two-shots): the flat's door, coat hooks with jackets, a city map
  g.add(box(0.95, 2.05, 0.06, MATS.darkWood(), V(-1.3, 1.025, HIDE.z1 - 0.03)));
  g.add(place(new Mesh(new CylinderGeometry(0.025, 0.025, 0.08, 10).rotateX(Math.PI / 2), colMat("#c8a050", { spec: 0.8 })), -0.95, 1.0, HIDE.z1 - 0.08));
  g.add(box(0.9, 0.05, 0.08, MATS.darkWood(), V(0.4, 1.65, HIDE.z1 - 0.05)));
  for (const [x, c] of [[0.15, "#2a3a5a"], [0.55, "#7a3a2a"]] as const) g.add(box(0.36, 0.7, 0.08, colMat(c, { rough: 0.9 }), V(x, 1.28, HIDE.z1 - 0.1)));
  g.add(plane(1.0, 0.7, litTex("citymap", () => canvasTex(512, 360, (c) => {
    c.fillStyle = "#efe6cf"; c.fillRect(0, 0, 512, 360); c.strokeStyle = "#5a8ac8"; c.lineWidth = 26; c.beginPath(); c.moveTo(0, 90); c.bezierCurveTo(160, 60, 260, 200, 512, 150); c.stroke();
    c.strokeStyle = "#c8a080"; c.lineWidth = 5; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(i * 60, 0); c.lineTo(i * 60 + 40, 360); c.stroke(); c.beginPath(); c.moveTo(0, i * 45); c.lineTo(512, i * 45 + 20); c.stroke(); }
    c.fillStyle = "#e0243a"; c.beginPath(); c.arc(300, 250, 16, 0, 7); c.fill(); c.fillStyle = "#1c1c22"; c.font = "900 36px sans-serif"; c.fillText("ANTWERPEN", 24, 340);
  }), { rough: 0.9 }), V(1.6, 1.55, HIDE.z1 - 0.02), Math.PI));
  return g;
};

// ================================================================== interview room
export const ROOMI = { x0: -2, x1: 2, z0: -1.8, z1: 2.2, h: 2.6 };
export const ITABLE = V(0, 0, 0.55);
export const interview = () => {
  const g = room(ROOMI, MATS.vaultFloor(), MATS.cellWall(), MATS.cellWall());
  g.add(box(1.3, 0.05, 0.8, MATS.steel(), V(ITABLE.x, 0.74, ITABLE.z)));
  for (const [dx, dz] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) g.add(place(new Mesh(new CylinderGeometry(0.02, 0.02, 0.74, 8), MATS.darkSteel()), ITABLE.x + dx, 0.37, ITABLE.z + dz));
  g.add(place(model("caged_hanging_light", { collider: false, glow: ["glass", "#f4f8ff", 6] }), 0, ROOMI.h - 0.7, ITABLE.z - 0.2, 0));
  // the bars of the holding cell behind you, and a mirror window
  for (let i = 0; i < 9; i++) g.add(place(new Mesh(new CylinderGeometry(0.018, 0.018, ROOMI.h, 8), MATS.darkSteel()), -1.6 + i * 0.16, ROOMI.h / 2, ROOMI.z0 + 0.35));
  g.add(box(1.5, 0.05, 0.05, MATS.darkSteel(), V(-0.96, 2.1, ROOMI.z0 + 0.35)));
  g.add(plane(1.1, 0.6, glassMat(), V(1.1, 1.5, ROOMI.z0 + 0.01)));
  g.add(plane(0.5, 0.2, unlit("politie", () => boardTex(["POLITIE"], "#1e3a7a", "#ffffff", 600, 240)), V(1.1, 2.15, ROOMI.z0 + 0.01)));
  g.add(place(model("painted_wooden_chair_01", { collider: "chair" }), 0, 0, -0.75, 0)); // front at -0.75 + 0.27: the card 12 cm in front
  return g;
};
