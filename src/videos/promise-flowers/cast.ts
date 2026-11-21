import { BUILDS, glasses, outfit, turnHair } from "../../../kit/toon/extras";
import type { Head } from "../../../kit/toon/face";
import type { Look } from "../../../kit/toon/figure";
import { flowerCoat } from "../../../kit/toon/flowers";
import type { Flower, FlowerAt } from "../../../kit/toon/flowers";
import { BUILD, INK, Pen, WHITE, mix } from "../../../kit/toon/toon";
import { belt, bottoms, cap, campCollar, headLayers, headband, layers, nameTag, overalls, pattern, seams, shadesUp, tache } from "../../../kit/toon/wardrobe";

/**
 * promise-flowers cast. Every speaking role: one pattern + one or two signature accessories + one construction detail
 * (skill "Clothes look made"); silhouettes: Grandma's wide beekeeper hat, Derek's slick quiff and flower coat, Linda's
 * headband and race number, Dad's walrus moustache and glasses. Crowd looks all `turns` (turnHair), so the debate crowd
 * reads from behind as backs of heads, not hairlines.
 */

// ------------------------------------------------------------------ Grandma: cardigan, beekeeper hat with the veil pushed up
const beekeeper = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h;
  if (Math.abs(h.yaw ?? 0) > 100) { turnHair("#d8d4de", -0.55, 0.15)(p, h); return; }
  turnHair("#d8d4de", 0.2, 0.55)(p, h); // silver hair under the hat
  const y0 = cy - 0.72 * b;
  // crown (straw), the veil gathered on top (a soft white roll with mesh lines), then the wide brim
  p.ell(cx, y0 - 0.16 * b, 0.62 * a, 0.36 * b, "#e8d49a", 3 * u, 180, 360);
  p.ell(cx, y0 - 0.34 * b, 0.56 * a, 0.16 * b, "#f6f4ee", 2.2 * u);
  for (let k = -3; k <= 3; k++) p.stroke([[cx + k * 0.15 * a, y0 - 0.46 * b], [cx + k * 0.17 * a, y0 - 0.22 * b]], 0.8 * u, "#9a98a4");
  p.ell(cx, y0, 1.32 * a, 0.17 * b, "#e8d49a", 3 * u);
  p.stroke([[cx - 1.2 * a, y0], [cx + 1.2 * a, y0]], 1.2 * u, mix("#e8d49a", INK, 0.35));
  p.ell(cx, y0 - 0.09 * b, 0.64 * a, 0.07 * b, "#6a8a4a", 1.6 * u); // green hat band
};
export const grandmaLook: Look = {
  build: BUILDS.old, seed: 171, jacket: "#c8728e", pants: "#5a4a6a", shoes: "#6a4030", brim: true, turns: true,
  outfit: layers(pattern("dots", "#c8728e", "#f6d8e2"), outfit({ bottom: ["#5a4a6a", 0.86], buttons: "#f6ece0", rib: "#a85a74" }), seams(null, 0.86)),
  hair: beekeeper,
  face: glasses,
};

// ------------------------------------------------------------------ Derek: flower coat (the 1,000), slick quiff, teal tie
/** Derek's look for a moment of the story: `slide` 0 = all his glued flowers on, 1+ = slid off; `rotten` shows the
 * real ones underneath. */
