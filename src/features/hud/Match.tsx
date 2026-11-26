"use client";

/**
 * The match's end card over the snow (both snowmen with their totals, a crown and a cheer for the winner, a gentle card
 * for a tie, your best when alone, "play again"). Props only: the game decides; these show and ask.
 * Frosted paper with a pencil outline, like the score panel. Put them in the same `relative` box as the scene.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PosterButton } from "@/features/poster";

import { Celebration, type CelebrationKind } from "./Celebration";
import { content, type SnowmanLook } from "./content";
import { PaperFill, PencilFrame, SnowmanFace } from "./Doodles";
import { useEvening } from "./hooks";
import { hudCss, styles } from "./hudStyles";

const t = content.text;

/** A paper note in the middle of the screen (also the game's round rule card). */
export function Card({ label, children, seed, wide }: { label: string; children: ReactNode; seed: number; wide?: boolean }) {
  const evening = useEvening();
  const tint = Math.min(100, content.glass.tint + 18 + content.glass.evening * evening);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
      <style href="plop-hud" precedence="default">
        {hudCss}
      </style>
      <section
        aria-label={label}
        role="dialog"
        className={`pointer-events-auto relative w-full ${wide ? "max-w-md" : "max-w-sm"} rounded-[calc(var(--radius)*1.4)] px-6 pt-5 pb-6 text-center text-ink ${styles.glass} ${styles.card}`}
        style={{ "--hud-blur": content.glass.blur, "--hud-tint": tint } as CSSProperties}
      >
        <PaperFill seed={seed} />
        <PencilFrame seed={seed} radius={28} />
        {/* A tall card (the end card with the group board) scrolls inside its paper on a small phone. */}
        <div className="relative -mx-2 max-h-[calc(100dvh-5.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain px-2 pt-1 pb-1">{children}</div>
      </section>
    </div>
  );
}

/** One name field: the snowman's face, and a pencil-ringed paper pill to type in. */
export function NameField({
  look,
  value,
  fallback,
  max,
  seed,
  onChange,
  onEnter,
  autoFocus,
  size = 32,
}: {
  look: SnowmanLook;
  value: string;
  fallback: string;
  max: number;
  seed: number;
  onChange: (v: string) => void;
  onEnter: () => void;
  autoFocus?: boolean;
  /** The face's size (px). */
  size?: number;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0">
        <SnowmanFace look={look} size={size} seed={seed} />
      </span>
      <div className="relative h-11 min-w-0 flex-1 rounded-full bg-paper">
        <PencilFrame seed={seed + 19} radius={22} overshoot={5} />
        <input
          value={value}
          onChange={(e) => onChange(Array.from(e.target.value).slice(0, max).join(""))}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          placeholder={t.start.namePlaceholder(fallback)}
          aria-label={t.start.nameLabel(fallback)}
          autoComplete="nickname"
          enterKeyHint="next"
          autoFocus={autoFocus}
          spellCheck={false}
          className={`relative size-full min-w-0 rounded-full bg-transparent px-3 text-center font-heading text-xl text-ink-deep placeholder:text-ink/45 ${styles.nameInput}`}
        />
      </div>
    </div>
  );
}

export type EndPlayer = { name: string; look: SnowmanLook; total: number };

export type MatchEndProps = {
  players: readonly [EndPlayer, EndPlayer];
  /** Playing alone: only the first player counts; `best` is the best total before this match (null = none). */
  solo?: { best: number | null } | null;
  /** The best single throw of the match, if worth a line: who, points, round (from 1). */
  bestThrow?: { name: string; points: number; round: number } | null;
  /** Alone after a friend's invite: their score, for one kind line. */
  rival?: { name: string; score: number } | null;
  /** Team up: one team total, both snowmen crowned, no winner. */
  team?: boolean;
  /** The match's rounds, for the share poster (it falls back to last time's start choice). */
  rounds?: number;
  onAgain: () => void;
  onChoose: () => void;
  /** Under the totals, above "play again": the group board and its "pop it on" prompt, when there is a group. */
  children?: ReactNode;
};

