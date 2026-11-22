import { curvedScreen } from "../../../kit/toon/build/screen";
import { BoxGeometry, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, SphereGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { photo } from "../../../kit/toon/build/photo";
import { grassTufts } from "../../../kit/toon/build/ground";
import { toonMaterial } from "../../../kit/toon/shade";
import { lightPatch, lightShafts } from "../../../kit/toon/glow";

/**
 * promise-flowers (episode 5, "In this world..."): the sets.
 *   town  one small town around a park (every outdoor line). The street runs along x; the houses face the park (+z).
 *         Grandma's house + porch (x -9), your house + picket fence (x -17), the corner store (x -1), two more houses,
 *         and a covered shopping arcade (the "mall", x 22-52). Across the street: the park lawn, a herringbone plaza
 *         with a bench (lines 1-3, 9), Grandma's three beehives under an apple tree (x -9, z 5), and the stage (z 19)
 *         where Derek campaigns and the debate is held (folding chairs only on debate day).
 *     Lighting idea (day): the photo sky's sun turned to come from +x (east) 48 deg up, so every main lens (looking
 *     south at the houses, north at the stage) gets raking side light; sky fill from the photo; no practicals by day
 *     except the arcade's shop signs. Golden (last line): the late-afternoon photo sky low in the west.
 *     Materials: lawn (leafy_grass), road (asphalt_02), sidewalks (concrete_pavement), plaza + paths
 *     (herringbone_pavement), house walls (white_stucco / weathered_plank_siding tinted), store (brick_wall_001), roofs
 *     (clay / grey roof tiles), trim + hives (white_planks_clean), stage deck (weathered_planks).
 *   home  your family's kitchen + living room (lines 5, 8, 18). Lighting idea: day = window light from the back-right
 *         window + the soft ceiling lamp; night = the floor lamp by the sofa and the TV's blue screen as the two pools,
 *         half the room in shadow. Materials: floor (laminate_floor), walls + ceiling (grey_plaster), backsplash
 *         (floor_tiles_06), cabinets (white_planks_clean), worktop + shelf (weathered_planks dark).
 */
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};
const FONT = '"Nunito", "Arial Rounded MT Bold", "Arial Black", sans-serif';
/** Unlit plane (signs, boards, screens: readable from any side light). */
const unlit = (key: string, map: () => CanvasTexture, transparent = false) => M(key, () => new MeshBasicMaterial({ map: map(), transparent, side: DoubleSide, toneMapped: false }));
const plane = (w: number, h: number, mat: Material, pos: Vector3, ry = 0, rx = 0) => {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  m.rotation.set(rx, ry, 0);
  return m;
};
const place = (o: Object3D, x: number, y: number, z: number, ry = 0) => {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
};
/** Text board: background, wobble-free bold lines centred. */
const boardTex = (lines: string[], bg: string, fg: string, w = 1024, h = 512, accent?: (g: CanvasRenderingContext2D) => void) =>
  canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    accent?.(g);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    // fit: the widest line inside 88 % of the board (QA: text drawn past the canvas edge reads cut)
    let fs = h / (lines.length + 0.5);
    g.font = `900 ${fs}px ${FONT}`;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > w * 0.88) { fs *= (w * 0.88) / widest; g.font = `900 ${fs}px ${FONT}`; }
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.08));
  });

// ------------------------------------------------------------------ materials (one photo texture per surface)
const PM = (name: string, tile: number, color: string, o: Parameters<typeof toonMaterial>[0] = {}) => () =>
  M(`pf-${name}-${color}-${tile}`, () => toonMaterial({ map: photo(name), repeat: [1 / tile, 1 / tile], color, mottle: 0.12, ...o }));
export const MATS = {
  lawn: PM("leafy_grass", 3, "#a8c088", { mottle: 0.2, rough: 0.9 }),
  road: PM("asphalt_02", 4, "#8c8a90", { rough: 0.85 }),
  walk: PM("concrete_pavement", 2.5, "#d6d0c6", { rough: 0.8 }),
  plaza: PM("herringbone_pavement", 2.5, "#c9a890", { rough: 0.75 }),
  stucco: (c: string) => PM("white_stucco", 2.5, c, { rough: 0.85 })(),
  siding: (c: string) => PM("weathered_plank_siding", 2, c, { rough: 0.8 })(),
  brick: PM("brick_wall_001", 2.5, "#c88a74", { rough: 0.8 }),
  trim: PM("white_planks_clean", 1.2, "#f2eee6", { rough: 0.6 }),
  roofRed: PM("clay_roof_tiles", 1.6, "#c98a6e", { rough: 0.7 }),
  roofGrey: PM("grey_roof_tiles", 1.6, "#9aa0ac", { rough: 0.7 }),
  deck: PM("weathered_planks", 1.6, "#b89a7c", { rough: 0.75 }),
  darkWood: PM("weathered_planks", 1.2, "#6a4c3a", { rough: 0.7 }),
  hive: PM("white_planks_clean", 0.8, "#fbf6ea", { rough: 0.6 }),
  floor: PM("laminate_floor", 2, "#c8a888", { rough: 0.55, gloss: 0.15 }),
  wall: PM("grey_plaster", 2.5, "#e8dccc", { rough: 0.9 }),
  tiles: PM("floor_tiles_06", 0.9, "#e4ecee", { rough: 0.35, gloss: 0.2 }),
  cabinet: PM("white_planks_clean", 1.2, "#9cc4be", { rough: 0.6 }),
};

// ================================================================== town layout
export const STREET = { z0: -5, z1: 0, walkHouse: -8, walkPark: 1.6 };
export const PLAZA = V(2, 0, 8);
export const BENCH = V(2.4, 0, 5.0); // faces +z (into the plaza)
export const HIVES = [V(-9.6, 0, 4.6), V(-8.4, 0, 4.9), V(-10.8, 0, 5.3)];
export const APPLE = V(-9.4, 0, 6.6);
export const GRANDMA_HOUSE = { x: -9, front: -8.6 };
/** The door (and porch steps) sit off-centre by the house seed (house() `dx`). */
export const GRANDMA_DOOR_X = -9 + (rnd(1) - 0.5) * 0.8;
export const PORCH = { x: -9, z0: -8.6, z1: -7.0, y: 0.42 };
export const YOUR_HOUSE = { x: -17.5, front: -8.6 };
export const STORE = { x: 2.6, front: -8.6 }; // centred behind the plaza bench (its name board stays whole in the bench shots)
export const STAGE = { x: 2, z: 19.5, w: 7.5, d: 3.6, h: 0.8 };
export const STAGE_TOP = STAGE.h;
export const PODIUM = V(STAGE.x - 0.3, STAGE.h, STAGE.z - 0.7);
export const NEWS_CAM = V(6.9, 0, 15.2);
export const ARCADE = { x0: 22, x1: 54, z0: -8.6, z1: -5.4, h: 3.4 };
export const BOARD = V(STAGE.x + 2.85, STAGE.h, STAGE.z - 0.3); // campaign board (3 panels)
export const PLAN_BOARD = V(STAGE.x - 2.6, STAGE.h, STAGE.z - 0.6);
/** Debate-day folding chairs (rows facing the stage, +z), an aisle at x = 2. */
export const CHAIR_SPOTS: Vector3[] = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) {
  const x = -3.2 + c * 0.95 + (c >= 6 ? 0.9 : 0), z = 14.2 - r * 1.15;
  CHAIR_SPOTS.push(V(x, 0, z));
}

