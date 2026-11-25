# leaderboard

A scoreboard **per invite group, with no login**. Whoever opens a group's invite link (`?g=<8 letters>`) and
finishes a match types a nickname, and their match score goes on that group's board. The device remembers the
nickname. Try it at `/dev/leaderboard`.

```tsx
import { GroupBoard, SubmitScore } from "@/features/leaderboard";

<GroupBoard group={g} />                       // the paper list, best first (top 10)
<SubmitScore group={g} score={total} rounds={3} mode="turns" />   // nickname prompt after a match
```

- `GroupBoard` props: `group`, optional `me` (whose row to highlight; default the remembered nickname), `limit`.
- `SubmitScore` props: `group`, `score`, `rounds` (3 | 5), `mode` ("turns" | "together"), optional `defaultName`,
  `remember` (default true; pass false for a second player on the same phone), `onSubmitted({ entry, rank })`.
- When a score lands, every `GroupBoard` for that group on the page refreshes by itself (a `plop:scores` window
  event), so the end card and the invite page need no wiring between them.
- Render them only when the page has a group id; without one there is no board.

## Privacy

Only a **nickname and the match score** (plus the match length, turns / together, how many matches and when) are
stored, per invite group. No account, no email, no IP address, no device id. The nickname is remembered only on
the player's own device (`localStorage`, `plop.nickname`). The IP is used in memory for a minute to slow down
spam and is never written anywhere.

## How it works

- `src/app/api/scores/route.ts` is the only door: `GET /api/scores?g=` (top 10) and `POST /api/scores`. The browser
  never talks to the database.
- `rules.ts` checks every submission (on the server; the prompt uses the same checks to answer early):
  group id exactly 8 of `A-Z a-z 0-9 _ -`; nickname 1 to 12 characters after trimming, with control and invisible
  characters removed and a small block-list of rude words in English and Chinese; rounds 3 or 5; mode turns or
  together; score a whole number from 0 to the most a match of that length can make (`maxScore`, read from the
  game's points and the pins' round sets, so it follows tuning: 31 for 3 rounds, 58 for 5 today).
- `rateLimit.ts`: 10 submits a minute per IP and group (`BOARD.rateLimit`), in the server's memory (best effort;
  each server instance counts on its own).
- `src/lib/db.ts` stores: one line per nickname per group (same name in any case = same person), keeping their
  **best** score on top and their **latest** one. Supabase when the keys exist (`supabase/README.md`), otherwise
  **demo mode**: memory plus a temp file, forgotten on redeploy, logged as "demo mode" in the server log.
- A 3-round and a 5-round score share one board; the row says which length the best came from.

## Files

`content.ts` limits, look numbers and words · `rules.ts` checks and `maxScore` · `rateLimit.ts` ·
`api.ts` browser calls, the remembered nickname, the "score landed" event · `GroupBoard.tsx` · `SubmitScore.tsx` ·
`Doodles.tsx` paper sheet, rank marks (pencil circle in butter / snow / blush, crown on #1), butter crayon highlight ·
`boardStyles.ts` the small scoped stylesheet (row and note spring in) · `review/` screenshots.

## Asked of other features

- **hud:** export `PaperFill`, `PencilFrame`, `SnowmanFace`, `StarDoodle`, `CrownDoodle` and `pencilCircle` from its
  index. Now imported from `@/features/hud/Doodles` and `@/features/hud/pencil` directly (read only).

## Wiring it in (a follow-up, those files belong to other sessions)

End card (`src/features/hud/Match.tsx`, inside `MatchEnd`, under the totals; `group` comes from the page's `?g=`,
passed down from the game):

```tsx
import { SubmitScore, GroupBoard } from "@/features/leaderboard";
// MatchEndProps gains: group?: string; rounds: 3 | 5; mode: "turns" | "together";
{group && (
  <div className="mt-3 flex flex-col items-center gap-3">
    <SubmitScore group={group} score={a.total} rounds={rounds} mode={mode} />
    {!solo && <SubmitScore group={group} score={b.total} rounds={rounds} mode={mode} defaultName={b.name} remember={false} />}
    <GroupBoard group={group} />
  </div>
)}
```

Invite page (`src/features/invite/`, the slot under the message; `g` is the link's group id):

```tsx
import { GroupBoard } from "@/features/leaderboard";
{g && <GroupBoard group={g} className="mx-auto mt-4" />}
```
