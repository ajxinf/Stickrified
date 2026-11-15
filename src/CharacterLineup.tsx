import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import type { CharState, Look } from "../kit/toon/figure";
import { posed } from "../kit/toon/poses";
import { youLook } from "../kit/toon/protagonist";
import { DESIGN } from "../kit/toon/toon";
import { ZLOOKS, chadLook, daveLook, zs } from "./videos/zombie-supermarket-30-days/roles";
import { drawCard2D } from "./ExpressionSheet";

// Cast redesign review sheet (2026-11-15): the pilot's cast big enough to judge the finish (ink, hands, feet, faces).
const CAST: { name: string; look: Look; s: CharState }[] = [
  { name: "you", look: youLook, s: { pose: { ...posed("hips", 0.3), yaw: 20 }, expr: "determined", blink: false, fx: {} } },
  { name: "Chad", look: chadLook, s: { pose: posed("crossed", 0.3), expr: "smug", blink: false, fx: {} } },
  { name: "Dave", look: daveLook, s: { pose: posed("shrug", 0.3), expr: "worried", blink: false, fx: {} } },
  { name: "zombie A", look: ZLOOKS[0], s: zs({ ...posed("idle", 0.6, 0.2), arms: [{ at: [0.62, 0.05], grip: "open" }, { at: [0.6, 0.12], grip: "open" }], tilt: 10 }, "tired") },
  { name: "zombie B", look: ZLOOKS[1], s: zs({ ...posed("idle", 0, 1), tilt: -22 }, "shocked", { ringEyes: true }) },
  { name: "zombie C", look: ZLOOKS[4], s: zs({ ...posed("panic", 0), tilt: 8 }, "angry") },
];
const ZNAMES = ["office", "jogger", "granny", "old man", "lumberjack", "road worker"];
const HORDE = ZLOOKS.map((look, i) => ({ name: ZNAMES[i], look, s: zs({ ...posed("idle", 0.6 + i, 0.2), arms: [{ at: [0.62, 0.05 + 0.1 * (i % 2)], grip: "open" }, { at: [0.3, 0.8], grip: "mitt" }], tilt: 8 - 4 * (i % 3) }, i % 2 ? "tired" : "angry") } as const));

export const CharacterLineup: React.FC<{ horde?: boolean }> = ({ horde }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1920, 1080);
    const k = 1, w = DESIGN.W * k;
    (horde ? HORDE : CAST).forEach(({ name, look, s }, i) => {
      const cx = 170 + i * 316;
      drawCard2D(c, look, s, cx - w / 2, 30, k);
      c.fillStyle = "#3a2e30";
      c.font = "bold 26px sans-serif";
      c.textAlign = "center";
      c.fillText(name, cx, 1060);
    });
  }, [horde]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1920} height={1080} />
    </AbsoluteFill>
  );
};
