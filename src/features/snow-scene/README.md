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
- `freshSnowfall(options?)` (works from anywhere, inside or outside `<SnowScene>`): the falling snow gets heavier, then every groove and crater settles back to smooth, untouched snow over about 3 seconds (`freshSnow.duration`; pass `{ duration }` to change it), and the pressed tiles are freed so memory is back where it started. Pits fill from the bottom up (a flat floor of new snow rises), shallow dents and rims fade evenly, sharp walls round off, and the pressed tint fades with the depth that is left. Afterwards `packedAt` is 0 and `heightAt` is the untouched snow everywhere. Calling it again while one is running is safe: tiles already refilling keep their schedule, anything pressed since joins in. Snow pressed *during* a refill is refilled too.
- `freshSnowfallAt(x, z, radius, options?)`: the same on one round patch, fading out over the outer part of the circle (`freshSnow.localEdge`). Tiles left completely smooth are freed. A second local call on a tile still refilling replaces the first one's circle there.
- `snowTileCount()`: how many pressed tiles exist (0 = all untouched). For test pages.
- `heapSnow(x, z, radiusX, radiusZ, height)` heaps a soft, slightly lumpy mound of snow (`radiusX` either side, `radiusZ` front to back, `height` in the middle). It becomes part of the untouched snow: it can be pressed and cratered, and fresh snowfall settles back to it instead of flattening it. Overlapping heaps take the taller, never stack. Tiles holding a heap are kept (never freed), so `snowTileCount()` stays above 0 after a fresh snowfall while scenery is shown. Made for scenery bases (`<Village />`).
- `useSnowCameraView({ lookAt, pathAt, turn?, distance? })`, or the same as a component `<SnowCameraView … />`, sets the camera's **default view** from inside `<SnowScene>`: the point it looks at (`lookAt`, scene units), where on the camera path it starts (`pathAt`, 0 = low end, 1 = high end; the play view is `cameraPath.playAt` = 0.42), an optional starting turn in degrees (`turn`, clamped to the turn limit) and an optional `distance` (times what the path gives, 0.5 to 2; in full up to the play view, blending back to 1 at the high end so the highest view and the far plane are unchanged). The camera jumps there at once, "Reset view" glides back to it, and turning, the path and every limit work around it as before. When the component goes away the scene's own play view comes back. Without it nothing changes. Example, the paper-bowling throwing view: `<SnowCameraView {...throwingView(FEEL.lane)} />` (from `@/features/scenery`), which looks at a point 45% of the way from the line to the pin spot from about 24 degrees up, 1.6 times further back than the path gives there.
- **Camera shots** (plain functions, work from anywhere): `setSnowCameraShot(shot)` asks the camera to move somewhere for a moment, `setSnowCameraShot(null, rate?)` lets it glide back to the player's own view. A shot gives an absolute `position`, `lookAt` and `fov`, or changes on top of the player's own view (`closer`, `lower`, `lookShift`, so turning and zooming still work underneath), and a spring `rate` (about 2 = a calm glide, 6 = a little physical lag, 12 = tight; `lookRate` for the look-at point). Call it every frame with a moving target (a ball); the spring smooths it. The rig adds the shot as an offset on top of the player's view, each number pulled by a critically damped spring, so it never jumps and never overshoots; with no shot the offset is zero, so the player's own turning never lags. `interruptible: true` shots are dropped the moment the player drags, scrolls, pinches, presses a key or "Reset view" (glide back at `shots.takeoverRate`); `snowCameraTaken()` says so, and they are ignored until `resumeSnowCamera()`. `kickSnowCamera({ forward, fov })` adds a one-off push (units per second toward what it looks at, degrees per second of lens). `snowCameraFov` is the scene's own lens. The game uses these to film a throw (`src/features/game/CameraDirector.tsx`).
- `kickUpSnow(x, z, radius, { amount, velocityX, velocityZ })` (on `useSnow()`): throws up a puff of dust and clumps without denting the snow (a kick-off, a plume, a bow wave). `amount` is on the same scale a press pushes away (0.02 a small puff).
- `claimSnowPointer(pointerId)`: call it in your pointer-down handler when a finger starts dragging one of your things (a character, for the slingshot). A claimed finger never turns or zooms the view. It is released by itself when the finger lifts. Fingers nobody claimed are "on empty snow": one turns the view, two pinch to zoom.

