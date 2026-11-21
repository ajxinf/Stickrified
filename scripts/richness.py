"""Does it look cheap? Measure a render's richness against the visual references (R21b, 2026-11-16).

Usage: python scripts/richness.py <video.mp4 | still.png ...>
Samples a video every 2 s (or takes stills) above the caption band and prints the median of:
  crisp     Laplacian variance x1000 (refs 8.5-21.6): lower = mushy (too much lens blur, bloom, haze)
  edges     Canny edge density (refs .050-.093): lower = empty sets, few ink lines
  hue_ent   hue entropy of coloured pixels, bits (refs 2.0-2.7): lower = one colour everywhere
  warm      share of colour that is red/orange/magenta (refs .15-.77): higher = a single warm cast
  flat      share of 24 px tiles with almost no detail (refs .24-.42)
  colorful  Hasler-Susstrunk colourfulness (refs .23-.36)
Ep 2 cut 4 measured crisp 5.9 / edges .048 / warm .89: "looks cheap next to the refs" (user). After the R21b fixes
(DOF 4-5 px, bloom .32, cooler sunset shade, bunting, looser framing): 13.6 / .127 / .78.
"""
import subprocess
import sys

import cv2
import numpy as np

# R24 (2026-11-21): widened to include visual-ref8 (day, hue_ent 1.65, colorful .21) and visual-ref9 (night, hue_ent 1.42,
# colorful .18, flat .54 from its dark sky), now the primary refs: calmer, more natural colour than refs 1-7.
REFS = {"crisp": (8.5, 21.6), "edges": (0.050, 0.093), "hue_ent": (1.4, 2.7), "warm": (0.15, 0.77), "flat": (0.24, 0.55), "colorful": (0.17, 0.36)}


def frames(path, step=2.0, w=540):
    if path.lower().endswith((".png", ".jpg")):
        im = cv2.imread(path)
        return [cv2.resize(im, (w, int(im.shape[0] * w / im.shape[1])))]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True).stdout)
    out = []
    for t in np.arange(1.0, dur - 1, step):
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", path, "-frames:v", "1", "-vf", f"scale={w}:-2", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
        h = len(r) // (w * 3)
        if h:
            out.append(np.frombuffer(r, np.uint8)[: w * h * 3].reshape(h, w, 3))
    return out


def measure(im):
    im = im[: int(im.shape[0] * 0.62)]  # above the caption band
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV).astype(np.float32)
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    sat, val = hsv[..., 1] / 255, hsv[..., 2] / 255
    colored = (sat > 0.2) & (val > 0.15)
    hh = np.histogram(hsv[..., 0][colored], 18, (0, 180))[0].astype(float)
    hh /= max(hh.sum(), 1)
    tiles = g[: g.shape[0] // 24 * 24, : g.shape[1] // 24 * 24].reshape(g.shape[0] // 24, 24, -1, 24).std(axis=(1, 3))
    b, gr, r = [im[..., i].astype(np.float32) for i in range(3)]
    rg, yb = r - gr, 0.5 * (r + gr) - b
    return {
        "crisp": cv2.Laplacian(g, cv2.CV_32F).var() * 1000,
        "edges": cv2.Canny(im, 80, 160).mean() / 255,
        "hue_ent": -(hh[hh > 0] * np.log2(hh[hh > 0])).sum(),
        "warm": ((hsv[..., 0] < 20) | (hsv[..., 0] > 160))[colored].mean() if colored.any() else 0.0,
        "flat": (tiles < 0.025).mean(),
        "colorful": (np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2)) / 255,
    }


if __name__ == "__main__":
    ms = [measure(f) for p in sys.argv[1:] for f in frames(p)]
    assert ms, "no frames"
    for k, (lo, hi) in REFS.items():
        v = float(np.median([m[k] for m in ms]))
        print(f"{k:9s} {v:8.3f}   refs {lo}-{hi}   {'ok' if lo <= v <= hi else 'LOW' if v < lo else 'HIGH'}")
