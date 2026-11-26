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
    solo: (name: string, score: number) => ({ zh: `${name} 打了 ${score} 分`, en: `${name} scored ${score}` }),
    team: (a: string, b: string, total: number) => ({ zh: `${a} & ${b} 一起打了 ${total} 分`, en: `team total ${total}` }),
    wins: (name: string) => ({ zh: `${name} 赢啦！`, en: `${name} wins!` }),
    tie: { zh: "平手！", en: "a tie!" },
    invite: { zh: "来跟我打一局雪仗 ❄️", en: "Come snowball with me" },
    scan: { zh: "扫码接受挑战", en: "scan to play" },
    meta: (rounds: number | null, date: Date) => {
      const d = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
      return rounds ? `${rounds} 局 · ${rounds} rounds · ${d}` : d;
    },
  },

  /** The sheet that shows the poster. */
  sheet: {
    button: { zh: "生成海报", en: "Make a poster" },
    title: { zh: "我的海报", en: "my poster" },
    drawing: { zh: "正在画海报…", en: "drawing…" },
    failed: { zh: "海报没画出来，再试一次？", en: "the poster didn't draw, try again?" },
    wechat: { zh: "长按图片保存，发朋友圈", en: "Press and hold to save" },
    save: { zh: "保存图片", en: "save" },
    share: { zh: "分享", en: "share" },
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
