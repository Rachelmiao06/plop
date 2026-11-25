# Characters

The two main snowmen, built from simple Three.js shapes so they look right from every angle.
Test page: `/dev/characters` (orbit camera, every state, side-by-side with Rachel's reference sheets).

- `bucket`: blue bucket on the head, mint scarf with a knot and two fringed ends.
- `redhat`: red ribbed beanie with a pompom, red scarf with one fringed end.

## Placing one

A snowman is **1 scene unit tall** from the snow to the top of its head (hats stick out above).
Its origin is on the ground between its feet. `facing` turns it around the vertical axis;
`0` looks toward +Z. Use `faceToward(from, to)` with `[x, z]` ground positions to aim it.

```tsx
import { Snowman, faceToward, type SnowmanHandle } from "@/features/characters";

const left: [number, number] = [-2, 0];
const right: [number, number] = [2, 0];
const bucket = useRef<SnowmanHandle>(null);

<Snowman
  ref={bucket}
  variant="bucket"
  position={[left[0], 0, left[1]]}
  facing={faceToward(left, right)}
  scale={1.3}               // any group prop works: scale, onPointerDown, visible…
/>
```

It must render inside a React Three Fiber `<Canvas>` and inside `<Suspense>` (the face textures load first).
The look assumes `<Canvas flat>` (no tone mapping) so the token colours come out exactly.

## Driving its states

Held states last as long as you keep them. Set them with props **or** the handle (latest wins):

| State | Prop | Handle |
| --- | --- | --- |
| idle: breathing and a slight wobble | `state="idle"` | `release()` |
| pressed: quick squash when grabbed | `state="pressed"` | `press()` |
| charging: straining face, leans back, wobble grows, trembles at full | `state="charging" charge={0..1}` | `charge(amount)` each frame |

One-shot moments play and then return to the held state (`onActionEnd(action)` fires after):

| Moment | Handle |
| --- | --- |
| launched: snaps forward, happy | `launch()` |
| hit: head tips or pops off, hat flies, then springs back together; dizzy after a hard hit | `hit(strength 0..1, side?)` |
| dizzy | `dizzy()` |
| laugh | `laugh()` |

`timeScale` (default 1) slows everything down; `0` freezes it, for a hit-stop on big impacts.

## Look options

- `shading="computed"` (default): token colours with procedural coloured-pencil strokes.
- `shading="matcap"`: every part is coloured from one of Rachel's hand-drawn spheres
  (`public/assets/characters/matcap-*.jpg`), looked up by the surface's view direction, with a little light blended in.
- `paperGrain`: a faint screen-space paper grain over the snowman.
- `onTwos`: poses update about 12 times a second, like hand-drawn animation.
`handle.object` is the root group, for positions and raycasting.

A typical slingshot flow: `press()` on pointer down, `charge(pull)` while dragging, `launch()` on release,
and `hit(power)` on the other snowman when the snowball lands.

## Tuning

All sizes, colours (as token names), springs and timings are in `content.ts`.
Faces, reference thumbnails and matcaps are made by `scripts/characters-slice-art.py`
(run `python3 scripts/characters-slice-art.py` from the repo root).
Matcaps come from clean crayon patches of the four-view sheets until a 2 × 2 sheet of drawn spheres exists:
`python3 scripts/characters-slice-art.py --spheres "<path to sheet>"` copies it into `art-source/characters/`
and replaces all four (grid order snow, mint, red, blue; change with `--order`).

## Files

- `Snowman.tsx` the component, its states and spring motion.
- `parts.tsx` hats, scarf ends and the outline helper.
- `materials.ts` the crayon fill (computed or drawn matcap) and the hand-drawn outline; colours from theme tokens.
- `spring.ts` a tiny damped spring. `facing.ts` the `faceToward` helper.
