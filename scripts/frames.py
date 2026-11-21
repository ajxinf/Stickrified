#!/usr/bin/env python3
"""Exact-frame inspection for QA layer 3: labelled contact sheets of a render.

Usage:
  python scripts/frames.py out/<slug>/final.mp4 out/<slug>/shots.json videos/<slug> [--every 3] [--out out/<slug>/qa/frames]
         [--prev out/<slug>/qa/prev_final.mp4]

Writes to --out:
  sheets/S001.png  QA sheets (QA layer 3): every --every-th frame of the WHOLE video, 5 x 4 tiles,
                   continuous across shots and inserts (an insert that is in no shot used to be on no sheet), each tile
                   labelled "f123  B04  'word'"
  key/f0123.png    full-resolution exact frames: first/last of each shot, each dissolve's middle, every word start
                   and every sound event: where gags and reactions land. Opened only where a sheet raises a question.
  INDEX.md         the files frame by frame, and the checklist to tick for each sheet (video-qa skill)
  CHANGED.md       with --prev (the last QA-ed render): the shots whose pixels changed, the only sheets a re-QA opens
Frames are decoded sequentially (cv2) and streamed, so frame N is exactly composition frame N and memory stays flat
(the old version held every 1080x1920 frame in RAM, ~15 GB for 80 s).
"""
import argparse, json, os, sys
import cv2
import numpy as np

QA = dict(tile_w=288, cols=5, rows=4)
CHANGE_LEVEL = 1.5  # mean abs pixel difference (0-255) on 1/8-size frames above which a shot counts as changed


def label(img, text):
    h = img.shape[0]
    cv2.rectangle(img, (0, 0), (img.shape[1], int(h * 0.055)), (0, 0, 0), -1)
    cv2.putText(img, text, (6, int(h * 0.042)), cv2.FONT_HERSHEY_SIMPLEX, h / 900, (80, 230, 255), 1, cv2.LINE_AA)
    return img


