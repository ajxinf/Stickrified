import { model } from "../../../kit/toon/build/models";
import { BufferAttribute, CanvasTexture, CapsuleGeometry, ConeGeometry, CylinderGeometry, DoubleSide, Group, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { grassTufts } from "../../../kit/toon/build/ground";
import { photo } from "../../../kit/toon/build/photo";
import { lampPost } from "../../../kit/toon/build/props";
import { BUILDS, capHair, outfit } from "../../../kit/toon/extras";
import type { Look } from "../../../kit/toon/figure";
import type { Head } from "../../../kit/toon/face";
import { SKY } from "../../../kit/toon/ink";
import { planks, rough } from "../../../kit/toon/paint";
import { toonMaterial } from "../../../kit/toon/shade";
import { INK, SH_HAIR } from "../../../kit/toon/toon";
import type { P2 } from "../../../kit/toon/toon";
import { belt, headLayers, layers, pattern } from "../../../kit/toon/wardrobe";

/**
 * moon-disappeared-tonight (episode 4): the places, all our own design.
 *   beach    a small beach town at night: sand, a sea whose waterline moves with the story's tide (Video.tsx sets it
 *            per frame from `waterZ`), Grandma's snack shack with its hot dog, a pier, a lifeguard tower, the dune
 *            path, and behind it the hill: the town's houses and Brad's sandbag fortress with floodlights on top
 *   bedroom  the analogy mini-set: a bed whose blue sheet a giant hand lifts into a hump (line 15-16)
 * The sea is toward -z, the land and the hill toward +z.
 */
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const PAPER = "#e0dacd";
const unlit = (key: string, map: () => CanvasTexture, transparent = false, color = PAPER) => M(key, () => new MeshBasicMaterial({ map: map(), transparent, color, side: DoubleSide }));
const plane = (w: number, h: number, mat: Material, pos: Vector3, ry = 0, rx = 0) => {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  m.rotation.set(rx, ry, 0);
  return m;
};
const smooth = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

// ================================================================== layout
export const HILL = { from: 16, to: 50, h: 15 };
/** The hill behind the beach: height at (x, z). */
export const hillY = (x: number, z: number) => HILL.h * smooth(HILL.from, HILL.to, z) * (1 + 0.12 * Math.sin(x * 0.09));
export const BEACH = { // see the layout notes above
  shack: V(5.0, 0, 7.6), // centre; its front (hatch) faces the sea at z = 6.3
  hatch: V(5.0, 1.15, 6.35),
  chair: V(0.6, 0, 4.2),
  seat: V(0.6, 0, 4.2 - 0.29), // seated card: soles on the sand just in front of the seat (chair faces the sea, -z)
  mia: V(-0.2, 0, 4.0),
  stick: V(1.1, 0, 0.2),
  pierX: -11,
  tower: V(-5.2, 0, 5.4),
  lamp: V(-5.6, 0, 9.6),
  brad: V(-12, 0, 47), // y = hillY + the pyramid's top
};
export const PYRAMID_TOP = 2.18; // the plank on the top row of bags
/** Brad's ring light: x offset from him, inside the 1.6 m plank (its edge is at 0.8). */
export const RING_X = 0.62;
export const BRAD_AT = V(BEACH.brad.x, hillY(BEACH.brad.x, BEACH.brad.z) + PYRAMID_TOP, BEACH.brad.z);
/** The flashlight river: the path from the dune boardwalk up the hill (t 0..1). */
export const pathAt = (t: number) => {
  const z = 12 + 36 * t, x = 1.5 + 9 * Math.sin(t * 5.2) * t - 6 * t;
  return V(x, hillY(x, z) + 0.9, z);
};

// ================================================================== tide
export type Tide = { z: number; lap: number };
/**
 * Where the sea's edge is (z, m) at composition frame F, plus a small lap of the foam. `k` holds the story beats:
 * the water rests at 0, pulls back to -14 from `back` until `stops`, then (4 hours later) comes back only a third of
 * the way, stopping at -9.33.
 */
export const tideAt = (F: number, k: { back: number; stops: number; comes: number; stick: number }): Tide => {
  const lap = 0.28 * Math.sin(F / 19) + 0.12 * Math.sin(F / 7.3);
  if (F < k.back - 8) return { z: lap, lap };
  if (F < k.comes) {
    const t = Math.min(Math.max((F - (k.back - 8)) / (k.stops - (k.back - 8)), 0), 1);
    return { z: -14 * (1 - Math.pow(1 - t, 2.2)) + lap * 0.3 * (1 - t), lap: lap * 0.4 };
  }
  const t = Math.min(Math.max((F - k.comes) / (k.stick - k.comes), 0), 1);
  return { z: -14 + (14 / 3) * (1 - Math.pow(1 - t, 3)) + lap * 0.25, lap: lap * 0.4 };
};

// ================================================================== textures
const seaTex = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#2c4f8a"; g.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 40; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(90,140,210,0.25)" : "rgba(10,30,70,0.25)"; g.beginPath(); g.ellipse(rnd(k + 1) * 512, rnd(k + 2) * 512, 90, 18, 0, 0, 7); g.fill(); }
    // painted wavelets: short pale strokes in rows
    g.lineCap = "round";
    for (let k = 0; k < 900; k++) {
      const x = rnd(k + 5) * 512, y = rnd(k + 6) * 512, w = 10 + 26 * rnd(k + 7);
      g.strokeStyle = rnd(k + 8) > 0.55 ? "rgba(220,235,255,0.85)" : rnd(k + 9) > 0.5 ? "rgba(120,160,225,0.7)" : "rgba(8,20,50,0.6)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 5, x + w, y); g.stroke();
    }
  });
const foamTex = () =>
  canvasTex(1024, 64, (g) => {
    g.clearRect(0, 0, 1024, 64);
    // a lacy edge: scallops of foam with holes, never a solid bar
    g.fillStyle = "rgba(240,248,255,0.85)";
    g.beginPath(); g.moveTo(0, 64);
    for (let x = 0; x <= 1024; x += 8) g.lineTo(x, 40 + 9 * Math.sin(x / 37) + 5 * Math.sin(x / 11));
    g.lineTo(1024, 64); g.fill();
    g.globalCompositeOperation = "destination-out";
    for (let k = 0; k < 220; k++) { g.beginPath(); g.ellipse(rnd(k + 90) * 1024, 46 + rnd(k + 91) * 16, 4 + 10 * rnd(k + 92), 3 + 3 * rnd(k + 93), 0, 0, 7); g.fill(); }
    g.globalCompositeOperation = "source-over";
    g.fillStyle = "rgba(240,248,255,0.5)";
    for (let k = 0; k < 160; k++) { g.beginPath(); g.ellipse(rnd(k + 2) * 1024, 6 + rnd(k + 3) * 22, 3 + 6 * rnd(k + 4), 2, 0, 0, 7); g.fill(); }
  });
const stripeTex = (cols: string[], n = 8, vertical = true) =>
  canvasTex(256, 256, (g) => {
    const s = 256 / n;
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; vertical ? g.fillRect(i * s, 0, s, 256) : g.fillRect(0, i * s, 256, s); }
    for (let k = 0; k < 1400; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"; g.fillRect(rnd(k + 1) * 256, rnd(k + 2) * 256, 2, 2); }
  });
/** Grandma's sign: SHELLY'S SNACKS hand-painted on a board with a little shell. */
const shackSignTex = () =>
  canvasTex(1024, 300, (g) => {
    g.fillStyle = "#2a7a8a"; g.fillRect(0, 0, 1024, 300);
    g.strokeStyle = "#f6e6c0"; g.lineWidth = 14; g.strokeRect(14, 14, 996, 272);
    g.fillStyle = "#ffd25a"; g.font = `900 132px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("SHELLY'S", 512, 140);
    g.fillStyle = "#f6e6c0"; g.font = `900 92px "Nunito", sans-serif`; g.fillText("SNACKS", 512, 250);
    g.fillStyle = "#f2a0a0"; g.beginPath(); g.moveTo(110, 210); g.arc(110, 210, 52, Math.PI, 0); g.fill();
    g.fillStyle = "#f2a0a0"; g.beginPath(); g.moveTo(914, 210); g.arc(914, 210, 52, Math.PI, 0); g.fill();
  });
const menuTex = () =>
  canvasTex(300, 420, (g) => {
    g.fillStyle = "#2a2a30"; g.fillRect(0, 0, 300, 420);
    g.strokeStyle = "#c8a46a"; g.lineWidth = 10; g.strokeRect(5, 5, 290, 410);
    g.fillStyle = "#fbf7ee"; g.font = `700 40px "Comic Sans MS", sans-serif`; g.textAlign = "center"; g.fillText("MENU", 150, 60);
    g.font = `700 30px "Comic Sans MS", sans-serif`; g.textAlign = "left";
    [["HOT DOG", "$3"], ["POPCORN", "$2"], ["FRIES", "$3"], ["SODA", "$1"]].forEach(([a, b], i) => { g.fillStyle = ["#ffd25a", "#fbf7ee", "#9ad0f0", "#f2a0b0"][i]; g.fillText(a, 22, 130 + i * 70); g.fillText(b, 230, 130 + i * 70); });
  });
/** Grandma's framed photo by the hatch: a cartoon grandma with a hot dog, "SINCE 1971". */
const grandmaTex = () =>
  canvasTex(256, 320, (g) => {
    g.fillStyle = "#8a5a3a"; g.fillRect(0, 0, 256, 320);
    g.fillStyle = "#e8d8b8"; g.fillRect(20, 20, 216, 240);
    g.fillStyle = "#9ad0f0"; g.fillRect(20, 20, 216, 120);
    g.fillStyle = "#c8c8d0"; g.beginPath(); g.arc(128, 110, 58, 0, 7); g.fill();
    g.fillStyle = "#f7f0e6"; g.beginPath(); g.arc(128, 125, 44, 0, 7); g.fill();
    g.fillStyle = "#141014"; g.beginPath(); g.arc(112, 120, 5, 0, 7); g.arc(144, 120, 5, 0, 7); g.fill();
    g.strokeStyle = "#141014"; g.lineWidth = 4; g.beginPath(); g.arc(128, 134, 14, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = "#c8582c"; g.fillRect(70, 170, 116, 90);
    g.fillStyle = "#e0a050"; g.fillRect(150, 160, 70, 22); g.fillStyle = "#c83a2a"; g.fillRect(156, 155, 58, 12);
    g.fillStyle = "#fbf7ee"; g.font = `900 30px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("SINCE 1971", 128, 300);
  });
