"""Mouth track for lip sync: voice.wav -> videos/<slug>/voice/mouth.json, one entry per 30 fps frame.

open  0..1   how far the mouth opens (speech-band loudness, normalised to the take)
shape "o"|"a"|"e"  rounded / open / wide-teeth, from the spectral centroid (low = o, mid = a, high = e)

A character's mouth follows this track only on the words it speaks (the video's roles pick the spans); everywhere
else its expression mouth shows. Shapes hold >= 2 frames so the mouth never flickers.

    python scripts/audio/mouth.py videos/<slug>
"""
import json
import sys

import numpy as np
from scipy.signal import butter, sosfilt

sys.path.insert(0, __file__.rsplit("\\", 1)[0].rsplit("/", 1)[0])
from mix import SR, read  # noqa: E402

FPS = 30


def track(voice):
    v = sosfilt(butter(4, [150, 5000], "bandpass", fs=SR, output="sos"), voice)
    hop, win = SR // FPS, int(0.045 * SR)
    n = len(v) // hop
    db, cen = np.full(n, -120.0), np.zeros(n)
    fr = np.fft.rfftfreq(win, 1 / SR)
    for i in range(n):
        seg = v[max(0, i * hop + hop // 2 - win // 2):][:win]
        if len(seg) < win:
            seg = np.pad(seg, (0, win - len(seg)))
        db[i] = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
        sp = np.abs(np.fft.rfft(seg * np.hanning(win)))
        cen[i] = (fr * sp).sum() / (sp.sum() + 1e-9)
    top = np.percentile(db[db > -60], 95) if (db > -60).any() else -20
    opn = np.clip((db - (top - 28)) / 24, 0, 1)
    shape = np.where(cen < 1100, "o", np.where(cen < 2300, "a", "e"))
    for i in range(1, n - 1):  # no 1-frame shapes
        if shape[i] != shape[i - 1] and shape[i] != shape[i + 1]:
            shape[i] = shape[i - 1]
    opn[opn < 0.12] = 0
    return [{"open": round(float(o), 2), "shape": str(s)} for o, s in zip(opn, shape)]


if __name__ == "__main__":
    d = sys.argv[1].rstrip("/\\")
    t = track(read(f"{d}/voice/voice.wav"))
    assert t and max(x["open"] for x in t) > 0.5, "mouth track never opens: is voice.wav silent?"
    json.dump(t, open(f"{d}/voice/mouth.json", "w"))
    print(f"mouth.json: {len(t)} frames, open on {sum(x['open'] > 0 for x in t)} of them")
