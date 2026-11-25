/**
 * TEMPORARY workaround: finding the bowling game that `<BowlingStage>` is running.
 *
 * The bowling feature keeps its `Bowling` instance private inside `BowlingStage`; its public API has no
 * way to hand it out (only `window.__bowling`, which exists in development only). Pins need the rolling
 * balls every frame and the `launched` / `stopped` / `removed` events.
 *
 * Until the bowling feature exposes it (asked for: an `onGame?: (game: Bowling) => void` prop on
 * `BowlingStage`, or a `game` prop to pass one in), this wraps `Bowling.prototype.step` once so the
 * game that is stepping each frame is remembered. Read-only: nothing about the game changes.
 * Delete this file and use the prop as soon as bowling has it.
 */
import { Bowling } from "@/features/bowling";

const KEY = Symbol.for("plop.pins.currentBowling");
const TAPPED = Symbol.for("plop.pins.bowlingTapped");

type Holder = { [KEY]?: Bowling };
type Tappable = Bowling & { [TAPPED]?: true };

/** Start remembering the bowling game that steps. Safe to call many times (and across hot reloads). */
export function tapBowling(): void {
  const proto = Bowling.prototype as Tappable;
  if (proto[TAPPED]) return;
  const step = proto.step;
  proto.step = function tappedStep(this: Bowling, dt: number) {
    (globalThis as Holder)[KEY] = this;
    return step.call(this, dt);
  };
  proto[TAPPED] = true;
}

/** The bowling game that stepped most recently, or null before the first frame. */
export function currentBowling(): Bowling | null {
  return (globalThis as Holder)[KEY] ?? null;
}
