"use client";

import { useSyncExternalStore } from "react";
import { getTimeOfDay, subscribeTimeOfDay } from "./timeOfDay";

/** The time of day as React state (re-renders when it changes). For per-frame work use getTimeOfDay. */
export function useTimeOfDay(): number {
  return useSyncExternalStore(subscribeTimeOfDay, getTimeOfDay, () => 0);
}
