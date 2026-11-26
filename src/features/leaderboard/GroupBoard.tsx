"use client";

/**
 * One invite group's board: the snowman pile (better scores stand on the heads of the ones below, `SnowmanPile`)
 * with a compact paper list underneath for exact numbers: a rank doodle, the snowman's face, the nickname, a tiny
 * note of the match length and the best score, the viewer's own row scribbled over in butter crayon with a
 * "you're #2!" note. It refreshes itself whenever `<SubmitScore>` lands a score for the same group anywhere on
 * the page. Tap a friend's snowman to throw a snowball at them (one per friend per hour, `/api/snowballs`); each
 * snowman shows how often it was hit today. `BoardSheet` is the same board drawn from scores you hand it (the test
 * page uses it).
 */
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { SnowmanFace, StarDoodle } from "@/features/hud/Doodles";
import { announceBall, fetchBoard, fetchHits, onBall, onLanded, readNickname, subscribeNickname, throwSnowball, type BoardEntry } from "./api";
import { BOARD, SNOWBALL, TEXT } from "./content";
import { CrayonHighlight, PaperSheet, RankMark } from "./Doodles";
import { lb } from "./boardStyles";
import { nameKey } from "./rules";
import { lookFor, SnowmanPile, type ThrowOutcome } from "./SnowmanPile";

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

export function GroupBoard({ group, me, limit = BOARD.top, className }: GroupBoardProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  /** Counts scores landing for this group, so the viewer's highlight scribbles in again. */
  const [landed, setLanded] = useState(0);
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const myName = me ?? remembered;
  const viewer = nameKey(myName);
  const [hits, setHits] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const answer = await fetchBoard(group);
    setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
  }, [group, limit]);

  useEffect(() => {
    let live = true;
    fetchBoard(group).then((answer) => {
      if (live) setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
    });
    fetchHits(group).then((answer) => {
      if (live && answer.ok) setHits(answer.value.today);
    });
    const off = onLanded((d) => {
      if (d.group !== group) return;
      setLanded((n) => n + 1);
      load();
    });
    const offBall = onBall((d) => {
      if (d.group === group) setHits((h) => ({ ...h, [nameKey(d.to)]: d.today }));
    });
    return () => {
      live = false;
      off();
      offBall();
    };
  }, [group, limit, load]);

  const onThrow = useCallback(
    async (to: BoardEntry): Promise<ThrowOutcome> => {
      const answer = await throwSnowball(group, myName, to.name);
      if (!answer.ok) return { failed: true };
      if (!answer.value.thrown) return { waitMinutes: Math.max(1, Math.ceil(answer.value.retrySeconds / 60)) };
      // The count goes up as the snowball lands.
      setTimeout(() => announceBall({ group, to: to.name, today: answer.value.today }), SNOWBALL.flight * 1000);
      return { thrown: true };
    },
    [group, myName],
  );

  return (
    <BoardSheet
      seed={group.charCodeAt(0) + group.charCodeAt(7)}
      state={state}
      viewer={viewer}
      landed={landed}
      className={className}
      hits={hits}
      onThrow={viewer ? onThrow : undefined}
    />
  );
}

export type BoardSheetProps = {
  seed: number;
  state: State;
  /** The viewer's `nameKey`, or "" for nobody. */
  viewer: string;
  /** Change it to scribble the viewer's highlight in again. */
  landed?: number;
  className?: string;
  /** Today's snowball hits per snowman, by `nameKey`. */
  hits?: Record<string, number>;
  /** Throwing at a friend (left out: snowmen cannot be tapped). */
  onThrow?: (to: BoardEntry) => Promise<ThrowOutcome>;
};

export type BoardState = State;

/** The board drawn from what it is given: title, the snowman pile, the compact list, "you're #2!". */
export function BoardSheet({ seed, state, viewer, landed = 0, className, hits, onThrow }: BoardSheetProps) {
  const mine = state.status === "ready" && viewer ? state.scores.findIndex((s) => nameKey(s.name) === viewer) : -1;
  const { face, rowTilt, noteIn, noteOvershoot } = BOARD.look;

  return (
    <PaperSheet seed={seed} label={TEXT.title} className={`w-full max-w-sm ${className ?? ""}`}>
      <div className="mb-1 flex items-center justify-center gap-1.5">
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
        <>
          {onThrow && viewer && state.scores.length > 1 && (
            <p className="-mt-0.5 mb-1 text-center font-heading text-sm leading-tight opacity-75">
              {TEXT.snowball.hintZh} · {TEXT.snowball.hint}
            </p>
          )}
          <SnowmanPile scores={state.scores} viewer={viewer} hits={hits} onThrow={onThrow} />
          <div aria-hidden className="mx-auto -mt-0.5 mb-2 h-[3px] w-[85%] rounded-full bg-snow-shadow/70" />
          <ol className="flex flex-col" aria-label={TEXT.list}>
            {state.scores.map((s, i) => {
              const isMe = i === mine;
              return (
                <li
                  key={nameKey(s.name)}
                  className={`relative isolate flex items-center gap-1.5 px-1 py-px ${lb.row}`}
                  style={{ "--lb-i": i, "--lb-tilt": `${(i % 2 ? 1 : -1) * rowTilt}deg` } as CSSProperties}
                  aria-current={isMe ? "true" : undefined}
                >
                  {isMe && <CrayonHighlight key={landed} />}
                  <span className="origin-center scale-75">
                    <RankMark rank={i + 1} />
                  </span>
                  <SnowmanFace look={s.bestMode === "team" ? "bucket" : lookFor(s.name)} size={face} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-heading text-lg leading-tight">{s.name}</span>
                    {isMe && <span className="ml-1 font-heading text-sm opacity-70">({TEXT.you})</span>}
                    <span className="ml-1.5 font-sans text-[10px] leading-tight opacity-65">
                      {TEXT.rounds(s.bestRounds)}
                      {s.bestMode === "together" && ` · ${TEXT.together}`}
                      {s.bestMode === "team" && ` · ${TEXT.team}`}
                      {s.plays > 1 && ` · ${TEXT.latest(s.latest)}`}
                    </span>
                  </span>
                  <span className="font-heading text-xl leading-none font-bold text-ink-deep tabular-nums">{s.best}</span>
                </li>
              );
            })}
          </ol>
        </>
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
