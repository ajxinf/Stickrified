/** Ripple normal map data for build/water.ts (pure: no three, so node can self-check it). */
export const N = 256;
/**
 * R27b (user 2026-11-21: "water looks way too smooth"): 18 wave trains from long swell (2 waves per tile) down to fine
 * chop (48 per tile), spread +-70 deg around the wind (+x). Each train's slope is ~0.12 x k^-0.15 (nearly flat across
 * scales), so the small chop stays visible next to the swell; summed, the RMS slope is ~0.35 (mean tilt ~20 deg, a
 * breezy sea). Integer wave numbers keep the map tileable.
 */
const WAVES: [number, number, number][] = (() => {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: [number, number, number][] = [];
  for (let i = 0; i < 18; i++) {
    const k = 2 * Math.pow(24, i / 17), a = (rnd() - 0.5) * 2.4;
    const kx = Math.round(k * Math.cos(a)) || 1, ky = Math.round(k * Math.sin(a));
    out.push([kx, ky, 0.12 * Math.pow(Math.hypot(kx, ky), -0.15) * (0.8 + 0.4 * rnd())]);
  }
  return out;
})();

/** RGBA tangent-space normals (N x N, tileable) of the wave trains at composition frame F. */
export const rippleData = (F: number, speed = 1, slope = 1) => {
  const d = new Uint8Array(N * N * 4), t = (F / 30) * speed;
  const ph0 = WAVES.map((_, i) => i * 2.399); // fixed phase offsets: no train lines up with another
  const dx = new Float32Array(N * N), dy = new Float32Array(N * N);
  WAVES.forEach(([kx, ky, h], i) => {
    const k = Math.hypot(kx, ky), w = Math.sqrt(k) * 2.4 * t, amp = (h / k) * slope; // h = this train's slope
    // separable trick: cos(a + b) from per-row and per-column tables (N^2 multiplies, 2N trig calls per train)
    const cx = new Float32Array(N), sx = new Float32Array(N), cy = new Float32Array(N), sy = new Float32Array(N);
    for (let j = 0; j < N; j++) {
      const ax = (2 * Math.PI * kx * j) / N, ay = (2 * Math.PI * ky * j) / N + ph0[i] - w;
      cx[j] = Math.cos(ax); sx[j] = Math.sin(ax); cy[j] = Math.cos(ay); sy[j] = Math.sin(ay);
    }
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        // a sharpened crest (cos^3-ish) reads as chop, not as a smooth sine
        const c = cx[x] * cy[y] - sx[x] * sy[y], g = amp * c * (0.6 + 0.4 * c * c);
        dx[y * N + x] += g * kx;
        dy[y * N + x] += g * ky;
      }
  });
  for (let i = 0; i < N * N; i++) {
    const l = Math.hypot(dx[i], dy[i], 1);
    d[i * 4] = Math.round((-dx[i] / l * 0.5 + 0.5) * 255);
    d[i * 4 + 1] = Math.round((-dy[i] / l * 0.5 + 0.5) * 255);
    d[i * 4 + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    d[i * 4 + 3] = 255;
  }
  return d;
};
