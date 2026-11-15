import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { drawPerson } from "../kit/toon/figure";
import type { CharState, Look } from "../kit/toon/figure";
import { PoseName, posed } from "../kit/toon/poses";
import { EXPRESSIONS, Effects, Expr, youLook } from "../kit/toon/protagonist";
import { DESIGN, INK, Pen, rad } from "../kit/toon/toon";

// The 14 expressions, each on a different body pose, then two effect cells. 4x4 grid, neutral background.
const POSE_OF: Record<Expr, PoseName> = {
  neutral: "idle", tired: "facepalm", worried: "chin", scared: "panic", shocked: "point", smug: "crossed",
  determined: "run", sad: "hold", angry: "hips", sneaky: "lean", relieved: "walk", confused: "shrug",
  deadpan: "hold", laughing: "panic", grin: "wave", smirk: "knock",
  excited: "panic", nervous: "chin", suspicious: "crossed", disgusted: "lean", scheming: "hips", crying: "facepalm", pleading: "hold", proud: "hips",
};
const CELLS: { expr: Expr; pose: PoseName; label: string; fx: Effects; prop?: CharState["prop"] }[] = [
  ...EXPRESSIONS.map((e) => ({ expr: e, pose: POSE_OF[e], label: `${e} / ${POSE_OF[e]}`, fx: {}, prop: e === "sad" ? ("box" as const) : e === "deadpan" ? ("can" as const) : undefined })),
  { expr: "shocked", pose: "lean", label: "ring eyes + sweat + !", fx: { ringEyes: true, sweat: 0.5, bang: 12 } },
  { expr: "angry", pose: "crossed", label: "steam + colour fill", fx: { steam: 0.4, fill: { color: "rgba(214,60,50,0.55)", t: 0.7 } } },
  { expr: "relieved", pose: "wave", label: "blush", fx: { blush: 1 } },
  { expr: "sad", pose: "hold", label: "sad + tears", fx: { tears: 0.3 } },
];

/** Draws a character card at scale k into `c` at (x, y); `silhouette` fills it with ink (identity check). */
export const drawCard2D = (c: CanvasRenderingContext2D, look: Look, s: CharState, x: number, y: number, k: number, silhouette = false) => {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(DESIGN.W * k);
  cv.height = Math.ceil(DESIGN.H * k);
  const g = cv.getContext("2d")!;
  g.scale(k, k);
  drawPerson(new Pen(g, rad(-125)), look, s);
  if (silhouette) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = INK;
    g.fillRect(0, 0, cv.width, cv.height);
  }
  c.drawImage(cv, x, y);
};

export const ExpressionSheet: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    c.fillStyle = "#ddd6cc";
    c.fillRect(0, 0, 1080, 1920);
    const cols = 5, cw = 216, ch = 320, k = 0.3; // R22: 28 cells
    CELLS.forEach((cell, i) => {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      const s: CharState = { pose: posed(cell.pose, 0.2), expr: cell.expr, blink: false, fx: cell.fx, prop: cell.prop };
      drawCard2D(c, youLook, s, x + (cw - DESIGN.W * k) / 2, y, k);
      c.fillStyle = "#3a2e30";
      c.font = "bold 15px sans-serif";
      c.textAlign = "center";
      c.fillText(cell.label, x + cw / 2, y + ch - 14);
    });
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
