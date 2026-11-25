"use client";

import { useContext, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  NearestFilter,
  RedFormat,
  UnsignedByteType,
  Vector4,
} from "three";
import { content } from "./content";
import { sharedUniforms } from "./sharedUniforms";
import { SnowContext } from "./snowContext";
import { baseHeightAt, baseNormalInto, type SnowField, type SnowTile } from "./snowField";

// Draws the snow: one big plain surface out to the haze, and on top of it a
// fine tile of grid wherever something has pressed. The plain snow hides
// itself under every tile, and both use the same look, so no seam shows.
// Each frame only the rows that were pressed are re-sent to the graphics card.

/** The border points of a tile, walking once round it. */
function perimeter(tile: SnowTile): number[] {
  const { cols, rows } = tile;
  const out: number[] = [];
  for (let i = 0; i < cols - 1; i++) out.push(i);
  for (let j = 0; j < rows - 1; j++) out.push(j * cols + cols - 1);
  for (let i = cols - 1; i > 0; i--) out.push((rows - 1) * cols + i);
  for (let j = rows - 1; j > 0; j--) out.push(j * cols);
  return out;
}

/** Copy a tile's border onto its hanging lip (heights, slopes, packedness). */
function writeSkirt(
  tile: SnowTile,
  ring: number[],
  positions: Float32Array,
  normals: Float32Array,
  pressed: Float32Array,
): void {
  const n = tile.cols * tile.rows;
  const drop = content.ground.skirtDepth;
  ring.forEach((k, p) => {
    const s = n + p;
    positions[s * 3] = positions[k * 3];
    positions[s * 3 + 1] = positions[k * 3 + 1] - drop;
    positions[s * 3 + 2] = positions[k * 3 + 2];
    normals[s * 3] = normals[k * 3];
    normals[s * 3 + 1] = normals[k * 3 + 1];
    normals[s * 3 + 2] = normals[k * 3 + 2];
    pressed[s] = pressed[k];
  });
}

