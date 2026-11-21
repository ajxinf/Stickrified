"""Per-line voice loudness (RMS dBFS over each line's words vs the median): lines 4+ dB under the median are too quiet to hear
under music (user 2026-11-16: hushed or whispered tags). Usage: python scripts/audio/line_loudness.py videos/<slug> [--lift]
--lift raises every line more than 3 dB under the median to 2 dB under it in voice.wav (20 ms ramps; rerun mouth.py
after). tts.ts rewrites voice.wav, so lift again after every new take."""
import json, wave, math, sys
import numpy as np
d = sys.argv[1]
sj = json.load(open(d + '/script.json', encoding='utf8'))
words = json.load(open(d + '/voice/words.json', encoding='utf8'))
w = wave.open(d + '/voice/voice.wav')
sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
i = 0
rows = []
for n, ln in enumerate(sj['lines'], 1):
    k = len([t for t in ln['narration'].split() if any(c.isalnum() for c in t)])
    a, b = words[i]['start'], words[i + k - 1]['end']
    i += k
    seg = x[int(a * sr):int(b * sr)]
    db = 20 * math.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
    rows.append((n, db, ln.get('audioTag', ''), ln['narration'][:50], a, b))
med = float(np.median([r[1] for r in rows]))
if '--lift' in sys.argv:
    y = x.copy()
    for n, db, tag, t, a, b in rows:
        if db - med >= -3: continue
        g = 10 ** ((med - 2 - db) / 20)
        i0, i1, r = int(max(a - 0.05, 0) * sr), min(int((b + 0.05) * sr), len(y)), int(0.02 * sr)
        env = np.ones(i1 - i0)
        env[:r] = np.linspace(0, 1, r)
        env[-r:] = np.linspace(1, 0, r)
        y[i0:i1] *= 1 + (g - 1) * env
        print(f"lifted line {n} by {20 * math.log10(g):+.1f} dB")
    assert np.abs(y).max() < 1, "lift would clip"
    with wave.open(d + '/voice/voice.wav', 'wb') as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr)
        o.writeframes((y * 32767).astype(np.int16).tobytes())
    sys.exit(0)
quiet = [r for r in rows if r[1] - med < -4]
for n, db, tag, t, _, _ in rows:
    print(f"{n:2} {db:6.1f} dB {db - med:+5.1f}{'  QUIET' if db - med < -4 else '       '}  [{tag}] {t}")
if quiet:
    print(f"{len(quiet)} line(s) 4+ dB under the median: give them a loud tag (excited, dramatic, urgent...) and regenerate.")
    sys.exit(1)
