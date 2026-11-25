"use client";

/**
 * One invite group's board: a small paper list, best first. Each row has a rank doodle, one of the two snowman
 * faces (the same face for the same name), the nickname and the best score in handwriting, a tiny note of the
 * match length, and the viewer's own row scribbled over in butter crayon with a "you're #2!" note.
 * It refreshes itself whenever `<SubmitScore>` lands a score for the same group anywhere on the page.
 */
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SnowmanFace, StarDoodle } from "@/features/hud/Doodles";
import { fetchBoard, onLanded, readNickname, subscribeNickname, type BoardEntry } from "./api";
import { BOARD, TEXT } from "./content";
import { CrayonHighlight, PaperSheet, RankMark } from "./Doodles";
import { lb } from "./boardStyles";
import { nameKey } from "./rules";

export type GroupBoardProps = {
  /** The invite group id (`?g=` on the link). */
  group: string;
  /** Whose row to highlight. Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** Rows to show, at most `BOARD.top`. */
  limit?: number;
  className?: string;
};

type State = { status: "loading" } | { status: "failed" } | { status: "ready"; scores: BoardEntry[] };

/** The same nickname always gets the same snowman. */
const lookFor = (name: string) =>
  Array.from(nameKey(name)).reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7) % 2 ? "redHat" : "bucket";

export function GroupBoard({ group, me, limit = BOARD.top, className }: GroupBoardProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  /** Counts scores landing for this group, so the viewer's highlight scribbles in again. */
  const [landed, setLanded] = useState(0);
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const viewer = nameKey(me ?? remembered);

  const load = useCallback(async () => {
    const answer = await fetchBoard(group);
    setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
  }, [group, limit]);

  useEffect(() => {
    let live = true;
    fetchBoard(group).then((answer) => {
      if (live) setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
    });
    const off = onLanded((d) => {
      if (d.group !== group) return;
      setLanded((n) => n + 1);
      load();
    });
    return () => {
      live = false;
      off();
    };
  }, [group, limit, load]);

  const mine = state.status === "ready" && viewer ? state.scores.findIndex((s) => nameKey(s.name) === viewer) : -1;
  const { face, rowTilt, noteIn, noteOvershoot } = BOARD.look;

  return (
    <PaperSheet seed={group.charCodeAt(0) + group.charCodeAt(7)} label={TEXT.title} className={`w-full max-w-sm ${className ?? ""}`}>
      <div className="mb-2 flex items-center justify-center gap-1.5">
        <span className={lb.star}>
          <StarDoodle size={20} />
        </span>
        <h2 className="font-heading text-2xl leading-none font-bold text-ink-deep">{TEXT.title}</h2>
      </div>

      {state.status === "loading" && <p className="py-4 text-center font-heading text-lg opacity-75">{TEXT.loading}</p>}
      {state.status === "failed" && <p className="py-4 text-center font-heading text-lg">{TEXT.failed}</p>}
      {state.status === "ready" && state.scores.length === 0 && (
        <p className="py-4 text-center font-heading text-lg">{TEXT.empty}</p>
      )}

      {state.status === "ready" && state.scores.length > 0 && (
        <ol className="flex flex-col gap-1">
          {state.scores.map((s, i) => {
            const isMe = i === mine;
            return (
              <li
                key={nameKey(s.name)}
                className={`relative isolate flex items-center gap-2 px-1.5 py-1 ${lb.row}`}
                style={{ "--lb-i": i, "--lb-tilt": `${(i % 2 ? 1 : -1) * rowTilt}deg` } as CSSProperties}
                aria-current={isMe ? "true" : undefined}
              >
                {isMe && <CrayonHighlight key={landed} />}
                <RankMark rank={i + 1} />
                <span className={isMe ? lb.hop : "inline-block"}>
                  <SnowmanFace look={lookFor(s.name)} size={face} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-xl leading-tight">
                    {s.name}
                    {isMe && <span className="ml-1.5 text-base opacity-70">({TEXT.you})</span>}
                  </span>
                  <span className="block font-sans text-[11px] leading-tight opacity-70">
                    {TEXT.rounds(s.bestRounds)}
                    {s.bestMode === "together" && ` · ${TEXT.together}`}
                    {s.plays > 1 && ` · ${TEXT.latest(s.latest)}`}
                  </span>
                </span>
                <span className="font-heading text-3xl leading-none font-bold text-ink-deep tabular-nums">{s.best}</span>
              </li>
            );
          })}
        </ol>
      )}

      {mine >= 0 && (
        <p
          key={`${viewer}-${mine}`}
          className={`mx-auto mt-2 w-fit rounded-full bg-butter/60 px-3 py-0.5 font-heading text-xl leading-tight font-bold text-ink-deep ${lb.note}`}
          style={{ "--lb-note-in": `${noteIn}s`, "--lb-note-over": noteOvershoot } as CSSProperties}
          role="status"
        >
          <span className={lb.bob}>{TEXT.youAre(mine + 1)}</span>
        </p>
      )}
    </PaperSheet>
  );
}