/** A tile as a mesh: its grid points, slopes, how packed the snow is, and its hidden lip. */
function buildTileGeometry(field: SnowField, tile: SnowTile): BufferGeometry {
  const { cols, rows } = tile;
  const n = cols * rows;
  const ring = perimeter(tile);
  const total = n + ring.length;
  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const pressed = new Float32Array(total);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      positions[k * 3] = tile.xAt(i);
      positions[k * 3 + 1] = tile.height[k];
      positions[k * 3 + 2] = tile.zAt(j);
      field.normalInto(tile, i, j, normals, k * 3);
      pressed[k] = tile.pressed[k];
    }
  }
  writeSkirt(tile, ring, positions, normals, pressed);

  const indices = new Uint32Array((cols - 1) * (rows - 1) * 6 + ring.length * 12);
  let m = 0;
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // Alternate which way each square is split, so steep groove walls
      // do not turn into a saw-tooth in one diagonal direction.
      if ((i + j) % 2 === 0) {
        indices.set([a, c, b, b, c, d], m);
      } else {
        indices.set([a, c, d, a, d, b], m);
      }
      m += 6;
    }
  }
  // The lip, facing both ways (it is only ever seen through a hairline gap).
  for (let p = 0; p < ring.length; p++) {
    const a = ring[p];
    const b = ring[(p + 1) % ring.length];
    const sa = n + p;
    const sb = n + ((p + 1) % ring.length);
    indices.set([a, sa, b, b, sa, sb, a, b, sa, b, sb, sa], m);
    m += 12;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("aPressed", new BufferAttribute(pressed, 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  geometry.userData.ring = ring;
  return geometry;
}

/** Grid lines for the plain snow: fine near the middle, growing with distance. */
function plainLines(): number[] {
  const f = content.surround;
  const lines = [0];
  let step: number = f.nearStep;
  let at = 0;
  while (at < f.reach) {
    if (at > f.nearSize) step = Math.min(step * f.growth, f.maxStep);
    at += step;
    lines.push(at);
  }
  return [...lines.slice(1).map((v) => -v).reverse(), ...lines];
}

/** The plain, never-pressed snow everywhere. Cheap: big squares far away. */
function buildPlainSnow(): BufferGeometry {
  const lines = plainLines();
  const count = lines.length;
  const positions = new Float32Array(count * count * 3);
  const normals = new Float32Array(count * count * 3);
  for (let j = 0; j < count; j++) {
    for (let i = 0; i < count; i++) {
      const k = (j * count + i) * 3;
      positions[k] = lines[i];
      positions[k + 1] = baseHeightAt(lines[i], lines[j]);
      positions[k + 2] = lines[j];
      baseNormalInto(lines[i], lines[j], normals, k);
    }
  }
  const indices = new Uint32Array((count - 1) * (count - 1) * 6);
  let n = 0;
  for (let j = 0; j < count - 1; j++) {
    for (let i = 0; i < count - 1; i++) {
      const a = j * count + i;
      indices.set([a, a + count, a + 1, a + 1, a + count, a + count + 1], n);
      n += 6;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  // Never pressed: all zeros.
  geometry.setAttribute("aPressed", new BufferAttribute(new Float32Array(count * count), 1));
  geometry.setIndex(new BufferAttribute(indices, 1));
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

/**
 * The snow look. The plain snow's copy also hides itself wherever a tile has
 * been made (it reads which squares have tiles from `tiles`).
 */
function buildMaterial(plain: boolean, tiles: DataTexture, tilesAcross: number): MeshStandardMaterial {
  const g = content.ground;
  const s = content.surface;
  const material = new MeshStandardMaterial({
    color: content.colors.snow,
    roughness: s.roughness,
    metalness: 0,
    dithering: true,
  });
  if (plain) material.defines = { SNOW_PLAIN: "" };
  material.customProgramCacheKey = () => (plain ? "snow-plain" : "snow-tile");

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
      // Fine ripples, drawn as shading everywhere (x, y < 0 = always on);
      // z, w = ripple size and steepness.
      uFarRipple: {
        value: new Vector4(
          -2,
          -1,
          g.rippleScale,
          2 * g.rippleHeight * g.rippleScale,
        ),
      },
      // Which squares have a tile, and how big a square is.
      uTiles: { value: tiles },
      // tile size, tiles across, how far the plain snow overlaps the outer edge
      uTileInfo: { value: new Vector4(g.tileSize, tilesAcross, g.cell * 0.4, 0) },
      // where the far snow starts and finishes melting into the sky
      uHaze: {
        value: new Vector4(content.haze.start, content.haze.end, 0, content.ground.centerZ),
      },
      // uSparkleColor and uSparkle come from sharedUniforms (the time of day changes them).
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
        uniform sampler2D uTiles;
        uniform vec4 uTileInfo;
        bool snowTileAt(vec2 c) {
          if (any(lessThan(c, vec2(0.0))) || any(greaterThanEqual(c, vec2(uTileInfo.y)))) return false;
          return texture2D(uTiles, (c + 0.5) / uTileInfo.y).r > 0.5;
        }
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
        #ifdef SNOW_PLAIN
          // A tile is drawn here instead: step aside. Along the outer edge of
          // the pressed area (where the next square has no tile) stay a hair
          // over the tile, so no hairline gap can show between the two.
          vec2 tileCell = floor(vSnowPos.xz / uTileInfo.x) + uTileInfo.y * 0.5;
          if (snowTileAt(tileCell)) {
            vec2 inTile = fract(vSnowPos.xz / uTileInfo.x);
            float edge = uTileInfo.z / uTileInfo.x;
            float sx = inTile.x < edge ? -1.0 : (inTile.x > 1.0 - edge ? 1.0 : 0.0);
            float sz = inTile.y < edge ? -1.0 : (inTile.y > 1.0 - edge ? 1.0 : 0.0);
            bool overlap = (sx != 0.0 && !snowTileAt(tileCell + vec2(sx, 0.0)))
              || (sz != 0.0 && !snowTileAt(tileCell + vec2(0.0, sz)));
            if (!overlap) discard;
          }
        #endif
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

/** Ask for a texture to be sent to the graphics card again. */
function resend(texture: DataTexture): void {
  texture.needsUpdate = true;
}

export function SnowGround() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("SnowGround must be inside the snow scene");

  const parts = useMemo(() => {
    const across = field.occupancySize;
    const tiles = new DataTexture(field.occupancy, across, across, RedFormat, UnsignedByteType);
    tiles.magFilter = NearestFilter;
    tiles.minFilter = NearestFilter;
    // One byte per square, rows of any width.
    tiles.unpackAlignment = 1;
    tiles.needsUpdate = true;
    const plain = new Mesh(buildPlainSnow(), buildMaterial(true, tiles, across));
    plain.receiveShadow = true;
    plain.frustumCulled = false;
    plain.raycast = () => {};
    const tileMaterial = buildMaterial(false, tiles, across);
    const group = new Group();
    return { tiles, plain, tileMaterial, group, meshes: new Map<SnowTile, Mesh>() };
  }, [field]);

  useEffect(
    () => () => {
      parts.tiles.dispose();
      parts.plain.geometry.dispose();
      (parts.plain.material as MeshStandardMaterial).dispose();
      parts.tileMaterial.dispose();
      for (const mesh of parts.meshes.values()) mesh.geometry.dispose();
    },
    [parts],
  );

  useFrame((state, seconds) => {
    state.gl.getDrawingBufferSize(sharedUniforms.uResolution.value);

    // Fresh snowfall: refill a step, before the changed rows are sent below.
    field.stepFresh(seconds);

    // New tiles: make their meshes and tell the plain snow to step aside.
    const fresh = field.takeNewTiles();
    if (fresh.length > 0) {
      for (const tile of fresh) {
        const mesh = new Mesh(buildTileGeometry(field, tile), parts.tileMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.raycast = () => {};
        parts.meshes.set(tile, mesh);
        parts.group.add(mesh);
      }
      resend(parts.tiles);
    }

    // Freed tiles (smooth again after a fresh snowfall): the plain snow takes
    // over, with exactly the same shape, so nothing changes on screen.
    const freed = field.takeFreedTiles();
    if (freed.length > 0) {
      for (const tile of freed) {
        const mesh = parts.meshes.get(tile);
        if (!mesh) continue;
        parts.group.remove(mesh);
        mesh.geometry.dispose();
        parts.meshes.delete(tile);
      }
      resend(parts.tiles);
    }

    // Pressed tiles: re-send only the changed rows.
    for (const [tile, mesh] of parts.meshes) {
      const dirty = tile.takeDirty();
      if (!dirty) continue;
      const geometry = mesh.geometry;
      const position = geometry.getAttribute("position") as BufferAttribute;
      const normal = geometry.getAttribute("normal") as BufferAttribute;
      const pressed = geometry.getAttribute("aPressed") as BufferAttribute;
      const positions = position.array as Float32Array;
      const normals = normal.array as Float32Array;
      const { cols } = tile;
      const width = dirty.x1 - dirty.x0 + 1;
      const pressedValues = pressed.array as Float32Array;
      for (let j = dirty.z0; j <= dirty.z1; j++) {
        const rowStart = j * cols + dirty.x0;
        for (let i = dirty.x0; i <= dirty.x1; i++) {
          const k = j * cols + i;
          positions[k * 3 + 1] = tile.height[k];
          field.normalInto(tile, i, j, normals, k * 3);
          pressedValues[k] = tile.pressed[k];
        }
        position.addUpdateRange(rowStart * 3, width * 3);
        normal.addUpdateRange(rowStart * 3, width * 3);
        pressed.addUpdateRange(rowStart, width);
      }
      // A changed border: move the hidden lip with it.
      if (dirty.x0 === 0 || dirty.z0 === 0 || dirty.x1 === cols - 1 || dirty.z1 === tile.rows - 1) {
        const ring = geometry.userData.ring as number[];
        const start = cols * tile.rows;
        writeSkirt(tile, ring, positions, normals, pressedValues);
        position.addUpdateRange(start * 3, ring.length * 3);
        normal.addUpdateRange(start * 3, ring.length * 3);
        pressed.addUpdateRange(start, ring.length);
      }
      position.needsUpdate = true;
      normal.needsUpdate = true;
      pressed.needsUpdate = true;
    }
  });

  return (
    <>
      <primitive object={parts.plain} />
      <primitive object={parts.group} />
    </>
  );
}
