"""ElevenLabs sound effects + ambience beds for the mix (user decision 2026-11-14, R13 study: real, layered foley).

The shared library is assets/sfx/library.json: {"name": {"prompt": "...", "dur": 1.2, "loop": false}}. A name used in
a video's audio/events.json (an event "sfx", or an "ambience" bed) that is not a synthesized sound comes from here.
Each entry is generated ONCE (it costs credits) and cached as assets/sfx/eleven/<name>.wav (48 kHz stereo float) with
its prompt in <name>.json; a changed prompt regenerates. Record new entries in assets/CREDITS.md (ElevenLabs Sound
Effects, generated for this channel).

    python scripts/audio/eleven_sfx.py videos/<slug>      # generate what the video needs
    python scripts/audio/eleven_sfx.py --name <name>      # (re)generate one library entry
"""
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LIB = os.path.join(ROOT, "assets", "sfx", "library.json")
CACHE = os.path.join(ROOT, "assets", "sfx", "eleven")
import shutil
FFMPEG = shutil.which("ffmpeg") or os.path.join(ROOT, "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe")  # the bundled one cannot decode mp3
SYNTH = {"step", "whoosh", "swish", "splat", "pat", "pop", "sting", "groan", "crash"}  # sfx_gen.py's own sounds


def key():
    for line in open(os.path.join(ROOT, ".env"), encoding="utf-8"):
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("ELEVENLABS_API_KEY missing in .env")


def library():
    return json.load(open(LIB, encoding="utf-8"))


def path(name):
    return os.path.join(CACHE, f"{name}.wav")


def fresh(name, spec):
    meta = os.path.join(CACHE, f"{name}.json")
    return os.path.exists(path(name)) and os.path.exists(meta) and json.load(open(meta, encoding="utf-8")) == spec


def generate(name, spec):
    assert 0.5 <= spec["dur"] <= 30, f"{name}: dur must be 0.5-30 s (ElevenLabs limit)"
    body = {"text": spec["prompt"], "duration_seconds": spec["dur"], "prompt_influence": spec.get("influence", 0.45),
            "model_id": "eleven_text_to_sound_v2"}
    if spec.get("loop"):
        body["loop"] = True
    tmp = os.path.join(CACHE, f"{name}.mp3")
    if os.path.exists(tmp):  # downloaded, conversion failed last time: don't pay twice
        return convert(name, spec, tmp)
    req = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key(), "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        mp3 = urllib.request.urlopen(req, timeout=180).read()
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{name}: ElevenLabs {e.code}: {e.read()[:300]!r}")
    os.makedirs(CACHE, exist_ok=True)
    open(tmp, "wb").write(mp3)
    convert(name, spec, tmp)


def convert(name, spec, tmp):
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", tmp, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", path(name)], check=True)
    os.remove(tmp)
    json.dump(spec, open(os.path.join(CACHE, f"{name}.json"), "w", encoding="utf-8"), indent=1)
    print(f"generated {name} ({spec['dur']} s): {spec['prompt']}")


def needed(d):
    cfg = json.load(open(os.path.join(d, "audio", "events.json"), encoding="utf-8"))
    names = {e["sfx"] for e in cfg["events"]} - SYNTH
    names |= set(cfg.get("ambience", {}).values())
    return sorted(names)


def ensure(names):
    lib = library()
    missing = [n for n in names if n not in lib]
    if missing:
        raise SystemExit(f"not in assets/sfx/library.json: {', '.join(missing)}")
    for n in names:
        if not fresh(n, lib[n]):
            generate(n, lib[n])


if __name__ == "__main__":
    if sys.argv[1] == "--name":
        n = sys.argv[2]
        generate(n, library()[n])
    else:
        ensure(needed(sys.argv[1]))
        print("library ok:", ", ".join(needed(sys.argv[1])))
