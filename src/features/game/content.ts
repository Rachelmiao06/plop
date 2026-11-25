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
   * The short camera follow while the ball rolls: the view slides this share of the ball's way down the
   * lane, at most `max` units, easing in at `easeIn` and back at `easeBack` (share per second) after the hit.
   */
  cameraFollow: { share: 0.22, max: 1.1, easeIn: 3, easeBack: 1.8 },

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