// ------------------------------------------------------------------ ground
const slab = (x0: number, x1: number, z0: number, z1: number, y: number, mat: Material) => {
  const m = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  // world-metre uvs (the material repeat is 1 / tile metres)
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0));
  return m;
};
const disc = (c: Vector3, r: number, y: number, mat: Material) => {
  const m = new Mesh(new CylinderGeometry(r, r, 0.02, 48), mat);
  m.position.set(c.x, y - 0.01, c.z);
  const uv = m.geometry.attributes.uv, p = m.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i), p.getZ(i));
  m.receiveShadow = true;
  return m;
};
const ground = () => {
  const g = new Group();
  g.add(slab(-90, 90, STREET.z0, STREET.z1, 0, MATS.road()));
  g.add(slab(-90, 90, STREET.walkHouse, STREET.z0, 0.004, MATS.walk()));
  g.add(slab(-90, 90, STREET.z1, STREET.walkPark, 0.004, MATS.walk()));
  g.add(slab(-90, 90, STREET.walkPark, 60, 0.002, MATS.lawn()));
  g.add(slab(-90, 90, -40, STREET.walkHouse, 0.002, MATS.lawn())); // front yards and beyond
  g.add(disc(PLAZA, 4.6, 0.012, MATS.plaza()));
  g.add(slab(PLAZA.x - 1.2, PLAZA.x + 1.2, STREET.walkPark, PLAZA.z - 4, 0.008, MATS.plaza())); // path in from the street
  g.add(slab(PLAZA.x - 1.6, PLAZA.x + 1.6, PLAZA.z + 4, STAGE.z - STAGE.d / 2, 0.008, MATS.plaza())); // to the stage
  g.add(slab(-11.5, PLAZA.x - 4, 3.0, 4.2, 0.008, MATS.walk())); // a side path past the hives
  // kerbs: thin light strips along both street edges
  for (const z of [STREET.z0, STREET.z1]) g.add(place(new Mesh(new BoxGeometry(180, 0.06, 0.18), MATS.trim()), 0, 0.03, z));
  // white road markings (dashed centre line)
  const dash = M("pf-dash", () => toonMaterial({ color: "#efe9d8" }));
  for (let x = -88; x < 90; x += 4) g.add(place(new Mesh(new BoxGeometry(2, 0.01, 0.14), dash), x, 0.006, (STREET.z0 + STREET.z1) / 2));
  const meshes = g.children.filter((c) => c instanceof Mesh) as Mesh[];
  meshes.forEach((m) => (m.userData.ground = true));
  return g;
};

// ------------------------------------------------------------------ houses (fronts face +z, the park)
type HouseOpts = { x: number; front: number; w: number; d: number; h: number; wall: Material; roof: Material; door: string; seed: number; porch?: boolean; fence?: boolean };
const glass = () => M("pf-glass", () => toonMaterial({ color: "#3a4a62", spec: 0.6, gloss: 0.7, rough: 0.15 }));
const house = (o: HouseOpts) => {
  const k = new Kit(), T = MATS.trim(), { x, w, d, h } = o, fz = o.front, cz = fz - d / 2;
  k.box(MAT.darkStone(), w + 0.2, 0.42, d + 0.2, x, 0.21, cz); // plinth
  k.box(o.wall, w, h - 0.42, d, x, 0.42 + (h - 0.42) / 2, cz);
  for (const sx of [-1, 1]) for (const sz of [0, -d]) k.box(T, 0.16, h - 0.42, 0.16, x + (sx * w) / 2, 0.42 + (h - 0.42) / 2, fz + sz);
  k.box(T, w + 0.14, 0.2, d + 0.14, x, h - 0.1, cz); // eave board
  k.add(o.roof, new CylinderGeometry(d * 0.66, d * 0.66, w + 0.8, 3), x, h + d * 0.33, cz, { rx: -Math.PI / 2, ry: Math.PI / 2, tile: true });
  k.box(MAT.color("#8a4a3a"), 0.5, 1.4, 0.5, x + w * 0.3, h + d * 0.5, cz - d * 0.15); // chimney
  // front: a framed door with a step, two windows each side up and down
  const win = (u: number, y: number) => {
    k.box(T, 1.12, 1.32, 0.08, x + u, y, fz + 0.04);
    k.box(glass(), 0.92, 1.12, 0.06, x + u, y, fz + 0.06);
    k.box(T, 0.06, 1.12, 0.07, x + u, y, fz + 0.08); // mullion
    k.box(T, 1.4, 0.08, 0.22, x + u, y - 0.72, fz + 0.12); // sill
  };
  const dx = (rnd(o.seed) - 0.5) * 0.8;
  win(dx - w * 0.3, 1.55);
  win(dx + w * 0.3, 1.55);
  if (h > 4.6) for (const u of [-0.3, 0, 0.3]) win(dx + u * w, 3.75);
  k.box(T, 1.22, 2.22, 0.1, x + dx, 0.42 + 1.06, fz + 0.04);
  k.box(MAT.color(o.door), 1.0, 2.0, 0.08, x + dx, 0.42 + 1.0, fz + 0.07);
  k.box(MAT.color("#e2c25a"), 0.06, 0.06, 0.06, x + dx + 0.38, 0.42 + 1.0, fz + 0.14); // knob
  if (o.porch) {
    // deck at PORCH.y, three posts, a shallow roof, steps down to the walk, a rail on both ends
    const pz = (PORCH.z0 + PORCH.z1) / 2, pd = PORCH.z1 - PORCH.z0;
    k.box(MATS.deck(), w - 0.4, 0.12, pd, x, PORCH.y - 0.06, pz);
    k.box(MAT.darkStone(), w - 0.4, PORCH.y - 0.12, pd, x, (PORCH.y - 0.12) / 2, pz);
    for (const u of [-0.45, 0.45]) k.box(T, 0.14, 2.3, 0.14, x + u * (w - 0.6), PORCH.y + 1.15, PORCH.z1 - 0.1);
    const pr = new BoxGeometry(w - 0.2, 0.08, pd + 0.4);
    pr.rotateX(0.18);
    k.add(o.roof, pr, x, PORCH.y + 2.42, pz + 0.05, { tile: true });
    for (let i = 0; i < 2; i++) k.box(MATS.deck(), 1.4, 0.1, 0.32, x + dx, PORCH.y - 0.17 - i * 0.17, PORCH.z1 + 0.16 + i * 0.3);
    for (const s of [-1, 1]) {
      const rx = x + s * ((w - 0.6) / 2 - 0.05);
      k.box(T, 0.06, 0.06, pd, rx, PORCH.y + 0.85, pz);
      for (let j = 0; j < 4; j++) k.box(T, 0.04, 0.85, 0.04, rx, PORCH.y + 0.42, PORCH.z0 + 0.2 + j * (pd / 4));
    }
  }
  const g = k.build();
  g.userData.collider = `house ${o.seed}`;
  const out = new Group();
  out.add(g);
  if (o.fence) {
    // white picket fence along the front of the yard, a gate gap at the path
    const f = new Kit();
    const z = STREET.walkHouse - 0.15;
    for (let px = x - w / 2 - 1; px < x + w / 2 + 1; px += 0.22) {
      if (Math.abs(px - (x + dx)) < 0.7) continue;
      f.box(T, 0.08, 0.9, 0.035, px, 0.45, z);
      f.add(T, new BoxGeometry(0.08, 0.08, 0.035).rotateZ(Math.PI / 4), px, 0.9, z, { tile: true });
    }
    for (const y of [0.3, 0.7]) f.box(T, w + 2, 0.06, 0.03, x, y, z - 0.03);
    const fg = f.build();
    fg.userData.collider = "picket fence";
    out.add(fg);
  }
  return out;
};

/** The corner store: brick front, a big shop window with shelves behind, a glass door whose sign flips to CLOSED, a
 * striped awning and a name board. `sign` is a child group (Video.tsx turns it on line 9). */
