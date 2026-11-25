/**
 * Light phone vibration. Android browsers support it; iPhones (Safari) and computers
 * ignore it silently. Temporary home: moves to a shared `src/lib/haptics.ts` in a later issue.
 */
export function vibrate(milliseconds: number): void {
  if (milliseconds <= 0 || typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(Math.round(milliseconds));
  } catch {
    // some browsers throw before the first tap; vibration is only a nicety
  }
}
