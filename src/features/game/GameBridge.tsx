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
 * - the safety net (`createWatchdog`): a step that never comes (a result, the pins standing, the hand-over) is taken
 *   anyway after `GAME.timing.watchdog`, so the next turn and the end card always come
 */
import type { MatchStatsTracker } from "./matchStats";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import type { Bowling } from "@/features/bowling";
import { PINS, type Pins } from "@/features/pins";
import { easeTimeOfDay } from "@/features/snow-scene";

import { lockThrows, meltRestingBalls, switchThrower } from "./bowlingLink";
import { GAME } from "./content";
import { createWatchdog, dayFor, type Game, type StallStep, type ThrowCount } from "./rules";

/** Shared with the page around the canvas (the cancel button needs the running bowling game). */
export type GameLink = ReturnType<typeof createLink>;

/**
 * The running bowling games, by slot: "solo" in turns mode (one thrower who changes hats), "left" and "right" in
 * "together" mode (two throwers side by side). Each `BowlingStage` hands its game in with `onGame`.
 */
export function createLink() {
  const games = new Map<string, Bowling>();
  let frameAt = 0;
  return {
    /** When the canvas last drew a frame (`performance.now()`), for the safety net's backup in `Game.tsx`. */
    frameAt: () => frameAt,
    drewFrame: () => void (frameAt = performance.now()),
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

/**
 * A throw's result reaches the rules (from the pins, or forced by the safety net). After a round's last throw, once
 * "N down!" has been seen, the next round's set comes instead of a reset, and the light moves on. Returns false when
 * the throw was already counted (a late result after the safety net counted it is ignored).
 */
function countThrow(game: Game, pins: Pins, result: ThrowCount, forced: boolean): boolean {
  const st = game.getState();
  if (st.phase !== "playing" || st.stage !== "rolling") return false;
  if (game.lastOfRound()) {
    // The light moves on now, during "N down!" and the set change, never while a ball rolls.
    const ev = GAME.evening;
    if (!game.lastRound()) {
      const next = game.setFor(st.round + 1);
      // Forced: the pins never counted this throw, so they will not wait for "N down!"; change the set now.
      if (forced) pins.setFormation(next);
      else pins.changeAfterResult(next);
      easeTimeOfDay(dayFor(st.round + 1, st.rounds), ev.between);
    } else easeTimeOfDay(ev.endCard, ev.toEnd);
  } else if (forced) pins.reset();
  game.result(result);
  return true;
}

/**
 * The safety net's step (see `createWatchdog` in rules.ts): count a throw that never got its result (as the cards lie
 * now), go on as if the pins stood again, or hand over now. Used inside the canvas and by the backup in `Game.tsx`.
 */
export function applyStall(step: StallStep, game: Game, pins: Pins): void {
  const st = game.getState();
  if (process.env.NODE_ENV !== "production") console.warn(`[plop] safety net: ${step} (${st.stage}, round ${st.round + 1})`);
  if (step === "count") countThrow(game, pins, game.liveCount(), true);
  else game.stall(step);
}

/** How long after the pins stand the hand-over comes: the end card's pause after the match's last throw. */
const passDelay = (game: Game) =>
  game.lastOfRound() && game.lastRound() ? GAME.timing.endCardAfter : GAME.timing.passTurnAfterReady;

export function GameBridge({ game, pins, link, stats }: { game: Game; pins: Pins; link: GameLink; stats?: MatchStatsTracker }) {
  const bound = useRef(new Map<Bowling, () => void>());
  /** The safety net's clock (seconds of play in the current step). */
  const watchdog = useRef(createWatchdog());
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
        // The play-style numbers for the board's titles (each round's count per player; a recount replaces it).
        if (stats && (e.type === "result" || e.type === "recount") && game.getState().phase === "playing") {
          const { round, active } = game.getState();
          if (e.result.byThrower) for (const [id, r] of Object.entries(e.result.byThrower)) stats.counted(stats.playerOf(id), round, r);
          else stats.counted(active, round, e.result);
        }
        // The bonus show (the roll back from the wall) knocked more: their "+1"s and the extra points.
        if (e.type === "recount" && game.recount(e.result)) d.gain = d.now + GAME.timing.secondGainAfter;
        if (e.type === "result" && countThrow(game, pins, e.result, false)) {
          d.melt = d.now + GAME.timing.meltBallAfterResult;
          // Together: the second player's points fly a moment after the first's.
          if (e.result.byThrower) d.gain = d.now + GAME.timing.secondGainAfter;
        }
        if (e.type === "ready") {
          game.pinsReady();
          const st = game.getState();
          if (st.stage === "passing") d.pass = d.now + passDelay(game);
        }
      }),
    [game, pins, stats],
  );

  // Let go of the bowling games when this goes away.
  useEffect(() => {
    const map = bound.current;
    return () => {
      map.forEach((off) => off());
      map.clear();
    };
  }, []);

  useFrame((state, delta) => {
    const d = due.current;
    d.now = state.clock.elapsedTime;
    link.drewFrame();

    // The safety net, on seconds of play (no frames in a background tab: nothing is counted while it is away).
    const stall = watchdog.current.tick(game.getState(), Math.min(delta, GAME.timing.watchdog.frameCap));
    if (stall) {
      applyStall(stall, game, pins);
      if (stall === "pass") d.pass = null;
      if (stall === "count") d.melt = d.now + GAME.timing.meltBallAfterResult;
      if (stall === "ready" && game.getState().stage === "passing") d.pass = d.now + passDelay(game);
    }

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
        if (e.type === "launched") {
          game.launched(e.thrower);
          stats?.launched(stats.playerOf(e.thrower), e.plan.power);
        }
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
