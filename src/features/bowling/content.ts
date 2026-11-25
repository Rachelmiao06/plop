/**
 * Every feel number of the bowling throw. Tune here; the logic never hard-codes one.
 *
 * Distances are scene units: one unit = one character height.
 * `x` runs left to right, `z` runs from far down the lane toward the camera.
 * The lane points away from the camera (toward -z). Times are seconds, speeds units per second.
 */
export const FEEL = {
  /** The throwing line and the lane. Placed to fit the snow scene's play view. */
  lane: {
    /** Where the throwing line is (the thrower stands on it). */
    lineZ: 1.4,
    /** How far left or right of the middle the thrower may slide. */
    halfWidth: 2.2,
    /**
     * Where the pins stand (8.6 from the line; was 5.6 before the long lane). Pins, the village, the clear snow
     * behind the pins and the paper sky all follow it.
     */
    pinSpot: { x: 0, z: -7.2 },
  },

  thrower: {
    /** How fast holding A / D or the arrows slides the thrower along the line. */
    slideSpeed: 3,
    /** How quickly the thrower catches up with where it is slid to. Higher = snappier. */
    slideRate: 14,
    /** The little hop after a throw: how long and how high. */
    hopTime: 0.45,
    hopHeight: 0.35,
    /** How far back it leans at full pull (radians). */
    leanAtFull: 0.42,
    /** Idle wobble: how far (radians) and how fast (wobbles per second). */
    wobble: 0.03,
    wobbleSpeed: 0.6,
  },

  pull: {
    /** Full pull: the ball reaches the limit at this distance behind the thrower. */
    max: 1.6,
    /** Rubber band: how much farther the ball can be dragged past the limit, at most. */
    rubberBand: 0.25,
    /** Letting go closer than this cancels the throw (the ball crumbles). */
    cancelBelow: 0.25,
    /** The aim can turn at most this many degrees left or right of straight down the lane. */
    maxAimDegrees: 28,
  },

  /** How the ball chases the finger while pulling. Rates are "share of the gap closed per second". */
  follow: {
    /** The smallest ball: nearly glued to the finger. */
    rateLight: 22,
    /** The biggest ball: clearly heavy. */
    rateHeavy: 9,
    /** The ball never trails the finger by more than this, so weight never feels like lost input. */
    maxTrail: 0.5,
    /** On a fully packed track the ball follows this many times quicker (less resistance). */
    packedBoost: 1.5,
    /** How quickly the follow rate itself changes when the snow changes, so it never jerks. */
    smoothing: 8,
    /**
     * Tension: the pull loads up like a band. Near full pull the ball follows only this share as fast,
     * so the last stretch resists a little more. `curve` above 1 keeps the start light.
     */
    tensionAtFull: 0.55,
    tensionCurve: 1.6,
  },

  ball: {
    /** Ball radius when it first appears, and when fully grown (0.25 and 1.2 across). */
    radiusSmall: 0.125,
    radiusBig: 0.6,
    /** Shape of growth: radius = small..big along size^curve. Below 1 = grows fast early. */
    growthCurve: 0.85,
    /**
     * Growth needs fresh snow. On a fully packed track the ball grows only this share
     * as fast, so pulling back over your own old groove grows it less.
     */
    growthOnPacked: 0.25,
    /** Slower than this counts as "sitting still" for the dwell timer. */
    stillSpeed: 0.15,
    /** How much of the ball sinks into the snow (share of its radius). */
    sink: 0.15,
  },

  charge: {
    /** How far the ball at the limit shivers (scene units). */
    trembleSize: 0.02,
    /** Shivers per second. */
    trembleSpeed: 13,
    /** How quickly the shiver fades in once at the limit. */
    trembleFadeIn: 0.15,
  },

  keyboard: {
    /** How fast holding Space pulls back. `pull.max / pullSpeed` = seconds to full (about 1.5). */
    pullSpeed: 1.1,
    /** How fast A / D or the arrows turn the aim while pulling, in degrees per second. */
    aimSpeed: 45,
    /** Holding at full pull pushes this share into the rubber band, so the lagging ball truly reaches the limit. */
    pushPastFull: 0.5,
  },

  /**
   * The roll down the long lane after letting go. Tuned so a light ball reaches the pins in about 0.9 s and
   * a full one in about 1.35 s, and both stop about 3 units past the pin spot (`docs/TUNING.md`).
   */
  roll: {
    /** Top speed of the smallest and the biggest ball (at full pull), reached right after the snap. */
    speedSmall: 13.5,
    speedBig: 8.4,
    /** A weak pull starts this share as fast as a full one. */
    weakPull: 0.8,
    /** Letting go is a snap: the ball leaves at `from` of its top speed and reaches it within `time` seconds. */
    snap: { from: 0.35, time: 0.09 },
    /** Early in the roll the snow slows it only `dragShare` as much, easing to full drag over `time` seconds. */
    early: { dragShare: 0.2, time: 0.7 },
    /** Steady slowing in deep fresh snow, and the extra slowing that grows with speed. */
    dragFresh: 6.5,
    dragPerSpeed: 0.15,
    /** On a fully packed track the slowing is only this share, so old grooves become (gently) faster lanes. */
    dragOnPacked: 0.8,
    /** Big balls plough on: their slowing is this share of a small ball's. */
    dragBigShare: 0.45,
    /** Below this speed the ball stops. */
    stopSpeed: 0.12,
    /** A stopped ball stays in the snow this long before it goes away. */
    restTime: 6,
  },

  /** How the ball presses the snow (passed to the snow scene's `pressGroove`). */
  groove: {
    /** Distance between presses, as a share of the ball radius. */
    spacing: 0.25,
    /** And never more than this (scene units), or the groove shows stripes. */
    maxStep: 0.075,
    /**
     * How fast a ball sitting still digs down (units per second). A moving ball never digs:
     * its groove depth comes from its size, and digging while moving would stack up to hard ground.
     */
    digResting: 0.25,
  },

  /** Pointer drags on the thrower. */
  pointer: {
    /** Screen pixels a press must move before it decides between sliding and pulling. */
    decidePixels: 8,
    /** It is a pull if it moves back at least this share as much as sideways; otherwise a slide. */
    pullIfBack: 0.6,
    /** Pressing within this distance of the thrower's feet (on the snow) also grabs it. */
    grabRadius: 0.55,
  },

  sound: {
    /**
     * Rolling at this speed or more gives the densest crunch; slower rolls crunch at a slower pace, so the
     * sound follows the ball down the long lane (was 4, which every throw passed at once).
     */
    crunchFullSpeed: 11,
    /** Rolling slower than this is silent. */
    crunchSilentBelow: 0.08,
  },

  /**
   * The little beats you feel in the hand (vibration where the phone can, and a sound and a squash
   * everywhere). The vibration patterns themselves are in `src/lib/haptics.ts`.
   */
  beats: {
    /** The whoosh on letting go follows the ball's top speed: this speed and faster is the loudest. */
    whooshFullSpeed: 12,
    /**
     * A strong pull (power above `doubleFrom`) layers a second whoosh `doubleDelay` seconds later, and every
     * release has a low push-off thump (`pushThump` on the thump sound's size scale, times the power).
     */
    whooshDoubleFrom: 0.45,
    whooshDoubleDelay: 0.05,
    pushThump: 0.32,
    /** Crunch ticks while pulling: ticks per second for the smallest and the biggest ball... */
    ticksSmall: 5,
    ticksBig: 13,
    /** ...when the ball rolls at least this fast; slower rolls tick slower, a still ball not at all. */
    tickFullSpeed: 1.4,
    /** Loudness of the soft pat when you press the thrower (0..1 on the thump sound's size scale). */
    pressThump: 0,
    /** And of the little crunch "clunk" when the pull reaches full charge. */
    chargeThump: 0.25,
  },
};

