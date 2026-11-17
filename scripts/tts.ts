// shortcut: mp3_44100_128 (192 kbps and PCM need the Creator tier), upgrade the format if the plan changes.
// ElevenLabs Eleven v4 with timestamps -> videos/<slug>/voice/voice.wav (48 kHz) + words.json (caption words + times).
// usage: node scripts/tts.ts videos/<slug>   (reads script.json; the whole script in one generation)
// Character voices: script.json `voices` {speaker: voiceId} gives dialogue lines their own voice. Consecutive lines
// with the same voice are one generation (a "run"), joined with GAP s of silence; a run is reused while its voice and
// text are unchanged, so editing one line only regenerates its run.
// words.json holds the caption text from `narration` (keeps *key* marks and numerals); times come from the spoken
// text's character alignment, tags in [brackets] skipped. Spoken and caption word counts must match line by line.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) throw new Error("usage: node scripts/tts.ts videos/<slug>");
const script = JSON.parse(fs.readFileSync(path.join(dir, "script.json"), "utf8"));
const key = fs.readFileSync(".env", "utf8").match(/^ELEVENLABS_API_KEY=(.*)$/m)?.[1]?.trim();
if (!key) throw new Error("ELEVENLABS_API_KEY missing in .env");

type Line = { narration: string; spoken?: string; audioTag?: string; speaker?: string };
const lines: Line[] = script.lines;
const untag = (s: string) => s.replace(/\[[^\]]*\]/g, " ");
const tokens = (s: string) => untag(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
for (const [i, l] of lines.entries()) {
  const a = tokens(l.spoken ?? l.narration).length, b = tokens(l.narration).length;
  if (a !== b) throw new Error(`line ${i + 1}: spoken has ${a} words, narration ${b}`);
}
const GAP = 0.25, SR = 48000;
// 16-bit mono PCM in and out of a WAV (Remotion's ffmpeg build has no raw s16le muxer).
function pcmOf(b: Buffer) {
  for (let o = 12; o + 8 <= b.length; o += 8 + b.readUInt32LE(o + 4) + (b.readUInt32LE(o + 4) & 1))
    if (b.toString("ascii", o, o + 4) === "data") return b.subarray(o + 8, o + 8 + b.readUInt32LE(o + 4));
  throw new Error("no data chunk in wav");
}
function wavOf(data: Buffer) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + data.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}
const voices: Record<string, string> = script.voices ?? {};
const voiceOf = (l: Line) => voices[l.speaker ?? ""] ?? script.voiceId;
const runs: { voice: string; text: string[] }[] = [];
const lastTag: Record<string, string> = {};
for (const l of lines) {
  const v = voiceOf(l), fresh = runs.at(-1)?.voice !== v;
  if (fresh) runs.push({ voice: v, text: [] });
  // tags carry forward inside one generation only: a run that restarts the narrator re-sends his last tag
  const tag = l.audioTag || (fresh ? lastTag[v] : "");
  if (l.audioTag) lastTag[v] = l.audioTag;
  runs.at(-1)!.text.push((tag ? `[${tag}] ` : "") + (l.spoken ?? l.narration));
}

