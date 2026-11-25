import { createContext, useContext } from "react";

import { standee3d } from "../content";

/** Which parts of the thick-standee look are switched on (the toggles on /dev/scenery-3d). */
export type Treatment = {
  thick: boolean;
  shadow: boolean;
  pillow: boolean;
  /** Base sunk into the snow with a small mound around it. */
  sink: boolean;
  /** fixed = never turns; half = turns part way, capped; full = always faces the camera (billboard). */
  turn: "fixed" | "half" | "full";
  /** Largest half-turn, in degrees. */
  cap: number;
  /** Sway and click-to-wobble. */
  life: boolean;
};

export const fullTreatment: Treatment = {
  thick: true,
  shadow: true,
  // Off by default: it read as a computer vignette next to the source art. Still on the switch to compare.
  pillow: false,
  sink: true,
  turn: "half",
  cap: standee3d.turn.cap,
  life: true,
};

export const flatPaper: Treatment = {
  thick: false,
  shadow: false,
  pillow: false,
  sink: false,
  turn: "full",
  cap: standee3d.turn.cap,
  life: false,
};

/** Starting looks for the ?look= option. */
export const looks: Record<string, Treatment> = {
  full: fullTreatment,
  flat: flatPaper,
  billboard: { ...fullTreatment, turn: "full" },
  fixed: { ...fullTreatment, turn: "fixed" },
};

/** Starting cameras for the ?view= option: swing around the lane (degrees), height above the ground (degrees) and distance (times the throwing view). */
export const views: Record<string, { yaw: number; elevation: number; level: number }> = {
  /** The throwing view: behind and above the thrower, looking down the lane. */
  default: { yaw: 0, elevation: 20, level: 1 },
  side: { yaw: 50, elevation: 18, level: 1.05 },
  high: { yaw: 15, elevation: 62, level: 1.3 },
  /** Close to the thrower and the left frame, swung to the side: shows the card edges. */
  closeup: { yaw: 42, elevation: 12, level: 0.42 },
};

export const TreatmentContext = createContext<Treatment>(fullTreatment);
export const useTreatment = () => useContext(TreatmentContext);

/** The token colours the 3D page uses, read from globals.css at runtime so it never types its own. */
export type PaperColors = {
  /** --paper: snow, paper sides, haze. */
  paper: string;
  /** --snow-shadow: shadows and the shade side. */
  shade: string;
  /** --ink: the faint edge line. */
  ink: string;
};
export const PaperContext = createContext<PaperColors>({ paper: "white", shade: "lightblue", ink: "black" });
export const usePaper = () => useContext(PaperContext);

/** Counts frames; the page reads `fps` twice a second (no React re-render per frame). */
export class FrameStats {
  fps = 0;
  private frames = 0;
  private since = 0;

  tick(delta: number) {
    this.frames += 1;
    this.since += delta;
    if (this.since >= 0.5) {
      this.fps = this.frames / this.since;
      this.frames = 0;
      this.since = 0;
    }
  }
}
