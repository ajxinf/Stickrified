import { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, DoubleSide, Group, Mesh, PlaneGeometry, Points, ShaderMaterial, Sprite, SpriteMaterial, Vector3 } from "three";
import { SKY } from "./ink";

/**
 * R27 (report §2/§5/§8: Ref3's dust and beams, effects that show cause and effect): fire life. `Flames` are soft noise
 * tongues (not glowing cones: the R27 test's cones blew out to white). Embers rise from a fire
 * all the time; `burst` (a composition frame) throws a spray of sparks out and up (a log lands, a kick); smoke climbs,
 * leans with the wind, spreads and thins, warm at the base where the fire lights it. All frame-driven (F), colour pass
 * only (SKY layer, depth-tested so walls hide it). Use only where a fire or impact motivates it.
 */
const vert = /* glsl */ `
uniform float uT, uBurst, uPx;
attribute vec4 aSeed;
attribute float aKind;
varying float vA, vHeat;
void main() {
  vec3 p = position;
  float a = 0.0, heat = 1.0;
  if (aKind < 0.5) {
    // Stream: each ember lives 1.8 s, rises ~1.6 m, swirls, cools from yellow to red, winks out.
    float L = 1.8, t = mod(uT + aSeed.x * L, L), u = t / L;
    p += vec3(sin(t * 3.0 + aSeed.y * 6.3) * 0.18 * u + (aSeed.z - 0.5) * 0.35, t * (0.7 + 0.5 * aSeed.w), cos(t * 2.6 + aSeed.z * 6.3) * 0.18 * u + (aSeed.y - 0.5) * 0.3);
    a = smoothstep(0.0, 0.08, u) * (1.0 - u);
    heat = 1.0 - u;
  } else {
    // Burst: sparks fly out and up from uBurst, slow in the air, fall a little, fade over ~1.4 s.
    float t = (uT - uBurst);
    if (t > 0.0) {
      float ang = aSeed.x * 6.2832, up = 2.2 + 2.8 * aSeed.y, spread = 0.6 + 1.6 * aSeed.z;
      float s = (1.0 - exp(-t * 2.2)) / 2.2;
      p += vec3(cos(ang) * spread * s, up * s - 0.9 * t * t, sin(ang) * spread * s);
      a = (1.0 - smoothstep(0.5 + 0.9 * aSeed.w, 1.4 + 0.6 * aSeed.w, t)) * smoothstep(0.0, 0.03, t);
      heat = 1.0 - min(t / 1.6, 1.0);
    }
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uPx * (1.4 + 1.6 * aSeed.w) * 10.0 / -mv.z, 0.8 * uPx, 7.0 * uPx);
  vA = a;
  vHeat = heat;
}`;
const frag = /* glsl */ `
varying float vA, vHeat;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  vec3 c = mix(vec3(2.2, 0.45, 0.08), vec3(4.0, 2.6, 0.9), vHeat); // HDR: the hottest bloom
  gl_FragColor = vec4(c * vA * (1.0 - smoothstep(0.2, 1.0, r)), 1.0);
}`;

const rnd = (s: number) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

/** Embers over a fire at `at` (base of the flames), plus a spark spray at composition frame `burst`. */
export const Embers: React.FC<{ at: Vector3; F: number; burst?: number; count?: number; sparks?: number }> = ({ at, F, burst = -1e9, count = 70, sparks = 160 }) => {
  const { fps, height } = useVideoConfig();
  const pts = useMemo(() => {
    const n = count + sparks, r = rnd(91), seed = new Float32Array(n * 4), kind = new Float32Array(n), pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = r();
      kind[i] = i < count ? 0 : 1;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 4));
    g.setAttribute("aKind", new BufferAttribute(kind, 1));
    const m = new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uT: { value: 0 }, uBurst: { value: 0 }, uPx: { value: 1 } }, blending: AdditiveBlending, transparent: true, depthWrite: false });
    const p = new Points(g, m);
    p.frustumCulled = false;
    p.layers.set(SKY);
    return p;
  }, [count, sparks]);
  pts.position.copy(at);
  const u = (pts.material as ShaderMaterial).uniforms;
  u.uT.value = F / fps;
  u.uBurst.value = burst / fps;
  u.uPx.value = height / 960;
  return <primitive object={pts} />;
};

const puffTex = (() => {
  let t: CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!, r = rnd(5);
    // a lumpy soft puff: several offset radial blobs, not one perfect disc
    for (let k = 0; k < 7; k++) {
      const x = 64 + (r() - 0.5) * 40, y = 64 + (r() - 0.5) * 40, rad = 26 + r() * 26;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, "rgba(255,255,255,0.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
    }
    t = new CanvasTexture(c);
    return t;
  };
})();

