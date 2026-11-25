/**
 * Feel settings of the finishing layer over the 3D picture (issue #42). Tune here; the components never
 * hard-code a number. Colours are token names from `src/app/globals.css`, never typed-in colours.
 *
 * Both layers are plain CSS above the canvas: they never touch the 3D render, so the paper cut-outs stay
 * unlit paper and the snow stays real lit snow underneath (see docs/REVIEW.md for why not post-processing).
 */
export const LOOK = {
  /**
   * Paper tooth: a faint, still crayon-paper grain over the whole picture, so the lit snow and the drawn
   * cut-outs read as one sheet of paper. Drawn in `--ink` through a noise mask.
   */
  grain: {
    on: true,
    /** Opacity of the ink grain. 0.05 is barely there; above 0.09 it reads as dirt on the snow. */
    strength: 0.065,
    /** Noise frequency of the paper fibres (SVG feTurbulence). Higher = finer tooth. */
    frequency: 0.85,
    /** Size of one noise tile in CSS pixels. */
    tile: 220,
  },

  /**
   * Paper edge: the picture fades softly into `--paper` at the bottom and in the corners, like a drawing
   * that stops before the edge of the sheet. Calms the heavy foreground shadows and the empty bottom of
   * the phone view; the lane and the pins in the middle are untouched.
   */
  edge: {
    on: true,
    /** How much paper shows at the very corners (0..1). */
    corner: 0.45,
    /** Where the corner fade starts, as a share of the ellipse (0..1); smaller = the fade reaches further in. */
    cornerFrom: 0.62,
    /** How much paper shows at the bottom edge (0..1). */
    bottom: 0.5,
    /** How tall the bottom fade is, as a share of the screen height. */
    bottomHeight: 0.2,
  },
} as const;

export type LookSettings = { grain: boolean; edge: boolean };

export const TEXT = {
  title: "Plop! · look test",
  panel: "Finish",
  grain: "Paper grain",
  edge: "Paper edge",
  fps: (n: number) => `${n} fps`,
};
