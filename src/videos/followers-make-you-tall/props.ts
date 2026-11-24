import { BoxGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, TorusGeometry } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { M } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { photo } from "../../../kit/toon/build/photo";
import { toonMaterial } from "../../../kit/toon/shade";
import { FONT, MATS, V, canvasTex, glassMat, litTex, plane, pngTex, unlit } from "./common";

/**
 * followers-make-you-tall: story props. Library models where Poly Haven has them (buns, croissants, the flower, tyres);
 * the rest (bus, news van, jet, lunchbox, phone, mug, bubble tea, paper bag, map) has no CC0 model and is built from
 * realistic parts with photo materials (marked `modelled`). Each origin is its grip point (held) or base centre (resting).
 */
const ceramic = (c: string) => M(`fmt-ceramic-${c}`, () => toonMaterial({ color: c, spec: 0.7, gloss: 0.7, rough: 0.15 }));
const add = (g: Group, m: Mesh, x: number, y: number, z: number) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };

// ------------------------------------------------------------------ the city bus Kayla rides (11 m, front toward +x)
const busSide = () => canvasTex(1024, 256, (g) => {
  g.fillStyle = "#f6f2ea"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#1e5aa8"; g.fillRect(0, 170, 1024, 40);
  g.fillStyle = "#ffd23f"; g.fillRect(0, 210, 1024, 12);
  g.fillStyle = "#1e5aa8"; g.font = `900 46px ${FONT}`; g.fillText("WESTBROOK TRANSIT", 330, 245);
});
export const BUS = { l: 11, w: 2.5, h: 3.0 };
export const bus = () => {
  const g = new Group(), { l, w, h } = BUS;
  add(g, new Mesh(new RoundedBoxGeometry(l, h - 0.45, w, 4, 0.18), MATS.paint("#f6f2ea")), 0, 0.45 + (h - 0.45) / 2, 0); // modelled: bus body (painted photo metal)
  add(g, new Mesh(new BoxGeometry(l - 1.4, 1.0, w + 0.02), glassMat()), -0.3, 2.05, 0); // modelled: window band
  add(g, new Mesh(new BoxGeometry(0.05, 1.3, w - 0.3), glassMat()), l / 2 + 0.01, 2.0, 0); // modelled: windscreen
  add(g, new Mesh(new BoxGeometry(3.2, 0.35, 1.6), MATS.metal()), -1.2, h + 0.15, 0); // modelled: roof AC pod
  for (const s of [-1, 1]) g.add(plane(l - 0.4, (l - 0.4) / 4, litTex("busside", busSide, { rough: 0.5, spec: 0.4 }), V(0, 0.9, s * (w / 2 + 0.012)), s > 0 ? 0 : Math.PI));
  g.add(plane(1.6, 0.32, unlit("bus-dest", () => { const t = canvasTex(512, 102, (c) => { c.fillStyle = "#101014"; c.fillRect(0, 0, 512, 102); c.fillStyle = "#ffb020"; c.font = `900 64px ${FONT}`; c.textAlign = "center"; c.fillText("12 SCHOOL", 256, 76); }); return t; }), V(l / 2 + 0.02, 2.82, 0), Math.PI / 2));
  for (const x of [-3.6, 3.4]) for (const s of [-1, 1]) {
    const t = model("old_tyre", { collider: false, scale: 1.6 });
    t.position.set(x, 0, s * (w / 2 - 0.12));
    g.add(t);
  }
  g.userData.collider = "bus";
  return g;
};

