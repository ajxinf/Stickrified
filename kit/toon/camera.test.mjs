// Self-check for densestSpot: node kit/toon/camera.test.mjs
const { densestSpot } = await import("./camera.ts");
const { Vector3 } = await import("three");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
const pts = [new Vector3(-4, 0, -40), ...Array.from({ length: 6 }, (_, i) => new Vector3(2 + 0.1 * i, 0, -45 + 0.1 * i))];
const d = densestSpot(pts, { x0: -5, x1: 5, z0: -50, z1: -36 });
assert(d.count === 6 && Math.hypot(d.at.x - 2.25, d.at.z + 44.75) < 2.5, `finds the cluster of 6: ${JSON.stringify(d)}`);
assert(densestSpot([], { x0: 0, x1: 1, z0: 0, z1: 1 }).count === 0, "empty crowd");
console.log("camera ok");
