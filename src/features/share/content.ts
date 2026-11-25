/** Words and numbers for sharing the game. Tune here. */
export const SHARE = {
  /** What a share sheet or a pasted link says. */
  title: "Plop!",
  text: "Paper bowling on snow: pull a snowman back, roll a snowball, let go. Plop!",

  /**
   * The square card WeChat picks for a chat link when there is no Official Account: the first image in the page
   * body, at least 300 x 300. Same art as the Open Graph card (`src/app/opengraph-image.png`).
   */
  squareImage: { src: "/share/plop-square.jpg", size: 600 },

  button: {
    label: "Share Plop!",
    /** How long the "copied!" note stays (ms). */
    copiedFor: 1800,
  },

  wechat: {
    /** Shown inside WeChat, which blocks sharing from a page without its JS-SDK. */
    hint: "tap ··· to send to a friend",
    small: "tap anywhere to close",
  },

  copied: "link copied!",
  copyFailed: "copy the address bar to share",
} as const;
