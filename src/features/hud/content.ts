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
  },

  /** The frosted glass: blur of the snow behind, and how much paper white shows. */
  glass: {
    blur: "14px",
    /** Share of paper white over the blurred snow, 0..100. */
    tint: 52,
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

  /** Burst of star and surprise lines when the set is cleared. */
  burst: {
    duration: 1400,
  },

  /** Number pop when a total goes up. */
  pop: {
    duration: 420,
  },
} as const;

export type SnowmanLook = keyof typeof content.looks;
