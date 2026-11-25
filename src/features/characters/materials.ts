"use client";

import { useState } from "react";
import * as THREE from "three";

import { look, tokens } from "./content";

type TokenKey = keyof typeof tokens;

/** Reads a colour token from globals.css. Only runs in the browser (inside the canvas). */
function readToken(name: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(value || "white");
}

const vertexShader = /* glsl */ `
  varying vec3 vNormalWorld;
  varying vec3 vLocal;
  void main() {
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Two flat tones (lit and pale-blue shade) with a soft edge, plus a faint crayon-paper grain.
const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uLight;
  uniform float uEdge;
  uniform float uSoft;
  uniform float uGrain;
  varying vec3 vNormalWorld;
  varying vec3 vLocal;

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

  void main() {
    float d = dot(normalize(vNormalWorld), uLight) * 0.5 + 0.5;
    float lit = smoothstep(uEdge - uSoft, uEdge + uSoft, d);
    vec3 colour = mix(uShade, uBase, lit);
    float grain = noise(vLocal * 95.0) * 0.6 + noise(vLocal * 24.0) * 0.4;
    colour *= 1.0 - uGrain * (grain - 0.5);
    gl_FragColor = vec4(colour, 1.0);
    #include <colorspace_fragment>
  }
`;

function toonMaterial(base: THREE.Color, shade: THREE.Color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBase: { value: base },
      uShade: { value: shade },
      uLight: { value: new THREE.Vector3(...look.lightDirection).normalize() },
      uEdge: { value: look.shadeEdge },
      uSoft: { value: look.shadeSoftness },
      uGrain: { value: look.grain },
    },
    vertexShader,
    fragmentShader,
  });
}

export type SnowmanMaterials = Record<TokenKey, THREE.ShaderMaterial> & {
  outlineColour: THREE.Color;
  faceColour: THREE.Color;
};

function buildMaterials(): SnowmanMaterials {
  const shadeTint = readToken(tokens.snowShade);
  const made = {} as Record<TokenKey, THREE.ShaderMaterial>;
  for (const key of Object.keys(tokens) as TokenKey[]) {
    const base = readToken(tokens[key]);
    const isWhite = key === "snow" || key === "pompom" || key === "handle";
    const shade = isWhite
      ? base.clone().lerp(shadeTint, look.snowShadeMix)
      : base.clone().lerp(base.clone().multiply(shadeTint), look.colourShadeMix);
    made[key] = toonMaterial(base, shade);
  }
  return {
    ...made,
    outlineColour: readToken(tokens.outline),
    faceColour: readToken(tokens.face),
  };
}

/** The set of materials for one snowman, made once from the theme tokens. */
export function useSnowmanMaterials(): SnowmanMaterials {
  const [materials] = useState(buildMaterials);
  return materials;
}
