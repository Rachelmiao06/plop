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

const toonVertex = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying vec3 vWorldNormal;
  varying float vLocalZ;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vLocalZ = position.z;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const toonFragment = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform vec2 uBand;
  uniform vec3 uEdge;
  uniform float uHalfDepth;
  uniform float uEdgeOn;
  varying vec3 vWorldNormal;
  varying float vLocalZ;
  void main() {
    vec3 n = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    float wrap = dot(n, uLight) * 0.5 + 0.5;
    vec3 col = mix(uShade, uBase, smoothstep(uBand.x, uBand.y, wrap));
    if (uEdgeOn > 0.5) {
      float rim = uHalfDepth - abs(vLocalZ);
      float line = 1.0 - smoothstep(0.0, uHalfDepth * 0.45, rim);
      col = mix(col, uEdge, line * 0.45);
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
