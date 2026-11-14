"""Measure shorts the same way (QUALITY_STANDARD.md "Measured bar"): cuts, shot lengths, colour, motion, audio.

    python scripts/ref_compare.py <ref.mp4> <ours.mp4> <out.json>     # prints both side by side
Needs a full ffmpeg on PATH (the references are AV1; Remotion's bundled ffmpeg cannot decode them).
"""
import subprocess, sys, json, numpy as np
import shutil
FF = shutil.which("ffmpeg") or "ffmpeg"
W, H = 135, 240

def frames(path):
    p = subprocess.run([FF, "-v", "error", "-i", path, "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True)
    return np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255

def video(path):
    f = frames(path); n = len(f)
    mx, mn = f.max(-1), f.min(-1); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    luma = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    hist = np.stack([np.histogram(l, 32, (0, 1))[0] for l in luma]).astype(float); hist /= hist.sum(1, keepdims=True)
    hd = np.r_[0, np.abs(np.diff(hist, axis=0)).sum(1)]
    diff = np.r_[0, np.abs(np.diff(luma, axis=0)).mean((1, 2))]
    cuts = [0] + [i for i in range(1, n) if hd[i] > 0.35 and diff[i] > 0.06]
    shots = np.diff(cuts + [n]) / 30
    lm = luma.mean((1, 2)); con = luma.std((1, 2))
    # colourfulness (Hasler-Suesstrunk)
    rg = f[..., 0] - f[..., 1]; yb = 0.5 * (f[..., 0] + f[..., 1]) - f[..., 2]
    colorful = np.sqrt(rg.std((1, 2)) ** 2 + yb.std((1, 2)) ** 2) + 0.3 * np.sqrt(rg.mean((1, 2)) ** 2 + yb.mean((1, 2)) ** 2)
    # edge density (detail / ink)
    gx = np.abs(np.diff(luma, axis=2)).mean((1, 2)); gy = np.abs(np.diff(luma, axis=1)).mean((1, 2))
    still = (diff < 0.004).mean()
    return {"frames": n, "seconds": n / 30, "cuts": len(cuts) - 1, "cut_frames": cuts,
            "shot_mean_s": float(shots.mean()), "shot_median_s": float(np.median(shots)), "shot_max_s": float(shots.max()), "shots_over_3s": int((shots > 3).sum()),
            "luma_mean": float(lm.mean()), "luma_p5_p95": [float(np.percentile(luma, 5)), float(np.percentile(luma, 95))], "contrast_std": float(con.mean()),
            "sat_mean": float(sat.mean()), "colorfulness": float(colorful.mean()), "edge_density": float((gx + gy).mean()),
            "motion_mean": float(diff.mean()), "motion_p50": float(np.median(diff)), "still_frame_pct": float(still * 100),
            "shot_list_s": [round(c / 30, 2) for c in cuts]}

def audio(path):
    p = subprocess.run([FF, "-v", "error", "-i", path, "-ac", "2", "-ar", "48000", "-f", "f32le", "-"], capture_output=True)
    a = np.frombuffer(p.stdout, np.float32).reshape(-1, 2); sr = 48000
    m = a.mean(1); s = (a[:, 0] - a[:, 1]) / 2
    width = float(20 * np.log10((np.sqrt((s ** 2).mean()) + 1e-9) / (np.sqrt((m ** 2).mean()) + 1e-9)))
    spec = np.abs(np.fft.rfft(m[: sr * 60] if len(m) > sr * 60 else m)) ** 2; fr = np.fft.rfftfreq(len(m[: sr * 60] if len(m) > sr * 60 else m), 1 / sr)
    bands = {"sub<60": (0, 60), "low60-250": (60, 250), "lowmid250-1k": (250, 1000), "mid1k-4k": (1000, 4000), "pres4k-8k": (4000, 8000), "air8k+": (8000, 24000)}
    tot = spec.sum(); band_db = {k: round(float(10 * np.log10(spec[(fr >= lo) & (fr < hi)].sum() / tot + 1e-12)), 1) for k, (lo, hi) in bands.items()}
    # short-term loudness proxy (400 ms RMS) and its spread
    hop = sr // 10; win = int(0.4 * sr)
    st = np.array([20 * np.log10(np.sqrt((m[i:i + win] ** 2).mean()) + 1e-9) for i in range(0, len(m) - win, hop)])
    # onsets: spectral flux peaks (transient count ~ SFX/accents)
    N = 1024; hopn = 512; X = np.abs(np.array([np.fft.rfft(m[i:i + N] * np.hanning(N)) for i in range(0, len(m) - N, hopn)]))
    flux = np.r_[0, np.maximum(np.diff(X, axis=0), 0).sum(1)]; thr = np.median(flux) + 3 * flux.std()
    on = [i for i in range(1, len(flux) - 1) if flux[i] > thr and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
    on_t = []
    for i in on:
        t = i * hopn / sr
        if not on_t or t - on_t[-1] > 0.12: on_t.append(t)
    silent = (st < st.max() - 40).mean() * 100
    return {"stereo_side_vs_mid_db": round(width, 1), "band_energy_db": band_db, "st_loud_p10_p90_db": [round(float(np.percentile(st, 10)), 1), round(float(np.percentile(st, 90)), 1)],
            "strong_onsets": len(on_t), "onsets_per_10s": round(len(on_t) / (len(m) / sr) * 10, 1), "near_silent_pct": round(float(silent), 1), "onset_times": [round(t, 2) for t in on_t]}

if __name__ == "__main__":
    out = {}
    for name, path in [("ref", sys.argv[1]), ("ours", sys.argv[2])]:
        out[name] = {"video": video(path), "audio": audio(path)}
    json.dump(out, open(sys.argv[3], "w"), indent=1)
    for k in ["seconds", "cuts", "shot_mean_s", "shot_median_s", "shot_max_s", "shots_over_3s", "luma_mean", "luma_p5_p95", "contrast_std", "sat_mean", "colorfulness", "edge_density", "motion_mean", "motion_p50", "still_frame_pct"]:
        print(f"{k:16s} ref {out['ref']['video'][k]!s:28.28s} ours {out['ours']['video'][k]!s:.28s}")
    for k in ["stereo_side_vs_mid_db", "band_energy_db", "st_loud_p10_p90_db", "strong_onsets", "onsets_per_10s", "near_silent_pct"]:
        print(f"{k:22s} ref {out['ref']['audio'][k]}\n{'':22s} ours {out['ours']['audio'][k]}")
