"use client";

/**
 * The ranked list (Rachel's approved design): clean rows of rank (pencil medal circles in butter, snow and blush for
 * 1 to 3, plain numbers after), a small avatar (the player's snowman face in a soft rounded square), the name with
 * the funny title as a small second line, and the score on the right. Row 1 has a pale butter wash. The viewer's own
 * row is pinned at the bottom, outlined in butter, with how far it is to pass the one above ("你是第一！" on top).
 * Tapping a friend's row throws a snowball from your avatar to theirs; today's hits show as a tiny snow mark on the
 * avatar. No frames inside frames, no pills.
 */
import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { SnowmanFace } from "@/features/hud/Doodles";
import type { BoardEntry } from "./api";
import { lb } from "./boardStyles";
import { LIST, SNOWBALL, TEXT } from "./content";
import { RankMark } from "./Doodles";
import { Flight, type FlightPlan, type Point } from "./Flight";
import { lookFor } from "./looks";
import { nameKey } from "./rules";
import type { TitleId } from "./titles";

export type ThrowOutcome = { thrown: true } | { waitMinutes: number } | { failed: true };

export type RankedListProps = {
  /** Best first. */
  scores: BoardEntry[];
  /** The viewer's `nameKey`, or "" for nobody. */
  viewer: string;
  /** Today's snowball hits per player, by `nameKey`. */
  hits?: Record<string, number>;
  /** Each player's funny title, by `nameKey`. */
  titles?: Record<string, TitleId>;
  /** Tap a friend's row to throw a snowball (only when there is a viewer). */
  onThrow?: (to: BoardEntry) => Promise<ThrowOutcome>;
};

