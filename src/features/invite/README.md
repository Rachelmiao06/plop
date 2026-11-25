# invite

The invite card at `/invite?from=<name>&score=<n>`: a Christmas-evening welcome a friend opens from a WeChat chat (or
any link). Mounted by `src/app/invite/page.tsx`; nothing in the game, snow scene or scenery is changed.

1. The paper loading screen (from `@/features/loading`) shows Rachel's mouse-with-a-letter while the scene loads; its
   snowball rolls through the snow strip and bursts.
2. Behind it, the real snow scene and the village in the cosy evening (`setTimeOfDay(1)`): snowfall, the lamp, the
   fairy lights, the Christmas tree, a very slow camera drift (`InviteBackdrop.tsx`). The scene's own corner buttons
   and help line are hidden on this page.
3. In front (`InviteCard.tsx`): the mouse hops in and an envelope drops. A tap opens it (flap folds back, the berry
   seal pops, a soft bell `playTie` then a sparkle `playStarHit` from `src/lib/audio.ts`, only after the tap); with no
   tap it opens by itself after `timing.autoOpen`, silently. The card says "**{name}** 邀请你来打一局雪仗 ❄️" (or
   "有人邀请你来打一局雪仗 ❄️"), "TA 打了 {score} 分，你能赢吗？" when a score came along, and one big
   "接受挑战 / Play" button to `/?from=<name>` (the game ignores it for now; one day it can say "vs {name}").
   Chinese first, English beneath in small text.
4. The sender, arriving here from the share sheet inside WeChat, also sees the "tap ··· to send" note once
   (`SHARE.invite.sentKey` in sessionStorage).

## The link

`link.ts` makes and reads it, for both sides: `invitePath`, `readInvite`, `gamePath`, `inviteTitle`. Only a name
(at most `link.nameMax` = 12 characters; control characters and `< >` dropped) and a whole-number score
(0 to `link.scoreMax`) travel. Nothing else.

## WeChat's chat card

WeChat ignores Open Graph without an Official Account. It takes the page `<title>`, the description meta and the first
`<img>` in `<body>` of at least 300 × 300. So:

- `generateMetadata` sets "{name} 邀请你来打雪仗 · Plop!" (server), and `InviteCard` sets `document.title` and the
  description again in the browser, because the address is read at request time (Cache Components) and WeChat is
  not on Next.js's list of bots that get the title in `<head>` up front.
- the first body image is `public/assets/invite/invite-square.jpg` (600 × 600): Rachel's mouse cut-out on `--paper`,
  made by `python3 scripts/make_invite_card.py` (no drawing, just placed on paper).

## Files

- `content.ts` every word (zh / en), the art, timings, the camera views and drift. Tune here.
- `link.ts` the link. `InviteBackdrop.tsx` the evening scene. `InviteCard.tsx` the envelope, card and button.
- `review/` screenshots and the envelope sequence for the PR.

Reduce motion: no drift, no hops; the envelope still opens (instantly) and the bell still rings after a tap.
