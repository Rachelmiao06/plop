# loading

A calm paper screen over the page while the 3D scene and the art load: the "Plop!" title in Gaegu, one of Rachel's
cut-outs gently bobbing (still for "reduce motion"), and the **snow strip**: a little trench of real lit snow where a
snowball rolls left to right, growing as it rolls and pressing a groove behind it with a little spray. How far it has
rolled is the progress (percentage beneath in the heading font). When the scene is ready the ball rolls to the end
and bursts, and the paper screen clears outward from that point (a soft hole grows, Rachel's snow-puff doodle blooms
there), then the screen leaves the page. Server-rendered, so it is the very first thing a visitor sees.

Mounted in `src/app/page.tsx` next to `<Game />` and in `src/app/invite/page.tsx` (with `art`, `note` and `small` set
to the mouse and the invite's words). The game itself is not touched.

## The snow strip

`SnowStrip.tsx` + `snowStripShader.ts`: one raw WebGL 1 shader in a canvas about 300 × 84 px, **no three.js**, so it
draws within a frame of the script arriving. Same recipe as the snow scene's ground, shrunk: a warm sun and a pale sky
fill shading the slopes, fine grain, glinting sparkles, pressed snow turning bluer. Its light colours are the snow
scene's own, copied into `content.ts` (`strip.light`). The groove is computed from the ball's path (radius grows with
distance), so nothing is stored.

- No WebGL (or the context is lost): the old pencil line, drawn by the same component. The server renders the pencil
  line too, so there is always something before the script runs.
- Reduce motion: the ball moves straight to the progress, no spray, no twinkle; the screen fades instead of the burst.
- The canvas has `data-loading-strip`, so `useSceneReady` ignores it when it waits for the scene's canvas.
- `useLoaded()` (from `loaded.ts`) turns true once the screen has gone: the invite card starts its entrance on it.

## When is the scene "ready"?

`useSceneReady.ts`, without any help from the game:

1. a `<canvas>` is on the page and two animation frames have passed (it has drawn),
2. drei's `useProgress` (the loading manager every `useTexture` goes through) is idle with everything loaded and has
   stayed idle for `timing.settle` (if nothing ever loads, `timing.nothingToLoad` after the canvas),
3. at least `timing.minShow` has passed, so a cached visit never flashes.

`timing.maxWait` (15 s) shows the game whatever happens.

**Optional ready signal from the game:** if the game ever dispatches `window.dispatchEvent(new Event("plop:ready"))`
once its first full frame with all art is drawn, the screen fades at once. Not needed today; the checks above work.

## Files

- `content.ts` words, art, bob size and speed, every timing, the progress floor / ceiling / creep, the strip's size,
  ball sizes, roll speed and light, and the burst. Tune here.
- `useSceneReady.ts` the readiness checks above; returns `progress` (never goes back) and `ready`.
- `LoadingScreen.tsx` the screen and the clearing: token colours only (`bg-paper`, `text-ink`).
- `SnowStrip.tsx`, `snowStripShader.ts` the strip (above). `loaded.ts` the "screen has gone" store.
- `review/` screenshots for the PR and the repo README.
