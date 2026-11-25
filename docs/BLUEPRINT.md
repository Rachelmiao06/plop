# Plop! · blueprint

The map of the whole build: what is done, what runs now, what waits and why. Gameplay: `docs/GAMEPLAY.md`.
Rule for every round: one issue = one session = one branch = one PR; shared files go first; merge one at a time.

## Done (on `main`)

| What | PR |
|---|---|
| Skeleton, CI, Vercel | setup |
| Sound engine with real snow recordings (`src/lib/audio.ts`) | #15 |
| Design tokens and fonts | #16 |
| Background music file and `/dev/music` | #19 |
| Real 3D snow, camera, pressing API | #17 |
| Look-first rule in `CLAUDE.md` | #23 |

## Round 1 · running now (no shared files between them)

| Branch / session | Issues | Area | Result |
|---|---|---|---|
| slingshot | #4, #6 | `src/features/slingshot/`, `/dev/bowling` | thrower slides on the line, pull grows the ball, it rolls down the lane on real snow |
| scenery | #14 | `src/features/scenery/`, `public/assets/scenery/` | hand-drawn thick cut-outs, lane-framing village, pin data, thrower cut-outs (PR #20) |
| score + music UI | new score issue, #18 | `src/features/hud/`, `/dev/hud`, `src/lib/audio.ts` (music only) | frosted, hand-drawn floating score with mock data; music and sound toggles |
| fresh snowfall | #27 | `src/features/snow-scene/` (reset API only), `/dev/snowfall` | snow falls and smooths every groove back to fresh |
| gameplay doc | (docs) | `docs/` | PR #24 |

## Round 2 · after slingshot and scenery are merged

| Session | Issues | Why it waits |
|---|---|---|
| pins and physics | #7, #25 | needs the rolling ball (slingshot) and the cut-outs (scenery); adds `@react-three/rapier` (shared `package.json`) |

## Round 3 · after pins

| Session | Issues | Why it waits |
|---|---|---|
| the game on the home page | #26, #8 | needs everything above: turns, thrower swap, score wired to real knock-downs, all feel numbers in one place |

## Round 4 · polish

| Session | Issues |
|---|---|
| vibration and squash-and-spring | #10 |
| "together" mode (both throwers at once) | new issue when ready |
| score display designed properly by Rachel | follow-up to the score issue |

## Parked

- 3D snowmen (PR #22, draft): replaced by paper throwers.
