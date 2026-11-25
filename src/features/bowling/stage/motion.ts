/**
 * "Reduce motion" from the device settings, read without React so the per-frame drawing can use it.
 * Returns the share of squash, stretch and hops to keep: 1 normally, `LOOK.reducedMotion` when asked
 * for less motion. Vibration and sound never change with it.
 */
import { LOOK } from "../content";

const QUERY = "(prefers-reduced-motion: reduce)";
let reduced: boolean | null = null;

export function motionShare(): number {
  if (reduced === null) {
    if (typeof window === "undefined" || !window.matchMedia) return 1;
    const mq = window.matchMedia(QUERY);
    reduced = mq.matches;
    mq.addEventListener("change", (e) => (reduced = e.matches));
  }
  return reduced ? LOOK.reducedMotion : 1;
}
