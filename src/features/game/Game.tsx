"use client";

/**
 * The whole game on one screen: the snow in the throwing view, the village, the throw, the pins, the score
 * panel, "N down!", the hints and the turn note, and the match around them (the "3 or 5 rounds" card, a new set
 * each round, the end card). The home page only renders this.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { BowlingStage, FEEL } from "@/features/bowling";
import { MatchEnd, MatchStart, ScoreHud } from "@/features/hud";
import { createPins, formationById, PinsPopup, PinsStage, softSnowFor } from "@/features/pins";
import { PaperFinish } from "@/features/look";
import { Village } from "@/features/scenery";
import { SnowScene } from "@/features/snow-scene";

import { GAME, type MatchLength } from "./content";
import { CameraDirector } from "./CameraDirector";
import { createLink, GameBridge } from "./GameBridge";
import { CancelPull, GameHint, SpecialHint, TurnNote } from "./GameOverlay";
import { gameCss, styles } from "./gameStyles";
import { createGame } from "./rules";
import { ThrowingView } from "./ThrowingView";

const players = [
  { name: GAME.players[0].name, look: GAME.players[0].look },
  { name: GAME.players[1].name, look: GAME.players[1].look },
] as const;

/** Playing alone, the best total for each match length is kept on this device (never required: storage may fail). */
function readBest(rounds: MatchLength): number | null {
  try {
    const v = window.localStorage.getItem(`${GAME.match.bestKey}.${rounds}`);
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
function writeBest(rounds: MatchLength, total: number) {
  try {
    window.localStorage.setItem(`${GAME.match.bestKey}.${rounds}`, String(total));
  } catch {
    // A private window or blocked storage: the best is simply not remembered.
  }
}

export function Game() {
  const [game] = useState(() => createGame());
  const [pins] = useState(() => createPins(GAME.match.rounds[GAME.match.lengths[0]][0], { autoNext: false }));
  const [link] = useState(createLink);
  const state = useSyncExternalStore(game.subscribe, game.getState, game.getState);
  const set = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
  /** Playing alone: the best total before this match started (the end card compares with it). */
  const [bestBefore, setBestBefore] = useState<number | null>(null);
  const saved = useRef(false);

  // The current set's soft mounds, for the roll.
  const softAt = useMemo(() => softSnowFor(formationById(set.formation)) ?? undefined, [set.formation]);

  // Space throws, so it must never also press a button that still has focus (a toggle just tapped).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.closest("button")) el.blur();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, []);

  /** A new match: the first round's set comes in (the cards pop back if it is already there). */
  const begin = useCallback(
    (rounds: MatchLength, playing: 1 | 2, again: boolean) => {
      if (again) game.again();
      else game.start(rounds, playing);
      const first = game.setFor(0, rounds);
      if (pins.getState().formation !== first) pins.setFormation(first);
      else pins.reset();
      setBestBefore(playing === 1 ? readBest(rounds) : null);
      saved.current = false;
    },
    [game, pins],
  );

  // Playing alone: remember a new best once the match is over.
  useEffect(() => {
    if (state.phase !== "over" || state.players !== 1 || saved.current) return;
    saved.current = true;
    if (bestBefore === null || state.scores[0] > bestBefore) writeBest(state.rounds, state.scores[0]);
  }, [state.phase, state.players, state.rounds, state.scores, bestBefore]);

  const solo = state.players === 1;
  const bestThrow = (() => {
    const [a, b] = state.best;
    const pick = !b || solo || (a && a.points >= b.points) ? (a ? { p: 0, ...a } : null) : { p: 1, ...b };
    return pick && pick.points > 0 ? { name: players[pick.p].name, points: pick.points, round: pick.round + 1 } : null;
  })();

  return (
    <main className={`relative h-dvh w-full overflow-hidden ${styles.root}`}>
      <style href="plop-game" precedence="default">
        {gameCss}
      </style>
      <SnowScene>
        <ThrowingView />
        <Village lane={FEEL.lane} />
        <BowlingStage pinRing={false} softAt={softAt} />
        <PinsStage pins={pins} />
        <GameBridge game={game} pins={pins} link={link} />
        <CameraDirector pins={pins} link={link} />
      </SnowScene>
      <PaperFinish />
      <GameHint game={game} />
      <SpecialHint game={game} pins={pins} />
      <TurnNote game={game} pins={pins} />
      <PinsPopup pins={pins} />
      <ScoreHud
        players={[
          { ...players[0], total: state.scores[0] },
          { ...players[1], total: state.scores[1] },
        ]}
        active={state.active}
        down={set.down}
        total={set.total}
        knock={state.knock}
        gain={state.gain}
        round={state.phase === "choosing" ? null : { now: state.round + 1, of: state.rounds }}
        soloBest={solo ? (state.phase === "over" ? Math.max(bestBefore ?? 0, state.scores[0]) : bestBefore) : undefined}
      />
      <CancelPull game={game} link={link} />
      {state.phase === "choosing" && (
        <MatchStart
          lengths={GAME.match.lengths}
          rounds={state.rounds}
          players={state.players}
          onStart={(rounds, playing) => begin(rounds as MatchLength, playing, false)}
        />
      )}
      {state.phase === "over" && (
        <MatchEnd
          players={[
            { ...players[0], total: state.scores[0] },
            { ...players[1], total: state.scores[1] },
          ]}
          solo={solo ? { best: bestBefore } : null}
          bestThrow={bestThrow}
          onAgain={() => begin(state.rounds, state.players, true)}
          onChoose={() => game.choose()}
        />
      )}
    </main>
  );
}
