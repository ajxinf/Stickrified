import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import type { CharState } from "../kit/toon/figure";
import { posed } from "../kit/toon/poses";
import type { PoseName } from "../kit/toon/poses";
import { youLook } from "../kit/toon/protagonist";
import type { Expr } from "../kit/toon/protagonist";
import { DESIGN } from "../kit/toon/toon";
import { drawCard2D } from "./ExpressionSheet";

// Protagonist turnaround (2026-11-15): the eight views, then 3/4 and profile faces and poses.
const VIEWS = [0, 45, 90, 135, 180, -135, -90, -45];
const ROW2: { yaw: number; expr: Expr; pose: PoseName; prop?: CharState["prop"] }[] = [
  { yaw: 35, expr: "smirk", pose: "hips" }, { yaw: -35, expr: "shocked", pose: "panic" }, { yaw: 90, expr: "laughing", pose: "point" },
  { yaw: -90, expr: "determined", pose: "run" }, { yaw: 40, expr: "worried", pose: "hold", prop: "box" }, { yaw: -60, expr: "sneaky", pose: "walk" },
  { yaw: 20, expr: "grin", pose: "wave" }, { yaw: 150, expr: "neutral", pose: "hips" },
];
const label = (c: CanvasRenderingContext2D, t: string, x: number, y: number) => {
  c.fillStyle = "#3a2e30";
  c.font = "bold 22px sans-serif";
  c.textAlign = "center";
  c.fillText(t, x, y);
};

export const TurnaroundSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1920, 1080);
    const k = 0.4, w = DESIGN.W * k;
    VIEWS.forEach((yaw, i) => {
      const cx = 120 + i * 240;
      drawCard2D(c, youLook, { pose: { ...posed("idle", 0.3), yaw }, expr: "neutral", blink: false, fx: {} }, cx - w / 2, 10, k);
      label(c, `${yaw} deg`, cx, 430);
    });
    ROW2.forEach((r, i) => {
      const cx = 120 + i * 240;
      drawCard2D(c, youLook, { pose: { ...posed(r.pose, 0.4), yaw: r.yaw }, expr: r.expr, blink: false, fx: {}, prop: r.prop }, cx - w / 2, 560, k);
      label(c, `${r.expr} ${r.yaw}`, cx, 980);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1920} height={1080} />
    </AbsoluteFill>
  );
};
