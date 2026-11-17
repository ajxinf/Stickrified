import { useFrame, useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Group, Mesh, Points, PointsMaterial, PointLight, Vector3 } from "three";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import type { Look } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { glowSprite, practicalGlows, sunDisc } from "../../../kit/toon/glow";
import { SKY } from "../../../kit/toon/ink";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS, LightPreset } from "../../../kit/toon/lights";
import { practicalLights } from "../../../kit/toon/shade";
import type { PracticalKind } from "../../../kit/toon/shade";
import { SpeedLines } from "../../../kit/toon/SpeedLines";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { B, BRAD_HEAD, BRAD_POS, CHAIR_OPEN, CROWD_SPOTS, FLOOD_HEAD, FRAMES, PLAN, S, SHOTS, STAMPS, WORLDS, XFADE, boatAt, dogHead, handAt, humpAt, milkyAt, mothsAt, pathAt, propsFor, shackOn, starsAt, tide, words } from "./story";
import { BED_LAMP, BEACH, LAMP_GLOW, PIER_END, SHACK_LIGHTS, beach, bedroom, canvasTex, chairRows, dog, giantHand, setSheet, setTide, shackLights, toyBoat } from "./world";

/**
 * moon-disappeared-tonight (episode 4): what if the moon vanished tonight. Each shot is its own canvas (hard cuts;
 * two dissolves into and out of the bedroom analogy). The beach's sea, shack lights, sky and moths are driven per
 * composition frame from story.ts.
 */
export const MOON_FRAMES = FRAMES;
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const V = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** The darkest night: the moon's light gone (line 19 on). */
const DARK: LightPreset = {
  ...LIGHTS.night, lit: [0.36, 0.44, 0.8], shade: [0.11, 0.13, 0.28], skyTop: "#04071a", skyMid: "#0a1238", skyHorizon: "#1c2756",
  fog: "#131b3c", haze: { color: "#1c2756", start: 30, amount: 0.3 },
};
const BEDROOM: LightPreset = { ...LIGHTS.interior, lamp: ["#ffc27a", 2.2], lit: [0.95, 0.86, 0.74], litTint: "#ffe2c0" };
const presetOf = (s: S): LightPreset => (s.w === "dark" ? DARK : s.w === "bedroom" ? BEDROOM : LIGHTS.night);

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

