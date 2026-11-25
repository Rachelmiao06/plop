/**
 * Every feel number of the slingshot. Tune here; the logic never hard-codes one.
 *
 * Distances are scene units: one unit = one character height.
 * `x` runs left to right, `z` runs from the back of the scene toward the viewer.
 * Times are seconds, speeds are units per second.
 */
export const FEEL = {
  /** Where the two characters stand. */
  homes: {
    left: { x: -3, z: 0 },
    right: { x: 3, z: 0 },
  },

  character: {
    /** A press this close to a character grabs it (generous, for fingers). */
    grabRadius: 0.8,
    /** How long the hop back home takes after letting go. */
    hopTime: 0.45,
    /** How high that hop goes. */
    hopHeight: 0.6,
  },

  pull: {
    /** Full pull: the ball is fully charged at this distance from home. */
    max: 1.8,
    /** Rubber band: how much farther the ball can be dragged past the limit, at most. */
    rubberBand: 0.3,
    /** Letting go closer to home than this cancels the throw (the ball crumbles). */
    cancelBelow: 0.3,
  },

  /** How the ball chases the finger. Rates are "share of the gap closed per second": higher = snappier. */
  follow: {
    /** The smallest ball: nearly glued to the finger. */
    rateLight: 24,
    /** The biggest ball: clearly heavy. */
    rateHeavy: 8,
    /** The ball never trails the finger by more than this, so weight never feels like lost input. */
    maxTrail: 0.7,
  },

  ball: {
    /** Ball radius when it first appears, and when fully charged. */
    radiusSmall: 0.14,
    radiusBig: 0.5,
    /** Shape of growth along the pull. 1 = steady; below 1 = grows fast early; above 1 = grows late. */
    growthCurve: 0.8,
    /** Slower than this counts as "sitting still" for the dwell timer (snow sinks under a resting ball). */
    stillSpeed: 0.15,
  },

  charge: {
    /** How far the charged ball shivers (the drawing multiplies this by `tremble`). */
    trembleSize: 0.035,
    /** Shivers per second. */
    trembleSpeed: 13,
    /** How quickly the shiver fades in once charged. */
    trembleFadeIn: 0.15,
  },

  keyboard: {
    /** How fast holding a key pulls back. `pull.max / pullSpeed` = seconds to full charge. */
    pullSpeed: 1.5,
    /** How quickly the aim swings round when the keys change. Higher = snappier steering. */
    steerRate: 9,
    /**
     * Fingers never leave two keys at the same instant. For this long after a key
     * comes up the aim is frozen, so lifting W then A does not swing the shot.
     */
    letGoWindow: 0.07,
  },

  /** The flight. Small balls: fast and flat. Big balls: slower and higher. */
  arc: {
    /** How far past home the ball lands at the weakest and the strongest pull. */
    rangeMin: 1.5,
    rangeMax: 8,
    /** Shape of range along the pull. 1 = steady; above 1 = most of the range comes late. */
    rangeCurve: 1,
    /** Speed along the ground for the smallest and the biggest ball. */
    speedSmall: 11,
    speedBig: 7,
    /** Top of the arc, as a share of the distance flown, for the smallest and the biggest ball. */
    heightSmall: 0.12,
    heightBig: 0.32,
  },

  impact: {
    /** The landing mark is this many ball radii wide (radius of the crater and the preview ring). */
    radiusPerBall: 1.8,
  },

  hit: {
    /** A character this far outside the landing ring still counts as hit (about half a character). */
    extraReach: 0.35,
    /** After a hit, the character cannot pull for this long. */
    recovery: 0.9,
    /** Can your own snowball knock you over? */
    canHitYourself: false,
  },

  sound: {
    /** Rolling at this speed or more gives the densest crunch. */
    crunchFullSpeed: 3.5,
    /** Rolling slower than this is silent. */
    crunchSilentBelow: 0.08,
  },

  /** Phone vibration, in milliseconds. Phones that cannot vibrate ignore it. */
  haptics: {
    charged: 18,
    launchWeak: 12,
    launchStrong: 35,
    hit: 70,
  },
};

export type Feel = typeof FEEL;

/** A fresh copy that can be changed (by sliders, say) without touching the defaults. */
export function copyFeel(feel: Feel = FEEL): Feel {
  return JSON.parse(JSON.stringify(feel)) as Feel;
}
