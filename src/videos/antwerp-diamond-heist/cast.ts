import { BUILDS, glasses, outfit, turnHair } from "../../../kit/toon/extras";
import type { Head } from "../../../kit/toon/face";
import type { Look, Torso } from "../../../kit/toon/figure";
import { youLook } from "../../../kit/toon/protagonist";
import { INK, Pen, mix } from "../../../kit/toon/toon";
import { belt, bottoms, campCollar, cap, headLayers, layers, nameTag, pattern, seams, suspenders, tache } from "../../../kit/toon/wardrobe";

/**
 * antwerp-diamond-heist cast. Silhouettes: you (messy fringe, rust hoodie; a charcoal suit with a rust tie as the
 * "dealer"), The Genius (tall, round glasses, teal pinstripe shirt, a tool roll), The Monster (huge, black beanie,
 * quilted vest), the King of Keys (old, white walrus moustache, waistcoat, a giant ring of keys on his belt),
 * Speedy (thin, backward red cap, striped tee, always sweating), the guard (round, peaked cap, SECURITY tag), the
 * old man who owns the woods (flat cap, plaid cardigan), the police officer (navy, white cap band).
 */
type Layer = (p: Pen, t: Torso) => void;
const hideBack = (hl: (p: Pen, h: Head) => void) => (p: Pen, h: Head) => { if (Math.abs(h.yaw ?? 0) <= 100) hl(p, h); };

// ------------------------------------------------------------------ you, the "diamond dealer" (lines 7-8, 28)
export const youSuit: Look = {
  ...youLook,
  jacket: "#3a3c48", pants: "#2c2e38", shoes: "#2a1e18", sneakers: false, shoeStripe: undefined, hairBack: undefined,
  outfit: layers(outfit({ bottom: ["#2c2e38", 0.88], shirt: { color: "#f2ece2", tie: "#c8582c" }, buttons: "#c8582c" }), seams(null, 0.88), (p, t) => {
    // lapels: two dark triangles beside the shirt V
    const { cx, top, u } = t;
    for (const s of [-1, 1]) p.poly([[cx + s * 6 * u, top + 6 * u], [cx + s * 30 * u, top + 8 * u], [cx + s * 10 * u, top + 70 * u]], "#2a2c36", 1.4 * u);
  }),
};

// ------------------------------------------------------------------ the crew
const toolRoll: Layer = (p, t) => {
  const { cx, top, bot, u } = t, y = top + (bot - top) * 0.62;
  p.poly([[cx - 40 * u, y], [cx + 40 * u, y - 6 * u], [cx + 40 * u, y + 16 * u], [cx - 40 * u, y + 22 * u]], "#8a5a3a", 1.6 * u);
  for (let i = 0; i < 5; i++) p.stroke([[cx - 30 * u + i * 15 * u, y - 14 * u], [cx - 30 * u + i * 15 * u, y + 10 * u]], 2.4 * u, ["#c8ccd2", "#e2c25a", "#c8342c", "#c8ccd2", "#3a3a44"][i]);
};
export const geniusLook: Look = {
  build: BUILDS.tallThin, seed: 61, jacket: "#2a9a9a", pants: "#3a3446", shoes: "#2a2224", turns: true,
  outfit: layers(pattern("pinstripe", "#2a9a9a", "#5ac8c8"), campCollar("#1e7a7a"), bottoms("#3a3446", 0.86), belt("#2a2224", "#c8ccd2"), toolRoll),
  hair: turnHair("#2a2a34", 0.46, 0.3, 2),
  face: glasses,
};
const beanie = (col: string) => (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) { const t = Math.PI + (i / 24) * Math.PI; pts.push([cx + 1.04 * a * Math.cos(t), cy - 0.32 * b + 0.78 * b * Math.sin(t)]); }
  p.poly(pts, col, 0.85 * 5 * u);
  p.poly([[cx - 1.04 * a, cy - 0.34 * b], [cx + 1.04 * a, cy - 0.34 * b], [cx + 1.0 * a, cy - 0.16 * b], [cx - 1.0 * a, cy - 0.16 * b]], mix(col, "#000000", 0.25), 0.85 * 4 * u);
  for (let k = -4; k <= 4; k++) p.stroke([[cx + k * 0.2 * a, cy - 0.34 * b], [cx + k * 0.2 * a, cy - 0.17 * b]], 1.2 * u, mix(col, "#ffffff", 0.15));
};
export const monsterLook: Look = {
  build: { a: 134, torso: 1.36, legs: 1.46, tw: 1.18 }, seed: 67, jacket: "#3a4a3a", pants: "#2a2a30", shoes: "#1c1a1a", turns: true,
  outfit: layers(pattern("quilt", "#3a4a3a", "#4a5e4a"), outfit({ bottom: ["#2a2a30", 0.88], collar: "#2a3a2a" }), seams("#2a3a2a", 0.88)),
  hair: (p, h) => { turnHair("#1c1a1a", 0.2, 0.15)(p, h); hideBack(beanie("#1c1c22"))(p, h); },
};
const keyRing: Layer = (p, t) => {
  const { cx, top, bot, u } = t, x = cx + 32 * u, y = top + (bot - top) * 0.86;
  p.ell(x, y + 16 * u, 16 * u, 16 * u, null as unknown as string, 3 * u);
  for (let i = 0; i < 9; i++) {
    const a = 0.6 + i * 0.25, x0 = x + Math.cos(a) * 16 * u, y0 = y + 16 * u + Math.sin(a) * 16 * u;
    const col = i % 3 ? "#e2c25a" : "#c8ccd2";
    p.stroke([[x0, y0], [x0 + Math.cos(a) * 18 * u, y0 + Math.sin(a) * 18 * u]], 3.6 * u, col);
    p.dot(x0, y0, 3.2 * u, col);
  }
};
export const kingLook: Look = {
  build: BUILDS.old, seed: 71, jacket: "#7a5a8a", pants: "#4a4048", shoes: "#3a2418", turns: true,
  outfit: layers(pattern("dots", "#7a5a8a", "#a888b8"), outfit({ bottom: ["#4a4048", 0.86], shirt: { color: "#f2ece2" }, buttons: "#e2c25a" }), belt("#3a2418", "#e2c25a", 0.84), keyRing, seams(null, 0.86)),
  hair: turnHair("#e8e6ee", 0.25, 0.5),
  face: tache("walrus", "#e8e6ee"),
};
export const speedyLook: Look = {
  build: BUILDS.tallThin, seed: 79, jacket: "#f2ece2", pants: "#3a4a6a", shoes: "#e8e2d8", sneakers: true, shoeStripe: "#d8342c", turns: true,
  outfit: layers(outfit({ bottom: ["#3a4a6a", 0.86], stripes: { color: "#d8342c", gap: 22 } }), seams("#b8b0a4", 0.86)),
  hair: headLayers(turnHair("#4a3020", 0.4, 0.35), hideBack(cap("#d8342c", true))),
};

