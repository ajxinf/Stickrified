import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { Box3, DirectionalLight, Matrix3, Matrix4, Mesh, Object3D, PerspectiveCamera, PlaneGeometry, PointLight, Quaternion, Raycaster, Sprite, Vector3 } from "three";
import { OBB } from "three/examples/jsm/math/OBB.js";
import { CamPose, applyCam } from "./camera";
import { CONTACT_Y, handWorld } from "./cast";
import type { Hand } from "./cast";
import { CAPTION, CAPTION_FONT, captionPages } from "./Captions";
import type { CaptionWord } from "./Captions";
import { layout } from "./figure";
import type { CharState, Look } from "./figure";
import { GRADE } from "./grade";
import { NOINK } from "./ink";
import { LIGHTS } from "./lights";
import { youLook } from "./protagonist";
import { DESIGN } from "./toon";

/**
 * QA layer 1 (video-qa skill): exact scene and plan checks, every frame of every shot, before anything is rendered.
 * - `<ShotCamera {...shot} />` (inside the canvas) checks what needs the built scene: camera clearance, feet, card
 *   penetration, props through props, shadows.
 * - `<QAPlan plan={...} />` (composition root) checks what needs only the plan: camera curve, subject in frame, caption
 *   vs face, reaction timing, light continuity, and exports the plan for layer 2 (scripts write out/<slug>/plan.json).
 * Results go to the browser console as `QA1 {json}` lines (scripts/remotion-api.mjs `guardPass` collects them). A
 * failure throws (stops `remotion still`/`render`) unless the render runs with inputProps `{qa: "collect"}`.
 * Colliders opt in with `userData.collider = "<name>"`; boxes are taken in each object's own frame.
 */
export const CLEARANCE = 0.3;
const FEET_TOL = 0.02, CARD_DEPTH = 0.3, ZFIGHT = 0.25, PROP_EPS = 0.01, FLOAT_TOL = 0.02, BODY_GAP = 0.5;
const HAND_TOL = 0.12;
const MAX_SPEED = 25, MAX_ACCEL = 20, MAX_ZOOM = 2.2, SNAP = 25, STILL_PX = 0.5, STILL_RUN = 61;
// STILL_RUN 12 -> 61 (2026-11-13): refs R11/R13 hold dead still for up to ~50 f on beats, then move fast.
// measure.py motion blocks (96 px at 540x960): centres as frame fractions.
const GRID_X = [72, 204, 336, 468].map((x) => x / 540), GRID_Y = [96, 224, 352, 480, 608, 736, 864].map((y) => y / 960);
const SAFE_X: [number, number] = [0.08, 0.92], CAPTION_Y: [number, number] = [0.64, 0.76];

export const CHECKS = [
  "Camera clearance", "Feet on the ground", "Card penetration", "Props through props", "Camera curve",
  "Subject in frame", "Caption vs face", "Caption width", "Reaction timing", "Light continuity", "Shadows",
  "Moving props", "Scale", "Cast overlap", "Subject size", "Pacing", "Glare", "Door logic", "Text in frame",
  "Subject covered", "Empty sky", "Static hold",
] as const;
export type Check = (typeof CHECKS)[number];
export type Span = [number, number];

/** A character in a shot. `at` and `state` take the shot-local frame (the same functions draw the card). */
export type CastSpec = { name: string; look?: Look; at: (f: number) => Vector3; state: (f: number) => CharState; sit?: boolean };
/** One shot of the plan. Frames are shot-local (0 = first frame of the shot) except `from`, the composition frame. */
export type Shot = {
  id: string;
  pose: (f: number) => CamPose;
  frames: number;
  from?: number;
  cast?: CastSpec[];
  /** The speaking/reacting character: head stays fully in frame and inside the horizontal safe area. */
  subject?: string;
  /** Shot-local frame from which the subject must be in frame (a subject that enters, or a crane that reveals it). */
  subjectFrom?: number;
  /** An establishing / reveal / crowd shot: exempt from "Subject size" (the place, not the face, is the subject). */
  wide?: boolean;
  /** Scene + time of day: shots with the same tag must share the light. */
  scene?: string;
  light?: keyof typeof LIGHTS;
  sun?: Vector3;
  whips?: Span[];
  kicks?: Span[];
  flash?: Span[];
  /** Marked intended (check -> why): reported, not failed. */
  allow?: Partial<Record<Check, string>>;
  /**
   * Story props that move or appear (a roller, a ray, a held cone). `make` builds a fresh copy, `pose` places it for a
   * COMPOSITION frame (the same function Video.tsx uses; return false when hidden). The guard tests it every frame
   * against the world's colliders and the cards, except what it is meant to touch (`touches`: collider names;
   * `heldBy`: the cast name holding it).
   */
  moving?: MovingProp[];
};
/**
 * `heldBy` + `hand`: the holder and which drawn hand grips it ("none" = not held, only allowed to touch the body, e.g.
 * sound rings). A held prop's origin is its grip point and must stay within HAND_TOL of that hand every frame
 * (place it with cast.ts `handWorld`), or it floats beside the character.
 */
export type MovingProp = { name: string; make: () => Object3D; pose: (o: Object3D, f: number) => boolean | void; touches?: string[]; heldBy?: string; hand?: Hand | "none" };
/** `inserts`: 2D cut-aways mounted outside the shot list ([from, to] composition frames): layer 2 gets their cuts. */
/** `overlays`: 2D cards over the picture (Stamp: kit/toon/Stamp.tsx `stampBox`), composition frames + screen box (0..1). */
export type Overlay = { name: string; from: number; to: number; x: Span; y: Span };
/** `xfades`: dissolves the video draws by extending the outgoing shot past the next shot's start (composition frames);
 * without them exportPlan sees a hard cut and video_qa.py flags the dissolve as a POP (moon R25, f1370). */
export type Plan = { slug: string; shots: Shot[]; words?: CaptionWord[]; inserts?: Span[]; overlays?: Overlay[]; xfades?: Span[] };
export type Fail = { check: Check; shot: string; frame: number; to: number; object: string; note: string; intended?: string };

// ---------- text runs (check "Text in frame")
// Every fillText/strokeText box (canvas px, after the canvas transform) is recorded on its canvas, so in-world text
// (signs, boards, calendars, box art) can be checked on screen without per-video tagging. A repaint of the whole
// canvas starts a new list (screens redrawn per frame).
type Run = { text: string; x0: number; y0: number; x1: number; y1: number };
type RunCanvas = HTMLCanvasElement & { __runs?: Run[] };
if (typeof CanvasRenderingContext2D !== "undefined" && !(CanvasRenderingContext2D.prototype as unknown as { __qaText?: boolean }).__qaText) {
  const P = CanvasRenderingContext2D.prototype as unknown as Record<string, unknown> & { __qaText: boolean };
  P.__qaText = true;
  for (const k of ["fillText", "strokeText"]) {
    const orig = P[k] as (...a: unknown[]) => void;
    P[k] = function (this: CanvasRenderingContext2D, text: string, x: number, y: number, maxW?: number) {
      const m = this.measureText(text), t = this.getTransform();
      const sx = maxW && m.width > maxW ? maxW / m.width : 1;
      const xs = [x - m.actualBoundingBoxLeft * sx, x + m.actualBoundingBoxRight * sx], ys = [y - m.actualBoundingBoxAscent, y + m.actualBoundingBoxDescent];
      const pts = xs.flatMap((px) => ys.map((py) => [t.a * px + t.c * py + t.e, t.b * px + t.d * py + t.f]));
      const run = { text: String(text), x0: Math.min(...pts.map((q) => q[0])), x1: Math.max(...pts.map((q) => q[0])), y0: Math.min(...pts.map((q) => q[1])), y1: Math.max(...pts.map((q) => q[1])) };
      const c = this.canvas as RunCanvas, runs = (c.__runs ??= []);
      if (String(text).trim() && !runs.some((r) => r.text === run.text && Math.abs(r.x0 - run.x0) < 1 && Math.abs(r.y0 - run.y0) < 1)) runs.push(run);
      return orig.call(this, text, x, y, maxW);
    };
  }
  for (const k of ["fillRect", "clearRect"]) {
    const orig = P[k] as (...a: unknown[]) => void;
    P[k] = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      if (x <= 0 && y <= 0 && x + w >= this.canvas.width && y + h >= this.canvas.height && this.getTransform().isIdentity) (this.canvas as RunCanvas).__runs = [];
      return orig.call(this, x, y, w, h);
    };
  }
}

