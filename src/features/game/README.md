# game

The whole game on the home page (issues #26 and #8): the snow in the throwing view, the village, the throw,
the pins and the score panel, with two players taking turns. See `docs/GAMEPLAY.md` sections 7 to 9.
Owner: Rachel. Page: `/` (renders `<Game />`).

## The match

Before the first throw a small card asks "3 or 5 rounds" and "two friends or just me" (`MatchStart` from the hud).
Each round every player throws once at the same set, then the next round's set comes (`GAME.match.rounds` lists
them, the sets are the pins' `ROUND_SETS`). After the last round the end card (`MatchEnd`) shows the totals, a crown
for the winner (or two for a tie) and "play again". Alone, the best total per length is kept in `localStorage`
(`GAME.match.bestKey`; it works without it). `rules.ts` holds the match: `start`, `again`, `choose`, `setFor`,
`lastOfRound`, `passTurn` (next player, next round, or over), and each throw's points (`pointsFor`: per card,
full clear, and the pins' special bonus) flying into the total (`gain`).

## Evening and sounds

The light follows the match (`GAME.evening`, `dayFor` in rules.ts): afternoon at round 1, spread evenly to `lastRound`
by the last round, `endCard` behind the end card. `GameBridge` eases it (snow-scene `easeTimeOfDay`) after a round's
last throw is counted, so it glides during "N down!" and the set change; "play again" and "3 or 5 rounds?" fade back
to afternoon. Sounds come from `src/lib/audio.ts`: `playRoundStart` with each round's note, `playWin` / `playTie` on the
end card, `playTap` on every button of the start and end cards (caught around the hud's cards here), and the ambience
(`startAmbienceOnFirstTouch`, `GAME.sound` volumes, lower while the music plays). The pins play the star sparkle, the
bunny's near-miss mew (`SPECIALS.friend.nearMiss`) and the full-clear bells.

## Measuring the shots (`measure/`)

`node src/features/game/measure/measure.mjs [rounds | old | set ids…]` throws a grid of shots (5 spots on the line,
21 aims, 6 powers, each thrown 5 times with a little hand error, 3 times more past the sweet spot for its sway) at
each set with a headless replay of the real roll and the pins' Rapier world (`sim.ts`), and prints the expected
points of "full power, straight at the middle of the set" against the best shot. It reads every number from the
features, so it follows any tuning. Flat snow, no hit-stop and no old grooves; a few shots thrown in the browser
matched it within about one card. Numbers: `docs/TUNING.md`.

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
In a match the turn note also says "Round 2 / 3" and what the set asks; the first time a star friend or the rabbit
appears, a tiny note says what it is worth (`SpecialHint`).

## Files

- `content.ts` players, points, timings of the loop, the words. Tune here.
- `camera.ts` the camera's follow of a throw (chase, settle, together mode).
- `rules.ts` `createGame()`: turns, scores, and when a throw may start. Plain TypeScript, no drawing, no timers.
- `GameBridge.tsx` inside the canvas: feeds bowling and pins events into the rules, runs the timers on the scene
  clock, locks the throw, swaps the thrower.
- `bowlingLink.ts` everything taken from the bowling feature that its public API lacks (see below).
- `CameraDirector.tsx` films each throw through the snow scene's camera shots: **aim** (the player's view eases
  lower and closer as the pull loads), **launch** (a push forward and a lens kick, times the power), **chase** (the
  view really follows the ball, gently: the look-at point rides on it to the back wall and back, the camera rises a
  little and glides in, never past the snowman, whose head sits at the bottom edge while the ball is at the pins),
  **settle** (once the ball has stopped or poofed, the look eases onto the pins, held through "N down!") and
  **return** (a calm glide home when the pins pop back). "Together" mode gets a gentle shared follow of both balls
  (look leaning toward their middle) that no key ends. Any drag, scroll or key during a solo chase or settle hands the
  view back; the next throw is filmed again. "Reduce motion" keeps only a gentle lean. Numbers: `camera.ts`
  (chase, settle, together) and `GAME.camera` in `content.ts` (aim, launch, return, reduce motion; its old `chase`
  and `impact` are no longer read).
- `GameOverlay.tsx` the hint, the special cut-outs' note, the turn / round note and the cancel button. `gameStyles.ts` their small scoped stylesheet.
- `ThrowingView.tsx` the default camera view: the scenery's `throwingView` on wide screens, `GAME.phoneView` on a
  phone held upright (#46).
- `Game.tsx` puts it all together, with the paper finish (`<PaperFinish />` from `@/features/look`) over the
  picture and under all UI.

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
- **snow-scene (camera):** done. The snow scene now has camera shots (`setSnowCameraShot`, `kickSnowCamera`), and
  the old `CameraFollow.tsx` workaround is gone.
