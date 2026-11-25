"use client";

import { useContext, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector2,
} from "three";
import { content } from "./content";
import { SnowContext } from "./snowContext";
import type { SnowField } from "./snowField";

// The cut side of the snow slab: you can see how thick the snow is, and the
// thin darker base it sits on. Plus the soft shadow the whole block rests in.

type OutlinePoint = { x: number; z: number; nx: number; nz: number };

/** Points walking once round the slab's rounded edge, with the outward direction at each. */
function slabOutline(step: number): OutlinePoint[] {
  const g = content.ground;
  const r = g.cornerRadius;
  const cx = g.sizeX / 2 - r;
  const cz = g.sizeZ / 2 - r;
  // Corner centres, and the angle each corner's arc starts at.
  const corners = [
    { x: cx, z: cz, start: 0 },
    { x: -cx, z: cz, start: 90 },
    { x: -cx, z: -cz, start: 180 },
    { x: cx, z: -cz, start: 270 },
  ];
  const points: OutlinePoint[] = [];
  const arcSteps = Math.max(Math.ceil(((Math.PI / 2) * r) / step), 4);

  corners.forEach((corner, n) => {
    for (let s = 0; s <= arcSteps; s++) {
      const a = ((corner.start + (90 * s) / arcSteps) * Math.PI) / 180;
      points.push({
        x: corner.x + Math.cos(a) * r,
        z: g.centerZ + corner.z + Math.sin(a) * r,
        nx: Math.cos(a),
        nz: Math.sin(a),
      });
    }
    // The straight side from this corner to the next one.
    const from = points[points.length - 1];
    const next = corners[(n + 1) % 4];
    const a = (next.start * Math.PI) / 180;
    const toX = next.x + Math.cos(a) * r;
    const toZ = g.centerZ + next.z + Math.sin(a) * r;
    const sideSteps = Math.ceil(Math.hypot(toX - from.x, toZ - from.z) / step);
    for (let s = 1; s < sideSteps; s++) {
      const t = s / sideSteps;
      points.push({
        x: from.x + (toX - from.x) * t,
        z: from.z + (toZ - from.z) * t,
        nx: from.nx,
        nz: from.nz,
      });
    }
  });
  return points;
}

function buildWall(field: SnowField): BufferGeometry {
  const g = content.ground;
  const outline = slabOutline(g.cell * 2);
  const count = outline.length;
  const snowBottom = -g.depth;
  const baseBottom = snowBottom - g.baseThickness;

  // Four points down the wall at each step round the edge: snow top, snow
  // bottom, base top (same place, different colour), base bottom.
  const positions = new Float32Array(count * 4 * 3);
  const normals = new Float32Array(count * 4 * 3);
  const colors = new Float32Array(count * 4 * 3);
  const shades = [
    new Color(content.colors.slabSideTop),
    new Color(content.colors.slabSideBottom),
    new Color(content.colors.slabBase),
    new Color(content.colors.slabBase),
  ];

  outline.forEach((p, i) => {
    const heights = [field.heightAt(p.x, p.z), snowBottom, snowBottom, baseBottom];
    heights.forEach((y, row) => {
      const k = (i * 4 + row) * 3;
      positions[k] = p.x;
      positions[k + 1] = y;
      positions[k + 2] = p.z;
      normals[k] = p.nx;
      normals[k + 1] = 0;
      normals[k + 2] = p.nz;
      colors[k] = shades[row].r;
      colors[k + 1] = shades[row].g;
      colors[k + 2] = shades[row].b;
    });
  });

  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = i * 4;
    const b = ((i + 1) % count) * 4;
    for (const row of [0, 2]) {
      indices.push(a + row, b + row, a + row + 1, b + row, b + row + 1, a + row + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function SnowSlab() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("SnowSlab must be inside the snow scene");
  const g = content.ground;
  const wall = useMemo(() => buildWall(field), [field]);

  // A soft shadow under the block, so it sits in the backdrop instead of floating.
  const reach = content.orbit.shadowReach;
  const shadow = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new Color(content.colors.slabShadow) },
          uHalf: { value: new Vector2(g.sizeX / 2, g.sizeZ / 2) },
          uRadius: { value: g.cornerRadius },
          uReach: { value: reach },
          uOpacity: { value: content.orbit.shadowOpacity },
        },
        vertexShader: /* glsl */ `
          varying vec2 vPlace;
          void main() {
            vPlace = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform vec2 uHalf;
          uniform float uRadius;
          uniform float uReach;
          uniform float uOpacity;
          varying vec2 vPlace;
          void main() {
            vec2 q = abs(vPlace) - (uHalf - uRadius);
            float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uRadius;
            float a = uOpacity * (1.0 - smoothstep(-0.3, uReach, d));
            gl_FragColor = vec4(uColor, a * a);
            #include <colorspace_fragment>
          }
        `,
      }),
    [g, reach],
  );

  return (
    <>
      <mesh geometry={wall} receiveShadow raycast={() => null}>
        <meshStandardMaterial vertexColors roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh
        material={shadow}
        position={[0, -g.depth - g.baseThickness - 0.02, g.centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={-500}
        raycast={() => null}
      >
        <planeGeometry args={[g.sizeX + reach * 2, g.sizeZ + reach * 2]} />
      </mesh>
    </>
  );
}
