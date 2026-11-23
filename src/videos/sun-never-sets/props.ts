import { AdditiveBlending, BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { sunDisc } from "../../../kit/toon/glow";
import { SKY } from "../../../kit/toon/ink";
import { toonMaterial } from "../../../kit/toon/shade";
import { FONT, MATS, V, canvasTex, colMat, glowMat, litTex, plane, rnd, unlit } from "./common";

/** sun-never-sets: story props. Each origin is its grip point (held) or its base centre (resting). */
// ------------------------------------------------------------------ the toaster (a running bit with a face)
export type ToastFace = "neutral" | "talk" | "roll" | "smile" | "sleep";
const faceTex = (k: ToastFace) => canvasTex(256, 160, (c) => {
  c.clearRect(0, 0, 256, 160);
  c.strokeStyle = "#141014"; c.fillStyle = "#141014"; c.lineWidth = 7; c.lineCap = "round";
  const eye = (x: number) => {
    if (k === "sleep") { c.beginPath(); c.arc(x, 62, 14, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); return; }
    if (k === "smile") { c.beginPath(); c.arc(x, 70, 15, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); return; }
    c.fillStyle = "#fbfbf6"; c.beginPath(); c.ellipse(x, 62, 18, 22, 0, 0, 7); c.fill(); c.stroke();
    c.fillStyle = "#141014"; c.beginPath(); c.arc(x + (k === "roll" ? 0 : 2), k === "roll" ? 46 : 66, 8, 0, 7); c.fill();
    if (k === "roll") { c.beginPath(); c.moveTo(x - 20, 50); c.lineTo(x + 20, 50); c.stroke(); }
  };
  eye(88); eye(168);
  c.beginPath();
  if (k === "talk") { c.fillStyle = "#3a1418"; c.ellipse(128, 118, 22, 16, 0, 0, 7); c.fill(); c.stroke(); }
  else if (k === "smile" || k === "sleep") { c.arc(128, 104, 24, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  else { c.moveTo(108, 118); c.lineTo(148, 118); c.stroke(); }
});
const FACE_MATS = new Map<ToastFace, MeshBasicMaterial>();
export const toastFaceMat = (k: ToastFace) => {
  let m = FACE_MATS.get(k);
  if (!m) { m = new MeshBasicMaterial({ map: faceTex(k), transparent: true, depthWrite: false, toneMapped: false }); FACE_MATS.set(k, m); }
  return m;
};
/** 0.3 w x 0.2 h x 0.17 d, base centre at the origin, face toward +z. Children: "face" (material swapped), "toast". */
export const toaster = () => {
  const g = new Group(), k = new Kit();
  const chrome = M("snc-chrome", () => toonMaterial({ map: undefined, color: "#d8dde4", spec: 0.95, gloss: 0.85, rough: 0.12 }));
  k.box(chrome, 0.3, 0.19, 0.17, 0, 0.105, 0);
  k.add(chrome, new CylinderGeometry(0.085, 0.085, 0.3, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), 0, 0.2, 0);
  for (const x of [-0.065, 0.065]) k.box(MAT.color("#1c1c20"), 0.04, 0.02, 0.13, x, 0.285, 0);
  k.box(MAT.color("#2a2a30"), 0.32, 0.015, 0.19, 0, 0.008, 0);
  k.box(MAT.color("#c8342c"), 0.02, 0.05, 0.04, 0.16, 0.14, 0.03); // lever
  const b = k.build();
  g.add(b);
  const face = new Mesh(new PlaneGeometry(0.22, 0.14), toastFaceMat("neutral"));
  face.position.set(0, 0.12, 0.087);
  face.name = "face";
  g.add(face);
  const toast = new Group(), tk = new Kit(), crust = colMat("#b8743a"), bread = colMat("#f2d49a");
  for (const x of [-0.065, 0.065]) { tk.box(crust, 0.034, 0.12, 0.115, x, 0.0, 0); tk.box(bread, 0.036, 0.1, 0.095, x, 0.005, 0); }
  toast.add(tk.build());
  toast.position.y = 0.22;
  toast.name = "toast";
  g.add(toast);
  g.userData.collider = "toaster";
  return g;
};

// ------------------------------------------------------------------ the cereal box (your pinhole viewer)
const cerealTex = (side: boolean) => canvasTex(256, 384, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#ff8a2a"); gr.addColorStop(1, "#e84a3a"); c.fillStyle = gr; c.fillRect(0, 0, 256, 384);
  if (side) { c.fillStyle = "#fbf6e8"; c.fillRect(20, 40, 216, 300); c.fillStyle = "#1c1414"; c.font = `800 26px ${FONT}`; c.textAlign = "center"; for (let i = 0; i < 7; i++) c.fillRect(40, 80 + i * 34, 176 - (i % 3) * 30, 10); return; }
  c.fillStyle = "#ffd23f"; c.beginPath(); c.arc(128, 150, 70, 0, 7); c.fill();
  c.strokeStyle = "#1c1414"; c.lineWidth = 5; c.stroke();
  c.fillStyle = "#1c1414"; c.beginPath(); c.arc(106, 140, 8, 0, 7); c.arc(150, 140, 8, 0, 7); c.fill();
  c.beginPath(); c.arc(128, 160, 26, 0.2, 2.9); c.stroke();
  c.fillStyle = "#fbf6e8"; c.font = `900 50px ${FONT}`; c.textAlign = "center"; c.fillText("SUNNY", 128, 270); c.fillText("O's", 128, 322);
});
/** Origin at the bottom centre; 0.19 w x 0.28 h x 0.07 d, the front toward +z. `hole` adds the pencil hole. */
export const cerealBox = (hole = true) => {
  const g = new Group(), k = new Kit();
  k.box(colMat("#e86a3a"), 0.19, 0.28, 0.07, 0, 0.14, 0);
  g.add(k.build());
  g.add(plane(0.19, 0.28, litTex("cereal", () => cerealTex(false)), V(0, 0.14, 0.036)));
  g.add(plane(0.07, 0.28, litTex("cerealSide", () => cerealTex(true)), V(0.096, 0.14, 0), Math.PI / 2));
  if (hole) { const h = new Mesh(new CylinderGeometry(0.008, 0.008, 0.005, 10).rotateX(Math.PI / 2), MAT.color("#0c0808")); h.position.set(0.03, 0.24, 0.037); g.add(h); }
  return g;
};
export const pencil = () => {
  const g = new Group(), k = new Kit();
  k.add(colMat("#f2c23a"), new CylinderGeometry(0.006, 0.006, 0.16, 6).rotateX(Math.PI / 2), 0, 0, 0.04);
  k.add(colMat("#e8c8a0"), new CylinderGeometry(0.0005, 0.006, 0.025, 6).rotateX(-Math.PI / 2), 0, 0, -0.05);
  k.add(colMat("#e88aa8"), new CylinderGeometry(0.006, 0.006, 0.015, 6).rotateX(Math.PI / 2), 0, 0, 0.125);
  g.add(k.build());
  return g;
};
export const marker = () => {
  const g = new Group(), k = new Kit();
  k.add(colMat("#1c1c22"), new CylinderGeometry(0.011, 0.011, 0.13, 8), 0, 0.03, 0);
  k.add(colMat("#f6f0e6"), new CylinderGeometry(0.0115, 0.0115, 0.03, 8), 0, 0.06, 0);
  k.add(colMat("#0a0a0c"), new CylinderGeometry(0.003, 0.008, 0.02, 8), 0, 0.105, 0);
  g.add(k.build());
  return g;
};

// ------------------------------------------------------------------ phones (lock screen / alarm), wallet, keys, cash
const PHONE_MATS = new Map<string, MeshBasicMaterial>();
export const phoneScreen = (time: string, sub: string, alarm = false) => {
  const key = `${time}|${sub}|${alarm}`;
  let m = PHONE_MATS.get(key);
  if (!m) {
    m = new MeshBasicMaterial({ toneMapped: false, map: canvasTex(256, 512, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, alarm ? "#c8342c" : "#1a2a5a"); gr.addColorStop(1, alarm ? "#f28a3a" : "#4a3a7a"); c.fillStyle = gr; c.fillRect(0, 0, 256, 512);
      c.fillStyle = "#ffffff"; c.textAlign = "center"; c.font = `800 ${alarm ? 46 : 34}px ${FONT}`; c.fillText(alarm ? "ALARM" : sub, 128, alarm ? 130 : 120);
      c.font = `900 ${time.length > 5 ? 64 : 74}px ${FONT}`; c.fillText(time, 128, 250);
      if (alarm) { c.font = `800 30px ${FONT}`; c.fillText(sub, 128, 310); c.fillStyle = "#fbf6e8"; c.beginPath(); c.roundRect(48, 380, 160, 60, 30); c.fill(); c.fillStyle = "#c8342c"; c.font = `900 32px ${FONT}`; c.fillText("STOP", 128, 422); }
    }) });
    PHONE_MATS.set(key, m);
  }
  return m;
};
/** Origin = grip (bottom third), screen toward +z. */
export const phone = (time: string, sub: string, alarm = false) => {
  const g = new Group();
  const body = new Mesh(new BoxGeometry(0.075, 0.15, 0.012), MAT.color("#2a2a34"));
  body.position.y = 0.05;
  const scr = new Mesh(new PlaneGeometry(0.066, 0.135), phoneScreen(time, sub, alarm));
  scr.position.set(0, 0.05, 0.0065);
  scr.name = "screen";
  g.add(body, scr);
  return g;
};
export const wallet = () => {
  const g = new Group(), k = new Kit(), L = colMat("#6a3a22", { rough: 0.6 });
  k.box(L, 0.1, 0.085, 0.006, -0.05, 0.03, 0, );
  k.box(L, 0.1, 0.085, 0.006, 0.05, 0.03, 0.008);
  k.box(colMat("#4a2a18"), 0.09, 0.05, 0.004, 0.05, 0.035, 0.012);
  g.add(k.build());
  g.rotation.x = -0.4;
  const o = new Group(); o.add(g); return o;
};
export const keys = () => {
  const g = new Group(), k = new Kit(), gold = colMat("#e2c25a", { spec: 0.8, gloss: 0.6, rough: 0.2 });
  k.add(gold, new TorusGeometry(0.022, 0.004, 6, 16), 0, 0, 0);
  k.box(gold, 0.012, 0.07, 0.004, 0.008, -0.05, 0);
  k.box(colMat("#c8ccd2", { spec: 0.8 }), 0.012, 0.06, 0.004, -0.012, -0.045, 0.004);
  k.box(colMat("#2a2a30"), 0.03, 0.04, 0.012, -0.02, -0.03, 0.008);
  g.add(k.build());
  return g;
};
const billTex = () => canvasTex(256, 128, (c) => { c.fillStyle = "#8ac87a"; c.fillRect(0, 0, 256, 128); c.strokeStyle = "#2a5a2a"; c.lineWidth = 6; c.strokeRect(8, 8, 240, 112); c.fillStyle = "#2a5a2a"; c.beginPath(); c.ellipse(128, 64, 30, 38, 0, 0, 7); c.fill(); c.font = `900 44px ${FONT}`; c.fillText("100", 30, 56); c.fillText("100", 162, 108); });
/** A fan of bills, grip at the bottom corner. */
export const cashFan = () => {
  const g = new Group(), mat = M("snc-bill", () => new MeshBasicMaterial({ map: billTex(), side: DoubleSide, toneMapped: false }));
  for (let i = 0; i < 6; i++) { const m = new Mesh(new PlaneGeometry(0.15, 0.075), mat); m.geometry.translate(0.07, 0.03, 0); m.rotation.z = 0.2 + i * 0.16; m.position.z = i * 0.002; g.add(m); }
  return g;
};
export const roller = () => {
  const g = new Group(), k = new Kit();
  k.add(colMat("#2a2a30"), new CylinderGeometry(0.012, 0.012, 0.32, 6), 0, 0.12, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.006, 0.006, 0.14, 6), 0.06, 0.3, 0, { rz: Math.PI / 2 });
  k.add(colMat("#0c0a10", { rough: 0.3, gloss: 0.4 }), new CylinderGeometry(0.035, 0.035, 0.2, 12).rotateZ(Math.PI / 2), 0.16, 0.3, 0);
  g.add(k.build());
  return g;
};
export const pillow = (col: string) => {
  const g = new Group(), k = new Kit();
  k.add(MATS.cloth(col), new SphereGeometry(0.22, 12, 8).scale(1, 0.6, 0.35), 0, 0.02, 0);
  g.add(k.build());
  return g;
};

