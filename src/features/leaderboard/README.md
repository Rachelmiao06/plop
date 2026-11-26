# leaderboard

A scoreboard **per invite group, with no login**. Whoever opens a group's invite link (`?g=<8 letters>`) and
finishes a match types a nickname, and their match score goes on that group's board. The device remembers the
nickname. Try it at `/dev/leaderboard`.

```tsx
import { GroupBoard, SubmitScore } from "@/features/leaderboard";

<GroupBoard group={g} />                       // the snowman pile + a compact list, best first (top 10)
<SubmitScore group={g} score={total} rounds={3} mode="turns" />   // nickname prompt after a match
```

- `GroupBoard` props: `group`, optional `me` (whose snowman and row to highlight; default the remembered nickname), `limit`.
- `BoardSheet` is the same board drawn from scores you hand it (`state`, `viewer`); `/dev/leaderboard` uses it for
  fake groups of 2, 5 and 10 with buttons that make someone overtake someone.

## The look: no boxes (Rachel, 2026-11-25)

Rachel finds boxes inside boxes heavy and cheap, so nothing on the board has a frame: `PaperSheet` is now just a
wrapper (no paper, no pencil edge, no shadow), the snowmen stand straight on Rachel's far hills (pines, little
houses, its own ground line, faded at the sides), names and scores are handwritten on each snowman's belly with a
soft paper-white halo instead of a tag, today's hits are a clump of snow stuck to the head with "×3", and notes
("you're #2!", "再等42分钟") are handwriting without a pill. Depth is light, not 3D: a soft shadow under each
snowman's feet and on the cut-out. The list underneath shows the top 3 and your own line; "看全部 · see all" opens
the rest. The "you got hit" note fills the screen as a snowy scene with one button. On the invite page the board is
folded behind "看看这场雪仗 · see the board" under the play button, so the first screen has one action.

## The snowman pile (`SnowmanPile.tsx`, numbers in `PILE`)

Each player is a little snowman from Rachel's thrower cut-outs (bucket or red hat, chosen from the nickname, so the
same name is always the same snowman, sometimes facing the other way, leaning a hair) with its nickname and best
score written on its belly. Better scores stand higher, literally on the heads of the ones below, in a human
pyramid: #1 alone on top in the crown, then 2, 3 and 4 per row (`PILE.rows` says how many per row for 1 to 10
players; a row is never wider than the one under it). Whoever has someone on their head is squashed (a little more
for every row stacked above) and gets Rachel's surprise lines beside the head. A team entry is both snowmen side by
side. The viewer's snowman has a soft butter glow and a bolder name. When a rank changes, the climber crouches,
hops over in an arc in front of everyone and plops onto the head below with a squish and Rachel's snow puff; the one
going down slides over first; someone new drops in from above. Nothing moves when nothing changed, and nothing
animates with reduced motion. The compact list underneath keeps the exact numbers and full names.
- `SubmitScore` props: `group`, `score`, `rounds` (3 | 5), `mode` ("turns" | "together"), optional `defaultName`,
  `remember` (default true; pass false for a second player on the same phone), `onSubmitted({ entry, rank })`.
- When a score lands, every `GroupBoard` for that group on the page refreshes by itself (a `plop:scores` window
  event), so the end card and the invite page need no wiring between them.
- Render them only when the page has a group id; without one there is no board.

## Snowballs (`/api/snowballs`, numbers and words in `SNOWBALL` / `TEXT.snowball`)

