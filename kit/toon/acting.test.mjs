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
console.log("acting: ok");
