"use client";

/**
 * The nickname prompt shown when a match ends on a page with a group: "your nickname for the board", prefilled
 * with the one remembered on this device, and a "pop it on!" button. It sends the score to our server (never the
 * database), remembers the nickname after it lands, and tells the boards on the page to refresh.
 */
import { useId, useState, useSyncExternalStore, type CSSProperties, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { PencilFrame } from "@/features/hud/Doodles";
import { announce, postScore, readNickname, saveNickname, subscribeNickname, type Submitted } from "./api";
import { BOARD, TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { lb } from "./boardStyles";
import { checkName, type MatchMode, type MatchStats, type Rounds } from "./rules";
import { TitleLine } from "./TitleLine";
import { titleFor } from "./titles";

export type SubmitScoreProps = {
  /** The invite group id (`?g=` on the link). Without one there is no board, so render nothing. */
  group: string;
  /** This player's match total. */
  score: number;
  rounds: Rounds;
  mode: MatchMode;
  /** A name to start with instead of the remembered one (e.g. the invite's `from`, or a player's name). */
  defaultName?: string;
  /** Remember the nickname on this device after it lands (default on; off for a second player on the same phone). */
  remember?: boolean;
  onSubmitted?: (result: Submitted) => void;
  className?: string;
  /** This match's play-style numbers (full clears, friends knocked, ...), for the board's funny titles. */
  stats?: MatchStats;
};

type State = { status: "asking"; error?: string } | { status: "sending" } | { status: "done"; result: Submitted };

export function SubmitScore({ group, score, rounds, mode, defaultName, remember = true, onSubmitted, className, stats }: SubmitScoreProps) {
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const [state, setState] = useState<State>({ status: "asking" });
  const id = useId();
  // A team's name is both nicknames joined, so it may be longer.
  const nameMax = mode === "team" ? BOARD.teamNameMax : BOARD.nameMax;
  const name = typed ?? (defaultName || remembered);

  async function send(e: FormEvent) {
    e.preventDefault();
    const checked = checkName(name, nameMax);
    if (!checked.ok) return setState({ status: "asking", error: checked.error });
    setState({ status: "sending" });
    const answer = await postScore({ group, name: checked.value, score, rounds, mode, ...(stats && { stats }) });
    if (!answer.ok) return setState({ status: "asking", error: answer.error });
    if (remember) saveNickname(checked.value);
    setState({ status: "done", result: answer.value });
    announce({ group, name: checked.value, rank: answer.value.rank });
    onSubmitted?.(answer.value);
  }

  if (state.status === "done") {
    const { entry, rank, players } = state.result;
    const title = titleFor(entry, rank, players ?? rank);
    return (
      <PaperSheet seed={score + 11} label={TEXT.submit.label} className={`w-full max-w-sm text-center ${className ?? ""}`}>
        <p className="font-heading text-2xl leading-tight font-bold text-ink-deep">{TEXT.submit.done(entry.name)}</p>
        <p
          className={`mx-auto mt-1 w-fit font-heading text-xl leading-tight font-bold text-ink-deep ${lb.note}`}
          style={{ "--lb-note-in": `${BOARD.look.noteIn}s`, "--lb-note-over": BOARD.look.noteOvershoot } as CSSProperties}
          role="status"
        >
          <span className={lb.bob}>{TEXT.youAre(rank)}</span>
        </p>
        {/* Your funny title on this board, a beat after "you're #2!" (no badge box: a star doodle and handwriting). */}
        {title && <TitleLine id={title} className="mt-2" big />}
      </PaperSheet>
    );
  }

  const sending = state.status === "sending";
  const error = state.status === "asking" ? state.error : undefined;
  return (
    <PaperSheet seed={score + 11} label={TEXT.submit.label} className={`w-full max-w-sm ${className ?? ""}`}>
      <form onSubmit={send} className="flex flex-col items-stretch gap-2">
        <label htmlFor={id} className="text-center font-heading text-xl leading-tight">
          {TEXT.submit.ask}
        </label>
        <div className="relative h-12 rounded-full bg-paper">
          <PencilFrame seed={score + 3} radius={24} />
          <input
            id={id}
            value={name}
            onChange={(e) => setTyped(e.target.value)}
            maxLength={nameMax * 2}
            placeholder={TEXT.submit.placeholder}
            autoComplete="nickname"
            enterKeyHint="done"
            disabled={sending}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`relative size-full rounded-full bg-transparent px-5 text-center font-heading text-2xl text-ink-deep ${lb.input}`}
          />
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="text-center font-heading text-lg leading-tight text-berry-deep">
            {TEXT.errors[error] ?? TEXT.errors.server}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={sending}
          className="h-12 w-full rounded-full bg-sky-blue font-heading text-2xl font-bold text-ink-deep hover:bg-sky-blue/80"
        >
          {sending ? TEXT.submit.sending : TEXT.submit.button}
        </Button>
        <p className="text-center font-sans text-[11px] leading-tight opacity-70">{TEXT.submit.privacy}</p>
      </form>
    </PaperSheet>
  );
}