const voiceDir = path.join(dir, "voice");
fs.mkdirSync(voiceDir, { recursive: true });
const chars: string[] = [], t0: number[] = [], t1: number[] = [];
const pcm: Buffer[] = [];
let off = 0;
for (const [i, run] of runs.entries()) {
  const text = run.text.join(" "), one = runs.length === 1;
  const raw = path.join(voiceDir, one ? "tts_response.json" : `tts_response_${i}.json`);
  const old = fs.existsSync(raw) ? JSON.parse(fs.readFileSync(raw, "utf8")) : null;
  // Re-use a saved response unless --new (credits) or its voice/text changed (files saved before runs have no _text).
  if (!old || process.argv.includes("--new") || (old._text !== undefined && (old._text !== text || old._voice !== run.voice))) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${run.voice}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ text, model_id: script.model, voice_settings: { stability: 0.3, similarity_boost: 0.75 } }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status} (run ${i}, voice ${run.voice}): ${await res.text()}`);
    fs.writeFileSync(raw, JSON.stringify({ ...(await res.json()), _voice: run.voice, _text: text }));
  }
  const r = JSON.parse(fs.readFileSync(raw, "utf8"));
  const mp3 = path.join(voiceDir, one ? "voice.mp3" : `voice_${i}.mp3`);
  fs.writeFileSync(mp3, Buffer.from(r.audio_base64, "base64"));
  const wav = path.join(voiceDir, `run_${i}.wav`);
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", mp3, "-ar", String(SR), "-ac", "1", "-c:a", "pcm_s16le", wav], { stdio: "inherit", shell: true });
  const audio = pcmOf(fs.readFileSync(wav));
  fs.rmSync(wav);
  const al = r.normalized_alignment ?? r.alignment;
  if (i) chars.push(" "), t0.push(off), t1.push(off); // word break between runs
  al.characters.forEach((c: string, k: number) => (chars.push(c), t0.push(al.character_start_times_seconds[k] + off), t1.push(al.character_end_times_seconds[k] + off)));
  const gap = Buffer.alloc(i < runs.length - 1 ? Math.round(GAP * SR) * 2 : 0);
  pcm.push(audio, gap);
  off += (audio.length + gap.length) / 2 / SR;
}
fs.writeFileSync(path.join(voiceDir, "voice.wav"), wavOf(Buffer.concat(pcm)));
if (runs.length > 1) console.log(`${runs.length} runs: ${runs.map((r) => r.voice.slice(0, 6)).join(" ")}`);

// Spoken words with times from the character alignment (skip [tags]).
const spoken: { start: number; end: number }[] = [];
let inTag = false, cur: { start: number; end: number; real: boolean } | null = null;
const flush = () => void (cur?.real && spoken.push({ start: cur.start, end: cur.end }), (cur = null));
chars.forEach((c, i) => {
  if (c === "[") return void (flush(), (inTag = true));
  if (c === "]") return void (inTag = false);
  if (inTag) return;
  if (/\s/.test(c)) return flush();
  cur ??= { start: t0[i], end: t1[i], real: false };
  cur.end = t1[i];
  if (/[\p{L}\p{N}]/u.test(c)) cur.real = true;
});
flush();
const caption = lines.flatMap((l) => tokens(l.narration).map((text) => ({ text, speaker: l.speaker })));
if (spoken.length !== caption.length) throw new Error(`alignment has ${spoken.length} words, captions ${caption.length}`);
// `speaker` (line field) picks the caption key-word colour: who says this line (Captions.tsx SPEAKER_COLORS).
const words = caption.map(({ text, speaker }, i) => ({ text, start: +spoken[i].start.toFixed(3), end: +spoken[i].end.toFixed(3), ...(speaker && { speaker }) }));
fs.writeFileSync(path.join(voiceDir, "words.json"), JSON.stringify(words, null, 1));
console.log(`${words.length} words, voice ${words[words.length - 1].end.toFixed(2)} s -> ${voiceDir}`);

// Non-verbal tags must be performed: the gap the voice leaves between the words around the tag (measured on
// _pipeline-test: a performed [laughs] 0.60 s, [gasps] 0.52 s; a skipped one 0.05-0.14 s). Each tag's audio is cut to
// voice/tag_<name>_<n>.wav for the ear check (a tag can still be read aloud as a word).
const NONVERBAL = /^(laughs|gasps|sighs|chuckles|giggles|exhales|inhales|clears throat)$/i;
const MIN_GAP = 0.3;
const joined = chars.join("");
const isWord = (c: string) => /[\p{L}\p{N}]/u.test(c);
let bad = 0, n = 0;
for (const m of joined.matchAll(/\[([^\]]+)\]/g)) {
  if (!NONVERBAL.test(m[1].trim())) continue;
  const a = m.index!, b = a + m[0].length - 1;
  let p = a - 1, q = b + 1;
  while (p >= 0 && !isWord(chars[p])) p--;
  while (q < chars.length && !isWord(chars[q])) q++;
  const from = p >= 0 ? t1[p] : 0, to = q < chars.length ? t0[q] : t1[chars.length - 1], gap = to - from;
  const clip = path.join(voiceDir, `tag_${m[1].trim().replace(/\s+/g, "_")}_${++n}.wav`);
  execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-ss", String(Math.max(from - 0.3, 0)), "-to", String(to + 0.3), "-i", path.join(voiceDir, "voice.wav"), clip], { stdio: "inherit", shell: true });
  const ok = gap >= MIN_GAP;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} [${m[1]}] ${from.toFixed(2)}-${to.toFixed(2)} s: ${gap.toFixed(2)} s between the words (>= ${MIN_GAP} s = performed) -> ${clip}`);
}
if (bad) {
  console.error(`${bad} non-verbal tag(s) not performed. Move each to the start of a sentence (after a full stop), then rerun with --new.`);
  process.exit(1);
}
