/**
 * The camera's follow of a throw (`CameraDirector.tsx`): the chase down the lane, the bounce off the back wall and
 * the settle on the pins, in turns mode and "together" mode. Aim, launch, return and "reduce motion" are still
 * `GAME.camera` in `content.ts`; these numbers replace its `chase` and `impact` (kept there, unused, until that file
 * is free to tidy).
 *
 * The camera never drives itself: every move is a soft offset on top of the player's own view (the snow scene's
 * camera shots), so turning and zooming still work underneath. `rate`s are spring rates per second: about 2 = a calm
 * glide, 4 = follows with a gentle lag, 8 = tight. Distances in scene units (one unit = one character height).
 */
export const CAMERA = {
  /**
   * The chase (Rachel: the camera should visibly follow the ball, gently). The look-at point rides on the ball
   * (`ahead` units in front of it along its way, at `lookHeight`), lagging softly (`lookRate`). The camera glides in
   * toward the lane and rises as the ball gets further: `closer` is the share of the way toward the player's own
   * look-at point (as the snow scene's `closer`), `rise` units up, both `atPins` of the way when the ball reaches the
   * pins and in full at the back wall (`wallZ` from the line), at `rate`. It never passes the snowman (Rachel): from
   * the throwing view at full glide the snowman's head sits just inside the bottom of the frame while the ball is at
   * the pins and slips just out of it while the ball is at the wall. The lens widens from the scene's own to `fovFar`
   * degrees by then, so the far end stays in view. It only moves on: rolling back does not pull it back.
   * Once the ball is past the pins, the look-at point stays `keepPins` of the way back toward the set, so the cards
   * (and any knocked over on the way back) stay in the picture.
   */
  chase: {
    ahead: 0.6,
    lookHeight: 0.3,
    lookRate: 3.4,
    closer: 0.25,
    rise: 0.5,
    atPins: 0.7,
    wallZ: 14.5,
    fovFar: 24,
    rate: 2.6,
    keepPins: 0.3,
  },
  /**
   * The settle: once the ball has stopped or poofed (or the count is in), the look-at point eases onto the pins (`lookBack`
   * units behind the set's middle, at `lookHeight`), the camera holds where the chase left it and the lens comes
   * back to the scene's own, all at `rate` (`lookRate` for the look-at point). It holds through "N down!"; the glide
   * home is `GAME.camera.ret`.
   */
  settle: { lookBack: -0.3, lookHeight: 0.35, rate: 2.2, lookRate: 2.6 },
  /**
   * "Together" mode: both balls at once, so no chase of one. The look-at point leans `share` of the way from the
   * player's own toward the middle of the balls still rolling (at most `max` units), and the camera glides `closer`
   * in, times how far down the lane they are (`wallZ` from the line = in full), gently (`rate`). Never dropped by
   * a key: the other player's keys must not end it. After the throws it eases onto the pins like the settle.
   */
  together: { share: 0.55, max: 5, closer: 0.12, wallZ: 14.5, rate: 2, lookRate: 2.6 },
} as const;
