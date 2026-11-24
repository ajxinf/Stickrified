import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { Character } from "../../../kit/toon/cast";
import { Composer, DOF } from "../../../kit/toon/Composer";
import { ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { REST } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { photoSky } from "../../../kit/toon/sky";
import { ToonWorld } from "../../../kit/toon/world";
import { V } from "./common";
import { town } from "./town";

/** Throwaway look check for the town set (frame = view index). Not part of the episode. */
const SKY = photoSky({ ...LIGHTS.day, sat: 1.2 }, "kloofendal_48d_partly_cloudy_puresky", { exposure: 1.0, yaw: 0 });
const VIEWS: [Vector3, Vector3, number][] = [
  [V(-4, 1.6, 3), V(-10, 3, -9), 50],
  [V(6, 1.5, -1), V(3, 1.4, -8), 45],
  [V(20, 2.2, 0), V(36, 3, 30), 55],
  [V(-20, 60, 40), V(0, 0, 0), 55],
];
export const FollowersLookTest: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const [pos, look, fov] = VIEWS[f % VIEWS.length];
  const g = useMemo(town, []);
  const shot = { id: "look", frames: 1, pose: () => ({ pos, look, fov, roll: 0 }) };
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <ShotCamera {...shot} />
        <ToonWorld preset={SKY.preset} sunDir={SKY.key} shadow={{ center: look.clone().setY(0), size: 30 }} />
        <primitive object={g} />
        <Character position={V(-8, 0.12, -5.5)} state={{ pose: REST, expr: "neutral", blink: false, fx: {} }} look={youLook} />
        <Composer dof={DOF.none} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
