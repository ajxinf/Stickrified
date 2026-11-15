import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, Quaternion, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from "three";
import { Street } from "../../../kit/toon/build/street";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { glowSprite } from "../../../kit/toon/glow";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { Birds } from "../../../kit/toon/life";
import { LIGHTS } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { practicalLights, toonMaterial } from "../../../kit/toon/shade";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { Meta, captionsOff } from "./meta";
import { B, FRAMES, JAR_REST, PLAN, S, SHOTS, SIGN_RISE, WORLDS, jarPose, propsFor, signY, words, youAtF } from "./story";
import { BED_JAR, BR, PINK_PRESET, SIGN_AT, STREET, STREET_PRESET, WALL_X, at, bedroom, narratorSign, poseSign, wordTile } from "./world";

/**
 * trapped-in-this-world (episode 2, "In this world..." fiction): you live inside a looping Stickrified video. Each
 * shot is its own canvas (hard cuts); the meta layer (progress bar, frame edge, grabbed word, tiles, shatter) is 2D
 * over everything (meta.tsx). Story props come from story.ts (the same pose drives the render and the QA guard).
 */
export const TRAPPED_FRAMES = FRAMES;

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

/** The narrator's caption sign: rises behind you (D1), stares into the lens on "me", glows on "true", turns on
 * you (J1), shakes while it reads (M1), sulks (O2). */
const Sign: React.FC<{ F: number; lens: Vector3 }> = ({ F, lens }) => {
  const g = useMemo(narratorSign, []);
  const y = signY(F), you = youAtF(F).clone().setY(1.4);
  const shake = F >= B.they && F < B.free ? 0.06 * Math.sin(F * 2.1) : 0;
  g.position.copy(SIGN_AT).setY(y).add(new Vector3(shake, 0, 0));
  // Faces the street (+z) until it notices you, then turns to you.
  const turn = Math.min(Math.max((F - B.notice + 6) / 10, 0), 1);
  g.rotation.set(0, turn * Math.atan2(you.x - SIGN_AT.x, you.z - SIGN_AT.z), F >= B.never ? -0.08 : shake * 0.5);
  const open = F < B.me - 2 ? 0.25 : F >= B.notice && F < B.cant + 10 ? 0.45 : F >= B.free ? 1 : 0.85;
  const droop = F >= B.never ? Math.min((F - B.never) / 12, 1) : 0;
  poseSign(g, F >= B.notice ? you : F >= B.me - 2 ? lens : you, open, droop);
  const glow = g.getObjectByName("glow") as Sprite;
  (glow.material as SpriteMaterial).color.set(new Color("#ffd27a").multiplyScalar(F >= B.tru - 4 && F < B.door ? 0.6 : F >= B.they && F < B.free ? 0.45 : 0.12));
  g.visible = F >= SIGN_RISE[0];
  return <primitive object={g} />;
};

/** Soup sloshing out of your shoe on "soup": droplets arc out and land round your foot. */
const Soup: React.FC<{ F: number }> = ({ F }) => {
  const drops = useMemo(() => {
    const m = new InstancedMesh(new SphereGeometry(0.025, 8, 6), toonMaterial({ color: "#d8582a" }), 14);
    m.frustumCulled = false;
    return m;
  }, []);
  const foot = youAtF(F).clone().add(new Vector3(0.12, 0.12, 0.05)), k = F - (B.soup - 6), M4 = new Matrix4(), q = new Quaternion(), one = new Vector3(1, 1, 1);
  for (let i = 0; i < 14; i++) {
    const to = foot.clone().add(new Vector3(Math.cos(i * 2.4) * (0.2 + 0.03 * i), 0, Math.sin(i * 2.4) * (0.2 + 0.03 * i))).setY(0.03);
    const p = k < i % 4 ? foot.clone().setY(-1) : toss(foot, to, k - (i % 4), { air: 14, height: 0.15 + 0.02 * (i % 5), bounces: 0 }).pos;
    drops.setMatrixAt(i, M4.compose(p, q, one));
  }
  drops.instanceMatrix.needsUpdate = true;
  return <primitive object={drops} />;
};

/** The chalk snaps on "9,000": two halves drop from your fingers to the cobbles. */
const Chalk: React.FC<{ F: number }> = ({ F }) => {
  const bits = useMemo(() => [0, 1].map(() => new Mesh(new CylinderGeometry(0.012, 0.012, 0.05, 8), toonMaterial({ color: "#f4f0e6" }))), []);
  const grp = useMemo(() => new Group().add(...bits), [bits]);
  const from = at(17.25, WALL_X - 0.12, 1.55);
  bits.forEach((b, i) => {
    const s = toss(from, at(17.1 + 0.25 * i, WALL_X - 0.35 - 0.2 * i, 0.03), Math.max(F - B.loop9000, 0), { air: 16, height: 0.08, spins: 2 + i, bounces: 2 });
    b.position.copy(s.pos);
    b.rotation.set(s.spin, 0, 1.2 * i);
  });
  return <primitive object={grp} />;
};

