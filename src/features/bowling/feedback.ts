/**
 * Sound and vibration for the throw, driven by the game's state and events.
 * Sound comes from the shared engine in `src/lib/audio.ts`, vibration from `src/lib/haptics.ts`.
 *
 * Each key moment gets a beat you can feel (vibration on phones that can), hear and see:
 * press (a soft pat, a tap), pulling (crunch ticks that quicken as the ball grows), full charge
 * (a clunk and a stronger pulse), letting go (the whoosh and a launch pulse). The drawing side of each
 * beat (squash, hop) lives in the stage; it reads `beats` to stay in step with the ticks.
 */
import { playThump, playWhoosh, setCrunch, stopCrunch } from "@/lib/audio";
import { haptic } from "@/lib/haptics";

import type { Bowling } from "./simulation";
import { clamp01, lerp } from "./vec";

export type Feedback = {
  /** Call once per frame, after `bowling.step`, with the same (game-time) frame length. */
  update(dt: number): void;
  /** Counts that go up on each beat, so the drawing can kick a squash in the same frame. */
  readonly beats: { ticks: number };
  dispose(): void;
};

export function connectFeedback(game: Bowling): Feedback {
  let crunching = false;
  let later: ReturnType<typeof setTimeout> | undefined;
  let tickPhase = 0;
  const beats = { ticks: 0 };

  const off = game.subscribe((e) => {
    const b = game.feel.beats;
    switch (e.type) {
      case "pressed":
        tickPhase = 0;
        playThump(b.pressThump);
        haptic("tap");
        break;
      case "charged":
        playThump(b.chargeThump);
        haptic("charge");
        break;
      case "launched":
        // A soft push of air as the ball sets off; the crunch carries the roll.
        // The whoosh scales with how fast the ball leaves.
        // Power you can hear: a low push-off thump, the whoosh, and a second whoosh layered on a strong pull.
        const whoosh = clamp01(e.plan.startSpeed / b.whooshFullSpeed) * (0.45 + 0.55 * e.plan.power);
        playThump(b.pushThump * e.plan.power);
        playWhoosh(whoosh);
        if (e.plan.power > b.whooshDoubleFrom) {
          const again = whoosh * e.plan.power;
          later = setTimeout(() => playWhoosh(again), b.whooshDoubleDelay * 1000);
        }
        haptic("launch", e.plan.power);
        break;
    }
  });

  return {
    beats,
    update(dt) {
      // Pulling: crunch ticks, quicker for a bigger ball, only while it actually rolls.
      const pulled = game.thrower.ball;
      if (pulled) {
        const b = game.feel.beats;
        const rate = lerp(b.ticksSmall, b.ticksBig, pulled.size) * clamp01(pulled.speed / b.tickFullSpeed);
        tickPhase += rate * dt;
        if (tickPhase >= 1) {
          tickPhase -= Math.floor(tickPhase);
          beats.ticks++;
          haptic("tick", pulled.size);
        }
      }

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
      clearTimeout(later);
      stopCrunch();
    },
  };
}
