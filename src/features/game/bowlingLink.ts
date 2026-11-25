/**
 * Everything the game needs from the bowling feature that its public API does not offer yet,
 * kept behind a few small functions so each can be swapped for the real export in one place.
 *
 * Wanted from `@/features/bowling` (then delete the workarounds below):
 *  1. `<BowlingStage onGame={(game: Bowling) => …} />` (or a `game` prop) to hand out the running game.
 *     Until then `findBowling()` wraps `Bowling.prototype.step` once to remember the game that steps,
 *     the same read-only trick the pins feature uses (`pins/ballTap.ts`).
 *  2. A lock: `game.setLocked(locked: boolean)` (or `canPress?: () => boolean`), so a pull cannot start
 *     while pins are still settling. Until then `lockThrows()` wraps `press()` on that one game instance.
 *  3. `game.meltRestingBalls()`: melt a ball resting in the snow early once the throw is counted.
 *     Until then `meltRestingBalls()` moves the ball's rest clock to the start of its fade.
 *  4. Thrower look per id: `setThrower` exists and the game uses it (`switchThrower`); the bowling card
 *     is still one placeholder until issue #37 draws the bucket and red-hat snowmen.
 */
import { Bowling } from "@/features/bowling";

const CURRENT = Symbol.for("plop.game.currentBowling");
const TAPPED = Symbol.for("plop.game.bowlingTapped");
const LOCKED = Symbol.for("plop.game.pressLocked");

type Holder = { [CURRENT]?: Bowling };
type Tappable = Bowling & { [TAPPED]?: true };
type Lockable = Bowling & { [LOCKED]?: () => boolean };

/** TEMPORARY (wanted 1). The bowling game that stepped most recently, or null before its first frame. */
export function findBowling(): Bowling | null {
  const proto = Bowling.prototype as Tappable;
  if (!proto[TAPPED]) {
    const step = proto.step;
    proto.step = function tappedStep(this: Bowling, seconds: number) {
      (globalThis as Holder)[CURRENT] = this;
      return step.call(this, seconds);
    };
    proto[TAPPED] = true;
  }
  return (globalThis as Holder)[CURRENT] ?? null;
}

/**
 * TEMPORARY (wanted 2). From now on a pull only starts while `allowed()` says yes. Sliding along the line
 * stays free. Returns a function that lifts the lock.
 */
export function lockThrows(game: Bowling, allowed: () => boolean): () => void {
  const g = game as Lockable;
  g[LOCKED] = allowed;
  if (!Object.prototype.hasOwnProperty.call(g, "press")) {
    const press = Bowling.prototype.press;
    g.press = function lockedPress(this: Lockable) {
      const ok = this[LOCKED];
      if (ok && !ok()) return false;
      return press.call(this);
    };
  }
  return () => {
    if (g[LOCKED] === allowed) g[LOCKED] = undefined;
  };
}

/** Make this player's snowman the thrower. Only between throws (the bowling feature refuses otherwise). */
export function switchThrower(game: Bowling, throwerId: string): boolean {
  if (game.thrower.id === throwerId) return true;
  return game.setThrower(throwerId);
}

/** TEMPORARY (wanted 3). Balls resting in the snow start fading away now instead of after their full rest. */
export function meltRestingBalls(game: Bowling, fadeTime: number): void {
  const melt = game.feel.roll.restTime - fadeTime;
  for (const ball of game.balls) {
    if (!ball.rolling && ball.restAge < melt) ball.restAge = melt;
  }
}

/** Drop a pull that is being held (Escape, the cancel button). The ball crumbles; the turn stays. */
export function cancelPull(game: Bowling): void {
  game.cancel("interrupted");
}
