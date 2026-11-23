import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CanvasTexture, Mesh, MeshBasicMaterial, NormalBlending, Object3D, Points, PointsMaterial, SRGBColorSpace, Vector3 } from "three";
import { glowSprite, practicalGlows } from "../../../kit/toon/glow";
import type { MovingProp } from "../../../kit/toon/guard";
import { SKY } from "../../../kit/toon/ink";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import type { PracticalKind } from "../../../kit/toon/shade";
import { practicalLights } from "../../../kit/toon/shade";
import { photoSky } from "../../../kit/toon/sky";
import { V, canvasTex, rnd } from "./common";
import { eclipseSky, placeSky } from "./props";
import { BOX, CINEMA_SCREEN, CLOSET, FRIDGE, LIVING, boxInside, cinema, closet, dotsMat, home, living, ohio } from "./rooms";
import { DISPLAY, NEON, PORCH_LAMPS, STREET_LAMP_HEADS, street } from "./street";
import type { WorldState } from "./story";

/**
 * sun-never-sets: one light per scene identity (user 2026-11-22: a vibe is NOT a warm filter):
 *   kitchen  3 AM insomnia: a hard white low sun straight through the window, cool blue shade (lines 1, 11-12, 22)
 *   fun      "at first it's awesome": crisp blue sky with clouds, high sun, saturated colour (3)
 *   day      the hustle: a hot clear cobalt sky, hard short shadows (5, 8-10, 13-14, 16-23)
 *   heat     the town cooks: bleached noon, a sickly yellow haze close in (15)
 *   dim      the eclipse comes: the light goes thin and blue, the lamps wake up (24-25)
 *   night    totality: stars, the corona, warm lamp pools, fireflies (26-30)
 *   closet   a bare warm bulb, dark corners (6)       cinema  the screen's blue glow, red aisle lights (6)
 *   ohio     cool daylight + the fridge's white light (7)   tv  warm evening lamp + the TV's blue (23)
 *   box      dim cardboard lit by the pinhole sun (20)
 */
