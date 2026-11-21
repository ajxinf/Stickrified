import { Color, Texture, Vector3 } from "three";
import SKIES from "../../public/sky/index.json";
import { load } from "./build/photo";
import type { LightPreset } from "./lights";

/**
 * R27 photo sky (user 2026-11-21: the painted gradient "looks so low quality and does not blend in"). A CC0 Poly Haven
 * pure-sky panorama (`python scripts/polyhaven.py sky <id>` -> public/sky/) replaces the gradient dome. So the world
 * melts into it, the preset's fog, sky horizon and aerial haze all take the photo's own horizon colour (graded by the
 * same exposure and tint), and water reflects the photo (shade.ts `reflect`). The key light should come from the photo's
 * brightest spot (its sun or moon): `photoSky` returns that direction (with `yaw`, which turns the whole sky).
 *   const { preset, key } = photoSky(LIGHTS.night, "kloppenheim_07_puresky", { exposure: 0.3, tint: "#9db8ff", yaw: -20 });
 *   <ToonWorld preset={preset} sunDir={key} />
 */
export type SkyId = keyof typeof SKIES;
type SkyInfo = { crop: number; horizon: number[]; zenith: number[]; bright: number[] };

/** Graded linear colour of an sRGB triple from index.json. */
const grade = (srgb: number[], exposure: number, tint: string) =>
  new Color().setRGB(srgb[0], srgb[1], srgb[2], "srgb").multiplyScalar(exposure).multiply(new Color(tint));

/** World direction of sky azimuth/elevation (deg); azimuth 0 = -z, 90 = +x (lights.ts sunDirection convention). */
export const skyDir = (az: number, el: number) => {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return new Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a));
};

export const photoSky = (p: LightPreset, id: SkyId, { exposure = 1, tint = "#ffffff", yaw = 0 }: { exposure?: number; tint?: string; yaw?: number } = {}) => {
  const s = SKIES[id] as SkyInfo, hz = `#${grade(s.horizon, exposure, tint).getHexString()}`;
  const preset: LightPreset = { ...p, skyPhoto: { id, exposure, tint, yaw }, fog: hz, skyHorizon: hz, ...(p.haze ? { haze: { ...p.haze, color: hz } } : {}) };
  return { preset, key: skyDir(s.bright[0] + yaw, s.bright[1]), info: s };
};

const cache = new Map<string, Texture>();
/** The sky photo as a texture (one per id; the frame waits for it). */
export const skyTexture = (id: string) => {
  let t = cache.get(id);
  if (!t) {
    t = load(id, true, "sky");
    t.anisotropy = 4;
    cache.set(id, t);
  }
  return t;
};
export const skyCrop = (id: string) => (SKIES as Record<string, SkyInfo>)[id]?.crop ?? 0.5;
