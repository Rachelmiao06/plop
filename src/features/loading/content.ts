/**
 * Words, art and feel numbers for the loading screen. Tune here; the logic in `useSceneReady.ts` and the
 * drawing in `LoadingScreen.tsx` read everything from this file.
 */
export const LOADING = {
  title: "Plop!",
  /** Small line under the title while the scene loads. */
  note: "packing the snow…",
  /**
   * Rachel's little penguin sliding on its belly (scenery art, used as is), beside the title on the white page
   * (Rachel, 2026-11-25: it is cute; it replaces the thrower and the invite's mouse).
   */
  art: { src: "/assets/scenery/penguin-slide.webp", width: 396, height: 232, alt: "" },

  /**
   * Its little loop: slides `slide` px forward and back while it wobbles `tilt` degrees and hops `rise` px, one loop
   * every `seconds`. Still for "reduce motion".
   */
  slide: { slide: 14, rise: 4, tilt: 4, seconds: 1.8 },

  timing: {
    /** Never flash: the screen stays at least this long (ms), even when everything is cached. */
    minShow: 900,
    /**
     * A page with no 3D scene (the invite): ready once the page and its fonts have loaded and at least this long has
     * passed, so the snowball's roll still reads (ms).
     */
    minShowPage: 1700,
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

  /**
   * At 100 %: the ball bursts into a real puff of snow (`SnowPoof.tsx`) and the white screen either clears from that
   * point into the game (`reveal: false`) or lets the page's own card pop out of it (`reveal: true`, the invite).
   */
  burst: {
    /** How long the clearing takes (ms). Reduced motion: a plain fade of `timing.fade`. */
    clear: 1000,
    /** Soft edge of the clearing hole (px). */
    soft: 90,
    /** Reveal: the title, penguin and strip fade away over this long (ms) while the white stays. */
    contentOut: 420,
    /**
     * The puff: `powder` fine flakes and `clumps` soft lumps thrown at up to `speed` px/s, pulled down by `gravity`
     * px/s², slowed by `drag` per second, over a mist `mist` px wide; all within `reach` px of the burst, gone after
     * `duration` ms.
     */
    poof: { powder: 70, clumps: 16, speed: 420, gravity: 620, drag: 2.4, mist: 70, reach: 190, duration: 1150 },
  },

  /** Name of the window event the game may dispatch once its first full frame is drawn (optional). */
  readyEvent: "plop:ready",
} as const;
