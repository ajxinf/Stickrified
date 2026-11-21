import type { Torso } from "./figure";
import { INK, Pen, mix, rnd } from "./toon";
import type { P2 } from "./toon";

type Layer = (p: Pen, t: Torso) => void;

/**
 * Promise flowers (promise-flowers, 2026-11-22): a flower growing out of a character's skin, drawn on the card in the
 * body part's own frame, so it moves with the arm, leg, torso or head it grows from. `open` 0 = bud .. 1 = full bloom,
 * `rot` 0 = fresh .. 1 = rotten (brown, drooping, petals gone, flies and stink lines), `grow` 0..1 the stem shooting
 * out (a pop). Kit-level so any episode can grow things on people (put them in `CharState.flowers`).
 */
export type FlowerAt =
  | { part: "arm" | "leg"; side: 0 | 1; t: number } // side 0 = card-left; t 0 shoulder/hip .. 0.5 elbow/knee .. 1 hand/ankle
  | { part: "torso" | "head"; x: number; y: number }; // in half-widths / half-heights of the bean or head (y + = down)
export type Flower = {
  at: FlowerAt;
  color: string;
  open: number;
  rot?: number;
  grow?: number;
  size?: number;
  /** Stem direction, deg from straight up (+ = card-right). */
  ang?: number;
  seed?: number;
  /** Composition frame: animates flies and stink lines on rotten flowers. */
  F?: number;
  /** Rotten flowers draw a fly and stink lines unless these are false (a body covered in rot gets one fly, not 14). */
  flies?: boolean;
  stink?: boolean;
};

const GREEN = "#4f8f3a", BROWN = "#9a6a3a", DEAD = "#7a6a3a";
const rotate = (x: number, y: number, a: number): P2 => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** One flower whose stem starts at (x, y), in card px (u = head width / 100). */
export const drawFlower = (p: Pen, x: number, y: number, u: number, f: Flower) => {
  // 2.1: at 1 a bloom is ~36 % of the head wide (look test: at the old size rotten flowers read as squiggles)
  const rot = f.rot ?? 0, g = f.grow ?? 1, k = (f.size ?? 1) * u * 2.1, seed = f.seed ?? 1;
  if (g <= 0) return;
  // The stem curls outward and, as it rots, droops over toward the ground.
  const a0 = ((f.ang ?? 0) * Math.PI) / 180, droop = rot * 1.9 * (Math.sin(a0) >= 0 ? 1 : -1);
  const L = 13 * k * g * (1 - 0.25 * rot);
  const pt = (s: number): P2 => { const [dx, dy] = rotate(0, -L * s, a0 + droop * s * s); return [x + dx, y + dy]; };
  const stem = [pt(0), pt(0.35), pt(0.7), pt(1)];
  const stemCol = mix(GREEN, DEAD, rot);
  p.stroke(stem, 3.6 * k * 0.55 + 1.2 * u, INK);
  p.stroke(stem, 2.2 * k * 0.55, stemCol);
  const [hx, hy] = stem[3], tip = a0 + droop;
  if (rot < 0.5 && g > 0.4) {
    // one leaf half way up
    const [lx, ly] = stem[1], la = tip + (rnd(seed, 3) > 0.5 ? 1.1 : -1.1);
    p.ell(lx + Math.sin(la) * 3.5 * k, ly - Math.cos(la) * 3.5 * k, 4.2 * k, 1.9 * k, mix(GREEN, DEAD, rot), 1.2 * u, 0, 360, (la * 180) / Math.PI - 90);
  }
  const open = Math.min(Math.max(f.open, 0), 1) * Math.min(g * 1.5, 1);
  const petal = mix(f.color, BROWN, rot), ctr = mix("#f4c430", "#3a2a1a", rot);
  if (open < 0.12) {
    // bud: a green teardrop with a sliver of petal colour at the tip
    p.ell(hx, hy, 3.4 * k, 4.8 * k, mix(GREEN, DEAD, rot), 1.3 * u, 0, 360, (tip * 180) / Math.PI);
    const [tx, ty] = [hx + Math.sin(tip) * 3.4 * k, hy - Math.cos(tip) * 3.4 * k];
    p.ell(tx, ty, 1.6 * k, 2.2 * k, petal, 0, 0, 360, (tip * 180) / Math.PI);
  } else {
    const n = 6, R = (3 + 5.5 * open) * k, keep = Math.round(n * (1 - 0.35 * rot)); // rotten: 4 of 6 petals left, drooping
    for (let i = 0; i < n; i++) {
      if (i >= keep) continue; // rotten flowers have lost petals
      const a = (i / n) * Math.PI * 2 + rnd(seed, 7) * 2 + tip, sag = rot * 0.9;
      const px = hx + Math.cos(a) * R * 0.62, py = hy + Math.sin(a) * R * 0.62 + sag * R * 0.5 * (1 + Math.sin(a));
      p.ell(px, py, R * 0.52, R * (0.34 - 0.12 * rot), petal, 1.3 * u, 0, 360, (a * 180) / Math.PI);
    }
    p.dot(hx, hy, (1.6 + 1.6 * open) * k, ctr);
  }
  if (rot > 0.6) {
    const F = f.F ?? 0, s = rot - 0.6;
    // stink lines rising
    if (f.stink !== false) for (let i = 0; i < 2; i++) {
      const ox = hx + (i ? 5 : -4) * k, base = hy - 7 * k, ph = F / 9 + i * 2 + seed;
      const w = (yy: number) => ox + Math.sin(ph + yy * 0.25) * 2.2 * k;
      const pts: P2[] = [0, 4, 8, 12].map((d) => [w(d), base - d * k * (0.8 + s)]);
      p.stroke(pts, 2.4 * u, "#9ccd5a");
    }
    // a fly orbiting
    if (f.flies === false) return;
    const fa = F / 5 + seed * 2, fx = hx + Math.cos(fa) * 10 * k, fy = hy - 4 * k + Math.sin(fa * 1.3) * 5 * k;
    p.ell(fx - 1.6 * k, fy - 1.6 * k, 1.6 * k, 1.0 * k, "#e8eef8", 0.7 * u, 0, 360, -30);
    p.ell(fx + 1.6 * k, fy - 1.6 * k, 1.6 * k, 1.0 * k, "#e8eef8", 0.7 * u, 0, 360, 30);
    p.dot(fx, fy, 1.4 * k, INK);
  }
};

