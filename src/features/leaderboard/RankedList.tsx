"use client";

/**
 * The ranked list (Rachel's approved design): clean rows of rank (pencil medal circles in butter, snow and blush for
 * 1 to 3, plain numbers after), a small avatar (the player's snowman face in a soft rounded square), the name with
 * the funny title as a small second line, and the score on the right. Row 1 has a pale butter wash. The viewer's own
 * row is pinned at the bottom, outlined in butter, with how far it is to pass the one above ("你是第一！" on top).
 * Tapping a friend's row throws a snowball from your avatar to theirs; today's hits show as a tiny snow mark on the
 * avatar. No frames inside frames, no pills.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SnowmanFace, StarDoodle } from "@/features/hud/Doodles";
import type { BoardEntry, ReactionCounts, ReactionKind } from "./api";
import { lb } from "./boardStyles";
import { LIST, REACTIONS, SNOWBALL, TEXT } from "./content";
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
  /** Sticker counts per line, the viewer's own stickers, and sticking one (hold a row, or its "+"). */
  reactions?: ReactionCounts;
  given?: Record<string, ReactionKind>;
  onReact?: (to: BoardEntry, kind: ReactionKind | null) => Promise<boolean>;
  /** "今日最惨": the group's lowest throw today among those who opted in (left out: no line). */
  oops?: { entry: BoardEntry; low: number };
};

