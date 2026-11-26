"use client";

/**
 * "生成海报 · Make a poster" on the end card: draws the poster (`draw.ts`) with the player's invite link in its QR code
 * (`/invite?g=<group>&from=<name>&score=<n>`, the group made with `ensureGroupId()` if this device has none) and opens
 * the sheet that shows it. Tracks `poster_made` with the mode only (never a name).
 */
import { useCallback, useState } from "react";

import { cleanName, invitePath } from "@/features/invite";
import { ensureGroupId } from "@/features/share";

import { track } from "@/lib/analytics";

import { POSTER } from "./content";
import { drawPoster, type PosterData, type PosterPlayer } from "./draw";
import { PosterSheet } from "./PosterSheet";

type Props = {
  players: readonly [PosterPlayer, PosterPlayer];
  solo: boolean;
  team: boolean;
  /** The match's rounds; when not given, last time's start choice on this device. */
  rounds?: number | null;
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

/** The link in the QR code: signed by player one, with their score (a team's total is not one person's, so none). */
export function posterLink({ players, team }: Pick<Props, "players" | "team">, group: string): string {
  const a = players[0];
  return invitePath({ group, name: cleanName(a.name), score: team ? null : a.total });
}

export function PosterButton({ players, solo, team, rounds, quiet, className }: Props) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const make = useCallback(async () => {
    setSrc(null);
    setFailed(false);
    const kind: PosterData["kind"] = solo ? "solo" : team ? "team" : "versus";
    const url = window.location.origin + posterLink({ players, team }, ensureGroupId());
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
  }, [players, solo, team, rounds]);

  const close = useCallback(() => setOpen(false), []);
  const w = POSTER.sheet.button;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void make();
        }}
        className={
          quiet
            ? `plop-poster-open font-heading text-lg text-ink underline decoration-wavy underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`
            : `plop-poster-open relative h-11 w-full rounded-full border-2 border-ink bg-snow-white font-heading text-xl font-bold text-ink-deep outline-none hover:bg-paper focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`
        }
      >
        {w}
      </button>
      {open && <PosterSheet src={src} failed={failed} onRetry={make} onClose={close} />}
    </>
  );
}
