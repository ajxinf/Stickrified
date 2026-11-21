import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import type { CamPose } from "../../../kit/toon/camera";
import { CAPTION_FONT, KEY_COLOR, SPEAKER_COLORS } from "../../../kit/toon/Captions";
import { handWorld } from "../../../kit/toon/cast";
import { youLook } from "../../../kit/toon/protagonist";
import { B, REWIND, S, SHOTS, youAtF, youStateF } from "./story";

/**
 * The meta layer of trapped-in-this-world (2D, over the 3D): the video's own red progress bar, the frame edge you
 * punch (ripples, cracks, the shatter), the rewind, the caption word you grab, the stolen words as tiles and the
 * climax caption made of them, and the flash through the crack into the next video. Frame-driven (composition F).
 * Sizes are fractions of the frame, so stills and finals match.
 */
const RED = "#ff2b2b", INKC = "#141014", NARRATOR = SPEAKER_COLORS.narrator;
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const ease = (x: number) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

/** The story's progress bar (0-1): this loop ends at "ends", rewinds, the last loop crawls to 99 %, the frame
 * breaks on "free", and the next video's bar starts from zero. */
export const barAt = (F: number) => {
  if (F < B.ends) return 0.62 + 0.38 * ease((F - 0) / B.ends);
  if (F < REWIND[0]) return 1;
  if (F < REWIND[1]) return 1 - ease((F - REWIND[0]) / (REWIND[1] - REWIND[0]));
  if (F < B.p90) return 0.03 + 0.84 * ((F - REWIND[1]) / (B.p90 - REWIND[1]));
  if (F < B.p95) return 0.87 + 0.03 * ease((F - B.p90) / 6);
  if (F < B.p99) return 0.9 + 0.05 * ease((F - B.p95) / 6);
  if (F < B.free) return 0.95 + 0.04 * ease((F - B.p99) / 6) + 0.006 * ((F - B.p99) / (B.free - B.p99));
  if (F < B.into) return -1; // broken
  return 0.02 * ((F - B.into) / 60);
};
/** The bar is the threat: thicker and glowing while it counts down (line 2 and line 16). */
const barBig = (F: number) => (F >= B.because && F < B.loops ? 1 : F >= B.red && F < B.andAt + 20 ? 2.2 : 0);

/** Project a world point through a shot camera (vertical fov, 9:16) to frame fractions [x, y]. */
export const project = (cam: CamPose, p: Vector3, aspect = 1080 / 1920): [number, number] => {
  const f = cam.look.clone().sub(cam.pos).normalize(), r = f.clone().cross(new Vector3(0, 1, 0)).normalize(), u = r.clone().cross(f);
  const d = p.clone().sub(cam.pos), z = d.dot(f), t = Math.tan((cam.fov * Math.PI) / 360);
  return [0.5 + (0.5 * d.dot(r)) / (z * t * aspect), 0.5 - (0.5 * d.dot(u)) / (z * t)];
};
const shotAt = (F: number): S => SHOTS.find((s) => F >= s.from && F < s.from + s.frames) ?? SHOTS[SHOTS.length - 1];
const camAt = (F: number) => { const s = shotAt(F); return s.pose(F - s.from); };

/** Punch frames (the knock lands): the ripple and crack grow at the right edge, at the fist's height. */
const PUNCHES = [10, 24, 38, 52].filter((f) => f < B.because);
const Edge: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  if (F >= B.because) return null;
  const y = 0.47 * h, hits = PUNCHES.filter((p) => F >= p).length;
  const crack = (k: number) => {
    const pts = [[w, y], [w - 0.05 * w * k, y - 0.04 * h * k], [w - 0.09 * w * k, y - 0.02 * h * k], [w - 0.13 * w * k, y - 0.07 * h * k]];
    const pts2 = [[w, y], [w - 0.06 * w * k, y + 0.05 * h * k], [w - 0.1 * w * k, y + 0.04 * h * k]];
    return [pts, pts2].map((ps) => ps.map(([a, b]) => `${a},${b}`).join(" "));
  };
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      {PUNCHES.filter((p) => F >= p && F < p + 12).map((p) => {
        const t = (F - p) / 12;
        return <ellipse key={p} cx={w} cy={y} rx={0.03 * w + 0.18 * w * t} ry={0.02 * h + 0.1 * h * t} fill="none" stroke="#fdfaf4" strokeWidth={0.008 * w * (1 - t)} opacity={1 - t} />;
      })}
      {hits > 0 && crack(0.6 + 0.35 * hits).map((pl, i) => <polyline key={i} points={pl} fill="none" stroke="#fdfaf4" strokeWidth={0.006 * w} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 ${0.004 * w}px ${INKC})` }} />)}
    </svg>
  );
};

/** Tape rewind: scanlines, a jittering band, the |<< sign, colour drained. */
const Rewind: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  if (F < REWIND[0] - 2 || F >= REWIND[1]) return null;
  const band = ((F * 0.09) % 1) * h;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 3px, transparent 3px 7px)", mixBlendMode: "multiply" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: band, height: 0.05 * h, background: "rgba(255,255,255,0.18)", transform: `translateX(${(F % 3) * 0.006 * w}px)` }} />
      <div style={{ position: "absolute", top: 0.08 * h, left: 0.08 * w, fontFamily: CAPTION_FONT, fontWeight: 900, fontSize: 0.09 * w, color: "#fdfaf4", textShadow: `0 0 ${0.01 * w}px ${INKC}, ${0.004 * w}px ${0.004 * w}px 0 ${INKC}` }}>◀◀</div>
    </AbsoluteFill>
  );
};

/** A caption-style word tile (white bold on a dark rounded plate, the captions' own look). */
const Tile: React.FC<{ text: string; x: number; y: number; s: number; w: number; glow?: number; rot?: number; color?: string }> = ({ text, x, y, s, w, glow = 0, rot = 0, color = "#ffffff" }) => (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${s})`,
    fontFamily: CAPTION_FONT, fontWeight: 900, fontSize: 0.075 * w, color, background: INKC, borderRadius: 0.025 * w,
    padding: `${0.006 * w}px ${0.022 * w}px`, whiteSpace: "nowrap",
    boxShadow: `0 0 ${0.05 * w * glow}px ${0.012 * w * glow}px rgba(255,214,120,${0.85 * glow}), ${0.004 * w}px ${0.006 * w}px 0 rgba(0,0,0,0.6)`,
  }}>{text}</div>
);

