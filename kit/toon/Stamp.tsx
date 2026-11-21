import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_FONT } from "./Captions";

/**
 * Scenario counter stamp (LOOK_SPEC identity 4): "DAY 3", "HOUR 12"... as a chunky stamped card in the upper third.
 * Lands on its word frame `at` with a 4-frame thump (scale 1.35 -> 1, matching the thump SFX), holds, fades over 6 f.
 * Sizes are fractions of the frame width so stills (0.5) and 2K finals match.
 */
/** Screen box (fractions of a 9:16 frame) a Stamp covers, for the QA plan's `overlays` (guard "Caption vs face"). */
export const stampBox = (text: string, at: number, hold = 45, top = "18%") => {
  const w = (text.length * 7.2 + 10) / 100, y0 = parseFloat(top) / 100;
  return { name: `stamp "${text}"`, from: at, to: at + hold + 6, x: [0.5 - w / 2, 0.5 + w / 2] as [number, number], y: [y0, y0 + 0.1] as [number, number] };
};
export const Stamp: React.FC<{ text: string; at: number; hold?: number; tilt?: number; top?: string }> = ({ text, at, hold = 45, tilt = -5, top = "18%" }) => {
  const f = useCurrentFrame() - at;
  const { width } = useVideoConfig();
  if (f < 0 || f >= hold + 6) return null;
  const scale = interpolate(f, [0, 4], [1.35, 1], { extrapolateRight: "clamp" });
  const opacity = f < hold ? 1 : interpolate(f, [hold, hold + 6], [1, 0]);
  const u = width / 100;
  return (
    <AbsoluteFill style={{ alignItems: "center", top, pointerEvents: "none" }}>
      <div
        style={{
          transform: `rotate(${tilt}deg) scale(${scale})`,
          opacity,
          background: "#f4ece0",
          border: `${0.9 * u}px solid #1c1210`,
          borderRadius: 1.4 * u,
          boxShadow: `${0.6 * u}px ${0.8 * u}px 0 #1c1210`,
          padding: `${1.2 * u}px ${4 * u}px`,
          fontFamily: CAPTION_FONT,
          fontWeight: 900,
          fontSize: 11 * u,
          letterSpacing: 0.4 * u,
          color: "#c8582c", // rust accent: the stamp belongs to "you"'s story
          lineHeight: 1,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
