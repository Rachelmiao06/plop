# Plop! · the ten feel numbers

Every tunable number lives in a feature's `content.ts`; no logic file hard-codes one. These ten change the
feel the most. Change one, reload the home page, throw a few balls. Units: one unit = one character height,
seconds, units per second.

| # | What you feel | Number(s) today | Where |
|---|---|---|---|
| 1 | **How big the ball gets.** Smallest and biggest snowball (radius). Bigger = slower, heavier, wider path. | `0.125` → `0.6` | `src/features/bowling/content.ts` · `FEEL.ball.radiusSmall`, `radiusBig` |
| 2 | **How far you pull for a full ball.** Longer = more drag on a phone, more time to aim. Keyboard: Space fills at `pullSpeed` (about 1.5 s to full). | `1.6` units · `1.1` /s | `FEEL.pull.max` · `FEEL.keyboard.pullSpeed` |
| 3 | **How fast the ball rolls.** Top speed of a small and of a full ball. On the long lane (pins 8.6 from the line) a light ball reaches the pins in about 0.9 s, a full one in about 1.35 s. | `13.5` and `8.4` | `FEEL.roll.speedSmall`, `speedBig` |
| 4 | **How far it rolls.** Slowing in fresh snow (a full ball slows only `dragBigShare` as much), and how much less on an old groove. Both stop about 3 units past the pin spot. | `6.5` · `0.45` · `0.8` share | `FEEL.roll.dragFresh` · `dragBigShare` · `dragOnPacked` |
| 5 | **How heavy the ball feels in the hand.** How quickly it follows the finger, small vs big. Lower = heavier, laggier. | `22` and `9` | `FEEL.follow.rateLight`, `rateHeavy` |
| 6 | **How easily cut-outs fall.** Tilt past which a card counts as down, and each weight class's mass and foot depth (deeper foot = harder to tip). | `50`° · light `0.3` / `0.07` … heavy `0.9` / `0.16` | `src/features/pins/content.ts` · `PINS.down.tiltDegrees`, `PINS.weight` |
| 7 | **How lively a topple is.** Gravity (stronger = paper flops, weaker = floats) and the speed cap that stops cards flying off. | `-13` · `4.5` | `PINS.world.gravity` · `PINS.caps.linear` |
| 8 | **How long "N down!" stays before the cards pop back.** The main pause between turns (a full clear waits a little longer). | `1.9` s · `2.4` s | `PINS.reset.delayAfterResult` · `PINS.nextSet.delayAfterFullClear` |
| 9 | **The springy reset.** How long each card takes to hop back up, and how high. | `0.6` s · `0.28` | `PINS.reset.time`, `hop` |
| 10 | **Points and the hand-over.** Points per card, the full-clear bonus, and how soon after the pins stand the next player may throw. | `1` · `3` · `0.25` s | `src/features/game/content.ts` · `GAME.score.perCard`, `fullClearBonus`, `GAME.timing.passTurnAfterReady` |

## The numbers that make the throw satisfying

Rachel (2026-11-25): the throw felt slow with no punch, the camera static, the lane too short. These change that the most:

