"use client";

import { createContext, useContext, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { getLayout, type SnowLayout } from "./layout";
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
