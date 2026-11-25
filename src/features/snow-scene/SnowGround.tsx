"use client";

import { useContext, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  MeshStandardMaterial,
  Vector4,
} from "three";
import { content } from "./content";
import { sharedUniforms } from "./sharedUniforms";
import { SnowContext } from "./snowContext";
import { baseHeightAt, baseNormalInto, type SnowField } from "./snowField";

// Draws the snow: the pressable play area as a fine height grid (each frame
// it re-sends only the rows and columns that were pressed), and around it one
// big cheap surface out to the haze. Both use the same material.

function buildGeometry(field: SnowField): BufferGeometry {
  const { cols, rows } = field;
  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      positions[k * 3] = field.xAt(i);
      positions[k * 3 + 1] = field.height[k];
      positions[k * 3 + 2] = field.zAt(j);
      if (onRim(field, i, j)) {
        // The outermost points are shared with the snow beyond, and take
        // their slope from the same place it does, so no seam can show.
        baseNormalInto(field.xAt(i), field.zAt(j), normals, k * 3);
      } else {
        field.normalInto(i, j, normals, k * 3);
      }
    }
  }

  const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let n = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Alternate which way each square is split, so steep groove walls
      // do not turn into a saw-tooth in one diagonal direction.
      if ((i + j) % 2 === 0) {
        indices[n++] = a;
        indices[n++] = c;
        indices[n++] = b;
        indices[n++] = b;
        indices[n++] = c;
        indices[n++] = d;
      } else {
        indices[n++] = a;
        indices[n++] = c;
        indices[n++] = d;
        indices[n++] = a;
        indices[n++] = d;
        indices[n++] = b;
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  // Shares the field's own array: how packed the snow is at each point.
  geometry.setAttribute("aPressed", new BufferAttribute(field.pressed, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

const onRim = (field: SnowField, i: number, j: number) =>
  i === 0 || j === 0 || i === field.cols - 1 || j === field.rows - 1;

/**
 * Grid lines along one direction for the snow beyond the play area: the play
 * area's own lines in the middle, then steps that grow with distance.
 * Returns the positions and where the play area's lines start in that list.
 */
function surroundLines(inner: number[]): { lines: number[]; start: number } {
  const f = content.surround;
  const grow = (from: number, direction: number) => {
    const out: number[] = [];
    let step: number = content.ground.cell;
    let at = from;
    while (Math.abs(at) < f.reach) {
      step = Math.min(step * f.growth, f.maxStep);
      at += step * direction;
      out.push(at);
    }
    return out;
  };
  const before = grow(inner[0], -1).reverse();
  const after = grow(inner[inner.length - 1], 1);
  return { lines: [...before, ...inner, ...after], start: before.length };
}

/**
 * The snow beyond the play area: one big, cheap, never-pressed surface with
 * a hole where the play area sits. Along the hole it has exactly the play
 * area's own points, heights and slopes, so the two meet without a seam.
 */
function buildSurround(field: SnowField): BufferGeometry {
  const innerX = Array.from({ length: field.cols }, (_, i) => field.xAt(i));
  const innerZ = Array.from({ length: field.rows }, (_, j) => field.zAt(j));
  const x = surroundLines(innerX);
  const z = surroundLines(innerZ);
  const cols = x.lines.length;
  const rows = z.lines.length;

  const positions = new Float32Array(cols * rows * 3);
  const normals = new Float32Array(cols * rows * 3);
  const inHole = (i: number, j: number) =>
    i > x.start &&
    i < x.start + field.cols - 1 &&
    j > z.start &&
    j < z.start + field.rows - 1;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (inHole(i, j)) continue;
      const k = (j * cols + i) * 3;
      positions[k] = x.lines[i];
      positions[k + 1] = Math.fround(baseHeightAt(x.lines[i], z.lines[j]));
      positions[k + 2] = z.lines[j];
      baseNormalInto(x.lines[i], z.lines[j], normals, k);
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      // Skip the squares the play area covers.
      if (
        i >= x.start &&
        i < x.start + field.cols - 1 &&
        j >= z.start &&
        j < z.start + field.rows - 1
      ) {
        continue;
      }
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  // Never pressed: all zeros.
  geometry.setAttribute(
    "aPressed",
    new BufferAttribute(new Float32Array(cols * rows), 1),
  );
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const NOISE_GLSL = /* glsl */ `
  float snowHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float snowNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(snowHash(i), snowHash(i + vec2(1.0, 0.0)), u.x),
      mix(snowHash(i + vec2(0.0, 1.0)), snowHash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
`;

function buildMaterial(): MeshStandardMaterial {
  const g = content.ground;
  const s = content.surface;
  const material = new MeshStandardMaterial({
    color: content.colors.snow,
    roughness: s.roughness,
    metalness: 0,
    dithering: true,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, sharedUniforms, {
      uSnowPressed: { value: new Color(content.colors.snowPressed) },
      uHardGround: { value: new Color(content.colors.hardGround) },
      // Far snow: the small drifts and ripples are drawn as shading there
      // instead of shape. x, y = where that takes over; z, w = drift size and steepness.
      uFarDrift: {
        value: new Vector4(
          content.surround.driftFadeStart,
          content.surround.driftFadeEnd,
          g.driftScale,
          2 * g.driftHeight * g.driftScale,
        ),
      },
      // x, y = ripple fade distances; z, w = ripple size and steepness.
      uFarRipple: {
        value: new Vector4(
          content.surround.rippleFadeStart,
          content.surround.rippleFadeEnd,
          g.rippleScale,
          2 * g.rippleHeight * g.rippleScale,
        ),
      },
      // where the far snow starts and finishes melting into the sky
      uHaze: {
        value: new Vector4(content.haze.start, content.haze.end, 0, content.ground.centerZ),
      },
      uSparkleColor: { value: new Color(content.colors.sparkle) },
      // scale, strength, tint
      uGrain: { value: new Vector4(s.grainScale, s.grainStrength, s.grainTint, 0) },
      // glint size, share lit, flicker speed, brightness
      uSparkle: {
        value: new Vector4(
          s.sparkleCell,
          s.sparkleAmount,
          s.sparkleSensitivity,
          s.sparkleStrength,
        ),
      },
    });

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        attribute float aPressed;
        varying vec3 vSnowPos;
        varying float vPressed;`,
      )
      .replace(
        "#include <begin_vertex>",
        /* glsl */ `#include <begin_vertex>
        vSnowPos = position;
        vPressed = aPressed;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
        uniform vec3 uSnowPressed;
        uniform vec3 uHardGround;
        uniform vec3 uSparkleColor;
        uniform vec3 uFogTop;
        uniform vec3 uFogBottom;
        uniform vec2 uResolution;
        uniform vec4 uHaze;
        uniform vec4 uFarDrift;
        uniform vec4 uFarRipple;
        uniform vec4 uGrain;
        uniform vec4 uSparkle;
        varying vec3 vSnowPos;
        varying float vPressed;
        ${NOISE_GLSL}`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
        // Scene units covered by one screen pixel: fine detail fades out
        // before it gets smaller than a pixel and starts to shimmer.
        float snowPx = length(fwidth(vSnowPos.xz));
        vec2 grainP = vSnowPos.xz * uGrain.x;
        float grainFade = 1.0 - smoothstep(0.5, 1.6, snowPx * uGrain.x);
        float grainValue = snowNoise(grainP) * 0.65 + snowNoise(grainP * 2.3 + 7.1) * 0.35;
        // Pressed snow: darker and bluer the deeper it goes; at the very
        // bottom the hard ground shows through.
        float packed = min(vPressed, 1.0);
        float hardGround = clamp(vPressed - 1.0, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uSnowPressed, packed);
        diffuseColor.rgb = mix(diffuseColor.rgb, uHardGround, hardGround);
        // An extra, finer layer of grain that only shows when zoomed in close.
        vec2 fineP = grainP * 3.1;
        float fineFade = (1.0 - smoothstep(0.5, 1.6, snowPx * uGrain.x * 3.1)) * 0.6;
        diffuseColor.rgb *= 1.0 + (grainValue - 0.5) * uGrain.z * grainFade;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        // Fine grain: tiny bumps that catch the low sun. Packed snow is smoother.
        float grainE = 0.4;
        vec2 grainSlope = vec2(
          snowNoise(grainP + vec2(grainE, 0.0)) - snowNoise(grainP - vec2(grainE, 0.0)),
          snowNoise(grainP + vec2(0.0, grainE)) - snowNoise(grainP - vec2(0.0, grainE))
        );
        vec2 fineSlope = vec2(
          snowNoise(fineP + vec2(grainE, 0.0)) - snowNoise(fineP - vec2(grainE, 0.0)),
          snowNoise(fineP + vec2(0.0, grainE)) - snowNoise(fineP - vec2(0.0, grainE))
        );
        vec2 allSlope = grainSlope * grainFade + fineSlope * fineFade;
        // Far from the middle the mesh is too coarse to carry the small
        // drifts and ripples, so they continue here as shading only. The
        // hand-over matches where the shape fades out, so no patch shows.
        float farAway = length(vSnowPos.xz - uHaze.zw);
        vec2 farSlope = vec2(0.0);
        float farDrift = smoothstep(uFarDrift.x, uFarDrift.y, farAway);
        if (farDrift > 0.0) {
          vec2 dp = vSnowPos.xz * uFarDrift.z + vec2(11.3, 4.7);
          farSlope += farDrift * uFarDrift.w * vec2(
            snowNoise(dp + vec2(0.5, 0.0)) - snowNoise(dp - vec2(0.5, 0.0)),
            snowNoise(dp + vec2(0.0, 0.5)) - snowNoise(dp - vec2(0.0, 0.5))
          );
        }
        float farRipple = smoothstep(uFarRipple.x, uFarRipple.y, farAway)
          * (1.0 - smoothstep(0.12, 0.45, snowPx * uFarRipple.z));
        if (farRipple > 0.0) {
          vec2 rp = vSnowPos.xz * vec2(uFarRipple.z, uFarRipple.z * 1.7) + vec2(3.1, 8.2);
          farSlope += farRipple * uFarRipple.w * vec2(
            snowNoise(rp + vec2(0.5, 0.0)) - snowNoise(rp - vec2(0.5, 0.0)),
            (snowNoise(rp + vec2(0.0, 0.5)) - snowNoise(rp - vec2(0.0, 0.5))) * 1.7
          );
        }
        vec3 grainBump = (viewMatrix * vec4(allSlope.x, 0.0, allSlope.y, 0.0)).xyz;
        vec3 farBump = (viewMatrix * vec4(farSlope.x, 0.0, farSlope.y, 0.0)).xyz;
        normal = normalize(normal - grainBump * uGrain.y * (1.0 - 0.6 * packed) - farBump);`,
      )
      .replace(
        "#include <opaque_fragment>",
        /* glsl */ `
        // Sparkles: a few tiny crystals, each facing its own way, that flash
        // when the view lines up with them. Only where the sun reaches.
        vec2 sparkleP = vSnowPos.xz / uSparkle.x;
        vec2 sparkleId = floor(sparkleP);
        float sparkleRnd = snowHash(sparkleId);
        vec3 sparkleFacing = normalize(vec3(
          snowHash(sparkleId + 17.1),
          snowHash(sparkleId + 31.7),
          snowHash(sparkleId + 53.3)
        ) - 0.5);
        vec3 sparkleView = normalize(cameraPosition - vSnowPos);
        float sparklePhase = dot(sparkleView, sparkleFacing) * uSparkle.z + sparkleRnd * 6.2831;
        float sparkleGlint = pow(max(sin(sparklePhase), 0.0), 20.0);
        float sparkleOn = step(1.0 - uSparkle.y, sparkleRnd);
        // A glint stays a pin-point on screen, however close the camera is.
        float sparkleSize = clamp(1.4 * snowPx / uSparkle.x, 0.06, 0.5);
        float sparkleDot = 1.0 - smoothstep(sparkleSize * 0.4, sparkleSize, length(fract(sparkleP) - 0.5));
        float sparkleSun = smoothstep(0.03, 0.2, dot(reflectedLight.directDiffuse, vec3(0.3333)));
        float sparkleFade = 1.0 - smoothstep(0.7, 2.5, snowPx / uSparkle.x);
        outgoingLight += uSparkleColor * uSparkle.w * sparkleGlint * sparkleOn
          * sparkleDot * sparkleSun * sparkleFade * (1.0 - 0.7 * packed);
        #include <opaque_fragment>`,
      )
      .replace(
        "#include <tonemapping_fragment>",
        /* glsl */ `#include <tonemapping_fragment>
        // Far away the snow melts into the soft sky, like haze at a horizon.
        float haze = smoothstep(uHaze.x, uHaze.y, length(vSnowPos.xz - uHaze.zw));
        vec3 skyColor = mix(uFogBottom, uFogTop, gl_FragCoord.y / uResolution.y);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyColor, haze);`,
      );
  };

  return material;
}

export function SnowGround() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("SnowGround must be inside the snow scene");

  const geometry = useMemo(() => buildGeometry(field), [field]);
  const surround = useMemo(() => buildSurround(field), [field]);
  const material = useMemo(() => buildMaterial(), []);

  useFrame((state) => {
    state.gl.getDrawingBufferSize(sharedUniforms.uResolution.value);

    const dirty = field.takeDirty();
    if (!dirty) return;

    const position = geometry.getAttribute("position") as BufferAttribute;
    const normal = geometry.getAttribute("normal") as BufferAttribute;
    const pressed = geometry.getAttribute("aPressed") as BufferAttribute;
    const positions = position.array as Float32Array;
    const normals = normal.array as Float32Array;
    const { cols } = field;
    const width = dirty.x1 - dirty.x0 + 1;

    for (let j = dirty.z0; j <= dirty.z1; j++) {
      const rowStart = j * cols + dirty.x0;
      for (let i = dirty.x0; i <= dirty.x1; i++) {
        // The outermost points never change; they belong to the seam.
        if (onRim(field, i, j)) continue;
        const k = j * cols + i;
        positions[k * 3 + 1] = field.height[k];
        field.normalInto(i, j, normals, k * 3);
      }
      // Tell the graphics card about this short run of points only.
      position.addUpdateRange(rowStart * 3, width * 3);
      normal.addUpdateRange(rowStart * 3, width * 3);
      pressed.addUpdateRange(rowStart, width);
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
    pressed.needsUpdate = true;
  });

  return (
    <>
      <mesh
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        frustumCulled={false}
        // Pointer rays skip the big grid; use useSnowPoint instead.
        raycast={() => null}
      />
      <mesh
        geometry={surround}
        material={material}
        receiveShadow
        frustumCulled={false}
        raycast={() => null}
      />
    </>
  );
}
