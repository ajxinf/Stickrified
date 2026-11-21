// Self-check for pose motion (R21): node kit/toon/poses.test.mjs
const { moveCurve, movePose, poseAt, walkPose } = await import("./poses.ts");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
// moveCurve: at rest before, dips the other way, overshoots, settles at 1, never jumps more than 0.35 a frame.
assert(moveCurve(-5) === 0 && moveCurve(30) === 1, "rests at 0 before and 1 after");
assert(Math.min(moveCurve(-2), moveCurve(-1)) < 0, "anticipation goes the other way");
assert(Math.max(...[...Array(16)].map((_, d) => moveCurve(d))) > 1.02, "overshoots");
for (let d = -5; d < 20; d++) assert(Math.abs(moveCurve(d + 1) - moveCurve(d)) < 0.2, `no snap at d${d} (R28: fluid, < .2 a frame)`);
// R28 walk: a real stride (feet pass each other) and arms swinging against the legs.
const w0 = walkPose(0), wq = walkPose(0.8);
assert(w0.stride[0] < -100 && w0.stride[1] > 100 && wq.stride[0] > 100, "feet stride past each other");
assert(w0.arms[0].fwd > 0 && w0.arms[1].fwd < 0, "left arm forward while the right foot leads");
// Hands travel on an arc, not a straight line: halfway, the hand is off the straight path.
const a = { bob: 0, sway: 0, lift: [0, 0], look: 0, arms: [{ at: [0.2, 0.92] }, { at: [0.2, 0.92] }] };
const b = { ...a, arms: [a.arms[0], { at: [0.7, -0.55], grip: "point" }] };
const mid = movePose(a, b, 0.5).arms[1].at;
assert(Math.hypot(mid[0] - 0.45, mid[1] - 0.185) > 0.05, `hand arcs (${mid})`);
assert(movePose(a, b, 1).arms[1].at[0] === 0.7 && movePose(a, b, 1).arms[1].grip === "point", "arrives with the new grip");
// poseAt: no frame-to-frame jump on a pose change (body, hands).
for (let f = 0; f < 40; f++) {
  const p = poseAt([[0, "idle"], [20, "point"]], f), q = poseAt([[0, "idle"], [20, "point"]], f + 1);
  assert(Math.abs(p.arms[1].at[1] - q.arms[1].at[1]) < 0.6, `poseAt hand jump at f${f}`);
}
// The walk shifts weight (>= 4 deg) and settles on the heel strike.
const steps = [...Array(48)].map((_, i) => walkPose(i * 0.05));
assert(Math.max(...steps.map((p) => Math.abs(p.sway))) >= 4, "walk weight shift");
assert(Math.max(...steps.map((p) => p.squash ?? 0)) > 0.2, "walk contact settle");
console.log("poses: ok");
