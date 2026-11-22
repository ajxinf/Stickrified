import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import type { Look } from "../../../kit/toon/figure";
import { posed } from "../../../kit/toon/poses";
import type { Expr } from "../../../kit/toon/protagonist";
import { youLook } from "../../../kit/toon/protagonist";
import { DESIGN } from "../../../kit/toon/toon";
import { drawCard2D } from "../../ExpressionSheet";
import { callGuyLook, dadLook, derekLook, grandmaLook, joggerLook, lindaLook } from "./cast";

/** Cast turnaround check (user 2026-11-22: glasses stayed front-facing, eyes ran into hair on turned heads): every
 * speaking role at seven head angles; glasses, moustaches and hairlines must follow the face in every column. */
const VIEWS = [0, 30, 60, 90, -30, -60, -90];
const ROWS: [string, Look, Expr][] = [
  ["grandma", grandmaLook, "suspicious"], ["linda", lindaLook, "excited"], ["dad", dadLook, "worried"],
  ["derek", derekLook(), "smug"], ["you", youLook, "shocked"], ["jogger", joggerLook, "disgusted"], ["call guy", callGuyLook, "smug"],
];

export const PromiseTurnSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1960, 2240);
    const k = 0.28, w = DESIGN.W * k;
    ROWS.forEach(([name, look, expr], r) => {
      VIEWS.forEach((yaw, i) => {
        const cx = 140 + i * 280, y = 10 + r * 318;
        // heads only matter here: draw the card and let the row below overlap its legs
        drawCard2D(c, look, { pose: { ...posed("idle", 0.3), yaw }, expr, blink: false, fx: {} }, cx - w / 2, y, k);
        c.fillStyle = "#3a2e30";
        c.font = "bold 20px sans-serif";
        c.textAlign = "center";
        c.fillText(`${name} ${yaw}`, cx, y + 300);
      });
    });
  }, []);
  return (
    <AbsoluteFill style={{ backgroundColor: "#ddd6cc" }}>
      <canvas ref={ref} width={1960} height={2240} />
    </AbsoluteFill>
  );
};
