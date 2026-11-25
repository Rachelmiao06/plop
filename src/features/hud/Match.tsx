"use client";

/**
 * The two match cards over the snow: the small choice before the first throw ("3 or 5 rounds", "two friends or
 * just me") and the end card (both snowmen with their totals, a crown and a cheer for the winner, a gentle card
 * for a tie, your best when alone, "play again"). Props only: the game decides; these show and ask.
 * Frosted paper with a pencil outline, like the score panel. Put them in the same `relative` box as the scene.
 */
import { useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { content, type SnowmanLook } from "./content";
import { CrownDoodle, PencilFrame, SnowballDots, SnowmanFace } from "./Doodles";
import { hudCss, styles } from "./hudStyles";

const t = content.text;

/** A paper note in the middle of the screen. */
function Card({ label, children, seed }: { label: string; children: ReactNode; seed: number }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
      <style href="plop-hud" precedence="default">
        {hudCss}
      </style>
      <section
        aria-label={label}
        role="dialog"
        className={`pointer-events-auto relative w-full max-w-sm rounded-[calc(var(--radius)*1.4)] px-6 pt-5 pb-6 text-center text-ink ${styles.glass} ${styles.card}`}
        style={{ "--hud-blur": content.glass.blur, "--hud-tint": content.glass.tint + 18 } as CSSProperties}
      >
        <PencilFrame seed={seed} radius={28} />
        {children}
      </section>
    </div>
  );
}

/** One choice in a row of two: a soft pill, outlined in pencil when picked. */
function Pick({ picked, onPick, children, seed }: { picked: boolean; onPick: () => void; children: ReactNode; seed: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      onClick={onPick}
      className={`relative flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 font-heading text-xl leading-none transition-colors ${
        picked ? "bg-butter/60 font-bold text-ink-deep" : "bg-paper/50 text-ink"
      } ${styles.pick}`}
    >
      {picked && <PencilFrame seed={seed} radius={22} overshoot={6} />}
      {children}
    </button>
  );
}

export type MatchStartProps = {
  /** Round counts to offer (the first is the default) and the current picks. */
  lengths: readonly number[];
  rounds: number;
  players: 1 | 2;
  onStart: (rounds: number, players: 1 | 2) => void;
};

/** Before the first throw: how many rounds, and who is playing. */
export function MatchStart({ lengths, rounds: startRounds, players: startPlayers, onStart }: MatchStartProps) {
  const [rounds, setRounds] = useState(startRounds);
  const [players, setPlayers] = useState<1 | 2>(startPlayers);
  return (
    <Card label={t.start.title} seed={41}>
      <p className="font-heading text-4xl leading-none font-bold text-ink-deep">{t.start.title}</p>
      <p className="mt-3 font-heading text-xl leading-tight">{t.start.rounds}</p>
      <div role="radiogroup" aria-label={t.start.rounds} className="mt-2 flex gap-2">
        {lengths.map((n, i) => (
          <Pick key={n} picked={rounds === n} onPick={() => setRounds(n)} seed={7 + i}>
            <SnowballDots count={n} size={9} />
            {t.start.roundsOption(n)}
          </Pick>
        ))}
      </div>
      <p className="mt-3 font-heading text-xl leading-tight">{t.start.players}</p>
      <div role="radiogroup" aria-label={t.start.players} className="mt-2 flex gap-2">
        <Pick picked={players === 2} onPick={() => setPlayers(2)} seed={13}>
          <span className="-my-2 flex -space-x-1.5">
            <SnowmanFace look="bucket" size={26} seed={3} />
            <SnowmanFace look="redHat" size={26} seed={8} />
          </span>
          {t.start.two}
        </Pick>
        <Pick picked={players === 1} onPick={() => setPlayers(1)} seed={17}>
          <span className="-my-2 flex">
            <SnowmanFace look="bucket" size={26} seed={3} />
          </span>
          {t.start.one}
        </Pick>
      </div>
      <Button
        size="lg"
        autoFocus
        onClick={() => onStart(rounds, players)}
        className="mt-5 h-12 w-full rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
      >
        {t.start.go}
      </Button>
    </Card>
  );
}

export type EndPlayer = { name: string; look: SnowmanLook; total: number };

export type MatchEndProps = {
  players: readonly [EndPlayer, EndPlayer];
  /** Playing alone: only the first player counts; `best` is the best total before this match (null = none). */
  solo?: { best: number | null } | null;
  /** The best single throw of the match, if worth a line: who, points, round (from 1). */
  bestThrow?: { name: string; points: number; round: number } | null;
  onAgain: () => void;
  onChoose: () => void;
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
        {crown && <div className={`absolute inset-1 top-4 rounded-full ${styles.glow}`} />}
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
export function MatchEnd({ players, solo, bestThrow, onAgain, onChoose }: MatchEndProps) {
  const [a, b] = players;
  const tie = !solo && a.total === b.total;
  const winner = solo ? null : a.total > b.total ? 0 : b.total > a.total ? 1 : null;
  const newBest = !!solo && (solo.best === null || a.total > solo.best);
  const title = solo ? t.end.solo : tie ? t.end.tie : t.end.wins(players[winner!].name);
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
      {bestThrow && <p className="mt-1 font-heading text-base leading-tight opacity-80">{t.end.bestThrow(bestThrow.name, bestThrow.points, bestThrow.round)}</p>}
      <Button
        size="lg"
        autoFocus
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
