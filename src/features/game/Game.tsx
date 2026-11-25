"use client";

/**
 * The whole game on one screen: the snow in the throwing view, the village, the throw, the pins, the score
 * panel, "N down!", the hint and the turn note. The home page only renders this.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

import { BowlingStage, FEEL } from "@/features/bowling";
import { ScoreHud } from "@/features/hud";
import { createPins, PinsPopup, PinsStage } from "@/features/pins";
import { throwingView, Village } from "@/features/scenery";
import { SnowCameraView, SnowScene } from "@/features/snow-scene";

import { GAME } from "./content";
import { CameraDirector } from "./CameraDirector";
import { createLink, GameBridge } from "./GameBridge";
import { CancelPull, GameHint, TurnNote } from "./GameOverlay";
import { gameCss, styles } from "./gameStyles";
import { createGame } from "./rules";

const players = [
  { name: GAME.players[0].name, look: GAME.players[0].look },
  { name: GAME.players[1].name, look: GAME.players[1].look },
] as const;

export function Game() {
  const [game] = useState(() => createGame());
  const [pins] = useState(() => createPins());
  const [link] = useState(createLink);
  const state = useSyncExternalStore(game.subscribe, game.getState, game.getState);
  const set = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);

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

  return (
    <main className={`relative h-dvh w-full overflow-hidden ${styles.root}`}>
      <style href="plop-game" precedence="default">
        {gameCss}
      </style>
      <SnowScene>
        <SnowCameraView {...throwingView(FEEL.lane)} />
        <Village lane={FEEL.lane} />
        <BowlingStage />
        <PinsStage pins={pins} />
        <GameBridge game={game} pins={pins} link={link} />
        <CameraDirector pins={pins} link={link} />
      </SnowScene>
      <GameHint game={game} />
      <TurnNote game={game} />
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
      />
      <CancelPull game={game} link={link} />
    </main>
  );
}
