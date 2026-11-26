/** Words, art and layout numbers for the share poster. Tune here; `draw.ts` only reads these. */
export const POSTER = {
  /** The image itself: a tall 3:4 phone-friendly card (px). */
  size: { width: 1080, height: 1440 },

  /** Colours are read from these tokens in `src/app/globals.css` when drawing (canvas cannot use `var()`). */
  tokens: {
    page: "--snow-white",
    ink: "--ink",
    inkDeep: "--ink-deep",
    snow: "--snow-shadow",
    berryDeep: "--berry-deep",
  },
  /** The heading font's CSS variable (Gaegu, from `next/font` in the layout). Chinese falls back to the system font. */
  fontVar: "--font-gaegu",
  fontFallback: '"Comic Sans MS", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", cursive, sans-serif',

  /** Rachel's art only (existing files). */
  art: {
    penguin: "/assets/scenery/penguin-slide.webp",
    bucket: "/assets/scenery/thrower-bucket.webp",
    redHat: "/assets/scenery/thrower-redhat.webp",
    star: "/assets/effects/star.webp",
    notes: "/assets/effects/music-notes.webp",
    ring: "/assets/effects/snow-ring.webp",
    puff: "/assets/effects/snow-puff.webp",
  },

  /** The pencil line: stroke width (px at poster size), how far it wanders, a fainter second pass. */
  pencil: { width: 5, wobble: 3.2, step: 26, secondPass: 0.35 },
  /** Little snow dots scattered over the page. */
  snow: { count: 64, minR: 3, maxR: 10, seed: 7 },

  text: {
    title: "Plop!",
    /** On the picture itself, Chinese only: it goes to WeChat Moments, and one language per line (Rachel). */
    solo: (name: string, score: number) => `${name} 打了 ${score} 分`,
    team: (a: string, b: string, total: number) => `${a} & ${b} 一起打了 ${total} 分`,
    wins: (name: string) => `${name} 赢啦！`,
    tie: "平手！",
    invite: "来跟我打一局雪仗 ❄️",
    scan: "扫码接受挑战",
    meta: (rounds: number | null, date: Date) => {
      const d = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
      return rounds ? `${rounds} 局 · ${d}` : d;
    },
  },

  /** The sheet that shows the poster. */
  sheet: {
    /** Simple English; the WeChat line in Chinese (it is about WeChat's own press-and-hold menu). */
    button: "Make a poster",
    title: "my poster",
    drawing: "drawing…",
    failed: "the poster didn't draw, try again?",
    wechat: "长按图片保存，发朋友圈",
    save: "save",
    share: "share",
    close: "close",
    alt: "Plop! poster with my score and a QR code to play",
    file: "plop-poster.png",
  },

  /**
   * The rounds of the match, when the end card is not told: last time's start choice (`GAME.start.choiceKey` in the
   * game feature, read here as plain JSON so the poster does not import the game).
   */
  choiceKey: "plop.start",
} as const;