export type Feel = typeof FEEL;

/** A fresh copy that can be changed (by sliders, say) without touching the defaults. */
export function copyFeel(feel: Feel = FEEL): Feel {
  return JSON.parse(JSON.stringify(feel)) as Feel;
}

/** Words on the test page. */
export const TEXT = {
  title: "Plop! · bowling test",
  keys: "A / D or ← / → slide · hold Space to pull back (A / D aim) · let go to roll",
  pointer: "Or press the snowman card: drag sideways to slide, drag back to pull, let go to roll.",
};

/** Who is throwing, as drawn: player one is Rachel's bucket snowman, player two her red-hat snowman. */
export type ThrowerLook = "one" | "two";

/**
 * How the thrower and the snowball look and move. Drawing only: nothing here changes the rules.
 * Angles in radians unless named "Degrees"; distances in scene units (one unit = one character height).
 */
export const LOOK = {
  thrower: {
    /** The scenery cut-out drawn for each player (`public/assets/scenery/<name>.webp`). */
    art: { one: "thrower-bucket", two: "thrower-redhat" } satisfies Record<ThrowerLook, string>,
    /** Half-turn toward the camera, like the village cut-outs: share of the camera's swing, cap, spring. */
    turn: { fraction: 0.5, capDegrees: 30, stiffness: 30, damping: 9 },
    /** Tilt and squash follow their goals on a soft spring, so every move overshoots a little. */
    spring: { stiffness: 150, damping: 11 },
    /** Idle: a slow breath (squash share) on top of the side wobble in `FEEL.thrower`. */
    breathe: 0.022,
    breatheSpeed: 0.5,
    /** Pulling: crouch this much at full pull, and lean toward the ball's side (radians per unit pulled sideways). */
    crouch: 0.08,
    leanToBall: 0.18,
    /** Strain at full charge: a quick shiver (radians, scene units, shivers per second). */
    strain: { angle: 0.035, shift: 0.008, speed: 19 },
    /** Hop on release: stretch while rising, squash on landing (shares of height). */
    hop: { stretch: 0.14, landSquash: 0.2 },
    /** The happy bounce after landing: little bounces, how high, how long. */
    bounce: { count: 2, height: 0.08, time: 0.55 },
    /** A small shuffle left under the roll while sliding: steps per unit, side rock, lift per step, lean into the slide. */
    shuffle: { stepsPerUnit: 3.4, rock: 0.03, lift: 0.012, leanInto: 0.04, fullSpeed: 2.2 },
    /** A little pop when the player changes. */
    swapSquash: 0.18,
    /** Pressing the thrower: a tiny squash, like a finger pressing a soft toy (share of height, as a kick). */
    pressSquash: 0.12,
    /** Reaching full charge: a quick puff-up (negative squash = stretch) on top of the strain shiver. */
    chargePop: 0.14,
    /**
     * The snowman is round, so it rolls on its round bottom like a roly-poly toy. `radius` is that bottom's
     * size (share of the card's height); sliding rolls it by `perSpeed` radians per unit per second, at most
     * `max`; it wobbles back upright on its own spring. It also turns a little toward where it slides.
     */
    roll: { radius: 0.3, perSpeed: 0.22, max: 0.55, stiffness: 55, damping: 6.5, turnDegrees: 14 },
    /** Idle: now and then it rolls a little by itself (radians, rolls per second). */
    idleRoll: { angle: 0.07, speed: 0.23 },
    /**
     * Letting go: it lunges forward after the ball (scene units, as a spring kick), leans into it with a
     * little roll of follow-through, then wobbles back to its spot. A stiffer spring = snappier. A weak pull
     * gives `minShare` of it, a full pull all of it.
     */
    lunge: { distance: 0.62, lean: 0.5, roll: 0.3, stiffness: 95, damping: 8.5, minShare: 0.45 },
  },

  /** Springy squash of the snowball itself (kept upright: the squash never turns with the roll). */
  ballSquash: {
    /** Each crunch tick while pulling gives the ball a tiny squash kick. */
    tick: 0.06,
    /** Full charge: a bigger squash. */
    charge: 0.16,
    /** While pulled, the ball presses into the snow: flattened this much at full pull (it loads up). */
    pullLoad: 0.08,
    /**
     * Letting go: the ball first squashes against the snow (`launchSquash`, as it is pushed off), then the
     * spring throws it into a stretch along the way it is thrown (`launch`). Both times the pull's power.
     */
    launchSquash: 0.2,
    launch: 0.24,
    /** The spring it settles on (wobbly but quick). */
    stiffness: 320,
    damping: 13,
    /** Never squashes more than this share either way. */
    max: 0.25,
  },

  /** With "reduce motion" on: squash, stretch and hops keep this share (vibration and sound stay). */
  reducedMotion: 0.3,

  ball: {
    /** The --ink outline: width in scene units (the cut-outs' line is about 1.2% of their height), and how uneven. */
    outline: 0.013,
    outlineWobble: 0.45,
    /** How strongly the outline fades in places, like a pencil line (0 = solid). */
    outlineGaps: 0.35,
    /**
     * Shade side toward --snow-shadow. The light is the cut-outs' upper-left drawing light, turned
     * more to the side (less from the camera), so the shaded crescent shows from the throwing view.
     * `band`: where lit turns to shade; `uneven`: how much that edge wanders.
     */
    light: [-0.8, 0.55, 0.1] as [number, number, number],
    band: { from: 0.53, to: 0.63 },
    uneven: 0.14,
    /** The shade is laid in like coloured pencil: faint hatch lines, this strong (0 = flat wash). */
    hatch: 0.35,
    /** Faint paper fibre speckle toward --snow-shadow. */
    grain: 0.12,
    /** Pencil marks and crumbs that turn with the roll: how many, line width (scene units), ink strength. */
    marks: 28,
    markWidth: 0.019,
    markInk: 0.72,
  },

  /**
   * Speed you can see: hand-drawn wind curls (`public/assets/effects/wind-curl.webp`) trail a fast ball,
   * and fast balls throw more snow. `from` / `full` are ball speeds (units per second).
   */
  speed: {
    from: 5,
    full: 12,
    /**
     * Wind-curl size (scene units), how far behind the ball's edge and how far out to its sides they sit
     * (out is a share of the radius), and how see-through at most. Kept clear of the ball so it never looks faded.
     */
    curlSize: 0.55,
    curlBehind: 0.45,
    curlOut: 1.25,
    curlOpacity: 0.85,
    /** Fast balls kick up this many times more spray from the snow (the plough speed passed to the snow). */
    sprayBoost: 1.8,
  },

  /**
   * Snow thrown by the throw itself (the snow scene's `kickUpSnow`, spray without a dent). `amount` is on the
   * snow's scale (0.02 a small puff). Speeds in units per second.
   */
  kick: {
    /** Letting go: a puff kicked up behind the thrower's feet, thrown back and up; times the pull's power. */
    release: { amount: 0.07, radius: 0.35, back: 0.25, speed: 5 },
    /**
     * Rolling: a plume thrown up behind the ball. Per second: `amount` times the ball's speed share
     * (`LOOK.speed`) and its size share (radius small → big, never below `sizeFloor`).
     */
    plume: { amount: 0.08, sizeFloor: 0.25, behind: 0.9, speed: 2.4 },
    /**
     * A big ball bulldozes: a bow wave of snow thrown ahead and out to the sides, from balls bigger than
     * `fromRadius`; per second `amount` times how big (share above `fromRadius`) and how fast it is.
     */
    plough: { fromRadius: 0.3, amount: 0.22, ahead: 1.05, speed: 2.6 },
  },

  /** Clumps of snow that fall off a big rolling ball. */
  clumps: {
    /** Balls smaller than this radius shed nothing (unless fast, see `fastBoost`). */
    fromRadius: 0.3,
    /** A fast ball (`LOOK.speed`) sheds up to this many times more, small ones included. */
    fastBoost: 2.2,
    /** Clumps per unit rolled by the biggest ball (fewer for smaller ones). */
    perUnit: 2.6,
    /** At most this many in the air or melting at once. */
    max: 48,
    /** Size range (radius). */
    size: [0.03, 0.065] as [number, number],
    /** Thrown up this fast (units per second), and sideways up to this. Keeps this share of the ball's speed. */
    kickUp: [1.1, 2.2] as [number, number],
    kickSide: 0.9,
    carry: 0.35,
    gravity: 9,
    /** After landing it sinks into the snow over this long. */
    melt: 0.9,
  },
};
