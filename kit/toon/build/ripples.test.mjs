// Self-check for the water ripples: node kit/toon/build/ripples.test.mjs
const { N, rippleData } = await import("./ripples.ts");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
const a = rippleData(0), b = rippleData(15), at = (d, x, y) => d[(y * N + x) * 4];
assert(Math.abs(at(a, N - 1, 5) - at(a, 0, 5)) < 24 && Math.abs(at(a, 5, N - 1) - at(a, 5, 0)) < 24, "map tiles (edge pixels flow into each other)");
assert(a.some((v, i) => v !== b[i]), "ripples move with the frame");
assert(rippleData(15).every((v, i) => v === b[i]), "same frame, same map (frame-driven)");
let tilt = 0; for (let i = 0; i < N * N; i++) tilt += Math.acos((a[i * 4 + 2] / 255 - 0.5) * 2);
tilt = (tilt / (N * N)) * 180 / Math.PI;
assert(tilt > 10 && tilt < 30, `mean tilt ${tilt.toFixed(1)} deg (a breezy sea is 10-30, not a mirror or a wall)`);
console.log("ripples selftest ok");