const STREET_SKY = photoSky({ ...LIGHTS.day, lit: [1.58, 1.5, 1.36], shade: [0.3, 0.33, 0.5], lift: [0.03, 0.035, 0.07], litTint: "#fff2e0", sat: 1.22, haze: { color: "#cfe0f5", start: 45, amount: 0.12 }, char: { tint: [1.0, 0.98, 0.94], shade: 0.92 } }, "kloofendal_43d_clear_puresky", { exposure: 1.02, yaw: 114.5 });
export const DAY = STREET_SKY.preset, SUN = STREET_SKY.key;
// line 2's wide: the same sky turned half round, so the photo's own sun sits behind the lens and only the painted sun
// (sliding down, braking) is in frame; the key light stays where the sun stops
export const SKYWIDE = photoSky(STREET_SKY.preset, "kloofendal_43d_clear_puresky", { exposure: 1.02, yaw: 294.5 }).preset, SKYWIDE_SUN = SUN;
const FUN_SKY = photoSky({ ...LIGHTS.day, lit: [1.48, 1.44, 1.32], shade: [0.34, 0.38, 0.56], lift: [0.03, 0.035, 0.07], litTint: "#fff6e8", sat: 1.3, haze: { color: "#cfe0f5", start: 45, amount: 0.1 }, char: { tint: [1.0, 0.98, 0.95], shade: 0.93 } }, "kloofendal_48d_partly_cloudy_puresky", { exposure: 1.0, yaw: 115.9 });
export const FUN = FUN_SKY.preset, FUN_SUN = FUN_SKY.key;
const HEAT_SKY = photoSky({ ...LIGHTS.day, lit: [1.7, 1.55, 1.22], shade: [0.42, 0.4, 0.38], lift: [0.05, 0.045, 0.02], litTint: "#fff0c0", sat: 1.02, haze: { color: "#e8dcb0", start: 14, amount: 0.3 }, char: { tint: [1.0, 0.95, 0.84], shade: 0.94 } }, "qwantani_noon_puresky", { exposure: 1.12, tint: "#fff0d0", yaw: 114.5 });
export const HEAT = HEAT_SKY.preset, HEAT_SUN = HEAT_SKY.key;
const DIM_SKY = photoSky({ ...LIGHTS.dusk, lit: [0.66, 0.72, 0.96], shade: [0.2, 0.24, 0.42], lift: [0.015, 0.02, 0.05], litTint: "#c8d8ff", lamp: ["#ffb35c", 2.6], sat: 1.1, haze: { color: "#8a9ac8", start: 30, amount: 0.2 }, char: { tint: [0.9, 0.94, 1.0], shade: 0.9 }, grade: "moonlit" }, "kloofendal_43d_clear_puresky", { exposure: 0.42, tint: "#9fb4e8", yaw: 114.5 });
export const DIM = DIM_SKY.preset;
const NIGHT_SKY = photoSky({ ...LIGHTS.night, lit: [0.56, 0.64, 0.98], shade: [0.16, 0.18, 0.34], lift: [0.015, 0.018, 0.04], lamp: ["#ffa850", 4.6], sat: 1.14, fogNear: 30, fogFar: 260 }, "kloppenheim_07_puresky", { exposure: 0.42, tint: "#bccbe8", yaw: 242.2 });
export const NIGHT = NIGHT_SKY.preset;
const KITCHEN_SKY = photoSky({ ...LIGHTS.sunInterior, lit: [1.7, 1.64, 1.54], shade: [0.52, 0.56, 0.7], lift: [0.05, 0.06, 0.09], litTint: "#fff8ee", lamp: ["#dfeaff", 1.4], sat: 1.14, char: { tint: [1.0, 0.98, 0.96], shade: 0.9 } }, "qwantani_late_afternoon_puresky", { exposure: 1.05, tint: "#f4f0ff", yaw: -35.5 });
export const KITCHEN = KITCHEN_SKY.preset, KITCHEN_SUN = KITCHEN_SKY.key;
export const CLOSET_L: LightPreset = { ...LIGHTS.interior, lit: [0.5, 0.42, 0.34], shade: [0.12, 0.1, 0.14], lift: [0.01, 0.01, 0.02], litTint: "#ffd8a8", lamp: ["#ffc27a", 3.2], sat: 1.14, grade: "night" };
export const CINEMA_L: LightPreset = { ...LIGHTS.interior, lit: [0.46, 0.5, 0.72], shade: [0.14, 0.12, 0.2], lift: [0.015, 0.012, 0.03], litTint: "#b8c8ff", lamp: ["#a8c8ff", 3.4], sat: 1.16, char: { tint: [0.86, 0.9, 1.0], shade: 0.86 }, charInk: "#141a2c", grade: "night" };
export const OHIO_L: LightPreset = { ...LIGHTS.interior, lit: [1.02, 1.06, 1.1], shade: [0.4, 0.44, 0.52], litTint: "#eef6ff", lamp: ["#f4fbff", 2.2], sat: 1.12 };
export const TV_L: LightPreset = { ...LIGHTS.interior, lit: [0.62, 0.5, 0.42], shade: [0.16, 0.13, 0.18], lift: [0.012, 0.01, 0.02], litTint: "#ffd0a0", lamp: ["#ffb060", 2.8], sat: 1.18, grade: "night" };
export const BOX_L: LightPreset = { ...LIGHTS.interior, lit: [0.5, 0.4, 0.3], shade: [0.16, 0.12, 0.1], lift: [0.02, 0.015, 0.01], litTint: "#ffe0b0", lamp: ["#fff2d0", 2.0], sat: 1.1, grade: "night" };
export const IN_SUN = V(0.35, 0.85, 0.4).normalize();

