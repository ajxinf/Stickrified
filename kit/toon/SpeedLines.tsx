import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Speed lines (R21, visual-ref7 4.77-5.10 s: thin white streaks radiate behind the arm whip on "run."): an overlay of
 * radial streaks from the frame edge toward `center` (0..1 of width/height), redrawn every 2 frames like hand
 * animation, fading out over the last third. For the 1-3 biggest physical beats of a video: put it in a Sequence
 * starting on the beat's word, durationInFrames ~10-14.
 */
export const SpeedLines: React.FC<{ center?: [number, number]; count?: number; color?: string; seed?: number }> = ({ center = [0.5, 0.4], count = 26, color = "rgba(255,255,255,0.85)", seed = 1 }) => {
  const f = useCurrentFrame();
  const { width: W, height: H, durationInFrames: D } = useVideoConfig();
  const step = Math.floor(f / 2); // "on twos"
  const rnd = (i: number) => { const x = Math.sin((i + step * 31 + seed * 97) * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const cx = center[0] * W, cy = center[1] * H, R = Math.hypot(W, H);
  const fade = Math.min(1, Math.max(0, (D - f) / (D / 3)));
  const lines = [...Array(count)].map((_, i) => {
    const a = ((i + rnd(i) * 0.8) / count) * Math.PI * 2, r0 = R * (0.17 + 0.13 * rnd(i + 50)), w = 2 + 5 * rnd(i + 99);
    return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke={color} strokeWidth={w} strokeLinecap="round" />;
  });
  return (
    <AbsoluteFill style={{ opacity: fade, pointerEvents: "none" }}>
      <svg width={W} height={H}>{lines}</svg>
    </AbsoluteFill>
  );
};
