import { BoxGeometry, BufferGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { PRESETS } from "../../../kit/toon/build/presets";
import { signFace } from "../../../kit/toon/build/signs";
import { spine } from "../../../kit/toon/build/street";
import type { StreetOpts } from "../../../kit/toon/build/street";
import { BUILDS, capHair, outfit } from "../../../kit/toon/extras";
import type { Look } from "../../../kit/toon/figure";
import type { Head } from "../../../kit/toon/face";
import { glowSprite } from "../../../kit/toon/glow";
import { bricks, planks, rough } from "../../../kit/toon/paint";
import { toonMaterial } from "../../../kit/toon/shade";
import { INK, Pen } from "../../../kit/toon/toon";
import { cap, headLayers, layers, overalls, tache } from "../../../kit/toon/wardrobe";

/**
 * trapped-in-this-world: the places and the story props. Everything is our own; the meta layer (frame edge, progress
 * bar, caption words) is 2D and lives in Video.tsx.
 *   street   the looping "In this world" video: a cobbled high street at sunset (victorian_town, sunset light), with a
 *            reserved lot on the right (s 14-22) for YOUR wall: 9,000 chalk tallies, a painted door, the chalk plan
 *   pink     the next video: a pink-dawn suburb full of pigeon people
 */
export const at = spine(0).at;

// ------------------------------------------------------------------ the street
export const WALL_X = 6.2; // front face of your wall (the lot s 14-22 on the right)
export const TALLY = { s0: 15.4, s1: 19.6, y0: 0.35, y1: 3.1 };
export const PLAN = { s0: 14.25, s1: 15.25 };
export const DOOR_S = 20.9;
export const YOU_SPOT = at(12, 4.0, 0.02); // where you punch the edge of the screen, every loop
export const GARY_X = 5.25; // Gary's line along the pavement (worn into the cobbles), clear of the lamp posts at 4.45
export const SIGN_AT = at(19, 1.0, 6.2); // the narrator's caption sign floats over the street

const placed = (o: Object3D, p: Vector3, ry = 0) => ((o.position.copy(p), (o.rotation.y = ry)), o);
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** 9,000 chalk tallies (groups of five), scrawled floor to roof; `plan`: Gary's path diagram on the left part. */
const tallyTex = (w: number, h: number) =>
  canvasTex(w, h, (g) => {
    g.strokeStyle = "rgba(246,242,232,0.92)";
    g.lineCap = "round";
    const cols = 46, rows = 26, cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const k = r * cols + c, x = c * cw + cw * 0.12, y = r * rh + rh * 0.15, j = (n: number) => (rnd(k * 7 + n) - 0.5) * cw * 0.12;
        g.lineWidth = cw * (0.06 + 0.03 * rnd(k));
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          g.moveTo(x + i * cw * 0.17 + j(i), y + j(i + 9));
          g.lineTo(x + i * cw * 0.17 + j(i + 4), y + rh * 0.7 + j(i + 13));
        }
        g.moveTo(x - cw * 0.04, y + rh * 0.55 + j(20));
        g.lineTo(x + cw * 0.6, y + rh * 0.12 + j(21));
        g.stroke();
      }
  });
const planTex = (w: number, h: number) =>
  canvasTex(w, h, (g) => {
    g.strokeStyle = g.fillStyle = "rgba(246,242,232,0.95)";
    g.lineWidth = w * 0.012;
    g.lineCap = "round";
    g.font = `900 ${w * 0.11}px "Comic Sans MS", sans-serif`;
    g.textAlign = "center";
    g.fillText("GARY", w * 0.5, h * 0.12);
    // His path: a dashed line along the street, a ladder drawn as a box, a big circle where it swings, arrows.
    g.setLineDash([w * 0.04, w * 0.03]);
    g.beginPath();
    g.moveTo(w * 0.1, h * 0.3);
    g.bezierCurveTo(w * 0.4, h * 0.36, w * 0.5, h * 0.6, w * 0.88, h * 0.62);
    g.stroke();
    g.setLineDash([]);
    g.strokeRect(w * 0.42, h * 0.44, w * 0.3, h * 0.05);
    g.beginPath();
    g.arc(w * 0.57, h * 0.47, w * 0.2, 0, Math.PI * 2);
    g.stroke();
    g.font = `900 ${w * 0.075}px "Comic Sans MS", sans-serif`;
    g.fillText("52.14 s", w * 0.5, h * 0.78);
    g.fillText("SWING!", w * 0.62, h * 0.92);
  });
