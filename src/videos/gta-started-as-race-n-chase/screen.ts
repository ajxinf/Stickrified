import { CanvasTexture, SRGBColorSpace } from "three";

/**
 * The game on the 1995 monitors: a small top-down city drawn per frame on a canvas (scanlines, a CRT glow). Modes:
 *   chase    your police car being chased round a block by other police cars (line 1)
 *   pileup   the police cars ram yours from every side (lines 2, 24); `k` 0..1 = how far they have closed in
 *   bug      the pile-up frozen, a red BUG stamp slammed on (line 3)
 *   side     Mike's side-on engine: a row of flat buildings like a stage set (line 4)
 *   floor    a floor slides under them and the row tips back flat into a top-down grid (line 5; k 0..1)
 *   boring   a cop car politely follows a robber at walking pace, both drivers asleep (line 9)
 *   crash    the picture breaks into pixel garbage (line 10)
 *   red      the police cars' headlights flick to red (line 13)
 *   testers  one car round and round with a pack of police behind it (line 15)
 */
export type ScreenMode = "chase" | "pileup" | "bug" | "side" | "floor" | "boring" | "crash" | "red" | "testers" | "off";
export const SCREEN_W = 440, SCREEN_H = 340;
export const makeScreen = () => {
  const c = document.createElement("canvas");
  c.width = SCREEN_W * 2;
  c.height = SCREEN_H * 2;
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return { c, g: c.getContext("2d")!, t };
};
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const ROOFS = ["#c85a3a", "#3a6ad8", "#e8b83a", "#5aa86a", "#d8d8cc", "#8a5ab8"];

