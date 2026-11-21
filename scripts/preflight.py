#!/usr/bin/env python3
"""QA pre-render frame check (video-qa "Layer 1b"): look at real frames of every shot BEFORE the final render, so a
visual defect costs a still, not a 40-minute render.

Usage: python scripts/preflight.py <Composition> <slug> [--scale 0.3] [--draft]
  1. QA layer 1 + stills (scripts/stills.mjs, one bundle): each shot's first+4 and last-4 frames, plus its middle
     when the shot is longer than 75 frames. Needs out/<slug>/shots.json (any stills/render pass writes it; if it is
     missing, a frame-0 still is rendered first to create it).
  2. out/<slug>/pre/P01.jpg ...: 6 x 3 labelled tiles ("f123  A1"), and out/<slug>/pre/INDEX.md with the checklist.
Read every sheet (layer 3's checklist), fix, re-run. --draft renders even while layer 1 fails (never for sign-off).
"""
import json
import os
import subprocess
import sys

from PIL import Image, ImageDraw

COLS, ROWS, TILE_W = 6, 3, 220


def frames_for(shots):
    out = []
    for s in shots:
        a, b = s["a"], s["b"]
        picks = {min(a + 4, b), max(b - 4, a)}
        if b - a + 1 > 75:
            picks.add((a + b) // 2)
        out += [(f, s["id"].split("/")[-1].split("-")[0]) for f in sorted(picks)]
    return out


def stills(comp, prefix, frames, scale, draft):
    cmd = ["node", "scripts/stills.mjs", comp, prefix, ",".join(map(str, frames)), str(scale)] + (["--draft"] if draft else [])
    if subprocess.run(cmd).returncode:
        sys.exit("preflight: stills.mjs failed (QA layer 1 above, or a render error); fix it or pass --draft")


def main():
    a = sys.argv[1:]
    draft = "--draft" in a
    a = [x for x in a if x != "--draft"]
    scale = float(a.pop(a.index("--scale") + 1)) if "--scale" in a else 0.3
    a = [x for x in a if x != "--scale"]
    if len(a) != 2:
        sys.exit(__doc__)
    comp, slug = a
    pre = f"out/{slug}/pre"
    os.makedirs(pre, exist_ok=True)
    for old in os.scandir(pre):  # a re-run must not mix old frames into the sheets
        os.remove(old.path)
    if not os.path.exists(f"out/{slug}/shots.json"):
        stills(comp, f"{pre}/p_", [0], scale, draft)
    shots = json.load(open(f"out/{slug}/shots.json", encoding="utf-8"))["shots"]
    picks = frames_for(shots)
    stills(comp, f"{pre}/p_", [f for f, _ in picks], scale, draft)

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
    open(f"{pre}/INDEX.md", "w", encoding="utf-8").write("\n".join(idx) + "\n")
    print(f"preflight: {len(picks)} stills -> {len(names)} sheets in {pre} (read INDEX.md)")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--selftest":
        got = frames_for([{"id": "v/A1-x", "a": 0, "b": 59}, {"id": "v/B2-y", "a": 60, "b": 159}, {"id": "v/C3", "a": 160, "b": 162}])
        assert got == [(4, "A1"), (55, "A1"), (64, "B2"), (109, "B2"), (155, "B2"), (162, "C3"), (160, "C3")] or \
            sorted(got) == sorted([(4, "A1"), (55, "A1"), (64, "B2"), (109, "B2"), (155, "B2"), (160, "C3"), (162, "C3")]), got
        print("selftest ok")
    else:
        main()
