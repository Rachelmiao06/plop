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
- 2026-11-24 · The look is "crayon sticker snow village": hand-drawn stickers with warm brown pencil outlines, coloured-pencil fills, round shapes and handwritten lettering. Picked by Rachel from a reference illustration.
- 2026-11-24 · Outlines and text are warm brown (`--ink`), never black. Black looks harsh next to crayon colours.
- 2026-11-24 · Shadows are pale blue (`--snow-shadow`), never grey. The 3D snow's shadow tint should match `--snow-shadow` so the drawn stickers and the real snow belong together.
- 2026-11-24 · Colours, fonts and radius live as tokens in `src/app/globals.css`; `/dev/tokens` shows them all. The palette values are fixed; when text on a colour was too faint, the text colour changed, not the palette. Two helper colours were added for that: `--ink-deep` (text on sky-blue and mint) and `--berry-deep` (warning text; plain berry is too faint as text on paper).
- 2026-11-24 · Headings use Gaegu (handwritten), small text uses Nunito (round, easy to read). Corners are generous and round (`--radius` 1.25rem).
- 2026-11-24 · Light theme only. The dark variant resolves to the same colours so the page never turns black.
- 2026-11-24 · Style notes for future art: outline about 1.5% of the character's height, with a slight hand wobble and round caps; coloured-pencil hatch fills, no gradients; characters about two heads tall, dot eyes, a short arc mouth, pink blush.
