import { INK, MOUTH, Pen, TONGUE, WHITE } from "./toon";
import type { P2 } from "./toon";

/**
 * Face library v2 (LOOK_SPEC section 1 "Face", characters.md 2.5): eyes 26u apart on the head's centre line,
 * features slid 7-8u toward the facing side, lidded half-disc deadpan as the default eye, shock = white circles
 * almost touching, tapered brows 17u long at -20u, small mouths at +20u. No blush, no catchlights.
 */
export const EXPRESSIONS = [
  "neutral", "tired", "worried", "scared", "shocked", "smug", "determined",
  "sad", "angry", "sneaky", "relieved", "confused", "deadpan", "laughing", "grin", "smirk",
  // R22 (user: "more emotions on our character to make it feel more alive"; refs 2/5/6 faces).
  "excited", "nervous", "suspicious", "disgusted", "scheming", "crying", "pleading", "proud",
] as const;
export type Expr = (typeof EXPRESSIONS)[number];

/** Head frame passed to faces, hair and hats (unrotated: the caller rotates the canvas with the head). */
/** `yaw`: the view (figure.ts viewOf), 0 / undefined = front. */
export type Head = { cx: number; cy: number; a: number; b: number; W: number; u: number; pts: P2[]; facing: number; look: number; yaw?: number };

/** `pupil` (R22): a white eye with a pupil that follows the gaze (refs 2/5: eye darts read in the whites);
 * `pinpoint`: the same with a tiny pupil (nerves); `big`: wide white with a large pupil (pleading, excited). */
type EyeK = "dot" | "small" | "lid" | "heavy" | "happy" | "dash" | "squeeze" | "shock" | "pupil" | "pinpoint" | "big";
type Brow = [number, number];
type MouthK = "dash" | "flat" | "frown" | "smirk" | "smileWide" | "grin" | "laugh" | "O" | "wave" | "teeth" | "wail" | "bleh";
/** eyes [back, front]; brows [inner, outer] offsets in u (+ = down), per side or shared, or raised arcs. */
type Face = { eye: [EyeK, EyeK]; brow: Brow | [Brow, Brow] | "arc"; mouth: MouthK; glance?: number };

const FACE: Record<Expr, Face> = {
  neutral: { eye: ["pupil", "pupil"], brow: [0, -1], mouth: "dash" }, // R22: whites + pupils (was dots)
  tired: { eye: ["heavy", "heavy"], brow: [-1, 3], mouth: "flat" },
  worried: { eye: ["pinpoint", "pinpoint"], brow: [-4, 3], mouth: "wave" },
  scared: { eye: ["shock", "shock"], brow: [-6, 1], mouth: "teeth" },
  shocked: { eye: ["shock", "shock"], brow: "arc", mouth: "O" },
  smug: { eye: ["lid", "lid"], brow: [[1, -1], [-4, -6]], mouth: "smirk" },
  determined: { eye: ["lid", "lid"], brow: [3, -2], mouth: "flat" },
  sad: { eye: ["small", "small"], brow: [-4, 3], mouth: "frown" },
  angry: { eye: ["lid", "lid"], brow: [5, -3], mouth: "teeth" },
  sneaky: { eye: ["lid", "lid"], brow: [2, -1], mouth: "smirk", glance: 1 },
  relieved: { eye: ["happy", "happy"], brow: [-2, 1], mouth: "smileWide" },
  confused: { eye: ["pupil", "pinpoint"], brow: [[-4, -6], [3, 1]], mouth: "wave" },
  deadpan: { eye: ["lid", "lid"], brow: [0, 0], mouth: "flat" },
  laughing: { eye: ["squeeze", "squeeze"], brow: [-4, -4], mouth: "laugh" },
  // Pilot critique: more faces that carry a joke. A wide toothy grin; a one-brow-up smirk (cocky, scheming).
  grin: { eye: ["happy", "happy"], brow: [-3, -5], mouth: "teeth" },
  smirk: { eye: ["lid", "lid"], brow: [[2, 0], [-7, -9]], mouth: "smirk", glance: 1 },
  // R22: the emotions the refs act with that we lacked (asymmetry where a real face would have it).
  excited: { eye: ["big", "big"], brow: "arc", mouth: "laugh" },
  nervous: { eye: ["pinpoint", "pinpoint"], brow: [-6, 2], mouth: "teeth", glance: 1 },
  suspicious: { eye: ["heavy", "pupil"], brow: [[5, 1], [-6, -8]], mouth: "flat", glance: 1 },
  disgusted: { eye: ["squeeze", "lid"], brow: [[6, 2], [3, -2]], mouth: "bleh" },
  scheming: { eye: ["lid", "lid"], brow: [7, -5], mouth: "grin", glance: 1 },
  crying: { eye: ["squeeze", "squeeze"], brow: [-7, 3], mouth: "wail" },
  pleading: { eye: ["big", "big"], brow: [-7, 2], mouth: "wave" },
  proud: { eye: ["happy", "happy"], brow: [-4, -6], mouth: "smirk" },
};

