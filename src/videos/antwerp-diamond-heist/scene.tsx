import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Material, Mesh, NormalBlending, Object3D, Points, PointsMaterial, Vector3 } from "three";
import type { MovingProp } from "../../../kit/toon/guard";
import { SKY } from "../../../kit/toon/ink";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import { practicalGlows } from "../../../kit/toon/glow";
import type { PracticalKind } from "../../../kit/toon/shade";
import { practicalLights } from "../../../kit/toon/shade";
import { photoSky } from "../../../kit/toon/sky";
import { V, canvasTex } from "./common";
import { CAR, LAMPS, SANDWICH, SHOP, car, forest, street } from "./outside";
import { HIDE, ITABLE, LAMP, MIRROR, OFFICE, WIN, hideout, interview, office } from "./rooms";
import { BOX, CORR, DESK, DOOR, EMERGENCY, RADAR, SENSOR, calendarMat, vault } from "./vault";

/**
 * antwerp-diamond-heist: one light per scene identity (user 2026-11-22: a vibe is NOT a warm filter):
 *   vaultNight  tense: cold blue-green dark, one emergency light, red alarm LEDs (lines 1-5, 14-17, 29)
 *   vaultGold   the payoff: warm gold spilling out of the open vault (18-19)
 *   vaultDay    the routine: flat cool fluorescent with the guard's warm lamp (8-9, 28)
 *   office      the energetic setup: crisp late-morning sun, saturated (7-8, 28)
 *   hideNight   scheming: an amber lamp pool over the table, cool window, half the room dark (6, 10-12)
 *   hideDawn    the morning after: pale pink-blue window light, the lamp still on (20, 27)
 *   street      the walk: navy photo night, warm lamp pools on wet cobbles (13)
 *   forest      eerie quiet: a misty grey-green dawn, low sun shafts through the firs (2, 21-26)
 *   interview   the end: one hard white lamp, cold green-grey walls (30)
 */
export const VAULT_NIGHT: LightPreset = { ...LIGHTS.interior, lit: [0.34, 0.46, 0.62], shade: [0.08, 0.11, 0.17], lift: [0.008, 0.014, 0.03], litTint: "#9cc8f0", lamp: ["#8fd0ff", 2.6], sat: 1.12, char: { tint: [0.82, 0.92, 1.0], shade: 0.86 }, charInk: "#141a2c", grade: "night" };
export const VAULT_GOLD: LightPreset = { ...LIGHTS.interior, lit: [0.62, 0.56, 0.5], shade: [0.12, 0.12, 0.16], lift: [0.012, 0.012, 0.025], litTint: "#ffd8a0", lamp: ["#ffc066", 3.6], sat: 1.2, char: { tint: [1.0, 0.9, 0.78], shade: 0.88 }, grade: "night" };
export const VAULT_DAY: LightPreset = { ...LIGHTS.interior, lit: [0.98, 1.02, 1.0], shade: [0.4, 0.43, 0.48], litTint: "#eef8ff", lamp: ["#ffc27a", 1.8], sat: 1.12 };
export const OFFICE_L: LightPreset = { ...LIGHTS.interior, lit: [1.22, 1.1, 0.92], shade: [0.44, 0.44, 0.56], lift: [0.025, 0.03, 0.05], litTint: "#ffe6c0", lamp: ["#ffe2b0", 1.0], sat: 1.22, char: { tint: [1.0, 0.97, 0.92], shade: 0.92 } };
export const HIDE_NIGHT: LightPreset = { ...LIGHTS.interior, lit: [0.36, 0.38, 0.6], shade: [0.1, 0.1, 0.2], lift: [0.01, 0.01, 0.03], litTint: "#a8b8e8", lamp: ["#ffa850", 3.6], sat: 1.16, grade: "night" };
export const HIDE_DAWN: LightPreset = { ...LIGHTS.interior, lit: [0.8, 0.7, 0.8], shade: [0.3, 0.28, 0.42], lift: [0.02, 0.02, 0.04], litTint: "#ffd8dc", lamp: ["#ffc27a", 1.4], sat: 1.14 };
export const INTERVIEW_L: LightPreset = { ...LIGHTS.interior, lit: [0.62, 0.74, 0.68], shade: [0.16, 0.2, 0.2], lift: [0.01, 0.015, 0.015], litTint: "#e8fff4", lamp: ["#f4f8ff", 3.0], sat: 1.04, grade: "night" };
const STREET_SKY = photoSky({ ...LIGHTS.night, lit: [0.42, 0.5, 0.8], shade: [0.12, 0.14, 0.28], lamp: ["#ffa850", 4.4], sat: 1.14 }, "kloppenheim_07_puresky", { exposure: 0.3, tint: "#bccbe8", yaw: 30 });
export const STREET_L = STREET_SKY.preset, STREET_SUN = STREET_SKY.key;
const FOREST_SKY = photoSky({ ...LIGHTS.day, lit: [1.08, 1.06, 1.0], shade: [0.36, 0.42, 0.48], lift: [0.03, 0.04, 0.05], litTint: "#eef4f0", sat: 1.0, haze: { color: "#c8d0d0", start: 16, amount: 0.12 }, char: { tint: [0.96, 0.98, 1.0], shade: 0.9 } }, "kloofendal_misty_morning_puresky", { exposure: 0.82, yaw: 150 });
export const FOREST_L = FOREST_SKY.preset, FOREST_SUN = FOREST_SKY.key;
export const IN_SUN = V(0.35, 0.85, 0.4).normalize();

