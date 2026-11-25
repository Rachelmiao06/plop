"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { getLayout, type SnowLayout } from "./layout";
import { groundPoint } from "./pointers";
import type { SnowApi } from "./snowField";
import type { SnowField } from "./snowField";

export const SnowContext = createContext<SnowField | null>(null);

/**
 * The snow's press / crater / height API.
 * Use inside anything rendered as a child of <SnowScene>.
 */
export function useSnow(): SnowApi {
  const field = useContext(SnowContext);
  if (!field) throw new Error("useSnow must be used inside <SnowScene>");
  return field;
}

/**
 * Where the two characters stand for the current screen shape.
 * Use inside anything rendered as a child of <SnowScene>.
 */
export function useSnowLayout(): SnowLayout {
  const aspect = useThree((s) => s.size.width / Math.max(s.size.height, 1));
  return useMemo(() => getLayout(aspect), [aspect]);
}

/**
 * Gives a function that turns a screen position (clientX, clientY from a
 * pointer event) into the point on the snow under it, or null for the sky.
 * Use inside anything rendered as a child of <SnowScene>.
 */
export function useSnowPoint(): (
  clientX: number,
  clientY: number,
) => { x: number; z: number } | null {
  const field = useContext(SnowContext);
  if (!field) throw new Error("useSnowPoint must be used inside <SnowScene>");
  const get = useThree((s) => s.get);
  return useCallback(
    (clientX, clientY) => {
      const out = { x: 0, z: 0 };
      const { gl, camera } = get();
      return groundPoint(clientX, clientY, gl.domElement, camera, field.heightAt, out)
        ? out
        : null;
    },
    [field, get],
  );
}
