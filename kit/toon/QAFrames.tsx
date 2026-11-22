import { Freeze, useCurrentFrame } from "remotion";

/**
 * Review stills in one render pass (user 2026-11-22: "why is QA taking too long?"): with `qaFrames` in its input props,
 * frame i of the wrapped composition shows frame qaFrames[i], so `stills.mjs --batch` renders every pick with
 * renderFrames, each tab loading the scene (models, textures, ANGLE shader compiles: ~20 s) once instead of once per
 * still (render frames 0..N-1 of the FULL-length composition: a shortened one clamps frozen frames to its end).
 * Without `qaFrames` it is the composition itself. Register episodes as `withQAFrames(Video)` in Root.tsx.
 */
export const withQAFrames = <P extends object>(C: React.FC<P>) => {
  const Wrapped: React.FC<P & { qaFrames?: number[] }> = (props) => {
    const f = useCurrentFrame(), q = props.qaFrames;
    if (!q?.length) return <C {...props} />;
    return (
      <Freeze frame={q[Math.min(f, q.length - 1)]}>
        <C {...props} />
      </Freeze>
    );
  };
  return Wrapped;
};
