/*
  Drawn-style materials for the thick standees. No physically based lighting, no gloss:
  every surface is a flat colour from the design tokens, shaded only by mixing toward the
  token shade colour on the side facing away from a fixed "drawing light" (like a crayon
  artist shading the far side). Fog is kept so far things fade softly into the paper.
*/

import {
  Color,
  DoubleSide,
  FrontSide,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type Side,
  type Texture,
} from "three";

/** Lit side → shade side, crossing over between these two values of a wrapped light term (0..1). */
export type ShadeBand = { from: number; to: number };

/** Small value noise, so card grain and the hand-drawn edge line are a little uneven. */
const noise = /* glsl */ `
  float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

const toonVertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWorldNormal;
  varying vec3 vLocal;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vLocal = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const toonFragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  ${noise}
  uniform float uGrain;
  uniform float uUneven;
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform vec2 uBand;
  uniform vec3 uEdge;
  uniform float uHalfDepth;
  uniform float uEdgeOn;
  varying vec3 vWorldNormal;
  varying vec3 vLocal;
  void main() {
    vec3 n = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    // Uneven, like crayon shading on real card: the shade boundary wanders a little.
    float wander = (vnoise(vLocal.xy * 7.0) - 0.5) * uUneven;
    float wrap = dot(n, uLight) * 0.5 + 0.5 + wander;
    vec3 col = mix(uShade, uBase, smoothstep(uBand.x, uBand.y, wrap));
    // Card fibres: a faint speckle toward the shade colour (never a new colour).
    float fibre = vnoise(vLocal.xy * 90.0 + vLocal.z * 40.0) * 0.6 + vnoise(vLocal.xy * 23.0) * 0.4;
    col = mix(col, uShade, uGrain * fibre);
    if (uEdgeOn > 0.5) {
      // A hand line along both edges: its width wavers and it fades out in places.
      float rim = uHalfDepth - abs(vLocal.z);
      float width = uHalfDepth * (0.25 + 0.5 * vnoise(vLocal.xy * 11.0));
      float line = 1.0 - smoothstep(0.0, width, rim);
      line *= 0.35 + 0.65 * smoothstep(0.2, 0.55, vnoise(vLocal.xy * 4.0 + 3.7));
      col = mix(col, uEdge, line * 0.6);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Paper surfaces (side walls, back, snow mounds): base colour, shade colour on the far side, optional edge line. */
export function toonMaterial(opts: {
  base: string;
  shade: string;
  light: Vector3;
  band: ShadeBand;
  edge?: { color: string; halfDepth: number };
  /** Card feel: fibre speckle and how much the shade boundary wanders (0 = perfectly even). */
  card?: { grain: number; uneven: number };
  side?: Side;
}) {
  return new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uBase: { value: new Color(opts.base) },
        uShade: { value: new Color(opts.shade) },
        uLight: { value: opts.light.clone().normalize() },
        uBand: { value: [opts.band.from, opts.band.to] },
        uEdge: { value: new Color(opts.edge?.color ?? opts.base) },
        uHalfDepth: { value: opts.edge?.halfDepth ?? 1 },
        uEdgeOn: { value: opts.edge ? 1 : 0 },
        uGrain: { value: opts.card?.grain ?? 0 },
        uUneven: { value: opts.card?.uneven ?? 0 },
      },
    ]),
    vertexShader: toonVertex,
    fragmentShader: toonFragment,
    fog: true,
    side: opts.side ?? FrontSide,
  });
}

const artVertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec2 vUv;
  varying vec3 vAxisX;
  varying vec3 vAxisY;
  varying vec3 vAxisZ;
  void main() {
    vUv = uv;
    mat3 m = mat3(modelMatrix);
    vAxisX = m * vec3(1.0, 0.0, 0.0);
    vAxisY = m * vec3(0.0, 1.0, 0.0);
    vAxisZ = m * vec3(0.0, 0.0, 1.0);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const artFragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D uMap;
  uniform sampler2D uNormalMap;
  uniform float uPillow;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform vec2 uBand;
  varying vec2 vUv;
  varying vec3 vAxisX;
  varying vec3 vAxisY;
  varying vec3 vAxisZ;
  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.5) discard;
    vec3 col = tex.rgb;
    if (uPillow > 0.0) {
      vec3 t = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
      vec3 n = normalize(vAxisX * t.x + vAxisY * t.y + vAxisZ * t.z) * (gl_FrontFacing ? 1.0 : -1.0);
      float wrap = dot(n, uLight) * 0.5 + 0.5;
      float shade = (1.0 - smoothstep(uBand.x, uBand.y, wrap)) * uPillow;
      // Shade by tinting toward the token shade colour, like a pale blue pencil pass. Never brighter than drawn.
      col = mix(col, col * uShade, shade);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** The art card: the drawn colours exactly as drawn, plus an optional faint pillow shade from the normal map. */
export function artMaterial(opts: {
  map: Texture;
  normalMap: Texture;
  pillow: number;
  shade: string;
  light: Vector3;
  band: ShadeBand;
  doubleSided: boolean;
}) {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uMap: { value: null },
        uNormalMap: { value: null },
        uPillow: { value: opts.pillow },
        uShade: { value: new Color(opts.shade) },
        uLight: { value: opts.light.clone().normalize() },
        uBand: { value: [opts.band.from, opts.band.to] },
      },
    ]),
    vertexShader: artVertex,
    fragmentShader: artFragment,
    fog: true,
    side: opts.doubleSided ? DoubleSide : FrontSide,
  });
  // Set after merging: merging would copy the textures.
  material.uniforms.uMap.value = opts.map;
  material.uniforms.uNormalMap.value = opts.normalMap;
  return material;
}
