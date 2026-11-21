import { LOOK_FEATURES } from "./lookdev";
import { Color, Group, PointLight, ShaderMaterial, Texture, UniformsLib, UniformsUtils, Vector2, Vector3 } from "three";
import { GRADE, gradeState } from "./grade";
import { LightPreset, linear } from "./lights";
import { INK } from "./toon";

// Shared by every toon material, so one applyLight() relights the whole world.
export const shared = {
  uSunDir: { value: new Vector3(0, 1, 0) },
  uLit: { value: new Vector3(1, 1, 1) },
  uShade: { value: new Vector3(0.3, 0.3, 0.3) },
  uLift: { value: new Vector3() },
  uSat: { value: 1 },
  uHazeColor: { value: new Color() },
  uHazeStart: { value: 30 },
  uHazeAmount: { value: 0 },
  /** Character cards: scene light tint and street-shadow dimming (lights.ts `char`). */
  uCharTint: { value: new Vector3(1, 1, 1) },
  uCharShade: { value: 0.86 },
  /** Character ink: as drawn (toon.ts INK) and as this light shows it (lights.ts `charInk`); linear. */
  uInkFrom: { value: linear(INK) },
  uCharInk: { value: linear(INK) },
  /** World ink on concave contacts (ink.ts), per preset. */
  uContactInk: { value: 0.6 },
  /** Lit windows, lamp glass, signs: x this (lights.ts `glow`). */
  uEmissiveK: { value: 1 },
};

/** Practical light positions (world), for the lamp-thrown card shadow; the lights themselves are three PointLights. */
export const practicals: { pos: Vector3; reach: number }[] = [];

const W = [0.2126, 0.7152, 0.0722];
const luma = (v: number[]) => v[0] * W[0] + v[1] * W[1] + v[2] * W[2];

/**
 * Sunlit vs shade: lit is at most `litMax` (2.1) x the shade luma (measured day shade/lit ~0.5) (both pulled toward each other around their
 * geometric mean, so exposure holds), and its hue is pulled 75 % toward the preset's palette tint (peach at dusk,
 * not orange).
 */
export const litAndShade = (p: LightPreset) => {
  let lit = [...p.lit], shade = [...p.shade];
  const ratio = luma(lit) / luma(shade), max = p.litMax ?? 2.1;
  if (ratio > max) {
    const k = Math.sqrt(ratio / max);
    lit = lit.map((v) => v / k);
    shade = shade.map((v) => v * k);
  }
  if (p.litTint) {
    const t = linear(p.litTint), tv = [t.r, t.g, t.b], L = luma(lit), tl = luma(tv);
    lit = lit.map((v, i) => L * (0.25 * (v / L) + 0.75 * (tv[i] / tl)));
  }
  return { lit: lit as [number, number, number], shade: shade as [number, number, number] };
};

export const applyLight = (p: LightPreset, sunDir: Vector3) => {
  const { lit, shade } = litAndShade(p);
  shared.uSunDir.value.copy(sunDir).normalize();
  shared.uLit.value.set(...lit);
  shared.uShade.value.set(...shade);
  shared.uLift.value.set(...p.lift);
  shared.uSat.value = p.sat;
  shared.uHazeColor.value.copy(linear(p.haze.color));
  // lookdev "diorama": depth reads in layers (aerial haze starts nearer and goes further).
  // A+B: haze starts behind a subject at telephoto range (the diorama test washed out Chad at ~10 m with start 6 m).
  // R20 (visual-ref1-6): the refs keep a street's far end in colour (ref6 town hall, ref4 village, ref5 alley lights);
  // our diorama haze (from 14 m, up to .75) bleached everything past mid-ground to peach: the "milky" frame.
  // Depth now comes from light, DOF and value steps; the haze only cools the far distance.
  shared.uHazeStart.value = LOOK_FEATURES.haze ? Math.min(p.haze.start * 0.8, 24) : p.haze.start;
  // R25 real look (ref9: far tents and hills sink into blue air): haze may reach .6.
  shared.uHazeAmount.value = LOOK_FEATURES.haze ? Math.min(LOOK_FEATURES.real ? 0.6 : 0.4, p.haze.amount * 1.1 + 0.05) : p.haze.amount;
  shared.uCharTint.value.set(...p.char.tint);
  shared.uCharShade.value = p.char.shade;
  shared.uCharInk.value.copy(linear(p.charInk ?? INK));
  shared.uContactInk.value = p.contactInk ?? 0.6;
  shared.uEmissiveK.value = p.glow ?? 1;
  gradeState.current = GRADE[p.grade];
};

