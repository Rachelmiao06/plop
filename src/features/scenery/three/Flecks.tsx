"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from "three";

import { standee3d } from "../content";
import { usePaper } from "./treatment";

const MAX = 240;

type Fleck = { pos: Vector3; vel: Vector3; age: number; life: number; size: number };

type Spawn = (at: Vector3, width: number, count: number) => void;

const FleckContext = createContext<Spawn>(() => {});

/** Lets a prop shake a few snow flecks loose: `useFlecks()(topCentre, width, count)`. */
export const useFlecks = () => useContext(FleckContext);

/** The flecks themselves: spawned on a hit, falling under gravity, shrinking away. */
class FleckPool {
  private flecks: Fleck[] = [];
  private dummy = new Object3D();

  spawn: Spawn = (at, width, count) => {
    const w = standee3d.wobble;
    for (let i = 0; i < count; i++) {
      if (this.flecks.length >= MAX) this.flecks.shift();
      this.flecks.push({
        pos: at.clone().add(new Vector3((Math.random() - 0.5) * width, -Math.random() * 0.25, (Math.random() - 0.3) * 0.12)),
        vel: new Vector3((Math.random() - 0.5) * 0.9, Math.random() * 0.9, 0.2 + Math.random() * 0.5),
        age: 0,
        life: w.fleckLife * (0.7 + Math.random() * 0.6),
        size: w.fleckSize * (0.6 + Math.random() * 0.8),
      });
    }
  };

  step(delta: number, mesh: InstancedMesh) {
    const dt = Math.min(delta, 0.05);
    this.flecks = this.flecks.filter((f) => {
      f.age += dt;
      if (f.age > f.life || f.pos.y < -0.05) return false;
      f.vel.y -= 4.5 * dt;
      f.vel.multiplyScalar(1 - 1.2 * dt);
      f.pos.addScaledVector(f.vel, dt);
      return true;
    });
    this.flecks.forEach((f, i) => {
      this.dummy.position.copy(f.pos);
      this.dummy.scale.setScalar(f.size * (1 - (f.age / f.life) * 0.6));
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
    });
    mesh.count = this.flecks.length;
    mesh.instanceMatrix.needsUpdate = true;
  }
}

/** A small pool of falling snow flecks, drawn as one instanced mesh. */
export function Flecks({ children }: { children: ReactNode }) {
  const mesh = useRef<InstancedMesh>(null);
  const [pool] = useState(() => new FleckPool());
  const geometry = useMemo(() => new SphereGeometry(1, 6, 4), []);
  const paper = usePaper();
  const material = useMemo(() => new MeshBasicMaterial({ color: new Color(paper.paper) }), [paper.paper]);

  useFrame((_, delta) => {
    if (mesh.current) pool.step(delta, mesh.current);
  });

  return (
    <FleckContext value={pool.spawn}>
      {children}
      <instancedMesh ref={mesh} args={[geometry, material, MAX]} frustumCulled={false} />
    </FleckContext>
  );
}
