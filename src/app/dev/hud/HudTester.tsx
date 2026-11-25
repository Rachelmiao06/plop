"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScoreHud, type HudPlayer, type KnockEvent } from "@/features/hud";
import { SnowScene } from "@/features/snow-scene";

const SET_SIZE = 8;

const START: [HudPlayer, HudPlayer] = [
  { name: "Bucket", total: 0, look: "bucket" },
  { name: "Red Hat", total: 0, look: "redHat" },
];

/** Test page: the real snow behind the score display, with buttons that fake a game. */
export function HudTester() {
  const [players, setPlayers] = useState(START);
  const [active, setActive] = useState<0 | 1>(0);
  const [down, setDown] = useState(0);
  const [knock, setKnock] = useState<KnockEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  const knockDown = (count: number) => {
    // A cleared set starts fresh on the next throw.
    const before = down >= SET_SIZE ? 0 : down;
    const n = Math.min(count, SET_SIZE - before);
    setDown(before + n);
    setKnock({ id: Date.now(), count: n });
    setPlayers((p) => {
      const next: [HudPlayer, HudPlayer] = [{ ...p[0] }, { ...p[1] }];
      next[active].total += n;
      return next;
    });
  };

  const throwOnce = () => {
    const left = SET_SIZE - (down >= SET_SIZE ? 0 : down);
    knockDown(Math.floor(Math.random() * (left + 1)));
  };

  const reset = () => {
    setPlayers(START);
    setActive(0);
    setDown(0);
    setKnock(null);
  };

  return (
    <>
      <SnowScene />
      <ScoreHud
        players={players}
        active={active}
        down={down}
        total={SET_SIZE}
        knock={knock}
        hidden={hidden}
        onHiddenChange={setHidden}
      />
      <div className="absolute inset-x-0 bottom-16 z-10 md:bottom-10 flex justify-center px-3">
        <div className="flex flex-wrap justify-center gap-1.5 rounded-xl bg-background/75 p-1.5">
          <Button size="sm" onClick={throwOnce}>
            Throw
          </Button>
          <Button size="sm" variant="secondary" onClick={() => knockDown(SET_SIZE)}>
            Full clear
          </Button>
          <Button size="sm" variant="outline" onClick={() => setActive((a) => (a === 0 ? 1 : 0))}>
            Switch turn
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setHidden((h) => !h)}>
            {hidden ? "Show" : "Hide"}
          </Button>
        </div>
      </div>
    </>
  );
}
