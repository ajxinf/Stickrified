import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { Insert } from "../../../kit/toon/Insert";
import { SpeedLines } from "../../../kit/toon/SpeedLines";
import { ToonWorld } from "../../../kit/toon/world";
import { V, rnd } from "./common";
import { BOX_L, CINEMA_L, CLOSET_L, DAY, DIM, EclipseSky, FUN, HEAT, KITCHEN, Moving, NIGHT, OHIO_L, SKYWIDE, Sprites, TV_L, World } from "./scene";
import { INSERTS, PLAN, SHOTS } from "./shots";
import type { Lit, S } from "./shots";
import { B, FRAMES, L, words, worldAt, YOU_FENCE } from "./story";
import { OWL_AT, STAIR, wireY } from "./street";

/** sun-never-sets (episode 7): what if the sun never set again. One canvas per shot, hard cuts. */
export const SUN_FRAMES = FRAMES;
const PRESET = { kitchen: KITCHEN, fun: FUN, day: DAY, heat: HEAT, dim: DIM, night: NIGHT, skywide: SKYWIDE, closet: CLOSET_L, cinema: CINEMA_L, ohio: OHIO_L, tv: TV_L, box: BOX_L } as Record<Lit, typeof DAY>;
const MOTES: Record<Lit, [string, number]> = { kitchen: ["#fff6e0", 1.2], fun: ["#fff6e6", 0.9], day: ["#fff2d8", 0.8], heat: ["#fff0c0", 1.3], dim: ["#cfe0ff", 0.6], night: ["#ffd8a0", 0.5], skywide: ["#fff2d8", 0.5], closet: ["#ffd8a0", 0.9], cinema: ["#cfe0ff", 0.9], ohio: ["#f4f8ff", 0.6], tv: ["#ffd8a0", 0.8], box: ["#ffe8c0", 0.6] };
const NIGHTLIKE = new Set<Lit>(["night", "dim"]);