class Report {
  fails: Fail[] = [];
  ran = new Set<Check>();
  na: Partial<Record<Check, string>> = {};
  /** Per-frame median scene motion (px/f), for comparing with measure.py. */
  creep?: number[];
  /** Consecutive frames of the same check/shot/object collapse into one entry. */
  add(check: Check, shot: Shot, f: number, object: string, note: string, intended = shot.allow?.[check]) {
    const frame = (shot.from ?? 0) + f;
    const last = this.fails.find((x) => x.check === check && x.shot === shot.id && x.object === object && x.to >= frame - 1);
    if (last) last.to = Math.max(last.to, frame);
    else this.fails.push({ check, shot: shot.id, frame, to: frame, object, note, intended });
  }
}

const emit = (kind: "plan" | "shot", id: string, r: Report, extra: object = {}) => {
  const fails = r.fails, real = fails.filter((x) => !x.intended);
  console.log("QA1 " + JSON.stringify({ kind, id, ran: [...r.ran], na: r.na, fails, creep: r.creep, ...extra }));
  if (real.length && getInputProps().qa !== "collect") throw new Error(`QA layer 1: ${real.length} failure(s); first: ${failMessage(real[0])}`);
};
export const failMessage = (x: Fail) =>
  `${x.check}: shot "${x.shot}" frame ${x.frame}${x.to > x.frame ? `-${x.to}` : ""}: ${x.object}: ${x.note}`;

// ---------- geometry shared by both halves

type Collider = { name: string; root: Object3D; inv: Matrix4; box: Box3 };

export const colliders = (root: Object3D): Collider[] => {
  root.updateMatrixWorld(true);
  const out: Collider[] = [];
  root.traverse((o) => {
    if (!o.userData.collider) return;
    const inv = o.matrixWorld.clone().invert();
    const box = new Box3();
    o.traverse((m) => {
      const mesh = m as Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(inv.clone().multiply(mesh.matrixWorld)));
    });
    if (!box.isEmpty()) out.push({ name: String(o.userData.collider), root: o, inv, box });
  });
  return out;
};

/** Per-part oriented boxes of every collider (Kit meshes keep their parts' boxes; awnings don't fill the pavement). */
type Part = { name: string; root: Object3D; obb: OBB; r: number };
const parts = (cols: Collider[]): Part[] => {
  const out: Part[] = [];
  for (const c of cols)
    c.root.traverse((m) => {
      const mesh = m as Mesh;
      if (!mesh.isMesh || !mesh.geometry || (mesh as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) return;
      // A nested collider (a monitor on a desk) names its own parts: a prop allowed to touch the desk still may not
      // pass through the monitor (ep 3: the newspaper landed under the CRT).
      let own: Object3D | null = mesh;
      while (own && !own.userData.collider) own = own.parent;
      if (own !== c.root) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      for (const b of (mesh.userData.parts as Box3[] | undefined) ?? [mesh.geometry.boundingBox!]) {
        const obb = toOBB(b, mesh.matrixWorld);
        out.push({ name: c.name, root: c.root, obb, r: obb.halfSize.length() });
      }
    });
  return out;
};

/** Box in a mesh's frame -> world OBB (three's OBB.applyMatrix4 translates the centre without rotating it). */
const toOBB = (b: Box3, m: Matrix4) => {
  const pos = new Vector3(), q = new Quaternion(), sc = new Vector3();
  m.decompose(pos, q, sc);
  const half = b.getSize(new Vector3()).multiplyScalar(0.5).multiply(sc);
  half.set(Math.abs(half.x), Math.abs(half.y), Math.abs(half.z));
  return new OBB(b.getCenter(new Vector3()).applyMatrix4(m), half, new Matrix3().setFromMatrix4(new Matrix4().makeRotationFromQuaternion(q)));
};

const PX = DESIGN.PX_PER_M;
const cardYaw = (p: Vector3, cam: Vector3) => Math.atan2(cam.x - p.x, cam.z - p.z);
const yawMat = (yaw: number) => new Matrix3().setFromMatrix4(new Matrix4().makeRotationY(yaw));

/** Card measurements in metres for a frame: drawn figure width, head-top height, head rectangle (in the card plane). */
const card = (c: CastSpec, f: number) => {
  const look = c.look ?? youLook, L = layout(look, c.state(f).pose), sq = (c.state(f).pose.squash ?? 0) * 0.08;
  const w = (L.W * Math.max(1, look.build.tw, 0.76)) / PX;
  const top = ((DESIGN.SOLE - (L.hc - L.H.b)) / PX) * (1 - sq);
  const head = { x: ((L.hx - DESIGN.W / 2) / PX) * (1 + sq), y: ((DESIGN.SOLE - L.hc) / PX) * (1 - sq), a: ((L.H.a * 1.1) / PX) * (1 + sq), b: ((L.H.b * 1.1) / PX) * (1 - sq) };
  return { w, top, head };
};
/** Head rectangle of a card (card plane, 0.3 m deep), facing the lens. */
const headOBB = (p: Vector3, yaw: number, h: { x: number; y: number; a: number; b: number }) =>
  new OBB(p.clone().add(new Vector3(Math.cos(yaw) * h.x, h.y, -Math.sin(yaw) * h.x)), new Vector3(h.a, h.b, 0.15), yawMat(yaw));
/** Card body (footprint width x 0.3 m, from 5 cm above the soles to the head top), facing the lens. */
const cardOBB = (p: Vector3, yaw: number, w: number, top: number) =>
  new OBB(p.clone().setY(p.y + (0.05 + top) / 2), new Vector3(w / 2, (top - 0.05) / 2, CARD_DEPTH / 2), yawMat(yaw));
const obbDistance = (o: OBB, q: Vector3) => o.clampPoint(q, new Vector3()).distanceTo(q);

const camera = (pose: CamPose, aspect: number) => {
  const c = new PerspectiveCamera(pose.fov, aspect);
  applyCam(c, pose);
  c.updateMatrixWorld(true);
  return c;
};
const screen = (c: PerspectiveCamera, p: Vector3) => {
  const v = p.clone().project(c);
  return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, front: v.z > -1 && v.z < 1 };
};
/** Head rectangle on screen (0..1, y down). */
const headBox = (c: CastSpec, f: number, cam: PerspectiveCamera) => {
  const p = c.at(f), { head } = card(c, f), yaw = cardYaw(p, cam.position);
  const r = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => screen(cam, p.clone().addScaledVector(r, head.x + i * head.a).setY(p.y + head.y + j * head.b)));
  return { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)), front: pts.every((q) => q.front) };
};
type SBox = { x0: number; x1: number; y0: number; y1: number };
/** Fraction of box b covered by box a. */
const covered = (a: SBox, b: SBox) =>
  (Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0))) / Math.max((b.x1 - b.x0) * (b.y1 - b.y0), 1e-9);
/** A face may be covered at most this much by a nearer card or a held prop (pilot: Dave hidden behind you). */
const FACE_COVER = 0.25;
/** Subject head width (fraction of the frame width) on the median frame of a non-wide shot; MCU ~0.35, MS ~0.25, FS ~0.13. */
const SUBJECT_MIN = 0.15;
/** Longest shot (frames at 30 fps); the plan's mean shot must also stay at or under MEAN_SHOT. */
const MAX_SHOT = 120, MEAN_SHOT = 90;
/** R27 (moon report): a set piece or story prop may cover 2+ of 5 face points for at most COVER_RUN frames; a non-wide
 * shot leaves at most SKY_MAX of the 7x4 ray grid on empty sky; a shot never runs HOLD_MAX frames without a visible
 * change (a face, a gesture, someone moving, a prop moving, a reframe). */
const COVER_RUN = 10, SKY_MAX = 0.4, HOLD_MAX = 60;
const inSpans = (f: number, spans: Span[] | undefined, pad: number) => !!spans?.some(([a, b]) => f >= a - pad && f <= b + pad);

// ---------- scene checks (need the built three scene)

