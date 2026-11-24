import { useFrame, useThree } from "@react-three/fiber";
import { createElement, useMemo } from "react";
import { CanvasTexture, Group, LinearMipmapLinearFilter, Mesh, PerspectiveCamera, PlaneGeometry, SRGBColorSpace, Vector3 } from "three";
import { cardMaterial, contactMaterial } from "../../../kit/toon/cardshade";
import { CONTACT_Y } from "../../../kit/toon/cast";
import { NOINK, SKY } from "../../../kit/toon/ink";

/**
 * followers-make-you-tall: the acting animals (the neighbour's duck, Grandpa's cat) are 2D cartoon cards like the people
 * (user 2026-11-24: only characters are drawn; everything else is a realistic model). Same ink and card shading as the
 * cast; a 2-pose waddle/trot driven by the frame.
 */
export type CritterKind = "duck" | "cat";
export type CritterExpr = "neutral" | "happy" | "proud" | "quack" | "shocked" | "wink";
export type CritterState = { phase: number; facing: 1 | -1; expr: CritterExpr; bob?: number; look?: number };
const INK = "#1c1414";
const S = 512;

/** Draw a critter in a 512 px square, feet at y 500, facing +x when facing = 1. */
export const drawCritter = (g: CanvasRenderingContext2D, kind: CritterKind, s: CritterState) => {
  g.clearRect(0, 0, S, S);
  g.save();
  if (s.facing < 0) { g.translate(S, 0); g.scale(-1, 1); }
  g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = INK; g.lineWidth = 9;
  const step = Math.sin(s.phase * Math.PI * 2), bob = (s.bob ?? 0) + Math.abs(step) * 8;
  if (kind === "duck") drawDuck(g, step, bob, s); else drawCat(g, step, bob, s);
  g.restore();
};
const shade = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, base: string, dark: string) => {
  const gr = g.createRadialGradient(x - rx * 0.35, y - ry * 0.4, rx * 0.1, x, y, Math.max(rx, ry) * 1.1);
  gr.addColorStop(0, base); gr.addColorStop(1, dark);
  return gr;
};
const drawDuck = (g: CanvasRenderingContext2D, step: number, bob: number, s: CritterState) => {
  const y0 = 500;
  // feet (alternating) + legs
  g.fillStyle = "#f28a2a";
  for (const [k, ph] of [[-1, step], [1, -step]] as const) {
    const fx = 236 + k * 26 + ph * 22, fy = y0 - Math.max(0, ph) * 16;
    g.beginPath(); g.moveTo(256 + k * 18, y0 - 70 - bob); g.lineTo(fx, fy - 6); g.stroke();
    g.beginPath(); g.moveTo(fx - 26, fy); g.quadraticCurveTo(fx, fy - 22, fx + 30, fy); g.closePath(); g.fill(); g.stroke();
  }
  const by = y0 - 150 - bob;
  // tail, body, wing
  g.fillStyle = shade(g, 240, by, 120, 80, "#ffffff", "#d6d8de");
  g.beginPath(); g.moveTo(120, by - 30); g.lineTo(86, by - 70); g.lineTo(140, by - 10); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(240, by, 128, 84, -0.08, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#e8eaee"; g.beginPath(); g.ellipse(220, by - 8, 70, 40, -0.25 + step * 0.06, 0, 7); g.fill(); g.lineWidth = 6; g.stroke(); g.lineWidth = 9;
  // neck + head
  const hx = 338 + (s.look ?? 0) * 10, hy = by - 120 + (s.expr === "proud" ? -12 : 0);
  g.fillStyle = shade(g, hx, hy, 70, 70, "#ffffff", "#dfe1e6");
  g.beginPath(); g.moveTo(300, by - 40); g.quadraticCurveTo(312, hy + 40, hx - 30, hy + 30); g.lineTo(hx + 30, hy + 40); g.quadraticCurveTo(370, by - 30, 350, by - 20); g.fill();
  g.beginPath(); g.arc(hx, hy, 62, 0, 7); g.fill(); g.stroke();
  // beak (open on quack)
  g.fillStyle = "#f2a020";
  const open = s.expr === "quack" ? 26 : 4;
  g.beginPath(); g.moveTo(hx + 44, hy - 4); g.quadraticCurveTo(hx + 110, hy - 10 - open * 0.3, hx + 112, hy + 2); g.lineTo(hx + 46, hy + 10); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(hx + 46, hy + 12); g.quadraticCurveTo(hx + 100, hy + 14 + open, hx + 104, hy + 20 + open * 0.6); g.lineTo(hx + 44, hy + 22); g.closePath(); g.fill(); g.stroke();
  // eye
  g.fillStyle = INK;
  if (s.expr === "wink" || s.expr === "happy") { g.beginPath(); g.arc(hx + 18, hy - 10, 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else if (s.expr === "shocked") { g.fillStyle = "#fff"; g.beginPath(); g.arc(hx + 18, hy - 12, 19, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(hx + 20, hy - 12, 6, 0, 7); g.fill(); }
  else { g.beginPath(); g.ellipse(hx + 18, hy - 12, 9, 12, 0, 0, 7); g.fill(); }
  if (s.expr === "proud") { g.lineWidth = 6; g.beginPath(); g.moveTo(hx + 4, hy - 34); g.lineTo(hx + 34, hy - 30); g.stroke(); }
};
const drawCat = (g: CanvasRenderingContext2D, step: number, bob: number, s: CritterState) => {
  const y0 = 500, by = y0 - 150 - bob * 0.6;
  const fur = "#f0a050", dark = "#c8742e";
  // legs (trot: diagonal pairs)
  g.fillStyle = fur;
  for (const [x, ph] of [[150, step], [200, -step], [320, -step], [370, step]] as const) {
    const fx = x + ph * 20;
    g.beginPath(); g.moveTo(x - 16, by + 30); g.lineTo(fx - 14, y0 - 4); g.lineTo(fx + 16, y0 - 4); g.lineTo(x + 16, by + 30); g.closePath(); g.fill(); g.stroke();
  }
  // tail
  g.lineWidth = 26; g.strokeStyle = INK; g.beginPath(); g.moveTo(110, by - 10); g.quadraticCurveTo(40, by - 60 + step * 10, 70, by - 150); g.stroke();
  g.lineWidth = 16; g.strokeStyle = fur; g.stroke(); g.strokeStyle = INK; g.lineWidth = 9;
  // body with stripes
  g.fillStyle = shade(g, 250, by, 150, 70, "#ffc070", dark);
  g.beginPath(); g.ellipse(250, by, 155, 72, 0, 0, 7); g.fill(); g.stroke();
  g.strokeStyle = "#a85a20"; g.lineWidth = 8;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(170 + i * 40, by - 66); g.quadraticCurveTo(180 + i * 40, by - 30, 168 + i * 40, by - 10); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 9;
  // head
  const hx = 400 + (s.look ?? 0) * 8, hy = by - 70;
  g.fillStyle = shade(g, hx, hy, 70, 60, "#ffc070", dark);
  for (const k of [-1, 1]) { g.beginPath(); g.moveTo(hx + k * 18 - 30, hy - 40); g.lineTo(hx + k * 40, hy - 92); g.lineTo(hx + k * 52 + 10, hy - 30); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(hx, hy, 72, 60, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = INK;
  if (s.expr === "happy" || s.expr === "wink") for (const k of [-1, 1]) { g.beginPath(); g.arc(hx + k * 26 + 12, hy - 6, 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  else for (const k of [-1, 1]) { g.beginPath(); g.ellipse(hx + k * 26 + 12, hy - 8, 8, 12, 0, 0, 7); g.fill(); }
  g.fillStyle = "#f28aa0"; g.beginPath(); g.moveTo(hx + 24, hy + 10); g.lineTo(hx + 36, hy + 10); g.lineTo(hx + 30, hy + 18); g.fill();
  g.lineWidth = 3; for (const k of [-1, 1]) for (const d of [-8, 4]) { g.beginPath(); g.moveTo(hx + 30 + k * 16, hy + 16 + d * 0.4); g.lineTo(hx + 30 + k * 70, hy + 10 + d); g.stroke(); }
};

/** A critter card standing at `position` (feet on the ground), `size` m tall (duck ~0.32, cat ~0.3), facing the lens. */
export const Critter: React.FC<{ kind: CritterKind; position: Vector3; state: CritterState; size: number }> = ({ kind, position, state, size }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const p = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.minFilter = LinearMipmapLinearFilter;
    const geo = new PlaneGeometry(1, 1);
    geo.translate(0, 0.5 - 12 / S, 0);
    const card = new Mesh(geo, cardMaterial(tex));
    card.layers.set(NOINK);
    const cg = new PlaneGeometry(0.8, 0.35);
    cg.rotateX(-Math.PI / 2);
    const contact = new Mesh(cg, contactMaterial());
    contact.position.y = CONTACT_Y;
    contact.layers.set(SKY);
    const group = new Group().add(card, contact);
    group.userData.critter = kind;
    return { c, tex, card, group, key: "" };
  }, [kind]);
  useFrame(() => {
    p.group.position.copy(position);
    p.group.scale.setScalar(size);
    p.card.rotation.y = Math.atan2(camera.position.x - position.x, camera.position.z - position.z);
    // a waddle frame every ~0.06 of the cycle is enough (texture redraws only when the drawing changes)
    const key = `${Math.round(state.phase * 16) / 16}|${state.facing}|${state.expr}|${Math.round(state.bob ?? 0)}|${Math.round((state.look ?? 0) * 4)}`;
    if (key !== p.key) {
      p.key = key;
      drawCritter(p.c.getContext("2d")!, kind, state);
      p.tex.needsUpdate = true;
    }
  });
  return createElement("primitive", { object: p.group });
};

/** Two waddle frames of a small duck for the 4,000-duck crowd (points sprites). */
export const duckFrame = (phase: number, facing: 1 | -1) => {
  const c = document.createElement("canvas");
  c.width = c.height = S;
  drawCritter(c.getContext("2d")!, "duck", { phase, facing, expr: "neutral" });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
