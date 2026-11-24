"""Mix voice + SFX + music, duck the music under the voice, master to -14 LUFS / -1 dBTP, report loudness.

Usage: python scripts/audio/mix.py videos/<slug>
Reads  voice/voice.wav + voice/words.json, audio/sfx.wav, audio/music.wav (bed), audio/button.wav (48 kHz)
Writes audio/mix.wav (48 kHz, exact video length), audio/loudness.json, public/<slug>/mix.wav (Studio preview).
Levels (toon-world-short SKILL "Mix"), relative to the stems' reference levels (music bed RMS -20 dBFS, SFX peaks
-3 dBFS each, voice as delivered by ElevenLabs): voice 0 dB, music bed -3 dB, button -3 dB (not ducked), SFX -6 dB.
Ducking: bed -16 dB while the voice speaks (30 ms attack, 250 ms release).
Check: voice vs music in the speech band (200-4000 Hz) during the words of words.json must be >= 15 dB (FAIL
otherwise), and the button must stay below the voice on the last word.
Mastering: gain to -14 LUFS + look-ahead true-peak limiter (ceiling -1.3 dBTP), metered with ffmpeg loudnorm.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from scipy.io import wavfile

SR = 48000
MUSIC_DB, BUTTON_DB, SFX_DB, DUCK_DB = -3, -3, -12, 16  # SFX -12 (was -6; user 2026-11-15: effects way too loud)
SFX_DUCK_DB = 6  # effects also dip under the narrator, so hits sit in the gaps
AMB_DB, AMB_DUCK_DB = -9, 13  # R13: a continuous scene bed under everything, ducked less than the music
MIN_GAP_DB = 15
TRACK_CARVE_DB = -6  # speech-band dip on library tracks (assets/bgm, 2026-11-16): voice was only 21 dB clear without it
MAX_SFX_DB = -16  # loudest effect 16 dB under the narrator (user 2026-11-15: still way too loud at -10)
AMB_UNDER_VOICE_DB = 24  # the scene bed stays this far under the narrator while he speaks (dawn groans masked 'Dave thinks Chad is winning')
FFMPEG = os.path.abspath("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")  # bundled with Remotion
db = lambda x: 10 ** (x / 20)


def read(p):
    sr, x = wavfile.read(p)
    assert sr == SR, f"{p}: {sr} Hz"
    x = x / float(np.iinfo(x.dtype).max + 1) if x.dtype.kind == "i" else x.astype(np.float64)
    return x if x.ndim == 1 else x.mean(axis=1)


def envelope(x, attack, release):
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    out, e = np.zeros_like(x), 0.0
    for i, v in enumerate(np.abs(x)):
        c = a if v > e else r
        e = c * e + (1 - c) * v
        out[i] = e
    return out


def loudness(path):
    """EBU R128 integrated loudness (LUFS) and true peak (dBTP) via loudnorm's measuring pass (the ffmpeg bundled
    with Remotion has no ebur128 filter)."""
    log = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(log[log.rfind("{"):log.rfind("}") + 1])
    return m


def read_st(p):
    sr, x = wavfile.read(p)
    assert sr == SR, f"{p}: {sr} Hz"
    x = x / float(np.iinfo(x.dtype).max + 1) if x.dtype.kind == "i" else x.astype(np.float64)
    return np.stack([x, x], 1) if x.ndim == 1 else x[:, :2]


def shelf(x, f0, gain_db, high):
    """RBJ shelving biquad (S = 1) on every channel."""
    from scipy.signal import lfilter
    A, w = 10 ** (gain_db / 40), 2 * np.pi * f0 / SR
    al, c = np.sin(w) / 2 * np.sqrt(2), np.cos(w)
    sq = 2 * np.sqrt(A) * al
    if high:
        b = [A * ((A + 1) + (A - 1) * c + sq), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - sq)]
        a = [(A + 1) - (A - 1) * c + sq, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - sq]
    else:
        b = [A * ((A + 1) - (A - 1) * c + sq), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - sq)]
        a = [(A + 1) + (A - 1) * c + sq, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - sq]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=0)


def carve(x, cut_db=TRACK_CARVE_DB):
    """A library track's keys and pads fill the speech band the synth score left free: dip 300-4000 Hz (zero-phase,
    so subtracting the band leaves a clean notch)."""
    from scipy.signal import butter, sosfiltfilt
    return x - (1 - db(cut_db)) * sosfiltfilt(butter(2, [300, 4000], "bandpass", fs=SR, output="sos"), x, axis=0)


def widen(m, ms=11):
    """Mono -> stereo: the right channel a few ms late (Haas), so a mono stem fills the stereo field."""
    d = int(ms / 1000 * SR)
    late = np.concatenate([np.zeros(d), m[:-d]])
    return np.stack([m, 0.5 * (m + late)], 1)  # half-wet: R13 sits at about -26 dB side vs mid, not ultra-wide


def main(d):
    voice, music = read(f"{d}/voice/voice.wav"), read_st(f"{d}/audio/music.wav")
    sfx = read_st(f"{d}/audio/sfx.wav")
    n = len(sfx)  # sfx/music are written at the exact video length
    voice = np.pad(voice, (0, max(0, n - len(voice))))[:n]
    button = read(f"{d}/audio/button.wav")[:n]
    amb = read_st(f"{d}/audio/amb.wav")[:n] if os.path.exists(f"{d}/audio/amb.wav") else np.zeros((n, 2))
    # Duck the bed: gain falls DUCK_DB where the voice envelope is above -40 dBFS (full depth 6 dB above that).
    ev = envelope(voice, 0.03, 0.25)
    k = np.clip((20 * np.log10(ev + 1e-9) + 40) / 6, 0, 1)
    ka = np.clip((20 * np.log10(ev + 1e-9) + 52) / 8, 0, 1)  # the bed also ducks under whispers (pilot: "Very, very gently")
    duck, aduck = db(-DUCK_DB * k), db(-AMB_DUCK_DB * ka)
    # Where the score drops out for a whisper or a beat ("music": "stop"/"stops"), the bed dips 18 dB too.
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import events as _ev
    mcfg = _ev.load(d).get("music", {})
    hole = np.zeros(n)
    for a, b in ([mcfg["stop"]] if mcfg.get("stop") else []) + mcfg.get("stops", []):
        hole[int(a / 30 * SR):int(b / 30 * SR)] = 1
    from scipy.ndimage import uniform_filter1d as _uf
    aduck = aduck * db(-18 * _uf(hole, int(0.15 * SR)))
    # Per video: "music": {"button_db": -12} when the last word is quiet (a deadpan line) and the button would bury it.
    button_db = json.load(open(f"{d}/audio/events.json"))["music"].get("button_db", BUTTON_DB)
    mono = np.array_equal(music[:, 0], music[:, 1])  # the synth score is mono; a library track (bgm.py) is a stereo master
    bedm = shelf(widen(music[:n, 0]), 160, 3, False) if mono else carve(music[:n])  # R13: warmer, wider score
    mus = db(MUSIC_DB) * bedm * duck[:, None] + db(button_db) * widen(button)
    ambm = db(AMB_DB) * amb * aduck[:, None]
    # R14 (reviewer: one word masked, lowest -5.9 dB): ride the bed + ambience down under any word that is still less
    # than WORD_GAP_DB clear of them, by the shortfall, with 60 ms ramps.
    words = json.load(open(f"{d}/voice/words.json"))
    ambm = amb_ceiling(voice, ambm, words, k)
    ride = word_ride(voice, (mus + ambm).mean(1), json.load(open(f"{d}/voice/words.json")))
    mus, ambm = mus * ride[:, None], ambm * ride[:, None]
    # The tail (user 2026-11-24: ~1.3 s after the last line, never a hard stop): music and bed fade out to the last frame.
    t0 = min(int(words[-1]["end"] * SR), n - 1)
    tail = np.ones(n)
    tail[t0:] = np.cos(np.linspace(0, np.pi / 2, n - t0)) ** 2
    mus, ambm = mus * tail[:, None], ambm * tail[:, None]
    sfxm = sfx_ceiling(voice, db(SFX_DB) * sfx * db(-SFX_DUCK_DB * k)[:, None], words)
    mix = np.stack([voice, voice], 1) + mus + ambm + sfxm
    # Master tone (R13 band study): more low end and air, a little less boxy low-mid.
    from scipy.signal import butter as _b, sosfilt as _sf
    mix = _sf(_b(2, 35, "highpass", fs=SR, output="sos"), mix, axis=0)  # no rumble under the sub
    mix = shelf(shelf(mix, 250, 4.5, False), 4000, 5.5, True)
    mid, side = mix.mean(1), (mix[:, 0] - mix[:, 1]) / 2
    mix = np.stack([mid + 0.45 * side, mid - 0.45 * side], 1)  # R13 width: side about -25 dB under mid
    gap = voice_gap(voice, (mus + ambm).mean(1), json.load(open(f"{d}/voice/words.json")))
    gap.update(sfx_check(voice, sfxm.mean(1), json.load(open(f"{d}/voice/words.json"))))
    pre = f"{d}/audio/premaster.wav"
    wavfile.write(pre, SR, mix.astype(np.float32))

    # Master: gain to -14 LUFS, then a look-ahead true-peak limiter (ceiling -1.3 dBTP); two rounds converge.
    out = f"{d}/audio/mix.wav"
    m = loudness(pre)
    os.remove(pre)  # intermediate: only metered
    x = mix
    for _ in range(3):
        x = limit(x * db(-14 - float(loudness_of(x)["input_i"])), -1.3)
    wavfile.write(out, SR, x.astype(np.float32))
    fin = loudness(out)
    i, tp = float(fin["input_i"]), float(fin["input_tp"])
    rep = {"integrated_lufs": i, "true_peak_dbtp": tp, "samples": n, "seconds": n / SR, "channels": 2,
           "premaster": {"lufs": float(m["input_i"]), "dbtp": float(m["input_tp"])},
           "levels_db": {"voice": 0, "music_bed": MUSIC_DB, "button": button_db, "sfx": SFX_DB, "duck": -DUCK_DB, "ambience": AMB_DB, "amb_duck": -AMB_DUCK_DB}, **gap}
    json.dump(rep, open(f"{d}/audio/loudness.json", "w"), indent=1)
    slug = os.path.basename(os.path.normpath(d))
    os.makedirs(f"public/{slug}", exist_ok=True)  # Studio preview: Video.tsx mounts it (16-bit keeps public/ small)
    wavfile.write(f"public/{slug}/mix.wav", SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
    print(f"mix.wav: {n / SR:.3f} s stereo, {i:.1f} LUFS integrated, true peak {tp:.1f} dBTP (premaster {m['input_i']} LUFS, {m['input_tp']} dBTP)")
    print(f"voice vs music+ambience in speech: {gap['voice_music_gap_db']:.1f} dB (lowest word {gap['voice_music_gap_min_word_db']:.1f} dB on {gap['worst_word']}); "
          f"voice vs button on the last word: {gap['voice_button_gap_db']:.1f} dB")
    print(f"loudest SFX moment: {gap['sfx_loudest_vs_voice_db']:+.1f} dB vs the narrator at {gap['sfx_loudest_at_s']} s (max {MAX_SFX_DB})")
    assert gap["sfx_loudest_vs_voice_db"] <= MAX_SFX_DB, f"FAIL: SFX {gap['sfx_loudest_vs_voice_db']:+.1f} dB vs the voice at {gap['sfx_loudest_at_s']} s (max {MAX_SFX_DB}): lower that event"
    assert abs(i + 14) <= 0.5 and tp <= -1.0, "master outside -14 +-0.5 LUFS / -1 dBTP"
    assert gap["voice_music_gap_db"] >= MIN_GAP_DB, f"FAIL: voice only {gap['voice_music_gap_db']:.1f} dB over the music (needs >= {MIN_GAP_DB})"
    # The toon skill's rule (15 dB); this only checked > 0, so the pilot shipped at 3.3 dB (review H4).
    assert gap["voice_button_gap_db"] >= MIN_GAP_DB, f"FAIL: button only {gap['voice_button_gap_db']:.1f} dB under the last word (needs >= {MIN_GAP_DB}): lower music.button_db"


WORD_GAP_DB = 12


def word_ride(voice, bed, words):
    from scipy.ndimage import uniform_filter1d
    from scipy.signal import butter, sosfilt
    sos = butter(4, [200, 4000], "bandpass", fs=SR, output="sos")
    v, m = sosfilt(sos, voice), sosfilt(sos, bed)
    rms = lambda z: np.sqrt(np.mean(z ** 2) + 1e-20)
    cut = np.zeros(len(bed))
    for i, w in enumerate(words):
        a, b = int(w["start"] * SR), max(int(w["end"] * SR), int(w["start"] * SR) + int(0.08 * SR))
        need = MIN_GAP_DB + 0.5 if i == len(words) - 1 else WORD_GAP_DB  # the punchline: a library track plays on under it
        short = need - 20 * np.log10(rms(v[a:b]) / rms(m[a:b]))
        if short > 0:
            cut[a:b] = np.maximum(cut[a:b], min(short, 18))
    ramp = int(0.06 * SR)
    cut = uniform_filter1d(np.maximum.reduce([cut, np.roll(cut, ramp), np.roll(cut, -ramp)]), ramp)
    return db(-cut)


def amb_ceiling(voice, amb, words, k, w=0.4):
    """While the narrator speaks (k = voice activity 0..1), ride the bed down wherever its 400 ms RMS is closer than
    AMB_UNDER_VOICE_DB to his median word: a loop's loud moments (groans, a crow) never sit on a line."""
    from scipy.ndimage import uniform_filter1d
    r = lambda z: 20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12)
    vref = float(np.median([r(voice[int(x["start"] * SR):int(x["end"] * SR)]) for x in words if x["end"] - x["start"] > 0.15]))
    env = np.sqrt(np.maximum(uniform_filter1d(amb.mean(1) ** 2, int(w * SR)), 0) + 1e-20)
    g = np.minimum(1.0, db(vref - AMB_UNDER_VOICE_DB) / env)
    g = 1 - uniform_filter1d(k, int(0.1 * SR)) * (1 - g)  # only while speaking
    return amb * uniform_filter1d(g, int(0.1 * SR))[:, None]


