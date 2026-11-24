// Self-check for the character acceptance numbers (LOOK_SPEC section 4): node kit/toon/figure.test.mjs
import { register } from "node:module";

// The kit imports without extensions (bundler style): resolve "./x" to "./x.ts" for Node's type stripping.
register("data:text/javascript," + encodeURIComponent(
  "export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith('.') && !/\\.[a-z]+$/.test(s)) return next(s + '.ts', c); throw e; } }",
));
const { EXTRAS } = await import("./extras.ts");
const { SEAT_M, headHeight, layout, measureLook } = await import("./figure.ts");
const { REST } = await import("./poses.ts");
const { youLook } = await import("./protagonist.ts");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
for (const { name, look } of [{ name: "you", look: youLook }, ...EXTRAS]) {
  const m = measureLook(look);
  const kid = name.startsWith("child");
  const [lo, hi] = kid ? [2.45, 2.75] : [2.95, 3.3]; // R29: visual-ref8/9 measure 3.0-3.1 HH (user: R28 cast too tall)
  console.log(`${name.padEnd(24)} ${m.heads.toFixed(2)} HH  H/W ${m.hw.toFixed(3)}  ink ${m.thickThin.toFixed(2)}:1  ${m.meters.toFixed(2)} m`);
  assert(m.heads >= lo && m.heads <= hi, `${name}: ${m.heads.toFixed(2)} HH outside ${lo}-${hi}`);
  assert(m.hw >= 0.85 && m.hw <= 1.0, `${name}: head H/W ${m.hw.toFixed(3)} outside 0.85-1.00 (R24 refs: a little wider than tall)`);
  assert(m.thickThin <= 1.5, `${name}: thick/thin ${m.thickThin.toFixed(2)} > 1.5 (refs: an even line)`);
}
// Seated (pose.sit 1): the torso bottom rests at chair-seat height, so the head drops by the leg length minus the seat.
const sat = layout(youLook, { ...REST, sit: 1 }), up = (975 - sat.torsoBot) / 500;
assert(Math.abs(up - SEAT_M) < 1e-6, `seated torso bottom ${up.toFixed(3)} m, expected ${SEAT_M}`);
assert(headHeight(youLook, { ...REST, sit: 1 }) < headHeight(youLook) - 0.05, "seated head should sit below the standing head"); // R29 legs: hip 0.46 m over a 0.38 m seat
console.log("figure ok");
