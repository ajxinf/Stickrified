"""Line timings from words.json: python scripts/line_times.py videos/<slug>  (seconds and composition frames, 30 fps)."""
import json, re, sys

d = sys.argv[1]
script = json.load(open(f"{d}/script.json", encoding="utf8"))
words = json.load(open(f"{d}/voice/words.json", encoding="utf8"))
tok = lambda s: [x for x in re.sub(r"\[[^\]]*\]", " ", s).split() if re.search(r"\w", x)]
i = 0
for n, line in enumerate(script["lines"], 1):
    k = len(tok(line["narration"]))
    a, b = words[i], words[i + k - 1]
    i += k
    print(f"{n:2d} {a['start']:6.2f}-{b['end']:6.2f}  f{round(a['start'] * 30):4d}-{round(b['end'] * 30):4d}  {line['narration'][:72]}")
assert i == len(words), f"script has {i} words, words.json {len(words)}"
