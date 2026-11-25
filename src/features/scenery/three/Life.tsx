"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DoubleSide, type Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Texture } from "three";

import { useSnow } from "@/features/snow-scene";

import { propPx, propSettings, propSrc, village } from "../content";
import { fitPoint, type GameLane, type VillageProp } from "../village";
import { useReducedMotion } from "./motion";

/**
 * Chimney smoke: Rachel's smoke-puff doodle rising slowly from each cottage's chimney, two puffs half a loop
 * apart, growing and fading. A flat doodle that faces the camera; it holds still (half risen) for reduced motion.
 */
export function ChimneySmoke({ placed }: { placed: (VillageProp & { baseY: number })[] }) {
  const tex = useTexture(propSrc("chimney-smoke"), (loaded) => {
    const t = loaded as Texture;
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
  }) as Texture;
  const reduced = useReducedMotion();
  const s = village.smoke;

  const chimneys = useMemo(
    () =>
      placed.flatMap((p) => {
        const share = village.chimneys[p.id];
        if (share === undefined) return [];
        const along = (share - 0.5) * p.width * (p.flip ? -1 : 1);
        return [{ key: p.key, x: p.x + along, y: p.baseY + p.height * 0.97, z: p.z - 0.02, scale: p.scale }];
      }),
    [placed],
  );

  const h = propSettings("chimney-smoke")!.height;
  const px = propPx("chimney-smoke");
  const w = px ? (h * px.w) / px.h : h;
  const plane = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    // Origin at the bottom-left puff, so it grows up and away from the chimney.
    g.translate(0.35, 0.5, 0);
    return g;
  }, []);
  const puffs = useMemo(
    () =>
      chimneys.flatMap((c) =>
        [0, 0.5].map((offset) => ({
          ...c,
          offset,
          material: new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide }),
        })),
      ),
    [chimneys, tex],
  );
  const refs = useRef<(Mesh | null)[]>([]);
  useEffect(
    () => () => {
      plane.dispose();
      for (const p of puffs) p.material.dispose();
    },
    [plane, puffs],
  );

  useFrame(({ camera, clock }) => {
    puffs.forEach((p, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const u = reduced ? (p.offset === 0 ? 0.45 : -1) : (clock.elapsedTime / s.period + p.offset + p.x * 0.13) % 1;
      mesh.visible = u >= 0;
      if (u < 0) return;
      const k = (1 + s.grow * u) * p.scale * 0.55;
      mesh.position.set(p.x + u * s.rise * 0.25, p.y + u * s.rise, p.z);
      mesh.scale.set(w * k, h * k, 1);
      mesh.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
      // In softly, out slowly.
      p.material.opacity = s.opacity * Math.min(u / 0.2, 1) * (1 - Math.max((u - 0.45) / 0.55, 0));
    });
  });

  return (
    <>
      {puffs.map((p, i) => (
        <mesh
          key={`${p.key}-${p.offset}`}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={plane}
          material={p.material}
          raycast={() => null}
        />
      ))}
    </>
  );
}

/**
 * A few faint footprints and tracks pressed into the snow once at start (`village.tracks`), through the
 * snow scene's own pressGroove, so they shade, fill with fresh snow and take grooves like any dent.
 */
export function Tracks({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useEffect(() => {
    const t = village.tracks;
    for (const walk of t.walks) {
      const [x0, z0] = fitPoint(walk.from[0], walk.from[1], lane);
      const [x1, z1] = fitPoint(walk.to[0], walk.to[1], lane);
      const length = Math.hypot(x1 - x0, z1 - z0);
      const dx = (x1 - x0) / length;
      const dz = (z1 - z0) / length;
      // Across the walk (left and right feet, the two sled runners).
      const sx = -dz;
      const sz = dx;
      if (walk.kind === "sled") {
        for (let d = 0; d <= length; d += t.footRadius) {
          for (const side of [-1, 1]) {
            snow.pressGroove(x0 + dx * d + sx * side * 0.16, z0 + dz * d + sz * side * 0.16, t.footRadius * 0.7, { dig: t.depth });
          }
        }
        continue;
      }
      const step = walk.kind === "hops" ? t.step * 1.5 : t.step;
      let n = 0;
      for (let d = 0; d <= length; d += step, n++) {
        if (walk.kind === "hops") {
          // Rabbit: two small prints side by side, then a gap.
          for (const side of [-1, 1]) {
            snow.pressGroove(x0 + dx * d + sx * side * 0.05, z0 + dz * d + sz * side * 0.05, t.footRadius * 0.6, { dig: t.depth });
          }
        } else {
          const side = n % 2 === 0 ? -1 : 1;
          // A boot print: two touching presses along the walk.
          for (const along of [-0.04, 0.04]) {
            snow.pressGroove(
              x0 + dx * (d + along) + sx * side * 0.09,
              z0 + dz * (d + along) + sz * side * 0.09,
              t.footRadius,
              { dig: t.depth },
            );
          }
        }
      }
    }
  }, [snow, lane]);
  return null;
}
