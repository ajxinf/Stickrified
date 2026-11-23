import { AdditiveBlending, BoxGeometry, ConeGeometry, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, Path, PlaneGeometry, RingGeometry, Shape, TorusGeometry } from "three";
import { Kit, M } from "../../../kit/toon/build/kit";
import { model } from "../../../kit/toon/build/models";
import { lightPatch } from "../../../kit/toon/glow";
import { SKY } from "../../../kit/toon/ink";
import { toonMaterial } from "../../../kit/toon/shade";
import { MATS, V, boardTex, canvasTex, colMat, glowMat, litTex, place, plane, rnd, slab, unlit } from "./common";

/**
 * The basement two floors under the diamond centre: a corridor from the stairs (z +10) past the guard desk to the
 * round vault door (z 0, facing +z), and the vault room behind it (z < 0) lined with safe-deposit boxes.
 *   Lighting idea: night (heist) = the fluorescents off, one cold blue emergency light over the door, the red alarm
 *   LEDs, the crew's flashlights; then the open door spills warm gold from the vault room (the payoff light). Day
 *   (visits, the guard) = the fluorescents on, cool-white, with the guard's warm desk lamp as the one warm pool.
 *   Materials: floor (concrete_floor_painted, glossy), walls (concrete_block_wall, a darker painted band below 1 m),
 *   ceiling (grey_plaster), the door, frame and boxes (metal_plate steel), the desk (Poly Haven metal_office_desk).
 */
export const CORR = { x0: -2.2, x1: 2.2, z0: 0, z1: 10.5, h: 2.8 };
export const ROOM = { x0: -3, x1: 3, z0: -7.2, z1: -0.6, h: 2.6 };
export const DOOR = V(0, 1.3, 0); // centre of the round door on the wall face
export const DOOR_R = 1.12;
export const HINGE = V(-1.16, 1.3, 0.05);
export const SENSOR = V(1.98, 2.32, 1.7); // heat / motion sensor on the right wall, lens toward -x and down
export const LIGHT_S = V(-2.17, 1.12, 2.8); // light sensor on the left wall (faces +x)
export const RADAR = V(0, 2.76, 3.4);
export const MAG = V(1.4, 1.95, 0.04); // magnet block on the wall beside the door's free edge
export const LADDER = V(1.45, 0, 1.75);
export const DESK = V(1.0, 0, 7.6); // guard desk, long side along z, front toward -x
export const GUARD_SEAT = V(1.62, 0, 7.55);
export const CALENDAR = V(2.17, 1.62, 6.55);
export const STAIRS_Z = 9.6;
export const EMERGENCY = V(0, 2.62, 0.45);
/** Box grid on the vault room's left wall that opens during line 19 (row-major, index = row * COLS + col). */
export const BOX = { rows: 8, cols: 18, y0: 0.32, dy: 0.27, z0: -6.85, dz: 0.33, w: 0.3, h: 0.24 };

const dialTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = "#c8ccd2"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#9aa0a8"; g.beginPath(); g.arc(256, 256, 150, 0, 7); g.fill();
  g.fillStyle = "#1c1c22"; g.font = "800 34px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < 100; i++) {
    const a = (i / 100) * Math.PI * 2 - Math.PI / 2, r0 = i % 10 ? 222 : 205;
    g.strokeStyle = "#1c1c22"; g.lineWidth = i % 10 ? 3 : 6;
    g.beginPath(); g.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); g.lineTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246); g.stroke();
    if (i % 10 === 0) g.fillText(String(i), 256 + Math.cos(a) * 180, 256 + Math.sin(a) * 180);
  }
  g.fillStyle = "#e8eaee"; g.beginPath(); g.arc(256, 256, 60, 0, 7); g.fill();
});
const boxFaceTex = () => canvasTex(128, 104, (g) => {
  g.fillStyle = "#b8bcc4"; g.fillRect(0, 0, 128, 104);
  g.strokeStyle = "#7a7e86"; g.lineWidth = 5; g.strokeRect(3, 3, 122, 98);
  g.fillStyle = "#e8d8a8"; g.fillRect(14, 14, 40, 18); // brass number plate
  g.fillStyle = "#3a3a40"; g.beginPath(); g.arc(92, 54, 12, 0, 7); g.fill(); // key lock
  g.fillStyle = "#d8dce2"; g.fillRect(20, 62, 46, 22); // three-letter combination wheels
  g.fillStyle = "#2a2a30"; for (let i = 0; i < 3; i++) g.fillRect(24 + i * 15, 66, 10, 14);
});

