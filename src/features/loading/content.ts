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

  /** Name of the window event the game may dispatch once its first full frame is drawn (optional). */
  readyEvent: "plop:ready",
} as const;