export type Effects = {
  /** Sweat drop, 0..1 slide progress. */
  sweat?: number;
  /** Steam puffs, time in s. */
  steam?: number;
  /** Colour rising up the face, t 0..1 (reach 1 over ~8 frames). */
  fill?: { color: string; t: number };
  /** Blush (R22, ref6): soft pink cheeks, 0..1 strength (embarrassed, flattered, in love, very hot). */
  blush?: number;
  /** Tears (R22): streams from both eyes, time in s (they run down and re-form). */
  tears?: number;
  /** Shock eyes regardless of expression. */
  ringEyes?: boolean;
  /** "!" pop, frames since it appeared. */
  bang?: number;
  /** Lip sync (scripts/audio/mouth.py): while open > 0 the mouth talks (o = round, a = open, e = wide teeth) instead
   * of the expression's mouth; eyes and brows keep the expression. */
  talk?: { open: number; shape: "o" | "a" | "e" };
};

export type MouthFrame = { open: number; shape: "o" | "a" | "e" };
/** The lip-sync frame for composition frame F when F is inside one of the character's spoken spans [from, to). */
export const talkAt = (track: MouthFrame[], F: number, spans: [number, number][]): MouthFrame | undefined =>
  spans.some(([a, b]) => F >= a && F < b) ? track[Math.min(Math.max(F, 0), track.length - 1)] : undefined;
/** A laugh with the mouth flapping ("ha-ha-ha") for `frames` from `from`. */
export const laughFlap = (F: number, from: number, frames = 24): MouthFrame | undefined =>
  F >= from && F < from + frames ? { open: 0.35 + 0.65 * Math.abs(Math.sin(((F - from) / 30) * Math.PI * 4.5)), shape: "a" } : undefined;

/**
 * Draw inside the head's outline (cast redesign 2026-11-15, refs: the hair is part of the one round head, its
 * hairline a line across it, not a cap stuck on top): clipped to the head shrunk just inside its ink ring.
 */
export const insideHead = (p: Pen, h: Head, fn: () => void) => {
  const k = 1 - (1.2 * h.u) / h.a;
  p.clip(h.pts.map(([x, y]) => [h.cx + (x - h.cx) * k, h.cy + (y - h.cy) * k] as P2), fn);
};

/** Colour-fill gag (drawn between the head fill and its ink ring, so the outline stays whole). */
export const drawFill = (p: Pen, h: Head, fx: Effects) => {
  if (!fx.fill || fx.fill.t <= 0) return;
  const { cx, cy, a, b } = h, top = cy + b - fx.fill.t * 2.1 * b;
  p.clip(h.pts, () => p.poly([[cx - 2 * a, top], [cx + 2 * a, top], [cx + 2 * a, cy + 2 * b], [cx - 2 * a, cy + 2 * b]], fx.fill!.color));
};

