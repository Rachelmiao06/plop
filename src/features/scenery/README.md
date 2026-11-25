# Scenery

Flat hand-drawn cut-outs ("standees") planted upright in the 3D snow. Each one turns to face the camera.
The main characters are 3D and are not part of this feature.

- `content.ts`: the manifest (`props`, by name), the first village layout (`layout`), the two character spots,
  the layout rules and `previewCamera` (a copy of the snow scene's default camera, for the previews).
  Per prop: `set` (`doodle` = Rachel's current stickers, `crayon` = the first set, all spare),
  `kind` (`standee` by default; `character` = model for a 3D main character, never placed;
  `decal` = flat flourish such as the wind swirl), `spare`, and `motion: "loop"` for the skier and the
  sliding penguin (candidates for a small looping motion later).
- `sizes.json`, `effect-sizes.json`: pixel size of every file. Written by the slicing script, never by hand.
- `effects` in `content.ts`: effect marks (surprise lines, star, snow puff, music notes, ring of dots, wind curl)
  in `public/assets/effects/`, sources in `art-source/effects/`. Not standees, never in the layout; each has a
  suggested size and a note on where it fits (the music notes float above the radio on `log-music`).
- `CameraPreview.tsx`, `LayoutPreview.tsx`, `PropSheet.tsx`, `view.ts`: the `/dev/scenery` check page.
  `CameraPreview` paints the layout back to front as the default camera sees it (and pulled back 1.6×);
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

- One scene unit = one main character's height.
- Three.js axes: x to the right, y up, z toward the default camera. Negative z is the back of the village.
- Characters stand at (-2.2, 0) and (2.2, 0): 4.4 apart, as the snow scene in PR #17 places them on a landscape screen.
- The default camera (35° up, 22° field of view, a character fills a fifth of the screen height) is a close
  diorama view: anything more than about 3 units behind the characters gets cut at the top if it is tall.
  That is why the village sits close and the buildings are small (cottage 1.5, tree 1.65).

## Part 2: placing the props in the 3D scene

Start from `props` and `layout`; nothing else is needed. Use `propSrc(id)`, `propPx(id)` and `propWidth(id)`.
Only props in `layout` are placed; `spare` ones, the `character` model and `decal`s are not standees.

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
   characters, outside the area). Run it in a dev check after editing the layout.

Ideas for later, not done: a pale blue blob shadow (`--snow-shadow`) under each prop; a small sway on the flag
and pines; snow piling up at the base where the prop meets the ground.

## Thick standees in 3D (`/dev/scenery-3d`)

A test of the look Rachel approved, on plain flat snow, before the real snow scene merges.
Switches on the page turn each part on and off; `?view=default|side|high` and `?look=full|flat|billboard|fixed`
pick the starting camera and look (handy for sharing a link).

- **Thickness:** `scripts/trace_standees.py` traces each standee's alpha silhouette with OpenCV, simplifies it
  and writes `outlines.json` (about 2,000 points for all 19, cached; nothing is traced at load). The page extrudes it
  `thicknessShare` of the prop's height (3.5%). Front: the art card. Sides and back: cream paper (`--paper` token)
  with a faint brown line (`--ink`) along both edges, drawn in the side material's shader.
- **Shadow:** the thick body casts the true silhouette; with thickness off, the flat card casts it through an
  alpha-tested depth material. Shadows are pale (`light.shadowIntensity`) and blue because only the cool sky lights them.
- **Sunk into the snow:** the base sits `sink` below the surface with a small white mound (a flattened half sphere).
  **On the real snow, use the snow scene's API instead** (raise the snow around each base with its mound/press
  tools in `src/features/snow-scene/`) so the heap is part of the snow and takes footprints and craters.
- **Pillow shading:** `public/assets/scenery/normals/<name>.webp`, baked by the same script from a distance field
  (thicker in the middle, curving down at the silhouette). The art material keeps the drawn colours mostly as they are
  (`pillow.artGlow`, no tone mapping) and lets the low sun add only a faint light and shade side (`pillow.litShare`).
- **Half-turn:** each prop turns `turn.fraction` of the camera's swing around the village, capped at `turn.cap`
  degrees, on a spring (`turn.stiffness`, `turn.damping`). Swing the view to the side and the edges show; the art
  never collapses to a line. "Billboard" is the old always-face-the-camera behaviour, "Fixed" never turns.
- **Small life:** `sway.props` sway gently; clicking a prop (stand-in for a snowball hit) wobbles it and shakes
  `wobble.flecks` snow flecks loose (`three/Flecks.tsx`).

Files: `three/standeeGeometry.ts` (outline to extruded body), `three/ThickStandee.tsx` (one prop),
`three/VillageCanvas.tsx` (scene, lights, camera), `three/Village3D.tsx` (page UI), `three/treatment.ts` (switches).
Light and snow colours copy the snow scene's settings in PR #17; keep them in step until part 2 moves this into it.
Re-run `python3 scripts/trace_standees.py` whenever the slicer re-cuts the art.
