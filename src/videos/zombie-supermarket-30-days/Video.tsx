import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { CAPTION_FONT, Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import type { Look as ShotLook } from "../../../kit/toon/grade";
import { Crowd } from "../../../kit/toon/crowd";
import { Dust } from "../../../kit/toon/dust";
import { DustWipe } from "../../../kit/toon/DustWipe";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { Insert } from "../../../kit/toon/Insert";
import { Birds } from "../../../kit/toon/life";
import { LIGHTS } from "../../../kit/toon/lights";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { EXT_OPTS, INT_EXTRAS, IN, at } from "./build";
import { propsFor } from "./props";
import { BEAT, HORDE, cartAt, words } from "./roles";
import { FRAMES, INSERT, PLAN, S, SHOTS, WORLD } from "./story";

// zombie-supermarket-30-days: the pilot Short. Each shot is its own Sequence + canvas; a shot that starts before the
// previous one ends dissolves in over the overlap, one that starts after it is a hard cut. The 2D x-ray insert is a hard
// cut of its own. Story props come from props.ts (the same `pose` drives the render and the QA guard).
export const ZOMBIE_FRAMES = FRAMES;
const INT_OPTS = { seed: 30 };
const SHADOW = { ext: { center: at(32, 0), size: 44 }, int: { center: IN(3, 0), size: 30 } };
/** R14 (B25/B27 stair-stepped band): one 4096 map over +-44 m is ~2 cm a texel, ~14 px in a close-up. Fit the shadow
 * area to what the lens looks at over the shot (look points + a margin that grows with lens distance). */
const shadowFor = (s: S, base: { center: Vector3; size: number }) => {
  const looks: Vector3[] = [];
  let far = 0;
  for (let f = 0; f <= s.frames; f += 4) {
    const p = s.pose(f);
    looks.push(p.look.clone());
    far = Math.max(far, p.pos.distanceTo(p.look));
  }
  const center = looks.reduce((a, v) => a.add(v), new Vector3()).multiplyScalar(1 / looks.length).setY(0);
  const spread = Math.max(...looks.map((v) => Math.hypot(v.x - center.x, v.z - center.z)));
  const size = Math.min(base.size, Math.max(8, spread + 1.5 * far + 4));
  return size >= base.size ? base : { center, size };
};

/**
 * R13 look per world: one pool of key light around the subject (darker edges), and one accent hue per scene (rust =
 * "you"; the lantern's amber at night); other hues lose a third of their saturation. Wides get a gentler pool.
 */
const WORLD_LOOK: Record<S["w"], ShotLook> = {
  // R14 measured bar: mean luma .40-.50 (pilot r3 .36); the pool keeps the subject brighter by value, gently.
  "int-day": { pool: [0.5, 0.58, 0.26, 0.2], accent: [0.045, 0.28] },
  "int-night": { pool: [0.5, 0.56, 0.24, 0.24], accent: [0.08, 0.32] },
  "ext-day": { pool: [0.5, 0.58, 0.3, 0.14], accent: [0.045, 0.3] },
  "ext-dawn": { pool: [0.5, 0.58, 0.28, 0.18], accent: [0.045, 0.28] },
};
const lookOf = (s: S): ShotLook => {
  const l = { ...WORLD_LOOK[s.w], ...s.look }; // a shot's look overrides its world's, key by key
  return s.wide && l.pool ? { ...l, pool: [l.pool[0], l.pool[1], l.pool[2] + 0.12, l.pool[3] * 0.5] } : l;
};

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

/** The crowd stands clear of the cart; with `cartClear` also of the sightline lens -> cart (R14 B30b: the crash
 * happened behind a wall of zombies). */
const keepOff = (s: S, f: number) => {
  const c = cartAt(f), out = [{ pos: c, r: s.cartClear ?? 1.0 }];
  if (!s.cartClear) return out;
  const lens = s.pose(f - s.from).pos.clone().setY(c.y);
  for (let k = 1; k < 8; k++) out.push({ pos: lens.clone().lerp(c, k / 8), r: 1.1 });
  return out;
};

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const lf = useCurrentFrame(), f = lf + s.from;
  const { width, height } = useVideoConfig();
  const W = WORLD[s.w], preset = PRESETS[W.preset], light = LIGHTS[W.light];
  const ext = s.w.startsWith("ext");
  const moving = useMemo(() => propsFor(s), [s]);
  const extras = useMemo(() => (ext ? [] : INT_EXTRAS(s.w === "int-night")), [ext, s.w]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  const shadow = useMemo(() => shadowFor(s, ext ? SHADOW.ext : SHADOW.int), [s, ext]);
  const avoid = useMemo(() => ({ from: s.from, frames: s.frames, lens: (F: number) => s.pose(F - s.from).pos }), [s]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={W.sun} shadow={shadow} />
      <Street preset={preset} light={light} opts={ext ? EXT_OPTS : INT_OPTS} />
      {extras.map((o, i) => <primitive key={i} object={o} />)}
      {s.crowd && <Crowd spec={HORDE} f={f} avoid={avoid} keepOff={keepOff(s, f)} />}
      {s.motes && <Dust center={s.motes.center} size={s.motes.size} color={s.motes.color} strength={0.9} count={260} />}
      {ext && <Dust center={at(32, 0, 3)} size={new Vector3(16, 6, 30)} color={s.w === "ext-dawn" ? "#ffd8a8" : "#fff4dc"} strength={0.8} count={420} />}
      {ext && <Birds f={f} from={at(-10, 6, 16)} to={at(75, -4, 19)} />}
      {ext && <Birds f={f + 190} from={at(70, 10, 22)} to={at(-5, -8, 18)} count={6} period={520} />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={f} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(lf)} state={c.state(lf)} look={c.look} />)}
      <Composer dof={s.dof} look={lookOf(s)} />
    </ThreeCanvas>
  );
};

