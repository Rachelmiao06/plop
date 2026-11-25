# slingshot

Pull a character back, a snowball rolls and grows under it, let go and it flies the
other way along an arc and lands. Issues #4, #6, #8. Owner: Rachel.

The rules know nothing about drawing. Today they are shown by a flat top-down test view
at `/dev/slingshot`; later the 3D snow scene and characters draw the same state.

## Files

- `content.ts` every feel number, named and explained. Tune here, never in the logic.
- `simulation.ts` the rules: two players, pull, grow, charge, launch, fly, land, hit, recover. Plain TypeScript.
- `arc.ts` `computeArc` works out a whole throw (start, landing, apex, flight time, landing size) from the pull and the ball size. The aim preview and the real flight both use it, so the ball lands exactly on the preview ring.
- `keyboard.ts` W A S D for the left player, arrow keys for the right.
- `pointer.ts` mouse, trackpad and touch (one finger per character, two at once is fine).
- `feedback.ts` sound (through `src/lib/audio.ts`) and vibration.
- `haptics.ts` `navigator.vibrate` wrapper. **Temporary home**: it moves to a shared `src/lib/haptics.ts` in a later issue. Android phones vibrate; iPhones and computers ignore it.
- `checks.ts` quick checks of the key rules, no test framework. The test page runs them once in development (see the browser console).
- `flat/` the 2D test view used by `/dev/slingshot` only.

## Units and directions

One unit = one character height. `x` runs left to right, `z` from the back of the scene to the
front (toward the viewer). Homes: left `(-3, 0)`, right `(3, 0)`. In 3D, `(x, z)` is the
ground plane and up is `y`.

## Plugging in a 3D renderer

```ts
import { FEEL, copyFeel, createSlingshot, createKeyboardInput, createPointerInput, connectFeedback } from "@/features/slingshot";

const sim = createSlingshot(copyFeel());          // or FEEL itself if nothing tunes it live
const keyboard = createKeyboardInput(sim);
const pointer = createPointerInput(sim, canvasElement, {
  toGround: (clientX, clientY) => snowPoint(clientX, clientY), // useSnowPoint() from the snow scene
  onClaim: (pointerId) => claimSnowPointer(pointerId),         // so the camera ignores that finger
});
const feedback = connectFeedback(sim);

// every frame (useFrame):
keyboard.update(delta);
sim.step(delta);
feedback.update();
```

`toGround` must return the scene `{ x, z }` under the pointer, or null. Use the snow scene's
`useSnowPoint()`: it aims at the untouched surface, so the ball never jumps at a pit or rim.
A pointer that goes down within `character.grabRadius` of a character is claimed; ask
`pointer.isClaimed(id)` or use `onClaim`. Pointers that start elsewhere are never touched,
so empty snow still turns the camera.

### What to read each frame

`sim.players.left` / `sim.players.right`:

- `phase`: `"idle" | "pulling" | "launched"`. `launched` lasts `character.hopTime` while the character hops back; `hopHeight` is that hop.
- `ball` (while pulling): `position`, `radius`, `size` (0..1), `charged`, `tremble` and `trembleOffset` (add to the drawn position), `rolled` and `rollDirection` (spin: angle `rolled / radius` around the ground axis perpendicular to `rollDirection`), `velocity` / `speed`, `dwell` (seconds sitting still).
- `aim`: the throw letting go would make, or null (letting go would crumble). Draw the preview from `arcPoint(aim, u)` for `u` in 0..1 and a ring of `aim.impactRadius` at `aim.landing`.
- `recovery` (seconds left after a hit, cannot pull), `hitAge` (seconds since the last hit, for the fall and spring back), `launchAge`.

`sim.flying`: every ball in the air: `position`, `height` (ball centre above the ground), `progress`, `arc`.
Ground height is not in the rules: in 3D draw at `y = heightAt(x, z) + height`.

### Events

`sim.subscribe(event => …)` returns an unsubscribe function. Events:

| type | when | useful fields |
| --- | --- | --- |
| `pressed` | a pull starts | `player`, `at` |
| `charged` | the ball reaches full size | `player`, `at` |
| `launched` | thrown | `player`, `ballId`, `arc` (power, size, flight time) |
| `cancelled` | ball crumbles | `player`, `at`, `radius`, `reason` (`short`, `hit`, `interrupted`) |
| `landed` | a ball lands | `player` (thrower), `at`, `radius`, `strength`, `size`, `hits` |
| `hit` | a character is in the hit zone | `player` (hit), `by`, `at`, `strength` |

Several balls can be in the air at once. The impact feature (issue #7: burst, crater, fall,
camera shake) should listen to `landed` and `hit`.

## Driving the snow (issue #5 and #7)

From the snow scene's `useSnow()`:

- **Groove**: every frame, for each player with a `ball`, call
  `pressGroove(ball.position.x, ball.position.z, ball.radius, { velocityX: ball.velocity.x, velocityZ: ball.velocity.z, dig: ball.dwell > 0 ? sinkRate * delta : 0 })`
  (`sinkRate` is a new feel number to add when this is wired).
  The groove follows the rolling ball; `dig` presses deeper the longer the ball sits still
  (`dwell` > 0), so it sinks in.
- **Crater**: on `landed`, call `punchCrater(e.at.x, e.at.z, e.radius)`.
- **Sitting on the snow**: draw the pulled ball at `y = heightAt(x, z) + radius` and the flying ball at `heightAt(x, z) + height`.
- **Resistance (later)**: `packedAt(x, z)` could lower `follow.rateLight/rateHeavy` in fresh snow; not wired yet.

## Input notes

- Keyboard uses `event.code` (physical keys, works on any layout), ignores key repeat, and
  grows the pull in `update()`. A player needs two keys at most (a diagonal), which Mac
  keyboards handle for both players at once. For `keyboard.letGoWindow` after a key comes up
  the aim is frozen, so lifting W a moment before A does not swing the shot.
- Holding at full pull pushes a little into the rubber band (`keyboard.pushPastFull`) so the
  lagging ball truly reaches full charge.
- If the window loses focus mid-pull, the pull is cancelled rather than thrown.
- Aim and power come from where the ball is (it lags the finger), not from the finger:
  what you see is what you throw.
