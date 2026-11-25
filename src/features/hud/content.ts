/**
 * Score display: words, timings and feel numbers. Tune here; components never
 * hard-code one. Colours are token names from src/app/globals.css.
 */
export const content = {
  text: {
    panelLabel: "Score",
    down: "down",
    hide: "Hide the score",
    show: "Show the score",
    musicOn: "Music is on. Tap to turn it off.",
    musicOff: "Music is off. Tap to turn it on.",
    musicWaiting: "Music is on and starts on your first tap.",
    effectsOn: "Sound effects are on. Tap to turn them off.",
    effectsOff: "Sound effects are off. Tap to turn them on.",
    turn: (name: string) => `${name}'s turn`,
    total: (name: string, total: number) => `${name}: ${total}`,
    set: (down: number, total: number) => `${down} of ${total} down`,
    round: (now: number, of: number) => `round ${now} / ${of}`,
    roundLabel: (now: number, of: number) => `Round ${now} of ${of}`,
    soloBest: "best",
    /** Arrived from an invite, playing alone: the right side shows the inviter's score to beat. */
    toBeat: "to beat",
    gain: (points: number) => `+${points}`,
    /**
     * The start cards (StartFlow.tsx): English leads, Chinese beneath. Two cards: how you play ("just me" a small option
     * on top), then names, rounds and "Let's roll!"; "how to throw" is a link.
     */
    start: {
      title: "Plop!",
      label: "Start a game",
      back: { zh: "返回", en: "back" },
      step: (n: number, of: number) => `step ${n} of ${of}`,
      solo: {
        zh: "就我自己",
        en: "Just me",
        line: { zh: "一个雪人，挑战自己的最高分", en: "one snowman, beat your own best" },
      },
      how: { zh: "你们俩怎么玩？", en: "How do you two play?" },
      /** The small side option on top of the first card. */
      soloSide: { zh: "一个人玩", en: "Just me" },
      turns: {
        zh: "轮流打",
        en: "Take turns",
        line: { zh: "一人滚一球，再换另一个，像打保龄球", en: "one rolls, then the other, like bowling" },
      },
      together: {
        zh: "一起打",
        en: "At the same time",
        line: { zh: "两个雪人同时站上线，各用各的键", en: "both snowmen on the line, each with their own keys" },
        lineTouch: { zh: "两个雪人同时站上线，各拖各的雪人", en: "both on the line, each drags their own snowman" },
      },
      /** The key pictures under "at the same time" (GAMEPLAY 7d): pull key on top, slide keys below. */
      keys: { left: { pull: "W", slide: ["A", "D"] }, right: { pull: "↑", slide: ["←", "→"] } },
      name: { zh: "你叫什么？", en: "What's your name?" },
      names: { zh: "你们叫什么？", en: "Your names" },
      nameHint: (fallback: string) => ({ zh: `不填就叫 ${fallback}`, en: `leave it empty to be ${fallback}` }),
      namesHint: (a: string, b: string) => ({ zh: `不填就叫 ${a} 和 ${b}`, en: `leave them empty to be ${a} and ${b}` }),
      /** Shown inside an empty field: the snowman's cute default, used if it stays empty. */
      namePlaceholder: (fallback: string) => fallback,
      nameLabel: (fallback: string) => `${fallback}'s name`,
      length: { zh: "玩几局？", en: "How many rounds?" },
      rounds: (n: number) => ({ zh: `${n} 局`, en: `${n} rounds` }),
      minutes: (m: number) => ({ zh: `大约 ${m} 分钟`, en: `about ${m} min` }),
      howTo: { zh: "怎么滚雪球", en: "How to throw" },
      howToFirst: { zh: "第一次玩？看看怎么滚", en: "New here? How to throw" },
      /** The how-to card's lines: [zh, en]; the first differs on a touch screen. */
      howLines: (touch: boolean) =>
        [
          touch
            ? ["把雪人往后拉", "drag the snowman back"]
            : ["按住空格，或把雪人往后拉", "hold Space or drag the snowman back"],
          ["松手，雪球就滚出去", "let go to roll"],
          ["能撞倒几个算几个", "knock down as many as you can"],
          ["每局有一个小规则", "each round has one small rule"],
        ] as const,
      space: "Space",
      go: { zh: "开滚！", en: "Let's roll!" },
      gotIt: { zh: "知道啦", en: "got it" },
      /** A returning player: last time's choices, one tap to play. */
      welcome: { zh: "又见面啦！", en: "Welcome back" },
      same: { zh: "和上次一样", en: "Same as last time" },
      change: { zh: "换个玩法", en: "something else" },
      help: "How to throw",
    },
    end: {
      label: "Match over",
      wins: (name: string) => `${name} wins!`,
      cheer: "hooray!",
      kind: (name: string) => `lovely rolling, ${name}`,
      tie: "A snowy tie!",
      tieKind: "two crowns today",
      solo: "Your snowy total",
      newBest: "a new best!",
      best: (n: number) => `best so far: ${n}`,
      bestThrow: (name: string, points: number, round: number) => `best roll: ${name}, +${points} in round ${round}`,
      /** Alone after a friend's invite: how it went against their score (kind either way). */
      beatRival: (name: string, score: number) => `you beat ${name}'s ${score}!`,
      tiedRival: (name: string) => `just like ${name}!`,
      underRival: (name: string, score: number) => `${name} has ${score} · so close!`,
      again: "Play again",
      choose: "换个玩法 · change how we play",
      points: (n: number) => `${n} points`,
    },
  },

  /** Token colour per snowman look: the bar fills with the active player's colour. */
  looks: {
    bucket: { hat: "var(--sky-blue)", scarf: "var(--mint)", fill: "var(--sky-blue)" },
    redHat: { hat: "var(--berry)", scarf: "var(--berry)", fill: "var(--berry)" },
  },

  /** The hand-drawn pencil line. */
  pencil: {
    /** Stroke width in pixels. */
    width: 1.7,
    /** How far the line wanders from the true shape, in pixels. */
    wobble: 0.9,
    /** Pixels between wobble points. Smaller = more nervous line. */
    step: 16,
    /** A second, fainter pass slightly off the first, like a pencil gone over twice. */
    secondPass: 0.35,
    /** How far the line runs past its start, in pixels (pencil outlines rarely close exactly). */
    overshoot: 10,
    /** Pressure: how much the weight swells and thins along a line (0 = even, 0.45 = ±45%). */
    pressure: 0.4,
    /** How much darker and lighter the line gets along with the pressure (0..1). */
    darkness: 0.2,
    /** Curve segments per piece of line; each piece has one weight. Smaller = more changes. */
    piece: 2,
  },

  /** The frosted glass: blur of the snow behind, and how much paper white shows. */
  glass: {
    blur: "14px",
    /** Share of paper white over the blurred snow, 0..100. Paper first, glass second (#31; was 52). */
    tint: 70,
    /** Extra paper white by evening (time of day 1), so the panel stays a lit paper note on the dark snow. */
    evening: 16,
  },

  /** The paper inside the panels (#31): grain and a faint coloured-pencil wash. */
  paper: {
    /** Strength of the --ink paper grain (0..1). */
    grain: 0.09,
    /** Grain size: noise frequency and tile in px. */
    grainFrequency: 0.85,
    grainTile: 140,
    /** The coloured-pencil wash: strength, gap between strokes (px), angle (deg). Afternoon --snow-shadow, evening --butter. */
    wash: 0.3,
    washGap: 6,
    /** Height of one hatched band (px); bands overlap a little. */
    washBand: 22,
    washAngle: -28,
  },

  /** The active player's halo: a --butter crayon ring scribbled a few times round (replaces the soft gradient glow). */
  halo: {
    /** Crayon weight (px at 60 px across) and how many times round. */
    width: 3.4,
    passes: 3,
    /** Strength of the light crayon fill inside the ring (0..1). */
    fill: 0.32,
  },

  /** The progress bar. */
  bar: {
    height: 20,
    /** Strength of the light colour wash under the hatching, 0..1. */
    wash: 0.5,
    /** Spring that moves the fill: stiffness and damping (springy, a little bounce). */
    stiffness: 170,
    damping: 14,
    /** Coloured-pencil hatch: gap between strokes and their angle. */
    hatchGap: 4.5,
    hatchAngle: -32,
    /** How hand-made the hatch is (0 = even machine strokes, 1 = uneven gaps, lengths, a light second layer). */
    hatchMess: 1,
    /** How ragged the fill's leading edge is, in pixels. */
    edgeJag: 2.2,
  },

  /** "+1" that flies up from the lane into the bar. */
  plusOne: {
    /** Milliseconds of flight. */
    duration: 900,
    /** Milliseconds between two "+1"s from the same throw. */
    stagger: 140,
    /** How far below the bar they start, in pixels. */
    rise: 90,
  },

  /**
   * A throw's points flying into the thrower's total (the round total: each player throws once a round): how
   * long it flies (ms), from how far below (px), and when the total takes the new number (share of the flight).
   */
  gain: { duration: 1100, rise: 150, landAt: 0.7 },

  /**
   * The guided start: how far a step slides in (px) and for how long (ms), and the how-to card's little loop (ms).
   */
  flow: { slide: 36, slideFor: 380, howToLoop: 3600 },

  /** The end card's big snowman faces and crown (px). */
  end: { face: 76, crown: 44 },

  /** Burst of star and surprise lines when the set is cleared. */
  burst: {
    duration: 1400,
  },

  /** Number pop when a total goes up: a squash-and-stretch bounce. */
  pop: {
    duration: 480,
  },

  /**
   * The bar gives a little springy bump when a "+1" drops into it: how long, how much it stretches up
   * and squashes (share of its height), and when, as a share of the "+1" flight (it lands at about 0.72).
   */
  bump: {
    duration: 420,
    squash: 0.22,
    at: 0.72,
  },
} as const;

export type SnowmanLook = keyof typeof content.looks;
