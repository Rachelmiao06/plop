# poster

A share poster made from the end card: a tall 1080 × 1440 PNG on `--snow-white` for WeChat Moments, which cannot post
links, so a saved image with a QR code is how the game spreads there.

- `PosterButton.tsx` "生成海报 · Make a poster" on the end card (`MatchEnd` in `src/features/hud/Match.tsx` mounts it
  with the players, solo / team and, when given, the rounds). A tap draws the poster and opens the sheet. The QR code
  opens the player's invite link, `/invite?g=<group>&from=<name>&score=<n>` (`invitePath` from `@/features/invite`;
  the group from `ensureGroupId()`, made on this device if it has none; a team's total is not one person's, so a team
  poster's link carries no score). Tracks `poster_made` with only the mode (solo / versus / team), never a name.
- `draw.ts` draws it on a canvas: paper white, snow dots, a wobbly pencil frame, "Plop!" in Gaegu, Rachel's snowman
  cut-outs and sliding penguin and her star / music-note / snow doodles (files in `public/assets/`, never redrawn),
  "Rachel 打了 23 分" (both names and scores for versus, "A & B 一起打了 41 分" for team), "来跟我打一局雪仗 ❄️ · Come
  snowball with me", rounds and today's date, and the QR code in `--ink-deep` with a white quiet zone. Fonts are loaded
  (`document.fonts.load`) and images decoded before drawing. Colours are read from the tokens at draw time.
- `PosterSheet.tsx` shows it as a plain `<img>` with a PNG data URL (WeChat lets you press and hold an image to save
  it; a canvas cannot be saved that way). Inside WeChat: "长按图片保存，发朋友圈 · Press and hold to save". Elsewhere: a
  "保存图片 · save" download, and "分享 · share" with the file where `navigator.canShare({ files })` says yes. Rendered
  into `document.body`, because the end card's frosted glass would trap a fixed overlay.
- `qr.ts` the QR squares from the `qrcode` package's core (`create`, error correction M); `qrcode.d.ts` its one type.
- `content.ts` words, art paths, size, pencil and snow numbers, the token names.

Rounds: `MatchEnd` takes an optional `rounds`; until the game passes it (`rounds={state.rounds}` in `Game.tsx`), the
poster uses last time's start choice on this device (`plop.start`), which is the match just played.

Screenshots in `review/`.
