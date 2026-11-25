"use client";

// The outline hull and its uniforms are Three.js objects updated in effects, as React Three Fiber expects.
/* eslint-disable react-hooks/immutability */

import { RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { forwardRef, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { beanie, bucketHat, look, shape } from "./content";
import type { SnowmanMaterials } from "./materials";

/**
 * The thick, slightly wobbly brown crayon line around a part. Put it inside a mesh:
 * it copies the mesh's shape, smooths its normals, and draws the back faces pushed outward.
 */
export function Ink({ material }: { material: THREE.ShaderMaterial }) {
  const group = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  useEffect(() => {
    material.uniforms.uSize.value.set(size.width * dpr, size.height * dpr);
    material.uniforms.uMinPx.value = look.outlineMinPx * dpr;
    material.uniforms.uMaxPx.value = look.outlineMaxPx * dpr;
  }, [material, size, dpr]);

  useLayoutEffect(() => {
    const holder = group.current;
    const parent = holder?.parent as THREE.Mesh | null;
    if (!holder || !parent?.geometry) return;
    const geometry = toCreasedNormals(parent.geometry, Math.PI);
    const hull = new THREE.Mesh(geometry, material);
    hull.raycast = () => {};
    holder.add(hull);
    return () => {
      holder.remove(hull);
      geometry.dispose();
    };
  }, [material]);

  return <group ref={group} />;
}

type PartProps = { mats: SnowmanMaterials };

export function BucketHat({ mats }: PartProps) {
  const h = bucketHat;
  return (
    <group position={h.position} rotation={h.rotation}>
      <mesh material={mats.bucket} castShadow>
        <cylinderGeometry args={[h.radiusTop, h.radiusBottom, h.height, 28, 1]} />
        <Ink material={mats.outline} />
      </mesh>
      {/* The inside of the bucket, seen from above: a pale disc inside the rim. */}
      <mesh position={[0, h.height / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.snowShade}>
        <circleGeometry args={[h.radiusTop * 0.8, 28]} />
      </mesh>
      {/* Wire handle: a loose loop hanging off the bucket's outer side, over the head. */}
      <mesh
        position={[h.radiusBottom + 0.012, -h.height * 0.18, 0.035]}
        rotation={[0, -0.35, Math.PI + 0.25]}
        material={mats.handle}
      >
        <torusGeometry args={[h.handleRadius, h.handleTube, 6, 24, Math.PI]} />
        <Ink material={mats.outline} />
      </mesh>
    </group>
  );
}

export function Beanie({ mats }: PartProps) {
  const r = shape.head.radius * beanie.grow;
  const cuffY = r * Math.cos(beanie.cut);
  const cuffR = r * Math.sin(beanie.cut);
  const ribs = Array.from({ length: beanie.ribs }, (_, i) => (i / beanie.ribs) * Math.PI * 2);
  return (
    <group rotation={beanie.tilt}>
      <mesh
        material={mats.red}
        position={[0, cuffY * (1 - beanie.domeHeight), 0]}
        scale={[1, beanie.domeHeight, 1]}
        castShadow
      >
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, beanie.cut]} />
        <Ink material={mats.outline} />
      </mesh>
      <mesh position={[0, cuffY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, beanie.cuffHeight]} material={mats.red}>
        <torusGeometry args={[cuffR, beanie.cuffTube, 12, 40]} />
        <Ink material={mats.outline} />
      </mesh>
      {/* Underside of the cap, so it never looks hollow when it flies off. */}
      <mesh position={[0, cuffY, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.red}>
        <circleGeometry args={[cuffR, 32]} />
      </mesh>
      {/* Knitted ribs: short pencil lines around the cuff. */}
      {ribs.map((angle) => (
        <mesh
          key={angle}
          position={[
            Math.sin(angle) * (cuffR + beanie.cuffTube * 0.97),
            cuffY,
            Math.cos(angle) * (cuffR + beanie.cuffTube * 0.97),
          ]}
          rotation={[0, angle, 0]}
          material={mats.ribs}
        >
          <boxGeometry args={[0.016, beanie.cuffTube * beanie.cuffHeight * 1.15, 0.012]} />
        </mesh>
      ))}
      <mesh position={[0, cuffY + (r - cuffY) * beanie.domeHeight * 1.02, 0]} material={mats.pompom} castShadow>
        <icosahedronGeometry args={[beanie.pompomRadius, 3]} />
        <Ink material={mats.outline} />
      </mesh>
    </group>
  );
}

/** One hanging scarf end with a fringe. The group is the pivot at the top, so springs can swing it. */
export const ScarfEnd = forwardRef<
  THREE.Group,
  PartProps & { material: THREE.Material; length: number; position: [number, number, number] }
>(function ScarfEnd({ mats, material, length, position }, ref) {
  const width = 0.085;
  const fringe = [-0.03, -0.01, 0.01, 0.03];
  return (
    <group ref={ref} position={position}>
      <RoundedBox
        args={[width, length, 0.026]}
        radius={0.01}
        smoothness={2}
        position={[0, -length / 2, 0]}
        material={material}
        castShadow
      >
        <Ink material={mats.outline} />
      </RoundedBox>
      {fringe.map((x) => (
        <mesh key={x} position={[x, -length - 0.022, 0]} material={material}>
          <boxGeometry args={[0.012, 0.045, 0.016]} />
          <Ink material={mats.outline} />
        </mesh>
      ))}
    </group>
  );
});
