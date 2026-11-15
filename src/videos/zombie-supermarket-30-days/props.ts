import {
  AdditiveBlending, BoxGeometry, BufferAttribute, CanvasTexture, BufferGeometry, CatmullRomCurve3, CylinderGeometry, Group, Mesh, MeshBasicMaterial, Object3D,
  PlaneGeometry, ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
} from "three";
import { Kit, MAT } from "../../../kit/toon/build/kit";
import { TOY_COLS, toyParts } from "../../../kit/toon/build/toys";
import { glowSprite } from "../../../kit/toon/glow";
import type { MovingProp } from "../../../kit/toon/guard";
import { handWorld } from "../../../kit/toon/cast";
import type { Hand } from "../../../kit/toon/cast";
import { youLook } from "../../../kit/toon/protagonist";
import { NOINK } from "../../../kit/toon/ink";
import {
  CART_IN, CHAD, CHART, CHART_AT, DOCK, FLOODS, FUEL_AT, GRILL, ROOF_Y, SHUTTER_AT,
  battery, chartTex, dinoToy, duckToy, floodGlass, fuelCan, hedgehogCart, megaphone, shutter, toothbrush,
} from "./build";
import { BEAT, CART_RUN, cartAt } from "./roles";
import type { S } from "./story";

// Story props: one definition for the render (Video.tsx mounts `make()` and calls `pose` every frame) and the QA
// guard (Shot.moving). Held props sit in the drawn hand (`handWorld`, from the holder's pose and the shot's camera);
// their origin is the grip point and the guard checks it stays in that hand.
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Where `who`'s `hand` is at composition frame F in shot `s` (the shot's cast and camera). */
const handOf = (s: S, who: string, hand: Hand, F: number, fwd = 0.06) => {
  const c = s.cast!.find((x) => x.name === who)!, lf = F - s.from;
  return handWorld(c.look ?? youLook, c.state(lf).pose, c.at(lf), s.pose(lf).pos, hand, fwd);
};
const camOf = (s: S, F: number) => s.pose(F - s.from).pos;
const faceCam = (o: Object3D, s: S, F: number) => {
  const cam = camOf(s, F);
  o.lookAt(cam.x, o.position.y, cam.z);
};

// ---------------------------------------------------------------- held things

const youHeapToy = (s: S): MovingProp => ({
  name: "toy in your hands",
  make: duckToy,
  pose: (o, F) => {
    o.position.copy(handOf(s, "you", "both", F, 0.1));
    // Plant for "shaken toys talk" (review r2/r3 C4): the duck jiggles in your hands while it quacks, still once the
    // battery is out.
    const shaking = F < Math.round(0.52 * 30);
    if (shaking) o.position.addScaledVector(rightOf(s, F), 0.035 * Math.sin(F * 2.2)).add(new Vector3(0, 0.02 * Math.abs(Math.sin(F * 2.2)), 0));
    faceCam(o, s, F);
    o.rotateY(Math.PI / 2);
    if (shaking) o.rotateX(0.18 * Math.sin(F * 2.2));
  },
  heldBy: "you",
  hand: "both",
});
/** The battery pops out of the toy on "batteries" and tumbles to the floor. */
const poppedBattery = (s: S): MovingProp => ({
  name: "popped battery",
  make: battery,
  pose: (o, F) => {
    const t0 = Math.round(0.52 * 30) - 2, t = (F - t0) / 18;
    if (t <= 0) return false;
    const start = handOf(s, "you", "both", t0, 0.16).add(new Vector3(0, 0.12, 0));
    const k = Math.min(t, 1);
    o.position.copy(start).add(new Vector3(0.35 * k, 0.45 * k - 0.95 * k * k, 0.15 * k));
    o.position.y = Math.max(o.position.y, 0.03);
    o.rotation.set(F * 0.6, 0, F * 0.4);
    return true;
  },
  heldBy: "you",
  hand: "none", // flies out of the toy
});

