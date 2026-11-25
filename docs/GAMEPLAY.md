# Plop! · how the game plays

Draft 2, 2026-11-24, kept up to date with the game (last 2026-11-25): **paper bowling on snow.** Chosen by Rachel over draft 1 (snowmen running around a field)
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
- **Soft snow mounds** (round 4 of a match, "Little mound"): Rachel's snow-mound cut-out stands on the lane just
  in front of one side of the crowd, never in front of the whole middle. Rolling through it slows the ball a lot; a quick light ball punches through, a slow heavy one gets stuck.
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
- A match has its own **round sets**, one per round: the same classic crowd, a little shifted, with one small rule each (section 7c).
- 5 to 10 cut-outs per set (the ten-pin triangle of round 4 is the most), airy enough to read from the throwing view at desktop and phone size.
- **Special cut-outs:** a *star friend* carries a little star doodle above its head and is worth 2 extra points
  when it falls (one card inside the crowd). The white rabbit (and in round 5 the sleeping cat on its bench) is a *friend* watching: it should be
  left alone. Knocked over it simply scores nothing; still standing after the throw, it gives 2 points ("bunny's
  still standing!"). Never taking points away. Each round's rule card explains it (section 7c).

## 7. Two players, one device

- Players take turns, one ball each, like bowling. The thrower swaps between the bucket snowman and the
  red-hat snowman.
- There is a score (Rachel: hitting alone is not enough). Each cut-out knocked down is a point; a full clear
  gives a small bonus; the special cut-outs add theirs (section 6). See section 7b for how it looks.
- One person can play alone (the small "Just me" on top of the first start card): one throw a round, against their own best.
- "Together" mode: both throwers on the line at once, aiming at the same crowd (section 7d).

## 7b. Score display (Rachel may still redesign it, #31)

- Floats at the top of the screen over the snow, never covering the lane.
- A paper panel first, glass second: mostly paper white with a faint ink grain and a short hatched coloured-pencil
  wash (pale snow-shadow by day, butter by evening), over a light blur of the snow, with a wobbly brown pencil outline
  that varies in weight, handwritten numbers and Rachel's doodles (thrower faces, star, surprise lines).
- A hand-drawn progress bar for the current set: how many cut-outs are down out of how many, filling with a
  coloured-pencil stroke as they fall, and a little burst when it fills (full clear).
- Each player's total next to their snowman's little face (bucket snowman, red-hat snowman); the player whose turn
  it is has a soft butter crayon ring. Points fly up into the bar from the fallen cut-outs.
- Can be hidden with one tap. Colours and fonts from the tokens.
- In a match: a small "round 2 / 3" tag hangs under the panel, and each throw's points (the player's round
  total) fly up from the lane into their score, which counts up when they land. Playing alone, the right side
  shows your best with a little crown.

## 7c. The match (2026-11-25; Rachel changed her mind: draft 2 had endless turns and no winner screen)

- **Before the first throw** two hand-drawn paper cards (2026-11-25, Rachel: one crowded card confused first-timers,
  then five steps felt too rigid for a simple game; two is right). English leads, Chinese beneath. The second card
  slides in softly, "← back" returns, two snowball dots show where you are, and the snow scene stays visible:
  1. **How do you two play?** Playing with a friend is the main case, so it is what the card asks: "Take turns"
     (one rolls, then the other, like bowling) or "At the same time" (both snowmen on the line, with the key
     pictures W A D and ↑ ← →, or "each drags their own snowman" on a touch screen). Playing alone is a small
     "Just me →" option on top of the card. A tap goes on; the scene behind already shows one snowman or two.
  2. **Names, rounds, go:** one name field alone, two (Bucket's and Red Hat's faces) with a friend, filled in from
     the device (empty means "Bucket" / "Red Hat"); "3 rounds · about N min" or "5 rounds" (minutes from real play,
     about 12 s a throw and 5 s to read each rule card, `GAME.start.minutes`: alone 1 / 2, taking turns 2 / 3, at
     the same time 1 / 2); "Let's roll!". A link under it, "New here? How to throw" (just "How to throw" later), opens
     a card with a little looping picture (the snowman pulls back, the ball grows, rolls and tips three friends over)
     and four lines: hold Space or drag the snowman back, let go to roll, knock down as many as you can, each round
     has one small rule. The "?" in the corner shows it again during a match.
  A returning player gets one card instead: "又见面啦！ · Welcome back", last time's snowmen, names, way to play and
  length, "和上次一样 · Same as last time" (one tap to play) and "换个玩法 · something else". Last time's choices
  are kept on the device (`plop.start`). The score panel stays hidden until the match starts, and alone it shows
  one player (and your best). The single name is used everywhere: the score panel (over each total), "Red Hat's
  turn!", "N down!" in together mode, the end card, the group board and invites (2026-11-25, Rachel: nobody
  noticed the name question hidden in the share sheet).
