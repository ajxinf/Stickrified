import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Mesh, NormalBlending, Object3D, Points, PointsMaterial, Texture, Vector3 } from "three";
import { setWater } from "../../../kit/toon/build/water";
import { practicalGlows } from "../../../kit/toon/glow";
import type { MovingProp } from "../../../kit/toon/guard";
import { SKY } from "../../../kit/toon/ink";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import type { PracticalKind } from "../../../kit/toon/shade";
import { practicalLights } from "../../../kit/toon/shade";
import { photoSky } from "../../../kit/toon/sky";
import { V, canvasTex } from "./common";
import { duckFrame } from "./critters";
import { DESK, HOME, KITCHEN, home, mart, school, CLASS, HALL } from "./rooms";
import { GYM_DOOR, LAMPS, LOT_LAMPS, lampHead, promNight, town } from "./town";

/**
 * followers-make-you-tall: one light per scene identity (user 2026-11-22: a vibe is NOT a warm filter):
 *   day      the rule, the town, the giants: crisp high sun, saturated colour, white cumulus (lines 1, 3-4, 8-9)
 *   morning  your commute with the duck, the bus stop: a soft low gold sun through morning haze (6, 11)
 *   home     the apartment: warm sun through the desk window, cool kitchen fill (2, 5, 12, 14-16)
 *   school   cool fluorescent overheads, pale daylight from the classroom windows (7, 10)
 *   mart     flat bright supermarket white, saturated packaging (13)
 *   night    prom night: navy sky, sodium lamp pools, the gym's warm doorway, a cool moon rim (17-29)
 */
const DAY_SKY = photoSky({ ...LIGHTS.day, lit: [1.56, 1.5, 1.36], shade: [0.32, 0.35, 0.52], lift: [0.03, 0.035, 0.07], litTint: "#fff4e4", sat: 1.26, haze: { color: "#cfe0f5", start: 320, amount: 0.1 }, fogNear: 240, fogFar: 1400, char: { tint: [1.0, 0.98, 0.95], shade: 0.93 } }, "kloofendal_48d_partly_cloudy_puresky", { exposure: 1.0, yaw: 150 });
export const DAY = DAY_SKY.preset, DAY_SUN = DAY_SKY.key;
const MORNING_SKY = photoSky({ ...LIGHTS.golden, lit: [1.32, 1.14, 0.92], shade: [0.3, 0.32, 0.48], lift: [0.03, 0.03, 0.06], litTint: "#ffe2b8", sat: 1.16, haze: { color: "#e8d8c8", start: 25, amount: 0.24 }, char: { tint: [1.0, 0.96, 0.9], shade: 0.92 } }, "kloofendal_misty_morning_puresky", { exposure: 1.0, yaw: 200 });
export const MORNING = MORNING_SKY.preset, MORNING_SUN = MORNING_SKY.key;
const NIGHT_SKY = photoSky({ ...LIGHTS.night, lit: [0.5, 0.58, 0.92], shade: [0.14, 0.16, 0.3], lift: [0.015, 0.018, 0.04], lamp: ["#ffa850", 5.2], sat: 1.18, fogNear: 120, fogFar: 1600 }, "kloppenheim_07_puresky", { exposure: 0.4, tint: "#bccbe8", yaw: 20 });
export const NIGHT = NIGHT_SKY.preset, NIGHT_SUN = NIGHT_SKY.key;
const HOME_SKY = photoSky({ ...LIGHTS.sunInterior, lit: [1.3, 1.2, 1.06], shade: [0.46, 0.5, 0.62], lift: [0.05, 0.06, 0.08], litTint: "#fff2dc", lamp: ["#ffc27a", 1.4], sat: 1.18, char: { tint: [1.0, 0.97, 0.93], shade: 0.9 } }, "qwantani_late_afternoon_puresky", { exposure: 0.85, yaw: 0 });
export const HOME_L = HOME_SKY.preset;
export const SCHOOL_L: LightPreset = { ...LIGHTS.interior, lit: [1.18, 1.26, 1.34], shade: [0.42, 0.46, 0.56], lift: [0.04, 0.05, 0.07], litTint: "#eef6ff", lamp: ["#eef6ff", 2.0], sat: 1.16, char: { tint: [0.98, 1.0, 1.02], shade: 0.9 } };
export const MART_L: LightPreset = { ...LIGHTS.interior, lit: [1.3, 1.3, 1.26], shade: [0.5, 0.52, 0.56], lift: [0.05, 0.05, 0.06], litTint: "#f8fbff", lamp: ["#f4f8ff", 2.2], sat: 1.24, char: { tint: [1.0, 1.0, 1.0], shade: 0.92 } };
export const IN_SUN = V(0.4, 0.8, 0.45).normalize();