export const derekLook = (o: { slide?: number; rotten?: number; F?: number } = {}): Look => ({
  build: BUILDS.tallThin, seed: 191, jacket: "#f6f0ea", pants: "#8aa8d0", shoes: "#f6f0e6", turns: true,
  outfit: layers(
    flowerCoat("#f6f0ea", ["#f49ac1", "#fbf3f0", "#f6c09a", "#f28ab0", "#ffffff"], o),
    outfit({ bottom: ["#8aa8d0", 0.9], shirt: { color: "#ffffff", tie: "#2ab0a8" } }),
  ),
  hair: (p, h) => {
    turnHair("#e8c050", 0.4, 0.2)(p, h);
    if (Math.abs(h.yaw ?? 0) > 100) return;
    // the quiff: a glossy wave over the brow
    const { cx, cy, a, b, u } = h;
    p.ell(cx + 0.18 * a * (h.facing >= 0 ? 1 : -1), cy - 0.86 * b, 0.55 * a, 0.22 * b, "#f2d060", 3 * u, 0, 360, -12);
    p.arc(cx + 0.1 * a, cy - 0.9 * b, 0.32 * a, 0.1 * b, 200, 320, 2.2 * u, "#fff2b0");
  },
});
const PINKS = ["#f49ac1", "#fbf3f0", "#f6c09a", "#f28ab0", "#ffffff", "#ffd0e0"];
/** Derek's blooms on arms, legs and head (his torso is the coat). `rotten` swaps them for the real ones. */
export const derekFlowers = (rotten: number, F: number, slide = 0): Flower[] => {
  const out: Flower[] = [];
  const at: FlowerAt[] = [
    ...[0.15, 0.32, 0.5, 0.68, 0.84].flatMap((t) => [0, 1].map((side) => ({ part: "arm", side, t } as FlowerAt))),
    ...[0.18, 0.4, 0.62, 0.82].flatMap((t) => [0, 1].map((side) => ({ part: "leg", side, t } as FlowerAt))),
    ...[[-0.78, -0.55], [-0.4, -0.95], [0.05, -1.05], [0.48, -0.92], [0.82, -0.5]].map(([x, y]) => ({ part: "head", x, y } as FlowerAt)),
  ];
  at.forEach((a, i) => {
    const fallen = slide > 0.2 + 0.6 * ((i * 0.37) % 1); // the glued ones drop one by one as the glue melts
    if (rotten > 0 && fallen) out.push({ at: a, color: PINKS[i % PINKS.length], open: 0.5, rot: rotten, size: 0.75, ang: ((i * 47) % 90) - 45, seed: i, F, flies: i % 3 === 0, stink: i % 2 === 0 });
    else if (!fallen) out.push({ at: a, color: PINKS[i % PINKS.length], open: 1, size: a.part === "head" ? 0.85 : 0.95, ang: a.part === "head" ? (a as { x: number }).x * 60 : ((i * 47) % 70) - 35, seed: i });
  });
  return out;
};

// ------------------------------------------------------------------ Linda: running vest + race number, headband, shorts
const raceNumber = (p: Pen, t: { cx: number; top: number; bot: number; a: number; u: number }) => {
  const { cx, top, bot, u } = t, y = top + (bot - top) * 0.42;
  p.poly([[cx - 18 * u, y - 13 * u], [cx + 18 * u, y - 13 * u], [cx + 18 * u, y + 13 * u], [cx - 18 * u, y + 13 * u]], WHITE, 1.6 * u);
  p.g.save();
  p.g.fillStyle = INK;
  p.g.font = `900 ${18 * u}px "Nunito", sans-serif`;
  p.g.textAlign = "center";
  p.g.textBaseline = "middle";
  p.g.fillText("27", cx, y + 1 * u);
  p.g.restore();
  for (const s of [-1, 1]) p.dot(cx + s * 15 * u, y - 10 * u, 1.3 * u, "#c8342c"); // safety pins
};
export const lindaLook: Look = {
  build: BUILDS.tallThin, seed: 211, jacket: "#2ab0a8", pants: "#3a3446", shoes: "#f6f0e6", shorts: "#3a3446", socks: "#ffffff", sneakers: true, shoeStripe: "#f2c23a", turns: true,
  outfit: layers(pattern("pinstripe", "#2ab0a8", "#5ad0c8"), seams("#1e8a84", 0.88), raceNumber, (p, t) => {
    // finisher medal on a red ribbon
    const { cx, chin, u } = t;
    p.stroke([[cx - 9 * u, chin], [cx, chin + 26 * u], [cx + 9 * u, chin]], 2.4 * u, "#c8342c");
    p.dot(cx, chin + 30 * u, 6 * u, "#e2c25a");
  }),
  hair: headLayers(turnHair("#c86a3a", 0.34, 0.45), headband("#f2c23a")),
};

