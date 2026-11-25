/**
 * Every feel number of the pins (toppling cut-outs) and the formations. Tune here; the logic never
 * hard-codes one. Units: one scene unit = one character height, seconds, units per second.
 * `x` runs left to right, `z` from far down the lane toward the camera (the lane points to -z).
 */
import type { PropId } from "@/features/scenery";

export type Weight = "light" | "medium" | "heavy";

export const PINS = {
  world: {
    /** A little stronger than real gravity so paper flops instead of floating down. */
    gravity: -13,
    /** Physics steps per second (fixed step, interpolated for drawing). */
    stepsPerSecond: 60,
  },

  /** The snow as the physics sees it: a height grid sampled from the snow scene once, around the pin spot. */
  ground: {
    /** Width and depth of the sampled patch (centred on the pin spot). */
    span: 14,
    /** Grid squares per side (span / cells = spacing between samples). */
    cells: 56,
    friction: 0.9,
    restitution: 0.1,
  },

  card: {
    /** The collider is this share of the drawing's height (the file includes floating snow dots on top). */
    heightShare: 0.88,
    /** And this share of its width (drawings are rounded, so the corners of the box are empty air). */
    widthShare: 0.78,
    /** Card thickness as a share of its height. Same as the scenery look (standee3d.thicknessShare). */
    thicknessShare: 0.035,
    /** The hidden foot that keeps a card standing: how tall it is. Its depth is per weight class below. */
    footHeight: 0.05,
    /** The base sits this far into the snow while standing, so it looks planted. */
    sink: 0.015,
    /**
     * Draw the art on the back too (mirrored, as if seen through the paper), so a card that lands face-down
     * still shows its character instead of a blank white shape.
     */
    artOnBack: true,
    /** Pins face the throwing line; a tiny random turn per pin keeps them from looking machine-placed. */
    yawJitterDegrees: 4,
  },

  /**
   * Per weight class from the scenery manifest. `footShare` is how much of the mass sits in the foot:
   * more = lower centre of mass = steadier. `footDepth` is how deep the foot is front to back: deeper =
   * harder to tip. Light ones tip at a touch, heavy ones need a real hit.
   */
  weight: {
    light: { mass: 0.3, footShare: 0.55, footDepth: 0.07, friction: 0.7, restitution: 0.14, linearDamping: 0.4, angularDamping: 0.7 },
    medium: { mass: 0.5, footShare: 0.6, footDepth: 0.1, friction: 0.8, restitution: 0.12, linearDamping: 0.5, angularDamping: 0.9 },
    heavy: { mass: 0.9, footShare: 0.65, footDepth: 0.16, friction: 0.9, restitution: 0.1, linearDamping: 0.65, angularDamping: 1.1 },
  } satisfies Record<Weight, { mass: number; footShare: number; footDepth: number; friction: number; restitution: number; linearDamping: number; angularDamping: number }>,

  /** Speed limits, so nothing ever flies off absurdly. Checked after every physics step. */
  caps: {
    /** Fastest a card may slide, any direction (units per second). */
    linear: 5.8,
    /** Fastest a card may move upward (a hop, never a launch). */
    up: 2.2,
    /** Fastest a card may spin (radians per second). */
    angular: 13,
  },

  /** The ball as the physics sees it: a pushing sphere following the bowling roll exactly. */
  ball: {
    /** The collider is this share of the drawn ball's radius (a touch smaller, so grazes look fair). */
    radiusShare: 0.95,
    /** The last part of the ball's rest it shrinks away with the drawing (seconds), as the bowling stage does. */
    fadeTime: 0.4,
  },

  /** When a card counts as "down". */
  down: {
    /** Tilted more than this from upright (degrees). */
    tiltDegrees: 50,
    /** Everything counts as settled when no card moves faster than this... */
    settleSpeed: 0.2,
    /** ...or spins faster than this (radians per second)... */
    settleSpin: 0.5,
    /** ...for this long. */
    settleHold: 0.25,
    /** A card already lying in the snow (down and landed) counts as still at this many times those speeds. */
    lyingShare: 4,
    /**
     * The count is certain (and "N down!" pops) as soon as no ball of the throw can touch a card any more (it has
     * burst, see `burst`) and every card has been still for `settleHold`. Give up waiting this long after the
     * ball is clear (cards still rocking count as they are).
     */
    timeoutAfterClear: 1.4,
    /** And this long after the throw at the latest. */
    timeoutAfterLaunch: 12,
  },

  /** When a falling card lands in the snow: a soft dent, a little puff and a paper flop. */
  landing: {
    /** A card has landed when it touches the snow tilted past this (degrees). */
    tiltDegrees: 58,
    /** Dents pressed along the card's length, and their radius as a share of the card's width. */
    dents: 3,
    dentShare: 0.22,
    dentMin: 0.07,
    dentMax: 0.18,
    /** The puff at the card's head: a tiny crater (radius). 0 = no puff. */
    puff: 0.07,
    /** Slower than this (units per second) is a gentle lay-down: quieter sound. */
    softSpeed: 0.8,
    /** At or above this it is a full flop. */
    hardSpeed: 3,
  },

  /** The soft paper "fwump", synthesized for now (a shared recording later). */
  sound: {
    volume: 0.5,
    /** Low-pass filter on the noise: big cards sound lower. */
    filterSmall: 1100,
    filterBig: 520,
    /** Length of the noise puff (seconds). */
    lengthSmall: 0.14,
    lengthBig: 0.26,
    /** The soft low thump under it: start and end pitch (Hz) and its share of the volume. */
    thumpFrom: 150,
    thumpTo: 70,
    thumpLevel: 0.35,
    /** At most this many flops within `burstWindow` seconds; the rest are skipped (a big topple stays soft). */
    burstMax: 4,
    burstWindow: 0.12,
  },

  /** After the count: fallen cards pop back up to their spots. */
  reset: {
    /** Seconds the "N down!" shows before the reset starts. */
    delayAfterResult: 1.9,
    /**
     * A ball resting on the spots (it lingers a few seconds before it melts away) would knock the cards
     * straight over again, so the reset waits for it, at most this many extra seconds. After that the cards
     * pop up anyway; a resting ball no longer pushes once the throw is counted.
     */
    waitForBallMax: 4.5,
    /** Seconds each card takes to pop back. */
    time: 0.6,
    /** Delay between one card and the next (seconds), so they pop up in a little wave. */
    stagger: 0.05,
    /** How high a card hops on the way back. */
    hop: 0.28,
    /** The boing when it lands upright: tilt (degrees), squash share, wobbles per second, settling rate. */
    boingDegrees: 7,
    boingSquash: 0.07,
    boingFrequency: 3.2,
    boingDecay: 4.5,
  },

  /** After a full clear (or the "next set" button): the old set ducks into the snow and a new one hops in. */
  nextSet: {
    /** Seconds the "All down!" shows before the set changes. */
    delayAfterFullClear: 2.4,
    /** Old cards sink into the snow over this long. */
    leaveTime: 0.35,
    leaveStagger: 0.03,
    /** New cards start this far further down the lane and hop in. */
    slideFrom: -2.4,
    arriveTime: 0.75,
    arriveStagger: 0.07,
    /** Height of each little hop on the way in, and how many hops. */
    hop: 0.22,
    hops: 2,
    /** Fresh snow falls on this radius around the pin spot while the set changes, smoothing old dents. */
    clearSnowRadius: 3.2,
  },

  /** The "N down!" pop-up. */
  popup: {
    /** Seconds it stays up (a full clear stays a little longer). */
    showFor: 1.8,
    showForFullClear: 2.4,
    /** Seconds it takes to bounce in: stretch up, squash wide, settle (a full clear bounces longer and bigger). */
    bounceIn: 0.6,
    bounceInFullClear: 0.8,
    /** How far it stretches and squashes on the way in (share of its size), and on a full clear. */
    squash: 0.16,
    squashFullClear: 0.24,
    /** The little "pop" sound under it: loudness, and the notes of the full-clear chime (Hz). */
    popVolume: 0.22,
    chime: [784, 988, 1175, 1568],
    chimeStep: 0.09,
  },

  /** A card squashes a little when it flops into the snow, then springs back (drawing only). */
  flop: {
    /** Squash at the hardest landing (share of the card's length); a soft lay-down squashes less. */
    squash: 0.14,
    stiffness: 260,
    damping: 11,
  },

  /**
   * Hit-stop: when the ball meets the first card of a throw, time runs slow for a moment (the ball, the
   * thrower and the physics), then eases back. `slowest` is the share of normal speed right at the hit.
   */
  hitStop: {
    seconds: 0.14,
    slowest: 0.12,
    /** A big ball holds a little longer and slower: up to `bigExtra` seconds more and `bigSlowest` at full size. */
    bigExtra: 0.1,
    bigSlowest: 0.07,
    /** The impact thump under it, on the thump sound's size scale: `thump` plus `thumpPerSize` times the ball's size. */
    thump: 0.32,
    thumpPerSize: 0.68,
  },

  /**
   * Extra energy when the ball itself touches a card (once per card per throw), on top of the physics
   * push: a shove along the ball's way (per unit of mass, per unit of ball speed), a little lift, and a
   * tumble (spin that tips it over the way the ball goes, plus a touch of random twist). `faceUp` adds a tip
   * backward, away from the throwing line, so more cards land face-up toward the camera (issue #48).
   */
  impact: { push: 0.13, lift: 0.24, tumble: 0.062, twist: 0.014, faceUp: 0.03 },

  /**
   * The ball never parks over the fallen cards (issue #47): once it has rolled past every card's foot (by its
   * radius plus `pastMargin`; a fallen card's head may still lie ahead, and the ball bursts on it), or it slows below `slowSpeed` while within `amongMargin` of a card, the pins ask the
   * bowling game to burst it into a puff of snow. From the low impact camera a ball resting even a few units
   * behind the set still covers the cards lying on the snow, so it poofs as soon as it is through.
   */
  burst: { pastMargin: 0.2, amongMargin: 0.3, slowSpeed: 2.4 },

  /**
   * A fallen card rests a little propped up on a heap of snow, so from the low throwing view it reads as a
   * picture, not a sliver (issue #48). Drawing only: the physics card lies flat and the count is unchanged.
   * Once it has landed, the drawing lifts its head (turning on its bottom edge) until it rests `elevationDegrees`
   * off the snow, easing in at `rate` (share of the gap per second) and back down when it pops up again.
   * The heap is a soft paper-snow mound under the lifted card (the scenery's mound look): `at` share of the card's
   * length from its foot, `fill` share of the gap it props up, `widthShare` of the card's width and `lengthShare`
   * of its length across.
   */
  rest: {
    elevationDegrees: 16,
    rate: 6,
    heap: { at: 0.45, fill: 0.9, widthShare: 0.7, lengthShare: 0.45 },
  },

  /** With "reduce motion" on: the card squash keeps this share and the pop-up only fades (vibration and sound stay). */
  reducedMotion: 0.3,
} as const;

