# hud

The floating score display (issue #28) and the music / sound-effect switches (issue #18).
Try it at `/dev/hud`.

```tsx
import { ScoreHud } from "@/features/hud";

<ScoreHud
  players={[
    { name: "Bucket", total: 4, look: "bucket" },
    { name: "Red Hat", total: 2, look: "redHat" },
  ]}
  active={0}             // whose turn: 0 left, 1 right
  down={3} total={8}     // cut-outs down in this set
  knock={{ id, count }}  // new id = that many "+1"s fly into the bar
  hidden={hidden} onHiddenChange={setHidden}  // optional; the eye toggle works without them
/>
```

- Props only. It shows the numbers it is given and animates the changes; the game decides the scores.
- A match adds `round={{ now, of }}` (a small "round 2 / 3" tag under the panel), `gain={{ id, player, points }}`
  (the throw's points fly up into that total, which counts up when they land) and, playing alone,
  `soloBest={n | null}` (the right side shows your best with a little crown).
- `MatchStart` (the "3 or 5 rounds / two friends or just me" card) and `MatchEnd` (totals, crown, cheer, tie card,
  "play again") in `Match.tsx`. The crown is a pencil stand-in in `Doodles.tsx` until Rachel draws one.
- A burst (star and surprise lines) plays whenever `down` reaches `total`.
- Put it inside a `relative` box that also holds `<SnowScene>`; it floats at the top and never covers the lane.
- The corner toggles start the music after the first touch anywhere (if its switch is on). Music and the
  switches live in `src/lib/audio.ts`.
- Feel numbers (spring, wobble, glass blur, timings) are in `content.ts`.

Files: `ScoreHud` (layout), `ProgressBar`, `CornerToggles`, `Doodles` (faces, star, icons, pencil frame, paper fill, halo),
`pencil.ts` (wobbly line maths), `hudStyles.ts` (keyframes, rendered as a scoped `<style>` because this
project's Next config makes every `.css` file global, so CSS modules do not work).

Paper, not glass (#31): the panels are mostly paper white (`glass.tint` 70, more by evening) with a faint `--ink`
grain and a short hatched coloured-pencil wash inside (`PaperFill`, `content.paper`), cool `--snow-shadow` in the
afternoon warming to `--butter` by evening (it reads the match's time of day from the snow scene). Pencil outlines
swell and thin along the stroke (`content.pencil.pressure`, `darkness`); the bar's hatch has uneven gaps and
lengths plus a light second layer (`content.bar.hatchMess`); the active player wears a `--butter` crayon ring
(`HaloDoodle`, `content.halo`) instead of a gradient glow.

Art: the faces are square crops of Rachel's thrower cut-outs (`public/assets/scenery/thrower-*.webp`, crop boxes in
`Doodles.tsx`), the star and surprise lines are her effect doodles (`public/assets/effects/`). The crown is still a
pencil stand-in until she draws one.
