import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { NoColorSpace, RepeatWrapping, SRGBColorSpace, Texture } from "three";
import MAPS from "../../../public/tex/maps.json";

/**
 * R25 real look: CC0 photo textures (Poly Haven, 1K diffuse, credited in assets/CREDITS.md) from public/tex/<name>.jpg.
 * One Texture per name; the frame waits (delayRender) until the image has loaded, so no frame renders untextured.
 * Use with toonMaterial({ map: photo("coast_sand_01"), repeat, color }): `color` tints it.
 * R26: when public/tex/maps.json lists a normal (`<name>_nor.jpg`) or ARM map (`<name>_arm.jpg`, scripts/polyhaven.py), they
 * load too and ride on the texture (`userData.nor` / `userData.arm`); toonMaterial picks them up, so relief and roughness
 * come from real maps, not from the diffuse's brightness.
 */
const cache = new Map<string, Texture>();
/** Canvas redraws (Composer registers R3F `advance`): while rendering, ThreeCanvas only draws on a frame change, so a
 * texture that arrives after the frame was drawn must repaint it before the frame is released. */
const redraws = new Set<() => void>();
export const onPhotoLoaded = (fn: () => void) => {
  redraws.add(fn);
  return () => void redraws.delete(fn);
};
/** Repaint the current frame (a model or texture arrived after it was drawn). */
export const repaint = () => redraws.forEach((f) => f());
/** Load public/<dir>/<file>.jpg as a texture; the frame waits for it. */
export const load = (file: string, color: boolean, dir = "tex") => {
  const t = new Texture();
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace; // normal and ARM maps are data
  t.anisotropy = 8;
  const handle = delayRender(`photo texture ${file}`);
  const img = new Image();
  img.onload = () => {
    t.image = img;
    t.needsUpdate = true;
    repaint();
    continueRender(handle);
  };
  img.onerror = () => cancelRender(new Error(`photo texture: public/${dir}/${file}.jpg did not load`));
  img.src = staticFile(`${dir}/${file}.jpg`);
  return t;
};

export const photo = (name: string) => {
  const hit = cache.get(name);
  if (hit) return hit;
  const t = load(name, true);
  t.userData.photo = true; // toonMaterial takes relief from photos only
  const maps = (MAPS as Record<string, { nor?: boolean; arm?: boolean }>)[name] ?? {};
  if (maps.nor) t.userData.nor = load(`${name}_nor`, false);
  if (maps.arm) t.userData.arm = load(`${name}_arm`, false);
  cache.set(name, t);
  return t;
};

