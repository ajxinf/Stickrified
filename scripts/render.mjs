// Final render after QA layer 1 (kit/toon/guard.tsx; writes out/<slug>/plan.json for layer 2), then the video.
// The guard also runs inside the full render, so a shot that only mounts later still fails with its id and frame.
// usage: node scripts/render.mjs <Composition> <out.mp4> [scale = 1 (1080p)] [--concurrency 2] [--no-guard] [--resume] [--starts 0,190 (only without a QAPlan)]
import { renderMedia } from "@remotion/renderer";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, browser, bundleOnce, fail, freshBrowser, guardPass, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
const si = args.indexOf("--starts");
const starts = si >= 0 ? args.splice(si, 2)[1].split(",").map(Number) : [0];
const ci = args.indexOf("--concurrency");
const concurrency = ci >= 0 ? Number(args.splice(ci, 2)[1]) : 2; // user 2026-11-22: 2 for speed (1 ran OOM-safe; if a render crashes or goes black, pass --concurrency 1)
// --no-guard: this round's preflight already ran the full-frame QA on unchanged code (user 2026-11-22: once per round).
const noGuard = args.includes("--no-guard");
if (noGuard) args.splice(args.indexOf("--no-guard"), 1);
const resume = args.includes("--resume");
if (resume) args.splice(args.indexOf("--resume"), 1);
const CHUNK = Number(process.env.RENDER_CHUNK ?? 600); // 20 s of video: a crash costs <= ~15 min at 2K
const [id, out, scaleArg = "1"] = args;
// "4/3" for the 2K export: 1.3333 gives 2559.936 px, and Remotion needs whole-pixel sizes.
const [num, den = "1"] = scaleArg.split("/");
const scale = Number(num) / Number(den);
if (!id || !out) {
  console.error("usage: node scripts/render.mjs <Composition> <out.mp4> [scale] [--starts f1,f2 (first frame of each shot)]");
  process.exit(2);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
if (process.platform === "win32") spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve("scripts/free_ram.ps1")], { stdio: "inherit" });
const t0 = performance.now();
const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, id).catch((e) => fail(id, e));
if (!noGuard && !(await guardPass(serveUrl, composition, starts))) fail(id, "QA layer 1: failures above");
// Chunks (ep 5, 2026-11-23: a 2K render died of Chrome OOM at 70 % after 65 min, and every fresh start after it hit a
// GPU reset on frame 0): each chunk renders on its own, a failed chunk retries in a new Chrome, finished chunks stay in
// <out>_parts/ and `--resume` keeps them (only after a crash on unchanged code), then they join without re-encoding.
const props = { ...composition.props, ...(noGuard ? { qa: "off" } : {}) };
const comp = { ...composition, props }; // the component reads composition.props (Remotion 4), see stills.mjs
const parts = out.replace(/\.mp4$/, "_parts");
if (!resume) fs.rmSync(parts, { recursive: true, force: true });
fs.mkdirSync(parts, { recursive: true });
const n = composition.durationInFrames, files = [];
for (let a = 0; a < n; a += CHUNK) {
  const b = Math.min(a + CHUNK, n) - 1, file = path.join(parts, `${String(a).padStart(5, "0")}-${b}.mp4`);
  files.push(file);
  if (fs.existsSync(file)) { console.log(`frames ${a}-${b}: kept from the last run`); continue; }
  for (let tryNo = 0; ; tryNo++) {
    let last = -1;
    process.stdout.write(`frames ${a}-${b}: `);
    const err = await renderMedia({
      composition: comp, serveUrl, inputProps: props, codec: "h264", crf: 16, outputLocation: `${file}.tmp.mp4`, scale, concurrency,
      imageFormat: "jpeg", frameRange: [a, b],
      timeoutInMilliseconds: 120000, // big glTF sets (trees) can take > 30 s to load in a fresh tab
      chromiumOptions: CHROMIUM, puppeteerInstance: await browser(),
      onProgress: ({ progress }) => {
        const p = Math.floor(progress * 10);
        if (p !== last) process.stdout.write(`${(last = p) * 10}% `);
      },
    }).then(() => null, (e) => e);
    if (!err) { fs.renameSync(`${file}.tmp.mp4`, file); console.log(""); break; }
    // a QA layer 1 failure inside the render is real: never retry it
    if (tryNo === 2 || /QA layer 1/.test(String(err?.message ?? err))) fail(`${id} render frames ${a}-${b}`, err);
    console.log(`\nframes ${a}-${b} failed (${String(err?.message ?? err).split("\n")[0]}); retry ${tryNo + 1} in a new Chrome`);
    await freshBrowser();
  }
}
const list = path.join(parts, "list.txt");
fs.writeFileSync(list, files.map((f) => `file '${path.resolve(f).replace(/\\/g, "/")}'`).join("\n"));
const ff = spawnSync("npx", ["remotion", "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", out], { stdio: "inherit", shell: true });
if (ff.status !== 0) fail(`${id} join`, `ffmpeg exit ${ff.status}`);
console.log(`\n${out} (concurrency ${concurrency}, ${((performance.now() - t0) / 1000).toFixed(0)} s incl. bundle + QA layer 1)`);
process.exit(0); // the shared Chrome would keep node alive
