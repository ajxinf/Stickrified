"""Pull sentence-final words that Eleven's aligner placed in the pause after them back onto their speech.

Usage: python scripts/audio/fix_word_drift.py videos/<slug>      (then rerun mouth.py, sfx_gen.py, mix.py)
A word whose span in voice.wav is below -40 dB RMS is in silence (the mix's "lowest word" goes very negative). Its
speech is what ends just before it: walk back in 10 ms steps to the last frame above -35 dB, end the word there and
keep its duration (never before the previous word's start; the previous word's end is trimmed if needed). Found on
"That's me" in trapped-in-this-world (0.3 s late) and 8 sentence-final words in gta-started-as-race-n-chase.
Writes voice/words.json in place (keep a copy if you want to compare); prints every move.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile


def main(d):
    sr, v = wavfile.read(f"{d}/voice/voice.wav")
    v = v.astype(float)
    v /= np.abs(v).max() + 1e-9
    p = f"{d}/voice/words.json"
    w = json.load(open(p))
    db = lambda a, b: 20 * np.log10(np.sqrt(np.mean(v[max(int(a * sr), 0):int(b * sr)] ** 2)) + 1e-9)
    fixed = 0
    for i, x in enumerate(w):
        if db(x["start"], max(x["end"], x["start"] + 0.05)) >= -40:
            continue
        t = x["start"]
        while t > 0 and db(t - 0.01, t) < -35:
            t -= 0.01
        dur = x["end"] - x["start"]
        new_end = round(t, 3)
        new_start = round(max(w[i - 1]["start"] + 0.04 if i else 0, new_end - dur), 3)
        if i and new_start < w[i - 1]["end"]:
            w[i - 1]["end"] = new_start
        print(f"{x['text']}: {x['start']:.3f}-{x['end']:.3f} -> {new_start:.3f}-{new_end:.3f}")
        x["start"], x["end"] = new_start, new_end
        fixed += 1
    json.dump(w, open(p, "w"), indent=1)
    print(f"fixed {fixed} word(s)")


if __name__ == "__main__":
    main(sys.argv[1])
