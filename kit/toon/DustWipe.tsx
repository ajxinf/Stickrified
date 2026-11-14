import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { rng } from "./paint";

/**
 * DUST-WIPE transition (R13 study: "when the dust clears"): soft dust puffs billow out from `origin` until they cover
 * the whole frame at the cut (frame `peak` of the Sequence), then thin out and drift up, revealing the next shot.
 * Mount in a Sequence that starts ~`peak` frames before the cut. Deterministic (seeded), frame-driven.
 */
export const DustWipe: React.FC<{ frames?: number; peak?: number; color?: string; origin?: [number, number]; seed?: number }> = ({
  frames = 26,
  peak = 10,
  color = "#c8a57a",
  origin = [0.5, 0.62],
  seed = 3,
}) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  if (f < 0 || f >= frames) return null;
  const r = rng(seed);
  const puffs = Array.from({ length: 18 }, () => ({ dx: (r() - 0.5) * 1.1, dy: (r() - 0.5) * 1.3, size: 0.35 + r() * 0.45, delay: r() * 4, shade: 0.82 + r() * 0.3 }));
  const grow = (k: number) => 1 - Math.pow(1 - Math.min(Math.max(k, 0), 1), 3);
  const fade = f <= peak ? 1 : Math.max(0, 1 - (f - peak) / (frames - peak));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          {puffs.map((_, i) => (
            <radialGradient key={i} id={`dw${seed}_${i}`}>
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="55%" stopColor={color} stopOpacity={0.85} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </radialGradient>
          ))}
        </defs>
        {puffs.map((p, i) => {
          const g = grow((f - p.delay) / (peak - p.delay + 2));
          const cx = (origin[0] + p.dx * g) * W, cy = (origin[1] + p.dy * g - (f > peak ? (f - peak) * 0.012 : 0)) * H;
          const rr = p.size * g * H * (1 + (f > peak ? (f - peak) * 0.02 : 0)) * 0.48;
          // House style (R14 QA: a blank tan screen): painted puffs with an ink rim, never fully covering the frame.
          return (
            <g key={i} opacity={fade * 0.82 * Math.min(1, p.shade)}>
              <circle cx={cx} cy={cy} r={rr} fill={`url(#dw${seed}_${i})`} />
              <circle cx={cx} cy={cy} r={rr * 0.62} fill="none" stroke="#3a2a1e" strokeOpacity={0.55} strokeWidth={H * 0.004} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
