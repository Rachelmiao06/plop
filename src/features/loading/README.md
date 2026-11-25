# loading

A calm paper screen over the home page while the 3D scene and the art load: the "Plop!" title in Gaegu, Rachel's
bucket-hat thrower cut-out gently bobbing (still for "reduce motion"), and a pencil line that draws itself as
textures load. It fades out once the scene is ready, then leaves the page. Server-rendered, so it is the very first
thing a visitor sees. Mounted in `src/app/page.tsx` next to `<Game />`; the game itself is not touched.

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

- `content.ts` words, art, bob size and speed, every timing, the progress line's floor / ceiling / creep. Tune here.
- `useSceneReady.ts` the readiness checks above; returns `progress` (never goes back) and `ready`.
- `LoadingScreen.tsx` the drawing: token colours only (`bg-paper`, `text-ink`, `stroke-ink`, `stroke-snow-shadow`).
- `review/` screenshots for the PR and the repo README.