class Sheets:
    """Collects labelled tiles and writes a sheet every cols x rows tiles."""

    def __init__(self, folder, prefix, tile_w, cols, rows, digits):
        self.folder, self.prefix, self.tile_w, self.cols, self.rows, self.digits = folder, prefix, tile_w, cols, rows, digits
        self.tiles, self.span, self.names = [], [], []
        os.makedirs(folder, exist_ok=True)

    def add(self, img, f, text):
        th = round(self.tile_w * img.shape[0] / img.shape[1])
        self.tiles.append(label(cv2.resize(img, (self.tile_w, th), interpolation=cv2.INTER_AREA), text))
        self.span.append(f)
        if len(self.tiles) == self.cols * self.rows:
            self.flush()

    def flush(self):
        if not self.tiles:
            return
        per = self.cols * self.rows
        while len(self.tiles) < per:
            self.tiles.append(self.tiles[-1] * 0)
        rows = [cv2.hconcat(self.tiles[r * self.cols:(r + 1) * self.cols]) for r in range(self.rows)]
        name = f"{self.prefix}{len(self.names) + 1:0{self.digits}d}.png"
        cv2.imwrite(os.path.join(self.folder, name), cv2.vconcat(rows))
        self.names.append((name, self.span[0], self.span[-1]))
        self.tiles, self.span = [], []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("shots"); ap.add_argument("videodir")
    ap.add_argument("--every", type=int, default=3); ap.add_argument("--out"); ap.add_argument("--prev")
    a = ap.parse_args()
    out = a.out or os.path.join(os.path.dirname(a.video), "qa", "frames")
    for sub in ("sheets", "key"):
        d = os.path.join(out, sub)
        os.makedirs(d, exist_ok=True)
        for old in os.scandir(d):  # a re-run must not leave the previous layout's sheets behind
            os.remove(old.path)
    plan = json.load(open(a.shots, encoding="utf-8"))
    shots = plan["shots"]
    words = json.load(open(os.path.join(a.videodir, "voice", "words.json"), encoding="utf-8"))
    ev_path = os.path.join(a.videodir, "audio", "events.json")
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio"))
    import events as ev
    events = ev.load(a.videodir)["events"] if os.path.exists(ev_path) else []
    fps = 30
    word_at = {}
    for w in words:
        for f in range(round(w["start"] * fps), round(w["end"] * fps) + 1): word_at.setdefault(f, w["text"].replace("*", ""))
    shot_at = {}
    for s in shots:
        for f in range(s["a"], s["b"] + 1): shot_at.setdefault(f, short(s["id"]))
    keys = {}
    for s in shots:
        keys.setdefault(s["a"], []).append(f"{short(s['id'])} first"); keys.setdefault(s["b"], []).append(f"{short(s['id'])} last")
    for x0, x1 in plan.get("xfade", []): keys.setdefault((x0 + x1) // 2, []).append("dissolve middle")
    for w in words: keys.setdefault(round(w["start"] * fps), []).append(f"word '{w['text']}'")
    for e in events: keys.setdefault(e["f"], []).append(f"sfx {e['sfx']}: {e.get('note', '')}")

    qa = Sheets(os.path.join(out, "sheets"), "S", QA["tile_w"], QA["cols"], QA["rows"], 3)
    cap = cv2.VideoCapture(a.video)
    prev = cv2.VideoCapture(a.prev) if a.prev else None
    diff = {}  # shot -> [sum, count]
    n = 0
    while True:
        ok, img = cap.read()
        if not ok: break
        f, shot = n, shot_at.get(n, "INSERT")
        text = f"f{f}  {shot}  {word_at.get(f, '')}"
        if f % a.every == 0: qa.add(img.copy(), f, text)
        if f in keys: cv2.imwrite(os.path.join(out, "key", f"f{f:04d}.png"), img)
        if prev is not None:
            okp, old = prev.read()
            small = lambda x: cv2.resize(x, (x.shape[1] // 8, x.shape[0] // 8), interpolation=cv2.INTER_AREA).astype(np.float32)
            d = float(np.abs(small(img) - small(old)).mean()) if okp and old.shape == img.shape else 255.0
            acc = diff.setdefault(shot, [0.0, 0])
            acc[0] += d; acc[1] += 1
        n += 1
    if n == 0: sys.exit(f"could not decode {a.video}")
    qa.flush()

    index = [f"# Exact frames: {a.video}", "", f"{n} frames. QA sheets show every {a.every} frame(s) of the whole video "
             f"(inserts included); key frames are full size.", "",
             "## Checklist per sheet (tick every tile, note the frame number of anything wrong)",
             "- Clipping: anything passing through anything (props, poles, rays, hands, hats, walls, roofs, fences)",
             "- Scale: people vs doors, sheds, cars, furniture; nobody taller than a door they stand by",
             "- Contact: feet on the ground, held props in the hand, nothing floating or sunk",
             "- Background: no empty sky-and-grass frames; a story-relevant detail or life in every wide",
             "- Faces and reactions: the right expression on the right word; nothing hidden behind a caption",
             "- Light: no pure-white blowouts, no sudden light jumps inside a shot", "", "## QA sheets", ""]
    index += [f"- [ ] `sheets/{nm}`: f{a0}-f{b0}" for nm, a0, b0 in qa.names]
    index += ["", "## Key frames (full size)", ""]
    index += [f"- [ ] `key/f{g:04d}.png`: " + "; ".join(keys[g]) for g in sorted(keys) if g < n]
    open(os.path.join(out, "INDEX.md"), "w", encoding="utf-8").write("\n".join(index) + "\n")

    if prev is not None:
        changed = [(s, v[0] / v[1]) for s, v in diff.items() if v[0] / v[1] > CHANGE_LEVEL]
        order = {short(s["id"]): s["a"] for s in shots}
        changed.sort(key=lambda x: order.get(x[0], 1e9))
        spans = {}
        for f, s in shot_at.items(): spans.setdefault(s, [f, f]); spans[s] = [min(spans[s][0], f), max(spans[s][1], f)]
        lines = [f"# Changed since {a.prev}", "", f"Mean abs pixel difference per shot (1/8 size, 0-255) above {CHANGE_LEVEL}.", ""]
        for s, d in changed:
            a0, b0 = spans.get(s, ["?", "?"])
            sheets = [nm for nm, x, y in qa.names if isinstance(a0, int) and y >= a0 and x <= b0]
            lines.append(f"- {s} f{a0}-f{b0}: diff {d:.1f}; sheets {', '.join(sheets)}")
        lines += ["", f"Unchanged: {', '.join(s for s in sorted(diff, key=lambda x: order.get(x, 1e9)) if s not in dict(changed))}"]
        open(os.path.join(out, "CHANGED.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
        print(f"changed shots: {len(changed)} of {len(diff)} -> CHANGED.md")
    print(f"{n} frames -> {out} ({len(qa.names)} QA sheets, {len([g for g in keys if g < n])} key frames)")


def short(shot_id):
    return shot_id.split("/")[-1].split("-")[0]


if __name__ == "__main__":
    main()
