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

  /**
   * "Invite a friend": a little sheet that makes a link to the invite card (`/invite?from=<name>&score=<n>`). One
   * language per line: simple English, and the WeChat note in Chinese (WeChat's own menu is Chinese).
   */
  invite: {
    /** `{name}` is replaced: the name from the start card, or the snowman's default. Never sent empty. */
    title: "invite a friend, signed {name}",
    change: "change",
    name: "your name",
    /** `{score}` is replaced: the best total kept on this device after a match alone. */
    score: "include my best score: {score}",
    send: "send invite",
    plain: "just share the game",
    close: "close",
    /** What a share sheet says along with the link. `{name}` is replaced (never empty). */
    text: "{name} 邀请你来打一局雪仗 ❄️",
    copied: "invite link copied!",
    /** Inside WeChat: the link is copied, and the card page opens so "···" sends it as a proper card. */
    wechat: "链接已复制。点右上角 ··· 把卡片发给朋友",
    /** The invite page shows the sender the "···" hint once, when this is set (sessionStorage). */
    sentKey: "plop.invite.sent",
    /** This device's invite group id (localStorage), see `group.ts`. */
    groupKey: "plop.group",
  },

  copied: "link copied!",
  copyFailed: "copy the address bar to share",
} as const;