const sceneChecks = (shot: Shot, scene: Object3D, aspect: number) => {
  const r = new Report();
  const cols = colliders(scene), ps = parts(cols), cast = shot.cast ?? [];
  const cams = Array.from({ length: shot.frames }, (_, f) => camera(shot.pose(f), aspect));

  // Camera clearance: lens vs every collider part (a wall, post, shelf board, awning) and every character card.
  r.ran.add("Camera clearance");
  cams.forEach((cam, f) => {
    for (const pt of ps) {
      if (pt.obb.center.distanceTo(cam.position) > pt.r + CLEARANCE) continue;
      const d = obbDistance(pt.obb, cam.position);
      if (d < CLEARANCE) r.add("Camera clearance", shot, f, pt.name, d === 0 ? `lens inside ${partInfo(pt)}` : `lens ${d.toFixed(2)} m from ${partInfo(pt)} (needs >= ${CLEARANCE})`);
    }
    for (const c of cast) {
      const p = c.at(f), k = card(c, f);
      const d = obbDistance(cardOBB(p, cardYaw(p, cam.position), k.w, k.top), cam.position);
      if (d < CLEARANCE) r.add("Camera clearance", shot, f, `card "${c.name}"`, `lens ${d.toFixed(2)} m from the card`);
    }
  });

  // Camera curve, creep part: every hold creeps. Median screen motion (px/f at 1080 wide) of what rays through
  // measure.py's 7x4 block centres hit (the world is static), so both layers agree; sky misses are skipped.
  if (shot.frames > 1) {
    r.ran.add("Camera curve");
    const look = new Raycaster(), W = 1080, H = W / aspect;
    let still = 0;
    const creep: number[] = (r.creep = []);
    for (let f = 0; f < shot.frames - 1; f++) {
      const moves: number[] = [];
      for (const gx of GRID_X)
        for (const gy of GRID_Y) {
          look.setFromCamera({ x: 2 * gx - 1, y: 1 - 2 * gy } as never, cams[f]);
          const hit = look.intersectObject(scene, true)[0];
          if (!hit) continue;
          const a = screen(cams[f], hit.point), b = screen(cams[f + 1], hit.point);
          moves.push(Math.hypot((b.x - a.x) * W, (b.y - a.y) * H));
        }
      moves.sort((x, y) => x - y);
      const m = moves.length ? moves[moves.length >> 1] : 0;
      creep.push(+m.toFixed(2));
      still = m < STILL_PX ? still + 1 : 0;
      const note = `no creep: median motion < ${STILL_PX} px/f for ${STILL_RUN}+ frames`;
      if (still === STILL_RUN) for (let g = f - STILL_RUN + 1; g <= f; g++) r.add("Camera curve", shot, g, "camera hold", note);
      else if (still > STILL_RUN) r.add("Camera curve", shot, f, "camera hold", note);
    }
  }

  // Ground height under a point: first surface below (layer 0 meshes; cards, blobs and sky live on other layers).
  const ray = new Raycaster();
  ray.far = 1.2;
  const groundAt = (p: Vector3, skip?: Object3D, up = 0.6): number | null => {
    ray.set(p.clone().setY(p.y + up), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(scene, true).find((h) => !skip || !isUnder(h.object, skip));
    return hit ? hit.point.y : null;
  };

  if (cast.length) {
    r.ran.add("Feet on the ground");
    r.ran.add("Card penetration");
    const memo = new Map<string, number | null>();
    for (let f = 0; f < shot.frames; f++) {
      const cam = cams[f];
      for (const c of cast) {
        const p = c.at(f), key = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}`;
        if (!memo.has(key)) memo.set(key, groundAt(p, undefined, c.sit ? 0.15 : 0.6)); // seated: start under the lap (a bucket in it)
        const g = memo.get(key)!;
        const gy = g ?? 0;
        const d = p.y - gy;
        if (Math.abs(d) > FEET_TOL)
          r.add("Feet on the ground", shot, f, `"${c.name}"`, `soles ${(d * 100).toFixed(1)} cm ${d > 0 ? "above" : "below"} the ${c.sit ? "seat" : "ground"} (y ${gy.toFixed(3)})`);
        const k = card(c, f), o = cardOBB(p, cardYaw(p, cam.position), k.w, k.top), rad = o.halfSize.length();
        for (const pt of ps) {
          if (pt.obb.center.distanceTo(o.center) > pt.r + rad) continue;
          if (o.intersectsOBB(pt.obb)) r.add("Card penetration", shot, f, `"${c.name}" vs ${pt.name}`, "card footprint overlaps it");
        }
      }
      // Two characters may not stand on the same spot (bodies passing through each other).
      for (let i = 0; i < cast.length; i++)
        for (let j = i + 1; j < cast.length; j++) {
          const d = cast[i].at(f).distanceTo(cast[j].at(f));
          if (d < BODY_GAP) r.add("Card penetration", shot, f, `"${cast[i].name}" vs "${cast[j].name}"`, `stand ${d.toFixed(2)} m apart (bodies overlap, needs >= ${BODY_GAP})`);
        }
      // Two cards overlapping on screen must be >= 0.25 m apart in depth (z-fighting).
      for (let i = 0; i < cast.length; i++)
        for (let j = i + 1; j < cast.length; j++) {
          const a = cast[i], b = cast[j];
          const ba = bodyBox(a, f, cam), bb = bodyBox(b, f, cam);
          const overlap = ba.x0 < bb.x1 && bb.x0 < ba.x1 && ba.y0 < bb.y1 && bb.y0 < ba.y1;
          const fwd = cam.getWorldDirection(new Vector3());
          const dz = Math.abs(a.at(f).clone().sub(cam.position).dot(fwd) - b.at(f).clone().sub(cam.position).dot(fwd));
          if (overlap && dz < ZFIGHT) r.add("Card penetration", shot, f, `"${a.name}" vs "${b.name}"`, `cards overlap on screen ${dz.toFixed(2)} m apart in depth (z-fighting, needs >= ${ZFIGHT})`);
        }
    }
  } else r.na["Feet on the ground"] = r.na["Card penetration"] = "no characters";

  // Subject covered (R27 report: the carried chair hid you for the whole moon cold open): rays from the lens to 5
  // points on the subject's face against every collider (set pieces, framing props) and every story prop posed for the
  // frame, held ones included. 2+ blocked rays for COVER_RUN+ frames fails: a foreground frames the subject, never hides it.
  const subj = cast.find((c) => c.name === shot.subject);
  if (subj) {
    r.ran.add("Subject covered");
    const from = shot.from ?? 0, movers = (shot.moving ?? []).map((m) => ({ m, obj: m.make() }));
    const still = cols.filter((c) => !movers.some(({ m }) => m.name === c.name)).map((c) => c.root); // the scene's own copy of a story prop sits where the mount frame left it
    const rc = new Raycaster();
    let run = 0;
    for (let f = 0; f < shot.frames; f++) {
      if (f < (shot.subjectFrom ?? 0) || inSpans(f, shot.whips, 0)) { run = 0; continue; }
      const cam = cams[f], p = subj.at(f), { head } = card(subj, f), side = new Vector3(Math.cos(cardYaw(p, cam.position)), 0, -Math.sin(cardYaw(p, cam.position)));
      const targets = [...still, ...movers.filter(({ m, obj }) => m.pose(obj, from + f) !== false && obj.visible).map(({ obj }) => (obj.updateMatrixWorld(true), obj))];
      let blocked = 0, by = "";
      for (const [i, j] of [[0, 0], [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]]) {
        const d = p.clone().addScaledVector(side, head.x + i * head.a).setY(p.y + head.y + j * head.b).sub(cam.position);
        rc.set(cam.position, d.clone().normalize());
        rc.far = d.length() - 0.15;
        const h = rc.intersectObjects(targets, true)[0];
        if (!h) continue;
        blocked++;
        let o: Object3D | null = h.object;
        while (o && !o.userData.collider && !movers.some(({ obj }) => obj === o)) o = o.parent;
        by ||= o ? String(o.userData.collider ?? movers.find(({ obj }) => obj === o)?.m.name) : h.object.name || "set";
      }
      run = blocked >= 2 ? run + 1 : 0;
      const note = `${blocked}/5 face rays blocked for ${COVER_RUN}+ frames: move the foreground to the frame edge, change the angle or crop tighter`;
      if (run === COVER_RUN) for (let g = f - COVER_RUN + 1; g <= f; g++) r.add("Subject covered", shot, g, `${by} over "${subj.name}" face`, note);
      else if (run > COVER_RUN) r.add("Subject covered", shot, f, `${by} over "${subj.name}" face`, note);
    }
  } else r.na["Subject covered"] = "no subject";

  // Empty sky (R27 report: the moon beach frames were ~40 % plain sky over small figures): on the first, middle and
  // last frame, the share of measure.py's 7x4 grid rays that hit nothing (sky). A non-wide shot stays at or under SKY_MAX.
  if (!shot.wide) {
    r.ran.add("Empty sky");
    const rc = new Raycaster();
    rc.layers.enable(NOINK); // character and crowd cards fill the frame too (a face against the sky is not empty sky)
    const miss = [0, shot.frames >> 1, shot.frames - 1].map((f) => {
      let n = 0;
      for (const gx of GRID_X)
        for (const gy of GRID_Y) {
          rc.setFromCamera({ x: 2 * gx - 1, y: 1 - 2 * gy } as never, cams[f]);
          if (!rc.intersectObject(scene, true).length) n++;
        }
      return n / (GRID_X.length * GRID_Y.length);
    }).sort((a, b) => a - b)[1];
    if (miss > SKY_MAX) r.add("Empty sky", shot, 0, "frame", `${(miss * 100).toFixed(0)} % of the frame is empty sky (max ${SKY_MAX * 100} % outside \`wide\` shots): tilt down, frame tighter, or put the set/skyline in it`);
  }

  // Props through props (setup, reported once as shot "setup"): part boxes of different colliders, and nothing
  // floating above its support.
  r.ran.add("Props through props");
  const setup: Shot = { ...shot, id: "setup", from: 0 };
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (a.root === b.root || isUnder(a.root, b.root) || isUnder(b.root, a.root)) continue;
      if (a.obb.center.distanceTo(b.obb.center) > a.r + b.r) continue;
      const sa = a.obb.clone(), sb = b.obb.clone();
      sa.halfSize.subScalar(PROP_EPS / 2).max(new Vector3());
      sb.halfSize.subScalar(PROP_EPS / 2).max(new Vector3());
      if (!sa.intersectsOBB(sb)) continue;
      const d = depth(a.obb, b.obb), joins = a.root.userData.joins;
      // Parts of one structure that meet on purpose (`userData.joins`: terraced rows, a building's walls): party
      // walls, plinths and cornices (curve sag + 15 cm overhangs), up to 35 cm deep.
      const why = joins && joins === b.root.userData.joins && d <= 0.35 ? `${joins}: built to meet` : undefined;
      r.add("Props through props", setup, 0, `${a.name} vs ${b.name}`, `boxes intersect by more than ${PROP_EPS * 100} cm (${d > 0 ? `a corner is ${(d * 100).toFixed(0)} cm inside` : "edges cross"}); parts ${partInfo(a)} and ${partInfo(b)}`, why);
    }
  for (const c of cols) {
    const box = new Box3().setFromObject(c.root);
    if (box.min.y < FLOAT_TOL) continue;
    const g = groundAt(new Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2), c.root);
    const gap = box.min.y - (g ?? 0);
    if (gap > FLOAT_TOL) r.add("Props through props", setup, 0, c.name, `floats ${(gap * 100).toFixed(1)} cm above its support`);
  }

  // Moving props: every frame, each story prop vs every collider part and every card, minus its allowed contacts.
  if (shot.moving?.length) {
    r.ran.add("Moving props");
    const from = shot.from ?? 0;
    for (const m of shot.moving) {
      const obj = m.make();
      for (let f = 0; f < shot.frames; f++) {
        if (m.pose(obj, from + f) === false || !obj.visible) continue;
        obj.updateMatrixWorld(true);
        const holder = m.heldBy ? cast.find((c) => c.name === m.heldBy) : undefined;
        if (m.heldBy && !m.hand) r.add("Moving props", shot, f, m.name, `held by "${m.heldBy}" but no \`hand\` declared (left/right/both, or "none" if it only touches the body)`);
        else if (holder && m.hand && m.hand !== "none") {
          const hs = holder.state(f), h = handWorld(holder.look ?? youLook, hs.pose, holder.at(f), cams[f].position, m.hand, 0.06, hs.heading);
          const grip = new Vector3().setFromMatrixPosition(obj.matrixWorld), d = grip.distanceTo(h);
          if (d > HAND_TOL) r.add("Moving props", shot, f, `${m.name} vs "${holder.name}" ${m.hand} hand`, `floats ${(d * 100).toFixed(0)} cm from the hand (max ${HAND_TOL * 100}): place it with handWorld()`);
        }
        // A held prop never covers someone else's face (a megaphone hiding the hero waving below). Only held props: set
        // pieces in front of a face are staging (a shutter rising on a reveal), and their bounding box overstates them.
        if (m.hand && m.hand !== "none") {
          const bb = new Box3().setFromObject(obj), cam = cams[f];
          if (!bb.isEmpty()) {
            const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => screen(cam, new Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z)));
            const pb = { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) };
            const near = bb.getCenter(new Vector3()).distanceTo(cam.position);
            for (const c of cast) {
              if (c.name === m.heldBy || !pts.every((q) => q.front) || c.at(f).distanceTo(cam.position) < near) continue;
              const k = covered(pb, headBox(c, f, cam));
              if (k > FACE_COVER) r.add("Cast overlap", shot, f, `${m.name} over "${c.name}" face`, `covers ${(k * 100).toFixed(0)} % of the face (max ${FACE_COVER * 100} %)`);
            }
          }
        }
        const mine = parts([{ name: m.name, root: obj, inv: new Matrix4(), box: new Box3() }]);
        for (const a of mine) {
          for (const pt of ps) {
            if (m.touches?.includes(pt.name) || a.obb.center.distanceTo(pt.obb.center) > a.r + pt.r || !a.obb.intersectsOBB(pt.obb)) continue;
            r.add("Moving props", shot, f, `${m.name} vs ${pt.name}`, `passes through it (${partInfo(pt)})`);
          }
          for (const c of cast) {
            // The holder's body may touch what it holds; its head never (a pole through a hat is a clip).
            const p = c.at(f), k = card(c, f), yaw = cardYaw(p, cams[f].position);
            const o = c.name === m.heldBy ? headOBB(p, yaw, k.head) : cardOBB(p, yaw, k.w, k.top);
            if (a.obb.center.distanceTo(o.center) <= a.r + o.halfSize.length() && a.obb.intersectsOBB(o))
              r.add("Moving props", shot, f, `${m.name} vs "${c.name}"${c.name === m.heldBy ? " head" : ""}`, "passes through the character card");
          }
        }
      }
    }
  } else r.na["Moving props"] = "no moving props in the plan";

  // Scale: nobody standing within 3 m of a door (collider `userData.door` = door height, m) is taller than the door
  // minus 10 cm headroom (head top incl. a hat brim estimate).
  const doors = cols.filter((c) => typeof c.root.userData.door === "number");
  if (doors.length && cast.length) {
    r.ran.add("Scale");
    for (const c of cast) {
      const look = c.look ?? youLook, top = card(c, 0).top + (look.brim ? 0.18 : 0);
      for (const d of doors) {
        const box = new Box3().setFromObject(d.root), p = c.at(0);
        const dist = Math.hypot(Math.max(box.min.x - p.x, 0, p.x - box.max.x), Math.max(box.min.z - p.z, 0, p.z - box.max.z));
        if (dist <= 3 && top > d.root.userData.door - 0.1)
          r.add("Scale", shot, 0, `"${c.name}" vs ${d.name}`, `${top.toFixed(2)} m tall next to a ${Number(d.root.userData.door).toFixed(2)} m door (needs 10 cm headroom)`);
      }
    }
  } else r.na["Scale"] = cast.length ? "no doors tagged (userData.door) in the set" : "no characters";

  // Shadows: sun shadows on in day/golden presets; every character card has a contact blob on top of the ground.
  r.ran.add("Shadows");
  const grade = shot.light ? LIGHTS[shot.light].grade : null;
  if (grade === "day" || grade === "golden") {
    let sun = false;
    scene.traverse((o) => void ((o as DirectionalLight).isDirectionalLight && (o as DirectionalLight).castShadow && (sun = true)));
    if (!sun) r.add("Shadows", shot, 0, "key light", `no shadow-casting sun in a ${shot.light} shot`);
  }
  const chars: Object3D[] = [];
  scene.traverse((o) => void (o.userData.character && chars.push(o)));
  if (shot.cast && chars.length !== cast.length) r.add("Shadows", shot, 0, "cast", `${chars.length} character cards in the scene, ${cast.length} in the plan`);
  for (const ch of chars) if (!ch.children.some((m) => m.userData.contact && m.visible)) r.add("Shadows", shot, 0, "character card", "no contact blob");
  for (const c of cast) {
    const p = c.at(0), g = groundAt(p, undefined, c.sit ? 0.15 : 0.6);
    const blob = p.y + CONTACT_Y;
    if (g !== null && blob < g + 0.002) r.add("Shadows", shot, 0, `"${c.name}" contact blob`, `blob at y ${blob.toFixed(3)} is under the ground (y ${g.toFixed(3)}): hidden`);
  }

  glareCheck(r, shot, scene, cams);
  doorCheck(r, shot, scene);
  textCheck(r, shot, scene, cams);
  return r;
};

