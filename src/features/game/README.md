# game

The whole game on the home page (issues #26 and #8): the snow in the throwing view, the village, the throw,
the pins and the score panel, with two players taking turns. See `docs/GAMEPLAY.md` sections 7 to 9.
Owner: Rachel. Page: `/` (renders `<Game />`).

## The loop

1. The active player's snowman stands on the line. The hint ("hold Space or drag the snowman back") shows
   until the first throw.
2. Pull and let go. Cards fall; each one sends a "+1" into the score bar and the bar fills live.
3. When everything has settled the pins show "N down!" and the player gets one point per card down, plus a
   bonus on a full clear (`GAME.score`).
4. The pins pop back up (or, after a full clear, the next formation slides in). A ball left resting in the
   snow melts early so the pins never wait for it.
5. A quarter second after the pins stand, the turn passes and "Red Hat's turn!" pops up.

A pull cannot start while the ball is rolling or the pins are settling or resetting. Escape or the
"Put it down" button cancels a pull; a cancelled pull is not a throw, so the turn stays.
One person alone simply keeps throwing: the snowmen alternate.

## Files

- `content.ts` players, points, timings of the loop, the words. Tune here.
- `rules.ts` `createGame()`: turns, scores, and when a throw may start. Plain TypeScript, no drawing, no timers.
- `GameBridge.tsx` inside the canvas: feeds bowling and pins events into the rules, runs the timers on the scene
  clock, locks the throw, swaps the thrower.
- `bowlingLink.ts` everything taken from the bowling feature that its public API lacks (see below).
- `GameOverlay.tsx` the hint, the turn note and the cancel button. `gameStyles.ts` their small scoped stylesheet.
- `Game.tsx` puts it all together.

## Asked of other features (worked around here for now)

- **bowling** (`bowlingLink.ts`):
  1. `<BowlingStage onGame={(game) => …} />` to hand out the running `Bowling`. Now: the same read-only
     `Bowling.prototype.step` tap the pins use.
  2. A throw lock, e.g. `game.setLocked(true)` or `canPress?: () => boolean`. Now: `press()` is wrapped on
     that one game instance.
  3. `game.meltRestingBalls()`. Now: the resting ball's rest clock is moved to the start of its fade.
  4. The thrower card per player. `setThrower` exists and the game calls it with `"one"` / `"two"`
     (`GAME.players[i].thrower`); the card still reads "player one" until issue #37 lands. If #37 names the
     throwers differently, change only those two ids in `content.ts`.
- **snow-scene:** the temporary "Look / Press" switch and its hint show on every page. The home page hides them
  with CSS (`gameStyles.ts`). Wanted: remove the temporary hook, or `<SnowScene testControls={false}>`.