/** Feature scale (eyes, brows, mouth and their line widths) about each feature's centre. */
// R21: 1 (was .7): ref faces carry the joke with readable eyes, brows and mouths (eyes ~12-20 % of the head
// width); at .7 our dots and dash mouths vanished on a big blank head.
const FEAT = 1.0;

export const drawFace = (p: Pen, h: Head, expr: Expr, o: { blink: boolean; fx: Effects; brim?: boolean }) => {
  const { cx, cy, u, facing } = h;
  // Turnaround: the features slide toward the side faced (profile: near the edge), the eyes close up and the far eye
  // narrows, then hides past 60 deg; from behind (> 100 deg) there is no face.
  const yaw = h.yaw ?? 0, ay = Math.abs(yaw), sn = Math.abs(Math.sin((yaw * Math.PI) / 180)), vs = yaw < 0 ? -1 : 1;
  if (ay > 100) return drawEffects(p, h, o.fx);
  const F: Face = o.fx.ringEyes ? { ...FACE[expr], eye: ["shock", "shock"], brow: "arc" } : FACE[expr];
  // R20 (visual-ref1-6, moving images): a head turn slides the whole face across the head, not just the pupils
  // (refs ~35-45 % of the radius at a full turn; we slid 14 %), and the eyes close up a little as they turn away.
  const turn = h.look * (1 - sn);
  const fx = cx + 7 * u * facing + 0.22 * h.a * turn + vs * 0.5 * h.a * sn, lw = 3.8 * u, look = h.look + (F.glance ?? 0) * (facing >= 0 ? 1 : -1);
  const shock = F.eye[0] === "shock";
  const ex = (shock ? 14 : 15) * u * (1 - 0.45 * sn) * (1 - 0.12 * Math.abs(turn)), ey = cy;
  const g = p.g;
  ([-1, 1] as const).forEach((side, i) => {
    const far = sn > 0.05 && side !== vs;
    if (far && ay > 60) return;
    const x = fx + side * ex, lx = x + look * 3 * u;
    if (far) {
      g.save();
      g.translate(x, ey);
      g.scale(1 - 0.35 * sn, 1);
      g.translate(-x, -ey);
    }
    // Small features set wide (cast redesign 2026-11-15, refs: small ovals ~30 % of the head apart, thin lines).
    g.save();
    g.translate(x, ey);
    g.scale(FEAT, FEAT);
    g.translate(-x, -ey);
    const front = facing ? side === Math.sign(facing) : side > 0;
    let kind: EyeK = F.eye[front ? 1 : 0];
    if (o.blink && kind !== "happy" && kind !== "squeeze") kind = "dash";
    if (kind === "dot") p.ell(lx, ey, 5.6 * u, 4.4 * u, INK);
    else if (kind === "small") p.ell(lx, ey, 3 * u, 4.4 * u, INK);
    else if (kind === "lid" || kind === "heavy") {
      const d = kind === "heavy" ? 1.5 * u : -u;
      p.ell(lx, ey + d, 7 * u, kind === "heavy" ? 4 * u : 6 * u, INK, 0, 0, 180);
      p.stroke([[x - 9 * u, ey + d], [x + 9 * u, ey + d]], lw);
    } else if (kind === "happy") p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw);
    else if (kind === "dash") p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw);
    else if (kind === "squeeze") {
      const tip: P2 = [x - 6 * u * side, ey]; // doubled middle point = sharp ">" (3 points would round it)
      p.stroke([[x + 6 * u * side, ey - 5 * u], tip, tip, [x + 6 * u * side, ey + 5 * u]], lw);
    }
    else if (kind === "pupil" || kind === "pinpoint" || kind === "big") {
      // R22: white + pupil; the pupil rides the gaze (pose.look + glance), so alive() darts show in the whites.
      const [rx, ry, pr] = kind === "big" ? [10, 11, 5.2] : kind === "pinpoint" ? [8, 9, 1.9] : [8, 9, 3.6];
      p.ell(x, ey, rx * u, ry * u, WHITE, 2.6 * u);
      p.dot(x + Math.max(-1, Math.min(1, look)) * (rx - pr - 1.6) * u, ey + 1.2 * u, pr * u);
    }
    else {
      p.ell(x, ey, 11 * u, 11 * u, WHITE, 2.6 * u);
      p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3 * u);
    }
    const by = ey - (o.brim ? 14 : 17) * u;
    if (F.brow === "arc") p.arc(x, by - 6 * u, 9 * u, 3 * u, 200, 340, 4 * u);
    else {
      const [dI, dO] = (Array.isArray(F.brow[0]) ? (F.brow as [Brow, Brow])[i] : F.brow) as Brow;
      p.taper([x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
    }
    if (o.fx.tears !== undefined) {
      // A stream from the outer corner down the cheek, with a drop that runs and re-forms (~0.7 s).
      const t = (o.fx.tears / 0.7) % 1, sx = x + side * 6 * u;
      p.stroke([[sx, ey + 5 * u], [sx + side * 2 * u, ey + 14 * u], [sx + side * u, ey + 24 * u]], 3.4 * u, "#8fcbff");
      p.ell(sx + side * 1.5 * u, ey + 8 * u + t * 20 * u, 3.2 * u, 4 * u, "#8fcbff", 1.4 * u);
    }
    g.restore();
    if (far) g.restore();
  });
  if (o.fx.blush) {
    // R22 (ref6): soft pink cheeks below the eyes, no outline.
    for (const side of [-1, 1]) {
      if (sn > 0.05 && side !== vs && ay > 60) continue;
      p.ell(fx + side * (ex + 2 * u), ey + 11 * u, 8 * u, 4.2 * u, `rgba(240,110,125,${0.5 * Math.min(o.fx.blush, 1)})`);
    }
  }
  const mx = cx + 8 * u * facing + 0.26 * h.a * turn + vs * 0.55 * h.a * sn, my = cy + 19 * u, mw = 4 * u;
  // A turned mouth foreshortens (narrower toward the profile).
  g.save();
  g.translate(mx, my);
  g.scale((1 - 0.45 * sn) * FEAT, FEAT);
  g.translate(-mx, -my);
  const dmouth = (rx: number, ry: number, y: number, tongue = false) => {
    p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
    p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
    if (tongue) p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + ry], [mx - rx, y + ry]], () => p.ell(mx + 2 * u, y + 0.75 * ry, 0.45 * rx, 0.32 * ry, TONGUE));
    p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
  };
  const t = o.fx.talk;
  if (t && t.open > 0) {
    const k = 0.35 + 0.65 * t.open;
    if (t.shape === "o") p.ell(mx, my + 2 * u, 6.5 * u, 9 * u * k, MOUTH, 3.2 * u);
    else if (t.shape === "e") {
      dmouth(13 * u, 7 * u * k, my - 2 * u);
    } else dmouth(11 * u, 11 * u * k, my - u, k > 0.7);
    g.restore();
    drawEffects(p, h, o.fx);
    return;
  }
  switch (F.mouth) {
    case "dash":
      p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.8 * u]], mw);
      break;
    case "flat":
      p.stroke([[mx - 6 * u, my], [mx + 6 * u, my]], mw);
      break;
    case "frown":
      p.arc(mx, my + 3 * u, 6.5 * u, 3.5 * u, 200, 340, mw);
      break;
    case "smirk":
      p.arc(mx + u, my - 3 * u, 7 * u, 4 * u, 10, 150, mw);
      break;
    case "smileWide":
      p.arc(mx, my - 4 * u, 11 * u, 6 * u, 15, 165, mw);
      break;
    case "grin":
      dmouth(12 * u, 8 * u, my - u);
      break;
    case "laugh":
      dmouth(16 * u, 11 * u, my, true);
      break;
    case "O":
      p.ell(mx, my + 2 * u, 9 * u, 11 * u, MOUTH, 3.2 * u);
      break;
    case "wave": {
      const s: P2[] = [];
      for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.5 * u * Math.sin(i * 1.3)]);
      p.stroke(s, 3 * u);
      break;
    }
    case "wail":
      // Open crying mouth: the top half of an oval (corners down), tongue showing.
      p.ell(mx, my + 7 * u, 12 * u, 10 * u, MOUTH, 3 * u, 180, 360);
      p.clip([[mx - 12 * u, my - 3 * u], [mx + 12 * u, my - 3 * u], [mx + 12 * u, my + 7 * u], [mx - 12 * u, my + 7 * u]], () => p.ell(mx, my + 7 * u, 6 * u, 4 * u, TONGUE));
      break;
    case "bleh":
      // Disgust: a frown with the tongue out of one corner.
      p.ell(mx + 3 * u, my + 3 * u, 4.5 * u, 6 * u, TONGUE, 2.4 * u, 0, 180);
      p.arc(mx, my + 4 * u, 8 * u, 4 * u, 200, 340, mw);
      break;
    case "teeth":
      p.poly([[mx - 12 * u, my - 4 * u], [mx + 12 * u, my - 4 * u], [mx + 11 * u, my + 4 * u], [mx - 11 * u, my + 4 * u]], WHITE, 3 * u);
      for (const k of [-1, 0, 1]) p.stroke([[mx + k * 6 * u, my - 4 * u], [mx + k * 6 * u, my + 4 * u]], 1.5 * u);
      break;
  }
  g.restore();
  drawEffects(p, h, o.fx);
};

