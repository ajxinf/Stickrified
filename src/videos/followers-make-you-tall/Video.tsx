import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { SpeedLines } from "../../../kit/toon/SpeedLines";
import { ToonWorld } from "../../../kit/toon/world";
import { V, rnd } from "./common";
import { Critter } from "./critters";
import { DAY, HOME_L, MART_L, MORNING, Moving, NIGHT, SCHOOL_L, Sprites, World } from "./scene";
import type { Lit, S } from "./shots";
import { PLAN, SHOTS } from "./shots";
import { B, FRAMES, L, duckFlood, handAt, headOf, tylerNight, youLot, words } from "./story";

/** followers-make-you-tall (episode 8): in this world, the more followers you have, the taller you get. */
export const FOLLOWERS_FRAMES = FRAMES;
const PRESET = { day: DAY, morning: MORNING, home: HOME_L, school: SCHOOL_L, mart: MART_L, night: NIGHT } as Record<Lit, typeof DAY>;
const MOTES: Record<Lit, [string, number]> = { day: ["#fff6e6", 0.7], morning: ["#ffe8c0", 1.1], home: ["#fff2d8", 1.0], school: ["#eef6ff", 0.6], mart: ["#ffffff", 0.5], night: ["#ffd8a0", 0.6] };

// ------------------------------------------------------------------ effects, per composition frame
const pigeonAt = (look: Vector3) => (i: number, F: number) => {
  const t = (F - B.ding - 4 - (i % 5)) / 30;
  const base = V(-3.2 + (i - 4) * 0.7, 3.4 + (i % 3) * 0.3, -6.3);
  if (look.x > 5) base.x += 17.5;
  if (t < 0) return base;
  return base.add(V(Math.cos(i * 1.7) * 4 * t, 5 * t + 0.3 * Math.sin(F / 2 + i), 3 * t));
};
const rainAt = (c: Vector3) => (i: number, F: number) => {
  if (F < B.rains - 2) return null;
  const y = 9 - ((F * 0.55 + rnd(i) * 9) % 9);
  return V(c.x + (rnd(i + 1) - 0.5) * 16, y, c.z + (rnd(i + 2) - 0.5) * 12);
};
const cloudAt = (c: Vector3, r: number) => (i: number, F: number) => V(c.x + (rnd(i) - 0.5) * r * 2 + F * 0.02 * r * 0.05, c.y + (rnd(i + 1) - 0.5) * r * 0.5, c.z + (rnd(i + 2) - 0.5) * r * 2);
/** The skywriting: the jet's (Tyler's right hand's) path, seen from the lot. */
const LOT_LENS = V(33, 1.4, 9.5);
const smokeAt = (i: number, F: number) => {
  const f0 = B.writes - 6 + i * 1.1;
  if (f0 > F || f0 > B.jet + 6) return null;
  return handAt(tylerNight, Math.round(f0), LOT_LENS, "right").add(V(rnd(i) * 1.5, rnd(i + 1) * 1.5, rnd(i + 2) * 1.5));
};
const sparkAt = (i: number, F: number) => { const h = headOf(youLot, F), k = h.y; return h.clone().add(V((rnd(i) - 0.5) * k * 0.9, (rnd(i + 1) - 0.8) * k, (rnd(i + 2) - 0.5) * k * 0.9)); };

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const preset = PRESET[s.lit];
  const fx = s.fx ?? [];
  const cam = s.pose(f);
  const look = cam.look;
  const [mc, ms] = MOTES[s.lit];
  const night = s.lit === "night";
  const inside = s.w !== "town";
  const k = Math.max(0.2, Math.min(cam.pos.distanceTo(look) / 4, 1));
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={preset} sunDir={s.sun!} shadow={{ center: look.clone().setY(0), size: inside ? 6 : Math.min(60, 8 + cam.pos.distanceTo(look) * 0.6) }} />
      <World w={s.w} preset={preset} F={F} night={night} />
      <Dust center={look.clone().setY(Math.max(look.y, 0.4))} size={V(3 * k, 2.2 * k, 3 * k)} count={160} color={mc} strength={ms} />
      {fx.includes("pigeons") && <Sprites n={9} F={F} at={pigeonAt(look)} kind="pigeon" size={0.4} />}
      {fx.includes("rain") && <Sprites n={700} F={F} at={rainAt(look)} kind="drop" size={0.12} />}
      {fx.includes("clouds") && <Sprites n={40} F={F} at={cloudAt(look, Math.max(20, cam.pos.distanceTo(look) * 0.6))} kind="cloud" size={Math.max(30, cam.pos.distanceTo(look) * 0.4)} />}
      {fx.includes("smoke") && <Sprites n={120} F={F} at={smokeAt} kind="smoke" size={14} />}
      {fx.includes("sparks") && <Sprites n={50} F={F} at={sparkAt} kind="spark" size={Math.max(0.3, headOf(youLot, F).y * 0.05)} />}
      {fx.includes("flood") && <>
        <Sprites n={130} F={F} at={(i, G) => ((Math.floor(G / 5) + i) % 2 ? duckFlood(i * 2, G) : null)} kind="duckA" size={0.3} />
        <Sprites n={130} F={F} at={(i, G) => ((Math.floor(G / 5) + i) % 2 ? null : duckFlood(i * 2, G))} kind="duckB" size={0.3} />
        <Sprites n={130} F={F} at={(i, G) => ((Math.floor(G / 5) + i) % 2 ? duckFlood(i * 2 + 1, G) : null)} kind="duckA" size={0.3} />
        <Sprites n={130} F={F} at={(i, G) => ((Math.floor(G / 5) + i) % 2 ? null : duckFlood(i * 2 + 1, G))} kind="duckB" size={0.3} />
      </>}
      {(s.moving ?? []).map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {(s.critters ?? []).map((c, i) => <Critter key={i} kind={c.kind} position={c.at(F)} state={c.state(F)} size={c.size} />)}
      {s.cast?.map((c, i) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} scale={s.scales?.[i](f) ?? 1} />)}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

export const FollowersMakeYouTall: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    {/* the two biggest physical beats: Kayla shoots up (cold open), you shoot to nine hundred feet */}
    <Sequence from={B.ding + 3} durationInFrames={12}><SpeedLines center={[0.45, 0.35]} /></Sequence>
    <Sequence from={B.nine - 2} durationInFrames={12}><SpeedLines center={[0.5, 0.3]} seed={5} /></Sequence>
    <Captions words={words} speakers={{ tyler: "#c27aff", grandpa: "#5fd0ff" }} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("followers-make-you-tall/mix.wav")} />}
  </AbsoluteFill>
);
export { L };