// ------------------------------------------------------------------ sky: moon, stars, Milky Way (follow the lens)
const starTex = () => canvasTex(32, 32, (g) => { const r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 32, 32); });
// The band's plane: through the zenith and the sea-hill axis, a little tilted.
const BAND_U = new Vector3(0, 1, 0), BAND_V = new Vector3(0.3, 0, 1).normalize(), BAND_N = new Vector3(1, 0, -0.3).normalize();
const starField = (n: number, band: boolean, seed: number) => {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let d: Vector3;
    if (band) {
      // a great circle tilted across the sky, stars spread round it (the Milky Way)
      const a = rnd(i + seed) * Math.PI, off = (rnd(i + seed + 1) + rnd(i + seed + 2) + rnd(i + seed + 3) - 1.5) * 0.2;
      d = BAND_U.clone().multiplyScalar(Math.sin(a)).addScaledVector(BAND_V, Math.cos(a)).addScaledVector(BAND_N, off);
    } else d = V(rnd(i + seed) * 2 - 1, rnd(i + seed + 1) * 2 - 1, rnd(i + seed + 2) * 2 - 1).normalize();
    if (d.y < 0.02) d.y = Math.abs(d.y) + 0.02;
    d.normalize().multiplyScalar(600);
    pos.set([d.x, d.y, d.z], i * 3);
    const warm = rnd(i + seed + 9);
    const k = band ? 0.6 + 0.6 * rnd(i + seed + 7) : 0.6 + 0.6 * rnd(i + seed + 7);
    col.set(warm > 0.8 ? [k, k * 0.9, k * 0.75] : warm < 0.2 ? [k * 0.8, k * 0.88, k] : [k, k, k], i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("color", new BufferAttribute(col, 3));
  const m = new PointsMaterial({ size: band ? 3.0 : 4.2, sizeAttenuation: false, map: starTex(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: AdditiveBlending, toneMapped: false });
  const p = new Points(g, m);
  p.layers.set(SKY);
  p.frustumCulled = false;
  p.renderOrder = 0;
  return p;
};
const Sky: React.FC<{ F: number; moon: boolean }> = ({ F, moon }) => {
  const camera = useThree((s) => s.camera);
  const sky = useMemo(() => {
    const g = new Group();
    const stars = starField(1800, false, 11), milky = starField(11000, true, 77);
    const haze = new Group();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI;
      const d = BAND_U.clone().multiplyScalar(Math.sin(a)).addScaledVector(BAND_V, Math.cos(a)).addScaledVector(BAND_N, (rnd(i + 3) - 0.5) * 0.12).normalize();
      if (d.y < 0.05) continue;
      haze.add(glowSprite(d.multiplyScalar(560), ["#7a74c8", "#a898e0", "#7aa0d8", "#c8b8d8"][i % 4], 190 + 90 * rnd(i), 0.11));
    }
    const disc = sunDisc(14, "#fffdf2", "#e6dcc0", "#c8d4ff");
    g.add(stars, milky, haze, disc);
    return { g, stars, milky, haze, disc };
  }, []);
  const MOON_DIR = useMemo(() => V(-0.18, 0.42, -1).normalize(), []);
  useFrame(() => {
    sky.g.position.copy(camera.position);
    sky.disc.position.copy(MOON_DIR).multiplyScalar(500);
    sky.disc.lookAt(camera.position.clone().sub(sky.g.position));
  });
  (sky.stars.material as PointsMaterial).opacity = starsAt(F);
  (sky.milky.material as PointsMaterial).opacity = milkyAt(F);
  sky.milky.visible = sky.haze.visible = milkyAt(F) > 0;
  sky.haze.children.forEach((c) => ((c as Mesh).visible = milkyAt(F) > 0));
  sky.haze.scale.setScalar(1);
  sky.disc.visible = moon && F < B.blinked;
  return <primitive object={sky.g} />;
};

// ------------------------------------------------------------------ the beach
type Practical = { pos: Vector3; kind: PracticalKind; color?: [string, number]; glowAt?: Vector3; group?: "shack" | "lamp" };
const BULB_MID = SHACK_LIGHTS.string[5];
const beachPracticals = (dark: boolean): Practical[] => [
  ...(dark ? [] : [{ pos: LAMP_GLOW.clone().add(V(0, -0.3, 0)), kind: "lamp" as const, glowAt: LAMP_GLOW, group: "lamp" as const }]),
  { pos: BULB_MID.clone().add(V(0, -0.2, -0.6)), kind: "shop", color: ["#ffc27a", 2.2], glowAt: BULB_MID, group: "shack" },
  { pos: SHACK_LIGHTS.neon.clone().add(V(0, 0, -0.3)), kind: "shop", color: ["#ff6a9a", 1.4], glowAt: SHACK_LIGHTS.neon, group: "shack" },
  { pos: BEACH.hatch.clone().add(V(-0.6, -0.1, 0.3)), kind: "screen", color: ["#bfe4ff", 0.7], group: "shack" },
  ...[0, 1].map((i) => ({ pos: FLOOD_HEAD(i).clone().add(V(0, -1.2, -4.5)), kind: "lamp" as const, color: ["#fff2d8", 1.6] as [string, number], glowAt: FLOOD_HEAD(i) })),
];
const Beach: React.FC<{ F: number; dark: boolean; preset: LightPreset; s: S }> = ({ F, dark, preset, s }) => {
  const world = useMemo(() => beach(!dark), [dark]);
  const sea = world.children[1];
  setTide(sea, tide(F), F);
  const on = shackOn(F);
  shackLights(world, on);
  const list = useMemo(() => beachPracticals(dark), [dark]);
  const lights = useMemo(() => practicalLights(list, preset), [list, preset]);
  const glows = useMemo(() => practicalGlows(list, preset), [list, preset]);
  // Shack practicals follow the switches (intensity 0, not removed: the light count must not change).
  const shackIdx = list.map((l, i) => (l.group === "shack" ? i : -1)).filter((i) => i >= 0);
  shackIdx.forEach((i, k) => {
    const l = lights.children[i] as PointLight, live = k === 0 ? on.bulbs : k === 1 ? on.neon >= 0.5 : on.fridge;
    l.intensity = live ? list[i].color![1] : 0;
  });
  // practicalGlows skips none here (every entry has a colour or a lamp): glows line up with the list.
  glows.children.forEach((g, i) => {
    const k = shackIdx.indexOf(i);
    if (k >= 0) g.visible = k === 0 ? on.bulbs : k === 1 ? on.neon >= 0.5 : on.fridge;
  });
  const dogObj = useMemo(() => { const d = dog(); d.position.copy(PIER_END); d.rotation.y = 0.3; return d; }, []);
  const h = dogHead(F), head = dogObj.getObjectByName("head")!;
  head.rotation.set(h.rx, h.ry, 0);
  dogObj.visible = F < B.and0;
  const chairs = useMemo(() => chairRows(CROWD_SPOTS), []);
  chairs.visible = F >= B.next - 2;
  return (
    <>
      <primitive object={world} />
      <primitive object={lights} />
      <primitive object={glows} />
      <primitive object={dogObj} />
      <primitive object={chairs} />
      {s.id === "moon/A2-flashlight-river" && <FlashlightRiver F={F} />}
      {(s.id.startsWith("moon/Q2") || s.id.startsWith("moon/Q3")) && <Moths F={F} />}
      {s.id === "moon/S1-lawn-chairs" && <Moths F={F} trail />}
    </>
  );
};
/** Line 1: a river of flashlights climbing the hill road (glowSprite follows the Vector3 it was given). */
const FlashlightRiver: React.FC<{ F: number }> = ({ F }) => {
  const g = useMemo(() => {
    const spots = Array.from({ length: 46 }, () => new Vector3());
    const grp = new Group();
    spots.forEach((p, i) => grp.add(glowSprite(p, i % 5 ? "#fff2c8" : "#ffd08a", 1.2, 1.2)));
    return { grp, spots };
  }, []);
  g.spots.forEach((p, i) => {
    const t = 0.18 + 0.82 * (((i / 46) + F * 0.0016 + rnd(i) * 0.012) % 1); // from the dune top up (near ones bloomed into blobs)
    p.copy(pathAt(t).add(V((rnd(i + 5) - 0.5) * 1.6, 0.2 * Math.sin(F * 0.3 + i), 0)));
    g.grp.children[i].position.copy(p);
  });
  return <primitive object={g.grp} />;
};
const mothTex = () => canvasTex(32, 32, (g) => { g.fillStyle = "rgba(255,248,230,0.95)"; g.beginPath(); g.ellipse(10, 14, 8, 5, -0.5, 0, 7); g.ellipse(22, 14, 8, 5, 0.5, 0, 7); g.fill(); g.fillStyle = "rgba(90,70,60,1)"; g.fillRect(15, 10, 2, 12); });
/** Line 20: moths stream in from the dark, circle the floodlights, then swarm Brad. `trail`: a few still on him the next night. */
const Moths: React.FC<{ F: number; trail?: boolean }> = ({ F, trail }) => {
  const N = trail ? 40 : 260;
  const pts = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(N * 3), 3));
    const m = new PointsMaterial({ size: 0.13, map: mothTex(), transparent: true, depthWrite: false, alphaTest: 0.3, color: "#fff4e0" });
    const p = new Points(g, m);
    p.frustumCulled = false;
    return p;
  }, [N]);
  const pos = pts.geometry.attributes.position as BufferAttribute;
  const k = mothsAt(F);
  const bradHead = BRAD_POS.clone().add(V(0, BRAD_HEAD - 0.4, 0));
  for (let i = 0; i < N; i++) {
    const a = rnd(i) * Math.PI * 2, r = 3 + rnd(i + 1) * 14;
    const far = FLOOD_HEAD(i % 2).clone().add(V(Math.cos(a) * r, (rnd(i + 2) - 0.3) * 8, Math.sin(a) * r * 0.6));
    const ring = FLOOD_HEAD(i % 2).clone().add(V(Math.cos(a + F * 0.15) * (0.6 + rnd(i + 3)), Math.sin(F * 0.2 + i) * 0.5, Math.sin(a + F * 0.15) * (0.6 + rnd(i + 3))));
    const onB = bradHead.clone().add(V(Math.cos(a + F * 0.3) * (0.18 + 0.35 * rnd(i + 4)), (rnd(i + 5) - 0.3) * 1.3 + 0.08 * Math.sin(F * 0.5 + i), Math.sin(a + F * 0.3) * 0.25 - 0.15));
    let p: Vector3;
    if (trail) p = BRAD_POS.clone().setY(0).add(V(4.5 - 1.4 * Math.min(Math.max((F - B.next) / (B.chair1 - B.next), 0), 1), 1.3 + (rnd(i) - 0.3) * 0.9, 2.6 + (rnd(i + 1) - 0.5) * 0.6)).add(V(Math.cos(a + F * 0.3) * 0.3, 0, Math.sin(a + F * 0.3) * 0.2));
    else {
      const c = Math.min(Math.max(k.come * 1.6 - rnd(i + 6) * 0.6, 0), 1);
      p = far.lerp(ring, c).lerp(onB, Math.min(Math.max(k.onBrad * 1.5 - rnd(i + 7) * 0.5, 0), 1));
    }
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  pts.visible = trail || k.come > 0;
  return <primitive object={pts} />;
};

