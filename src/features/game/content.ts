/**
 * Game-level feel numbers and words: turns, points, timings of the loop, the hint.
 * Tune here; the logic never hard-codes one. Times are seconds.
 * Feel numbers of the throw, the pins, the snow and the score panel live in their own features'
 * `content.ts`; `docs/TUNING.md` lists the ten that matter most and where each one lives.
 */
import type { SnowmanLook } from "@/features/hud";

export type PlayerSpec = {
  /** Shown in the score panel and the turn note. */
  name: string;
  /** Which snowman face the score panel draws. */
  look: SnowmanLook;
  /** The thrower id handed to the bowling feature (`Bowling.setThrower`). */
  thrower: string;
};

export const GAME = {
  /** Player 1 (bucket snowman) on the left of the score panel, player 2 (red-hat snowman) on the right. */
  players: [
    { name: "Bucket", look: "bucket", thrower: "one" },
    { name: "Red Hat", look: "redHat", thrower: "two" },
  ] as const satisfies readonly [PlayerSpec, PlayerSpec],

  score: {
    /** Points for each cut-out knocked down. */
    perCard: 1,
    /** Extra points when every cut-out in the set is down. */
    fullClearBonus: 3,
  },

  /**
   * The camera choreography of a throw (`CameraDirector.tsx`, through the snow scene's camera shots).
   * `rate`s are spring rates per second: about 2 = a calm glide, 6 = follows with a little physical lag,
   * 12 = tight. Distances in scene units (one unit = one character height), angles and fov in degrees.
   */
  camera: {
    /**
     * Aim: as the pull grows (share of full pull, to the power `curve`) the player's view moves `closer` of
     * the way toward what it looks at, `lower` units down, its look point `lookBack` units back toward the
     * thrower and `followSlide` of the thrower's slide sideways. The player can still turn and zoom.
     */
    aim: { closer: 0.16, lower: 1.1, lookBack: 1.4, followSlide: 0.35, curve: 1.3, rate: 4 },
    /**
     * Launch: a push forward (units per second) and a field-of-view kick (degrees per second) on the camera's
     * springs, times the pull's power (never less than `minShare`), and for the first `time` seconds the
     * camera follows the ball at the quicker `rate` before settling into the chase. The lens widens to the
     * chase lens over `lensTime` seconds, while the camera dives in (widening it while still far away
     * would look like a zoom out).
     */
    launch: { push: 9, fovKick: 45, minShare: 0.35, time: 0.45, rate: 7, lensTime: 0.55 },
    /**
     * Chase: `back` units behind the ball (plus `backPerRadius` of its radius) and `height` above the snow
     * (plus `heightPerRadius`), looking `ahead` units down the lane at `lookHeight`. A wider lens than the
     * throwing view sells speed: `fov`, plus `fovPerSpeed` degrees per unit per second up to `fullSpeed`.
     * The camera stops `stopBefore` units in front of the pin spot and only turns to look from there.
     */
    chase: {
      back: 2.6,
      backPerRadius: 2.6,
      height: 1.05,
      heightPerRadius: 1.6,
      ahead: 2.6,
      lookHeight: 0.25,
      fov: 30,
      fovPerSpeed: 0.9,
      fullSpeed: 12,
      stopBefore: 2.2,
      rate: 5.5,
      lookRate: 9,
    },
    /**
     * Impact: when the ball is `triggerAhead` units before the pin spot (or the hit-stop starts, or it
     * stops), the camera eases to a three-quarter view: `angle` off the lane toward the side the ball is on
     * (straight lanes: right, unless the ball is `sideDeadZone` left of the middle), `distance` from the pin
     * spot and `height` up, looking `lookBack` behind the spot (and `lookSide` toward the camera's side).
     * It holds there through "N down!" until the pins pop back.
     */
    impact: {
      triggerAhead: 1.3,
      sideDeadZone: 0.25,
      angle: 40,
      distance: 5,
      height: 2.1,
      lookBack: -0.45,
      lookSide: -0.15,
      lookHeight: 0.35,
      fov: 30,
      rate: 3.2,
      lookRate: 4,
    },
    /** Return: the calm glide back to the throwing view once the pins pop back up. */
    ret: { rate: 1.9 },
    /** "Reduce motion": no swoops, the view only leans `share` of the ball's way down the lane (at most `max`). */
    reduced: { share: 0.22, max: 1.1, rate: 2.5 },
  },

  timing: {
    /**
     * After the pins stand again (their bounce has landed), the turn passes after this long.
     * Short on purpose: the next player should be able to throw within about a second.
     */
    passTurnAfterReady: 0.25,
    /**
     * Once the throw is counted, a ball still resting in the snow melts away after this long, so the
     * pins never wait for it (the bowling ball otherwise rests 6 s and pins wait for it to leave).
     */
    meltBallAfterResult: 1.1,
    /** The "Red Hat's turn" note shows this long. */
    turnNoteFor: 1.6,
    /** The first-time hint fades out over this long after the first throw. */
    hintFade: 0.9,
  },
} as const;

export const TEXT = {
  hint: "hold Space or drag the snowman back",
  /** Second line, wider screens only. */
  hintMore: "let go to roll · A / D to slide",
  /** Touch screens get this instead of the Space line. */
  hintTouch: "drag the snowman back, let go to roll",
  turn: (name: string) => `${name}'s turn!`,
  cancel: "Put it down",
  cancelTitle: "Cancel this pull (Esc)",
};
