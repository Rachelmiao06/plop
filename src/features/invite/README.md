# invite

The invite card at `/invite?g=<group>&from=<name>&score=<n>`: a white-page welcome a friend opens from a WeChat chat (or
any link). Mounted by `src/app/invite/page.tsx`; nothing in the game, snow scene or scenery is changed.

1. The white loading screen (from `@/features/loading`, `noScene reveal`): Rachel's sliding penguin by the title and
   the real-snow strip; "雪球滚过来啦…". The page is all white (`--snow-white`, Rachel 2026-11-25); there is no 3D scene,
   mouse or envelope any more.
2. At 100 % the snowball bursts into a real puff of snow and the card (`InviteCard.tsx`) pops out of it with a springy
   bounce (`timing.cardIn`): "**{name}** 邀请你来打一局雪仗 ❄️" (or "有人邀请你来打一局雪仗 ❄️"), "TA 打了 {score}
   分，你能赢吗？" when a score came along, the group's board when the link has a group (`<GroupBoard>`,
   `INVITE.board.limit` rows, in `data-leaderboard-slot`), and one big "接受挑战 / Play" button to
   `/?g=<group>&from=<name>` (the game greets "{name} 在等你" and keeps the group for its board). Chinese first,
   English beneath in small text. A soft bell rings with the poof only if the visitor already tapped.
3. The sender, arriving here from the share sheet inside WeChat, also sees the "tap ··· to send" note once
   (`SHARE.invite.sentKey` in sessionStorage).
4. `invite_opened` goes to analytics with only whether a score and a group came along (never the name).

## The link

`link.ts` makes and reads it, for both sides: `invitePath`, `readInvite`, `gamePath`, `inviteTitle`, `cleanGroup`.
Only a group id (exactly `link.groupLength` = 8 of `A-Z a-z 0-9 _ -`, the leaderboard's rule), a name (at most
`link.nameMax` = 12 characters; control characters and `< >` dropped) and a whole-number score (0 to
`link.scoreMax`) travel. Nothing else. The group id itself is made and remembered by the share feature
(`getGroupId()` / `ensureGroupId()`).

## WeChat's chat card

WeChat ignores Open Graph without an Official Account. It takes the page `<title>`, the description meta and the first
`<img>` in `<body>` of at least 300 × 300. So:

- `generateMetadata` sets "{name} 邀请你来打雪仗 · Plop!" (server), and `InviteCard` sets `document.title` and the
  description again in the browser, because the address is read at request time (Cache Components) and WeChat is
  not on Next.js's list of bots that get the title in `<head>` up front.
- the first body image is `public/assets/invite/invite-square.jpg` (600 × 600): "Plop!" with Rachel's sliding penguin on
  `--snow-white`, like the opening page, made by `python3 scripts/make_invite_card.py` (no drawing: the penguin as it is,
  the lettering lifted from the share card).

## Files

- `content.ts` every word (zh / en), the art, timings, the camera views and drift. Tune here.
- `link.ts` the link. `InviteCard.tsx` the card and button.
- `review/` screenshots (the old envelope sequence is history; the white flow is in `src/features/loading/review/white/`).

Reduce motion: no poof and no bounce; the card simply appears.

## Wagers (preset only)

The inviter can add one optional wager in the invite sheet (share feature): "不赌 · no wager" or one of six preset
lines in `INVITE.wagers` (热可可, 唱歌, 学企鹅走路, 丑照, 冰淇淋, 夸赢家三句). Only its short code travels in the link
(`w=cocoa`); `cleanWager` drops anything not on the list, so nothing typed ever shows. The invite card shows it under
"X invites you" ("赌注：输的人学企鹅走路 🐧", a wavy berry underline, no box), "接受挑战" carries it into the game
(`gamePath({ name, group, score, wager })`, which keeps the score too, so the end card can say who lost), and the end card settles it (`wagerResult`): "小雪要学企鹅走路啦 🐧" for the loser,
or "平手！赌注留到下一局" on a tie. Who loses: alone against the inviter's score, the lower of the two; two players
on one phone, the lower total; a team never loses, so no line. `/dev/wager` shows the end card for each.
