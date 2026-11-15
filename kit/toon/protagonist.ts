import { drawPerson } from "./figure";
import type { CharState, Look, Torso } from "./figure";
import type { Head } from "./face";
import { BUILD, Pen, SH_HAIR, clamp, mul, rnd } from "./toon";
import type { P2 } from "./toon";

export { EXPRESSIONS } from "./face";
export type { Effects, Expr } from "./face";
export type { PropName } from "./figure";

/**
 * The protagonist ("you", LOOK_SPEC section 2): the same character in every video. Redesign 2026-11-13: an
 * oversized rust hoodie #c8582c (the channel's signature accent) with the hood bunched behind the neck, cream
 * drawstrings, a kangaroo pocket and a ribbed hem; dark joggers; chunky white sneakers; soft messy curtain-fringe
 * hair in fluffy clumps. Reads in silhouette by the hood behind the jaw and the clumpy fringe. Darks stay at
 * L* >= 19 (hair and joggers are coloured darks, not black).
 * Upgrade 2026-11-15 (user: "a much better look, a lot more angles"): a full turnaround (front, 3/4, profile, 3/4
 * back, back, both sides; `turns`), hair with volume (shine band, crown-to-tip strands), hoodie folds and a lined
 * hood, headphones resting round the neck (the signature accessory), a rust stripe on the sneakers.
 */
export const YOU = {
  hair: "#4a3226",
  hairLight: "#7a5440",
  hairShine: "#9a6c52",
  hoodie: "#c8582c",
  hoodieDark: "#a8441f",
  hoodieLight: "#e07a4c",
  lining: "#f0c9a8",
  rib: "#8e3818",
  cord: "#f1e6d2",
  joggers: "#30364a",
  sneakers: "#f4f1ea",
  phones: "#34384a",
  phonesLight: "#5a6074",
};

const rect = (x: number, y: number, w: number, h: number): P2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
/** View terms from a signed yaw (deg): the side faced (+1 = card-right), |sin|, cos. */
const view = (yaw: number) => {
  const r = (yaw * Math.PI) / 180;
  return { side: yaw < 0 ? -1 : 1, sn: Math.abs(Math.sin(r)), cs: Math.cos(r) };
};
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40): P2[] =>
  Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * rx, cy + Math.sin((i / n) * Math.PI * 2) * ry] as P2);

/**
 * Hoodie: hem, joggers and folds in every view; from the front (|yaw| < ~57 deg) the collar, drawstrings and kangaroo
 * pocket, slid toward the side faced and foreshortened; in profile the pocket edge and one string at the front edge;
 * from behind a centre seam.
 */