/** You yank a word out of the caption into your fist: "captions" (line 11) and FREE out of his gloat (line 18). */
const GRABS = [
  { text: "captions", from: B.captions, until: B.keep, x0: 0.5, y0: 0.7, color: KEY_COLOR },
  { text: "FREE", from: B.snatch + 6, until: B.mid - 2, x0: 0.5, y0: 0.78, color: NARRATOR },
];
const GrabWord: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  const g = GRABS.find((x) => F >= x.from && F < x.until);
  if (!g) return null;
  const cam = camAt(F), hand = handWorld(youLook, youStateF(F).pose, youAtF(F), cam.pos, "right", 0.08, youStateF(F).heading);
  const [hx, hy] = project(cam, hand);
  const t = ease((F - g.from - 3) / 7);
  return <Tile text={g.text} x={(g.x0 + (hx - g.x0) * t) * w} y={(g.y0 + (hy - g.y0) * t) * h} s={0.8 - 0.3 * t} w={w} rot={-8 * t} color={g.color} glow={0.5} />;
};

/** Line 17: his gloat pops up in the caption whole, before he reads it; FREE glows at the end until you yank it. */
const GloatCaption: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  if (F < B.gIn - 1 || F >= B.out - 1) return null;
  const pop = (k: number) => (k >= 0 && k < 6 ? 1.12 - 0.12 * (k / 6) : 1);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Tile text="In this world," x={0.5 * w} y={0.64 * h} s={0.72 * pop(F - B.gIn)} w={w} />
      <Tile text="you'll never be" x={0.5 * w} y={0.71 * h} s={0.72 * pop(F - B.gIn)} w={w} />
      {F < B.snatch + 6 && <Tile text="FREE" x={0.5 * w} y={0.78 * h} s={0.8 * pop(F - B.gIn)} w={w} color={NARRATOR} glow={0.4 + 0.3 * Math.sin(F * 0.4)} />}
    </AbsoluteFill>
  );
};

/** Line 24: the spilled words fall into a row above the captions, one per beat. */
const ROW = ["IN", "THIS", "WORLD", "YOU'RE", "FREE"];
const TileRow: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  if (F < B.your || F >= B.inThis) return null;
  const step = (B.help - B.your) / ROW.length;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {ROW.map((word, i) => {
        const t0 = B.your + i * step, k = F - t0;
        if (k < 0) return null;
        // Two rows above the caption band: IN THIS WORLD / YOU'RE FREE.
        const row = i < 3 ? 0 : 1, col = i < 3 ? i - 1 : i - 3.5;
        const drop = ease(k / 8), x = (0.5 + col * 0.3) * w, y = (0.2 + (0.31 + 0.08 * row) * drop) * h, s = 0.66 + 0.08 * (k < 10 ? Math.sin((k / 10) * Math.PI) : 0);
        return <Tile key={word} text={word} x={x} y={y} s={s} w={w} glow={0.6} rot={(1 - drop) * (i % 2 ? 14 : -14)} />;
      })}
    </AbsoluteFill>
  );
};

