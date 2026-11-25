"use client";

import { useEffect } from "react";

import { useSnow } from "@/features/snow-scene";

import { village } from "../content";
import { fitPoint, type GameLane } from "../village";

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
