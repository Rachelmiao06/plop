# Plop! · designer review (#42)

A pass over the whole game on https://plop-two.vercel.app/ (main at `551bf43`, 2026-11-25), judged against
Rachel's art (`art-source/`, `docs/reference/`) and the "Look comes first" rule in `CLAUDE.md`.
Played in headless Chrome with the GPU on: desktop 1440×900 at 2× and phone 390×844 at 3×, throwing view,
a side view (drag across the snow), a high view and a low view, three full turns per size.
Screenshots are in `docs/review/`.

**What already works and must not be lost:** the cut-outs are genuinely Rachel's drawings (crayon fill, warm
brown wobbly line, dot eyes), the paper-theatre backdrop is lovely, the token colours hold everywhere in the UI,
the hint and turn note are handwritten on a soft paper wash, and the throw feels snappy. Nothing looks like
plastic or "default 3D" except the places listed below.

## Part 1 · Ranked review (biggest impact first)

| # | Where | What is wrong (one sentence) | Proposed fix | Follow-up |
|---|---|---|---|---|
| 1 | Snow, every view | Long, saturated blue-grey sun shadows are the darkest and largest shapes on screen, while Rachel's art has only short pale-blue strokes under things. | Raise the sun so shadows are about half as long and soften `shade.strength` so they read as pale `--snow-shadow` washes; snow stays real and lit. Eased here by the paper edge at the bottom and corners. | #45 |
| 2 | Phone portrait | No village in the frame, the lower 40% is plain grey snow, and the top stacks icons, pills and the score panel. | A few small cut-outs inside the narrow frame, the throwing view framed lower, the two pills moved into the icon column. Eased here by the paper edge. | #46 |
| 3 | The hit, the loop's best moment | A big ball stops in the middle of the formation and covers the fallen cards for 2 to 3 seconds before "N down!" appears. | Let the ball roll through and out (or burst on a card when big), and pop "N down!" as soon as the count is certain. | #47 |
| 4 | Pins | A card that falls flat becomes a thin sliver from the throwing view, so you barely see what you knocked down. | Land face-up more often, rest slightly tilted on a little heap, optional "x x" face decal. | #48 |
| 5 | UI chrome, top right | "Fresh snow" and "Reset view" are stock shadcn pills with Lucide icons, the only default-web-UI left. | Reuse the HUD's hand-drawn round icon style and put them in the left column. | #49 |
| 6 | Score bar, phone | The flying "+1" lands on the "N / 6 down" label so both are unreadable for a moment. | Land it at the bar's fill end; no panel redesign (that is #31, Rachel's design). | #50 |
| 7 | High view | The fine snow ends in a visible circle with a grainy, lighter ring around it. | Blend the fine tiles into the far snow over a wider band. | #51 |
| 8 | Pulling | The full ball rolls toward the camera and hides the snowman's face at the most tense moment. | Keep the ball beside the thrower's feet from the camera's side, or fade it a touch over the face. | #52 |
| 9 | Low view | The paper hills meet the snow in a hard light line. | Sink the backdrop's lower edge into real snow like the village bases. | #51 |
| 10 | Whole picture | The lit snow is smooth and photographic next to the crayon-paper tooth of the cut-outs, so the two read as two different media. | **Done here:** a faint `--ink` paper grain over the picture (Part 3). | – |

### Screenshots

1. Shadows next to the art (left: game, right: `art-source/scenery/doodle-6-*`)
   ![shadows vs art](review/01-shadows-vs-art.webp)
2. Phone: empty lower half, crowded top (start and after a throw)
   ![phone](review/02-phone-empty-and-crowded-top.webp)
3. The ball parks on the pins (desktop, phone)
   ![ball parks](review/03-ball-parks-on-pins.webp)
4. Fallen cards almost vanish
   ![fallen](review/04-fallen-cards-vanish.webp)
5. Default buttons
   ![buttons](review/05-default-buttons.webp)
6. "+1" over the label on a phone
   ![plus one](review/06-plus-one-overlap.webp)
7. High view: the edge of the snow disc
   ![high](review/07-high-view-disc.webp)
8. Pulling: the ball covers the thrower
   ![pull](review/08-ball-hides-thrower.webp)
9. Low view: seam under the backdrop
   ![low](review/09-low-view-seam.webp)
10. Side view (for reference: reads well, cut-outs face the camera, groove is lovely)
    ![side](review/10-side-view.webp)

