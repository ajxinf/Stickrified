// Render benchmark (user 2026-11-23: "do not assume a setting is faster without measuring it"). Renders one frame range
// with the given settings and samples CPU, RAM, each GPU's 3D and video-encode load and Chrome's memory once a second.
// usage: node scripts/bench.mjs <label> [--comp PromiseFlowers] [--frames 360-479] [--scale 4/3] [--concurrency 2]
//        [--nvenc <bitrate, e.g. 40M>] [--frames-only]   -> one JSON line appended to out/bench/results.jsonl
import { renderFrames, renderMedia } from "@remotion/renderer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROMIUM, bundleOnce, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const label = args[0];
const comp = opt("comp", "PromiseFlowers");
const [fa, fb] = opt("frames", "360-479").split("-").map(Number);
const [num, den = "1"] = opt("scale", "4/3").split("/");
const scale = Number(num) / Number(den), concurrency = Number(opt("concurrency", "2")), nvenc = opt("nvenc", null);
const framesOnly = args.includes("--frames-only");
const outDir = path.resolve("out/bench");
fs.mkdirSync(outDir, { recursive: true });

// sampler (scripts/bench_sample.ps1): CPU, free RAM, Chrome private memory, each GPU's 3D + video-encode load, nvidia-smi
const sampleFile = path.join(outDir, `${label}.samples.jsonl`), stopFile = path.join(outDir, `${label}.stop`);
fs.rmSync(sampleFile, { force: true }); fs.rmSync(stopFile, { force: true });
const sampler = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve("scripts/bench_sample.ps1"), "-Out", sampleFile, "-Stop", stopFile], { stdio: "ignore" });

const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, comp);
const props = { ...composition.props, qa: "off" };
const c = { ...composition, props };
const n = fb - fa + 1;
let first = null;
const t0 = performance.now();
const timeline = []; // [ms since start, frames done]: at concurrency 1 the gaps show what each cut (a new canvas) costs
const mark = (done) => {
  if (done > 0 && first === null) first = performance.now() - t0;
  if (done !== timeline.at(-1)?.[1]) timeline.push([Math.round(performance.now() - t0), done]);
};
if (framesOnly) {
  const dir = path.join(outDir, `${label}_frames`);
  fs.rmSync(dir, { recursive: true, force: true });
  await renderFrames({ composition: c, serveUrl, inputProps: props, outputDir: dir, imageFormat: "jpeg", scale, concurrency,
    frameRange: [fa, fb], chromiumOptions: CHROMIUM, timeoutInMilliseconds: 120000, onStart: () => {}, onFrameUpdate: (d) => mark(d) });
} else {
  await renderMedia({ composition: c, serveUrl, inputProps: props, codec: "h264", outputLocation: path.join(outDir, `${label}.mp4`),
    scale, concurrency, imageFormat: "jpeg", frameRange: [fa, fb], chromiumOptions: CHROMIUM, timeoutInMilliseconds: 120000,
    ...(nvenc ? { hardwareAcceleration: "required", videoBitrate: nvenc } : { crf: 16 }),
    onProgress: ({ renderedFrames }) => mark(renderedFrames) });
}
const total = (performance.now() - t0) / 1000;
fs.writeFileSync(stopFile, "");
await new Promise((r) => sampler.on("exit", r));
fs.rmSync(stopFile, { force: true });

const S = fs.existsSync(sampleFile) ? fs.readFileSync(sampleFile, "utf8").replace(/^﻿/, "").trim().split(/\r?\n/).map((l) => JSON.parse(l.replace(/^﻿/, ""))) : [];
const stat = (v) => ({ avg: +(v.reduce((a, b) => a + b, 0) / Math.max(v.length, 1)).toFixed(1), max: +Math.max(0, ...v).toFixed(1) });
const luids = [...new Set(S.flatMap((s) => Object.keys(s.g3d ?? {})))];
const gpu = Object.fromEntries(luids.map((l) => [l, { "3d": stat(S.map((s) => s.g3d?.[l] ?? 0)), enc: stat(S.map((s) => s.genc?.[l] ?? 0)) }]))
  ;
const res = {
  label, comp, frames: `${fa}-${fb}`, scale: opt("scale", "4/3"), concurrency, encoder: framesOnly ? "none (frames only)" : nvenc ? `h264_nvenc ${nvenc}` : "libx264 crf16",
  total_s: +total.toFixed(1), first_frame_s: +(first / 1000).toFixed(1), ms_per_frame: Math.round((total * 1000) / n),
  ms_per_frame_after_load: Math.round(((total * 1000 - first) / Math.max(n - 1, 1))),
  samples: S.length, cpu: stat(S.map((s) => s.cpu)), free_ram_mb: stat(S.map((s) => s.free)), chrome_mb: stat(S.map((s) => s.chrome)), gpu,
  nvidia: { util: stat(S.map((s) => s.nv[0])), enc: stat(S.map((s) => s.nv[1])), vram_mb: stat(S.map((s) => s.nv[2])) },
  ram_total_mb: Math.round(os.totalmem() / 2 ** 20),
};
fs.appendFileSync(path.join(outDir, "results.jsonl"), JSON.stringify(res) + "\n");
fs.writeFileSync(path.join(outDir, `${label}.timeline.json`), JSON.stringify(timeline));
console.log(JSON.stringify(res, null, 1));
process.exit(0);
