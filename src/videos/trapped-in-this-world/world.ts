import { BoxGeometry, CanvasTexture, Color, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, SRGBColorSpace, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { PRESETS } from "../../../kit/toon/build/presets";
import { signFace } from "../../../kit/toon/build/signs";
import { spine } from "../../../kit/toon/build/street";
import type { StreetOpts } from "../../../kit/toon/build/street";
import { BUILDS, capHair, outfit } from "../../../kit/toon/extras";
import type { Look } from "../../../kit/toon/figure";
import type { Head } from "../../../kit/toon/face";
import { glowSprite } from "../../../kit/toon/glow";
import { bricks, planks, plaster, rough } from "../../../kit/toon/paint";
import { toonMaterial } from "../../../kit/toon/shade";
import { INK, Pen } from "../../../kit/toon/toon";
import { cap, headLayers, layers, overalls, tache } from "../../../kit/toon/wardrobe";

/**
 * trapped-in-this-world: the places and the story props. Everything is our own; the meta layer (frame edge, progress
 * bar, caption words) is 2D and lives in Video.tsx.
 *   street   the looping "In this world" video: a cobbled high street at sunset (victorian_town, sunset light), with a
 *            reserved lot on the right (s 14-22) for YOUR wall: 9,000 chalk tallies, a painted door, the chalk plan
 *   bedroom  a small room at night far from the street (x 200), the jar of stolen words under the bed
 *   pink     the next video: a pink-dawn suburb full of pigeon people
 */
export const at = spine(0).at;
/** A point in the bedroom set (its own little world at x 200). */
export const BR = (x: number, y: number, z: number) => new Vector3(200 + x, y, z);

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
/** Two shallow grooves worn into the cobbles along Gary's line (s 0-40). */
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
  return g;
};
export const STREET: StreetOpts = {
  seed: 909, length: 52, curve: 0, gloss: 0.3, lightCenter: at(14, 3, 2),
  reserve: [{ side: 1, s0: 13.6, s1: 22.4 }],
  extra: () => [yourWall(), grooves()],
};
export const STREET_PRESET = { ...PRESETS.victorian_town, debris: [] };
export const PINK_PRESET = { ...PRESETS.modern_suburb, debris: [] };

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
const WORD_LIST = ["IN", "THIS", "WORLD", "YOU'RE", "FREE", "SOUP", "THE", "DOOR", "LOOP", "KID", "GRAB", "END"];
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
/** The jar of stolen words (origin at its base; ~0.26 m tall), glowing warm. */
export const jar = (n = 9) => {
  const g = new Group();
  const glass = new Mesh(new CylinderGeometry(0.1, 0.1, 0.24, 20), new MeshBasicMaterial({ color: new Color("#dff0ff"), transparent: true, opacity: 0.22, depthWrite: false }));
  glass.position.y = 0.12;
  glass.renderOrder = 3;
  const k = new Kit();
  k.add(M("cork", () => toonMaterial({ map: rough("#b8875a"), repeat: [1, 1] })), new CylinderGeometry(0.075, 0.07, 0.05, 14), 0, 0.265, 0);
  g.add(k.build(), glass);
  for (let i = 0; i < n; i++) {
    const t = wordTile(WORD_LIST[i % WORD_LIST.length], 0.1);
    t.position.set((rnd(i) - 0.5) * 0.1, 0.03 + i * 0.022, (rnd(i + 5) - 0.5) * 0.08);
    t.rotation.set((rnd(i + 9) - 0.5) * 1.2, (rnd(i + 3) - 0.5) * 2, (rnd(i + 7) - 0.5) * 1.4);
    g.add(t);
  }
  const label = signFace("FREE: 1", "#f4ead2", "#8a1e1a", 0.13, 0.05);
  label.position.set(0, 0.11, 0.101);
  g.add(label);
  return g;
};

