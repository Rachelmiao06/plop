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
  },

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
    mouse: { src: "/assets/scenery/mouse-letter.webp", width: 416, height: 412 },
    lights: { src: "/assets/scenery/fairy-lights.webp", width: 512, height: 267 },
  },

  words: {
    /** `{name}` is replaced; the name is drawn bold. */
    invite: { zh: "{name} 邀请你来打一局雪仗 ❄️", en: "{name} invites you to a snowball fight" },
    inviteNoName: { zh: "有人邀请你来打一局雪仗 ❄️", en: "Someone invites you to a snowball fight" },
    score: { zh: "TA 打了 {score} 分，你能赢吗？", en: "They scored {score}. Can you beat it?" },
    play: { zh: "接受挑战", en: "Play" },
    tapToOpen: { zh: "点一下，拆开信封", en: "tap to open" },
    /** Under the loading strip while the snow scene loads. */
    loading: { zh: "信封在路上…", en: "your invite is on its way…" },
    /** Shown to the sender after making an invite inside WeChat. */
    sendHint: { zh: "点右上角 ··· 发给朋友", en: "tap ··· to send this card to a friend" },
  },

  timing: {
    /** After the scene is ready: the mouse hops in, then the envelope drops (ms). */
    mouseIn: 900,
    envelopeIn: 650,
    /** If nobody taps, the envelope opens by itself after this (ms), silently (sound needs a tap). */
    autoOpen: 4200,
    /** The flap folding back (ms), then the card sliding out (ms). */
    flap: 520,
    cardOut: 700,
    /** The bell, a moment after the flap starts (ms). */
    bellAt: 120,
  },

  /**
   * The camera's resting view (snow scene units, see `useSnowCameraView`): looking into the cosy corner of the
   * village, where the street lamp, the cottages, the Christmas tree and the fairy lights stand (scenery layout,
   * x around -3). A phone held upright (narrower than `phoneMaxAspect`) stands further back so they still show
   * around the card.
   */
  view: { lookAt: [-2.4, 0.45, -5.2], pathAt: 0.22, distance: 1.05, turn: 0 },
  phoneView: { lookAt: [-3.3, 0.55, -5.5], pathAt: 0.12, distance: 1.6, turn: 0 },
  phoneMaxAspect: 0.8,

  /** A very slow drift of the camera so the evening scene breathes behind the card. */
  drift: {
    /** Seconds per sway (side to side, and in and out). */
    swaySeconds: 34,
    breatheSeconds: 19,
    /** How far the look-at point sways (scene units) and how much closer the camera breathes (share, 0..1). */
    sway: 0.3,
    breathe: 0.04,
    /** Spring rate of the shot: low = lazy. */
    rate: 0.8,
  },
} as const;
