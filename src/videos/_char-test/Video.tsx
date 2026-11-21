import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { flow, perform, turnTo } from "../../../kit/toon/acting";
import { frameOn } from "../../../kit/toon/camera";
import { Character, exprAt } from "../../../kit/toon/cast";
import type { CharState } from "../../../kit/toon/cast";
import { Composer, DOF, Dof } from "../../../kit/toon/Composer";
import { EXTRAS } from "../../../kit/toon/extras";
import type { Expr } from "../../../kit/toon/face";
import { Plan, QAPlan, Shot, ShotCamera } from "../../../kit/toon/guard";
import { POSES, Pose, REST, posesAt, reactSquash, walkPose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { ToonWorld } from "../../../kit/toon/world";
import { LIGHT, MOON, World, at } from "../_look-test-r27/Video";

/**
 * _char-test (R28, 2026-11-21): 10 s test of character v3 (build, ink, form shading) and the fluid motion layer
 * (walk stride + arm swing, 10-frame eased moves with overlap, follow-through `flow`, eased turns `turnTo`). Not an
 * episode. Same night cove as LookTestR27 (no log story).
 *   A   0-149 wide   // does: you walk in side-on with real strides, stop and settle, turn to the lens, wave; an extra strolls past behind at 3/4
 *   B 150-299 MS     // does: shrug, point, a laugh that rocks the body, a shocked jump, nervous settle with hands on hips
 */
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smooth = (t: number) => { const k = clamp01(t); return k * k * (3 - 2 * k); };

// ------------------------------------------------------------------ you: walk in from screen-left (+x) along z = 4
const Z = 4.0, X0 = 6.3, WALK_END = 82, V0 = 0.042; // m per frame at full stride (1.26 m/s)
const amount = (f: number) => smooth(f / 10) * smooth((WALK_END - f) / 12);
const walked = (F: number) => { let d = 0; for (let f = 0; f < Math.min(F, WALK_END); f++) d += V0 * amount(f); return d; };
const youAt = (F: number) => at(X0 - walked(F), Z);
const END = youAt(WALK_END);
// A tracks alongside you (refs follow a walker) and eases to rest as you stop.
const camA = (F: number) => { const x = youAt(F).x; return { pos: V(x + 0.35, 1.05, Z - 5.4), look: V(x - 0.1, 0.95, Z + 0.6), fov: 42 }; };
const FACE_A = Math.atan2(camA(WALK_END).pos.x - END.x, camA(WALK_END).pos.z - END.z);
const B = frameOn(END, END.clone().add(V(0.5, 0, -3)), "ms", { fov: 40 });
const FACE_B = Math.atan2(B.pos.x - END.x, B.pos.z - END.z);

const arms = (l: [number, number], r: [number, number], o: Partial<Pose["arms"][0]> = {}): Pose["arms"] => [{ at: l, ...o }, { at: r, ...o }];
const wave = (F: number): Pose => ({ ...REST, sway: -3, tilt: 5, arms: [{ at: [0.2, 0.9] }, { at: [0.55 + 0.13 * Math.sin(F / 3.2), -0.85], grip: "open" }] });
const laugh: Pose = { ...REST, bob: -4, arms: arms([-0.05, 0.5], [-0.08, 0.52], { grip: "open", layer: "front" }) };
const jump = (F: number): Pose => {
  const t = clamp01((F - 247) / 16);
  return { ...POSES.panic, bob: 70 * Math.sin(Math.PI * t) - 10 * (1 - t) * (F < 247 ? 0 : 1), lift: [18 * Math.sin(Math.PI * t), 22 * Math.sin(Math.PI * t)] };
};
const KEYS = (F: number): [number, Pose][] => [
  [WALK_END, REST], [108, wave(F)], [146, REST], [152, { ...POSES.shrug }], [180, { ...POSES.point }], [208, laugh],
  [243, { ...POSES.panic }], [247, jump(F)], [264, { ...POSES.panic }], [272, { ...POSES.hips }],
];
const EXPR: [number, Expr][] = [[0, "determined"], [92, "smug"], [108, "excited"], [152, "confused"], [180, "excited"], [208, "laughing"], [243, "shocked"], [270, "nervous"], [286, "relieved"]];

const raw = (F: number): CharState => {
  const e = exprAt(EXPR, F, 2);
  const heading = turnTo([[0, -Math.PI / 2], [90, FACE_A], [150, FACE_B]], F, 14);
  let pose: Pose;
  if (F < WALK_END) {
    pose = walkPose(walked(F), amount(F));
  } else pose = posesAt(KEYS(F), F);
  pose = { ...pose, squash: (pose.squash ?? 0) + reactSquash(F - 243) + reactSquash(F - 263) };
  return perform({ pose, expr: e.expr, blink: e.blink, fx: F >= 243 && F < 262 ? { ringEyes: true } : {}, heading }, F, 2, e);
};
const youState = (F: number) => flow(raw, F);

// ------------------------------------------------------------------ an extra strolling behind (3/4 view)
const EXTRA = EXTRAS[0].look, EZ = 7.2, EX0 = 7.4, EV = 0.018; // strolls the other way, clear of the fire's glare line
const extraAt = (F: number) => at(EX0 - EV * F, EZ);
const extraRaw = (F: number): CharState => {
  const e = exprAt([[0, "neutral"], [70, "suspicious"]], F, 9);
  return perform({ pose: walkPose(EV * F, 1), expr: e.expr, blink: e.blink, fx: {}, heading: -Math.PI / 2 - 0.35 }, F, 9, e, 0.5);
};
const extraState = (F: number) => flow(extraRaw, F, 0.5);

const cast = (from: number, extra: boolean) => [
  { name: "you", look: youLook, at: (f: number) => youAt(from + f), state: (f: number) => youState(from + f) },
  ...(extra ? [{ name: "extra", look: EXTRA, at: (f: number) => extraAt(from + f), state: (f: number) => extraState(from + f) }] : []),
];
const LS = { scene: "cove", light: "night" as const, sun: MOON };
type S = Shot & { from: number; dof: (f: number) => Dof };
const SHOTS: S[] = [
  { id: "r28/A-walk", from: 0, frames: 150, ...LS, cast: cast(0, true), subject: "you", wide: true, dof: () => DOF.none,
    allow: { Pacing: "a character motion test: one continuous walk, stop, turn and wave" },
    pose: (f) => ({ ...camA(f), pos: camA(f).pos.add(V(0, 0, 0.004 * f)), roll: 0 }) },
  { id: "r28/B-react", from: 150, frames: 150, ...LS, cast: cast(150, false), subject: "you", dof: () => DOF.medium(2.9),
    allow: { Pacing: "a character motion test: one continuous run of gestures" },
    pose: (f) => ({ pos: B.pos.clone().lerp(END.clone().setY(B.pos.y), 0.0012 * f).add(V(0.003 * f, 0, 0)), look: B.look, fov: B.fov, roll: 0 }) },
];
export const CHAR_TEST_FRAMES = 300;
const PLAN: Plan = { slug: "_char-test", shots: SHOTS };

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame();
  return (
    <ThreeCanvas width={useVideoConfig().width} height={useVideoConfig().height}>
      <ShotCamera {...s} />
      <ToonWorld preset={LIGHT} sunDir={MOON} shadow={{ center: V(2, 0, 5), size: 16 }} />
      <World F={s.from + f} story={false} />
      {(s.cast ?? []).map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} look={{ pool: [0.45, 0.55, 0.75, 0.28] }} />
    </ThreeCanvas>
  );
};

export const CharTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