const drawEffects = (p: Pen, h: Head, fx: Effects) => {
  const { cx, cy, a, b, u } = h, g = p.g, side = h.facing < 0 ? -1 : 1;
  if (fx.sweat !== undefined) {
    const sx = cx - side * (a + 4 * u), sy = cy - 0.35 * b + fx.sweat * 18 * u;
    g.beginPath();
    g.moveTo(sx, sy - 11 * u);
    g.quadraticCurveTo(sx + 7 * u, sy - u, sx + 6 * u, sy + 3 * u);
    g.arc(sx, sy + 3 * u, 6 * u, 0, Math.PI);
    g.quadraticCurveTo(sx - 7 * u, sy - u, sx, sy - 11 * u);
    g.fillStyle = "#9fd4ff";
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2 * u;
    g.stroke();
  }
  if (fx.steam !== undefined)
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const t = (fx.steam * 0.9 + i / 3) % 1, r = (6 + t * 8) * u;
        g.globalAlpha = 1 - t;
        p.ell(cx + s * (a * 0.85 + t * 14 * u), cy - b * 0.85 - t * 44 * u, r, r, "#f3eef6", 1.6 * u);
        g.globalAlpha = 1;
      }
  if (fx.bang !== undefined) {
    // "!" pop: overshoot to 1.25, settle at 1 over ~6 frames.
    const t = Math.min(fx.bang / 6, 1);
    const k = Math.max(1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, 0.1);
    g.save();
    g.translate(cx + side * a * 1.05, cy - b * 1.3);
    g.scale(k, k);
    g.rotate(0.18 * side);
    g.beginPath();
    g.roundRect(-5 * u, -22 * u, 10 * u, 26 * u, 5 * u);
    g.fillStyle = "#ffd23a";
    g.fill();
    g.lineWidth = 2.6 * u;
    g.strokeStyle = INK;
    g.stroke();
    p.ell(0, 13 * u, 4.6 * u, 4.6 * u, "#ffd23a", 2.6 * u);
    g.restore();
  }
};