export const STORE_SIGN = V(STORE.x + 1.25, 1.55, STORE.front + 0.12);
const storeSignFace = (open: boolean) => unlit(`pf-store-${open}`, () => boardTex([open ? "OPEN" : "CLOSED"], open ? "#2f8a4a" : "#c8342c", "#fff8ec", 512, 256));
const store = () => {
  const k = new Kit(), T = MATS.trim(), { x, front: fz } = STORE, w = 6.4, d = 6, h = 4.4, cz = fz - d / 2;
  k.box(MATS.brick(), w, h, d, x, h / 2, cz);
  k.box(T, w + 0.2, 0.3, d + 0.2, x, h + 0.15, cz);
  k.box(MAT.darkStone(), w + 0.3, 0.12, 0.6, x, h + 0.36, fz - 0.2);
  k.box(T, 3.6, 2.4, 0.1, x - 1.3, 1.6, fz + 0.04); // shop window frame
  k.box(T, 1.3, 2.4, 0.1, x + 1.25, 1.4, fz + 0.04); // door frame
  k.box(glass(), 1.1, 2.2, 0.05, x + 1.25, 1.3, fz + 0.08);
  const g = k.build();
  g.userData.collider = "corner store";
  const out = new Group();
  out.add(g);
  // the shop window: shelves of colourful goods (a canvas), seen through the glass
  const goods = unlit("pf-goods", () => canvasTex(512, 384, (c) => {
    c.fillStyle = "#3a3440"; c.fillRect(0, 0, 512, 384);
    for (let r = 0; r < 4; r++) {
      c.fillStyle = "#8a6a4a"; c.fillRect(0, 80 + r * 92, 512, 10);
      for (let i = 0; i < 18; i++) {
        c.fillStyle = ["#e84a3a", "#f2c23a", "#3a8ad8", "#4ab86a", "#f28ac0", "#f2ece2"][(i + r * 3) % 6];
        const bw = 18 + rnd(i + r * 20) * 10, bh = 30 + rnd(i * 3 + r) * 40;
        c.fillRect(8 + i * 28, 80 + r * 92 - bh, bw, bh);
      }
    }
  }));
  out.add(plane(3.4, 2.2, goods, V(x - 1.3, 1.6, fz + 0.1)));
  out.add(plane(3.4, 0.8, unlit("pf-store-name", () => boardTex(["CORNER STORE"], "#2a4a6a", "#ffe9b0", 1024, 200)), V(x, 3.6, fz + 0.06)));
  // striped awning over the window
  const awn = unlit("pf-awning", () => canvasTex(256, 64, (c) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? "#f2ece2" : "#d8423a"; c.fillRect(i * 32, 0, 32, 64); } }));
  const a = plane(4.2, 1.1, awn, V(x - 1.3, 3.05, fz + 0.5), 0, -1.0);
  out.add(a);
  // the door sign: two faces on a little group that turns (OPEN -> CLOSED)
  const sign = new Group();
  sign.name = "storeSign";
  sign.position.copy(STORE_SIGN);
  const s1 = plane(0.5, 0.25, storeSignFace(true), V(0, 0, 0.01)), s2 = plane(0.5, 0.25, storeSignFace(false), V(0, 0, -0.01), Math.PI);
  sign.add(s1, s2);
  out.add(sign);
  return out;
};

/** The "mall": a covered arcade along the sidewalk, columns at the kerb side, shopfronts with signs behind. */
const arcade = () => {
  const k = new Kit(), T = MATS.trim(), { x0, x1, z0, z1, h } = ARCADE;
  k.box(MATS.stucco("#e8d8c0"), x1 - x0, h + 1.8, 0.4, (x0 + x1) / 2, (h + 1.8) / 2, z0 - 0.2); // back wall (shopfronts)
  k.box(T, x1 - x0 + 0.4, 0.35, z1 - z0 + 0.6, (x0 + x1) / 2, h + 0.17, (z0 + z1) / 2); // roof slab
  for (let x = x0; x <= x1 + 0.01; x += 3.2) k.add(T, new CylinderGeometry(0.17, 0.2, h, 14), x, h / 2, z1 - 0.2);
  k.box(MATS.stucco("#d8c4a8"), 0.5, h + 1.8, z1 - z0 + 0.6, x1 + 0.25, (h + 1.8) / 2, (z0 + z1) / 2); // end wall
  const g = k.build();
  g.userData.collider = "arcade";
  const out = new Group();
  out.add(g);
  const names = ["SHOES", "PHONE FIX", "DONUTS", "BOOKS", "TOYS", "PIZZA", "HATS", "VIDEO GAMES", "SODA"];
  const cols = ["#c8342c", "#2f6ab8", "#e88ab8", "#3a8a5a", "#f2a23a", "#d8423a", "#7a4ab8", "#2a2a3a", "#2a9ab0"];
  for (let i = 0; i < 9; i++) {
    const cx = x0 + 1.8 + i * 3.55;
    out.add(plane(2.8, 2.2, glass(), V(cx, 1.3, z0 + 0.02)));
    out.add(plane(2.8, 0.55, unlit(`pf-mall-${i}`, () => boardTex([names[i]], cols[i], "#fff6e6", 768, 150)), V(cx, 2.85, z0 + 0.03)));
  }
  out.add(plane(2.6, 1.0, unlit("pf-mall-end", () => boardTex(["MALL"], "#2a4a6a", "#ffe9b0", 512, 200)), V(x1 - 0.02, 2.4, (z0 + z1) / 2), -Math.PI / 2));
  return out;
};

// ------------------------------------------------------------------ the park
const hive = (p: Vector3, i: number) => {
  const k = new Kit(), H = MATS.hive(), w = 0.5, d = 0.42;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(MATS.darkWood(), 0.05, 0.32, 0.05, p.x + sx * 0.2, 0.16, p.z + sz * 0.16); // stand legs
  k.box(MATS.darkWood(), w + 0.06, 0.05, d + 0.06, p.x, 0.34, p.z);
  k.box(H, w, 0.26, d, p.x, 0.5, p.z);
  k.box(H, w, 0.24, d, p.x, 0.76, p.z);
  k.box(MATS.roofGrey(), w + 0.1, 0.06, d + 0.1, p.x, 0.91, p.z);
  k.box(MAT.color("#3a2a20"), 0.22, 0.025, 0.02, p.x, 0.4, p.z - d / 2 - 0.005); // entrance slot (faces -z, the street)
  const g = k.build();
  g.userData.collider = `beehive ${i}`;
  return g;
};
/** The stage: plank deck on a skirted platform, steps, a podium with a star, the backdrop banner on two posts, the
 * campaign board (3 panels: pizza, water park, Monday crossed out) and the plan board (NEW PARKING LOT). */
