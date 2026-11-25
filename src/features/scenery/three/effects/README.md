# Village effects: real light, smoke and ice

Rachel (2026-11-25): the snow is real, the characters and props are her paper drawings, and a little real-world
effect on top is welcome. All of it is made in code; no drawing is changed and the cut-outs stay unlit.

- `effects.ts`: every number, and `effectTags(id)` (below). `EffectsLayer.tsx`: the components.
- Mounted from `../Village.tsx` with these lines only: the import of `ChimneySmoke, FootBank, IceBeds, IceChunks,
  Icicles, WarmLights`; `<FootBank lane>` and `<IceBeds lane>` at the top of `<Flecks>` (outside Suspense);
  `<WarmLights>` and `<Icicles>` as children of each `<ThickStandee>`; `<ChimneySmoke placed>` and `<IceChunks lane>`
  after the standees. They replace `ChimneySmoke` (the drawn smoke doodle) and `LampGlow` (the painted lamp glow) in
  `../Life.tsx`, which are no longer mounted and can be deleted.
- `ThickStandee` takes `children`: anything fixed to the drawing (art space, origin bottom centre, mirrored with
  `flip`), turning and swaying with it.

## Effect tags (set per prop in scenery `content.ts` `props`)

Positions are shares of the drawing: x from the left, y from the foot. Effects follow the layout and the art: change
a tag or move a prop and the effect moves with it.

| Tag | Meaning | Effect |
|---|---|---|
| `emitsLight: [x, y][]` | a lamp's glass, a lit window, bulbs | a crayon-band halo at each point; `effects.lights.lamps` props also get a larger glow behind the cut-out; props in `effects.lights.pointLights` also light the real snow |
| `chimneyAt: [x, y]` | the top of a chimney | real smoke puffs rise from it |
| `icicleEdge: [x0, y0, x1, y1][]` | eaves, arches, a lamp cap | icicles along each edge, one per `ice.icicleSpacing` units, longest in the middle |

A prop with no tags in the manifest uses `fallbackTags` in `effects.ts` (the art in use before the tags existed).
Ice chunks are placed beside props by name (`effects.ice.chunks`, `near`), every placed copy.

## What each effect does

- **Warm light:** halos are camera-facing sprites drawn like a crayon glow: a few soft bands, paper grain and a
  slightly wobbly edge (the look of the first painted lamp glow), `--butter` softened toward `--paper`, breathing a tiny
  bit. `front` halos sit on the drawing and add light; the lamp's `behind` halo stands behind the cut-out so the drawing
  stays crisp. Point lights are real lights on the lit snow, so the lamp lays a warm pool round its foot. Each point
  light costs a little on every snow pixel; keep `pointLights` short (three today).
- **Smoke:** six soft puffs per chimney rise, drift sideways in a gentle wind, grow and fade. Each puff is a few
  overlapping soft blobs: `--paper` tinted toward `--snow-shadow` (pure paper white vanished against the paper sky),
  shaded underneath. An `--ink` rim exists (`smoke.outline`) but is off: it looked like a sticker.
- **Ice:** instanced, faceted, slightly uneven icicles, and lumps of clear ice sunk in small heaps of real snow with a
  dab of snow on top. One cheap shader fakes the transmission: nearly clear in the middle, deeper `--sky-blue` at the
  edges, a sky reflection and bright rim at grazing angles, one sharp sun glint, tiny facets that flash as the view
  moves. No screen-space transmission (it would draw the scene twice).
- **Snow bank at the backdrop's foot (#51):** soft, uneven heaps of real snow in front of the paper hills along the
  middle 30% of the arc (about what the low view's lens takes in), so the low view has no hard line. A bank
  round the whole arc cost about 15 fps in the high view (each heap makes fine snow tiles).
- **Time of day** (the snow scene's `getTimeOfDay()`, 0 = afternoon, 1 = evening): toward evening the halos grow
  stronger and the point lights brighter (`lights.evening`), so the lamp, windows, fairy lights and lanterns really
  shine by the last round. Smoke catches the warm low sun at sunset and the moonlight in the evening
  (`smoke.sunsetWarm`, `eveningCool`). The ice glint follows the sun as it moves (and becomes the moon).
- **Reduced motion:** no flicker; smoke rises three times slower.
- Heaps that the pins' physics ground samples (`FootBank`, `IceBeds`) are made outside Suspense. Keep heaps broad:
  narrow ones trip the pins' "physics ground is off" check (its grid is 0.25 units).

Cost (headless Chrome with the GPU, 1200×750 at 2× and 390×844 at 3×): 60 fps in the throwing, high, low and side
views and during a throw. Not measured on a real phone. Screenshots: `../../review/atmosphere-vs-rachel.webp`,
`review-45-51-before-after.webp`, `review-49-buttons.webp`.