/** The megaphone in Chad's right hand (or hugged in both); its bell points out toward the street. */
const megaProp = (s: S, atMouth: (F: number) => boolean, clutched = false): MovingProp => ({
  name: "megaphone",
  make: megaphone,
  pose: (o, F) => {
    o.position.copy(handOf(s, "chad", "right", F, 0.08));
    o.scale.setScalar(clutched ? 0.8 : 1);
    const cam = camOf(s, F), toCam = cam.clone().sub(o.position).setY(0).normalize();
    const r = new Vector3(toCam.z, 0, -toCam.x);
    if (clutched) o.lookAt(o.position.clone().sub(r)); // hugged across the belly, bell to screen left (away from you two)
    else o.lookAt(o.position.clone().add(toCam.multiplyScalar(0.6)).add(r.multiplyScalar(0.8)).add(new Vector3(0, atMouth(F) ? 0.15 : -0.5, 0)));
  },
  heldBy: "chad",
  hand: "right",
  touches: ["CHAD'S HARDWARE"],
});
/** Where the megaphone's bell is (sound rings start there). */
const bellAt = (s: S, F: number) => {
  const grip = handOf(s, "chad", "right", F, 0.08), toCam = camOf(s, F).clone().sub(grip).setY(0).normalize();
  return grip.addScaledVector(toCam, 0.25).addScaledVector(new Vector3(toCam.z, 0, -toCam.x), 0.33).add(new Vector3(0, 0.08, 0));
};
const brushProp = (s: S): MovingProp => ({
  name: "toothbrush",
  make: toothbrush,
  pose: (o, F) => {
    o.position.copy(handOf(s, "chad", "left", F, 0.08));
    o.rotation.set(0, 0, 0.5);
  },
  heldBy: "chad",
  hand: "left",
});

// ---------------------------------------------------------------- Chad's store

const floods = (): MovingProp[] =>
  FLOODS.flatMap((p, i) => {
    const off = BEAT.dies + 6 + i * 9; // one by one on "dies", seen going out in the lights-out close-up
    const lens = p.clone().add(new Vector3(-0.29, 0, 0)); // on the street face of the lamp housing (it was inside it)
    return [
      { name: `flood ${i} on`, make: () => floodGlass(true), pose: (o: Object3D, F: number) => (o.position.copy(lens), F < off), touches: ["CHAD'S HARDWARE"] },
      { name: `flood ${i} off`, make: () => floodGlass(false), pose: (o: Object3D, F: number) => (o.position.copy(lens), F >= off), touches: ["CHAD'S HARDWARE"] },
      { name: `flood ${i} glow`, make: () => glowSprite(lens.clone().add(new Vector3(-0.15, 0, 0)), "#fff0c8", 2.6, 1.1), pose: (_o: Object3D, F: number) => F < off },
    ] as MovingProp[];
  });
/** Fuel cans by the generator: three on day 28, none on day 30 (the last one went in at night). */
const cans = (): MovingProp[] =>
  [0, 1, 2].map((i) => ({ name: `fuel can ${i}`, make: fuelCan, pose: (o: Object3D, F: number) => (o.position.copy(FUEL_AT(i)), F < BEAT.day30 - 20), touches: ["CHAD'S HARDWARE"] }));
