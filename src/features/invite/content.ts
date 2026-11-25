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

  /** The group's board on the card (when the link has a group): how many rows. */
  board: { limit: 5 },

  meta: {
    /** `{name}` is replaced. Also the WeChat chat card title. */
    title: "{name} 邀请你来打雪仗 · Plop!",
    titleNoName: "有人邀请你来打雪仗 · Plop!",
    description: "接受挑战，在雪地里滚一个大雪球！Paper bowling on snow. Plop!",
    descriptionScore: "TA 打了 {score} 分，你能赢吗？Paper bowling on snow. Plop!",
  },

  /**
   * The ≥ 300 × 300 first image in <body> WeChat uses for its chat card: Rachel's mouse-with-a-letter cut-out on
   * paper, made from `public/assets/scenery/mouse-letter.webp` by `scripts/make_invite_card.py`.
   */
  squareImage: { src: "/assets/invite/invite-square.jpg", size: 600 },

  /** Rachel's cut-outs, used as they are. */
  art: {
    lights: { src: "/assets/scenery/fairy-lights.webp", width: 512, height: 267 },
  },

  words: {
    /** `{name}` is replaced; the name is drawn bold. */
    invite: { zh: "{name} 邀请你来打一局雪仗 ❄️", en: "{name} invites you to a snowball fight" },
    inviteNoName: { zh: "有人邀请你来打一局雪仗 ❄️", en: "Someone invites you to a snowball fight" },
    score: { zh: "TA 打了 {score} 分，你能赢吗？", en: "They scored {score}. Can you beat it?" },
    play: { zh: "接受挑战", en: "Play" },
    /** Under the loading strip while the snowball rolls. */
    loading: { zh: "雪球滚过来啦…", en: "a snowball is rolling your way…" },
    /** Shown to the sender after making an invite inside WeChat. */
    sendHint: { zh: "点右上角 ··· 发给朋友", en: "tap ··· to send this card to a friend" },
  },

  timing: {
    /** The card's springy pop out of the snowball's puff (ms). */
    cardIn: 820,
  },

} as const;
