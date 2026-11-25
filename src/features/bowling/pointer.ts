/**
 * Mouse, trackpad and touch input on the thrower, through pointer events.
 * Press on the thrower, then:
 * - drag sideways: slide it along the line;
 * - drag back (toward the camera): pull; sideways while pulling sets the aim. Let go to throw.
 * Which one is decided after the first few pixels of movement.
 * A press on the thrower is "claimed" at once, so the camera ignores it (`onClaim`).
 * Presses anywhere else are left alone (they turn the camera).
 */
import type { Bowling } from "./simulation";
import type { Vec2 } from "./vec";

export type PointerInputOptions = {
  /** Screen point → point on the ground (scene x, z), or null. The snow scene's `useSnowPoint()` fits. */
  toGround: (clientX: number, clientY: number) => Vec2 | null;
  /**
   * Is this screen point on the thrower? (In 3D: a raycast against the standee.)
   * Pressing near its feet on the snow also counts, see `pointer.grabRadius`.
   */
  hitsThrower?: (clientX: number, clientY: number) => boolean;
  /** Called the moment a press is claimed (for example: `claimSnowPointer`). */
  onClaim?: (pointerId: number) => void;
};

export type PointerInput = {
  /** True while this pointer is on the thrower. */
  isClaimed(pointerId: number): boolean;
  dispose(): void;
};

type Grab = {
  pointerId: number;
  mode: "deciding" | "slide" | "pull" | "none";
  startClient: { x: number; y: number };
  startGround: Vec2;
  startX: number;
};

export function createPointerInput(
  game: Bowling,
  element: HTMLElement,
  options: PointerInputOptions,
): PointerInput {
  let grab: Grab | null = null;

  const onDown = (e: PointerEvent) => {
    if (grab || !game.isReady) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const point = options.toGround(e.clientX, e.clientY);
    if (!point) return;
    const foot = game.thrower.foot;
    const near = Math.hypot(point.x - foot.x, point.z - foot.z) <= game.feel.pointer.grabRadius;
    if (!near && !options.hitsThrower?.(e.clientX, e.clientY)) return;
    grab = {
      pointerId: e.pointerId,
      mode: "deciding",
      startClient: { x: e.clientX, y: e.clientY },
      startGround: point,
      startX: game.thrower.x,
    };
    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety (keeps the drag when leaving the element)
    }
    e.preventDefault();
    options.onClaim?.(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (!grab || e.pointerId !== grab.pointerId) return;
    const point = options.toGround(e.clientX, e.clientY);
    if (!point) return;
    const d = { x: point.x - grab.startGround.x, z: point.z - grab.startGround.z };

    if (grab.mode === "deciding") {
      const moved = Math.hypot(e.clientX - grab.startClient.x, e.clientY - grab.startClient.y);
      if (moved < game.feel.pointer.decidePixels) return;
      const back = d.z > 0 && d.z >= game.feel.pointer.pullIfBack * Math.abs(d.x);
      if (back) grab.mode = game.press() ? "pull" : "none";
      else grab.mode = "slide";
    }

    if (grab.mode === "slide") game.slideTo(grab.startX + d.x);
    if (grab.mode === "pull") {
      const foot = game.thrower.foot;
      game.setTarget({ x: foot.x + d.x, z: foot.z + d.z });
    }
  };

  const end = (e: PointerEvent, throwIt: boolean) => {
    if (!grab || e.pointerId !== grab.pointerId) return;
    if (grab.mode === "pull") {
      if (throwIt) game.release();
      else game.cancel("interrupted");
    }
    grab = null;
  };
  const onUp = (e: PointerEvent) => end(e, true);
  const onCancel = (e: PointerEvent) => end(e, false);

  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointercancel", onCancel);
  element.addEventListener("lostpointercapture", onUp);

  return {
    isClaimed: (pointerId) => grab?.pointerId === pointerId,
    dispose() {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onCancel);
      element.removeEventListener("lostpointercapture", onUp);
    },
  };
}
