import type { FreshSnowfallOptions, SnowField } from "./snowField";

// Fresh snowfall can be asked for from anywhere: a button on top of the
// scene, a key, or a feature inside it. The snow currently on screen
// registers itself here, so callers need no access to the 3D scene.

let current: SnowField | null = null;

/** Called by the canvas when its snow appears and disappears. */
export function setCurrentSnow(field: SnowField | null): void {
  current = field;
}

/**
 * Fresh snowfall over all the snow: the falling snow gets heavier, then every
 * groove and crater settles back to smooth, untouched snow over a few seconds
 * (default in content.ts), and the pressed tiles are freed. Safe to call again
 * while one is running. Does nothing if no snow scene is on screen.
 */
export function freshSnowfall(options?: FreshSnowfallOptions): void {
  current?.freshSnowfall(options);
}

/**
 * Fresh snowfall on one round patch only: centre x, z and radius in scene
 * units. It fades out towards the edge of the circle.
 */
export function freshSnowfallAt(
  x: number,
  z: number,
  radius: number,
  options?: FreshSnowfallOptions,
): void {
  current?.freshSnowfallAt(x, z, radius, options);
}

/** For test pages: how many pressed tiles exist (0 = all snow untouched). */
export function snowTileCount(): number {
  return current?.tileCount() ?? 0;
}
