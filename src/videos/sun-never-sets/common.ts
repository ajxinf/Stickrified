import { BoxGeometry, CanvasTexture, DoubleSide, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";
import { M } from "../../../kit/toon/build/kit";
import { photo } from "../../../kit/toon/build/photo";
import { toonMaterial } from "../../../kit/toon/shade";

/** sun-never-sets: small shared builders (canvas textures, unlit signs, slabs, photo materials). */
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
export const unlit = (key: string, map: () => CanvasTexture, transparent = false) => M(`snc-${key}`, () => new MeshBasicMaterial({ map: map(), transparent, side: DoubleSide, toneMapped: false }));
/** Lit canvas material (paper, photos: takes the scene light). */
export const litTex = (key: string, map: () => CanvasTexture, o: Parameters<typeof toonMaterial>[0] = {}) => M(`snc-lit-${key}`, () => toonMaterial({ map: map(), color: "#ffffff", ...o }));
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
  M(`snc-${name}-${color}-${tile}`, () => toonMaterial({ map: photo(name), repeat: [1 / tile, 1 / tile], color, mottle: 0.12, ...o }));
/** One photo texture per surface (each set file lists its own materials at the top). */
export const MATS = {
  // street
  lawn: PM("leafy_grass", 3, "#a8c088", { mottle: 0.2, rough: 0.9 }),
  lawnDry: PM("sparse_grass", 3, "#c8c08a", { mottle: 0.22, rough: 0.95 }),
  road: PM("asphalt_02", 4, "#8c8a90", { rough: 0.85 }),
  walk: PM("concrete_pavement", 2.5, "#d6d0c6", { rough: 0.8 }),
  drive: PM("concrete_floor_painted", 3, "#b8b2a8", { rough: 0.8 }),
  stucco: (c: string) => PM("white_stucco", 2.5, c, { rough: 0.85 })(),
  siding: (c: string) => PM("weathered_plank_siding", 2, c, { rough: 0.8 })(),
  brick: (c: string) => PM("brick_wall_001", 2.5, c, { rough: 0.8 })(),
  block: PM("concrete_block_wall", 2.2, "#b0aca4", { rough: 0.9, mottle: 0.18 }),
  trim: PM("white_planks_clean", 1.2, "#f2eee6", { rough: 0.6 }),
  roofRed: PM("clay_roof_tiles", 1.6, "#c98a6e", { rough: 0.7 }),
  roofGrey: PM("grey_roof_tiles", 1.6, "#9aa0ac", { rough: 0.7 }),
  fence: PM("weathered_planks", 1.4, "#c8a27c", { rough: 0.8 }),
  darkWood: PM("weathered_planks", 1.2, "#6a4c3a", { rough: 0.7 }),
  stone: PM("granite_tile", 0.8, "#b8b4aa", { rough: 0.6 }),
  metal: PM("metal_plate", 0.8, "#a8b0b8", { rough: 0.4, spec: 0.6 }),
  rust: PM("rusty_metal_sheet", 1.2, "#b9a596", { rough: 0.7 }),
  // interiors
  floor: PM("laminate_floor", 2, "#c8a888", { rough: 0.55, gloss: 0.15 }),
  wood: PM("wood_floor", 1.6, "#b8906a", { rough: 0.55, gloss: 0.15 }),
  wall: (c: string) => PM("painted_plaster_wall", 2.4, c, { rough: 0.85 })(),
  plaster: (c: string) => PM("grey_plaster", 2.5, c, { rough: 0.9 })(),
  tiles: PM("floor_tiles_06", 0.9, "#e4ecee", { rough: 0.35, gloss: 0.2 }),
  cabinet: PM("white_planks_clean", 1.2, "#e8b860", { rough: 0.6 }),
  worktop: PM("granite_tile", 1.0, "#5a5a62", { rough: 0.4, gloss: 0.3 }),
  carpet: (c: string) => PM("dirty_carpet", 1.6, c, { rough: 0.95 })(),
  cloth: (c: string) => PM("hessian_230", 0.5, c, { rough: 0.95 })(),
};
export const glassMat = () => M("snc-glass", () => toonMaterial({ color: "#3a4a62", spec: 0.6, gloss: 0.7, rough: 0.15 }));
export const glowMat = (c: string, k: number) => M(`snc-glow-${c}-${k}`, () => toonMaterial({ color: c, emissive: [c, k] }));
export const colMat = (c: string, o: Parameters<typeof toonMaterial>[0] = {}) => M(`snc-col-${c}-${JSON.stringify(o)}`, () => toonMaterial({ color: c, ...o }));
export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
