"use client";

/**
 * The match's end card over the snow (both snowmen with their totals, a crown and a cheer for the winner, a gentle card
 * for a tie, your best when alone, "play again"). Props only: the game decides; these show and ask.
 * Frosted paper with a pencil outline, like the score panel. Put them in the same `relative` box as the scene.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { content, type SnowmanLook } from "./content";
import { CrownDoodle, HaloDoodle, PaperFill, PencilFrame, SnowmanFace } from "./Doodles";
import { useEvening } from "./hooks";
import { hudCss, styles } from "./hudStyles";

const t = content.text;

/** A paper note in the middle of the screen (also the game's round rule card). */
export function Card({ label, children, seed }: { label: string; children: ReactNode; seed: number }) {
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
        className={`pointer-events-auto relative w-full max-w-sm rounded-[calc(var(--radius)*1.4)] px-6 pt-5 pb-6 text-center text-ink ${styles.glass} ${styles.card}`}
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
  onAgain: () => void;
  onChoose: () => void;
  /** Under the totals, above "play again": the group board and its "pop it on" prompt, when there is a group. */
  children?: ReactNode;
};

/** A snowman's face with its total, a crown when it won. */
function Finisher({ player, crown, seed }: { player: EndPlayer; crown: boolean; seed: number }) {
  const e = content.end;
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid place-items-center" style={{ width: e.face + 16, height: e.face + 22 }}>
        {crown && (
          <div className={`absolute -top-1 left-1/2 -ml-[22px] ${styles.crown}`}>
            <CrownDoodle size={e.crown} />
          </div>
        )}
        {crown && (
          <div className={`absolute inset-x-0 top-3 bottom-[-6px] ${styles.glow}`}>
            <HaloDoodle seed={seed} />
          </div>
        )}
        <div className="relative mt-4">
          <SnowmanFace look={player.look} size={e.face} seed={seed} />
        </div>
      </div>
      <p className="font-heading text-lg leading-none">{player.name}</p>
      <p className="font-heading text-4xl leading-tight font-bold text-ink-deep tabular-nums">{player.total}</p>
    </div>
  );
}

/** After the last round: the totals, a crown and a cheer, and "play again". Never "you lose". */
export function MatchEnd({ players, solo, bestThrow, rival, onAgain, onChoose, children }: MatchEndProps) {
  const [a, b] = players;
  const tie = !solo && a.total === b.total;
  const winner = solo ? null : a.total > b.total ? 0 : b.total > a.total ? 1 : null;
  const newBest = !!solo && (solo.best === null || a.total > solo.best);
  const title = solo ? t.end.solo : tie ? t.end.tie : t.end.wins(players[winner!].name);
  // "Play again" takes the focus for the keyboard, without scrolling a tall card (one with the board) to its end.
  const again = useRef<HTMLButtonElement>(null);
  useEffect(() => again.current?.focus({ preventScroll: true }), []);
  const sub = solo
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
      <div className="mt-3 flex items-end justify-center gap-6">
        <Finisher player={a} crown={tie || winner === 0 || newBest} seed={3} />
        {!solo && <Finisher player={b} crown={tie || winner === 1} seed={8} />}
      </div>
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
    </Card>
  );
}
