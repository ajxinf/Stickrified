// Self-check for toss: node kit/toon/physics.test.mjs
const { toss } = await import("./physics.ts");
const { Vector3 } = await import("three");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
const a = new Vector3(0, 1, 0), b = new Vector3(2, 0, 0), o = { air: 20, height: 1, spins: 1 };
assert(toss(a, b, 0, o).pos.distanceTo(a) < 1e-6, "starts at from");
assert(toss(a, b, 20, o).pos.distanceTo(b) < 1e-6, "lands on to at t = air");
const ys = Array.from({ length: 21 }, (_, t) => toss(a, b, t, o).pos.y);
assert(Math.abs(Math.max(...ys) - 2) < 0.02, `peaks height above the higher end: ${Math.max(...ys)}`);
const hop = Math.max(...Array.from({ length: 10 }, (_, t) => toss(a, b, 21 + t, o).pos.y));
assert(hop > 0.05 && hop < 0.2, `first bounce ~ height x r^2: ${hop}`);
assert(toss(a, b, 200, o).pos.distanceTo(b) < 1e-6 && toss(a, b, 200, o).landed, "settles");
console.log("physics ok");