export const BANNER_AT = V(STAGE.x, STAGE.h + 3.6, STAGE.z + STAGE.d / 2 - 0.15); // high: clear of Derek's close-ups
const banner = (debate: boolean) => unlit(`pf-banner-${debate}`, () => boardTex(debate ? ["MAYOR DEBATE"] : ["DEREK FOR MAYOR"], debate ? "#2a3a7a" : "#f2a8c8", debate ? "#ffffff" : "#ffffff", 1536, 420, (g) => {
  g.fillStyle = debate ? "#c8342c" : "#ffffff";
  g.fillRect(0, 380, 1536, 40);
  g.fillRect(0, 0, 1536, 40);
}));
const panelTex = (k: number) => canvasTex(512, 640, (g) => {
  g.fillStyle = ["#fff4d8", "#dff2ff", "#fff0f4"][k];
  g.fillRect(0, 0, 512, 640);
  g.lineWidth = 10;
  g.strokeStyle = "#1c1414";
  if (k === 0) {
    // pizza slice
    g.fillStyle = "#f2c23a"; g.beginPath(); g.moveTo(256, 520); g.lineTo(90, 150); g.quadraticCurveTo(256, 80, 422, 150); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#c86a3a"; g.beginPath(); g.moveTo(90, 150); g.quadraticCurveTo(256, 80, 422, 150); g.lineTo(410, 180); g.quadraticCurveTo(256, 115, 102, 180); g.closePath(); g.fill();
    g.fillStyle = "#d8342c"; for (const [x, y] of [[220, 230], [300, 260], [250, 340], [230, 430]]) { g.beginPath(); g.arc(x, y, 26, 0, 7); g.fill(); g.stroke(); }
  } else if (k === 1) {
    // water slide into a pool
    g.fillStyle = "#3a9ad8"; g.fillRect(40, 470, 432, 110); g.strokeRect(40, 470, 432, 110);
    g.strokeStyle = "#f2a23a"; g.lineWidth = 46; g.beginPath(); g.moveTo(110, 120); g.bezierCurveTo(420, 200, 60, 330, 330, 470); g.stroke();
    g.strokeStyle = "#1c1414"; g.lineWidth = 10; g.strokeRect(60, 110, 40, 360);
  } else {
    // calendar with MONDAY crossed out
    g.fillStyle = "#d8342c"; g.fillRect(40, 60, 432, 110); g.strokeRect(40, 60, 432, 520);
    g.fillStyle = "#ffffff"; g.font = `900 64px ${FONT}`; g.textAlign = "center"; g.fillText("MONDAY", 256, 138);
    g.strokeStyle = "#1c1414"; g.lineWidth = 22; g.beginPath(); g.moveTo(70, 210); g.lineTo(442, 550); g.moveTo(442, 210); g.lineTo(70, 550); g.stroke();
  }
});
export const PANELS = [0, 1, 2].map((k) => BOARD.clone().add(V(-0.62 + k * 0.62, 1.15, -0.02)));
const stage = () => {
  const k = new Kit(), { x, z, w, d, h } = STAGE;
  k.box(MATS.deck(), w, 0.1, d, x, h - 0.05, z);
  k.box(MAT.color("#2a3a6a"), w, h - 0.1, d, x, (h - 0.1) / 2, z); // skirt
  for (let i = 0; i < 3; i++) k.box(MATS.deck(), 1.6, h * (3 - i) / 3, 0.34, x, (h * (3 - i)) / 6, z - d / 2 - 0.17 - i * 0.34); // steps (front centre)
  k.box(MATS.darkWood(), 0.7, 1.15, 0.45, PODIUM.x, h + 0.575, PODIUM.z); // podium
  for (const sx of [-1, 1]) k.box(MATS.darkWood(), 0.12, 4.75, 0.12, x + sx * 3.3, h + 2.375, BANNER_AT.z + 0.05);
  // campaign board on an easel at stage right, plan board at stage left
  k.box(MATS.darkWood(), 2.0, 1.5, 0.06, BOARD.x, h + 1.15, BOARD.z + 0.03);
  for (const sx of [-0.7, 0.7]) k.box(MATS.darkWood(), 0.06, 1.0, 0.06, BOARD.x + sx, h + 0.4, BOARD.z + 0.1);
  k.box(MATS.darkWood(), 1.3, 1.0, 0.05, PLAN_BOARD.x, h + 1.2, PLAN_BOARD.z + 0.03);
  for (const sx of [-0.45, 0.45]) k.box(MATS.darkWood(), 0.05, 1.0, 0.05, PLAN_BOARD.x + sx, h + 0.45, PLAN_BOARD.z + 0.1);
  const g = k.build();
  g.userData.collider = "stage";
  const out = new Group();
  out.add(g);
  const b1 = plane(6.4, 1.75, banner(false), BANNER_AT.clone(), Math.PI); // faces -z, the crowd
  b1.name = "bannerDerek";
  const b2 = plane(6.4, 1.75, banner(true), BANNER_AT.clone().add(V(0, 0, -0.01)), Math.PI);
  b2.name = "bannerDebate";
  out.add(b1, b2);
  out.add(plane(0.6, 0.6, unlit("pf-podium-star", () => canvasTex(256, 256, (c) => {
    c.fillStyle = "#f2a8c8"; c.fillRect(0, 0, 256, 256);
    c.fillStyle = "#ffffff"; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 50 : 110; c.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
    c.fill();
  })), V(PODIUM.x, h + 0.65, PODIUM.z - 0.235), Math.PI));
  PANELS.forEach((p, i) => out.add(plane(0.56, 0.7, unlit(`pf-panel-${i}`, () => panelTex(i)), p, Math.PI)));
  out.add(plane(1.2, 0.9, unlit("pf-plan", () => canvasTex(640, 480, (c) => {
    c.fillStyle = "#f6f2e8"; c.fillRect(0, 0, 640, 480);
    c.fillStyle = "#3a3a44"; c.fillRect(40, 140, 560, 300);
    c.strokeStyle = "#f2ece2"; c.lineWidth = 8; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(80 + i * 90, 160); c.lineTo(80 + i * 90, 300); c.stroke(); }
    c.fillStyle = "#f2c23a"; c.fillRect(380, 330, 150, 70); c.fillRect(520, 350, 50, 30); c.fillStyle = "#1c1414"; for (const cx of [410, 500]) { c.beginPath(); c.arc(cx, 410, 22, 0, 7); c.fill(); }
    c.fillStyle = "#1c1414"; c.font = `900 66px ${FONT}`; c.textAlign = "center"; c.fillText("NEW PARKING LOT", 320, 90);
  })), PLAN_BOARD.clone().add(V(0, 1.2, -0.01)), Math.PI));
  return out;
};
/** The news camera on its tripod (red LIVE light, line 27), looking at the stage. */
export const LIVE_LIGHT = NEWS_CAM.clone().add(V(-0.05, 1.72, -0.28));
const newsCam = () => {
  const k = new Kit(), metal = MAT.metal();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.add(metal, new CylinderGeometry(0.02, 0.025, 1.5, 6).rotateX(0.25).rotateY(a), NEWS_CAM.x + Math.sin(a) * 0.18, 0.72, NEWS_CAM.z + Math.cos(a) * 0.18); }
  k.box(MAT.color("#2a2a34"), 0.24, 0.26, 0.55, NEWS_CAM.x, 1.6, NEWS_CAM.z);
  k.add(MAT.color("#1a1a22"), new CylinderGeometry(0.09, 0.1, 0.22, 14).rotateX(Math.PI / 2), NEWS_CAM.x, 1.58, NEWS_CAM.z + 0.36);
  k.box(MAT.glow("#ff2a2a", 4), 0.07, 0.05, 0.03, LIVE_LIGHT.x, LIVE_LIGHT.y, LIVE_LIGHT.z);
  const g = k.build();
  g.userData.collider = "news camera";
  const out = new Group();
  out.add(g);
  out.add(plane(0.34, 0.12, unlit("pf-live", () => boardTex(["LIVE"], "#c8342c", "#ffffff", 256, 96)), V(NEWS_CAM.x, 1.78, NEWS_CAM.z - 0.29), Math.PI));
  out.rotation.y = 0; // the lens looks +z (the stage)
  return out;
};
/** Folding chairs for the debate (Video.tsx shows them from line 19). */
export const debateChairs = () => {
  const g = new Group();
  // the model faces +z (backrest at -z), the same way as the stage: no turn (user 2026-11-22: they faced away, rotated by pi)
  for (const p of CHAIR_SPOTS) g.add(place(model("plastic_monobloc_chair_01", { collider: false, tint: "#f2ece2" }), p.x, 0, p.z - 0.08, 0));
  g.name = "chairs";
  return g;
};

