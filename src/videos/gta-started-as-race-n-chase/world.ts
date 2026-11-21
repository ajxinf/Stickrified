import { BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, Group, Material, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { BUILDS, capHair, glasses, outfit, tufts } from "../../../kit/toon/extras";
import type { Look } from "../../../kit/toon/figure";
import type { Head } from "../../../kit/toon/face";
import { planks, rough } from "../../../kit/toon/paint";
import { youLook } from "../../../kit/toon/protagonist";
import { toonMaterial } from "../../../kit/toon/shade";
import { INK, Pen } from "../../../kit/toon/toon";
import { cap, headLayers, layers, pattern, suspenders, tache } from "../../../kit/toon/wardrobe";

/**
 * gta-started-as-race-n-chase: the places. Everything is our own design (no game logos, art or screenshots).
 *   office   a cramped mid-90s games office at night (Dundee): desks, beige CRT monitors, a whiteboard, a calendar,
 *            posters, pizza boxes, a door; warm desk lamps against blue moonlight and monitor glow
 *   city     the game itself: a top-down toy city (roofs, roads, toy cars), seen from high above
 *   lords    a chamber of red benches for the lords
 */
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/** Printed and painted surfaces: unlit, tinted to paper so a white page never clips (R23: board/calendar CLIP 7-12 %). */
const PAPER = "#e0dacd";
const unlit = (key: string, map: () => CanvasTexture, transparent = false) => M(key, () => new MeshBasicMaterial({ map: map(), transparent, color: PAPER }));
const plane = (w: number, h: number, mat: Material, pos: Vector3, ry = 0, rx = 0) => {
  const m = new Mesh(new PlaneGeometry(w, h), mat);
  m.position.copy(pos);
  m.rotation.set(rx, ry, 0);
  return m;
};

// ================================================================== the office (1995, night)
export const OFFICE = {
  you: new Vector3(0, -0.2, -0.25), // seated: the card stands sunk behind the desk so the desk hides the legs
  yourDesk: new Vector3(0, 0, -1.0),
  yourScreen: new Vector3(0, 1.0, -1.08), // centre of your CRT's screen (it faces +z, toward you)
  mike: new Vector3(-2.8, -0.2, -0.25),
  mikeDesk: new Vector3(-2.8, 0, -1.0),
  mikeScreen: new Vector3(-2.8, 1.0, -1.08),
  testDesk: new Vector3(2.9, 0, -1.0),
  testScreen: new Vector3(2.9, 1.0, -1.08),
  board: new Vector3(-0.6, 1.55, -5.9), // whiteboard on the back wall
  calendar: new Vector3(1.9, 1.75, -5.92),
  door: new Vector3(5.95, 0, -2.4), // hinge side on the right wall
};
const carpet = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#4e5872";
    g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"; g.fillRect(i * 128, j * 128, 128, 128); }
    for (let k = 0; k < 2600; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)"; g.fillRect(rnd(k + 1) * 512, rnd(k + 2) * 512, 2, 2); }
    g.fillStyle = "rgba(60,40,30,0.25)"; // a coffee stain
    g.beginPath(); g.ellipse(300, 210, 34, 22, 0.4, 0, 7); g.fill();
  });
const wallTex = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#d8cfb8";
    g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) { g.fillStyle = (x / 16) % 2 ? "rgba(120,90,60,0.07)" : "rgba(255,255,255,0.05)"; g.fillRect(x, 0, 8, 470); }
    for (let k = 0; k < 140; k++) { g.fillStyle = rnd(k + 9) > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(90,60,40,0.07)"; g.beginPath(); g.arc(rnd(k + 5) * 512, rnd(k + 6) * 470, 6 + 18 * rnd(k + 7), 0, 7); g.fill(); }
    for (let k = 0; k < 5000; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.1)" : "rgba(80,60,40,0.1)"; g.fillRect(rnd(k + 3) * 512, rnd(k + 4) * 512, 2, 2); }
    g.fillStyle = "#a89a80";
    g.fillRect(0, 470, 512, 42); // dado rail band
  });
/** Our own wall posters (no real games): a pixel rocket, INSERT COIN, a hand-drawn city map, a band flyer. */
const posterTex = (k: number) =>
  canvasTex(256, 360, (g) => {
    const bgs = ["#2a2a5a", "#c83a2a", "#f2d23a", "#1f6a5a", "#5a2a6a"];
    g.fillStyle = bgs[k % bgs.length];
    g.fillRect(0, 0, 256, 360);
    g.strokeStyle = "#141014"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 352);
    g.fillStyle = "#fbf7ee";
    g.font = `900 34px "Nunito", sans-serif`;
    g.textAlign = "center";
    if (k % 5 === 0) { g.fillText("INSERT", 128, 70); g.fillText("COIN", 128, 110); g.fillStyle = "#f2d23a"; g.beginPath(); g.arc(128, 220, 60, 0, 7); g.fill(); g.fillStyle = "#c8902a"; g.fillRect(118, 180, 20, 80); }
    if (k % 5 === 1) { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i * 7 + j * 3) % 5 < 2) { g.fillStyle = ["#fbf7ee", "#f2d23a", "#3a7ad8"][(i + j) % 3]; g.fillRect(48 + i * 20, 80 + j * 20, 18, 18); } g.fillStyle = "#fbf7ee"; g.fillText("LEVEL 2", 128, 320); }
    if (k % 5 === 2) { g.strokeStyle = "#141014"; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(30 + i * 50, 40); g.lineTo(30 + i * 50, 320); g.stroke(); g.beginPath(); g.moveTo(20, 50 + i * 60); g.lineTo(236, 50 + i * 60); g.stroke(); } g.fillStyle = "#c83a2a"; g.beginPath(); g.arc(130, 170, 12, 0, 7); g.fill(); }
    if (k % 5 === 3) { g.fillText("SCOTLAND", 128, 70); g.fillText("ROCKS", 128, 110); g.fillStyle = "#f2d23a"; for (let i = 0; i < 5; i++) g.fillRect(40 + i * 38, 260 - i * 26, 30, 60 + i * 26); }
    if (k % 5 === 4) { g.fillStyle = "#fbf7ee"; g.beginPath(); g.moveTo(128, 60); g.lineTo(200, 280); g.lineTo(56, 280); g.fill(); g.fillStyle = "#c83a2a"; g.fillRect(100, 280, 56, 40); }
  });
