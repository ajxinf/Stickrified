import { BUILDS, bun, glasses, outfit, turnHair } from "../../../kit/toon/extras";
import type { Head } from "../../../kit/toon/face";
import type { Look } from "../../../kit/toon/figure";
import { INK, Pen, mix } from "../../../kit/toon/toon";
import { belt, boater, bottoms, cap, campCollar, headLayers, layers, pattern, seams, shadesUp, tache } from "../../../kit/toon/wardrobe";

/**
 * sun-never-sets cast. Every speaking role: one pattern + one or two signature accessories + one construction detail.
 * Silhouettes: Kyle's backwards cap + shades and gold chain (cool teal against your rust), Mom's bun and robe belt, Dad's
 * straw hat and walrus moustache, the sleepless queue in pyjamas and nightcaps (one costume family, so the leads pop).
 */
type Torso = { cx: number; top: number; bot: number; chin: number; u: number; a: number };
/** Kyle's gold chain with a dollar-sign pendant. */
const goldChain = (p: Pen, t: Torso) => {
  const { cx, chin, u } = t;
  p.stroke([[cx - 16 * u, chin + 2 * u], [cx - 8 * u, chin + 22 * u], [cx, chin + 28 * u], [cx + 8 * u, chin + 22 * u], [cx + 16 * u, chin + 2 * u]], 3.2 * u, "#e2b83a");
  p.dot(cx, chin + 34 * u, 7 * u, "#f2c84a");
  p.g.save(); p.g.fillStyle = INK; p.g.font = `900 ${10 * u}px "Nunito", sans-serif`; p.g.textAlign = "center"; p.g.textBaseline = "middle"; p.g.fillText("$", cx, chin + 35 * u); p.g.restore();
};
export const kyleLook: Look = {
  build: BUILDS.tallThin, seed: 517, jacket: "#2ab0a8", pants: "#f6f0ea", shoes: "#f6f0e6", shorts: "#f6f0ea", socks: "#ffffff", sneakers: true, shoeStripe: "#2ab0a8", turns: true,
  outfit: layers(pattern("flowers", "#2ab0a8", "#f2e85a", "#ff8ac8"), seams("#1e8a84", 0.86), goldChain),
  hair: headLayers(turnHair("#2a1a14", 0.36, 0.4), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) { cap("#f2c23a", true)(p, h); shadesUp("#1c1c22", "#ff4fa8")(p, h); } else cap("#f2c23a", true)(p, h); }),
};

/** Mom: a quilted pink robe with a belt, hair in a bun, glasses. */
export const momLook: Look = {
  build: BUILDS.pear, seed: 523, jacket: "#e88ab8", pants: "#7a4a6a", shoes: "#f2c8d8", turns: true,
  outfit: layers(pattern("quilt", "#e88ab8", "#f6c0d8"), campCollar("#f6c0d8"), belt("#c85a8a", "#f6c0d8", 0.6), seams(null, 0.92)),
  hair: (p, h) => { turnHair("#7a4a32", 0.4, 0.4)(p, h); if (Math.abs(h.yaw ?? 0) <= 120) bun(p, h); },
  face: glasses,
};

/** Dad: orange pinstripe polo, khaki shorts and white socks, straw hat, walrus moustache. */
export const dadLook: Look = {
  build: BUILDS.stocky, seed: 529, jacket: "#f28a3a", pants: "#a89270", shoes: "#4a3020", shorts: "#a89270", socks: "#ffffff", turns: true,
  outfit: layers(pattern("pinstripe", "#f28a3a", "#ffc08a"), campCollar("#d86a2a"), bottoms("#a89270", 0.86), belt("#3a2a20")),
  hair: headLayers(turnHair("#6a4a32", 0.42, 0.5), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) boater("#e8cf86", "#2a6a4a")(p, h); }),
  face: (p, h) => tache("walrus", "#6a4a32")(p, h),
};

