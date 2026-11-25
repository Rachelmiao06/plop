import { Color } from "three";
import { content } from "./content";

// The time of day, one number for the whole scene: 0 = afternoon, 0.5 = sunset, 1 = evening. A plain module value
// (like freshSnowfall), so it can be set from anywhere, inside or outside the 3D scene, and animated by calling
// setTimeOfDay every frame. The snow scene's light follows it; other features (the village's lights, smoke, sky)
// read the same value with getTimeOfDay (per frame) or useTimeOfDay (React).

let current = 0;
const listeners = new Set<(t: number) => void>();

/** Set the time of day: 0 = afternoon, 0.5 = sunset, 1 = evening (clamped). Cheap; call it every frame to animate. */
export function setTimeOfDay(t: number): void {
  const next = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), 1);
  if (next === current) return;
  current = next;
  for (const fn of listeners) fn(next);
}

/** The time of day now (0 = afternoon, 1 = evening). Cheap: read it inside useFrame. */
export function getTimeOfDay(): number {
  return current;
}

/** Calls `fn` with the new time of day whenever it changes; returns the unsubscribe. */
export function subscribeTimeOfDay(fn: (t: number) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

type Key = (typeof content.timeOfDay.keys)[number];
type NumberKey = { [K in keyof Key]: Key[K] extends number ? K : never }[keyof Key];
type ColorKey = { [K in keyof Key]: Key[K] extends string ? K : never }[keyof Key];

/** The scene's light at time `t`, blended between the keys in content.timeOfDay (colours blended as written). */
export type Lighting = Record<NumberKey, number> & Record<ColorKey, Color>;

const keys = content.timeOfDay.keys;
const numberNames = Object.keys(keys[0]).filter((k) => typeof keys[0][k as keyof Key] === "number") as NumberKey[];
const colorNames = Object.keys(keys[0]).filter((k) => typeof keys[0][k as keyof Key] === "string") as ColorKey[];
// Colours parsed once per key.
const keyColors = keys.map((k) => Object.fromEntries(colorNames.map((n) => [n, new Color(k[n])])) as Record<ColorKey, Color>);

/** Writes the light at time `t` into `out` (no allocation once `out` exists). */
export function lightingAt(t: number, out?: Lighting): Lighting {
  const o = out ?? (Object.fromEntries(colorNames.map((n) => [n, new Color()])) as unknown as Lighting);
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].at) i++;
  const a = keys[i];
  const b = keys[i + 1];
  // Smooth within each stretch, so animating t through a key never kinks.
  const raw = Math.min(Math.max((t - a.at) / (b.at - a.at || 1), 0), 1);
  const u = raw * raw * (3 - 2 * raw);
  for (const n of numberNames) o[n] = a[n] + (b[n] - a[n]) * u;
  for (const n of colorNames) o[n].copy(keyColors[i][n]).lerp(keyColors[i + 1][n], u);
  return o;
}
