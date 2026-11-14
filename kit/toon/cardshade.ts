import {
  AddEquation,
  CustomBlending,
  DoubleSide,
  DstColorFactor,
  ShaderMaterial,
  Texture,
  UniformsLib,
  UniformsUtils,
  Vector3,
  ZeroFactor,
} from "three";
import { AERIAL, shared } from "./shade";
import { LOOK_FEATURES } from "./lookdev";

/**
 * Card lighting (lighting.md 5 / 9.2, adapted): the form shading (head crescent, torso gradient, thick-thin ink) is
 * painted into the card, so the shader only places it in the scene:
 * - the scene light colour as a tint (`char.tint` per preset; heads stay V >= .86, no emissive "pasted-on" glow);
 * - the street shadow (shadow map, probed at chest and knees) dims the whole card only to `char.shade`;
 * - nearby practicals warm it multiplicatively (ink stays dark);
 * - fog, aerial haze and depth of field like any surface (the card writes depth in the NOINK mask pass);
 * - a soft contact blob in the scene's own shadow colour, and a lamp-thrown decal shadow (multiply decals).
 */

/** 0 = colour pass, 1 = NOINK mask pass (alpha-tested depth, alpha 0 so the world ink skips the card). */
export const CARD_PASS = { value: 0 };

export const CARD_LOOK = {
  /** Contact blob strength toward the scene's shade/lit ratio (measured blob Y ratio .52-.74). */
  contact: 0.6,
  /** Lamp-thrown shadow strength right under a lamp (fades out over the lamp radius). */
  lampCast: 0.55,
  /** How much a practical (x its HDR colour) warms the card at its centre. */
  practical: 0.45, // was .3: faces must take the lamp (ref13: warm bulb side, falling off across the head)
};

