# snow-scene

The snow, camera, light, sky and snowfall that everything else stands on. Snow fills the screen at every angle and zoom.
Scene only: no characters, no snowball, no game rules. Owner: Rachel.

## Using it from another feature

Import only from `@/features/snow-scene` (the `index.ts`), never from files inside.

```tsx
<SnowScene>
  <YourThing /> {/* drawn inside the 3D scene */}
</SnowScene>
```

Inside `<SnowScene>`, these are available:

- `useSnow()` gives the snow itself. Positions are scene `x` and `z`; one unit is one character height.
  - `pressGroove(x, z, ballRadius, options?)` presses a rounded groove, as a ball of that radius resting there would. One call is a shallow touch. Call it along the ball's path as it rolls. Options:
    - `dig`: go this much deeper than the snow currently is there. Pass `rate * secondsSinceLastFrame` every frame for a press that deepens the longer it is held; it stops at hard ground.
    - `velocityX`, `velocityZ`: how fast the ball is moving (units per second). Snow ploughs up ahead of it, and faster movement kicks up more snow.
  - `punchCrater(x, z, radius)` punches a bowl with a lumpy rim thrown up around it, and a burst of snow. A second hit in the same place digs deeper.
  - `heightAt(x, z)` returns the height of the snow surface there, so things can sit on it.
  - `packedAt(x, z)` returns how packed the snow is there, 0 (untouched) to 1 (pressed hard). Use it for resistance: fresh snow should feel heavier than a packed track.
- `useSnowLayout()` gives `spots`: where the left and right characters stand for the current screen shape.
- `useSnowPoint()` gives a function that turns a pointer event's `clientX, clientY` into the point on the snow under it. (Pointer rays skip the snow mesh on purpose; it is a big grid.)
- `claimSnowPointer(pointerId)`: call it in your pointer-down handler when a finger starts dragging one of your things (a character, for the slingshot). A claimed finger never turns or zooms the view. It is released by itself when the finger lifts. Fingers nobody claimed are "on empty snow": one turns the view, two pinch to zoom.

The deeper the snow is pressed, the darker and bluer it gets and the taller its rim. Dents stay. Dust and small clumps fly by themselves whenever snow is pressed or hit; nothing to call.

The view is part of the scene: one finger or a mouse drag on empty snow turns it (25 degrees up to nearly top-down, 60 degrees left and right, never behind), pinch / wheel / trackpad pinch zooms, and the "Reset view" button brings back the start. The view pulls back by itself when needed so both character spots stay in frame, so `useSnowLayout()` spots are valid at every angle and zoom. Things you place must be real 3D (the view turns).

Snow is everywhere: the play area (`ground.sizeX` by `ground.sizeZ`, centred on 0, 0) is the part that can be pressed; around it one big cheap surface runs out to a soft haze. The two share the same height function (`baseHeightAt`), the same material and the same points along their meeting line, so there is no seam. Toward the edge of the play area the snow gives less and less (`ground.edgeLock`), so a dent never shows where the pressable part ends. `heightAt` works anywhere; pressing only does something inside the play area.

## Files

- `content.ts` every colour and tunable number (grid, snow depth, sun, fog, sparkles, camera, snowfall). Tune here.
- `snowField.ts` the height grid and the press / crater maths. No drawing.
- `SnowGround.tsx` draws the play-area grid (re-sends only the changed rows each frame) and the big surrounding snow. Grain, sparkles, far drift shading and the haze are in its shader.
- `ViewControls.tsx` the buttons on top of the scene (reset view; temporary look / press switch).
- `SnowSpray.tsx` dust puffs and clumps thrown up when snow is pressed or hit.
- `CameraRig.tsx` the camera: turning, zooming, limits, reset. `pointers.ts` which finger belongs to whom, and screen-to-snow aiming.
- `SceneLook.tsx` sun and sky light, soft sky, snowfall.
- `layout.ts` camera position and character spots from the screen shape.
- `SnowCanvas.tsx` the 3D canvas. `SnowScene.tsx` loads it in the browser only.
- `TempDragPress.tsx` **temporary** test hook, see below.

## Temporary test hook (remove in a later issue)

Everything temporary is in `TempDragPress.tsx` and is marked `TEMPORARY` where it is used. Dragging now turns the view, so pressing has its own mode: the "Look / Press" switch at the top right. In "Press" mode:

- press and hold on the snow: digs deeper the longer it is held
- drag: a groove that follows the finger with a little lag, heavier in fresh snow
- double click / double tap: punches a crater

Always:

- `?guides` in the address: two stand-in blocks at the character spots
- `?fps` in the address: frame rate replaces the hint text

The header of that file lists exactly what to delete.