export type PracticalKind = "lamp" | "window" | "shop" | "fire" | "screen";
/** Reach (m) and strength (x the preset's lamp strength) per kind. */
// Reach up ~25 % (2026-11-13): pools wide enough to light a face and fall off across the frame, not a spot.
// screen: a monitor or TV, a short cool spill on the face in front of it (ep 3: monitors as "window" washed every face).
const PRACTICAL = { lamp: [5.5, 1], window: [3.6, 0.45], shop: [4.4, 0.6], fire: [5.0, 1.2], screen: [1.6, 0.4] } as const;

/**
 * Real point lights for practicals (lamps, lit windows, shop fronts, fires). They light the world and the character
 * cards with a plateau-then-edge falloff (see the shaders). Off when the preset has no `lamp`.
 */
export const practicalLights = (list: { pos: Vector3; kind: PracticalKind; color?: [string, number] }[], p: LightPreset) => {
  const g = new Group();
  practicals.length = 0;
  for (const { pos, kind, color } of list) {
    const [reach, k] = PRACTICAL[kind];
    // `color` overrides the preset lamp (e.g. a green exit sign that stays on when the power is off).
    const l = color ? new PointLight(color[0], color[1], reach, 0) : new PointLight(p.lamp?.[0] ?? "#000000", (p.lamp?.[1] ?? 0) * k, reach, 0);
    l.position.copy(pos);
    g.add(l);
    practicals.push({ pos: pos.clone(), reach });
  }
  return g;
};

/** GLSL: sum of practical point lights at a view-space point with view-space normal (soft falloff, no flat disc). */
export const POINT_LIGHTS = /* glsl */ `
vec3 practicalLight(vec3 vp, vec3 vn) {
  vec3 sum = vec3(0.0);
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    vec3 L = pointLights[i].position - vp;
    float r = length(L);
    float D = pointLights[i].distance;
    float f = 1.0 - smoothstep(0.0, D, r);
    sum += pointLights[i].color * f * (0.35 + 0.65 * max(dot(vn, L / max(r, 1e-3)), 0.0));
  }
  #endif
  return sum;
}`;

/** GLSL: aerial perspective, from uHazeStart m: desaturate and mix toward the horizon colour (up to uHazeAmount). */
export const AERIAL = /* glsl */ `
vec3 aerial(vec3 c, float dist) {
  float k = uHazeAmount * smoothstep(uHazeStart, uHazeStart * 3.0, dist);
  c = mix(c, vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), k * 0.8);
  return mix(c, uHazeColor, k);
}`;