/** A coat of flowers over the whole torso (Derek's 1,000): `fake` blooms glued on, sliding down by `slide` (0..1+)
 * to reveal the rotten real ones underneath (`rotten` 0 hides them). Use as a Look `outfit` layer. */
export const flowerCoat = (base: string, cols: string[], o: { slide?: number; rotten?: number; F?: number } = {}): Layer => (p, t) => {
  const { cx, top, bot, u, a } = t, x0 = cx - 1.3 * a, x1 = cx + 1.3 * a, h = bot - top;
  p.poly([[x0 - 20 * u, top - 20 * u], [x1 + 20 * u, top - 20 * u], [x1 + 20 * u, bot + 20 * u], [x0 - 20 * u, bot + 20 * u]], base);
  const slide = o.slide ?? 0, rotten = o.rotten ?? 0;
  const grid = (fn: (x: number, y: number, i: number) => void) => {
    let i = 0;
    for (let y = top + 4 * u, row = 0; y < bot + 6 * u; y += 15 * u, row++)
      for (let x = x0 + (row % 2) * 8 * u; x < x1; x += 16 * u, i++) fn(x + (rnd(i, 2) - 0.5) * 5 * u, y + (rnd(i, 4) - 0.5) * 4 * u, i);
  };
  if (rotten > 0) grid((x, y, i) => drawFlower(p, x, y + 6 * u, u, { at: { part: "torso", x: 0, y: 0 }, color: cols[i % cols.length], open: 0.5, rot: rotten, size: 0.7, ang: (rnd(i, 5) - 0.5) * 70, seed: i, F: o.F }));
  if (slide < 1.2) {
    const dy = slide * slide * h * 1.4;
    grid((x, y, i) => {
      const c = cols[i % cols.length], yy = y + dy * (0.8 + 0.4 * rnd(i, 6));
      if (yy > bot + 14 * u) return;
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + i;
        p.ell(x + Math.cos(ang) * 4.6 * u, yy + Math.sin(ang) * 4.6 * u, 4.4 * u, 3.2 * u, c, 0.9 * u, 0, 360, (ang * 180) / Math.PI);
      }
      p.dot(x, yy, 2.2 * u, "#f4c430");
    });
  }
};
