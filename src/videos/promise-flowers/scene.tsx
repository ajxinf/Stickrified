import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, NormalBlending, Object3D, Points, PointsMaterial, Vector3 } from "three";
import type { MovingProp } from "../../../kit/toon/guard";
import { SKY } from "../../../kit/toon/ink";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import { practicalGlows } from "../../../kit/toon/glow";
import { practicalLights } from "../../../kit/toon/shade";
import { photoSky } from "../../../kit/toon/sky";
import { CLOCK, FLOOR_LAMP, TV, V, canvasTex, debateChairs, home, town } from "./world";

/**
 * promise-flowers: light presets, the two worlds as components, and the small living things (bees, the fly, stink
 * clouds) as point sprites on the SKY layer (colour pass only: no ink, and the QA ground rays ignore them).
 */
// ------------------------------------------------------------------ light
// Day: the partly-cloudy photo sky turned so its sun stands east (+x, az 90) 48 deg up: raking side light for the lens
// looking south at the houses and north at the stage alike.
const DAY_SKY = photoSky({ ...LIGHTS.day, lit: [1.3, 1.25, 1.14], shade: [0.56, 0.55, 0.68], haze: { color: "#b8d0ec", start: 45, amount: 0.22 } }, "kloofendal_48d_partly_cloudy_puresky", { exposure: 1.0, yaw: 56 });
export const DAY = DAY_SKY.preset, SUN = DAY_SKY.key;
// Golden (last line): the late-afternoon photo sky, its sun turned to rake in from the front-right of the hives lens.
const GOLD_SKY = photoSky({ ...LIGHTS.sunset, lit: [1.38, 1.0, 0.7], shade: [0.36, 0.38, 0.62] }, "qwantani_late_afternoon_puresky", { exposure: 1.0, yaw: 100 });
export const GOLD = GOLD_SKY.preset, GOLD_SUN = GOLD_SKY.key;
export const HOME_DAY: LightPreset = { ...LIGHTS.interior, lit: [0.98, 0.94, 0.86], shade: [0.46, 0.43, 0.5], litTint: "#fff2dc", lamp: ["#ffd9a8", 0.8] };
export const HOME_NIGHT: LightPreset = { ...LIGHTS.interior, lit: [0.42, 0.44, 0.6], shade: [0.16, 0.17, 0.28], lift: [0.012, 0.014, 0.03], litTint: "#b8c8f0", lamp: ["#ffb35c", 2.6], grade: "night" };
export const HOME_SUN = V(0.35, 0.85, 0.4).normalize();

// ------------------------------------------------------------------ worlds
/** The town for composition frame F: chairs + debate banner from `debateFrom`, the store sign flipped from `signAt`. */
export const Town: React.FC<{ F: number; debate: boolean; signFlip: number }> = ({ debate, signFlip }) => {
  const g = useMemo(town, []);
  const chairs = useMemo(debateChairs, []);
  chairs.visible = debate;
  g.getObjectByName("bannerDerek")!.visible = !debate;
  g.getObjectByName("bannerDebate")!.visible = debate;
  g.getObjectByName("storeSign")!.rotation.y = Math.PI * signFlip;
  return <><primitive object={g} /><primitive object={chairs} /></>;
};

