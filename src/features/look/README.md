# look

The finishing layer over the 3D picture (issue #42, review in `docs/REVIEW.md`): a faint paper grain and a soft
paper edge. Plain CSS above the canvas and under all UI, so the 3D render is untouched: cut-outs stay unlit
paper, snow stays real lit snow. No library (post-processing would break that tone-mapping split, see the review).
Page: `/dev/look` (the real game plus before / after switches and a live fps count; `?grain=0`, `?edge=0`).

## Files

- `content.ts` every number: grain strength, frequency, tile size; edge corner and bottom strength. Tune here.
- `PaperFinish.tsx` the two layers. To use it on the home page: `import { PaperFinish } from "@/features/look";` in
  `src/features/game/Game.tsx` and `<PaperFinish />` right after `</SnowScene>` (waits for the throw-camera PR).
- `store.ts` which layers are on (defaults from `content.ts`; `/dev/look` switches them).
- `LookPanel.tsx` the `/dev/look` switches and fps count.

Nothing moves, so reduced motion needs no fallback.
