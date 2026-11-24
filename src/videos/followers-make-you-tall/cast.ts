import { BUILDS, bun, glasses, outfit, turnHair } from "../../../kit/toon/extras";
import type { Look } from "../../../kit/toon/figure";
import { INK, Pen, mix } from "../../../kit/toon/toon";
import { belt, bottoms, campCollar, cap, headLayers, headband, layers, nameTag, pattern, seams, shadesUp, tache, visor } from "../../../kit/toon/wardrobe";

/**
 * followers-make-you-tall cast. Every speaking role: one pattern + one or two signature accessories + one construction
 * detail. Silhouettes: Tyler's backwards gold cap, shades and chain (purple + gold against your rust); Zoe's yellow
 * headband and duck-yellow dots; Grandpa's flat cap and walrus moustache; Mom's bun and glasses; Kayla's sunglasses on
 * her blonde hair; Mia (your sister) pigtail bun and a red dot dress.
 */
type Torso = { cx: number; top: number; bot: number; chin: number; u: number; a: number };
/** Tyler's gold chain with a play-button pendant (his 2 million followers). */
const goldChain = (p: Pen, t: Torso) => {
  const { cx, chin, u } = t;
  p.stroke([[cx - 16 * u, chin + 2 * u], [cx - 8 * u, chin + 22 * u], [cx, chin + 28 * u], [cx + 8 * u, chin + 22 * u], [cx + 16 * u, chin + 2 * u]], 3.2 * u, "#e2b83a");
  p.dot(cx, chin + 35 * u, 8 * u, "#e8342c");
  p.poly([[cx - 3 * u, chin + 31 * u], [cx + 5 * u, chin + 35 * u], [cx - 3 * u, chin + 39 * u]], "#ffffff");
};
export const tylerLook: Look = {
  build: BUILDS.tallThin, seed: 811, jacket: "#7a3ab8", pants: "#1c1c26", shoes: "#f6f0e6", sneakers: true, shoeStripe: "#e2b83a", turns: true,
  outfit: layers(pattern("pinstripe", "#7a3ab8", "#b88ae8"), seams("#5a2a8a", 0.88), goldChain),
  hair: headLayers(turnHair("#2a1a14", 0.36, 0.4), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) { cap("#e2b83a", true)(p, h); shadesUp("#1c1c22", "#3ad8ff")(p, h); } else cap("#e2b83a", true)(p, h); }),
};
/** Zoe: a duck-yellow dotted jacket with a belt, a yellow headband, dark curls. */
export const zoeLook: Look = {
  build: BUILDS.pear, seed: 821, jacket: "#f2c23a", pants: "#3a5a9a", shoes: "#f6f0e6", sneakers: true, turns: true,
  outfit: layers(pattern("dots", "#f2c23a", "#fff4c8"), campCollar("#f6e08a"), belt("#3a5a9a", "#f6f0e6", 0.8), seams(null, 0.9)),
  hair: headLayers(turnHair("#3a2418", 0.44, 0.55), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 110) headband("#ffd23f")(p, h); }),
};
/** Mom: a teal quilted cardigan, a bun and glasses. */
export const momLook: Look = {
  build: BUILDS.pear, seed: 831, jacket: "#2a9a9a", pants: "#4a4a6a", shoes: "#f2c8a0", turns: true,
  outfit: layers(pattern("quilt", "#2a9a9a", "#7ad0c8"), campCollar("#e8f0e8"), seams(null, 0.9)),
  hair: (p, h) => { turnHair("#6a3a28", 0.4, 0.4)(p, h); if (Math.abs(h.yaw ?? 0) <= 120) bun(p, h); },
  face: glasses,
};
/** Kayla (the dance video): a pink flower crop top, blonde, sunglasses up. */
export const kaylaLook: Look = {
  build: BUILDS.tallThin, seed: 841, jacket: "#ff6aa8", pants: "#f6f0ea", shoes: "#f6f0e6", sneakers: true, turns: true,
  outfit: layers(pattern("flowers", "#ff6aa8", "#ffe86a", "#ffffff"), bottoms("#f6f0ea", 0.8), seams("#d84a88", 0.8)),
  hair: headLayers(turnHair("#f2d06a", 0.46, 0.6), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) shadesUp("#1c1c22", "#ff6aa8")(p, h); }),
};
/** Grandpa (2 inches): a brown quilted cardigan, flat cap, walrus moustache, glasses. */
export const grandpaLook: Look = {
  build: BUILDS.old, seed: 851, jacket: "#8a5a3a", pants: "#5a5a64", shoes: "#3a2a20", turns: true,
  outfit: layers(pattern("quilt", "#8a5a3a", "#c8946a"), outfit({ buttons: "#f2e6c8" }), seams(null, 0.9)),
  hair: headLayers(turnHair("#e8e4ee", 0.3, 0.4), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) cap("#6a5a4a")(p, h); }),
  face: (p, h) => { glasses(p, h); tache("walrus", "#e8e4ee")(p, h); },
};
/** Mia, your little sister: a red dotted dress, a top bun. */
export const miaLook: Look = {
  build: BUILDS.child, seed: 861, jacket: "#e84a3a", pants: "#e84a3a", shoes: "#f6f0e6", sneakers: true, turns: true,
  outfit: layers(pattern("dots", "#e84a3a", "#ffd0c8"), seams("#c8342c", 0.86)),
  hair: (p, h) => { turnHair("#5a3424", 0.4, 0.5)(p, h); if (Math.abs(h.yaw ?? 0) <= 120) bun(p, h); },
};
/** The Fresh Mart cashier: a green plaid shirt, a visor and a name tag. */
export const cashierLook: Look = {
  build: BUILDS.stocky, seed: 871, jacket: "#3a8a4a", pants: "#2a2a34", shoes: "#2a2a30", turns: true,
  outfit: layers(pattern("plaid", "#3a8a4a", "#7ac88a"), nameTag("GUS"), seams(null, 0.9)),
  hair: headLayers(turnHair("#2a1a14", 0.36, 0.4), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) visor("#3a8a4a")(p, h); }),
};
// ------------------------------------------------------------------ extras: one family each (school kids, parents, street)
const extra = (seed: number, build: keyof typeof BUILDS, top: string, pat: "plaid" | "dots" | "quilt" | "pinstripe" | "flowers", hair: string, hat?: "cap" | "band"): Look => ({
  build: BUILDS[build], seed, jacket: top, pants: mix(top, "#2a2a40", 0.55), shoes: "#f6f0e6", sneakers: build === "child", turns: true,
  outfit: layers(pattern(pat, top, mix(top, "#ffffff", 0.5)), seams(null, 0.88)),
  hair: hat ? headLayers(turnHair(hair, 0.38, 0.45), (p, h) => { if (Math.abs(h.yaw ?? 0) > 110) return; if (hat === "cap") cap(mix(top, "#1c1c2a", 0.3))(p, h); else headband(mix(top, "#ffffff", 0.3))(p, h); }) : turnHair(hair, 0.38, 0.45),
});
export const KID_LOOKS: Look[] = [
  extra(901, "child", "#3a8ad8", "dots", "#3a2a24", "cap"), extra(903, "child", "#f28a3a", "pinstripe", "#c86a3a"), extra(907, "child", "#4ab86a", "plaid", "#2a1a14", "band"),
  extra(909, "child", "#e86a8a", "flowers", "#f2d06a"), extra(911, "child", "#8a6ad8", "dots", "#5a3424", "cap"), extra(913, "child", "#f2c23a", "pinstripe", "#3a2a24"),
];
export const PARENT_LOOKS: Look[] = [
  extra(921, "pear", "#c8a0d8", "quilt", "#5a3424"), extra(923, "stocky", "#7a92c4", "plaid", "#8a5a32", "cap"), extra(927, "tallThin", "#f2c8a0", "pinstripe", "#2a2a34"),
  extra(929, "old", "#a8d0e8", "dots", "#d8d4de"), extra(931, "shortRound", "#f28a8a", "flowers", "#3a2a24", "band"), extra(933, "stocky", "#9ad0c0", "plaid", "#c8a050"),
];
export { INK };
