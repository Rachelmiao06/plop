"use client";

/**
 * The game's words and the one button over the scene: the first-time hint, the special cut-outs' hint, the
 * "Red Hat's turn!" / "Round 2 / 3" note, and "Put it down" (cancel a pull, also Escape).
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formationById, type Pins } from "@/features/pins";

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
export function GameHint({ game }: { game: Game }) {
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
                {TEXT.hintTogether(GAME.players[0].name, GAME.players[1].name).map((line) => (
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
 * The first time a star friend or the bunny is in a set this visit, a tiny hand-drawn note says what it is worth.
 * It goes away when the ball is thrown, or after a while.
 */
export function SpecialHint({ game, pins }: { game: Game; pins: Pins }) {
  const { phase, throws } = useGame(game);
  const { formation, phase: pinsPhase } = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
  const explained = useRef(new Set<string>());
  /** The kinds being explained, and the throw count when they appeared (the next throw hides them). */
  const [showing, setShowing] = useState<{ kinds: ("star" | "friend")[]; at: number }>({ kinds: [], at: 0 });

  useEffect(() => {
    if (phase !== "playing" || pinsPhase !== "ready") return;
    const kinds = new Set(formationById(formation).pins.map((p) => p.kind).filter((k): k is "star" | "friend" => !!k));
    const fresh = [...kinds].filter((k) => !explained.current.has(k));
    if (!fresh.length) return;
    fresh.forEach((k) => explained.current.add(k));
    // Shown from an effect on purpose: it reacts to a new set arriving, once.
    setShowing({ kinds: fresh, at: game.getState().throws });
    const t = setTimeout(() => setShowing({ kinds: [], at: 0 }), (GAME.timing.specialHintFor + GAME.timing.turnNoteFor) * 1000);
    return () => clearTimeout(t);
  }, [phase, pinsPhase, formation, game]);

  if (!showing.kinds.length || throws > showing.at) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[42%] flex justify-center px-4 md:top-[15%]" aria-live="polite">
      <div
        className={`flex flex-col items-center gap-1 px-8 py-3 text-ink ${styles.wash} ${styles.note}`}
        // After the round note that shows in the same place.
        style={{ "--plop-note-for": `${GAME.timing.specialHintFor}s`, animationDelay: `${GAME.timing.turnNoteFor * 0.9}s` } as CSSProperties}
      >
        {showing.kinds.map((k) => (
          <p key={k} className="flex items-center gap-2 font-heading text-xl leading-tight font-bold sm:text-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's doodle as a tiny icon */}
            <img src={k === "star" ? "/assets/effects/star.webp" : "/assets/scenery/rabbit.webp"} alt="" className="h-8 w-auto" />
            {k === "star" ? TEXT.special.star : TEXT.special.friend}
          </p>
        ))}
        <Squiggle width={180} />
      </div>
    </div>
  );
}

/** "Red Hat's turn!" for a moment each time the turn passes; "Round 2 / 3" and what the set asks when a round starts. */
export function TurnNote({ game, pins }: { game: Game; pins: Pins }) {
  const { turnId, active, phase, round, rounds, players, mode } = useGame(game);
  const { formation } = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
  if (turnId === 0 || phase !== "playing") return null;
  const together = mode === "together";
  const newRound = together || active === 0;
  const note = formationById(game.setFor(round)).note;
  void formation; // the note follows the round, not the set on the snow (it may still be hopping in)
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 flex justify-center px-4 ${newRound ? "top-[42%] md:top-[15%]" : "bottom-[8%]"}`}
      aria-live="polite"
    >
      <p
        key={turnId}
        className={`px-10 py-4 font-heading text-3xl font-bold text-ink-deep sm:text-4xl ${styles.wash} ${styles.note}`}
        style={{ "--plop-note-for": `${GAME.timing.turnNoteFor}s` } as CSSProperties}
      >
        {newRound ? TEXT.round(round + 1, rounds) : TEXT.turn(GAME.players[active].name)}
        {newRound && note && <span className="block text-center text-xl font-normal sm:text-2xl">{note}</span>}
        {newRound && players === 2 && (
          <span className="block text-center text-lg font-normal">{together ? TEXT.together : TEXT.turn(GAME.players[0].name)}</span>
        )}
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

/**
 * "Take turns" or "together", chosen before the first throw. It sits on top of the hud's start card like a paper
 * tab (the card is the score panel feature's; this reads where it is, nothing more). Wanted from the hud: a `modes`
 * row inside `MatchStart` next to the rounds, then this goes.
 */
export function ModePick({ game }: { game: Game }) {
  const { phase, mode } = useGame(game);
  const [box, setBox] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    if (phase !== "choosing") return;
    let frame = 0;
    const place = () => {
      const card = document.querySelector<HTMLElement>('section[role="dialog"]');
      const host = card?.closest("main");
      if (card && host) {
        const c = card.getBoundingClientRect();
        const h = host.getBoundingClientRect();
        setBox((old) => {
          const next = { left: c.left - h.left, top: c.top - h.top, width: c.width };
          return old && old.left === next.left && old.top === next.top && old.width === next.width ? old : next;
        });
      }
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  if (phase !== "choosing" || !box) return null;
  return (
    <div
      role="radiogroup"
      aria-label={TEXT.mode.label}
      className="absolute z-30 flex justify-center gap-2"
      style={{ left: box.left, width: box.width, top: box.top - 26 }}
    >
      {(["turns", "together"] as const).map((m, i) => {
        const picked = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={picked}
            onClick={() => game.setMode(m)}
            className={`relative rounded-full px-4 py-1.5 font-heading text-lg leading-none transition-transform active:scale-95 ${
              picked ? "bg-butter font-bold text-ink-deep" : "bg-paper text-ink"
            }`}
            style={{ rotate: `${i ? 2 : -2}deg`, boxShadow: picked ? "0 0 0 1.6px var(--ink)" : "0 0 0 1.2px color-mix(in oklab, var(--ink) 45%, transparent)" }}
          >
            {m === "turns" ? TEXT.mode.turns : TEXT.mode.together}
          </button>
        );
      })}
    </div>
  );
}