/** A painted door (trompe l'oeil): a real-looking door with a painted shadow, flat on the wall. */
const paintedDoorTex = () =>
  canvasTex(512, 1024, (g) => {
    g.fillStyle = "#7a4a34";
    g.fillRect(40, 30, 432, 980);
    g.fillStyle = "rgba(20,10,8,0.35)";
    g.fillRect(40, 30, 30, 980); // painted shadow on the jamb
    g.strokeStyle = "#3a2018";
    g.lineWidth = 10;
    for (const [x, y, ww, hh] of [[100, 90, 312, 360], [100, 520, 312, 420]]) g.strokeRect(x, y, ww, hh);
    g.fillStyle = "#e2c25a";
    g.beginPath();
    g.arc(400, 520, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f4ead2";
    g.fillRect(150, 200, 212, 70);
    g.fillStyle = "#3a2018";
    g.font = "900 54px sans-serif";
    g.textAlign = "center";
    g.fillText("OPEN", 256, 255);
  });

/** Your wall on the reserved lot: brick, a plinth, the tallies, the chalk plan, the painted door, a stopwatch. */
export const yourWall = () => {
  const k = new Kit(), L = 8.2, H = 5.2;
  k.add(M("yourBrick", () => toonMaterial({ map: bricks("#9a5a44"), repeat: [2.2, 1.4] })), new BoxGeometry(0.4, H, L), WALL_X + 0.2, H / 2, -18);
  k.box(MAT.darkStone(), 0.5, 0.35, L, WALL_X + 0.15, 0.175, -18);
  k.box(MAT.stone(), 0.55, 0.22, L + 0.1, WALL_X + 0.17, H, -18);
  const g = k.build();
  g.userData.collider = "your wall";
  const decal = (tex: CanvasTexture, s0: number, s1: number, y0: number, y1: number) => {
    const m = new Mesh(new PlaneGeometry(s1 - s0, y1 - y0), new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.position.copy(at((s0 + s1) / 2, WALL_X - 0.005, (y0 + y1) / 2));
    m.rotation.y = -Math.PI / 2;
    return m;
  };
  g.add(decal(tallyTex(2048, 1340), TALLY.s0, TALLY.s1, TALLY.y0, TALLY.y1));
  g.add(decal(planTex(512, 640), PLAN.s0, PLAN.s1, 0.9, 2.15));
  const door = new Mesh(new PlaneGeometry(1.15, 2.25), M("paintedDoor", () => toonMaterial({ map: paintedDoorTex() })));
  door.position.copy(at(DOOR_S, WALL_X - 0.006, 1.3));
  door.rotation.y = -Math.PI / 2;
  g.add(door);
  // Stopwatch on a nail, labelled GARY (line 12).
  const sw = new Kit();
  sw.add(MAT.metal(), new CylinderGeometry(0.11, 0.11, 0.04, 18), 0, 0, 0, { rx: Math.PI / 2 });
  sw.add(M("swFace", () => toonMaterial({ map: rough("#f4ece0"), repeat: [1, 1] })), new CylinderGeometry(0.09, 0.09, 0.045, 18), 0, 0, 0.004, { rx: Math.PI / 2 });
  sw.add(MAT.metal(), new CylinderGeometry(0.02, 0.02, 0.05, 8), 0, 0.13, 0);
  const watch = sw.build();
  const hand = new Mesh(new BoxGeometry(0.008, 0.07, 0.005), new MeshBasicMaterial({ color: INK }));
  hand.position.set(0.018, 0.025, 0.03);
  hand.rotation.z = -0.7;
  watch.add(hand);
  const tag = signFace("GARY", "#f4ead2", "#8a1e1a", 0.2, 0.07);
  tag.position.set(0, -0.17, 0.02);
  watch.add(tag);
  g.add(placed(watch, at(14.75, WALL_X - 0.03, 2.4), -Math.PI / 2));
  return g;
};
/** Two shallow grooves worn into the cobbles along Gary's line (s 0-40), and your chalk X. */
export const grooves = () => {
  const g = new Group();
  g.userData.collider = "grooves";
  const mat = new MeshBasicMaterial({ color: "#2a1c1c", transparent: true, opacity: 0.35, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  for (const dx of [-0.13, 0.13]) {
    const m = new Mesh(new PlaneGeometry(0.11, 40), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.copy(at(20, GARY_X + dx, 0.024));
    g.add(m);
  }
  // Your chalk X (YOU_SPOT): the spot Gary's ladder sweeps at 99 %. Planted in line 4, paid off when you freeze on it.
  const chalk = new MeshBasicMaterial({ color: "#f6f2e8", transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  for (const r of [0.78, -0.78]) {
    const m = new Mesh(new PlaneGeometry(0.09, 0.75), chalk);
    m.rotation.set(-Math.PI / 2, 0, r);
    m.position.copy(YOU_SPOT).setY(0.026);
    g.add(m);
  }
  return g;
};
/**
 * Bunting zig-zagging across the street between the lamp heads (R21b: the refs' sets carry small, many-coloured
 * detail everywhere, ref6's sunset street is strung with flags; ours read as one pink-orange block). Lamps stand
 * every 7 m from s 3, alternating sides at x +-4.45, the head 0.55 m out over the street and 3.55 m up.
 */
export const bunting = () => {
  const g = new Group(), cols = ["#e0342e", "#f2c23a", "#3a7ad8", "#4aa84a", "#fbf7ee", "#8a4ad8"];
  const tri = new BufferGeometry().setFromPoints([new Vector3(-0.15, 0, 0), new Vector3(0.15, 0, 0), new Vector3(0, -0.36, 0)]);
  tri.computeVertexNormals();
  const mats = cols.map((c, i) => M(`flag${i}`, () => new MeshBasicMaterial({ color: c, side: 2 })));
  const cord = new MeshBasicMaterial({ color: "#3a2a2a" });
  const head = (s: number, side: number) => at(s, side * (4.45 - 0.55), 3.82);
  for (let i = 0; i < 7; i++) {
    const s0 = 3 + i * 7, a = head(s0, i % 2 ? -1 : 1), b = head(s0 + 7, i % 2 ? 1 : -1);
    const len = a.distanceTo(b), n = Math.floor(len / 0.42);
    const pt = (t: number) => a.clone().lerp(b, t).add(new Vector3(0, -0.9 * 4 * t * (1 - t), 0)); // sagging cord
    const pts = Array.from({ length: 25 }, (_, k) => pt(k / 24));
    const line = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.012, 4), cord);
    g.add(line);
    for (let k = 1; k < n; k++) {
      const t = k / n, p = pt(t), q = pt(t + 0.01);
      const f = new Mesh(tri, mats[(k + i * 2) % mats.length]);
      f.position.copy(p);
      f.lookAt(p.clone().add(new Vector3().subVectors(q, p).cross(new Vector3(0, 1, 0)).normalize()));
      f.rotateZ(Math.atan2(q.y - p.y, Math.hypot(q.x - p.x, q.z - p.z)) * 0.5);
      g.add(f);
    }
  }
  return g;
};
export const STREET: StreetOpts = {
  seed: 909, length: 52, curve: 0, gloss: 0.3, lightCenter: at(14, 3, 2),
  reserve: [{ side: 1, s0: 13.6, s1: 22.4 }],
  extra: () => [yourWall(), grooves()],
};
export const STREET_PRESET = { ...PRESETS.victorian_town, debris: [] };
export const PINK_PRESET = { ...PRESETS.modern_suburb, debris: [] };

// ------------------------------------------------------------------ cut 4 (R21 script): the pigeon, the tallies that run out of wall
/** The lamp post at s 17 (street builder: lamps every 7 m from s 3, alternating sides; s 17 is on the right). */
export const PIGEON_LAMP = at(17, 4.45);
/** Where the pigeon sits: on the lamp's arm, above the lantern (LAMP_HEAD 0.55 m out over the street, 3.55 m up). */
export const PIGEON_AT = at(17, 3.92, 3.82);
/** A street pigeon (origin at its feet, facing +z): grey body, darker wing, green-violet neck, orange beak. */
export const pigeon = () => {
  const k = new Kit(), grey = M("pigeonGrey", () => toonMaterial({ color: "#8f97a8" })), dark = M("pigeonDark", () => toonMaterial({ color: "#5d6474" }));
  k.add(grey, new SphereGeometry(0.11, 14, 10).scale(1, 0.85, 1.35), 0, 0.12, 0);
  k.add(dark, new SphereGeometry(0.08, 10, 8).scale(0.5, 0.6, 1.4), 0.07, 0.13, -0.02);
  k.add(dark, new SphereGeometry(0.08, 10, 8).scale(0.5, 0.6, 1.4), -0.07, 0.13, -0.02);
  k.add(M("pigeonNeck", () => toonMaterial({ color: "#5aa88a" })), new SphereGeometry(0.065, 10, 8), 0, 0.2, 0.09);
  k.add(grey, new SphereGeometry(0.06, 12, 10), 0, 0.26, 0.12);
  k.add(M("pigeonBeak", () => toonMaterial({ color: "#f2a23a" })), new CylinderGeometry(0.0, 0.018, 0.05, 6), 0, 0.255, 0.19, { rx: Math.PI / 2 });
  k.add(dark, new BoxGeometry(0.1, 0.02, 0.12), 0, 0.12, -0.17);
  const g = k.build();
  for (const x of [-0.03, 0.03]) {
    const eye = new Mesh(new SphereGeometry(0.011, 8, 6), new MeshBasicMaterial({ color: INK }));
    eye.position.set(x * 1.4, 0.275, 0.165);
    g.add(eye);
  }
  return g;
};
/** The tallies that ran out of wall: they carry on along the pavement at the foot of your wall (line 10). */
export const pavementTallies = () => {
  const m = new Mesh(new PlaneGeometry(0.5, 5.4), new MeshBasicMaterial({ map: tallyTex(256, 2048), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(at(12.7, WALL_X - 0.4, 0.026));
  return m;
};

// ------------------------------------------------------------------ Mia's living room (outside the video)
/** The room is its own scene around the origin (x right, -z toward the back wall). Seat top of the couch at y SEAT. */
export const SEAT = 0.54;
export const COUCH_Z = -1.6;
/** Where each of you sits (card soles on the seat, in front of the backrest) and where Mia draws on the rug. */
export const ROOM_SPOTS = { you: new Vector3(0.48, SEAT, COUCH_Z), miaSeat: new Vector3(-0.42, SEAT, COUCH_Z), miaRug: new Vector3(-0.95, 0.012, -0.35) };
const wallpaper = () =>
  canvasTex(512, 512, (g) => {
    g.fillStyle = "#e6a57a";
    g.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 64) {
      g.fillStyle = "rgba(255,240,220,0.35)";
      g.fillRect(x, 0, 22, 512);
      g.fillStyle = "rgba(160,70,50,0.35)";
      for (let y = 20; y < 512; y += 64) { g.beginPath(); g.arc(x + 43, y, 7, 0, Math.PI * 2); g.fill(); }
    }
  });
/** A crayon sign (0.5 x 0.36 m): white paper, red crayon letters. `mirrored`: seen through the glass from inside. */
export const crayonSignTex = (mirrored: boolean) =>
  canvasTex(640, 460, (g) => {
    g.fillStyle = "#fbf7ee";
    g.fillRect(0, 0, 640, 460);
    if (mirrored) { g.translate(640, 0); g.scale(-1, 1); }
    g.strokeStyle = "#e0342e";
    g.fillStyle = "#e0342e";
    g.font = `900 92px "Comic Sans MS", "Nunito", sans-serif`;
    g.textAlign = "center";
    g.lineWidth = 3;
    ["AT THE END,", "GRAB MY", "HAND"].forEach((t, i) => { g.fillText(t, 320 + (i - 1) * 6, 120 + i * 130); g.strokeText(t, 320 + (i - 1) * 6, 120 + i * 130); });
    g.fillStyle = "#3a7ad8";
    g.beginPath();
    g.arc(560, 400, 26, 0, Math.PI * 2); // a crayon heart-ish blob
    g.fill();
  });
/** The sign Mia holds (origin at its centre, facing +z); `mirrored` swaps the face texture. */
export const crayonSign = () => {
  const front = new MeshBasicMaterial({ map: crayonSignTex(false) }), back = new MeshBasicMaterial({ map: crayonSignTex(true) });
  const m = new Mesh(new PlaneGeometry(0.5, 0.36), front);
  m.userData.faces = { front, back };
  return m;
};
/** Mia's crayon drawing of you (line 6): a stick figure with your messy fringe and rust hoodie, a sun, a heart. */
export const drawing = () =>
  new Mesh(new PlaneGeometry(0.36, 0.26), new MeshBasicMaterial({ side: 2, map: canvasTex(360, 260, (g) => {
    g.fillStyle = "#fbf7ee";
    g.fillRect(0, 0, 360, 260);
    g.lineCap = "round";
    g.lineWidth = 6;
    g.strokeStyle = "#2a2228";
    g.beginPath(); g.arc(150, 80, 34, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#7a4a2a";
    g.beginPath(); g.arc(150, 66, 30, Math.PI, 0); g.fill();
    g.fillStyle = "#d8582a";
    g.fillRect(126, 116, 48, 66);
    g.beginPath();
    for (const [a, b, c, d] of [[126, 130, 96, 170], [174, 130, 204, 170], [138, 182, 128, 236], [162, 182, 172, 236]]) { g.moveTo(a, b); g.lineTo(c, d); }
    g.stroke();
    g.fillStyle = "#2a2228";
    g.beginPath(); g.arc(138, 78, 4, 0, 7); g.arc(162, 78, 4, 0, 7); g.fill();
    g.fillStyle = "#f2c23a";
    g.beginPath(); g.arc(300, 50, 26, 0, 7); g.fill();
    g.fillStyle = "#e0342e";
    g.font = `900 40px "Comic Sans MS", sans-serif`;
    g.fillText("♥", 262, 200);
  }) }));
/** The pile of identical signs behind her on the rug (line 15): 9,000 loops of the same message. */
const signPile = () => {
  const g = new Group(), mat = new MeshBasicMaterial({ map: crayonSignTex(false) });
  for (let i = 0; i < 46; i++) {
    const m = new Mesh(new PlaneGeometry(0.5, 0.36), mat);
    m.rotation.set(-Math.PI / 2 + (rnd(i) - 0.5) * 0.5, 0, (rnd(i + 9) - 0.5) * 2);
    const h = Math.max(0, 0.75 - Math.hypot(rnd(i + 3) - 0.5, rnd(i + 5) - 0.5) * 1.6);
    m.position.set((rnd(i + 3) - 0.5) * 1.3, 0.02 + h * rnd(i + 7), (rnd(i + 5) - 0.5) * 0.9);
    g.add(m);
  }
  g.name = "signPile";
  return g;
};
/** The living room at night: wallpaper, a window with the moon, a mustard couch with your dent in the right cushion,
 * a rug with crayons, a floor lamp (warm practical), a picture frame; the pile of signs (hidden until line 15). */
export const room = () => {
  const k = new Kit();
  const floor = M("roomFloor", () => toonMaterial({ map: planks("#b0764a"), repeat: [3, 3] }));
  const paper = M("roomWall", () => toonMaterial({ map: wallpaper(), repeat: [4, 2] }));
  k.box(floor, 8, 0.1, 7, 0, -0.05, -0.5);
  k.box(paper, 8, 3.4, 0.2, 0, 1.7, -2.7);
  k.box(paper, 0.2, 3.4, 7, -3.6, 1.7, -0.5);
  k.box(paper, 0.2, 3.4, 7, 3.6, 1.7, -0.5);
  k.box(M("skirting", () => toonMaterial({ color: "#f2e6d4" })), 8, 0.14, 0.04, 0, 0.07, -2.58);
  // Couch: mustard, teal cushions.
  const body = M("couch", () => toonMaterial({ color: "#d8a03a" })), cush = M("cushion", () => toonMaterial({ color: "#3a8a8a" }));
  k.box(body, 2.3, 0.42, 0.95, 0, 0.21, COUCH_Z - 0.1);
  k.box(cush, 1.08, 0.12, 0.82, -0.56, 0.48, COUCH_Z - 0.06);
  k.box(cush, 1.08, 0.12, 0.82, 0.56, 0.48, COUCH_Z - 0.06);
  k.box(body, 2.3, 0.78, 0.26, 0, 0.75, COUCH_Z - 0.62);
  for (const x of [-1.27, 1.27]) k.box(body, 0.26, 0.64, 0.95, x, 0.32, COUCH_Z - 0.1);
  // Window with the night outside, a picture frame.
  k.box(M("winFrame", () => toonMaterial({ color: "#f2e6d4" })), 1.5, 1.3, 0.08, -1.9, 1.75, -2.58);
  k.box(M("floorLampPole", () => toonMaterial({ color: "#3a3034" })), 0.05, 1.6, 0.05, 1.75, 0.8, -2.15);
  k.add(M("lampShade", () => toonMaterial({ color: "#f6e2b0" })), new CylinderGeometry(0.18, 0.3, 0.32, 18, 1, true), 1.75, 1.7, -2.15);
  k.box(M("frame", () => toonMaterial({ color: "#5a3a2a" })), 0.9, 0.65, 0.05, 1.1, 1.95, -2.58);
  const g = k.build();
  g.userData.collider = "room";
  const night = new Mesh(new PlaneGeometry(1.32, 1.12), new MeshBasicMaterial({ map: canvasTex(256, 220, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, 220);
    gr.addColorStop(0, "#1d2a8c");
    gr.addColorStop(1, "#4a5ad0");
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 220);
    c.fillStyle = "#fff6d8";
    c.beginPath();
    c.arc(186, 60, 22, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#2a2a4a";
    for (let x = 0; x < 256; x += 34) c.fillRect(x, 150 + ((x * 7) % 40), 28, 80);
  }) }));
  night.position.set(-1.9, 1.75, -2.53);
  const art = new Mesh(new PlaneGeometry(0.78, 0.53), new MeshBasicMaterial({ map: canvasTex(256, 174, (c) => {
    c.fillStyle = "#cfe0f5";
    c.fillRect(0, 0, 256, 174);
    c.fillStyle = "#5aa86a";
    c.beginPath();
    c.ellipse(128, 174, 160, 60, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#ffd23f";
    c.beginPath();
    c.arc(200, 50, 22, 0, Math.PI * 2);
    c.fill();
  }) }));
  art.position.set(1.1, 1.95, -2.55);
  // Your dent in the right cushion (seen when you are gone).
  const dent = new Mesh(new CircleGeometry(0.3, 24), new MeshBasicMaterial({ color: "#245e5e", transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  dent.rotation.x = -Math.PI / 2;
  dent.scale.set(1, 0.7, 1);
  dent.position.set(0.5, 0.543, COUCH_Z - 0.04);
  // Rug and crayons.
  const rug = new Mesh(new CircleGeometry(1.5, 40), M("rug", () => toonMaterial({ map: canvasTex(256, 256, (c) => {
    c.fillStyle = "#c84a5a";
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = "#f2d6a0";
    c.lineWidth = 6;
    for (const r of [40, 80, 118]) { c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.stroke(); }
  }) })));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.3, 0.008, -0.2);
  const crayons = new Kit();
  ["#e0342e", "#3a7ad8", "#f2c23a", "#4aa84a", "#8a4ad8"].forEach((col, i) =>
    crayons.add(M(`crayon${i}`, () => toonMaterial({ color: col })), new CylinderGeometry(0.012, 0.012, 0.11, 8), -0.55 + i * 0.07, 0.022, 0.25 + (i % 2) * 0.05, { rz: Math.PI / 2, ry: i * 0.5 }));
  const lamp = glowSprite(new Vector3(1.75, 1.68, -2.15), "#ffc27a", 1.6, 0.6);
  const pile = signPile();
  pile.position.set(-1.12, 0.55, COUCH_Z - 0.05);
  pile.scale.setScalar(0.42);
  pile.visible = false;
  g.add(night, art, dent, rug, crayons.build(), lamp, pile);
  return g;
};

/** Mia, your little sister: the child build, a yellow dress with red dots, two pigtails with red bobbles. */
const pigtails = (p: Pen, h: Head) => {
  for (const s of [-1, 1]) {
    const x = h.cx + s * h.a * 1.02, y = h.cy - 0.1 * h.b;
    p.ell(x + s * 10 * h.u, y + 14 * h.u, 13 * h.u, 22 * h.u, "#6a3a24", 2.6 * h.u);
    p.ell(x, y - 2 * h.u, 6 * h.u, 6 * h.u, "#e0342e", 2.2 * h.u);
  }
};
export const miaLook: Look = {
  build: BUILDS.child, seed: 77, jacket: "#f2c23a", pants: "#f2c23a", shoes: "#e0342e",
  outfit: outfit({ bottom: ["#f2c23a", 0.92], collar: "#fbf7ee" }),
  hairBack: pigtails,
  hair: capHair("#6a3a24", 0.48, 0.4),
};

// ------------------------------------------------------------------ the narrator: a giant caption bar with eyes
/** The narrator's sign (origin = its centre). Children named "eyeL"/"eyeR" (with a "pupil" and a "lid" each) and
 * "glow" so the story can aim, narrow, droop and light it per frame. */
export const narratorSign = () => {
  const g = new Group();
  const slab = new Kit();
  slab.box(M("signSlab", () => toonMaterial({ color: "#1a1418" })), 4.6, 1.15, 0.32, 0, 0, 0, false);
  g.add(slab.build());
  const face = signFace("IN THIS WORLD", "#1a1418", "#ffffff", 4.3, 0.95);
  face.position.z = 0.17;
  g.add(face);
  const white = M("eyeWhite", () => toonMaterial({ color: "#fdfaf4" })), black = M("eyePupil", () => toonMaterial({ color: "#141014" }));
  for (const [name, x] of [["eyeL", -0.75], ["eyeR", 0.75]] as const) {
    const eye = new Group();
    eye.name = name;
    const ball = new Mesh(new SphereGeometry(0.42, 22, 16), white);
    ball.castShadow = true;
    const pupil = new Mesh(new SphereGeometry(0.19, 14, 10), black);
    pupil.name = "pupil";
    pupil.position.z = 0.32;
    const lid = new Mesh(new SphereGeometry(0.45, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), M("eyeLid", () => toonMaterial({ color: "#2a2228" })));
    lid.name = "lid";
    lid.rotation.x = -Math.PI / 2; // hinged at the eye's middle; rotate toward 0 to close
    eye.add(ball, pupil, lid);
    eye.position.set(x, 0.92, 0.05);
    g.add(eye);
  }
  const glow = glowSprite(new Vector3(), "#ffd27a", 6, 0.0);
  glow.name = "glow";
  g.add(glow);
  return g;
};
/** Aim the sign's pupils at a world point, open the lids (0 shut .. 1 open), droop the eyes (sulk, 0..1). */
export const poseSign = (g: Group, target: Vector3, open = 1, droop = 0) => {
  g.updateMatrixWorld(true);
  for (const name of ["eyeL", "eyeR"]) {
    const eye = g.getObjectByName(name)!, pupil = eye.getObjectByName("pupil")!, lid = eye.getObjectByName("lid")!;
    const local = eye.worldToLocal(target.clone()).normalize();
    pupil.position.copy(local.multiplyScalar(0.32));
    lid.rotation.x = -Math.PI / 2 + (1 - open) * 1.35 + droop * 0.5;
    eye.rotation.z = (name === "eyeL" ? 1 : -1) * droop * 0.35;
  }
};

// ------------------------------------------------------------------ props
/** Gary's ladder: 3.2 m long along local z, origin at its middle. */
export const ladder = () => {
  const k = new Kit(), wood = M("ladderWood", () => toonMaterial({ map: planks("#c89a5a"), repeat: [1, 1] }));
  for (const x of [-0.2, 0.2]) k.box(wood, 0.05, 0.06, 3.2, x, 0, 0, false);
  for (let z = -1.45; z <= 1.46; z += 0.32) k.box(wood, 0.4, 0.035, 0.035, 0, 0, z, false);
  return k.build();
};
/** A glowing caption word tile (white bold on black, like our captions), `w` m wide. */
export const wordTile = (text: string, w = 0.16) => {
  const m = new Mesh(new PlaneGeometry(w, w * 0.42), M(`tile${text}`, () => new MeshBasicMaterial({ map: canvasTex(256, 108, (g) => {
    g.fillStyle = "#141014";
    g.beginPath();
    g.roundRect(4, 4, 248, 100, 26);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `900 ${text.length > 4 ? 46 : 60}px "Nunito", "Arial Black", sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 58);
  }), transparent: true, side: 2 })));
  return m;
};
/** The jar of stolen words (origin at its base; ~0.26 m tall), one tile per word, stacked top-down (reads as a sentence) and named
 * `word:<TEXT>` so the story shows each word when it is in the jar (story.ts JAR_WORDS); the bottom slot (FREE) stays empty until the snatch. */
export const jar = (words: string[]) => {
  const g = new Group();
  const glass = new Mesh(new CylinderGeometry(0.1, 0.1, 0.24, 20), new MeshBasicMaterial({ color: new Color("#dff0ff"), transparent: true, opacity: 0.22, depthWrite: false }));
  glass.position.y = 0.12;
  glass.renderOrder = 3;
  const k = new Kit();
  k.add(M("cork", () => toonMaterial({ map: rough("#b8875a"), repeat: [1, 1] })), new CylinderGeometry(0.075, 0.07, 0.05, 14), 0, 0.265, 0);
  g.add(k.build(), glass);
  const slots = words.filter((w) => w !== "?").length; // "?" shares the last slot (it is the missing word)
  words.forEach((w, j) => {
    const i = w === "?" ? slots - 1 : j;
    const t = wordTile(w, 0.13);
    t.name = `word:${w}`;
    t.position.set((i % 2 ? 0.012 : -0.012), 0.035 + (slots - 1 - i) * 0.044, 0.02); // first word on top: reads down
    g.add(t);
  });
  return g;
};

// ------------------------------------------------------------------ cast
/** Gary the extra: tall and lanky (the opposite of you), blue overalls, a red cap, a walrus moustache, a soup mug. */
export const garyLook: Look = {
  build: BUILDS.tallThin, seed: 61, jacket: "#e8dcc4", pants: "#3a5a8a", shoes: "#3a2a20",
  outfit: layers(outfit({ bottom: ["#3a5a8a", 0.84], collar: "#e8dcc4", buttons: "#3a5a8a" }), overalls("#3a5a8a", "#2e4a74")),
  hair: headLayers(capHair("#5a4636", 0.32, 0.5), cap("#c8423a")),
  face: tache("walrus", "#4a3426"),
  brim: true,
};
/** Pigeon people (the next video): grey heads, an orange beak over the mouth, a green-violet sheen at the neck. */
const beak = (p: Pen, h: Head) => {
  const x = h.cx + 9 * h.u * (h.facing || 0.3), y = h.cy + 14 * h.u;
  p.poly([[x - 9 * h.u, y - 4 * h.u], [x + 9 * h.u, y - 4 * h.u], [x + 1 * h.u, y + 12 * h.u]], "#f2a23a", 2.6 * h.u);
};
export const pigeonLook = (seed: number): Look => ({
  build: seed % 2 ? BUILDS.shortRound : BUILDS.old, seed, jacket: "#8a93a6", pants: "#5a6274", shoes: "#c8604a", skin: "#a8b0c0",
  outfit: outfit({ bottom: ["#5a6274", 0.86], collar: "#5aa88a", buttons: "#6a4a9a" }),
  face: beak,
});
