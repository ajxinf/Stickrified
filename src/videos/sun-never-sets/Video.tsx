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
import { INSERTS, OWL, PLAN, SHOTS } from "./shots";
import type { Lit, S } from "./shots";
import { B, FRAMES, L, WATERER, handAt, waterer, words, worldAt, YOU_FENCE } from "./story";
import { STAIR } from "./street";

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

// street life by day: birds wheeling high, the sprinkler on your lawn, the neighbour's hose
const birdAt = (look: Vector3) => (i: number, F: number) => {
  const a = F / (90 + i * 7) + i * 1.3, r = 8 + (i % 3) * 3;
  return look.clone().setY(0).add(V(Math.cos(a) * r, 15 + (i % 4) * 2 + Math.sin(F / 20 + i), Math.sin(a) * r * 0.6));
};
const SPRINKLER = V(-5.0, 0.2, -7.6);
const sprinklerAt = (i: number, F: number) => {
  const t = ((F + i * 3) % 24) / 24, a = F / 14 + Math.floor((F + i * 3) / 24) * 0.9, v = 2.2;
  return SPRINKLER.clone().add(V(Math.cos(a) * v * t, 1.3 * t - 1.25 * t * t + 0.02, Math.sin(a) * v * t));
};
const hoseAt = (cam: () => Vector3) => (i: number, F: number) => {
  const h = handAt(waterer, F, cam(), "right"), t = ((F + i * 2) % 20) / 20, d = V(Math.sin(1.2), 0, Math.cos(1.2));
  const p = h.clone().addScaledVector(d, 1.8 * t).add(V(0, 0.5 * t - 1.5 * t * t, 0));
  return p.y < 0.02 ? null : p;
};
const DAYLIFE = new Set<Lit>(["fun", "day", "heat"]);

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
      {s.w === "street" && DAYLIFE.has(s.lit) && F < L(24, 0) && <>
        <Sprites n={7} F={F} at={birdAt(look)} kind="bird" size={0.55} />
        <Sprites n={40} F={F} at={sprinklerAt} kind="drop" size={0.06} />
        {cam.pos.distanceTo(WATERER) < 40 && <Sprites n={30} F={F} at={hoseAt(() => cam.pos)} kind="drop" size={0.05} />}
      </>}
      {fx.includes("heat") && <Sprites n={60} F={F} at={heatAt(look.clone().setY(1))} kind="heat" size={0.5} />}
      {fx.includes("moth") && <Sprites n={1} F={F} at={mothAt} kind="moth" size={0.09} />}
      {fx.includes("owl") && <Sprites n={1} F={F} at={() => (hooting(F) ? null : OWL)} kind="owl" size={0.62} />}
      {fx.includes("owl") && <Sprites n={1} F={F} at={() => (hooting(F) ? OWL : null)} kind="owlHoot" size={0.62} />}
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
  const D = DARK_AT - 2, dark = f >= D;
  const k = Math.min(Math.max((f - D) / 6, 0), 1); // eyelid + dimming
  const flow = Math.min(Math.max((f - D - 6) / 6, 0), 1); // the tap opens after the lid shuts
  const level = Math.min(Math.max((f - D - 10) / 60, 0), 1) * 13; // juice rises in the bucket
  const jit = dark ? 0 : 0.6 * Math.sin(f * 2.3); // the sheep shakes, wide awake
  const spin = dark ? Math.min((f - D) * 22, 270) : 0;
  const rays = (f * 3) % 360;
  const ink = "#2a1a14";
  return (
    <>
      {/* the sun outside, its beam through your eye (day); stars once it is dark */}
      {!dark && <g transform={`rotate(${rays} 88 16)`}>{Array.from({ length: 12 }, (_, i) => <rect key={i} x={87} y={1} width={2} height={7} rx={1} fill="#ffb020" transform={`rotate(${i * 30} 88 16)`} />)}</g>}
      {!dark && <circle cx={88} cy={16} r={9} fill="#ffd23f" stroke="#e8a020" strokeWidth={1} />}
      {!dark && <polygon points={`84,22 92,24 ${57 + jit},104 ${49 + jit},100`} fill="#fff2a0" opacity={0.55 + 0.15 * Math.sin(f / 3)} />}
      {dark && [[12, 14], [30, 8], [70, 10], [90, 30], [8, 40], [94, 58]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.9} fill="#fffbe0" opacity={k} />)}
      {/* the head in profile, the brain, the eye-window */}
      <ellipse cx={46} cy={84} rx={38} ry={44} fill="#f7f4f0" stroke={ink} strokeWidth={1.3} />
      <path d="M20 66 Q24 44 46 42 Q70 42 74 62 Q76 76 62 80 Q46 86 32 80 Q18 76 20 66 Z" fill="#f4b0c0" stroke={ink} strokeWidth={1} />
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${28 + i * 11} 50 q5 9 0 20`} stroke="#c8728e" strokeWidth={0.9} fill="none" />)}
      <circle cx={78} cy={74} r={8} fill={dark ? "#1a2040" : "#8fd0ff"} stroke={ink} strokeWidth={1.2} />
      <path d={`M70 74 A8 8 0 0 1 86 74 L86 ${66 + 16 * k} A8 8 0 0 0 70 ${66 + 16 * k} Z`} fill="#f2c8b0" stroke={ink} strokeWidth={0.8} opacity={k} />
      {/* the pipe from the brain, the red valve, the spout, the bucket */}
      <rect x={44} y={80} width={5} height={14} fill="#a8b0b8" stroke={ink} strokeWidth={0.7} />
      <rect x={44} y={94} width={16} height={5} fill="#a8b0b8" stroke={ink} strokeWidth={0.7} />
      <g transform={`rotate(${spin} 46.5 92)`}>
        <circle cx={46.5} cy={92} r={6} fill="none" stroke="#d8342c" strokeWidth={2} />
        {[0, 60, 120].map((a) => <rect key={a} x={45.9} y={86} width={1.2} height={12} fill="#d8342c" transform={`rotate(${a} 46.5 92)`} />)}
      </g>
      {!dark && <g><rect x={36} y={100} width={20} height={7} rx={1} fill="#fbf6e8" stroke={ink} strokeWidth={0.6} /><text x={46} y={105.4} textAnchor="middle" fontSize={4.2} fontWeight={900} fill="#d8342c" fontFamily="Nunito, sans-serif">CLOSED</text></g>}
      <text x={46} y={77} textAnchor="middle" fontSize={4.4} fontWeight={900} fill={ink} fontFamily="Nunito, sans-serif">MELATONIN</text>
      {flow > 0 && <rect x={58} y={99} width={2.6} height={14 * flow} rx={1.2} fill="#5ab0e8" />}
      {flow > 0 && [0, 1, 2].map((i) => { const t = ((f - D + i * 7) % 20) / 20; return <ellipse key={i} cx={59.3 + Math.sin(i * 3) * 0.6} cy={101 + t * 12} rx={1.3} ry={1.9} fill="#7ac8f2" opacity={1 - t * 0.5} />; })}
      <path d="M51 113 L69 113 L67 128 L53 128 Z" fill="#e8e0d0" stroke={ink} strokeWidth={0.9} />
      <path d={`M${53 - level * 0.03} ${128 - level} L${67 + level * 0.03} ${128 - level} L67 128 L53 128 Z`} fill="#5ab0e8" opacity={0.9} />
      <text x={60} y={123} textAnchor="middle" fontSize={3.6} fontWeight={900} fill={ink} fontFamily="Nunito, sans-serif">ZZZ</text>
      {/* the sheep who runs the tap: wide awake and shaking, then turning the wheel and nodding off */}
      <g transform={`translate(${30 + jit} ${96})`}>
        {[[-3, 0], [0, -3], [3, 0], [0, 2], [-2, -2], [2, -2]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3.4} fill="#fbfbf6" stroke={ink} strokeWidth={0.6} />)}
        <ellipse cx={5.5} cy={-2} rx={2.6} ry={3} fill="#3a2a24" />
        {dark ? <path d={`M4.4 -2.6 q0.8 ${0.9 * k} 1.6 0 M6.6 -2.6 q0.8 ${0.9 * k} 1.6 0`} stroke="#fbfbf6" strokeWidth={0.5} fill="none" />
          : <><circle cx={4.9} cy={-2.6} r={1.1} fill="#fbfbf6" /><circle cx={7.1} cy={-2.6} r={1.1} fill="#fbfbf6" /><circle cx={4.9} cy={-2.6} r={0.45} fill={ink} /><circle cx={7.1} cy={-2.6} r={0.45} fill={ink} /></>}
        <rect x={-3} y={4.5} width={1.2} height={3} fill={ink} /><rect x={2} y={4.5} width={1.2} height={3} fill={ink} />
        {dark && <line x1={4} y1={1} x2={11} y2={-3} stroke={ink} strokeWidth={0.9} />}
      </g>
      {dark && ["Z", "z", "z"].map((z, i) => { const t = ((f - D - i * 9) % 36) / 36; return f - D - i * 9 < 0 ? null : <text key={i} x={33 + t * 8 + i * 2} y={88 - t * 22} fontSize={5 - i} fontWeight={900} fill="#7ac8f2" opacity={1 - t} fontFamily="Nunito, sans-serif">{z}</text>; })}
      {/* the night falls over everything but the cutaway */}
      {dark && <rect x={0} y={0} width={100} height={178} fill="#0a0c30" opacity={0.28 * k} />}
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
