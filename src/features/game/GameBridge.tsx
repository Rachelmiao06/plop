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

import { lockThrows, meltRestingBalls, switchThrower } from "./bowlingLink";
import { GAME } from "./content";
import { dayFor, type Game } from "./rules";

/** Shared with the page around the canvas (the cancel button needs the running bowling game). */
export type GameLink = ReturnType<typeof createLink>;

/**
 * The running bowling games, by slot: "solo" in turns mode (one thrower who changes hats), "left" and "right" in
 * "together" mode (two throwers side by side). Each `BowlingStage` hands its game in with `onGame`.
 */
export function createLink() {
  const games = new Map<string, Bowling>();
  return {
    /** The first running game (the camera and turns mode use one). */
    get: (): Bowling | null => games.values().next().value ?? null,
    all: (): Bowling[] => [...games.values()],
    set: (slot: string, b: Bowling | null) => void (b ? games.set(slot, b) : games.delete(slot)),
    /** Forget every slot not in this list (the mode changed and those stages went away). */
    keep(slots: readonly string[]) {
      for (const slot of [...games.keys()]) if (!slots.includes(slot)) games.delete(slot);
    },
  };
}

export function GameBridge({ game, pins, link }: { game: Game; pins: Pins; link: GameLink }) {
  const bound = useRef(new Map<Bowling, () => void>());
  /** Scene-clock times for the next scheduled steps (null = nothing waiting). */
  const due = useRef<{ melt: number | null; pass: number | null; gain: number | null; now: number }>({
    melt: null,
    pass: null,
    gain: null,
    now: 0,
  });

  // "Together" mode: the pins hold the count until both players have thrown this round.
  useEffect(() => pins.setCountGate(() => game.countGate()), [game, pins]);

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
          // Together: the second player's points fly a moment after the first's.
          if (e.result.byThrower) d.gain = d.now + GAME.timing.secondGainAfter;
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

  // Let go of the bowling games when this goes away.
  useEffect(() => {
    const map = bound.current;
    return () => {
      map.forEach((off) => off());
      map.clear();
    };
  }, []);

  useFrame((state) => {
    const d = due.current;
    d.now = state.clock.elapsedTime;

    // Bind every running bowling game (one, or two in "together" mode; again if one was remade).
    const games = link.all();
    for (const [old, off] of bound.current) {
      if (games.includes(old)) continue;
      off();
      bound.current.delete(old);
    }
    for (const bowling of games) {
      if (bound.current.has(bowling)) continue;
      const offEvents = bowling.subscribe((e) => {
        if (e.type === "pressed") game.setPulling(true);
        if (e.type === "cancelled") game.setPulling(link.all().some((g) => g !== bowling && g.thrower.phase === "pulling"));
        if (e.type === "launched") game.launched(e.thrower);
      });
      const unlock = lockThrows(bowling, () => {
        const phase = pins.getState().phase;
        return game.canThrow(phase === "ready", game.playerOf(bowling.thrower.id), phase === "throw");
      });
      bound.current.set(bowling, () => {
        offEvents();
        unlock();
      });
    }
    const bowling = games[0] ?? null;

    if (d.melt !== null && d.now >= d.melt) {
      d.melt = null;
      for (const g of games) meltRestingBalls(g, PINS.ball.fadeTime);
    }
    if (d.gain !== null && d.now >= d.gain) {
      d.gain = null;
      game.flushGain();
    }
    if (d.pass !== null && d.now >= d.pass) {
      d.pass = null;
      game.passTurn();
    }

    // The thrower on the line is whoever's turn it is (switching waits until the thrower is ready).
    if (bowling && game.getState().mode === "turns" && game.getState().stage === "aim") switchThrower(bowling, game.throwerId());
  });

  return null;
}
