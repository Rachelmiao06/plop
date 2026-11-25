"use client";

/**
 * Connects the throw (bowling) and the pins to the game's rules. Render inside `<SnowScene>`, next to
 * `<BowlingStage />` and `<PinsStage />`. Draws nothing.
 *
 * - bowling `pressed` / `launched` / `cancelled` → pulling, and the throw starts
 * - pins `knocked` → "+1"s · `result` → points (and, after a round's last throw, the next round's set is asked
 *   for) · `ready` → the turn passes a moment later (or the next round starts, or the match ends)
 * - a pull may only start while it is the aim stage and the pins stand still
 * - the thrower follows whose turn it is
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import type { Bowling } from "@/features/bowling";
import { PINS, type Pins } from "@/features/pins";
import { easeTimeOfDay } from "@/features/snow-scene";

import { findBowling, lockThrows, meltRestingBalls, switchThrower } from "./bowlingLink";
import { GAME } from "./content";
import { dayFor, type Game } from "./rules";

/** Shared with the page around the canvas (the cancel button needs the running bowling game). */
export type GameLink = ReturnType<typeof createLink>;

export function createLink() {
  let bowling: Bowling | null = null;
  return {
    get: () => bowling,
    set: (b: Bowling | null) => void (bowling = b),
  };
}

export function GameBridge({ game, pins, link }: { game: Game; pins: Pins; link: GameLink }) {
  const bound = useRef<{ bowling: Bowling; off: () => void } | null>(null);
  /** Scene-clock times for the next scheduled steps (null = nothing waiting). */
  const due = useRef<{ melt: number | null; pass: number | null; now: number }>({ melt: null, pass: null, now: 0 });

  // Pins → rules.
  useEffect(
    () =>
      pins.subscribe((e) => {
        const d = due.current;
        if (e.type === "knocked") game.knocked(e.down);
        if (e.type === "result") {
          // The last throw of a round: once "N down!" has been seen, the next round's set comes instead of a reset.
          const st = game.getState();
          if (st.phase === "playing" && game.lastOfRound()) {
            // The light moves on now, during "N down!" and the set change, never while a ball rolls.
            const ev = GAME.evening;
            if (!game.lastRound()) {
              pins.changeAfterResult(game.setFor(st.round + 1));
              easeTimeOfDay(dayFor(st.round + 1, st.rounds), ev.between);
            } else easeTimeOfDay(ev.endCard, ev.toEnd);
          }
          game.result(e.result);
          d.melt = d.now + GAME.timing.meltBallAfterResult;
        }
        if (e.type === "ready") {
          game.pinsReady();
          const st = game.getState();
          if (st.stage === "passing") {
            const lastThrow = game.lastOfRound() && game.lastRound();
            d.pass = d.now + (lastThrow ? GAME.timing.endCardAfter : GAME.timing.passTurnAfterReady);
          }
        }
      }),
    [game, pins],
  );

  // Let go of the bowling game when this goes away.
  useEffect(
    () => () => {
      bound.current?.off();
      bound.current = null;
      link.set(null);
    },
    [link],
  );

  useFrame((state) => {
    const d = due.current;
    d.now = state.clock.elapsedTime;

    // Find the running bowling game (and again if it was remade, e.g. after a hot reload).
    const bowling = findBowling();
    if (bowling && bowling !== bound.current?.bowling) {
      bound.current?.off();
      const offEvents = bowling.subscribe((e) => {
        if (e.type === "pressed") game.setPulling(true);
        if (e.type === "cancelled") game.setPulling(false);
        if (e.type === "launched") game.launched();
      });
      const unlock = lockThrows(bowling, () => game.canThrow(pins.getState().phase === "ready"));
      bound.current = {
        bowling,
        off: () => {
          offEvents();
          unlock();
        },
      };
      link.set(bowling);
    }

    if (d.melt !== null && d.now >= d.melt) {
      d.melt = null;
      if (bowling) meltRestingBalls(bowling, PINS.ball.fadeTime);
    }
    if (d.pass !== null && d.now >= d.pass) {
      d.pass = null;
      game.passTurn();
    }

    // The thrower on the line is whoever's turn it is (switching waits until the thrower is ready).
    if (bowling && game.getState().stage === "aim") switchThrower(bowling, game.throwerId());
  });

  return null;
}
