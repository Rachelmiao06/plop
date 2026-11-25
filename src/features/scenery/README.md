# Scenery

Flat hand-drawn cut-outs ("standees") planted upright in the 3D snow. Each one turns to face the camera.
The main characters are 3D and are not part of this feature.

- `content.ts`: the manifest (`props`, by name), the lane (`lane`), the frame layout (`layout`), an example pin
  formation (`examplePins`, preview only), the throwers (`throwers`) and `previewCamera` (the proposed throwing view).
  Each standee has a `role` for paper bowling (docs/GAMEPLAY.md): `frame` (village along the lane, never knocked down),
  `pin` (with `pin.footprint` = card base width and depth, and `pin.weight` light / medium / heavy, for the physics later)
  or `thrower` (`thrower-bucket` for player 1, `thrower-redhat` for player 2, cut from the turnaround front views).
  Per prop: `set` (`doodle` = Rachel's current stickers, `crayon` = the first set, all spare),
  `kind` (`standee` by default; `character` = model for a 3D main character, never placed;
  `decal` = flat flourish such as the wind swirl), `spare`, and `motion: "loop"` for the skier and the
  sliding penguin, which are village decoration at the lane's edges (not pins) with a small loop on the real snow
  (`village.movers`: the penguin glides a little toward the lane and back, the skier sways).
- `sizes.json`, `effect-sizes.json`: pixel size of every file. Written by the slicing script, never by hand.
- `effects` in `content.ts`: effect marks (surprise lines, star, snow puff, music notes, ring of dots, wind curl)
  in `public/assets/effects/`, sources in `art-source/effects/`. Not standees, never in the layout; each has a
  suggested size and a note on where it fits (the music notes float above the radio on `log-music`).
- `CameraPreview.tsx`, `LayoutPreview.tsx`, `PropSheet.tsx`, `view.ts`: the `/dev/scenery` check page.
  `CameraPreview` paints the lane back to front as the throwing view sees it (and pulled back);
  `view.ts` is the small pinhole-camera maths behind it. Flat HTML only, no Three.js.
- Art: `public/assets/scenery/*.webp`, cut from Rachel's sticker sheets in `art-source/scenery/` by `scripts/slice_scenery.py`.

## The art files

The current set is Rachel's doodle stickers (`art-source/scenery/doodle-*.png`, four per sheet, 2 by 2),
including the quiet fillers (`pine-snow-tall`, `pine-snow-short`, `mound-snow`, `bush-snow`) that frame the village.
The first crayon sheets (`sheet-*.png`, six per sheet) stay in the pipeline as spares.
Props are referred to only by name (`<name>.webp`), so new files with the same names drop in with no code change.
Detached bits that belong to a drawing (snow dots, music notes, speed lines) are kept: every piece in a
grid cell goes with that cell's prop (`min_piece` sets the smallest speck kept, 15 px for the doodle sheets).

Transparent WebP, long side 512 px or less. The **bottom edge of every file is where the prop meets the snow**,
with no empty margin below (8 px of clear margin on the other three sides).

### Re-cutting, or adding new sheets (one command)

1. Put the new sheet (white background, objects in a grid) in `art-source/scenery/`.
2. Run, from the repo root:
   `python3 scripts/slice_scenery.py --sheet art-source/scenery/<file>.png --grid 2x2 --names a,b,c,d --check <some folder>`
   (`--grid` is columns x rows; names go left to right, top row first. Add `--target effects` for an
   effects sheet placed in `art-source/effects/`.) The sheet is recorded in
   `art-source/scenery/sheets.json`, so a plain `python3 scripts/slice_scenery.py` later repeats every sheet.
   Remove an old sheet's entry from `sheets.json` when it is replaced; its WebPs are then deleted on the next run.
3. The script writes the WebPs and `src/features/scenery/sizes.json` (pixel sizes; `content.ts` reads it).
4. Look at `check-dark.png` and `check-snow.png` in the check folder, and at `/dev/scenery`.
   A new name shows up there under "New files with no settings yet": add it to `props` in `content.ts`.

How the background is removed: only paper connected to the sheet edge goes. Thin or unclosed outlines
are handled by thickening the ink by `close_gap` px (default 3) before the flood fill and growing back
afterwards, so a gap up to about 6 px in a line does not let the fill leak into a white inside.
Small cut-off pockets of paper touching the outside (between scarf tassels) are still removed
(`pocket_max`). Fully fenced-in see-through gaps (between fence rails) need a point under `holes`
in `sheets.json`. If a white inside still disappears, raise `close_gap` for that sheet; if a narrow
see-through gap stays white, lower it or add a hole point.

## Units and axes

- One scene unit = one thrower's height.
- Three.js axes: x to the right, y up, z toward the camera. The thrower stands at the line (z = 0) and rolls toward
  negative z; the pins stand around z = -6.5; the far end of the frame is around z = -10.
- The throwing view (`previewCamera`): 20° up, the snow scene's 22° lens, 14 units from a point part way down the lane.
  The snow scene does not have this view yet; it is the proposal the previews use. The free camera on the 3D page
  keeps the snow scene's limits: at most 60° left or right and 76° up, so the cut-outs never show their backs.
- `layoutProblems()` checks that no frame prop reaches into the clear lane (`lane.clear`), nothing stands in the calm
  open snow behind the pins (`lane.calm`, about 3 units deep on the game's lane, so the pins read against white
  snow), and nothing tall stands between the camera and the thrower. The big tree frames the pins from back right.

## Part 2: placing the props in the 3D scene

Start from `props`, `lane` and `layout`; nothing else is needed. Use `propSrc(id)`, `propPx(id)` and `propWidth(id)`.
`layout` holds only the frame. Pins go in formations (the pins work), the throwers at `lane.throwLine`;
`spare` ones and `decal`s are not standees.

1. For each `layout` entry, look up `props[entry.prop]`.
2. Make a plane `propWidth(id) * scale` wide and `height * scale` tall, textured with `propSrc(id)`
   (`transparent`, `alphaTest` around 0.5 or `depthWrite: false` to avoid sorting fringes; `colorSpace = SRGBColorSpace`).
3. Move the plane's origin to its **bottom centre** (translate the geometry up by half its height),
   then place it at `(x, -sink, z)` so the base sinks a little into the snow.
4. Make it face the camera around the vertical axis only (cylindrical billboard: copy the camera's
   y-rotation each frame, or drei's `<Billboard lockX lockZ>`), so it never tips over when the camera looks down.
5. `flip: true` means mirror it left to right (`scale.x = -1`).
6. Props do not block snowballs in the first version; they are decoration. If collisions come later,
   a short cylinder of radius `propWidth / 3` at the base is enough.
7. `layoutProblems()` returns plain-language problems (prop in the lane, something tall in front of the
   thrower, outside the map, not a frame prop). Run it in a dev check after editing the layout.

Done on the real snow (see the village section below): real shadows, sway on the pines, snow heaped at the base.

## Thick standees in 3D (`/dev/scenery-3d`)

A test of the look Rachel approved, on plain flat snow, before the real snow scene merges.
Switches on the page turn each part on and off; `?view=default|side|high` and `?look=full|flat|billboard|fixed`
pick the starting camera and look (handy for sharing a link).

**Acceptance bar (Rachel): hand-drawn, cute, design tokens.** Nothing on this page is lit physically and nothing is glossy.
Every surface is a flat token colour; the shade side is a mix toward `--snow-shadow`, from a fixed "drawing light" at the
upper left (`standee3d.shading`), the way a crayon artist shades the far side. The real sun only decides where shadows fall.
The art card shows the drawn colours exactly as drawn (no tone mapping). `review/` holds side-by-side screenshots against
the source sheets; refresh them when the look changes.

- **Thickness:** `scripts/trace_standees.py` traces each standee's alpha silhouette with OpenCV, simplifies it
  and writes `outlines.json` (about 2,000 points for all 19, cached; nothing is traced at load). The page extrudes it
  `thicknessShare` of the prop's height (3.5%). Front: the art card. Sides and back: `--paper`, shaded toward
  `--snow-shadow` on the far side, with a faint `--ink` line along both edges.
- **Shadow:** the thick body casts the true silhouette (with thickness off, the flat card casts it through an
  alpha-tested depth material). The snow is plain `--paper`; shadows are painted on it in exactly `--snow-shadow`
  (a shadow-only layer), as `docs/DECISIONS.md` asks.
- **Haze:** far things fade into `--paper` (`hazeDensity`).
- **Sunk into the snow:** the base sits `sink` below the surface with a small paper-white mound shaded like the sides.
  **On the real snow, use the snow scene's API instead** (raise the snow around each base with its mound/press
  tools in `src/features/snow-scene/`) so the heap is part of the snow and takes footprints and craters.
- **Pillow shading:** `public/assets/scenery/normals/<name>.webp`, baked by the same script from a distance field
  (thicker in the middle, curving down at the silhouette). **Off by default**: next to the source sheets even a faint
  edge tint read as a computer vignette. On the switch it only tints the far edges toward `--snow-shadow`.
- **Card feel:** the side wall and back have a faint fibre speckle and slightly uneven shading (`card.grain`,
  `card.uneven`), and the `--ink` edge line wavers in width and fades in places like a hand line. All of it mixes
  only between the tokens.
- **Half-turn:** each prop turns `turn.fraction` of the camera's swing around the village, capped at `turn.cap`
  degrees, on a spring (`turn.stiffness`, `turn.damping`). Swing the view to the side and the edges show; the art
  never collapses to a line. "Billboard" is the old always-face-the-camera behaviour, "Fixed" never turns.
- **Small life:** `sway.props` sway gently; clicking a prop (stand-in for a snowball hit) wobbles it and shakes
  `wobble.flecks` snow flecks loose (`three/Flecks.tsx`).

Files: `three/materials.ts` (the drawn-style shaders), `three/standeeGeometry.ts` (outline to extruded body), `three/ThickStandee.tsx` (one prop),
`three/VillageCanvas.tsx` (scene, lights, camera), `three/Village3D.tsx` (page UI), `three/treatment.ts` (switches).
The sun direction copies the snow scene in PR #17; keep it in step until part 2 moves this into it.
Re-run `python3 scripts/trace_standees.py` whenever the slicer re-cuts the art.

## The village on the real snow (`<Village />`, `/dev/village`)

`import { Village, throwingView, villageBlockers } from "@/features/scenery"` (the folder's `index.ts`).

```tsx
<SnowScene>
  <SnowCameraView {...throwingView(FEEL.lane)} />   {/* the throwing view, from the snow scene */}
  <Village lane={FEEL.lane} />                       {/* the bowling feature's lane fits as is */}
  <BowlingStage />
</SnowScene>
```

- **Fitted to the game's lane:** `villageLayout(lane)` fits the drawn layout's depth with `fitZ`: between the line
  (z = 0) and the pin zone (z = -6.5) it stretches so they land on the lane's line and pin spot; behind the pins it keeps
  `village.backDepthScale` (0.862, the scale it had on the first 5.6-unit lane), so on the long 8.6-unit lane the far
  cluster, the calm snow and the paper sky stay as close behind the pins as before and only the sides of the lane grow.
  It also moves the left and right props out by the thrower's extra slide room. The layout itself is not changed. Only `frame` props are placed; the friend cut-outs stay for the pins feature
  (so the blue flag, a pin, is not in the village and has no sway here).
- **Standing in the snow:** each base sits on the lowest snow along its bottom edge (`heightAt`), sunk by its manifest
  `sink`, in a soft heap of **real snow** made with the snow scene's `heapSnow` (`village.mound`). The heap is part of
  the snow: same shading, sparkles and shadows, it takes grooves and craters, and fresh snowfall settles back to it.
  The stand-in paper mound of the test page is off here (`ThickStandee mound={false}`).
- **Look:** the thick standee renderer from `three/` unchanged: art exactly as drawn, paper edge with an uneven ink
  line, the half-turn toward the camera around the throwing view's look-at point, gentle sway on the trees.
  Shadows are the snow scene's real sun shadows on its lit snow (strength set once in the snow scene's
  `content.shade`, exported as `snowShadow`); the village never changes them.
- **Clear lane and sight line:** `villageProblems(lane, cameraPosition?)` lists any prop in the roll lane (the slide
  width plus the drawn margin, from in front of the line to past the pins) or standing taller than the line of sight
  from the camera to the pins. In development the page logs the result once the camera has settled.
- **Blockers:** `villageBlockers(lane)` gives `{ name, x, z, radius }` for the buildings, the big tree and the pines
  (`village.blockers`: radius = a third of the drawn width), so a ball can burst on them later. Nothing uses them yet.
- **Throwing view:** `throwingView(lane)` (numbers in `village.view`).

Files: `village.ts` (fitting, blockers, checks, throwing view; no drawing), `three/Village.tsx` (the component),
`index.ts` (what other features import). Screenshots: `review/village-*.webp`.

## A complete picture from the throwing view (#38)

The throwing view looks about 13° below the horizon at the top of the screen, so the real horizon never shows and
the snow used to run on, empty, behind the village. Now the scene is built in layers like a paper theatre:

- **The street lamp** stands part way down the left of the lane, with a warm `--butter` light: a halo just behind its glass and a warm patch on the snow, laid in crayon-like bands with paper grain, breathing gently (`LampGlow` in `three/Life.tsx`, `village.lampGlow`). The crayon fence is no longer placed (it clashed with the doodle set); pines and bushes frame the near corners.
- **Sky and far hills (`three/Backdrop.tsx`, `backdrop` in `content.ts`):** a curved paper wall stands just behind the
  village (radius 9.6 round the throwing view's look-at point on a 5.6-unit lane, `backdrop.laneLength`; on a longer
  lane `Village` passes a `reach` so the wall moves back with the pins; 220° of arc), `--paper` blending toward `--snow-shadow`
  higher up. Rachel's far panorama (`far-hills`, cut along the hill line) is repeated along its foot, a little hazed
  toward `--snow-shadow`. The sun, three clouds and a flying bird (`sky-*`) are flat doodles on the wall; the clouds drift a
  few degrees, the bird crosses every minute. The wall is opaque (drawn before the snow, so the snow behind it costs
  nothing) and thins out in a fine paper-grain pattern between 38° and 50° of how steeply the camera looks down, so the
  high view is all snow as before (measured from the view direction, not the camera's height over the look-at point,
  so the game's camera riding low behind the ball keeps the sky). On a phone held upright it comes a little closer and the hills grow (`backdrop.portrait`) so they
  show under the score panel. No change to the snow scene was needed.
- **Village:** the red cottage, cocoa stall and fairy lights join the home cluster and the far end; the snowman family
  watches from the lane's edge by the igloo; chimney smoke (Rachel's puff doodle) rises from both cottages
  (`ChimneySmoke` in `three/Life.tsx`, chimney spots in `village.chimneys`).
- **Middle:** frozen pond by the sliding penguin, a snowy stump with the red bird on it (`lift`), the rabbit by the
  bush, a snowball pile near the line. The calm snow behind the pins is unchanged.
- **Near corners:** short pines and bushes low and wide of the thrower (desktop only; a phone held upright is too
  narrow to see them). The street lamp is now Rachel's doodle lamp (see the village street below).
- **Life:** penguin slide, skier sway, rabbit and bird hops, smoke, drifting clouds and bird. All hold still when the
  device asks for reduced motion (`three/motion.ts`).
- **Tracks:** a few faint boot prints, rabbit hops and a sled track pressed at start with the snow's own `pressGroove`
  (`village.tracks`, `Tracks` in `three/Life.tsx`); a fresh snowfall fills them like any dent.

The panorama is cut by the slicer with two new per-sheet options: `seal` (lines that close the hills' open ends for the
background fill only) and `max_side` (keeps its full 2126 px width). Screenshots: `review/scene-38-*.webp`.

## A village street (doodle-8, -9, -10)

Three new sheets, cut by the slicer like the others: `tree-christmas`, `otter-cocoa`, `mug-cocoa`, `mouse-letter`;
`cafe-stump`, `penguins-postbox`, `cottage-snow`, `mice-lantern`; `street-lamp`, `mailbox-red`, `bench-cat`, `sled-red`
(the steam lines stay with their mug; the sled's see-through gaps are `holes` in `sheets.json`).
Rachel asked for a slightly bigger, richer village, not every drawing, so eight are placed and four are spares
(`mug-cocoa`, `mouse-letter`, `mailbox-red`, `sled-red`). Later the mug joined the street by the blue cottage, the mouse
with the letter heads for the post office, and on a phone held upright the mug, the sled, the otter and the mouse
stand low in the bottom corners (`view: "portrait"` placements; a phone sees only the lane, and the near-height limit
keeps them small, so no pine). The red mailbox stays a spare (the penguins' postbox is the post office).

- **The street:** along the back left a row of the Christmas tree (the landmark, beside the pins, never behind them),
  the tree-stump café and the cocoa stall (the cocoa corner, fairy lights strung in front) and the red cottage; the
  blue cottage and the snow cottage with the cat stand a little forward of it, so their roofs stay below the back row.
  The doodle street lamp lights the pond corner; the bench with the sleeping cat sits at the far left edge. On the
  right the otter watches the lane next to the snowman family, the penguins post a letter near the thrower, and the
  mice with their lantern sit past the igloo. Quiet pines on the outer edge make the side and high views a little wider.
- **Retired crayon props:** the crayon street lamp (its slot is now `street-lamp-crayon`, a spare; the doodle lamp took
  the name `street-lamp`, so the lamp glow needs no change) and the fence (spare). No crayon prop stands in the
  village any more, and `scripts/trace_standees.py` has no `EXTRA` left.
- **Effect tags** (optional fields on a prop in `props`, for the light, smoke and ice effects): `emitsLight` (points of
  lamp glass, lanterns, lit windows, bulbs), `chimneyAt` (top of a chimney) and `icicleEdge` (eave lines
  `[x0, y0, x1, y1]`). Points are shares of the drawing's width from the left and height from the foot, like
  `village.chimneys`, and flip with the drawing. Tagged: the street lamp, the café lantern, the mice's lantern, the red
  and snow cottages' windows and the fairy-light bulbs (`emitsLight`); the blue, red and snow cottages (`chimneyAt`);
  the snow cottage's eave and the igloo's window and door tops (`icicleEdge`). Nothing reads them yet; the lamp glow
  and chimney smoke still use `village.lampGlow` and `village.chimneys` (the snow cottage has its own drawn smoke
  curl, so it is not in `village.chimneys`).

### Tileable far hills

`far-hills.webp` is cut from Rachel's panorama drawn to tile (`far-2-panorama-tileable-original.png`, unchanged).
Its ends met within 7 px (hill line) and 1 px (ground line); `scripts/prep_far_hills.py` eases the last 127 px on
the right (open hill only) so both lines meet exactly, writing `far-2-panorama-tileable.png`, which the slicer cuts
(seal lines at both edges keep the white inside the hills). The band lays whole copies side by side (no mirroring),
a copy's middle straight back; `backdrop.hillsCrop` drops the cut's clear margins, and the shader samples with the
gradient of the unbroken coordinate so the joint draws no line.

## Afternoon to evening (`/dev/sky`)

Over a match the light moves from afternoon (t = 0) through sunset (0.5) to a cosy evening (1). The sky follows one
shared value, `getTimeOfDay()` (`timeOfDay.ts`; `setTimeOfDay(t)`, `subscribeTimeOfDay(fn)`, also exported from
`@/features/scenery`). The snow and light side is built by the scene-polish session; until a shared store lands
(proposed in `@/features/snow-scene` with the same names), the sky keeps its own value here, and whichever PR merges
second points this one at the shared store.

- **Sky (`three/Backdrop.tsx`, `backdrop.evening` in `content.ts`):** painted in flat bands of colour with gently
  waving, grainy edges (crayon on paper), never a smooth gradient. Each key (t = 0, 0.5, 1) gives three colours (just
  above the hills, halfway, top) as a mix of two design tokens: paper and snow shadow in the afternoon, butter and
  blush at sunset, sky blue with a little slate and deep ink at evening over a pale blush horizon.
- **Sun, moon, stars:** Rachel's sun sinks toward the open middle of the hills and slips behind them (it is drawn
  before the hills); her crescent moon (`sky-moon`) rises on the right from t = 0.5; seven tiny stars (the `star`
  effect doodle) appear one by one after t = 0.66 and twinkle a little (still for reduced motion). The clouds take on
  the sky's colour and the bird flies home.
- **Far hills:** take on the light like the fog on the far snow in front of them (the same hues as the snow scene's
  `content.timeOfDay` fog: a blush wash at sunset, a dusk blue at evening), while the yellow windows of their little houses stay lit (a colour
  mask on the drawn panes; doors and chimneys are more orange and are left alone).
- **`/dev/sky`:** the real game with a time-of-day slider, jumps to afternoon / sunset / evening, and the frame rate;
  `?t=0.5` starts at sunset. Screenshots: `review/sky-time-of-day.webp`.
