import { Mesh, PlaneGeometry, ShaderMaterial } from "three";
import type { Texture } from "three";

/**
 * A lit display that sits ON a device's glass (user 2026-11-22: the TV poll "looks like a flat image lazily overlaid
 * onto the television screen"). The content is mapped onto a grid bent to the glass (a CRT dome, or flat for a phone
 * or monitor), so it follows the screen's perspective and curvature; it glows a little past the bloom threshold,
 * carries scanlines, a hint of colour fringe, edge falloff, rounded corners and a faint glass reflection.
 *
 * Coordinates are the device model's own (add the mesh to `model()`'s inner group: `tv.children[0].add(screen)`), so the
 * model's scale, rotation and placement carry it. Measure the glass once by raycasting the model (episode notes).
 */
export type ScreenOpts = {
  /** Opening on the glass: centre x/y, width, height (model units), front at `z` (the glass peak at the centre). */
  x: number; y: number; w: number; h: number; z: number;
  /** Dome: the glass falls back by kx*dx^2 + ky*dy^2 from the centre (CRT); 0 for flat screens. */
  kx?: number; ky?: number;
  /** Measured glass height (model z) on a regular grid over the opening, rows bottom -> top; wins over z/kx/ky. A real
   * CRT is not a clean dome (television_02 sits up to 8 mm off the best quadratic), so measure it. */
  zMap?: number[][];
  /** Corner radius as a fraction of the height (CRT ~.12, phone ~.18). */
  corner?: number;
  /** Brightness; > 1 lets the brightest content bloom (Composer threshold 1.0). */
  gain?: number;
  /** Scanline count over the height (0 = none: LCD/phone). */
  lines?: number;
  /** Lift off the glass (model units) so the display never z-fights it. */
  lift?: number;
  /** +1 if the device's front faces model +z (default), -1 for -z. */
  front?: 1 | -1;
};

export const curvedScreen = (map: Texture, o: ScreenOpts) => {
  const { x, y, w, h, z, kx = 0, ky = 0, corner = 0.12, gain = 1.2, lines = 240, lift = 0.003, front = 1, zMap } = o;
  // bilinear lookup in the measured grid (u, v in 0..1 over the opening)
  const glass = (dx: number, dy: number) => {
    if (!zMap) return z - kx * dx * dx - ky * dy * dy;
    const ny = zMap.length - 1, nx = zMap[0].length - 1;
    const fx = Math.min(Math.max((dx / w + 0.5) * nx, 0), nx), fy = Math.min(Math.max((dy / h + 0.5) * ny, 0), ny);
    const i = Math.min(Math.floor(fx), nx - 1), j = Math.min(Math.floor(fy), ny - 1), a = fx - i, b = fy - j;
    return (zMap[j][i] * (1 - a) + zMap[j][i + 1] * a) * (1 - b) + (zMap[j + 1][i] * (1 - a) + zMap[j + 1][i + 1] * a) * b;
  };
  const geo = new PlaneGeometry(w, h, 32, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const dx = pos.getX(i), dy = pos.getY(i);
    pos.setXYZ(i, x + front * dx, y + dy, (glass(dx, dy) + lift) * front);
  }
  geo.computeVertexNormals();
  const mat = new ShaderMaterial({
    uniforms: { map: { value: map }, gain: { value: gain }, lines: { value: lines }, corner: { value: corner }, aspect: { value: w / h } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float gain, lines, corner, aspect;
      varying vec2 vUv;
      // signed distance to a rounded rect in a (aspect x 1) box
      float rrect(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
      void main() {
        vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
        float d = rrect(p, vec2(aspect, 1.0) * 0.5, corner);
        if (d > 0.0) discard;
        // CRT barrel: the picture bows a touch toward the corners
        vec2 c = vUv - 0.5; vec2 uv = 0.5 + c * (1.0 + 0.05 * dot(c, c));
        float fr = 0.0012;
        vec3 col = vec3(texture2D(map, uv + vec2(fr, 0.0)).r, texture2D(map, uv).g, texture2D(map, uv - vec2(fr, 0.0)).b);
        if (lines > 0.0) col *= 0.86 + 0.14 * sin(uv.y * lines * 3.14159);
        // edge falloff into the bezel, and the glass catching the room (a soft diagonal sheen, a darker rim)
        float edge = smoothstep(0.0, 0.09, -d);
        col *= mix(0.45, 1.0, edge);
        float sheen = smoothstep(0.32, 0.0, abs(c.x * 0.8 + c.y * 1.3 - 0.28)) * smoothstep(-0.1, 0.4, c.y);
        col += vec3(0.10, 0.11, 0.13) * sheen;
        gl_FragColor = vec4(col * gain, 1.0);
      }`,
  });
  mat.toneMapped = false;
  const m = new Mesh(geo, mat);
  m.name = "screen";
  return m;
};