// ---------- Glare: practicals must light a face, not wash it out (ep 3: CRT glow in front of every face).
/** Max practical light at a head (sum of point-light intensity x luminance x falloff, the card shader's `lamp`). */
const GLARE_LIGHT = 1.6;
/** Max glow-sprite brightness (opacity x strength x luminance) allowed in front of a face. */
const GLARE_GLOW = 0.12;
const lum = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const smooth = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const glareCheck = (r: Report, shot: Shot, scene: Object3D, cams: PerspectiveCamera[]) => {
  const cast = shot.cast ?? [];
  if (!cast.length) return void (r.na["Glare"] = "no characters");
  r.ran.add("Glare");
  const lights: PointLight[] = [], glows: Sprite[] = [];
  scene.traverseVisible((o) => {
    if ((o as PointLight).isPointLight) lights.push(o as PointLight);
    if ((o as Sprite).isSprite && o.userData.glow) glows.push(o as Sprite);
  });
  cams.forEach((cam, f) => {
    for (const c of cast) {
      const p = c.at(f), k = card(c, f), yaw = cardYaw(p, cam.position);
      const head = p.clone().add(new Vector3(Math.cos(yaw) * k.head.x, k.head.y, -Math.sin(yaw) * k.head.x));
      let sum = 0;
      for (const l of lights) {
        const d = l.getWorldPosition(new Vector3()).distanceTo(head);
        sum += l.intensity * lum(l.color) * (l.distance > 0 ? 1 - smooth(0, l.distance, d) : 1);
      }
      if (sum > GLARE_LIGHT) r.add("Glare", shot, f, `"${c.name}" face`, `practical light ${sum.toFixed(2)} at the head (max ${GLARE_LIGHT}): the face washes out; dim or move the lamp/screen light`);
      const hb = headBox(c, f, cam), hd = head.distanceTo(cam.position);
      for (const s of glows) {
        const { pos, size, strength } = s.userData.glow as { pos: Vector3; size: number; strength: number };
        const toCam = cam.position.clone().sub(pos), d = toCam.length();
        const t = Math.min(Math.max((d - size * 0.9) / (size * 1.6), 0), 1), op = t * t * (3 - 2 * t);
        const at = pos.clone().addScaledVector(toCam.normalize(), size * 0.45), sc = screen(cam, at);
        if (op * strength < GLARE_GLOW || at.distanceTo(cam.position) > hd || !sc.front) continue;
        // The bright core (~30 % of the sprite) on screen vs the head box.
        const rad = (size * 0.15) / (at.distanceTo(cam.position) * Math.tan((cam.fov * Math.PI) / 360) * 2);
        const ov = covered({ x0: sc.x - rad / cam.aspect, x1: sc.x + rad / cam.aspect, y0: sc.y - rad, y1: sc.y + rad }, hb);
        if (ov > 0.05) r.add("Glare", shot, f, `glow over "${c.name}" face`, `a practical's glow (${(op * strength).toFixed(2)}) sits between the lens and the face: it washes the face; smaller glow, or move it`);
      }
    }
  });
};