- **Arriving from a friend's invite** (`/?g=&from=小美&score=23`) the first card says "小美 is waiting · 小美 在等你"
  on top and has "Just me" marked; playing alone, the panel's right side shows 小美's score "to beat" instead of
  your best, and the end card says how it went ("you beat 小美's 23!" or "小美 has 23 · so close!").
- **Each round** every player throws once at the same set (it pops back up between them), then the next round's
  set hops in. As it arrives a **rule card** fills the middle (2026-11-25, Rachel did not understand "let the bunny
  be" and the old note left too fast): "Round 2 / 3", the rule in a few big words in Chinese and English
  ("别打倒小兔子 / Leave the bunny"), the special card's picture (her cut-out, the star doodle over a star friend), one
  plain line ("别打倒小兔子：它站着就 +2 / Leave the bunny standing: +2") and "知道啦 · got it". It stays until the player
  pulls, taps anywhere or presses a key; never on a timer. With two players taking turns it also says who is first.
- **In the scene**, while aiming, the special card is marked: a berry pencil "don't" sign with a little arrow
  bouncing over the bunny or the sleepy cat, butter twinkles around a star friend's star, an arrow over the soft
  mound. It is gone while the ball rolls.
- **All round long** a small chip beside "round 2 / 3" under the panel keeps the rule: the special card's picture and
  two words ("别碰小兔 · spare bunny").
- **"N down!"** says the rule's outcome in big words under the count: "Bunny still standing! +2", "oops, the bunny
  fell", "Kitty still asleep! +2", "Star friend down! +2".
- **The sets** (data: `ROUND_SETS` in `src/features/pins/content.ts`, round order `GAME.match.rounds` in
  `src/features/game/content.ts`). Rachel (2026-11-25): every round is the **classic bowling-pin crowd** standing
  in the middle of the lane, a group of her little characters arranged like bowling pins, and it only changes a
  little from round to round: the whole set shifts sideways (at most 0.3), turns a few degrees, swaps who stands
  where. Without a crowd there is nothing to knock down, so the variety is **one small rule per round**, named in a
  few words under the round number, and its result shows under "N down!" in a few hand-drawn words. Never an
  empty middle, never a few cards off to one side.
  1. *Strike!* The plain triangle, 1, 2, 3, the front pin pointing at the thrower. Just bowl.
  2. *Hit the star:* the crowd of friends, 0.2 to the left, a star friend inside it a little right of the middle
     (+2 when it falls).
  3. *Let the bunny be:* the ring, 0.25 to the right and turned 6°, the bunny just in front between the front
     pair (+2 if it stays up, nothing taken away if it is knocked).
  4. *Little mound* (5 rounds): real bowling's ten, 1, 2, 3, 4, with a small soft mound just in front of its
     right side, so a straight full-power ball brushes it and slows.
  5. *Sleepy cat: don't wake it* (5 rounds): the little village with the bench and its sleeping cat beside the
     front right (a friend like the bunny: "kitty's still asleep +2" or "oops, kitty woke up!"), and a star
     friend at the back.
  A 3-round match plays 1 to 3.
- **The aim:** a good straight throw at the middle may score well (Rachel prefers the classic look); variety
  comes from the sweet spot on the pull, the small shifts, where the star stands, the bunny and the mounds.
  Measured with the real roll and physics (`src/features/game/measure`, numbers in `docs/TUNING.md`).
- **The end card:** both snowmen's faces with their totals, a crown doodle and "hooray!" for the winner and a kind
  word for the other ("lovely rolling, Bucket"), or "A snowy tie! two crowns today". Alone: your total, and
  "a new best!" (with the crown) or your best so far. A line names the best single roll of the match. "Play again"
  restarts the same match; "换个玩法 · change how we play" walks the start cards again from the first one. Never "you lose".
- **The group board on the end card:** when the page has an invite group (`?g=`, or this device made an invite and
  so owns a group), the end card shows "pop it on!" with the player's name already filled in (one per player when
  two play) and the group's top five. The invite card shows the same board under its message.

