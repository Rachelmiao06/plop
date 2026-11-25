"use client";

import { useState } from "react";
import * as THREE from "three";

import { look, tokens, type MatcapName } from "./content";

type TokenKey = keyof typeof tokens;

/** Reads a colour token from globals.css. Only runs in the browser (inside the canvas). */
function readToken(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(value || "white");
}

function partColour(key: TokenKey): THREE.Color {
  return readToken(tokens[key].token);
}

/** Value noise shared by the fill and the outline. */
const NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
`;

const fillVertex = /* glsl */ `
  varying vec3 vNormalWorld;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  void main() {
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vNormalView = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    vLocal = position;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

/** Average brightness the slicing script normalises each grey matcap to (200 / 255). */
const MATCAP_MID = 200 / 255;

// Two ways to colour a part, switchable at runtime:
// - computed: the part's token colour, a barely-there pale-blue shade on the far side, diagonal
//   coloured-pencil strokes and soft pressure blotches, stuck to the object so they never swim.
// - drawn matcap: brightness is looked up from a hand-drawn sphere by the view-space normal, so the
//   drawing's own strokes and shading appear on every part from every angle, over the token colour.
//   A little of the light direction can be blended in so form still turns as the camera orbits.
// Either way an optional screen-space paper grain sits on top.
const fillFragment = /* glsl */ `
  uniform sampler2D uMatcap;
  uniform float uUseMatcap;
  uniform float uLightBlend;
  uniform float uPaperGrain;
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform float uEdge;
  uniform float uSoft;
  uniform float uHatch;
  uniform float uMottle;
  varying vec3 vNormalWorld;
  varying vec3 vNormalView;
  varying vec3 vViewPosition;
  varying vec3 vLocal;
  ${NOISE}
  void main() {
    float d = dot(normalize(vNormalWorld), uLight) * 0.5 + 0.5;
    float lit = smoothstep(uEdge - uSoft, uEdge + uSoft, d);

    if (uUseMatcap > 0.5) {
      vec3 n = normalize(vNormalView);
      vec3 viewDir = normalize(vViewPosition);
      vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
      vec3 y = cross(viewDir, x);
      vec2 uv = vec2(dot(x, n), dot(y, n)) * 0.495 + 0.5;
      // The matcap is grey: her strokes and shading as brightness, normalised so its average is
      // MATCAP_MID. Multiplying keeps the part's exact token colour on average.
      vec3 base = mix(uShade, uBase, mix(1.0, lit, uLightBlend));
      vec3 drawn = base * (texture2D(uMatcap, uv).r / ${MATCAP_MID.toFixed(4)});
      drawn *= 1.0 - uPaperGrain * (noise(vec3(gl_FragCoord.xy * 0.7, 0.0)) - 0.5);
      gl_FragColor = vec4(drawn, 1.0);
      #include <colorspace_fragment>
      return;
    }

    vec3 colour = mix(uShade, uBase, lit);

    vec3 p = vLocal;
    // Fine strokes running diagonally, broken up so they read as pencil, not stripes.
    float along = (p.x + p.y) * 22.0;
    float across = (p.y - p.x) * 260.0 + noise(p * 18.0) * 6.0;
    float stroke = noise(vec3(along, across, p.z * 22.0));
    float tooth = noise(p * 420.0);
    float blotch = noise(p * 7.0) * 0.6 + noise(p * 19.0) * 0.4;
    colour *= 1.0 - uHatch * (stroke - 0.5) - uHatch * 0.5 * (tooth - 0.5) - uMottle * (blotch - 0.5);
    colour *= 1.0 - uPaperGrain * (noise(vec3(gl_FragCoord.xy * 0.7, 0.0)) - 0.5);

    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

function fillMaterial(base: THREE.Color, shade: THREE.Color, hatch: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: base },
      uShade: { value: shade },
      uLight: { value: new THREE.Vector3(...look.lightDirection).normalize() },
      uEdge: { value: look.shadeEdge },
      uSoft: { value: look.shadeSoftness },
      uHatch: { value: hatch },
      uMottle: { value: look.mottle },
      uMatcap: { value: null as THREE.Texture | null },
      uUseMatcap: { value: 0 },
      uLightBlend: { value: look.matcapLightBlend },
      uPaperGrain: { value: 0 },
    },
    vertexShader: fillVertex,
    fragmentShader: fillFragment,
  });
}

// The outline is an inverted hull: the back faces of each part, pushed outward on screen.
// Its width is set in scene units (so it zooms like a drawn line), clamped in pixels,
// and wobbles a little along its length like a hand-drawn stroke.
const outlineVertex = /* glsl */ `
  uniform float uWidth;
  uniform vec2 uSize;
  uniform float uMinPx;
  uniform float uMaxPx;
  uniform float uWobble;
  ${NOISE}
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec4 clipNormal = projectionMatrix * modelViewMatrix * vec4(normal, 0.0);
    float pxPerUnit = projectionMatrix[1][1] * uSize.y * 0.5 / clip.w;
    float px = clamp(uWidth * pxPerUnit, uMinPx, uMaxPx);
    float wobble = noise(position * 9.0) * 0.7 + noise(position * 23.0) * 0.3;
    px *= 1.0 + uWobble * (wobble - 0.5) * 2.0;
    vec2 dir = clipNormal.xy;
    if (dot(dir, dir) > 1e-8) clip.xy += normalize(dir) * px / uSize * clip.w * 2.0;
    gl_Position = clip;
  }