const shutterProp: MovingProp = {
  name: "shutter",
  make: shutter,
  pose: (o, F) => {
    o.position.copy(SHUTTER_AT);
    // B25 opens on Chad's slippers under a shutter already rising (review H3: 0.7 s of blank shutter before).
    const open = F < BEAT.electric - 12 ? 0 : 0.22 + 0.78 * ease((F - BEAT.electric + 12) / (BEAT.up - BEAT.electric + 12));
    const c = o.getObjectByName("curtain")!;
    c.position.y = open * (CHAD.shutterH - 0.15);
    c.scale.y = 1 - 0.95 * open;
    const lid = o.getObjectByName("lid")!;
    const slotOpen = F >= Math.round(16.19 * 30) - 2 && F < BEAT.only - 1; // "He said" .. "only" (slams)
    lid.position.y = slotOpen ? 0.17 : 0;
    o.getObjectByName("slotShades")!.visible = slotOpen;
    o.getObjectByName("slot")!.visible = open < 0.05;
  },
  touches: ["CHAD'S HARDWARE"],
};
/** The generator's sad smoke ring on "coughs". */
const smokeRing = (s: S): MovingProp => ({
  name: "smoke ring",
  make: () => new Mesh(new TorusGeometry(0.16, 0.06, 8, 20), new MeshBasicMaterial({ color: "#3a3640", transparent: true, opacity: 0.9, depthWrite: false })),
  pose: (o, F) => {
    // R14 (the ring left frame at the top): it puffs out of the exhaust toward the B23 lens, face-on, so it reads as an O.
    const t = (F - BEAT.coughs + 8) / 40;
    if (t < 0 || t > 1) return false;
    const p = s.pose(BEAT.coughs - 8 - s.from), cam = p.pos, ex = p.look.clone().add(new Vector3(0, 0.75, 0)); // the top of the housing in frame
    const k = 1 - (1 - t) ** 2;
    o.position.copy(ex).lerp(cam, 0.22 * k).add(new Vector3(0, 0.3 * k, 0));
    o.lookAt(cam);
    o.scale.setScalar(0.6 + 0.9 * k);
    ((o as Mesh).material as MeshBasicMaterial).opacity = 0.9 * (1 - t);
    return true;
  },
  touches: ["CHAD'S HARDWARE"],
});

// ---------------------------------------------------------------- the megaphone's sound rings

// R14 (art direction: soft additive rings had no ink): solid cream tubes on the inked layer, popped off at the end
// (a fading opaque ring would leave its ink outline behind, like the old smoke puff).
const ringMat = () => new MeshBasicMaterial({ color: "#fff1cf" });
const soundRings = (s: S, starts: number[], src: (F: number) => Vector3 = (F) => bellAt(s, F), size = 1): MovingProp => ({
  name: "sound rings",
  make: () => {
    const g = new Group();
    for (let i = 0; i < 3 * starts.length; i++) g.add(new Mesh(new TorusGeometry(1, 0.06, 8, 40), ringMat()));
    return g;
  },
  pose: (o, F) => {
    const mouth = src(F);
    const cam = s.pose(F - s.from).pos;
    let any = false;
    o.children.forEach((m, i) => {
      const t = (F - starts[Math.floor(i / 3)] - (i % 3) * 5) / 26;
      m.visible = t > 0 && t < 0.85;
      if (!m.visible) return;
      any = true;
      // Rings travel toward the street (the camera side) and grow.
      const dir = cam.clone().sub(mouth).normalize();
      // Small and short-lived (a telephoto shot turned 1.8 m rings into bands across the frame).
      m.position.copy(mouth).addScaledVector(dir, (0.25 + 1.1 * t) * size);
      m.lookAt(m.position.clone().add(dir));
      m.scale.setScalar((0.12 + 0.45 * t) * size);
    });
    return any;
  },
  heldBy: "chad",
  hand: "none", // sound in the air
  touches: ["CHAD'S HARDWARE"],
});

// ---------------------------------------------------------------- the cart

