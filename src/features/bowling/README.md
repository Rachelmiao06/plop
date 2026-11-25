# bowling

Paper bowling on snow, the throw part (issues #4 and #6, feel numbers #8): one thrower stands
on the throwing line, slides left and right to pick a spot, pulls back so a snowball grows at
its feet, and lets go; the ball rolls down the lane along the aim line, pressing a groove and
throwing dust, and stops by itself. See `docs/GAMEPLAY.md`. Owner: Rachel.

Test page: `/dev/bowling` (add `?fps` for the frame rate). The faint dashed ring down the lane
(`lane.pinSpot`) marks where the pins stand: 8.6 units from the line since the long lane (was 5.6);
pins, the village and the paper sky all follow it.

## Files

- `content.ts` every feel number, named and explained, and the page text. Tune here, never in the logic.
- `simulation.ts` the rules (`Bowling`): slide, pull, grow, charge, cancel, throw, roll, stop. Plain TypeScript, no drawing.
- `roll.ts` `planRoll` works out a whole roll (direction, start speed, where it bounces off the back wall, where it stops, how long) and `stepRoll` advances one. The aim line and the real roll both use them with the same fixed step, so the ball follows the line it showed (bounce included) and stops at its end.
- `wall.ts` the back wall, a plain module with no imports: the scenery's `Backdrop` says where its paper wall stands (`setBackWall`) and listens for hits (`onWallHit`) to wobble; the stage reads it into the ground (`Ground.wall`) and tells it about hits (`emitWallHit`). No backdrop on the page = no wall.
- `keyboard.ts` A / D or ← / → slide; hold Space to pull (A / D or ← / → turn the aim); release to throw.
- `pointer.ts` mouse, trackpad and touch: press the thrower, drag sideways to slide or back to pull, let go to throw.
- `feedback.ts` sound (through `src/lib/audio.ts`) and vibration (through the shared `src/lib/haptics.ts`): a pat and a tap on press, crunch ticks while pulling that quicken as the ball grows (`FEEL.beats`), a clunk and a pulse at full charge, the whoosh and a launch pulse. It counts the ticks (`beats.ticks`) so the stage squashes the ball in step.
- `stage/motion.ts` reads "reduce motion": squash, stretch and hops then keep `LOOK.reducedMotion` of their size; vibration and sound stay.
- Hit-stop: `game.hitStop(seconds, slowest)` slows the throw for a moment; the stage turns real frames into game time with `game.slowFrame(dt)` and other features read `game.timeScale` (the pins ask for one when the ball meets the first card).
- `checks.ts` quick checks of the key rules, no test framework. The test page runs them once in development (browser console).
- `stage/BowlingStage.tsx` draws it all on the real snow (render inside `<SnowScene>`). `stage/look.ts` reads the token colours. `stage/BowlingHint.tsx` the help line.
- `stage/ThrowerStandee.tsx` the thrower: Rachel's bucket snowman (player one) or red-hat snowman (player two) as the scenery feature's thick paper standee, with idle wobble and breath, a shuffling slide, lean back and crouch while pulling (leaning toward the ball's side), a strain shiver at full charge, a stretchy hop and a happy bounce. Built from scenery's `bodyGeometry`, `artGeometry`, `toonMaterial`, `artMaterial` (deep imports, like pins' `PinCard`); scenery could export a `StandeeBody` for both.
- `stage/snowballLook.ts` the drawn ball: flat `--paper`, a hatched `--snow-shadow` side fixed to the drawing light, paper fibres, pencil arcs and crumbs fixed to the ball so it visibly turns, and an uneven `--ink` outline shell (about the cut-outs' line weight). Never lit or glossy.
- `stage/clumps.ts` clumps of snow that fall off big rolling balls and plop into the snow (a tiny `punchCrater`).
- Power you can see and hear (`LOOK.kick`, `FEEL.beats`): on letting go the ball squashes against the snow then
  stretches away, the snowman lunges harder the stronger the pull, a puff of snow is kicked up behind its feet, and
  you hear a low push-off thump under the whoosh (a second whoosh on a strong pull). While rolling, a plume of snow
  is thrown up behind the ball (more when faster and bigger) and a big ball pushes a bow wave of snow ahead
  (the snow scene's `kickUpSnow`); the crunch's pace follows the speed all the way down the lane.
- Look and motion numbers: `LOOK` in `content.ts`. Screenshots next to the source art: `review/`.

## Units and directions

One unit = one character height. `x` runs left to right, `z` from far down the lane toward the
camera; the lane points away from the camera (toward -z). The throwing line is at `lane.lineZ`
(1.4) and the thrower may slide `lane.halfWidth` (2.2) either way. These were chosen to fit the
snow scene's play view (see "Camera" below).

## The rules in short

- `thrower.phase`: `"ready"` (may slide) → `"pulling"` → `"thrown"` (a little hop) → `"ready"`.
- The ball is pulled back behind the thrower, never forward, and at most `pull.maxAimDegrees` to either side. Letting go rolls it the opposite way.
- It grows beside the thrower's feet, not straight behind them (`pull.beside`, issue #52): `ball.track` is the point on the pull line (the pull is `track - foot`), and `ball.position` sits `beside` it, toward the middle of the lane, wider for a bigger ball. The aim and power come from the pull; the roll starts where the ball is, so it rolls past the snowman, not through it, and the snowman's face stays in view while pulling.
- `game.burst(ballId)` poofs a ball into snow: it keeps rolling for `roll.burstTime` while it flattens and shrinks, with a puff (`LOOK.burst`), then `removed`. The pins call it once the ball is through them (#47).
- Size only grows: by how much farther than before it is pulled, and less over packed snow (`ball.growthOnPacked`), so pulling back over your old groove grows it less. It reads the snow just ahead of the ball, because its own groove is under it.
- At the pull limit it is `charged` and trembles; a little rubber-band give past the limit.
- The sweet spot (`pull.sweet`, the match work): past `sweet.at` of the power the ball is heavy, its start speed
  drops toward `speedAtFull`, and the aim sways up to `wobbleDegrees` either way (`thrower.wobble`). The aim line and
  the release both use the swayed pull, so the ball still rolls the line you saw. `pastSweet`, `powerOf` and
  `sweetPull` (roll.ts) are exported. The stage draws two pencil ticks on the pull line at the sweet spot
  (`LOOK.sweetTick`); the ball sits beside that line, so it never covers them.
- Soft snow: a `Ground` may have `softAt(x, z)` (0..1). The roll slows there by `roll.soft.drag` (more for a big
  ball), not eased by `early`. `<BowlingStage softAt={…} />` adds it to the real snow (the game passes the current
  set's mounds). `<BowlingStage pinRing={false} />` hides the dashed ring at the pin spot (the game's sets move).
- Release shorter than `pull.cancelBelow` cancels (the ball crumbles).
- Roll: start speed from size (small = quick, big = slow) times pull strength; it slows in fresh snow and runs further on packed tracks (`roll.dragOnPacked`); big balls plough on (`roll.dragBigShare`). Stops below `roll.stopSpeed`, rests `roll.restTime`, then is removed.
- The back wall (`FEEL.wall`): when the ball's edge reaches `wall.inset` in front of the paper it bounces back inside the wall's circle, keeping `bounce` of its speed straight off and `slide` along it (`ball.direction` is its way now; `plan.direction` stays the way it was thrown; `plan.bounces` lists where). The `bounced` event (where, how hard) gives a soft thump, a squash, a puff off the bank and the paper's wobble.
- Who is throwing is just a name: `bowling.setThrower("two")` between throws. Turns are #26.
  The drawing follows it: `"two"` shows the red-hat snowman, anything else the bucket snowman.
  Or pass `<BowlingStage thrower="one" | "two" />` (applied as soon as the thrower is ready); test pages take `?thrower=two`.
  `<BowlingStage onGame={game => …} />` hands out the running game (what pins' `ballTap.ts` waits for).

## Plugging in (what `BowlingStage` does)

```tsx
const snow = useSnow();                       // from @/features/snow-scene
const snowPoint = useSnowPoint();
const [game] = useState(() => new Bowling(FEEL, snow));   // snow gives packedAt to the rules
// in an effect:
const keyboard = createKeyboardInput(game);
const pointer = createPointerInput(game, gl.domElement, {
  toGround: snowPoint,                        // already the right shape
  hitsThrower: (x, y) => /* raycast the thrower card */,
  onClaim: claimSnowPointer,                  // that finger never moves the camera
});
const feedback = connectFeedback(game);
// every frame (useFrame):
keyboard.update(delta); game.step(delta); feedback.update();
```

A press is claimed the moment it lands on the thrower (card or the snow at its feet); the snow
camera only decides what a finger does on its first move, so the claim is always in time.
Presses anywhere else turn the camera as usual. The snow scene does not listen to keys.

### What to read each frame

- `game.thrower`: `x`, `foot`, `phase`, `lean` (0..1), `hopHeight`, `ball` (while pulling: `position`, `radius`, `size`, `charged`, `trembleOffset`, `rolled` / `rollDirection` for spin, `velocity`, `dwell`), and `aim` (the roll letting go would make: draw the aim line from `aim.start` along `aim.direction` to `aim.stop`).
- `game.balls`: each rolling or resting ball: `position`, `speed`, `velocity`, `direction` (its way now, after any bounce), `bounces`, `rolled`, `rolling`, `restAge`, `bursting` (seconds since `burst()`, or null), and its `plan` (radius, size, the direction it was thrown).

### Events

`game.subscribe(event => …)`: `pressed`, `charged`, `launched` (with the roll `plan`),
`cancelled` (`reason`: `short` or `interrupted`), `stopped` (where, radius, size), `bounced` (where it met the back wall, how hard, its way back), `burst` (where, radius, velocity), `removed`.
Pins (#7) will listen to the balls' positions each frame and to `stopped`.

## Driving the snow

- **Groove:** every frame, press from where each ball was last pressed to where it is now, in
  stamps no further apart than `groove.spacing` × radius (and `groove.maxStep`), passing the
  ball's `velocity` so the snow ploughs ahead and dust flies.
- **`dig` only when still:** a resting pulled ball passes `dig = groove.digResting × seconds`
  so it sinks in. A moving ball passes no `dig`: `dig` goes deeper than the snow already is,
  so overlapping stamps along a path would stack it all the way down to hard ground. The
  groove depth of a moving ball comes from its radius.
- **Resistance:** the rules read `packedAt` themselves (growth, follow speed, roll slowing).
- **Crumble:** a cancelled ball calls `punchCrater` where it was, for a puff of snow.
- **Sitting on the snow:** balls are drawn at `heightAt(x, z) + radius × (1 − ball.sink)`, so they sit in their own groove.

## Camera

The throwing view is set by the game with the snow scene's `useSnowCameraView` (from scenery's
`throwingView`), and the camera moves of a throw (aim, launch, chase, impact, return) are directed by
the game (`src/features/game/CameraDirector.tsx`) through the snow scene's camera shots. This feature
draws and simulates the throw only; it never moves the camera.

## Input notes

- Keyboard uses `event.code` (physical keys, any layout), ignores key repeat, and moves the
  pull and slide in `update()`. Holding at full pull pushes a little into the rubber band
  (`keyboard.pushPastFull`) so the lagging ball truly reaches the limit.
- If the window loses focus mid-pull, the pull is cancelled rather than thrown.
- Aim and power come from where the ball is (it lags the finger), not from the finger.
- The ball follows with an eased share of the gap per frame and a cap on how far it trails
  (`follow.maxTrail`), as the snow scene's feel notes recommend; the follow rate itself eases
  when the snow under it changes (`follow.smoothing`), so crossing a track never jerks it.
