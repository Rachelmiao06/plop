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
    /** Team up: one total for both snowmen. */
    team: "team",
    teamTotal: (a: string, b: string, total: number) => `Team ${a} and ${b}: ${total}`,
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
      /** Taking turns is a match against each other (PK); at the same time is one team adding up its points. */
      turns: {
        zh: "轮流打",
        en: "Take turns",
        tag: { zh: "PK", en: "versus" },
        line: { zh: "你一球我一球，看谁分高", en: "one rolls, then the other; most points wins" },
      },
      together: {
        zh: "组队打",
        en: "Team up",
        tag: { zh: "组队", en: "one team" },
        line: { zh: "两个人同时打，分数加在一起", en: "both roll at once, your points add up" },
        lineTouch: { zh: "两个人同时打，各拖各的雪人，分数加在一起", en: "both roll at once, each drags their own; points add up" },
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
      minutes: (m: number) => ({ zh: `约 ${m} 分钟`, en: `~${m} min` }),
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
    /**
     * The end of a match, in steps (Rachel: one crowded card was too much): 1 the result (the snowball scene, then
     * one line, then the wager), 2 the board, 3 the poster. One language per line: the result lines in Chinese (the
     * fun is there), plain buttons in simple English.
     */
    end: {
      label: "Match over",
      /** Step 1: who won and by how much, once the snowballs have landed. */
      wins: (name: string, theirs: number, other: number) => `${name} ${theirs} : ${other} 赢啦！`,
      tie: (score: number) => `平局！${score} : ${score}`,
      team: (total: number) => `一起打了 ${total} 分！`,
      teamKind: (a: string, b: string) => `lovely teamwork, ${a} & ${b}`,
      /** Alone with nobody to beat: the total and how it went. */
      solo: (total: number) => `打了 ${total} 分！`,
      newBest: "a new best!",
      best: (n: number) => `best so far: ${n}`,
      next: "Next",
      again: "Play again",
      choose: "change how we play",
      /** Step 2's small heading. */
      board: "put it on the board",
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

  /**
   * The victory moment on the end card (Celebration.tsx). Seconds unless noted; sizes in px at the end card's face
   * size. Art: Rachel's snowball (one ball cropped from `snowball-pile`), snow puff, snow ring and snow mound, and her
   * six expression faces (`public/assets/hud/faces/`).
   */
  celebrate: {
    /** Wait for the card's own pop-in before the first throw. */
    startDelay: 0.5,
    /** Versus: the winner pelts the loser, faster and faster, for `duration`. */
    versus: {
      /** About 2 s of snowballs before the result line (Rachel: short, then "Red Hat 13 : 6 赢啦！"). */
      duration: 2.1,
      firstGap: 0.42,
      lastGap: 0.11,
      /** The first throw's flight time and the fastest one's. */
      flight: [0.46, 0.28] as const,
      /** Hits before the loser's face turns surprised, then dizzy. */
      surprisedAt: 1,
      dizzyAt: 5,
    },
    /** Tie: both throw at each other at once. */
    tie: {
      duration: 1.9,
      firstGap: 0.5,
      lastGap: 0.17,
      flight: [0.46, 0.32] as const,
      dizzyAt: 6,
    },
    /** Team up: both throw snowballs up, then the snow falls back on them like confetti. */
    team: {
      throws: 5,
      throwGap: 0.24,
      /** How high a thrown-up ball goes, as a share of the face size. */
      up: 1.4,
      upFlight: 0.55,
      /** Snow bits falling back, when they start (after the first throw), how long they fall. */
      confetti: 30,
      fallFrom: 0.7,
      fall: [1.1, 1.9] as const,
      /** Share of the bits that land on a head (and pile up there). */
      onHeads: 0.35,
      duration: 3.2,
    },
    /** Just me: snow confetti and the crown popping on for a new best; otherwise a little cheer. */
    solo: {
      confetti: 18,
      bestDuration: 2.4,
      cheerDuration: 1.1,
      crownAt: 0.25,
    },
    /** Arc height as a share of the distance (at least `arcMin` px), and how far a hit lands from the face centre. */
    arc: 0.38,
    arcMin: 22,
    aim: 0.16,
    /** Snowball in flight, splat puff and ring, a confetti bit (smallest and biggest). */
    ball: 15,
    puff: 36,
    ring: 44,
    bit: [6, 12] as const,
    /** The snow pile on the head: full width, size per hit (it starts at `first`), and puffs stuck on the face. */
    mound: {
      width: 70,
      first: 0.3,
      perHit: 0.08,
      faceBits: [3, 6, 9] as const,
      faceBit: 18,
    },
    /** The hit wobble: a little spring (degrees per hit, stiffness, damping). */
    wobble: { kick: 10, stiffness: 240, damping: 11, max: 16 },
    /** The throw: the thrower leans toward the target (degrees) for this long (ms). */
    lean: { angle: 8, ms: 170 },
    /** The end: the loser shakes the snow off (ms, degrees), the winner hops (px, ms, how many). */
    shake: { ms: 720, swing: 10 },
    hop: { height: 14, ms: 460, count: 2 },
    /** How long after the last hit the ending starts, and after the ending the rest of the card settles in. */
    endAfter: 0.35,
    settleAfter: 0.6,
    /** The loser looks sulky this long, then calm again. */
    sulkFor: 2.4,
    /** How the totals, lines and buttons fade in (ms). */
    reveal: 420,
    /** Each hit: a soft plop (the recorded snowball, smallest size) and a light buzz. */
    plop: 0.05,
    buzz: 0.5,
  },

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