// ------------------------------------------------------------------ Dad: plaid shirt, walrus moustache, glasses
export const dadLook: Look = {
  build: BUILDS.stocky, seed: 223, jacket: "#5a7ab8", pants: "#5a4a3a", shoes: "#4a3020", turns: true,
  outfit: layers(pattern("plaid", "#5a7ab8", "#2a3a6a", "#f2ece2"), campCollar("#4a6aa8"), bottoms("#5a4a3a", 0.86), belt("#3a2a20")),
  hair: turnHair("#6a4a32", 0.42, 0.5),
  face: (p, h) => { glasses(p, h); tache("walrus", "#6a4a32")(p, h); },
};

// ------------------------------------------------------------------ the town
/** A town extra: build, top colour + pattern, hair colour, one accessory. All turn (backs read in the crowd). */
const extra = (seed: number, build: keyof typeof BUILDS, top: string, pat: "plaid" | "dots" | "flowers" | "quilt" | "pinstripe" | null, hair: string, acc?: (p: Pen, h: Head) => void, legs = "#3a3446", o: Partial<Look> = {}): Look => ({
  build: BUILDS[build], seed, jacket: top, pants: legs, shoes: "#3a2a24", turns: true,
  outfit: layers(...(pat ? [pattern(pat, top, mix(top, "#ffffff", 0.45))] : []), outfit({ bottom: [legs, 0.86] }), seams(null, 0.86)),
  hair: acc ? headLayers(turnHair(hair, 0.36, 0.45), (p, h) => { if (Math.abs(h.yaw ?? 0) <= 100) acc(p, h); }) : turnHair(hair, 0.36, 0.45),
  ...o,
});
export const dateManLook = extra(301, "tallThin", "#3e6a50", null, "#3a2a24", undefined, "#2a3446", { outfit: layers(outfit({ bottom: ["#2a3446", 0.88], shirt: { color: "#f2ece2", tie: "#9a2a3a" }, buttons: "#d8b45a" }), seams(null, 0.88)) });
export const dateWomanLook = extra(307, "pear", "#7a3a5a", "dots", "#5a3424");
export const mailLook = extra(313, "shortRound", "#3a5a9a", null, "#3a2a24", cap("#2a4a8a"), "#2a3a6a", { outfit: layers(outfit({ bottom: ["#2a3a6a", 0.84], buttons: "#e2c25a", collar: "#5a7ab8" }), nameTag("MAIL", "#f2ece2"), seams(null, 0.84)) });
export const joggerLook = extra(317, "tallThin", "#d8423a", "pinstripe", "#2a2a34", headband("#ffffff"), "#d8423a", { shorts: "#2a2a34", socks: "#ffffff" });
export const callGuyLook = extra(331, "shortRound", "#7a4ab8", null, "#2a2a34", headLayers(cap("#2a2a34", true), shadesUp()), "#3a3a4a");
export const neighbourLook = extra(337, "pear", "#e8a87c", "flowers", "#a85a34", undefined, "#5a4a6a");
export const kidLook = extra(341, "child", "#f2c23a", "dots", "#3a2a24", undefined, "#3e6aa8");
/** Crowd and square looks (varied builds, colours, patterns; a few hats). */
export const TOWN_LOOKS: Look[] = [
  extra(401, "stocky", "#7a92c4", "pinstripe", "#8a5a32", cap("#c8342c")),
  extra(403, "pear", "#d8a838", "dots", "#5a3424"),
  extra(405, "tallThin", "#5e6e5a", null, "#2a2a34"),
  extra(407, "old", "#a85a5a", "quilt", "#d8d4de"),
  extra(409, "shortRound", "#2f8a6a", "plaid", "#3a2a24"),
  extra(411, "tallThin", "#e88ab8", "flowers", "#c8a050"),
  extra(413, "stocky", "#f2ece2", "pinstripe", "#4a3428", undefined, "#2a3a6a", { outfit: layers(overalls("#3e6aa8", "#c8a050"), seams(null, 0.9)) }),
  extra(415, "pear", "#4ab8c8", null, "#2a2a34", headband("#e84a3a")),
  extra(417, "old", "#6a5a8a", "dots", "#e8e4ee"),
  extra(419, "shortRound", "#c8582c", "plaid", "#3a2a24", undefined, "#4a3a2a"),
  extra(421, "tallThin", "#3a4a7a", null, "#a85a34"),
  extra(423, "pear", "#9ad0c0", "quilt", "#5a3424"),
];