1. **Lane length**, `FEEL.lane.pinSpot` (`z -7.2`, 8.6 from the line `lineZ 1.4`; was 5.6). Everything follows it: pin formations, the village between the line and the pins (behind the pins it keeps its old spacing, `village.backDepthScale` in scenery), the calm snow and the paper sky behind the pins.
2. **Top speed**, `FEEL.roll.speedSmall` / `speedBig` (`13.5` / `8.4`). Light ball to the pins in about 0.9 s, full ball about 1.35 s. The aim line still uses the same `stepRoll`, so it stays exact.
3. **The snap**, `FEEL.roll.snap` (`from 0.35`, `time 0.09` s). The ball leaves at 35% of its speed and reaches full speed in 0.09 s, like a band let go. Lower `from` = more visible kick.
4. **Carry, then stop**, `FEEL.roll.early` (`dragShare 0.2` over `0.7` s) then `dragFresh 6.5`. The snow barely slows it at first, so it carries its speed down the long lane, then the drag stops it behind the pins.
5. **Tension while pulling**, `FEEL.follow.tensionAtFull` (`0.55`), with `FEEL.thrower.leanAtFull` (`0.42`), `LOOK.ballSquash.pullLoad` (`0.08`) and the camera easing in (`GAME.camera.aim`, below).
6. **The release**, `LOOK.thrower.lunge` (`distance 0.62`, `stiffness 95`: bigger and snappier, `minShare 0.45` on a weak pull), `LOOK.ballSquash.launchSquash` / `launch` (`0.2` squash against the snow, then `0.24` stretch), `LOOK.kick.release` (the puff behind the thrower) and the sound: a low push-off thump `FEEL.beats.pushThump` (`0.32`) and a second whoosh on a strong pull (`whooshDoubleFrom 0.45`).
7. **The roll you see and hear**, `LOOK.kick.plume` (snow thrown up behind, grows with speed and size), `LOOK.kick.plough` (a big ball's bow wave ahead), `LOOK.clumps.perUnit` (`2.6`), `LOOK.ball.marks` / `markInk` (spin marks, `28` / `0.72`), and `FEEL.sound.crunchFullSpeed` (`11`: the crunch's pace follows the speed all the way down the lane).
8. **Impact energy**, `PINS.impact` (`push 0.13`, `lift 0.24`, `tumble 0.062`), and `PINS.hitStop` (`0.14` s at `12%`, a full ball up to `+0.1` s at `7%`; thump `0.32 + 0.68 × size`).

### The camera (`GAME.camera` in `src/features/game/content.ts`)

One camera moves through five stages on critically damped springs, so it never jumps. A spring `rate` of about 2 is a
calm glide, 6 follows with a little physical lag, 12 is tight. These change how the camera feels the most:

| Stage | What you feel | Number(s) today |
|---|---|---|
| Aim | The view eases lower and closer behind the thrower as the pull loads | `aim.closer 0.16`, `lower 1.1`, `lookBack 1.4`, `rate 4` |
| Launch | The push forward and the lens kick, times the pull's power; how fast it dives in | `launch.push 9`, `fovKick 45`, `rate 8.5` for `time 0.5` s, lens widens over `lensTime 0.55` s |
| Chase | How far the camera pushes in (it never passes the snowman), how high, and how tightly the lens zooms on the ball | `chase.behind 3.4` (units behind the line), `height 2.3`, `followX 0.45`, `frame 3.4` units in view, lens `11`–`30`°, `rate 5` |
| Impact | When it turns to the pins, how far it slides to the side (still behind the line), how close it zooms | `impact.triggerAhead 1.3`, `behind 3.6`, `height 2.6`, `side 1.6`, `frame 3.9` units, `rate 3.2` |
| Return | The glide home once the pins pop back | `ret.rate 1.9` |

Any drag, scroll, pinch or key during the chase or the impact hands the view back (`shots.takeoverRate` 3.5 in
snow-scene `content.ts`); the next throw is filmed again. "Reduce motion" keeps only a gentle lean after the ball
(`camera.reduced`). The throwing view itself is `village.view` in scenery `content.ts` (`pathAt 0.1`, `distance 1.9`,
so the whole longer lane and the hills fit).

Also part of the throw's feel: the snowman rolls on its round bottom when it slides (`LOOK.thrower.roll`, `idleRoll`),
and wind curls and extra spray trail a fast ball (`LOOK.speed`, now `from 5` to `full 12` units per second).

## The match: sets, the sweet spot, mounds and the special cut-outs

Rachel worried everyone would just aim at the middle with full power. These change which shot is best:

| What you feel | Number(s) today | Where |
|---|---|---|
| **The sweet spot.** Past `at` of the power the ball is heavy: it starts at down to `speedAtFull` of its speed and the aim sways up to `wobbleDegrees` either way, `wobbleSpeed` times a second. Higher `speedAtFull` or less sway = full power is less of a gamble. | `at 0.62` · `speedAtFull 0.94` · `3.5`° · `1.15` /s | `src/features/bowling/content.ts` · `FEEL.pull.sweet` |
| **The sweet-spot ticks** on the snow (two pencil ticks on the pull line). | `length 0.5`, `faint 0.6` | `LOOK.sweetTick` |
| **How soft a mound is.** Extra slowing inside a mound (a full ball sinks `bigShare` times more). | `drag 15` · `bigShare 1.5` | `FEEL.roll.soft` |
| **Mound shape.** Full softness inside `core` of its radius; how flat it squashes when a ball ploughs through. | `core 0.55` · `flatten 0.35` | `src/features/pins/content.ts` · `MOUND` |
| **Special cut-outs.** Extra points for a star friend down, and for the rabbit left standing. | `+2` · `+2` | `SPECIALS` |
| **The sets** and the round order (3 or 5 rounds): the classic crowd every round; each set's `shift` (at most 0.3), `turn` (degrees) and where the star friend and the bunny stand. | 5 round sets | pins `ROUND_SETS` · game `GAME.match.rounds` |

