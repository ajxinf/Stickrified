import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, getRemotionEnvironment, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, Object3D, SRGBColorSpace, Vector3 } from "three";
import { signFace } from "../../../kit/toon/build/signs";
import { Street } from "../../../kit/toon/build/street";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import type { Look } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { practicalGlows } from "../../../kit/toon/glow";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { practicalLights } from "../../../kit/toon/shade";
import { SpeedLines } from "../../../kit/toon/SpeedLines";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { drawScreen, makeScreen } from "./screen";
import { B, CarSpec, FRAMES, PLAN, S, SHOTS, STAMPS, clockAt, deadlineAt, WORLDS, boardHatless, carsAt, propsFor, screenAt, words } from "./story";
import { OFFICE_LIGHTS, drawClock, drawDeadline, lordsChamber, office, toyCar, toyCity } from "./world";
import { spine } from "../../../kit/toon/build/street";

/**
 * gta-started-as-race-n-chase (episode 3): how GTA began as Race'n'Chase. Each shot is its own canvas (hard cuts).
 * Office monitors show the game drawn per frame (screen.ts); the game's own shots are a top-down toy city.
 */
export const GTA_FRAMES = FRAMES;
const at = spine(0).at;

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

/** The office: three live monitors, the whiteboard that loses the cop's hat, the door the publisher opens. */
const Office: React.FC<{ F: number }> = ({ F }) => {
  const g = useMemo(office, []);
  const screens = useMemo(() => {
    return (["you", "mike", "test"] as const).map((which, i) => {
      const scr = makeScreen();
      const mesh = g.getObjectByName(`desk${i + 1}`)!.getObjectByName("screen") as Mesh;
      mesh.material = new MeshBasicMaterial({ map: scr.t });
      return { which, scr };
    });
  }, [g]);
  for (const { which, scr } of screens) {
    const s = screenAt(which, F);
    drawScreen(scr.g, s.mode, F, s.k);
    scr.t.needsUpdate = true;
  }
  const live = useMemo(() => (["deadline", "clock"] as const).map((n) => {
    const c = document.createElement("canvas");
    [c.width, c.height] = n === "deadline" ? [600, 413] : [200, 200];
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    const m = (g.getObjectByName(n) as Mesh).material as MeshBasicMaterial;
    m.map = t;
    m.needsUpdate = true;
    return { g2: c.getContext("2d")!, t };
  }), [g]);
  drawDeadline(live[0].g2, deadlineAt(F));
  const ck = clockAt(F);
  drawClock(live[1].g2, ck.hour, ck.minute);
  live.forEach((l) => (l.t.needsUpdate = true));
  const board = g.getObjectByName("board") as Mesh;
  const faces = board.userData.faces as { cop: MeshBasicMaterial; hatless: MeshBasicMaterial };
  board.material = boardHatless(F) ? faces.hatless : faces.cop;
  const door = g.getObjectByName("door")!;
  const open = F >= B.week - 8 && F < B.month ? Math.min((F - (B.week - 8)) / 10, 1) : 0;
  door.rotation.y = -1.3 * open * open * (3 - 2 * open);
  const lights = useMemo(() => practicalLights(OFFICE_LIGHTS, LIGHTS.moonInterior), []);
  const glows = useMemo(() => practicalGlows(OFFICE_LIGHTS, LIGHTS.moonInterior), []);
  return <><primitive object={g} /><primitive object={lights} /><primitive object={glows} /></>;
};

/** The game's cars at frame F (a pool of toy cars, positioned per frame; light bars flash; your bar pops off). */
const CityCars: React.FC<{ F: number }> = ({ F }) => {
  const pool = useMemo(() => ({ police: Array.from({ length: 18 }, (_, i) => toyCar("police", i)), robber: Array.from({ length: 4 }, (_, i) => toyCar("robber", i)), bar: toyCar("police").getObjectByName("lightbar")! }), []);
  const grp = useMemo(() => new Group().add(...pool.police, ...pool.robber, pool.bar), [pool]);
  [...pool.police, ...pool.robber].forEach((c) => (c.visible = false));
  pool.bar.visible = false;
  let pi = 0, ri = 0;
  carsAt(F).forEach((c: CarSpec) => {
    const o: Object3D = c.kind === "police" ? pool.police[pi++] : pool.robber[ri++];
    if (!o) return;
    o.visible = true;
    o.position.copy(c.pos);
    o.rotation.set(0, c.h + (c.spin !== undefined && F >= B.constantly && F < B.week ? Math.sin(F * 0.4 + c.spin) * 0.6 : 0), 0);
    const bar = o.getObjectByName("lightbar");
    if (bar) {
      bar.visible = c.barOff === undefined;
      const on = Math.floor(F / 4) % 2 === 0;
      const red = bar.getObjectByName("red") as Mesh, blue = bar.getObjectByName("blue") as Mesh;
      (red.material as MeshBasicMaterial).color.set(c.flash && on ? "#ff3030" : "#7a1a1a");
      (blue.material as MeshBasicMaterial).color.set(c.flash && !on ? "#4a8aff" : "#1a2a6a");
      if (c.barOff !== undefined) {
        pool.bar.visible = c.barOff < 40;
        const t = toss(c.pos.clone().add(new Vector3(0, 0.95, 0)), c.pos.clone().add(new Vector3(2.2, 0.05, 1.4)), c.barOff, { air: 18, height: 1.2, spins: 2, bounces: 2 });
        pool.bar.position.copy(t.pos);
        pool.bar.rotation.set(t.spin, 0.3, t.spin * 0.5);
      }
    }
  });
  return <primitive object={grp} />;
};

