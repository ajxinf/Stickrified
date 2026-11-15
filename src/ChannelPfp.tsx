import { useLayoutEffect, useRef } from "react";
import { AbsoluteFill } from "remotion";
import { layout } from "../kit/toon/figure";
import type { CharState } from "../kit/toon/figure";
import { posed } from "../kit/toon/poses";
import { YOU, youLook } from "../kit/toon/protagonist";
import { INK } from "../kit/toon/toon";
import { drawCard2D } from "./ExpressionSheet";

/**
 * Channel profile picture (2026-11-15, user: "smirk on rust"): "you" head and shoulders at 3/4 with the smirk, on a
 * deep rust field with a cream spotlight and soft rays, framed for the platforms' circle crop (everything that matters
 * inside the centre 80 %). Render: npx remotion still src/index.ts ChannelPfp out/pfp.png
 */
const S = 2048;
const POSE: CharState = { pose: { ...posed("hips", 0.2), yaw: 28, tilt: -4 }, expr: "smirk", blink: false, fx: {} };

export const ChannelPfp: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!.getContext("2d")!;
    // Field: deep rust (darker than the hoodie, so he separates), a cream spotlight behind the head, soft rays.
    const bg = c.createRadialGradient(S / 2, S * 0.42, S * 0.05, S / 2, S * 0.5, S * 0.75);
    bg.addColorStop(0, "#f6e6cf");
    bg.addColorStop(0.32, "#efc7a0");
    bg.addColorStop(0.55, YOU.rib);
    bg.addColorStop(1, "#5e2410");
    c.fillStyle = bg;
    c.fillRect(0, 0, S, S);
    c.save();
    c.translate(S / 2, S * 0.42);
    c.globalAlpha = 0.09;
    c.fillStyle = "#fff4e2";
    for (let i = 0; i < 16; i++) {
      c.rotate((Math.PI * 2) / 16);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(S, -S * 0.09);
      c.lineTo(S, S * 0.09);
      c.fill();
    }
    c.restore();
    // The character: head centre at (S/2, 0.40 S), head about 46 % of the width.
    const L = layout(youLook, POSE.pose), k = (S * 0.46) / L.W;
    drawCard2D(c, youLook, POSE, S / 2 - L.hx * k, S * 0.4 - L.hc * k, k);
    // Ink ring just inside the circle crop (it reads as a sticker edge on platforms that crop to a circle).
    c.beginPath();
    c.arc(S / 2, S / 2, S * 0.485, 0, Math.PI * 2);
    c.lineWidth = S * 0.012;
    c.strokeStyle = INK;
    c.stroke();
  }, []);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={S} height={S} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

