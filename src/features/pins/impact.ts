/**
 * The weight of the hit (Rachel: the cards must not feel like light paper that just tips over; the hit should feel
 * heavy and satisfying, and the snowball itself should get smashed). Read by `PinsStage.tsx` on top of `PINS` in
 * `content.ts` (kept apart while that file belonged to another session; fold it in later).
 *
 * Watch it, don't read it: a card that is down (past `PINS.down.tiltDegrees`) less than about 0.15 s after the ball
 * touches it is too light. The development build logs each card's time in the console (`window.__falls`).
 */
export const IMPACT = {
  card: {
    /**
     * Heavier to turn: each card's spin inertia is `inertia` times a plain board's of its size and mass, so it takes
     * the blow first (a shove and a squash) and only then tips over, with weight.
     */
    inertia: 3,
    /**
     * For the first `for` seconds after the ball touches it, a card spins at most `max` radians per second (instead of
     * `PINS.caps.angular`): it takes the blow before it tips, so it can never be down in under about 0.2 s.
     */
    firstSpin: { max: 3.0, for: 0.3 },
    /** On the ball's first touch: the shove along the ball's way, the lift and the tumble, as shares of `PINS.impact`. */
    shove: 1.7,
    lift: 0.5,
    tumble: 0.35,
    /** The squash a card takes from the blow (a spring kick, drawing only). */
    squash: 0.14,
    /** Its base digs a short groove in the snow along the shove: `length` units, `share` of its width across. */
    groove: { length: 0.32, share: 0.8 },
    /** How much snow each weight class knocks off the ball (times bowling's `FEEL.impact.perCard`). */
    chip: { light: 0.75, medium: 1, heavy: 1.5 } as Record<"light" | "medium" | "heavy", number>,
  },
  /**
   * The first contact of a throw, on top of `PINS.hitStop`: a faster ball holds the hit-stop up to `speedExtra` seconds
   * longer and up to `speedSlower` slower (at `speedFull` units per second), so a big fast ball lands the heaviest blow.
   */
  hitStop: { speedExtra: 0.06, speedSlower: 0.04, speedFull: 12 },
  /**
   * The "crump" under the first contact: the thump (`PINS.hitStop.thump`) and, `echo` seconds later, a second softer one
   * (`echoShare` of it), so it lands as a deep, soft double "cr-ump" rather than a tap. Vibration `hit` at `haptic` ×
   * size and speed.
   */
  crump: { echo: 0.045, echoShare: 0.6, haptic: 1 },
  /**
   * Landing with weight: a soft thud (thump size `thud` × how hard it landed, only above `thudFrom`, and at most one every
   * `gap` seconds so a chain stays soft) and a bigger puff of snow (`puff` × `PINS.landing.puff`).
   */
  landing: { thud: 0.16, thudFrom: 0.35, gap: 0.14, puff: 1.6 },
  /**
   * The count is quick (Rachel: the score was far too slow). Each card adds its "+1" the moment it falls. "N down!"
   * pops once the ball is through the crowd and no card has moved for `settle` seconds, at the latest `within` seconds
   * after the ball first meets a card (or rolls past them all), even while the ball still rolls on to the wall: the
   * bounce and the roll back are a bonus show, and cards they knock add their "+1" and tick "N down!" up (`recount`).
   * The cards pop back (and the next turn comes) once "N down!" has shown `showAtLeast` seconds and the ball has
   * poofed or stopped, at the latest `nextTurnCap` seconds after the count (a ball still rolling then poofs); the
   * pop-back and the hand-over take about 0.85 s more, so the next turn comes at most about 2.5 s after "N down!". A
   * full clear or a new set keeps the pins' own longer pause.
   */
  count: { settle: 0.35, within: 1.3, showAtLeast: 1.0, nextTurnCap: 1.7 },
} as const;
