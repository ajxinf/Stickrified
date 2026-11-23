import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, Shape, SphereGeometry, TorusGeometry } from "three";
import { M } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { toonMaterial } from "../../../kit/toon/shade";
import { MATS, V, boardTex, box, canvasTex, colMat, litTex, place, plane } from "./common";

/** antwerp-diamond-heist story props. Origins are the grip point (held props) or the base (lying props). */
const pinkCan = () => M("adh-can", () => toonMaterial({ map: canvasTex(256, 256, (c) => {
  c.fillStyle = "#f27ab0"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#ffffff"; c.fillRect(0, 96, 256, 70);
  c.fillStyle = "#c8246a"; c.font = "900 54px sans-serif"; c.textAlign = "center"; c.fillText("HOLD!", 128, 148);
  c.fillStyle = "#ffd8ea"; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(20 + i * 28, 40 + (i % 2) * 20, 6, 0, 7); c.fill(); }
}), color: "#ffffff", spec: 0.7, gloss: 0.5, rough: 0.25 }));
/** The pink hairspray can (lines 1, 29): nozzle toward +x. */
export const hairspray = () => {
  const g = new Group();
  g.add(place(new Mesh(new CylinderGeometry(0.032, 0.032, 0.2, 18), pinkCan()), 0, 0.06, 0));
  g.add(place(new Mesh(new CylinderGeometry(0.03, 0.032, 0.03, 18), colMat("#f2f2f6", { spec: 0.8 })), 0, 0.175, 0));
  g.add(place(new Mesh(new BoxGeometry(0.03, 0.02, 0.02), colMat("#f2f2f6")), 0.012, 0.2, 0));
  return g;
};
/** The Genius's foam board (line 15): 1.3 x 1.7 white sheet held in front of him, origin at his hands. */
export const foamBoard = () => {
  const g = new Group();
  g.add(box(1.0, 1.3, 0.04, M("adh-foam", () => toonMaterial({ color: "#f4f4f0", rough: 0.95, mottle: 0.05 })), V(0, -0.58, 0.06)));
  return g;
};
/** A strip of tan tape on its roll (line 16). */
export const tapeRoll = () => {
  const g = new Group();
  g.add(new Mesh(new TorusGeometry(0.04, 0.016, 8, 20), colMat("#c8b890", { rough: 0.8 })));
  g.add(box(0.05, 0.12, 0.004, colMat("#d8c8a0", { rough: 0.8 }), V(0.04, -0.06, 0)));
  return g;
};
/** The aluminium plate (line 17), held by an edge. */
export const aluPlate = () => {
  const g = new Group();
  g.add(box(0.5, 0.2, 0.012, M("adh-alu", () => toonMaterial({ color: "#d8dce4", spec: 0.9, gloss: 0.6, rough: 0.2 })), V(0.22, 0, 0)));
  return g;
};
/** A long two-part key with a VAULT tag (line 8). */
export const vaultKey = () => {
  const g = new Group();
  const brass = colMat("#d8b04a", { spec: 0.9, gloss: 0.4, rough: 0.25 });
  g.add(place(new Mesh(new TorusGeometry(0.025, 0.008, 8, 18), brass), 0, 0, 0));
  g.add(box(0.16, 0.012, 0.012, brass, V(0.1, 0, 0)));
  for (const x of [0.15, 0.17]) g.add(box(0.012, 0.03, 0.01, brass, V(x, -0.015, 0)));
  g.add(plane(0.09, 0.05, litTex("keytag", () => boardTex(["KLUIS"], "#c8342c", "#ffffff", 256, 140), { rough: 0.8 }), V(-0.04, -0.045, 0.004), 0, 0, 0.3));
  return g;
};
/** A black trash bag held at its knot (lines 20-22). */
export const heldBag = () => {
  const g = new Group();
  const b = model("trashbag", { collider: false, scale: 1.2 });
  b.position.set(0, -0.62, 0);
  g.add(b);
  return g;
};
/** The half-eaten salami sandwich (lines 2, 26, 27): bread, salami rounds, a bite out of one corner. */
const sandwichShape = () => {
  const s = new Shape();
  s.moveTo(-0.09, -0.06); s.lineTo(0.09, -0.06); s.lineTo(0.09, 0.02);
  s.absarc(0.075, 0.06, 0.035, -Math.PI / 2, Math.PI, true); // the bite
  s.lineTo(-0.09, 0.06); s.lineTo(-0.09, -0.06);
  return s;
};
export const sandwich = (bagged = false) => {
  const g = new Group();
  const bread = M("adh-bread", () => toonMaterial({ color: "#e8c890", rough: 0.9, mottle: 0.2 }));
  const geo = new ExtrudeGeometry(sandwichShape(), { depth: 0.022, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }).rotateX(-Math.PI / 2);
  for (const y of [0.006, 0.044]) { const m = new Mesh(geo, bread); m.position.y = y; g.add(m); }
  // crust edges as a thin box ring on the uncut sides, the salami poking out
    const salami = colMat("#c8343a", { rough: 0.6, spec: 0.3 });
  for (const [x, z] of [[-0.06, -0.035], [0.0, -0.045], [0.06, -0.04], [-0.07, 0.03], [0.02, 0.02]]) g.add(place(new Mesh(new CylinderGeometry(0.034, 0.034, 0.01, 18), salami), x, 0.038, z));
  g.add(place(new Mesh(new SphereGeometry(0.012, 8, 6), colMat("#7ab84a")), -0.02, 0.022, 0.05)); // a lettuce corner
  if (bagged) {
    g.add(box(0.26, 0.07, 0.2, M("adh-bag", () => toonMaterial({ color: "#b8c4d0", spec: 0.5, gloss: 0.4, rough: 0.2 })), V(0, 0.03, 0)));
    g.add(plane(0.12, 0.05, litTex("evidence", () => boardTex(["EVIDENCE", "DNA"], "#f2c23a", "#1c1c22", 300, 140), { rough: 0.8 }), V(0.05, 0.068, -0.02), 0, -Math.PI / 2));
  }
  return g;
};
/** Evidence the police pull from the leaves (line 25): an envelope, a videotape, a receipt. */
export const envelope = () => {
  const g = new Group();
  g.add(plane(0.22, 0.12, litTex("envelope", () => canvasTex(440, 240, (c) => {
    c.fillStyle = "#eadcb8"; c.fillRect(0, 0, 440, 240); c.strokeStyle = "#a88a5a"; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 0); c.lineTo(220, 130); c.lineTo(440, 0); c.stroke();
    c.fillStyle = "#1c1c4a"; c.font = "900 34px sans-serif"; c.fillText("DIAMOND CENTRE", 24, 210);
  }), { rough: 0.9 }), V(0.05, 0, 0.01)));
  return g;
};
export const videotape = () => {
  const g = new Group();
  g.add(box(0.19, 0.1, 0.025, colMat("#1c1c22", { spec: 0.5, rough: 0.3 }), V(0.08, 0, 0)));
  g.add(plane(0.12, 0.04, litTex("vhs", () => boardTex(["CAM 2"], "#f2ece2", "#1c1c22", 300, 100), { rough: 0.8 }), V(0.08, 0.02, 0.014)));
  return g;
};
export const receipt = () => {
  const g = new Group();
  g.add(plane(0.09, 0.2, litTex("receipt", () => canvasTex(180, 400, (c) => {
    c.fillStyle = "#fbfaf4"; c.fillRect(0, 0, 180, 400); c.fillStyle = "#3a3a44"; c.font = "700 16px monospace";
    ["HARDWARE", "", "TAPE      2x", "FOAM BRD  1x", "ALU PLATE 1x", "", "TOTAL  42.10"].forEach((t, i) => c.fillText(t, 12, 40 + i * 24));
    c.fillStyle = "#1c1c22"; c.font = "900 22px sans-serif"; c.fillText("NAME:", 12, 250); c.lineWidth = 3; c.strokeStyle = "#1c1c22"; c.beginPath(); for (let x = 0; x < 70; x += 5) c.lineTo(88 + x, 244 + Math.sin(x * 0.5) * 6); c.stroke(); // a scribbled name
    c.strokeStyle = "#e0243a"; c.lineWidth = 6; c.beginPath(); c.ellipse(80, 244, 78, 26, -0.08, 0, 7); c.stroke();
  }), { rough: 0.9 }), V(0, 0.08, 0)));
  return g;
};
/** The guard's newspaper (lines 9, 28), held open with both hands, origin between them. */
export const newspaper = (headline: string) => {
  const g = new Group();
  g.add(plane(0.56, 0.4, litTex(`paper-${headline}`, () => canvasTex(560, 400, (c) => {
    c.fillStyle = "#efeadf"; c.fillRect(0, 0, 560, 400); c.fillStyle = "#1c1c22"; c.font = "900 46px serif"; c.textAlign = "center"; c.fillText("THE DAILY", 280, 52);
    c.fillRect(20, 66, 520, 4);
    c.font = `900 ${headline.length > 14 ? 50 : 58}px sans-serif`; c.fillText(headline, 280, 130);
    c.fillStyle = "#8a8a94"; c.fillRect(30, 160, 230, 180); for (let y = 170; y < 360; y += 16) c.fillRect(290, y, 240, 6);
    c.fillStyle = "#c8ccd4"; c.beginPath(); c.arc(145, 250, 60, 0, 7); c.fill(); // a vault door photo
  }), { rough: 0.9 }), V(0, 0.12, 0.03)));
  return g;
};
/** A walking stick (the old man), origin at the grip. */
export const stick = () => {
  const g = new Group();
  g.add(place(new Mesh(new CylinderGeometry(0.014, 0.014, 0.88, 8), MATS.darkWood()), 0, -0.44, 0));
  g.add(place(new Mesh(new TorusGeometry(0.04, 0.014, 8, 12, Math.PI), MATS.darkWood()), -0.04, 0, 0));
  return g;
};
/** Handcuffs (line 28) on your wrists. */
export const cuffs = () => {
  const g = new Group();
  const steel = colMat("#c8ccd4", { spec: 0.9, rough: 0.2 });
  g.add(place(new Mesh(new TorusGeometry(0.04, 0.009, 8, 18), steel), -0.05, 0, 0), place(new Mesh(new TorusGeometry(0.04, 0.009, 8, 18), steel), 0.05, 0, 0));
  g.add(box(0.04, 0.008, 0.008, steel, V(0, 0, 0)));
  return g;
};
/** A jeweller's loupe (line 7) at the eye: a short black barrel, origin at its rim. */
export const loupe = () => {
  const g = new Group();
  g.add(place(new Mesh(new CylinderGeometry(0.03, 0.035, 0.04, 16).rotateX(Math.PI / 2), colMat("#1c1c22", { spec: 0.6 })), 0, 0, 0.02));
  g.add(place(new Mesh(new CylinderGeometry(0.026, 0.026, 0.004, 16).rotateX(Math.PI / 2), M("adh-lens", () => new MeshBasicMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.45 }))), 0, 0, 0.041));
  return g;
};
/** A lock pick (the Monster, line 10): tiny in his giant fingers. */
export const lockPick = () => {
  const g = new Group();
  g.add(box(0.11, 0.006, 0.006, colMat("#d8dce4", { spec: 0.9 }), V(0.06, 0, 0)));
  g.add(box(0.03, 0.012, 0.01, colMat("#3a3a44"), V(0, 0, 0)));
  return g;
};