// ------------------------------------------------------------------ dressing
/** A tree model with only its trunk as the QA collider (its canopy's box would swallow houses and hives). */
const tree = (id: string, name: string, x: number, z: number, s: number, ry: number, trunk = 0.35) => {
  const g = new Group();
  g.add(place(model(id, { collider: false, scale: s }), x, 0, z, ry));
  const t = new Mesh(new BoxGeometry(trunk, 2.2, trunk), new MeshBasicMaterial({ visible: false }));
  t.position.set(x, 1.1, z);
  t.userData.collider = name;
  g.add(t);
  return g;
};
const trees = (g: Group) => {
  g.add(tree("island_tree_02", "apple tree", APPLE.x, APPLE.z, 1.1, 0.4));
  // (the 205 MB jacaranda timed out the frame load: two big island trees instead)
  for (const [x, z, s, ry] of [[-16, 22, 2.0, 0.3], [17, 26, 1.9, 1.9]] as const) g.add(tree("island_tree_01", "big tree", x, z, s, ry, 0.5));
  for (const [x, z, s] of [[12, 7, 1.2], [-7.5, 15.5, 1.0], [10, 31, 1.4], [-6, 30, 1.3], [24, 12, 1.3], [-22, 10, 1.25], [30, 30, 1.5]] as const) g.add(tree("island_tree_01", "tree", x, z, s, x));
  // street trees in the house-side walk, between the houses
  for (const x of [-13.2, -5.2, 6.3, 13.9]) g.add(tree("island_tree_01", "street tree", x, -7.0, 0.85, x, 0.3));
};
const streetDressing = (g: Group) => {
  for (const x of [-24, -12, 0.2, 12, 24]) g.add(place(model("street_lamp_01", { collider: "street lamp" }), x, 0, 1.0, Math.PI));
  g.add(place(model("painted_wooden_bench", { collider: "bench" }), BENCH.x, 0, BENCH.z, 0));
  g.add(place(model("metal_trash_can", { part: "metal_trash_can", collider: "trash can" }), BENCH.x + 1.7, 0, BENCH.z - 0.2, 0));
  g.add(place(model("fire_hydrant", { part: "fire_hydrant", collider: "hydrant" }), -4.6, 0, 1.15, 0.3));
  // planters full of flowers round the plaza (Poly Haven flower models)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.5, p = PLAZA.clone().add(V(Math.cos(a) * 4.9, 0, Math.sin(a) * 4.9));
    if (p.z < 5 || Math.abs(p.x - PLAZA.x) < 1.6) continue;
    g.add(place(model("planter_box_01", { collider: "planter" }), p.x, 0, p.z, -a));
    g.add(place(model("flower_gazania", { collider: false, scale: 0.55 }), p.x, 0.38, p.z, -a));
  }
  g.add(place(model("flower_ursinia", { collider: false, scale: 0.8 }), APPLE.x + 1.6, 0, APPLE.z + 0.8, 0.2));
  g.add(place(model("flower_gazania", { collider: false, scale: 0.7 }), GRANDMA_HOUSE.x + 2.5, 0, STREET.walkHouse - 0.55, 0));
  g.add(place(model("potted_plant_01", { collider: "potted plant" }), GRANDMA_HOUSE.x - 2.4, PORCH.y, PORCH.z0 + 0.55, 0));
  g.add(place(model("Rockingchair_01", { collider: "rocking chair" }), GRANDMA_DOOR_X + 1.5, PORCH.y, PORCH.z0 + 0.95, 0.3));
  // a few grass tufts along the park's edges and round the hives
  g.add(...grassTufts(900, (_t, r) => {
    const k = r();
    if (k < 0.5) return V(-30 + r() * 60, 0, STREET.walkPark + 0.05 + r() * 0.5);
    if (k < 0.8) return V(HIVES[0].x - 2.5 + r() * 5, 0, HIVES[0].z - 0.8 + r() * 3);
    return V(-30 + r() * 60, 0, STREET.walkHouse - 0.3 - r() * 1.5);
  }, ["#4e6a34", "#6e8a44", "#a8b06a"], 31, 0.28));
};

/** Bunting: a sagging line of bright triangle flags from a to b (both faces coloured, unlit cloth). */
const BUNT = ["#e84a3a", "#f2c23a", "#3a8ad8", "#4ab86a", "#f28ac0", "#f6f0ea", "#f28a3a"];
const bunting = (a: Vector3, b: Vector3, n: number, seed: number) => {
  const g = new Group(), k = new Kit();
  const at = (u: number) => a.clone().lerp(b, u).add(V(0, -0.45 * Math.sin(Math.PI * u), 0));
  for (let i = 0; i < 24; i++) k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.008, 0.008, at(i / 24).distanceTo(at((i + 1) / 24)), 4).rotateZ(Math.PI / 2).rotateY(-Math.atan2(b.z - a.z, b.x - a.x)), (at(i / 24).x + at((i + 1) / 24).x) / 2, (at(i / 24).y + at((i + 1) / 24).y) / 2, (at(i / 24).z + at((i + 1) / 24).z) / 2);
  g.add(k.build());
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, p = at(u), col = BUNT[(i + seed) % BUNT.length];
    const geo = new BufferGeometry().setFromPoints([V(-0.14, 0, 0), V(0.14, 0, 0), V(0, -0.3, 0)]);
    geo.computeVertexNormals();
    const m = new Mesh(geo, M(`pf-flag-${col}`, () => new MeshBasicMaterial({ color: col, side: DoubleSide })));
    m.position.copy(p);
    m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    m.rotation.x = 0.15 * Math.sin(i * 1.7);
    g.add(m);
  }
  return g;
};
/** Two flag poles at the plaza's mouth carrying bunting across it, and bunting along the stage front. */
const festive = (g: Group) => {
  const k = new Kit();
  const P1 = V(PLAZA.x - 3.6, 0, PLAZA.z - 3.0), P2 = V(PLAZA.x + 4.3, 0, PLAZA.z - 3.4), P3 = V(PLAZA.x + 6.6, 0, PLAZA.z + 2.0); // right of the chair block, out of the debate wides
  for (const p of [P1, P2, P3]) k.add(MATS.trim(), new CylinderGeometry(0.05, 0.06, 4.2, 10), p.x, 2.1, p.z);
  const poles = k.build();
  poles.userData.collider = "flag poles";
  g.add(poles);
  g.add(bunting(P1.clone().setY(4.0), P2.clone().setY(4.0), 18, 0));
  g.add(bunting(P2.clone().setY(3.6), P3.clone().setY(3.6), 20, 3));
  g.add(bunting(V(STAGE.x - 3.3, STAGE.h + 4.7, BANNER_AT.z - 0.02), V(STAGE.x + 3.3, STAGE.h + 4.7, BANNER_AT.z - 0.02), 20, 5));
};

/** The whole town. `debate` shows the folding chairs and the debate banner. */
export const town = () => {
  const g = new Group();
  g.add(ground());
  g.add(house({ x: GRANDMA_HOUSE.x, front: GRANDMA_HOUSE.front, w: 6.2, d: 7, h: 4.2, wall: MATS.siding("#9ad0c0"), roof: MATS.roofRed(), door: "#c8582c", seed: 1, porch: true }));
  g.add(house({ x: YOUR_HOUSE.x, front: YOUR_HOUSE.front, w: 6.6, d: 7, h: 5.4, wall: MATS.stucco("#f2d58a"), roof: MATS.roofGrey(), door: "#3a6ab8", seed: 2, fence: true }));
  g.add(store());
  g.add(house({ x: 9.8, front: -8.6, w: 6, d: 7, h: 5.2, wall: MATS.stucco("#e8a87c"), roof: MATS.roofRed(), door: "#2f8a6a", seed: 3, fence: true }));
  g.add(house({ x: 17.6, front: -8.6, w: 5.6, d: 7, h: 4.2, wall: MATS.siding("#c8a0d8"), roof: MATS.roofGrey(), door: "#f2c23a", seed: 4 }));
  g.add(house({ x: -26.5, front: -8.6, w: 6, d: 7, h: 4.6, wall: MATS.siding("#a8c8f0"), roof: MATS.roofRed(), door: "#d8423a", seed: 5, fence: true }));
  // the far side of the park: a row of houses whose backs face us (seen behind the stage)
  [[-24, 40], [-15, 41], [-6, 39.5], [4, 41], [13, 40], [22, 41.5]].forEach(([x, z], i) => {
    const h = house({ x: 0, front: 0, w: 6, d: 6, h: 4.4 + (i % 2) * 1.0, wall: i % 2 ? MATS.stucco(["#f2ece2", "#e8a87c", "#9ad0c0"][i % 3]) : MATS.siding(["#c8a0d8", "#f2d58a", "#a8c8f0"][i % 3]), roof: i % 2 ? MATS.roofGrey() : MATS.roofRed(), door: "#3a6ab8", seed: 10 + i });
    h.rotation.y = Math.PI; // built at the origin facing +z, turned to face -z (its back to the park)
    h.position.set(x, 0, z);
    g.add(h);
  });
  g.add(arcade());
  HIVES.forEach((p, i) => g.add(hive(p, i)));
  g.add(stage(), newsCam());
  trees(g);
  streetDressing(g);
  festive(g);
  return g;
};