/** Cart pieces built once per taped amount; `taped` grows while you tape (A9). */
const cartProp = (name: string, place: (F: number) => { pos: Vector3; yaw: number; tilt?: number }, taped: (F: number) => number = () => 1, held?: string): MovingProp => ({
  name,
  make: () => {
    const g = new Group();
    for (const k of [0.5, 1]) {
      const c = hedgehogCart(k, k === 1);
      c.name = `t${k}`;
      g.add(c);
    }
    return g;
  },
  pose: (o, F) => {
    const q = place(F), k = taped(F);
    o.position.copy(q.pos);
    o.rotation.set(0, q.yaw, q.tilt ?? 0, "YXZ");
    for (const c of o.children) c.visible = c.name === `t${k < 0.75 ? 0.5 : 1}`;
  },
  touches: ["FRESHMART", "CHAD'S HARDWARE"],
  heldBy: held,
  hand: held ? "none" : undefined, // kicked, not held
});
const CART_YAW_EXT = Math.PI / 2; // front (+z local) toward Chad's (+x)
const cartExt = (held?: string) =>
  cartProp("hedgehog cart", (F) => {
    const p = cartAt(F), next = cartAt(F + 1);
    const moving = F > CART_RUN.foot && F < CART_RUN.stop;
    const bump = moving ? 0.035 * Math.abs(Math.sin(F * 0.9)) : 0;
    const onRamp = F >= CART_RUN.kick && F < CART_RUN.foot;
    return { pos: p.add(new Vector3(0, bump, 0)), yaw: CART_YAW_EXT, tilt: onRamp ? -Math.atan2(DOCK.floor, DOCK.run) * (next.y < p.y ? 1 : 0) : moving ? 0.05 * Math.sin(F * 1.3) : 0 };
  }, undefined, held);
const cartIn = cartProp("hedgehog cart", () => ({ pos: CART_IN.clone(), yaw: -0.5 }), (F) => (F < BEAT.tape ? 0.25 : 0.25 + 0.75 * clamp01((F - BEAT.tape) / (BEAT.hedgehog - BEAT.tape))));