/** The whiteboard: a stick cop (with a police hat) chasing a stick robber; `hatless`: the hat rubbed out (line 16). */
export const boardTex = (hatless: boolean) =>
  canvasTex(1024, 560, (g) => {
    g.fillStyle = "#f6f6f2"; g.fillRect(0, 0, 1024, 560);
    // Ghosts of old, half-wiped marker (R23: a clean white board clipped and read flat).
    for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(${rnd(k) > 0.5 ? "60,80,170" : "90,90,100"},${0.05 + 0.06 * rnd(k + 1)})`; g.lineWidth = 6 + 18 * rnd(k + 2); g.beginPath(); const x = rnd(k + 3) * 1024, y = rnd(k + 4) * 560; g.moveTo(x, y); g.quadraticCurveTo(x + 80 * rnd(k + 5), y - 40, x + 60 + 160 * rnd(k + 6), y + 30 * rnd(k + 7) - 15); g.stroke(); }
    g.strokeStyle = "#2a4ad8"; g.fillStyle = "#2a4ad8"; g.lineWidth = 9; g.lineCap = "round";
    g.font = `900 64px "Comic Sans MS", sans-serif`; g.fillText("RACE'N'CHASE", 40, 90);
    const fig = (x: number, col: string) => { g.strokeStyle = col; g.beginPath(); g.arc(x, 250, 40, 0, 7); g.moveTo(x, 290); g.lineTo(x, 400); g.moveTo(x, 320); g.lineTo(x - 50, 360); g.moveTo(x, 320); g.lineTo(x + 50, 350); g.moveTo(x, 400); g.lineTo(x - 40, 480); g.moveTo(x, 400); g.lineTo(x + 45, 480); g.stroke(); };
    fig(330, "#2a4ad8");
    fig(720, "#c8282a");
    if (!hatless) { g.fillStyle = "#2a4ad8"; g.fillRect(280, 185, 100, 22); g.fillRect(300, 160, 60, 30); }
    else { g.fillStyle = "rgba(160,170,200,0.35)"; g.beginPath(); g.ellipse(330, 180, 90, 36, 0, 0, 7); g.fill(); }
    g.fillStyle = "#c8282a"; g.fillRect(690, 190, 60, 20); // robber's mask
    g.strokeStyle = "#141014"; g.lineWidth = 6; g.beginPath(); g.moveTo(430, 300); g.lineTo(620, 300); g.lineTo(590, 280); g.moveTo(620, 300); g.lineTo(590, 320); g.stroke();
    g.fillStyle = "#141014"; g.font = `700 40px "Comic Sans MS", sans-serif`; g.fillText(hatless ? "WE ARE THE ...?" : "YOU = COP", 60, 530);
    // Doodles round the edges (R21b: no big blank white): a street map, a to-do list, sticky notes, a little car.
    g.strokeStyle = "#2a8a4a"; g.lineWidth = 4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(830 + i * 40, 130); g.lineTo(830 + i * 40, 300); g.stroke(); g.beginPath(); g.moveTo(820, 140 + i * 50); g.lineTo(990, 140 + i * 50); g.stroke(); }
    g.fillStyle = "#c8282a"; g.font = `700 26px "Comic Sans MS", sans-serif`; g.fillText("TO DO:", 820, 360); ["- cops", "- crashes!!", "- fix lag", "- MORE CARS"].forEach((t, i) => g.fillText(t, 820, 392 + i * 30));
    [["#f8e04a", 520, 40], ["#9ad0f0", 600, 60], ["#f2a0b0", 470, 420]].forEach(([c, x, y]) => { g.fillStyle = c as string; g.fillRect(x as number, y as number, 70, 70); g.fillStyle = "#141014"; g.font = `700 16px "Comic Sans MS", sans-serif`; g.fillText("!!", (x as number) + 26, (y as number) + 44); });
    g.strokeStyle = "#141014"; g.lineWidth = 4; g.strokeRect(470, 330, 70, 36); g.beginPath(); g.arc(486, 370, 9, 0, 7); g.arc(526, 370, 9, 0, 7); g.stroke();
  });
/** The wall calendar: 18 months circled in red. */
const calendarTex = () =>
  canvasTex(300, 400, (g) => {
    g.fillStyle = "#fbf7ee"; g.fillRect(0, 0, 300, 400);
    g.fillStyle = "#c8282a"; g.fillRect(0, 0, 300, 70);
    g.fillStyle = "#fbf7ee"; g.font = `900 40px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("1995", 150, 50);
    g.fillStyle = "#141014"; g.font = `700 22px "Nunito", sans-serif`;
    for (let i = 0; i < 18; i++) { const x = 55 + (i % 6) * 38, y = 125 + Math.floor(i / 6) * 62; g.fillText(String(i + 1), x, y); }
    g.strokeStyle = "#e0342e"; g.lineWidth = 7; g.beginPath(); g.ellipse(150, 185, 138, 112, 0, 0, 7); g.stroke(); // round the grid, not through it
    g.fillStyle = "#e0342e"; g.font = `900 30px "Comic Sans MS", sans-serif`; g.fillText("18 MONTHS!", 150, 375);
  });
/**
 * Line 12 (R23, user: the tear-off calendar "sucks"): the SHIP DATE sheet pinned on the cork board. "MONTH 18" gets
 * struck through in red marker, "20" is scrawled under it, struck too, then a huge "24". Progress values 0..1 per
 * stroke (Video.tsx feeds them from the word frames), drawn per frame like the monitors.
 */