const vertex = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
uniform vec2 uRepeat;
uniform float uOffset;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
varying vec3 vView;
varying vec3 vNV;
void main() {
  vUv = uv * uRepeat + vec2(uOffset, 0.0);
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  vN = inverseTransformDirection(transformedNormal, viewMatrix); // correct under non-uniform scale
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  vW = (modelMatrix * wp).xyz;
  vDist = length(mvPosition.xyz);
  vView = mvPosition.xyz;
  vNV = normalize(transformedNormal);
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
}`;

const fragment = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform vec3 uColor, uEmissive;
uniform sampler2D uMap, uNor, uArm;
uniform float uHasMap, uMute, uFloor, uMottle, uSpec, uGloss, uRough, uBump, uHasNor, uNorK, uHasArm, uReflect;
uniform vec3 uSunDir, uLit, uShade, uLift, uHazeColor;
uniform float uEmissiveK, uSat, uHazeStart, uHazeAmount, uWear, uWearC, uWearW;
uniform vec2 uRepeat;
varying vec3 vN;
varying vec3 vW;
varying vec2 vUv;
varying float vDist;
varying vec3 vView;
varying vec3 vNV;
${POINT_LIGHTS}
${AERIAL}
const vec3 W = vec3(0.2126, 0.7152, 0.0722);
// three.js perturbNormal2Arb: a tangent-space normal map on any mesh, tangent frame from screen derivatives (no tangents).
vec3 perturb(vec3 pos, vec3 N, vec3 mapN) {
  vec3 q0 = dFdx(pos), q1 = dFdy(pos);
  vec2 st0 = dFdx(vUv), st1 = dFdy(vUv);
  vec3 q1p = cross(q1, N), q0p = cross(N, q0);
  vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;
  float det = max(dot(T, T), dot(B, B)), sc = det == 0.0 ? 0.0 : inversesqrt(det);
  return normalize(T * (mapN.x * sc) + B * (mapN.y * sc) + N * mapN.z);
}
float vh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(vh(i), vh(i + vec2(1, 0)), f.x), mix(vh(i + vec2(0, 1)), vh(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  vec3 a = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : vec3(1.0);
  if (uWear > 0.0) {
    // Worn path: smoother (blurred mip) and slightly polished where feet and wheels pass (uv.x = lateral metres).
    float k = uWear * (1.0 - smoothstep(uWearW * 0.5, uWearW, abs(vUv.x / uRepeat.x - uWearC)));
    a = mix(a, texture2D(uMap, vUv, 3.5).rgb * 1.06, k);
  }
  a = mix(a, vec3(dot(a, W)), uMute) * uColor;
  a = mix(vec3(uFloor), vec3(1.0), a);
  if (uMottle > 0.0) {
    // World-space tonal mottling: breaks the repeat of 2 m ground tiles (cobbles read as wallpaper without it).
    float m = 0.65 * vnoise(vW.xz * 0.23) + 0.35 * vnoise(vW.xz * 0.9 + 7.3);
    a *= 1.0 + uMottle * (m - 0.5) * 2.0;
  }
  vec3 n = normalize(vN);
  #ifdef REAL
  // R25 realistic world (visual-ref8/9): relief from the texture's own values (wood grain, sand ripples, shingles),
  // soft Lambert light with soft shadows, sky-above / ground-bounce ambient, a roughness highlight with Fresnel, and
  // practicals that pool and fall off like real lamps. uShade = the ambient (sky) light, uLit - uShade = the key.
  vec3 vnN = normalize(vNV);
  float ao = 1.0, rough = uRough;
  if (uHasArm > 0.5) {
    // Poly Haven ARM: R = ambient occlusion, G = roughness (B = metal: our props are painted, not bare metal).
    vec3 arm = texture2D(uArm, vUv).rgb;
    ao = mix(1.0, arm.r, 0.85);
    rough = clamp(mix(uRough, arm.g, 0.7), 0.06, 1.0);
  }
  if (uHasNor > 0.5) {
    // R26: real relief from the texture's normal map (visual-ref10 gravel, standard-ref mine rock and planks).
    vec3 mapN = texture2D(uNor, vUv).xyz * 2.0 - 1.0;
    mapN.xy *= uNorK;
    float face = gl_FrontFacing ? 1.0 : -1.0;
    n = perturb(vW, n * face, mapN);
    vnN = perturb(vView, vnN * face, mapN);
  } else if (uHasMap > 0.5 && uBump > 0.0) {
    // Relief from a blurred mip (bias 2): per-pixel derivatives of fine grain (sand) flipped the light pixel by pixel.
    float hgt = dot(texture2D(uMap, vUv, 2.0).rgb, W);
    vec2 dH = vec2(dFdx(hgt), dFdy(hgt)) * uBump * 0.5;
    vec3 sx = dFdx(vW), sy = dFdy(vW), r1 = cross(sy, n), r2 = cross(n, sx);
    float det = dot(sx, r1);
    n = normalize(abs(det) * n - sign(det) * (dH.x * r1 + dH.y * r2));
    vec3 vx = dFdx(vView), vy = dFdy(vView), q1 = cross(vy, vnN), q2 = cross(vnN, vx);
    float vdet = dot(vx, q1);
    vnN = normalize(abs(vdet) * vnN - sign(vdet) * (dH.x * q1 + dH.y * q2));
  }
  float ndl = dot(n, uSunDir);
  float t = clamp(ndl, 0.0, 1.0);
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  // Calibrated on the presets (tuned for the two-tone look): ground facing up gets the old lit value (the key divided
  // by the light's own elevation), walls and slopes fall off with the angle; ambient keeps the old shade level.
  vec3 key = max(uLit - uShade, vec3(0.0)) / max(uSunDir.y, 0.35);
  vec3 amb = uShade * mix(0.7, 1.2, n.y * 0.5 + 0.5) * ao; // sky light from above, darker bounce from below
  vec3 c = a * (amb + key * t) + uLift * (1.0 - t);
  {
    vec3 V = normalize(-vView), L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz), H = normalize(L + V);
    float r = max(rough, 0.08), a2 = r * r * r * r;
    float ndh = max(dot(vnN, H), 0.0), dd = ndh * ndh * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159 * dd * dd);
    float F = 0.04 + 0.96 * pow(1.0 - max(dot(V, H), 0.0), 5.0);
    c += key * min(D * F * 0.25, 4.0) * t;
    float rim = pow(1.0 - max(dot(vnN, V), 0.0), 4.0); // grazing sheen: surfaces catch the sky at the edges
    c += amb * a * rim * 0.35 * (1.0 - r * 0.5);
    c *= mix(1.0, ao, 0.35); // crevices stay a little dark in the key too
  }
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    vec3 Lp = pointLights[i].position - vView;
    float rr = length(Lp), Dp = pointLights[i].distance;
    float fall = pow(1.0 - smoothstep(0.0, Dp, rr), 2.0) * 2.6; // a bright pool near the lamp, a soft long tail (world only: cards keep the glare-calibrated light)
    vec3 Ln = Lp / max(rr, 1e-3);
    c += a * pointLights[i].color * fall * (0.08 + 0.92 * max(dot(vnN, Ln), 0.0));
    vec3 Hp = normalize(Ln + normalize(-vView));
    float rp = max(rough, 0.08), ap = rp * rp * rp * rp, dp = pow(max(dot(vnN, Hp), 0.0), 2.0) * (ap - 1.0) + 1.0;
    c += pointLights[i].color * fall * min(ap / (3.14159 * dp * dp) * 0.04, 2.0);
  }
  #endif
  #else
  // Two tones: a hard (1-2 px soft) terminator between lit and shade, then cast shadows.
  float t = smoothstep(-0.03, 0.03, dot(n, uSunDir));
  #ifdef USE_SHADOWMAP
  t *= getShadowMask();
  #endif
  vec3 c = a * mix(uShade, uLit, t) + uLift * (1.0 - t);
  // Practicals: real point lights (lamps, windows, fires).
  c += a * practicalLight(vView, normalize(vNV));
  #endif
  #ifndef REAL
  if (uSpec > 0.0) {
    // One soft toon highlight on metal (lighting.md 6: only metal props have specular), sunlit side only.
    vec3 V = normalize(-vView), L = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
    float s = pow(max(dot(normalize(vNV), normalize(L + V)), 0.0), 36.0);
    c += uLit * uSpec * smoothstep(0.3, 0.55, s) * t;
  }
  #endif
  if (uGloss > 0.0) {
    // R20 (visual-ref5 wet street, ref6 saloon boards): a polished or wet floor mirrors the practicals and a low sun as
    // soft streaks that run toward the lens (a grazing Blinn lobe stretches them on its own).
    vec3 V = normalize(-vView), N = normalize(vNV), g = vec3(0.0);
    #if NUM_POINT_LIGHTS > 0
    for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
      vec3 L = pointLights[i].position - vView;
      float r = length(L);
      g += pointLights[i].color * pow(max(dot(N, normalize(L / max(r, 1e-3) + V)), 0.0), 40.0) * (1.0 - smoothstep(0.0, pointLights[i].distance * 2.5, r));
    }
    #endif
    vec3 Ls = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
    g += uLit * 0.16 * pow(max(dot(N, normalize(Ls + V)), 0.0), 80.0) * t; // a narrow glare path, not a wash
    c += uGloss * g;
  }
  #ifdef REAL
  if (uReflect > 0.0) {
    // R27 water (opt-in): the sky in the ripples by Fresnel, the fog (horizon) colour low, darker overhead, so ripples
    // read as moving bands of sky tone instead of a flat mirror colour.
    vec3 Vw = normalize(cameraPosition - vW), R = reflect(-Vw, n);
    float fr = 0.02 + 0.98 * pow(1.0 - max(dot(n, Vw), 0.0), 5.0);
    c = mix(c, fogColor * mix(1.0, 0.45, clamp(R.y * 1.6, 0.0, 1.0)), clamp(fr * uReflect, 0.0, 1.0));
  }
  #endif
  c = max(mix(vec3(dot(c, W)), c, uSat), 0.0);
  c = aerial(c, vDist);
  c += uEmissive * a * uEmissiveK; // HDR glow keeps the map's frames and mullions dark
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

export type ToonOpts = {
  color?: string;
  map?: Texture | null;
  /** UV multiplier (map tiles per face). */
  repeat?: [number, number];
  mute?: number;
  floor?: number;
  /** HDR self-light: colour and strength (strength > 1 feeds the bloom). */
  emissive?: [string, number];
  /** Lateral texture offset (in tiles), e.g. to centre a painted road on its axis. */
  offset?: number;
  /** Worn smoother path along uv.y, centred at uv.x = center (m), `width` m wide (ground ribbons). */
  wear?: { center: number; width: number; amount: number };
  /** World-space tonal mottling, +- this fraction (ground: hides the tile repeat). */
  mottle?: number;
  /** Soft toon highlight strength (metal only). */
  spec?: number;
  /** Wet/polished floor: mirrored streaks of the practicals and the sun, 0-1. */
  gloss?: number;
  /** R25 real look: surface roughness 0 (mirror) .. 1 (chalk). Default .75; metal .35, wet/sea .15-.25. */
  rough?: number;
  /** R25 real look: relief from the map's values (0 = flat). Default 1 for photo textures, 0 for painted ones. */
  bump?: number;
  /** R26 real look: tangent-space normal map (OpenGL convention). Default: the photo texture's own (build/photo.ts). */
  normalMap?: Texture | null;
  /** Normal map strength (default 1). */
  normalScale?: number;
  /** R26 real look: Poly Haven ARM map (R AO, G roughness). Default: the photo texture's own. */
  arm?: Texture | null;
  /** R27 real look: Fresnel sky reflection 0-1 (water; needs fog for the sky colour). Default 0. */
  reflect?: number;
};

/** Two-tone toon material. `mute` (0-1) pulls the map toward grey, then `color` tints it; `floor` lifts its darkest value. */
export const toonMaterial = ({ color = "#ffffff", map = null, repeat = [1, 1], offset = 0, mute = 0, floor = 0, emissive, wear, mottle = 0, spec = 0, gloss = 0, rough, bump, normalMap, normalScale = 1, arm, reflect = 0 }: ToonOpts = {}) => {
  const nor = normalMap === undefined ? ((map?.userData.nor as Texture | undefined) ?? null) : normalMap;
  const armT = arm === undefined ? ((map?.userData.arm as Texture | undefined) ?? null) : arm;
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    defines: LOOK_FEATURES.real ? { REAL: "" } : {},
    fog: true,
    lights: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...UniformsUtils.clone(UniformsLib.lights),
      ...shared,
      uColor: { value: linear(color) },
      uMap: { value: map },
      uHasMap: { value: map ? 1 : 0 },
      uRepeat: { value: new Vector2(...repeat) },
      uOffset: { value: offset },
      uMute: { value: mute },
      uFloor: { value: floor },
      uEmissive: { value: emissive ? linear(emissive[0]).multiplyScalar(emissive[1]) : new Color(0, 0, 0) },
      uWear: { value: wear?.amount ?? 0 },
      uMottle: { value: mottle },
      uSpec: { value: spec },
      uGloss: { value: gloss },
      // spec/gloss callers are shiny surfaces: map them onto roughness in the real look.
      uRough: { value: rough ?? (gloss > 0 ? 0.25 : spec > 0 ? 0.4 : 0.75) },
      uBump: { value: bump ?? (map?.userData.photo ? 1 : 0) }, // painted canvas noise as relief read as glitter
      uNor: { value: nor },
      uHasNor: { value: nor ? 1 : 0 },
      uNorK: { value: normalScale },
      uArm: { value: armT },
      uHasArm: { value: armT ? 1 : 0 },
      uReflect: { value: reflect },
      uWearC: { value: wear?.center ?? 0 },
      uWearW: { value: wear?.width ?? 1 },
    },
  });
};