// ------------------------------------------------------------------ the rest
export const guardLook: Look = {
  build: BUILDS.shortRound, seed: 83, jacket: "#3a5a8a", pants: "#2a3446", shoes: "#1c1a1a", turns: true,
  outfit: layers(outfit({ bottom: ["#2a3446", 0.86], shirt: { color: "#dfe8f2", tie: "#1c2a44" }, buttons: "#e2c25a", collar: "#2a4a7a" }), nameTag("SECURITY", "#f2ece2"), seams(null, 0.86)),
  hair: headLayers(turnHair("#6a4a32", 0.3, 0.4), hideBack((p, h) => { cap("#1c2a44")(p, h); const { cx, cy, b, u } = h; p.dot(cx, cy - 0.78 * b, 5 * u, "#e2c25a"); })),
  face: tache("pencil", "#5a3a28"),
};
const flatCap = (col: string) => (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, d = h.facing < 0 ? -1 : 1;
  p.poly([[cx - 1.05 * a, cy - 0.42 * b], [cx - 0.8 * a, cy - 0.95 * b], [cx + 0.7 * a, cy - 1.0 * b], [cx + 1.08 * a, cy - 0.5 * b]], col, 0.85 * 5 * u);
  p.poly([[cx + 0.2 * a * d, cy - 0.44 * b], [cx + 1.35 * a * d, cy - 0.36 * b], [cx + 1.1 * a * d, cy - 0.26 * b], [cx + 0.1 * a * d, cy - 0.3 * b]], mix(col, INK, 0.3), 0.85 * 4 * u);
};
export const oldManLook: Look = {
  build: BUILDS.old, seed: 89, jacket: "#7a4a3a", pants: "#5a5446", shoes: "#3a2a20", turns: true,
  outfit: layers(pattern("plaid", "#7a4a3a", "#a8643a", "#d8c89a"), outfit({ bottom: ["#5a5446", 0.86], buttons: "#d8c89a", rib: "#5a3428" }), suspenders("#3a2a20")),
  hair: headLayers(turnHair("#d8d4de", 0.15, 0.5), hideBack(flatCap("#6a6a5a"))),
  face: glasses,
};
export const copLook: Look = {
  build: BUILDS.stocky, seed: 97, jacket: "#22305a", pants: "#1c2440", shoes: "#141414", turns: true,
  outfit: layers(outfit({ bottom: ["#1c2440", 0.86], buttons: "#e2c25a", collar: "#2a3a6a" }), nameTag("POLITIE", "#e8eef6"), belt("#141414", "#c8ccd2", 0.82), seams(null, 0.86)),
  hair: headLayers(turnHair("#3a2a24", 0.32, 0.4), hideBack((p, h) => { cap("#1c2440")(p, h); const { cx, cy, a, b, u } = h; p.poly([[cx - a, cy - 0.5 * b], [cx + a, cy - 0.5 * b], [cx + a, cy - 0.42 * b], [cx - a, cy - 0.42 * b]], "#f2f2ee", 1 * u); })),
};