/** After the last round: the totals, a crown and a cheer, and "play again". Never "you lose". */
export function MatchEnd({ players, solo, bestThrow, rival, team, rounds, onAgain, onChoose, children }: MatchEndProps) {
  const [a, b] = players;
  const tie = !solo && !team && a.total === b.total;
  const winner = solo ? null : a.total > b.total ? 0 : b.total > a.total ? 1 : null;
  const newBest = !!solo && (solo.best === null || a.total > solo.best);
  const title = solo ? t.end.solo : team ? t.end.team : tie ? t.end.tie : t.end.wins(players[winner!].name);
  // "Play again" takes the focus for the keyboard, without scrolling a tall card (one with the board) to its end.
  const again = useRef<HTMLButtonElement>(null);
  // The victory moment plays first (Celebration.tsx); the totals, lines and buttons settle in after it (a tap skips it).
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (settled) again.current?.focus({ preventScroll: true });
  }, [settled]);
  const kind: CelebrationKind = solo ? (newBest ? "soloBest" : "soloCheer") : team ? "team" : tie ? "tie" : "versus";
  const sub = team
    ? t.end.teamKind(a.name, b.name)
    : solo
    ? newBest
      ? t.end.newBest
      : t.end.best(solo.best ?? 0)
    : tie
      ? t.end.tieKind
      : t.end.kind(players[winner === 0 ? 1 : 0].name);
  return (
    <Card label={t.end.label} seed={53}>
      {/* Rachel's effect doodles around the title for the cheer. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- small decorative doodle */}
      <img src="/assets/effects/star.webp" alt="" className="absolute -top-5 -left-3 w-10 rotate-[-14deg]" />
      {/* eslint-disable-next-line @next/next/no-img-element -- small decorative doodle */}
      <img src="/assets/effects/music-notes.webp" alt="" className="absolute -top-6 -right-2 w-12 rotate-[10deg]" />
      <p className="font-heading text-4xl leading-none font-bold text-ink-deep">{title}</p>
      {!solo && !tie && <p className="mt-0.5 font-heading text-xl leading-none">{t.end.cheer}</p>}
      <Celebration
        players={players}
        kind={kind}
        winner={winner === 0 || winner === 1 ? winner : null}
        crowns={team || tie ? [true, true] : [winner === 0 || newBest, winner === 1]}
        onSettled={() => setSettled(true)}
      />
      <div
        inert={!settled}
        className="transition-[opacity,transform] ease-out"
        style={{ opacity: settled ? 1 : 0, transform: settled ? "none" : "translateY(8px)", transitionDuration: `${content.celebrate.reveal}ms` }}
      >
        <p className="mt-2 font-heading text-xl leading-tight">{sub}</p>
        {solo && rival && (
          <p className="mt-1 font-heading text-xl leading-tight font-bold text-berry-deep">
            {a.total > rival.score
              ? t.end.beatRival(rival.name, rival.score)
              : a.total === rival.score
                ? t.end.tiedRival(rival.name)
                : t.end.underRival(rival.name, rival.score)}
          </p>
        )}
        {bestThrow && <p className="mt-1 font-heading text-base leading-tight opacity-80">{t.end.bestThrow(bestThrow.name, bestThrow.points, bestThrow.round)}</p>}
        {children && <div className="mt-3 flex flex-col items-center gap-3">{children}</div>}
        {/* A saved image with a QR code: the way to spread on WeChat Moments, which cannot post links. */}
        <PosterButton players={players} solo={!!solo} team={!!team} rounds={rounds} className="mt-4" />
        <Button
          ref={again}
          size="lg"
          onClick={onAgain}
          className="mt-4 h-12 w-full rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
        >
          {t.end.again}
        </Button>
        <button type="button" onClick={onChoose} className="mt-2 font-heading text-lg text-ink underline decoration-wavy underline-offset-4">
          {t.end.choose}
        </button>
      </div>
    </Card>
  );
}