const outfit = (p: Pen, t: Torso) => {
  const { cx, top, bot, chin, u, a } = t, h = bot - top, hem = top + h * 0.86, line = 1.6 * u, V = view(t.yaw);
  // Joggers below the hem.
  p.poly(rect(cx - 80 * u, hem, 160 * u, bot - hem + 10 * u), YOU.joggers);
  // Ribbed hem band.
  const band = rect(cx - 80 * u, hem - 8 * u, 160 * u, 8 * u);
  p.poly(band, YOU.rib);
  p.clip(band, () => {
    for (let x = cx - 80 * u; x < cx + 80 * u; x += 4 * u) p.stroke([[x, hem - 8 * u], [x, hem]], 0.7 * u, mul(YOU.rib, [0.78, 0.78, 0.8]));
  });
  p.stroke([[cx - 80 * u, hem - 8 * u], [cx + 80 * u, hem - 8 * u]], line);
  p.stroke([[cx - 80 * u, hem], [cx + 80 * u, hem]], line);
  // Folds: soft creases from under the arms toward the middle (the fabric is oversized).
  const fold = mul(YOU.hoodieDark, [0.86, 0.86, 0.9]);
  for (const s of [-1, 1]) {
    const x0 = cx + s * 0.78 * a, y0 = top + 0.34 * h;
    p.stroke([[x0, y0], [x0 - s * 0.16 * a, y0 + 0.1 * h], [x0 - s * 0.24 * a, y0 + 0.2 * h]], 1.8 * u, fold);
  }
  p.stroke([[cx - 0.2 * a, hem - 12 * u], [cx, hem - 22 * u], [cx + 0.25 * a, hem - 13 * u]], 1.5 * u, fold);

  if (V.cs < -0.3) {
    // Back: a centre seam under the hood.
    p.stroke([[cx, top + 0.3 * h], [cx, hem - 8 * u]], 1.4 * u, fold);
    return;
  }
  if (V.cs < 0.55) {
    // Profile: the pocket's side edge and one drawstring at the front of the chest.
    const fx = cx + V.side * 0.72 * a, py0 = top + 0.55 * h, py1 = hem - 10 * u;
    p.poly([[fx, py0], [fx + V.side * 30 * u, py0], [fx + V.side * 30 * u, py1], [fx - V.side * 6 * u, py1]], YOU.hoodieDark, line);
    const x0 = cx + V.side * 0.62 * a, y0 = chin + 8 * u;
    p.stroke([[x0, y0], [x0 + V.side * 3 * u, y0 + 15 * u], [x0 + V.side * 2 * u, y0 + 30 * u]], 2.4 * u, YOU.cord);
    p.dot(x0 + V.side * 2 * u, y0 + 31.5 * u, 2 * u);
    p.stroke([[cx - V.side * 0.1 * a, top + 0.12 * h], [cx - V.side * 0.05 * a, hem - 8 * u]], 1.3 * u, fold); // side seam
    return;
  }
  // Front and 3/4: the details slide toward the side faced and foreshortened.
  const g = p.g, k = 0.55 + 0.45 * V.cs, fcx = cx + V.side * 0.5 * a * V.sn;
  g.save();
  g.translate(fcx, 0);
  g.scale(k, 1);
  g.translate(-cx, 0);
  const f = 4 * u * t.facing * (1 - V.sn);
  // Kangaroo pocket: a wide trapezoid with slanted openings at both sides.
  const py0 = top + 0.55 * h, py1 = hem - 10 * u;
  const pocket: P2[] = [[cx + f - 19 * u, py0], [cx + f + 19 * u, py0], [cx + f + 27 * u, py1], [cx + f - 27 * u, py1]];
  p.poly(pocket, YOU.hoodieDark, line);
  for (const s of [-1, 1]) p.stroke([[cx + f + s * 19 * u, py0 + 1 * u], [cx + f + s * 25 * u, py0 + 0.55 * (py1 - py0)]], 1.2 * u, mul(YOU.hoodieDark, [0.7, 0.7, 0.7]));
  // Hood collar: a soft U of folded fabric just under the chin.
  const collar: P2[] = [];
  for (let i = 0; i <= 16; i++) {
    const an = Math.PI * (i / 16);
    collar.push([cx + f * 0.5 + Math.cos(an) * 30 * u, chin - 2 * u + Math.sin(an) * 15 * u]);
  }
  for (let i = 16; i >= 0; i--) {
    const an = Math.PI * (i / 16);
    collar.push([cx + f * 0.5 + Math.cos(an) * 20 * u, chin - 2 * u + Math.sin(an) * 7 * u]);
  }
  p.poly(collar, YOU.hoodieLight, line);
  // Drawstrings with ink aglets, swinging a little toward the facing side.
  for (const s of [-1, 1]) {
    const x0 = cx + f * 0.5 + s * 8 * u, y0 = chin + 8 * u, x1 = x0 + s * 1.5 * u + f * 0.4, y1 = y0 + 30 * u;
    p.stroke([[x0, y0], [(x0 + x1) / 2 + s * 1.2 * u, (y0 + y1) / 2], [x1, y1]], 2.4 * u, YOU.cord);
    p.dot(x1, y1 + 1.5 * u, 2 * u);
  }
  g.restore();
};

/**
 * Behind the head (drawn over the hoodie, under the head): the hood and the headphones. Front: the hood bunched
 * behind the neck (shows past the jaw on both sides: the silhouette cue) and two ear cups resting under the jaw.
 * Profile: the hood bunched behind the nape, one cup at the neck. Back: the hood lies on the shoulders, lined, the
 * headphone band across the nape.
 */