// ------------------------------------------------------------------ the mattress and Dad's ride-on mower
const tickingTex = () => canvasTex(256, 256, (c) => {
  c.fillStyle = "#f4f0e6"; c.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) { c.fillStyle = "#7a9ac8"; c.fillRect(x, 0, 10, 256); c.fillStyle = "#c8d4e8"; c.fillRect(x + 14, 0, 4, 256); }
  for (let i = 0; i < 6; i++) { c.fillStyle = "rgba(150,130,90,0.18)"; c.beginPath(); c.arc(rnd(i) * 256, rnd(i + 9) * 256, 18 + rnd(i + 4) * 20, 0, 7); c.fill(); }
});
export const MAT_SIZE = { l: 1.9, w: 0.95, h: 0.34 };
/** Long side along x, base centre at the origin. */
export const mattress = () => {
  const g = new Group(), k = new Kit(), { l, w, h } = MAT_SIZE;
  const T = M("snc-ticking", () => toonMaterial({ map: tickingTex(), color: "#ffffff", repeat: [1.2, 1.2], rough: 0.9 }));
  k.box(T, l, h, w, 0, h / 2, 0, true);
  k.box(colMat("#e0dacb"), l + 0.02, 0.03, w + 0.02, 0, h - 0.01, 0);
  k.box(colMat("#e0dacb"), l + 0.02, 0.03, w + 0.02, 0, 0.02, 0);
  k.add(MATS.cloth("#f2f0ea"), new SphereGeometry(0.3, 12, 8).scale(1, 0.32, 0.7), -l / 2 + 0.35, h + 0.05, 0);
  g.add(k.build());
  g.userData.collider = "mattress";
  return g;
};
export const MOWER_SEAT = 0.42;
/** Ride-on mower: green deck, a seat (Dad sits on it), steering wheel, four wheels; drives toward +x. */
export const mower = () => {
  const g = new Group(), k = new Kit(), G = colMat("#3a8a4a", { spec: 0.5, gloss: 0.4, rough: 0.35 }), D = colMat("#1c1c20");
  k.box(G, 1.2, 0.3, 0.75, 0, 0.3, 0);
  k.box(colMat("#f2c23a"), 0.45, 0.2, 0.62, 0.42, 0.52, 0); // hood
  k.box(D, 1.3, 0.04, 0.6, 0, 0.04, 0); // footboard
  k.box(D, 0.34, 0.08, 0.42, -0.25, MOWER_SEAT - 0.04, 0);
  k.box(D, 0.08, 0.38, 0.42, -0.43, MOWER_SEAT + 0.15, 0);
  k.add(D, new CylinderGeometry(0.015, 0.015, 0.45, 6).rotateZ(0.55), 0.2, 0.62, 0);
  k.add(D, new TorusGeometry(0.11, 0.015, 6, 16).rotateX(Math.PI / 2).rotateZ(0.5), 0.08, 0.82, 0);
  for (const [x, r] of [[0.42, 0.13], [-0.4, 0.19]] as const) for (const z of [-0.38, 0.38]) k.add(D, new CylinderGeometry(r, r, 0.12, 14).rotateX(Math.PI / 2), x, r, z);
  g.add(k.build());
  g.userData.collider = "mower";
  return g;
};