export function RankedList({ scores, viewer, hits, titles, onThrow, reactions, given, onReact, oops }: RankedListProps) {
  const box = useRef<HTMLDivElement>(null);
  const avatars = useRef(new Map<string, HTMLElement>());
  const [flights, setFlights] = useState<FlightPlan[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const busy = useRef(new Set<string>());
  const flightId = useRef(0);
  const mine = viewer ? scores.findIndex((s) => nameKey(s.name) === viewer) : -1;
  /** The row whose sticker picker is open. */
  const [picking, setPicking] = useState<string | null>(null);
  const hold = useRef<{ timer: ReturnType<typeof setTimeout> | null; fired: boolean }>({ timer: null, fired: false });

  // Close the picker on a tap anywhere else.
  useEffect(() => {
    if (!picking) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest("[data-sticker-picker]")) setPicking(null);
    };
    window.addEventListener("pointerdown", close, true);
    return () => window.removeEventListener("pointerdown", close, true);
  }, [picking]);

  const pick = async (entry: BoardEntry, kind: ReactionKind) => {
    const key = nameKey(entry.name);
    setPicking(null);
    if (!onReact) return;
    // The same sticker again takes it back.
    const ok = await onReact(entry, given?.[key] === kind ? null : kind);
    if (!ok) note(key, TEXT.reactions.failed);
  };

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
    const canReact = Boolean(onReact) && viewer !== "" && !isMe && !pinned;
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
        {...(canReact && {
          onPointerDown: () => {
            hold.current.fired = false;
            if (hold.current.timer) clearTimeout(hold.current.timer);
            hold.current.timer = setTimeout(() => {
              hold.current.fired = true;
              setPicking(key);
            }, REACTIONS.holdMs);
          },
          onPointerUp: endHold,
          onPointerLeave: endHold,
          onPointerCancel: endHold,
          onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        })}
        {...(canHit && {
          role: "button",
          tabIndex: 0,
          "aria-label": TEXT.snowball.throwAt(s.name),
          onClick: () => {
            if (hold.current.fired) return void (hold.current.fired = false); // a hold opened the stickers
            throwAt(s);
          },
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
            <span className="absolute -top-1.5 -right-2 flex items-center" title={TEXT.snowball.hits(hit)}>
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
              >
                {second}
              </span>
            )
          )}
        </span>
        {stickerCounts(key, !pinned)}
        {canReact && plusButton(s, key)}
        <span className="shrink-0 font-heading text-2xl leading-none font-bold text-ink-deep tabular-nums">{s.best}</span>
        {picking === key && picker(s, key)}
      </li>
    );
  };


  /** A line's stickers: tiny doodles with their counts, by the score (yours washed in butter). */
  const stickerCounts = (key: string, mark: boolean) => {
    const counts = reactions?.[key] ?? {};
    return (
      <span className="flex shrink-0 items-center gap-1" aria-label={stickerLabel(counts)}>
        {REACTIONS.kinds
          .filter((k) => (counts[k] ?? 0) > 0)
          .map((k) => (
            <span key={k} className={`flex items-center ${given?.[key] === k && mark ? "rounded-full bg-butter/50 px-0.5" : ""}`}>
              <Sticker kind={k} size={REACTIONS.countSize} />
              <span className="font-heading text-[11px] leading-none text-ink-deep tabular-nums" aria-hidden>
                {counts[k]}
              </span>
            </span>
          ))}
      </span>
    );
  };

  /** The small "+" that opens the stickers (`pickKey` tells the picker which line it belongs to). */
  const plusButton = (s: BoardEntry, pickKey: string) => (
    <button
      type="button"
      className="-mr-1 grid size-6 shrink-0 place-items-center rounded-full font-heading text-lg leading-none text-ink opacity-50 hover:opacity-90"
      aria-label={TEXT.reactions.open(s.name)}
      aria-expanded={picking === pickKey}
      onClick={(e) => {
        e.stopPropagation();
        setPicking((p) => (p === pickKey ? null : pickKey));
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      +
    </button>
  );

  /** The four stickers to pick from, floating above the line. */
  const picker = (s: BoardEntry, pickKey: string) => {
    const key = nameKey(s.name);
    return (
      <span
        key={pickKey}
        data-sticker-picker
        role="menu"
        className={`absolute -top-11 right-2 z-30 flex items-end gap-1.5 rounded-2xl bg-snow-white px-2 py-1 ${lb.note}`}
        style={{ boxShadow: "0 3px 12px -4px color-mix(in oklab, var(--ink) 35%, transparent)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {REACTIONS.kinds.map((k) => {
          const n = TEXT.reactions.names[k];
          const on = given?.[key] === k;
          return (
            <button
              key={k}
              type="button"
              role="menuitem"
              aria-label={on ? `${TEXT.reactions.remove} · ${n}` : n}
              className={`flex flex-col items-center rounded-xl px-1 pt-0.5 transition-transform hover:scale-110 active:scale-95 ${on ? "bg-butter/60" : ""}`}
              onClick={() => pick(s, k)}
            >
              <Sticker kind={k} size={REACTIONS.pickSize} />
              <span className="font-heading text-[10px] leading-tight text-ink-deep">{n}</span>
            </button>
          );
        })}
      </span>
    );
  };

  /**
   * "今日最惨": one quiet line under the list for the group's lowest throw today among players who opted in, with a
   * dizzy avatar. Stickers work on it (they are the player's stickers, the same as on their row).
   */
  const oopsLine = (o: { entry: BoardEntry; low: number }) => {
    const key = nameKey(o.entry.name);
    const pickKey = `oops:${key}`;
    const canReact = Boolean(onReact) && viewer !== "" && key !== viewer;
    return (
      <div className="mt-3" aria-label={TEXT.oops.heading}>
        <p className="mb-1 text-center font-heading text-xs opacity-60">{TEXT.oops.heading}</p>
        <div className="relative flex items-center gap-2.5 px-2 py-1">
          <span
            className="relative grid shrink-0 place-items-center overflow-visible rounded-[10px] bg-snow-white"
            style={{ width: LIST.avatar, height: LIST.avatar, boxShadow: "0 1px 3px color-mix(in oklab, var(--ink) 18%, transparent)" }}
          >
            <span className={`block ${lb.dizzyFace}`}>
              <SnowmanFace look={lookFor(o.entry.name, o.entry.bestMode === "team")} size={LIST.avatar - 4} />
            </span>
            {/* Dizzy: Rachel's wind curl spinning over the head and two stars going round. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's wind curl */}
            <img src="/assets/effects/wind-curl.webp" alt="" aria-hidden width={20} height={15} className={`absolute -top-2.5 left-1/2 -ml-2.5 max-w-none ${lb.dizzy}`} draggable={false} />
            <span className={`absolute -top-2 left-1/2 ${lb.orbit}`} aria-hidden>
              <span className="block -translate-x-[14px]">
                <StarDoodle size={9} />
              </span>
            </span>
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block font-heading text-sm text-ink-deep">{TEXT.oops.line(o.entry.name, o.low)}</span>
          </span>
          {stickerCounts(key, true)}
          {canReact && plusButton(o.entry, pickKey)}
          {picking === pickKey && picker(o.entry, pickKey)}
        </div>
      </div>
    );
  };

  function endHold() {
    if (hold.current.timer) clearTimeout(hold.current.timer);
    hold.current.timer = null;
  }

  return (
    <div ref={box} className="relative">
      <ol className="flex flex-col gap-0.5" aria-label={TEXT.list}>
        {scores.map((s, i) => row(s, i, false))}
      </ol>
      {mine >= 0 && <ul aria-label={TEXT.you}>{row(scores[mine], mine, true)}</ul>}
      {oops && oopsLine(oops)}
      {flights.map((f) => (
        <Flight key={f.id} plan={f} onHit={() => onSplat(f.target)} onDone={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}
    </div>
  );
}

/** One of Rachel's effect doodles used as a sticker. */
export function Sticker({ kind, size }: { kind: ReactionKind; size: number }) {
  const a = REACTIONS.art[kind];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Rachel's effect doodle
    <img src={a.src} alt="" aria-hidden width={size} height={(size * a.h) / a.w} className="max-w-none select-none" draggable={false} />
  );
}

/** "厉害 2 · 笑死 1" for screen readers. */
function stickerLabel(counts: Partial<Record<ReactionKind, number>>) {
  return REACTIONS.kinds
    .filter((k) => (counts[k] ?? 0) > 0)
    .map((k) => `${TEXT.reactions.names[k]} ${counts[k]}`)
    .join(" · ");
}
