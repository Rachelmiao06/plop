"use client";

/**
 * The game's words and the one button over the scene: the first-time hint, the "Red Hat's turn!" note, and
 * "Put it down" (cancel a pull, also Escape). Each round's rule has its own card (`RuleCard.tsx`).
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

/** "hold Space or drag the snowman back": shown until the first throw, then fades (also while pulling). */
export function GameHint({ game, names }: { game: Game; names: readonly [string, string] }) {
  const { throws, pulling, phase, mode } = useGame(game);
  const coarse = useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
  // Out of the way while pulling (the growing ball sits right there); gone for good after the first throw.
  const gone = throws > 0 || pulling || phase !== "playing";
  return (
    <div
      aria-hidden={gone}
      className="pointer-events-none absolute inset-x-0 bottom-[6%] flex justify-center px-4 transition-opacity ease-out"
      style={{ opacity: gone ? 0 : 1, transitionDuration: `${GAME.timing.hintFade}s` }}
    >
      <div className={`px-10 py-4 text-center text-ink ${styles.wash}`}>
        {mode === "together" ? (
          <>
            <p className="font-heading text-2xl leading-tight font-bold sm:text-3xl">{TEXT.together}</p>
            <Squiggle width={200} />
            {coarse ? (
              <p className="mt-1 font-heading text-lg leading-tight">{TEXT.hintTogetherTouch}</p>
            ) : (
              <p className="mt-1 flex justify-center gap-6 font-heading text-lg leading-tight">
                {TEXT.hintTogether(names[0], names[1]).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-heading text-2xl leading-tight font-bold sm:text-3xl">{coarse ? TEXT.hintTouch : TEXT.hint}</p>
            <Squiggle width={coarse ? 200 : 260} />
            {!coarse && <p className="mt-1 font-heading text-lg leading-tight">{TEXT.hintMore}</p>}
          </>
        )}
        <p className="mt-0.5 font-heading text-base leading-tight sm:text-lg">{TEXT.hintSweet}</p>
      </div>
    </div>
  );
}

/**
 * "Red Hat's turn!" for a moment each time the turn passes within a round. A new round has the rule card instead
 * (`RuleCard.tsx`), which stays until the player is ready.
 */
export function TurnNote({ game, names }: { game: Game; names: readonly [string, string] }) {
  const { turnId, active, phase, mode } = useGame(game);
  if (turnId === 0 || phase !== "playing" || mode === "together" || active === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex justify-center px-4" aria-live="polite">
      <p
        key={turnId}
        className={`px-10 py-4 font-heading text-3xl font-bold text-ink-deep sm:text-4xl ${styles.wash} ${styles.note}`}
        style={{ "--plop-note-for": `${GAME.timing.turnNoteFor}s` } as CSSProperties}
      >
        {TEXT.turn(names[active])}
      </p>
    </div>
  );
}

/** "Put it down": shows while a pull is held; Escape does the same. */
export function CancelPull({ game, link }: { game: Game; link: GameLink }) {
  const { pulling } = useGame(game);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Escape") link.all().forEach(cancelPull);
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
          // Together: puts down every pull being held (Escape too).
          link.all().forEach(cancelPull);
        }}
        className="rounded-full bg-background/80 font-heading text-lg text-ink"
      >
        <X data-icon="inline-start" />
        {TEXT.cancel}
      </Button>
    </div>
  );
}