// ================================================================== home (kitchen + living room)
export const HOME = { x0: -3.6, x1: 3.6, z0: -2.6, z1: 2.8, h: 2.7 };
export const SINK = V(-1.7, 0.92, -2.3);
export const BUCKET = V(-1.7, 0, -1.82);
export const TABLE = V(-0.7, 0, 0.6);
export const DAD_SEAT = V(-0.75, 0, -0.35); // Dad sits at the table's far side, facing the lens (+z)
export const SOFA = V(2.15, 0, -1.9);
export const YOU_SOFA = V(2.15, 0, -1.38); // seated card 11 cm in front of the sofa (model() centres its box: front at SOFA.z + 0.409 = -1.491): a card turns to the lens, so on the front face half of it sank into the sofa
export const TV = V(1.15, 0.72, 1.4); // facing -z (the sofa)
export const FLOOR_LAMP = V(3.3, 1.55, -2.2);
export const WINDOW = V(0.6, 1.55, HOME.z0 + 0.01);
export const CLOCK = V(-0.2, 2.15, HOME.z0 + 0.03);
const windowTex = (night: boolean) => canvasTex(512, 512, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 512);
  if (night) { gr.addColorStop(0, "#0c1430"); gr.addColorStop(1, "#24305a"); } else { gr.addColorStop(0, "#5a90e0"); gr.addColorStop(1, "#d8e8f6"); }
  c.fillStyle = gr; c.fillRect(0, 0, 512, 512);
  // houses across the street (silhouettes), a lit window or two at night
  for (let i = 0; i < 4; i++) {
    c.fillStyle = night ? "#121830" : ["#e8a87c", "#9ad0c0", "#f2d58a", "#c8a0d8"][i];
    const x = i * 140 - 30, w = 120, top = 300 + (i % 2) * 30;
    c.fillRect(x, top, w, 260);
    c.beginPath(); c.moveTo(x - 10, top); c.lineTo(x + w / 2, top - 60); c.lineTo(x + w + 10, top); c.fill();
    c.fillStyle = night ? (i % 2 ? "#ffcf7a" : "#1c2440") : "#3a4a62";
    c.fillRect(x + 25, top + 50, 30, 40); c.fillRect(x + 70, top + 50, 30, 40);
  }
  if (night) { c.fillStyle = "#ffe8c0"; c.beginPath(); c.arc(400, 90, 22, 0, 7); c.fill(); }
  else { c.fillStyle = "#4e8a3a"; c.beginPath(); c.arc(70, 300, 90, 0, 7); c.fill(); }
});
/** television_02 glass height (model z) over the screen opening, 17 x 13, rows bottom -> top (raycast of the model). */
const TV_GLASS: number[][] = [[0.0946, 0.0983, 0.1015, 0.1039, 0.1059, 0.1075, 0.1087, 0.1096, 0.1099, 0.1095, 0.1085, 0.1072, 0.1056, 0.1035, 0.1009, 0.0976, 0.0938], [0.0964, 0.1007, 0.1044, 0.1073, 0.1096, 0.1113, 0.1126, 0.1136, 0.1139, 0.1135, 0.1124, 0.111, 0.1092, 0.1068, 0.1037, 0.0999, 0.0954], [0.098, 0.1028, 0.1069, 0.1101, 0.1126, 0.1145, 0.1158, 0.1168, 0.1171, 0.1167, 0.1156, 0.1142, 0.1122, 0.1096, 0.1061, 0.1018, 0.0969], [0.0993, 0.1044, 0.1088, 0.1123, 0.1149, 0.1168, 0.1182, 0.1191, 0.1194, 0.119, 0.118, 0.1165, 0.1144, 0.1116, 0.108, 0.1034, 0.0981], [0.1002, 0.1055, 0.11, 0.1136, 0.1163, 0.1182, 0.1197, 0.1206, 0.121, 0.1205, 0.1194, 0.1179, 0.1158, 0.113, 0.1092, 0.1045, 0.099], [0.1007, 0.1061, 0.1106, 0.1142, 0.117, 0.1189, 0.1204, 0.1214, 0.1217, 0.1213, 0.1202, 0.1186, 0.1165, 0.1136, 0.1098, 0.105, 0.0995], [0.1008, 0.1062, 0.1107, 0.1143, 0.1171, 0.119, 0.1205, 0.1215, 0.1218, 0.1214, 0.1203, 0.1187, 0.1166, 0.1137, 0.1099, 0.1051, 0.0996], [0.1004, 0.1058, 0.1103, 0.1139, 0.1166, 0.1186, 0.12, 0.121, 0.1213, 0.1209, 0.1198, 0.1183, 0.1162, 0.1133, 0.1095, 0.1047, 0.0993], [0.0997, 0.105, 0.1094, 0.1129, 0.1156, 0.1175, 0.1189, 0.1198, 0.1202, 0.1197, 0.1187, 0.1172, 0.1151, 0.1123, 0.1086, 0.1039, 0.0986], [0.0986, 0.1036, 0.1079, 0.1112, 0.1138, 0.1156, 0.117, 0.1179, 0.1182, 0.1178, 0.1168, 0.1153, 0.1134, 0.1107, 0.1071, 0.1027, 0.0975], [0.0972, 0.1018, 0.1056, 0.1087, 0.111, 0.1128, 0.1141, 0.115, 0.1154, 0.1149, 0.1139, 0.1125, 0.1106, 0.1081, 0.1049, 0.1009, 0.0962], [0.0955, 0.0995, 0.1029, 0.1055, 0.1075, 0.1092, 0.1104, 0.1113, 0.1117, 0.1112, 0.1102, 0.1089, 0.1072, 0.105, 0.1022, 0.0987, 0.0947], [0.095, 0.097, 0.0997, 0.1019, 0.1036, 0.1051, 0.1062, 0.1071, 0.1074, 0.107, 0.106, 0.1048, 0.1033, 0.1015, 0.0993, 0.0964, 0.0954]];
export const tvTex = () => canvasTex(640, 480, (c) => {
  c.fillStyle = "#14204a"; c.fillRect(0, 0, 640, 480);
  c.fillStyle = "#c8342c"; c.fillRect(0, 380, 640, 100);
  c.fillStyle = "#ffffff"; c.font = `900 54px ${FONT}`; c.textAlign = "center"; c.fillText("MAYOR POLL", 320, 434);
  c.fillStyle = "#2a3a6a"; c.fillRect(50, 110, 540, 90); c.fillRect(50, 240, 540, 90);
  c.fillStyle = "#f2a8c8"; c.fillRect(50, 110, 535, 90);
  c.fillStyle = "#7ce86a"; c.fillRect(50, 240, 8, 90);
  c.fillStyle = "#14204a"; c.font = `900 58px ${FONT}`; c.textAlign = "left"; c.fillText("DEREK 99%", 70, 178);
  c.fillStyle = "#ffffff"; c.fillText("YOU 1%", 80, 308);
  c.font = `900 44px ${FONT}`; c.textAlign = "center"; c.fillText("FRIDAY: THE DEBATE", 320, 70);
});
export const home = (night: boolean) => {
  const g = new Group(), { x0, x1, z0, z1, h } = HOME;
  const floor = slab(x0, x1, z0, z1, 0, MATS.floor());
  floor.userData.ground = true;
  g.add(floor);
  const k = new Kit(), W = MATS.wall(), T = MATS.trim();
  k.box(W, x1 - x0, h, 0.12, (x0 + x1) / 2, h / 2, z0 - 0.06);
  k.box(W, 0.12, h, z1 - z0, x0 - 0.06, h / 2, (z0 + z1) / 2);
  k.box(W, 0.12, h, z1 - z0, x1 + 0.06, h / 2, (z0 + z1) / 2);
  k.box(W, x1 - x0 + 0.24, 0.1, z1 - z0, (x0 + x1) / 2, h + 0.05, (z0 + z1) / 2); // ceiling
  k.box(T, x1 - x0, 0.12, 0.03, (x0 + x1) / 2, 0.06, z0 + 0.015); // skirting
  // kitchen run along the back wall (x -3.5 .. 0): base cabinets, worktop, backsplash, wall cabinets, a fridge
  k.box(MATS.cabinet(), 3.0, 0.86, 0.6, -2.0, 0.43, z0 + 0.3);
  k.box(MATS.darkWood(), 3.1, 0.06, 0.64, -2.0, 0.89, z0 + 0.32);
  k.box(MATS.tiles(), 3.1, 0.6, 0.02, -2.0, 1.22, z0 + 0.01);
  k.box(MATS.cabinet(), 3.0, 0.7, 0.35, -2.0, 1.95, z0 + 0.18);
  k.box(MAT.color("#f2f2ee"), 0.75, 1.9, 0.68, 0.0, 0.95, z0 + 0.34); // fridge
  k.box(MAT.color("#c8ccd2"), 0.04, 0.5, 0.04, 0.3, 1.2, z0 + 0.7);
  // the sink: a steel basin let into the worktop, a tall tap; the cabinet under it stands open (the leak)
  k.box(MAT.metal(), 0.62, 0.04, 0.46, SINK.x, 0.9, SINK.z + 0.02);
  k.add(MAT.metal(), new CylinderGeometry(0.025, 0.03, 0.32, 10), SINK.x, 1.08, SINK.z - 0.2);
  k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.22, 10).rotateX(Math.PI / 2), SINK.x, 1.23, SINK.z - 0.1);
  k.box(MAT.color("#2a2a30"), 0.6, 0.66, 0.02, SINK.x, 0.45, z0 + 0.61); // dark inside of the open cabinet
  k.add(MAT.metal(), new CylinderGeometry(0.025, 0.025, 0.5, 8), SINK.x + 0.05, 0.62, z0 + 0.4); // waste pipe
  // window frame on the back wall (living side) and a shelf
  k.box(T, 1.5, 1.3, 0.08, WINDOW.x, WINDOW.y, z0 + 0.04);
  k.box(T, 1.7, 0.07, 0.22, WINDOW.x, WINDOW.y - 0.68, z0 + 0.1);
  // TV cabinet and the floor lamp
  k.box(MATS.darkWood(), 1.2, 0.5, 0.45, TV.x, 0.25, TV.z + 0.05);
  k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 1.45, 8), FLOOR_LAMP.x, 0.72, FLOOR_LAMP.z);
  k.add(MAT.metal(), new CylinderGeometry(0.18, 0.2, 0.03, 16), FLOOR_LAMP.x, 0.015, FLOOR_LAMP.z);
  k.add(MAT.lampGlass(night), new CylinderGeometry(0.14, 0.22, 0.28, 16, 1, true), FLOOR_LAMP.x, FLOOR_LAMP.y, FLOOR_LAMP.z);
  // a rug under the table
  const walls = k.build();
  walls.userData.collider = "home";
  g.add(walls);
  g.add(plane(1.32, 1.12, M(`pf-window-${night}`, () => new MeshBasicMaterial({ map: windowTex(night), toneMapped: false })), WINDOW.clone().add(V(0, 0, 0.05))));
  const rug = plane(2.6, 1.8, unlit("pf-rug", () => canvasTex(256, 192, (c) => {
    c.fillStyle = "#b84a3a"; c.fillRect(0, 0, 256, 192);
    c.strokeStyle = "#f2d58a"; c.lineWidth = 8; c.strokeRect(14, 14, 228, 164);
    c.fillStyle = "#2a4a6a"; for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(48 + i * 40, 52 + j * 44, 10, 0, 7); c.fill(); }
  })), V(TABLE.x, 0.006, TABLE.z), 0, -Math.PI / 2);
  rug.userData.ground = true;
  g.add(rug);
  // the warm side of the room: by day a sun patch from the window across floor and rug, dusty shafts in the air
  if (!night) {
    g.add(lightPatch(V(WINDOW.x - 0.2, 0.012, z0 + 1.6), V(0, 1, 0), 1.5, 1.3, "#ffc98a", 0.55, [2, 2]));
    g.add(lightShafts(WINDOW.clone().add(V(0, 0.1, 0.15)), V(-0.15, -0.75, 1).normalize(), { length: 2.6, width: 1.1, color: "#ffd9a0", strength: 0.16, count: 5 }));
  }
  g.add(place(model("dining_table", { collider: "dining table", scale: 0.7 }), TABLE.x, 0, TABLE.z, 0));
  g.add(place(model("dining_chair_02", { collider: "chair" }), DAD_SEAT.x, 0, DAD_SEAT.z - 0.4, 0)); // front (+0.288) 11 cm behind Dad's card (was 17 cm in front of it: he sat inside the chair)
  g.add(place(model("dining_chair_02", { collider: "chair" }), TABLE.x + 0.9, 0, TABLE.z + 0.85, Math.PI));
  g.add(place(model("sofa_02", { collider: "sofa" }), SOFA.x, 0, SOFA.z, 0));
  const tv = place(model("television_02", { collider: "tv", scale: 1.5 }), TV.x, 0.5, TV.z, Math.PI);
  // the poll ON the CRT glass (model units; opening x +-0.145, y .157-.372). Video.tsx switches it on/off.
  const scr = curvedScreen(tvTex(), { x: -0.002, y: 0.266, w: 0.3, h: 0.224, z: 0.122, zMap: TV_GLASS, corner: 0.13, gain: 1.25 });
  scr.name = "tvScreen";
  tv.children[0].add(scr);
  g.add(tv);
  g.add(place(model("wooden_bookshelf_worn", { collider: "bookshelf", scale: 0.9 }), x0 + 0.32, 0, 1.3, Math.PI / 2));
  const clock = model("wall_clock", { collider: false, scale: 1.2 });
  clock.position.copy(CLOCK);
  g.add(clock);
  g.add(place(model("wooden_bucket_01", { collider: "bucket", height: 0.3 }), BUCKET.x, 0, BUCKET.z, 0));
  g.add(place(model("potted_plant_01", { collider: "plant", scale: 0.8 }), x1 - 0.4, 0, 1.6, 0));
  // the sticky note on the cabinet under the tap
  g.add(plane(0.16, 0.16, unlit("pf-fixme", () => boardTex(["FIX", "ME"], "#f6e65a", "#1c1414", 256, 256)), V(SINK.x + 0.42, 0.7, z0 + 0.615)));
  // the puddle round the bucket (Video.tsx scales it: it grows between line 5 and line 18)
  const pud = new Mesh(new CylinderGeometry(0.5, 0.5, 0.004, 32), M("pf-puddle", () => toonMaterial({ color: "#7aa0c8", gloss: 0.9, rough: 0.05, spec: 0.9 })));
  pud.position.set(BUCKET.x + 0.1, 0.004, BUCKET.z + 0.25);
  pud.name = "puddle";
  pud.userData.ground = true;
  g.add(pud);
  return g;
};