export type Place = "street" | "home" | "closet" | "cinema" | "ohio" | "tv" | "box";
const builders: Record<Place, () => Object3D> = { street, home, closet, cinema, ohio, tv: living, box: boxInside };
type P = { pos: Vector3; kind: PracticalKind; color: [string, number]; glowAt?: Vector3; noGlow?: boolean };
/** A dim TV while the little brother stands in front of it (peaks mid-walk). */
export const tvShade = (t: number) => 1 - 0.85 * Math.exp(-(((t - 0.52) / 0.16) ** 2));
const practicals = (w: Place, s: WorldState, night: boolean): P[] => {
  if (w === "street") return [
    { pos: NEON.clone().add(V(0, -0.4, 0.8)), kind: "lamp", color: ["#ff4fa8", s.neon ? (night ? 2.2 : 0.8) : 0], noGlow: !night || !s.neon, glowAt: NEON },
    { pos: DISPLAY.clone().add(V(0, 0.9, 0.3)), kind: "lamp", color: ["#fff2d0", 1.2], noGlow: true },
    ...STREET_LAMP_HEADS.map((h, i) => ({ pos: h.clone().add(V(0, -0.4, 0.3)), kind: "lamp" as const, color: ["#ffb35c", s.lamps > i * 3 ? (night ? 2.2 : 1.6) : 0] as [string, number], glowAt: h })),
    ...PORCH_LAMPS.map((h, i) => ({ pos: h.clone().add(V(0, -0.3, 0.5)), kind: "lamp" as const, color: ["#ffc27a", s.lamps > 4 + i * 3 ? 1.1 : 0] as [string, number], glowAt: h })),
  ];
  // the window's bounce fills the room (cool), the beam does the rest
  if (w === "home") return [{ pos: V(0, 1.7, -1.2), kind: "window", color: ["#eaf2ff", 1.3], noGlow: true }, { pos: V(-0.4, 1.6, 1.2), kind: "lamp", color: ["#dce8ff", 0.6], noGlow: true }];
  if (w === "closet") return [{ pos: V(0, CLOSET.h - 0.3, -0.2), kind: "lamp", color: ["#ffc27a", 1.6], glowAt: V(0, CLOSET.h - 0.12, -CLOSET.d / 2) }];
  if (w === "cinema") return [{ pos: CINEMA_SCREEN.clone().add(V(0, -0.6, 3.5)), kind: "screen", color: ["#a8c8ff", 4.2], noGlow: true }, { pos: V(0, 0.6, 1.0), kind: "lamp", color: ["#ff3a3a", 0.35], noGlow: true }];
  if (w === "ohio") return [{ pos: V(FRIDGE.x, 1.4, FRIDGE.z + 0.6), kind: "lamp", color: ["#f4fbff", s.fridgeLamp ? 1.6 : 0], noGlow: true }, { pos: V(1.5, 2.2, 1.5), kind: "window", color: ["#eef6ff", 0.8], noGlow: true }];
  if (w === "tv") return [{ pos: LIVING.tv.clone().add(V(-0.3, 0.3, -0.7)), kind: "screen", color: ["#8fb8ff", 2.4 * tvShade(s.tvBlock)], noGlow: true }, { pos: V(-2.2, 1.5, -1.0), kind: "lamp", color: ["#ffb060", 0.9], glowAt: V(-2.4, 1.5, -1.2) }];
  return [{ pos: V(0, BOX.h / 2, -BOX.l + 0.12), kind: "lamp", color: ["#fff2d0", 0.25], noGlow: true }];
};
const named = (g: Object3D, n: string) => g.getObjectByName(n);