- **Time of day** (plain functions, work from anywhere): `setTimeOfDay(t)` with `t` from 0 = afternoon through 0.5 = sunset to 1 = evening (clamped; call it every frame to animate, it only recomputes when the value changes). `getTimeOfDay()` is cheap for per-frame reads, `useTimeOfDay()` is the React hook, and `subscribeTimeOfDay(fn)` returns its unsubscribe. The snow's light follows it, blended between three keys in `content.timeOfDay`: the sun's height, direction, colour and strength (a low warm sun at sunset, then a cool moon on the other side), the sky fill, shadow strength, exposure, sparkle colour and strength, the fog the far snow melts into, and the snowflake tint. Light colours are mixed from token values. The cut-outs are never lit, so they stay exactly as drawn. The village's lights, smoke and paper sky read the same value. Test page: `/dev/time` (slider; `?t=0.5` starts at sunset, `?play` sweeps the day). Screenshots: `review/time-of-day.webp`.
- `snowShadow` (a plain value, not a hook): `{ color, strength }`: the `--snow-shadow` token and how much of the sun a cast shadow on the snow takes away. A feature that paints its own shadows (a `ShadowMaterial`, say) uses these so they match. Set in `content.shade`, nowhere else.

The snow is lit, real snow: a low warm sun and a pale sky-blue fill shade its slopes, drifts, groove and crater walls; it has fine grain and sparkles that glint as the view moves, and it is tone mapped like any lit thing. (The flat "painted paper" pass of #36 was undone at Rachel's request in #38.) The cut-outs are not affected: they are drawn in their own unlit paper shaders with token colours and no tone mapping. The sun stands 42° up (#45: shadows about half as long as at 24°, like the short pale-blue strokes in Rachel's art), at strength 3.1 so flat snow is no brighter than before; cast shadows take `content.shade.strength` of it (0.65), so they read as pale `--snow-shadow` washes while slopes, drifts and grooves still shade. Small drifts hand over from shape to shading between 6 and 15 units from the middle (`surround.driftFadeStart` / `driftFadeEnd`, #51), a band wide enough that no disc shows from the high view. Warm point lights from the village (the lamp) light the snow too; the snow is a standard lit material, so nothing here changes for them.

The deeper the snow is pressed, the darker and bluer it gets and the taller its rim. Dents stay. Dust and small clumps fly by themselves whenever snow is pressed or hit; nothing to call.

The camera is part of the scene. Its whole state is two numbers: a position on one path (low and close looking across the snow, through the play view, up to high, far and steep where everything looks small) and a turn left/right (up to 60 degrees, never behind). Every input moves those two, so they never fight:

- trackpad two-finger swipe up/down, mouse wheel, trackpad pinch, phone pinch: along the path (fingers up / pinch together = rise; `cameraInput.invertScroll` swaps)
- trackpad two-finger swipe sideways, or a drag on empty snow: turn (a drag up/down also moves along the path)
- "Reset view": back to the default view (the play view, or the one a feature set with `useSnowCameraView`)
- "Fresh snow" button, or the N key: `freshSnowfall()`

A swipe picks one axis after a few pixels, so a mostly vertical swipe never turns the view. Mouse notches move a fixed step whatever size the browser reports. All gains and limits are in `content.ts` under `cameraPath`, `cameraInput` and `orbit`. Over the scene, the page never scrolls, bounces or zooms.

The play-view distance pulls back by itself when needed so both character spots stay in frame, so `useSnowLayout()` spots are valid at every angle. Things you place must be real 3D or face the camera (the view turns and rises to 76 degrees, never straight down).

Camera control is never blocked while characters are idle. When a character starts being dragged, call `claimSnowPointer(pointerId)`; that finger then no longer moves the camera. (Wheel and keys are not claimable yet; the only key is N for fresh snow.)

Snow is everywhere, and it can be pressed anywhere (up to `ground.pressReach` from the middle). Untouched snow is one big cheap surface out to the haze, shaped by `baseHeightAt`. The first time something presses a spot, a 4 by 4 unit tile of fine grid is made there and remembers the dents; the plain snow hides itself under every tile. All tiles use 0.05-unit squares (`ground.farCell` can make far tiles coarser if speed ever needs it), and every tile has a short hidden lip so no gap shows between tiles. Tiles and plain snow share the same height formula, look and edge slopes, so no seam shows. `heightAt` and `packedAt` work everywhere.

## Files

- `content.ts` every colour and tunable number (grid, snow depth, sun, fog, sparkles, camera, snowfall). Tune here.
- `snowField.ts` the untouched-snow formula, the pressed tiles, and the press / crater maths. No drawing.
- `SnowGround.tsx` draws the plain snow and the pressed tiles (re-sends only the changed rows each frame). Grain, ripples, sparkles, far drift shading and the haze are in its shader.
- `ViewControls.tsx` the buttons on top of the scene (fresh snow and its N key, reset view; temporary look / press switch). `DoodleButton.tsx`: the two round hand-drawn buttons in the score display's style (#49; a small local copy of the HUD's pencil circle, numbers in `content.doodleButtons`). They sit side by side in the top-right corner, the band the score panel leaves free on a phone. The temporary switch stays the first child of that corner so the game can still hide it.
- `freshSnow.ts` lets anything ask the snow on screen for a fresh snowfall. The refill itself is in `snowField.ts` (`stepFresh`, advanced by `SnowGround` every frame with at most `freshSnow.pointsPerFrame` grid points per frame); the heavier flakes are in `SceneLook.tsx`. Test page: `/dev/snowfall`.
- `SnowSpray.tsx` dust puffs and clumps thrown up when snow is pressed or hit.
- `CameraRig.tsx` the camera: turning, zooming, limits, reset, and the shot springs on top. `cameraView.ts` lets a feature set the default view; `cameraShot.ts` the shots and kicks (`content.shots`). `pointers.ts` which finger belongs to whom, and screen-to-snow aiming.
- `SceneLook.tsx` sun and sky light, soft sky, snowfall. How shade is painted on the snow (`content.shade`) is in `SnowGround.tsx`.
- `layout.ts` camera position and character spots from the screen shape.
- `SnowCanvas.tsx` the 3D canvas. `SnowScene.tsx` loads it in the browser only.
- `TempDragPress.tsx` **temporary** test hook, see below.

