/**
 * Sound and vibration for the throw, driven by the game's state and events.
 * Sound comes from the shared engine in `src/lib/audio.ts` (not changed here).
 * Vibration lives in this feature for now (`haptics.ts`); a shared `src/lib/haptics.ts` is a later issue.
 */
import { playWhoosh, setCrunch, stopCrunch } from "@/lib/audio";

import { vibrate } from "./haptics";
import type { Bowling } from "./simulation";
import { clamp01, lerp } from "./vec";

export type Feedback = {
  /** Call once per frame, after `bowling.step`. Keeps the rolling crunch in step with the balls. */
  update(): void;
  dispose(): void;
};

export function connectFeedback(game: Bowling): Feedback {
  let crunching = false;

  const off = game.subscribe((e) => {
    const h = game.feel.haptics;
    switch (e.type) {
      case "charged":
        vibrate(h.charged);
        break;
      case "launched":
        // A soft push of air as the ball sets off; the crunch carries the roll.
        playWhoosh(e.plan.power * 0.5);
        vibrate(lerp(h.launchWeak, h.launchStrong, e.plan.power));
        break;
    }
  });

  return {
    update() {
      // One crunch channel: follow whichever ball is rolling hardest.
      const s = game.feel.sound;
      let speed = 0;
      let size = 0;
      const consider = (ballSpeed: number, ballSize: number) => {
        if (ballSpeed < s.crunchSilentBelow) return;
        const v = clamp01(ballSpeed / s.crunchFullSpeed);
        if (v > speed) {
          speed = v;
          size = ballSize;
        }
      };
      const pulled = game.thrower.ball;
      if (pulled) consider(pulled.speed, pulled.size);
      for (const ball of game.balls) if (ball.rolling) consider(ball.speed, ball.plan.size);

      if (speed > 0) {
        setCrunch(speed, size);
        crunching = true;
      } else if (crunching) {
        stopCrunch();
        crunching = false;
      }
    },
    dispose() {
      off();
      stopCrunch();
    },
  };
}
