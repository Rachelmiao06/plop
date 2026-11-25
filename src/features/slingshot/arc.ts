import type { Feel } from "./content";
import { type Vec2, clamp01, length, lerp } from "./vec";

/**
 * One throw, worked out in full before the ball leaves. The aim preview and the
 * real flight both come from `computeArc`, so the ball lands exactly where the
 * preview ring said.
 */
export type Arc = {
  /** Where the ball leaves from (where it sat at the end of the pull). */
  start: Vec2;
  /** Where it lands. */
  landing: Vec2;
  /** Unit direction of the throw (opposite to the pull). */
  direction: Vec2;
  /** Distance along the ground from start to landing. */
  distance: number;
  /** Height of the top of the arc above the ground (on top of the ball's own radius). */
  apex: number;
  /** Seconds in the air. */
  flightTime: number;
  /** Ball radius in flight. */
  ballRadius: number;
  /** Radius of the landing mark: crater, preview ring and hit zone. */
  impactRadius: number;
  /** How hard the pull was, 0..1 (0 = just past the cancel distance, 1 = full pull). */
  power: number;
  /** How big the ball was, 0..1. */
  size: number;
  /** How hard it lands, 0..1. Size counts more than power. */
  strength: number;
};

/**
 * The throw for a ball at `home + pull`, of growth `size` (0..1) and radius `ballRadius`.
 * Returns null when the pull is too short to throw (letting go would cancel).
 */
export function computeArc(
  home: Vec2,
  pull: Vec2,
  size: number,
  ballRadius: number,
  feel: Feel,
): Arc | null {
  const pulled = length(pull);
  const { max, cancelBelow } = feel.pull;
  if (pulled < cancelBelow || pulled < 1e-6) return null;

  const direction = { x: -pull.x / pulled, z: -pull.z / pulled };
  const span = Math.max(1e-6, max - cancelBelow);
  const power = clamp01((Math.min(pulled, max) - cancelBelow) / span);
  const s = clamp01(size);
  const a = feel.arc;

  const range = lerp(a.rangeMin, a.rangeMax, Math.pow(power, a.rangeCurve));
  const start = { x: home.x + pull.x, z: home.z + pull.z };
  const landing = { x: home.x + direction.x * range, z: home.z + direction.z * range };
  const distance = pulled + range; // back through the home spot, then out
  const speed = Math.max(0.1, lerp(a.speedSmall, a.speedBig, s));

  return {
    start,
    landing,
    direction,
    distance,
    apex: distance * lerp(a.heightSmall, a.heightBig, s),
    flightTime: distance / speed,
    ballRadius,
    impactRadius: ballRadius * feel.impact.radiusPerBall,
    power,
    size: s,
    strength: clamp01(0.35 * power + 0.65 * s),
  };
}

/**
 * Where the ball is at `progress` (0 = leaving, 1 = landed) along an arc.
 * `height` is the ball centre above the ground: `ballRadius` at both ends.
 * Moves at a steady speed along the ground, like a thrown ball seen from above.
 */
export function arcPoint(arc: Arc, progress: number): { position: Vec2; height: number } {
  const u = clamp01(progress);
  return {
    position: {
      x: lerp(arc.start.x, arc.landing.x, u),
      z: lerp(arc.start.z, arc.landing.z, u),
    },
    height: arc.ballRadius + 4 * arc.apex * u * (1 - u),
  };
}