/** A smoke column from `at`, leaning toward `wind` (m/s), `thick` 0-1 (a burst of thick smoke from `puffAt`). */
export const Smoke: React.FC<{ at: Vector3; F: number; wind?: Vector3; color?: string; base?: string; puffAt?: number; n?: number }> = ({ at, F, wind = new Vector3(0.35, 0, 0.1), color = "#8a93a8", base = "#d08a50", puffAt = -1e9, n = 22 }) => {
  const { fps } = useVideoConfig();
  const g = useMemo(() => {
    const grp = new Group(), r = rnd(17);
    for (let i = 0; i < n; i++) {
      const s = new Sprite(new SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, fog: true, rotation: r() * 6.28 }));
      s.layers.set(SKY);
      s.userData.k = [r(), r(), r()];
      grp.add(s);
    }
    return grp;
  }, [n]);
  const T = F / fps, L = 4.2, cBase = new Color(base), cTop = new Color(color);
  g.children.forEach((o, i) => {
    const s = o as Sprite, [a, b, c] = s.userData.k as number[], m = s.material as SpriteMaterial;
    const t = (T + (i / n) * L) % L, u = t / L, boost = Math.max(0, 1 - Math.abs(T - puffAt / fps - 0.6) / 1.2);
    s.position.set(at.x + wind.x * t + Math.sin(t * 1.3 + a * 6) * 0.12 * u, at.y + 0.35 + t * (0.55 + 0.2 * b) - 0.04 * t * t, at.z + wind.z * t + Math.cos(t * 1.1 + c * 6) * 0.12 * u);
    s.scale.setScalar((0.35 + 1.5 * u) * (1 + 0.3 * boost));
    m.opacity = Math.min(0.7, (0.38 + 0.3 * boost) * Math.sin(Math.PI * Math.min(u * 1.25, 1)) * (1 - u * 0.5));
    m.color.copy(cBase).lerp(cTop, Math.min(u * 2.2, 1));
    m.rotation = a * 6.28 + t * (b - 0.5) * 0.6;
  });
  return <primitive object={g} />;
};

const flameVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const flameFrag = /* glsl */ `
uniform float uT, uSeed, uK;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * n2(p); p *= 2.1; a *= 0.5; } return s; }
void main() {
  vec2 uv = vUv;
  // Tongues: noise scrolling up through a teardrop, licking sideways more toward the tips.
  float n = fbm(vec2(uv.x * 3.2 + uSeed * 7.0, uv.y * 2.6 - uT * 2.4));
  float x = uv.x - 0.5 + (n - 0.5) * 0.35 * uv.y;
  float w = 0.46 * pow(1.0 - uv.y, 0.8) + 0.02;
  float d = abs(x) / w;
  float body = (1.0 - smoothstep(0.45, 1.0, d)) * smoothstep(0.0, 0.1, uv.y) * (1.0 - smoothstep(0.35, 0.95, uv.y + (n - 0.5) * 0.55));
  float core = (1.0 - smoothstep(0.0, 0.55, d)) * (1.0 - smoothstep(0.1, 0.55, uv.y + (n - 0.5) * 0.3));
  vec3 col = mix(vec3(0.85, 0.16, 0.02), vec3(1.0, 0.5, 0.1), smoothstep(0.1, 0.8, body));
  col = mix(col, vec3(1.0, 0.85, 0.5), core * 0.85);
  gl_FragColor = vec4(col * body * uK, 1.0);
}`;

/** Fire tongues over `at` (the bed of the fire): `n` soft billboards with scrolling noise, red edges to a gold core,
 * HDR `k` (~1.7: five overlap, so the core blooms without going white). `grow` scales them (a log feeding the fire). */
export const Flames: React.FC<{ at: Vector3; F: number; grow?: number; n?: number; k?: number; size?: number }> = ({ at, F, grow = 0, n = 5, k = 1.7, size = 0.75 }) => {
  const { fps } = useVideoConfig();
  const g = useMemo(() => {
    const grp = new Group(), r = rnd(23);
    for (let i = 0; i < n; i++) {
      const m = new ShaderMaterial({ vertexShader: flameVert, fragmentShader: flameFrag, uniforms: { uT: { value: 0 }, uSeed: { value: r() }, uK: { value: k } }, blending: AdditiveBlending, transparent: true, depthWrite: false, side: DoubleSide });
      const q = new Mesh(new PlaneGeometry(1, 1).translate(0, 0.5, 0), m);
      q.layers.set(SKY);
      q.userData.o = [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3, 0.75 + 0.5 * r()];
      q.onBeforeRender = (_r, _s, cam) => {
        q.quaternion.copy(cam.quaternion);
        q.updateMatrixWorld();
        // Close to the lens the overlapping tongues stack up past white (R27 insert): dim them with distance.
        m.uniforms.uK.value = k * Math.min(Math.max(cam.position.distanceTo(q.position) / 5, 0.35), 1);
      };
      grp.add(q);
    }
    return grp;
  }, [n, k]);
  g.children.forEach((o, i) => {
    const q = o as Mesh, [dx, dz, s] = q.userData.o as number[], m = q.material as ShaderMaterial;
    const fl = 1 + 0.12 * Math.sin(F * 0.7 + i * 1.9) + 0.07 * Math.sin(F * 1.9 + i);
    q.position.set(at.x + dx * (1 + grow * 0.5), at.y, at.z + dz * (1 + grow * 0.5));
    q.scale.set(size * 0.7 * s * (1 + 0.25 * grow), size * s * fl * (1 + 0.6 * grow), 1);
    m.uniforms.uT.value = F / fps + i * 3.1;
  });
  return <primitive object={g} />;
};
