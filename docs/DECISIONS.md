# Decisions

One line per decision: date, what, why.

- 2026-11-24 · Name is Plop. Short, cute, sounds like a snowball landing.
- 2026-11-24 · Slingshot aiming: pull back, shoot forward. Easy to read, allows a preview arc.
- 2026-11-24 · Ball size = the farthest pull reached; easing back does not shrink it. Lets you adjust aim without losing the charge.
- 2026-11-24 · Only the snowball flies; the character returns to a fixed spot. Simpler, keeps the two characters the same distance apart.
- 2026-11-24 · Camera above and to the side, characters large. A straight top-down view made them too small.
- 2026-11-24 · No scores, no online play in the first version. It is a toy; two people share one device.
- 2026-11-24 · Realistic snow ground, AI-drawn half-3D layered characters. Art that an image model can make.
- 2026-11-24 · Feel prototype with plain shapes comes before any art. The project succeeds or fails on feel.
- 2026-11-24 · Scene units: one unit is one character height. The camera keeps a character at a fifth of the screen height on every screen, so narrow screens show less width instead of smaller characters.
- 2026-11-24 · On screens too narrow for two characters side by side (phone portrait), the two spots are staggered front-to-back, left one further away, and stay the same distance apart. Keeps the throw distance equal on every device. Other features read the spots from `useSnowLayout()`.
- 2026-11-24 · The snow fades into a fog colour in its own shader (not Three.js scene fog), and the backdrop is that same colour. Scene fog is applied before tone mapping and left a visible seam at the mesh edge.
- 2026-11-24 · The camera sways very slightly all the time. Sparkles only glint when the view shifts, and the view is otherwise fixed.
- 2026-11-24 · Other features use the snow only through `useSnow()` and `useSnowLayout()` from `@/features/snow-scene`, as children of `<SnowScene>`. Pointer rays skip the snow mesh (too many triangles); aim at a flat plane and correct with `heightAt`.
- 2026-11-24 · Pressing adds up: one touch is shallow, holding digs down to hard ground, and the snow layer is 0.9 units thick (was 0.5) so shallow and deep read differently from the camera. Rachel: the first version lacked depth.
- 2026-11-24 · Digging depth and friction are decided by the caller, not the snow: `pressGroove` takes `dig` and a velocity, and `packedAt` reports resistance. The snowball feature can then make a big ball feel heavier with its own numbers.
- 2026-11-24 · Dust and clumps are thrown by the snow itself whenever it is pressed or hit, so every feature gets them without extra code.
- 2026-11-24 · Zoom is written by hand, not drei CameraControls: the camera only moves along its fixed viewing line, and the view is clamped back to the centre at full size. Two unclaimed fingers are a pinch; a feature calls `claimSnowPointer` to keep a finger for its own drag.
- 2026-11-24 · The snow stays a CPU height grid (not a GPU displacement map), because later features need `heightAt`. Measured cost is small.
- 2026-11-24 · Snow rolling and landing sounds are real CC0 recordings from Freesound (`public/assets/audio/`, credits there), sliced and re-pitched by the engine; only the whoosh is synthesized. Pure synthesis sounded like scratching paper, not fluffy snow. This replaces issue #9's "no sound files".
- 2026-11-24 · The snow is a rounded slab with a visible cut side (snow thickness, thin darker base, soft shadow underneath) instead of ground fading into fog. Rachel approved from a concept image; it shows that the snow is thick. This replaces the earlier fog-fade decision.
- 2026-11-24 · Snow cannot be pressed right at the slab's edge (it eases in over 0.4 units), so dents never break the side wall.
- 2026-11-24 · Camera rules: starts above and to the side (35 degrees). One finger or mouse drag on empty snow turns it, 25 degrees up to 82 (nearly top-down) and 60 degrees left and right, never behind or below, with a little glide after a flick. It does not spring back; a "Reset view" button does that. Two fingers / wheel zoom. The view pulls back by itself when turned so both characters stay in frame.
- 2026-11-24 · A feature keeps a finger for its own drag with `claimSnowPointer`; claimed fingers never turn or zoom the view. This is how the slingshot drag will coexist with look-around.
- 2026-11-24 · Because the view turns, the two characters will be small 3D snowmen, not flat stickers.
- 2026-11-24 · The camera looks slightly in front of the slab's middle so the cut side is in frame; the characters therefore sit a little above screen centre.