## 8. Controls

| | Choose spot | Pull back and aim | Throw |
|---|---|---|---|
| Mouse / trackpad | drag the thrower left / right along the line | press on the thrower and drag back; sideways sets the angle | let go |
| Touch | same as mouse | same as mouse | let go |
| Keyboard (whoever's turn it is) | A / D or ← / → | hold Space: pull grows while held, A / D or ← / → turn the aim | release Space |
| Keyboard, together mode | Bucket A / D, Red Hat ← / → | Bucket holds W (or Space), Red Hat holds ↑ (or Enter) | release |

- Dragging on empty snow turns and tilts the camera (never behind the cut-outs). "Reset view" returns to the
  throwing view.

## 9. Calm extras

- **Fresh snowfall:** a round button (and the N key) that lets snow fall for a few seconds and smooths every groove
  and crater away.
- **Evening over a match:** round 1 is afternoon; the light glides toward sunset and a cosy evening round by round
  (only between rounds, never while a ball rolls), and the end card sits in the evening. The street lamp lays a warm
  pool on the snow, windows, the café lantern and the fairy lights glow, the paper sky sets with Rachel's sun and moon.
  "Play again" fades back to afternoon. A little real smoke rises from the chimneys and clear ice hangs from the eaves
  all day.
- **Sound:** background music and a quiet village ambience (wind, the café fire, chimes, a chickadee), each with its
  own volume; snow crunch while pulling and rolling, soft paper flops as cards fall, and named cues: a round chime,
  a star sparkle, the bunny's mew on a near miss, bells on a full clear, a win or tie tune, paper taps on the cards.
  Everything starts after the first tap; the corner buttons switch music and sound effects.
- **Share:** a paper-plane button at the bottom left (system share sheet, "link copied!", or inside WeChat a note
  pointing to the ··· menu).

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

## 7d. Together mode (2026-11-25)

- On the first start card, "At the same time" (taking turns is the other choice). Together
  is always two players.
- Both snowmen stand on the line at once: Bucket on the left half, Red Hat on the right (the middle stays free).
  Each pulled ball grows on its snowman's outer side, so the two never bump while pulling.
- **Keys** (physical keys, one hand on each side of a Mac keyboard): Bucket slides and aims with A / D and pulls
  with W (or Space); Red Hat slides and aims with ← / → and pulls with ↑ (or Enter). W A D and the arrow cluster are
  far apart on the keyboard, so pressing both players' keys at once does not ghost on Apple keyboards. Mouse and
  touch: drag whichever snowman you press (two fingers can pull both at once).
- Each throws once a round, any time, even while the other ball rolls. The cards stay where they fell until both
  have thrown, so the second thrower can clean up what is left. Then the round is counted.
- **Whose card:** each card counts for whoever's ball touched it first, or knocked the card that knocked it. Each
  player gets their own stars; the bunny's +2 goes to everyone whose ball (or chain) left it alone. On an
  "All down!" everyone who knocked a card gets the full-clear bonus.
- "N down!" shows the shared count, and under it each player's own: "Bucket 1 down!", "Red Hat 2 down! +2". Their
  points fly into their totals one after the other.
- The camera does not film a chase in together mode: the throwing view already frames both snowmen and the set.
- Rounds, sets, the evening light and the end card work as in turns mode.