/** A glowing rainbow streak behind the cart: its path over the last ~2 s, colour bands along it. */
const trail: MovingProp = {
  name: "noise trail",
  make: () => {
    const m = new Mesh(new BufferGeometry(), new ShaderMaterial({
      vertexShader: "attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying float vT;
vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }
void main(){ gl_FragColor = vec4(hue(fract(vT*2.5)) * 1.8 * smoothstep(0.0, 0.4, vT), 1.0); }`,
      blending: AdditiveBlending, transparent: true, depthWrite: false,
    }));
    m.layers.set(NOINK);
    m.frustumCulled = false;
    return m;
  },
  pose: (o, F) => {
    if (F < CART_RUN.foot || F > CART_RUN.stop + 20) return false;
    const pts: Vector3[] = [];
    for (let k = 60; k >= 0; k -= 3) pts.push(cartAt(Math.max(F - k, CART_RUN.foot)).add(new Vector3(-0.1, 0.95 + 0.12 * Math.sin((F - k) * 0.5), 0)));
    if (pts[0].distanceTo(pts[pts.length - 1]) < 0.2) return false;
    const tube = new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.09, 6);
    const n = tube.attributes.position.count, aT = new Float32Array(n);
    for (let i = 0; i < n; i++) aT[i] = Math.floor(i / 7) / 41;
    tube.setAttribute("aT", new BufferAttribute(aT, 1));
    (o as Mesh).geometry.dispose();
    (o as Mesh).geometry = tube;
    return true;
  },
  touches: ["FRESHMART", "CHAD'S HARDWARE"],
};

// ---------------------------------------------------------------- night pieces

const dinoProp = (s: S): MovingProp => ({
  name: "dino",
  make: dinoToy,
  pose: (o, F) => {
    o.position.copy(handOf(s, "you", "left", F, 0.12));
    o.scale.setScalar(0.5);
    faceCam(o, s, F);
    o.rotateY(Math.PI / 2);
  },
  heldBy: "you",
  hand: "left", // R14: the right hand is busy with the battery
});
/** The battery travels from your right hand into the dinosaur's hatch (between your hands), very, very gently. */
const batteryIn = (s: S): MovingProp => ({
  name: "battery going in",
  make: battery,
  pose: (o, F) => {
    // R14: the right hand itself carries it in (story.ts youDino); after the click it is inside the hatch.
    if (F > BEAT.gently + 10) return false; // gone into the hatch on the click (gently + 8)
    o.position.copy(handOf(s, "you", "right", F, 0.16));
    o.scale.setScalar(1.8); // reads at phone size (a true-size AA was ~20 px)
    o.rotation.set(0, 0, Math.PI / 2);
  },
  heldBy: "you",
  hand: "right",
});
/** A flashlight pool: a warm glow that follows `at(F)` (glowSprite reads the vector it was given every frame). */
const torchPool = (at: (F: number) => Vector3, size = 1.1, k = 0.9): MovingProp => ({
  name: "flashlight pool",
  make: () => {
    const p = new Vector3(), g = glowSprite(p, "#fff2c8", size, k);
    g.userData.at = p;
    return g;
  },
  pose: (o, F) => void (o.userData.at as Vector3).copy(at(F)),
});

// ---------------------------------------------------------------- per shot

/** The tally chart ticking: crosses go on one by one during "One can a day", up to 29 of 30 (the last has the skull).
 * Review C4: a chart already crossed out to the end read as "fuel gone" while the voice said "one can a day". */
const TALLY = new Map<number, CanvasTexture>();
const tallyOverlay: MovingProp = {
  name: "tally ticks",
  make: () => new Mesh(new PlaneGeometry(CHART.w, CHART.h), new MeshBasicMaterial({ map: chartTex(29) })),
  pose: (o, F) => {
    const n = 18 + Math.round(11 * clamp01((F - BEAT.oneCan + 4) / (BEAT.day - BEAT.oneCan + 10)));
    if (!TALLY.has(n)) TALLY.set(n, chartTex(n));
    ((o as Mesh).material as MeshBasicMaterial).map = TALLY.get(n)!;
    o.position.copy(CHART_AT).add(new Vector3(-0.035, 0, 0)); // a hair in front of the painted chart face
    o.rotation.set(0, -Math.PI / 2, 0);
  },
};


const rightOf = (s: S, F: number) => {
  const toCam = camOf(s, F).clone().sub(s.pose(F - s.from).look).setY(0).normalize();
  return new Vector3(toCam.z, 0, -toCam.x);
};
/** Chad's spatula (right hand). Origin at the grip. */
const spatulaProp = (s: S): MovingProp => ({
  name: "spatula",
  make: () => {
    const g = new Group();
    const h = new Mesh(new CylinderGeometry(0.015, 0.015, 0.3, 6), MAT.darkWood());
    h.position.y = 0.15;
    const b = new Mesh(new BoxGeometry(0.1, 0.12, 0.01), MAT.metal());
    b.position.y = 0.36;
    g.add(h, b);
    return g;
  },
  pose: (o, F) => {
    o.position.copy(handOf(s, "chad", "right", F, 0.08));
    o.rotation.set(0, 0, -0.9);
  },
  heldBy: "chad",
  hand: "right",
});
/** Steak smoke curling up off the grill (three puffs on a loop). */
const grillSmoke: MovingProp = {
  name: "grill smoke",
  make: () => {
    const g = new Group();
    // NOINK: the ink pass drew a faded puff's silhouette as a floating outline in the sky (R14 QA f924-974).
    for (let i = 0; i < 4; i++) {
      const m = new Mesh(new SphereGeometry(0.12, 10, 8), new MeshBasicMaterial({ color: "#e8e4e0", transparent: true, opacity: 0.6, depthWrite: false }));
      m.layers.set(NOINK);
      g.add(m);
    }
    return g;
  },
  pose: (o, F) => {
    o.children.forEach((m, i) => {
      const t = ((F + i * 15) % 60) / 60;
      m.position.copy(GRILL).add(new Vector3(0.05 * Math.sin(F * 0.1 + i), ROOF_Y + 0.95 + 1.1 * t, 0.06 * i));
      m.scale.setScalar(0.6 + 1.6 * t);
      ((m as Mesh).material as MeshBasicMaterial).opacity = 0.6 * (1 - t);
    });
  },
  touches: ["CHAD'S HARDWARE"],
};

/** R14 (the crash was never drawn): on cart_crash the toys burst out of the cart, tumble and land around the counter. */
const CRASH = CART_RUN.stop;
const toyBurst: MovingProp = {
  name: "toy burst",
  make: () => {
    const g = new Group();
    for (let i = 0; i < 12; i++) {
      const k = new Kit();
      toyParts(k, i, TOY_COLS[i % TOY_COLS.length], 0, 0, 0, 1.4);
      g.add(k.build());
    }
    return g;
  },
  pose: (o, F) => {
    const s = (F - CRASH) / 30;
    if (s < 0) return false;
    const c = cartAt(CRASH);
    o.children.forEach((m, i) => {
      const a = i * 2.39996, sp = 1.4 + 0.9 * ((i * 0.618) % 1), up = 3.2 + 1.6 * ((i * 0.382) % 1);
      const fall = Math.min(s, (up + Math.sqrt(up * up + 2 * 9.8 * 1.1)) / 9.8); // lands on the floor, then lies still
      m.position.set(c.x + Math.cos(a) * sp * fall, Math.max(0.02, 1.1 + up * fall - 4.9 * fall * fall), c.z + Math.sin(a) * sp * fall);
      m.rotation.set(5 * fall * Math.cos(a), 7 * fall, 4 * fall * Math.sin(a));
    });
    return true;
  },
  touches: ["CHAD'S HARDWARE"],
};

export const propsFor = (s: S): MovingProp[] => {
  const id = s.id.split("/")[1].split("-")[0];
  const ext = s.w.startsWith("ext");
  const out: MovingProp[] = ext ? [...floods(), ...cans(), shutterProp] : [];
  switch (id) {
    case "B01": out.push(youHeapToy(s), poppedBattery(s)); break; // user 2026-11-15: no QUACK text box
    case "B03": case "B03b": case "B04": case "B05": out.push(megaProp(s, () => false)); break;
    case "B06": out.push({ ...soundRings(s, [BEAT.knocked - 2, BEAT.knocked + 7], (F) => handOf(s, "you", "right", F, 0.05), 0.45), heldBy: undefined }); break; // R14: the raps land on the shutter
    case "B11": out.push(megaProp(s, (F) => F >= BEAT.grabs + 6), soundRings(s, [BEAT.morning - 2, BEAT.boy - 4])); break;
    case "B12": out.push(megaProp(s, () => false)); break;
    case "B13": out.push(spatulaProp(s), grillSmoke); break;
    case "B15": case "B16": out.push(cartIn); break;
    case "B17": out.push(cartExt()); break;
    case "B20": out.push(tallyOverlay, torchPool((F) => s.pose(F - s.from).look.clone().add(new Vector3(-0.04, 0, 0)), 1.6, 0.8)); break;
    case "B21": case "B22": {
      const you = s.cast!.find((c) => c.name === "you")!.at(0);
      out.push(cartIn, dinoProp(s), batteryIn(s), torchPool(() => you.clone().add(new Vector3(0.1, 1.0, 0.25)), 0.9, 0.7));
      break;
    }
    case "B23": out.push(smokeRing(s)); break;
    case "B25": out.push(brushProp(s)); break;
    case "B26": out.push(cartExt("you")); break;
    case "B28": out.push(cartExt(), trail, { ...soundRings(s, [BEAT.scream - 2, BEAT.scream + 10], (F) => cartAt(F).add(new Vector3(0, 1.1, 0)), 0.9), heldBy: undefined }); break; // R14: the toys scream (R15: 0.9, the closer lens made 1.8 fill the frame)
    case "B27": case "B29": case "B30": out.push(cartExt(), trail); break;
    case "B30b": out.push(cartExt(), trail, toyBurst); break;
    case "B31": case "B33": out.push(megaProp(s, () => false, true), brushProp(s)); break;
  }
  return out;
};
