# pins

The cut-outs the snowball knocks down (issues #7 and #25): Rapier physics, chain reactions, the count,
the hand-drawn "N down!", the springy reset and the formations. See `docs/GAMEPLAY.md` sections 5, 6 and 10.
Owner: Rachel. Test page: `/dev/pins` (add `?fps` for the frame rate).

## Using it

```tsx
import { BowlingStage } from "@/features/bowling";
import { SnowScene } from "@/features/snow-scene";
import { createPins, NextSetButton, PinsPopup, PinsStage } from "@/features/pins";

const [pins] = useState(() => createPins());          // formation id optional
<div className="relative">
  <SnowScene>
    <BowlingStage />
    <PinsStage pins={pins} />                          // inside the canvas
  </SnowScene>
  <PinsPopup pins={pins} />                            // "N down!" overlay
  <NextSetButton pins={pins} />
</div>
```

`pins` is a small controller shared by the 3D stage and the page:

- `pins.subscribe(event => …)` events, for the score HUD later:
  - `knocked` `{ down, total }` live, each time a card tips past "down" during a throw
  - `result` `{ result: { down, total, fullClear } }` once everything has settled (or timed out)
  - `ready` `{ formation, total }` cards are standing again (after a reset or a new set)
  - `phase` `ready → throw → result → resetting | changing → ready`
- `pins.getState()` / `pins.subscribeState()` for `useSyncExternalStore` (formation, phase, down, total, last result, debug).
- Commands: `pins.reset()`, `pins.next()`, `pins.setFormation(id)`, `pins.setDebug(on)` (Rapier's collider lines).

Wiring the HUD later: on `knocked` pass `down`/`total` and a new `knock` id; on `result` add the score.

## Formations

Five to eight small friends per set, airy enough to read from the throwing view (Rachel: the first sets were one
clump): about 1.5 card widths apart in a row, the row behind staggered into the gaps, rows 0.55 to 1 apart so a
falling card still reaches the next, short ones in front. Never in a formation: the throwers (`snowman-bucket-hat`,
the red-hat snowman) and the props that look like they are moving (`penguin-slide`, `skier`, now village decoration).
Formation ids and exports are fixed; the game imports them.

## How it works

- **Ground:** the snow scene's `heightAt` is sampled once (14 by 14 units around `lane.pinSpot`, 0.25 apart)
  into a Rapier heightfield, so cards stand on the drawn drifts. A development check casts rays and logs
  "physics ground matches the snow". Dents pressed later are not in the physics (cards lie on the untouched surface).
- **Cards:** each pin is the scenery look (traced silhouette body + art card + `--ink` edge, see `PinCard.tsx`),
  built from scenery's exported geometry and shader functions. Pins do **not** half-turn: they face the
  throwing line (plus a few degrees of fixed jitter) the whole time, so the physics never fights the turn.
  Collider: a thin box the card's size (`card.widthShare`, `card.heightShare`, thickness from `thicknessShare`)
  plus a hidden foot that carries most of the mass, so the centre of mass is low. Mass, foot depth, friction,
  bounce and damping come from the manifest's weight class (`weight` in `content.ts`). The art is also drawn on
  the back, so a card that lands face-down still shows its character.
- **Ball:** each rolling bowling ball is a kinematic sphere at the same spot and radius (`ball.radiusShare`), so it
  shoves cards and always keeps the simulation's path (a small ball ploughs through as a big one does; see "Later").
  Once the throw is counted a resting ball stops pushing, and the reset waits for it to leave the spots
  (`reset.waitForBallMax`). The first time the ball touches each card it gets an extra shove, lift and tumble
  (`impact`); the first card of a throw also starts the hit-stop with a thump, both bigger for a bigger ball
  (`hitStop.bigExtra`, `bigSlowest`, `thumpPerSize`). Pins stand around `lane.pinSpot`, 8.6 from the line on the
  long lane.
- **Toppling:** real Rapier contacts give the chain reactions. After every physics step speeds are capped
  (`caps`) so nothing jitters or flies off. When a tipped card touches the snow it presses soft dents along its
  length, a tiny puff crater at its head, and plays a synthesized paper "fwump" (`fwump.ts`).
- **Counting:** a card is down when tilted past `down.tiltDegrees`. The result comes when the ball has stopped and
  nothing has moved for `down.settleHold`, or `down.timeoutAfterStop` after the ball stops.
- **Reset:** after `reset.delayAfterResult`, every card is held still (kinematic) and the moved ones hop back in a
  little wave, landing with a boing; then all return to the physics together. After a full clear (or "next set")
  the set ducks into the snow, fresh snow settles on the spot, and the next set hops in from further down the lane.

## Files

- `content.ts` every feel number, the formations (#25) and the text. Tune here.
- `overlap.ts`, `OverlapCheck.tsx` the readability check: each formation's cards projected through the live
  throwing-view camera; no card may hide more than `OVERLAP.maxHidden` (15%) of another. `/dev/pins` logs a table
  in development (or anywhere with `?overlap`, so a Vercel preview can be checked), and again when the window
  changes shape. Run it at a desktop size and a phone size after changing a formation.
- `controller.ts` `createPins`: state, events, commands. No drawing.
- `layout.ts` the sampled ground and each pin's size, colliders and home spot. No drawing.
- `PinsStage.tsx` the physics world, the ball colliders, landing, counting, reset and set changes.
- `PinCard.tsx` one card drawn in the thick-standee look.
- `PinsPopup.tsx` the "N down!" / "All down!" overlay with the effect doodles and Gaegu lettering.
- `PinsPanel.tsx` `NextSetButton`, and the test page's picker, reset and physics-lines switch.
- `PinsPlayground.tsx` the `/dev/pins` page body (throwing view, village, throw, pins). `fwump.ts` the flop sound. `review/` screenshots.
- `ballTap.ts` **temporary**, see below.

## Asked of other features

- **bowling:** expose the running game. `BowlingStage` keeps its `Bowling` private, so `ballTap.ts` wraps
  `Bowling.prototype.step` to find it (read only). Wanted: an `onGame?: (game: Bowling) => void` prop (or a
  `game` prop). Also nice: a way to melt a resting ball early once the pins are counted.
- **scenery:** an `index.ts` exporting a `StandeeBody` (geometry + materials without turning, sway or the fake
  mound) so pins and the village share one component. Pins import `standeeGeometry`, `materials` and `content` directly for now.
- **audio:** a shared paper-flop recording in `src/lib/audio.ts` to replace `fwump.ts`.

## Later

- A small ball could be deflected by a heavy card (today every ball keeps the simulation's path).
- Cards lie on the untouched snow, not in the dents they press.
- Reaction faces (a surprised swap as a card falls) once the art has them.
