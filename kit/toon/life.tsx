import { useMemo } from "react";
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";

/**
 * R15 (review r4 "empty backgrounds, nothing moving in the holds"): a flock of small inked birds crossing the sky,
 * flapping, in loose V order. Frame-driven (f = composition frame), so every render and the QA guard agree.
 * `from`/`to`: the flight line (world, m); one pass takes `period` frames, then the flock comes round again.
 */
export const Birds: React.FC<{ f: number; from: Vector3; to: Vector3; count?: number; period?: number; color?: string; size?: number }> = ({
  f, from, to, count = 9, period = 420, color = "#2a2030", size = 0.55,
}) => {
  const flock = useMemo(() => {
    const g = new Group(), mat = new MeshBasicMaterial({ color });
    for (let i = 0; i < count; i++) {
      const b = new Group();
      for (const s of [-1, 1]) {
        const wing = new Mesh(new BoxGeometry(size, size * 0.09, size * 0.12), mat);
        wing.position.x = (s * size) / 2;
        const pivot = new Group().add(wing);
        pivot.userData.side = s;
        b.add(pivot);
      }
      g.add(b);
    }
    return g;
  }, [count, color, size]);
  const dir = to.clone().sub(from), side = new Vector3(-dir.z, 0, dir.x).normalize();
  flock.children.forEach((b, i) => {
    const row = Math.ceil(i / 2), s = i % 2 ? 1 : -1; // V: the leader, then pairs behind on both sides
    const t = (((f + i * 3) % period) / period);
    b.position.copy(from).addScaledVector(dir, t).addScaledVector(dir.clone().normalize(), -row * size * 2.2)
      .addScaledVector(side, s * row * size * 1.8).add(new Vector3(0, 0.25 * Math.sin(f * 0.05 + i), 0));
    b.lookAt(b.position.clone().add(dir));
    const flap = 0.55 * Math.sin(f * 0.55 + i * 1.3);
    b.children.forEach((p) => (p.rotation.z = p.userData.side * flap));
  });
  return <primitive object={flock} />;
};