const hood = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u } = h, V = view(h.yaw ?? 0);
  const cup = (x: number, y: number, rx: number, ry: number) => {
    p.ell(x, y, rx, ry, YOU.phones, 2.6 * u);
    p.ell(x, y, rx * 0.62, ry * 0.66, null, 1.6 * u, 0, 360, 0, YOU.phonesLight);
    p.ell(x - 1.5 * u, y - 2.5 * u, rx * 0.3, ry * 0.25, YOU.phonesLight);
  };
  if (V.cs < -0.3) {
    // Back: the hood lies on the upper back, its lining showing at the top edge.
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = Math.PI * (i / 24); // across the shoulders and down to a soft point
      pts.push([cx + Math.cos(t) * 1.05 * a, cy + 0.55 * b + Math.sin(t) * (0.95 * b + 0.25 * b * Math.sin(t))]);
    }
    p.shadedFill(pts, YOU.hoodieDark, SH_HAIR, a);
    p.inkRing(pts, 0.8 * 5 * u);
    p.arc(cx, cy + 0.62 * b, 0.82 * a, 0.3 * b, 0, 180, 3 * u, YOU.lining);
    p.stroke([[cx - 0.62 * a, cy + 0.98 * b], [cx, cy + 1.06 * b], [cx + 0.62 * a, cy + 0.98 * b]], 4.5 * u, YOU.phones); // band
    for (const s of [-1, 1]) cup(cx + s * 0.78 * a, cy + 0.95 * b, 6 * u, 11 * u);
    return;
  }
  const hx = cx - V.side * (0.1 + 0.65 * V.sn) * a, w = 1.16 - 0.5 * V.sn;
  const pts = ellPts(hx, cy + 0.5 * b, w * a, 0.56 * b, 48);
  p.shadedFill(pts, YOU.hoodieDark, SH_HAIR, a);
  p.inkRing(pts, 0.8 * 5 * u);
  if (V.cs < 0.55) {
    // Profile: the band runs up behind the jaw to one cup at the throat side.
    p.stroke([[cx - V.side * 0.35 * a, cy + 0.9 * b], [cx + V.side * 0.2 * a, cy + 1.08 * b]], 4.5 * u, YOU.phones);
    cup(cx + V.side * 0.26 * a, cy + 1.05 * b, 8 * u, 13 * u);
    return;
  }
  // Front / 3/4: both cups under the jaw, the far one smaller and tucked in.
  const fc = cx + V.side * 0.45 * a * V.sn;
  for (const s of [-1, 1]) {
    const far = V.sn > 0.05 && s !== V.side, k = far ? 1 - 0.4 * V.sn : 1;
    cup(fc + s * 0.62 * a * (1 - 0.35 * V.sn), cy + 1.04 * b, 11 * u * k, 14 * u);
  }
};

/**
 * Hair: soft messy curtain fringe that covers the head for every view. The lower edge (the hairline) is a fringe of
 * pointed locks across the face, short sideburns beside it and the nape behind it, so turning the head slides the
 * face out from under the hair and the back of the head fills in. The cap follows the skull a little outside it with
 * fluffy clumps; a shine band and crown-to-tip strands give it volume.
 */