// ------------------------------------------------------------------ the bedroom (night, x 200)
export const BED_JAR = BR(0.2, 0.0, -1.0);
export const WINDOW = { x: 1.6, y0: 0.95, y1: 2.15, z0: -2.0, z1: -0.9 }; // in the right wall (x = 2), seen from inside
export const bedroom = () => {
  const k = new Kit();
  const wall = M("brWall", () => toonMaterial({ map: plaster("#8aa4c4"), repeat: [1, 1] }));
  const floor = M("brFloor", () => toonMaterial({ map: planks("#9a6a46"), repeat: [1, 1] }));
  k.add(floor, new BoxGeometry(4.4, 0.1, 4.4), 200, -0.05, -1.5, { tile: true });
  k.add(wall, new BoxGeometry(4.4, 2.9, 0.15), 200, 1.45, -3.7, { tile: true }); // back
  k.add(wall, new BoxGeometry(0.15, 2.9, 4.4), 197.8, 1.45, -1.5, { tile: true }); // left
  // Right wall with a window hole (x = 202.2).
  const RX = 202.2;
  k.add(wall, new BoxGeometry(0.15, 0.95, 4.4), RX, 0.475, -1.5, { tile: true });
  k.add(wall, new BoxGeometry(0.15, 0.75, 4.4), RX, 2.525, -1.5, { tile: true });
  k.add(wall, new BoxGeometry(0.15, 1.2, 1.7), RX, 1.55, -2.85, { tile: true });
  k.add(wall, new BoxGeometry(0.15, 1.2, 1.6), RX, 1.55, -0.1, { tile: true }); // window opening z -2.0..-0.9
  const trim = M("brTrim", () => toonMaterial({ map: rough("#efe6d4"), repeat: [1, 1] }));
  k.add(trim, new BoxGeometry(0.22, 0.06, 1.25), RX - 0.03, 0.93, -1.45);
  // Bed: frame, mattress, blanket, pillow (under it, the jar).
  const bedWood = M("bedWood", () => toonMaterial({ map: planks("#6a4630"), repeat: [1, 1] }));
  k.add(bedWood, new BoxGeometry(1.1, 0.3, 2.1), 200.3, 0.42, -1.6);
  for (const [x, z] of [[-0.5, -0.95], [0.5, -0.95], [-0.5, 0.95], [0.5, 0.95]]) k.add(bedWood, new BoxGeometry(0.08, 0.3, 0.08), 200.3 + x, 0.15, -1.6 + z);
  k.add(M("blanket", () => toonMaterial({ map: rough("#c8582c"), repeat: [1, 1] })), new BoxGeometry(1.14, 0.16, 1.5), 200.3, 0.64, -1.3);
  k.add(M("sheet", () => toonMaterial({ map: rough("#f2ece2"), repeat: [1, 1] })), new BoxGeometry(1.06, 0.14, 2.0), 200.3, 0.6, -1.6);
  k.add(M("pillow", () => toonMaterial({ map: rough("#f4f0e6"), repeat: [1, 1] })), new BoxGeometry(0.7, 0.14, 0.4), 200.3, 0.73, -2.4);
  // Window: a night street outside (a lit window across, a lamp), behind the hole.
  const g = k.build();
  const outside = new Mesh(new PlaneGeometry(4, 3), new MeshBasicMaterial({ map: canvasTex(512, 384, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 384);
    sky.addColorStop(0, "#0d1838");
    sky.addColorStop(1, "#33467a");
    c.fillStyle = sky;
    c.fillRect(0, 0, 512, 384);
    c.fillStyle = "#1a2244";
    c.fillRect(0, 150, 512, 234);
    c.fillStyle = "#ffb35a";
    for (const [x, y] of [[70, 200], [150, 200], [330, 230], [410, 230]]) c.fillRect(x, y, 34, 44);
    c.fillStyle = "#f4f0e6";
    c.beginPath();
    c.arc(420, 70, 26, 0, Math.PI * 2);
    c.fill();
  }) }));
  outside.position.set(204.5, 1.6, -1.45);
  outside.rotation.y = -Math.PI / 2;
  g.add(outside);
  g.add(placed(jar(10), BED_JAR.clone().setY(0.0)));
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
