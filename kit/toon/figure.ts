import { drawFace, drawFill } from "./face";
import { drawFlower } from "./flowers";
import type { Flower } from "./flowers";
import type { Effects, Expr, Head } from "./face";
import { REST } from "./poses";
import type { Arm, Pose } from "./poses";
import { CREAM, DESIGN, INK, INK_K, Pen, SH_CLOTH, SH_PALE, blobPts, clamp, headBlob, inkWeight, mix, rad } from "./toon";
import type { Blob, Build, P2 } from "./toon";

/**
 * Body v2 (LOOK_SPEC section 1, characters.md 2.6 / 3 `bodyFrontV2`): bean torso widest low with a round bottom, its
 * top hidden under the head (no neck); legs, arms and feet are single strokes in a darkened cloth colour; hands are
 * ink dots; arms come out from behind the bean and hang outside it. Our pose library (poses.ts) drives the hands
 * (2-bone IK, elbows bend outward), lifts, bob, sway, tilt, lean, shrug and squash.
 */
export type Torso = { pts: P2[]; cx: number; cy: number; a: number; b: number; top: number; bot: number; chin: number; u: number; HH: number; facing: number; yaw: number };

/** What a character looks like. Heads are always cream (identity); variety comes from build, clothes, hair, hats. */
export type Look = {
  build: Build;
  /** Per-character seed: head shape, tilt, noise. */
  seed: number;
  jacket: string;
  pants: string;
  shoes: string;
  /** Torso contents, drawn clipped to the bean before its shading. */
  outfit?: (p: Pen, t: Torso) => void;
  /** Hair or hat, after the head and before the face. */
  hair?: (p: Pen, h: Head) => void;
  /** Behind the head (buns). */
  hairBack?: (p: Pen, h: Head) => void;
  /** Over the face (glasses, moustache). */
  face?: (p: Pen, h: Head) => void;
  /** Brimmed hat: brows sit lower. */
  brim?: boolean;
  /** Light rim on the torso's shadow edge. */
  rim?: boolean;
  /** Shorts colour: bare legs below a short trouser leg (wardrobe; `pants` then colours only the hem band). */
  shorts?: string;
  /** Socks colour: a thick sock band above the shoe (socks-and-sandals, striped sports socks...). */
  socks?: string;
  /** Chunky sneakers: inked outline, `shoes` fill and a sole line (instead of a plain foot stroke). */
  sneakers?: boolean;
  /** A colour stripe along the sneakers' side. */
  shoeStripe?: string;
  /** Turnaround (2026-11-15): the look draws every view from `pose.yaw` (front, 3/4, profile, back). Its outfit, hair
   * and hairBack read `torso.yaw` / `head.yaw`. Looks without it always draw the front view. */
  turns?: boolean;
  /** Head colour; default CREAM. Zombies are green. */
  skin?: string;
};

export type PropName = "phone" | "flashlight" | "box" | "can" | "mug" | "lantern" | "tape";
/** `heading`: world yaw (rad, three.js rotation.y) the character faces; the card turns it into `pose.yaw` against the
 * camera (cast.ts), so a turning look shows the right view in every shot. */
/** `flowers` (promise-flowers): things growing out of the body, drawn in their body part's frame (kit flowers.ts). */
export type CharState = { pose: Pose; expr: Expr; blink: boolean; fx: Effects; prop?: PropName; heading?: number; flowers?: Flower[] };

/**
 * The view angle (deg, figure.ts `pose.yaw`) of a character facing world `heading` (rad, three.js rotation.y) at `at`,
 * seen from `cam`: 0 = facing the lens, +90 = facing card-right, 180 = back to the lens. Rounded to 3 deg so a
 * drifting camera does not redraw the card every frame.
 */
export const viewYaw = (heading: number, at: { x: number; z: number }, cam: { x: number; z: number }) => {
  const d = ((heading - Math.atan2(cam.x - at.x, cam.z - at.z)) * 180) / Math.PI;
  return Math.round(((((d + 180) % 360) + 360) % 360 - 180) / 3) * 3;
};
/** The view a look is drawn in: yaw (deg, -180..180), the side it faces (+1 card-right), |sin|, cos. */
export const viewOf = (look: Look, pose: Pose) => {
  const yaw = look.turns ? ((((pose.yaw ?? 0) + 180) % 360) + 360) % 360 - 180 : 0, r = rad(yaw);
  return { yaw, side: (yaw < 0 ? -1 : 1) as 1 | -1, sn: Math.abs(Math.sin(r)), cs: Math.cos(r) };
};