/** Fades in over `len` = the real overlap with the previous shot. Review C5: a fixed XF (10) on 4-8 frame overlaps left
 * the new shot part-transparent over black once the old one ended: a dark blink after every dissolve (f539, f2207). */
const Dissolve: React.FC<{ children: React.ReactNode; len: number }> = ({ children, len }) => {
  const opacity = interpolate(useCurrentFrame(), [0, Math.max(1, len)], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/**
 * Insert art (100 x 178 units): a cutaway of the rubber duck in the channel's own look (REVIEW_R5 #5: the neon x-ray
 * read as another show): a yellow toy in the characters' thin ink, a torn-open belly showing the battery pack, the
 * circuit board, the motion switch whose ball rattles, and the speaker that pulses and throws sound waves. Labels
 * name the parts.
 */
const ToyXRay: React.FC = () => {
  const f = useCurrentFrame();
  const shake = Math.sin(f * 1.7) * 3.2, on = Math.abs(Math.sin(f * 1.7)) > 0.6;
  const INKC = "#2a1a14", ink = { stroke: INKC, strokeWidth: 1.1, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const label = { fontSize: 3.6, fill: INKC, fontWeight: 900, letterSpacing: 0.3, fontFamily: CAPTION_FONT };
  const hole = "M28 96 L 34 92 L 40 95 L 47 90 L 54 94 L 61 89 L 68 93 L 74 98 L 76 106 L 73 113 L 76 120 L 70 126 L 62 124 L 55 129 L 47 125 L 40 129 L 33 124 L 27 118 L 30 111 L 25 104 Z";
  return (
    <g transform={`translate(${shake * 0.5} -34)`}>
      <path d="M40 130 l-3 8 h9 M58 132 l-2 8 h9" {...ink} stroke="#e8742a" strokeWidth={2.4} fill="none" />
      <path d="M40 130 l-3 8 h9 M58 132 l-2 8 h9" {...ink} strokeWidth={0.8} fill="none" />
      <path d="M22 112 C 20 92, 40 86, 56 92 C 60 84, 52 66, 62 62 C 76 58, 80 72, 74 80 L 88 82 L 76 88 C 82 96, 84 116, 70 126 C 56 136, 28 132, 22 112 Z" fill="#ffd23a" {...ink} strokeWidth={1.4} />
      <path d="M62 66 C 70 63, 75 69, 72 74" stroke="#fff3b0" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d="M74 80 L 88 82 L 76 88 Z" fill="#ff8a3a" {...ink} />
      <circle cx={67} cy={71} r={2.2} fill={INKC} />
      <path d={hole} fill="#f4e6c4" {...ink} strokeDasharray="0" />
      <path d="M28 96 L 34 92 L 40 95 L 47 90 L 54 94 L 61 89 L 68 93 L 74 98 L 76 106 L 60 100 L 40 101 Z" fill="#d8b46a" opacity={0.55} />
      <path d={hole} fill="none" {...ink} strokeWidth={1.3} />
      <rect x={30} y={110} width={22} height={10} rx={2} fill="#3a8a5a" {...ink} />
      <rect x={30} y={110} width={4} height={10} rx={1} fill="#c9ced4" {...ink} />
      <text x={43} y={117.6} fontSize={4.6} fill="#f4f0e6" textAnchor="middle" fontWeight={900} fontFamily={CAPTION_FONT}>AA</text>
      <rect x={52} y={98} width={18} height={10} rx={1} fill="#2f7a4a" {...ink} />
      {[0, 1, 2].map((k) => <rect key={k} x={54 + k * 5.4} y={100} width={3.6} height={3} fill={INKC} />)}
      <path d="M53 106 h16" stroke="#e8c45a" strokeWidth={0.6} />
      <rect x={42} y={92} width={16} height={5.4} rx={2.7} fill="#fdfaf4" {...ink} />
      <circle cx={50 + shake * 0.8} cy={94.7} r={2} fill="#c23a2a" {...ink} strokeWidth={0.6} />
      <path d="M52 110 C 54 116, 62 120, 66 122" stroke="#c23a2a" strokeWidth={1.1} fill="none" />
      <path d="M58 108 C 62 114, 68 116, 70 118" stroke="#3e6aa8" strokeWidth={1.1} fill="none" />
      <circle cx={70} cy={120} r={6.5} fill={on ? "#ffb35a" : "#9aa0a8"} {...ink} />
      <circle cx={70} cy={120} r={3 + (on ? 0.8 : 0)} fill="#5a6070" {...ink} />
      {on && [0, 1, 2].map((k) => <path key={k} d={`M${81 + k * 5} ${111 - k * 2} q5 9 0 18`} stroke="#e8742a" strokeWidth={1.6} fill="none" strokeLinecap="round" />)}
      <text x={18} y={150} {...label}>BATTERY</text>
      <text x={6} y={84} {...label}>MOTION SWITCH</text>
      <text x={70} y={150} {...label}>SPEAKER</text>
      <path d="M28 146 L 36 121 M30 86 L 44 93 M76 145 L 72 128" stroke={INKC} strokeWidth={0.6} />
      <text x={50} y={194} fontSize={7} fill="#c8582c" stroke={INKC} strokeWidth={0.35} textAnchor="middle" fontWeight={900} fontFamily={CAPTION_FONT}>SHAKE = SOUND</text>
    </g>
  );
};

export const ZombieSupermarket: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve len={SHOTS[i - 1].from + SHOTS[i - 1].frames - s.from}><ShotView s={s} /></Dissolve> : <ShotView s={s} />}
      </Sequence>
    ))}
    <Sequence from={INSERT.from} durationInFrames={INSERT.to - INSERT.from}>
      <Insert kind="cutaway" title="INSIDE" readout="SHAKEN: LOUD"><ToyXRay /></Insert>
    </Sequence>
    {/* R13: the crash's dust cloud fills the frame and clears onto Chad on his roof (in-world transition) */}
    <Sequence from={BEAT.chadRoof - 10} durationInFrames={28}>
      <DustWipe frames={28} peak={10} />
    </Sequence>
    <Stamp text="DAY 1" at={0} hold={40} top="7%" />
    <Stamp text="DAY 29" at={BEAT.day29 - 2} hold={50} />
    <Stamp text="DAY 30" at={BEAT.day30 - 2} hold={50} />
    <Captions words={words} />
    {/* Studio preview only (renders stay silent; the mux maps audio/mix.wav). */}
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("zombie-supermarket-30-days/mix.wav")} />}
  </AbsoluteFill>
);