// ------------------------------------------------------------------ the news van (5 m, front toward +x) with its dish
export const VAN = { l: 5.2, w: 2.0, h: 2.4 };
export const newsVan = () => {
  const g = new Group(), { l, w, h } = VAN;
  add(g, new Mesh(new RoundedBoxGeometry(l, h - 0.35, w, 4, 0.14), MATS.paint("#f2f4f6")), 0, 0.35 + (h - 0.35) / 2, 0); // modelled: van body
  add(g, new Mesh(new BoxGeometry(1.0, 0.8, w + 0.02), glassMat()), l / 2 - 0.7, 1.75, 0); // modelled: cab windows
  for (const s of [-1, 1]) g.add(plane(2.8, 0.9, unlit("van-logo", () => { const t = canvasTex(768, 256, (c) => { c.fillStyle = "#c8342c"; c.beginPath(); c.roundRect(4, 4, 760, 248, 30); c.fill(); c.fillStyle = "#fff"; c.font = `900 120px ${FONT}`; c.textAlign = "center"; c.fillText("CH 7 NEWS", 384, 168); }); return t; }), V(-0.6, 1.3, s * (w / 2 + 0.012)), s > 0 ? 0 : Math.PI));
  const mast = add(g, new Mesh(new CylinderGeometry(0.05, 0.05, 1.4, 8), MATS.metal()), -1.4, h + 0.7, 0); // modelled: dish mast
  void mast;
  const dish = add(g, new Mesh(new SphereGeometry(0.55, 18, 8, 0, Math.PI * 2, 0, 0.9), MATS.paint("#e8eaee")), -1.4, h + 1.5, 0); // modelled: satellite dish
  dish.rotation.z = 1.0;
  for (const x of [-1.6, 1.6]) for (const s of [-1, 1]) { const t = model("old_tyre", { collider: false, scale: 1.15 }); t.position.set(x, 0, s * (w / 2 - 0.08)); g.add(t); }
  g.userData.collider = "news van";
  return g;
};

// ------------------------------------------------------------------ the jet Tyler writes with (nose toward +x)
export const jet = () => {
  const g = new Group(), P = MATS.paint("#c8ccd4");
  add(g, new Mesh(new CylinderGeometry(0.9, 0.6, 12, 14).rotateZ(Math.PI / 2), P), 0, 0, 0); // modelled: fuselage
  add(g, new Mesh(new SphereGeometry(0.9, 14, 8).scale(1.8, 1, 1), P), 6, 0, 0); // modelled: nose
  add(g, new Mesh(new BoxGeometry(3.4, 0.18, 13), P), -0.5, -0.1, 0); // modelled: wings
  add(g, new Mesh(new BoxGeometry(1.6, 2.6, 0.18), P), -5.4, 1.3, 0); // modelled: fin
  add(g, new Mesh(new BoxGeometry(1.4, 0.14, 4.6), P), -5.4, 0.2, 0); // modelled: tailplane
  add(g, new Mesh(new SphereGeometry(0.55, 12, 8).scale(1.8, 0.8, 0.9), glassMat()), 3.6, 0.7, 0); // modelled: canopy
  return g;
};