export type PinsFeel = typeof PINS;

/**
 * Readability from the throwing view (overlap.ts, logged on /dev/pins in development or with `?overlap`):
 * no card may cover more than this share of another card's picture.
 */
export const OVERLAP = {
  maxHidden: 0.15,
  /**
   * The picture measured for each card: this share of the drawing's width (the files have a thin clear margin;
   * boxy drawings such as the signpost fill the rest) and of its height (the top holds floating snow dots).
   */
  widthShare: 0.95,
  heightShare: 0.88,
  /** Seconds after the page opens before measuring, so the camera has reached its throwing view. */
  measureAfter: 2,
} as const;

/* ------------------------------------------------------------------ */
/* Formations (#25)                                                     */
/* ------------------------------------------------------------------ */

/**
 * One pin in a formation, placed relative to the pin spot (bowling `lane.pinSpot`).
 * `dz` negative = further down the lane. `turn` = degrees to turn it (default: facing the line).
 */
export type FormationPin = { prop: PropId; dx: number; dz: number; flip?: boolean; scale?: number; turn?: number };
export type Formation = { id: string; label: string; pins: FormationPin[] };

/*
  Airy formations (Rachel: "far too crowded"). Rules, checked by overlap.ts on /dev/pins:
  - 5 to 8 pins; only the small friends. Never the throwers (snowman-bucket-hat, the red-hat snowman)
    or things that look like they are moving (penguin-slide, skier: they are village decoration now).
  - From the throwing view no card hides more than 15% of another (`OVERLAP.maxHidden`): pins in a row
    stand about 1.5 card widths apart, the row behind is staggered into the gaps, and rows step back
    0.55 to 1 (about a card's height, so a falling card still lands on or slides into the next one).
  - Short ones in front, taller and heavier ones at the back. About 2.5 wide: wider than a full-size
    ball (1.2 across), still on a phone screen held upright.
*/
export const FORMATIONS: Formation[] = [
  {
    id: "triangle",
    label: "Triangle",
    // 1, 2, 3: each row sits in the gaps of the row in front.
    pins: [
      { prop: "penguin-bag", dx: 0, dz: 0.7 },
      { prop: "girl-earmuffs", dx: -0.55, dz: 0, scale: 0.95 },
      { prop: "signpost-snowman", dx: 0.57, dz: 0, flip: true, scale: 0.9 },
      { prop: "pine-walking", dx: -1.1, dz: -0.75 },
      { prop: "boy-snowman", dx: 0, dz: -0.8 },
      { prop: "snowman-newspaper", dx: 1.13, dz: -0.75, flip: true },
    ],
  },
  {
    id: "row",
    label: "Domino row",
    // Five on a slant from front left to back right: each card just overlaps the next sideways, so a
    // card knocked back and to the right tips the next one, and all five stay in view.
    pins: [
      { prop: "penguin-bag", dx: -1.2, dz: 1.1 },
      { prop: "girl-earmuffs", dx: -0.6, dz: 0.55 },
      { prop: "snowman-newspaper", dx: 0, dz: 0, flip: true },
      { prop: "pine-walking", dx: 0.6, dz: -0.55, flip: true },
      { prop: "flag-blue", dx: 1.2, dz: -1.1 },
    ],
  },
  {
    id: "ring",
    label: "Ring",
    // Six friends in a circle, turned a little so nobody stands straight behind anybody; the front two
    // stand close enough that a ball straight down the middle never slips through untouched.
    pins: [
      { prop: "penguin-bag", dx: -0.38, dz: 0.9 },
      { prop: "signpost-snowman", dx: 0.42, dz: 0.9, flip: true, scale: 0.9 },
      { prop: "girl-earmuffs", dx: -1.15, dz: 0.05 },
      { prop: "snowman-newspaper", dx: 1.15, dz: 0.05, flip: true },
      { prop: "pine-walking", dx: -0.45, dz: -0.85 },
      { prop: "boy-snowman", dx: 0.5, dz: -0.85, flip: true },
    ],
  },
  {
    id: "friends",
    label: "Crowd of friends",
    // Penguins and people standing about loosely, a little turned toward each other.
    pins: [
      { prop: "penguin-bag", dx: -0.3, dz: 0.95, turn: 8 },
      { prop: "penguin-bag", dx: 0.6, dz: 0.8, flip: true, scale: 0.9, turn: -6 },
      { prop: "girl-earmuffs", dx: -1.05, dz: 0.15, turn: 10 },
      { prop: "snowman-newspaper", dx: -0.05, dz: 0.05, turn: -4 },
      { prop: "boy-snowman", dx: 1.15, dz: -0.15, flip: true, turn: -10 },
      { prop: "pine-walking", dx: -0.58, dz: -1.3, turn: 6 },
      { prop: "girl-earmuffs", dx: 0.55, dz: -1.2, flip: true, scale: 0.95, turn: -8 },
    ],
  },
  {
    id: "village",
    label: "Little village",
    // A mixed set: light friends in front, the heavy bench and log at the back.
    pins: [
      { prop: "penguin-bag", dx: 0, dz: 1.0 },
      { prop: "signpost-snowman", dx: -0.75, dz: 0.45, scale: 0.9 },
      { prop: "girl-earmuffs", dx: 0.72, dz: 0.45, flip: true, scale: 0.95 },
      { prop: "pine-walking", dx: -1.3, dz: -0.4 },
      { prop: "snowman-newspaper", dx: 0, dz: -0.4 },
      { prop: "boy-snowman", dx: 1.36, dz: -0.45, flip: true },
      { prop: "bench-snowmen", dx: -0.7, dz: -1.5 },
      { prop: "log-music", dx: 0.6, dz: -1.75 },
    ],
  },
];

export const TEXT = {
  title: "Plop! pins (dev)",
  down: (n: number) => `${n} down!`,
  none: "Missed!",
  fullClear: "All down!",
  count: (down: number, total: number) => `${down} / ${total} down`,
  reset: "Reset",
  nextSet: "Next set",
  debug: "Physics lines",
  formation: "Set",
} as const;
