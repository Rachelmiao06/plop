/**
 * Words, art and feel numbers for the loading screen. Tune here; the logic in `useSceneReady.ts` and the
 * drawing in `LoadingScreen.tsx` read everything from this file.
 */
export const LOADING = {
  title: "Plop!",
  /** Small line under the title while the scene loads. */
  note: "packing the snow…",
  /** Rachel's bucket-hat thrower cut-out (scenery art, used as is). */
  art: { src: "/assets/scenery/thrower-bucket.webp", width: 309, height: 421, alt: "" },

  /** Gentle bob of the cut-out: how far it rises (px), how far it tips (deg), one full bob (s). */
  bob: { rise: 7, tilt: 2.5, seconds: 2.4 },

  timing: {
    /** Never flash: the screen stays at least this long (ms), even when everything is cached. */
    minShow: 900,
    /** Art must have stopped loading for this long (ms) before we call it ready (loads come in waves). */
    settle: 350,
    /** If the canvas is up and nothing has started loading after this long (ms), treat it as ready. */
    nothingToLoad: 2500,
    /** Hard fallback (ms): whatever happens, the game shows after this. */
    maxWait: 15000,
    /** Fade out (ms). */
    fade: 650,
  },

  progress: {
    /** Where the pencil line starts, so it never looks empty (0 to 1). */
    floor: 0.08,
    /** Highest it goes before the scene is really ready, so it never sits "full" while still loading. */
    ceiling: 0.92,
    /** Slow creep per second while waiting, so the line never looks stuck. */
    creep: 0.035,
  },

  /**
   * The real-snow strip the snowball rolls through (`SnowStrip.tsx`). Sizes are in CSS px; the ball sizes are a
   * share of the strip's height. Light colours are the snow scene's own (src/features/snow-scene/content.ts,
   * `colors` and `surface`), copied so the strip reads as the same snow without loading three.js.
   */
  strip: {
    width: 300,
    height: 84,
    /** Ball radius at 0 % and at 100 %, as a share of the strip height. */
    ballStart: 0.11,
    ballEnd: 0.25,
    /** How quickly the ball catches up with the real progress (per second; higher = snappier). */
    follow: 3.2,
    /** Fastest it may roll (share of the strip per second), so a jump in progress still reads as rolling. */
    maxSpeed: 0.55,
    /** Pixel ratio cap: the strip is small, 2 is plenty. */
    maxPixelRatio: 2,
    light: {
      snow: "#dfe7f2",
      pressed: "#8fabd6",
      sun: "#ffe2bd",
      sky: "#a9cdf5",
      bounce: "#dfe6f5",
      sparkle: "#fff6e6",
      grain: 0.13,
      /** Share of grain cells that can glint. */
      sparkleAmount: 0.03,
      exposure: 1.06,
    },
  },

  /** At 100 %: the ball bursts and a puff of snow clears the screen from where it burst. */
  burst: {
    /** Rachel's snow-puff doodle, grown at the burst point. */
    puff: { src: "/assets/effects/snow-puff.webp", width: 306, height: 235 },
    /** How long the clearing takes (ms). Reduced motion: a plain fade of `timing.fade`. */
    clear: 1000,
    /** Soft edge of the clearing hole (px). */
    soft: 90,
  },

  /** Name of the window event the game may dispatch once its first full frame is drawn (optional). */
  readyEvent: "plop:ready",
} as const;
