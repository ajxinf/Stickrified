// Self-check for the water ripples: node kit/toon/build/ripples.test.mjs
const { N, rippleData } = await import("./ripples.ts");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
const a = rippleData(0), b = rippleData(15), at = (d, x, y) => d[(y * N + x) * 4];
assert(Math.abs(at(a, N - 1, 5) - at(a, 0, 5)) < 24 && Math.abs(at(a, 5, N - 1) - at(a, 5, 0)) < 24, "map tiles (edge pixels flow into each other)");
assert(a.some((v, i) => v !== b[i]), "ripples move with the frame");
assert(rippleData(15).every((v, i) => v === b[i]), "same frame, same map (frame-driven)");
let flat = 0; for (let i = 0; i < N * N; i++) flat += a[i * 4 + 2] > 250 ? 1 : 0;
assert(flat < N * N * 0.5, `ripples have relief (${flat} flat pixels)`);
console.log("ripples selftest ok");