// ================================================================== story props
/** A phone (origin = grip, screen toward +z). `text` lines go on its screen. */
export const phone = (text: string[]) => {
  const g = new Group();
  const body = new Mesh(new BoxGeometry(0.075, 0.15, 0.012), MAT.color("#2a2a34"));
  body.position.y = 0.07;
  const scr = plane(0.064, 0.13, unlit(`pf-phone-${text.join("|")}`, () => canvasTex(256, 512, (c) => {
    c.fillStyle = "#eaf2ff"; c.fillRect(0, 0, 256, 512);
    c.fillStyle = "#2f7ae8"; c.beginPath(); c.roundRect(28, 190, 200, 120, 30); c.fill();
    c.fillStyle = "#ffffff"; c.font = `900 52px ${FONT}`; c.textAlign = "center";
    text.forEach((t, i) => c.fillText(t, 128, 240 + i * 52));
    c.fillStyle = "#8a96aa"; c.font = `700 26px ${FONT}`; c.fillText("Sent", 190, 340);
  })), V(0, 0.07, 0.007));
  g.add(body, scr);
  return g;
};
/** Grandma's binoculars (Poly Haven), origin between the barrels. */
export const binoculars = () => { const m = model("vintage_binocular", { collider: false, scale: 1.4 }); const g = new Group(); g.add(m); return g; };
/** The bee notebook: an open binder with a doodled page. `page` 0 = the summer page (LINDA - YES), 1 = DEREK - NEVER. */
const pageTex = (page: number) => canvasTex(512, 640, (c) => {
  c.fillStyle = "#fbf8ee"; c.fillRect(0, 0, 512, 640);
  c.strokeStyle = "#a8c0e0"; c.lineWidth = 2; for (let y = 60; y < 640; y += 36) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
  const bee = (x: number, y: number, s = 1) => {
    c.fillStyle = "#f2c23a"; c.beginPath(); c.ellipse(x, y, 22 * s, 15 * s, 0, 0, 7); c.fill();
    c.strokeStyle = "#1c1414"; c.lineWidth = 4; c.stroke();
    c.fillStyle = "#1c1414"; c.fillRect(x - 6 * s, y - 15 * s, 5 * s, 30 * s); c.fillRect(x + 6 * s, y - 15 * s, 5 * s, 30 * s);
    c.fillStyle = "rgba(200,230,255,0.9)"; c.beginPath(); c.ellipse(x - 6 * s, y - 22 * s, 10 * s, 7 * s, -0.5, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "#1c1414"; c.strokeStyle = "#2f5ab8"; c.lineWidth = 6; // the text after a bee kept the wing colour
  };
  c.fillStyle = "#1c1414"; c.font = `900 50px "Comic Sans MS", ${FONT}`; c.textAlign = "left";
  c.strokeStyle = "#2f5ab8"; c.lineWidth = 6;
  if (page === 0) {
    c.fillText("BEES:", 40, 90);
    bee(120, 200); c.beginPath(); c.moveTo(150, 200); c.quadraticCurveTo(260, 140, 330, 210); c.stroke();
    c.fillText("LINDA - YES", 40, 330);
    bee(120, 430, 0.8); c.beginPath(); c.moveTo(150, 430); c.quadraticCurveTo(250, 380, 320, 440); c.stroke();
    c.fillText("MAILMAN - YES", 40, 540);
  } else {
    c.fillText("DEREK -", 40, 110);
    c.font = `900 96px "Comic Sans MS", ${FONT}`;
    c.fillStyle = "#c8342c"; c.fillText("NEVER", 60, 250);
    c.strokeStyle = "#c8342c"; c.lineWidth = 7;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(210, 218, 190 + i * 9, 80 + i * 7, 0.04 * i, 0, 7); c.stroke(); }
    bee(110, 430); c.strokeStyle = "#2f5ab8"; c.lineWidth = 6;
    c.beginPath(); c.moveTo(140, 430); c.quadraticCurveTo(260, 330, 270, 440); c.quadraticCurveTo(280, 520, 180, 560); c.stroke();
    // a flowery stick figure the arrow bends away from
    c.strokeStyle = "#1c1414"; c.lineWidth = 6; c.beginPath(); c.arc(400, 380, 30, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(400, 410); c.lineTo(400, 520); c.moveTo(400, 440); c.lineTo(360, 480); c.moveTo(400, 440); c.lineTo(440, 480); c.moveTo(400, 520); c.lineTo(370, 590); c.moveTo(400, 520); c.lineTo(430, 590); c.stroke();
    for (const [x, y] of [[372, 350], [430, 352], [380, 470], [420, 500], [400, 560]]) { c.fillStyle = "#f28ac0"; c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); }
  }
});
export const notebook = (page: number) => {
  const g = new Group();
  const back = new Mesh(new BoxGeometry(0.36, 0.012, 0.24), MAT.color("#2f5ab8"));
  const p = plane(0.34, 0.225, unlit(`pf-page-${page}`, () => pageTex(page)), V(0, 0.008, 0), 0, -Math.PI / 2);
  g.add(back, p); // flat, text upright for a lens on the +z side
  return g;
};
/** The sneaker shoebox (origin at its base centre): rubber bands, air holes, the sticker; its lid (child "lid") hops
 * (Video.tsx) and lifts on line 20. */