// the pinhole picture: a bright disc with the Moon's bite out of it (redrawn when the bite moves)
const projCanvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
let projTex: CanvasTexture | null = null, projKey = -1;
const projection = (moon: number) => {
  if (!projCanvas) return null;
  if (!projTex) { projCanvas.width = projCanvas.height = 256; projTex = new CanvasTexture(projCanvas); projTex.colorSpace = SRGBColorSpace; }
  const k = Math.round(moon * 200);
  if (k !== projKey) {
    projKey = k;
    const c = projCanvas.getContext("2d")!, r = 60;
    c.clearRect(0, 0, 256, 256);
    const gr = c.createRadialGradient(128, 128, 0, 128, 128, r * 1.6); gr.addColorStop(0, "rgba(255,250,230,1)"); gr.addColorStop(0.62, "rgba(255,240,200,1)"); gr.addColorStop(0.64, "rgba(255,230,180,0.35)"); gr.addColorStop(1, "rgba(255,230,180,0)");
    c.fillStyle = gr; c.beginPath(); c.arc(128, 128, r * 1.6, 0, 7); c.fill();
    c.globalCompositeOperation = "destination-out";
    // the image is upside down and mirrored in a pinhole viewer: the bite comes in from the upper right
    c.beginPath(); c.arc(128 + 0.82 * moon * r, 128 - 0.57 * moon * r, r * 1.04, 0, 7); c.fill();
    c.globalCompositeOperation = "source-over";
    projTex.needsUpdate = true;
  }
  return projTex;
};