/** The cork pops (L1) and the stolen words fly up out of the jar, out of frame toward the captions. */
const Bits: React.FC<{ F: number; lens: Vector3 }> = ({ F, lens }) => {
  const tiles = useMemo(() => ["IN", "THIS", "WORLD", "YOU'RE", "FREE", "THE", "SOUP"].map((t) => wordTile(t, 0.16)), []);
  const grp = useMemo(() => new Group().add(...tiles), [tiles]);
  const pop = B.jar + 8, j = jarPose(Math.min(F, pop), lens) ?? { pos: JAR_REST.clone() };
  tiles.forEach((t, i) => {
    const k = F - pop - i * 2;
    t.visible = k >= 0 && F < B.inThis;
    if (!t.visible) return;
    const s = toss(j.pos.clone().add(new Vector3(0, 0.25, 0)), j.pos.clone().add(new Vector3((i - 3) * 0.35, 3.4 + 0.3 * (i % 3), 0.8)), k, { air: 30, height: 0.6, spins: 1 + (i % 2), bounces: 0 });
    t.position.copy(s.pos);
    t.lookAt(lens);
    t.rotateZ(s.spin * 0.2);
  });
  return <primitive object={grp} />;
};
const BedroomSet: React.FC = () => {
  const g = useMemo(() => {
    const grp = new Group().add(bedroom());
    grp.add(practicalLights([{ pos: BED_JAR.clone().setY(0.2), kind: "lamp", color: ["#ffc070", 2.2] }, { pos: BR(-1.2, 2.4, -2.6), kind: "lamp", color: ["#7f8fd8", 0.8] }], LIGHTS.night));
    grp.add(glowSprite(BED_JAR.clone().setY(0.14), "#ffd27a", 0.9, 1.1));
    return grp;
  }, []);
  return <primitive object={g} />;
};

const SHADOW = { street: { center: at(15, 3), size: 22 }, bedroom: { center: BR(0, 0, -1.5), size: 6 }, pink: { center: at(16, 1), size: 16 } };
const PINK_OPTS = { seed: 31, length: 44, curve: 0 };

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const W = WORLDS[s.w], light = LIGHTS[W.light];
  const moving = useMemo(() => propsFor(s), [s]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  const lens = s.pose(f).pos;
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={W.sun} shadow={SHADOW[s.w]} />
      {s.w === "street" && <Street preset={STREET_PRESET} light={light} opts={STREET} />}
      {s.w === "pink" && <Street preset={PINK_PRESET} light={light} opts={PINK_OPTS} />}
      {s.w === "bedroom" && <BedroomSet />}
      {s.w === "street" && <Sign F={F} lens={lens} />}
      {s.w === "street" && F >= B.shoes && F < B.so && <Soup F={F} />}
      {s.w === "street" && F >= B.loop9000 - 60 && F < B.gary && <Chalk F={F} />}
      {s.w === "street" && F >= B.jar && F < B.inThis && <Bits F={F} lens={lens} />}
      {s.w !== "bedroom" && <Dust center={at(14, 3.5, 2.4)} size={new Vector3(10, 4, 18)} color="#ffd8a8" strength={0.8} count={320} />}
      {s.w === "bedroom" && <Dust center={BR(0, 1.2, -1.5)} size={new Vector3(3.6, 2.2, 3.6)} color="#ffd8a8" strength={0.7} count={160} />}
      {s.w !== "bedroom" && <Birds f={F} from={at(40, -14, 14)} to={at(-6, 16, 11)} count={7} period={480} />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} look={s.look} />
    </ThreeCanvas>
  );
};

/** Normal captions, switched off where the story's own words take over (meta.tsx captionsOff). */
const StoryCaptions: React.FC = () => (captionsOff(useCurrentFrame()) ? null : <Captions words={words} />);

export const TrappedInThisWorld: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    <Meta />
    <Stamp text="LOOP 9,000" at={B.loop9000 - 2} hold={44} />
    <Stamp text="LOOP 1" at={B.loopOne - 2} hold={FRAMES - B.loopOne} />
    <StoryCaptions />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("trapped-in-this-world/mix.wav")} />}
  </AbsoluteFill>
);