/** Home: day or night; the TV on at night; the puddle grows with `puddle` (scale). */
export const Home: React.FC<{ night: boolean; preset: LightPreset; puddle: number; tv: boolean }> = ({ night, preset, puddle, tv }) => {
  const g = useMemo(() => home(night), [night]);
  g.getObjectByName("puddle")!.scale.set(puddle, 1, puddle);
  g.getObjectByName("tvScreen")!.visible = tv;
  const list = useMemo(() => [
    { pos: FLOOR_LAMP.clone().add(V(-0.25, -0.1, 0.3)), kind: "lamp" as const, color: [night ? "#ffb35c" : "#ffd9a8", night ? 2.2 : 0.5] as [string, number], glowAt: FLOOR_LAMP },
    { pos: TV.clone().add(V(0, 0.2, -0.6)), kind: "screen" as const, color: ["#9fc8ff", tv ? 0.9 : 0] as [string, number] },
    { pos: CLOCK.clone().add(V(0.6, -0.2, 1.4)), kind: "lamp" as const, color: [night ? "#ffc27a" : "#fff2dc", night ? 0.4 : 0.7] as [string, number], noGlow: true },
  ], [night, tv]);
  const lights = useMemo(() => practicalLights(list, preset), [list, preset]);
  const glows = useMemo(() => practicalGlows(list.filter((l) => l.kind === "lamp" && !l.noGlow && night), preset), [list, preset, night]);
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

export const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

// ------------------------------------------------------------------ bees, the fly, stink clouds
const beeTex = () => canvasTex(64, 64, (g) => {
  g.fillStyle = "rgba(220,235,255,0.85)";
  g.beginPath(); g.ellipse(24, 20, 10, 7, -0.5, 0, 7); g.fill();
  g.beginPath(); g.ellipse(40, 20, 10, 7, 0.5, 0, 7); g.fill();
  g.fillStyle = "#f2c23a"; g.beginPath(); g.ellipse(32, 36, 16, 11, 0, 0, 7); g.fill();
  g.fillStyle = "#1c1414"; g.fillRect(26, 25, 4, 22); g.fillRect(35, 25, 4, 22);
  g.strokeStyle = "#1c1414"; g.lineWidth = 2.5; g.beginPath(); g.ellipse(32, 36, 16, 11, 0, 0, 7); g.stroke();
});
const flyTex = () => canvasTex(64, 64, (g) => {
  g.fillStyle = "rgba(235,242,255,0.9)";
  g.beginPath(); g.ellipse(22, 22, 12, 7, -0.6, 0, 7); g.fill();
  g.beginPath(); g.ellipse(42, 22, 12, 7, 0.6, 0, 7); g.fill();
  g.strokeStyle = "#1c1414"; g.lineWidth = 2; g.stroke();
  g.fillStyle = "#1c1414"; g.beginPath(); g.ellipse(32, 36, 9, 12, 0, 0, 7); g.fill();
  g.fillStyle = "#c8342c"; g.beginPath(); g.arc(28, 27, 3, 0, 7); g.arc(36, 27, 3, 0, 7); g.fill();
});
const puffTex = () => canvasTex(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(150,190,70,0.75)"); r.addColorStop(0.6, "rgba(130,170,60,0.35)"); r.addColorStop(1, "rgba(120,160,60,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});
const swarm = (n: number, tex: () => ReturnType<typeof canvasTex>, size: number, opacity = 1) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  const m = new PointsMaterial({ size, map: tex(), transparent: true, depthWrite: false, alphaTest: opacity < 1 ? 0 : 0.25, opacity, blending: NormalBlending });
  const p = new Points(g, m);
  p.layers.set(SKY);
  p.frustumCulled = false;
  p.renderOrder = 5;
  return p;
};
/** `at(i, F)` places sprite i (null hides it, far below the world). */
const Sprites: React.FC<{ n: number; F: number; at: (i: number, F: number) => Vector3 | null; kind: "bee" | "fly" | "puff"; size: number }> = ({ n, F, at, kind, size }) => {
  const pts = useMemo(() => swarm(n, kind === "bee" ? beeTex : kind === "fly" ? flyTex : puffTex, size, kind === "puff" ? 0.7 : 1), [n, kind, size]);
  const pos = pts.geometry.attributes.position as BufferAttribute;
  for (let i = 0; i < n; i++) {
    const p = at(i, F) ?? V(0, -50, 0);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  return <primitive object={pts} />;
};
export const Bees: React.FC<{ n: number; F: number; at: (i: number, F: number) => Vector3 | null; size?: number }> = ({ n, F, at, size = 0.09 }) => <Sprites n={n} F={F} at={at} kind="bee" size={size} />;
export const Fly: React.FC<{ F: number; at: (F: number) => Vector3 | null; size?: number }> = ({ F, at, size = 0.07 }) => <Sprites n={1} F={F} at={(_, f) => at(f)} kind="fly" size={size} />;
export const Stink: React.FC<{ n: number; F: number; at: (i: number, F: number) => Vector3 | null; size?: number }> = ({ n, F, at, size = 0.7 }) => <Sprites n={n} F={F} at={at} kind="puff" size={size} />;
/** A single falling petal (line 16). */
export const petal = () => {
  const m = new Mesh(new BufferGeometry().setFromPoints([V(-0.02, 0, 0), V(0.02, 0, 0), V(0, 0.035, 0)]), new MeshBasicMaterial({ color: "#7a5a3a", side: 2 }));
  m.layers.set(SKY);
  const o = new Object3D();
  o.add(m);
  return o;
};
