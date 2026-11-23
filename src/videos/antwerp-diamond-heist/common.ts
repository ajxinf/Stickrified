import { BoxGeometry, CanvasTexture, DoubleSide, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";
import { M } from "../../../kit/toon/build/kit";
import { photo } from "../../../kit/toon/build/photo";
import { toonMaterial } from "../../../kit/toon/shade";

/** antwerp-diamond-heist: small shared builders (canvas textures, unlit signs, slabs, photo materials). */
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const FONT = '"Nunito", "Arial Rounded MT Bold", "Arial Black", sans-serif';

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
/** Unlit plane material (signs, boards, screens: readable in any light). */
export const unlit = (key: string, map: () => CanvasTexture, transparent = false) => M(`adh-${key}`, () => new MeshBasicMaterial({ map: map(), transparent, side: DoubleSide, toneMapped: false }));
/** Lit canvas material (paper, photos: takes the scene light). */
export const litTex = (key: string, map: () => CanvasTexture, o: Parameters<typeof toonMaterial>[0] = {}) => M(`adh-lit-${key}`, () => toonMaterial({ map: map(), color: "#ffffff", ...o }));
export const plane = (w: number, h: number, mat: Material, pos: Vector3, ry = 0, rx = 0, rz = 0) => {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  m.rotation.set(rx, ry, rz);
  return m;
};
export const place = <T extends Object3D>(o: T, x: number, y: number, z: number, ry = 0) => {
  o.position.set(x, y, z);
  o.rotation.y = ry;
  return o;
};
export const box = (w: number, h: number, d: number, mat: Material, pos: Vector3, ry = 0) => {
  const m = new Mesh(new BoxGeometry(w, h, d), mat);
  m.position.copy(pos);
  m.rotation.y = ry;
  return m;
};
/** Floor slab with world-metre uvs (material repeat = 1 / tile metres). */
export const slab = (x0: number, x1: number, z0: number, z1: number, y: number, mat: Material) => {
  const m = new Mesh(new PlaneGeometry(x1 - x0, z1 - z0), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0), uv.getY(i) * (z1 - z0));
  m.userData.ground = true;
  return m;
};
/** Text board texture: lines centred and fitted inside 88 % of the width. */
export const boardTex = (lines: string[], bg: string, fg: string, w = 1024, h = 512, accent?: (g: CanvasRenderingContext2D) => void) =>
  canvasTex(w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    accent?.(g);
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "middle";
    let fs = h / (lines.length + 0.5);
    g.font = `900 ${fs}px ${FONT}`;
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if (widest > w * 0.88) { fs *= (w * 0.88) / widest; g.font = `900 ${fs}px ${FONT}`; }
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.08));
  });

const PM = (name: string, tile: number, color: string, o: Parameters<typeof toonMaterial>[0] = {}) => () =>
  M(`adh-${name}-${color}-${tile}`, () => toonMaterial({ map: photo(name), repeat: [1 / tile, 1 / tile], color, mottle: 0.12, ...o }));
/** One photo texture per surface (R27 material lists live at the top of each set file). */
export const MATS = {
  // vault + corridor
  steel: PM("metal_plate", 1.2, "#98a4b8", { rough: 0.35, spec: 0.7, gloss: 0.3 }),
  darkSteel: PM("metal_plate", 0.8, "#6a7078", { rough: 0.4, spec: 0.6 }),
  vaultFloor: PM("concrete_floor_painted", 2.5, "#8a9a92", { rough: 0.5, gloss: 0.25 }),
  block: PM("concrete_block_wall", 2.4, "#a8b8c0", { rough: 0.9, mottle: 0.18 }),
  blockDark: PM("concrete_block_wall", 2.4, "#7a8a84", { rough: 0.9, mottle: 0.18 }),
  plaster: (c: string) => PM("grey_plaster", 2.5, c, { rough: 0.9 })(),
  // office
  woodFloor: PM("wood_floor", 1.8, "#c8a07a", { rough: 0.5, gloss: 0.2 }),
  wallPaint: (c: string) => PM("painted_plaster_wall", 2.4, c, { rough: 0.85 })(),
  trim: PM("white_planks_clean", 1.2, "#f2eee6", { rough: 0.6 }),
  darkWood: PM("weathered_planks", 1.2, "#5a3e2e", { rough: 0.7 }),
  // hideout
  carpet: PM("dirty_carpet", 1.6, "#8a6a5a", { rough: 0.95 }),
  cork: PM("hessian_230", 0.6, "#a8865a", { rough: 0.95 }),
  // street
  cobbles: PM("cobblestone_floor_04", 2.2, "#8a8890", { rough: 0.35, gloss: 0.45, spec: 0.5 }),
  walk: PM("concrete_pavement", 2.5, "#a8a49c", { rough: 0.6, gloss: 0.25 }),
  brick: (c: string) => PM("brick_wall_001", 2.5, c, { rough: 0.8 })(),
  granite: PM("granite_tile", 1.4, "#b8b4ac", { rough: 0.5, spec: 0.3 }),
  roof: PM("grey_roof_tiles", 1.6, "#6a6e7a", { rough: 0.7 }),
  // forest
  leaves: PM("forest_leaves_02", 2.2, "#b89a7a", { rough: 0.95, mottle: 0.22 }),
  asphalt: PM("asphalt_02", 4, "#7a7a80", { rough: 0.85 }),
  // interrogation
  cellWall: PM("painted_concrete", 2.2, "#9aa89c", { rough: 0.85, mottle: 0.16 }),
};
export const glassMat = () => M("adh-glass", () => toonMaterial({ color: "#3a4a5a", spec: 0.7, gloss: 0.8, rough: 0.12 }));
export const glowMat = (c: string, k: number) => M(`adh-glow-${c}-${k}`, () => toonMaterial({ color: c, emissive: [c, k] }));
export const colMat = (c: string, o: Parameters<typeof toonMaterial>[0] = {}) => M(`adh-col-${c}-${JSON.stringify(o)}`, () => toonMaterial({ color: c, ...o }));
export const sideDouble = DoubleSide;