export type Place = "vault" | "vaultA" | "office" | "hideNight" | "hideDawn" | "street" | "forest" | "interview";
/** What the sets show at a composition frame (story.ts `worldAt`). */
export type WorldState = {
  door: number; dial: number; rings: number; heat: boolean; radar: number | null; mag: boolean; plate: boolean; tape: boolean;
  fogLens: boolean; heatLed: boolean; lightLed: boolean; boxes: number; loot: boolean; cal: number; cups: number;
  officeDoor: number; hatch: number; litter: boolean; horror: boolean; lightsOn: boolean; torch: number | null;
};

const builders: Record<Place, () => Object3D> = { vault: () => vault(false), vaultA: () => vault(true), office, hideNight: () => hideout("night"), hideDawn: () => hideout("dawn"), street, forest, interview };
type P = { pos: Vector3; kind: PracticalKind; color: [string, number]; glowAt?: Vector3; noGlow?: boolean };
const practicals = (w: Place, s: WorldState): P[] => {
  if (w === "vault" || w === "vaultA") {
    if (s.lightsOn) return [
      ...[2.4, 5.4, 8.4].map((z) => ({ pos: V(0, 2.4, z), kind: "lamp" as const, color: ["#eef8ff", 0.65] as [string, number], noGlow: true })),
      { pos: V(DESK.x + 0.1, 1.2, DESK.z + 0.6), kind: "lamp", color: ["#ffc27a", 0.8], noGlow: true },
    ];
    return [
      { pos: EMERGENCY.clone().add(V(0, -0.3, 0.8)), kind: "lamp", color: ["#8fd0ff", 1.5], glowAt: EMERGENCY },
      { pos: V(DESK.x - 0.2, 1.25, DESK.z + 0.5), kind: "lamp", color: ["#ffb35c", 0.9], noGlow: true }, // the guard's lamp, left on
      { pos: SENSOR.clone().add(V(-0.3, -0.2, 0)), kind: "lamp", color: ["#ff3a2a", s.heatLed ? 0.14 : 0], noGlow: true },
      { pos: DOOR.clone().add(V(0, 0.4, 0.6)), kind: "lamp", color: ["#ffc066", 1.9 * s.door], noGlow: true },
      { pos: V(0, 1.8, -3.5), kind: "lamp", color: ["#ffc870", 1.5 * Math.min(1, s.door * 2)], noGlow: true },
    ];
  }
  if (w === "office") return [{ pos: V(0.35, 1.6, OFFICE.z0 + 0.8), kind: "window", color: ["#fff0d8", 1.2], noGlow: true }, { pos: MIRROR.clone().add(V(-1.2, 0.4, 0)), kind: "lamp", color: ["#fff6e8", 0.4], noGlow: true }];
  if (w === "hideNight" || w === "hideDawn") return [
    { pos: LAMP.clone().add(V(0, -0.5, 0)), kind: "lamp", color: ["#ffb35c", w === "hideNight" ? 1.6 : 0.6], glowAt: LAMP.clone().add(V(0, -0.25, 0)) },
    { pos: WIN.clone().add(V(0.9, 0, 0)), kind: "window", color: [w === "hideNight" ? "#7a9ae8" : "#ffd0c8", w === "hideNight" ? 0.7 : 1.3], noGlow: true },
  ];
  if (w === "street") return [...LAMPS.map((p) => ({ pos: p.clone().add(V(0, 3.6, 0.5)), kind: "lamp" as const, color: ["#ffb35c", 1.8] as [string, number], glowAt: p.clone().add(V(0, 4.1, 0)) })), { pos: SHOP.clone().add(V(0, -0.2, 1.2)), kind: "shop", color: ["#ff9a8a", 1.4], noGlow: true }];
  if (w === "forest") return [
    { pos: CAR.clone().add(V(2.4, 0.7, 0.6)), kind: "lamp", color: ["#fff4d8", 0.6], noGlow: true },
    ...(s.horror ? [{ pos: SANDWICH.clone().add(V(0.05, 0.12, 0.25)), kind: "lamp" as const, color: ["#cfe0ff", 1.8] as [string, number], noGlow: true }] : []),
  ];
  return [{ pos: ITABLE.clone().add(V(0, 1.2, -0.2)), kind: "lamp", color: ["#f4f8ff", 1.6], noGlow: true }];
};
const named = (g: Object3D, n: string) => g.getObjectByName(n);
const show = (g: Object3D, n: string, v: boolean) => { const o = named(g, n); if (o) o.visible = v; };

