import { useFrame, useThree } from "@react-three/fiber";
import { LOOK_FEATURES } from "./lookdev";
import { useLayoutEffect, useMemo, useRef } from "react";
import { BackSide, Color, DirectionalLight, Fog, Mesh, Object3D, ShaderMaterial, Vector3 } from "three";
import { CASTER, SKY } from "./ink";
import { LightPreset, linear } from "./lights";
import { applyLight, shared } from "./shade";
import { skyCrop, skyTexture } from "./sky";

const photoGain = (p: LightPreset) => (p.skyPhoto ? new Color(p.skyPhoto.tint).multiplyScalar(p.skyPhoto.exposure) : new Color(1, 1, 1));

const skyFrag = /* glsl */ `
uniform vec3 uTop, uMid, uHorizon, uSun, uSunDisc, uGlow, uCloudLit, uCloudShade;
uniform float uHasSun, uCloudCover, uBand, uHasPhoto, uYaw, uCrop;
uniform vec3 uPhotoGain;
uniform sampler2D uPhoto;
varying vec3 vDir;
// R27 photo sky: equirect panorama cropped below the horizon (kit sky.ts). Azimuth 0 = -z, +x to the right.
vec3 photoSky(vec3 d) {
  float u = atan(d.x, -d.z) / 6.2831853 + 0.5 - uYaw;
  float v = (1.5707963 - asin(clamp(d.y, -1.0, 1.0))) / 3.1415927 / uCrop;
  // The wrap at u = 0/1 jumps the derivative (a 1-px seam line from the mip choice): take the copy that does not wrap here.
  float u1 = fract(u), u2 = fract(u + 0.5) - 0.5;
  return texture2D(uPhoto, vec2(fwidth(u1) <= fwidth(u2) ? u1 : u2, 1.0 - min(v, 1.0))).rgb * uPhotoGain;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir);
  float h = pow(clamp(d.y / 0.75, 0.0, 1.0), 0.6);
  vec3 c = mix(mix(uHorizon, uMid, smoothstep(0.0, uBand, h)), uTop, smoothstep(0.45, 1.0, h));
  if (uHasPhoto > 0.5) {
    c = photoSky(d);
    // The last degrees melt into the fog colour (= the photo's graded horizon), so far sea and land meet it with no line.
    c = mix(c, uHorizon, (1.0 - smoothstep(-0.01, 0.09, d.y)) * 0.85);
  }
  c += uGlow * pow(max(dot(d, uSun), 0.0), 6.0) * (1.0 - h);
#ifdef REAL
  if (uCloudCover > 0.0 && d.y > 0.0 && uHasPhoto < 0.5) {
    // R25 real look (visual-ref9 night, ref8 day): a soft cloud layer overhead in perspective (p = d.xz / d.y), billowy
    // fbm with feathered edges, lit from above, thinning into the horizon haze. No hard painted edge.
    vec2 p = d.xz / (d.y + 0.12) * 1.3 + vec2(4.1, 2.7);
    float n = fbm(p) * 0.7 + fbm(p * 2.7 + 9.0) * 0.3;
    float cov = 1.0 - uCloudCover * 0.75;
    float dens = smoothstep(cov - 0.15, cov + 0.2, n);
    float lit = clamp(0.5 + (n - fbm(p + vec2(0.06, 0.09))) * 6.0, 0.0, 1.0);
    vec3 cc = mix(uCloudShade, mix(uCloudShade, uCloudLit, 0.75), lit);
    c = mix(c, cc, dens * 0.9 * smoothstep(0.0, 0.22, d.y));
  }
#else
  if (uCloudCover > 0.0) {
    // A few painted cloud banks: flattened noise, a hard-ish edge, warm underside, violet top.
    vec2 p = vec2(atan(d.x, -d.z) * 2.6, d.y * 6.0);
    float n = fbm(p * vec2(1.0, 1.6) + vec2(3.1, 0.0));
    float band = smoothstep(0.04, 0.12, d.y) * (1.0 - smoothstep(0.42, 0.62, d.y));
    float m = smoothstep(1.0 - uCloudCover * 0.75, 1.03 - uCloudCover * 0.75, n) * band;
    float under = smoothstep(0.0, 0.08, fbm(p * vec2(1.0, 1.6) + vec2(3.1, -0.3)) - n + 0.04);
    vec3 cc = mix(uCloudShade, uCloudLit, under);
    c = mix(c, cc, m * 0.92);
  }
#endif
  if (uHasSun > 0.5) {
    float m = dot(d, uSun);
    // Photo sky: the moon/sun behind thin cloud gets a soft halo around the disc (visual-ref9 night).
    if (uHasPhoto > 0.5) c += uSunDisc * (0.5 * exp(-(1.0 - m) * 9000.0) + 0.12 * exp(-(1.0 - m) * 600.0));
    c = mix(c, uSunDisc * 4.0, smoothstep(0.99965, 0.99975, m));
  }
  gl_FragColor = vec4(c, 1.0);
}`;

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

