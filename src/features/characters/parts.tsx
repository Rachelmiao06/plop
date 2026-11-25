"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { forwardRef } from "react";
import * as THREE from "three";

import { beanie, bucketHat, look, shape } from "./content";
import type { SnowmanMaterials } from "./materials";

/** The thin brown pencil line around a part. Same pixel width at any zoom. */
export function Ink({ colour }: { colour: THREE.Color }) {
  const dpr = useThree((state) => state.viewport.dpr);
  return <Outlines thickness={look.outlinePx * dpr} color={colour} toneMapped={false} />;
}

type PartProps = { mats: SnowmanMaterials };

export function BucketHat({ mats }: PartProps) {
  const h = bucketHat;
  return (
    <group position={h.position} rotation={h.rotation}>
      <mesh material={mats.bucket} castShadow>
        <cylinderGeometry args={[h.radiusTop, h.radiusBottom, h.height, 28, 1]} />
        <Ink colour={mats.outlineColour} />
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
        <Ink colour={mats.outlineColour} />
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
      <mesh material={mats.red} castShadow>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, beanie.cut]} />
        <Ink colour={mats.outlineColour} />
      </mesh>
      <mesh position={[0, cuffY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, beanie.cuffHeight]} material={mats.red}>
        <torusGeometry args={[cuffR, beanie.cuffTube, 12, 40]} />
        <Ink colour={mats.outlineColour} />
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
          <boxGeometry args={[0.008, beanie.cuffTube * beanie.cuffHeight * 1.2, 0.01]} />
        </mesh>
      ))}
      <mesh position={[0, r * 1.02, 0]} material={mats.pompom} castShadow>
        <icosahedronGeometry args={[beanie.pompomRadius, 3]} />
        <Ink colour={mats.outlineColour} />
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
        <Ink colour={mats.outlineColour} />
      </RoundedBox>
      {fringe.map((x) => (
        <mesh key={x} position={[x, -length - 0.022, 0]} material={material}>
          <boxGeometry args={[0.012, 0.045, 0.016]} />
          <Ink colour={mats.outlineColour} />
        </mesh>
      ))}
    </group>
  );
});
