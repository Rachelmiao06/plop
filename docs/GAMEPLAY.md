# Plop! · how the game plays

Draft 1, 2026-11-24. Written by Claude as "the most reasonable version" for Rachel to react to and change.
This file is the source of truth for interaction. `docs/SPEC.md` keeps the why and the look.

## In one sentence

Two snowmen run around a cosy snowy village, roll snowballs that grow on fresh snow, stop to aim like a
slingshot, and splat each other. No scores, no rounds, no winning: just the feel.

## The loop

```
   ┌────────────── run and ROLL ──────────────┐
   │  ball grows on fresh snow, slows you down │
   └──────────────────┬───────────────────────┘
                      │ hold the aim key / press your snowman
                      ▼
               AIM (slingshot)  ── let go too early ──► cancel, keep the ball
               pull back = power,
               arc + landing ring
                      │ let go
                      ▼
                    THROW ──► SPLAT (hit or crater) ──► new small ball, back to ROLL
```

## 1. Rolling

- Your snowman always has a snowball at its feet. Moving rolls it.
- The ball grows only while rolling over **fresh** snow, and grows little on snow that is already packed
  (the snow scene's `packedAt`). Rolling leaves a packed track, so over time the field fills with paths and
  big balls have to be rolled in untouched corners. That gives the toy a gentle "where do I go" without rules.
- Bigger ball = slower run, heavier turning, deeper groove, louder crunch. It stops growing at a maximum size
  and trembles a little to say "full".
- Growth slows as the ball gets big (bigger surface to cover), so a small ball grows quickly and a huge one
  takes patience.
- A ball never shrinks while you hold it.

## 2. Aiming (the slingshot)

- Hold your aim key (or press on your snowman with mouse / finger): the snowman stops and plants its feet.
- Pull back, away from the target. Pull length = power = how far it flies. The ball rolls back a little as you
  pull, so it can still pick up a bit of snow.
- While aiming you see a dotted arc and a landing ring on the snow. The real throw follows exactly that arc.
- Keyboard players get help: the aim starts pointed at the other snowman, the pull grows the longer you hold,
  and left / right nudge the angle. Mouse and touch aim freely.
- Release with almost no pull = cancel; you keep your ball and run on.

## 3. Throwing

- On release the ball flies. Small balls fly fast and flat; big balls fly slow and high and splat wider.
- The snowman does a little hop and a happy face. A new small ball pops out of the snow at its feet after
  about half a second.
- You cannot throw again until the new ball has appeared, so nobody can machine-gun.

## 4. Splat

- **Hit:** the target squashes, its head tips or its hat flies off, it slides back a little, then pulls itself
  back together with a springy bounce (about one second). While reassembling it cannot aim or throw, but it can
  still shuffle. A short freeze frame, a small camera shake, a thump and a vibration sell the hit; bigger balls,
  bigger everything.
- **Miss:** the ball bursts into snow and punches a crater that stays.
- **Scenery:** trees, cottage, igloo, log and bench block balls and snowmen. A hit makes the prop wobble and
  drop a little snow. They are the cover you hide behind.
- **Friends** (little snowmen, penguins, people): balls pass through them, but a near miss makes them flinch and
  look around. Nobody gets hurt.

## 5. The field

- A round-ish play area in the middle of the village, about 18 by 12 character heights.
- The edge is soft and in-world: past it, the snow gets deeper and deeper and the snowman slows to a stop,
  as if wading. No walls, no invisible box.
- The cosy village sits around and inside the edge: three clusters (home at the back, music corner, watching
  bench), with clear lanes between them.

## 6. Camera (two players, one screen)

- One shared view, no split screen.
- It looks at the point between the two snowmen and pulls back as they run apart, so both are always in frame,
  then eases closer when they come together. Gentle easing; it never jerks.
- Anyone can still turn and tilt the view with the mouse / trackpad on empty snow; the automatic part only
  manages the distance and the centre. "Reset view" returns to the default angle.
- The camera never goes behind the village or straight down (the snow scene's limits).

## 7. Controls

| | Move | Aim | Throw |
|---|---|---|---|
| Left player (keyboard) | W A S D | hold **F**, then A / D to nudge | release F |
| Right player (keyboard) | arrow keys | hold **/** (or **Enter**), then ← / → to nudge | release |
| Mouse (one person) | click and hold on snow: your snowman walks toward the pointer | press on your snowman and drag back | let go |
| Phone / tablet | each player owns their half of the screen: drag on your half to walk | press on your snowman and pull back | let go |

- On a Mac two people sit side by side and share the keyboard; both can move and aim at the same time.
- Mouse controls whichever snowman you pressed last, so one person can play both or two people can take turns.
- A key on the left and a key on the right is free for later (for example a cute "wave" or "taunt").

## 8. Calm extras

- **Fresh snowfall:** a small button (and a key) that lets soft snow fall for a few seconds and smooths the field
  back to fresh. For when the field is all paths, or just to watch it.
- **Practice buddy (later):** when only one person plays, the other snowman can wander and lob gentle balls.
- Background music and its on / off button.
- No score, no timer, no win screen. If a hit counter ever appears, it is tiny and off by default.

## 9. Feel targets (numbers live in `content.ts`)

- Running: brisk and light with a small ball; a full-size ball roughly halves the speed.
- Full-size ball: about 1.2 character heights across; starting ball about 0.25.
- Rolling from smallest to full size on fresh snow: about 6 to 8 seconds of running.
- Throw range: from about 3 to about 14 character heights, depending on pull.
- Hit recovery: about 1 second. New ball after a throw: about 0.5 seconds.

## What this changes in the work already done

- **Slingshot (PR #21):** home spots are no longer fixed. Add running and rolling growth; aiming starts wherever
  the snowman stops. Keep the pull, the shared arc maths, landing, hits and the event stream.
- **Snow scene (on `main`):** add camera auto-framing of two moving points, and a soft deep-snow edge.
- **Characters (PR #22):** add run, plant-feet, hop and wade animations to the existing states.
- **Scenery (PR #20):** props need simple round blockers (for balls and snowmen) and a wobble on hit.

## Open questions for Rachel

1. Is running the right call, or would small side-steps (a dodge) be enough?
2. Should the ball sit at the snowman's feet and be pushed (rolling), or should the snowman stand on top of it?
3. Is the keyboard layout comfortable for two people side by side?
