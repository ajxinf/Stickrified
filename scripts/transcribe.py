"""Transcribe a reference video with ElevenLabs Speech-to-Text (scribe_v1), word timings included.

Usage: python scripts/transcribe.py <video> <out.json>
Writes <out.json> (the API response: text + words with start/end) and <out>.txt (one sentence per line with its
start time), for studying reference scripts (docs/scripts/IN_THIS_WORLD_STUDY.md). Key: ELEVENLABS_API_KEY in .env.
The reference videos are private study material: transcripts stay in docs/scripts/refs, never published.
"""
import json
import os
import re
import subprocess
import sys
import urllib.request
import uuid

FFMPEG = os.path.abspath("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")


def key():
    for ln in open(".env", encoding="utf-8"):
        if ln.startswith("ELEVENLABS_API_KEY="):
            return ln.split("=", 1)[1].strip().strip('"')
    raise SystemExit("ELEVENLABS_API_KEY missing in .env")


def main(src, out):
    audio = os.path.splitext(out)[0] + ".mp3"
    subprocess.run([FFMPEG, "-v", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio], check=True)
    b = uuid.uuid4().hex
    body = b"".join([
        f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n".encode(),
        f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\neng\r\n".encode(),
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"a.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n".encode(),
        open(audio, "rb").read(), f"\r\n--{b}--\r\n".encode()])
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body, method="POST",
                                 headers={"xi-api-key": key(), "Content-Type": f"multipart/form-data; boundary={b}"})
    r = json.load(urllib.request.urlopen(req, timeout=600))
    os.remove(audio)
    json.dump(r, open(out, "w", encoding="utf-8"), indent=1)
    words = [w for w in r.get("words", []) if w.get("type") == "word"]
    lines, cur, t0 = [], [], None
    for w in words:
        t0 = w["start"] if t0 is None else t0
        cur.append(w["text"])
        if re.search(r"[.!?]$", w["text"]):
            lines.append(f"[{t0:6.2f}] {' '.join(cur)}")
            cur, t0 = [], None
    if cur:
        lines.append(f"[{t0:6.2f}] {' '.join(cur)}")
    open(os.path.splitext(out)[0] + ".txt", "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"{out}: {len(words)} words, {len(lines)} sentences")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
