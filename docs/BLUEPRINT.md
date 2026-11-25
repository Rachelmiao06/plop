# Plop! · blueprint

The map of the whole build: what is done, what is open, what is parked. Gameplay: `docs/GAMEPLAY.md`.
Rule for every round: one issue = one session = one branch = one PR; shared files go first; merge one at a time.
State as of 2026-11-25 (QA pass): everything below "Done" is on `main` and live at https://plop-two.vercel.app.

## What the game is now

Paper bowling on real lit snow in Rachel's hand-drawn village. Pick 3 or 5 rounds, "two friends" (take turns or
together) or "just me". Each round brings a new set that asks a different shot; the light moves from afternoon to a
cosy lamp-lit evening by the last round; a kind end card with "play again". Music, a quiet village ambience and cue
sounds after the first tap; a share button (with a WeChat note). 60 fps in every match at desktop and phone size in
headless Chrome (not yet measured on a real phone, #68).

## Done (on `main`)

| Area | What | PRs |
|---|---|---|
| Foundations | Skeleton, CI (lint, typecheck, build, page smoke test), Vercel; tokens and fonts; look-first rule | setup, #16, #23, #60 |
| Snow | Real lit 3D snow, grooves, craters, dust, sparkles; fresh snowfall; short pale shadows; time of day (`setTimeOfDay`, `easeTimeOfDay`) | #17, #29, #36, #44, #59, #63 |
| Camera | Path camera, throwing view, phone view, a filmed throw that never passes the snowman | #17, #33, #54, #56 |
| Village | Rachel's cut-outs as thick paper standees on the snow; the new doodle street (lamp, café, homes, post office); paper-theatre sky that sets to evening | #20, #33, #44, #55, #58, #64 |
| Effects | Warm lamp, window and fairy-light glow that lights the snow; chimney smoke; icicles and ice; snow bank at the hills' foot | #59, #63 |
| Throw | Slide, pull, the ball grows, sweet spot, aim line, snappy roll, vibration, squash-and-spring, hit-stop | #21, #40, #43, #57, #62 |
| Pins | Rapier toppling, chain reactions, "N down!", readable fallen cards, round sets, star friend, bunny, snow mounds | #35, #41, #57, #62 |
| Game | Turns, scores, the 3 / 5 round match, end card, together mode, evening over the match | #39, #62, #65, #67 |
| HUD | Paper score panel, progress bar, round tag, corner toggles, start and end cards | #30, #56, #66 |
| Sound | Snow crunch, whoosh, thump; music; village ambience; seven named cues | #15, #19, #61, #65 |
| Shell | Paper loading screen, icons, share card and button, WeChat note, README | #60 |
| Reviews | Designer review (`docs/REVIEW.md`) and every follow-up issue from it (#45 to #52) | #53, #56, #57, #59 |
| QA | Full QA pass: the paper sky now follows the match's evening, together mode rings both players, old effect code removed, docs brought up to date (`docs/review/qa/`) | this PR |

## Open

| Issue | What | Label | Waits on |
|---|---|---|---|
| [#68](https://github.com/Rachelmiao06/plop/issues/68) | Check on a real phone and inside WeChat (frame rate, sound, share, together with two fingers) | feel | a real device |
| [#31](https://github.com/Rachelmiao06/plop/issues/31) | Score panel: its checklist is done by #66; Rachel may still redesign the panel herself | visual | Rachel |
| [#70](https://github.com/Rachelmiao06/plop/issues/70) | A crown doodle for the winner (the last stand-in drawn in code) | visual | Rachel's art |
| [#69](https://github.com/Rachelmiao06/plop/issues/69) | The paper flop sound runs its own audio engine; move it into `src/lib/audio.ts` | audio | anyone |

Small leftovers noted in the code, no issue needed yet:

- Two library warnings in the console on every load (three.js `THREE.Clock` deprecated inside React Three Fiber;
  Rapier's init parameters). Both go away with library updates.
- A full rich WeChat share card needs a domain, ICP filing and a WeChat Official Account (README, "Sharing in WeChat").

## Parked

- 3D snowmen ([PR #22](https://github.com/Rachelmiao06/plop/pull/22), draft): replaced by Rachel's paper throwers.