const hair = (p: Pen, h: Head) => {
  const { cx, cy, a, b, u, pts } = h, V = view(h.yaw ?? 0);
  // Face window in head-x units, measured toward the side faced: its centre slides out and it narrows as the head
  // turns; from 3/4 behind there is none.
  const faceW = 0.86 * Math.max(V.cs, 0) + (V.cs >= -0.2 ? 0.42 * V.sn : 0), faceC = V.cs >= 0 ? 0.62 * V.sn : 0.62 - 0.6 * V.cs;
  const d0 = clamp(h.facing * 3 + 0.5, -1, 1), part = 0.28 * d0;
  /** Hairline height (in b, + = down) at head-x xn. */
  const line = (xn: number) => {
    const f = xn * V.side;
    if (faceW <= 0.05) {
      // From behind: down to the nape all round; from 3/4 behind a sliver of cheek shows at the leading edge.
      const cheek = clamp((f - 0.55) / 0.3, 0, 1) * clamp((-V.cs - 0.2) / 0.3, 0, 1) * clamp((V.sn - 0.2) / 0.3, 0, 1);
      return 0.88 + (-0.1 - 0.88) * cheek * cheek * (3 - 2 * cheek);
    }
    const d = (f - faceC) / faceW;
    if (Math.abs(d) <= 1) {
      // Fringe: high at the part, lowest beside it, rising to the sideburns at the face's edges.
      const near = Math.min(Math.abs(d - part * V.side * (1 - V.sn)) / 0.36, 1);
      const y = -(0.66 - 0.16 * near * near * (3 - 2 * near));
      // Sideburns at the face's edges; on the leading edge only while the face still looks at us (a profile's
      // forehead edge keeps the fringe).
      const sideK = clamp((Math.abs(d) - 0.72) / 0.28, 0, 1) * (d > 0 ? clamp(V.cs / 0.7, 0, 1) : 1);
      return y + (-0.08 - y) * sideK * sideK;
    }
    if (d > 1) return V.cs > 0.7 ? -0.08 : -0.5; // past the face's leading edge: sideburn from the front, fringe in profile
    // Behind the face: sideburn level over the ear, then down to the nape.
    const back = clamp(((-d - 1) * faceW - 0.4) / 0.3, 0, 1);
    return -0.08 + 0.78 * back * back * (3 - 2 * back);
  };
  const n = pts.length, cap: P2[] = [], start = Math.round(n / 4);
  const covered = (q: P2) => (q[1] - cy) / b < line((q[0] - cx) / a);
  let first = -1, last = -1;
  for (let k = 0; k < n; k++) {
    const q = pts[(start + k) % n];
    if (!covered(q)) continue;
    if (first < 0) first = k;
    last = k;
    const [x, y] = q, th = Math.atan2(y - cy, x - cx);
    const clump = 0.055 * Math.max(0, Math.sin(7 * th + 0.6)) ** 1.5 + 0.03 * Math.max(0, Math.sin(11 * th + 2.1)) ** 2;
    const kk = 1.07 + clump;
    cap.push([cx + (x - cx) * kk, cy + (y - cy) * kk]);
  }
  if (first < 0) return;
  // Inner edge back along the hairline, from the last covered outline point to the first: irregular curved locks
  // (width, depth and lean vary per lock; an even zigzag read as saw teeth at profile-picture size). Locks are fixed
  // to the head, not to the hairline's ends, so they do not crawl as the head turns.
  const xr = pts[(start + last) % n][0], xl = pts[(start + first) % n][0], N = 72;
  const locks: { x0: number; w: number; depth: number; lean: number }[] = [];
  for (let x = cx - 1.3 * a, i = 0; x < cx + 1.3 * a; i++) {
    const w = a * (0.22 + 0.1 * rnd(i + 3, 41));
    locks.push({ x0: x, w, depth: 0.12 + 0.09 * rnd(i + 3, 42), lean: 0.35 + 0.5 * rnd(i + 3, 43) });
    x += w;
  }
  for (let i = 1; i < N; i++) {
    const x = xr + ((xl - xr) * i) / N, xn = (x - cx) / a;
    const top = -Math.sqrt(Math.max(1 - xn * xn, 0)) + 0.06;
    const y = Math.max(line(xn), top);
    const L = locks.find((q) => x >= q.x0 && x < q.x0 + q.w) ?? locks[0];
    // Concave sides to a sharp tip, swept toward the parting's far side (curtain fringe).
    const t = Math.pow((x - L.x0) / L.w, Math.exp(L.lean * (x < cx + part * a ? 1 : -1))), tip = 1 - Math.abs(2 * t - 1) ** 0.6;
    cap.push([x, cy + b * (y + tip * L.depth * (y < 0 ? 1 : 0.3))]);
  }
  p.shadedFill(cap, YOU.hair, SH_HAIR, a);
  p.clip(cap, () => {
    // Shine band across the crown (volume), then soft strands from the crown toward the tips.
    const sx = cx + V.side * 0.15 * a * V.sn;
    p.arc(sx - 0.12 * a, cy - 0.8 * b, 0.4 * a, 0.14 * b, 205, 300, 3.4 * u, YOU.hairShine);
    p.arc(sx + 0.22 * a, cy - 0.84 * b, 0.16 * a, 0.08 * b, 210, 300, 2.6 * u, YOU.hairShine);
    for (const s of [-0.75, -0.4, -0.05, 0.3, 0.62, 0.88]) {
      const x0 = cx + (part + s * 0.25) * a, xt = cx + s * 0.95 * a, yt = cy + b * Math.max(line(s * 0.95), -0.95) - 2 * u;
      p.stroke([[x0, cy - 1.05 * b], [cx + s * 0.85 * a, (cy - 1.05 * b + yt) / 2 - 0.05 * b], [xt, yt]], 1.5 * u, YOU.hairLight);
    }
  });
  p.inkRing(cap, 0.85 * 5 * u);
};

export const youLook: Look = {
  build: BUILD.adult,
  seed: 1,
  jacket: YOU.hoodie,
  pants: YOU.joggers,
  shoes: YOU.sneakers,
  sneakers: true,
  shoeStripe: YOU.hoodie,
  outfit,
  hairBack: hood,
  hair,
  rim: true,
  turns: true,
};

/** Full protagonist card drawing. */
export const drawYou = (p: Pen, s: CharState) => drawPerson(p, youLook, s);