// ---------- Door logic: every door is tagged, and a door that opens leads somewhere (ep 3: a door onto a wall).
/** Free space needed behind an opening door (m), measured from the doorway through the opening. */
const DOOR_BEYOND = 1.5;
const doorCheck = (r: Report, shot: Shot, scene: Object3D) => {
  const doors: Object3D[] = [];
  // A "door" under 1 m tall is a lantern, cabinet or oven door (Poly Haven wooden_lantern_01_door), never a doorway.
  scene.traverseVisible((o) => void (/door/i.test(o.name) && !/sign|tex|frame|knob|handle/i.test(o.name) && new Box3().setFromObject(o).getSize(new Vector3()).y >= 1 && doors.push(o)));
  if (!doors.length) return void (r.na["Door logic"] = "no objects named door");
  r.ran.add("Door logic");
  const setup: Shot = { ...shot, id: "setup", from: 0 };
  const ray = new Raycaster();
  for (const d of doors) {
    const u = d.userData;
    if (typeof u.door !== "number" || typeof u.opens !== "boolean") {
      r.add("Door logic", setup, 0, d.name, "untagged door: set userData.door = height (m) and userData.opens = true/false");
      continue;
    }
    if (!u.opens) continue;
    if (!u.out) { r.add("Door logic", setup, 0, d.name, "an opening door needs userData.out (world direction from the room through the doorway)"); continue; }
    // The doorway: the door's hinge position at 1 m up; cast through the opening (past the leaf) and look for what is there.
    const out = (u.out as Vector3).clone().normalize(), at = (u.doorway as Vector3 | undefined)?.clone() ?? d.getWorldPosition(new Vector3());
    ray.set(at.clone().setY(at.y + 1.0).addScaledVector(out, -0.3), out);
    const hit = ray.intersectObject(scene, true).find((h) => !isUnder(h.object, d) && h.object !== d);
    const beyond = hit ? hit.distance - 0.3 : Infinity;
    if (beyond < DOOR_BEYOND) r.add("Door logic", setup, 0, d.name, `opens onto ${hit!.object.name || "a solid surface"} ${beyond.toFixed(2)} m behind the doorway (needs >= ${DOOR_BEYOND} m of room, corridor or street)`);
  }
};