/**
 * Sky dome, distance fog (= horizon colour), the toon light preset and the shadow-casting key for one shot.
 * `shadow` = centre and half-size (m) of the area that receives sharp cast shadows.
 */
export const ToonWorld: React.FC<{ preset: LightPreset; sunDir: Vector3; shadow?: { center: Vector3; size: number } }> = ({
  preset,
  sunDir,
  shadow = { center: new Vector3(), size: 40 },
}) => {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sky = useRef<Mesh>(null);

  const mat = useMemo(() => {
    const skyMid = preset.skyMid ?? `#${linear(preset.skyHorizon).lerp(linear(preset.skyTop), 0.5).getHexString()}`;
    return new ShaderMaterial({
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      defines: LOOK_FEATURES.real ? { REAL: "" } : {},
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: linear(preset.skyTop) },
        uMid: { value: linear(skyMid) },
        uHorizon: { value: linear(preset.skyHorizon) },
        uSun: { value: sunDir.clone().normalize() },
        uSunDisc: { value: linear(preset.sunDisc ?? "#ffffff") },
        uHasSun: { value: preset.sunDisc ? 1 : 0 },
        uGlow: { value: preset.sunGlow ? linear(preset.sunGlow[0]).multiplyScalar(preset.sunGlow[1]) : linear("#000000") },
        uCloudLit: { value: linear(preset.clouds?.lit ?? "#ffffff") },
        uCloudShade: { value: linear(preset.clouds?.shade ?? "#ffffff") },
        uCloudCover: { value: preset.clouds?.cover ?? 0 },
        uBand: { value: preset.horizonBand ?? 0.5 },
        uPhoto: { value: preset.skyPhoto ? skyTexture(preset.skyPhoto.id) : null },
        uHasPhoto: { value: preset.skyPhoto ? 1 : 0 },
        uPhotoGain: { value: photoGain(preset) },
        uYaw: { value: (preset.skyPhoto?.yaw ?? 0) / 360 },
        uCrop: { value: preset.skyPhoto ? skyCrop(preset.skyPhoto.id) : 1 },
      },
    });
  }, [preset, sunDir]);

  // Key light: only its shadow map is used (the toon shader does its own two-tone lighting).
  const key = useMemo(() => {
    const l = new DirectionalLight(0xffffff, 1);
    const s = shadow.size;
    l.castShadow = true;
    l.shadow.mapSize.set(4096, 4096);
    Object.assign(l.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 400 });
    l.shadow.camera.updateProjectionMatrix();
    l.shadow.camera.layers.enable(CASTER);
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    l.target = new Object3D();
    l.target.position.copy(shadow.center);
    l.position.copy(shadow.center).addScaledVector(sunDir.clone().normalize(), 150);
    return l;
  }, [sunDir, shadow.center, shadow.size]);

  useLayoutEffect(() => {
    scene.fog = new Fog(linear(preset.fog), preset.fogNear, preset.fogFar);
    applyLight(preset, sunDir);
    // Water reflects the same photo (shade.ts `reflect`).
    Object.assign(shared.uSkyMap, { value: preset.skyPhoto ? skyTexture(preset.skyPhoto.id) : null });
    shared.uSkyOn.value = preset.skyPhoto ? 1 : 0;
    shared.uSkyGain.value.copy(photoGain(preset));
    shared.uSkyYaw.value = (preset.skyPhoto?.yaw ?? 0) / 360;
    shared.uSkyCrop.value = preset.skyPhoto ? skyCrop(preset.skyPhoto.id) : 1;
    sky.current?.layers.set(SKY);
    scene.add(key, key.target);
    return () => void scene.remove(key, key.target);
  }, [scene, preset, sunDir, key]);

  // Keep the dome centred on the lens so it never parallaxes.
  useFrame(() => sky.current?.position.copy(camera.position));

  return (
    <mesh ref={sky} material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[900, 48, 24]} />
    </mesh>
  );
};