`;

const outlineFragment = /* glsl */ `
  uniform vec3 uColour;
  uniform vec3 uPaper;
  uniform float uSpecks;
  ${NOISE}
  void main() {
    // Crayon skipping over paper: a few lighter specks inside the stroke.
    float speck = noise(vec3(gl_FragCoord.xy * 0.22, 0.0));
    vec3 colour = mix(uColour, uPaper, smoothstep(0.68, 0.9, speck) * uSpecks);
    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

export function makeOutlineMaterial(colour: THREE.Color, paper: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColour: { value: colour },
      uPaper: { value: paper },
      uSpecks: { value: look.outlineSpecks },
      uWidth: { value: look.outlineWidth },
      uSize: { value: new THREE.Vector2(1, 1) },
      uMinPx: { value: look.outlineMinPx },
      uMaxPx: { value: look.outlineMaxPx },
      uWobble: { value: look.outlineWobble },
    },
    vertexShader: outlineVertex,
    fragmentShader: outlineFragment,
    side: THREE.BackSide,
  });
}

/** Which drawn matcap sphere each part uses in "drawn matcap" mode. */
export const MATCAP_FOR: Partial<Record<TokenKey, MatcapName>> = {
  snow: "snow",
  pompom: "snow",
  handle: "snow",
  mintScarf: "mint",
  red: "red",
  bucket: "blue",
  snowShade: "blue",
};

export type SnowmanMaterials = Record<TokenKey, THREE.ShaderMaterial> & {
  outline: THREE.ShaderMaterial;
  faceColour: THREE.Color;
};

const WHITE_PARTS: TokenKey[] = ["snow", "pompom", "handle"];

function buildMaterials(): SnowmanMaterials {
  const paper = readToken("--paper");
  const shadeTint = readToken(tokens.snowShade.token);
  const made = {} as Record<TokenKey, THREE.ShaderMaterial>;
  for (const key of Object.keys(tokens) as TokenKey[]) {
    const base = partColour(key);
    const isWhite = WHITE_PARTS.includes(key);
    const shade = isWhite
      ? base.clone().lerp(shadeTint, look.snowShadeMix)
      : base.clone().lerp(base.clone().multiply(shadeTint), look.colourShadeMix);
    made[key] = fillMaterial(base, shade, isWhite ? look.hatchSnow : look.hatchColour);
  }
  return {
    ...made,
    outline: makeOutlineMaterial(partColour("outline"), paper),
    faceColour: partColour("face"),
  };
}

/** The set of materials for one snowman, made once from the theme tokens. */
export function useSnowmanMaterials(): SnowmanMaterials {
  const [materials] = useState(buildMaterials);
  return materials;
}
