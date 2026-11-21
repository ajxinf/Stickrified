import { CanvasTexture, DataTexture, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, RepeatWrapping } from "three";
import { SKY } from "../ink";
import { toonMaterial } from "../shade";
import { N, rippleData } from "./ripples";

/**
 * R27 (moon report: the sea read as flat horizontal bands next to the refs): open water whose ripples move. A tileable
 * tangent-space normal map of six wave trains (integer wave numbers, so it tiles; deep-water speeds, so the trains
 * drift apart instead of sliding as one picture), rebuilt for each composition frame by `setWater` (frame-driven: any
 * render order gives the same frame). Drawn through the real-look shader: low roughness puts the sun or moon glint path
 * on the ripples, `reflect` mirrors the sky tone into them by Fresnel (shade.ts), the rim gives the sky sheen at grazing angles, `gloss` mirrors the practicals as streaks, and
 * world-space mottling breaks the colour into darker and lighter patches. `shoreFoam` lays the lacy foam at the waterline.
 */
export type WaterOpts = { size?: [number, number]; tile?: number; color?: string; rough?: number; strength?: number; gloss?: number; mottle?: number; speed?: number; reflect?: number };

/** A water plane (lying flat, centred on the origin): `tile` m per ripple tile (smaller = choppier), `strength` the
 * normal strength. Call `setWater(mesh, F)` every frame. */
export const water = ({ size = [400, 400], tile = 4, color = "#2a5470", rough = 0.32, strength = 1, gloss = 0.45, mottle = 0.18, speed = 1, reflect = 0.9 }: WaterOpts = {}) => {
  const tex = new DataTexture(rippleData(0, speed), N, N);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter; // far ripples average out instead of sparkling at 2K
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  const m = new Mesh(new PlaneGeometry(size[0], size[1]), toonMaterial({ color, normalMap: tex, normalScale: strength, rough, gloss, mottle, reflect, repeat: [size[0] / tile, size[1] / tile] }));
  m.rotation.x = -Math.PI / 2;
  m.name = "water";
  m.receiveShadow = true;
  m.userData.water = { tex, speed, F: 0 };
  return m;
};

/** Move the ripples to composition frame F. */
export const setWater = (m: Mesh, F: number) => {
  const w = m.userData.water as { tex: DataTexture; speed: number; F: number };
  if (w.F === F) return;
  w.F = F;
  w.tex.image.data = rippleData(F, w.speed);
  w.tex.needsUpdate = true;
};


/** Shore wash: a thin lacy edge on the shore side (canvas bottom), then soft streaks stretched along the shore that
 * thin out toward the sea, blurred a pixel. R27b: the first version's big round holes read as camouflage up close. */
const foamTex = (seed: number) => {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const g = c.getContext("2d")!;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.filter = "blur(1px)";
  for (let k = 0; k < 2200; k++) {
    const v = Math.pow(rnd(), 0.55); // 1 = shore edge: most streaks there
    const y = 128 - v * 118 - 4, x = rnd() * 1024;
    g.fillStyle = `rgba(236,244,252,${(0.08 + 0.42 * v * rnd()).toFixed(3)})`;
    g.beginPath();
    g.ellipse(x, y, 4 + 22 * rnd() * (0.4 + v), 0.6 + 1.6 * rnd() * v, (rnd() - 0.5) * 0.15, 0, 7);
    g.fill();
  }
  // the edge itself: a broken bright line that wanders
  g.strokeStyle = "rgba(244,249,255,0.75)";
  g.lineWidth = 2.2;
  g.beginPath();
  for (let x = 0; x <= 1024; x += 3) {
    const y = 118 + 3 * Math.sin(x / 37 + seed) + 2 * Math.sin(x / 9);
    if (rnd() < 0.12) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.anisotropy = 8;
  return t;
};

/** Foam along a straight waterline (local x), `depth` m deep toward the sea (-z). Two layers that drift apart. Call
 * `setShoreFoam(group, F, z, lap)`: z = the waterline, lap 0-1 = how far the last wave has run up (foam thins as it drains). */
export const shoreFoam = (length = 60, depth = 1.1) => {
  const g = new Group();
  for (const [i, seed] of [[0, 11], [1, 29]]) {
    const map = foamTex(seed);
    map.repeat.set(length / 4.5, 1); // finer lace: 4.5 m per texture across
    const m = new Mesh(new PlaneGeometry(length, depth), new MeshBasicMaterial({ map, transparent: true, depthWrite: false, color: "#dfe8f5", side: DoubleSide, fog: true }));
    m.rotation.x = -Math.PI / 2;
    m.layers.set(SKY); // colour pass only: no ink outline round the lace
    m.renderOrder = 1 + i;
    g.add(m);
  }
  g.name = "shoreFoam";
  return g;
};
export const setShoreFoam = (g: Group, F: number, z: number, lap = 1) => {
  g.children.forEach((m, i) => {
    const mesh = m as Mesh, mat = mesh.material as MeshBasicMaterial;
    mesh.position.set(0, 0.035 + i * 0.004, z - 0.35 - i * 0.55 - 0.15 * Math.sin(F / 17 + i));
    mat.map!.offset.x = F * (i ? -0.0011 : 0.0007); // slow drift both ways (continuous: no modulo jump)
    mat.opacity = (i ? 0.35 : 0.8) * (0.4 + 0.6 * lap);
  });
};