/** Brad's billboard on the hill: BRAD BUYS BEACHES, his grin and a SOLD stamp. */
const billboardTex = () =>
  canvasTex(1024, 420, (g) => {
    g.fillStyle = "#f6c8d8"; g.fillRect(0, 0, 1024, 420);
    g.fillStyle = "#d83a7a"; g.fillRect(0, 0, 1024, 80);
    g.fillStyle = "#fbf7ee"; g.font = `900 64px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("BRAD BUYS BEACHES", 512, 62);
    g.fillStyle = "#f7f0e6"; g.beginPath(); g.arc(230, 260, 110, 0, 7); g.fill(); g.strokeStyle = "#141014"; g.lineWidth = 8; g.stroke();
    g.fillStyle = "#e8c050"; g.beginPath(); g.ellipse(230, 175, 110, 40, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#141014"; g.beginPath(); g.arc(195, 250, 9, 0, 7); g.arc(265, 250, 9, 0, 7); g.fill();
    g.fillStyle = "#fbf7ee"; g.beginPath(); g.ellipse(230, 300, 50, 22, 0, 0, Math.PI); g.fill(); g.stroke();
    g.fillStyle = "#2a2a34"; g.font = `900 70px "Nunito", sans-serif`; g.fillText("CALL ME!", 640, 230);
    g.fillStyle = "#d83a7a"; g.font = `900 46px "Nunito", sans-serif`; g.fillText("555-BRAD", 640, 300);
    g.save(); g.translate(860, 330); g.rotate(-0.25); g.strokeStyle = "#c8282a"; g.lineWidth = 10; g.strokeRect(-100, -40, 200, 80); g.fillStyle = "#c8282a"; g.font = `900 60px "Nunito", sans-serif`; g.fillText("SOLD", 0, 22); g.restore();
  });
const signBoard = (lines: string[], bg: string, fg: string) =>
  canvasTex(512, 256, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = fg; g.lineWidth = 10; g.strokeRect(10, 10, 492, 236);
    g.fillStyle = fg; g.font = `900 66px "Nunito", sans-serif`; g.textAlign = "center";
    lines.forEach((l, i) => g.fillText(l, 256, 110 + i * 80 - (lines.length - 1) * 30, 456)); // squeeze long lines inside the frame ("SOLD TO BRAD" overran it)
  });
export const neonTex = (on: boolean) =>
  canvasTex(512, 200, (g) => {
    g.fillStyle = "#14121a"; g.fillRect(0, 0, 512, 200);
    g.strokeStyle = on ? "#ff6a9a" : "#5a3040"; g.lineWidth = 10; g.lineJoin = "round"; g.lineCap = "round";
    g.font = `900 92px "Nunito", sans-serif`; g.textAlign = "center";
    g.lineWidth = 8; g.strokeText("HOT DOGS", 256, 130);
    g.fillStyle = on ? "#ffd0e0" : "#3a2830"; g.fillText("HOT DOGS", 256, 130);
  });
const houseTex = (col: string, lit: boolean, seed: number) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 600; k++) { g.fillStyle = rnd(k + seed) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"; g.fillRect(rnd(k + 1 + seed) * 256, rnd(k + 2 + seed) * 256, 3, 3); }
    for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
      const on = lit && rnd(seed * 7 + c * 3 + r) > 0.3;
      g.fillStyle = "#2a2430"; g.fillRect(24 + c * 76, 40 + r * 110, 56, 66);
      g.fillStyle = on ? "#ffcf7a" : "#3a4a70"; g.fillRect(29 + c * 76, 45 + r * 110, 46, 56);
      g.fillStyle = "#2a2430"; g.fillRect(50 + c * 76, 45 + r * 110, 4, 56);
    }
  });

// ================================================================== the beach
const MATS = {
  // R25 real look: CC0 photo textures (public/tex, Poly Haven), 2.5-4 m tiles, world mottling against the repeat.
  sand: () => M("sand", () => toonMaterial({ map: photo("dense_sand"), repeat: [280, 48], mottle: 0.12, color: "#ffe6c4", rough: 0.95 })), // 2.5 m tiles
  wet: () => M("wetSand", () => toonMaterial({ map: photo("damp_beach_sand_02"), repeat: [233, 5], gloss: 0.5, rough: 0.22, color: "#c8b8a0" })),
  sea: () => M("sea", () => toonMaterial({ map: seaTex(), repeat: [88, 50], spec: 0.7, gloss: 0.6 })), // 8 m tiles
  grass: () => M("dune", () => toonMaterial({ map: photo("sparse_grass"), repeat: [73, 27], mottle: 0.16, color: "#7e9468", rough: 0.9 })), // 3 m tiles
  shack: () => M("shackWood", () => toonMaterial({ map: photo("weathered_plank_siding"), repeat: [0.5, 0.5], color: "#f2e0bc", rough: 0.8 })),
  trim: () => M("shackTrim", () => toonMaterial({ map: rough("#2a7a8a"), repeat: [1, 1] })),
  roof: () => M("shackRoof", () => toonMaterial({ map: stripeTex(["#c83a3a", "#f2ece2"], 8), repeat: [1, 1] })),
  boardwalk: () => M("boardwalk", () => toonMaterial({ map: photo("weathered_planks"), repeat: [0.5, 0.5], color: "#d8c0a0", rough: 0.75 })),
};
/** The sea: a big plane whose near edge is the waterline (Video.tsx moves it per frame). */
export const seaPlane = () => {
  const g = new Group();
  const sea = new Mesh(new PlaneGeometry(700, 400), MATS.sea());
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.03, -200);
  sea.name = "sea";
  sea.receiveShadow = true;
  // The wet sand the sea leaves behind, from the waterline up to the old high mark (z 0.9).
  const wet = new Mesh(new PlaneGeometry(700, 16), MATS.wet());
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.012, 0.9 - 8);
  wet.name = "wet";
  // R26: the foam line is the only thing that shows where the sea went at night (lines 12-14 read as empty sand): wider, brighter.
  const foam = new Mesh(new PlaneGeometry(700, 0.85), unlit("foam", foamTex, true, "#e8f0ff"));
  foam.rotation.x = -Math.PI / 2;
  foam.name = "foam";
  foam.layers.set(SKY);
  const foam2 = foam.clone();
  foam2.name = "foam2";
  g.add(sea, wet, foam, foam2);
  return g;
};
/** Place the sea for a tide (z of the edge). */
export const setTide = (g: Object3D, t: Tide, F: number) => {
  const sea = g.getObjectByName("sea")!, foam = g.getObjectByName("foam") as Mesh, foam2 = g.getObjectByName("foam2") as Mesh;
  sea.position.z = t.z - 200;
  // Continuous drift (the plane is 700 m wide): a modulo wrap jumped the foam 4 m (pixel QA EDGEPOP f900, f955).
  foam.position.set(F * 0.004 - 2, 0.045, t.z + 0.15);
  foam2.position.set(-F * 0.006 + 1, 0.04, t.z - 0.9 - 0.3 * Math.sin(F / 13));
  (foam.material as MeshBasicMaterial).opacity = 0.95;
};

/** R24 (visual-ref9: tufted grass on every slope): tufts over the hill, kept off the town path and the houses. */
const hillGrass = () => grassTufts(4200, (_t, r) => {
  for (let k = 0; ; k++) {
    const x = -45 + r() * 90, z = HILL.from + 1 + r() * (HILL.to - HILL.from + 4);
    const onPath = Math.abs(x - pathAt((z - 12) / 36).x - 0.8) < 2.6;
    const inHouse = HOUSES.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 4.2);
    if ((!onPath && !inHouse) || k > 20) return V(x, 0, z).setY(hillY(x, z));
  }
}, ["#3a5a34", "#5a7a44", "#8a9a5c"], 41, 0.9);
/** The hill: a displaced grass mound with the town path, from z 16 up to the crest at z 50. */
const hillMesh = () => {
  const geo = new PlaneGeometry(220, 80, 110, 40);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 52);
  const p = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getZ(i) < HILL.from ? -0.05 : hillY(p.getX(i), p.getZ(i)) - 0.02);
  geo.computeVertexNormals();
  const m = new Mesh(geo, MATS.grass());
  m.receiveShadow = true;
  m.name = "hill";
  return m;
};
/**
 * A seaside house on the hill (R25 real look, visual-ref8/9 sets are fully modelled): photo plank siding in the
 * house's colour on a stone plinth, white corner boards and eave trim, framed windows with sills (lit or dark glass),
 * a framed door with a step, a tiled roof with overhang and a chimney. Doors (local -z) face the sea.
 */
const house = (i: number, lit: boolean) => {
  const cols = ["#e8a87c", "#9ad0c0", "#f2d58a", "#c8a0d8", "#f2ece2", "#a8c8f0", "#e88a8a"];
  const col = cols[i % cols.length];
  const k = new Kit();
  const wall = M(`siding${col}`, () => toonMaterial({ map: photo("weathered_plank_siding"), repeat: [0.45, 0.45], color: col, rough: 0.8 }));
  const trim = M("houseTrim", () => toonMaterial({ map: photo("white_planks_clean"), repeat: [1, 1], color: "#f4efe6", rough: 0.6 }));
  const roof = M(`roofTiles${i % 2}`, () => toonMaterial({ map: photo(i % 2 ? "clay_roof_tiles" : "grey_roof_tiles"), repeat: [3, 2.5], rough: 0.7 }));
  const glass = lit ? MAT.winLit() : MAT.winDark();
  const w = 4 + rnd(i) * 2, h = 3 + rnd(i + 1) * 1.6, d = 4;
  k.box(MAT.darkStone(), w + 0.2, 0.4, d + 0.2, 0, 0.2, 0); // plinth
  k.box(wall, w, h - 0.3, d, 0, 0.3 + (h - 0.3) / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.box(trim, 0.16, h - 0.3, 0.16, sx * w / 2, 0.3 + (h - 0.3) / 2, sz * d / 2);
  k.box(trim, w + 0.12, 0.18, d + 0.12, 0, h - 0.09, 0); // eave board
  k.add(roof, new CylinderGeometry(d * 0.64, d * 0.64, w + 0.8, 3), 0, h + d * 0.32, 0, { rx: -Math.PI / 2, ry: Math.PI / 2 }); // a prism along x, apex up, overhanging
  k.box(MAT.color("#8a4a3a"), 0.55, 1.5, 0.55, w * 0.28, h + d * 0.55, d * 0.12); // chimney
  // A framed window on a wall: `side` 0 = front (-z), +-1 = the +-x walls.
  const win = (u: number, y: number, side: 0 | 1 | -1) => {
    const [ww, wh] = [0.95, 1.15];
    if (side === 0) {
      const z = -d / 2;
      k.box(trim, ww + 0.2, wh + 0.2, 0.08, u, y, z - 0.04);
      k.box(glass, ww, wh, 0.1, u, y, z - 0.05);
      k.box(trim, ww + 0.36, 0.08, 0.2, u, y - wh / 2 - 0.12, z - 0.1);
    } else {
      const x = side * w / 2;
      k.box(trim, 0.08, wh + 0.2, ww + 0.2, x + side * 0.04, y, u);
      k.box(glass, 0.1, wh, ww, x + side * 0.05, y, u);
      k.box(trim, 0.2, 0.08, ww + 0.36, x + side * 0.1, y - wh / 2 - 0.12, u);
    }
  };
  const wy = 0.3 + (h - 0.3) * 0.55;
  win(-w * 0.3, wy, 0);
  win(w * 0.3, wy, 0);
  win(0, wy, 1);
  win(0, wy, -1);
  // door with frame and step
  k.box(trim, 1.15, 2.2, 0.08, 0, 0.3 + 1.1, -d / 2 - 0.04);
  k.box(MAT.darkWood(), 0.9, 2.0, 0.1, 0, 0.3 + 1.0, -d / 2 - 0.06);
  k.box(MAT.darkStone(), 1.4, 0.18, 0.5, 0, 0.09, -d / 2 - 0.3);
  const g = k.build();
  g.userData.collider = `house ${i}`;
  return g;
};
export const HOUSES: [number, number][] = [[-30, 24], [-21, 22], [9, 23], [18, 26], [27, 22], [-26, 32], [-10, 30], [14, 34], [24, 36], [-18, 38], [4, 40], [-28, 42], [20, 44]];
/** Brad's fortress on the crest: a pink mansion, a stepped pyramid of sandbags, two floodlight towers, a billboard. */
export const FLOOD = [V(-14.4, 0, 46.6), V(-9.6, 0, 46.6)].map((p) => p.setY(hillY(p.x, p.z)));
export const FLOOD_HEAD = (i: number) => FLOOD[i].clone().add(V(i ? -0.6 : 0.6, 5.2, -0.5));
const fortress = () => {
  const g = new Group();
  const base = hillY(BEACH.brad.x, BEACH.brad.z);
  const k = new Kit();
  // mansion behind
  const pink = M("mansion", () => toonMaterial({ map: houseTex("#f2b8c8", true, 77), repeat: [0.6, 0.7] }));
  const mz = BEACH.brad.z + 10;
  k.box(pink, 12, 4.4, 7, BEACH.brad.x, base + 2.2, mz);
  k.box(MAT.color("#f6f0ea"), 12.6, 0.4, 7.6, BEACH.brad.x, base + 4.6, mz);
  for (const x of [-4, -1.4, 1.4, 4]) k.add(MAT.color("#f6f0ea"), new CylinderGeometry(0.26, 0.3, 4.2, 10), BEACH.brad.x + x, base + 2.1, mz - 3.9);
  // the sandbag pyramid (5 rows), top at PYRAMID_TOP
  const bag = M("burlap", () => toonMaterial({ map: photo("hessian_230"), repeat: [2, 2], color: "#d8c49a", rough: 0.95 }));
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const n = 9 - r * 2, depth = 5 - r;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < depth; j++) {
        const gb = new SphereGeometry(1, 10, 6);
        gb.scale(0.38, 0.22, 0.26);
        k.add(bag, gb, BEACH.brad.x + (i - (n - 1) / 2) * 0.62 + ((r + j) % 2) * 0.12, base + 0.2 + r * 0.42, BEACH.brad.z + (j - (depth - 1) / 2) * 0.5, { ry: rnd(i + j * 9 + r) * 0.3 });
      }
  }
  k.box(MAT.wood(), 1.6, 0.06, 1.4, BEACH.brad.x, base + PYRAMID_TOP - 0.03, BEACH.brad.z); // a plank on top to stand on
  // floodlight towers
  FLOOD.forEach((p, i) => {
    k.add(MAT.metal(), new CylinderGeometry(0.08, 0.12, 5.2, 8), p.x, p.y + 2.6, p.z);
    k.box(MAT.metal(), 1.4, 0.08, 0.08, p.x + (i ? -0.3 : 0.3), p.y + 5.2, p.z);
    const h = FLOOD_HEAD(i);
    k.box(MAT.metal(), 0.9, 0.6, 0.3, h.x, h.y, h.z + 0.18);
    k.box(MAT.glow("#fff4dc", 6), 0.8, 0.5, 0.04, h.x, h.y, h.z);
  });
  // ring light on a stand beside Brad, on the plank (at x + 0.9 its foot stood on air past the plank's edge: user 2026-11-21, 1:08)
  k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 1.32, 6), BRAD_AT.x + RING_X, BRAD_AT.y + 0.66, BRAD_AT.z - 0.2);
  k.add(MAT.metal(), new CylinderGeometry(0.16, 0.18, 0.04, 12), BRAD_AT.x + RING_X, BRAD_AT.y + 0.02, BRAD_AT.z - 0.2); // its base
  k.add(MAT.glow("#ffffff", 5), new TorusGeometry(0.28, 0.035, 6, 24), BRAD_AT.x + RING_X, BRAD_AT.y + 1.6, BRAD_AT.z - 0.2);
  const gk = k.build();
  // The plank alone is Brad's ground (its own mesh, so the guard's ray finds it under his feet).
  const plank = new Mesh(new PlaneGeometry(1.6, 1.4), MAT.wood());
  plank.rotation.x = -Math.PI / 2;
  plank.position.set(BEACH.brad.x, base + PYRAMID_TOP, BEACH.brad.z);
  g.add(gk, plank);
  const bb = plane(6.4, 2.6, unlit("billboard", billboardTex), V(BEACH.brad.x + 7.5, base + 5.2, BEACH.brad.z + 1.5), 0.15 + Math.PI);
  bb.rotation.y = Math.PI - 0.35;
  const posts = new Kit();
  for (const dx of [-2.4, 2.4]) posts.add(MAT.darkWood(), new CylinderGeometry(0.12, 0.12, 4, 6), BEACH.brad.x + 7.5 + dx * Math.cos(0.35), base + 2, BEACH.brad.z + 1.5 - dx * Math.sin(0.35) + 0.1);
  g.add(posts.build(), bb);
  return g;
};
/** The snack shack: planked hut, striped roof, hatch with a counter, menu, Grandma's photo, a giant hot dog on top. */
export const SHACK_LIGHTS = {
  string: Array.from({ length: 11 }, (_, i) => V(BEACH.shack.x - 2.0 + i * 0.4, 2.55 - 0.1 * Math.sin((i / 10) * Math.PI), BEACH.shack.z - 1.32)),
  neon: V(BEACH.shack.x + 1.15, 2.05, BEACH.shack.z - 1.27),
  fridge: V(BEACH.shack.x - 0.6, 1.0, BEACH.shack.z - 0.2),
};
const shack = () => {
  const g = new Group();
  const { x, z } = BEACH.shack, k = new Kit();
  const w = 4.4, d = 2.6, h = 2.5, fz = z - d / 2;
  // walls (front with the hatch opening 2.2 x 1.0 at y 1.05-2.05)
  k.box(MATS.shack(), w, 1.05, 0.12, x, 0.525, fz);
  k.box(MATS.shack(), w, 0.45, 0.12, x, 2.275, fz);
  k.box(MATS.shack(), 1.1, 1.0, 0.12, x - 1.65, 1.55, fz);
  k.box(MATS.shack(), 1.1, 1.0, 0.12, x + 1.65, 1.55, fz);
  k.box(MATS.shack(), w, h, 0.12, x, h / 2, z + d / 2);
  k.box(MATS.shack(), 0.12, h, d, x - w / 2, h / 2, z);
  k.box(MATS.shack(), 0.12, h, d, x + w / 2, h / 2, z);
  k.box(MAT.wood(), w + 0.1, 0.1, d, x, 0.05, z); // floor
  // counter and its awning prop
  k.box(MATS.trim(), 2.4, 0.08, 0.55, x, 1.05, fz - 0.2);
  k.box(MATS.trim(), 0.1, h + 0.1, 0.1, x - w / 2, h / 2, fz - 0.02);
  k.box(MATS.trim(), 0.1, h + 0.1, 0.1, x + w / 2, h / 2, fz - 0.02);
  // roof: striped, overhanging the front
  k.box(MATS.roof(), w + 0.9, 0.12, d + 1.4, x, h + 0.1, z - 0.35, false);
  // inside: shelves, the fridge (its glow is the practical), the camping stove on the counter
  k.box(MAT.color("#e8e8ec"), 0.8, 1.7, 0.6, x - 0.6, 0.85, z + 0.6);
  k.box(MAT.wood(), 1.4, 0.06, 0.4, x + 1.0, 1.7, z + 1.05);
  k.box(MAT.wood(), 1.4, 0.06, 0.4, x + 1.0, 1.25, z + 1.05);
  const snacks = ["#e8402a", "#f2c23a", "#3ab048", "#2a8ad8", "#e85a8a", "#ff8a2a", "#8a5ad8"];
  for (let i = 0; i < 10; i++) for (const y of [1.25, 1.7]) k.box(MAT.color(snacks[(i + (y > 1.5 ? 3 : 0)) % snacks.length]), 0.1, 0.2 + 0.06 * rnd(i + y * 10), 0.08, x + 0.4 + i * 0.13, y + 0.13, z + 1.05);
  k.box(MAT.color("#3a3a40"), 0.36, 0.1, 0.28, x + 0.55, 1.14, fz - 0.15); // stove
  // giant hot dog on the roof
  k.add(MAT.color("#e0a050"), new CylinderGeometry(0.42, 0.42, 2.6, 14), x, h + 0.7, z - 0.2, { rz: Math.PI / 2 });
  k.add(MAT.color("#c8402a"), new CylinderGeometry(0.28, 0.28, 3.2, 14), x, h + 0.95, z - 0.2, { rz: Math.PI / 2 });
  k.add(MAT.color("#c8402a"), new SphereGeometry(0.28, 12, 8), x - 1.6, h + 0.95, z - 0.2);
  k.add(MAT.color("#c8402a"), new SphereGeometry(0.28, 12, 8), x + 1.6, h + 0.95, z - 0.2);
  k.add(MAT.color("#ffd23a"), new TorusGeometry(0.12, 0.04, 5, 10, Math.PI), x - 0.6, h + 1.22, z - 0.2, { ry: Math.PI / 2 });
  k.add(MAT.color("#ffd23a"), new TorusGeometry(0.12, 0.04, 5, 10, Math.PI), x + 0.1, h + 1.22, z - 0.2, { ry: Math.PI / 2, rx: Math.PI });
  k.add(MAT.color("#ffd23a"), new TorusGeometry(0.12, 0.04, 5, 10, Math.PI), x + 0.8, h + 1.22, z - 0.2, { ry: Math.PI / 2 });
  // string-light wire
  k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.01, 0.01, 4.2, 4), x, 2.52, fz - 0.06, { rz: Math.PI / 2 });
  // surfboards leaning on the side wall, a cooler
  k.add(MAT.color("#f2c23a"), new CylinderGeometry(0.28, 0.28, 2.2, 14), x + w / 2 + 0.25, 1.1, z - 0.4, { rz: -0.12 });
  k.add(MAT.color("#3ab0c8"), new CylinderGeometry(0.26, 0.26, 2.0, 14), x + w / 2 + 0.25, 1.0, z + 0.3, { rz: -0.1 });
  k.box(MAT.color("#3a7ad8"), 0.7, 0.45, 0.42, x + w / 2 + 0.7, 0.225, z + 1.0);
  k.box(MAT.color("#f2ece2"), 0.74, 0.08, 0.46, x + w / 2 + 0.7, 0.47, z + 1.0);
  const body = k.build();
  body.userData.collider = "shack";
  g.add(body);
  // signs and pictures (unlit faces)
  // Faces toward the sea (-z): planes face +z, so turn them round.
  // R26 line 4: Brad's sale notice on the right front panel (planted from the first shot, read on "buys").
  g.add(plane(0.95, 0.62, unlit("soldSign", () => signBoard(["SOLD TO BRAD", "TOMORROW!"], "#f2ece2", "#c8282a")), SOLD_SIGN, Math.PI));
  // R26 line 22: the popcorn sells out (Video.tsx shows it from the last line on).
  const sold = plane(0.6, 0.3, unlit("soldOut", () => signBoard(["SOLD OUT"], "#ffd23a", "#c8282a")), V(x - 0.75, 1.32, fz - 0.47), Math.PI);
  sold.name = "soldOut";
  g.add(sold);
  g.add(plane(3.2, 0.94, unlit("shackSign", shackSignTex), V(x, 2.88, fz - 0.95), Math.PI));
  const board = new Kit();
  board.box(MAT.wood(), 3.3, 1.02, 0.06, x, 2.88, fz - 0.91);
  g.add(board.build());
  g.add(plane(0.5, 0.7, unlit("menu", menuTex), V(x - 1.62, 1.6, fz - 0.07), Math.PI));
  g.add(plane(0.36, 0.45, unlit("grandma", grandmaTex), V(x + 1.55, 1.55, fz - 0.07), Math.PI));
  // fridge door panel (lit/unlit swapped per frame), string bulbs, neon
  const fridge = new Mesh(new PlaneGeometry(0.7, 1.5), MAT.glow("#d8f0ff", 2.2));
  fridge.position.set(x - 0.6, 0.85, z + 0.29);
  fridge.rotation.y = Math.PI;
  fridge.name = "fridge";
  g.add(fridge);
  const bulbs = new Group();
  bulbs.name = "bulbs";
  SHACK_LIGHTS.string.forEach((p, i) => {
    const b = new Mesh(new SphereGeometry(0.06, 8, 6), MAT.glow(["#ffd27a", "#ff8a8a", "#8ad0ff", "#a8f08a"][i % 4], 4));
    b.position.copy(p);
    bulbs.add(b);
  });
  g.add(bulbs);
  const neon = new Mesh(new PlaneGeometry(1.1, 0.43), new MeshBasicMaterial({ map: neonTex(true), toneMapped: false }));
  neon.position.copy(SHACK_LIGHTS.neon);
  neon.rotation.y = Math.PI;
  neon.name = "neon";
  neon.userData.on = neonTex(true);
  neon.userData.off = neonTex(false);
  g.add(neon);
  return g;
};
/** The shack's practicals at frame F (lights go off one by one on line 10, the next night they are back on). */
export const shackLights = (o: Object3D, s: { fridge: boolean; bulbs: boolean; neon: number }) => {
  const fr = o.getObjectByName("fridge") as Mesh;
  fr.material = s.fridge ? MAT.glow("#d8f0ff", 2.2) : MAT.color("#9aa0aa");
  o.getObjectByName("bulbs")!.children.forEach((b, i) => ((b as Mesh).material = s.bulbs ? MAT.glow(["#ffd27a", "#ff8a8a", "#8ad0ff", "#a8f08a"][i % 4], 4) : MAT.color("#6a6a70")));
  const n = o.getObjectByName("neon") as Mesh;
  (n.material as MeshBasicMaterial).map = s.neon >= 1 ? n.userData.on : n.userData.off;
  (n.material as MeshBasicMaterial).color.setScalar(s.neon >= 1 ? 1.4 : s.neon > 0 ? 0.6 : 0.5);
  n.rotation.z = s.neon > 0 && s.neon < 1 ? 0 : s.neon === 0 ? -0.18 : 0; // the neon droops when it dies
};
/** The pier with a lamp at its end, from the sand out over the water. */
const pier = () => {
  const k = new Kit(), x = BEACH.pierX;
  k.box(MATS.boardwalk(), 2.2, 0.14, 20, x, 1.0, -7);
  for (let z = 2; z >= -16; z -= 3) for (const dx of [-1, 1]) k.add(MAT.darkWood(), new CylinderGeometry(0.12, 0.12, 2.2, 6), x + dx, 0.2, z);
  for (let z = 2.5; z >= -16.5; z -= 1.5) for (const dx of [-1.05, 1.05]) k.box(MAT.darkWood(), 0.08, 0.9, 0.08, x + dx, 1.5, z);
  for (const dx of [-1.05, 1.05]) k.box(MAT.darkWood(), 0.08, 0.08, 19, x + dx, 1.95, -7);
  const g = k.build();
  g.userData.collider = "pier";
  return g;
};
export const PIER_END = V(BEACH.pierX, 1.07, -15.2);
/** Lifeguard tower: red and white, a ladder, a flag. */
const tower = () => {
  const k = new Kit(), { x, z } = BEACH.tower;
  for (const [dx, dz] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) k.add(MAT.color("#f2ece2"), new CylinderGeometry(0.07, 0.07, 2.2, 6), x + dx, 1.1, z + dz);
  k.box(M("towerHut", () => toonMaterial({ map: stripeTex(["#d83a2a", "#f2ece2"], 6, false), repeat: [1, 1] })), 1.8, 1.3, 1.8, x, 2.85, z);
  k.add(MAT.color("#d83a2a"), new ConeGeometry(1.5, 0.7, 4), x, 3.85, z, { ry: Math.PI / 4 });
  for (let i = 0; i < 7; i++) k.box(MAT.color("#f2ece2"), 0.7, 0.05, 0.12, x, 0.3 + i * 0.3, z - 1.2 + i * 0.06);
  k.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 1.3, 4), x + 0.8, 4.5, z);
  k.box(MAT.color("#f2c23a"), 0.5, 0.32, 0.02, x + 1.06, 4.95, z);
  const g = k.build();
  g.userData.collider = "tower";
  return g;
};
/** Beach dressing: closed umbrellas, a rowboat, a bin, buoys, a NO SWIMMING sign, dune grass, the boardwalk. */
const dressing = (lit: boolean) => {
  const g = new Group(), k = new Kit();
  const umb = [["#3ab0c8", -7.5, 2.5], ["#f2c23a", 8.5, 3.6], ["#e85a8a", 11.5, 1.8]] as const;
  for (const [c, x, z] of umb) {
    k.add(MAT.color("#f2ece2"), new CylinderGeometry(0.04, 0.04, 2.4, 6), x, 1.2, z);
    k.add(MAT.color(c), new ConeGeometry(0.32, 1.5, 8), x, 1.75, z);
  }
  // rowboat upside-down on the sand
  const hull = new SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  hull.scale(0.8, 0.5, 1.9);
  k.add(MAT.color("#2a6ad8"), hull, -7.6, 0.0, 1.6, { ry: 0.5 });
  k.box(MAT.color("#f2ece2"), 0.06, 0.1, 3.4, -7.6, 0.45, 1.6);
  // bin and its lid
  k.add(MAT.color("#2a8a5a"), new CylinderGeometry(0.32, 0.28, 0.9, 10), 9.6, 0.45, 7.4);
  // dune grass tufts
  for (let i = 0; i < 70; i++) {
    const x = -40 + rnd(i) * 80, z = 11 + rnd(i + 3) * 5;
    if (x > -5 && x < 6) continue; // the beach entrance: a 11 m gap the path and the runners use
    k.add(MAT.color(i % 2 ? "#6a8a50" : "#8aa060"), new ConeGeometry(0.22, 0.7 + rnd(i + 5) * 0.5, 5), x, 0.35, z);
  }
  // dune ridge
  for (let i = 0; i < 18; i++) {
    const s = new SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    s.scale(3.2, 1.0 + rnd(i) * 0.6, 2.2);
    const x = -42 + i * 5;
    if (x + 3.2 > -5 && x - 3.2 < 6) continue;
    k.add(MAT.color("#c8ae84"), s, x, -0.05, 14.5 + rnd(i + 8));
  }
  const body = k.build();
  body.userData.collider = "beach props";
  // boardwalk from the sand to the dune path: flush planks (2 cm), the town runs over it
  const bw = new Kit();
  bw.box(MATS.boardwalk(), 2.2, 0.016, 8, 0.6, 0.0, 13);
  g.add(body, bw.build());
  // buoys bobbing far out (fixed)
  const bk = new Kit();
  for (let i = 0; i < 5; i++) bk.add(MAT.color(i % 2 ? "#e85a2a" : "#f2ece2"), new SphereGeometry(0.3, 10, 6), -20 + i * 9, 0.15, -32 - (i % 2) * 6);
  g.add(bk.build());
  const sign = plane(1.3, 0.65, unlit("noSwim", () => signBoard(["NO SWIMMING", "AFTER DARK"], "#f2ece2", "#c8282a")), V(-6.0, 1.7, 0.9));
  const signPost = new Kit();
  signPost.add(MAT.darkWood(), new CylinderGeometry(0.05, 0.05, 1.8, 6), -6.0, 0.9, 0.95);
  const sp = signPost.build();
  sp.userData.collider = "sign";
  g.add(sp, sign);
  const lp = lampPost(lit);
  lp.position.copy(BEACH.lamp);
  lp.userData.collider = "lamp";
  g.add(lp);
  return g;
};
export const LAMP_GLOW = BEACH.lamp.clone().add(V(0.55, 3.55, 0));
export const LANTERN_AT = V(1.3, 0, 3.75);
/** Line 4: the sale notice's centre on the shack's right front panel (front wall face at z 6.24). */
export const SOLD_SIGN = V(BEACH.shack.x + 1.65, 1.55, BEACH.shack.z - 1.3 - 0.08);
/** Line 4: the last unsold hot dog on the stove, a cobweb strung over it (origin on the stove top). */
export const cobwebDog = () => {
  const g = new Group(), k = new Kit();
  k.add(MAT.color("#e0a050"), new CapsuleGeometry(0.034, 0.12, 4, 10), 0, 0.034, 0, { rz: Math.PI / 2 });
  k.add(MAT.color("#a8402a"), new CapsuleGeometry(0.02, 0.16, 4, 10), 0, 0.062, 0, { rz: Math.PI / 2 });
  g.add(k.build());
  const web = canvasTex(256, 196, (c) => {
    c.strokeStyle = "rgba(240,244,255,0.9)"; c.lineWidth = 1.6;
    const cx = 128, cy = 70;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 160, cy + Math.sin(a) * 130); c.stroke(); }
    for (let r = 14; r < 150; r += 16) { c.beginPath(); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI * 2, rr = r * (0.9 + 0.1 * Math.sin(i * 2.3)); c[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82); } c.stroke(); }
    c.fillStyle = "#1c1210"; c.beginPath(); c.arc(cx, cy, 6, 0, 7); c.fill(); // the spider who moved in
    c.strokeStyle = "#1c1210"; c.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 11); c.stroke(); }
  });
  const m = new Mesh(new PlaneGeometry(0.3, 0.23), new MeshBasicMaterial({ map: web, transparent: true, depthWrite: false, side: DoubleSide }));
  m.position.set(0, 0.11, -0.035);
  g.add(m);
  return g;
};
/** The promenade along the dune top: more lamps (town lights: off on "darker") with festoon bulbs strung between. */
export const PROM_LAMPS = [V(-12, 0, 10.2), V(9.0, 0, 9.8), V(13.5, 0, 10.0)];
export const PROM_GLOWS = PROM_LAMPS.map((p) => p.clone().add(V(0.55, 3.55, 0)));
const FESTOON: [Vector3, Vector3][] = [[V(-11.6, 3.9, 10.2), V(-5.2, 3.9, 9.6)], [V(9.4, 3.9, 9.8), V(13.9, 3.9, 10.0)], [V(-0.9, 3.5, 11), V(3.4, 3.5, 11)]];
export const FESTOON_BULBS = FESTOON.flatMap(([a, b]) => {
  const n = Math.round(a.distanceTo(b) / 0.45);
  return Array.from({ length: n + 1 }, (_, i) => a.clone().lerp(b, i / n).add(V(0, -0.45 * Math.sin((i / n) * Math.PI), 0)));
});
const BULB_COLS = ["#ffd27a", "#ff9a6a", "#ffe8a0", "#ff7a8a", "#a8f08a", "#8ad0ff"];
/** The bulbs (named "festoon": Video.tsx lights or darkens them) and the arch over the boardwalk. */
export const promenade = (lit: boolean) => {
  const g = new Group();
  PROM_LAMPS.forEach((p) => { const l = lampPost(lit); l.position.copy(p); l.userData.collider = "lamp"; g.add(l); });
  const bulbs = new Kit();
  FESTOON_BULBS.forEach((p, i) => bulbs.add(lit ? MAT.glow(BULB_COLS[i % BULB_COLS.length], 3.2) : MAT.color("#5a5a66"), new SphereGeometry(0.07, 8, 6), p.x, p.y, p.z));
  const wire = new Kit();
  FESTOON_BULBS.forEach((p, i) => { if (i % 2 === 0) wire.add(MAT.color("#2a2a30"), new SphereGeometry(0.015, 4, 3), p.x, p.y + 0.06, p.z); });
  const arch = new Kit();
  for (const x of [-0.9, 3.4]) arch.add(MAT.color("#f2ece2"), new CylinderGeometry(0.09, 0.11, 3.6, 8), x, 1.8, 11);
  arch.box(MAT.color("#2a7a8a"), 4.6, 0.12, 0.12, 1.25, 3.55, 11);
  const archBody = arch.build();
  archBody.userData.collider = "arch";
  const sign = plane(2.6, 0.62, unlit("coveSign", () => signBoard(["SANDY COVE"], "#f2c23a", "#2a2a5a")), V(1.25, 3.95, 10.96), Math.PI);
  g.add(bulbs.build(), wire.build(), archBody, sign);
  return g;
};
/** What the town dropped running up the hill (shown from line 1's cut on): a beach ball, a bucket and spade, a
 * towel, flip-flops, a sandcastle, a radio, a teddy. Decor, not colliders: nobody walks over these spots. */
export const clutter = () => {
  const k = new Kit();
  const ball = (x: number, z: number) => ["#e8402a", "#f2ece2", "#2a8ad8", "#f2c23a"].forEach((c, i) => k.add(MAT.color(c), new SphereGeometry(0.2, 10, 8, (i * Math.PI) / 2, Math.PI / 2), x, 0.2, z));
  ball(-1.3, 5.7);
  k.add(MAT.color("#3ab048"), new CylinderGeometry(0.13, 0.1, 0.22, 10), 2.0, 0.11, 5.2);
  k.box(MAT.color("#f2c23a"), 0.05, 0.02, 0.32, 2.2, 0.03, 5.0);
  k.box(M("beachTowel", () => toonMaterial({ map: stripeTex(["#e85a8a", "#f2ece2", "#3ab0c8"], 7, false), repeat: [1, 1] })), 0.8, 0.012, 1.6, -2.3, 0.006, 6.6, false);
  k.box(MAT.color("#ff7a3a"), 0.11, 0.02, 0.26, 0.9, 0.01, 6.9);
  k.box(MAT.color("#ff7a3a"), 0.11, 0.02, 0.26, 1.08, 0.01, 7.05);
  // a sandcastle with three towers and a paper flag
  k.add(MAT.color("#d8bf8e"), new CylinderGeometry(0.34, 0.4, 0.22, 10), -2.9, 0.11, 3.5);
  for (const [dx, dz] of [[-0.18, 0.1], [0.2, 0.08], [0, -0.18]]) k.add(MAT.color("#d8bf8e"), new CylinderGeometry(0.09, 0.11, 0.26, 8), -2.9 + dx, 0.35, 3.5 + dz);
  k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.006, 0.006, 0.22, 4), -2.9, 0.58, 3.32);
  k.box(MAT.color("#e8402a"), 0.1, 0.06, 0.005, -2.85, 0.66, 3.32);
  // a boombox
  k.box(MAT.color("#c83a8a"), 0.42, 0.22, 0.14, 2.6, 0.11, 3.0);
  k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.06, 0.06, 0.02, 10), 2.48, 0.11, 2.93, { rx: Math.PI / 2 });
  k.add(MAT.color("#2a2a30"), new CylinderGeometry(0.06, 0.06, 0.02, 10), 2.72, 0.11, 2.93, { rx: Math.PI / 2 });
  // a teddy face-down in the sand
  const body = new SphereGeometry(0.14, 8, 6);
  body.scale(1, 0.6, 1.3);
  k.add(MAT.color("#b0784a"), body, -0.6, 0.08, 7.6);
  k.add(MAT.color("#b0784a"), new SphereGeometry(0.1, 8, 6), -0.6, 0.08, 7.35);
  return k.build();
};
/** R26: modelled CC0 props (Poly Haven, kit build/models.ts) round the shack, where the box-built clutter read as blocks. */
export const shackProps = () => {
  const g = new Group();
  const put = (o: Object3D, x: number, y: number, z: number, ry = 0) => (o.position.set(x, y, z), (o.rotation.y = ry), g.add(o));
  // Clear of line 1's runner lanes (x -4.7..2.6 from the sea to the path) and of the surfboards / beach props.
  put(model("wooden_crate_01", { collider: "crate" }), 3.3, 0, 5.85, 0.1);
  put(model("wooden_crate_01", { collider: "crate" }), 3.32, 0.35, 5.87, -0.2);
  put(model("lifebuoy", { collider: false }), 3.35, 1.12, 6.17, Math.PI); // hangs on the wall: dressing, not a prop that rests
  put(model("wooden_barrels_01", { part: "wooden_barrels_01_barrel01", collider: "barrel" }), 8.05, 0, 6.25, 0.6);
  put(model("wooden_picnic_table", { collider: "picnic table" }), 11.5, 0, 5.6, 1.4);
  put(model("wooden_bucket_01", { collider: "bucket" }), 4.12, 0, 5.85, 0.4);
  [[4.2, 3.2, 0.3], [3.6, 1.8, 2.1], [5.1, 2.6, 4.0]].forEach(([x, z, r]) => put(model("lambis_shell", { scale: 1.6, collider: "shell" }), x, 0, z, r));
  return g;
};
/** The whole beach world. `lit` = the town's windows (they go dark on "darker"). */
export const beach = (lit: boolean) => {
  const g = new Group();
  const sand = new Mesh(new PlaneGeometry(700, 120), MATS.sand());
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, -20);
  sand.receiveShadow = true;
  sand.name = "sand";
  const junk = clutter();
  junk.name = "clutter";
  g.add(sand, seaPlane(), hillMesh(), shack(), pier(), tower(), dressing(lit), fortress(), promenade(lit), junk, shackProps());
  g.add(...hillGrass());
  HOUSES.forEach(([x, z], i) => {
    const h = house(i, lit);
    h.position.set(x, hillY(x, z) - 0.3, z);
    h.rotation.y = (rnd(i) - 0.5) * 0.4; // doors (local -z) face the sea
    g.add(h);
  });
  return g;
};

// ================================================================== the bedroom (analogy)
export const BED = { at: V(0, 0, 0), sheetY: 0.62, w: 2.2, l: 2.6 };
const wallpaperTex = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#e8d8b0"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#c86a5a" : "#5a8ac8"; const cx = x * 64 + 32, cy = y * 64 + 32; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill(); g.fillStyle = "#7aa060"; g.beginPath(); g.ellipse(cx + 12, cy + 4, 7, 3, 0.5, 0, 7); g.fill(); }
    for (let k = 0; k < 2000; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(80,60,40,0.08)"; g.fillRect(rnd(k + 1) * 512, rnd(k + 2) * 512, 2, 2); }
  });
const sheetTex = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#3a6ad8"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 64) for (let x = 0; x < 512; x += 64) { g.fillStyle = "#f2ece2"; g.beginPath(); g.arc(x + 32 + ((y / 64) % 2) * 32, y + 32, 9, 0, 7); g.fill(); g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(x + ((y / 64) % 2) * 32, y, 5, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(20,30,90,0.25)"; g.lineWidth = 4; for (let k = 0; k < 10; k++) { g.beginPath(); g.moveTo(rnd(k) * 512, 0); g.bezierCurveTo(rnd(k + 1) * 512, 170, rnd(k + 2) * 512, 340, rnd(k + 3) * 512, 512); g.stroke(); }
  });
/** The bed's sheet: a grid whose height Video.tsx sets per frame (`setSheet`). */
export const sheetMesh = () => {
  const geo = new PlaneGeometry(BED.w + 0.3, BED.l, 40, 40);
  geo.rotateX(-Math.PI / 2);
  const m = new Mesh(geo, M("sheet", () => toonMaterial({ map: sheetTex(), repeat: [1, 1] })));
  m.position.set(BED.at.x, BED.sheetY, BED.at.z);
  m.name = "sheet";
  m.userData.base = Float32Array.from((geo.attributes.position as BufferAttribute).array);
  m.castShadow = m.receiveShadow = true;
  return m;
};
/** The hump: height h (m) at the sheet's centre, a soft bell; the edges hang over the sides. */
export const sheetHeight = (x: number, z: number, h: number) => h * Math.exp(-(x * x + z * z) / 0.28);
export const setSheet = (m: Mesh, h: number) => {
  const p = m.geometry.attributes.position as BufferAttribute, base = m.userData.base as Float32Array;
  for (let i = 0; i < p.count; i++) {
    const x = base[i * 3], z = base[i * 3 + 2];
    const over = Math.max(Math.abs(x) - BED.w / 2, 0);
    p.setY(i, sheetHeight(x, z, h) - over * 2.2);
  }
  p.needsUpdate = true;
  m.geometry.computeVertexNormals();
};
export const bedroom = () => {
  const g = new Group(), k = new Kit();
  const floor = M("bedFloor", () => toonMaterial({ map: planks("#a07a52"), repeat: [1, 1] }));
  k.box(floor, 8, 0.1, 8, 0, -0.05, 0);
  const wall = M("bedWall", () => toonMaterial({ map: wallpaperTex(), repeat: [0.5, 0.5] }));
  k.box(wall, 8, 4, 0.1, 0, 2, -2.2);
  k.box(wall, 0.1, 4, 8, -3.2, 2, 0);
  k.box(wall, 0.1, 4, 8, 3.4, 2, 0);
  // bed frame, mattress, pillows, headboard
  k.box(MAT.wood(), BED.w + 0.2, 0.32, BED.l + 0.2, 0, 0.26, 0);
  k.box(MAT.color("#f2ece2"), BED.w, 0.22, BED.l, 0, 0.5, 0);
  k.box(MAT.wood(), BED.w + 0.3, 1.2, 0.1, 0, 0.6, -BED.l / 2 - 0.1);
  k.box(MAT.color("#f6f0e6"), 0.7, 0.16, 0.42, -0.5, 0.7, -0.95);
  k.box(MAT.color("#f6f0e6"), 0.7, 0.16, 0.42, 0.5, 0.7, -0.95);
  // bedside table, lamp, books, a rug, a poster of the moon (the gag's echo)
  k.box(MAT.darkWood(), 0.6, 0.6, 0.5, 1.75, 0.3, -1.2);
  k.add(MAT.color("#c8402a"), new CylinderGeometry(0.06, 0.1, 0.36, 10), 1.75, 0.78, -1.2);
  k.add(M("lampShadeBed", () => toonMaterial({ color: "#ffe2a0", emissive: ["#ffc27a", 2.2] })), new CylinderGeometry(0.14, 0.24, 0.26, 12, 1, true), 1.75, 1.06, -1.2);
  k.box(MAT.color("#2a8a5a"), 0.3, 0.06, 0.22, 1.7, 0.63, -1.05);
  k.box(MAT.color("#f2c23a"), 0.28, 0.06, 0.2, 1.72, 0.69, -1.05);
  k.box(MAT.color("#c86a8a"), 2.6, 0.02, 1.4, 0, 0.01, 2.0);
  const body = k.build();
  body.userData.collider = "bedroom";
  g.add(body);
  const poster = plane(1.0, 1.3, unlit("moonPoster", () => canvasTex(256, 330, (c) => {
    c.fillStyle = "#2c3a80"; c.fillRect(0, 0, 256, 330); // unlit: #1a2050 graded to black (pixel QA CRUSH f1398)
    c.fillStyle = "#fff4d0"; c.beginPath(); c.arc(128, 140, 80, 0, 7); c.fill();
    c.fillStyle = "rgba(160,150,120,0.5)"; [[100, 120, 16], [150, 170, 22], [140, 100, 10]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
  })), V(-1.6, 2.2, -2.14));
  g.add(poster, sheetMesh());
  return g;
};
export const BED_LAMP = V(1.75, 1.06, -1.2);

// ================================================================== story props (origin = grip point for held ones)
/** The lawn chair, open: aluminium frame, striped seat and back. Faces -z; a seated card stands SEAT_AHEAD in front of it. */
export const lawnChair = () => {
  const k = new Kit(), al = MAT.color("#c8ccd4");
  const stripes = M("chairStripes", () => toonMaterial({ map: stripeTex(["#e8582c", "#f2ece2", "#2a9ab0"], 6), repeat: [1, 1] }));
  for (const dx of [-0.32, 0.32]) {
    k.add(al, new CylinderGeometry(0.02, 0.02, 0.6, 5), dx, 0.2, 0.18, { rx: 0.6 });
    k.add(al, new CylinderGeometry(0.02, 0.02, 0.6, 5), dx, 0.2, -0.18, { rx: -0.6 });
    k.add(al, new CylinderGeometry(0.02, 0.02, 0.5, 5), dx, 0.62, 0.05, { rx: Math.PI / 2 }); // armrest
  }
  k.box(stripes, 0.62, 0.03, 0.5, 0, 0.36, 0);
  k.box(stripes, 0.62, 0.62, 0.03, 0, 0.66, 0.27, true);
  return k.build(); // not a collider: a moving prop the seated card sits in
};
/** The folded chair carried under the arm (line 1): a flat bundle of frame and stripes. Origin at the grip. */
export const foldedChair = () => {
  const k = new Kit();
  const stripes = M("chairStripes", () => toonMaterial({ map: stripeTex(["#e8582c", "#f2ece2", "#2a9ab0"], 6), repeat: [1, 1] }));
  k.box(stripes, 0.6, 0.9, 0.05, 0, -0.1, 0);
  k.add(MAT.color("#c8ccd4"), new CylinderGeometry(0.02, 0.02, 1.0, 5), -0.3, -0.1, 0.03);
  k.add(MAT.color("#c8ccd4"), new CylinderGeometry(0.02, 0.02, 1.0, 5), 0.3, -0.1, 0.03);
  return k.build();
};
/** The stick: driftwood with a red rag tied on top. Origin at the grip, STICK_GRIP above its foot (near the top, so
 * the rag sits at the hand, never over the face: R1 review, the rag covered your face at f840-915). */
export const STICK_GRIP = 1.28;
export const stick = () => {
  const k = new Kit();
  k.add(MAT.color("#8a6a4a"), new CylinderGeometry(0.025, 0.035, 1.5, 6), 0, 0.75 - STICK_GRIP, 0, { rz: 0.04 });
  k.box(MAT.color("#d83a2a"), 0.22, 0.13, 0.01, 0.12, 1.38 - STICK_GRIP, 0);
  return k.build();
};
/** Popcorn bucket: red and white stripes, popcorn heaped on top. Origin at the grip (its middle). */
export const popcornBucket = () => {
  const k = new Kit();
  k.add(M("popStripes", () => toonMaterial({ map: stripeTex(["#d8282a", "#f6f0e6"], 8), repeat: [1, 1] })), new CylinderGeometry(0.17, 0.12, 0.34, 14, 1, true), 0, 0, 0);
  k.add(MAT.color("#f6f0e6"), new CylinderGeometry(0.12, 0.12, 0.01, 12), 0, -0.17, 0);
  for (let i = 0; i < 26; i++) { const a = rnd(i) * 7, r = rnd(i + 1) * 0.15; k.add(MAT.color(i % 5 ? "#fff6d8" : "#f2d27a"), new SphereGeometry(0.035 + rnd(i + 2) * 0.02, 6, 5), Math.cos(a) * r, 0.17 + 0.05 * (1 - r / 0.15) + rnd(i + 3) * 0.03, Math.sin(a) * r); }
  return k.build();
};
/** One popcorn kernel (popping in the pan, into your mouth). */
export const kernel = () => { const k = new Kit(); k.add(MAT.color("#fff6d8"), new SphereGeometry(0.02, 6, 5), 0, 0, 0); return k.build(); };
/** The pan on the stove (line 11). Origin at its base. */
export const pan = () => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.17, 0.14, 0.08, 14, 1, true), 0, 0.04, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.14, 0.14, 0.01, 14), 0, 0.005, 0);
  k.box(MAT.color("#2a2a30"), 0.3, 0.03, 0.04, 0.3, 0.06, 0);
  for (let i = 0; i < 18; i++) { const a = rnd(i + 40) * 7, r = rnd(i + 41) * 0.12; k.add(MAT.color("#fff6d8"), new SphereGeometry(0.018, 6, 5), Math.cos(a) * r, 0.03, Math.sin(a) * r); }
  return k.build();
};
/** Mia's goldfish in its bag. Origin at the knot (the grip). */
export const fishBag = () => {
  const g = new Group();
  const bag = new Mesh(new SphereGeometry(0.15, 14, 10), new MeshBasicMaterial({ color: "#a8d8ff", transparent: true, opacity: 0.35, depthWrite: false }));
  bag.position.y = -0.2;
  bag.scale.set(1, 1.1, 1);
  g.add(bag);
  const k = new Kit();
  k.add(MAT.color("#d8eaff"), new ConeGeometry(0.035, 0.08, 6), 0, -0.04, 0, { rx: Math.PI });
  const fish = new SphereGeometry(1, 10, 8);
  fish.scale(0.07, 0.05, 0.04);
  k.add(MAT.color("#ff8a2a"), fish, 0, -0.21, 0.02);
  k.add(MAT.color("#ff8a2a"), new ConeGeometry(0.04, 0.06, 4), 0.085, -0.21, 0.02, { rz: Math.PI / 2 });
  k.add(MAT.color("#141014"), new SphereGeometry(0.012, 6, 5), -0.04, -0.2, 0.06);
  k.add(MAT.color("#141014"), new SphereGeometry(0.012, 6, 5), -0.01, -0.2, 0.062);
  g.add(k.build());
  return g;
};
/** A phone held up showing the alert: NO MOON = MEGA WAVE?! Origin at the grip (its bottom edge). Screen faces +z. */
export const alertPhone = (i: number) => {
  const k = new Kit();
  k.box(MAT.color(["#2a2a30", "#e85a8a", "#3a7ad8", "#f2c23a"][i % 4]), 0.085, 0.17, 0.012, 0, 0.085, 0);
  const g = k.build();
  const scr = plane(0.072, 0.15, unlit("alertScreen", () => canvasTex(160, 330, (c) => {
    c.fillStyle = "#0e1430"; c.fillRect(0, 0, 160, 330);
    c.fillStyle = "#e0242a"; c.fillRect(0, 0, 160, 60);
    c.fillStyle = "#fbf7ee"; c.font = `900 34px "Nunito", sans-serif`; c.textAlign = "center"; c.fillText("ALERT", 80, 44);
    c.fillStyle = "#3a8ae8"; c.beginPath(); c.moveTo(10, 220); c.quadraticCurveTo(40, 90, 120, 110); c.quadraticCurveTo(70, 130, 80, 180); c.quadraticCurveTo(110, 220, 150, 220); c.fill();
    c.fillStyle = "#fbf7ee"; c.beginPath(); c.arc(100, 120, 12, 0, 7); c.fill();
    c.fillStyle = "#ffd23a"; c.font = `900 21px "Nunito", sans-serif`; c.fillText("NO MOON =", 80, 262); c.fillText("MEGA WAVE?!", 80, 298);
  }), false, "#ffffff"), V(0, 0.085, 0.007));
  g.add(scr);
  g.userData.screen = scr;
  return g;
};
/** Brad's selfie stick: a pole with the phone on its tip, its screen LIVE 12K toward Brad's lens (+z). Origin at the grip. */
export const selfieStick = () => {
  const k = new Kit();
  k.add(MAT.metal(), new CylinderGeometry(0.012, 0.016, 1.0, 6), 0, 0.5, 0);
  k.box(MAT.color("#2a2a30"), 0.16, 0.08, 0.012, 0, 1.04, 0);
  const g = k.build();
  const scr = plane(0.15, 0.07, unlit("liveScreen", () => canvasTex(300, 140, (c) => {
    c.fillStyle = "#1a1a24"; c.fillRect(0, 0, 300, 140);
    c.fillStyle = "#e0242a"; c.fillRect(10, 10, 110, 50); c.fillStyle = "#fbf7ee"; c.font = `900 40px "Nunito", sans-serif`; c.fillText("LIVE", 20, 50);
    c.fillStyle = "#fbf7ee"; c.font = `900 52px "Nunito", sans-serif`; c.fillText("12K", 150, 56);
    c.fillStyle = "#ffd23a"; c.font = `900 38px "Nunito", sans-serif`; c.fillText("LOL LOL LOL", 14, 120);
  }), false, "#ffffff"), V(0, 1.04, 0.008));
  g.add(scr);
  return g;
};
/** A crab: red shell, eyes on stalks, legs. Origin at its feet. */
export const crab = () => {
  const k = new Kit(), red = MAT.color("#e0402a");
  const shell = new SphereGeometry(1, 12, 8);
  shell.scale(0.16, 0.08, 0.12);
  k.add(red, shell, 0, 0.1, 0);
  for (const s of [-1, 1]) {
    k.add(red, new CylinderGeometry(0.012, 0.012, 0.08, 4), s * 0.05, 0.19, -0.06);
    k.add(MAT.color("#f6f0e6"), new SphereGeometry(0.025, 6, 5), s * 0.05, 0.24, -0.06);
    k.add(red, new SphereGeometry(0.05, 6, 5), s * 0.2, 0.1, -0.1);
    for (let i = 0; i < 3; i++) k.add(red, new CylinderGeometry(0.01, 0.01, 0.12, 4), s * 0.16, 0.05, -0.04 + i * 0.05, { rz: s * 1.0 });
  }
  return k.build();
};
/** The dog on the pier (line 2): a brown toy dog; its head (child "head") tips up to howl, then turns to the lens. */
export const dog = () => {
  const g = new Group(), k = new Kit(), fur = MAT.color("#b07a4a"), dark = MAT.color("#5a3a24");
  const body = new SphereGeometry(1, 12, 8);
  body.scale(0.2, 0.17, 0.34);
  k.add(fur, body, 0, 0.36, 0);
  for (const [x, z] of [[-0.11, -0.2], [0.11, -0.2], [-0.11, 0.2], [0.11, 0.2]]) k.add(fur, new CylinderGeometry(0.04, 0.04, 0.26, 6), x, 0.13, z);
  k.add(dark, new CylinderGeometry(0.025, 0.035, 0.26, 5), 0, 0.5, 0.34, { rx: -0.8 });
  g.add(k.build());
  const head = new Group();
  head.name = "head";
  head.position.set(0, 0.52, -0.3);
  const hk = new Kit();
  hk.add(fur, new SphereGeometry(0.15, 12, 8), 0, 0.06, 0);
  const snout = new SphereGeometry(1, 10, 6);
  snout.scale(0.08, 0.07, 0.1);
  hk.add(fur, snout, 0, 0.02, -0.14);
  hk.add(MAT.color("#141014"), new SphereGeometry(0.03, 6, 5), 0, 0.05, -0.24);
  hk.add(MAT.color("#141014"), new SphereGeometry(0.022, 6, 5), -0.06, 0.12, -0.12);
  hk.add(MAT.color("#141014"), new SphereGeometry(0.022, 6, 5), 0.06, 0.12, -0.12);
  for (const s of [-1, 1]) { const ear = new SphereGeometry(1, 8, 6); ear.scale(0.05, 0.12, 0.03); hk.add(dark, ear, s * 0.13, 0.04, 0.02, { rz: s * 0.4 }); }
  head.add(hk.build());
  g.add(head);
  return g;
};
/** The tiniest wave in history (line 17): a short curl of water with a foam crest, rolling along local x. */
export const tinyWave = () => {
  const k = new Kit();
  // a lip of water leaning forward with a frothy crest of foam balls (a pipe of blue read as a pipe)
  const lip = new SphereGeometry(1, 14, 8, 0, Math.PI, 0, Math.PI / 2);
  lip.scale(0.32, 0.16, 0.12);
  k.add(MAT.color("#3a72d8"), lip, 0, 0, 0, { rx: -0.35 });
  for (let i = 0; i < 9; i++) k.add(MAT.color("#f2f6ff"), new SphereGeometry(0.035 + 0.015 * rnd(i + 70), 6, 5), -0.28 + i * 0.07, 0.13 + 0.02 * rnd(i + 71), -0.06 + 0.03 * rnd(i + 72));
  return k.build();
};
/** The toy boat that rides the sheet (line 15-16). Origin at its keel. */
export const toyBoat = () => {
  const k = new Kit();
  const hull = new SphereGeometry(1, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  hull.scale(0.1, 0.08, 0.2);
  k.add(MAT.color("#d83a2a"), hull, 0, 0.08, 0);
  k.box(MAT.color("#f6f0e6"), 0.19, 0.02, 0.38, 0, 0.08, 0);
  k.add(MAT.darkWood(), new CylinderGeometry(0.008, 0.008, 0.26, 4), 0, 0.2, 0);
  const sail = new ConeGeometry(0.09, 0.2, 3);
  k.add(MAT.color("#f2c23a"), sail, 0, 0.22, 0.05, { rz: 0.0 });
  return k.build();
};
/** The giant's stickman hand pinching the sheet (line 15, user 2026-11-18: "make it a stickman hand"): our cast's
 * hand blown up, a flat-ink dot on a thin ink arm bent at the elbow, reaching down from above the frame.
 * Origin at the pinch point (the dot's underside). */
export const giantHand = () => {
  const g = new Group(), ink = new MeshBasicMaterial({ color: INK });
  const limb = (a: Vector3, b: Vector3, r: number) => {
    const m = new Mesh(new CylinderGeometry(r, r, a.distanceTo(b), 10), ink);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  const hand = V(0, 0.1, 0), elbow = V(0.35, 1.45, -0.35), shoulder = V(0.15, 4.2, -1.2);
  const dot = new Mesh(new SphereGeometry(0.11, 16, 12), ink); // the cast's ratio: dot ~2.4x the limb's width
  dot.position.copy(hand);
  const joint = new Mesh(new SphereGeometry(0.045, 10, 8), ink);
  joint.position.copy(elbow);
  g.add(dot, limb(hand, elbow, 0.045), limb(elbow, shoulder, 0.045), joint);
  return g;
};
/** A fridge, a TV and a fish tank carried by the fleeing town (line 1). Origin at the grip. */
export const fleeProp = (kind: "fridge" | "tv" | "tank") => {
  const k = new Kit();
  if (kind === "fridge") { k.box(MAT.color("#e8eef2"), 0.62, 1.1, 0.55, 0, 0.5, 0); k.box(MAT.color("#9aa0aa"), 0.04, 0.3, 0.04, 0.24, 0.7, -0.3); }
  if (kind === "tv") { k.box(MAT.color("#2a2a30"), 0.62, 0.42, 0.06, 0, 0.2, 0); k.box(MAT.color("#3a4a7a"), 0.56, 0.36, 0.01, 0, 0.2, -0.035); }
  if (kind === "tank") {
    k.box(MAT.color("#2a2a30"), 0.6, 0.04, 0.32, 0, 0.0, 0);
    const water = new Mesh(new PlaneGeometry(0.58, 0.34), new MeshBasicMaterial({ color: "#6ab8e8", transparent: true, opacity: 0.55 }));
    const g = k.build();
    water.position.set(0, 0.19, -0.165);
    const fish = new Kit();
    fish.add(MAT.color("#ff8a2a"), new SphereGeometry(0.05, 8, 6), 0.08, 0.2, -0.17);
    fish.add(MAT.color("#f2c23a"), new SphereGeometry(0.04, 8, 6), -0.12, 0.12, -0.17);
    g.add(water, fish.build());
    return g;
  }
  return k.build();
};
/** How far in front of a lawn chair's centre (toward its -z face) a seated card stands. */
export const SEAT_AHEAD = 0.29;
const chairYaw = (i: number) => (rnd(i) - 0.5) * 0.5;
/** Where the card of someone seated in chair `i` of chairRows(spots) stands. */
export const seatIn = (spots: Vector3[], i: number) => spots[i].clone().add(V(-Math.sin(chairYaw(i)) * SEAT_AHEAD, 0, -Math.cos(chairYaw(i)) * SEAT_AHEAD));
/** Lawn chairs for the last shot: `n` open chairs in rows across the beach (one merged mesh). */
export const chairRows = (spots: Vector3[]) => {
  const g = new Group();
  spots.forEach((p, i) => {
    const c = lawnChair();
    c.position.copy(p);
    c.rotation.y = chairYaw(i);
    g.add(c);
  });
  return g;
};

// ================================================================== the cast
const helmet = (col: string) => (p: import("../../../kit/toon/toon").Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, y = cy - 0.3 * b;
  const dome: P2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = Math.PI + (i / 24) * Math.PI;
    dome.push([cx + 1.08 * a * Math.cos(t), y + 0.95 * b * Math.sin(t)]);
  }
  p.shadedFill(dome, col, SH_HAIR, a);
  p.inkRing(dome, 0.85 * 5 * u);
  // vents and a chin strap
  for (const dx of [-0.45, 0, 0.45]) p.ell(cx + dx * a, y - 0.55 * b, 5 * u, 12 * u, "#1a2a3a", 0);
  p.stroke([[cx - 1.0 * a, y + 0.05 * b], [cx - 0.75 * a, cy + 0.7 * b], [cx, cy + 0.98 * b], [cx + 0.75 * a, cy + 0.7 * b], [cx + 1.0 * a, y + 0.05 * b]], 2.2 * u, "#2a2a30");
};
const pigtails = (col: string) => (p: import("../../../kit/toon/toon").Pen, h: Head) => {
  const { cx, cy, a, b, u } = h;
  for (const s of [-1, 1]) {
    p.ell(cx + s * 1.18 * a, cy - 0.25 * b, 0.36 * a, 0.42 * b, col, 0.85 * 5 * u);
    p.ell(cx + s * 0.98 * a, cy - 0.45 * b, 7 * u, 7 * u, "#e8402a", 0.6 * 5 * u); // hair ties
  }
};
/** Brad the realtor: tall, a pink pinstripe suit, shirt and tie, slick hair under a teal bike helmet. */
export const bradLook: Look = {
  build: BUILDS.tallThin, seed: 141, jacket: "#f2a8c8", pants: "#e898b8", shoes: "#f6f0e6",
  outfit: layers(pattern("pinstripe", "#f2a8c8", "#fbe6ee"), outfit({ bottom: ["#e898b8", 0.86], shirt: { color: "#f6f0e6", tie: "#2ab0a8" } }), belt("#f6f0e6", "#e2c25a")),
  hair: headLayers(capHair("#e8c050", 0.42, 0.25), helmet("#2ab0a8")),
};
/** Mia, 9: puffy pigtails, a yellow dotted raincoat, red boots. */
export const miaLook: Look = {
  build: BUILDS.child, seed: 147, jacket: "#f2c23a", pants: "#3a4a8a", shoes: "#d8342c",
  outfit: layers(pattern("dots", "#f2c23a", "#fff0a0"), outfit({ bottom: ["#3a4a8a", 0.92], buttons: "#d8342c", collar: "#f6e090" })),
  hair: capHair("#5a3424", 0.34, 0.5),
  hairBack: pigtails("#5a3424"),
};
export { INK };
