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
import { SANDWICH } from "./outside";
import { SILL } from "./rooms";
import { FOREST_L, HIDE_DAWN, HIDE_NIGHT, INTERVIEW_L, Moving, OFFICE_L, STREET_L, Sprites, VAULT_DAY, VAULT_GOLD, VAULT_NIGHT, World } from "./scene";
import { PLAN, SHOTS } from "./shots";
import type { Lit, S } from "./shots";
import { B, FRAMES, L, clamp01, geniusVault, handAt, headOf, speedyForest, words, worldAt, youLadder } from "./story";
import { SENSOR } from "./vault";

/** antwerp-diamond-heist (episode 6): the Antwerp diamond heist, 2003. One canvas per shot, hard cuts. */
export const HEIST_FRAMES = FRAMES;
const PRESET = { vaultNight: VAULT_NIGHT, vaultGold: VAULT_GOLD, vaultDay: VAULT_DAY, office: OFFICE_L, hideNight: HIDE_NIGHT, hideDawn: HIDE_DAWN, street: STREET_L, forest: FOREST_L, interview: INTERVIEW_L } as Record<Lit, typeof VAULT_DAY>;
const MOTES: Record<Lit, [string, number]> = { vaultNight: ["#bfe0ff", 0.7], vaultGold: ["#ffd890", 1.1], vaultDay: ["#f4f8ff", 0.5], office: ["#fff0c8", 1.0], hideNight: ["#ffcf90", 0.8], hideDawn: ["#ffe0e0", 0.8], street: ["#cfe0ff", 0.4], forest: ["#f2f6f2", 0.9], interview: ["#e8fff4", 0.6] };

