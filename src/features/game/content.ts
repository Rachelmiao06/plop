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

export type MatchLength = 3 | 5;

/** A round's rule in one language (Rachel: simple English needs no Chinese twin). */
export type RuleWords = {
  big: string;
  line: (points: number) => string;
  chip: string;
};

export const GAME = {
  /** Player 1 (bucket snowman) on the left of the score panel, player 2 (red-hat snowman) on the right. */
  players: [
    { name: "Bucket", look: "bucket", thrower: "one" },
    { name: "Red Hat", look: "redHat", thrower: "two" },
  ] as const satisfies readonly [PlayerSpec, PlayerSpec],

  /**
   * The throwing view on a phone held upright (narrower than `maxAspect`, width / height), #46. A tall frame
   * shows the long lane stretched out, with empty snow below the thrower and the pins pushed up under the
   * score panel. Here the camera looks `lookAtShare` of the way from the line to the pins (at `lookAtHeight`),
   * from `pathAt` on the camera path and `distance` times what the path gives there: lower and further back
   * than on a wide screen, so the lane is shorter on screen, the pins sit near the middle, the village and
   * paper hills show below the panel and the thrower stays clear of the hint. Wider screens keep the
   * scenery's `throwingView` (0.45, 0.4, 0.15, 2.05).
   */
  phoneView: { maxAspect: 0.8, lookAtShare: 0.5, lookAtHeight: 0.35, pathAt: 0.04, distance: 2.4 },

  /**
   * The players' names (`names.ts`): typed on the start card, remembered on this device under `key`. Skipped, a
   * player is their snowman's cute default (`players[i].name`), so a name is never empty anywhere.
   */
  names: { key: "plop.names" },

  /**
   * The guided start (the hud's `StartFlow`): last time's choices (who, how, how long) are remembered under
   * `choiceKey`, so a returning player taps straight through; "how to throw" shows once per device (`howToKey`).
   * "About N minutes" on the cards is estimated from a real throw on the live game (2026-11-25): release to the
   * next turn about 7 s, so about `perThrow` seconds with aiming, plus `perRound` to read each round's rule card.
   * "At the same time" both throw at once, so a round takes about `togetherThrows` throws. Rounded up.
   */
  start: {
    choiceKey: "plop.start",
    howToKey: "plop.howto",
    minutes: { perThrow: 12, perRound: 5, togetherThrows: 1.2 },
  },

  /** The group board on the end card (when there is a group): how many rows. */
  board: { limit: 5 },

  /**
   * Each round's rule card (`RuleCard.tsx`): it shows when a round starts and stays until the player pulls, taps
   * or presses "got it" (no auto-hide). `pop` is its spring in (seconds). The scene marker over the special card
   * (`RuleMarker.tsx`): `lift` above the card's top (scene units), a bounce of `bounce` units every `bounceFor`
   * seconds, and its size in pixels.
   */
  rule: {
    pop: 0.55,
    marker: { lift: 0.03, bounce: 0.09, bounceFor: 1.1, size: 60 },
  },

  score: {
    /** Points for each cut-out knocked down. */
    perCard: 1,
    /** Extra points when every cut-out in the set is down. */
    fullClearBonus: 3,
    // The star friend and the bunny's bonuses are the pins' (`SPECIALS` in pins content): they come with the result.
  },

  /**
   * The match (docs/GAMEPLAY.md section 7c): choose 3 or 5 rounds before the first throw (the first is the
   * default). In each round every player throws once, then the next round brings a new set. `rounds` lists the
   * set (pins `ROUND_SETS` id) of each round, in order: the classic bowling-pin crowd every round, a little shifted, with one small rule each (Rachel).
   */
  match: {
    lengths: [3, 5] as const,
    rounds: {
      3: ["round-strike", "round-star", "round-bunny"],
      5: ["round-strike", "round-star", "round-bunny", "round-mound", "round-cat"],
    } as Record<3 | 5, readonly string[]>,
    /** Playing alone: the best total for each length is remembered on this device under this key. */
    bestKey: "plop.best",
  },

  /**
   * The light over a match (`setTimeOfDay` in snow-scene: 0 = afternoon, 0.5 = sunset, 1 = cosy evening). Round 1 is
   * afternoon; each round's light is spread evenly up to `lastRound` at the last round, so 3 and 5 rounds both end
   * there, and the end card sits in `endCard`. The light only moves after a round's last throw, during "N down!"
   * and the set change (`between` seconds, shorter than that pause, so never during a throw), to the end card over
   * `toEnd`, and back to afternoon over `back` on "play again".
   */
  evening: { lastRound: 0.85, endCard: 1, between: 2.6, toEnd: 3.2, back: 1.8 },

  /**
   * "Together" mode (docs/GAMEPLAY.md 7d): both snowmen on the line at once, Bucket on the left half and Red Hat on
   * the right (`slide`, x on the line; the middle stays free so the two never stand in each other). Keys are
   * physical (`event.code`), one hand each side of a Mac keyboard: Bucket A / D to slide and aim, hold W (or Space)
   * to pull; Red Hat ← / → and hold ↑ (or Enter). W, A, D sit apart from the arrow cluster, so pressing both
   * players' keys at once never ghosts on Apple keyboards (they are wired in separate matrix rows).
   */
  together: {
    slide: { left: [-1.9, -0.45] as [number, number], right: [0.45, 1.9] as [number, number] },
    keys: {
      left: { left: ["KeyA"], right: ["KeyD"], pull: ["KeyW", "Space"] },
      right: { left: ["ArrowLeft"], right: ["ArrowRight"], pull: ["ArrowUp", "Enter"] },
    },
  },

  /**
   * The quiet village ambience (`startAmbience` in src/lib/audio.ts, after the first tap; it follows the sound
   * switch): its volume alone, and a little lower while the music plays.
   */
  sound: { ambienceAlone: 0.65, ambienceUnderMusic: 0.45 },

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
    launch: { push: 9, fovKick: 45, minShare: 0.35, time: 0.5, rate: 8.5, lensTime: 0.55 },
    /**
     * Chase: the camera pushes in only part of the way and never passes the snowman (Rachel): it settles
     * `behind` units behind the throwing line, `height` up (high enough to see over the snowman), following
     * `followX` of the ball's sideways way, and looks at the ball (`ahead` units in front of it, at
     * `lookHeight`). It follows by zooming: the lens keeps about `frame` units of snow in view around the ball (across the
     * narrow side of the screen, so a phone held upright is not zoomed in tighter),
     * between `fovMin` and `fovMax` degrees, so the ball stays big all the way down the lane.
     */
    chase: {
      behind: 3.4,
      height: 2.3,
      followX: 0.45,
      ahead: 0.9,
      lookHeight: 0.3,
      frame: 3.4,
      fovMin: 11,
      fovMax: 40,
      rate: 5,
      lookRate: 8,
    },
    /**
     * Impact: when the ball is `triggerAhead` units before the pin spot (or the hit-stop starts, or it
     * stops), the camera, still behind the line (`behind`, `height`), slides `side` units toward the side the
     * ball is on (`sideDeadZone`: straight balls go right) for a little angle, and zooms in so about `frame`
     * units around the pins fill the view, looking `lookBack` behind the pin spot. It holds through "N down!".
     */
    impact: {
      triggerAhead: 1.3,
      sideDeadZone: 0.25,
      behind: 3.6,
      height: 2.6,
      side: 1.6,
      frame: 3.9,
      lookBack: -0.4,
      lookHeight: 0.4,
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
    /** "Together" mode: the second player's points fly into their total this long after the first's. */
    secondGainAfter: 0.75,
    /** The "Red Hat's turn" note shows this long. */
    turnNoteFor: 1.6,
    /** The first-time hint fades out over this long after the first throw. */
    hintFade: 0.9,
    /** After the last throw is counted, the end card comes this long after the pins stand again. */
    endCardAfter: 0.4,
    /**
     * The safety net (`createWatchdog` in rules.ts): when the game sits in one step longer than this, it moves on by
     * itself, so nobody is ever left without the next turn or the end card. Seconds of play: time only runs while
     * frames are drawn (at most `frameCap` per frame), so a tab in the background never trips it and a very slow
     * phone gets as long as its physics needs. `rolling`: after the last ball of the throw left the hand, the throw is
     * counted as it lies (the pins' own cap is 12 s). `counted`: the pins never stood again, the turn passes anyway.
     * `passing`: the hand-over never came. The last throw of the match uses the shorter `lastCounted` and
     * `lastPassing`: the end card may come while the cards are still popping back. The backup outside the canvas
     * (`Game.tsx`, for a frame loop that stopped altogether) counts only visible seconds with no frame drawn for
     * `stoppedAfter` seconds, and waits `backupTimes` as long.
     */
    watchdog: {
      rolling: 14,
      counted: 10,
      passing: 2,
      lastCounted: 4,
      lastPassing: 1.5,
      frameCap: 0.1,
      backupTimes: 2,
      stoppedAfter: 2,
    },
  },
} as const;

