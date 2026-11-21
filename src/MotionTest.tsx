import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { SpeedLines } from "../kit/toon/SpeedLines";
import * as acting from "../kit/toon/acting";
import { CharState, Character, exprAt } from "../kit/toon/cast";
import { Composer } from "../kit/toon/Composer";
import type { Expr } from "../kit/toon/face";
import { CastSpec, Plan, QAPlan, Shot, ShotCamera } from "../kit/toon/guard";
import { LIGHTS } from "../kit/toon/lights";
import { Pose, alive, poseAt, reactSquash, walkPose } from "../kit/toon/poses";
import { youLook } from "../kit/toon/protagonist";
import { ToonWorld } from "../kit/toon/world";
import { garyLook } from "./videos/trapped-in-this-world/world";
import { DUST, SHADOW, SUN, Street, at } from "./ToonTest";
import { Dust } from "../kit/toon/dust";

/**
 * Motion test (R21, visual-ref7 study): one locked medium-wide of two characters so whole-body acting is easy to judge.
 * 0-75 you walk in and stop; 75 you point (excited); 100-150 Gary talks (smug); 150 both laugh; 215 Gary goes
 * deadpan, 225 you turn nervous; 240 shock (panic pose); 285 sad. Rendered before and after the R21 kit changes
 * (docs/style/VISUAL_DIRECTION_R21.md) and stacked side by side.
 */
export const MOTION_TEST_FRAMES = 330;
const FPS = 30, WALK_END = 75, DECEL = 14;
const START = { s: 26.2, x: 3.3 }, STOP = { s: 23.2, x: 3.3 }, GARY_AT = at(23.25, 4.1, 0.02);
const PATH = START.s - STOP.s;
const V = PATH / ((WALK_END - DECEL) / FPS + DECEL / FPS / 2);
const walked = (f: number) => {
  const tc = WALK_END - DECEL;
  if (f <= tc) return (V * f) / FPS;
  const d = Math.min(f, WALK_END) - tc;
  return (V * tc) / FPS + (V * (d - (d * d) / (2 * DECEL))) / FPS;
};
const youAt = (f: number) => at(START.s - Math.min(walked(f), PATH), START.x, 0.02);

/** Fake syllables for Gary's line (mouth open/close ~5 per second). */
const talk = (f: number) => (f >= 100 && f < 150 ? { open: Math.max(0, Math.sin(f * 1.05)) * 0.9, shape: (["a", "o", "e"] as const)[Math.floor(f / 5) % 3] } : undefined);

/** Everything the role computed goes through the kit's performer (absent in the pre-R21 kit: the "before" render). */
const PERFORM = ["perform"][0]; // looked up at run time: the bundler fails a static import missing from the old kit
const performer = (acting as Record<string, unknown>)[PERFORM] as undefined | ((s: CharState, F: number, seed: number, e: { since?: number; prev?: string }) => CharState);
const finish = (s: CharState, F: number, seed: number, e: { since?: number; prev?: Expr }): CharState => (performer ? performer(s, F, seed, e) : s);

const youState = (F: number): CharState => {
  const amount = Math.min(1, Math.max(0, (WALK_END - F) / DECEL));
  let p: Pose = F < WALK_END ? walkPose(walked(F), amount, 0) : poseAt([[0, "idle"], [WALK_END + 2, "point"], [140, "idle"], [240, "panic"], [285, "idle"]], F, 4, 0.5);
  if (F >= 240 && F < 250) p = { ...p, squash: reactSquash(F - 240) };
  const keys: [number, Expr][] = [[0, "neutral"], [WALK_END, "excited"], [150, "laughing"], [225, "nervous"], [240, "shocked"], [285, "sad"]];
  const e = exprAt<Expr>(keys, F, 3);
  const s: CharState = { pose: alive(p, F, 3, [0.5, 0.3, 0]), expr: e.expr, blink: e.blink, fx: F >= 240 && F < 285 ? { ringEyes: true, sweat: Math.min(1, (F - 242) / 20) } : {} };
  return finish(s, F, 3, e as { since?: number; prev?: Expr });
};
const garyState = (F: number): CharState => {
  const p = poseAt([[0, "idle"], [100, "hips"], [215, "crossed"]], F, 4, -0.5);
  const keys: [number, Expr][] = [[0, "neutral"], [100, "smug"], [156, "laughing"], [215, "deadpan"]];
  const e = exprAt<Expr>(keys, F, 7);
  const s: CharState = { pose: alive(p, F, 7, [-0.5, -0.3, -0.6]), expr: e.expr, blink: e.blink, fx: { talk: talk(F) } };
  return finish(s, F, 7, e as { since?: number; prev?: Expr });
};

const CAST: CastSpec[] = [
  { name: "you", look: youLook, at: youAt, state: youState },
  { name: "gary", look: garyLook, at: () => GARY_AT, state: garyState },
];
// Locked-off but never dead: a 6 cm truck across the whole test.
const camAt = (f: number) => ({ pos: at(18.9, 3.7 + 0.06 * (f / MOTION_TEST_FRAMES), 1.0), look: at(23.4, 3.7, 0.92), fov: 42, roll: 0 });
const SHOT: Shot = {
  id: "MotionTest/two-shot", from: 0, frames: MOTION_TEST_FRAMES, pose: camAt, cast: CAST, subject: "you", scene: "dusk street", light: "dusk", sun: SUN,
  allow: { Pacing: "a test: one locked shot so body motion is judged without cuts", "Camera curve": "a test: the camera holds so only the characters move" },
};
const PLAN: Plan = { slug: "MotionTest", shots: [SHOT] };

export const MotionTest: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "black" }}>
      <QAPlan plan={PLAN} />
      <ThreeCanvas width={width} height={height}>
        <ShotCamera {...SHOT} />
        <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
        <Street />
        <Dust center={DUST.center} size={DUST.size} />
        {CAST.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
        <Composer dof={{ maxPx: 6, near: 3.2, far: 12 }} />
      </ThreeCanvas>
      {performer && (
        <Sequence from={240} durationInFrames={12}>
          <SpeedLines center={[0.36, 0.33]} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
