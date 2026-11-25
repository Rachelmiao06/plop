/**
 * Sound and vibration for the slingshot, driven by its state and events.
 * Sound comes from the shared engine in `src/lib/audio.ts` (not changed here).
 * Vibration lives in this feature for now (`haptics.ts`); a shared `src/lib/haptics.ts` is a later issue.
 */
import { playThump, playWhoosh, setCrunch, stopCrunch } from "@/lib/audio";

import { vibrate } from "./haptics";
import { PLAYER_IDS, type Slingshot } from "./simulation";
import { clamp01, lerp } from "./vec";

export type Feedback = {
  /** Call once per frame, after `sim.step`. Keeps the rolling crunch in step with the balls. */
  update(): void;
  dispose(): void;
};

export function connectFeedback(sim: Slingshot): Feedback {
  let crunching = false;

  const off = sim.subscribe((e) => {
    const h = sim.feel.haptics;
    switch (e.type) {
      case "charged":
        vibrate(h.charged);
        break;
      case "launched":
        playWhoosh(e.arc.power);
        vibrate(lerp(h.launchWeak, h.launchStrong, e.arc.power));
        break;
      case "landed":
        playThump(e.size);
        break;
      case "hit":
        vibrate(h.hit);
        break;
    }
  });

  return {
    update() {
      // One crunch channel: follow whichever ball is rolling hardest.
      const s = sim.feel.sound;
      let speed = 0;
      let size = 0;
      for (const id of PLAYER_IDS) {
        const ball = sim.players[id].ball;
        if (!ball || ball.speed < s.crunchSilentBelow) continue;
        const v = clamp01(ball.speed / s.crunchFullSpeed);
        if (v > speed) {
          speed = v;
          size = ball.size;
        }
      }
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
