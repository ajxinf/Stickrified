import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Group, Mesh, PlaneGeometry, Vector3 } from "three";
import { photo } from "../../../kit/toon/build/photo";
import { barrel, campfire, crate } from "../../../kit/toon/build/props";
import { setWater, water } from "../../../kit/toon/build/water";
import { CamPose } from "../../../kit/toon/camera";
import { Character, exprAt } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { practicalGlows } from "../../../kit/toon/glow";
import { Plan, QAPlan, Shot, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { POSES } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { practicalLights, toonMaterial } from "../../../kit/toon/shade";
import { layers, pocket, seams } from "../../../kit/toon/wardrobe";
import { ToonWorld } from "../../../kit/toon/world";

/**
 * _look-test-r27 (2026-11-21): 4 s look test of the R27 kit changes (docs/style/VISUAL_DIRECTION.md "R27"). Not an
 * episode, not for posting. A night shore: moving water (build/water.ts), a campfire pool on the sand, you in a shirt
 * with a pocket and seams, a barrel framing the edge.
 *   S1 0-89    MS: you by the fire, the sea behind; worried -> smug at 40 (Static hold must pass)
 *   S2 90-119  low wide over the water toward the fire (wide: the place is the subject)
 */
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);
const LIGHT = LIGHTS.night;
const SUN = sunDirection(LIGHT, V(0.6, 1.35, 4.2), V(0.1, 1.0, 0));
const YOU_AT = V(0, 0, 0), FIRE_AT = V(1.3, 0, 0.5);
const LOOK: Look = { ...youLook, outfit: layers(...(youLook.outfit ? [youLook.outfit] : []), pocket("#c4532d", -1), seams("#8a3418")) };

const you = (F: number): CharState => {
  const e = exprAt([[0, "worried"], [40, "smug"]], F, 3);
  return { pose: POSES.idle, expr: e.expr, blink: e.blink, fx: {}, heading: 0 };
};
const cast = [{ name: "you", look: LOOK, at: () => YOU_AT, state: you }];
const cam = (pos: Vector3, look: Vector3, fov: number) => (f: number): CamPose => ({ pos: pos.clone().add(V(0, 0, -f * 0.012)), look, fov, roll: 0 });
const SHOTS: (Shot & { from: number })[] = [
  { id: "r27/S1-ms", from: 0, frames: 90, pose: cam(V(0.6, 1.35, 4.2), V(0.1, 1.0, 0), 34), cast, subject: "you", scene: "shore", light: "night", sun: SUN },
  { id: "r27/S2-water", from: 90, frames: 30, pose: cam(V(-3, 0.5, -9), V(0.8, 0.5, 0.5), 42), cast, wide: true, scene: "shore", light: "night", sun: SUN },
];
export const LOOK_TEST_R27_FRAMES = 120;
const PLAN: Plan = { slug: "_look-test-r27", shots: SHOTS };
const PRACTICALS = [{ pos: FIRE_AT.clone().add(V(0, 0.6, 0)), kind: "fire" as const, color: ["#ffa245", 2.4] as [string, number] }];

const World: React.FC<{ F: number }> = ({ F }) => {
  const g = useMemo(() => {
    const g = new Group();
    const sand = new Mesh(new PlaneGeometry(60, 30), toonMaterial({ map: photo("damp_beach_sand_02"), repeat: [20, 10], color: "#c8b8a0", mottle: 0.12 }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0, 10);
    sand.receiveShadow = true;
    const sea = water({ size: [400, 200], color: "#1e3c5a" });
    sea.position.set(0, 0.02, -105);
    const fire = campfire();
    fire.position.copy(FIRE_AT);
    fire.userData.collider = "campfire";
    const b = barrel();
    b.position.set(1.7, 0, 2.6);
    b.userData.collider = "barrel";
    const c = crate(0.7);
    c.position.set(-1.6, 0, -0.6);
    c.userData.collider = "crate";
    g.add(sand, sea, fire, b, c);
    return g;
  }, []);
  setWater(g.children[1] as Mesh, F);
  const lights = useMemo(() => practicalLights(PRACTICALS, LIGHT), []);
  const glows = useMemo(() => practicalGlows(PRACTICALS, LIGHT), []);
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

const ShotView: React.FC<{ s: Shot & { from: number } }> = ({ s }) => {
  const f = useCurrentFrame(), F = s.from + f;
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={LIGHT} sunDir={SUN} shadow={{ center: V(0, 0, 0), size: 20 }} />
      <World F={F} />
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer />
    </ThreeCanvas>
  );
};

export const LookTestR27: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
