#!/usr/bin/env python3
"""QA pre-render frame check (video-qa "Layer 1b"): look at real frames of every shot BEFORE the final render, so a
visual defect costs a still, not a 40-minute render.

Usage: python scripts/preflight.py <Composition> <slug> [--scale 0.3] [--draft]
  1. QA layer 1 + stills (scripts/stills.mjs, one bundle): each shot's first+4 and last-4 frames, plus its middle
     when the shot is longer than 75 frames. Needs out/<slug>/shots.json (any stills/render pass writes it; if it is
     missing, a frame-0 still is rendered first to create it).
  2. out/<slug>/pre/P01.jpg ...: 6 x 3 labelled tiles ("f123  A1"), and out/<slug>/pre/INDEX.md with the checklist.
  3. R27 framing flags in INDEX.md (look, then fix or keep on purpose): a cut that keeps the same composition, and a
     shot of 1.5 s+ whose first and last stills barely differ (a frozen picture under changing captions).
  `--flags-only` redoes step 3 from the stills already on disk (no rendering).
Read every sheet (layer 3's checklist), fix, re-run. --draft renders even while layer 1 fails (never for sign-off).
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

COLS, ROWS, TILE_W = 6, 3, 220
# Calibrated on moon R26 stills: deliberate match cuts (ten/twenty/thirty) .031-.037, ordinary cuts .07-.31;
# near-frozen shots .008-.012, acting shots .03+.
CUT_SAME, FROZEN, FROZEN_MIN_F = 0.05, 0.015, 45


def frames_for(shots):
    out = []
    for s in shots:
        a, b = s["a"], s["b"]
        picks = {min(a + 4, b), max(b - 4, a)}
        if b - a + 1 > 75:
            picks.add((a + b) // 2)
        out += [(f, s["id"].split("/")[-1].split("-")[0]) for f in sorted(picks)]
    return out


def sig(path):
    """18x32 grey thumbnail, caption band masked: the composition, not the words or fine detail."""
    import numpy as np
    a = np.asarray(Image.open(path).convert("L").resize((18, 32), Image.BILINEAR), float) / 255
    a[int(32 * .62):int(32 * .78), :] = np.nan
    return a


def framing_flags(shots, pre):
    import numpy as np
    d = lambda a, b: float(np.nanmean(np.abs(a - b)))
    out, prev = [], None
    for s in shots:
        a, b, sid = s["a"], s["b"], s["id"].split("/")[-1]
        f0, f1 = min(a + 4, b), max(b - 4, a)
        if not (os.path.exists(f"{pre}/p_{f0:04d}.png") and os.path.exists(f"{pre}/p_{f1:04d}.png")):
            prev = None
            continue
        s0, s1 = sig(f"{pre}/p_{f0:04d}.png"), sig(f"{pre}/p_{f1:04d}.png")
        if prev is not None and d(prev[1], s0) < CUT_SAME:
            out.append(f"- [ ] same framing across the cut {prev[0]} -> {sid} (f{a}, diff {d(prev[1], s0):.3f}): a match cut on purpose, or change the size/angle")
        if b - a + 1 >= FROZEN_MIN_F and d(s0, s1) < FROZEN:
            out.append(f"- [ ] {sid} f{a}-{b} looks frozen ({(b - a + 1) / 30:.1f} s, diff {d(s0, s1):.3f}): give it a visible action (face, gesture, prop, world)")
        prev = (sid, s1)
    return out


def stills(comp, prefix, frames, scale, draft, guard=True):
    cmd = ["node", "scripts/stills.mjs", comp, prefix, ",".join(map(str, frames)), str(scale)] + (["--draft"] if draft else []) + ([] if guard else ["--no-guard"])
    if subprocess.run(cmd).returncode:
        sys.exit("preflight: stills.mjs failed (QA layer 1 above, or a render error); fix it or pass --draft")


def main():
    a = sys.argv[1:]
    draft = "--draft" in a
    flags_only = "--flags-only" in a
    a = [x for x in a if x not in ("--draft", "--flags-only")]
    scale = float(a.pop(a.index("--scale") + 1)) if "--scale" in a else 0.3
    a = [x for x in a if x != "--scale"]
    if len(a) != 2:
        sys.exit(__doc__)
    comp, slug = a
    pre = f"out/{slug}/pre"
    if flags_only:
        flags = framing_flags(json.load(open(f"out/{slug}/shots.json", encoding="utf-8"))["shots"], pre)
        print("\n".join(flags) or "preflight: no framing flags")
        return
    os.makedirs(pre, exist_ok=True)
    for old in os.scandir(pre):  # a re-run must not mix old frames into the sheets
        os.remove(old.path)
    # QA layer 1 runs exactly once per round (user 2026-11-22): here, with frame 0, which also writes shots.json; the
    # review stills after it skip the guard (--no-guard).
    stills(comp, f"{pre}/p_", [0], scale, draft)
    shots = json.load(open(f"out/{slug}/shots.json", encoding="utf-8"))["shots"]
    picks = frames_for(shots)
    stills(comp, f"{pre}/p_", [f for f, _ in picks], scale, draft, guard=False)

    per = COLS * ROWS
    names = []
    for i in range(0, len(picks), per):
        tiles = []
        for f, sid in picks[i:i + per]:
            im = Image.open(f"{pre}/p_{f:04d}.png").convert("RGB")
            im = im.resize((TILE_W, round(im.height * TILE_W / im.width)))
            d = ImageDraw.Draw(im)
            d.rectangle((0, 0, TILE_W, 16), fill=(0, 0, 0))
            d.text((4, 2), f"f{f}  {sid}", fill=(255, 255, 0))
            tiles.append(im)
        th = tiles[0].height
        sheet = Image.new("RGB", (COLS * TILE_W, ROWS * th), (40, 40, 40))
        for k, t in enumerate(tiles):
            sheet.paste(t, ((k % COLS) * TILE_W, (k // COLS) * th))
        name = f"P{i // per + 1:02d}.jpg"
        sheet.save(f"{pre}/{name}", quality=88)
        names.append((name, picks[i][0], picks[min(i + per, len(picks)) - 1][0]))
    idx = [f"# Pre-render frames: {comp} ({len(picks)} stills, {len(shots)} shots{', DRAFT: layer 1 failing' if draft else ''})", "",
           "Tick every tile (video-qa layer 3 checklist): clipping, scale, feet/contact, props in hands, empty or one-colour",
           "frames, faces/expressions, caption band (y .64-.76) clear of faces and gags, glare, text cut by the frame.",
           f"Full-size stills: `{pre}/p_<frame>.png`.", ""]
    idx += [f"- [ ] `{n}`: f{x}-f{y}" for n, x, y in names]
    flags = framing_flags(shots, pre)
    idx += ["", "## Framing flags (R27)", ""] + (flags or ["none"])
    open(f"{pre}/INDEX.md", "w", encoding="utf-8").write("\n".join(idx) + "\n")
    print(f"preflight: {len(picks)} stills -> {len(names)} sheets in {pre}, {len(flags)} framing flag(s) (read INDEX.md)")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        got = frames_for([{"id": "v/A1-x", "a": 0, "b": 59}, {"id": "v/B2-y", "a": 60, "b": 159}, {"id": "v/C3", "a": 160, "b": 162}])
        assert got == [(4, "A1"), (55, "A1"), (64, "B2"), (109, "B2"), (155, "B2"), (162, "C3"), (160, "C3")] or \
            sorted(got) == sorted([(4, "A1"), (55, "A1"), (64, "B2"), (109, "B2"), (155, "B2"), (160, "C3"), (162, "C3")]), got
        print("selftest ok")
    else:
        main()