// ------------------------------------------------------------------ the bedroom (analogy)
const Bedroom: React.FC<{ F: number; preset: LightPreset }> = ({ F, preset }) => {
  const room = useMemo(bedroom, []);
  setSheet(room.getObjectByName("sheet") as Mesh, humpAt(F));
  const hand = useMemo(giantHand, []);
  const h = handAt(F);
  hand.position.copy(h.pos);
  hand.visible = h.visible;
  const boat = useMemo(toyBoat, []);
  boat.position.copy(boatAt(F));
  boat.rotation.set(0, 0.6, 0.04 * Math.sin(F / 6));
  const list = useMemo(() => [{ pos: BED_LAMP.clone().add(V(-0.2, 0.2, 0.3)), kind: "lamp" as const, color: ["#ffc27a", 2.4] as [string, number], glowAt: BED_LAMP }], []);
  const lights = useMemo(() => practicalLights(list, preset), [list, preset]);
  const glows = useMemo(() => practicalGlows(list, preset), [list, preset]);
  return <><primitive object={room} /><primitive object={hand} /><primitive object={boat} /><primitive object={lights} /><primitive object={glows} /></>;
};

const SHADOW = { beach: { center: V(0, 0, 3), size: 24 }, dark: { center: V(0, 0, 3), size: 24 }, bedroom: { center: V(0, 0, 0), size: 6 } };

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const Wd = WORLDS[s.w], light = presetOf(s);
  const moving = useMemo(() => propsFor(s), [s]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={Wd.sun} shadow={SHADOW[s.w]} />
      {s.w !== "bedroom" && <Sky F={F} moon={!!s.moon} />}
      {s.w !== "bedroom" && <Beach F={F} dark={s.w === "dark"} preset={light} s={s} />}
      {s.w === "bedroom" && <Bedroom F={F} preset={light} />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {s.cast?.map((c) => {
        const lk = (c as { lookAt?: (F: number) => Look }).lookAt;
        return <Character key={c.name} position={c.at(f)} state={c.state(f)} look={lk ? lk(F) : c.look} />;
      })}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

/** A shot that starts a dissolve fades in over the previous shot (kept running underneath for XF frames). */
const XF = 10;
const Fade: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [0, XF], [0, 1], { extrapolateRight: "clamp" }) }}>{children}</AbsoluteFill>;
};

export const MoonDisappearedTonight: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => {
      const extend = SHOTS[i + 1] && XFADE.includes(SHOTS[i + 1].from) ? XF : 0;
      const view = <ShotView s={s} />;
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames + extend}>
          {XFADE.includes(s.from) ? <Fade>{view}</Fade> : view}
        </Sequence>
      );
    })}
    {/* The two biggest physical beats: the chair snaps open, Brad's scream. */}
    <Sequence from={CHAIR_OPEN - 2} durationInFrames={12}><SpeedLines center={[0.5, 0.34]} /></Sequence>
    <Sequence from={B.tsunami} durationInFrames={12}><SpeedLines center={[0.5, 0.36]} seed={5} /></Sequence>
    {STAMPS.map((x) => <Stamp key={x.text} {...x} />)}
    <Captions words={words} speakers={{ brad: "#ff7ac8", mia: "#5fb8ff" }} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("moon-disappeared-tonight/mix.wav")} />}
  </AbsoluteFill>
);
