// Self-check for the turnaround view angle: node kit/toon/turn.test.mjs
const { Vector3 } = await import("three");
const assert = (ok, msg) => { if (!ok) { console.error("FAIL", msg); process.exit(1); } };
// figure.ts uses extensionless imports: bundle it with esbuild (a dev dependency) and import the bundle.
const { build } = await import("esbuild");
const { fileURLToPath } = await import("node:url");
const out = await build({ entryPoints: [fileURLToPath(new URL("./figure.ts", import.meta.url))], bundle: true, write: false, format: "esm", platform: "node", logLevel: "error" });
const { viewYaw, viewOf } = await import("data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64"));
const at = new Vector3(0, 0, 0), cam = new Vector3(0, 1.5, 5); // lens on +z looking at the character
assert(viewYaw(0, at, cam) === 0, "facing the lens = front");
assert(Math.abs(viewYaw(Math.PI, at, cam)) === 180, "facing away = back");
// Card-right as seen from cam (handWorld: right = (toCam.z, 0, -toCam.x)) = +x here; facing +x is heading +90 deg.
assert(viewYaw(Math.PI / 2, at, cam) === 90, "facing card-right = +90");
assert(viewYaw(-Math.PI / 2, at, cam) === -90, "facing card-left = -90");
// viewOf: only looks with `turns` leave the front view; yaw wraps into -180..180.
assert(viewOf({ turns: false }, { yaw: 90 }).yaw === 0, "non-turning look stays front");
assert(viewOf({ turns: true }, { yaw: 270 }).yaw === -90, "wraps 270 -> -90");
assert(viewOf({ turns: true }, { yaw: 90 }).side === 1 && viewOf({ turns: true }, { yaw: -30 }).side === -1, "side faced");
console.log("turn ok");