export type Place = "town" | "home" | "school" | "mart";
const builders: Record<Place, () => Object3D> = { town, home, school, mart };
type P = { pos: Vector3; kind: PracticalKind; color: [string, number]; glowAt?: Vector3; noGlow?: boolean };
const practicals = (w: Place, night: boolean): P[] => {
  if (w === "town") return night ? [
    ...LAMPS.map((p) => ({ pos: lampHead(p).add(V(0, -0.5, 0)), kind: "lamp" as const, color: ["#ffa850", 2.4] as [string, number], glowAt: lampHead(p) })),
    ...LOT_LAMPS.map((p) => ({ pos: lampHead(p).add(V(0, -0.5, 0)), kind: "lamp" as const, color: ["#ffb060", 2.6] as [string, number], glowAt: lampHead(p) })),
    { pos: GYM_DOOR.clone().add(V(0, 2.4, -1.6)), kind: "lamp", color: ["#ffc27a", 3.2], glowAt: GYM_DOOR.clone().add(V(0, 1.6, -0.3)) },
  ] : [];
  if (w === "home") return [{ pos: V(DESK.x, 2.0, HOME.z0 + 0.6), kind: "window", color: ["#fff0d8", 1.5], noGlow: true }, { pos: KITCHEN.clone().add(V(0, 2.2, 1.2)), kind: "lamp", color: ["#e8f0ff", 0.7], noGlow: true }];
  if (w === "school") return [{ pos: V((HALL.x0 + HALL.x1) / 2, HALL.h - 0.3, 0), kind: "lamp", color: ["#eef6ff", 1.2], noGlow: true }, { pos: V(CLASS.x1 - 1, 2.2, 0), kind: "window", color: ["#eef6ff", 1.4], noGlow: true }];
  return [{ pos: V(0, 3.0, -1.5), kind: "lamp", color: ["#f4f8ff", 1.4], noGlow: true }];
};

/** One set for a shot (night dressing on the town at night). */
export const World: React.FC<{ w: Place; preset: LightPreset; F: number; night: boolean }> = ({ w, preset, F, night }) => {
  const g = useMemo(() => { const o = builders[w](); if (w === "town" && night) o.add(promNight()); return o; }, [w, night]);
  const pond = g.getObjectByName("pond") as Mesh | undefined;
  if (pond) setWater(pond, F);
  const list = practicals(w, night);
  const key = list.map((p) => p.color.join()).join("|");
  const lights = useMemo(() => practicalLights(list, preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const glows = useMemo(() => practicalGlows(list.filter((p) => !p.noGlow && p.color[1] > 0), preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

export const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(() => { const x = prop.make(); x.traverse((c) => delete c.userData.collider); return x; }, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

// ------------------------------------------------------------------ effect sprites (colour pass only, SKY layer)
const pigeon = () => canvasTex(96, 64, (g) => { g.fillStyle = "#6a6e7a"; g.strokeStyle = "#1c1414"; g.lineWidth = 4; g.beginPath(); g.ellipse(48, 36, 22, 13, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(30, 30); g.quadraticCurveTo(14, 4, 4, 14); g.quadraticCurveTo(22, 28, 40, 30); g.fill(); g.stroke(); g.beginPath(); g.moveTo(60, 30); g.quadraticCurveTo(80, 4, 92, 14); g.quadraticCurveTo(72, 28, 56, 30); g.fill(); g.stroke(); });
const drop = () => canvasTex(16, 64, (g) => { const r = g.createLinearGradient(0, 0, 0, 64); r.addColorStop(0, "rgba(200,225,250,0)"); r.addColorStop(1, "rgba(210,230,255,0.85)"); g.fillStyle = r; g.fillRect(6, 0, 4, 64); });
const cloud = () => canvasTex(256, 256, (g) => { for (let i = 0; i < 9; i++) { const x = 70 + (i % 3) * 58 + (i * 37) % 20, y = 90 + Math.floor(i / 3) * 34, r = g.createRadialGradient(x, y, 0, x, y, 70); r.addColorStop(0, "rgba(255,255,255,0.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 256, 256); } });
const smoke = () => canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,0.95)"); r.addColorStop(0.5, "rgba(245,245,250,0.6)"); r.addColorStop(1, "rgba(240,240,250,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); });
const spark = () => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(255,250,220,1)"); r.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const DUCK_TEX: Record<string, () => Texture> = { duckA: () => duckFrame(0.0, 1), duckB: () => duckFrame(0.5, 1), duckAl: () => duckFrame(0.0, -1), duckBl: () => duckFrame(0.5, -1) };
const TEX: Record<string, () => Texture> = { pigeon, drop, cloud, smoke, spark, ...DUCK_TEX };
export type SpriteKind = keyof typeof TEX;
const pts = (n: number, kind: SpriteKind, size: number, atten: boolean) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  const glow = kind === "spark" || kind === "drop" || kind === "smoke" || kind === "cloud";
  const m = new PointsMaterial({ size, map: TEX[kind](), transparent: true, depthWrite: false, alphaTest: glow ? 0 : 0.3, blending: NormalBlending, toneMapped: !glow, sizeAttenuation: atten });
  const p = new Points(g, m);
  p.layers.set(SKY);
  p.frustumCulled = false;
  p.renderOrder = 5;
  return p;
};
/** `at(i, F)` places sprite i (null hides it far below the world). */
export const Sprites: React.FC<{ n: number; F: number; at: (i: number, F: number) => Vector3 | null; kind: SpriteKind; size: number }> = ({ n, F, at, kind, size }) => {
  const p = useMemo(() => pts(n, kind, size, true), [n, kind, size]);
  const pos = p.geometry.attributes.position as BufferAttribute;
  for (let i = 0; i < n; i++) { const q = at(i, F) ?? V(0, -500, 0); pos.setXYZ(i, q.x, q.y, q.z); }
  pos.needsUpdate = true;
  return <primitive object={p} />;
};
export { KITCHEN };
