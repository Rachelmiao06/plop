/**
 * Plop vibration engine: a few small named patterns, shared by every feature.
 *
 *   haptic("tap")                 press on the thrower
 *   haptic("tick", size)          one crunch tick while pulling (0..1 = small .. big ball)
 *   haptic("charge")              the pull reaches full charge
 *   haptic("launch", power)       letting go (0..1 = weak .. strong throw)
 *   haptic("hit", size)           the ball meets the first card
 *   haptic("flop", strength)      a card flops into the snow
 *   haptic("down")                "N down!"
 *   haptic("fullClear")           every card down: a little celebration
 *
 * On / off follows the sound-effects switch in `src/lib/audio.ts` (one switch for "feedback" is simpler
 * than two, and someone who silences the toy at night does not want it buzzing either).
 *
 * Android browsers vibrate. iPhones (Safari has no `navigator.vibrate`) and computers ignore it silently,
 * so every call is a safe no-op there. Browsers also refuse vibration before the first tap; that is ignored too.
 *
 * Never buzzes continuously: each pattern has its own minimum gap, a weaker pattern never cuts into a
 * stronger one that is still playing, and the total buzz in any `budget.window` is capped.
 */
import { getAudioSettings } from "./audio";

/** One pattern: `on` / `off` milliseconds alternating (as `navigator.vibrate` takes them). */
type Pattern = {
  /** Buzz lengths at strength 0 and at strength 1 (milliseconds). Pauses in between stay fixed. */
  weak: readonly number[];
  strong: readonly number[];
  /** The same pattern never starts again sooner than this (milliseconds). */
  minGap: number;
  /** Higher wins: a pattern only interrupts one still playing if it is at least as important. */
  priority: number;
};

/** Feel numbers. Tune here; the logic below never hard-codes one. All milliseconds. */
export const HAPTICS = {
  patterns: {
    tap: { weak: [7], strong: [7], minGap: 120, priority: 1 },
    tick: { weak: [4], strong: [7], minGap: 45, priority: 0 },
    charge: { weak: [16, 45, 22], strong: [16, 45, 22], minGap: 400, priority: 3 },
    launch: { weak: [14], strong: [38], minGap: 200, priority: 4 },
    hit: { weak: [10], strong: [22], minGap: 250, priority: 3 },
    flop: { weak: [5], strong: [11], minGap: 70, priority: 1 },
    down: { weak: [10, 60, 10], strong: [10, 60, 10], minGap: 600, priority: 2 },
    fullClear: { weak: [18, 70, 18, 70, 18, 90, 40], strong: [18, 70, 18, 70, 18, 90, 40], minGap: 1500, priority: 5 },
  } satisfies Record<string, Pattern>,
  /** At most `maxOn` ms of buzzing in any `window` ms, so nothing ever turns into a steady hum. */
  budget: { window: 1000, maxOn: 260 },
} as const;

export type HapticName = keyof typeof HAPTICS.patterns;

let busyUntil = 0;
let busyPriority = -1;
const lastStart = new Map<HapticName, number>();
/** Recent buzzes: when they started and how long they buzzed in total. */
const recent: { at: number; on: number }[] = [];

/** True when this browser can vibrate at all (Android Chrome and friends). */
export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/**
 * Play one named pattern. `strength` 0..1 picks between its weak and strong buzz lengths.
 * Does nothing when vibration is unsupported, sound effects are off, or the pattern is rate-limited.
 */
export function haptic(name: HapticName, strength = 1): void {
  if (!hapticsSupported() || !getAudioSettings().effects) return;
  const p: Pattern = HAPTICS.patterns[name];
  const now = performance.now();

  if (now - (lastStart.get(name) ?? -Infinity) < p.minGap) return;
  if (now < busyUntil && p.priority < busyPriority) return;

  const s = Math.max(0, Math.min(1, strength));
  const pattern = p.weak.map((w, i) => (i % 2 === 1 ? w : Math.round(w + (p.strong[i] - w) * s)));
  const on = pattern.reduce((sum, ms, i) => (i % 2 === 0 ? sum + ms : sum), 0);

  const b = HAPTICS.budget;
  while (recent.length && now - recent[0].at > b.window) recent.shift();
  const used = recent.reduce((sum, r) => sum + r.on, 0);
  if (used + on > b.maxOn) return;

  try {
    if (!navigator.vibrate(pattern)) return; // refused (no tap yet, or the page is hidden)
  } catch {
    return; // some browsers throw before the first tap; vibration is only a nicety
  }
  lastStart.set(name, now);
  recent.push({ at: now, on });
  busyUntil = now + pattern.reduce((sum, ms) => sum + ms, 0);
  busyPriority = p.priority;
}

/** Stop any vibration now (for example when sound effects are switched off mid-pattern). */
export function stopHaptics(): void {
  if (!hapticsSupported()) return;
  try {
    navigator.vibrate(0);
  } catch {
    // nothing to stop
  }
  busyUntil = 0;
  busyPriority = -1;
}