## Temporary test hook (remove in a later issue)

Everything temporary is in `TempDragPress.tsx` and is marked `TEMPORARY` where it is used. Dragging now turns the view, so pressing has its own mode: the "Look / Press" switch at the top right. In "Press" mode:

- press and hold on the snow: digs deeper the longer it is held
- drag: a groove that follows the finger with a little lag, heavier in fresh snow
- double click / double tap: punches a crater

Always:

Press size: the test press keeps its real size on the snow at any camera distance, so close up a drag leaves a wide groove and from far a thin one (`tempDrag.maxScale` = 1; above 1 it would grow when seen from far). Stamps stay at most `tempDrag.maxStepCells` grid squares apart so grooves stay smooth. Snow dust and clumps grow with the size of the dent that threw them (`spray.baseRadius`, `spray.maxSizeScale`).

- `?guides` in the address: two stand-in blocks at the character spots
- `?fps` in the address: frame rate replaces the hint text

The header of that file lists exactly what to delete.

## Feel notes for whoever builds the snowball drag

Measured on the press test, these made dragging feel smooth instead of stuttery:

- Follow the finger with an eased share of the gap per frame (`1 - exp(-rate * seconds)`), so it feels the same at any frame rate.
- Ease the rate itself when resistance changes (fresh snow to packed track), or the point jerks.
- Cap how far the point may trail (`tempDrag.maxTrail`), so weight never reads as dropped input.
- Aim with `useSnowPoint()` (untouched surface), not at the dented surface.
