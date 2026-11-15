import { Vector3 } from "three";

/**
 * A thrown thing (R20, visual-ref2/3/6: a box, a mug, a hat fly in an arc, land AFTER the body that threw them, bounce
 * a little lower each time and settle). Frame-driven: `t` = frames since the throw. `air` frames to the first landing
 * at `to`, the arc peaking `height` m above the higher end; each bounce keeps `restitution` of the speed (height x r^2,
 * time x r). `spins` turns while airborne (eased out, so it lands with a wobble, not a spin).
 */
export const toss = (from: Vector3, to: Vector3, t: number, o: { air: number; height: number; spins?: number; bounces?: number; restitution?: number }) => {
  const { air, height, spins = 0, bounces = 2, restitution = 0.4 } = o;
  const u = Math.max(0, Math.min(t / air, 1));
  const spin = spins * Math.PI * 2 * (1 - (1 - u) ** 2);
  if (t <= air) {
    const top = Math.max(from.y, to.y) + height;
    // Parabola through from.y (u 0), top (peak), to.y (u 1): y = a u^2 + b u + c with the vertex at the peak.
    const c = from.y, k = Math.sqrt(Math.max(top - from.y, 1e-6) / Math.max(top - to.y, 1e-6)), um = k / (1 + k);
    const a = -(top - c) / (um * um), b = -2 * a * um;
    return { pos: from.clone().lerp(to, u).setY(a * u * u + b * u + c), spin, landed: false };
  }
  // Bounces in place: hop i lasts air * r^(i+1) * 0.6 and rises height * r^(2i+2).
  let s = t - air;
  for (let i = 0; i < bounces; i++) {
    const len = air * 0.6 * restitution ** (i + 1), h = height * restitution ** (2 * i + 2);
    if (s < len) return { pos: to.clone().setY(to.y + 4 * h * (s / len) * (1 - s / len)), spin, landed: true };
    s -= len;
  }
  return { pos: to.clone(), spin, landed: true };
};
