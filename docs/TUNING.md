# Plop! · the ten feel numbers

Every tunable number lives in a feature's `content.ts`; no logic file hard-codes one. These ten change the
feel the most. Change one, reload the home page, throw a few balls. Units: one unit = one character height,
seconds, units per second.

| # | What you feel | Number(s) today | Where |
|---|---|---|---|
| 1 | **How big the ball gets.** Smallest and biggest snowball (radius). Bigger = slower, heavier, wider path. | `0.125` → `0.6` | `src/features/bowling/content.ts` · `FEEL.ball.radiusSmall`, `radiusBig` |
| 2 | **How far you pull for a full ball.** Longer = more drag on a phone, more time to aim. Keyboard: Space fills at `pullSpeed` (about 1.5 s to full). | `1.6` units · `1.1` /s | `FEEL.pull.max` · `FEEL.keyboard.pullSpeed` |
| 3 | **How fast the ball rolls.** Start speed of a small and of a full ball. | `6.4` and `3.5` | `FEEL.roll.speedSmall`, `speedBig` |
| 4 | **How far it rolls.** Slowing in fresh snow, and how much less on an old groove (old grooves become fast lanes). | `1.9` · `0.6` share | `FEEL.roll.dragFresh` · `dragOnPacked` |
| 5 | **How heavy the ball feels in the hand.** How quickly it follows the finger, small vs big. Lower = heavier, laggier. | `22` and `9` | `FEEL.follow.rateLight`, `rateHeavy` |
| 6 | **How easily cut-outs fall.** Tilt past which a card counts as down, and each weight class's mass and foot depth (deeper foot = harder to tip). | `50`° · light `0.3` / `0.07` … heavy `0.9` / `0.16` | `src/features/pins/content.ts` · `PINS.down.tiltDegrees`, `PINS.weight` |
| 7 | **How lively a topple is.** Gravity (stronger = paper flops, weaker = floats) and the speed cap that stops cards flying off. | `-13` · `4.5` | `PINS.world.gravity` · `PINS.caps.linear` |
| 8 | **How long "N down!" stays before the cards pop back.** The main pause between turns (a full clear waits a little longer). | `1.9` s · `2.4` s | `PINS.reset.delayAfterResult` · `PINS.nextSet.delayAfterFullClear` |
| 9 | **The springy reset.** How long each card takes to hop back up, and how high. | `0.6` s · `0.28` | `PINS.reset.time`, `hop` |
| 10 | **Points and the hand-over.** Points per card, the full-clear bonus, and how soon after the pins stand the next player may throw. | `1` · `3` · `0.25` s | `src/features/game/content.ts` · `GAME.score.perCard`, `fullClearBonus`, `GAME.timing.passTurnAfterReady` |

## Also worth knowing

- **Snow depth and how dark pressed snow gets:** `src/features/snow-scene/content.ts` (`ground.depth` 0.9, and the press colours).
- **The score bar's spring:** `src/features/hud/content.ts` (`bar.stiffness`, `bar.damping`).
- **A ball left in the snow melts away** `GAME.timing.meltBallAfterResult` (1.1 s) after the count, so the reset never waits for it.
- **Camera:** the throwing view comes from `throwingView()` in `src/features/scenery/`; turning and zoom limits are in snow-scene `content.ts` (`cameraPath`, `orbit`).

## Feel in the hand: vibration, squash and bounce (#10)

Every key moment has a vibration (Android phones; iPhones and computers skip it silently), a sound and a
squash or bounce. Vibration follows the sound-effects switch. "Reduce motion" on the device keeps the vibration
and sound but shrinks squash, stretch and hops (`reducedMotion` share in bowling and pins `content.ts`; the
pop-up and score bounces become fades).

| Moment | What you feel / see | Number(s) today | Where |
|---|---|---|---|
| Vibration patterns | Buzz lengths (ms) per moment, the gap before the same one may repeat, and a cap of 260 ms of buzzing per second so nothing ever hums | tap 7 · tick 4–7 · charge 16/45/22 · launch 14–38 · hit 10–22 · flop 5–11 · down 10/60/10 · full clear 7-beat | `src/lib/haptics.ts` · `HAPTICS` |
| Press the thrower | Tiny squash, soft pat, a tap | `0.12` | `src/features/bowling/content.ts` · `LOOK.thrower.pressSquash`, `FEEL.beats.pressThump` |
| Pulling | Crunch ticks that quicken as the ball grows; each tick squashes the ball a little | `5` → `13` ticks/s · `0.06` | `FEEL.beats.ticksSmall`, `ticksBig`, `tickFullSpeed` · `LOOK.ballSquash.tick` |
| Full charge | Clunk, stronger pulse, ball squash, the snowman puffs up, then the tremble | `0.16` · `0.1` · `0.25` | `LOOK.ballSquash.charge` · `LOOK.thrower.chargePop` · `FEEL.beats.chargeThump` |
| Let go | Whoosh, launch pulse, the ball stretches along its roll, the snowman's stretchy hop | `0.18` · hop `0.14` / `0.2` | `LOOK.ballSquash.launch` · `LOOK.thrower.hop` |
| Ball meets the first card | Hit-stop: time drops to 12% and eases back over 0.14 s; a thump and a bump | `0.14` s · `0.12` | `src/features/pins/content.ts` · `PINS.hitStop` |
| A card flops | Soft flop tick (rate-limited in big chains), the card squashes in the snow | `0.14` | `PINS.flop` |
| "N down!" / "All down!" | Pops in tall, lands squashed wide, settles; a pop sound, or a little chime and a celebration buzz on a full clear | `0.16` / `0.24` · `0.6` / `0.8` s | `PINS.popup.squash`, `bounceIn`, `chime` |
| Score "+1" and the bar | "+1" lands squashed in the bar, the bar bumps, the total pops with squash-and-stretch | `0.22` · `420` ms | `src/features/hud/content.ts` · `bump`, `pop` |