const city = (g: CanvasRenderingContext2D, ox = 0, oy = 0) => {
  g.fillStyle = "#3e3e4a";
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let i = -1; i < 6; i++)
    for (let j = -1; j < 5; j++) {
      const x = i * 90 + 18 - (ox % 90), y = j * 90 + 18 - (oy % 90);
      g.fillStyle = "#a8a094";
      g.fillRect(x - 4, y - 4, 62, 62);
      g.fillStyle = ROOFS[Math.abs(i * 3 + j * 5 + Math.floor(ox / 90) + Math.floor(oy / 90)) % ROOFS.length];
      g.fillRect(x, y, 54, 54);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(x + 8, y + 8, 14, 10);
    }
  g.fillStyle = "#f2e6b0";
  for (let i = 0; i < 6; i++) for (let t = 0; t < SCREEN_W; t += 18) { g.fillRect(t, i * 90 + 7 - (oy % 90) - 18, 9, 2); g.fillRect(i * 90 + 7 - (ox % 90) - 18, t, 2, 9); }
};
/** A car seen from above at (x, y), heading `a` (rad, 0 = up). */
const car = (g: CanvasRenderingContext2D, x: number, y: number, a: number, kind: "police" | "you" | "robber", F: number, red = false, sleepy = false) => {
  g.save();
  g.translate(x, y);
  g.rotate(a);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(-9, -15, 20, 32);
  g.fillStyle = kind === "robber" ? "#e0662e" : "#f4f4f0";
  g.strokeStyle = "#141014";
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-10, -17, 20, 34, 5);
  g.fill();
  g.stroke();
  if (kind !== "robber") { g.fillStyle = "#2a4ad8"; g.fillRect(-10, -4, 20, 6); }
  g.fillStyle = "#3a5070";
  g.fillRect(-7, -11, 14, 7);
  if (kind !== "robber") {
    const on = Math.floor(F / 4) % 2;
    g.fillStyle = on ? "#ff2a2a" : "#ffb0b0"; g.fillRect(-8, 3, 7, 4);
    g.fillStyle = on ? "#a0b8ff" : "#2a6aff"; g.fillRect(1, 3, 7, 4);
  }
  if (kind === "you") { g.strokeStyle = "#f2c23a"; g.lineWidth = 3; g.beginPath(); g.roundRect(-13, -20, 26, 40, 7); g.stroke(); }
  g.fillStyle = red ? "#ff2020" : "#fff6c0"; // headlights
  g.fillRect(-8, -18, 5, 3);
  g.fillRect(3, -18, 5, 3);
  g.restore();
  if (sleepy) { g.fillStyle = "#fbf7ee"; g.font = `900 ${14 + ((F / 6) % 3) * 3}px Nunito, sans-serif`; g.fillText("z", x + 14, y - 18 - ((F / 2) % 14)); }
};
const crt = (g: CanvasRenderingContext2D) => {
  g.fillStyle = "rgba(0,0,0,0.16)";
  for (let y = 0; y < SCREEN_H; y += 3) g.fillRect(0, y, SCREEN_W, 1);
  const v = g.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.3, SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = v;
  g.fillRect(0, 0, SCREEN_W, SCREEN_H);
};
/** Draw one frame; `F` drives the animation, `k` 0..1 the mode's own progress. */
export const drawScreen = (g: CanvasRenderingContext2D, mode: ScreenMode, F: number, k = 0) => {
  g.setTransform(2, 0, 0, 2, 0, 0); // drawn at 2x: the screens fill the frame in close-ups
  const cx = SCREEN_W / 2, cy = SCREEN_H / 2;
  if (mode === "off") { g.fillStyle = "#0a1020"; g.fillRect(0, 0, SCREEN_W, SCREEN_H); return; }
  if (mode === "side" || mode === "floor") {
    // Side-on: sky, a row of flat buildings like cut-outs; "floor": a floor slides in, then the row tips back flat.
    const tip = mode === "floor" ? Math.min(Math.max((k - 0.35) / 0.5, 0), 1) : 0, slide = mode === "floor" ? Math.min(k / 0.35, 1) : 0;
    g.fillStyle = "#7ab8f0"; g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.fillStyle = "#5aa86a"; g.fillRect(0, 250, SCREEN_W, 90);
    const squash = Math.cos((tip * Math.PI) / 2);
    for (let i = 0; i < 6; i++) {
      const w = 56, h = 70 + rnd(i) * 90, x = 20 + i * 70;
      g.fillStyle = ROOFS[i % ROOFS.length];
      g.fillRect(x, 250 - h * squash, w, h * squash);
      g.strokeStyle = "#141014"; g.lineWidth = 2; g.strokeRect(x, 250 - h * squash, w, h * squash);
      g.fillStyle = "#f6e6a0"; for (let r = 0; r < 3; r++) if (squash > 0.3) g.fillRect(x + 10 + (r % 2) * 22, 250 - h * squash + 14 + r * 22 * squash, 12, 10 * squash);
    }
    if (slide > 0) { g.fillStyle = "#8a8a96"; g.fillRect(SCREEN_W * (1 - slide), 250, SCREEN_W, 14); g.fillStyle = "#141014"; g.font = `900 22px Nunito, sans-serif`; g.fillText("FLOOR", SCREEN_W * (1 - slide) + 20, 300); }
    if (tip >= 1) { city(g); }
    crt(g);
    return;
  }
  const t = F / 30;
  city(g, mode === "boring" ? t * 6 : t * 40, mode === "testers" ? t * 20 : 0);
  if (mode === "chase" || mode === "testers") {
    // Round the middle block: you lead, the police follow.
    const lap = (p: number) => { const q = ((p % 4) + 4) % 4, s = 70; if (q < 1) return [cx - s + 2 * s * q, cy - s, Math.PI / 2]; if (q < 2) return [cx + s, cy - s + 2 * s * (q - 1), Math.PI]; if (q < 3) return [cx + s - 2 * s * (q - 2), cy + s, -Math.PI / 2]; return [cx - s, cy + s - 2 * s * (q - 3), 0]; };
    const p0 = t * 1.1;
    for (let i = 3; i >= 1; i--) { const [x, y, a] = lap(p0 - i * 0.28); car(g, x, y, a, "police", F + i); }
    const [x, y, a] = lap(p0);
    car(g, x, y, a, mode === "chase" ? "you" : "robber", F);
  }
  if (mode === "pileup" || mode === "bug" || mode === "red") {
    const close = mode === "pileup" ? k : mode === "bug" ? 1 : 0.2;
    const Fm = mode === "bug" ? 0 : F;
    const shake = mode === "pileup" && close > 0.8 ? Math.sin(F * 3) * 3 : 0;
    car(g, cx + shake, cy, 0, "you", Fm);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy], i) => {
      const d = 120 - 92 * close;
      car(g, cx + dx * d + shake, cy + dy * d * 0.95, Math.atan2(-dx, dy), "police", Fm + i, mode === "red");
    });
    if (mode === "pileup" && close > 0.85) { g.strokeStyle = "#fbf7ee"; g.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 30); g.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46); g.stroke(); } }
  }
  if (mode === "boring") {
    car(g, cx, cy - 50 + Math.sin(t) * 2, 0, "robber", F, false, true);
    car(g, cx, cy + 40 + Math.sin(t) * 2, 0, "you", F, false, true);
  }
  if (mode === "bug") {
    const s = Math.min(1, 0.6 + k * 1.5);
    g.save(); g.translate(cx, cy); g.rotate(-0.18); g.scale(s, s);
    g.strokeStyle = "#e0342e"; g.lineWidth = 10; g.strokeRect(-110, -50, 220, 100);
    g.fillStyle = "#e0342e"; g.font = `900 84px Nunito, sans-serif`; g.textAlign = "center"; g.fillText("BUG", 0, 30);
    g.restore(); g.textAlign = "left";
  }
  if (mode === "crash") {
    for (let i = 0; i < 160; i++) { g.fillStyle = ["#ff2a8a", "#2aff8a", "#f2c23a", "#2a6aff", "#141014"][i % 5]; g.fillRect(Math.floor(rnd(i + Math.floor(F / 3) * 7) * 22) * 20, Math.floor(rnd(i * 3 + Math.floor(F / 3)) * 17) * 20, 20 + rnd(i) * 60, 20); }
    g.fillStyle = "#fbf7ee"; g.font = `900 26px monospace`; g.fillText("FATAL ERROR 0x0F", 40, 180);
  }
  crt(g);
};