export const DEADLINE = { w: 0.9, h: 0.62, at: new Vector3(0.45, 2.28, 2.462) };
export const drawDeadline = (g: CanvasRenderingContext2D, k: { strike18: number; write20: number; strike20: number; write24: number }) => {
  const W = g.canvas.width, H = g.canvas.height;
  g.fillStyle = "#f6f1e2"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#c8282a"; g.fillRect(0, 0, W, 62);
  g.fillStyle = "#fbf7ee"; g.font = `900 44px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("SHIP DATE", W / 2, 47);
  g.fillStyle = "#141014"; g.font = `900 84px "Nunito", sans-serif`; g.textAlign = "left"; g.fillText("MONTH", 30, 165); g.fillText("18", 400, 165);
  const strike = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    if (t <= 0) return;
    g.strokeStyle = "#e0242a"; g.lineWidth = 16; g.lineCap = "round";
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * Math.min(t, 1), y0 + (y1 - y0) * Math.min(t, 1)); g.stroke();
  };
  // Handwriting revealed left to right (a marker writing it).
  const write = (txt: string, x: number, y: number, size: number, t: number, rot: number) => {
    if (t <= 0) return;
    g.save(); g.translate(x, y); g.rotate(rot); g.font = `700 ${size}px "Comic Sans MS", sans-serif`;
    const w = g.measureText(txt).width;
    g.beginPath(); g.rect(-10, -size, (w + 20) * Math.min(t, 1), size * 1.3); g.clip();
    g.fillStyle = "#e0242a"; g.fillText(txt, 0, 0); g.restore();
  };
  strike(388, 150, 520, 108, k.strike18);
  strike(388, 108, 520, 150, k.strike18 * 2 - 1);
  write("20?", 60, 290, 110, k.write20, -0.06);
  strike(50, 262, 250, 232, k.strike20);
  write("24!!", 285, 330, 150, k.write24, -0.1);
};
/** The office clock face with its hands at (hour, minute) angles in turns (Video.tsx spins it as time-lapse). */
export const drawClock = (c: CanvasRenderingContext2D, hour: number, minute: number) => {
  c.clearRect(0, 0, 200, 200);
  c.fillStyle = "#fbf7ee"; c.beginPath(); c.arc(100, 100, 96, 0, 7); c.fill(); c.strokeStyle = "#141014"; c.lineWidth = 10; c.stroke();
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.fillStyle = "#141014"; c.fillRect(100 + Math.cos(a) * 80 - 3, 100 + Math.sin(a) * 80 - 3, 6, 6); }
  const hand = (turns: number, len: number, w: number) => { const a = turns * Math.PI * 2 - Math.PI / 2; c.lineWidth = w; c.lineCap = "round"; c.beginPath(); c.moveTo(100, 100); c.lineTo(100 + Math.cos(a) * len, 100 + Math.sin(a) * len); c.stroke(); };
  c.strokeStyle = "#141014"; hand(hour, 46, 9); c.strokeStyle = "#c8282a"; hand(minute, 72, 6);
};
const nightTex = () =>
  canvasTex(512, 320, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, "#0f1a46"); gr.addColorStop(1, "#2f3f8a");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#fff4d0"; g.beginPath(); g.arc(400, 70, 26, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) { const x = i * 34, h = 80 + rnd(i) * 120; g.fillStyle = "#1a1f40"; g.fillRect(x, 320 - h, 30, h); for (let w = 0; w < 6; w++) if (rnd(i * 9 + w) > 0.45) { g.fillStyle = "#ffcf7a"; g.fillRect(x + 6 + (w % 2) * 12, 330 - h + Math.floor(w / 2) * 22, 7, 9); } }
    g.fillStyle = "#3a4aa0"; g.fillRect(0, 300, 512, 20); // the river
  });
/** R21b richness: a cork board crammed with pinned printouts, polaroids, sticky notes and a red string. */
const corkTex = () =>
  canvasTex(1024, 640, (g) => {
    g.fillStyle = "#b8865a"; g.fillRect(0, 0, 1024, 640);
    for (let k = 0; k < 3000; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(90,50,20,0.25)" : "rgba(255,230,190,0.18)"; g.fillRect(rnd(k + 5) * 1024, rnd(k + 6) * 640, 3, 3); }
    const cols = ["#fbf7ee", "#f8e04a", "#9ad0f0", "#f2a0b0", "#b8e8a0", "#fbf7ee"];
    const pins: [number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const w = 90 + rnd(i) * 90, h = 70 + rnd(i + 1) * 110, x = 20 + rnd(i + 2) * 900, y = 20 + rnd(i + 3) * 500, a = (rnd(i + 4) - 0.5) * 0.3;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(4, 5, w, h);
      g.fillStyle = cols[i % cols.length]; g.fillRect(0, 0, w, h);
      g.fillStyle = "#5a5a6a"; for (let l = 0; l < 4; l++) g.fillRect(10, 18 + l * 16, w * (0.5 + 0.4 * rnd(i * 3 + l)), 5);
      if (i % 4 === 0) { g.fillStyle = "#3a6ad8"; g.fillRect(10, h - 50, w - 20, 38); g.fillStyle = "#f2c23a"; g.fillRect(20, h - 40, 16, 16); }
      g.restore();
      g.fillStyle = ["#e0342e", "#2a6ad8", "#2aa84a"][i % 3]; g.beginPath(); g.arc(x + 10, y + 8, 7, 0, 7); g.fill();
      pins.push([x + 10, y + 8]);
    }
    g.strokeStyle = "#e0342e"; g.lineWidth = 3; g.beginPath(); pins.slice(0, 8).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  });
/** The CRT's plastic: beige with vent slots, a stripe of tape and a faded sticker. */
const crtTex = () =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = "#d8ceb4"; g.fillRect(0, 0, 256, 256);
    // Moulded plastic grain, yellowed patches, scuffs and a seam (R23: the plain beige case filled 40 % of the face shots).
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${rnd(k) > 0.5 ? "170,140,90" : "250,245,225"},0.08)`; g.beginPath(); g.arc(rnd(k + 7) * 256, rnd(k + 8) * 256, 6 + 20 * rnd(k + 9), 0, 7); g.fill(); }
    for (let k = 0; k < 2200; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.14)" : "rgba(90,70,40,0.14)"; g.fillRect(rnd(k + 1) * 256, rnd(k + 2) * 256, 2, 2); }
    g.strokeStyle = "rgba(80,60,40,0.25)"; g.lineWidth = 1.5; for (let k = 0; k < 14; k++) { const x = rnd(k + 20) * 256, y = 120 + rnd(k + 21) * 130; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + 20 * rnd(k + 22), y + 4 * rnd(k + 23) - 2); g.stroke(); }
    g.fillStyle = "rgba(60,50,40,0.3)"; g.fillRect(0, 112, 256, 3);
    g.fillStyle = "#3a7ad8"; g.fillRect(36, 128, 44, 30); g.fillStyle = "#fbf7ee"; g.fillRect(40, 132, 36, 6); g.fillRect(40, 142, 26, 4); // an asset-tag sticker
    g.fillStyle = "#6a6258"; for (let i = 0; i < 9; i++) g.fillRect(30 + i * 22, 30, 10, 70);
    g.fillStyle = "#f2c23a"; g.fillRect(150, 150, 70, 46); g.fillStyle = "#c8282a"; g.font = "900 22px Nunito, sans-serif"; g.fillText("DMA", 160, 182);
    g.fillStyle = "rgba(240,240,220,0.8)"; g.fillRect(20, 200, 110, 18);
  });
/** Toy city walls: windows in rows on a painted colour (seen whenever the lens is not straight down). */
const facadeTex = (col: string) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 500; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"; g.fillRect(rnd(k + 1) * 256, rnd(k + 2) * 256, 3, 3); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const lit = rnd(r * 7 + c + col.length) > 0.4; g.fillStyle = "#2a2430"; g.fillRect(18 + c * 60, 18 + r * 60, 38, 40); g.fillStyle = lit ? "#ffe0a0" : "#5a7aa0"; g.fillRect(22 + c * 60, 22 + r * 60, 30, 32); }
  });
/** Toy city roofs: tar-paper seams, a hatch, gravel speckle and a parapet border on the roof's colour. */
const roofTex = (col: string) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = col; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 900; k++) { g.fillStyle = rnd(k + col.length) > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)"; g.fillRect(rnd(k + 1) * 256, rnd(k + 2) * 256, 3, 3); }
    g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = 3; for (let x = 32; x < 256; x += 42) { g.beginPath(); g.moveTo(x, 12); g.lineTo(x, 244); g.stroke(); }
    g.strokeStyle = "rgba(20,16,20,0.55)"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);
    g.fillStyle = "#4a4650"; g.fillRect(170, 40, 40, 40); g.fillStyle = "#2a2630"; g.fillRect(176, 46, 28, 28);
  });
/** Lords' benches: deep red leather buttoned in a diamond grid. */
const tuftTex = () =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = "#a8262a"; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const cx = x * 64 + (y % 2) * 32, cy = y * 64; const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 30); gr.addColorStop(0, "rgba(40,0,0,0.6)"); gr.addColorStop(1, "rgba(255,120,110,0.08)"); g.fillStyle = gr; g.fillRect(cx - 32, cy - 32, 64, 64); g.fillStyle = "#e8c060"; g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.fill(); }
  });
/** Lords' wall: carved oak panels with gold rules. */
const panelTex = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { g.fillStyle = "#6e4a2c"; g.fillRect(16 + c * 124, 16 + r * 248, 108, 228); g.strokeStyle = "#d8a83a"; g.lineWidth = 4; g.strokeRect(26 + c * 124, 26 + r * 248, 88, 208); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 3; g.strokeRect(36 + c * 124, 40 + r * 248, 68, 180); }
  });