// ------------------------------------------------------------------ effects, per composition frame
const MOTH0 = YOU_FENCE.clone().add(V(0.12, 1.02, 0.12));
const mothAt = (_: number, F: number) => {
  const t = (F - B.afford + 4) / 30;
  if (t < 0 || t > 1.6) return null;
  return MOTH0.clone().add(V(0.25 * t + 0.06 * Math.sin(F * 1.3), 0.5 * t + 0.05 * Math.sin(F * 2.1), 0.4 * t));
};
const OWL = V(-1.0, wireY(-1.0) + 0.16, OWL_AT.z);
const hooting = (F: number) => F >= B.stars + 16 && (F - B.stars - 16) % 26 < 12;
const flyAt = (center: Vector3) => (i: number, F: number) => {
  const on = Math.sin(F * (0.07 + rnd(i) * 0.05) + i * 2.3) > 0.35;
  if (!on) return null;
  return center.clone().add(V((rnd(i + 1) - 0.5) * 9 + 0.3 * Math.sin(F / 40 + i), 0.25 + rnd(i + 2) * 1.6 + 0.15 * Math.sin(F / 23 + i), (rnd(i + 3) - 0.5) * 9));
};
const cashAt = (i: number, F: number) => {
  const t0 = B.empties - 20 + (i % 16) * 3, t = (F - t0) / 30;
  if (t < 0) return null;
  const x = STAIR.x0 - 0.4 + rnd(i) * 2.2, z = STAIR.z1 + 0.4 + rnd(i + 1) * 3.2;
  const y = 1.6 + rnd(i + 2) * 0.6 - 0.9 * t + 0.1 * Math.sin(F / 5 + i);
  return y < 0.02 ? V(x, 0.02, z) : V(x + 0.15 * Math.sin(F / 9 + i), y, z);
};
const heatAt = (center: Vector3) => (i: number, F: number) => center.clone().add(V((rnd(i) - 0.5) * 3, ((rnd(i + 1) * 2.4 + F * 0.012 * (0.5 + rnd(i + 2))) % 2.4) - 0.4, (rnd(i + 3) - 0.5) * 3));

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const preset = PRESET[s.lit];
  const fx = s.fx ?? [];
  const cam = s.pose(f);
  const look = cam.look;
  const [mc, ms] = MOTES[s.lit];
  const w = worldAt(F);
  const night = s.lit === "night";
  const sky = s.w === "street" || s.w === "home";
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={preset} sunDir={s.sun!} shadow={{ center: look.clone().setY(0), size: s.w === "street" ? 22 : 8 }} />
      <World w={s.w} preset={preset} s={w} F={F} night={NIGHTLIKE.has(s.lit)} />
      {sky && <EclipseSky cam={cam.pos} sun={s.sunAt ? s.sunAt(F) : s.sun!} s={w} night={night} />}
      {/* never lifeless: motes drifting in the light of every set */}
      <Dust center={look.clone().setY(Math.max(look.y, 1.0))} size={V(3, 2.2, 3)} count={s.w === "street" ? 220 : 160} color={mc} strength={ms} />
      {fx.includes("heat") && <Sprites n={60} F={F} at={heatAt(look.clone().setY(1))} kind="heat" size={0.5} />}
      {fx.includes("moth") && <Sprites n={1} F={F} at={mothAt} kind="moth" size={0.09} />}
      {fx.includes("owl") && <Sprites n={1} F={F} at={() => (hooting(F) ? null : OWL)} kind="owl" size={0.42} />}
      {fx.includes("owl") && <Sprites n={1} F={F} at={() => (hooting(F) ? OWL : null)} kind="owlHoot" size={0.42} />}
      {fx.includes("fireflies") && <Sprites n={70} F={F} at={flyAt(look.clone().setY(0))} kind="fly" size={0.16} />}
      {fx.includes("cash") && <Sprites n={40} F={F} at={cashAt} kind="bill" size={0.12} />}
      {(s.moving ?? []).map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

// ------------------------------------------------------------------ line 4: the sleepy-juice tap (2D cutaway)
const DARK_AT = B.dark - L(4, 0);
const BrainTap: React.FC = () => {
  const f = useCurrentFrame();
  const dark = f >= DARK_AT - 2;
  const k = Math.min(Math.max((f - DARK_AT + 2) / 8, 0), 1);
  const drops = dark ? [0, 1, 2, 3].map((i) => ((f - DARK_AT + i * 9) % 36) / 36) : [];
  return (
    <>
      {/* the head in profile, the brain inside, a little tap at its base */}
      <ellipse cx={50} cy={84} rx={36} ry={40} fill="#f7f4f0" stroke="#2a1a14" strokeWidth={1.2} />
      <path d="M22 70 Q26 46 50 44 Q76 44 80 66 Q82 84 66 90 Q50 96 34 90 Q20 84 22 70 Z" fill="#f2a8b8" stroke="#2a1a14" strokeWidth={1} />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${30 + i * 12} 56 q4 10 0 22`} stroke="#c8728e" strokeWidth={0.9} fill="none" />)}
      <rect x={46} y={88} width={8} height={10} fill="#a8b0b8" stroke="#2a1a14" strokeWidth={0.8} />
      <rect x={52} y={95} width={10} height={4} fill="#a8b0b8" stroke="#2a1a14" strokeWidth={0.8} />
      <g transform={`rotate(${dark ? -90 * k : 0} 50 86)`}><rect x={42} y={84} width={16} height={3} rx={1.5} fill="#5ab0e8" stroke="#2a1a14" strokeWidth={0.8} /></g>
      <text x={50} y={110} textAnchor="middle" fontSize={4.6} fontWeight={900} fill="#2a1a14" fontFamily="Nunito, sans-serif">MELATONIN</text>
      {drops.map((t, i) => <ellipse key={i} cx={60} cy={100 + t * 40} rx={1.8} ry={2.6} fill="#5ab0e8" stroke="#2a1a14" strokeWidth={0.5} opacity={1 - t * 0.6} />)}
      {/* the sunbeam from the top right: on, then gone in the dark */}
      {!dark && <polygon points="100,0 100,14 54,88 46,84" fill="#ffd23f" opacity={0.75} />}
      {!dark && <circle cx={92} cy={10} r={9} fill="#ffd23f" stroke="#e8a020" strokeWidth={1} />}
      {dark && <rect x={0} y={0} width={100} height={178} fill="#0a0c20" opacity={0.45 * k} />}
    </>
  );
};

export const SunNeverSets: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    {INSERTS.map(([a, b]) => (
      <Sequence key={a} from={a} durationInFrames={b - a}>
        <TapInsert />
      </Sequence>
    ))}
    {/* the two biggest physical beats: the sun brakes, the basement empties */}
    <Sequence from={B.stopped - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.3]} /></Sequence>
    <Sequence from={B.empties - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.45]} seed={5} /></Sequence>
    <Captions words={words} speakers={{ kyle: "#5fd0ff" }} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("sun-never-sets/mix.wav")} />}
  </AbsoluteFill>
);
/** The insert's readout flips when the light goes. */
const TapInsert: React.FC = () => {
  const f = useCurrentFrame();
  return <Insert kind="cutaway" title="INSIDE YOUR HEAD" readout={f >= DARK_AT - 2 ? "TAP: OPEN" : "TAP: SHUT"}><BrainTap /></Insert>;
};