/** The round door, a child of a hinge pivot so `open` 0..1 swings it into the corridor (name "vaultDoor"). */
const vaultDoor = () => {
  const pivot = new Group();
  pivot.name = "vaultDoor";
  pivot.position.copy(HINGE);
  const d = new Group();
  d.position.set(-HINGE.x, 0, 0.22);
  pivot.add(d);
  const steel = MATS.steel(), dark = MATS.darkSteel();
  const disc = new Mesh(new CylinderGeometry(DOOR_R, DOOR_R, 0.42, 64).rotateX(Math.PI / 2), steel);
  d.add(disc);
  const k = new Kit();
  k.add(steel, new TorusGeometry(DOOR_R - 0.06, 0.05, 10, 64), 0, 0, 0.22);
  k.add(dark, new TorusGeometry(0.62, 0.025, 8, 48), 0, 0, 0.22);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.add(steel, new CylinderGeometry(0.035, 0.035, 0.05, 12).rotateX(Math.PI / 2), Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.23); }
  k.add(dark, new CylinderGeometry(0.15, 0.15, 0.08, 24).rotateX(Math.PI / 2), 0, -0.12, 0.25); // handle hub
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; k.add(steel, new CylinderGeometry(0.03, 0.03, 0.62, 10).rotateZ(a), Math.cos(a + Math.PI / 2) * 0.3, -0.12 + Math.sin(a + Math.PI / 2) * 0.3, 0.3); }
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5 + Math.PI / 2; k.add(dark, new CylinderGeometry(0.05, 0.05, 0.05, 12).rotateX(Math.PI / 2), Math.cos(a) * 0.6, -0.12 + Math.sin(a) * 0.6, 0.3); }
  // bolts on the free edge (they slide into the frame)
  for (const y of [-0.5, 0, 0.5]) k.add(steel, new CylinderGeometry(0.06, 0.06, 0.3, 12).rotateZ(Math.PI / 2), DOOR_R + 0.02, y, 0);
  k.add(dark, new BoxGeometry(0.16, 0.16, 0.06), DOOR_R - 0.08, 0.65, 0.22); // the door's magnet block (line 17)
  d.add(k.build());
  const dial = new Mesh(new CylinderGeometry(0.17, 0.17, 0.06, 48).rotateX(Math.PI / 2), M("adh-dial", () => toonMaterial({ map: dialTex(), color: "#ffffff", spec: 0.5, rough: 0.35 })));
  dial.position.set(0, 0.5, 0.26);
  dial.name = "dial";
  d.add(dial);
  // the dial's pointer mark on the door above it
  d.add(place(new Mesh(new ConeGeometry(0.025, 0.05, 3).rotateZ(Math.PI), colMat("#c8342c")), 0, 0.71, 0.23));
  pivot.userData.collider = false;
  pivot.userData.door = 2.24;
  pivot.userData.opens = true;
  return pivot;
};

