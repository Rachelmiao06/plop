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
- A burst (star and surprise lines) plays whenever `down` reaches `total`.
- Put it inside a `relative` box that also holds `<SnowScene>`; it floats at the top and never covers the lane.
- The corner toggles start the music after the first touch anywhere (if its switch is on). Music and the
  switches live in `src/lib/audio.ts`.
- Feel numbers (spring, wobble, glass blur, timings) are in `content.ts`.

Files: `ScoreHud` (layout), `ProgressBar`, `CornerToggles`, `Doodles` (faces, star, icons, pencil frame),
`pencil.ts` (wobbly line maths), `hudStyles.ts` (keyframes, rendered as a scoped `<style>` because this
project's Next config makes every `.css` file global, so CSS modules do not work).

Stand-ins: snowman faces are simple drawings until the character art has face crops; the star and surprise
lines are drawn here until PR #20's effect doodles land in `public/assets/effects/`.