// ------------------------------------------------------------------ effects, per composition frame
const NOZZLE = SENSOR.clone().add(V(-0.39, -0.12, 0.42)), LENS = SENSOR.clone().add(V(-0.09, -0.02, 0));
const sprayAt = (i: number, F: number) => {
  if (F >= B.sandwich - 30 && F < L(29, 0)) return null;
  const t = ((F * 0.07 + i / 30) % 1);
  return NOZZLE.clone().lerp(LENS, t).add(V((rnd(i) - 0.5) * 0.12 * t, (rnd(i + 1) - 0.5) * 0.1 * t, (rnd(i + 2) - 0.5) * 0.12 * t));
};
const DIAL = V(0, 1.8, 0.53);
const digitAt = (k: number) => (i: number, F: number) => {
  const t0 = L(5, 0) + 6 + (i * 5 + k * 1.7) % 70, t = (F - t0) / 30;
  if (t < 0 || F >= L(6, 0)) return null;
  const vx = (rnd(i * 5 + k) - 0.5) * 0.9, vz = 0.5 + rnd(i * 3 + k) * 0.6;
  const p = DIAL.clone().add(V(vx * t, 0.25 * t - 4.9 * t * t, vz * t));
  if (p.y < 0.03) { const tl = Math.sqrt(1.8 / 4.9); return V(DIAL.x + vx * tl * 1.05, 0.03 + rnd(i + k * 31) * 0.12, DIAL.z + vz * tl); }
  return p;
};
const pigeonAt = (_: number, F: number) => {
  const land = B.panics - 14;
  const a = V(-3.4, 2.0, -0.3), b = SILL.clone().add(V(0.1, 0.14, 0.05));
  if (F < land) { const t = clamp01((F - (land - 26)) / 26); return a.lerp(b, t).add(V(0, 0.25 * Math.sin(Math.PI * t), 0)); }
  if (F < B.panics + 6) return b;
  const t = (F - B.panics - 6) / 20; return b.clone().add(V(-1.4 * t, 1.2 * t, 0.2 * t));
};
const breathAt = (cam: () => Vector3) => (i: number, F: number) => {
  if (F < B.breath - 2 || F > B.breath + 30) return null;
  const h = headOf(geniusVault, F), toCam = cam().clone().sub(h).normalize();
  return h.clone().add(V(0, 0.02, 0)).addScaledVector(toCam, 0.12 + 0.01 * i).add(V((rnd(i) - 0.5) * 0.14, (rnd(i + 3) - 0.5) * 0.06, 0));
};
const glintAt = (cam: () => Vector3) => (_: number, F: number) => {
  if (F < B.gta - 2 || F > B.gta + 12) return null;
  const h = headOf(youLadder, F), toCam = cam().clone().sub(h).normalize();
  return h.clone().add(V(0.12, 0.05, 0)).addScaledVector(toCam, 0.3);
};
const trashAt = (cam: () => Vector3) => (i: number, F: number) => {
  const t0 = B.flings + (i % 20) * 2.2, t = (F - t0) / 30;
  if (t < 0) return null;
  const h = handAt(speedyForest, Math.min(F, t0 + 1), cam(), "right");
  const a = rnd(i) * 6.28, sp = 1.5 + rnd(i + 1) * 2.4;
  const p = h.clone().add(V(Math.cos(a) * sp * t, (2.8 + rnd(i + 2) * 1.5) * t - 2.2 * t * t, Math.sin(a) * sp * t * 0.8));
  return p.y < 0.02 ? null : p; // landed: the litter layer takes over
};

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const preset = PRESET[s.lit];
  const fx = s.fx ?? [];
  const cam = s.pose(f);
  const look = cam.look;
  const [mc, ms] = MOTES[s.lit];
  const camPos = () => s.pose(f).pos;
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={preset} sunDir={s.sun!} shadow={{ center: look.clone().setY(0), size: s.w === "forest" || s.w === "street" ? 20 : 8 }} />
      <World w={s.w} preset={preset} s={worldAt(F)} F={F} />
      {/* never lifeless: motes drifting in the light of every set */}
      <Dust center={look.clone().setY(Math.max(look.y, 1.0))} size={V(3, 2.2, 3)} count={s.w === "forest" ? 260 : 180} color={mc} strength={ms} />
      {fx.includes("gold") && <Dust center={look.clone()} size={V(2.4, 2, 2.4)} count={160} color="#ffe2a0" strength={1.4} />}
      {fx.includes("forestMist") && <Dust center={V(look.x, 1.2, look.z)} size={V(8, 2.4, 8)} count={120} color="#ffffff" strength={0.5} />}
      {fx.includes("spray") && <Sprites n={30} F={F} at={sprayAt} kind="mist" size={0.07} />}
      {fx.includes("digits") && (["d0", "d1", "d4", "d7", "d9"] as const).map((k, j) => <Sprites key={k} n={22} F={F} at={digitAt(j)} kind={k} size={0.075} />)}
      {fx.includes("pigeon") && <Sprites n={1} F={F} at={pigeonAt} kind="pigeon" size={0.32} />}
      {fx.includes("breath") && <Sprites n={8} F={F} at={breathAt(camPos)} kind="mist" size={0.09} />}
      {fx.includes("glint") && <Sprites n={1} F={F} at={glintAt(camPos)} kind="sparkle" size={0.16 * (1 - Math.abs(F - B.gta - 4) / 10)} />}
      {fx.includes("trashRain") && <Sprites n={60} F={F} at={trashAt(camPos)} kind="paper" size={0.16} />}
      {(s.moving ?? []).map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

export const AntwerpHeist: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    {/* the two biggest physical beats: Speedy's pigeon jump, the vault door swinging open */}
    <Sequence from={B.panics - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.36]} /></Sequence>
    <Sequence from={B.opens - 1} durationInFrames={12}><SpeedLines center={[0.5, 0.42]} seed={5} /></Sequence>
    <Captions words={words} speakers={{ speedy: "#5fd0ff" }} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("antwerp-diamond-heist/mix.wav")} />}
  </AbsoluteFill>
);
export { SANDWICH };
