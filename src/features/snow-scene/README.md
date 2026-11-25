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
- `useSnowPoint()` gives a function that turns a pointer event's `clientX, clientY` into the point on the snow under it. It aims at the snow as it was before any pressing, so the point glides with the finger and never jumps at a pit or rim. (Pointer rays skip the snow mesh on purpose; it is a big grid.)
- `claimSnowPointer(pointerId)`: call it in your pointer-down handler when a finger starts dragging one of your things (a character, for the slingshot). A claimed finger never turns or zooms the view. It is released by itself when the finger lifts. Fingers nobody claimed are "on empty snow": one turns the view, two pinch to zoom.

The deeper the snow is pressed, the darker and bluer it gets and the taller its rim. Dents stay. Dust and small clumps fly by themselves whenever snow is pressed or hit; nothing to call.

The camera is part of the scene. Its whole state is two numbers: a position on one path (low and close looking across the snow, through the play view, up to high, far and steep where everything looks small) and a turn left/right (up to 60 degrees, never behind). Every input moves those two, so they never fight:

- trackpad two-finger swipe up/down, mouse wheel, trackpad pinch, phone pinch: along the path (fingers up / pinch together = rise; `cameraInput.invertScroll` swaps)
- trackpad two-finger swipe sideways, or a drag on empty snow: turn (a drag up/down also moves along the path)
- "Reset view": back to the play view

A swipe picks one axis after a few pixels, so a mostly vertical swipe never turns the view. Mouse notches move a fixed step whatever size the browser reports. All gains and limits are in `content.ts` under `cameraPath`, `cameraInput` and `orbit`. Over the scene, the page never scrolls, bounces or zooms.

The play-view distance pulls back by itself when needed so both character spots stay in frame, so `useSnowLayout()` spots are valid at every angle. Things you place must be real 3D or face the camera (the view turns and rises to 76 degrees, never straight down).

Camera control is never blocked while characters are idle. When a character starts being dragged, call `claimSnowPointer(pointerId)`; that finger then no longer moves the camera. (Wheel and keys are not claimable yet; nothing uses keys.)

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

## Feel notes for whoever builds the snowball drag

Measured on the press test, these made dragging feel smooth instead of stuttery:

- Follow the finger with an eased share of the gap per frame (`1 - exp(-rate * seconds)`), so it feels the same at any frame rate.
- Ease the rate itself when resistance changes (fresh snow to packed track), or the point jerks.
- Cap how far the point may trail (`tempDrag.maxTrail`), so weight never reads as dropped input.
- Aim with `useSnowPoint()` (untouched surface), not at the dented surface.