/** The toy city, with the billboard counter rolling up to 400 million (line 23). */
const City: React.FC<{ F: number }> = ({ F }) => {
  const g = useMemo(toyCity, []);
  const counter = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 520;
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    (g.getObjectByName("billboardFace") as Mesh).material = new MeshBasicMaterial({ map: t });
    return { c, g2: c.getContext("2d")!, t };
  }, [g]);
  if (F >= B.today - 10) {
    const k = Math.min(Math.max((F - B.today) / (B.copies - B.today), 0), 1), n = Math.round(400 * (1 - Math.pow(1 - k, 3)));
    const x = counter.g2;
    x.fillStyle = "#141a3a"; x.fillRect(0, 0, 1200, 520);
    x.fillStyle = "#f2c23a"; x.font = `900 70px Nunito, sans-serif`; x.textAlign = "center"; x.fillText("COPIES SOLD", 600, 100);
    x.fillStyle = "#fbf7ee"; x.font = `900 230px Nunito, sans-serif`; x.fillText(`${n}`, 600, 330);
    x.fillStyle = "#f2c23a"; x.font = `900 80px Nunito, sans-serif`; x.fillText("MILLION", 600, 450);
    if (k >= 1) { x.fillStyle = "rgba(255,255,255,0.25)"; x.beginPath(); x.arc(1050 + Math.sin(F) * 10, 120 - ((F * 3) % 80), 40, 0, 7); x.fill(); }
    counter.t.needsUpdate = true;
  }
  return <primitive object={g} />;
};
const Lords: React.FC = () => <primitive object={useMemo(lordsChamber, [])} />;
/** The games shop sign over the queue (line 22). */
const ShopSign: React.FC = () => {
  const g = useMemo(() => {
    const grp = new Group();
    const blade = signFace("GAMES", "#c8282a", "#fbf7ee", 1.5, 0.55);
    blade.position.copy(at(12.8, 4.55, 3.1));
    // a blade sign out from the shop front, read from down the street (the street runs toward -z in view)
    (blade.material as MeshBasicMaterial).side = 2;
    const banner = signFace("OUT TODAY!", "#f2c23a", "#141014", 3.4, 0.7);
    banner.position.copy(at(19.5, 2.2, 4.3));
    (banner.material as MeshBasicMaterial).side = 2;
    grp.add(blade, banner);
    return grp;
  }, []);
  return <primitive object={g} />;
};

const SHADOW = { office: { center: new Vector3(0, 0, -2), size: 14 }, city: { center: new Vector3(0, 0, 0), size: 70 }, lords: { center: new Vector3(0, 0, -2), size: 14 }, street: { center: at(14, 2), size: 22 } };
const STREET_OPTS = { seed: 1997, length: 40, curve: 0 };

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const Wd = WORLDS[s.w], light = LIGHTS[Wd.light];
  const moving = useMemo(() => propsFor(s), [s]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={Wd.sun} shadow={SHADOW[s.w]} />
      {s.w === "office" && <Office F={F} />}
      {s.w === "office" && <Dust center={new Vector3(0, 1.4, -2)} size={new Vector3(8, 2.6, 6)} color="#ffe2b0" strength={0.6} count={160} />}
      {s.w === "city" && <City F={F} />}
      {s.w === "city" && <CityCars F={F} />}
      {s.w === "lords" && <Lords />}
      {s.w === "street" && <Street preset={PRESETS.victorian_town} light={light} opts={STREET_OPTS} />}
      {s.w === "street" && <ShopSign />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={F} />)}
      {s.cast?.map((c) => {
        const lk = (c as { lookAt?: (F: number) => Look }).lookAt;
        return <Character key={c.name} position={c.at(f)} state={c.state(f)} look={lk ? lk(F) : c.look} />;
      })}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

export const GtaStartedAsRaceNChase: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
    {/* The two biggest physical beats: the cops ramming you, every cop in town pouring after you. */}
    <Sequence from={B.ram} durationInFrames={12}><SpeedLines center={[0.5, 0.42]} /></Sequence>
    <Sequence from={B.steal} durationInFrames={12}><SpeedLines center={[0.5, 0.45]} seed={5} /></Sequence>
    {STAMPS.map((x) => <Stamp key={x.text} {...x} />)}
    <Captions words={words} />
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("gta-started-as-race-n-chase/mix.wav")} />}
  </AbsoluteFill>
);
