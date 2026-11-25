# Plop! · how the game plays

Draft 2, 2026-11-24: **paper bowling on snow.** Chosen by Rachel over draft 1 (snowmen running around a field)
because hand-drawn feel matters most and everything here can be her paper cut-outs.
This file is the source of truth for interaction. `docs/SPEC.md` keeps the why and the look.

## In one sentence

A paper snowman stands at a line in the snow, pulls back to roll a snowball that grows the further it is pulled,
lets go, and the ball rolls through a crowd of paper cut-outs and knocks down as many as it can.

## The loop

```
  PICK A SPOT on the line ──► PULL BACK (ball grows, aim line shows) ──► LET GO
                                                                           │
            ┌──────────────────────────────────────────────────────────────┘
            ▼
  ball ROLLS through the snow, leaving a groove ──► cut-outs TOPPLE, knocking each other over
            │
            ▼
  "7 down!" (all down: a little celebration) ──► cut-outs pop back up ──► next player
            │
            ▼ (both have thrown)
  next ROUND: a new set hops in ──► … ──► after round 3 (or 5): the END CARD ──► play again
```

## 1. The scene

- One long view down a snowy lane in the cosy village. The thrower is near the camera; the crowd of cut-outs
  stands further down the snow. The camera looks from behind and above the thrower, so every cut-out faces
  the viewer. It can still turn left / right and tilt within limits, and it never sees the back of the cut-outs.
- Everything is a paper cut-out made from Rachel's art: thick card with a cream edge, real shadow on the snow,
  base sunk into the snow, half-turning toward the camera (the scenery standee look).
- The village props (cottage, igloo, big tree, pines) frame the lane and are not knocked down.

## 2. The thrower

- A paper snowman standee at the throwing line, Rachel's bucket snowman for player 1 and red-hat snowman for
  player 2.
- Before throwing, it slides left and right along the line to choose a spot (and wobbles a little while idle).
- When pulled, it leans back and strains; on release it does a little hop.

## 3. Pull back, the ball grows

- Press on the thrower (or hold the throw key) and pull back, away from the crowd.
- A snowball appears at the thrower's feet and really rolls backward in the snow as you pull, pressing a groove.
- The further you pull, the bigger the ball (it only grows while it rolls over fresh snow, so pulling back over
  your own old track grows it less). It never shrinks while held. At the limit it is full and trembles.
- Sideways pull sets the aim angle. A dotted line on the snow shows where the ball will roll.
- **The sweet spot** (2026-11-25, Rachel: everyone just pulled all the way): a little past the middle of the pull,
  two small pencil ticks on the snow beside the ball mark it. Up to there the ball only grows stronger. Past it the
  ball gets heavy: it starts slower, and the aim line starts to sway a little from side to side (the ball rolls
  along the line as it is the moment you let go). So a well-judged medium pull can beat a maxed one. No meter.
- Release with almost no pull = cancel.

## 4. The roll

- On release the ball rolls forward down the lane along the aim line, opposite to the pull.
- Speed comes from pull length; weight from size. Small ball: fast and nimble, can thread a gap. Big ball: slow,
  heavy, ploughs a wide groove and flattens everything in its path.
- It leaves a groove and throws up snow dust all the way. It slows down in deep fresh snow and runs further on
  packed tracks, so earlier grooves become faster lanes. It stops by itself, or bursts into snow when it hits a
  big village prop.
- **Soft snow mounds** (from round 3 of a match): Rachel's snow-mound cut-out stands on the lane in front of the
  set. Rolling through it slows the ball a lot; a quick light ball punches through, a slow heavy one gets stuck.
  The aim line shows where it would stop. It squashes flat with a puff as the ball ploughs through and stands
  up again for the next throw.

## 5. Knocking down cut-outs

- Cut-outs are standing cards on the snow. When the ball or another falling card hits one, it tips over about
  its base, flops into the snow with a soft puff, and can knock its neighbours over (chain reactions).
- Each cut-out reacts in character as it falls (a wobble, a surprised face swap if it has one), and lands
  face-up or face-down with a little bounce.
- Tall thin ones fall easily; wide heavy ones (bench, log) need a big ball.
- When everything has settled: a hand-drawn "7 down!" pops up with the effect doodles (star, surprise lines).
  All down: a bigger burst, music notes, everyone cheers.
- Then the fallen cut-outs pop back up with a springy bounce, or a new formation slides in.

## 6. Formations

- Free play (`/dev/pins`): a triangle (classic), a slanted row, a ring, a loose crowd of friends and a
  "little village" mixed set; the next set comes after a full clear, or by a small "next" button.