/** Line 25: the narrator reads the stolen words; the caption itself is the tiles, glowing, word by word. */
const CLIMAX = [{ text: "In this world...", at: () => B.inThis }, { text: "you're...", at: () => B.youre2 }, { text: "free.", at: () => B.free }];
const ClimaxCaption: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  if (F < B.inThis - 2 || F >= B.youDive - 1) return null;
  const cur = [...CLIMAX].reverse().find((c) => F >= c.at() - 2);
  if (!cur) return null;
  const k = F - cur.at(), s = k < 4 ? 1.25 - 0.25 * (k / 4) : 1;
  return <Tile text={cur.text} x={0.5 * w} y={0.7 * h} s={s * 1.15} w={w} glow={cur.text === "free." ? 1 : 0.5} />;
};

/** "free": the right edge shatters, light pours in; the dive: the crack glows and a white flash carries you through. */
const Shatter: React.FC<{ F: number; w: number; h: number }> = ({ F, w, h }) => {
  const k = F - B.free;
  const flash = (F >= B.free && F < B.free + 10 ? 0.9 * (1 - k / 10) : 0) + (F >= B.into - 12 && F < B.into ? ease((F - (B.into - 12)) / 12) : 0) + (F >= B.into && F < B.into + 8 ? 1 - (F - B.into) / 8 : 0);
  const glowEdge = F >= B.free && F < B.into;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {k >= 0 && k < 26 && (
        <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI - Math.PI / 2, d = (0.05 + 0.5 * (k / 26)) * w * (0.6 + ((i * 37) % 10) / 15), x = w - Math.cos(a) * d * 0.8, y = 0.45 * h + Math.sin(a) * d, s = 0.04 * w * (1 - k / 30);
            return <polygon key={i} points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.5} ${x - s * 0.7},${y + s * 0.6}`} fill="#e8f4ff" stroke={INKC} strokeWidth={0.003 * w} opacity={1 - k / 26} transform={`rotate(${k * 9 * (i % 2 ? 1 : -1)} ${x} ${y})`} />;
          })}
        </svg>
      )}
      {glowEdge && <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 0.06 * w, background: "linear-gradient(to left, rgba(255,246,214,0.85), transparent)" }} />}
      {flash > 0 && <AbsoluteFill style={{ background: `rgba(255,252,240,${Math.min(flash, 1)})` }} />}
    </AbsoluteFill>
  );
};

/** Line 21: a big red percentage rides the bar tip, jumping 90 / 95 / 99 on the words. */
const Percent: React.FC<{ F: number; w: number; h: number; v: number }> = ({ F, w, h, v }) => {
  if (F < B.p90 - 2 || F >= B.andAt + 20) return null;
  const n = F < B.p95 - 2 ? 90 : F < B.p99 - 2 ? 95 : 99, at = n === 90 ? B.p90 : n === 95 ? B.p95 : B.p99, k = F - (at - 2);
  const s = k < 6 ? 1.3 - 0.3 * (k / 6) : 1;
  return (
    <div style={{
      position: "absolute", left: Math.min(Math.max(v * w, 0.2 * w), 0.82 * w), bottom: 0.035 * h, transform: `translateX(-50%) scale(${s})`,
      fontFamily: CAPTION_FONT, fontWeight: 900, fontSize: 0.12 * w, color: RED, WebkitTextStroke: `${0.006 * w}px ${INKC}`,
      textShadow: `0 ${0.006 * w}px 0 ${INKC}`,
    }}>{n}%</div>
  );
};

export const Meta: React.FC = () => {
  const F = useCurrentFrame();
  const { width: w, height: h } = useVideoConfig();
  const v = barAt(F), big = barBig(F), bh = (0.006 + 0.008 * big) * h;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Rewind F={F} w={w} h={h} />
      <Edge F={F} w={w} h={h} />
      <GrabWord F={F} w={w} h={h} />
      <GloatCaption F={F} w={w} h={h} />
      <TileRow F={F} w={w} h={h} />
      <ClimaxCaption F={F} w={w} h={h} />
      <Shatter F={F} w={w} h={h} />
      <Percent F={F} w={w} h={h} v={v} />
      {v >= 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: bh, background: "rgba(255,255,255,0.28)" }}>
          <div style={{ width: `${v * 100}%`, height: "100%", background: RED, boxShadow: big ? `0 0 ${0.02 * w}px ${RED}` : undefined }} />
          <div style={{ position: "absolute", left: `${v * 100}%`, top: "50%", width: bh * 2.2, height: bh * 2.2, borderRadius: "50%", background: RED, transform: "translate(-50%, -50%)", opacity: interpolate(big, [0, 1], [0.0, 1]) }} />
        </div>
      )}
    </AbsoluteFill>
  );
};
/** Frames with no normal captions: a grabbed word, his whole gloat (line 17), and line 25 (the tile caption). */
export const captionsOff = (F: number) => (F >= B.captions - 1 && F < B.keep - 1) || (F >= B.gIn - 1 && F < B.out - 1) || (F >= B.inThis - 1 && F < B.youDive - 1);
