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
    /**
     * The end card's result (Rachel: "QA 输了，快去学企鹅走路吧！"): the small stake line, then `lost` for the loser (the
     * winner's name for the lines that need it), or `tie` + `noOne` ("平局！这次谁都不用学企鹅走路 😆"). Chinese only.
     */
    stakeLine: (zh: string, emoji: string) => `赌注 · ${zh} ${emoji}`,
    lost: (loser: string, what: string) => `${loser} 输了，${what}`,
    tie: (noOne: string) => `平局！${noOne} 😆`,
    lines: [
      { code: "cocoa", emoji: "☕", zh: "输的人请喝热可可", lost: () => "快请大家喝热可可吧 ☕", noOne: "这次谁都不用请热可可" },
      { code: "song", emoji: "🎤", zh: "输的人唱一首歌", lost: () => "快给大家唱一首歌吧 🎤", noOne: "这次谁都不用唱歌" },
      { code: "penguin", emoji: "🐧", zh: "输的人学企鹅走路", lost: () => "快去学企鹅走路吧！", noOne: "这次谁都不用学企鹅走路" },
      { code: "selfie", emoji: "📸", zh: "输的人发一个丑照", lost: () => "快发一张丑照吧 📸", noOne: "这次谁都不用发丑照" },
      { code: "icecream", emoji: "🍦", zh: "输的人请吃冰淇淋", lost: () => "快请大家吃冰淇淋吧 🍦", noOne: "这次谁都不用请冰淇淋" },
      { code: "praise", emoji: "💐", zh: "输的人夸赢家三句", lost: (winner: string) => `夸 ${winner} 三句吧 💐`, noOne: "这次谁都不用夸人" },
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
