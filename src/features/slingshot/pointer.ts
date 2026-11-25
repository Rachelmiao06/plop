/**
 * Mouse, trackpad and touch input, all through pointer events.
 * A pointer that goes down on a character is "claimed": it drags that character's ball
 * and nothing else should react to it (a 3D camera should ask `isClaimed`, or use `onClaim`).
 * Pointers that start anywhere else are left alone. Each finger is separate, so two
 * fingers can drag the two characters at once.
 */
import type { PlayerId, Slingshot } from "./simulation";
import type { Vec2 } from "./vec";

export type PointerInputOptions = {
  /**
   * Screen point → point on the ground (scene x, z), or null if it misses.
   * In 3D: cast a ray from the camera and hit the untouched snow surface.
   */
  toGround: (clientX: number, clientY: number) => Vec2 | null;
  /** Called the moment a pointer is claimed (for example: `claimSnowPointer(pointerId)`). */
  onClaim?: (pointerId: number, player: PlayerId) => void;
};

export type PointerInput = {
  /** True while this pointer is dragging a character. */
  isClaimed(pointerId: number): boolean;
  dispose(): void;
};

type Claim = { player: PlayerId; offset: Vec2 };

export function createPointerInput(
  sim: Slingshot,
  element: HTMLElement,
  options: PointerInputOptions,
): PointerInput {
  const claims = new Map<number, Claim>();

  const taken = (player: PlayerId) => [...claims.values()].some((c) => c.player === player);

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const point = options.toGround(e.clientX, e.clientY);
    if (!point) return;
    const player = sim.playerAt(point);
    if (!player || taken(player) || !sim.press(player)) return;
    // Pull relative to where the finger landed, so the ball starts right under the character.
    const home = sim.players[player].home;
    claims.set(e.pointerId, { player, offset: { x: home.x - point.x, z: home.z - point.z } });
    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      // capture is a nicety (keeps the drag when leaving the element)
    }
    e.preventDefault();
    options.onClaim?.(e.pointerId, player);
  };

  const onMove = (e: PointerEvent) => {
    const claim = claims.get(e.pointerId);
    if (!claim) return;
    const point = options.toGround(e.clientX, e.clientY);
    if (!point) return;
    sim.setTarget(claim.player, { x: point.x + claim.offset.x, z: point.z + claim.offset.z });
  };

  const end = (e: PointerEvent, throwIt: boolean) => {
    const claim = claims.get(e.pointerId);
    if (!claim) return;
    claims.delete(e.pointerId);
    if (throwIt) sim.release(claim.player);
    else sim.cancel(claim.player, "interrupted");
  };
  const onUp = (e: PointerEvent) => end(e, true);
  const onCancel = (e: PointerEvent) => end(e, false);

  element.addEventListener("pointerdown", onDown);
  element.addEventListener("pointermove", onMove);
  element.addEventListener("pointerup", onUp);
  element.addEventListener("pointercancel", onCancel);
  element.addEventListener("lostpointercapture", onUp);

  return {
    isClaimed: (pointerId) => claims.has(pointerId),
    dispose() {
      element.removeEventListener("pointerdown", onDown);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      element.removeEventListener("pointercancel", onCancel);
      element.removeEventListener("lostpointercapture", onUp);
    },
  };
}
