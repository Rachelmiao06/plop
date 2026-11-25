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
const ALL = Symbol.for("plop.pins.allBowlings");
const TAPPED = Symbol.for("plop.pins.bowlingTapped");

type Holder = { [KEY]?: Bowling; [ALL]?: Map<Bowling, number> };
type Tappable = Bowling & { [TAPPED]?: true };

/** Start remembering the bowling game that steps. Safe to call many times (and across hot reloads). */
export function tapBowling(): void {
  const proto = Bowling.prototype as Tappable;
  if (proto[TAPPED]) return;
  const step = proto.step;
  proto.step = function tappedStep(this: Bowling, dt: number) {
    const h = globalThis as Holder;
    h[KEY] = this;
    (h[ALL] ??= new Map()).set(this, performance.now());
    return step.call(this, dt);
  };
  proto[TAPPED] = true;
}

/**
 * Every bowling game stepping right now (stepped within the last 2 seconds, so a slow background tab still counts): one normally, two in "together"
 * mode (two throwers on the line at once). Games that stopped stepping (unmounted) drop out.
 */
export function currentBowlings(): Bowling[] {
  const all = (globalThis as Holder)[ALL];
  if (!all) return [];
  const now = performance.now();
  const live: Bowling[] = [];
  for (const [game, at] of all) {
    if (now - at < 2000) live.push(game);
    else if (now - at > 5000) all.delete(game);
  }
  return live;
}

/** The bowling game that stepped most recently, or null before the first frame. */
export function currentBowling(): Bowling | null {
  return (globalThis as Holder)[KEY] ?? null;
}