// ------------------------------------------------------------------ the porch thermometer
const dialTex = () => canvasTex(512, 512, (c) => {
  c.fillStyle = "#fbf8ee"; c.beginPath(); c.arc(256, 256, 250, 0, 7); c.fill();
  c.strokeStyle = "#1c1414"; c.lineWidth = 14; c.stroke();
  // 0..130 F over 270 deg; red zone from 100
  for (let t = 0; t <= 130; t += 10) {
    const a = ((-225 + (t / 130) * 270) * Math.PI) / 180;
    c.strokeStyle = t >= 100 ? "#c8342c" : "#1c1414"; c.lineWidth = 8;
    c.beginPath(); c.moveTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); c.lineTo(256 + Math.cos(a) * 236, 256 + Math.sin(a) * 236); c.stroke();
    if (t % 20 === 0) { c.fillStyle = t >= 100 ? "#c8342c" : "#1c1414"; c.font = `900 40px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(t), 256 + Math.cos(a) * 160, 256 + Math.sin(a) * 160); }
  }
  c.strokeStyle = "#c8342c"; c.lineWidth = 22; c.beginPath(); c.arc(256, 256, 218, ((-225 + (100 / 130) * 270) * Math.PI) / 180, (45 * Math.PI) / 180); c.stroke();
  c.fillStyle = "#1c1414"; c.font = `900 46px ${FONT}`; c.textAlign = "center"; c.fillText("°F", 256, 380);
});
/** Dial facing +z, centre at the origin; child "needle" turns with setThermo. */
export const thermometer = () => {
  const g = new Group();
  const face = new Mesh(new PlaneGeometry(0.26, 0.26), M("snc-dial", () => toonMaterial({ map: dialTex(), color: "#ffffff", rough: 0.5 })));
  g.add(face);
  const rim = new Mesh(new TorusGeometry(0.13, 0.012, 8, 32), MAT.metal());
  g.add(rim);
  const needle = new Group();
  const nm = new Mesh(new BoxGeometry(0.008, 0.1, 0.004), colMat("#c8342c"));
  nm.position.y = 0.045;
  needle.add(nm);
  needle.add(new Mesh(new SphereGeometry(0.012, 8, 6), colMat("#1c1414")));
  needle.position.z = 0.006;
  needle.name = "needle";
  g.add(needle);
  return g;
};
export const setThermo = (g: Object3D, temp: number) => { g.getObjectByName("needle")!.rotation.z = -((-225 + (temp / 130) * 270) + 90) * (Math.PI / 180); };

// ------------------------------------------------------------------ the eclipse sky: sun, Moon, corona
export const SKY_DIST = 500;
export const SUN_R_DEG = 2.4; // painted larger than life (0.27 deg real) so the bite reads at phone size
export const SUN_R = SKY_DIST * Math.tan((SUN_R_DEG * Math.PI) / 180);
const coronaTex = () => canvasTex(512, 512, (c) => {
  const r = c.createRadialGradient(256, 256, 60, 256, 256, 256);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(230,236,255,0.65)"); r.addColorStop(0.6, "rgba(170,190,255,0.18)"); r.addColorStop(1, "rgba(150,170,255,0)");
  c.fillStyle = r; c.fillRect(0, 0, 512, 512);
  c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineCap = "round";
  for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28 + rnd(i) * 0.2, l = 120 + rnd(i + 5) * 120; c.lineWidth = 3 + rnd(i + 2) * 5; c.beginPath(); c.moveTo(256 + Math.cos(a) * 70, 256 + Math.sin(a) * 70); c.lineTo(256 + Math.cos(a) * l, 256 + Math.sin(a) * l); c.stroke(); }
});
/** Sun disc + the Moon's black disc + the corona (only in totality), all on the SKY layer. Place with `placeSky`. */
export const eclipseSky = () => {
  const g = new Group();
  const sun = sunDisc(SUN_R, "#fffdf4", "#ffe6a8", "#fff2d0");
  sun.name = "sun";
  const moon = new Mesh(new SphereGeometry(SUN_R * 1.04, 32, 16), new MeshBasicMaterial({ color: "#07070c", fog: false, toneMapped: false }));
  moon.layers.set(SKY);
  moon.renderOrder = 3;
  moon.name = "moon";
  const corona = new Mesh(new PlaneGeometry(SUN_R * 9, SUN_R * 9), new MeshBasicMaterial({ map: coronaTex(), transparent: true, blending: AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
  corona.layers.set(SKY);
  corona.renderOrder = 1;
  corona.name = "corona";
  g.add(corona, sun, moon);
  g.renderOrder = 2;
  return g;
};
/** The Moon's offset from the sun's centre (in sun radii) along its path, for composition frame F. */
export const placeSky = (g: Object3D, cam: Vector3, sunDir: Vector3, moonOff: number | null, total: number) => {
  const c = cam.clone().addScaledVector(sunDir, SKY_DIST);
  const sun = g.getObjectByName("sun")!, moon = g.getObjectByName("moon")!, cor = g.getObjectByName("corona")!;
  sun.position.copy(c); sun.lookAt(cam);
  cor.position.copy(c).addScaledVector(sunDir, 5); cor.lookAt(cam);
  // the Moon comes in from the lower left of the disc
  const up = V(0, 1, 0), right = new Vector3().crossVectors(sunDir, up).normalize().negate(), u2 = new Vector3().crossVectors(right, sunDir).normalize();
  moon.visible = moonOff !== null;
  if (moonOff !== null) moon.position.copy(c).addScaledVector(right, -0.82 * moonOff * SUN_R).addScaledVector(u2, -0.57 * moonOff * SUN_R).addScaledVector(sunDir, -8);
  sun.visible = total < 1;
  cor.visible = total > 0;
  (cor as Mesh<PlaneGeometry, MeshBasicMaterial>).material.opacity = total;
  (cor as Mesh<PlaneGeometry, MeshBasicMaterial>).material.transparent = true;
};
export { CanvasTexture, glowMat, model, unlit };