/** The vault wall with the round opening, its steel frame, and the ten security rings painted round it (line 4). */
const doorWall = () => {
  const g = new Group();
  const s = new Shape();
  s.moveTo(CORR.x0, 0); s.lineTo(CORR.x1, 0); s.lineTo(CORR.x1, CORR.h); s.lineTo(CORR.x0, CORR.h); s.lineTo(CORR.x0, 0);
  const hole = new Path(); hole.absarc(DOOR.x, DOOR.y, DOOR_R + 0.05, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const geo = new ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: false });
  geo.translate(0, 0, -0.6);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  const wall = new Mesh(geo, MATS.block());
  wall.userData.collider = "vault wall";
  g.add(wall);
  g.add(place(new Mesh(new TorusGeometry(DOOR_R + 0.12, 0.09, 12, 64), MATS.steel()), DOOR.x, DOOR.y, 0.02));
  g.add(place(new Mesh(new CylinderGeometry(DOOR_R + 0.05, DOOR_R + 0.05, 0.6, 64, 1, true).rotateX(Math.PI / 2), MATS.darkSteel()), DOOR.x, DOOR.y, -0.3));
  // the fixed magnet block on the frame (line 17) and its cable
  g.add(place(new Mesh(new BoxGeometry(0.16, 0.16, 0.08), MATS.darkSteel()), MAG.x, MAG.y, MAG.z));
  g.add(place(new Mesh(new CylinderGeometry(0.012, 0.012, 0.85, 6), colMat("#2a2a30")), MAG.x + 0.05, MAG.y + 0.5, 0.03));
  // ten rings (hidden until line 4): concentric holograms round the door
  for (let k = 0; k < 10; k++) {
    const r = DOOR_R + 0.26 + k * 0.085;
    const m = new Mesh(new RingGeometry(r, r + 0.03, 96), new MeshBasicMaterial({ color: k % 2 ? "#ff4a3a" : "#5ad8ff", transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.position.set(DOOR.x, DOOR.y, 0.04);
    m.name = `ring${k}`;
    m.visible = false;
    m.layers.set(SKY);
    g.add(m);
  }
  // sign over the door
  g.add(plane(1.3, 0.3, unlit("sign-vault", () => boardTex(["KLUIS · VAULT"], "#1e3a5a", "#f2f2ea", 1024, 236)), V(0, 2.6, 0.02)));
  return g;
};

const sensorBox = () => {
  const g = new Group();
  g.position.copy(SENSOR);
  const body = new Mesh(new BoxGeometry(0.12, 0.13, 0.17), colMat("#eeece6", { rough: 0.5 }));
  g.add(body);
  const lens = new Mesh(new CylinderGeometry(0.045, 0.05, 0.03, 20).rotateZ(Math.PI / 2), colMat("#6a2a2a", { spec: 0.8, gloss: 0.7, rough: 0.1 }));
  lens.position.set(-0.075, -0.02, 0);
  g.add(lens);
  const led = new Mesh(new BoxGeometry(0.01, 0.015, 0.015), glowMat("#ff2a1a", 6));
  led.position.set(-0.062, 0.045, 0.05);
  led.name = "heatLed";
  g.add(led);
  // hairspray film on the lens (line 1 on): a pale glaze
  const fog = new Mesh(new CylinderGeometry(0.052, 0.052, 0.004, 20).rotateZ(Math.PI / 2), new MeshBasicMaterial({ color: "#f4f0ff", transparent: true, opacity: 0.6, depthWrite: false }));
  fog.position.set(-0.093, -0.02, 0);
  fog.name = "sensorFog";
  fog.visible = false;
  g.add(fog);
  // its red detection cone (line 4), pointing down the corridor
  const cone = new Mesh(new ConeGeometry(1.4, 3.2, 32, 1, true), new MeshBasicMaterial({ color: "#ff5a3a", transparent: true, opacity: 0.07, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }));
  cone.rotation.z = -Math.PI / 2 - 0.55;
  cone.position.set(-1.35, -0.9, 0.4);
  cone.name = "heatCone";
  cone.visible = false;
  cone.layers.set(SKY);
  g.add(cone);
  g.userData.collider = false;
  return g;
};

const lightSensor = () => {
  const g = new Group();
  g.position.copy(LIGHT_S);
  g.add(new Mesh(new BoxGeometry(0.05, 0.1, 0.08), colMat("#2a2a30", { rough: 0.4 })));
  const eye = new Mesh(new CylinderGeometry(0.018, 0.018, 0.01, 16).rotateZ(Math.PI / 2), glowMat("#4aff7a", 5));
  eye.position.set(0.03, 0.01, 0);
  eye.name = "lightLed";
  g.add(eye);
  const tape = new Mesh(new BoxGeometry(0.008, 0.06, 0.12), colMat("#c8b890", { rough: 0.8 }));
  tape.position.set(0.032, 0.005, 0);
  tape.name = "tapeStrip";
  tape.visible = false;
  g.add(tape);
  return g;
};

/** Radar dome on the ceiling + three ripple rings (scaled by the scene, line 4). */
const radar = () => {
  const g = new Group();
  g.position.copy(RADAR);
  g.add(new Mesh(new CylinderGeometry(0.14, 0.16, 0.05, 24), colMat("#e8e6e0")));
  g.add(place(new Mesh(new CylinderGeometry(0.1, 0.12, 0.06, 24), colMat("#3a3a44", { spec: 0.6 })), 0, -0.05, 0));
  for (let k = 0; k < 3; k++) {
    const r = new Mesh(new RingGeometry(0.9, 1.0, 64), new MeshBasicMaterial({ color: "#7af0ff", transparent: true, opacity: 0.5, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }));
    r.rotation.x = Math.PI / 2;
    r.position.y = -0.1;
    r.name = `ripple${k}`;
    r.visible = false;
    r.layers.set(SKY);
    g.add(r);
  }
  return g;
};

/** Blue field between the two magnet blocks (line 4 / 17) and the aluminium plate taped over them (line 17). */
const magnets = () => {
  const g = new Group();
  const field = new Mesh(new PlaneGeometry(0.5, 0.34), new MeshBasicMaterial({ map: canvasTex(128, 96, (c) => {
    const r = c.createRadialGradient(64, 48, 4, 64, 48, 60);
    r.addColorStop(0, "rgba(140,220,255,1)"); r.addColorStop(0.5, "rgba(60,150,255,0.55)"); r.addColorStop(1, "rgba(40,100,255,0)");
    c.fillStyle = r; c.fillRect(0, 0, 128, 96);
    c.strokeStyle = "rgba(200,240,255,0.9)"; c.lineWidth = 3;
    for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(14, 48); c.quadraticCurveTo(64, 48 + k * 34, 114, 48); c.stroke(); }
  }), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  field.position.set(MAG.x - 0.19, MAG.y, 0.12);
  field.name = "magField";
  field.visible = false;
  field.layers.set(SKY);
  g.add(field);
  const plate = new Mesh(new BoxGeometry(0.52, 0.22, 0.012), M("adh-alu", () => toonMaterial({ color: "#d8dce4", spec: 0.9, gloss: 0.6, rough: 0.2 })));
  plate.position.set(MAG.x - 0.18, MAG.y, 0.13);
  plate.name = "alPlate";
  plate.visible = false;
  g.add(plate);
  const tape = new Mesh(new BoxGeometry(0.06, 0.26, 0.016), colMat("#c8b890", { rough: 0.8 }));
  tape.position.set(MAG.x - 0.02, MAG.y, 0.135);
  tape.name = "alTape";
  tape.visible = false;
  g.add(tape);
  return g;
};

/** Calendar on the wall behind the guard: page `k` (Video swaps the material). */
export const CAL_PAGES = [["FEB 2003", "15"], ["MAR 2001", "5"], ["MAR 2001", "15"], ["JUL 2002", "18"], ["FEB 2003", "21"]] as const;
export const calendarMat = (k: number) => litTex(`cal-${k}`, () => canvasTex(360, 460, (c) => {
  const [m, d] = CAL_PAGES[k];
  c.fillStyle = "#f6f2ea"; c.fillRect(0, 0, 360, 460);
  c.fillStyle = "#c8342c"; c.fillRect(0, 0, 360, 110);
  c.fillStyle = "#ffffff"; c.font = "900 64px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(m, 180, 58);
  c.fillStyle = "#1c1c22"; c.font = "900 220px sans-serif"; c.fillText(d, 180, 290);
  if (k === 0) { // the heist weekend: a red heart drawn round the 15th
    c.strokeStyle = "#e0243a"; c.lineWidth = 12;
    c.beginPath(); c.moveTo(180, 440); c.bezierCurveTo(-40, 290, 40, 110, 180, 200); c.bezierCurveTo(320, 110, 400, 290, 180, 440); c.stroke();
  }
}), { rough: 0.9 });

export const vault = (withLadder = false) => {
  const g = new Group();
  const { x0, x1, z0, z1, h } = CORR;
  g.add(slab(x0, x1, z0, z1, 0, MATS.vaultFloor()));
  g.add(slab(ROOM.x0, ROOM.x1, ROOM.z0, ROOM.z1, 0, MATS.vaultFloor()));
  const k = new Kit(), B = MATS.block(), BD = MATS.blockDark(), C = MATS.plaster("#c8ccc8");
  for (const x of [x0 - 0.06, x1 + 0.06]) { k.box(B, 0.12, h - 1.0, z1 - z0, x, 1.0 + (h - 1.0) / 2, (z0 + z1) / 2); k.box(BD, 0.13, 1.0, z1 - z0, x, 0.5, (z0 + z1) / 2); }
  k.box(C, x1 - x0 + 0.24, 0.1, z1 - z0, 0, h + 0.05, (z0 + z1) / 2);
  k.box(B, x1 - x0, h, 0.12, 0, h / 2, z1 + 0.06);
  // stairs up at the far end
  for (let i = 0; i < 8; i++) k.box(MATS.vaultFloor(), 1.6, 0.18 * (i + 1), 0.3, -1.1, 0.09 * (i + 1), STAIRS_Z - 0.3 + i * 0.12 + 0.6);
  k.box(MATS.steel(), 0.05, 0.05, 2.2, -0.28, 0.95, STAIRS_Z + 0.5); // handrail
  // pipes and a cable tray along the ceiling
  k.add(MATS.darkSteel(), new CylinderGeometry(0.06, 0.06, z1 - z0, 12).rotateX(Math.PI / 2), 1.6, h - 0.18, (z0 + z1) / 2);
  k.add(MATS.steel(), new CylinderGeometry(0.035, 0.035, z1 - z0, 10).rotateX(Math.PI / 2), 1.42, h - 0.14, (z0 + z1) / 2);
  k.box(MATS.darkSteel(), 0.4, 0.04, z1 - z0, -1.5, h - 0.2, (z0 + z1) / 2);
  // vault room: walls, ceiling
  const R = ROOM;
  k.box(MATS.darkSteel(), 0.12, R.h, R.z1 - R.z0, R.x0 - 0.06, R.h / 2, (R.z0 + R.z1) / 2);
  k.box(MATS.darkSteel(), 0.12, R.h, R.z1 - R.z0, R.x1 + 0.06, R.h / 2, (R.z0 + R.z1) / 2);
  k.box(MATS.darkSteel(), R.x1 - R.x0, R.h, 0.12, 0, R.h / 2, R.z0 - 0.06);
  k.box(C, R.x1 - R.x0 + 0.24, 0.1, R.z1 - R.z0, 0, R.h + 0.05, (R.z0 + R.z1) / 2);
  // the boxes: right and back walls are one merged grid; the left wall's doors open (separate meshes below)
  const face = M("adh-boxface", () => toonMaterial({ map: boxFaceTex(), color: "#ffffff", spec: 0.6, rough: 0.35 }));
  for (let r = 0; r < BOX.rows; r++) for (let c = 0; c < BOX.cols; c++) {
    k.box(face, 0.02, BOX.h, BOX.w, R.x1 - 0.02, BOX.y0 + r * BOX.dy, BOX.z0 + c * BOX.dz, false);
    if (c < 16) k.box(face, BOX.w, BOX.h, 0.02, -2.6 + c * BOX.dz, BOX.y0 + r * BOX.dy, R.z0 + 0.02, false);
  }
  const walls = k.build();
  walls.userData.collider = "vault";
  g.add(walls);
  const doors = new Group();
  doors.name = "boxDoors";
  doors.userData.door = BOX.h;
  doors.userData.opens = true;
  const recess = colMat("#15161a");
  for (let r = 0; r < BOX.rows; r++) for (let c = 0; c < BOX.cols; c++) {
    const zc = BOX.z0 + c * BOX.dz, y = BOX.y0 + r * BOX.dy;
    g.add(plane(BOX.w - 0.02, BOX.h - 0.02, recess, V(R.x0 + 0.005, y, zc), Math.PI / 2));
    const hinge = new Group();
    hinge.position.set(R.x0 + 0.02, y, zc + BOX.w / 2);
    const door = new Mesh(new BoxGeometry(0.02, BOX.h, BOX.w), face);
    door.position.z = -BOX.w / 2;
    hinge.add(door);
    hinge.name = `box${r * BOX.cols + c}`;
    hinge.userData.door = BOX.h;
    hinge.userData.opens = true;
    doors.add(hinge);
  }
  g.add(doors);
  g.add(doorWall(), vaultDoor(), sensorBox(), lightSensor(), radar(), magnets());
  // corridor dressing: fluorescent fittings, a camera, signs, a fire hose box, the emergency light
  for (const z of [2.4, 5.4, 8.4]) g.add(place(model("mounted_fluorescent_lights", { collider: false, scale: 1.2 }), 0, h - 0.04, z));
  const cam = model("security_camera_01", { collider: false, scale: 1.1 });
  cam.position.set(-2.05, 2.45, 1.2); cam.rotation.y = 2.4;
  g.add(cam);
  const ladder = place(model("wooden_ladder", { collider: "ladder", height: 1.8 }), LADDER.x, 0, LADDER.z, Math.PI / 2);
  ladder.name = "ladder";
  if (withLadder) g.add(ladder);
  g.add(plane(0.5, 0.36, unlit("sign-auth", () => boardTex(["ALLEEN BEVOEGD", "STAFF ONLY"], "#f2c23a", "#1c1c22", 720, 520)), V(-2.15, 1.75, 5.2), Math.PI / 2));
  g.add(plane(0.4, 0.4, unlit("sign-level", () => boardTex(["-2"], "#1e3a5a", "#ffffff", 400, 400)), V(-2.15, 1.9, 8.8), Math.PI / 2));
  g.add(place(new Mesh(new BoxGeometry(0.5, 0.6, 0.18), colMat("#c8342c", { rough: 0.5 })), -2.1, 1.25, 6.6, Math.PI / 2));
  g.add(place(new Mesh(new BoxGeometry(0.3, 0.12, 0.08), glowMat("#9fd8ff", 2.2)), EMERGENCY.x, EMERGENCY.y, EMERGENCY.z));
  // the guard post: desk, lamp, chair, a monitor, the calendar
  g.add(place(model("metal_office_desk", { collider: "desk" }), DESK.x, 0, DESK.z, -Math.PI / 2));
  g.add(place(model("desk_lamp_arm_01", { collider: false, scale: 0.9 }), DESK.x + 0.15, 0.79, DESK.z + 0.7, -1.9));
  g.add(place(model("painted_wooden_chair_01", { collider: "chair" }), GUARD_SEAT.x + 0.4, 0, GUARD_SEAT.z, -Math.PI / 2)); // front (-0.27) 13 cm behind the seated card
  g.add(place(new Mesh(new BoxGeometry(0.42, 0.32, 0.3), colMat("#2a2c32", { spec: 0.4 })), DESK.x + 0.15, 0.95, DESK.z - 0.8, -Math.PI / 2));
  g.add(place(new Mesh(new PlaneGeometry(0.36, 0.26), unlit("cctv", () => canvasTex(256, 192, (c) => {
    c.fillStyle = "#1a2a2a"; c.fillRect(0, 0, 256, 192); c.strokeStyle = "#6a9a8a"; c.lineWidth = 3;
    c.beginPath(); c.arc(128, 100, 60, 0, 7); c.stroke(); c.strokeRect(20, 20, 216, 152);
    c.fillStyle = "#9ad8c0"; c.font = "700 18px monospace"; c.fillText("CAM 2  KLUIS", 28, 40);
  }))), DESK.x - 0.01, 0.96, DESK.z - 0.8, -Math.PI / 2));
  const cal = plane(0.36, 0.46, calendarMat(1), CALENDAR, -Math.PI / 2);
  cal.name = "calendar";
  g.add(cal);
  // vault room: warm strip lights (only lit once the door opens: the scene sets their glow)
  for (const z of [-2, -4.5, -6.5]) {
    const strip = new Mesh(new BoxGeometry(1.6, 0.04, 0.12), glowMat("#ffd89a", 3.5));
    strip.position.set(0, ROOM.h - 0.03, z);
    g.add(strip);
  }
  // the warm spill on the corridor floor (scaled by the scene with the door)
  const spill = lightPatch(V(0, 0.012, 1.4), V(0, 1, 0), 2.2, 2.6, "#ffcf7a", 0.7, [1, 1], 0);
  spill.name = "spill";
  spill.visible = false;
  g.add(spill);
  g.add(gems());
  // a crew flashlight on the right wall during the heist (scene.tsx sweeps it)
  const torch = lightPatch(V(0, 0, 0), V(-1, 0, 0), 0.9, 0.7, "#ffe6b0", 0.55, [1, 1], 0);
  const t = new Group();
  t.add(torch);
  t.name = "torch";
  t.visible = false;
  g.add(t);
  return g;
};

/** The floor of the vault after line 19: gems, gold and papers piled toward the open boxes (name "loot"). */
const gems = () => {
  const g = new Group();
  g.name = "loot";
  g.visible = false;
  const n = 1400;
  const gm = new InstancedMesh(new OctahedronGeometry(0.022, 0), M("adh-gem", () => toonMaterial({ color: "#e8f4ff", emissive: ["#bfe4ff", 0.9], spec: 1, gloss: 0.9, rough: 0.05 })), n);
  const gold = new InstancedMesh(new BoxGeometry(0.05, 0.012, 0.03), M("adh-gold", () => toonMaterial({ color: "#f2c23a", emissive: ["#c89020", 0.4], spec: 0.9, rough: 0.2 })), 260);
  const paper = new InstancedMesh(new PlaneGeometry(0.16, 0.11), colMat("#f2ece0", { rough: 0.9 }), 90);
  const o = new Object3D();
  const spot = (i: number, s: number) => {
    // heaped toward the left wall (the opened boxes), thinning toward the door
    const x = ROOM.x0 + 0.15 + Math.pow(rnd(i * 3 + s), 1.6) * 5.6, z = ROOM.z0 + 0.4 + rnd(i * 5 + s + 1) * 6.0;
    const heap = Math.max(0, 1 - (x - ROOM.x0) / 4.5);
    return V(x, 0.012 + rnd(i * 7 + s + 2) * 0.13 * heap, z);
  };
  for (let i = 0; i < n; i++) { o.position.copy(spot(i, 0)); o.rotation.set(rnd(i) * 6, rnd(i + 9) * 6, 0); o.scale.setScalar(0.6 + rnd(i + 4) * 0.9); o.updateMatrix(); gm.setMatrixAt(i, o.matrix); }
  for (let i = 0; i < 260; i++) { o.position.copy(spot(i, 50)); o.rotation.set(0, rnd(i + 3) * 6, 0); o.scale.setScalar(1); o.updateMatrix(); gold.setMatrixAt(i, o.matrix); }
  for (let i = 0; i < 90; i++) { o.position.copy(spot(i, 90)).setY(0.014 + rnd(i) * 0.05); o.rotation.set(-Math.PI / 2, 0, rnd(i + 1) * 6); o.updateMatrix(); paper.setMatrixAt(i, o.matrix); }
  for (const m of [gm, gold, paper]) { m.userData.ground = true; g.add(m); }
  return g;
};
