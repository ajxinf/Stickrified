"""Background music from the track library (assets/bgm/library.json), fitted to the video as a seamless loop.

Usage: python scripts/audio/music.py videos/<slug>   with "music": {"track": "<file in assets/bgm>", ...} in events.json
Shorts replay in a loop, so the bed is one stretch of the track's full-level body (its fade-in and fade-out are
skipped) whose end flows back into its start: a lag P at which the song repeats itself (whole phrases), at the spot
where the two sides match best (32 log bands, 1.5 s either side), phase-aligned to the sample and crossfaded over
0.25 s. Phrase lengths rarely divide the video, so the loop is then sped up or slowed to the video's exact length
with ffmpeg atempo (pitch unchanged, at most 8 %; the smallest change that keeps a clean seam wins).
The bed never cuts or fades: the last frame flows into the first. A through-composed track with no seam of
similarity >= 0.9 at this length plays from the start of its body instead, with a 2 s fade at the end (WARN). "stop"/"stops" spans mute it (80 ms ramps).
Writes audio/music.wav (48 kHz stereo float, exact length, RMS -20 dBFS like the synth score), a silent
button.wav (a track has no button hit) and audio/bgm_seam.wav (the last 4 s then the first 4 s: the ear check).
"""
import os
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d
from scipy.signal import resample

SR, HOP = 48000, 1024
FPS_F = SR / HOP  # feature frames per second
FFMPEG = os.path.abspath("node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe")  # bundled with Remotion
TMP = "C:/remotion-tmp" if os.name == "nt" else "/tmp"
MIN_SEAM_SIM = 0.9  # local cosine similarity at the seam; a repeated phrase scores 0.95+, a mismatched one ~0.85
MAX_TEMPO = 0.08
XF = int(0.25 * SR)