/** A beige mid-90s CRT on its desk: case, bezel, a screen plane named "screen" (its map is swapped per frame). */
export const crt = () => {
  const k = new Kit(), beige = M("crtBeige", () => toonMaterial({ map: crtTex(), repeat: [1, 1], spec: 0.2 }));
  k.box(beige, 0.56, 0.48, 0.5, 0, 0.24, 0, false); // case
  k.box(beige, 0.42, 0.34, 0.3, 0, 0.24, -0.35, false); // the tube's back
  k.box(beige, 0.3, 0.05, 0.3, 0, -0.02, -0.05, false); // stand
  k.box(M("crtBezel", () => toonMaterial({ color: "#2a2628" })), 0.5, 0.42, 0.02, 0, 0.25, 0.25, false);
  k.box(M("ledGreen", () => toonMaterial({ color: "#3aff6a", emissive: ["#3aff6a", 2] })), 0.02, 0.02, 0.01, 0.2, 0.06, 0.26, false);
  const g = k.build();
  const screen = new Mesh(new PlaneGeometry(0.44, 0.34), new MeshBasicMaterial({ color: "#0a1020" }));
  screen.name = "screen";
  screen.position.set(0, 0.25, 0.262);
  g.add(screen);
  g.userData.collider = "monitor"; // its own collider: props allowed on the desk may not pass through it
  return g;
};
/** One desk with its clutter (keyboard, mouse, mug, papers, desk lamp, cables), a front panel that hides seated legs. */
const desk = (seed: number) => {
  const k = new Kit(), wood = M("deskTop", () => toonMaterial({ map: planks("#9a7a5a"), repeat: [1, 1] })), grey = M("deskGrey", () => toonMaterial({ map: rough("#6a6670"), repeat: [1, 1] }));
  k.box(wood, 1.6, 0.05, 0.8, 0, 0.74, 0, false);
  k.box(grey, 1.5, 0.7, 0.04, 0, 0.36, -0.36, false); // the panel facing the room's back (and the lens on face shots)
  for (const x of [-0.76, 0.76]) k.box(grey, 0.05, 0.72, 0.76, x, 0.36, 0, false);
  k.box(M("keyboard", () => toonMaterial({ map: rough("#cfc6ae"), repeat: [1, 1] })), 0.46, 0.03, 0.16, 0, 0.78, 0.18, false);
  k.box(MAT.color("#cfc6ae"), 0.06, 0.03, 0.1, 0.36, 0.78, 0.2, false);
  k.add(M("mug" + (seed % 3), () => toonMaterial({ color: ["#c8282a", "#2a6ad8", "#f2c23a"][seed % 3] })), new CylinderGeometry(0.045, 0.04, 0.1, 12), -0.55, 0.81, 0.1);
  k.box(MAT.color("#f6f2e6"), 0.24, 0.01, 0.32, 0.55, 0.77, 0.05, false); // papers
  k.box(MAT.color("#f6f2e6"), 0.24, 0.01, 0.32, 0.6, 0.78, 0.0, false);
  k.add(MAT.metal(), new CylinderGeometry(0.012, 0.012, 0.4, 6), -0.66, 0.96, -0.25); // desk lamp arm
  k.add(M("lampShadeGreen", () => toonMaterial({ color: "#2a7a4a" })), new CylinderGeometry(0.05, 0.11, 0.12, 12, 1, true), -0.6, 1.14, -0.18, { rx: 0.5 });
  const g = k.build();
  g.userData.collider = `desk ${seed}`;
  const c = crt();
  c.position.set(0, 0.76, -0.1);
  g.add(c);
  return g;
};
/** The office (origin: middle of the floor; the back wall at z -6, the window wall at x -6, the door at x +6). */
export const office = () => {
  const root = new Group(), k = new Kit();
  const wall = M("officeWall", () => toonMaterial({ map: wallTex(), repeat: [3, 1] }));
  k.add(M("carpet", () => toonMaterial({ map: carpet(), repeat: [4, 4] })), new BoxGeometry(14, 0.1, 12), 0, -0.05, -1);
  k.add(wall, new BoxGeometry(14, 3.4, 0.2), 0, 1.7, -6.1);
  k.add(wall, new BoxGeometry(0.2, 3.4, 12), -6.1, 1.7, -1);
  // The right wall has a real doorway (z -2.45..-1.35, 2.15 m high) onto a lit corridor (R23: the door opened onto
  // solid wall).
  k.add(wall, new BoxGeometry(0.2, 3.4, 4.55), 6.1, 1.7, -4.725);
  k.add(wall, new BoxGeometry(0.2, 3.4, 6.35), 6.1, 1.7, 1.825);
  k.add(wall, new BoxGeometry(0.2, 1.25, 1.1), 6.1, 2.775, -1.9);
  for (const z of [-2.49, -1.31]) k.box(MAT.darkWood(), 0.28, 2.2, 0.08, 6.1, 1.1, z, false); // door casing
  k.box(MAT.darkWood(), 0.28, 0.1, 1.26, 6.1, 2.2, -1.9, false);
  const hall = M("corridorWall", () => toonMaterial({ map: rough("#b9c7ae"), repeat: [2, 1] }));
  k.add(M("corridorFloor", () => toonMaterial({ map: rough("#8c7f6c"), repeat: [2, 4] })), new BoxGeometry(1.8, 0.1, 8), 7.9, -0.05, -1.9);
  k.add(hall, new BoxGeometry(0.2, 3.1, 8), 8.85, 1.55, -1.9);
  k.add(hall, new BoxGeometry(2.6, 3.1, 0.2), 7.55, 1.55, -5.95);
  k.add(hall, new BoxGeometry(2.6, 3.1, 0.2), 7.55, 1.55, 2.15);
  k.add(M("corridorCeil", () => toonMaterial({ map: rough("#d8d2c4"), repeat: [1, 1] })), new BoxGeometry(2.6, 0.12, 8), 7.55, 3.06, -1.9);
  k.box(M("corridorStrip", () => toonMaterial({ color: "#fff4dc", emissive: ["#fff2cc", 1.4] })), 0.3, 0.04, 2.4, 7.6, 2.98, -1.9, false);
  k.box(MAT.color("#3a6a8a"), 0.5, 0.45, 0.45, 8.45, 0.225, -3.4, false); // a chair in the corridor
  k.box(MAT.color("#3a6a8a"), 0.5, 0.5, 0.06, 8.45, 0.7, -3.6, false);
  // Shelves of manuals and boxes along the back wall, a water cooler, a pot plant, a stack of pizza boxes.
  k.box(MAT.darkWood(), 2.2, 2.0, 0.4, 3.9, 1.0, -5.75, false);
  for (let i = 0; i < 18; i++) k.box(MAT.color(["#c83a2a", "#2a5ad8", "#f2c23a", "#2a8a5a", "#e8e0d0"][i % 5]), 0.08 + 0.05 * rnd(i), 0.3 + 0.08 * rnd(i + 2), 0.28, 2.95 + (i % 9) * 0.21, 0.35 + Math.floor(i / 9) * 0.6 + 0.6, -5.7, false);
  k.add(M("cooler", () => toonMaterial({ color: "#9ac8f0", spec: 0.4 })), new CylinderGeometry(0.16, 0.16, 0.4, 14), -5.4, 1.35, -3.2);
  k.box(MAT.color("#e8e0d0"), 0.36, 1.1, 0.36, -5.4, 0.55, -3.2, false);
  k.add(M("plantPot", () => toonMaterial({ color: "#b8603a" })), new CylinderGeometry(0.2, 0.15, 0.36, 12), -5.3, 0.18, -5.2);
  k.add(M("plant", () => toonMaterial({ color: "#3a9a4a" })), new SphereGeometry(0.42, 12, 9), -5.3, 0.7, -5.2);
  for (let i = 0; i < 5; i++) k.box(MAT.color(i % 2 ? "#e8d4a8" : "#dcc49a"), 0.42, 0.06, 0.42, 1.5 + 0.02 * i, 0.03 + i * 0.065, -4.6, false);
  k.box(MAT.darkWood(), 1.3, 0.75, 0.6, -4.8, 0.375, -1.8, false); // a side table with a printer
  k.box(MAT.color("#d8ceb4"), 0.5, 0.22, 0.4, -4.8, 0.86, -1.8, false);
  k.add(wall, new BoxGeometry(14, 3.4, 0.2), 0, 1.7, 2.6); // the front wall (R21b: shots looking +z saw an empty void)
  k.add(M("ceiling", () => toonMaterial({ map: rough("#cfc8bc"), repeat: [1, 1] })), new BoxGeometry(14, 0.12, 9), 0, 3.42, -1.7);
  k.box(MAT.darkWood(), 2.6, 1.8, 0.35, 3.6, 0.9, 2.35, false); // games shelf on the front wall
  for (let i = 0; i < 30; i++) k.box(MAT.color(["#c83a2a", "#2a5ad8", "#f2c23a", "#2a8a5a", "#8a5ab8", "#e8e0d0"][i % 6]), 0.1, 0.32, 0.24, 2.45 + (i % 10) * 0.23, 0.25 + Math.floor(i / 10) * 0.55, 2.3, false);
  k.box(M("radiator", () => toonMaterial({ color: "#e8e4dc", spec: 0.3 })), 1.6, 0.6, 0.12, -3.2, 0.5, 2.45, false);
  for (let i = 0; i < 6; i++) k.box(M("lightPanel", () => toonMaterial({ color: "#fff6dc", emissive: ["#fff2cc", 1.2] })), 1.2, 0.04, 0.4, -3 + (i % 3) * 3, 3.35, -4 + Math.floor(i / 3) * 3.4, false);
  k.add(MAT.metal(), new CylinderGeometry(0.06, 0.06, 13, 8), 0, 3.25, 2.2, { rz: Math.PI / 2 }); // a pipe along the ceiling
  const shell = k.build();
  shell.userData.collider = "office";
  root.add(shell);
  // Windows (moonlit Dundee), posters, whiteboard, calendar.
  for (const z of [-4.2, -1.4]) {
    const fr = new Kit();
    fr.box(MAT.color("#e8e0d0"), 0.1, 1.5, 1.9, 0, 0, 0, false);
    const f = fr.build();
    f.position.set(-6.0, 1.75, z);
    root.add(f, plane(1.75, 1.35, unlit("officeNight", nightTex), new Vector3(-5.93, 1.75, z), Math.PI / 2));
  }
  [[-4.6, 1.9, 0], [-3.4, 2.0, 1], [0.9, 2.2, 2], [5.1, 1.9, 3]].forEach(([x, y, i]) => root.add(plane(0.62, 0.86, unlit(`poster${i}`, () => posterTex(i)), new Vector3(x, y, -5.98))));
  root.add(plane(0.62, 0.86, unlit("poster4", () => posterTex(4)), new Vector3(5.98, 1.9, -4.6), -Math.PI / 2));
  const board = plane(2.4, 1.32, unlit("board", () => boardTex(false)), OFFICE.board);
  board.name = "board";
  board.userData.faces = { cop: board.material, hatless: new MeshBasicMaterial({ map: boardTex(true), color: PAPER }) };
  const bk = new Kit();
  bk.box(MAT.metal(), 2.52, 1.44, 0.04, 0, 0, -0.03, false);
  const bframe = bk.build();
  bframe.position.copy(OFFICE.board);
  root.add(bframe, board, plane(0.6, 0.8, unlit("calendar", calendarTex), OFFICE.calendar));
  // Deadline notes round the calendar (R23: it hung alone on a bare wall; E3/G3 read flat).
  [[-0.52, 0.28, "#f8e04a", 0.08], [-0.5, -0.12, "#9ad0f0", -0.1], [0.5, 0.32, "#f2a0b0", -0.06], [0.54, -0.05, "#b8e890", 0.12], [-0.46, -0.44, "#f2a0b0", 0.05], [0.47, -0.4, "#f8e04a", -0.12]].forEach(([dx, dy, col, rz], i) => {
    const n = plane(0.2, 0.2, unlit(`calNote${i}`, () => canvasTex(100, 100, (g) => { g.fillStyle = col as string; g.fillRect(0, 0, 100, 100); g.strokeStyle = "rgba(20,16,20,0.6)"; g.lineWidth = 4; for (let y = 28; y < 90; y += 18) { g.beginPath(); g.moveTo(14, y); g.lineTo(14 + 70 * rnd(i * 5 + y), y); g.stroke(); } g.fillStyle = "#c8282a"; g.beginPath(); g.arc(50, 10, 6, 0, 7); g.fill(); })), OFFICE.calendar.clone().add(new Vector3(dx as number, dy as number, 0.005 + 0.001 * i)));
    n.rotation.z = rz as number;
    root.add(n);
  });
  // The front wall: a big cork board, posters, a clock, a moonlit window.
  root.add(plane(3.2, 2.0, unlit("cork", corkTex), new Vector3(-0.4, 1.75, 2.48), Math.PI));
  [[-3.6, 2.0, 1], [-2.7, 1.9, 3], [2.0, 2.2, 0], [5.0, 2.0, 2]].forEach(([x, y, i]) => root.add(plane(0.62, 0.86, unlit(`poster${i}`, () => posterTex(i)), new Vector3(x, y, 2.48), Math.PI)));
  const clock = plane(0.42, 0.42, new MeshBasicMaterial({ color: PAPER, transparent: true }), new Vector3(1.4, 2.75, 2.48), Math.PI);
  clock.name = "clock"; // face drawn per frame (drawClock: time-lapse spin on line 12)
  const sheet = plane(DEADLINE.w, DEADLINE.h, new MeshBasicMaterial({ color: PAPER }), DEADLINE.at, Math.PI);
  sheet.name = "deadline"; // drawn per frame (drawDeadline)
  root.add(clock, sheet);
  // Desks.
  [[OFFICE.yourDesk, 1], [OFFICE.mikeDesk, 2], [OFFICE.testDesk, 3], [new Vector3(-2.8, 0, -3.6), 4], [new Vector3(0, 0, -3.6), 5], [new Vector3(2.9, 0, -3.6), 6]].forEach(([p, s]) => {
    const d = desk(s as number);
    d.position.copy(p as Vector3);
    d.name = `desk${s}`;
    root.add(d);
  });
  // The door (a panel on a hinge; the story swings it open).
  const door = new Group();
  door.name = "door";
  const dk = new Kit();
  dk.box(M("doorPanel", () => toonMaterial({ map: planks("#8a5a3a"), repeat: [1, 1] })), 0.06, 2.1, 1.0, 0, 1.05, 0.5, false);
  dk.add(MAT.metal(), new SphereGeometry(0.04, 8, 6), -0.06, 1.0, 0.9);
  door.add(dk.build());
  door.position.copy(OFFICE.door).setX(OFFICE.door.x - 0.05);
  root.add(door);
  // Corridor dressing seen through the open door: a notice board and a green fire-exit sign.
  root.add(plane(1.2, 0.9, unlit("notices", corkTex), new Vector3(8.74, 1.6, -1.6), -Math.PI / 2));
  root.add(plane(0.5, 0.2, unlit("exitSign", () => canvasTex(250, 100, (g) => { g.fillStyle = "#1f8a4a"; g.fillRect(0, 0, 250, 100); g.fillStyle = "#fbf7ee"; g.font = `900 44px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("EXIT", 125, 66); })), new Vector3(8.74, 2.55, -2.6), -Math.PI / 2));
  door.userData = { door: 2.1, opens: true, out: new Vector3(1, 0, 0), doorway: new Vector3(6.1, 0, -1.9) }; // QA "Door logic"
  const sign = plane(0.6, 0.2, unlit("doorSign", () => canvasTex(300, 100, (g) => { g.fillStyle = "#2a2a5a"; g.fillRect(0, 0, 300, 100); g.fillStyle = "#fbf7ee"; g.font = `900 46px "Nunito", sans-serif`; g.textAlign = "center"; g.fillText("STUDIO 2", 150, 66); })), new Vector3(5.97, 2.35, -1.9), -Math.PI / 2);
  root.add(sign);
  return root;
};
/** Practical lights (desk lamps warm, monitors cool, the moon through the windows). */
export const OFFICE_LIGHTS = [
  ...[OFFICE.yourDesk, OFFICE.mikeDesk, OFFICE.testDesk].map((p) => ({ pos: p.clone().add(new Vector3(-0.6, 1.1, -0.15)), kind: "lamp" as const, color: ["#ffb35c", 1.0] as [string, number] })),
  ...[OFFICE.yourScreen, OFFICE.mikeScreen, OFFICE.testScreen].map((p) => ({ pos: p.clone().add(new Vector3(0, 0, 0.25)), kind: "screen" as const, color: ["#8fd0ff", 0.6] as [string, number] })),
  { pos: new Vector3(-5.6, 1.8, -2.8), kind: "window" as const, color: ["#6a7aff", 0.7] as [string, number] },
  { pos: new Vector3(0.5, 2.8, -2.0), kind: "lamp" as const, color: ["#ffd09a", 0.6] as [string, number] }, // a warm ceiling lamp over the middle of the room
  // Warm wash lamps on the back and front walls, far from every head (R23: the room was one flat purple).
  ...[new Vector3(-1.6, 3.0, -5.2), new Vector3(2.4, 3.0, -5.2), new Vector3(-3.0, 3.0, 2.0)].map((pos) => ({ pos, kind: "lamp" as const, color: ["#ffc98a", 0.9] as [string, number] })),
  { pos: new Vector3(7.6, 2.75, -1.9), kind: "window" as const, color: ["#fff0d4", 1.0] as [string, number] }, // the corridor strip light
];

// ================================================================== props
/** The publisher's giant rubber stamp (origin at the rubber face; handle up). */
export const stamp = () => {
  const k = new Kit();
  k.box(M("stampRubber", () => toonMaterial({ color: "#c8282a" })), 0.34, 0.05, 0.22, 0, 0.025, 0, false);
  k.box(MAT.wood(), 0.36, 0.1, 0.24, 0, 0.1, 0, false);
  k.add(MAT.darkWood(), new CylinderGeometry(0.04, 0.05, 0.3, 10), 0, 0.3, 0);
  k.add(MAT.darkWood(), new SphereGeometry(0.09, 12, 9), 0, 0.5, 0);
  const g = k.build();
  const label = plane(0.3, 0.07, unlit("stampLabel", () => canvasTex(300, 70, (c) => { c.fillStyle = "#f6f2e6"; c.fillRect(0, 0, 300, 70); c.fillStyle = "#c8282a"; c.font = `900 50px "Nunito", sans-serif`; c.textAlign = "center"; c.fillText("CANCEL", 150, 52); })), new Vector3(0, 0.1, 0.125));
  g.add(label);
  return g;
};
/** A sticky note that says NEW GAME (line 7). */
export const stickyNote = () => plane(0.12, 0.12, unlit("sticky", () => canvasTex(128, 128, (g) => { g.fillStyle = "#f8e04a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#141014"; g.font = `900 30px "Comic Sans MS", sans-serif`; g.textAlign = "center"; g.fillText("NEW", 64, 56); g.fillText("GAME!", 64, 96); })), new Vector3());
/** A coffee cup with a CANCELLED stamp on it (line 19) and a stack of cups (line 12). */
export const cupStack = () => {
  const g = new Group();
  for (let i = 0; i < 14; i++) {
    const c = new Mesh(new CylinderGeometry(0.045, 0.038, 0.1, 12), M(`cup${i % 4}`, () => toonMaterial({ color: ["#f6f2e6", "#c8282a", "#2a6ad8", "#f2c23a"][i % 4] })));
    c.position.set(0, 0.05 + i * 0.1, 0);
    c.name = `cup${i}`;
    g.add(c);
  }
  return g;
};
export const cancelledCup = () => {
  const g = new Group();
  g.add(new Mesh(new CylinderGeometry(0.05, 0.042, 0.11, 14), M("cup0", () => toonMaterial({ color: "#f6f2e6" }))));
  const mark = plane(0.08, 0.035, unlit("cancelMark", () => canvasTex(160, 70, (c) => { c.strokeStyle = "#c8282a"; c.lineWidth = 6; c.strokeRect(6, 6, 148, 58); c.fillStyle = "#c8282a"; c.font = `900 34px "Nunito", sans-serif`; c.textAlign = "center"; c.fillText("CANCEL", 80, 48); }), true), new Vector3(0, 0, 0.051));
  mark.name = "mark";
  g.add(mark);
  return g;
};
/** Our own box art (no real cover): a top-down night city, a getaway car with police behind, the name painted on. */
export const gameBox = () => {
  const art = canvasTex(500, 700, (g) => {
    g.fillStyle = "#141a3a"; g.fillRect(0, 0, 500, 700);
    g.fillStyle = "#2a3060"; for (let i = 0; i < 5; i++) g.fillRect(i * 110 - 20, 140, 70, 560);
    g.fillStyle = "#3a3f5a"; g.fillRect(0, 380, 500, 90); g.fillRect(200, 140, 90, 560);
    g.fillStyle = "#f2c23a"; for (let x = 10; x < 500; x += 50) g.fillRect(x, 422, 26, 6);
    g.fillStyle = "#e0662e"; g.fillRect(220, 410, 60, 34);
    for (let i = 0; i < 3; i++) { g.fillStyle = "#f6f6f6"; g.fillRect(60 + i * 50, 404, 46, 30); g.fillStyle = i % 2 ? "#e0342e" : "#3a6aff"; g.fillRect(74 + i * 50, 412, 16, 8); }
    g.fillStyle = "#f2c23a"; g.font = `900 64px "Nunito", sans-serif`; g.textAlign = "center"; // 78 px ran off the box
    g.fillText("GRAND", 250, 80); g.fillText("THEFT AUTO", 250, 140);
    g.strokeStyle = "#fbf7ee"; g.lineWidth = 6; g.strokeRect(10, 10, 480, 680);
  });
  const side = MAT.color("#141a3a");
  const front = new MeshBasicMaterial({ map: art });
  const m = new Mesh(new BoxGeometry(0.5, 0.7, 0.12), [side, side, side, side, front, side]);
  return m;
};
/** The newspaper (line 21): a front page with a screaming headline (an invented paper, no real masthead). */
export const newspaper = () =>
  scaled(0.75, new Mesh(new PlaneGeometry(0.62, 0.82), unlit("paper", () => canvasTex(620, 820, (g) => {
    g.fillStyle = "#f2ede0"; g.fillRect(0, 0, 620, 820);
    g.fillStyle = "#141014"; g.font = `900 60px "Times New Roman", serif`; g.textAlign = "center"; g.fillText("THE DAILY DRUM", 310, 80);
    g.fillRect(20, 100, 580, 6);
    g.fillStyle = "#c8282a"; g.font = `900 92px "Nunito", sans-serif`; g.fillText("A GAME", 310, 210); g.fillText("FOR THUGS!", 310, 300);
    g.fillStyle = "#3a3a3a"; g.fillRect(40, 340, 300, 220);
    g.fillStyle = "#f2ede0"; g.font = `900 40px "Nunito", sans-serif`; g.fillText("BAN IT?", 190, 460);
    g.fillStyle = "#8a8a8a"; for (let y = 350; y < 800; y += 22) { g.fillRect(360, y, 220, 8); if (y > 580) g.fillRect(40, y, 300, 8); }
  }))));
const scaled = <T extends Object3D>(k: number, o: T) => (o.scale.setScalar(k), o);

// ================================================================== the game: a top-down toy city
export const CITY = { block: 9, road: 3.2, n: 5 }; // blocks of 9 m between 3.2 m roads; 5 x 5 blocks
const span = CITY.block + CITY.road;
/** Road centre lines: x (or z) = i * span for i in -2..3 (the grid is centred on the origin). */
export const roadAt = (i: number) => (i - 2.5) * span + 0.0;
const roadTex = () =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = "#4a4a56"; g.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 900; k++) { g.fillStyle = rnd(k) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)"; g.fillRect(rnd(k + 1) * 256, rnd(k + 2) * 256, 3, 3); }
  });
const roofCols = ["#c85a3a", "#3a6ad8", "#e8b83a", "#5aa86a", "#e0e0d8", "#8a5ab8", "#d87a9a", "#3aa8a8"];
/** "GTA?" painted across a junction, readable from above (line 1). */
const roofLetters = (y: number) =>
  plane(5.0, 2.0, unlit("gtaLetters", () => canvasTex(1000, 400, (g) => {
    g.fillStyle = "#f2c23a"; g.strokeStyle = "#141014"; g.lineWidth = 14; g.font = `900 300px "Nunito", sans-serif`; g.textAlign = "center";
    g.strokeText("GTA?", 500, 320); g.fillText("GTA?", 500, 320);
  }), true), new Vector3(-0.6, y, -1.6), 0, -Math.PI / 2);
/** Height of the middle block's single building (its roof carries the "GTA?" letters). */
const MIDDLE_H = 3.2;
/** The toy city: roads, pavements, blocks of 1-4 buildings with busy roofs (vents, tanks, gardens, signs), trees,
 * parked cars; the "GTA?" letters; a rooftop billboard named "billboard" (line 23). */
export const toyCity = () => {
  const root = new Group(), k = new Kit();
  const L = CITY.n * span + CITY.road;
  k.add(M("cityGround", () => toonMaterial({ map: roadTex(), repeat: [12, 12] })), new BoxGeometry(L + 30, 0.1, L + 30), 0, -0.05, 0);
  const pave = M("pavement", () => toonMaterial({ map: rough("#b8b0a4"), repeat: [1, 1] }));
  for (let i = 0; i < CITY.n; i++)
    for (let j = 0; j < CITY.n; j++) {
      const cx = (i - 2) * span, cz = (j - 2) * span;
      k.box(pave, CITY.block, 0.12, CITY.block, cx, 0.06, cz, false);
      const mid = i === 2 && j === 2; // the middle block: one low building, "GTA?" painted on its bare roof
      const n = mid ? 1 : 1 + Math.floor(rnd(i * 7 + j) * 4);
      for (let b = 0; b < n; b++) {
        const w = n === 1 ? 7 : 3.4, d = n <= 2 ? 7 : 3.4, h = mid ? MIDDLE_H : 2 + rnd(i * 13 + j * 5 + b) * 7;
        const bx = cx + (n === 1 ? 0 : (b % 2 ? 1.9 : -1.9)), bz = cz + (n <= 2 ? 0 : b < 2 ? -1.9 : 1.9);
        const col = roofCols[(i * 3 + j * 5 + b) % roofCols.length];
        k.box(M(`wall${col}`, () => toonMaterial({ map: facadeTex(col), repeat: [1, 1] })), w, h, d, bx, h / 2 + 0.12, bz, false);
        k.box(M(`roof${col}`, () => toonMaterial({ map: roofTex(col), repeat: [1, 1] })), w + 0.2, 0.2, d + 0.2, bx, h + 0.22, bz, false);
        const s = i * 31 + j * 17 + b;
        if (mid) { // vents and a tank on the roof's south half, clear of the letters (R23: a bare orange roof read flat)
          k.box(MAT.metal(), 0.9, 0.5, 0.9, 2.4, h + 0.57, 2.3, false);
          k.box(MAT.metal(), 0.7, 0.4, 0.7, -2.6, h + 0.52, 2.6, false);
          k.add(MAT.color("#8a6a4a"), new CylinderGeometry(0.55, 0.55, 1.0, 12), 0.6, h + 0.82, 2.4);
          continue;
        }
        if (rnd(s) > 0.4) k.box(MAT.metal(), 0.8, 0.5, 0.8, bx + 0.9, h + 0.55, bz - 0.8, false); // a vent
        if (rnd(s + 1) > 0.6) k.add(MAT.color("#8a6a4a"), new CylinderGeometry(0.55, 0.55, 1.0, 12), bx - 1, h + 0.82, bz + 0.9); // a water tank
        if (rnd(s + 2) > 0.7) k.box(MAT.color("#5aa86a"), w * 0.6, 0.15, d * 0.4, bx, h + 0.4, bz, false); // a roof garden
      }
      for (let t = 0; t < 3; t++) if (rnd(i * 5 + j * 11 + t) > 0.5) k.add(M("tree", () => toonMaterial({ color: "#3a9a4a" })), new SphereGeometry(0.75, 10, 8), cx - 3.6 + t * 3.6, 1.3, cz + 4.2);
    }
  const city = k.build();
  city.userData.collider = "toy city";
  root.add(city);
  // Lane markings along every road.
  const dash = new MeshBasicMaterial({ color: "#f2e6b0" });
  for (let i = 0; i <= CITY.n; i++)
    for (let t = -L / 2; t < L / 2; t += 2.4)
      for (const along of [0, 1]) {
        const m = new Mesh(new PlaneGeometry(along ? 1.1 : 0.14, along ? 0.14 : 1.1), dash);
        m.rotation.x = -Math.PI / 2;
        m.position.set(along ? t : roadAt(i), 0.012, along ? roadAt(i) : t);
        root.add(m);
      }
  root.add(roofLetters(MIDDLE_H + 0.33));
  // The billboard (line 23) on the tallest corner roof.
  const bb = new Group();
  bb.name = "billboard";
  const bk = new Kit();
  bk.box(MAT.metal(), 0.2, 3, 0.2, -2.5, 1.5, 0, false);
  bk.box(MAT.metal(), 0.2, 3, 0.2, 2.5, 1.5, 0, false);
  bk.box(MAT.color("#141014"), 6.4, 3.0, 0.3, 0, 4.4, -0.05, false);
  bb.add(bk.build());
  const face = new Mesh(new PlaneGeometry(6, 2.6), new MeshBasicMaterial({ color: "#ffffff" }));
  face.name = "billboardFace";
  face.position.set(0, 4.4, 0.12);
  bb.add(face);
  bb.position.set(0, 9.4, -span * 1 - 1);
  root.add(bb);
  return root;
};
/** A toy car (origin at its centre on the ground, nose +z): `police` gets a white body, a blue stripe and a light bar
 * whose two lamps are named "red" and "blue" (the story flashes them); the getaway car is rust. */
export const toyCar = (kind: "police" | "robber" | "parked", seed = 0) => {
  const k = new Kit(), body = kind === "police" ? "#f4f4f0" : kind === "robber" ? "#e0662e" : ["#3a6ad8", "#5aa86a", "#d8b03a", "#8a5ab8"][seed % 4];
  k.box(M(`carBody${body}`, () => toonMaterial({ color: body, spec: 0.5 })), 1.1, 0.42, 2.2, 0, 0.36, 0, false);
  k.box(M(`carCab${body}`, () => toonMaterial({ color: body, spec: 0.5 })), 0.95, 0.34, 1.1, 0, 0.72, -0.1, false);
  k.box(M("carGlass", () => toonMaterial({ color: "#3a5070", spec: 0.8 })), 0.97, 0.22, 0.6, 0, 0.72, 0.18, false);
  if (kind === "police") k.box(M("policeStripe", () => toonMaterial({ color: "#2a4ad8" })), 1.12, 0.12, 2.0, 0, 0.42, 0, false);
  for (const [x, z] of [[-0.5, 0.7], [0.5, 0.7], [-0.5, -0.7], [0.5, -0.7]]) k.add(M("tyre", () => toonMaterial({ color: "#1a1a1e" })), new CylinderGeometry(0.2, 0.2, 0.16, 10), x, 0.2, z, { rz: Math.PI / 2 });
  const g = k.build();
  if (kind === "police") {
    const bar = new Group();
    bar.name = "lightbar";
    for (const [name, x, col] of [["red", -0.18, "#ff2a2a"], ["blue", 0.18, "#2a6aff"]] as const) {
      const l = new Mesh(new BoxGeometry(0.3, 0.12, 0.22), new MeshBasicMaterial({ color: col }));
      l.name = name;
      l.position.set(x, 0.95, -0.1);
      bar.add(l);
    }
    g.add(bar);
  }
  return g;
};

// ================================================================== the House of Lords (our own chamber)
export const LORDS = { benchZ: [-1.2, -2.2, -3.2], back: -4.2 };
export const lordsChamber = () => {
  const root = new Group(), k = new Kit();
  const red = M("lordsRed", () => toonMaterial({ map: tuftTex(), repeat: [1, 1] })), gold = M("gold", () => toonMaterial({ color: "#d8a83a", spec: 0.7 }));
  k.add(M("lordsFloor", () => toonMaterial({ map: rough("#7a2a2a"), repeat: [1, 1] })), new BoxGeometry(14, 0.1, 12), 0, -0.05, -2);
  k.add(M("lordsPanel", () => toonMaterial({ map: panelTex(), repeat: [1, 1] })), new BoxGeometry(14, 6, 0.3), 0, 3, -5.0);
  LORDS.benchZ.forEach((z, i) => { k.box(red, 9, 0.5 + i * 0.3, 0.7, 0, 0.25 + i * 0.15, z, false); k.box(red, 9, 0.6, 0.15, 0, 0.75 + i * 0.3, z - 0.35, false); k.box(gold, 9.05, 0.05, 0.05, 0, 0.5 + i * 0.3, z + 0.36, false); });
  for (let i = 0; i < 6; i++) { k.box(gold, 0.18, 4.6, 0.18, -5 + i * 2, 2.3, -4.8, false); k.box(M("archWin", () => toonMaterial({ color: "#f2d89a", emissive: ["#ffcf7a", 0.6] })), 1.2, 2.6, 0.05, -4 + i * 2, 3.2, -4.84, false); }
  k.box(gold, 2.6, 4.2, 0.4, 0, 2.6, -4.6, false); // a golden canopy at the end
  k.box(red, 1.4, 1.6, 0.6, 0, 0.8, -4.2, false);
  const g = k.build();
  g.userData.collider = "lords chamber";
  root.add(g);
  return root;
};

// ================================================================== cast
/** Mike, the engine programmer: long hair, round glasses, a green plaid shirt. */
export const mikeLook: Look = {
  build: BUILDS.tallThin, seed: 71, jacket: "#3a7a5a", pants: "#2a3046", shoes: "#3a2a20",
  outfit: layers(pattern("plaid", "#3a7a5a", "#2a5a40", "#c8d8a0"), outfit({ bottom: ["#2a3046", 0.86] })),
  hair: capHair("#3a2418", 0.55, 0.85),
  face: glasses,
};
/** Dave, the boss: a short beard, glasses, a navy jumper. */
const beard = (p: Pen, h: Head) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) { const t = Math.PI * (i / 16); pts.push([h.cx + Math.cos(t) * h.a * 0.62, h.cy + 14 * h.u + Math.sin(t) * h.b * 0.42]); }
  p.poly(pts, "#4a3022", 2.2 * h.u);
};
export const daveLook: Look = {
  build: BUILDS.shortRound, seed: 73, jacket: "#2a3a6a", pants: "#3a3440", shoes: "#2a2020",
  outfit: outfit({ bottom: ["#3a3440", 0.86], collar: "#f2ece2", stripes: { color: "#3a4a8a", gap: 12 } }),
  hair: capHair("#4a3022", 0.32, 0.5),
  face: (p, h) => { beard(p, h); glasses(p, h); },
};
/** The publisher: tall, a pinstripe suit, a red tie, slicked-back hair. */
export const publisherLook: Look = {
  build: BUILDS.tallThin, seed: 75, jacket: "#2a2a34", pants: "#2a2a34", shoes: "#141014",
  outfit: layers(pattern("pinstripe", "#2a2a34", "#5a5a6a"), outfit({ bottom: ["#2a2a34", 0.9], shirt: { color: "#f2ece2", tie: "#c8282a" } })),
  hair: capHair("#1a1418", 0.26, 0.4),
  brim: false,
};
/** Testers: three different 90s looks. */
export const testerLooks: Look[] = [
  { build: BUILDS.shortRound, seed: 81, jacket: "#d8582c", pants: "#2a3046", shoes: "#f2f2f2", outfit: outfit({ bottom: ["#2a3046", 0.86], stripes: { color: "#f2c23a", gap: 10 } }), hair: capHair("#c89a5a", 0.3, 0.4) },
  { build: BUILDS.pear, seed: 83, jacket: "#6a3a8a", pants: "#3a3a46", shoes: "#2a2020", outfit: outfit({ bottom: ["#3a3a46", 0.86], collar: "#f2ece2" }), hair: capHair("#2a1a14", 0.5, 0.5), face: glasses },
  { build: BUILDS.tallThin, seed: 85, jacket: "#2a8a8a", pants: "#2a3046", shoes: "#c8423a", outfit: layers(outfit({ bottom: ["#2a3046", 0.86] }), suspenders("#c8282a")), hair: headLayers(capHair("#5a3a24", 0.3, 0.5), cap("#f2c23a", true)) },
];
/** Lords: red robes with a white fur collar (dots), grey hair. */
export const lordLook = (seed: number): Look => ({
  build: seed % 2 ? BUILDS.old : BUILDS.shortRound, seed, jacket: "#a8262a", pants: "#a8262a", shoes: "#141014",
  outfit: layers(outfit({ bottom: ["#8a1e22", 0.95], collar: "#f6f2ea" }), pattern("dots", "#a8262a", "#f6f2ea")),
  hair: tufts,
  face: seed % 3 ? tache("walrus", "#e8e4dc") : undefined,
});
/** You as the cop (a police cap) and as the robber (a striped beanie) for line 17. */
const beanie = (p: Pen, h: Head) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const t = Math.PI + Math.PI * (i / 20); pts.push([h.cx + Math.cos(t) * h.a * 1.04, h.cy - 0.32 * h.b + Math.sin(t) * h.b * 0.82]); }
  p.poly(pts, "#2a2a30", 2.6 * h.u);
  for (let s = 0; s < 3; s++) p.stroke([[h.cx - h.a * 0.95, h.cy - 0.45 * h.b - s * 0.18 * h.b], [h.cx + h.a * 0.95, h.cy - 0.45 * h.b - s * 0.18 * h.b]], 5 * h.u, "#e8e4dc");
  p.dot(h.cx, h.cy - 1.15 * h.b, 9 * h.u, "#e8e4dc");
};
export const youCop: Look = { ...youLook, hair: headLayers(youLook.hair!, cap("#1c2a5a")), brim: true };
export const youRobber: Look = { ...youLook, hair: headLayers(youLook.hair!, beanie) };
export { INK };
export const placeAt = (o: Object3D, p: Vector3) => (o.position.copy(p), o);
export { CircleGeometry };