const cardVert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
uniform vec3 uProbeA, uProbeB;
varying vec2 vUv;
varying vec4 vProbeA;
varying vec4 vProbeB;
varying vec3 vView;
varying vec3 vWT, vWN, vWP;
void main() {
  vUv = uv;
  vWT = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vWN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vWP = (modelMatrix * vec4(position, 1.0)).xyz;
  #include <begin_vertex>
  #include <project_vertex>
  vView = mvPosition.xyz;
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
  vProbeA = directionalShadowMatrix[0] * vec4(uProbeA, 1.0);
  vProbeB = directionalShadowMatrix[0] * vec4(uProbeB, 1.0);
  #endif
  #include <fog_vertex>
}`;

const cardFrag = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
uniform sampler2D uMap;
uniform float uPass, uCharShade, uPractical;
uniform vec3 uCharTint, uHazeColor, uInkFrom, uCharInk;
uniform float uHazeStart, uHazeAmount;
uniform float uLitCards, uBorder, uGrain;
uniform sampler2D uHeight;
uniform vec3 uSunDir, uLit, uShade;
varying vec3 vView;
varying vec3 vWT, vWN, vWP;
varying vec2 vUv;
// A region sample for the pillow normal: inside the card and not on an ink line (ink lines separate head, hair, torso).
float region(vec2 uv) {
  vec4 t = texture2D(uMap, uv);
  float ink = 1.0 - smoothstep(0.02, 0.12, max(t.r, max(t.g, t.b)));
  return t.a * (1.0 - ink);
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
varying vec4 vProbeA;
varying vec4 vProbeB;
${AERIAL}
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (uBorder > 0.5) {
    // lookdev "paper": the cut-paper margin behind the drawing (dilated silhouette, paper colour).
    float a = 0.0;
    for (int k = 0; k < 16; k++) {
      float ang = float(k) * 0.3926991;
      a = max(a, texture2D(uMap, vUv + vec2(cos(ang) * 0.016, sin(ang) * 0.0096)).a);
    }
    if (a < 0.5) discard;
    tex = vec4(vec3(0.93, 0.89, 0.8) * (0.96 + 0.04 * hash2(floor(vUv * 300.0))), 1.0);
  }
  if (uPass > 0.5) {
    if (tex.a < 0.5) discard;
    gl_FragColor = vec4(0.0);
    return;
  }
  // Street shadow: one value for the whole card, sampled at the chest and knees.
  float street = 1.0;
  #if defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS > 0
  DirectionalLightShadow ds = directionalLightShadows[0];
  street = 0.5 * (getShadow(directionalShadowMap[0], ds.shadowMapSize, 1.0, ds.shadowBias, ds.shadowRadius, vProbeA)
                + getShadow(directionalShadowMap[0], ds.shadowMapSize, 1.0, ds.shadowBias, ds.shadowRadius, vProbeB));
  #endif
  vec3 m = uCharTint * mix(uCharShade, 1.0, street);
  vec3 nlP = vec3(0.0, 0.0, 1.0);
  if (uLitCards > 0.5 && uBorder < 0.5) {
    // lookdev "lit": every inked shape is a soft pillow (gradient of the inside-region mask on two rings), lit by the
    // key with a painterly two-tone wrap toward the scene's own coloured shade, plus a backlight rim.
    // Normal from the blurred shape height (toon.ts makeHeight): smooth, one bulge per inked shape.
    vec2 e = vec2(3.0 / 150.0, 3.0 / 250.0);
    vec2 g = vec2(texture2D(uHeight, vUv + vec2(e.x, 0.0)).a - texture2D(uHeight, vUv - vec2(e.x, 0.0)).a,
                  texture2D(uHeight, vUv + vec2(0.0, e.y)).a - texture2D(uHeight, vUv - vec2(0.0, e.y)).a);
    vec2 nxy = -g * 7.0;
    vec3 nl = normalize(vec3(nxy, 1.0));
    nlP = nl;
    // Key in card space, raked: painters always let the form turn away from the light, so a frontal sun still lights
    // the card from its side (sign of the sun's sideways component) and from above.
    vec3 Ls = vec3(dot(uSunDir, vWT), uSunDir.y, dot(uSunDir, vWN));
    vec2 side = vec2(Ls.x + (Ls.x >= 0.0 ? 0.45 : -0.45), max(Ls.y, 0.35));
    vec3 Lc = normalize(vec3(side, min(Ls.z, 0.4)));
    float wrap = clamp(dot(nl, Lc) * 0.5 + 0.5, 0.0, 1.0);
    float lit = smoothstep(0.36, 0.66, wrap);
    vec3 ratio = min(uShade / max(uLit, vec3(1e-3)), vec3(1.0));
    vec3 shadeTone = mix(vec3(1.0), ratio, 0.7);
    float self = 1.0 - smoothstep(0.02, 0.12, max(tex.r, max(tex.g, tex.b)));
    m *= mix(vec3(1.0), mix(shadeTone, vec3(1.0), lit), 1.0 - self);
    vec3 V = normalize(cameraPosition - vWP);
    float back = smoothstep(-0.1, 0.6, dot(-V, uSunDir));
    float rim = pow(1.0 - clamp(nl.z, 0.0, 1.0), 2.0) * back * street;
    m += (1.0 - self) * rim * 0.9 * uCharTint;
  }
  if (uGrain > 0.5) m *= 0.95 + 0.07 * hash2(floor(vUv * vec2(240.0, 400.0)));
  vec3 lamp = vec3(0.0);
  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    vec3 L = pointLights[i].position - vView;
    float r = length(L), D = pointLights[i].distance;
    // Bent normal (a card is a cylinder for light): the lamp side of the body is lit, the far side falls off.
    vec3 n = normalize(vec3((vUv.x - 0.5) * 1.8, 0.0, 1.0));
    float ndl = max(dot(n, L / max(r, 1e-3)), 0.0);
    // lookdev "lit": the lamp shapes the drawing too (the shape's own bulge, raked toward the lamp side).
    if (uLitCards > 0.5) ndl = smoothstep(0.15, 0.75, dot(normalize(nlP + vec3(0.0, 0.0, -0.35)), normalize(L)) * 0.5 + 0.5);
    lamp += pointLights[i].color * (1.0 - smoothstep(0.0, D, r)) * (uLitCards > 0.5 ? 0.15 + 1.4 * ndl : 0.35 + 0.9 * ndl);
  }
  m *= 1.0 + lamp * uPractical;
  #endif
  // Ink takes the scene light (ref2: navy at night, warmer on the lantern side). Only the ink colour itself is
  // recoloured (dark hair, trousers and limb strokes keep theirs); a nearby lamp lifts it a little toward its colour.
  float inkness = 1.0 - smoothstep(0.005, 0.012, distance(tex.rgb, uInkFrom));
  vec3 base = mix(tex.rgb, uCharInk, inkness) + inkness * lamp * 0.03;
  vec3 c = aerial(base * m, length(vView));
  gl_FragColor = vec4(c, tex.a);
  #include <fog_fragment>
}`;

