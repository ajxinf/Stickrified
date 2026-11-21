"""Deliver an episode: the only way a video reaches Episodes/ (R23, 2026-11-17).

Usage: python scripts/deliver.py <slug> <N> "<Title from PUBLISH.md>" [--user-approved "<what the user said>"]

Episode 3 was copied to Episodes/ with QA layer 3 never run (glare, a door onto a wall, cut text, a cheap look). This
gate refuses the copy unless every QA check is on disk and passing (the user reviews the finished video by eye; the AI
critic review was removed 2026-11-21):
  1. out/<slug>/layer1.json   QA layer 1: no unintended failure (incl. Glare, Door logic, Text in frame)
  2. out/<slug>/QA.md         a line "Verdict: PASS" (video-qa skill: layers 2 and 3 done)
  3. out/<slug>/final.mp4     newer than video.mp4 and the mix; richness.py inside the reference ranges
--user-approved ships despite failures, only when the user said so; the failures and their words go to
videos/<slug>/DELIVERY.md.
"""
import datetime
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np  # noqa: E402
from richness import REFS, frames, measure  # noqa: E402


def check(slug):
    out, vid, bad = f"out/{slug}", f"videos/{slug}", []
    try:
        real = [x for r in json.load(open(f"{out}/layer1.json")) for x in r.get("fails", []) if not x.get("intended")]
        if real:
            bad.append(f"layer 1: {len(real)} unintended failure(s), first: {real[0]['check']} {real[0]['shot']} {real[0]['note']}")
    except FileNotFoundError:
        bad.append("layer 1: out/<slug>/layer1.json missing (render with scripts/render.mjs)")
    qa = open(f"{out}/QA.md", encoding="utf-8").read() if os.path.exists(f"{out}/QA.md") else ""
    if not re.search(r"^Verdict:\s*PASS", qa, re.M):
        bad.append("QA.md: no 'Verdict: PASS' line (run the video-qa skill, all three layers)")
    final = f"{out}/final.mp4"
    if not os.path.exists(final):
        bad.append("final.mp4 missing")
    else:
        for src in (f"{out}/video.mp4", f"{vid}/audio/mix.wav"):
            if os.path.exists(src) and os.path.getmtime(src) > os.path.getmtime(final):
                bad.append(f"final.mp4 is older than {src}: re-mux")
        ms = [measure(f) for f in frames(final)]
        for k, (lo, hi) in REFS.items():
            v = float(np.median([m[k] for m in ms]))
            if not lo <= v <= hi:
                bad.append(f"richness {k} {v:.3f} outside refs {lo}-{hi}")
    return bad


if __name__ == "__main__":
    a = sys.argv[1:]
    approved = a.pop(a.index("--user-approved") + 1) if "--user-approved" in a else None
    a = [x for x in a if x != "--user-approved"]
    if len(a) != 3:
        sys.exit(__doc__)
    slug, n, title = a
    bad = check(slug)
    for b in bad:
        print("FAIL", b)
    if bad and not approved:
        sys.exit("NOT DELIVERED: fix the above (or ask the user; ship only with --user-approved \"<their words>\")")
    os.makedirs("Episodes", exist_ok=True)
    dst = f"Episodes/Episode_{n}_{re.sub(r'[^A-Za-z0-9]+', '_', title).strip('_')}.mp4"
    shutil.copy2(f"out/{slug}/final.mp4", dst)
    with open(f"videos/{slug}/DELIVERY.md", "a", encoding="utf-8") as f:
        f.write(f"\n## {datetime.date.today()} -> {dst}\n" + ("all gates passed\n" if not bad else f"user approved: {approved}\n" + "".join(f"- {b}\n" for b in bad)))
    print("DELIVERED", dst)
