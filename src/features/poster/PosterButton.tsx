"use client";

/**
 * "生成海报 · Make a poster" on the end card: draws the poster (`draw.ts`) with the player's invite link in its QR code
 * (`/invite?g=<group>&from=<name>&score=<n>`, the group made with `ensureGroupId()` if this device has none) and opens
 * the sheet that shows it. Tracks `poster_made` with the mode only (never a name).
 */
import { useCallback, useState, type ReactNode } from "react";

import { cleanName, invitePath, type WagerCode } from "@/features/invite";
import { ensureGroupId } from "@/features/share";

import { track } from "@/lib/analytics";

import { POSTER } from "./content";
import { drawPoster, type PosterData, type PosterPlayer } from "./draw";
import { PosterSheet } from "./PosterSheet";

/** Who the QR code's challenge is from: the same name, score and wager as the end card's "Send to a friend". */
export type PosterLink = { name: string; score: number | null; wager?: WagerCode | null };

export type PosterOptions = {
  players: readonly [PosterPlayer, PosterPlayer];
  solo: boolean;
  team: boolean;
  /** The match's rounds; when not given, last time's start choice on this device. */
  rounds?: number | null;
  /** The challenge the QR code opens (the end card's). Without one: player one, their score (a team: none). */
  link?: PosterLink | null;
};

type Props = PosterOptions & {
  /** A small quiet link instead of a big button (the end card: sharing is the big one). */
  quiet?: boolean;
  className?: string;
};

function storedRounds(): number | null {
  try {
    const n = Number((JSON.parse(window.localStorage.getItem(POSTER.choiceKey) ?? "{}") as { rounds?: unknown }).rounds);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * The invite link in the QR code, and the one the end card's "Send to a friend" sends (it calls this too, so they
 * never differ): the challenge's name, score and wager, or player one with their score (a team's total: no score).
 */
export function posterLink({ players, team, link }: Pick<PosterOptions, "players" | "team" | "link">, group: string): string {
  if (link) return invitePath({ group, name: cleanName(link.name), score: link.score, wager: link.wager ?? null });
  const a = players[0];
  return invitePath({ group, name: cleanName(a.name), score: team ? null : a.total });
}

/** Draws the poster and shows its sheet: `open()` starts both, render `sheet` somewhere (it portals to the body). */
export function usePoster({ players, solo, team, rounds, link }: PosterOptions): { open: () => void; sheet: ReactNode } {
  const [shown, setShown] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const make = useCallback(async () => {
    setSrc(null);
    setFailed(false);
    const kind: PosterData["kind"] = solo ? "solo" : team ? "team" : "versus";
    const url = window.location.origin + posterLink({ players, team, link }, ensureGroupId());
    try {
      const canvas = await drawPoster({
        kind,
        players: solo ? [players[0]] : players,
        rounds: rounds ?? storedRounds(),
        url,
        date: new Date(),
      });
      setSrc(canvas.toDataURL("image/png"));
      track("poster_made", { mode: kind });
    } catch {
      setFailed(true);
    }
  }, [players, solo, team, rounds, link]);

  const close = useCallback(() => setShown(false), []);
  const open = useCallback(() => {
    setShown(true);
    void make();
  }, [make]);
  return { open, sheet: shown ? <PosterSheet src={src} failed={failed} onRetry={make} onClose={close} /> : null };
}

export function PosterButton({ quiet, className, ...options }: Props) {
  const { open, sheet } = usePoster(options);
  return (
    <>
      <button
        type="button"
        onClick={open}
        className={
          quiet
            ? `plop-poster-open font-heading text-lg text-ink underline decoration-wavy underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`
            : `plop-poster-open relative h-11 w-full rounded-full border-2 border-ink bg-snow-white font-heading text-xl font-bold text-ink-deep outline-none hover:bg-paper focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`
        }
      >
        {POSTER.sheet.button}
      </button>
      {sheet}
    </>
  );
}
