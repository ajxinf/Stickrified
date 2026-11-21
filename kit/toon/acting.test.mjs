// Self-check for the acting layer: node kit/toon/acting.test.mjs
const { act, actingKeys } = await import("./acting.ts");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
const REST = { bob: 0, sway: 0, lift: [0, 0], arms: [{ at: [0.2, 0.92] }, { at: [0.2, 0.92] }], look: 0 };
const words = [{ text: "You", start: 0 }, { text: "batteries", start: 0.5 }, { text: "out", start: 0.9 }, { text: "talking", start: 1.2 }, { text: "*laughs*", start: 2.3 }];
const keys = actingKeys(words);
assert(keys.join() === "15,69", `keys at stressed words, >= 30 f apart: ${keys}`);
assert(act(REST, 0, keys, 0).sway === 0, "neutral before the first key");
const held = act(REST, 40, keys, 0), later = act(REST, 60, keys, 0);
assert(held.sway !== 0 && Math.abs(held.sway - later.sway) < 1e-9, "attitude holds between keys");
assert(act(REST, 40, keys, 0, { hasProp: true }).arms[1].at[1] === 0.92, "a held prop keeps the arms");
for (let f = 0; f < 120; f++) { const a = act(REST, f, keys, 1), b = act(REST, f + 1, keys, 1); assert(Math.abs(a.sway - b.sway) < 2.5, `no snap at f${f}`); }
// perform (R21): the body acts the face, ramps in and out, never snaps, never moves the hands.
const { perform } = await import("./acting.ts");
const S = (expr, fx = {}) => ({ pose: REST, expr, blink: false, fx });
assert(perform(S("neutral"), 50, 1).pose.sway === 0, "neutral without talk leaves the pose alone");
const laughs = [...Array(30)].map((_, f) => perform(S("laughing"), 100 + f, 1, { since: 100, prev: "neutral" }).pose);
assert(Math.max(...laughs.map((p) => Math.abs(p.sway))) > 4, "a laugh rocks the body");
assert(laughs.every((p) => p.arms[1].at[1] === 0.92), "perform never moves the hands");
for (let f = 0; f < 40; f++) {
  const a = perform(S(f < 20 ? "laughing" : "deadpan"), 80 + f, 2, f < 20 ? { since: 80, prev: "neutral" } : { since: 100, prev: "laughing" }).pose;
  const b = perform(S(f + 1 < 20 ? "laughing" : "deadpan"), 81 + f, 2, f + 1 < 20 ? { since: 80, prev: "neutral" } : { since: 100, prev: "laughing" }).pose;
  assert(Math.abs(a.sway - b.sway) < 4.5 && Math.abs(a.bob - b.bob) < 8, `no snap between emotions at f${f}`);
}
assert(perform(S("neutral", { talk: { open: 1, shape: "a" } }), 50, 1).pose.bob > 0, "a talking head nods");
console.log("acting: ok");