// ---------- Text in frame: readable in-world text is never cut by the frame edge or covered by the set, and text
// runs never overlap or run off their own texture (ep 3: RACE'N'CHASE, FLOOR, the calendar, the road letters).
/** Text this tall (fraction of frame height) is meant to be read. */
const TEXT_READ = 0.03;
/** A run cut at the frame edge for this many frames fails (a pan may slide past text briefly). */
const TEXT_CUT_RUN = 8;
/** Composition frames while captions are on screen (QAPlan sets it; the scene checks read it for "Text in frame"). */
let captionOn: Span | null = null;
const textCheck = (r: Report, shot: Shot, scene: Object3D, cams: PerspectiveCamera[]) => {
  const items: { mesh: Mesh; run: Run; W: number; H: number; w: number; h: number }[] = [];
  const setup: Shot = { ...shot, id: "setup", from: 0 };
  const seenCanvas = new Set<RunCanvas>();
  scene.traverseVisible((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    // In the texture, on any geometry (ep 3: THEFT AUTO ran off the box art): no run past the canvas edge.
    for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as { map?: { image?: RunCanvas } }[]) {
      const c = mt?.map?.image;
      if (!c?.__runs?.length || seenCanvas.has(c)) continue;
      seenCanvas.add(c);
      for (const run of c.__runs) if (run.x0 < -1 || run.y0 < -1 || run.x1 > c.width + 1 || run.y1 > c.height + 1) r.add("Text in frame", setup, 0, `"${run.text.slice(0, 24)}" (${m.name || m.parent?.name || "texture"})`, "drawn past its canvas edge: cut in the texture");
    }
    const mat = m.material as { map?: { image?: RunCanvas; repeat: { x: number; y: number } } } | undefined;
    const img = mat && !Array.isArray(mat) ? mat.map?.image : undefined;
    if (!img?.__runs?.length || m.geometry?.type !== "PlaneGeometry") return;
    if (mat!.map!.repeat.x !== 1 || mat!.map!.repeat.y !== 1) return;
    const { width: w, height: h } = (m.geometry as PlaneGeometry).parameters;
    for (const run of img.__runs) items.push({ mesh: m, run, W: img.width, H: img.height, w, h });
  });
  r.ran.add("Text in frame");
  if (!items.length) return;
  const label = (it: (typeof items)[number]) => `"${it.run.text.slice(0, 24)}" (${it.mesh.name || it.mesh.parent?.name || "text plane"})`;
  // In the texture: off the canvas edge, or two runs on top of each other.
  const byCanvas = new Map<RunCanvas, Run[]>();
  for (const it of items) {
    const c = (it.mesh.material as unknown as { map: { image: RunCanvas } }).map.image;
    byCanvas.set(c, [...(byCanvas.get(c) ?? []), it.run]);
  }
  for (const [, runs] of byCanvas)
    for (let i = 0; i < runs.length; i++)
      for (let j = i + 1; j < runs.length; j++) {
        const a = runs[i], b = runs[j];
        // The same word twice = a drop shadow or outline pass; single letters = a sign spelled letter by letter.
        if (a.text === b.text || a.text.trim().length < 2 || b.text.trim().length < 2) continue;
        const ov = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
        if (ov > 0.15 * Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0))) r.add("Text in frame", setup, 0, `"${a.text.slice(0, 16)}" vs "${b.text.slice(0, 16)}"`, "two text runs overlap in the texture");
      }
  // On screen, per frame.
  const ray = new Raycaster(), streak = new Map<string, number>();
  const world = (it: (typeof items)[number], u: number, v: number) => it.mesh.localToWorld(new Vector3((u / it.W - 0.5) * it.w, (0.5 - v / it.H) * it.h, 0));
  // Every 2nd frame: 5 samples along the run's middle line, each in frame or not and clear or covered by the set.
  // Not seen at all (behind a monitor, off screen, too small) = no problem; partly off the frame = cut; 2+ of the
  // in-frame samples covered by something nearer (cars over road letters, a pavement over a sign) = covered.
  const STEP = 2;
  for (let f = 0; f < cams.length; f += STEP) {
    const cam = cams[f];
    for (const it of items) {
      const { run } = it, key = label(it) + run.x0;
      const pts = [[run.x0, run.y0], [run.x1, run.y0], [run.x0, run.y1], [run.x1, run.y1]].map(([u, v]) => screen(cam, world(it, u, v)));
      const x0 = Math.min(...pts.map((q) => q.x)), x1 = Math.max(...pts.map((q) => q.x)), y0 = Math.min(...pts.map((q) => q.y)), y1 = Math.max(...pts.map((q) => q.y));
      const facing = it.mesh.getWorldDirection(new Vector3()).dot(cam.position.clone().sub(it.mesh.getWorldPosition(new Vector3()))) > 0;
      if (!pts.every((q) => q.front) || !facing || x1 < 0 || x0 > 1 || y1 < 0 || y0 > 1 || y1 - y0 < TEXT_READ) { streak.set(key, 0); continue; }
      let inFrame = 0, clear = 0, covered = 0, by = "";
      for (const u of [0.05, 0.3, 0.5, 0.7, 0.95]) {
        const p = world(it, run.x0 + u * (run.x1 - run.x0), (run.y0 + run.y1) / 2), s = screen(cam, p);
        if (s.x < 0 || s.x > 1 || s.y < 0 || s.y > 1) continue;
        inFrame++;
        const dir = p.clone().sub(cam.position), dist = dir.length();
        ray.set(cam.position, dir.normalize());
        ray.far = dist + 0.05;
        const hit = ray.intersectObject(scene, true).find((h) => h.object.visible && !(h.object as Sprite).isSprite);
        if (hit && hit.object !== it.mesh && hit.distance < dist - 0.02) { covered++; by = hit.object.name || hit.object.parent?.name || "a set piece"; }
        else clear++;
      }
      if (!clear) { streak.set(key, 0); continue; }
      const vis = ((Math.min(x1, 1) - Math.max(x0, 0)) * (Math.min(y1, 1) - Math.max(y0, 0))) / ((x1 - x0) * (y1 - y0));
      if (vis < 0.95 && vis > 0.15) { // under 15 %: a sliver entering the frame reads as off screen
        const n = (streak.get(key) ?? 0) + STEP;
        streak.set(key, n);
        if (n >= TEXT_CUT_RUN) for (let g = Math.max(0, f - (n === TEXT_CUT_RUN ? n : STEP) + 1); g <= Math.min(f + STEP - 1, cams.length - 1); g++) r.add("Text in frame", shot, g, label(it), `cut by the frame edge (${(vis * 100).toFixed(0)} % visible): reframe or move the text`);
        continue;
      }
      streak.set(key, 0);
      if (covered >= 2) for (let g = f; g < Math.min(f + STEP, cams.length); g++) r.add("Text in frame", shot, g, label(it), `covered by ${by} (${covered} of ${inFrame} samples): move the text or the cover`);
      // Under the burned-in captions: two texts on top of each other (ep 3: "GTA" over GTA?, "18 months" over 18 MONTHS!).
      const F = (shot.from ?? 0) + f;
      if (captionOn && F >= captionOn[0] && F <= captionOn[1] && y0 < CAPTION_Y[1] && y1 > CAPTION_Y[0] && x1 > 0.2 && x0 < 0.8)
        for (let g = f; g < Math.min(f + STEP, cams.length); g++) r.add("Text in frame", shot, g, label(it), `sits in the caption band (y ${y0.toFixed(2)}-${y1.toFixed(2)}): the caption covers it; raise the text or reframe`);
    }
  }
};
/** "w x h x d m at (x, y, z)" in the collider's own frame (x across, y up, z toward its front for buildings). */
const partInfo = (p: Part) => {
  const c = p.root.worldToLocal(p.obb.center.clone()), h = p.obb.halfSize;
  return `${(2 * h.x).toFixed(2)}x${(2 * h.y).toFixed(2)}x${(2 * h.z).toFixed(2)} m at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`;
};
/** Deepest corner of either box inside the other (m), as a hint of how bad an intersection is. */
const depth = (a: OBB, b: OBB) => {
  let d = 0;
  for (const [p, q] of [[a, b], [b, a]] as const) {
    const inv = new Matrix4().setFromMatrix3(q.rotation).transpose();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const c = new Vector3(sx, sy, sz).multiply(p.halfSize).applyMatrix3(p.rotation).add(p.center).sub(q.center).applyMatrix4(inv);
      d = Math.max(d, Math.min(q.halfSize.x - Math.abs(c.x), q.halfSize.y - Math.abs(c.y), q.halfSize.z - Math.abs(c.z)));
    }
  }
  return d;
};
const isUnder = (o: Object3D, root: Object3D) => {
  for (let p: Object3D | null = o; p; p = p.parent) if (p === root) return true;
  return false;
};
const bodyBox = (c: CastSpec, f: number, cam: PerspectiveCamera) => {
  const p = c.at(f), k = card(c, f), yaw = cardYaw(p, cam.position);
  const r = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pts = [[-1, 0], [1, 0], [1, 1], [-1, 1]].map(([i, j]) => screen(cam, p.clone().addScaledVector(r, (i * k.w) / 2).setY(p.y + j * k.top)));
  return { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) };
};

// ---------- plan checks (camera keys, cast functions, words, lights)

