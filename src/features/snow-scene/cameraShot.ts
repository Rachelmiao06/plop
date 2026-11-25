/**
 * Camera shots: a feature (the game) can ask the snow scene's camera to move somewhere for a moment —
 * ride behind a ball, swing round to watch the pins — and later let it glide back to the player's own view.
 *
 * The camera never jumps. Each frame the rig works out the player's own view (path, turn, zoom, the default
 * view) and then adds a smooth offset that a critically damped spring pulls toward the shot. Clearing the
 * shot springs that offset back to nothing, so the view glides home. While no shot is set the offset is
 * zero, so the player's own turning and zooming never lag.
 *
 * Plain module state (no React), read by `CameraRig` every frame. Import from `@/features/snow-scene`.
 */

import { content } from "./content";

export type Vec3 = [number, number, number];

export type SnowCameraShot = {
  /** Where the camera should be (scene units). Leave out to start from the player's own view. */
  position?: Vec3;
  /** The point it should look at. Leave out to keep the player's own look-at point. */
  lookAt?: Vec3;
  /** Vertical field of view in degrees. Leave out for the scene's own lens. */
  fov?: number;
  /**
   * Changes on top of the player's own view, so turning and zooming still work underneath (used while
   * aiming): move this share of the way toward the look-at point (0..1), this many units lower, and shift
   * the look-at point. Ignored for any part given as `position` / `lookAt`.
   */
  closer?: number;
  lower?: number;
  lookShift?: Vec3;
  /**
   * How tightly the camera follows the shot: the spring's rate (per second). About 2 = a calm glide,
   * 6 = follows with a little physical lag, 12 = tight. `lookRate` for the look-at point (default `rate`).
   */
  rate: number;
  lookRate?: number;
  /** A drag, scroll, pinch or key press drops this shot and hands the view back to the player. */
  interruptible?: boolean;
};

/** A one-off push: velocity added to the camera's springs (a launch kick). */
export type SnowCameraKick = {
  /** Units per second along the way the camera looks (positive = toward what it looks at). */
  forward?: number;
  /** Degrees per second added to the field of view (positive = wider, sells speed). */
  fov?: number;
};

type ShotStore = {
  shot: SnowCameraShot | null;
  /** Spring rate used to glide back once the shot is cleared. */
  releaseRate: number;
  kicks: SnowCameraKick[];
  /** True once the player took the view back during an interruptible shot; such shots are ignored until `resume`. */
  taken: boolean;
};

/** Read by the camera rig. */
export const snowCameraShots: ShotStore = { shot: null, releaseRate: content.shots.releaseRate, kicks: [], taken: false };

/**
 * Ask the camera for a shot, or pass `null` to glide back to the player's own view at `releaseRate`
 * (spring rate per second; default 2, a calm glide). Call every frame with a moving target (a ball):
 * the spring smooths it. While the player has taken the view back (`snowCameraTaken()`), interruptible
 * shots are ignored until `resumeSnowCamera()`.
 */
export function setSnowCameraShot(shot: SnowCameraShot | null, releaseRate: number = content.shots.releaseRate): void {
  if (shot?.interruptible && snowCameraShots.taken) shot = null;
  snowCameraShots.shot = shot;
  if (!shot) snowCameraShots.releaseRate = releaseRate;
}

/** A one-off push on the camera's springs (adds velocity; the springs settle it). */
export function kickSnowCamera(kick: SnowCameraKick): void {
  snowCameraShots.kicks.push(kick);
}

/** True when the player took the view back during an interruptible shot (a drag, scroll or key). */
export function snowCameraTaken(): boolean {
  return snowCameraShots.taken;
}

/** Allow interruptible shots again (call at the start of the next turn). */
export function resumeSnowCamera(): void {
  snowCameraShots.taken = false;
}

/** Called by the rig on any player input: drops an interruptible shot. */
export function playerMovedCamera(): void {
  const shot = snowCameraShots.shot;
  if (shot?.interruptible) {
    snowCameraShots.taken = true;
    snowCameraShots.shot = null;
    snowCameraShots.releaseRate = content.shots.takeoverRate;
  }
}

/**
 * One critically damped spring step (exact for any frame length, so it never overshoots or explodes):
 * moves `value` toward `target` with velocity `velocity`, rate `omega` per second.
 */
export function springStep(
  value: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number,
): [number, number] {
  const y = value - target;
  const j1 = velocity + omega * y;
  const e = Math.exp(-omega * dt);
  return [target + (y + j1 * dt) * e, (velocity - omega * j1 * dt) * e];
}
