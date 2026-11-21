import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import INDEX from "../../../public/models/index.json";
import { toonMaterial } from "../shade";
import { repaint } from "./photo";

/**
 * R26 asset library: CC0 Poly Haven models (scripts/polyhaven.py -> public/models/<id>/, credited in assets/CREDITS.md),
 * shaded by the kit's world shader (toonMaterial: same light, haze and grade as everything else) with their own diffuse,
 * normal and ARM maps. The refs' sets are dense with modelled props (visual-ref9 barrels and stools, ref10 the locomotive,
 * video-standard the mine's crates and lanterns); box-built props read as blocks next to them.
 *
 *   model("wooden_crate_01", { height: 0.5 })                  // whole model, 0.5 m tall, origin at its base centre
 *   model("flood_lights", { part: "flood_lights_standing_double_a", glow: ["glass", "#fff2d8", 6] })
 *
 * The returned Group is a QA collider (`userData.collider`) with an invisible hull box from public/models/index.json, so
 * kit/toon/guard.tsx sees the prop from the first frame; the frame waits (delayRender) until the glTF has loaded.
 */
type Box = [number[], number[]];
type Entry = { min: number[]; max: number[]; nodes: Record<string, Box> };
const index = INDEX as unknown as Record<string, Entry>;

export type ModelOpts = {
  /** Keep only root nodes whose name starts with this (collections: one barrel, one floodlight stand). */
  part?: string;
  /** Uniform scale so the kept part is this tall (m). Default: real size (Poly Haven models are in metres). */
  height?: number;
  scale?: number;
  /** Multiplies the diffuse (warm/cool a prop to the scene). */
  tint?: string;
  /** Materials whose name contains `match` glow: [match, colour, strength] (lamp glass, a screen). */
  glow?: [string, string, number];
  /** Collider name for QA (default: the model id); false = wall-hung dressing the guard should not rest on the ground. */
  collider?: string | false;
};

const cache = new Map<string, Promise<GLTF>>();
const load = (id: string) => {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = new GLTFLoader().loadAsync(staticFile(`models/${id}/${id}.gltf`));
  cache.set(id, p);
  return p;
};

/** Union of the kept root nodes' boxes (the whole model without `part`). */
export const modelBox = (id: string, part?: string) => {
  const e = index[id];
  if (!e) throw new Error(`model ${id}: not in public/models/index.json (run scripts/polyhaven.py model ${id})`);
  const b = new Box3();
  for (const [name, [lo, hi]] of Object.entries(e.nodes)) if (!part || name.startsWith(part)) b.union(new Box3(new Vector3(...lo), new Vector3(...hi)));
  if (b.isEmpty()) throw new Error(`model ${id}: no node starts with "${part}"`);
  return b;
};

export const model = (id: string, o: ModelOpts = {}) => {
  const box = modelBox(id, o.part);
  const size = box.getSize(new Vector3());
  const s = o.height ? o.height / size.y : (o.scale ?? 1);
  const g = new Group();
  g.name = id;
  if (o.collider !== false) g.userData.collider = o.collider ?? id;
  // Inner frame: the kept part's base centre sits at the group origin.
  const inner = new Group();
  inner.scale.setScalar(s);
  inner.position.set(-(box.min.x + size.x / 2) * s, -box.min.y * s, -(box.min.z + size.z / 2) * s);
  g.add(inner);
  const hull = new Mesh(new BoxGeometry(size.x * s, size.y * s, size.z * s), new MeshBasicMaterial());
  hull.position.set(0, (size.y * s) / 2, 0);
  hull.visible = false;
  hull.name = `${id} hull`;
  if (o.collider !== false) g.add(hull);
  const handle = delayRender(`model ${id}`);
  load(id)
    .then((gltf) => {
      for (const root of gltf.scene.children) {
        if (o.part && !root.name.startsWith(o.part)) continue;
        const c = root.clone(true);
        c.traverse((m: Object3D) => {
          const mesh = m as Mesh;
          if (!mesh.isMesh) return;
          const src = mesh.material as MeshStandardMaterial;
          const glow = o.glow && src.name.includes(o.glow[0]) ? ([o.glow[1], o.glow[2]] as [string, number]) : undefined;
          mesh.material = toonMaterial({
            map: src.map,
            color: o.tint ?? "#ffffff",
            normalMap: src.normalMap,
            normalScale: src.normalScale?.x ?? 1,
            arm: src.roughnessMap ?? src.aoMap,
            rough: src.roughness ?? 0.75,
            bump: 0,
            emissive: glow,
          });
          mesh.castShadow = mesh.receiveShadow = true;
        });
        inner.add(c);
      }
      repaint();
      continueRender(handle);
    })
    .catch((e) => cancelRender(new Error(`model ${id}: ${e}`)));
  return g;
};