export const TEXT = {
  hint: "hold Space or drag the snowman back",
  /** Second line, wider screens only. */
  hintMore: "let go to roll · A / D to slide",
  /** Touch screens get this instead of the Space line. */
  hintTouch: "drag the snowman back, let go to roll",
  turn: (name: string) => `${name}'s turn!`,
  /** A new round: "Round 2 / 3" and what its set asks. */
  round: (now: number, of: number) => `Round ${now} / ${of}`,
  /** Shown once on the hint: the pencil tick behind the snowman. */
  hintSweet: "the little tick is the sweet spot",
  /** Together mode's hint: each player's keys. */
  hintTogether: (left: string, right: string) => [`${left}: A / D, hold W`, `${right}: ← / →, hold ↑`] as const,
  hintTogetherTouch: "each drag your own snowman back",
  together: "roll together!",
  /** Someone arrived from an invite: the start card greets them, and alone the panel shows the score to beat. */
  waiting: (name: string) => `${name} is waiting`,
  /**
   * Each round's rule (by round set id, the pins' `ROUND_SETS`): `big` a few big words on the rule card, `line` the
   * one plain line under the picture (`points` is the bonus from the pins' `SPECIALS`, or the full-clear bonus),
   * `chip` two words on the reminder beside the score panel. Simple English only (one language per line).
   */
  rules: {
    "round-strike": {
      big: "Strike!",
      line: (p: number) => `Knock them all down: +${p} extra`,
      chip: "strike",
    },
    "round-star": {
      big: "Hit the star",
      line: (p: number) => `The friend with a star: +${p} when it falls`,
      chip: "hit the star",
    },
    "round-bunny": {
      big: "Leave the bunny",
      line: (p: number) => `Leave the bunny standing: +${p}`,
      chip: "leave the bunny",
    },
    "round-mound": {
      big: "Little mound",
      line: () => "Soft snow slows the ball: roll around it",
      chip: "go around",
    },
    "round-cat": {
      big: "Sleepy cat",
      line: (p: number) => `Don't wake the cat: +${p} if it stays asleep`,
      chip: "shh, cat",
    },
  } as Record<string, RuleWords>,
  ruleGotIt: "got it",
  ruleTurn: (name: string) => `${name} first`,
  cancel: "Put it down",
  cancelTitle: "Cancel this pull (Esc)",
};
