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
    linear: 4.5,
    /** Fastest a card may move upward (a hop, never a launch). */
    up: 1.6,
    /** Fastest a card may spin (radians per second). */
    angular: 11,
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
    settleHold: 0.35,
    /** Give up waiting this long after the ball stops (cards still rocking count as they are). */
    timeoutAfterStop: 2.2,
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
  },
} as const;

export type PinsFeel = typeof PINS;

/* ------------------------------------------------------------------ */
/* Formations (#25)                                                     */
/* ------------------------------------------------------------------ */

/**
 * One pin in a formation, placed relative to the pin spot (bowling `lane.pinSpot`).
 * `dz` negative = further down the lane. `turn` = degrees to turn it (default: facing the line).
 */
export type FormationPin = { prop: PropId; dx: number; dz: number; flip?: boolean; scale?: number; turn?: number };
export type Formation = { id: string; label: string; pins: FormationPin[] };

export const FORMATIONS: Formation[] = [
  {
    id: "triangle",
    label: "Triangle",
    // Classic ten: 1, 2, 3, 4 rows, staggered so a falling card always lands on the next row.
    pins: [
      { prop: "penguin-bag", dx: 0, dz: 0.8 },
      { prop: "girl-earmuffs", dx: -0.4, dz: 0.3 },
      { prop: "skier", dx: 0.4, dz: 0.3, flip: true },
      { prop: "pine-walking", dx: -0.8, dz: -0.2 },
      { prop: "flag-blue", dx: 0, dz: -0.2 },
      { prop: "snowman-newspaper", dx: 0.8, dz: -0.2, flip: true },
      { prop: "penguin-slide", dx: -1.28, dz: -0.7 },
      { prop: "boy-snowman", dx: -0.43, dz: -0.7 },
      { prop: "signpost-snowman", dx: 0.43, dz: -0.7, flip: true },
      { prop: "snowman-bucket-hat", dx: 1.28, dz: -0.7, flip: true },
    ],
  },
  {
    id: "row",
    label: "Domino row",
    // One behind the other down the lane, closer than their height, so the first knocks them all.
    pins: [
      { prop: "penguin-bag", dx: 0, dz: 1.3 },
      { prop: "girl-earmuffs", dx: 0.04, dz: 0.88 },
      { prop: "skier", dx: -0.03, dz: 0.46, flip: true },
      { prop: "pine-walking", dx: 0.03, dz: 0.04 },
      { prop: "snowman-newspaper", dx: -0.04, dz: -0.38 },
      { prop: "flag-blue", dx: 0.02, dz: -0.8 },
      { prop: "boy-snowman", dx: -0.02, dz: -1.24, flip: true },
      { prop: "snowman-bucket-hat", dx: 0.03, dz: -1.68 },
    ],
  },
  {
    id: "ring",
    label: "Ring",
    // Eight friends holding a circle around a big snowman.
    pins: [
      { prop: "snowman-bucket-hat", dx: 0, dz: 0 },
      { prop: "penguin-bag", dx: 0, dz: 1.0 },
      { prop: "girl-earmuffs", dx: 0.7, dz: 0.7, flip: true },
      { prop: "pine-walking", dx: 1.0, dz: 0, flip: true },
      { prop: "skier", dx: 0.7, dz: -0.7, flip: true },
      { prop: "flag-blue", dx: 0, dz: -1.0 },
      { prop: "penguin-slide", dx: -0.7, dz: -0.7 },
      { prop: "snowman-newspaper", dx: -1.0, dz: 0 },
      { prop: "boy-snowman", dx: -0.7, dz: 0.7 },
    ],
  },
  {
    id: "friends",
    label: "Crowd of friends",
    // Snowmen, penguins and people standing about, loosely, a little turned toward each other.
    pins: [
      { prop: "penguin-bag", dx: -0.25, dz: 0.95, turn: 8 },
      { prop: "penguin-slide", dx: 0.45, dz: 0.75, flip: true, turn: -6 },
      { prop: "girl-earmuffs", dx: -0.75, dz: 0.35, turn: 10 },
      { prop: "snowman-newspaper", dx: 0.2, dz: 0.2, turn: -4 },
      { prop: "skier", dx: 0.95, dz: 0.05, flip: true, turn: -12 },
      { prop: "boy-snowman", dx: -0.55, dz: -0.35, turn: 6 },
      { prop: "penguin-bag", dx: 0.5, dz: -0.5, flip: true, scale: 0.9, turn: -8 },
      { prop: "snowman-bucket-hat", dx: -0.1, dz: -1.05, turn: 3 },
      { prop: "girl-earmuffs", dx: 0.95, dz: -1.0, flip: true, scale: 0.95, turn: -10 },
    ],
  },
  {
    id: "village",
    label: "Little village",
    // A mixed set: light friends in front, the heavy bench and log at the back.
    pins: [
      { prop: "penguin-bag", dx: 0.1, dz: 0.9 },
      { prop: "flag-blue", dx: -0.6, dz: 0.45 },
      { prop: "signpost-snowman", dx: 0.55, dz: 0.4, flip: true },
      { prop: "pine-walking", dx: -0.15, dz: -0.05 },
      { prop: "skier", dx: 0.95, dz: -0.2, flip: true },
      { prop: "bench-snowmen", dx: -0.85, dz: -0.6 },
      { prop: "girl-earmuffs", dx: 0.4, dz: -0.55 },
      { prop: "log-music", dx: 0, dz: -1.25 },
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
