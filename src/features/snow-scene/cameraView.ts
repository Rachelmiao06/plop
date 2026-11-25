"use client";

import { useEffect } from "react";
import { snowCameraHome, type SnowViewSettings } from "./pointers";

/**
 * Sets the camera's default view from inside <SnowScene>: the point it looks
 * at, where on the path it starts, and an optional turn and distance. The
 * camera jumps there straight away; "Reset view" glides back to it; every
 * input (turning, the path, all limits) works as before around it. When the
 * component using it goes away, the scene's own play view comes back.
 * Pass the same numbers each render (or a stable object); changing them sets
 * a new default and jumps there again.
 */
export function useSnowCameraView(view: SnowViewSettings | null): void {
  const [x, y, z] = view?.lookAt ?? [0, 0, 0];
  const pathAt = view?.pathAt;
  const turn = view?.turn;
  const distance = view?.distance;
  const on = view !== null;
  useEffect(() => {
    if (!on || pathAt === undefined) return;
    snowCameraHome.view = { lookAt: [x, y, z], pathAt, turn, distance };
    snowCameraHome.version += 1;
    return () => {
      snowCameraHome.view = null;
      snowCameraHome.version += 1;
    };
  }, [on, x, y, z, pathAt, turn, distance]);
}

/** The same as `useSnowCameraView`, as a component: `<SnowCameraView lookAt={[0, 0.4, -1.5]} pathAt={0.15} />`. */
export function SnowCameraView(props: SnowViewSettings): null {
  useSnowCameraView(props);
  return null;
}
