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
    /** Where the pins will stand later (issue #7). Kept clear; only a faint mark is drawn. */
    pinSpot: { x: 0, z: -4.2 },
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
    leanAtFull: 0.3,
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

  /** The roll down the lane after letting go. */
  roll: {
    /** Starting speed of the smallest and the biggest ball (at full pull). */
    speedSmall: 6.4,
    speedBig: 3.5,
    /** A weak pull starts this share as fast as a full one. */
    weakPull: 0.85,
    /** Steady slowing in deep fresh snow, and the extra slowing that grows with speed. */
    dragFresh: 1.9,
    dragPerSpeed: 0.04,
    /** On a fully packed track the slowing is only this share, so old grooves become fast lanes. */
    dragOnPacked: 0.6,
    /** Big balls plough on: their slowing is this share of a small ball's. */
    dragBigShare: 0.36,
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
    /** How fast a ball sitting still digs down (units per second). */
    digResting: 0.25,
    /** How deep a rolling ball digs per unit rolled, for the smallest and biggest ball. */
    digSmall: 0.006,
    digBig: 0.03,
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
    /** Rolling at this speed or more gives the densest crunch. */
    crunchFullSpeed: 4,
    /** Rolling slower than this is silent. */
    crunchSilentBelow: 0.08,
  },

  /** Phone vibration, in milliseconds. Phones that cannot vibrate ignore it. */
  haptics: {
    charged: 18,
    launchWeak: 12,
    launchStrong: 35,
  },
};

export type Feel = typeof FEEL;

/** A fresh copy that can be changed (by sliders, say) without touching the defaults. */
export function copyFeel(feel: Feel = FEEL): Feel {
  return JSON.parse(JSON.stringify(feel)) as Feel;
}
