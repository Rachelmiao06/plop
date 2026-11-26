"use client";

/**
 * One invite group's board, a ranked list (Rachel's approved design): #1 on a little podium as her sassy snowman
 * (`ChampPodium`), then clean rows with your own row pinned at the bottom (`RankedList`). It refreshes itself
 * whenever `<SubmitScore>` lands a score for the same group anywhere on the page. Tap a friend's row to throw a
 * snowball at them (one per friend per hour, `/api/snowballs`); each avatar shows how often it was hit today. `BoardSheet` is the same board drawn from scores you hand it (the test
 * page uses it).
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { announceBall, fetchBoard, fetchHits, onBall, onLanded, readNickname, subscribeNickname, throwSnowball, type BoardEntry } from "./api";
import { BOARD, SNOWBALL, TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { nameKey } from "./rules";
import { ChampPodium } from "./ChampPodium";
import { RankedList, type ThrowOutcome } from "./RankedList";
import { titleFor, type TitleId } from "./titles";
import { saveSeen, snapshot } from "./overtake";

export type GroupBoardProps = {
  /** The invite group id (`?g=` on the link). */
  group: string;
  /** Whose row to highlight. Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** Rows to show, at most `BOARD.top`. */
  limit?: number;
  className?: string;
  /** Show "tap a friend to throw" over the pile (default yes). */
  hint?: boolean;
};

type State = { status: "loading" } | { status: "failed" } | { status: "ready"; scores: BoardEntry[] };

export function GroupBoard({ group, me, limit = BOARD.top, className, hint }: GroupBoardProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  /** Counts scores landing for this group, so the viewer's highlight scribbles in again. */
  const [landed, setLanded] = useState(0);
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const myName = me ?? remembered;
  const viewer = nameKey(myName);
  const [hits, setHits] = useState<Record<string, number>>({});

  /** The board was seen: remember it on this device, so "X just passed you" only tells of changes not seen yet. */
  const seen = useCallback(
    (scores: BoardEntry[]) => {
      const now = myName ? snapshot(scores, myName) : null;
      if (now) saveSeen(group, now);
    },
    [group, myName],
  );

  const load = useCallback(async () => {
    const answer = await fetchBoard(group);
    setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
    if (answer.ok) seen(answer.value.scores);
  }, [group, limit, seen]);

  useEffect(() => {
    let live = true;
    fetchBoard(group).then((answer) => {
      if (!live) return;
      setState(answer.ok ? { status: "ready", scores: answer.value.scores.slice(0, limit) } : { status: "failed" });
      if (answer.ok) seen(answer.value.scores);
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
  }, [group, limit, load, seen]);

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
      hint={hint}
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
  /** Show "tap a friend to throw" over the pile (the invite page leaves it out: one action per screen). */
  hint?: boolean;
};

export type BoardState = State;

/** The board drawn from what it is given: the title, #1 on its podium, the ranked list with your row pinned. */
export function BoardSheet({ state, viewer, className, hits, onThrow, hint = true }: BoardSheetProps) {
  const scores = state.status === "ready" ? state.scores : [];
  // Each player's funny title (at most one; `titles.ts`), by nickname key.
  const titles = Object.fromEntries(
    scores.flatMap((s, i) => {
      const t = titleFor(s, i + 1, scores.length);
      return t ? [[nameKey(s.name), t]] : [];
    }),
  ) as Record<string, TitleId>;
  const top = scores[0];

  return (
    <PaperSheet label={TEXT.title} className={`w-full max-w-sm ${className ?? ""}`}>
      <h2 className="mb-1 text-center leading-tight">
        <span className="block font-heading text-2xl font-bold text-ink-deep">{TEXT.title}</span>
        <span className="block font-heading text-sm opacity-70">{TEXT.titleEn}</span>
      </h2>

      {state.status === "loading" && <p className="py-4 text-center font-heading text-lg opacity-75">{TEXT.loading}</p>}
      {state.status === "failed" && <p className="py-4 text-center font-heading text-lg">{TEXT.failed}</p>}
      {state.status === "ready" && scores.length === 0 && <p className="py-4 text-center font-heading text-lg">{TEXT.empty}</p>}

      {top && (
        <>
          {/* A new #1 gets the "deal with it" moment again (a new key). */}
          <ChampPodium key={nameKey(top.name)} entry={top} title={titles[nameKey(top.name)]} me={nameKey(top.name) === viewer} />
          {hint && onThrow && viewer && scores.length > 1 && (
            <p className="mt-2 mb-1 text-center font-heading text-sm leading-tight opacity-75">
              {TEXT.snowball.hintZh} · {TEXT.snowball.hint}
            </p>
          )}
          <div className="mt-2">
            <RankedList scores={scores} viewer={viewer} hits={hits} titles={titles} onThrow={onThrow} />
          </div>
        </>
      )}
    </PaperSheet>
  );
}
