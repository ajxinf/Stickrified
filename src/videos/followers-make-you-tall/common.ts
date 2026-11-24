import { CanvasTexture, DoubleSide, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SRGBColorSpace, Texture, Vector3 } from "three";
import { continueRender, delayRender, staticFile } from "remotion";
import { M } from "../../../kit/toon/build/kit";
import { photo } from "../../../kit/toon/build/photo";
import { toonMaterial } from "../../../kit/toon/shade";

/** followers-make-you-tall: small shared builders (canvas textures, unlit signs, floor slabs, photo materials). */
export const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
export const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
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
/** Unlit plane material (signs, screens: readable in any light). */
export const unlit = (key: string, map: () => CanvasTexture, transparent = false) => M(`fmt-${key}`, () => new MeshBasicMaterial({ map: map(), transparent, side: DoubleSide, toneMapped: false }));
/** Lit canvas material (paper, stickers, labels: takes the scene light). */
export const litTex = (key: string, map: () => CanvasTexture, o: Parameters<typeof toonMaterial>[0] = {}) => M(`fmt-lit-${key}`, () => toonMaterial({ map: map(), color: "#ffffff", ...o }));
/** A flat sheet (paper, a sign face, a decal) on a surface. */
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
/** A vertical wall sheet with world-metre uvs, facing +z before `ry` (architecture surface). */
export const wall = (w: number, h: number, mat: Material, pos: Vector3, ry = 0) => {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.copy(pos).add(new Vector3(0, h / 2, 0));
  m.rotation.y = ry;
  m.receiveShadow = true;
  const uv = m.geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * h);
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
  M(`fmt-${name}-${color}-${tile}-${JSON.stringify(o)}`, () => toonMaterial({ map: photo(name), repeat: [1 / tile, 1 / tile], color, mottle: 0.12, ...o }));
/** One photo texture per surface (each set lists its own at the top of its file). */
export const MATS = {
  road: PM("asphalt_02", 4, "#8c8a90", { rough: 0.85 }),
  walk: PM("concrete_pavement", 2.5, "#d6d0c6", { rough: 0.8 }),
  lot: PM("asphalt_02", 4, "#9a989c", { rough: 0.85 }),
  plaza: PM("herringbone_pavement", 2, "#c8b8a8", { rough: 0.8 }),
  cobble: PM("cobblestone_floor_04", 2, "#b8b0a4", { rough: 0.85 }),
  lawn: PM("leafy_grass", 3, "#a8c088", { mottle: 0.2, rough: 0.9 }),
  grass: PM("sparse_grass", 3, "#b8c088", { mottle: 0.22, rough: 0.95 }),
  sand: PM("damp_beach_sand_02", 2, "#a89878", { rough: 0.9 }),
  brick: (c: string) => PM("brick_wall_001", 2.5, c, { rough: 0.8 })(),
  block: (c: string) => PM("concrete_block_wall", 2.2, c, { rough: 0.9, mottle: 0.18 })(),
  stucco: (c: string) => PM("white_stucco", 2.5, c, { rough: 0.85 })(),
  roof: PM("concrete_pavement", 3, "#8a8a8e", { rough: 0.9 }),
  metal: PM("metal_plate", 0.8, "#a8b0b8", { rough: 0.4, spec: 0.6 }),
  rust: PM("rusty_metal_sheet", 1.2, "#b9a596", { rough: 0.7 }),
  trim: PM("white_planks_clean", 1.2, "#f2eee6", { rough: 0.6 }),
  darkWood: PM("weathered_planks", 1.2, "#6a4c3a", { rough: 0.7 }),
  floor: PM("laminate_floor", 2, "#c8a888", { rough: 0.55, gloss: 0.15 }),
  wood: PM("wood_floor", 1.6, "#b8906a", { rough: 0.55, gloss: 0.15 }),
  tiles: PM("floor_tiles_06", 0.9, "#e4ecee", { rough: 0.35, gloss: 0.2 }),
  granite: PM("granite_tile", 1.0, "#5a5a62", { rough: 0.4, gloss: 0.3 }),
  plaster: (c: string) => PM("painted_plaster_wall", 2.4, c, { rough: 0.85 })(),
  carpet: (c: string) => PM("dirty_carpet", 1.6, c, { rough: 0.95 })(),
  cloth: (c: string) => PM("hessian_230", 0.5, c, { rough: 0.95 })(),
  paint: (c: string, o: Parameters<typeof toonMaterial>[0] = {}) => PM("painted_plaster_wall", 2, c, { rough: 0.45, spec: 0.5, gloss: 0.35, mottle: 0.04, ...o })(),
};
export const glassMat = () => M("fmt-glass", () => toonMaterial({ color: "#3a4a62", spec: 0.7, gloss: 0.8, rough: 0.1 }));
export const glowMat = (c: string, k: number) => M(`fmt-glow-${c}-${k}`, () => toonMaterial({ color: c, emissive: [c, k] }));

const pngCache = new Map<string, Texture>();
/** A transparent PNG from public/tex (a cut-out photo: the bread slice); the frame waits for it. */
export const pngTex = (file: string) => {
  const hit = pngCache.get(file);
  if (hit) return hit;
  const t = new Texture();
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  const h = delayRender(`texture ${file}`);
  const img = new Image();
  img.onload = () => { t.image = img; t.needsUpdate = true; continueRender(h); };
  img.src = staticFile(`tex/${file}.png`);
  pngCache.set(file, t);
  return t;
};
