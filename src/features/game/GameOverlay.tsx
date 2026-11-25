"use client";

/**
 * The game's words and the one button over the scene: the first-time hint, the "Red Hat's turn!" note,
 * and "Put it down" (cancel a pull, also Escape).
 */
import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { cancelPull } from "./bowlingLink";
import { GAME, TEXT } from "./content";
import type { GameLink } from "./GameBridge";
import { styles } from "./gameStyles";
import type { Game } from "./rules";

function useGame(game: Game) {
  return useSyncExternalStore(game.subscribe, game.getState, game.getState);
}

const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const m = window.matchMedia(coarseQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/** A hand-drawn wavy pencil underline (token colour). */
function Squiggle({ width }: { width: number }) {
  const waves = Math.max(3, Math.round(width / 22));
  const step = width / waves;
  let d = `M 2 6`;
  for (let i = 0; i < waves; i++) {
    const x = 2 + i * step;
    const lift = i % 2 === 0 ? -1 : 1;
    d += ` Q ${x + step / 2} ${6 + lift * (3.2 + (i % 3) * 0.5)} ${x + step} ${6 + (i % 2 ? 0.4 : -0.3)}`;
  }
  return (
    <svg aria-hidden width={width + 4} height={12} viewBox={`0 0 ${width + 4} 12`} className="mx-auto block overflow-visible">
      <path d={d} fill="none" stroke="var(--sky-blue)" strokeWidth={2.2} strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--sky-blue)" strokeWidth={1} strokeLinecap="round" opacity={0.45} transform="translate(1.5 1.2)" />
    </svg>
  );
}

/** "hold Space or drag the snowman back": shown until the first throw, then fades. */
export function GameHint({ game }: { game: Game }) {
  const { throws } = useGame(game);
  const coarse = useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
  const gone = throws > 0;
  return (
    <div
      aria-hidden={gone}
      className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center px-4 transition-opacity ease-out"
      style={{ opacity: gone ? 0 : 1, transitionDuration: `${GAME.timing.hintFade}s` }}
    >
      <div className={`px-10 py-4 text-center text-ink ${styles.wash}`}>
        <p className="font-heading text-2xl leading-tight font-bold sm:text-3xl">{coarse ? TEXT.hintTouch : TEXT.hint}</p>
        <Squiggle width={coarse ? 200 : 260} />
        {!coarse && <p className="mt-1 font-heading text-lg leading-tight">{TEXT.hintMore}</p>}
      </div>
    </div>
  );
}

/** "Red Hat's turn!" for a moment each time the turn passes. */
export function TurnNote({ game }: { game: Game }) {
  const { turnId, active } = useGame(game);
  if (turnId === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex justify-center px-4" aria-live="polite">
      <p
        key={turnId}
        className={`px-10 py-4 font-heading text-3xl font-bold text-ink-deep sm:text-4xl ${styles.wash} ${styles.note}`}
        style={{ "--plop-note-for": `${GAME.timing.turnNoteFor}s` } as CSSProperties}
      >
        {TEXT.turn(GAME.players[active].name)}
      </p>
    </div>
  );
}

/** "Put it down": shows while a pull is held; Escape does the same. */
export function CancelPull({ game, link }: { game: Game; link: GameLink }) {
  const { pulling } = useGame(game);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const bowling = link.get();
      if (e.code === "Escape" && bowling) cancelPull(bowling);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [link]);

  if (!pulling) return null;
  return (
    <div className="absolute right-3 bottom-4 sm:right-4 sm:bottom-5">
      <Button
        variant="outline"
        size="lg"
        title={TEXT.cancelTitle}
        aria-keyshortcuts="Escape"
        // A second finger taps this while the first one holds the pull.
        onPointerDown={(e) => {
          e.preventDefault();
          const bowling = link.get();
          if (bowling) cancelPull(bowling);
        }}
        className="rounded-full bg-background/80 font-heading text-lg text-ink"
      >
        <X data-icon="inline-start" />
        {TEXT.cancel}
      </Button>
    </div>
  );
}