export const cardMaterial = (map: Texture, border = false, height: Texture | null = null) =>
  new ShaderMaterial({
    vertexShader: cardVert,
    fragmentShader: cardFrag,
    fog: true,
    lights: true,
    side: DoubleSide,
    alphaToCoverage: true,
    uniforms: {
      ...UniformsUtils.clone(UniformsLib.fog),
      ...UniformsUtils.clone(UniformsLib.lights),
      ...shared,
      uMap: { value: map },
      uPass: CARD_PASS,
      uPractical: { value: CARD_LOOK.practical },
      uLitCards: { value: LOOK_FEATURES.litCards && height ? 1 : 0 },
      uHeight: { value: height },
      uBorder: { value: border ? 1 : 0 },
      uGrain: { value: LOOK_FEATURES.paper ? 1 : 0 },
      uProbeA: { value: new Vector3() },
      uProbeB: { value: new Vector3() },
    },
  });

const multiply = { blending: CustomBlending, blendEquation: AddEquation, blendSrc: DstColorFactor, blendDst: ZeroFactor, transparent: true, depthWrite: false };

// Lamp-thrown silhouette: card vertices projected from the lantern onto the ground; multiplies the ground by the
// scene's shade/lit ratio, i.e. turns it into the same coloured shade the world uses.
const castVert = /* glsl */ `
uniform vec3 uLampP;
uniform float uGround;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  worldPosition.y = min(worldPosition.y, uLampP.y - 0.3);
  worldPosition.xyz = uLampP + (worldPosition.xyz - uLampP) * ((uLampP.y - uGround) / (uLampP.y - worldPosition.y));
  worldPosition.y = uGround + 0.012;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}`;

const castFrag = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uLit, uShade;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float a = texture2D(uMap, vUv).a;
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, smoothstep(0.3, 0.7, a) * uStrength), 1.0);
}`;

/** Lamp-thrown card shadow: away from `uLampP` (set per frame). */
export const lampShadowMaterial = (map: Texture, ground = 0) =>
  new ShaderMaterial({
    vertexShader: castVert,
    fragmentShader: castFrag,
    side: DoubleSide,
    ...multiply,
    uniforms: {
      ...shared,
      uMap: { value: map },
      uGround: { value: ground },
      uLampP: { value: new Vector3() },
      uStrength: { value: 0.55 },
    },
  });

const contactFrag = /* glsl */ `
uniform vec3 uLit, uShade;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float r = length((vUv - 0.5) * 2.0);
  vec3 ratio = min(uShade / uLit, vec3(1.0));
  gl_FragColor = vec4(mix(vec3(1.0), ratio, uStrength * (1.0 - smoothstep(0.3, 1.0, r))), 1.0);
}`;

/** Soft blob under the feet in the scene's coloured shade (apply to a ground-aligned plane). */
export const contactMaterial = () =>
  new ShaderMaterial({
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: contactFrag,
    ...multiply,
    uniforms: { ...shared, uStrength: { value: CARD_LOOK.contact } },
  });