def sfx_ceiling(voice, sfx, words, w=0.4, margin=1.5):
    """Ride the SFX stem down wherever its 400 ms RMS would come within MAX_SFX_DB (+ margin) of the narrator's median
    word (the same measure as sfx_check), so the loudest hit lands at the bar instead of tripping it."""
    from scipy.ndimage import uniform_filter1d
    r = lambda z: 20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12)
    vref = float(np.median([r(voice[int(x["start"] * SR):int(x["end"] * SR)]) for x in words if x["end"] - x["start"] > 0.15]))
    env = np.sqrt(np.maximum(uniform_filter1d(sfx.mean(1) ** 2, int(w * SR)), 0) + 1e-20)
    g = np.minimum(1.0, db(vref + MAX_SFX_DB - margin) / env)
    g = uniform_filter1d(g, int(0.05 * SR))  # smooth 50 ms
    return sfx * g[:, None]


def sfx_check(voice, sfx, words, w=0.4):
    """Loudest 400 ms of the SFX stem vs the narrator's median word (both as mixed)."""
    r = lambda z: 20 * np.log10(np.sqrt(np.mean(z ** 2)) + 1e-12)
    vref = float(np.median([r(voice[int(x["start"] * SR):int(x["end"] * SR)]) for x in words if x["end"] - x["start"] > 0.15]))
    n, hop = int(w * SR), int(w * SR) // 4
    lv = np.array([r(sfx[i:i + n]) for i in range(0, len(sfx) - n, hop)])
    k = int(lv.argmax())
    return {"sfx_loudest_vs_voice_db": round(float(lv[k] - vref), 1), "sfx_loudest_at_s": round(k * hop / SR, 2)}