**Together mode** (`GAME.together` in `src/features/game/content.ts`): each thrower's half of the line (`slide`,
`[-1.9, -0.45]` and `[0.45, 1.9]`) and their keys; `GAME.timing.secondGainAfter` (`0.75` s) between the two
players' points flying in.

### Measured: is "full power, straight at the middle" still the best shot?

`node src/features/game/measure/measure.mjs [rounds | old]` (see the game README). For every set it throws 630
grid shots (5 spots on the line × 21 aims × 6 powers), each 5 times with a little hand error (and at 3 points of
the sway past the sweet spot), with the real roll and a headless copy of the pins' physics, and averages the points.
"Middle-full" = from the middle of the line, full pull, straight at the middle of the set.

**Before** (old free-play sets, endless turns, no sweet spot; points = cards + 3 for a full clear):

| Set | Middle-full | Best shot | Best at full power | Best power |
|---|---|---|---|---|
| triangle | 4.8 | 7.4 | 7.0 | 0.85 |
| row | 3.4 | 8.0 | 8.0 | 0.7 = 1.0 |
| ring | 4.2 | 5.0 | 5.0 | 0.55 = 1.0 |
| friends | **5.4 (best)** | 5.4 | 5.4 | 1.0 |
| village | 5.2 | 5.6 | 5.6 | 0.85 = 1.0 |

Full power was the best power (or tied) in 4 of 5 sets, and straight at the middle was the best or near it in 3.

**First round sets** (2026-11-25, replaced the same day: off to the side, two groups, slanted row, picnic, village; sweet spot, mounds, star friend and rabbit):

| Round set | Middle-full | Best shot | Best at full power | Best power |
|---|---|---|---|---|
| 1 off to the side | 6.9 | 8.0 | 7.7 | 0.35 / 0.55 |
| 2 two little groups | 2.1 | 5.0 | 4.9 | 0.15 to 0.7 |
| 3 slanted row and a mound | 0.0 (stuck in the mound) | 4.8 | 3.3 | 0.7 |
| 4 bunny's picnic | 3.3 | 6.8 | 4.8 | 0.35 |
| 5 snowy village | 4.7 | 6.6 | 5.3 | 0.55 |

Straight at the middle at full power was beaten in all 5 rounds (by 1.1 to 4.8 points). Rachel did not like those
sets: she wants the classic bowling-pin crowd in the middle every round, only a little different each time.

**Now** (the classic crowd every round with one small rule each: Strike! (triangle), Hit the star (crowd of
friends), Let the bunny be (ring), Little mound (ten-pin triangle), Sleepy cat (village); small shifts and turns):

| Round set | Middle-full | Best shot | Best at full power | Best power |
|---|---|---|---|---|
| 1 Strike! (triangle) | 4.8 | 6.3 | 5.5 | 0.7 |
| 2 Hit the star (crowd of friends) | 6.1 | 6.9 | 6.6 | 0.7 |
| 3 Let the bunny be (ring) | 4.9 | 6.8 | 5.0 | 0.55 |
| 4 Little mound (ten-pin triangle) | 3.8 (the mound slows it) | 6.8 | 6.1 | 0.35 = 0.55 |
| 5 Sleepy cat (village) | 7.2 | 9.0 | 8.1 | 0.55 |

