"use client";

/**
 * Two players on one phone ("take turns"): ONE prompt to put both scores on the board (Rachel: two identical forms
 * with nothing saying whose is whose looked doubled). A row per player: their snowman's face, their name from the
 * start card (never the name remembered on this device), their score, and a small "laugh at my worst throw" box of
 * their own; then one "pop us on!" that sends both. Only player one's name is remembered on this device.
 */
import { useId, useState, type CSSProperties, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PencilFrame, SnowmanFace } from "@/features/hud/Doodles";
import type { SnowmanLook } from "@/features/hud/content";
import { announce, postScore, saveNickname, type Submitted } from "./api";
import { BOARD, TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { lb } from "./boardStyles";
import { checkName, nameKey, type MatchMode, type MatchStats, type Rounds } from "./rules";
import { TitleLine } from "./TitleLine";
import { titleFor } from "./titles";

export type SubmitPlayer = { name: string; look: SnowmanLook; score: number; stats?: MatchStats };

export type SubmitScoresProps = {
  group: string;
  rounds: Rounds;
  mode: MatchMode;
  /** Both players, in order (player one first). */
  players: readonly [SubmitPlayer, SubmitPlayer];
  /** Both landed (player one's result first). */
  onSubmitted?: (results: readonly [Submitted, Submitted]) => void;
  className?: string;
};

type Row = { typed: string | null; oops: boolean; error?: string; result?: Submitted };

export function SubmitScores({ group, rounds, mode, players, onSubmitted, className }: SubmitScoresProps) {
  const id = useId();
  const [rows, setRows] = useState<[Row, Row]>([
    { typed: null, oops: false },
    { typed: null, oops: false },
  ]);
  const [sending, setSending] = useState(false);
  const nameOf = (i: 0 | 1) => rows[i].typed ?? players[i].name;
  const patch = (i: 0 | 1, p: Partial<Row>) => setRows((r) => (i === 0 ? [{ ...r[0], ...p }, r[1]] : [r[0], { ...r[1], ...p }]));

  async function send(e: FormEvent) {
    e.preventDefault();
    const checked = ([0, 1] as const).map((i) => checkName(nameOf(i), BOARD.nameMax));
    let bad = false;
    checked.forEach((c, i) => {
      if (!c.ok && !rows[i].result) {
        bad = true;
        patch(i as 0 | 1, { error: c.error });
      }
    });
    if (bad) return;
    const [a, b] = checked.map((c) => (c.ok ? c.value : ""));
    if (nameKey(a) === nameKey(b)) return patch(1, { error: "same_names" });
    setSending(true);
    const results: (Submitted | undefined)[] = [rows[0].result, rows[1].result];
    for (const i of [0, 1] as const) {
      if (results[i]) continue;
      const p = players[i];
      const name = i === 0 ? a : b;
      const answer = await postScore({ group, name, score: p.score, rounds, mode, ...(p.stats && { stats: p.stats }), oops: rows[i].oops });
      if (!answer.ok) {
        patch(i, { error: answer.error });
        continue;
      }
      results[i] = answer.value;
      patch(i, { result: answer.value, error: undefined });
      if (i === 0) saveNickname(name);
      announce({ group, name, rank: answer.value.rank });
    }
    setSending(false);
    if (results[0] && results[1]) onSubmitted?.([results[0], results[1]]);
  }

  const done = rows[0].result && rows[1].result;
  // Player one landed first: once player two is on too, player one moves down a place if two landed at or above
  // them, and both count the board as it is now (for "you're #2!" and the titles).
  const shown = (i: 0 | 1): Submitted | undefined => {
    const r = rows[i].result;
    const other = rows[1].result;
    if (!r || i === 1 || !other) return r;
    return { ...r, rank: other.rank <= r.rank ? r.rank + 1 : r.rank, players: other.players ?? r.players };
  };
  return (
    <PaperSheet label={TEXT.submit.label} className={`w-full max-w-sm ${className ?? ""}`}>
      <form onSubmit={send} className="flex flex-col items-stretch gap-2.5">
        {!done && <p className="text-center font-heading text-xl leading-tight">{TEXT.submit.askBoth}</p>}
        {([0, 1] as const).map((i) => {
          const p = players[i];
          const row = rows[i];
          const fieldId = `${id}-${i}`;
          const result = shown(i);
          if (result) {
            const { entry, rank, players: count } = result;
            const title = titleFor(entry, rank, count ?? rank);
            return (
              <div key={i} className="flex items-center gap-2.5">
                <SnowmanFace look={p.look} size={36} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate font-heading text-lg font-bold text-ink-deep">{TEXT.submit.done(entry.name)}</p>
                  <p
                    className={`w-fit font-heading text-base text-ink-deep ${lb.note}`}
                    style={{ "--lb-note-in": `${BOARD.look.noteIn}s`, "--lb-note-over": BOARD.look.noteOvershoot } as CSSProperties}
                    role="status"
                  >
                    {TEXT.youAre(rank)}
                  </p>
                </div>
                {title && <TitleLine id={title} />}
              </div>
            );
          }
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <SnowmanFace look={p.look} size={36} />
                <div className="relative h-11 min-w-0 flex-1 rounded-full bg-paper">
                  <PencilFrame seed={p.score + 3 + i * 7} radius={22} overshoot={4} />
                  <input
                    id={fieldId}
                    value={nameOf(i)}
                    onChange={(e) => patch(i, { typed: e.target.value, error: undefined })}
                    maxLength={BOARD.nameMax * 2}
                    placeholder={TEXT.submit.placeholder}
                    aria-label={TEXT.submit.nameFor(p.name)}
                    autoComplete={i === 0 ? "nickname" : "off"}
                    enterKeyHint="done"
                    disabled={sending}
                    aria-invalid={!!row.error}
                    aria-describedby={row.error ? `${fieldId}-error` : undefined}
                    className={`relative size-full rounded-full bg-transparent px-4 text-center font-heading text-xl text-ink-deep ${lb.input}`}
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-heading text-2xl leading-none font-bold text-ink-deep tabular-nums">
                  {p.score}
                </span>
              </div>
              {row.error && (
                <p id={`${fieldId}-error`} role="alert" className="text-center font-heading text-base leading-tight text-berry-deep">
                  {TEXT.errors[row.error] ?? TEXT.errors.server}
                </p>
              )}
              {p.stats?.worst !== undefined && (
                <label className="ml-11 flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={row.oops}
                    onChange={(e) => patch(i, { oops: e.target.checked })}
                    disabled={sending}
                    className="size-3.5 shrink-0 accent-[var(--berry)]"
                  />
                  <span className="font-heading text-xs leading-tight text-ink-deep">{TEXT.oops.optInShort}</span>
                </label>
              )}
            </div>
          );
        })}
        {!done && (
          <>
            <Button
              type="submit"
              size="lg"
              disabled={sending}
              className="mt-1 h-12 w-full rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
            >
              {sending ? TEXT.submit.sending : TEXT.submit.buttonBoth}
            </Button>
            <p className="text-center font-sans text-[11px] leading-tight opacity-70">{TEXT.submit.privacy}</p>
          </>
        )}
      </form>
    </PaperSheet>
  );
}
