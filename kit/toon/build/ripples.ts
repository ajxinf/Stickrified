/** Ripple normal map data for build/water.ts (pure: no three, so node can self-check it). */
export const N = 128;
/** [kx, ky (waves per tile), height] */
const WAVES: [number, number, number][] = [[3, 1, 0.3], [-2, 3, 0.22], [5, -2, 0.16], [1, 6, 0.12], [-7, 2, 0.09], [9, 5, 0.06]];

/** RGBA tangent-space normals (N x N, tileable) of the wave trains at composition frame F. */
export const rippleData = (F: number, speed = 1) => {
  const d = new Uint8Array(N * N * 4), t = (F / 30) * speed;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let dx = 0, dy = 0;
      for (const [kx, ky, h] of WAVES) {
        const k = Math.hypot(kx, ky), ph = 2 * Math.PI * ((kx * x + ky * y) / N) - Math.sqrt(k) * 2.2 * t;
        const c = Math.cos(ph) * h * 2 * Math.PI / N * 9; // slope of h*sin(ph), x9: a ripple, not a mirror
        dx += c * kx;
        dy += c * ky;
      }
      const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      d[i] = Math.round((-dx / l * 0.5 + 0.5) * 255);
      d[i + 1] = Math.round((-dy / l * 0.5 + 0.5) * 255);
      d[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      d[i + 3] = 255;
    }
  return d;
};
