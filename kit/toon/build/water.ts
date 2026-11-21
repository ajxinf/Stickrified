import { DataTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, PlaneGeometry, RepeatWrapping } from "three";
import { toonMaterial } from "../shade";
import { N, rippleData } from "./ripples";

/**
 * R27 (moon report: the sea read as flat horizontal bands next to the refs): open water whose ripples move. A tileable
 * tangent-space normal map of six wave trains (integer wave numbers, so it tiles; deep-water speeds, so the trains
 * drift apart instead of sliding as one picture), rebuilt for each composition frame by `setWater` (frame-driven: any
 * render order gives the same frame). Drawn through the real-look shader: low roughness puts the sun or moon glint path
 * on the ripples, `reflect` mirrors the sky tone into them by Fresnel (shade.ts), the rim gives the sky sheen at grazing angles, `gloss` mirrors the practicals as streaks, and
 * world-space mottling breaks the colour into darker and lighter patches. Shore foam and wet sand stay per world (see
 * the moon episode's `seaPlane` for a moving waterline).
 */
export type WaterOpts = { size?: [number, number]; tile?: number; color?: string; rough?: number; strength?: number; gloss?: number; mottle?: number; speed?: number; reflect?: number };

/** A water plane (lying flat, centred on the origin): `tile` m per ripple tile (smaller = choppier), `strength` the
 * normal strength. Call `setWater(mesh, F)` every frame. */
export const water = ({ size = [400, 400], tile = 5, color = "#2a5470", rough = 0.18, strength = 1, gloss = 0.45, mottle = 0.18, speed = 1, reflect = 0.9 }: WaterOpts = {}) => {
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

