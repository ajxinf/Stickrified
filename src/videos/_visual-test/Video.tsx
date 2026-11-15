import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { BoxGeometry, Color, CylinderGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, TorusGeometry, Vector3 } from "three";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { barrel, crate } from "../../../kit/toon/build/props";
import { PRESETS } from "../../../kit/toon/build/presets";
import { signFace } from "../../../kit/toon/build/signs";
import { Street, spine, yaw } from "../../../kit/toon/build/street";
import { CamPose, glide, impact, smootherstep } from "../../../kit/toon/camera";
import { Character, blinkAt, exprAt } from "../../../kit/toon/cast";
import type { CharState, Look } from "../../../kit/toon/cast";
import { Composer, DOF, Dof } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { EXTRAS } from "../../../kit/toon/extras";
import type { Expr } from "../../../kit/toon/face";
import { lightShafts, sunDisc } from "../../../kit/toon/glow";
import { Plan, QAPlan, Shot, ShotCamera } from "../../../kit/toon/guard";
import { Birds } from "../../../kit/toon/life";
import { LIGHTS, sunDirection } from "../../../kit/toon/lights";
import { toss } from "../../../kit/toon/physics";
import { POSES, Pose, PoseName, actionPose, alive, blendPose, posed, reactSquash, walkPose } from "../../../kit/toon/poses";
import { youLook } from "../../../kit/toon/protagonist";
import { rough } from "../../../kit/toon/paint";
import { toonMaterial } from "../../../kit/toon/shade";
import { boater, headLayers } from "../../../kit/toon/wardrobe";
import { ToonWorld } from "../../../kit/toon/world";

/**
 * _visual-test (R20, 2026-11-15): 20 s look test of the visual-ref1-6 study (docs/style/VISUAL_DIRECTION.md). No
 * narration, not for posting. One gag on a wet cobbled high street at sunset: your last coin goes into a gumball
 * machine, nothing comes out, the old man by the lamp laughs, you kick it, it bursts.
 *   S1   0-110  establish: crane up from the wet cobbles into the backlit street (sun, shafts, glare on the stones)
 *   S2 110-200  you walk into a close-up toward the lens, the machine a soft foreground block; you clock it
 *   S3 200-262  macro: the coin flips into the slot, the crank turns, the chute stays empty (rack down)
 *   S4 262-352  MCU over the globe: rack focus from the gumballs to your face; smug -> confused -> annoyed, knock
 *   S5 352-410  whip pan to the old man: he laughs and points
 *   S6 410-470  low profile: wind-up, kick, hit shake, the machine rocks
 *   S7 470-600  payoff: the lid pops, the gumballs burst and bounce toward the lens; push in on your grin
 * Everything is frame-driven (composition frame F); shots get shot-local frames from Remotion.
 */
const at = spine(0).at;
const E = Object.fromEntries(EXTRAS.map((x) => [x.name, x.look])) as Record<string, Look>;
const OLD: Look = { ...E["old + moustache"], brim: true, hair: headLayers(E["old + moustache"].hair ?? (() => {}), boater("#e8cf86", "#2e4a7a")) };
const ALLOW = { "Reaction timing": "visual test: no narration, reactions on the action" };

// ------------------------------------------------------------------ world: one street, one sunset
// R20 sunset preset: the low sun rakes across the street from ahead-left (long diagonal shadows, sunlit facades).
const SUN = sunDirection(LIGHTS.sunset, at(0, 0, 1.5), at(30, 0, 1.5));
const SUN_POS = at(0, 0, 1.5).addScaledVector(SUN, 160);
const MACHINE = at(14, 5.0, 0.02), MACHINE_RY = yaw(at(0, -1).sub(at(0, 0)));
/** An invisible stand-in so the street keeps its random props off the machine and the guard knows it is there. */
const blocker = () => {
  const m = new Mesh(new BoxGeometry(0.46, 1.4, 0.46).translate(0, 0.7, 0));
  m.visible = false;
  m.userData.collider = "gumball machine";
  return m;
};
const STREET = {
  seed: 520, length: 46, curve: 0, gloss: 0.5, lightCenter: at(14, 3, 2),
  extra: () => [placed(barrel(), at(3.1, 1.85, 0.0)), placed(crate(0.6), at(22.5, 5.4, 0.02)), placed(blocker(), MACHINE, MACHINE_RY)],
};
function placed(o: Object3D, p: Vector3, ry = 0) { o.position.copy(p); o.rotation.y = ry; return o; }