def ffmpeg(src, dst, *args):
    # the bundled ffmpeg has no float PCM encoder: 16-bit is the track's own resolution anyway (mp3)
    r = subprocess.run([FFMPEG, "-v", "error", "-y", "-i", src, *args, "-ac", "2", "-ar", str(SR), "-c:a", "pcm_s16le", dst], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr


def load(path):
    tmp = f"{TMP}/bgm_decode.wav"
    ffmpeg(path, tmp)
    x = wavfile.read(tmp)[1] / 32768.0
    os.remove(tmp)
    return x


def features(m):
    """Per-hop log energy in 32 log-spaced bands (60 Hz-10 kHz), mean-removed and unit-norm: chords + drums.
    Frame i is centred on sample i * HOP."""
    w = 4096
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(m, (w // 2, w // 2)), w)[::HOP]
    spec = np.abs(np.fft.rfft(frames * np.hanning(w), axis=1)) ** 2
    edges = np.searchsorted(np.fft.rfftfreq(w, 1 / SR), np.geomspace(60, 10000, 33))
    f = np.log(np.stack([spec[:, a:b].sum(1) for a, b in zip(edges[:-1], edges[1:])], 1) + 1e-10)
    f -= f.mean(1, keepdims=True)
    return f / (np.linalg.norm(f, axis=1, keepdims=True) + 1e-9)


def body(m):
    """[first, last] sample of the track's full-level part: 1 s RMS within 3 dB of the median."""
    r = 20 * np.log10(np.sqrt(uniform_filter1d(m ** 2, SR)) + 1e-9)
    ok = np.nonzero(r >= np.median(r) - 3)[0]
    return ok[0], ok[-1]


def seam(F, f0, f1, n_f):
    """(score, start frame, lag) of the best wrap: frame s + lag sounds like frame s, both inside the body."""
    W = round(1.5 * FPS_F)
    best = (-9.0, 0, 0)
    for P in range(int(n_f * (1 - MAX_TEMPO)), int(n_f * (1 + MAX_TEMPO)) + 1):
        lo, hi = f0 + W, f1 - W - P
        if hi <= lo:
            continue
        sim = uniform_filter1d((F[lo - W:hi + W] * F[lo - W + P:hi + W + P]).sum(1), 2 * W + 1)[W:-W]
        k = int(np.argmax(sim))
        sc = float(sim[k]) - 0.01 * abs(P / n_f - 1) * 100  # 0.01 per % of tempo change: the smallest change wins ties
        if sc > best[0]:
            best = (sc, lo + k, P)
    return best


def wrap(x, s0, e0):
    """x[s0:e0'] as a loop: e0 moved (within one hop) to where the waveform best continues as at s0, and the first
    0.25 s crossfaded with what follows e0', so playing it again from the start is seamless."""
    m, w = x.mean(1), int(0.1 * SR)
    corr = [np.dot(m[s0 - w:s0 + w], m[e0 + r - w:e0 + r + w]) for r in range(-HOP, HOP + 1)]
    e0 += int(np.argmax(corr)) - HOP
    y = x[s0:e0].copy()
    fade = (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, XF)))[:, None]
    y[:XF] = y[:XF] * fade + x[e0:e0 + XF] * (1 - fade)  # the start already carries the end's continuation
    return y


def fit(d, cfg):
    x = load(os.path.join("assets/bgm", cfg["track"]))
    m = x.mean(1)
    n = round(cfg["frames"] / 30 * SR)
    a0, a1 = body(m)
    # shortcut: a track whose full-level part is shorter than the video is not supported (every library track is
    # 116 s+, Shorts are <= 90 s); chain several loops when long-form starts.
    assert a1 - a0 > (1 + MAX_TEMPO) * n + 4 * SR, f"{cfg['track']}: full-level part {(a1 - a0) / SR:.0f} s is too short for {n / SR:.1f} s"
    score, s, P = seam(features(m), a0 // HOP + 1, a1 // HOP, n / HOP)
    sim = score + 0.01 * abs(P * HOP / n - 1) * 100
    if sim < MIN_SEAM_SIM:  # a through-composed track with no clean loop at this length: play it, fade the end
        y, tempo = x[a0:a0 + n].copy(), 1.0
        y[-2 * SR:] *= np.linspace(1, 0, 2 * SR)[:, None] ** 2
    else:
        y = wrap(x, s * HOP, (s + P) * HOP)
        tempo = len(y) / n
    if abs(tempo - 1) > 0.001:
        # atempo on three copies, then cut one period out of the middle (no edge effects) and wrap it again:
        # atempo does not keep the period sample-exact, so the old seam point would click.
        src, dst = f"{TMP}/bgm_loop.wav", f"{TMP}/bgm_tempo.wav"
        wavfile.write(src, SR, (np.clip(np.tile(y, (3, 1)), -1, 1) * 32767).astype(np.int16))
        ffmpeg(src, dst, "-af", f"atempo={tempo:.6f}")
        z = wavfile.read(dst)[1] / 32768.0
        os.remove(src), os.remove(dst)
        y = wrap(z, len(z) // 3, len(z) // 3 + n)
    y = resample(y, n, axis=0)  # the last few samples to the exact length (FFT resampling treats y as a loop)
    y *= 10 ** (-20 / 20) / np.sqrt(np.mean(y ** 2))
    g = np.ones(n)
    for a, b in ([cfg["stop"]] if cfg.get("stop") else []) + cfg.get("stops", []):
        g[int(a / 30 * SR):int(b / 30 * SR)] = 0
    y *= uniform_filter1d(g, int(0.08 * SR))[:, None]
    wavfile.write(f"{d}/audio/music.wav", SR, y.astype(np.float32))
    wavfile.write(f"{d}/audio/button.wav", SR, np.zeros(n, np.float32))
    ear = np.concatenate([y[-4 * SR:], y[:4 * SR]])  # the wrap, as heard when the Short replays
    wavfile.write(f"{d}/audio/bgm_seam.wav", SR, (np.clip(ear, -1, 1) * 32767).astype(np.int16))
    if sim < MIN_SEAM_SIM:
        print(f"music.wav: {cfg['track']} {a0 / SR:.2f} s on, 2 s fade at the end (WARN: no clean loop at this length, best seam "
              f"{sim:.3f} < {MIN_SEAM_SIM}: the replay restarts the music; a loop-based track such as in_this_world(default).mp3 avoids it)")
    else:
        print(f"music.wav: {cfg['track']} {s * HOP / SR:.2f}-{(s + P) * HOP / SR:.2f} s of the track looped, seam similarity {sim:.3f} "
              f"(min {MIN_SEAM_SIM}), tempo {(tempo - 1) * 100:+.1f} % (pitch kept), {n / SR:.3f} s stereo")


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import events
    fit(sys.argv[1], events.load(sys.argv[1])["music"])