// ------------------------------------------------------------------ flowers people carry
const F_COLS = ["#e84a6a", "#f2c23a", "#b06ad8", "#f28a3a", "#e84a3a", "#f6f0ea"];
/** A townsperson's promise flowers: a few blooms and rotten ones at seeded spots. */
export const townFlowers = (seed: number, F: number, n = 3): Flower[] => {
  const spots: FlowerAt[] = [{ part: "arm", side: 0, t: 0.45 }, { part: "arm", side: 1, t: 0.6 }, { part: "torso", x: -0.55, y: -0.45 }, { part: "head", x: 0.75, y: -0.65 }, { part: "leg", side: 1, t: 0.45 }, { part: "torso", x: 0.5, y: 0.3 }];
  return Array.from({ length: n }, (_, k) => {
    const i = (seed * 7 + k * 3) % spots.length, rot = (seed + k) % 4 === 0 ? 1 : 0;
    return { at: spots[i], color: F_COLS[(seed + k) % F_COLS.length], open: 1, rot, size: 0.9, ang: (((seed * 31 + k * 57) % 80) - 40), seed: seed + k, F, flies: rot > 0 && k === 0 };
  });
};
/** Your fourteen rotten flowers (mostly "I'll be there in five minutes"): no own flies (you have THE fly). */
export const YOUR_ROT: FlowerAt[] = [
  { part: "arm", side: 0, t: 0.28 }, { part: "arm", side: 0, t: 0.55 }, { part: "arm", side: 0, t: 0.8 },
  { part: "arm", side: 1, t: 0.3 }, { part: "arm", side: 1, t: 0.62 },
  { part: "torso", x: -0.62, y: -0.5 }, { part: "torso", x: 0.6, y: -0.35 }, { part: "torso", x: -0.35, y: 0.35 }, { part: "torso", x: 0.42, y: 0.55 },
  { part: "head", x: -0.9, y: -0.35 }, { part: "head", x: 0.92, y: -0.2 },
  { part: "leg", side: 0, t: 0.4 }, { part: "leg", side: 1, t: 0.55 }, { part: "torso", x: 0.05, y: -0.75 },
];
const ROT_COLS = ["#e84a6a", "#f2c23a", "#b06ad8", "#f28a3a", "#4a8ad8", "#e84a3a", "#f6f0ea"];
/** Your flowers at frame F: the 14 rotten ones (`count` of them, for the flashback pops) + the bud on your right hand. */
export const yourFlowers = (F: number, o: { count?: number; bud?: { grow: number; open: number; rot: number }; pop?: number } = {}): Flower[] => {
  const n = o.count ?? 14;
  const out: Flower[] = YOUR_ROT.slice(0, n).map((at, i) => ({
    at, color: ROT_COLS[i % ROT_COLS.length], open: 0.6, rot: 1, size: 0.8, ang: at.part === "head" ? (at as { x: number }).x * 70 : ((i * 53) % 80) - 40, seed: 500 + i, F, flies: false, stink: i % 4 === 0,
    // the newest one pops (stem shoots out, flushes brown) over `pop` frames
    ...(o.pop !== undefined && i === n - 1 ? { grow: Math.min(Math.max(o.pop / 6, 0), 1) } : {}),
  }));
  if (o.bud) out.push({ at: { part: "arm", side: 1, t: 0.97 }, color: "#ff6a2a", open: o.bud.open, rot: o.bud.rot, grow: o.bud.grow, size: 1.5, ang: 25, seed: 777, F, flies: false });
  return out;
};
export { BUILD };