const { SOLE } = DESIGN;
/** Seat height (m) a seated pose (`pose.sit` 1) puts the bottom of the torso at: a lawn or dining chair. */
export const SEAT_M = 0.38;
const CX = DESIGN.W / 2;

/** Landmarks for a look in a pose (design px). Total height = (1 + torso + legs) head heights. */
export const layout = (look: Look, pose: Pose = REST) => {
  const B = look.build, V = viewOf(look, pose), stoop = B.stoop ?? 0;
  // Turned views lean the head shape and features toward the side faced (profile = fully one-sided).
  const facing = clamp(pose.look * (1 - V.sn) + V.side * V.sn, -1, 1);
  const H = headBlob(look.seed, B.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  // Seated: the bean bottom rests at chair-seat height (SEAT_M, the same for every build: chairs are world props).
  const sit = pose.sit ?? 0, hip = B.legs * HH;
  const torsoBot = SOLE - (hip + (Math.min(hip, SEAT_M * DESIGN.PX_PER_M) - hip) * sit) - pose.bob;
  const chin = torsoBot - B.torso * HH;
  const fwd = facing < 0 ? -1 : 1;
  const hx = CX + stoop * 0.1 * W * fwd;
  const hc = chin - H.b + stoop * 0.1 * HH + (pose.lean ?? 0) * 0.08 * HH - (pose.shrug ?? 0) * 0.3;
  return { H, W, HH, u, torsoBot, chin, hx, hc, facing, fwd, stoop, V };
};

/** Head centre above the soles (m), standing at rest (or in `pose`, e.g. `{ ...REST, sit: 1 }`). */
export const headHeight = (look: Look, pose: Pose = REST) => (SOLE - layout(look, pose).hc) / DESIGN.PX_PER_M;

/** Acceptance numbers (LOOK_SPEC section 4) from the same geometry that is drawn. */
export const measureLook = (look: Look) => {
  const L = layout(look);
  const pts = blobPts(0, 0, { ...L.H, rot: 0 });
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const hh = Math.max(...ys) - Math.min(...ys), hw = Math.max(...xs) - Math.min(...xs);
  return { heads: (SOLE - (L.hc + Math.min(...ys))) / hh, hw: hh / hw, thickThin: (1 + INK_K) / (1 - INK_K), meters: (SOLE - L.hc + hh / 2) / DESIGN.PX_PER_M };
};

type Solved = { S: P2; E: P2; H: P2; side: number; a: Arm; front: boolean };

/** 2-bone arm from shoulder S: hand target in arm lengths (x outward, y down), elbow out-and-down (bend +1). */
const solveArm = (S: P2, dir: number, a: Arm, half: number): Omit<Solved, "front"> => {
  const side = dir < 0 ? -1 : 1; // dir: front view +-1 (outward); turned views blend toward the side faced
  let H: P2 = [S[0] + dir * a.at[0] * 2 * half, S[1] + a.at[1] * 2 * half];
  let dx = H[0] - S[0], dy = H[1] - S[1], d = Math.hypot(dx, dy);
  const max = 2 * half * 0.995;
  if (d > max) {
    const k = max / d;
    H = [S[0] + dx * k, S[1] + dy * k];
    dx *= k;
    dy *= k;
    d = max;
  }
  const ux = dx / d, uy = dy / d, h = Math.sqrt(Math.max(half * half - (d / 2) ** 2, 0));
  const mid: P2 = [S[0] + dx / 2, S[1] + dy / 2];
  let E: P2 = [mid[0] - uy * h, mid[1] + ux * h];
  if (((E[0] - mid[0]) * side * 0.5 + (E[1] - mid[1])) * (a.bend ?? 1) < 0) E = [mid[0] + uy * h, mid[1] - ux * h];
  return { S, E, H, side, a };
};

/** Torso size and both arms for a look in a pose (shared by drawPerson and handsOf so held props stay in the hand). */
const armRig = (look: Look, pose: Pose, L: ReturnType<typeof layout>) => {
  const B = look.build, { W, HH, u, chin, facing, V } = L;
  const Ta = (((B.tw / 2) * W) / 1.06) * (1 - 0.3 * V.sn); // a turned torso is narrower (profile 70 %)
  const tcx = CX + 3 * u * facing + V.side * 4 * u * V.sn, sy = chin + 0.12 * HH - (pose.shrug ?? 0);
  const arms = pose.arms.map((a, i) => {
    const side = i === 0 ? -1 : 1, near = side === V.side;
    // Shoulders close in as the body turns (profile: both at the centre); hands swing toward the side faced, the
    // far hand 6u behind so both read.
    const S: P2 = [tcx + side * 0.85 * Ta * Math.max(Math.abs(V.cs), 0), sy];
    const dir = side + (V.side - side) * V.sn;
    // R28: a forward/back swing (Arm.fwd) moves the hand toward the side faced in turned views and lifts it a little
    // in the front view (foreshortened toward or away from the lens).
    const fw = (a.fwd ?? 0) * 0.95 * HH, at: [number, number] = [a.at[0] + (V.side * V.sn * fw) / (dir * 0.95 * HH || 1) * (Math.abs(dir) > 0.25 ? 1 : 0), a.at[1] - Math.abs(a.fwd ?? 0) * 0.18 * Math.abs(V.cs)];
    const r = solveArm(S, dir, { ...a, at }, 0.475 * HH);
    if (Math.abs(dir) <= 0.25) r.H = [r.H[0] + V.side * V.sn * fw, r.H[1]]; // far arm crossing the body: shift the hand directly
    if (!near && V.sn > 0.5) r.H = [r.H[0] - V.side * 6 * u * V.sn, r.H[1]];
    return { ...r, near };
  });
  return { Ta, tcx, sy, arms };
};

/** Ink-dot hand (refs: a small dot a little wider than the arm); pointing adds one finger stroke along the forearm. */
const hand = (p: Pen, s: Solved, u: number) => {
  const grip = s.a.grip ?? "mitt";
  p.dot(s.H[0], s.H[1], (grip === "open" ? 4.2 : 3.6) * u);
  if (grip === "point") {
    const l = Math.hypot(s.H[0] - s.E[0], s.H[1] - s.E[1]) || 1;
    p.stroke([s.H, [s.H[0] + ((s.H[0] - s.E[0]) / l) * 8 * u, s.H[1] + ((s.H[1] - s.E[1]) / l) * 8 * u]], 2.4 * u);
  }
};

const drawProp = (p: Pen, name: CharState["prop"], arms: Solved[], u: number) => {
  if (!name) return;
  const [l, r] = [arms[0].H, arms[1].H], w = 3 * u;
  // Between the hands when they meet; when one hand is busy elsewhere (eating, pointing, waving: hands > 45u apart)
  // the prop stays in the LOWER hand, never floating at the midpoint (pilot defect 2026-11-14: a can on the chest).
  const apart = Math.hypot(r[0] - l[0], r[1] - l[1]) > 45 * u, low = l[1] >= r[1] ? l : r;
  const mx = apart ? low[0] : (l[0] + r[0]) / 2, my = apart ? low[1] : (l[1] + r[1]) / 2;
  const rect = (x: number, y: number, rw: number, rh: number): P2[] => [[x, y], [x + rw, y], [x + rw, y + rh], [x, y + rh]];
  if (name === "box") {
    const bw = apart ? 44 * u : Math.max(Math.abs(r[0] - l[0]) - 4 * u, 44 * u);
    p.poly(rect(mx - bw / 2, my - 26 * u, bw, 36 * u), "#d8a868", w);
    p.poly(rect(mx - 4 * u, my - 26 * u, 8 * u, 36 * u), "#f0dca8");
    p.stroke([[mx - bw / 2, my - 17 * u], [mx + bw / 2, my - 17 * u]], 1.6 * u);
  } else if (name === "can") {
    p.poly(rect(mx - 11 * u, my - 22 * u, 22 * u, 30 * u), "#c9ced4", w);
    p.poly(rect(mx - 11 * u, my - 15 * u, 22 * u, 16 * u), "#3a8ad8");
    p.dot(mx + 2 * u, my - 7 * u, 4 * u, "#f2c84a");
    p.poly(rect(mx - 11 * u, my - 22 * u, 22 * u, 30 * u), null, w);
  } else if (name === "mug") {
    const [hx, hy] = r;
    p.poly(rect(hx - 9 * u, hy - 20 * u, 18 * u, 22 * u), "#f2ece2", w);
    p.arc(hx + 11 * u, hy - 9 * u, 5 * u, 6 * u, -90, 90, 2.4 * u);
    p.poly(rect(hx - 9 * u, hy - 14 * u, 18 * u, 5 * u), "#2f8f86");
    for (const dx of [-3, 3]) p.stroke([[hx + dx * u, hy - 24 * u], [hx + (dx + 2) * u, hy - 30 * u], [hx + dx * u, hy - 36 * u]], 1.4 * u, "#d8d2cc"); // steam
  } else if (name === "lantern") {
    // Held low at the side by its bail: dark frame, warm glass (pair it with glowSprite for the halo).
    const [hx, hy] = r;
    p.arc(hx, hy + 4 * u, 6 * u, 6 * u, 180, 360, 1.8 * u);
    p.poly(rect(hx - 8 * u, hy + 6 * u, 16 * u, 4 * u), "#4a4058", w);
    p.poly(rect(hx - 7 * u, hy + 10 * u, 14 * u, 18 * u), "#ffd27a", w);
    p.poly(rect(hx - 9 * u, hy + 28 * u, 18 * u, 4 * u), "#4a4058", w);
  } else if (name === "tape") {
    // A roll in the left hand, the strip pulled out to the right hand (its length is however far apart the hands are).
    p.stroke([[l[0], l[1] - 4 * u], [r[0], r[1] - 4 * u]], 7 * u, "#e9e2c6");
    p.stroke([[l[0], l[1] - 7.5 * u], [r[0], r[1] - 7.5 * u]], 1.4 * u);
    p.stroke([[l[0], l[1] - 0.5 * u], [r[0], r[1] - 0.5 * u]], 1.4 * u);
    p.dot(l[0], l[1] - 4 * u, 11 * u, "#d9cfa8");
    p.arc(l[0], l[1] - 4 * u, 11 * u, 11 * u, 0, 360, w);
    p.dot(l[0], l[1] - 4 * u, 5 * u, "#8a7a5a");
  } else if (name === "phone") {
    const [hx, hy] = r;
    p.poly(rect(hx - 8 * u, hy - 24 * u, 16 * u, 27 * u), "#3a3048", w);
    p.poly(rect(hx - 5.5 * u, hy - 21 * u, 11 * u, 19 * u), "#9fd8ff");
  } else {
    const [hx, hy] = r;
    p.poly(rect(hx - 5 * u, hy - 30 * u, 10 * u, 34 * u), "#4a4058", w);
    p.poly(rect(hx - 7.5 * u, hy - 36 * u, 15 * u, 8 * u), "#ffe7a0", w);
  }
};

/**
 * Where the hands are drawn (design px, [left, right] as seen on the card), with the same arm solve, torso sway and
 * reaction squash as drawPerson. Held props must sit here (cast.ts `handWorld`; the QA guard checks `MovingProp.hand`).
 */
export const handsOf = (look: Look, pose: Pose): [P2, P2] => {
  const L = layout(look, pose), { torsoBot, fwd, stoop } = L;
  const ang = rad(pose.sway + stoop * 4 * fwd), sq = (pose.squash ?? 0) * 0.08;
  return armRig(look, pose, L).arms.map(({ H }) => {
    // sway: rotate about (CX, torsoBot); squash: scale about (CX, SOLE)
    const dx = H[0] - CX, dy = H[1] - torsoBot;
    const x = CX + dx * Math.cos(ang) - dy * Math.sin(ang), y = torsoBot + dx * Math.sin(ang) + dy * Math.cos(ang);
    return [CX + (x - CX) * (1 + sq), SOLE + (y - SOLE) * (1 - sq)] as P2;
  }) as [P2, P2];
};

/** Draws a whole character in its view (front unless the look `turns`): legs, back arms, torso + clothing, props,
 * front arms, head, face. */
export const drawPerson = (p: Pen, look: Look, s: CharState) => {
  const g = p.g, pose = s.pose, L = layout(look, pose), B = look.build, flowers = s.flowers ?? [];
  const { H, W, HH, u, torsoBot, chin, facing, fwd, stoop, V } = L;
  const ow = 3 * u; // R28: refs' outline is ~2 % of the head width (was 5u, twice as heavy)
  p.weight = inkWeight(B, look.seed);
  p.seed = look.seed;
  const sq = (pose.squash ?? 0) * 0.08;
  g.save();
  g.translate(CX, SOLE);
  g.scale(1 + sq, 1 - sq);
  g.translate(-CX, -SOLE);

  // Legs: thin ink lines from the hips, slight bow, A-stance; feet = small dark rounded shoes pointing outward
  // (cast redesign 2026-11-15 from the reference videos: limbs ~3 % of the head width, the outline's colour).
  const skin = look.skin ?? CREAM, LIMB = 2.6 * u;
  // Turned views: the stance narrows (profile 30 %), toes and knees point the way the body faces, the far leg is
  // drawn first; from behind the feet shrink to heels.
  const spread = 0.3 + 0.7 * Math.abs(V.cs), toeK = V.cs < 0 ? 1 + 0.7 * V.cs : 1;
  const legOrder: (-1 | 1)[] = V.sn > 0.3 && V.side < 0 ? [1, -1] : [-1, 1];
  // Seated (pose.sit): thighs come forward (front view: short, out to knees just under the torso; turned: level toward
  // the side faced), shins drop to the soles. Drawn over the torso so the lap reads in front of the body.
  const sit = pose.sit ?? 0, thigh = 0.42 * B.legs * HH;
  const drawLegs = () => legOrder.forEach((side) => {
    const i = side < 0 ? 0 : 1, lift = pose.lift[i] * (1 - sit), dir = side + (V.side - side) * V.sn;
    const hx = CX + side * 11 * u * spread, hy = torsoBot - 0.12 * HH;
    const fwdX = V.side * thigh * V.sn * sit; // turned: knees and feet ahead of the hips
    const stride = (pose.stride?.[i] ?? 0) * (1 - sit) * V.side * V.sn; // R28: the step shows when we see the body turned
    const fx = CX + side * (17 * u + 6 * u * sit - lift * 0.15) * spread + (lift > 2 ? pose.reach ?? 0 : 0) * u * dir + fwdX + stride, fy = SOLE - 3 * u - lift;
    // R24 (visual-ref8/9: squats to pick things up, knees bent under a load): legs keep their length, so a lowered hip
    // (negative bob) or a lifted foot folds the knee outward instead of shortening the leg.
    const rest = Math.hypot(hx - fx, B.legs * HH + 0.12 * HH - 3 * u), d = Math.hypot(hx - fx, hy - fy);
    const fold = sit > 0 ? 0 : Math.sqrt(Math.max(rest * rest - d * d, 0)) / 2;
    const bow = dir * Math.max(1.5 * u + (pose.knee ?? 0) * 0.35 + lift * 0.25 + stoop * 3 * u, fold);
    const stand: P2 = [(hx + fx) / 2 + bow, (hy + fy) / 2], knee: P2 = [CX + side * 30 * u * spread + fwdX, torsoBot + 12 * u];
    const leg: P2[] = [[hx, hy], [stand[0] + (knee[0] - stand[0]) * sit, stand[1] + (knee[1] - stand[1]) * sit], [fx, fy]];
    p.stroke(leg, LIMB, INK);
    // Point at t (0 hip .. 1 ankle) along the two-segment leg.
    const along = (t: number): P2 => {
      const [a, b] = t < 0.5 ? [leg[0], leg[1]] : [leg[1], leg[2]], k = t < 0.5 ? t * 2 : t * 2 - 1;
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    };
    const band = (t0: number, t1: number, w: number, col: string) => {
      p.stroke([along(t0), along((t0 + t1) / 2), along(t1)], w + 2.4 * u, INK);
      p.stroke([along(t0), along((t0 + t1) / 2), along(t1)], w, col);
    };
    if (look.shorts) band(0, 0.26, 10 * u, look.shorts);
    if (look.socks) band(0.7, 0.97, 5.5 * u, look.socks);
    const drop = lift > 2 ? 0.35 : 0; // the toe drops while the foot is off the ground
    const heel: P2 = [fx - dir * 1.5 * u, fy], toe: P2 = [fx + dir * toeK * 9 * u * Math.cos(drop), fy + 9 * u * Math.sin(drop)];
    if (look.sneakers) {
      p.stroke([heel, toe], 7.4 * u, INK);
      p.stroke([heel, toe], 4.4 * u, look.shoes);
      if (look.shoeStripe) p.stroke([[heel[0] + (toe[0] - heel[0]) * 0.25, heel[1] - 0.6 * u], [heel[0] + (toe[0] - heel[0]) * 0.65, toe[1] - 0.6 * u]], 1.6 * u, look.shoeStripe);
    } else p.stroke([heel, toe], 6 * u, mix(look.shoes, INK, 0.55));
    for (const f of flowers) if (f.at.part === "leg" && f.at.side === i) { const [x, y] = along(f.at.t); drawFlower(p, x, y, u, f); }
  });
  const lap = sit >= 0.5 && V.cs >= -0.3; // from behind, the body hides the lap
  if (!lap) drawLegs();

  // Upper body pivots around the hips.
  g.save();
  g.translate(CX, torsoBot);
  g.rotate(rad(pose.sway + stoop * 4 * fwd));
  g.translate(-CX, -torsoBot);
  const rig = armRig(look, pose, L), back = V.cs < -0.3;
  const T: Blob = { a: rig.Ta, b: 0.5 * (torsoBot - (chin - 0.25 * HH)), nTop: 2.3, nBot: 2.4, egg: 0.04 + (B.egg ?? 0) * 0.6, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: look.seed + 7 };
  const tcx = rig.tcx, tcy = torsoBot - T.b, tp = blobPts(tcx, tcy, T);
  const arms: Solved[] = rig.arms.map((r) => {
    // A hand inside the bean's outline is in front of the body (crossed arms, holding a prop). Turned: the near arm
    // is in front, the far arm behind; from behind, every arm is behind the body.
    const front = back ? false : V.sn > 0.5 ? r.near : !!s.prop || Math.abs(r.H[0] - tcx) < T.a * 0.9;
    return { ...r, front };
  });
  const drawArm = (a: Solved) => {
    p.stroke([a.S, a.E, a.H], LIMB * 0.95, INK);
    hand(p, a, u);
    const side = arms.indexOf(a); // 0 = the card-left arm, whatever the view
    for (const f of flowers) if (f.at.part === "arm" && f.at.side === side) {
      const t = f.at.t, [q, r, k] = t < 0.5 ? [a.S, a.E, t * 2] : [a.E, a.H, t * 2 - 1];
      drawFlower(p, q[0] + (r[0] - q[0]) * k, q[1] + (r[1] - q[1]) * k, u, f);
    }
  };
  const over = (a: Solved) => a.a.layer === "front" && !back; // from behind, even a face-layer arm is behind him
  arms.filter((a) => !a.front && !over(a)).forEach(drawArm);

  p.poly(tp, look.jacket);
  const torso: Torso = { pts: tp, cx: tcx, cy: tcy, a: T.a, b: T.b, top: chin - 0.25 * HH, bot: torsoBot, chin, u, HH, facing, yaw: V.yaw };
  if (look.outfit) p.clip(tp, () => look.outfit!(p, torso));
  p.shade(tp, SH_CLOTH, T.a, 0.55, 0.18);
  // R28 form: the head's soft shadow on the chest (refs: the body reads as round and under the head, not a flat cut-out).
  p.clip(tp, () => {
    const gr = g.createRadialGradient(L.hx, chin + 0.06 * HH, 0, L.hx, chin + 0.06 * HH, 0.62 * W);
    gr.addColorStop(0, "rgba(20,12,24,0.32)");
    gr.addColorStop(1, "rgba(20,12,24,0)");
    g.fillStyle = gr;
    g.fillRect(L.hx - W, chin - 0.3 * HH, 2 * W, 0.9 * HH);
  });
  if (look.rim) p.rimLight(tp, mix(look.jacket, "#ffffff", 0.45), 2 * u);
  p.inkRing(tp, ow);
  for (const f of flowers) if (f.at.part === "torso") drawFlower(p, tcx + f.at.x * T.a, tcy + f.at.y * T.b, u, f);
  if (lap) {
    // The legs hang from the hips, which the upper body's sway rotates about: undo it so the shins stay plumb.
    g.save(); g.translate(CX, torsoBot); g.rotate(-rad(pose.sway + stoop * 4 * fwd)); g.translate(-CX, -torsoBot);
    drawLegs();
    g.restore();
  }
  if (!back) drawProp(p, s.prop, arms, u); // from behind, the body hides what the hands hold
  arms.filter((a) => a.front && !over(a)).forEach(drawArm);

  // Head: tilts around the chin with its own random rot; hair, face and hats are drawn in the rotated frame.
  const k = 1 + (pose.lean ?? 0) * 0.07;
  g.save();
  g.translate(L.hx, chin);
  g.rotate(rad((pose.tilt ?? 0) + stoop * 5 * fwd) + H.rot);
  g.scale(k, k);
  g.translate(-L.hx, -chin);
  const hp = blobPts(L.hx, L.hc, { ...H, rot: 0 });
  const head: Head = { cx: L.hx, cy: L.hc, a: H.a, b: H.b, W, u, pts: hp, facing, look: pose.look, yaw: V.yaw };
  look.hairBack?.(p, head);
  p.poly(hp, skin);
  drawFill(p, head, s.fx);
  p.shade(hp, SH_PALE, H.a);
  // R28 form: a broad soft highlight toward the light and a gentle core shadow, so the head reads as a ball.
  p.clip(hp, () => {
    const lx = L.hx + Math.cos(p.light) * 0.38 * H.a, ly = L.hc + Math.sin(p.light) * 0.38 * H.b;
    const hi = g.createRadialGradient(lx, ly, 0, lx, ly, 0.95 * H.a);
    hi.addColorStop(0, "rgba(255,255,255,0.35)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.fillRect(L.hx - 2 * H.a, L.hc - 2 * H.b, 4 * H.a, 4 * H.b);
    const cx = L.hx - Math.cos(p.light) * 0.2 * H.a, cy = L.hc - Math.sin(p.light) * 0.2 * H.b;
    const sh = g.createRadialGradient(cx, cy, 0.75 * H.a, cx, cy, 1.25 * H.a);
    sh.addColorStop(0, "rgba(60,40,80,0)");
    sh.addColorStop(1, "rgba(60,40,80,0.16)");
    g.fillStyle = sh;
    g.fillRect(L.hx - 2 * H.a, L.hc - 2 * H.b, 4 * H.a, 4 * H.b);
  });
  p.inkRing(hp, ow);
  look.hair?.(p, head);
  // Turned heads show an ear (over the hair, which tucks behind it): behind the face at 3/4, mid-head in profile, toward the front from 3/4 behind.
  // (promise-flowers: not past 125 deg: on a faceless back view a lone ear read as an eye)
  if (V.sn > 0.35 && Math.abs(V.yaw) < 125) {
    const ex = L.hx - V.side * H.a * (0.1 + (V.cs >= 0 ? 0.73 : 1.02) * V.cs), ey = L.hc + 4 * u;
    p.ell(ex, ey, 7 * u, 10 * u, skin, 2.6 * u);
    p.arc(ex + V.side * 1.5 * u, ey, 3.2 * u, 5 * u, V.side > 0 ? 120 : -60, V.side > 0 ? 240 : 60, 1.8 * u);
  }
  drawFace(p, head, s.expr, { blink: s.blink, fx: s.fx, brim: look.brim });
  look.face?.(p, head);
  for (const f of flowers) if (f.at.part === "head") drawFlower(p, L.hx + f.at.x * H.a, L.hc + f.at.y * H.b, u, f);
  g.restore();

  arms.filter(over).forEach(drawArm);
  g.restore();
  g.restore();
};
