// Stills for look checks, after QA layer 1 (kit/toon/guard.tsx: every frame of every shot; stops on a failure).
// usage: node scripts/stills.mjs <Composition> <out prefix, e.g. out/pilot/x_> <frames: 0,100,400> [scale = 0.5] [--starts 0,190]
import { renderFrames, renderStill } from "@remotion/renderer";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, browser, bundleOnce, fail, guardPass, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
// --draft: still run QA layer 1 and print its failures, but render anyway (mid-fix look checks; renders keep the gate).
const draft = args.includes("--draft");
if (draft) args.splice(args.indexOf("--draft"), 1);
// --no-guard: skip QA layer 1 (only when this round already ran it on unchanged code: user 2026-11-22, one full-frame QA per round).
const noGuard = args.includes("--no-guard");
if (noGuard) args.splice(args.indexOf("--no-guard"), 1);
// --batch: render every frame in one renderFrames pass (the composition must be registered withQAFrames, kit
// QAFrames.tsx): each tab loads the scene once instead of once per still (~20 s each).
const batch = args.includes("--batch");
if (batch) args.splice(args.indexOf("--batch"), 1);
// --props '{"lookdev":"lit"}': extra input props (look-development lab, kit/toon/lookdev.ts).
const pi = args.indexOf("--props");
const extraProps = pi >= 0 ? JSON.parse(args.splice(pi, 2)[1]) : {};
const si = args.indexOf("--starts");
const starts = si >= 0 ? args.splice(si, 2)[1].split(",").map(Number) : [0];
const [id, prefix, framesArg = "0", scaleArg = "0.5"] = args;
if (!id || !prefix) {
  console.error("usage: node scripts/stills.mjs <Composition> <out prefix> <frames,comma,separated> [scale] [--starts f1,f2 (shot starts, only without a QAPlan)]");
  process.exit(2);
}
const frames = framesArg.split(",").map(Number);
const [num, den = "1"] = scaleArg.split("/"); // "4/3" = the 2K master (1.3333 gives 2559.936 px, which Remotion refuses)
const scale = Number(num) / Number(den);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, id, extraProps).catch((e) => fail(id, e));
if (!noGuard && !(await guardPass(serveUrl, composition, starts))) {
  if (draft) console.log("DRAFT: QA layer 1 failed (above); rendering anyway, not for sign-off");
  else fail(id, "QA layer 1: failures above");
}
const props = { ...composition.props, ...extraProps, ...(noGuard ? { qa: "off" } : draft ? { qa: "collect" } : {}) };
const isBlank = (file) => fs.statSync(file).size / (composition.width * composition.height * scale * scale) <= 0.2;
const done = new Set();
if (batch && frames.length > 1) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qaframes-"));
  await renderFrames({
    // the component reads its props from composition.props (Remotion 4), not from inputProps; the composition keeps its
    // full length (a shortened one clamps the frozen frames) and only frames 0..N-1 render
    composition: { ...composition, props: { ...props, qaFrames: frames } }, serveUrl, outputDir: dir, imageFormat: "png", scale, concurrency: 2,
    chromiumOptions: CHROMIUM, timeoutInMilliseconds: 120000, inputProps: { ...props, qaFrames: frames }, onStart: () => {}, onFrameUpdate: () => {}, frameRange: [0, frames.length - 1],
  }).catch((e) => fail(`${id} batch`, e));
  // renderFrames names files element-<i>.png (i = output frame = index into `frames`)
  for (const f of fs.readdirSync(dir)) {
    const i = Number(f.match(/(\d+)\.png$/)?.[1]), frame = frames[i], output = `${prefix}${String(frame).padStart(4, "0")}.png`;
    fs.copyFileSync(path.join(dir, f), output);
    if (!isBlank(output)) { done.add(frame); console.log(output); }
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`batch: ${done.size}/${frames.length} stills; ${frames.length - done.size} go to single renders`);
}
for (const frame of frames) {
  if (done.has(frame)) continue;
  const output = `${prefix}${String(frame).padStart(4, "0")}.png`;
  // shortcut: a fresh page sometimes captures a blank white/black frame (~0.04 B/px vs ~2 for a real one); retry it.
  // Upgrade to a root-cause fix if blanks ever show up in renderMedia output too.
  for (let tryNo = 0; tryNo < 3; tryNo++) {
    // a passing Chrome out-of-memory on the heavy town shots also gets a retry; the third failure stops the run
    const err = await renderStill({ composition, serveUrl, output, frame, scale, chromiumOptions: CHROMIUM, timeoutInMilliseconds: 120000, puppeteerInstance: await browser(), inputProps: props }).then(() => null, (e) => e);
    if (err) {
      if (tryNo === 2) fail(`${id} frame ${frame}`, err);
      console.log(`render error at frame ${frame}, retry ${tryNo + 1}: ${String(err?.message ?? err).split("\n")[0]}`);
      continue;
    }
    if (!isBlank(output)) break;
    console.log(`blank still at frame ${frame}, retry ${tryNo + 1}`);
  }
  console.log(output);
}
// a timed-out still can leave a Chrome page open, which keeps node alive forever and hangs preflight
process.exit(0);