A straight throw at the middle now scores fairly well (5.4 on average across the rounds, was 3.4 with the first round
sets), which Rachel accepts for the classic look. It is still never the best shot: beaten in every round by 0.7
(Hit the star) to 3.0 points (Little mound), and full power is never the best power.
Chains still happen (a quick grid of 108 throws per set, cards down that the ball never touched): 78% of throws at
Strike! start a chain, 44% at Hit the star, 41% at Let the bunny be, 64% at Little mound, 56% at Sleepy cat.
Limits: flat snow, no old grooves, no hit-stop; a few shots thrown in the browser matched the replay within about
one card.

## Also worth knowing

- **Snow depth and how dark pressed snow gets:** `src/features/snow-scene/content.ts` (`ground.depth` 0.9, and the press colours).
- **The score bar's spring:** `src/features/hud/content.ts` (`bar.stiffness`, `bar.damping`).
- **The hit, readable (#47, #48, #52):** the ball poofs into snow once it is through the pins (`PINS.burst`: `pastMargin 0.2`, `slowSpeed 2.4`; the poof is `FEEL.roll.burstTime 0.32` s and `LOOK.burst` in bowling), and "N down!" pops as soon as the cards are still for `PINS.down.settleHold` (`0.25` s; a card lying in the snow may still slide at `lyingShare` `4`×), at most `timeoutAfterClear` (`1.4` s) after the ball is through. Fallen cards rest propped `PINS.rest.elevationDegrees` (`16`°) off the snow on a little heap (`rest.heap`); higher reads more like a standing card. While pulling, the ball sits beside the feet: `FEEL.pull.beside` (`base 0.2` + `share 1` × radius, eased in over `rampOver 0.45`).
- **A ball left in the snow melts away** `GAME.timing.meltBallAfterResult` (1.1 s) after the count, so the reset never waits for it.
- **Camera:** the throwing view comes from `throwingView()` in `src/features/scenery/`; turning and zoom limits are in snow-scene `content.ts` (`cameraPath`, `orbit`); the throw's camera moves are `GAME.camera` (above).

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

## Light, smoke, ice and shadows (scene polish, #45 / #51)

| What you see | Number(s) today | Where |
|---|---|---|
| **How long and dark the shadows are.** Higher sun = shorter shadows; strength = how much sun a shadow takes away. Raise the sun and lower `sunStrength` together, or flat snow gets brighter. | `sunElevation 42`° · `sunStrength 3.1` · `shade.strength 0.65` | snow-scene `content.ts` · `light`, `shade` |
| **The lamp's warm pool on the snow and its halo.** Point-light intensity (candela; the sun is about 3) and reach; crayon halo on the glass and behind the lamp. | `2.6` · `3.6` units · front `0.55` / behind `1.6` across | scenery `three/effects/effects.ts` · `lights` (`styles.lamp`, `pointLights`) |
| **Chimney smoke.** How long a puff lives, how high it rises, how far the wind takes it, how big it grows, how visible. | `6.5` s · `1.05` · `0.55` · `0.16` → `0.72` · `0.85` | `effects.ts` · `smoke` |
| **Ice.** How see-through, the bright edge, the sun glint, the sparkles. | `body 0.45` · `edge 0.85` · `glint 1.6` · `sparkle 0.18` | `effects.ts` · `ice` |
| **Snow banked at the hills' foot** (hides the low view's line; too tall shows as a ring from high up). | `height 0.11` · `radiusZ 1.3` · `arcShare 0.3` | `effects.ts` · `footBank` |

## Time of day (a match from afternoon to evening)

`setTimeOfDay(t)` from `@/features/snow-scene` (0 = afternoon, 0.5 = sunset, 1 = evening). Try it on `/dev/time`.

| What you see | Number(s) today | Where |
|---|---|---|
| **The light at each time.** Sun height, direction, colour and strength; sky fill; shadow strength; exposure; sparkles; fog; flakes. Afternoon is the everyday light. | sunset: sun `20`° at `4.6`, exposure `1.12` · evening: moon `34`° at `1.9`, exposure `1.2` | snow-scene `content.ts` · `timeOfDay.keys` |
| **How much the village lights come up toward evening.** From when to when, halo and point-light boost. | `0.3` → `0.95` · halos ×`2.4` · lights ×`3.6` | scenery `three/effects/effects.ts` · `lights.evening` |
| **Smoke in sunset and moonlight.** | warm `0.55` · cool `0.35` | `effects.ts` · `smoke.sunsetWarm`, `eveningCool` |