const planChecks = (plan: Plan, fps: number, aspect: number) => {
  const r = new Report();
  const W = 1080, H = W / aspect;
  // Pacing, whole plan: the mean shot stays at or under MEAN_SHOT frames (refs cut every 2-3 s).
  const mean = plan.shots.reduce((t, x) => t + x.frames, 0) / Math.max(plan.shots.length, 1);
  if (plan.shots.length > 1 && mean > MEAN_SHOT) r.add("Pacing", plan.shots[0], 0, "plan", `mean shot ${(mean / fps).toFixed(1)} s (max ${(MEAN_SHOT / fps).toFixed(1)} s): more, shorter shots`);
  for (const shot of plan.shots) {
    const from = shot.from ?? 0, n = shot.frames, cast = shot.cast ?? [];
    const poses = Array.from({ length: n }, (_, f) => shot.pose(f));
    const cams = poses.map((p) => camera(p, aspect));

    // Camera curve: screen motion of what is under the frame centre, and zoom rate.
    if (n > 1) {
      r.ran.add("Camera curve");
      const v: [number, number][] = [], z: number[] = [];
      const scale = (p: CamPose) => 1 / (Math.tan((p.fov * Math.PI) / 360) * p.pos.distanceTo(p.look));
      for (let f = 0; f < n - 1; f++) {
        const s = screen(cams[f + 1], poses[f].look);
        v.push([(s.x - 0.5) * W, (s.y - 0.5) * H]);
        z.push((scale(poses[f + 1]) / scale(poses[f]) - 1) * 100);
      }
      const sp = v.map(([x, y]) => Math.hypot(x, y));
      const planned = (f: number) => inSpans(f, shot.whips, 2) || inSpans(f, shot.kicks, 2);
      for (let f = 0; f < n - 1; f++) {
        if (!planned(f)) {
          if (sp[f] > MAX_SPEED) r.add("Camera curve", shot, f, "camera", `screen speed ${sp[f].toFixed(1)} px/f (max ${MAX_SPEED} outside whips)`);
          if (f > 0) {
            const dv = Math.hypot(v[f][0] - v[f - 1][0], v[f][1] - v[f - 1][1]), dz = Math.abs(z[f] - z[f - 1]);
            if (dv > MAX_ACCEL) r.add("Camera curve", shot, f, "camera", `acceleration ${dv.toFixed(1)} px/f per frame (max ${MAX_ACCEL})`);
            if (dz > MAX_ZOOM) r.add("Camera curve", shot, f, "camera zoom", `zoom rate changes ${dz.toFixed(2)} %/f per frame (max ${MAX_ZOOM})`);
          }
          if (f >= 3 && Math.abs(sp[f] - sp[f - 3]) > SNAP) r.add("Camera curve", shot, f, "camera", `speed changes ${Math.abs(sp[f] - sp[f - 3]).toFixed(1)} px/f in 3 frames (snap)`);
        }
      }
    }

    // Subject in frame.
    const subj = cast.find((c) => c.name === shot.subject);
    if (shot.subject && !subj) r.add("Subject in frame", shot, 0, `"${shot.subject}"`, "subject is not in the shot's cast");
    if (subj) {
      r.ran.add("Subject in frame");
      cams.forEach((cam, f) => {
        if (f < (shot.subjectFrom ?? 0) || inSpans(f, shot.whips, 0)) return; // a whip-pan swings the subject out on purpose
        const b = headBox(subj, f, cam);
        if (!b.front || b.x0 < SAFE_X[0] || b.x1 > SAFE_X[1] || b.y0 < 0 || b.y1 > 1)
          r.add("Subject in frame", shot, f, `"${subj.name}" head`, `head box x ${b.x0.toFixed(2)}-${b.x1.toFixed(2)}, y ${b.y0.toFixed(2)}-${b.y1.toFixed(2)} (needs x in ${SAFE_X.join("-")}, y in 0-1)`);
      });
    }

    // Subject size (zombie pilot critique: faces carry the joke; speakers framed as specks lost it): the subject's head
    // is at least SUBJECT_MIN of the frame width on the median frame, unless the shot is marked `wide`.
    if (subj && !shot.wide) {
      r.ran.add("Subject size");
      const w = cams.map((cam, f) => (f < (shot.subjectFrom ?? 0) ? NaN : headBox(subj, f, cam))).filter((b): b is ReturnType<typeof headBox> => typeof b === "object" && b.front).map((b) => b.x1 - b.x0).sort((a, b) => a - b);
      const med = w.length ? w[Math.floor(w.length / 2)] : 0;
      if (med < SUBJECT_MIN) r.add("Subject size", shot, 0, `"${subj.name}" head`, `median head width ${(med * 100).toFixed(0)} % of the frame (min ${SUBJECT_MIN * 100} %): frame closer (MCU/CU), use telephoto(), or mark the shot \`wide\``);
    }

    // Pacing (critique: 5 s holds while the punchline was spoken): a shot runs at most MAX_SHOT frames.
    r.ran.add("Pacing");
    if (shot.frames > MAX_SHOT) r.add("Pacing", shot, 0, "shot length", `${(shot.frames / fps).toFixed(1)} s (max ${(MAX_SHOT / fps).toFixed(1)} s): cut on the punch word, split it`);

    // Static hold (R27 report: moon's beach held one composition while only captions changed): no HOLD_MAX frames
    // without a visible change. Counted as changes: a face or new effect, a real gesture (a hand travels, the body
    // leans, sits or turns; breathing and idle sway do not count), someone moving 0.4 m, a story prop moving 0.25 m or
    // appearing, a reframe (look point 20 % across the frame or 25 % zoom; a creep does not reach it).
    if (n > HOLD_MAX) {
      r.ran.add("Static hold");
      const movers = (shot.moving ?? []).map((m) => ({ m, obj: m.make() }));
      const propAt = (f: number) => movers.map(({ m, obj }) => (m.pose(obj, from + f) === false || !obj.visible ? null : obj.getWorldPosition(new Vector3())));
      const scale = (p: CamPose) => 1 / (Math.tan((p.fov * Math.PI) / 360) * p.pos.distanceTo(p.look));
      const big = (a: CharState["pose"], b: CharState["pose"]) =>
        [0, 1].some((k) => Math.hypot(a.arms[k].at[0] - b.arms[k].at[0], a.arms[k].at[1] - b.arms[k].at[1]) > 0.35) ||
        Math.abs(a.sway - b.sway) > 8 || Math.abs(a.bob - b.bob) > 12 || Math.abs(a.look - b.look) > 0.5 ||
        Math.abs((a.sit ?? 0) - (b.sit ?? 0)) > 0.5 || Math.abs((a.yaw ?? 0) - (b.yaw ?? 0)) > 40 || Math.max(...a.lift.map((x, k) => Math.abs(x - b.lift[k]))) > 0.3;
      let last = 0, ref = { states: cast.map((c) => c.state(0)), at: cast.map((c) => c.at(0)), props: propAt(0), cam: poses[0] };
      for (let f = 1; f < n; f++) {
        const states = cast.map((c) => c.state(f)), props = propAt(f), cam = poses[f], s = screen(cams[f], ref.cam.look);
        const changed =
          states.some((x, k) => x.expr !== ref.states[k].expr || Object.keys(x.fx).some((e) => !(e in ref.states[k].fx)) || big(x.pose, ref.states[k].pose)) ||
          cast.some((c, k) => c.at(f).distanceTo(ref.at[k]) > 0.4) ||
          props.some((q, k) => (q === null) !== (ref.props[k] === null) || (q && ref.props[k] && q.distanceTo(ref.props[k]!) > 0.25)) ||
          Math.hypot(s.x - 0.5, s.y - 0.5) > 0.2 || Math.abs(scale(cam) / scale(ref.cam) - 1) > 0.25;
        if (changed) { last = f; ref = { states, at: cast.map((c) => c.at(f)), props, cam }; }
        else if (f - last === HOLD_MAX) r.add("Static hold", shot, last, "shot", `nothing visibly changes for ${(HOLD_MAX / fps).toFixed(0)}+ s (frames ${last}-${f}): a face, a gesture, a prop or the world must act on the words`);
      }
    }

    // Cast overlap: a nearer card never covers another character's face (cards are flat: two people in one line of
    // sight read as one blob). Stage them apart on screen or crop one out.
    if (cast.length > 1) {
      r.ran.add("Cast overlap");
      cams.forEach((cam, f) => {
        for (const a of cast)
          for (const b of cast) {
            if (a === b || a.at(f).distanceTo(cam.position) >= b.at(f).distanceTo(cam.position)) continue;
            const hb = headBox(b, f, cam), ba = bodyBox(a, f, cam);
            if (!hb.front || hb.x1 < 0 || hb.x0 > 1 || hb.y1 < 0 || hb.y0 > 1) continue;
            const k = covered(ba, hb);
            if (k > FACE_COVER) r.add("Cast overlap", shot, f, `"${a.name}" over "${b.name}" face`, `covers ${(k * 100).toFixed(0)} % of the face (max ${FACE_COVER * 100} %)`);
          }
      });
    } else r.na["Cast overlap"] = "fewer than two characters";

    // Caption vs face: while a caption is on screen, no head in the caption band.
    if (plan.words?.length && cast.length) {
      r.ran.add("Caption vs face");
      const w = plan.words, on = [w[0].start * fps, (w[w.length - 1].end + 0.3) * fps];
      cams.forEach((cam, f) => {
        if (from + f < on[0] || from + f > on[1]) return;
        for (const c of cast) {
          const b = headBox(c, f, cam);
          if (b.front && b.y0 < CAPTION_Y[1] && b.y1 > CAPTION_Y[0] && b.x1 > 0 && b.x0 < 1)
            r.add("Caption vs face", shot, f, `"${c.name}" head`, `head y ${b.y0.toFixed(2)}-${b.y1.toFixed(2)} overlaps the caption band ${CAPTION_Y.join("-")}`);
        }
      });
    }
    // Overlays (stamps) never sit on a face (ep 3: "1994" on Mike's head).
    if (plan.overlays?.length && cast.length) {
      r.ran.add("Caption vs face");
      cams.forEach((cam, f) => {
        for (const o of plan.overlays!) {
          if (from + f < o.from || from + f > o.to) continue;
          for (const c of cast) {
            const b = headBox(c, f, cam);
            if (b.front && covered({ x0: o.x[0], x1: o.x[1], y0: o.y[0], y1: o.y[1] }, b) > 0.05) r.add("Caption vs face", shot, f, `${o.name} over "${c.name}" head`, "a 2D overlay covers the face: move the overlay (Stamp `top`) or reframe");
          }
        }
      });
    }

    // Reaction timing: expression swaps and new gag effects land 0-3 frames before a word starts.
    if (cast.length) {
      if (!plan.words?.length) r.na["Reaction timing"] = "no words.json (no narration)";
      else {
        r.ran.add("Reaction timing");
        const starts = plan.words.map((x) => Math.round(x.start * fps));
        for (const c of cast)
          for (let f = 0; f < n; f++) {
            const a = c.state(f - 1), b = c.state(f);
            const fx = Object.keys(b.fx).filter((k) => !(k in a.fx));
            if (a.expr === b.expr && !fx.length) continue;
            const what = [a.expr !== b.expr ? `expression ${a.expr} -> ${b.expr}` : "", ...fx.map((k) => `fx ${k}`)].filter(Boolean).join(", ");
            const lead = starts.map((s) => s - (from + f)).filter((d) => d >= 0).sort((x, y) => x - y)[0];
            if (lead === undefined || lead > 3) r.add("Reaction timing", shot, f, `"${c.name}"`, `${what} lands ${lead === undefined ? "after the last word" : `${lead} frames before the next word`} (needs 0-3)`);
          }
      }
    }
  }

  // Caption width: every caption group fits in CAPTION.maxLines lines inside CAPTION.maxWidth (no word wider than a
  // line: it could not wrap and would run off-frame). Measured with the drawn font, outline included.
  if (plan.words?.length) {
    r.ran.add("Caption width");
    const ctx = document.createElement("canvas").getContext("2d")!;
    const size = CAPTION.size * 1080, max = CAPTION.maxWidth * 1080, pad = CAPTION.stroke * 1080;
    ctx.font = `900 ${size}px ${CAPTION_FONT}`;
    const at = (ms: number) => plan.shots.find((s) => (ms / 1000) * fps < (s.from ?? 0) + s.frames) ?? plan.shots[0];
    for (const p of captionPages(plan.words)) {
      const words = p.tokens.map((t) => t.text.replace(/\*/g, "").trim());
      let lines = 1, line = 0;
      for (const w of words) {
        const ww = ctx.measureText(w).width + pad, space = ctx.measureText(" ").width;
        if (ww > max) r.add("Caption width", at(p.startMs), 0, `caption "${w}"`, `word is ${(ww / 1080).toFixed(2)} W wide (max ${CAPTION.maxWidth} W): cannot wrap`);
        if (line && line + space + ww > max) (lines++, (line = ww));
        else line += (line ? space : 0) + ww;
      }
      if (lines > CAPTION.maxLines) r.add("Caption width", at(p.startMs), 0, `caption "${words.join(" ")}"`, `wraps to ${lines} lines (max ${CAPTION.maxLines})`);
    }
  } else r.na["Caption width"] = "no words.json (no captions)";

  // Light continuity across shots with the same scene tag.
  r.ran.add("Light continuity");
  const groups = new Map<string, Shot[]>();
  for (const s of plan.shots) {
    if (!s.scene || !s.light || !s.sun) {
      r.add("Light continuity", s, 0, "shot", "missing scene, light or sun in the plan");
      continue;
    }
    groups.set(s.scene, [...(groups.get(s.scene) ?? []), s]);
  }
  for (const [scene, list] of groups) {
    const a = list[0], ea = GRADE[LIGHTS[a.light!].grade].exposure ?? 1;
    for (const b of list.slice(1)) {
      const eb = GRADE[LIGHTS[b.light!].grade].exposure ?? 1;
      const deg = (a.sun!.angleTo(b.sun!) * 180) / Math.PI;
      if (a.light !== b.light) r.add("Light continuity", b, 0, `scene "${scene}"`, `light ${b.light} vs ${a.light} in "${a.id}"`);
      if (deg > 10) r.add("Light continuity", b, 0, `scene "${scene}"`, `sun ${deg.toFixed(1)} deg from "${a.id}" (max 10)`);
      if (Math.abs(eb / ea - 1) > 0.05) r.add("Light continuity", b, 0, `scene "${scene}"`, `exposure ${eb} vs ${ea}`);
    }
  }
  return r;
};

