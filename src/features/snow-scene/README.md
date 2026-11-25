# snow-scene

The snowy ground, camera, light, fog and snowfall that everything else stands on.
Scene only: no characters, no snowball, no game rules. Owner: Rachel.

## Using it from another feature

Import only from `@/features/snow-scene` (the `index.ts`), never from files inside.

```tsx
<SnowScene>
  <YourThing /> {/* drawn inside the 3D scene */}
</SnowScene>
```

Inside `<SnowScene>`, two hooks are available:

- `useSnow()` gives the snow itself. Positions are scene `x` and `z`; one unit is one character height.
  - `pressGroove(x, z, ballRadius)` presses a rounded groove, as a ball of that radius resting there would. Call it along the ball's path as it rolls.
  - `punchCrater(x, z, radius)` punches a bowl with a lumpy rim thrown up around it.
  - `heightAt(x, z)` returns the height of the snow surface there, so things can sit on it.
- `useSnowLayout()` gives `spots`: where the left and right characters stand for the current screen shape.

Pressed snow turns slightly darker and bluer, and part of the pushed-away snow piles into a rim. Dents stay.

Pointer rays skip the snow mesh on purpose (it is a big grid). To find where a finger points, aim at a flat plane and correct with `heightAt`, as `TempDragPress.tsx` does.

## Files

- `content.ts` every colour and tunable number (grid, snow depth, sun, fog, sparkles, camera, snowfall). Tune here.
- `snowField.ts` the height grid and the press / crater maths. No drawing.
- `SnowGround.tsx` draws the grid; re-sends only the changed rows each frame. Grain, sparkles and the fade into fog are in its shader.
- `SceneLook.tsx` sun and sky light, camera, foggy backdrop, snowfall.
- `layout.ts` camera position and character spots from the screen shape.
- `SnowCanvas.tsx` the 3D canvas. `SnowScene.tsx` loads it in the browser only.
- `TempDragPress.tsx` **temporary** test hook, see below.

## Temporary test hook (remove in a later issue)

Everything temporary is in `TempDragPress.tsx` and is marked `TEMPORARY` where it is used:

- drag on the snow: presses a groove
- double click / double tap: punches a crater
- `?guides` in the address: two stand-in blocks at the character spots
- `?fps` in the address: frame rate replaces the hint text

The header of that file lists exactly what to delete.
