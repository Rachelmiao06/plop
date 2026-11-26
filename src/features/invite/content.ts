/**
 * Words, art and feel numbers for the invite card page (`/invite`). Chinese first, English beneath.
 * Tune here; the components read everything from this file.
 */
export const INVITE = {
  link: {
    /** Longest name kept in a link, in characters (a Chinese character counts as one). */
    nameMax: 12,
    /** Highest score kept in a link. */
    scoreMax: 999,
    /** Invite group id (`?g=`): exactly this many URL-safe characters (A-Z a-z 0-9 _ -), same rule as the leaderboard. */
    groupLength: 8,
  },

  /**
   * Preset wagers the inviter can add (Rachel: presets only, never typed): a short code travels in the link (`w=`),
   * checked against this list. The end card names the loser with the line. Kind and silly, never mean.
   */
  wagers: {
    label: "add a wager (optional)",
    none: "no wager",
    /** On the invite page, under "X invites you": "赌注：输的人请喝热可可 ☕" (the lines are Chinese: the fun is there). */
    stake: "赌注",
    /** A tie: nobody pays. */
    tie: "平手！赌注留到下一局",
    lines: [
      { code: "cocoa", emoji: "☕", zh: "输的人请喝热可可", loserZh: "要请喝热可可啦" },
      { code: "song", emoji: "🎤", zh: "输的人唱一首歌", loserZh: "要唱一首歌啦" },
      { code: "penguin", emoji: "🐧", zh: "输的人学企鹅走路", loserZh: "要学企鹅走路啦" },
      { code: "selfie", emoji: "📸", zh: "输的人发一个丑照", loserZh: "要发一张丑照啦" },
      { code: "icecream", emoji: "🍦", zh: "输的人请吃冰淇淋", loserZh: "要请吃冰淇淋啦" },
      { code: "praise", emoji: "💐", zh: "输的人夸赢家三句", loserZh: "要夸赢家三句啦" },
    ],
  },

  /** The group's board on the card (when the link has a group): how many rows. */
  board: { limit: 5 },

  meta: {
    /** `{name}` is replaced. Also the WeChat chat card title. */
    title: "{name} 邀请你来打雪仗 · Plop!",
    titleNoName: "有人邀请你来打雪仗 · Plop!",
    description: "接受挑战，在雪地里滚一个大雪球！",
    descriptionScore: "TA 打了 {score} 分，你能赢吗？",
  },

  /**
   * The ≥ 300 × 300 first image in <body> WeChat uses for its chat card: "Plop!" with Rachel's sliding penguin on
   * `--snow-white`, like the opening page, made by `scripts/make_invite_card.py` from her existing art.
   */
  squareImage: { src: "/assets/invite/invite-square.jpg", size: 600 },

  /** Rachel's cut-outs, used as they are. */
  art: {
    lights: { src: "/assets/scenery/fairy-lights.webp", width: 512, height: 267 },
  },

  words: {
    /** One language per line (Rachel): the invite's fun is in Chinese; plain buttons are simple English. */
    /** `{name}` is replaced; the name is drawn bold. */
    invite: "{name} 邀请你来打一局雪仗 ❄️",
    inviteNoName: "有人邀请你来打一局雪仗 ❄️",
    score: "TA 打了 {score} 分，你能赢吗？",
    play: "Play",
    /** Under the play button: opens the group's board (kept off the first screen: one action there). */
    board: { show: "see the board", hide: "hide" },
    /** Under the loading strip while the snowball rolls. */
    loading: "雪球滚过来啦…",
    /** Shown to the sender after making an invite inside WeChat (Chinese: WeChat's own menu is Chinese). */
    sendHint: "点右上角 ··· 发给朋友",
  },

  timing: {
    /** The card's springy pop out of the snowball's puff (ms). */
    cardIn: 820,
  },

} as const;