- A match has its own **round sets**, one per round, each asking a different shot (section 7c).
- 5 to 8 cut-outs per set, airy enough to read from the throwing view at desktop and phone size.
- **Special cut-outs:** a *star friend* carries a little star doodle above its head and is worth 2 extra points
  when it falls (it stands where an angled shot gets it). The white rabbit is a *friend* watching: it should be
  left alone. Knocked over it simply scores nothing; still standing after the throw, it gives 2 points ("bunny's
  still cosy"). Never taking points away. Each is explained once, with a tiny hand-drawn note, the first time it
  appears.

## 7. Two players, one device

- Players take turns, one ball each, like bowling. The thrower swaps between the bucket snowman and the
  red-hat snowman.
- There is a score (Rachel: hitting alone is not enough). Each cut-out knocked down is a point; a full clear
  gives a small bonus; the special cut-outs add theirs (section 6). See section 7b for how it looks.
- One person can play alone ("just me" on the start card): one throw a round, against their own best.
- Later mode: both throwers on the line at once, aiming at the same crowd ("together" mode). Turns come first.

## 7b. Score display (first version; Rachel will design it properly later)

- Floats at the top of the screen over the snow, never covering the lane.
- A translucent frosted-glass panel (soft blur of the snow behind it, like Apple's translucent bars), with a
  hand-drawn feel on top: a wobbly brown pencil outline, handwritten numbers, the effect doodles for flourishes.
- A hand-drawn progress bar for the current set: how many cut-outs are down out of how many, filling with a
  coloured-pencil stroke as they fall, and a little burst when it fills (full clear).
- Each player's total next to their snowman's little face (bucket snowman, red-hat snowman); the player whose turn
  it is glows softly. Points fly up into the bar from the fallen cut-outs.
- Can be hidden with one tap. Colours and fonts from the tokens.
- In a match: a small "round 2 / 3" tag hangs under the panel, and each throw's points (the player's round
  total) fly up from the lane into their score, which counts up when they land. Playing alone, the right side
  shows your best with a little crown.

## 7c. The match (2026-11-25; Rachel changed her mind: draft 2 had endless turns and no winner screen)

- **Before the first throw** a small hand-drawn card asks: 3 rounds or 5 (3 is the default), and "two friends"
  or "just me". "Let's roll!" starts.
- **Each round** every player throws once at the same set (it pops back up between them), then the next round's
  set hops in. "Round 2 / 3" and a few words about the set ("two groups, a gap in the middle") show as it arrives.
- **The sets** (data: `ROUND_SETS` in `src/features/pins/content.ts`, round order `GAME.match.rounds` in
  `src/features/game/content.ts`), a little harder each round:
  1. *Off to the side:* the set leans right, the star friend at the back right.
  2. *Two little groups:* a gap in the middle that a ball down the middle rolls straight through.
  3. *Slanted row and a snow mound:* a domino slant behind a soft mound (from here on, lane features).
  4. *Bunny's picnic* (5 rounds): the rabbit sits in front of the group; a mound off to the right.
  5. *Snowy village* (5 rounds): two mounds, the rabbit and a star.
  A 3-round match plays 1 to 3.
- **The aim:** "full power straight at the middle" should not be the best shot in most rounds. Measured with the
  real roll and physics (`src/features/game/measure`, numbers in `docs/TUNING.md`).
- **The end card:** both snowmen's faces with their totals, a crown doodle and "hooray!" for the winner and a kind
  word for the other ("lovely rolling, Bucket"), or "A snowy tie! two crowns today". Alone: your total, and
  "a new best!" (with the crown) or your best so far. A line names the best single roll of the match. "Play again"
  restarts the same match; "3 or 5 rounds?" goes back to the start card. Never "you lose".

## 8. Controls

| | Choose spot | Pull back and aim | Throw |
|---|---|---|---|
| Mouse / trackpad | drag the thrower left / right along the line | press on the thrower and drag back; sideways sets the angle | let go |
| Touch | same as mouse | same as mouse | let go |
| Keyboard (whoever's turn it is) | A / D or ← / → | hold Space: pull grows while held, A / D or ← / → turn the aim | release Space |

- Dragging on empty snow turns and tilts the camera (never behind the cut-outs). "Reset view" returns to the
  throwing view.

## 9. Calm extras

- **Fresh snowfall:** a button (and a key) that lets snow fall for a few seconds and smooths every groove and
  crater away.
- Background music with an on / off button; snow crunch while pulling and rolling, soft paper flops as cards fall,
  a cheer on a full clear.

## 10. Feel targets (numbers live in `content.ts`)

- Ball size: from about 0.25 to about 1.2 character heights across, by pull length.
- A full pull takes about 1 to 2 seconds of dragging; keyboard hold to full about 1.5 seconds.
- Roll: a light ball crosses the lane in about 1.5 seconds; a full one in about 3.
- Cut-outs settle within about 2 seconds after the ball stops; reset bounce about 0.6 seconds.

## What this means for the work already done

- **Snow scene (on `main`):** used as is: the lane, grooves, craters, dust, packed tracks. Camera gets a
  "throwing view" default and limits that keep it in front of the cut-outs.
- **Slingshot (PR #21):** keep the pull, growth, aim preview and event stream. Change: one thrower at a time,
  the thrower slides along a line, and the release rolls the ball along the ground instead of an arc.
- **Scenery (PR #20):** the standee look (thickness, shadow, half-turn) becomes the look of every cut-out. The
  village frames the lane; small friends become pins.
- **Characters (PR #22, 3D snowmen):** not needed for this version; the thrower is a paper standee. Parked.
- **New:** toppling physics for cut-outs (`@react-three/rapier`), formations, the "N down!" moment, turns.