/** One set for a shot, updated every frame from `s`. */
export const World: React.FC<{ w: Place; preset: LightPreset; s: WorldState; F: number }> = ({ w, preset, s, F }) => {
  const g = useMemo(builders[w], [w]);
  if (w === "vault" || w === "vaultA") {
    named(g, "vaultDoor")!.rotation.y = -1.75 * s.door;
    named(g, "dial")!.rotation.z = s.dial;
    for (let k = 0; k < 10; k++) show(g, `ring${k}`, k < s.rings);
    show(g, "heatCone", s.heat);
    show(g, "magField", s.mag);
    show(g, "alPlate", s.plate);
    show(g, "alTape", s.plate);
    show(g, "tapeStrip", s.tape);
    show(g, "sensorFog", s.fogLens);
    show(g, "heatLed", s.heatLed && (s.lightsOn || Math.floor(F / 12) % 2 === 0));
    show(g, "lightLed", s.lightLed);
    show(g, "loot", s.loot);
    const torch = named(g, "torch");
    if (torch) { torch.visible = s.torch !== null; if (s.torch !== null) torch.position.set(2.17, 2.0 + 0.35 * Math.sin(s.torch / 11), 1.9 + 0.9 * Math.sin(s.torch / 15)); }
    show(g, "spill", s.door > 0.05);
    const spill = named(g, "spill");
    if (spill) spill.scale.set(1, 1, 0.3 + 0.7 * s.door);
    for (let k = 0; k < 3; k++) {
      const r = named(g, `ripple${k}`)!;
      r.visible = s.radar !== null;
      if (s.radar !== null) { const ph = (s.radar / 24 + k / 3) % 1; r.scale.setScalar(0.2 + 2.2 * ph); ((r as Mesh).material as Material & { opacity: number }).opacity = 0.6 * (1 - ph); }
    }
    // boxes open in a wave down the rows (rows nearest the lens first)
    const doors = named(g, "boxHinges")!;
    doors.children.forEach((h, i) => {
      const r = Math.floor(i / BOX.cols), c = i % BOX.cols, order = (BOX.cols - 1 - c) * BOX.rows + (BOX.rows - 1 - r);
      const t = Math.min(Math.max(s.boxes - order * 0.62, 0), 1);
      h.rotation.y = -1.9 * t * t * (3 - 2 * t);
    });
    (named(g, "calendar") as Mesh).material = calendarMat(s.cal);
    show(g, "desk1", s.cal === 1);
    show(g, "desk10", s.cal === 2);
    show(g, "desk500", s.cal !== 1 && s.cal !== 2);
  }
  if (w === "hideNight" || w === "hideDawn") { const c = named(g, "cups"); if (c) c.scale.set(1, Math.max(0.05, s.cups), 1); }
  if (w === "office") named(g, "officeDoor")!.rotation.y = 1.5 * s.officeDoor;
  if (w === "street") { const n = named(g, "neonHeart"); if (n) n.visible = Math.floor(F / 9) % 3 !== 0; }
  if (w === "forest") { show(g, "litter", s.litter); const h = named(g, "hatch"); if (h) h.rotation.z = -1.4 * s.hatch; }
  const list = practicals(w, s);
  const key = list.map((p) => p.color.join()).join("|");
  const lights = useMemo(() => practicalLights(list, preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const glows = useMemo(() => practicalGlows(list.filter((p) => !p.noGlow && p.color[1] > 0), preset), [key, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

export const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

// ------------------------------------------------------------------ sprites (colour pass only, SKY layer)
const mist = () => canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(250,246,255,0.75)"); r.addColorStop(1, "rgba(250,246,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const sparkle = () => canvasTex(64, 64, (g) => { g.fillStyle = "#fff6d8"; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 7 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } g.fill(); });
const digit = (d: number) => () => canvasTex(64, 64, (g) => { g.fillStyle = "#ffe8a0"; g.strokeStyle = "#1c1414"; g.lineWidth = 6; g.font = "900 54px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.strokeText(String(d), 32, 34); g.fillText(String(d), 32, 34); });
const paper = () => canvasTex(64, 64, (g) => { g.fillStyle = "#f6f0e4"; g.fillRect(10, 16, 44, 32); g.strokeStyle = "#1c1414"; g.lineWidth = 3; g.strokeRect(10, 16, 44, 32); g.strokeStyle = "#8a8a9a"; g.lineWidth = 2; for (const y of [26, 34, 42]) { g.beginPath(); g.moveTo(16, y); g.lineTo(48, y); g.stroke(); } });
const pigeon = () => canvasTex(128, 128, (g) => {
  g.lineWidth = 5; g.strokeStyle = "#1c1414";
  g.fillStyle = "#8a90a8"; g.beginPath(); g.ellipse(60, 74, 38, 26, -0.2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#6a7088"; g.beginPath(); g.ellipse(48, 70, 26, 14, -0.4, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#9aa0b8"; g.beginPath(); g.arc(94, 46, 17, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#5ab08a"; g.fillRect(84, 58, 16, 8);
  g.fillStyle = "#e8a03a"; g.beginPath(); g.moveTo(110, 46); g.lineTo(124, 50); g.lineTo(110, 54); g.fill();
  g.fillStyle = "#ff8a2a"; g.beginPath(); g.arc(98, 42, 4, 0, 7); g.fill();
  g.strokeStyle = "#d86a3a"; g.lineWidth = 4; for (const x of [56, 70]) { g.beginPath(); g.moveTo(x, 98); g.lineTo(x, 116); g.stroke(); }
});
const TEX = { mist, sparkle, paper, pigeon, d1: digit(1), d4: digit(4), d7: digit(7), d9: digit(9), d0: digit(0) };
const pts = (n: number, kind: keyof typeof TEX, size: number) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  const m = new PointsMaterial({ size, map: TEX[kind](), transparent: true, depthWrite: false, alphaTest: kind === "mist" ? 0 : 0.2, blending: NormalBlending, opacity: kind === "mist" ? 0.8 : 1 });
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
export { CORR, HIDE, RADAR, car };