// ------------------------------------------------------------------ the sleepless: pyjamas + nightcaps
/** A floppy nightcap with a pompom, leaning to the card's right. */
export const nightcap = (col: string, pom = "#fbf6e8") => (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, y = cy - 0.62 * b, s = h.facing >= 0 ? 1 : -1;
  p.poly([[cx - 0.98 * a, y + 0.08 * b], [cx + 0.98 * a, y + 0.08 * b], [cx + s * 1.35 * a, y - 0.95 * b], [cx + s * 0.2 * a, y - 0.7 * b]], col, 3 * u);
  p.ell(cx, y + 0.05 * b, 1.02 * a, 0.16 * b, mix(col, "#ffffff", 0.55), 2.6 * u);
  p.dot(cx + s * 1.38 * a, y - 0.98 * b, 0.2 * a, pom);
};
/** A sleep mask pushed up on the forehead. */
const sleepMask = (col: string) => (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h;
  if (Math.abs(h.yaw ?? 0) > 100) return;
  p.ell(cx, cy - 0.5 * b, 0.95 * a, 0.17 * b, col, 2.6 * u);
  p.stroke([[cx - 0.2 * a, cy - 0.5 * b], [cx + 0.2 * a, cy - 0.5 * b]], 1.4 * u, mix(col, "#ffffff", 0.5));
};
type Acc = (p: Pen, h: Head) => void;
const pyjamas = (seed: number, build: keyof typeof BUILDS, top: string, pat: "plaid" | "dots" | "quilt" | "pinstripe" | "flowers", hair: string, acc?: Acc, o: Partial<Look> = {}): Look => ({
  build: BUILDS[build], seed, jacket: top, pants: top, shoes: "#f6e8d8", turns: true,
  outfit: layers(pattern(pat, top, mix(top, "#ffffff", 0.5)), outfit({ bottom: [mix(top, "#2a2a40", 0.2), 0.88], buttons: "#fbf6e8", collar: mix(top, "#ffffff", 0.4) }), seams(null, 0.88)),
  hair: acc ? headLayers(turnHair(hair, 0.36, 0.45), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 120) acc(p, h); }) : turnHair(hair, 0.36, 0.45),
  ...o,
});
export const closetLook = pyjamas(601, "tallThin", "#7a9ac8", "pinstripe", "#3a2a24", nightcap("#3a5a9a"));
export const fridgeLook = pyjamas(607, "shortRound", "#6ab88a", "dots", "#a85a34", nightcap("#c8342c"));
export const QUEUE_LOOKS: Look[] = [
  pyjamas(611, "pear", "#c8a0d8", "dots", "#5a3424", nightcap("#7a4ab8")),
  pyjamas(613, "stocky", "#7a92c4", "plaid", "#8a5a32", sleepMask("#2a2a40")),
  pyjamas(617, "tallThin", "#f2c8a0", "pinstripe", "#2a2a34"),
  pyjamas(619, "old", "#a8d0e8", "quilt", "#d8d4de", nightcap("#4a7ab8")),
  pyjamas(623, "shortRound", "#f28a8a", "dots", "#3a2a24", sleepMask("#c8342c")),
  pyjamas(627, "pear", "#9ad0c0", "flowers", "#c8a050", nightcap("#2f8a6a")),
  pyjamas(631, "tallThin", "#e8d06a", "plaid", "#4a3428"),
  pyjamas(637, "stocky", "#b8a0e8", "pinstripe", "#2a2a34", nightcap("#e84a8a")),
  pyjamas(641, "old", "#f2ece2", "dots", "#e8e4ee", sleepMask("#3a6ab8")),
  pyjamas(643, "pear", "#a8c87a", "quilt", "#5a3424", nightcap("#c8582c")),
];
// ------------------------------------------------------------------ kids, the TV family
const kid = (seed: number, top: string, pat: "dots" | "pinstripe" | "plaid", hair: string, acc?: Acc): Look => ({
  build: BUILDS.child, seed, jacket: top, pants: "#3e6aa8", shoes: "#f6f0e6", shorts: "#3e6aa8", sneakers: true, turns: true,
  outfit: layers(pattern(pat, top, mix(top, "#ffffff", 0.45)), seams(null, 0.88)),
  hair: acc ? headLayers(turnHair(hair, 0.34, 0.45), acc) : turnHair(hair, 0.34, 0.45),
});
export const kidALook = kid(701, "#f2c23a", "dots", "#3a2a24");
export const kidBLook = kid(709, "#e84a3a", "pinstripe", "#c86a3a", (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) cap("#3a6ab8")(p, h); });
export const brotherLook = kid(719, "#4ab86a", "pinstripe", "#5a3424");
export const tvMomLook = pyjamas(723, "pear", "#e8a87c", "flowers", "#a85a34");
export const tvDadLook: Look = { ...pyjamas(727, "stocky", "#5a7ab8", "plaid", "#3a2a24"), face: glasses };