Moments that feel flat, in order: the wait between the hit and "N down!" (#3), the pull at full size when the
face disappears (#8), and the turn hand-over, which is fine but only a text note (left as is).

## Part 2 · Library picks

The key fact for every screen effect: the game draws the snow tone-mapped and the paper cut-outs not
(`toneMapped: false`, DECISIONS 2026-11-25). Three.js only tone-maps when drawing straight to the screen
(`three.module.js`, `if ( _currentRenderTarget === null … ) toneMapping = _this.toneMapping`). Any
`EffectComposer` draws into a render target first, so either the snow loses its tone mapping or a final
tone-mapping pass greys the paper. That breaks the "cut-outs stay exactly as now, snow stays real" rule.

| Candidate | What it would fix | Cost on a phone | Reduced-motion fallback | Verdict |
|---|---|---|---|---|
| `@react-three/postprocessing` tilt-shift | "Tiny diorama" reading | Full-screen blur pass at up to 3× pixel ratio; plus the composer's extra render target | Static, none needed | **No.** Blurred pencil lines look photographic, not drawn; and the composer breaks the tone-mapping split above. |
| … bloom on lamp and fairy lights | Warm glow | One more mip-chain pass | Static | **No.** The lights are unlit paper; a glow makes them glossy, and same composer problem. |
| … paper grain (Noise) | Item 10 | One pass | Static | **Yes, but without the library:** a CSS layer does it for free (below). |
| … vignette | Items 1 and 2 | One pass | Static | **Yes, but without the library, and toward `--paper` not dark:** a dark vignette is a photo trick; Rachel's sheets fade to white paper. |
| drei `Sparkles` | Magic in the air | Cheap points | Turn off | **No.** There is already real falling snow; glitter reads as digital. |
| drei `Clouds` | Sky | Many overdraw sprites | Freeze | **No.** Volumetric clouds are the definition of default 3D; the sky is Rachel's paper backdrop. |
| drei `ContactShadows` | Grounding | Extra depth render each frame | n/a | **No.** Cut-outs already sit in real snow heaps with real shadows; item 1 wants fewer, not more, shadows. |
| drei `SoftShadows` (PCSS) | Softer shadow edges | Heavy: many shadow-map taps per pixel on the whole snow | n/a | **No.** The shadow edges are already soft; the problem is length and darkness (#45). |
| Motion (`motion`) | UI springs | About 30–40 kB of script | Its own reduced-motion switch | **No.** The turn note, "N down!" and the score bar already spring with CSS (overshoot curves and keyframes, with reduce-motion fades). Nothing in the review needs it. |

**Result: no new library.** The two picks are plain CSS, inside a new `src/features/look/`.

## Part 3 · Built and on the home page

Both layers sit above the canvas and under every piece of UI (`<PaperFinish />` right after `<SnowScene>` in
`src/features/game/Game.tsx`). They never touch the 3D render, so the cut-outs are exactly as before and the snow
is the same lit snow underneath. Switch them on `/dev/look` (or `?grain=0` / `?edge=0`). Numbers in
`src/features/look/content.ts`. Neither moves, so "reduce motion" needs nothing.

1. **Paper grain** (commit "Look: faint paper grain…"): a still crayon-paper tooth in `--ink` at 6.5% through a
   fractal-noise mask. It gives the smooth snow and the blue shadows the same paper tooth as the cut-outs.
   ![grain zoom, left before, right after](review/look-grain-zoom.webp)
2. **Paper edge** (commit "Look: soft paper edge…"): the picture fades into `--paper` at the bottom (50%) and in
   the corners (45%), like a drawing that stops before the sheet's edge. It calms the heaviest foreground shadows
   and the empty bottom of the phone view; the lane and pins in the middle are untouched.
   ![edge, left before, right after](review/look-edge-corner.webp)

Before / after, whole screen (left before, right after):

![desktop](review/look-desktop-before-after.webp)
![desktop after a throw](review/look-desktop-throw-before-after.webp)
![phone](review/look-phone-before-after.webp)

Next to Rachel's art (left: game with both layers, right: `art-source/scenery/sheet-4-friends.png`):

![vs art](review/look-vs-art.webp)

### Frame rate (headless Chrome, GPU on, production build, `/dev/look`)

| Size | Layers | Idle fps · p95 frame | Rolling fps · p95 frame |
|---|---|---|---|
| Desktop 1440×900 @2× | off | 59 · 16.7 ms | 60 · 16.7 ms |
| | grain | 60 · 16.8 ms | 60 · 16.7 ms |
| | edge | 60 · 16.7 ms | 61 · 16.7 ms |
| | both | 60 · 16.7 ms | 60 · 16.8 ms |
| Phone 390×844 @3× | off | 60 · 16.8 ms | 60 · 16.7 ms |
| | grain | 60 · 16.7 ms | 60 · 16.8 ms |
| | edge | 60 · 16.8 ms | 60 · 16.7 ms |
| | both | 60 · 16.8 ms | 60 · 16.8 ms |

No frame drops. The test machine is capped at 60 by vsync, so this shows "no cost", not headroom; the layers are
static and composited once, which is why they are free on a real phone too. Not yet checked on a real phone.

### Where it still falls short (honestly)

- Both layers are subtle by design. The grain is visible up close, not across the room; the edge does not fix the
  shadows (#45) or the empty phone view (#46), it only softens them.
- The paper edge also lightens the cut-outs that stand in the corners (the bush and tree at bottom left) by up to
  45%. It reads as "the drawing fades out", but it is a change to how those cut-outs look; `LOOK.edge.corner` is the
  knob, and 0 keeps only the bottom fade.
- The "Fresh snow" / "Reset view" pills sit inside the snow scene, so they get the grain too (barely visible).
- The biggest wins in this review (items 1 to 4) belong to other features and are in follow-up issues #45 to #52.