/** Layer 2 plan (video_qa.py): cuts and dissolves from the shot timing, whips/kicks/flash in composition frames. */
export const exportPlan = (plan: Plan) => {
  const shots = [...plan.shots].sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
  const cuts: number[] = [], xfade: Span[] = [];
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1], b = shots[i], end = (a.from ?? 0) + a.frames, s = b.from ?? 0;
    if (s < end) xfade.push([s, end]);
    else cuts.push(s);
  }
  // An insert is a hard cut in and out (pilot review: the x-ray's cuts showed as unplanned POPs).
  for (const [a, b] of plan.inserts ?? []) cuts.push(a, b);
  for (const [a, b] of plan.xfades ?? []) {
    xfade.push([a, b]);
    const i = cuts.indexOf(a);
    if (i >= 0) cuts.splice(i, 1);
  }
  cuts.sort((x, y) => x - y);
  const abs = (k: "whips" | "kicks" | "flash") => shots.flatMap((s) => (s[k] ?? []).map(([a, b]) => [a + (s.from ?? 0), b + (s.from ?? 0)] as Span));
  return { cuts, xfade, flash: abs("flash"), kicks: abs("kicks"), whips: abs("whips"), shots: shots.map((s) => ({ id: s.id, from: s.from ?? 0, frames: s.frames, scene: s.scene })) };
};

/** Mount once at the composition root: runs the plan checks for every shot and publishes the plan. */
export const QAPlan: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { fps, width, height } = useVideoConfig();
  const done = useRef(false);
  useLayoutEffect(() => {
    if (done.current) return;
    done.current = true;
    if (getInputProps().qa === "off") return; // this round's full-frame QA already ran (stills/render --no-guard)
    const w = plan.words;
    captionOn = w?.length ? [w[0].start * fps, (w[w.length - 1].end + 0.3) * fps] : null;
    emit("plan", plan.slug, planChecks(plan, fps, width / height), { slug: plan.slug, plan: exportPlan(plan) });
  }, [plan, fps, width, height]);
  return null;
};

/**
 * The camera for one shot (mount inside its own Sequence so the frame is shot-local): applies `pose(frame)` every
 * frame and, once per mount, runs the scene checks over the whole shot.
 */
const prevCam = new PerspectiveCamera();
export const ShotCamera: React.FC<Shot> = (shot) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const checked = useRef(false);
  // A passive effect: runs after every layout effect of the commit (ToonWorld adds the key light in one).
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (getInputProps().qa === "off") return;
    emit("shot", shot.id, sceneChecks(shot, scene, width / height));
  }, [scene, shot, width, height]);
  useLayoutEffect(() => {
    applyCam(camera, shot.pose(frame));
    // Last frame's view-projection, for the Composer's camera motion blur (frame-driven, so renders in any order).
    applyCam(prevCam, shot.pose(frame - 1));
    prevCam.aspect = camera.aspect;
    prevCam.updateProjectionMatrix();
    prevCam.updateMatrixWorld(true);
    camera.userData.prevVP = new Matrix4().multiplyMatrices(prevCam.projectionMatrix, prevCam.matrixWorldInverse);
  }, [frame, camera, shot]);
  return null;
};