/** One set for a shot, updated every frame from `s`. */
export const World: React.FC<{ w: Place; preset: LightPreset; s: WorldState; F: number; night: boolean }> = ({ w, preset, s, F, night }) => {
  const g = useMemo(builders[w], [w]);
  if (w === "street") {
    const lamps = named(g, "lampHeads");
    lamps?.children.forEach((m, i) => (m.visible = i < STREET_LAMP_HEADS.length ? s.lamps > i * 3 : s.lamps > 4 + (i - STREET_LAMP_HEADS.length) * 3));
  }
  if (w === "home") (named(g, "dots") as Mesh).material = dotsMat(s.dots);
  if (w === "ohio") { named(g, "fridgeDoor")!.rotation.y = 1.9 * s.fridgeDoor; named(g, "fridgeLamp")!.visible = s.fridgeLamp; }
  if (w === "box") { const p = named(g, "projection") as Mesh<BufferGeometry, MeshBasicMaterial>; const t = projection(s.moon); if (t && p.material.map !== t) { p.material.map = t; p.material.needsUpdate = true; } }
  const list = practicals(w, s, night);
  const key = list.map((p) => p.color.join()).join("|");
  const lights = useMemo(() => practicalLights(list, preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const glows = useMemo(() => practicalGlows(list.filter((p) => !p.noGlow && p.color[1] > 0), preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

/** The sun, the Moon's disc and (in totality) the corona, kept at sky distance from the lens. */
export const EclipseSky: React.FC<{ cam: Vector3; sun: Vector3; s: WorldState; night: boolean }> = ({ cam, sun, s, night }) => {
  const g = useMemo(eclipseSky, []);
  placeSky(g, cam, sun.clone().normalize(), s.moon < 2.08 ? s.moon : null, s.total);
  return <primitive object={g} />;
};

export const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(() => { const x = prop.make(); x.traverse((c) => delete c.userData.collider); return x; }, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

// ------------------------------------------------------------------ sprites (colour pass only, SKY layer)
const moth = () => canvasTex(128, 128, (g) => {
  g.lineWidth = 4; g.strokeStyle = "#1c1414";
  g.fillStyle = "#c8b89a"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(64 + s * 26, 56, 26, 20, s * 0.5, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(64 + s * 20, 82, 16, 13, -s * 0.4, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = "#6a5a4a"; g.beginPath(); g.ellipse(64, 68, 8, 22, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(60, 48); g.lineTo(50, 30); g.moveTo(68, 48); g.lineTo(78, 30); g.stroke();
});
const owl = () => canvasTex(128, 128, (g) => {
  g.lineWidth = 5; g.strokeStyle = "#1c1414";
  g.fillStyle = "#8a6a4a"; g.beginPath(); g.ellipse(64, 74, 34, 42, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#c8a878"; g.beginPath(); g.ellipse(64, 86, 20, 26, 0, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = "#fbf6e8"; g.beginPath(); g.arc(64 + s * 15, 56, 13, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#1c1414"; g.beginPath(); g.arc(64 + s * 15, 57, 6, 0, 7); g.fill(); g.beginPath(); g.moveTo(64 + s * 22, 36); g.lineTo(64 + s * 32, 22); g.lineTo(64 + s * 12, 34); g.fill(); }
  g.fillStyle = "#f2a83a"; g.beginPath(); g.moveTo(58, 68); g.lineTo(70, 68); g.lineTo(64, 80); g.fill();
  g.strokeStyle = "#f2a83a"; g.lineWidth = 4; for (const x of [54, 74]) { g.beginPath(); g.moveTo(x, 114); g.lineTo(x, 124); g.stroke(); }
});
const owlHoot = () => canvasTex(128, 128, (g) => {
  g.lineWidth = 5; g.strokeStyle = "#1c1414";
  g.fillStyle = "#8a6a4a"; g.beginPath(); g.ellipse(64, 74, 34, 42, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#c8a878"; g.beginPath(); g.ellipse(64, 86, 20, 26, 0, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = "#fbf6e8"; g.beginPath(); g.arc(64 + s * 15, 56, 15, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#1c1414"; g.beginPath(); g.arc(64 + s * 15, 56, 8, 0, 7); g.fill(); g.beginPath(); g.moveTo(64 + s * 22, 36); g.lineTo(64 + s * 32, 22); g.lineTo(64 + s * 12, 34); g.fill(); }
  g.fillStyle = "#3a1418"; g.beginPath(); g.ellipse(64, 76, 8, 10, 0, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = "#f2a83a"; g.lineWidth = 4; for (const x of [54, 74]) { g.beginPath(); g.moveTo(x, 114); g.lineTo(x, 124); g.stroke(); }
});
const fly = () => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(240,255,150,1)"); r.addColorStop(0.25, "rgba(220,255,110,0.8)"); r.addColorStop(1, "rgba(200,255,80,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const heat = () => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,250,235,0.35)"); r.addColorStop(1, "rgba(255,250,235,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const bill = () => canvasTex(64, 40, (g) => { g.fillStyle = "#8ac87a"; g.fillRect(2, 2, 60, 36); g.strokeStyle = "#2a5a2a"; g.lineWidth = 3; g.strokeRect(4, 4, 56, 32); g.fillStyle = "#2a5a2a"; g.beginPath(); g.ellipse(32, 20, 8, 10, 0, 0, 7); g.fill(); });
const TEX = { moth, owl, owlHoot, fly, heat, bill };
const pts = (n: number, kind: keyof typeof TEX, size: number) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  const glow = kind === "fly" || kind === "heat";
  const m = new PointsMaterial({ size, map: TEX[kind](), transparent: true, depthWrite: false, alphaTest: glow ? 0 : 0.2, blending: NormalBlending, toneMapped: !glow });
  const p = new Points(g, m);
  p.layers.set(SKY);
  p.frustumCulled = false;
  p.renderOrder = 5;
  return p;
};
/** `at(i, F)` places sprite i (null hides it far below the world). */
export const Sprites: React.FC<{ n: number; F: number; at: (i: number, F: number) => Vector3 | null; kind: keyof typeof TEX; size: number }> = ({ n, F, at, kind, size }) => {
  const p = useMemo(() => pts(n, kind, size), [n, kind, size]);
  const pos = p.geometry.attributes.position as BufferAttribute;
  for (let i = 0; i < n; i++) { const q = at(i, F) ?? V(0, -50, 0); pos.setXYZ(i, q.x, q.y, q.z); }
  pos.needsUpdate = true;
  return <primitive object={p} />;
};
export { glowSprite, rnd };