// ------------------------------------------------------------------ the gumball machine (origin at its base, front +z)
const R_BALL = 0.045, BALL_COLS = ["#e8463a", "#f2c23a", "#3aa0e0", "#6ac04a", "#f4f0e6", "#e86aa8"];
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const GLOBE_Y = 1.08, LID_Y = 1.28, SLOT = new Vector3(0, 0.79, 0.185), CHUTE = new Vector3(0, 0.6, 0.2);
/** Balls packed in the lower globe (local), bottom up. */
const INSIDE = Array.from({ length: 84 }, (_, i) => {
  let p = new Vector3();
  for (let k = 0; k < 40; k++) {
    p = new Vector3(rnd(i * 3 + k * 7) * 2 - 1, rnd(i * 3 + 1 + k * 7) * 2 - 1, rnd(i * 3 + 2 + k * 7) * 2 - 1).multiplyScalar(0.17);
    if (p.length() < 0.165 && p.y < 0.07) break;
  }
  return p.add(new Vector3(0, GLOBE_Y, 0));
}).sort((a, b) => a.y - b.y);
const red = () => M("gumRed", () => toonMaterial({ map: rough("#c8302a"), repeat: [1, 1], spec: 0.35 }));
const chrome = () => M("gumChrome", () => toonMaterial({ map: rough("#9c9a96"), repeat: [1, 1], spec: 0.9 }));
const machineBody = () => {
  const k = new Kit();
  k.add(red(), new CylinderGeometry(0.2, 0.22, 0.06, 20), 0, 0.03, 0);
  k.add(chrome(), new CylinderGeometry(0.04, 0.05, 0.52, 10), 0, 0.31, 0);
  k.add(red(), new CylinderGeometry(0.15, 0.18, 0.32, 20), 0, 0.72, 0);
  k.add(red(), new TorusGeometry(0.15, 0.025, 8, 22), 0, 0.885, 0, { rx: Math.PI / 2 });
  k.add(chrome(), new CylinderGeometry(0.075, 0.075, 0.02, 16), 0, 0.76, 0.17, { rx: Math.PI / 2 });
  // Macro detail (S3 fills the frame with this plate): a gold bezel, a dark inset, four screws, a gold trim band.
  const gold = M("gumGold", () => toonMaterial({ map: rough("#c89a3a"), repeat: [1, 1], spec: 0.9 }));
  k.add(gold, new TorusGeometry(0.076, 0.009, 6, 24), 0, 0.76, 0.181);
  k.add(MAT.color("#3a3634"), new CylinderGeometry(0.05, 0.05, 0.004, 16), 0, 0.775, 0.182, { rx: Math.PI / 2 });
  for (const [sx, sy] of [[-0.05, 0.05], [0.05, 0.05], [-0.05, -0.05], [0.05, -0.05]]) k.add(gold, new SphereGeometry(0.008, 6, 4), sx, 0.76 + sy, 0.18);
  k.add(gold, new TorusGeometry(0.168, 0.012, 6, 28), 0, 0.57, 0, { rx: Math.PI / 2 });
  k.box(MAT.color("#1a1412"), 0.035, 0.009, 0.01, SLOT.x, SLOT.y, SLOT.z, false);
  k.box(chrome(), 0.09, 0.06, 0.07, CHUTE.x, CHUTE.y, CHUTE.z - 0.02, false);
  k.box(MAT.color("#241c1a"), 0.065, 0.04, 0.006, CHUTE.x, CHUTE.y, CHUTE.z + 0.016, false);
  const g = k.build();
  const price = signFace("1¢", "#f4ead2", "#8a1e1a", 0.09, 0.05);
  price.position.set(0, 0.85, 0.16);
  price.rotation.x = -0.35;
  g.add(price);
  // Glass: a faint pale shell over the balls (the ink pass still draws its round outline).
  const globe = new Mesh(new SphereGeometry(0.21, 28, 18), new MeshBasicMaterial({ color: new Color("#d6eeff"), transparent: true, opacity: 0.16, depthWrite: false }));
  globe.position.set(0, GLOBE_Y, 0);
  globe.renderOrder = 2;
  g.add(globe);
  return g;
};
const lidPart = () => {
  const k = new Kit();
  k.add(red(), new SphereGeometry(0.1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0, 0);
  k.add(chrome(), new SphereGeometry(0.03, 10, 6), 0, 0.105, 0);
  return k.build();
};
const crankPart = () => {
  const k = new Kit();
  k.box(chrome(), 0.11, 0.024, 0.02, 0.045, 0, 0, false);
  k.add(MAT.color("#1a1412"), new SphereGeometry(0.022, 10, 6), 0.1, 0, 0.02);
  return k.build();
};
const coinPart = () => {
  const k = new Kit();
  k.add(M("gumCoin", () => toonMaterial({ map: rough("#d8a640"), repeat: [1, 1], spec: 0.9 })), new CylinderGeometry(0.028, 0.028, 0.006, 18), 0, 0, 0, { rx: Math.PI / 2 });
  return k.build();
};

const KICK = 440, BURST = 478, COIN: [number, number] = [203, 217], CRANK: [number, number] = [224, 248];
/** Machine rock: the kick (decaying swing), then a shudder just before it bursts. Radians about local x. */
const rock = (F: number) => {
  const t = F - KICK;
  const swing = t >= 0 ? 0.16 * Math.exp(-t / 16) * Math.sin(t * 0.42) : 0;
  const shudder = F >= 466 && F < BURST ? 0.02 * Math.sin(F * 2.3) : 0;
  return swing + shudder;
};
/** Where each burst ball lands (world): a fan toward the road and along the pavement, clear of the wall. */
const BURST_BALLS = INSIDE.map((p, i) => {
  const a = -Math.PI * 0.95 + rnd(i + 900) * Math.PI * 1.1, r = 0.5 + 2.4 * Math.sqrt(rnd(i + 950));
  const local = new Vector3(Math.sin(a) * r * 0.7, R_BALL, Math.cos(a) * r).add(new Vector3(0, 0, 0.35));
  return { from: p, toLocal: local, delay: Math.floor(rnd(i + 990) * 26), air: 16 + Math.floor(rnd(i + 1010) * 16), height: 0.25 + rnd(i + 1030) * 0.85, roll: 0.2 + 0.5 * rnd(i + 1050) };
});

const MachineView: React.FC<{ F: number }> = ({ F }) => {
  const parts = useMemo(() => {
    const root = new Group(), pivot = new Group(), body = machineBody(), lid = lidPart(), crank = crankPart(), coin = coinPart();
    root.position.copy(MACHINE);
    root.rotation.y = MACHINE_RY;
    pivot.add(body, crank);
    root.add(pivot);
    crank.position.set(0.0, 0.7, 0.19);
    root.updateMatrixWorld(true);
    const geo = new SphereGeometry(R_BALL, 12, 8);
    const balls = BALL_COLS.map((c) => {
      const im = new InstancedMesh(geo, M(`gum${c}`, () => toonMaterial({ map: rough(c), repeat: [1, 1], spec: 0.5 })), INSIDE.length);
      im.castShadow = true;
      im.frustumCulled = false;
      return im;
    });
    const scene = new Group().add(root, lid, coin, ...balls);
    return { root, pivot, lid, crank, coin, balls, scene };
  }, []);
  const { root, pivot, lid, crank, coin, balls } = parts;
  pivot.rotation.x = rock(F);
  root.updateMatrixWorld(true);
  const W = (v: Vector3) => pivot.localToWorld(v.clone());
  // Lid: rides the globe, pops at the burst and lands on the pavement toward the lens.
  const lidHome = W(new Vector3(0, LID_Y, 0));
  if (F < BURST) { lid.position.copy(lidHome); lid.rotation.set(rock(F), MACHINE_RY, 0, "YXZ"); }
  else {
    const t = toss(lidHome, root.localToWorld(new Vector3(0.55, 0.0, 1.05)), F - BURST, { air: 26, height: 1.3, spins: 2.5, bounces: 3 });
    lid.position.copy(t.pos);
    lid.rotation.set(t.spin, MACHINE_RY, t.landed ? 0.0 : t.spin * 0.6, "YXZ");
  }
  crank.rotation.z = -Math.PI * 2 * smootherstep((F - CRANK[0]) / (CRANK[1] - CRANK[0]));
  // Coin: flipped from your hand into the slot.
  const slotW = W(SLOT), handW = root.localToWorld(new Vector3(-0.32, 0.98, 0.62));
  coin.visible = F >= COIN[0] && F < COIN[1];
  if (coin.visible) {
    const t = toss(handW, slotW, F - COIN[0], { air: COIN[1] - COIN[0], height: 0.16, spins: 2, bounces: 0 });
    coin.position.copy(t.pos);
    coin.rotation.set(t.spin, MACHINE_RY, 0, "YXZ");
  }
  const m = new Matrix4(), q = new Quaternion(), one = new Vector3(1, 1, 1), counts = balls.map(() => 0);
  BURST_BALLS.forEach((b, i) => {
    const c = i % balls.length;
    const t = F - BURST - b.delay;
    let p: Vector3;
    if (t < 0) p = W(b.from);
    else {
      const to = root.localToWorld(b.toLocal.clone()), from = W(b.from.clone().setY(GLOBE_Y + 0.22));
      const s = toss(from, to, t, { air: b.air, height: b.height, bounces: 2, restitution: 0.45 });
      p = s.pos;
      if (t > b.air) p.add(to.clone().sub(root.position).setY(0).normalize().multiplyScalar(b.roll * (1 - Math.exp(-(t - b.air) / 10))));
    }
    m.compose(p, q, one);
    balls[c].setMatrixAt(counts[c]++, m);
  });
  balls.forEach((b, c) => { b.count = counts[c]; b.instanceMatrix.needsUpdate = true; });
  return <primitive object={parts.scene} />;
};

// ------------------------------------------------------------------ cast (composition frames F)
const st = (pose: Pose, expr: Expr, F: number, seed: number, extra: Partial<CharState> = {}): CharState => ({ pose, expr, blink: blinkAt(F, 30, seed), fx: {}, ...extra });
const TO_MACHINE = Math.PI / 2, ALONG = Math.PI; // headings: face +x (the machine), face +s (down the street)
const V = 1.3, STOP = 185, DECEL = 22, S_STOP = 13.9;
const walkDist = (F: number) => {
  const cruise = STOP - DECEL;
  if (F <= cruise) return (V * F) / 30;
  const u = Math.min((F - cruise) / DECEL, 1);
  return (V * cruise) / 30 + ((V * DECEL) / 30) * (u - (u * u) / 2);
};
const S0 = S_STOP - walkDist(10_000);
// The kick: a lunge 0.3 m in on the wind-up so the foot reaches the machine, then a hop back after the hit.
const lunge = (F: number) => 0.3 * (smootherstep((F - 416) / 18) - smootherstep((F - 452) / 14));
const YOU_AT = (F: number) => at(S0 + walkDist(Math.min(F, STOP)), 4.0 + lunge(F), 0.02);
const pose = (keys: [number, PoseName | Pose][], F: number, ease = 4): Pose => {
  const P = (k: PoseName | Pose) => (typeof k === "string" ? posed(k, F / 30) : k);
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= F) i++;
  return i === 0 || F - keys[i][0] >= ease ? P(keys[i][1]) : blendPose(P(keys[i - 1][1]), P(keys[i][1]), (F - keys[i][0]) / ease);
};
const WINDUP: Pose = { ...POSES.hips, sway: 10, lean: -0.6, bob: -10, knee: 18, lift: [0, 18], tilt: -6, look: 0.6 };
const KICKED: Pose = { ...POSES.kick, lift: [0, 150], reach: 34, knee: 4, sway: -14, lean: 0.5, look: 0.6 };
const youState = (F: number): CharState => {
  const seed = 3;
  if (F < STOP) {
    const u = Math.max(0, (F - (STOP - DECEL)) / DECEL);
    // Clocks the machine on the way in: a glance (eyes first, then the head), then a smug turn to it.
    const look = F < 150 ? 0 : F < 160 ? 0.55 * smootherstep((F - 150) / 4) : 0.55;
    const e = exprAt<Expr>([[0, "determined"], [158, "sneaky"], [172, "smug"]], F, seed);
    const heading = F < 168 ? ALONG : ALONG + (TO_MACHINE - ALONG) * smootherstep((F - 168) / 16);
    return { ...st(walkPose(walkDist(F), 1 - u, look), e.expr, F, seed), blink: e.blink, heading };
  }
  const e = exprAt<Expr>([[0, "smug"], [282, "confused"], [314, "angry"], [412, "determined"], [436, "angry"], [BURST, "shocked"], [518, "grin"], [560, "smug"]], F, seed);
  const knock = F >= 318 && F < 342 ? actionPose("knock", (F - 318) / 30, 0.5) : undefined;
  const p = knock ?? pose([[STOP, "idle"], [298, "chin"], [314, "hips"], [418, WINDUP], [KICK, KICKED], [452, "hips"], [BURST, "panic"], [556, "hips"]], F, F >= 418 && F < 452 ? 3 : 5);
  // Eyes go to the chute (S4), then dart to the old man before the whip; afterwards back to the machine.
  const look = F >= 286 && F < 312 ? -0.45 : F >= 342 && F < 360 ? 0.8 : F >= BURST ? 0 : p.look;
  const live = F < 418 || F >= 500 ? alive({ ...p, look }, F, seed, [look, look - 0.12, look + 0.1]) : { ...p, look };
  // On the burst you jump round to the lens of the payoff shots (S7/S8), the short way round.
  const toLens = Math.atan2(S7_A.pos.x - YOU_AT(STOP).x, S7_A.pos.z - YOU_AT(STOP).z);
  const turn = ((toLens - TO_MACHINE + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const heading = F >= BURST ? TO_MACHINE + turn * smootherstep((F - BURST) / 6) : TO_MACHINE;
  const squash = reactSquash(F - 314) || reactSquash(F - BURST);
  return { ...st({ ...live, squash }, e.expr, F, seed, { fx: { ringEyes: F >= BURST && F < 518, bang: F >= BURST && F < BURST + 16 ? F - BURST : undefined, sweat: F >= 290 && F < 330 ? (F - 290) / 40 : undefined } }), blink: e.blink, heading };
};
const OLD_AT = () => at(19.3, 5.2, 0.02);
const LAUGH = 362;
const oldState = (F: number): CharState => {
  const seed = 9;
  const e = exprAt<Expr>([[0, "smug"], [LAUGH, "laughing"], [BURST + 2, "shocked"]], F, seed);
  const p = pose([[0, "crossed"], [LAUGH, "point"], [BURST + 2, "panic"]], F, 4);
  const laugh = F >= LAUGH && F < BURST ? { open: 0.35 + 0.65 * Math.abs(Math.sin(((F - LAUGH) / 30) * Math.PI * 4.5)), shape: "a" as const } : undefined;
  const live = alive({ ...p, look: F >= LAUGH && F < BURST ? -0.5 : -0.3, bob: p.bob + (laugh ? 6 * Math.abs(Math.sin(((F - LAUGH) / 30) * Math.PI * 4.5)) : 0) }, F, seed, [0]);
  return { ...st({ ...live, squash: reactSquash(F - LAUGH) || reactSquash(F - BURST - 2) }, e.expr, F, seed, { fx: { talk: laugh, bang: F >= BURST + 2 && F < BURST + 18 ? F - BURST - 2 : undefined } }), blink: e.blink, heading: Math.PI * 0.85 };
};
const CAST = [
  { name: "you", look: youLook, atF: YOU_AT, state: youState },
  { name: "old", look: OLD, atF: OLD_AT, state: oldState },
];

// ------------------------------------------------------------------ shots
type S = Shot & { from: number; frames: number; dof: (f: number) => Dof };
const P = (pos: Vector3, look: Vector3, fov: number, roll = 0): CamPose => ({ pos, look, fov, roll });
const lerpPose = (a: CamPose, b: CamPose, t: number): CamPose => ({ pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t), fov: a.fov + (b.fov - a.fov) * t, roll: a.roll + (b.roll - a.roll) * t });
const lerpDof = (a: Dof, b: Dof, t: number): Dof => ({ maxPx: a.maxPx + (b.maxPx - a.maxPx) * t, near: a.near + (b.near - a.near) * t, far: a.far + (b.far - a.far) * t, fgPx: (a.fgPx ?? 0) + ((b.fgPx ?? 0) - (a.fgPx ?? 0)) * t, fgNear: (a.fgNear ?? 0) + ((b.fgNear ?? 0) - (a.fgNear ?? 0)) * t, fgFar: (a.fgFar ?? 0) + ((b.fgFar ?? 0) - (a.fgFar ?? 0)) * t });
const head = (F: number) => YOU_AT(F).setY(1.45);
const castIn = (from: number, names: string[]) => CAST.filter((c) => names.includes(c.name)).map((c) => ({ name: c.name, look: c.look, at: (f: number) => c.atF(f + from), state: (f: number) => c.state(f + from) }));
const base = { scene: "high street sunset", light: "sunset" as const, sun: SUN, allow: ALLOW };

const S1: S = {
  ...base, id: "_visual-test/S1-establish", from: 0, frames: 110, wide: true, subject: "you",
  // Low over the wet cobbles past a blurred barrel, then a slow crane up and in over the raking light.
  pose: (f) => lerpPose(P(at(1.4, 2.9, 0.38), at(15, 4.1, 1.1), 46), P(at(5.8, 2.6, 2.2), at(15, 4.6, 0.95), 40), glide(f / 110)),
  cast: castIn(0, ["you", "old"]), dof: () => ({ maxPx: 0, near: 30, far: 60, fgPx: 18, fgNear: 0.6, fgFar: 2.6 }),
};
/** S2: the lens dollies back ahead of you at walking pace (the street and its long shadows behind you). */
const S2_LENS = (F: number) => at(YOU_AT(F).z * -1 + 2.55 - 0.25 * glide((F - 110) / 90), 3.62, 1.12);
const S2: S = {
  ...base, id: "_visual-test/S2-walk-in", from: 110, frames: 90, subject: "you",
  pose: (f) => {
    const F = f + 110, h = head(F).setY(1.22);
    return P(S2_LENS(F), h.lerp(at(13.95, 4.35, 1.2), 0.12), 36);
  },
  cast: castIn(110, ["you"]), dof: (f) => DOF.closeup(S2_LENS(f + 110).distanceTo(head(f + 110))),
};
const SLOT_W = () => MACHINE.clone().add(new Vector3(-0.185, 0.77, 0));
const S3: S = {
  ...base, id: "_visual-test/S3-coin-macro", from: 200, frames: 62,
  // Macro: the coin flips into the slot, the crank turns, then the lens tilts down to the empty chute.
  pose: (f) => P(at(14.3, 4.12, 1.0).lerp(at(14.15, 4.3, 0.84), glide(f / 62)), SLOT_W().add(new Vector3(0, 0.08 - 0.12 * glide((f - 22) / 38), 0)), 38),
  cast: [], dof: () => DOF.closeup(0.72),
};
const S4_A = at(14.42, 5.75, 1.32), S4_B = at(14.24, 5.56, 1.36);
const S4: S = {
  ...base, id: "_visual-test/S4-reaction", from: 262, frames: 90, subject: "you",
  // Over the globe (a soft colourful block, lower corner): focus racks from the gumballs to your face; slow push.
  pose: (f) => {
    const p = P(S4_A.clone().lerp(S4_B, glide(f / 90)), head(STOP).setY(1.3), 50);
    const w = smootherstep((f - 84) / 6); // the whip starts here and lands in S5
    return w > 0 ? { ...p, look: p.look.clone().lerp(OLD_AT().setY(1.35), w * 0.3) } : p;
  },
  whips: [[84, 90]],
  cast: castIn(262, ["you"]), dof: (f) => lerpDof({ maxPx: 14, near: 0.95, far: 1.4, fgPx: 0, fgNear: 0, fgFar: 0 }, DOF.closeup(1.7), smootherstep((f - 4) / 16)),
};
const S5: S = {
  ...base, id: "_visual-test/S5-whip-laugh", from: 352, frames: 58, subject: "old", subjectFrom: 8,
  pose: (f) => {
    const w = smootherstep(f / 8), from = head(STOP).setY(1.3).lerp(OLD_AT().setY(1.35), 0.3), to = OLD_AT().setY(1.2);
    return P(S4_B.clone(), from.lerp(to, w), 24 - 4 * glide(f / 58));
  },
  whips: [[0, 9]],
  cast: castIn(352, ["old"]), dof: () => DOF.medium(5.0),
};
const S6_BASE = (f: number) => P(at(10.2, 4.38, 0.5).lerp(at(10.9, 4.5, 0.62), glide(f / 60)), at(14.0, 4.38, 0.95), 52);
const S6: S = {
  ...base, id: "_visual-test/S6-kick", from: 410, frames: 60, subject: "you",
  // Low profile from behind along the pavement: the wind-up, the kick, the hit shake; the old man small between.
  pose: impact(S6_BASE, KICK - 410, 0.03, 8),
  kicks: [[KICK - 410, KICK - 410 + 8]],
  cast: castIn(410, ["you", "old"]), dof: () => DOF.medium(3.7),
};
const S7_A = P(at(16.4, 2.4, 0.62), at(14.05, 4.2, 0.95), 46);
const S7: S = {
  ...base, id: "_visual-test/S7-burst", from: 470, frames: 76, subject: "you",
  // Low along the pavement toward the lens: the lid pops, the burst sprays past the lens.
  pose: (f) => lerpPose(S7_A, P(at(16.1, 2.6, 0.66), at(14.0, 4.15, 1.0), 44), glide(f / 76)),
  cast: castIn(470, ["you", "old"]), dof: () => ({ maxPx: 6, near: 4.5, far: 14, fgPx: 20, fgNear: 0.4, fgFar: 1.6 }),
};
const S8_LENS = at(15.55, 3.1, 1.12);
const S8: S = {
  ...base, id: "_visual-test/S8-grin", from: 546, frames: 54, subject: "you",
  // Punch in: your grin, the last gumballs bouncing round your feet.
  pose: (f) => P(S8_LENS.clone().lerp(at(15.2, 3.28, 1.18), glide(f / 54)), head(STOP).setY(1.3), 44),
  cast: castIn(546, ["you"]), dof: () => DOF.closeup(1.85),
};
const SHOTS = [S1, S2, S3, S4, S5, S6, S7, S8];
export const VISUAL_TEST_FRAMES = 600;
const PLAN: Plan = { slug: "_visual-test", shots: SHOTS };

// Long low sunbeams down the street through the smoke and dust, from the sun toward the lens.
const SHAFTS = () => lightShafts(at(24, -3.0, 8.5), SUN.clone().negate(), { length: 20, width: 2.0, color: "#ffc48a", count: 5, spread: 10, strength: 0.16, seed: 4 });

/** Stable: a new object every render rebuilt the key light (and lost its shadow map) on every frame. */
const SHADOW = { center: at(14, 0), size: 20 };
// The preset's kerb stones read as blue-grey gems in a low foreground (v1 S1); leaves and paper scraps stay.
const PRESET = { ...PRESETS.victorian_town, debris: [] };
const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const f = useCurrentFrame(), F = f + s.from;
  const { width, height } = useVideoConfig();
  const preset = PRESET, light = LIGHTS.sunset;
  const sun = useMemo(() => { const m = sunDisc(9); m.position.copy(SUN_POS); return m; }, []);
  sun.lookAt(s.pose(f).pos);
  const shafts = useMemo(SHAFTS, []);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={light} sunDir={SUN} shadow={SHADOW} />
      <Street preset={preset} light={light} opts={STREET} />
      <primitive object={sun} />
      <primitive object={shafts} />
      <MachineView F={F} />
      <Dust center={at(14, 3.5, 2.2)} size={new Vector3(8, 4, 16)} color="#ffd8a8" strength={0.9} count={380} />
      <Birds f={F} from={at(40, -14, 14)} to={at(-6, 16, 11)} count={7} period={480} />
      {s.cast?.map((c) => <Character key={c.name} position={c.at(f)} state={c.state(f)} look={c.look} />)}
      <Composer dof={s.dof(f)} />
    </ThreeCanvas>
  );
};

export const VisualTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        <ShotView s={s} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