def voice_gap(voice, mus, words):
    """Speech-band (200-4000 Hz) RMS of the voice vs the music (bed + button, as mixed) during the spoken words."""
    from scipy.signal import butter, sosfilt
    sos = butter(4, [200, 4000], "bandpass", fs=SR, output="sos")
    v, m = sosfilt(sos, voice), sosfilt(sos, mus)
    rms = lambda z: np.sqrt(np.mean(z ** 2) + 1e-20)
    spans = [(int(w["start"] * SR), int(w["end"] * SR)) for w in words]
    idx = np.concatenate([np.arange(a, b) for a, b in spans])
    per = [(20 * np.log10(rms(v[a:b]) / rms(m[a:b])), w["text"]) for (a, b), w in zip(spans, words)]
    a, b = spans[-1]
    return {"voice_music_gap_db": round(float(20 * np.log10(rms(v[idx]) / rms(m[idx]))), 1),
            "voice_music_gap_min_word_db": round(float(min(per)[0]), 1), "worst_word": min(per)[1],
            "voice_button_gap_db": round(float(20 * np.log10(rms(v[a:b]) / rms(m[a:b]))), 1)}


def loudness_of(x):
    tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_meter.wav")
    wavfile.write(tmp, SR, x.astype(np.float32))
    try:
        return loudness(tmp)
    finally:
        os.remove(tmp)


def limit(x, ceiling_db, look=0.002, release=0.06):
    """Look-ahead peak limiter on 4x-oversampled peaks (true-peak estimate). Gain reaches its floor `look` s
    before each peak and recovers with a `release` s one-pole."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    from scipy.signal import resample_poly
    xs = x if x.ndim == 2 else x[:, None]
    peak = np.abs(resample_poly(xs, 4, 1, axis=0))[: len(x) * 4].max(axis=1).reshape(-1, 4).max(axis=1)
    need = np.minimum(1, db(ceiling_db) / np.maximum(peak, 1e-9))
    L = int(look * SR)
    need = uniform_filter1d(minimum_filter1d(need, 2 * L + 1), L)
    need = minimum_filter1d(need, L)  # the smoothing never lifts the gain above a peak's need
    r = np.exp(-1 / (release * SR))
    g, cur = np.empty_like(need), 1.0
    for k, v in enumerate(need):
        cur = v if v < cur else r * cur + (1 - r) * v
        g[k] = cur
    return x * (g[:, None] if x.ndim == 2 else g)


if __name__ == "__main__":
    main(sys.argv[1])
