"use client";

/**
 * "The loading screen has gone": a tiny store so a page can start its own entrance (the invite envelope) only once
 * the paper screen has cleared. Module state, browser only.
 */
import { useSyncExternalStore } from "react";

let loaded = false;
const listeners = new Set<() => void>();

export function markLoaded() {
  if (loaded) return;
  loaded = true;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True once the loading screen has cleared (false on the server). */
export function useLoaded(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}