// ------------------------------------------------------------------ your sister's lunchbox (open top: you ride inside)
export const LUNCH = { w: 0.26, h: 0.12, d: 0.12 };
/** A tin lunchbox hanging from its handle (origin = the grip at the top of the handle). Child "lid" hinges at the back. */
export const lunchbox = () => {
  const g = new Group(), { w, h, d } = LUNCH, P = MATS.paint("#e84a6a"), y0 = -0.06 - h;
  for (const [sx, sy, sz, x, y, z] of [[w, 0.006, d, 0, y0, 0], [w, h, 0.006, 0, y0 + h / 2, d / 2], [w, h, 0.006, 0, y0 + h / 2, -d / 2], [0.006, h, d, w / 2, y0 + h / 2, 0], [0.006, h, d, -w / 2, y0 + h / 2, 0]] as const)
    add(g, new Mesh(new BoxGeometry(sx, sy, sz), P), x, y, z); // modelled: tin lunchbox panels
  const bunIn = model("hamburger_buns", { part: "hamburger_buns_01", collider: false }); // a sandwich bun to stand on
  bunIn.position.set(0.03, y0 + 0.004, 0);
  g.add(bunIn);
  const lid = new Group();
  add(lid as unknown as Group, new Mesh(new BoxGeometry(w + 0.01, 0.008, d + 0.01), P), 0, 0, d / 2); // modelled: lid
  lid.position.set(0, y0 + h, -d / 2);
  lid.name = "lid";
  g.add(lid);
  add(g, new Mesh(new TorusGeometry(0.045, 0.008, 6, 16, Math.PI), MATS.paint("#f2c23a")), 0, -0.045, 0); // modelled: handle
  g.add(plane(0.1, 0.06, unlit("lunch-label", () => { const t = canvasTex(256, 154, (c) => { c.fillStyle = "#fff4d0"; c.fillRect(0, 0, 256, 154); c.fillStyle = "#c8342c"; c.font = `900 56px ${FONT}`; c.textAlign = "center"; c.fillText("MIA'S", 128, 72); c.font = `800 34px ${FONT}`; c.fillText("LUNCH", 128, 128); }); return t; }), V(-0.05, y0 + h * 0.5, d / 2 + 0.004)));
  g.userData.collider = "lunchbox";
  return g;
};
/** Lid angle: 0 shut, 1 thrown open (back, -1.9 rad). */
export const setLid = (g: Object3D, open: number) => { const l = g.getObjectByName("lid"); if (l) l.rotation.x = -1.9 * open; };
export const LUNCH_FLOOR = -0.06 - LUNCH.h; // the box floor below the grip

// ------------------------------------------------------------------ your phone (lying on the desk, screen up)
const PHONE_MATS = new Map<string, MeshBasicMaterial>();
export const phoneScreen = (kind: "followers" | "ding") => {
  let m = PHONE_MATS.get(kind);
  if (!m) {
    m = new MeshBasicMaterial({ toneMapped: false, map: canvasTex(384, 768, (c) => {
      c.fillStyle = "#16161e"; c.fillRect(0, 0, 384, 768);
      if (kind === "ding") {
        c.fillStyle = "#ff3a7a"; c.beginPath(); c.roundRect(30, 300, 324, 160, 30); c.fill();
        c.fillStyle = "#fff"; c.textAlign = "center"; c.font = `900 56px ${FONT}`; c.fillText("+10,000", 192, 370); c.font = `800 34px ${FONT}`; c.fillText("NEW FOLLOWERS", 192, 420);
        return;
      }
      c.fillStyle = "#f6f6f8"; c.textAlign = "center"; c.font = `900 44px ${FONT}`; c.fillText("FOLLOWERS", 192, 90);
      c.fillStyle = "#ff3a7a"; c.font = `900 120px ${FONT}`; c.fillText("3", 192, 220);
      const row = (y: number, name: string, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(70, y, 34, 0, 7); c.fill(); c.fillStyle = "#f6f6f8"; c.textAlign = "left"; c.font = `800 ${name.length > 10 ? 30 : 40}px ${FONT}`; c.fillText(name, 120, y + 13); };
      row(330, "Mom", "#e88ab8"); row(440, "Grandma", "#a8c8e8"); row(550, "HotSingles4U", "#ff3a3a");
      c.fillStyle = "#ffd23f"; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(60 + i * 16, 520 + (i % 2) * 12, 5, 0, 7); c.fill(); }
    }) });
    PHONE_MATS.set(kind, m);
  }
  return m;
};
export const PHONE = { w: 0.075, l: 0.155, t: 0.009 };
/** A phone lying flat (screen up), its long side along z. Child "screen". */
export const phone = (kind: "followers" | "ding" = "followers") => {
  const g = new Group();
  add(g, new Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.t, PHONE.l, 3, 0.004), M("fmt-phonebody", () => toonMaterial({ color: "#2a2a34", spec: 0.6, gloss: 0.5, rough: 0.25 }))), 0, PHONE.t / 2, 0); // modelled: phone body
  const s = new Mesh(new PlaneGeometry(PHONE.w - 0.008, PHONE.l - 0.012), phoneScreen(kind));
  s.rotation.x = -Math.PI / 2;
  s.position.y = PHONE.t + 0.0006;
  s.name = "screen";
  g.add(s);
  g.userData.collider = "phone";
  return g;
};
/** A phone held upright in a hand (grip at its lower third), screen toward +z. */
export const phoneHeld = (kind: "followers" | "ding") => {
  const g = new Group(), p = phone(kind);
  p.rotation.x = Math.PI / 2;
  p.position.set(0, 0.05, 0);
  g.add(p);
  return g;
};

