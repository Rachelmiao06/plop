# Scenery

Flat hand-drawn cut-outs ("standees") planted upright in the 3D snow. Each one turns to face the camera.
The main characters are 3D and are not part of this feature.

- `content.ts`: the manifest (`props`), the first village layout (`layout`), the two character spots and the layout rules.
- `PropSheet.tsx`, `LayoutPreview.tsx`: the `/dev/scenery` check page. Flat HTML only, no 3D.
- Art: `public/assets/scenery/*.webp`, cut from Rachel's sticker sheets in `art-source/scenery/` by `scripts/slice_scenery.py`.

## The art files

Transparent WebP, long side 512 px or less. The **bottom edge of every file is where the prop meets the snow**,
with no empty margin below (8 px of clear margin on the other three sides). Outlines are warm brown and the
edge is soft for a pixel or two, so the props sit on any background without a white rim.

To re-cut after changing the script or a sheet: `python3 scripts/slice_scenery.py --check <some folder>`.
It rewrites the WebPs, prints every pixel size (copy changes into `content.ts`), and with `--check`
writes contact sheets on dark and snow-blue backgrounds for a quick look. See-through gaps that the drawing
fences in completely (under the bench back, between the fence rails, between the sled runners) are listed
by hand in `HOLES` in the script.

## Units and axes

- One scene unit = one main character's height.
- Three.js axes: x to the right, y up, z toward the default camera. Negative z is the back of the village.
- Characters stand at (-3, 0) and (3, 0).

## Part 2: placing the props in the 3D scene

Start from `props` and `layout`; nothing else is needed.

1. For each `layout` entry, look up `props[entry.prop]`.
2. Make a plane `propWidth(id) * scale` wide and `height * scale` tall, textured with `src`
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
