# leaderboard

A scoreboard **per invite group, with no login**. Whoever opens a group's invite link (`?g=<8 letters>`) and
finishes a match types a nickname, and their match score goes on that group's board. The device remembers the
nickname. Try it at `/dev/leaderboard`.

```tsx
import { GroupBoard, SubmitScore } from "@/features/leaderboard";

<GroupBoard group={g} />                       // #1 on a podium, then the ranked list, best first (top 10)
<SubmitScore group={g} score={total} rounds={3} mode="turns" />   // nickname prompt after a match
```

- `GroupBoard` props: `group`, optional `me` (whose snowman and row to highlight; default the remembered nickname), `limit`.
- `BoardSheet` is the same board drawn from scores you hand it (`state`, `viewer`); `/dev/leaderboard` uses it for
  fake groups of 2, 5 and 10 with buttons that make someone overtake someone.

## The look: a ranked list, #1 on a podium (Rachel's approved design, 2026-11-25)

Rachel found the snowman pile ugly and asked for a classic ranked list, with only #1 special. No frames inside
frames and no pills (`PaperSheet` is just a wrapper).

- **Header:** "雪仗排行榜 · our snowy board".
- **#1 on top** (`ChampPodium.tsx`, numbers in `CHAMP`): Rachel's sassy snowman (hands in pockets, sunglasses,
  leaning; bucket or red hat to match #1) on her snow mound with a gentle sway, the crown doodle with sparkles above,
  name, score and title below. When the board opens, or someone new takes #1, the **"deal with it" moment** plays:
  sunglasses drop from above, spinning a little, land on the face with a squash and a bounce, a glint flashes on the
  lens, and the snowman gives a smug little lift; an original jingle plays with it (`jingle.ts`: synthesized "dun
  dun dun, dun-dun" and a "ting", about 1.5 s, only with sound effects on and after a tap). Reduced motion: no drop,
  no jingle, glasses simply on.
- **Art slots** (`CHAMP.art`): `sassy`, `bare` (the same pose without sunglasses) and `glasses`. Until Rachel's
  no-sunglasses versions arrive, `bare` points at the sassy art and `glasses` at a stand-in cut from it
  (`sunglasses-standin.webp`), with `bareHasGlasses: true` so the falling pair fades onto the drawn ones. When the
  new art comes: point `bare` and `glasses` at the files and set `bareHasGlasses` to false. Cleaned sources (red rim
  and grey speckles removed) are in `art-source/leaderboard/`.
- **The rows** (`RankedList.tsx`, numbers in `LIST`): rank (pencil medal circles in butter, snow and blush for 1 to
  3, plain numbers after), a small avatar (the snowman face in a soft rounded square), the name with the funny title
  as a second line, the score on the right. Row 1 has a pale butter wash.
- **Your row** is pinned at the bottom, outlined in butter, with "还差 N 分超过 {name} · N to pass {name}" (or
  "你是第一！").
- **Tapping a friend's row** throws a snowball from your avatar to theirs (`Flight.tsx`). Today's hits show as a tiny
  snow mark with a number on the avatar.
- **Notes elsewhere:** the "you got hit" and "X just passed you" notes fill the screen as snowy scenes with one
  button each. On the invite page the board is folded behind "看看这场雪仗 · see the board" under the play button.

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

## "X just passed you" (`OvertakeNotice`, `overtake.ts`, `GroupNotices`)

This device remembers the board as it last saw it, per group (`localStorage` `plop.seen.<group>`: your nickname
key, your best, everyone's best; nothing is sent). The next time you open the game (start card) or the invite page,
anyone now above you who was not above you then (new, or at or below your best then) gets a full-screen snowy note:
their snowman hops onto your head and squashes you, "小雪刚刚超过你3分 😤 · 小雪 just passed you by 3", "+2 others"
when more did, and a big "复仇 · Get them back" that starts a match in the same group (tracked as `revenge_tapped`
with only how many others, never names). It is shown once per change: the board as seen now is remembered right
after the check, and also whenever the board itself is shown (end card, the invite's folded board). `GroupNotices`
shows "you got hit" first and this one after it, never both at once. `/dev/leaderboard` has preview buttons, and the
server tester's "simulate being overtaken" rewinds this device's memory so the real check runs.

## Stickers (`/api/reactions`, art and numbers in `REACTIONS`, words in `TEXT.reactions`)

Hold a friend's row (or tap its small "+") to open four of Rachel's effect doodles as stickers: star 厉害, surprise
lines 哇, snow puff 笑死, music notes 好听. One sticker per person per line: picking another replaces it, picking the
same one again takes it back. Each line shows its stickers as tiny doodles with counts beside the score (yours with
a butter wash). A quick tap still throws a snowball; only a hold opens the stickers. The one who got them sees
"小美给你点了个 ⭐ 厉害" (or "小美和另外 2 人给你贴了贴纸") the next time they open the game or the invite page, as the
third note in the queue after "you got hit" and "X just passed you", with one "好耶 · Yay" that marks them seen.

Stored per (group, from, to): both nicknames, which sticker, when, and when seen (`supabase/migrations/
0005_reactions.sql`, `set_reaction`; a changed sticker counts as new). Preset stickers only; 30 changes a minute per
IP and group in the server's memory; only lines on the board can get one, never your own.

## "今日最惨 · Today's oops" (opt-in; words in `TEXT.oops`)

The score prompt on the end card has a small box, unticked every time: "让大家笑一下我最惨的一球 · Let the group laugh
at my worst throw today". Only a tick puts the player in. The game sends the match's worst throw (fewest cards down
in one throw, `stats.worst` from `matchStats.ts`) and the box (`oops`); the server keeps the day's lowest for those
who ticked (`supabase/migrations/0006_todays_oops.sql`, `submit_score_v3`), and an unticked submit clears it. Under
the list, one quiet line shows the group's lowest throw today among them, with a dizzy avatar (Rachel's wind curl
spinning, a star going round): "Pip今天有一球只倒了0个 😵 · Pip knocked down 0 once today". Stickers work on it
(they are the player's stickers, the same as on their row). **The day** is the game's day: midnight China time
(UTC+8, `SNOWBALL.dayUtcOffsetHours`), by the server's clock (`day.ts`), the same day as the snowball counts; the
board shows only today's.

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
`ChampPodium.tsx` (#1 and the sunglasses) · `jingle.ts` · `RankedList.tsx` (rows, your pinned row, taps) ·
`Flight.tsx` (the snowball in the air) · `looks.ts` (which snowman a name gets) · `reactionRules.ts` ·
`ReactionNotice.tsx` · `day.ts` (the game's day) · `SplatNotice.tsx` · `snowballRules.ts` · `SubmitScore.tsx` ·
`Doodles.tsx` paper sheet, rank marks (pencil circle in butter / snow / blush, crown on #1), butter crayon highlight ·
`boardStyles.ts` the small scoped stylesheet: rows and the note spring in; idle motion (the crown rocks and hops,
the #1 circle wobbles, the title star twinkles, the "you're #2!" note bobs, your highlight scribbles in from the left
and again when your score lands; #1 sways, the sunglasses drop, glint and the smug lift, the crown sparkles), tuned in
`BOARD.motion` and `CHAMP`, off with reduced motion · `review/` screenshots.

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
