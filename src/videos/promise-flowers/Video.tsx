import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import type { Look } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { SpeedLines } from "../../../kit/toon/SpeedLines";
import { ToonWorld } from "../../../kit/toon/world";
import { Bees, DAY, DEBATE, DEBATE_SUN, Fly, GOLD, GOLD_SUN, HOME_DAY, HOME_NIGHT, HOME_SUN, Home, MALL, MALL_SUN, Moving, Stink, SUN, TOWN, TOWN_SUN, Town } from "./scene";
import { B, FRAMES, L, PLAN, S, SHOTS, SWARM_N, derekBee, flyAt, hiveBee, petalProp, porchBee, stinkAt, swarmBee, words } from "./story";
import { V } from "./world";

/**
 * promise-flowers (episode 5): "In this world, every promise grows a flower out of your skin." Each shot is its own
 * canvas (hard cuts, one whip). The town and home are built once per canvas; living things are point sprites.
 */
export const PROMISE_FRAMES = FRAMES;
// one light per scene identity (scene.tsx): the town setup, Grandma's porch (the honey sun), the mall, the debate
const LIGHT = { day: [TOWN, TOWN_SUN], porch: [DAY, SUN], mall: [MALL, MALL_SUN], debate: [DEBATE, DEBATE_SUN], golden: [GOLD, GOLD_SUN], homeDay: [HOME_DAY, HOME_SUN], homeNight: [HOME_NIGHT, HOME_SUN] } as const;
const presetOf = (s: S) => LIGHT[s.lit][0];
const sunOf = (s: S) => LIGHT[s.lit][1];
/** The puddle under Dad's sink grows: line 5 small, by Thursday night (line 18) much bigger. */
const puddleAt = (F: number) => (F < L(18, 0) ? 1 : 1.6);

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const preset = presetOf(s);
  const fx = s.fx ?? [];
  const look = s.pose(f).look;
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={preset} sunDir={sunOf(s)} shadow={s.w === "town" ? { center: look.clone().setY(0), size: 24 } : { center: V(0, 0, 0), size: 8 }} />
      {s.w === "town" ? <Town F={F} debate={!!s.debate} signFlip={Math.min(Math.max((F - B.signFlip) / 8, 0), 1)} /> : <Home night={s.lit === "homeNight"} preset={preset} puddle={puddleAt(F)} tv={s.lit === "homeNight" && F >= L(18, 0)} />}
      {/* never lifeless (user 2026-11-22): sunlit dust and pollen drifting in front of every set; motes in the window shafts at home */}
      {s.w === "town" && <Dust center={look.clone().setY(Math.max(look.y, 1.2))} size={V(6, 3, 6)} count={280} color={({ golden: "#ffd8a0", porch: "#ffe2b0", mall: "#d8f0c0", debate: "#fffaf0" } as Record<string, string>)[s.lit] ?? "#fff6e6"} strength={1.1} />}
      {s.w === "home" && <Dust center={s.lit === "homeDay" ? V(0.4, 1.2, -1.0) : V(2.6, 1.4, -1.4)} size={V(2.6, 2.0, 2.4)} count={160} color={s.lit === "homeDay" ? "#fff0c8" : "#ffcf90"} strength={s.lit === "homeDay" ? 1.0 : 0.7} />}
      {(s.moving ?? []).map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {fx.includes("petal") && <Moving prop={petalProp} f={F} />}
      {fx.includes("hiveBees") && <Bees n={36} F={F} at={hiveBee} />}
      {fx.includes("porchBees") && <Bees n={5} F={F} at={porchBee} />}
      {fx.includes("derekBee") && <Bees n={1} F={F} at={(_, ff) => derekBee(ff)} />}
      {fx.includes("swarm") && <Bees n={SWARM_N} F={F} at={swarmBee} size={0.07} />}
      {(fx.includes("fly") || fx.includes("flyToDerek")) && <Fly F={F} at={flyAt} />}
      {fx.includes("stinkMall") && <Stink n={26} F={F} at={(i, ff) => stinkAt("mall", i, ff)} size={1.4} />}
      {fx.includes("stinkBench") && <Stink n={10} F={F} at={(i, ff) => stinkAt("bench", i, ff)} size={0.35} />}
      {fx.includes("stinkDerek") && <Stink n={40} F={F} at={(i, ff) => stinkAt("derek", i, ff)} size={1.1} />}
      {s.cast?.map((c) => {
        const lk = (c as { lookAt?: (F: number) => Look }).lookAt;
        return <Character key={c.name} position={c.at(f)} state={c.state(f)} look={lk ? lk(F) : c.look} />;
      })}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

export const PromiseFlowers: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    {/* The two biggest physical beats: the bees erupt, the nose flower shoots out. */}
    <Sequence from={B.pour - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.36]} /></Sequence>
    <Sequence from={B.nosePop - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.4]} seed={5} /></Sequence>
    <Captions words={words} speakers={{ grandma: "#ff8ac8", derek: "#5fd0ff" }} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("promise-flowers/mix.wav")} />}
  </AbsoluteFill>
);
