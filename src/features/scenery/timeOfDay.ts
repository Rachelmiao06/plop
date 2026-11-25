/*
  The match's time of day, t from 0 to 1: 0 = afternoon, 0.5 = sunset, 1 = a cosy evening.
  One value that the sky (here) and the snow and light (scene-polish) both follow. Until the shared store lands
  (proposed: `src/features/snow-scene/timeOfDay.ts`, same names), the sky keeps its own value here; whichever PR
  merges second points `getTimeOfDay` at the shared one. No imports, so any feature can read it cheaply.
*/

let value = 0;
const listeners = new Set<() => void>();

/** Set the time of day (clamped to 0..1). */
export function setTimeOfDay(t: number) {
  const next = Math.min(Math.max(t, 0), 1);
  if (next === value) return;
  value = next;
  for (const fn of listeners) fn();
}

/** The time of day now: a cheap read for useFrame (no React re-render). */
export function getTimeOfDay() {
  return value;
}

/** Called whenever the time of day changes; returns the unsubscribe function. */
export function subscribeTimeOfDay(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