// ------------------------------------------------------------------ Mom's mug, Kayla's bubble tea
const mugTex = () => canvasTex(512, 200, (c) => { c.fillStyle = "#f6f2ea"; c.fillRect(0, 0, 512, 200); c.fillStyle = "#c8342c"; c.textAlign = "center"; c.font = `900 40px ${FONT}`; c.fillText("WORLD'S", 256, 64); c.font = `900 56px ${FONT}`; c.fillText("OKAYEST", 256, 122); c.font = `900 40px ${FONT}`; c.fillText("MOM", 256, 172); });
export const mug = () => {
  const g = new Group();
  add(g, new Mesh(new CylinderGeometry(0.042, 0.04, 0.1, 20), ceramic("#f6f2ea")), 0, 0.05, 0); // modelled: ceramic mug
  add(g, new Mesh(new TorusGeometry(0.028, 0.007, 8, 14, Math.PI), ceramic("#f6f2ea")), -0.045, 0.05, 0).rotation.z = Math.PI / 2; // modelled: handle
  const label = new Mesh(new CylinderGeometry(0.0425, 0.0405, 0.07, 20, 1, true, -0.9, 1.8), litTex("mug", mugTex, { spec: 0.6, gloss: 0.6, rough: 0.2 })); // modelled: the mug label wrap
  label.position.y = 0.05;
  g.add(label);
  const coffee = new Mesh(new CylinderGeometry(0.038, 0.038, 0.002, 18), M("fmt-coffee", () => toonMaterial({ color: "#3a2214", gloss: 0.6, rough: 0.2 }))); // modelled: coffee
  coffee.position.y = 0.09;
  g.add(coffee);
  return g;
};
export const bubbleTea = () => {
  const g = new Group();
  add(g, new Mesh(new CylinderGeometry(0.045, 0.036, 0.16, 18), M("fmt-cup", () => toonMaterial({ color: "#e8d8c0", spec: 0.6, gloss: 0.5, rough: 0.2 }))), 0, 0.08, 0); // modelled: tea cup
  add(g, new Mesh(new CylinderGeometry(0.043, 0.036, 0.11, 18), M("fmt-tea", () => toonMaterial({ color: "#b8865a", rough: 0.4 }))), 0, 0.06, 0); // modelled: milk tea
  for (let i = 0; i < 9; i++) add(g, new Mesh(new SphereGeometry(0.008, 8, 6), M("fmt-pearl", () => toonMaterial({ color: "#2a1810", gloss: 0.7, rough: 0.2 }))), Math.cos(i * 2.3) * 0.025, 0.012 + (i % 3) * 0.012, Math.sin(i * 2.3) * 0.025); // modelled: pearls
  add(g, new Mesh(new CylinderGeometry(0.007, 0.007, 0.13, 8), MATS.paint("#ff6aa8")), 0.012, 0.18, 0).rotation.z = 0.15; // modelled: straw
  return g;
};

