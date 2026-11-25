# share

Sharing the game, especially as a link in WeChat. Mounted in `src/app/page.tsx`; the game is not touched.

- `WeChatShareImage.tsx` a 600 × 600 copy of the share card art (`public/share/plop-square.jpg`) as the **first image
  in `<body>`**, loaded but invisible (1 px, opacity 0, never `display: none`). WeChat ignores Open Graph; without an
  Official Account it builds a chat card from `<title>`, the `description` meta and the first body image of at least
  300 × 300. Keep it first: anything that adds an image above it on the home page breaks the WeChat card.
- `ShareButton.tsx` the round hand-drawn button bottom-left (the game's "Put it down" is bottom-right):
  - inside WeChat (`MicroMessenger` in the user agent): a paper note with an arrow to WeChat's top-right "···" menu,
    because WeChat blocks sharing from a page without its JS-SDK;
  - with the Web Share API (phones, Safari, Chrome on Mac / Windows): the system share sheet;
  - otherwise: copies the link and says "link copied!".
- `content.ts` the words, the square image path, how long the note stays.
- `review/` screenshots.

The full WeChat picture (what works today, what needs a domain, ICP filing and an Official Account) is in the repo
README under "Sharing in WeChat".