export function RankedList({ scores, viewer, hits, titles, onThrow }: RankedListProps) {
  const box = useRef<HTMLDivElement>(null);
  const avatars = useRef(new Map<string, HTMLElement>());
  const [flights, setFlights] = useState<FlightPlan[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const busy = useRef(new Set<string>());
  const flightId = useRef(0);
  const mine = viewer ? scores.findIndex((s) => nameKey(s.name) === viewer) : -1;

  /** An avatar's middle, in the list box's pixels. */
  const centre = (key: string): Point | null => {
    const el = avatars.current.get(key);
    const root = box.current?.getBoundingClientRect();
    if (!el || !root) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left - root.left + r.width / 2, y: r.top - root.top + r.height / 2 };
  };

  const note = useCallback((key: string, text: string) => {
    setNotes((n) => ({ ...n, [key]: text }));
    setTimeout(
      () =>
        setNotes((n) => {
          const rest = { ...n };
          delete rest[key];
          return rest;
        }),
      SNOWBALL.waitNote * 1000,
    );
  }, []);

  const throwAt = async (entry: BoardEntry) => {
    const key = nameKey(entry.name);
    if (!onThrow || busy.current.has(key)) return;
    busy.current.add(key);
    try {
      const outcome = await onThrow(entry);
      if ("waitMinutes" in outcome) return note(key, TEXT.snowball.wait(outcome.waitMinutes));
      if ("failed" in outcome) return note(key, TEXT.snowball.failed);
      const to = centre(key);
      const from = centre(`pinned:${viewer}`) ?? centre(viewer);
      if (to && from) setFlights((f) => [...f, { id: ++flightId.current, from, to, target: key, size: LIST.avatar * 1.6 }]);
    } finally {
      busy.current.delete(key);
    }
  };

  /** The snowball landed: the friend's avatar wobbles. */
  const onSplat = (key: string) =>
    avatars.current.get(key)?.animate(
      [
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(-10deg) scale(1.12, 0.88)", offset: 0.3 },
        { transform: "rotate(6deg) scale(0.95, 1.05)", offset: 0.6 },
        { transform: "rotate(0deg) scale(1)" },
      ],
      { duration: 480, easing: "ease-out" },
    );

  const row = (s: BoardEntry, i: number, pinned: boolean) => {
    const key = nameKey(s.name);
    const isMe = i === mine;
    const canHit = Boolean(onThrow) && viewer !== "" && !isMe && !pinned;
    const title = titles?.[key];
    const above = i > 0 ? scores[i - 1] : null;
    const hit = hits?.[key] ?? 0;
    const second = pinned
      ? above
        ? TEXT.toPass(above.best - s.best + 1, above.name)
        : TEXT.onTop
      : title
        ? TEXT.titles[title].zh
        : null;
    return (
      <li
        key={pinned ? `pinned-${key}` : key}
        className={`relative flex items-center gap-2.5 rounded-xl px-2 py-1.5 ${i === 0 && !pinned ? "bg-butter/30" : ""} ${
          pinned ? "mt-2 ring-2 ring-butter" : ""
        } ${canHit ? `cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${lb.rowTap}` : ""} ${lb.row}`}
        style={{ "--lb-i": i } as React.CSSProperties}
        aria-current={isMe ? "true" : undefined}
        {...(canHit && {
          role: "button",
          tabIndex: 0,
          "aria-label": TEXT.snowball.throwAt(s.name),
          onClick: () => throwAt(s),
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              throwAt(s);
            }
          },
        })}
      >
        <span className="w-7 shrink-0">
          <RankMark rank={i + 1} crown={false} />
        </span>
        <span
          ref={(el) => {
            const k = pinned ? `pinned:${key}` : key;
            if (el) avatars.current.set(k, el);
            else avatars.current.delete(k);
          }}
          className="relative grid shrink-0 place-items-center overflow-visible rounded-[10px] bg-snow-white"
          style={{ width: LIST.avatar, height: LIST.avatar, boxShadow: "0 1px 3px color-mix(in oklab, var(--ink) 18%, transparent)" }}
        >
          <SnowmanFace look={lookFor(s.name, s.bestMode === "team")} size={LIST.avatar - 4} />
          {hit > 0 && (
            <span className="absolute -top-1.5 -right-2 flex items-center" title={`${TEXT.snowball.hits(hit)} · ${TEXT.snowball.hitsEn(hit)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff, as snow stuck on the avatar */}
              <img src="/assets/effects/snow-puff.webp" alt="" aria-hidden width={LIST.hitMark} height={(LIST.hitMark * 235) / 306} draggable={false} />
              <span className="-ml-0.5 font-heading text-[10px] leading-none font-bold text-ink-deep" aria-hidden>
                {hit}
              </span>
              <span className="sr-only">{TEXT.snowball.hits(hit)}</span>
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block truncate font-heading text-lg text-ink-deep ${isMe ? "font-bold" : ""}`}>
            {s.name}
            {isMe && !pinned && <span className="ml-1 text-sm font-normal opacity-70">({TEXT.you})</span>}
          </span>
          {notes[key] ? (
            <span className={`block font-heading text-xs text-berry-deep ${lb.note}`} role="status">
              {notes[key]}
            </span>
          ) : (
            second && (
              <span
                className={`block truncate font-heading text-xs ${pinned ? "text-ink" : "text-berry-deep"}`}
                title={!pinned && title ? TEXT.titles[title].en : undefined}
              >
                {second}
              </span>
            )
          )}
        </span>
        <span className="shrink-0 font-heading text-2xl leading-none font-bold text-ink-deep tabular-nums">{s.best}</span>
      </li>
    );
  };

  return (
    <div ref={box} className="relative">
      <ol className="flex flex-col gap-0.5" aria-label={TEXT.list}>
        {scores.map((s, i) => row(s, i, false))}
      </ol>
      {mine >= 0 && <ul aria-label={TEXT.you}>{row(scores[mine], mine, true)}</ul>}
      {flights.map((f) => (
        <Flight key={f.id} plan={f} onHit={() => onSplat(f.target)} onDone={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}
    </div>
  );
}
