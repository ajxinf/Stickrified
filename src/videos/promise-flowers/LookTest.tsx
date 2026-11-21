import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { Character } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { Composer, DOF } from "../../../kit/toon/Composer";
import type { Dof } from "../../../kit/toon/Composer";
import { headHeight } from "../../../kit/toon/figure";
import { ShotCamera } from "../../../kit/toon/guard";
import { POSES, REST } from "../../../kit/toon/poses";
import type { Pose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { ToonWorld } from "../../../kit/toon/world";
import { callGuyLook, dadLook, dateManLook, dateWomanLook, derekFlowers, derekLook, grandmaLook, lindaLook, mailLook, townFlowers, TOWN_LOOKS, yourFlowers } from "./cast";
import { Bees, DAY, Fly, HOME_DAY, HOME_NIGHT, HOME_SUN, Home, SUN, Town } from "./scene";
import { BENCH, CHAIR_SPOTS, DAD_SEAT, GRANDMA_DOOR_X, HIVES, PODIUM, PORCH, STAGE, V, YOU_SOFA } from "./world";

/** promise-flowers look test: one still per frame (rough stills before the build). */
type C = { look: Look; at: Vector3; state: CharState };
const S = (pose: Pose, o: Partial<CharState> = {}): CharState => ({ pose, expr: "neutral", blink: false, fx: {}, ...o });
const SIT: Pose = { ...REST, sit: 1 };
type T = { id: string; world: "town" | "home-day" | "home-night"; debate?: boolean; cam: { pos: Vector3; look: Vector3; fov: number }; cast: C[]; dof?: Dof; bees?: boolean };
const head = (at: Vector3, look: Look, pose: Pose = REST) => at.clone().setY(at.y + headHeight(look, pose));
const YOU_PORCH = V(GRANDMA_DOOR_X - 1.4, 0, PORCH.z1 + 0.08);
const DEREK = V(PODIUM.x + 0.1, STAGE.h, PODIUM.z + 0.45);
const TESTS: T[] = [
  { id: "bench", world: "town", cam: { pos: V(2.45, 1.05, 7.2), look: V(2.45, 0.95, 5.3), fov: 40 }, dof: DOF.closeup(1.9), cast: [
    { look: dateManLook, at: V(2.05, 0, BENCH.z + 0.3), state: S({ ...SIT, arms: [REST.arms[0], { at: [0.62, 0.35], grip: "open" }] }, { expr: "excited", flowers: [{ at: { part: "arm", side: 1, t: 0.5 }, color: "#e84a3a", open: 1, size: 1.6, ang: -20, seed: 3 }] }) },
    { look: dateWomanLook, at: V(2.85, 0, BENCH.z + 0.3), state: S({ ...SIT, arms: [{ at: [0.6, 0.35], grip: "open" }, REST.arms[1]] }, { expr: "pleading" }) },
  ] },
  { id: "plaza", world: "town", cam: { pos: V(2.6, 2.4, 14.5), look: V(2.4, 0.9, 5.5), fov: 50 }, cast: [
    { look: mailLook, at: V(4.6, 0, 8.4), state: S(POSES.wave, { expr: "grin", flowers: [0.2, 0.4, 0.6, 0.8].flatMap((t) => [0, 1].map((side) => ({ at: { part: "arm" as const, side: side as 0 | 1, t }, color: "#f6f0ea", open: 1, size: 0.8, ang: side ? 30 : -30, seed: t * 10 + side }))) }) },
    ...[0, 1, 2, 3].map((i) => ({ look: TOWN_LOOKS[i], at: [V(0.3, 0, 9.4), V(3.8, 0, 11.2), V(-0.6, 0, 7.6), V(5.8, 0, 10.5)][i], state: S(REST, { expr: i % 2 ? "smug" : "excited", flowers: townFlowers(i + 2, 40, 3), heading: i * 1.3 }) })),
    { look: dateManLook, at: V(2.05, 0, BENCH.z + 0.3), state: S(SIT) },
  ] },
  { id: "plaza-bisect", world: "town", cam: { pos: V(2.6, 2.4, 14.5), look: V(2.4, 0.9, 5.5), fov: 50 }, cast: [
    { look: mailLook, at: V(4.6, 0, 8.4), state: S(REST) },
    { look: TOWN_LOOKS[0], at: V(0.3, 0, 9.4), state: S(REST) },
    { look: TOWN_LOOKS[1], at: V(3.4, 0, 5.4), state: S(REST) },
    { look: youLook, at: V(1.0, 0, 6.5), state: S(REST) },
    { look: TOWN_LOOKS[2], at: V(3.0, 0, 3.0), state: S(REST) },
  ] },
  { id: "porch", world: "town", cam: { pos: V(GRANDMA_DOOR_X - 1.0, 1.05, -4.6), look: V(GRANDMA_DOOR_X - 1.0, 0.85, -7.4), fov: 40 }, dof: DOF.medium(2.8), cast: [
    { look: youLook, at: YOU_PORCH, state: S(SIT, { expr: "tired", flowers: yourFlowers(30, { bud: { grow: 1, open: 0, rot: 0 } }) }) },
    { look: grandmaLook, at: V(GRANDMA_DOOR_X + 1.5, PORCH.y, PORCH.z0 + 0.8), state: S(SIT, { expr: "relieved", flowers: [{ at: { part: "arm", side: 0, t: 0.5 }, color: "#d8243a", open: 1, size: 1, seed: 9 }, { at: { part: "head", x: 0.95, y: -0.75 }, color: "#d8243a", open: 1, size: 0.9, seed: 10 }] }) },
  ] },
  { id: "derek", world: "town", cam: { pos: V(DEREK.x + 0.4, 2.15, DEREK.z - 3.2), look: V(DEREK.x, 2.0, DEREK.z), fov: 40 }, dof: DOF.medium(3.2), cast: [
    { look: derekLook({}), at: DEREK, state: S(POSES.point, { expr: "grin", flowers: derekFlowers(0, 0), heading: Math.PI }) },
  ] },
  { id: "derek-rotten", world: "town", cam: { pos: V(DEREK.x + 0.4, 2.15, DEREK.z - 3.2), look: V(DEREK.x, 2.0, DEREK.z), fov: 40 }, dof: DOF.medium(3.2), cast: [
    { look: derekLook({ slide: 1.3, rotten: 1, F: 20 }), at: DEREK, state: S(POSES.panic, { expr: "shocked", flowers: derekFlowers(1, 20, 1.3), heading: Math.PI }) },
  ] },
  { id: "hives", world: "town", bees: true, cam: { pos: V(-9.3, 1.25, 1.2), look: V(-9.4, 1.0, 4.4), fov: 46 }, dof: DOF.medium(2.7), cast: [
    { look: youLook, at: V(-8.85, 0, 3.75), state: S(POSES.idle, { expr: "determined", heading: -1.2, flowers: yourFlowers(30, { bud: { grow: 1, open: 0, rot: 0 } }) }) },
    { look: grandmaLook, at: V(-9.85, 0, 3.85), state: S(POSES.idle, { expr: "smug", heading: 1.4 }) },
  ] },
  { id: "debate", world: "town", debate: true, cam: { pos: V(-4.5, 2.6, 8.4), look: V(2.2, 1.1, 16.5), fov: 50 }, cast: [
    ...CHAIR_SPOTS.filter((_, i) => i % 2 === 0).slice(0, 18).map((p, i) => ({ look: TOWN_LOOKS[i % TOWN_LOOKS.length], at: p.clone().add(V(0, 0, 0.28)), state: S(SIT, { expr: "neutral" as const, heading: 0, flowers: townFlowers(i, 0, 2) }) })),
    { look: derekLook({}), at: DEREK, state: S(POSES.wave, { expr: "grin", heading: Math.PI, flowers: derekFlowers(0, 0) }) },
  ] },
  { id: "mall", world: "town", cam: { pos: V(23.5, 1.5, -6.8), look: V(44, 1.15, -7.0), fov: 14 }, cast: [
    { look: callGuyLook, at: V(44, 0, -7.0), state: S({ ...REST, arms: [REST.arms[0], { at: [0.3, -0.2], grip: "fist" }] }, { prop: "phone", expr: "smug", flowers: [{ at: { part: "torso", x: 0.75, y: -0.8 }, color: "#e84a6a", open: 0.6, rot: 1, size: 1.6, ang: 30, seed: 4, F: 10 }] }) },
    { look: TOWN_LOOKS[4], at: V(36, 0, -6.4), state: S(POSES.facepalm, { expr: "disgusted" }) },
  ] },
  { id: "home-day", world: "home-day", cam: { pos: V(-0.4, 1.35, 2.3), look: V(-1.1, 0.85, -1.2), fov: 46 }, dof: DOF.medium(3.0), cast: [
    { look: dadLook, at: DAD_SEAT.clone().add(V(0, 0, 0.12)), state: S({ ...POSES.hold, sit: 1 }, { expr: "deadpan", flowers: [{ at: { part: "head", x: -1.0, y: -0.05 }, color: "#d8423a", open: 0.6, rot: 1, size: 1.6, ang: -70, seed: 5, F: 12 }] }) },
  ] },
  { id: "home-night", world: "home-night", cam: { pos: V(1.0, 1.05, 1.0), look: V(2.1, 0.85, -1.5), fov: 44 }, dof: DOF.medium(2.6), cast: [
    { look: youLook, at: YOU_SOFA, state: S({ ...SIT, arms: [REST.arms[0], { at: [0.0, 0.2], grip: "fist" }] }, { expr: "worried", flowers: yourFlowers(60, { bud: { grow: 1, open: 0, rot: 0.35 } }) }) },
  ] },
  { id: "linda", world: "town", cam: { pos: V(-16.4, 1.05, -2.4), look: V(-17.0, 0.95, -6.3), fov: 40 }, dof: DOF.medium(3.8), cast: [
    { look: lindaLook, at: V(-17, 0, -6.3), state: S({ ...REST, arms: [{ at: [0.3, 0.4], grip: "fist", fwd: 0.5 }, { at: [0.3, 0.45], grip: "fist", fwd: -0.5 }], stride: [30, -30], lift: [0, 18] }, { expr: "excited", heading: -Math.PI / 2, flowers: [{ at: { part: "leg", side: 1, t: 0.5 }, color: "#f2c23a", open: 1, size: 2.3, ang: 10, seed: 8 }] }) },
  ] },
];
export const PF_LOOK_FRAMES = TESTS.length;
const View: React.FC<{ t: T }> = ({ t }) => {
  const { width, height } = useVideoConfig();
  const preset = t.world === "town" ? DAY : t.world === "home-day" ? HOME_DAY : HOME_NIGHT;
  const sun = t.world === "town" ? SUN : HOME_SUN;
  const shot = { id: t.id, frames: 1, pose: () => ({ ...t.cam, roll: 0 }) };
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shot} />
      <ToonWorld preset={preset} sunDir={sun} shadow={t.world === "town" ? { center: t.cam.look.clone().setY(0), size: 26 } : { center: V(0, 0, 0), size: 8 }} />
      {t.world === "town" ? <Town F={0} debate={!!t.debate} signFlip={0} /> : <Home night={t.world === "home-night"} preset={preset} puddle={1} tv={t.world === "home-night"} />}
      {t.bees && <Bees n={40} F={0} at={(i) => HIVES[i % 3].clone().add(V(Math.sin(i * 7.1) * 0.8, 0.6 + Math.cos(i * 3.3) * 0.5, Math.cos(i * 5.3) * 0.7))} />}
      {t.id === "porch" && <Fly F={0} at={() => head(YOU_PORCH, youLook, SIT).add(V(0.22, 0.12, 0.1))} />}
      {t.cast.map((c, i) => <Character key={i} position={c.at} state={c.state} look={c.look} />)}
      <Composer dof={t.dof ?? DOF.none} />
    </ThreeCanvas>
  );
};
export const PromiseLookTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    {TESTS.map((t, i) => <Sequence key={t.id} from={i} durationInFrames={1}><View t={t} /></Sequence>)}
  </AbsoluteFill>
);
