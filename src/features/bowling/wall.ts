/**
 * The back wall of the lane: the paper theatre's curved sky (scenery's `Backdrop`) with the snow bank at its foot.
 * A plain module with no imports, so the scenery can tell the roll where its paper wall stands and hear where a ball
 * hit it, without either feature pulling in the other's drawing code.
 *
 * - The backdrop calls `setBackWall` with the circle its wall stands on (the throwing view's look-at point and the
 *   wall's radius; it moves with the lane length and on a phone held upright), and `setBackWall(null)` when it goes.
 * - The roll reads `backWall()` each step (`Ground.wall`) and bounces off it, `FEEL.wall.inset` in front of the paper.
 * - The bowling stage calls `emitWallHit` when a ball meets the wall; the backdrop listens with `onWallHit` and gives
 *   a little paper wobble where it was hit.
 */

/** A circle on the snow (x, z) the wall stands on: the ball bounces back inside it. */
export type BackWall = { cx: number; cz: number; radius: number };

/** Where a ball met the wall (on the snow, x and z) and how hard, 0 a touch .. 1 a full-power hit. */
export type WallHit = { x: number; z: number; strength: number };

let wall: BackWall | null = null;
const listeners = new Set<(hit: WallHit) => void>();

/** Where the paper wall stands now (null: no backdrop on this page, the ball just rolls on). */
export function backWall(): BackWall | null {
  return wall;
}

/** The backdrop says where its wall stands (null when it goes away). */
export function setBackWall(next: BackWall | null): void {
  wall = next;
}

/** A ball met the wall: tell whoever listens (the backdrop's wobble). */
export function emitWallHit(hit: WallHit): void {
  listeners.forEach((fn) => fn(hit));
}

/** Listen for balls meeting the wall. Returns the function that stops listening. */
export function onWallHit(fn: (hit: WallHit) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
