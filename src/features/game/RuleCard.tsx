"use client";

/**
 * Each round's rule, so a first-time player cannot miss it (Rachel did not understand "let the bunny be", and the
 * old note left too fast):
 *
 * - `RuleCard` a big paper card in the middle when a round starts: "Round 2 / 3", the rule in a few big words,
 *   the special card's picture (Rachel's cut-out), one plain line, and "got it". It stays until the player pulls,
 *   taps anywhere or presses a key. No auto-hide.
 * - `ruleFor(setId)` the words and pictures for a round set, also used by the score panel's reminder chip and the
 *   scene marker. The special card is read from the pins' round set, so the picture follows the pins' content.
 */
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { PaperCard } from "@/features/hud";
import { formationById, SPECIALS, type FormationPin } from "@/features/pins";
import { propSrc } from "@/features/scenery";

import { GAME, TEXT, type RuleWords } from "./content";
import { styles } from "./gameStyles";
import type { Game } from "./rules";

export type RuleArt = {
  /** Rachel's cut-outs to show, left to right (one for a special card, three small pins for a plain strike). */
  srcs: string[];
  /** The star doodle over the picture (a star friend). */
  star: boolean;
};

export type Rule = {
  words: RuleWords;
  art: RuleArt;
  /** The bonus the rule is about (for the line). */
  points: number;
  /** What the scene marker points at: a friend to leave alone, a star to hit, a mound to roll around. */
  marks: "friend" | "star" | "mound" | null;
};

const STAR_SRC = "/assets/effects/star.webp";

/** The rule of a round set: its words, its picture and what the marker points at. Null for a set without words. */
export function ruleFor(setId: string): Rule | null {
  const words = TEXT.rules[setId];
  if (!words) return null;
  const set = formationById(setId);
  const special = (kind: FormationPin["kind"]) => set.pins.find((p) => p.kind === kind);
  const friend = special("friend");
  const star = special("star");
  if (friend) return { words, art: { srcs: [propSrc(friend.prop)], star: false }, points: SPECIALS.friend.bonus, marks: "friend" };
  if (star) return { words, art: { srcs: [propSrc(star.prop)], star: true }, points: SPECIALS.star.bonus, marks: "star" };
  if (set.mounds?.length) return { words, art: { srcs: [propSrc("mound-snow")], star: false }, points: 0, marks: "mound" };
  // A plain strike: the first three pins of the triangle, small, side by side.
  return {
    words,
    art: { srcs: set.pins.slice(0, 3).map((p) => propSrc(p.prop)), star: false },
    points: GAME.score.fullClearBonus,
    marks: null,
  };
}

/** The reminder chip's picture: the special card (or the front pin of a strike). */
export function ruleIcon(rule: Rule): string {
  return rule.art.star ? STAR_SRC : rule.art.srcs[0];
}

function useGame(game: Game) {
  return useSyncExternalStore(game.subscribe, game.getState, game.getState);
}

/** The picture: the special card, a little tilted, with the star doodle bobbing over a star friend. */
function RuleArtView({ art }: { art: RuleArt }) {
  const many = art.srcs.length > 1;
  return (
    <div className="relative mx-auto mt-2 flex h-28 items-end justify-center sm:h-32">
      {art.srcs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out, a few kB, shown at a fixed height
        <img
          key={`${src}-${i}`}
          src={src}
          alt=""
          className={`h-full w-auto object-contain ${many ? "-mx-1 h-[78%]" : ""} ${styles.ruleArt}`}
          style={{ "--rule-tilt": `${many ? (i - 1) * 6 : -4}deg`, animationDelay: `${0.15 + i * 0.08}s` } as CSSProperties}
        />
      ))}
      {art.star && (
        // eslint-disable-next-line @next/next/no-img-element -- Rachel's star doodle
        <img src={STAR_SRC} alt="" className={`absolute -top-4 left-1/2 ml-3 h-10 w-auto ${styles.ruleStar}`} />
      )}
    </div>
  );
}

/**
 * The rule card at the start of each round. `names` are the players' shown names (two players taking turns: whose
 * throw is first).
 */
export function RuleCard({ game, names }: { game: Game; names: readonly [string, string] }) {
  const { turnId, active, phase, round, rounds, players, mode, stage, pulling } = useGame(game);
  const together = mode === "together";
  const newRound = phase === "playing" && turnId > 0 && (together || active === 0);
  /** The turn whose card the player has put away (a tap, a key, "got it" or a pull). */
  const [closedFor, setClosedFor] = useState<number | null>(null);
  const open = newRound && stage === "aim" && !pulling && closedFor !== turnId;

  // A tap anywhere, a key or a pull puts it away for this round (the tap or key still does what it does).
  useEffect(() => {
    if (!open) return;
    const close = () => setClosedFor(turnId);
    const offGame = game.subscribe(() => {
      if (game.getState().pulling) close();
    });
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", close, true);
    return () => {
      offGame();
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", close, true);
    };
  }, [open, turnId, game]);

  if (!open) return null;
  const rule = ruleFor(game.setFor(round));
  return (
    <PaperCard label={TEXT.round(round + 1, rounds)} seed={61 + round * 3}>
      <div className={styles.rule} style={{ "--rule-pop": `${GAME.rule.pop}s` } as CSSProperties}>
        <p className="font-heading text-xl leading-none text-ink">{TEXT.round(round + 1, rounds)}</p>
        {rule ? (
          <>
            <p className="mt-2 font-heading text-4xl leading-none font-bold text-ink-deep sm:text-5xl">{rule.words.big.zh}</p>
            <p className="mt-1 font-heading text-2xl leading-none text-ink-deep">{rule.words.big.en}</p>
            <RuleArtView art={rule.art} />
            <p className="mt-2 font-heading text-xl leading-tight font-bold text-ink-deep">{rule.words.line.zh(rule.points)}</p>
            <p className="font-heading text-lg leading-tight text-ink">{rule.words.line.en(rule.points)}</p>
          </>
        ) : null}
        {players === 2 && !together && <p className="mt-2 font-heading text-lg leading-tight opacity-80">{TEXT.ruleTurn(names[0])}</p>}
        {together && <p className="mt-2 font-heading text-lg leading-tight opacity-80">{TEXT.together}</p>}
        <Button
          size="lg"
          onClick={() => setClosedFor(turnId)}
          className="mt-3 h-11 rounded-full bg-sky-blue px-8 font-heading text-xl font-bold text-ink-deep hover:bg-sky-blue/80"
        >
          {TEXT.ruleGotIt.zh}
          <span className="text-base font-normal">· {TEXT.ruleGotIt.en}</span>
        </Button>
      </div>
    </PaperCard>
  );
}