Tap a friend's snowman on the board to throw a snowball: a little snowball arcs from your snowman's head to theirs
(from the bottom of the board if you are not on it yet), splats in Rachel's snow puff and they wobble. Each
snowman shows a small "被砸了3次" under its tag for today (midnight China time). One throw per friend per hour
(the database checks it; tapping again says "再等42分钟 · in 42 min"), plus 20 throws a minute per IP and group in
the server's memory. You can only hit someone on the group's board, never yourself. Tapping needs a nickname on
this device (or the start card's name), so a first-time visitor just sees the board.

`<SplatNotice group me? onThrowBack />` is the "you got hit" note: the next time someone opens the game (start
card) or the invite page, every unseen hit shows as your snowman with a splat on its face, "你被小雪砸了一脸雪！ ·
小雪 got you!" and a big "砸回去 · Throw back". Throwing back sends a snowball back to whoever got you and starts a
match in the same group (the game starts with last time's choices when there are some, else the start card is
right there; the invite page goes to the game, challenged by that friend). "later · 下次吧" closes it. Both mark
the hits seen. All words are preset; nothing a player types is shown to anyone except nicknames.

Stored per throw (`supabase/migrations/0003_snowballs.sql`): group, both nicknames, when, and when it was seen.
Throws older than 8 days are deleted on the next throw. Nobody signs in, so a nickname is who you say you are on
that device, like the board itself.

## Funny titles (`titles.ts`, words in `TEXT.titles`, thresholds in `TITLE_RULES`)

Each player gets at most one title, the first that fits in this order: 雪球大王 (top of a board of 2 or more) ·
保龄球之神 (two full clears in a row in one match) · 兔子杀手 (knocked a friend over 3 times in all) · 大力出奇迹 (every
throw at full pull, 5 throws or more) · 星星收集家 (3 star cards down in all) · 温柔的人 (3 matches in a row without a
full clear) · 雪地小可怜 (last on a board of 3 or more) · 刚刚破纪录 (latest match is their best) · 雪地常客 (8 matches)
· 新来的小雪人 (first match). Each has a short English line. On the board it is written small in berry above the name
on the snowman's belly and after the name in the list; on the end card it appears under "you're #2!" once your score
is on the board (star doodle and handwriting, no badge box).

The numbers come with the score: the game counts, per player per match, full clears, the longest run of them, friends
knocked, star cards down, throws, and throws at full pull (`src/features/game/matchStats.ts`), and `<SubmitScore
stats>` sends them. The server checks them (`checkStats`: whole numbers a match of that length can make) and adds
them to running totals on the player's board line (`supabase/migrations/0004_score_stats.sql`, `submit_score_v2`).
A submit without numbers (an older game) leaves the totals as they were, so old rows simply have no style title yet.

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
  characters removed and a small block-list of rude words in English and Chinese; rounds 3 or 5; mode turns,
  together (older rows: each player's own score) or **team**; score a whole number from 0 to the most a match of
  that length can make (`maxScore`, read from the game's points and the pins' round sets, so it follows tuning: 33
  for 3 rounds, 62 for 5 today). A **team** entry (team-up mode on the end card) is one line for both players: their
  names joined ("小美 & 阿雪", `teamName`, up to `BOARD.teamNameMax` = 27 characters), their points added up (up to
  twice `maxScore`, `maxFor`). Needs `supabase/migrations/0002_team.sql` run once on the live database.
- `rateLimit.ts`: 10 submits a minute per IP and group (`BOARD.rateLimit`), in the server's memory (best effort;
  each server instance counts on its own).
- `src/lib/db.ts` stores: one line per nickname per group (same name in any case = same person), keeping their
  **best** score on top and their **latest** one. Supabase when the keys exist (connected through the Vercel
  integration, table created; `supabase/README.md`; locally `vercel env pull .env.local`), otherwise
  **demo mode**: memory plus a temp file, forgotten on redeploy, logged as "demo mode" in the server log.
- A 3-round and a 5-round score share one board; the row says which length the best came from.

## Files

`content.ts` limits, look numbers and words · `rules.ts` checks and `maxScore` · `rateLimit.ts` ·
`api.ts` browser calls, the remembered nickname, the "score landed" event · `GroupBoard.tsx` (and `BoardSheet`) ·
`SnowmanPile.tsx` (the pile and the snowball throw) · `SplatNotice.tsx` · `snowballRules.ts` · `SubmitScore.tsx` ·
`Doodles.tsx` paper sheet, rank marks (pencil circle in butter / snow / blush, crown on #1), butter crayon highlight ·
`boardStyles.ts` the small scoped stylesheet: rows and the note spring in; idle motion (the crown rocks and hops,
the #1 circle wobbles, the title star twinkles, the "you're #2!" note bobs, your highlight scribbles in from the left
and again when your score lands; the pile pops in row by row, squashes spring, the startled lines twitch, your glow
breathes), tuned in `BOARD.motion` and `PILE`, off with reduced motion · `review/` screenshots.

## Asked of other features

- **hud:** export `PaperFill`, `PencilFrame`, `SnowmanFace`, `StarDoodle`, `CrownDoodle` and `pencilCircle` from its
  index. Now imported from `@/features/hud/Doodles` and `@/features/hud/pencil` directly (read only).

## Wired in (2026-11-25)

The game's end card shows `<SubmitScore>` per player (the start card's name filled in) and `<GroupBoard>` when the
page has a group; the invite card shows `<GroupBoard>` in its slot. The sketch below is how it was first planned.

### The first sketch

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

Invite page (`src/features/invite/InviteCard.tsx`: replace the empty `data-leaderboard-slot` div under the message;
`group` is the link's group id, same 8-character rule):

```tsx
import { GroupBoard } from "@/features/leaderboard";
{group && <GroupBoard group={group} limit={5} className="mx-auto" />}
```
