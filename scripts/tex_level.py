#!/usr/bin/env python3
"""Level CC0 photo textures for the R25 real look: assets/tex/<name>.jpg (raw Poly Haven downloads) -> public/tex/<name>.jpg.

Photo albedos average 0.2-0.45 sRGB; the light presets were tuned on painted fills around 0.66. A per-image power curve
on luminance (hue kept, no clipping) lifts the mean to TARGET, so a photo surface sits as bright as the old painted one
and keeps its grain, grooves and stains. Materials tint the result with toonMaterial `color`.

Usage: python scripts/tex_level.py [--target 0.62]   (re-run after adding a texture to assets/tex/)
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

TARGET = float(sys.argv[sys.argv.index("--target") + 1]) if "--target" in sys.argv else 0.62


def level(a, target=TARGET):
    """a: float RGB 0..1 (sRGB). Returns the image with mean luminance ~target, hue and relative contrast kept."""
    lum = a @ np.array([0.2126, 0.7152, 0.0722])
    k = np.log(target) / np.log(max(float(lum.mean()), 1e-3))
    out_l = np.clip(lum, 1e-4, 1) ** k
    return np.clip(a * (out_l / np.clip(lum, 1e-4, None))[..., None], 0, 1)


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        g = np.random.default_rng(1).random((64, 64, 3)) * 0.4
        o = level(g)
        lum = o @ np.array([0.2126, 0.7152, 0.0722])
        assert abs(lum.mean() - TARGET) < 0.08 and o.max() <= 1, lum.mean()
        print("selftest ok")
        sys.exit()
    os.makedirs("public/tex", exist_ok=True)
    for src in sorted(glob.glob("assets/tex/*.jpg")):
        a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
        o = level(a)
        dst = os.path.join("public/tex", os.path.basename(src))
        Image.fromarray((o * 255 + 0.5).astype(np.uint8)).save(dst, quality=90)
        print(f"{os.path.basename(src):32s} mean {a.mean():.3f} -> {o.mean():.3f}")
