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

## A match: round sets, special cut-outs, mounds

- `ROUND_SETS` (content.ts) are the sets of a match, one per round; `ALL_SETS` is free play plus round sets (the
  picker on `/dev/pins` shows them all). Rachel: every round is the classic bowling-pin crowd in the middle of the
  lane (triangle, crowd of friends, ring, a ten-pin triangle, the village), changed only a little, with one small
  rule each (Strike!, Hit the star, Let the bunny be, Little mound, Sleepy cat). A set may have a
  `shift` (it stands left or right of the lane's middle, at most 0.3 in a round set), a `turn` (the whole set and
  its mounds turned a few degrees about its middle, `placeIn` in layout.ts), `mounds` (small soft snow at the
  sides in front of it) and a `note` (the words under "Round 2 / 3").
- A pin may be `kind: "star"` (a star doodle above its head, `SPECIALS.star`; +2 when it falls) or
  `kind: "friend"` (the white rabbit, or the bench with the sleeping cat: never counted as a card; its words and
  picture under "N down!" are per prop, `TEXT.friend` and `SPECIALS.friend.art`; +2 if every friend is still standing, nothing taken
  away when knocked). `scoring.ts` `countThrow` makes the result (`down`, `total`, `fullClear`, `stars`,
  `friend`, `bonus`) for both the stage and the shot measure; "N down!" lists the specials under the count.
- A mound is Rachel's `mound-snow` cut-out drawn as a thick card (like a pin). `softSnowFor(set)` gives the roll its
  softness (`MOUND`); it squashes flat with a puff where a ball ploughs through and stands up again for the next throw.
- `createPins(id, { autoNext: false })`: no new set after a full clear (the game decides). `pins.changeAfterResult(id)`:
  once the "N down!" on show has been seen, change to that set instead of popping the cards back up (a new round).

## Formations

Five to ten small friends per set, airy enough to read from the throwing view (Rachel: the first sets were one
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
  length, a tiny puff crater at its head, and plays a synthesized paper "fwump" (`fwump.ts`). A tip backward on
  impact (`impact.faceUp`) makes most cards land face-up.
- **Lying cards stay readable (#48):** from the low throwing view a card lying flat is a sliver, so once it has
  landed its drawing lifts its head (turning on its bottom edge) to rest `rest.elevationDegrees` off the snow, on a
  small paper-snow heap (the scenery's mound look, `rest.heap`). Drawing only: the physics card lies flat and the
  count does not change. It eases back down as the card pops up again. No "x x" dizzy face: the art has none, and
  art is never drawn here (add one when Rachel or the image model draws it).
- **The ball never parks on the cards (#47), but rolls to the back first:** a ball of the throw rolls on through the
  pins to the paper wall and back (bowling's `FEEL.wall`). It poofs (`burst(ballId)`) when it slows below
  `burst.slowSpeed` among the cards on its way out, or, once it has been past them all or bounced, when it is nearly
  still (`FEEL.wall.poofBelow`). On its way back it can knock more cards; they count.
- **Counting:** a card is down when tilted past `down.tiltDegrees`. The `result` event (and "N down!") comes once
  no ball of the throw can reach a card any more (it has poofed or stopped) and every card has been still for
  `down.settleHold` (a card already lying in the snow may still slide a little, `down.lyingShare`), or
  `down.timeoutAfterClear` after that, and at the latest bowling's `FEEL.wall.countWithin` (3.5 s) after the ball
  first met a card (or rolled past them all); a ball still rolling then poofs, so nothing falls after the count.
- **Reset:** after `reset.delayAfterResult`, every card is held still (kinematic) and the moved ones hop back in a
  little wave, landing with a boing; then all return to the physics together. After a full clear (or "next set")
  the set ducks into the snow, fresh snow settles on the spot, and the next set hops in from further down the lane.

## Files

- `content.ts` every feel number, the formations (#25), the round sets, the special cut-outs and the text. Tune here.
- `scoring.ts` what a throw scored at a set (shared with the shot measure in `src/features/game/measure`).
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
- Reaction faces (a surprised swap as a card falls, an "x x" dizzy face on a lying card) once the art has them.