export const shoebox = () => {
  const g = new Group();
  const k = new Kit(), card = MAT.color("#d8a868");
  k.box(card, 0.36, 0.13, 0.22, 0, 0.065, 0);
  for (const x of [-0.1, 0.1]) k.box(MAT.color("#c8342c"), 0.015, 0.135, 0.225, x, 0.066, 0); // rubber bands
  for (let i = 0; i < 5; i++) k.add(MAT.color("#2a2018"), new CylinderGeometry(0.008, 0.008, 0.005, 8).rotateX(Math.PI / 2), -0.12 + i * 0.06, 0.08, 0.111);
  const box = k.build();
  const lid = new Group();
  lid.name = "lid";
  const l = new Mesh(new BoxGeometry(0.375, 0.035, 0.235), MAT.color("#e8b878"));
  l.position.y = 0.0175;
  lid.add(l);
  lid.position.y = 0.125;
  const sticker = plane(0.2, 0.11, unlit("pf-bees-sticker", () => boardTex(["10,000 BEES", "DO NOT SHAKE"], "#fff4b0", "#c8342c", 512, 280)), V(0, 0.036, 0), 0, -Math.PI / 2);
  lid.add(sticker);
  g.add(box, lid);
  return g;
};
/** Derek's glue tube (origin = grip) and perfume bottle. */
export const glueTube = () => {
  const g = new Group();
  const t = new Mesh(new CylinderGeometry(0.022, 0.016, 0.13, 12), MAT.color("#f2ece2"));
  t.position.y = 0.05;
  const cap = new Mesh(new CylinderGeometry(0.01, 0.012, 0.03, 8), MAT.color("#c8342c"));
  cap.position.y = 0.13;
  const lab = new Mesh(new CylinderGeometry(0.0225, 0.0225, 0.06, 16, 1, true), unlit("pf-glue", () => boardTex(["SUPER", "STICK"], "#f2c23a", "#c8342c", 256, 128)));
  lab.position.y = 0.05;
  g.add(t, cap, lab);
  return g;
};
export const perfume = () => {
  const g = new Group();
  const b = new Mesh(new SphereGeometry(0.05, 14, 10).scale(1, 1.15, 0.7), M("pf-perfume", () => toonMaterial({ color: "#f2a8c8", spec: 0.8, gloss: 0.6 })));
  b.position.y = 0.06;
  const n = new Mesh(new CylinderGeometry(0.012, 0.012, 0.04, 8), MAT.color("#e2c25a"));
  n.position.y = 0.13;
  g.add(b, n);
  return g;
};
/** The newspaper on the bench (line 31). */
export const newspaper = () => plane(0.42, 0.3, unlit("pf-paper", () => canvasTex(640, 460, (c) => {
  c.fillStyle = "#f2eee4"; c.fillRect(0, 0, 640, 460);
  c.fillStyle = "#1c1414"; c.font = `900 40px Georgia, serif`; c.textAlign = "center"; c.fillText("THE TOWN TIMES", 320, 56);
  c.fillRect(30, 72, 580, 5);
  c.font = `900 92px ${FONT}`; c.fillText("DEREK LOSES", 320, 180);
  c.fillStyle = "#7a7a7a"; for (let i = 0; i < 8; i++) c.fillRect(40 + (i % 2) * 300, 230 + Math.floor(i / 2) * 50, 270, 14);
})), V(0, 0, 0), 0, -Math.PI / 2 + 0.3);
/** The pile of fake flowers at Derek's feet (line 28-29): `n` blooms in a low mound. */
export const flowerPile = () => {
  const k = new Kit(), cols = ["#f49ac1", "#fbf3f0", "#f6c09a", "#f28ab0"];
  for (let i = 0; i < 70; i++) {
    const a = rnd(i) * Math.PI * 2, r = Math.sqrt(rnd(i + 3)) * 0.55;
    k.add(MAT.color(cols[i % 4]), new SphereGeometry(0.06, 7, 5).scale(1, 0.45, 1), Math.cos(a) * r, 0.03 + (0.55 - r) * 0.18 * rnd(i + 5), Math.sin(a) * r * 0.7);
  }
  const g = k.build();
  return g;
};
