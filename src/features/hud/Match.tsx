"use client";

/**
 * The match's end over the snow, in steps: the result (the snowball scene and one line), then the board and the
 * poster. Props only: the game decides; these show and ask.
 * Frosted paper with a pencil outline, like the score panel. Put them in the same `relative` box as the scene.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { PosterButton } from "@/features/poster";

import { Celebration, type CelebrationKind } from "./Celebration";
import { ChallengeButton, type Challenge } from "./ChallengeButton";
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
  /**
   * The two snowmen. Alone after a friend's invite, the second one is the inviter (their name and score), so the
   * scene can be a match between the two; alone with nobody to beat, only the first counts.
   */
  players: readonly [EndPlayer, EndPlayer];
  /** Playing alone: `best` is the best total before this match (null = none). */
  solo?: { best: number | null } | null;
  /** Alone after a friend's invite: the second player is them (the scene and the result line become you vs them). */
  rival?: boolean;
  /**
   * The invite's preset wager, as an effect only (Rachel: no wager words on the end card): its emoji drops onto the
   * loser's head after the snowballs (a tie: between the two). Only when there are two sides.
   */
  wager?: { emoji: string } | null;
  /** Step 1's big "发给朋友来挑战": who signs the challenge, their score, the wager (the game decides). */
  challenge?: Challenge | null;
  /** Team up: one team total, both snowmen crowned, no winner. */
  team?: boolean;
  /** The match's rounds, for the share poster (it falls back to last time's start choice). */
  rounds?: number;
  onAgain: () => void;
  onChoose: () => void;
  /** Step 2: the group board and its prompt, when there is a group. */
  children?: ReactNode;
};

/**
 * After the last round, in steps (Rachel: one crowded card was too much). Step 1 is the result and nothing else: the
 * winner pelts the loser with snowballs (Celebration.tsx), and once they have landed one line says who won and by how
 * much ("Red Hat 13 : 6 赢啦！"); an invite's wager is only its emoji landing on the loser, no words; "Next" and "Play again". Step 2 is the board
 * (the game's prompt and the group board), "Make a poster" (step 3, the poster sheet) and "Play again". Never mean.
 */
export function MatchEnd({ players, solo, rival, wager, challenge, team, rounds, onAgain, onChoose, children }: MatchEndProps) {
  const [a, b] = players;
  // Two sides to the scene: a versus match, or you against the inviter's score.
  const twoSided = !team && (!solo || !!rival);
  const tie = twoSided && a.total === b.total;
  const winner: 0 | 1 | null = twoSided && !tie ? (a.total > b.total ? 0 : 1) : null;
  const newBest = !!solo && !rival && (solo.best === null || a.total > solo.best);
  const kind: CelebrationKind = team ? "team" : twoSided ? (tie ? "tie" : "versus") : newBest ? "soloBest" : "soloCheer";
  const [step, setStep] = useState<1 | 2>(1);
  // The snowballs fly first (Celebration.tsx); the result line and the buttons settle in after (a tap skips them).
  const [settled, setSettled] = useState(false);
  const next = useRef<HTMLButtonElement>(null);
  const again = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (settled && step === 1) next.current?.focus({ preventScroll: true });
    if (step === 2) again.current?.focus({ preventScroll: true });
  }, [settled, step]);

  const result = team
    ? t.end.team(a.total + b.total)
    : twoSided
      ? tie
        ? t.end.tie(a.total)
        : t.end.wins(players[winner!].name, players[winner!].total, players[winner === 0 ? 1 : 0].total)
      : t.end.solo(a.total);
  const sub = team ? t.end.teamKind(a.name, b.name) : twoSided ? null : newBest ? t.end.newBest : t.end.best(solo?.best ?? 0);

  if (step === 2) {
    return (
      <Card label={t.end.label} seed={59}>
        <p className="font-heading text-xl leading-tight text-ink">{result}</p>
        {children && <div className="mt-3 flex flex-col items-center gap-3">{children}</div>}
        {/* Step 3: the poster, a saved image with a QR code (the way to spread on WeChat Moments). */}
        <PosterButton players={players} solo={!!solo && !rival} team={!!team} rounds={rounds} quiet className="mt-3" />
        <Button
          ref={again}
          size="lg"
          onClick={onAgain}
          className="mt-3 h-12 w-full rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
        >
          {t.end.again}
        </Button>
        <button type="button" onClick={onChoose} className="mt-2 font-heading text-lg text-ink underline decoration-wavy underline-offset-4">
          {t.end.choose}
        </button>
      </Card>
    );
  }

  return (
    <Card label={t.end.label} seed={53}>
      {/* Rachel's effect doodles at the corners for the cheer. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- small decorative doodle */}
      <img src="/assets/effects/star.webp" alt="" className="absolute -top-5 -left-3 w-10 rotate-[-14deg]" />
      {/* eslint-disable-next-line @next/next/no-img-element -- small decorative doodle */}
      <img src="/assets/effects/music-notes.webp" alt="" className="absolute -top-6 -right-2 w-12 rotate-[10deg]" />
      <Celebration
        players={players}
        kind={kind}
        winner={winner}
        crowns={team || tie ? [true, true] : [winner === 0 || newBest, winner === 1]}
        onSettled={() => setSettled(true)}
        totals={!twoSided && !team}
        stake={wager && twoSided ? { emoji: wager.emoji, on: winner === null ? null : winner === 0 ? 1 : 0 } : null}
      />
      <div
        inert={!settled}
        className="transition-[opacity,transform] ease-out"
        style={{ opacity: settled ? 1 : 0, transform: settled ? "none" : "translateY(8px)", transitionDuration: `${content.celebrate.reveal}ms` }}
      >
        <p role="status" className="mt-3 font-heading text-3xl leading-tight font-bold text-balance text-ink-deep">
          {result}
        </p>
        {sub && <p className="mt-1 font-heading text-lg leading-tight">{sub}</p>}
        {/* One tap to challenge a friend: the big one (Rachel: sharing in one step). */}
        {challenge && <ChallengeButton challenge={challenge} className="mt-5" />}
        <div className={`${challenge ? "mt-7" : "mt-5"} flex gap-2.5`}>
          <Button
            ref={next}
            size="lg"
            onClick={() => setStep(2)}
            className="h-12 flex-1 rounded-full border-2 border-ink bg-paper font-heading text-2xl font-bold text-ink-deep hover:bg-snow-white"
          >
            {t.end.next}
          </Button>
          <Button
            size="lg"
            onClick={onAgain}
            className="h-12 flex-1 rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
          >
            {t.end.again}
          </Button>
        </div>
      </div>
    </Card>
  );
}