// ------------------------------------------------------------------ bread: buns (library), a kraft paper bag of buns
export const bun = (i = 1) => model("hamburger_buns", { part: `hamburger_buns_0${i}`, collider: false });
export const croissant = () => model("croissant", { collider: false });
export const BAG = { w: 0.22, h: 0.3, d: 0.14 };
export const breadBag = () => {
  const g = new Group(), { w, h, d } = BAG;
  add(g, new Mesh(new BoxGeometry(w, h, d), M("fmt-kraft", () => toonMaterial({ map: photo("hessian_230"), color: "#c89a68", repeat: [4, 4], rough: 0.95, mottle: 0.2 }))), 0, h / 2, 0); // modelled: kraft paper bag
  g.add(plane(0.14, 0.08, unlit("bag-label", () => { const t = canvasTex(256, 146, (c) => { c.fillStyle = "#f6f0e0"; c.fillRect(0, 0, 256, 146); c.fillStyle = "#8a5a3a"; c.font = `900 64px ${FONT}`; c.textAlign = "center"; c.fillText("BREAD", 128, 96); }); return t; }), V(0, h * 0.55, d / 2 + 0.002)));
  for (let i = 0; i < 3; i++) { const b = bun(i + 1); b.position.set(-0.05 + i * 0.05, h - 0.03, 0); b.rotation.z = 0.3 - i * 0.3; b.scale.setScalar(0.85); g.add(b); }
  g.userData.collider = "bread bag";
  return g;
};
/** A slice of bread for the storm: a thin slab with the photo slice on both faces (modelled). */
export const breadSlice = () => {
  const g = new Group();
  const mat = M("fmt-slice", () => new MeshBasicMaterial({ map: pngTex("adh_bread"), transparent: true, alphaTest: 0.4, side: DoubleSide }));
  const m = new Mesh(new PlaneGeometry(0.12, 0.12), mat);
  g.add(m);
  return g;
};

// ------------------------------------------------------------------ the flower you hold (bigger than you), the map
export const flower = () => model("flower_heliophila", { part: "flower_heliophila_small", collider: false });
const mapTex = () => canvasTex(1024, 768, (c) => {
  c.fillStyle = "#f4ecd8"; c.fillRect(0, 0, 1024, 768);
  c.strokeStyle = "#d8ccb0"; c.lineWidth = 2; for (let x = 0; x < 1024; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 768); c.stroke(); } for (let y = 0; y < 768; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
  c.strokeStyle = "#b8b0a0"; c.lineWidth = 26; c.lineCap = "round";
  for (const [a, b, d, e] of [[40, 380, 990, 380], [500, 30, 500, 740], [120, 120, 900, 640], [80, 640, 940, 160]]) { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); }
  c.fillStyle = "#e0d4bc"; for (let i = 0; i < 40; i++) c.fillRect(60 + (i % 8) * 120, 60 + Math.floor(i / 8) * 140, 70, 50);
  const ponds = [[150, 230], [380, 600], [700, 210], [860, 540], [560, 420], [260, 470]];
  for (const [x, y] of ponds) { c.fillStyle = "#7ab8d8"; c.beginPath(); c.ellipse(x, y, 44, 30, 0.3, 0, 7); c.fill(); }
  c.strokeStyle = "#e8342c"; c.lineWidth = 7; for (const [x, y] of ponds) { c.beginPath(); c.ellipse(x, y, 66, 50, 0.2, 0, 7); c.stroke(); }
  c.setLineDash([18, 14]); c.lineWidth = 6; c.beginPath(); c.moveTo(150, 230); for (const [x, y] of ponds.slice(1)) c.lineTo(x, y); c.lineTo(930, 700); c.stroke(); c.setLineDash([]);
  c.fillStyle = "#e8342c"; c.font = `900 46px ${FONT}`; c.fillText("SCHOOL ★", 790, 735);
  c.fillStyle = "#1c1c22"; c.font = `900 40px ${FONT}`; c.fillText("EVERY POND", 40, 60);
});
export const MAP = { w: 0.62, d: 0.46 };
export const townMap = () => {
  const m = new Mesh(new PlaneGeometry(MAP.w, MAP.d), litTex("map", mapTex, { rough: 0.85 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.001;
  const g = new Group();
  g.add(m);
  return g;
};
export { Object3D };
