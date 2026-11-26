"use client";

/**
 * The "stand on top" board: every player is a little snowman (Rachel's thrower cut-outs, bucket or red hat) with
 * a paper name tag on its belly, and better scores stand higher, literally on the heads of the ones below, who get
 * squashed for it (and look startled: her surprise lines). #1 is alone on top in the crown. When someone overtakes
 * another, they hop over in an arc and plop down onto the one below, with a squish and a puff of snow; the one
 * going down slides to its new place first. Only changes animate. All numbers are in `PILE` (content.ts).
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CrownDoodle, SnowballDots } from "@/features/hud/Doodles";
import type { SnowmanLook } from "@/features/hud/content";
import { useSize } from "@/features/hud/hooks";
import { pencilCircle } from "@/features/hud/pencil";
import type { BoardEntry } from "./api";
import { lb } from "./boardStyles";
import { PILE, SNOWBALL, TEXT } from "./content";
import { nameKey } from "./rules";
import type { TitleId } from "./titles";

const ART: Record<SnowmanLook, string> = {
  bucket: "/assets/scenery/thrower-bucket.webp",
  redHat: "/assets/scenery/thrower-redhat.webp",
};
const PUFF = "/assets/effects/snow-puff.webp";
const OOF = "/assets/effects/surprise-lines.webp";
const HILLS = "/assets/scenery/far-hills.webp";


/** A small steady number from a nickname: the same name always gets the same snowman, lean and side. */
export function nameHash(name: string) {
  return Array.from(nameKey(name)).reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7);
}

/** The same nickname always gets the same snowman. */
export const lookFor = (name: string): SnowmanLook => (nameHash(name) % 2 ? "redHat" : "bucket");

type Slot = {
  key: string;
  entry: BoardEntry;
  rank: number;
  row: number;
  /** Centre, px from the middle of the pile. */
  x: number;
  /** Feet, px above the snow. */
  foot: number;
  /** Height before squashing. */
  h: number;
  /** 0 = nobody on your head. */
  squash: number;
  team: boolean;
  flip: boolean;
  lean: number;
};

/** Where everyone stands: rows from the top, feet on the heads below, squashed by whoever is on top. */
function pileUp(entries: BoardEntry[], slotW: number) {
  const n = Math.min(entries.length, PILE.rows.length);
  const counts = PILE.rows[n - 1] ?? [];
  const full = slotW * PILE.body * PILE.aspect;
  let i = 0;
  const grid: Slot[][] = counts.map((count, row) =>
    Array.from({ length: count }, (_, j) => {
      const entry = entries[i++];
      const hash = nameHash(entry.name);
      const team = entry.bestMode === "team";
      return {
        key: nameKey(entry.name),
        entry,
        rank: i,
        row,
        x: (j - (count - 1) / 2) * slotW,
        foot: 0,
        h: team ? full * PILE.team.scale : full,
        squash: 0,
        team,
        flip: !team && hash % 4 >= 2,
        lean: (((hash >> 3) % 100) / 50 - 1) * PILE.lean,
      };
    }),
  );
  const touching = (a: Slot, b: Slot) => Math.abs(a.x - b.x) < slotW * 0.75;

  // Weight comes from above: how many rows are stacked on your head.
  const depth = new Map<Slot, number>();
  grid.forEach((row, r) =>
    row.forEach((s) => {
      const above = r > 0 ? grid[r - 1].filter((a) => touching(a, s)) : [];
      const d = above.length ? 1 + Math.max(...above.map((a) => depth.get(a)!)) : 0;
      depth.set(s, d);
      s.squash = d ? Math.min(PILE.squash.max, PILE.squash.base + PILE.squash.perRow * (d - 1)) : 0;
    }),
  );
  // Feet go on the (squashed) heads below, sinking in a little: they stand on the hat.
  for (let r = grid.length - 2; r >= 0; r--) {
    for (const s of grid[r]) {
      const below = grid[r + 1].filter((b) => touching(b, s));
      s.foot = below.length ? Math.max(...below.map((b) => b.foot + b.h * (1 - b.squash) - full * PILE.sink)) : 0;
    }
  }
  const slots = grid.flat();
  const top = Math.max(0, ...slots.map((s) => s.foot + s.h * (1 - s.squash)));
  return { slots, full, height: top + slotW * (PILE.crown.size + PILE.crown.lift) };
}

export type SnowmanPileProps = {
  /** Best first, at most 10 (more are left to the list). */
  scores: BoardEntry[];
  /** The viewer's `nameKey`, or "" for nobody. */
  viewer: string;
  /** Today's snowball hits per snowman, by `nameKey`. */
  hits?: Record<string, number>;
  /**
   * Tap a friend to throw a snowball (only when there is a viewer). Answer what happened: it flew, the friend was
   * hit too recently (minutes to wait), or it failed.
   */
  onThrow?: (to: BoardEntry) => Promise<ThrowOutcome>;
  /** Each player's funny title, by `nameKey` (written small above the name on the belly). */
  titles?: Record<string, TitleId>;
};

export type ThrowOutcome = { thrown: true } | { waitMinutes: number } | { failed: true };

type Point = { x: number; y: number };
type FlightPlan = { id: number; from: Point; to: Point; target: string; size: number };

export function SnowmanPile({ scores, viewer, hits, onThrow, titles }: SnowmanPileProps) {
  const box = useRef<HTMLDivElement>(null);
  const { w } = useSize(box);
  const slotW = w > 0 ? Math.min(PILE.maxSlot, w / Math.max(...(PILE.rows[Math.min(scores.length, PILE.rows.length) - 1] ?? [1]))) : 0;
  const pile = useMemo(() => (slotW > 0 && scores.length ? pileUp(scores, slotW) : null), [scores, slotW]);

  const els = useRef(new Map<string, HTMLDivElement>());
  const before = useRef(new Map<string, { x: number; foot: number; rank: number }>());

  // Overtakes: FLIP each snowman whose rank changed from where it stood to where it stands now.
  useLayoutEffect(() => {
    if (!pile) return;
    const was = before.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = PILE.motion;
    const animate = !reduce && was.size > 0;
    const climbing = animate && pile.slots.some((s) => (was.get(s.key)?.rank ?? Infinity) > s.rank);

    for (const s of pile.slots) {
      const el = els.current.get(s.key);
      if (!el) continue;
      const old = was.get(s.key);
      const land = el.querySelector<HTMLElement>("[data-land]");
      const squash = el.querySelector<HTMLElement>("[data-squash]");
      const puff = el.querySelector<HTMLElement>("[data-puff]");
      const squish = (amount: number) =>
        land?.animate(
          [
            { transform: "scale(1, 1)" },
            { transform: `scale(${1 + amount}, ${1 - amount})`, offset: 0.3 },
            { transform: `scale(${1 - amount * 0.25}, ${1 + amount * 0.2})`, offset: 0.65 },
            { transform: "scale(1, 1)" },
          ],
          { duration: m.land * 1000, easing: "ease-out" },
        );
      // A squash that grows waits for the climber to land on it; one that eases happens at once.
      if (squash) squash.style.transitionDelay = climbing && (!old || old.rank < s.rank) ? `${m.hop * 900}ms` : "0ms";
      if (!animate) continue;

      if (!old) {
        // Someone new drops in from above and plops down.
        el.animate(
          [
            { transform: `translateY(${-m.dropFrom * pile.full}px)`, opacity: 0 },
            { transform: `translateY(${-m.dropFrom * pile.full * 0.8}px)`, opacity: 1, offset: 0.2 },
            { transform: "none", opacity: 1 },
          ],
          { duration: m.slide * 1000, easing: "cubic-bezier(0.5, 0, 0.75, 0)" },
        ).onfinish = () => squish(m.landSquish);
        continue;
      }
      if (old.rank === s.rank) continue;

      const dx = old.x - s.x;
      const dy = s.foot - old.foot;
      if (s.rank < old.rank) {
        // Going up: hop over in an arc, above the new place, then drop onto the head below.
        el.style.zIndex = "60";
        const peak = Math.min(dy, 0) - m.hopHeight * pile.full;
        const hop = el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)`, easing: "cubic-bezier(0.2, 0.8, 0.4, 1)" },
            { transform: `translate(${dx * 0.3}px, ${peak}px)`, offset: 0.55, easing: "cubic-bezier(0.6, 0, 0.9, 0.5)" },
            { transform: "translate(0, 0)" },
          ],
          { duration: m.hop * 1000 },
        );
        squish(m.landSquish * 0.6); // a little crouch before the jump
        hop.onfinish = () => {
          el.style.zIndex = "";
          squish(m.landSquish);
          puff?.animate(
            [
              { opacity: 0, transform: "translate(-50%, 0) scale(0.4)" },
              { opacity: 1, transform: "translate(-50%, -4px) scale(1)", offset: 0.3 },
              { opacity: 0, transform: "translate(-50%, -10px) scale(1.25)" },
            ],
            { duration: 700, easing: "ease-out" },
          );
        };
      } else {
        // Going down: slide over first, so the climber has a head to land on.
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px)` },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - pile.full * 0.08}px)`, offset: 0.45 },
            { transform: "translate(0, 0)" },
          ],
          { duration: m.slide * 1000, easing: "ease-in-out" },
        ).onfinish = () => squish(m.landSquish * 0.5);
      }
    }
    before.current = new Map(pile.slots.map((s) => [s.key, { x: s.x, foot: s.foot, rank: s.rank }]));
  }, [pile]);

  const rowsCount = pile ? Math.max(...pile.slots.map((s) => s.row)) + 1 : 0;

  // ---- snowballs: tap a friend, a snowball arcs from your snowman's head to theirs and splats.
  const [flights, setFlights] = useState<FlightPlan[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const busy = useRef(new Set<string>());
  const flightId = useRef(0);
  /** A snowman's head, in the pile box's pixels from the top left. */
  const headOf = useCallback(
    (key: string): Point | null => {
      const s = pile?.slots.find((x) => x.key === key);
      if (!pile || !s) return null;
      return { x: w / 2 + s.x, y: pile.height - (s.foot + s.h * (1 - s.squash) * 0.74) };
    },
    [pile, w],
  );
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
  const throwAt = useCallback(
    async (s: Slot) => {
      if (!onThrow || !pile || busy.current.has(s.key)) return;
      busy.current.add(s.key);
      try {
        const outcome = await onThrow(s.entry);
        if ("waitMinutes" in outcome) return note(s.key, TEXT.snowball.wait(outcome.waitMinutes));
        if ("failed" in outcome) return note(s.key, TEXT.snowball.failed);
        const to = headOf(s.key);
        const from = headOf(viewer) ?? { x: w / 2, y: pile.height + 30 };
        if (to) setFlights((f) => [...f, { id: ++flightId.current, from, to, target: s.key, size: slotW }]);
      } finally {
        busy.current.delete(s.key);
      }
    },
    [onThrow, pile, headOf, viewer, w, slotW, note],
  );
  /** The snowball landed: the friend wobbles from the hit. */
  const onSplat = useCallback((key: string) => {
    els.current.get(key)?.querySelector<HTMLElement>("[data-land]")?.animate(
      [
        { transform: "rotate(0deg) scale(1, 1)" },
        { transform: "rotate(-7deg) scale(1.08, 0.9)", offset: 0.25 },
        { transform: "rotate(5deg) scale(0.97, 1.04)", offset: 0.55 },
        { transform: "rotate(-2deg) scale(1, 1)", offset: 0.8 },
        { transform: "rotate(0deg) scale(1, 1)" },
      ],
      { duration: 520, easing: "ease-out" },
    );
  }, []);

  return (
    <div ref={box} role="group" aria-label={TEXT.pile} className="relative w-full" style={{ height: pile?.height ?? 0 }}>
      {/* Rachel's far hills (pines, little houses, the ground line) behind the pile: the snowmen stand on its ground. */}
      {pile && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bg-repeat-x"
          style={{
            bottom: -PILE.hills.height * PILE.hills.ground,
            height: PILE.hills.height,
            backgroundImage: `url(${HILLS})`,
            backgroundSize: `auto ${PILE.hills.height}px`,
            backgroundPosition: "center bottom",
            opacity: PILE.hills.opacity,
            // Fades out at both sides instead of ending in a hard edge.
            maskImage: "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
          }}
        />
      )}
      {pile?.slots.map((s) => {
        const isMe = viewer !== "" && s.key === viewer;
        const sq = s.squash;
        const standing = s.h * (1 - sq);
        const canHit = Boolean(onThrow) && viewer !== "" && !isMe;
        const hitCount = hits?.[s.key] ?? 0;
        return (
          <div
            key={s.key}
            ref={(el) => {
              if (el) els.current.set(s.key, el);
              else els.current.delete(s.key);
            }}
            className={`absolute ${canHit ? `cursor-pointer outline-none ${lb.target}` : ""}`}
            style={{ left: w / 2 + s.x - slotW / 2, bottom: s.foot, width: slotW, height: s.h, zIndex: 20 - s.row }}
            {...(canHit && {
              role: "button",
              tabIndex: 0,
              "aria-label": TEXT.snowball.throwAt(s.entry.name),
              onClick: () => throwAt(s),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  throwAt(s);
                }
              },
            })}
          >
            <div className={`absolute inset-0 ${lb.pileIn}`} style={{ "--lb-pile-delay": `${(rowsCount - 1 - s.row) * PILE.motion.rowStagger}s` } as CSSProperties}>
              {isMe && <Glow size={slotW * PILE.glow.size * 2} seed={s.rank} />}
              <span
                aria-hidden
                className="pointer-events-none absolute left-1/2 rounded-[50%]"
                style={{
                  bottom: -slotW * 0.03,
                  width: slotW * PILE.shadow.width,
                  height: slotW * PILE.shadow.height,
                  translate: "-50% 0",
                  background: "color-mix(in oklab, var(--ink) 22%, transparent)",
                  filter: `blur(${PILE.shadow.blur}px)`,
                }}
              />
              <div data-land className="absolute inset-0 origin-bottom">
                <div
                  data-squash
                  className={`absolute inset-0 origin-bottom ${lb.squash}`}
                  style={{ transform: `scale(${1 + sq * PILE.squash.widen}, ${1 - sq}) rotate(${s.lean}deg)` }}
                >
                  {s.team ? (
                    <div className="absolute inset-x-0 bottom-0 flex h-full justify-center">
                      <Cutout look="bucket" width={slotW * PILE.body * PILE.team.scale} style={{ marginRight: -slotW * PILE.team.overlap * 0.5 }} />
                      <Cutout look="redHat" width={slotW * PILE.body * PILE.team.scale} flip style={{ marginLeft: -slotW * PILE.team.overlap * 0.5 }} />
                    </div>
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 flex h-full justify-center">
                      <Cutout look={lookFor(s.entry.name)} width={slotW * PILE.body} flip={s.flip} />
                    </div>
                  )}
                </div>
                {sq > 0 && (
                  // eslint-disable-next-line @next/next/no-img-element -- Rachel's small doodle
                  <img
                    src={OOF}
                    alt=""
                    aria-hidden
                    draggable={false}
                    width={PILE.oof}
                    height={(PILE.oof * 145) / 264}
                    className={`absolute ${lb.oof}`}
                    style={{
                      bottom: standing * 0.84,
                      ...((s.x === 0 ? s.rank % 2 : s.x < 0)
                        ? { left: -PILE.oof * 0.2, rotate: "-62deg" }
                        : { right: -PILE.oof * 0.2, rotate: "62deg" }),
                    }}
                  />
                )}
                {s.rank === 1 && (
                  <span className="absolute left-1/2" style={{ bottom: standing + slotW * PILE.crown.lift * -0.6, translate: "-50% 0" }} aria-hidden>
                    <span className={`block ${lb.crown}`}>
                      <CrownDoodle size={slotW * PILE.crown.size} />
                    </span>
                  </span>
                )}
              </div>
              <BellyName entry={s.entry} me={isMe} bottom={standing * PILE.name.lift} width={slotW * PILE.name.width} title={titles?.[s.key]} />
              {hitCount > 0 && <StuckSnow hits={hitCount} size={slotW * PILE.stuck.size} bottom={standing * PILE.stuck.lift} left={s.x < -1} />}
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff, shown when someone lands */}
              <img
                data-puff
                src={PUFF}
                alt=""
                aria-hidden
                draggable={false}
                width={slotW}
                height={(slotW * 235) / 306}
                className="pointer-events-none absolute left-1/2 opacity-0"
                style={{ bottom: -slotW * 0.3, transform: "translate(-50%, 0)" }}
              />
            </div>
          </div>
        );
      })}
      {pile?.slots.map((s) =>
        notes[s.key] ? (
          <span
            key={`note-${s.key}`}
            role="status"
            className={`absolute z-[60] font-heading text-[12px] font-bold whitespace-nowrap text-ink-deep ${lb.note}`}
            // Above the head, kept inside the board: a snowman at an edge gets its note on the inner side.
            style={{
              textShadow: HALO,
              bottom: s.foot + s.h * (1 - s.squash) + 2,
              ...(s.x > 1
                ? { right: Math.max(0, w / 2 - s.x - slotW / 2) }
                : s.x < -1
                  ? { left: Math.max(0, w / 2 + s.x - slotW / 2) }
                  : { left: w / 2 + s.x, translate: "-50% 0" }),
            }}
          >
            {notes[s.key]}
          </span>
        ) : null,
      )}
      {flights.map((f) => (
        <Flight
          key={f.id}
          plan={f}
          onHit={() => onSplat(f.target)}
          onDone={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
        />
      ))}
    </div>
  );
}

/** One snowball in the air: arcs from `from` to `to`, spinning, then splats (Rachel's snow puff) and is gone. */
function Flight({ plan, onHit, onDone }: { plan: FlightPlan; onHit: () => void; onDone: () => void }) {
  const ball = useRef<HTMLSpanElement>(null);
  const splat = useRef<HTMLImageElement>(null);
  const [hit, setHit] = useState(false);
  const done = useRef({ onHit, onDone });
  useLayoutEffect(() => {
    done.current = { onHit, onDone };
  });
  useLayoutEffect(() => {
    const el = ball.current;
    if (!el) return;
    const dx = plan.to.x - plan.from.x;
    const dy = plan.to.y - plan.from.y;
    const arc = Math.max(SNOWBALL.arcMin, Math.hypot(dx, dy) * SNOWBALL.arc);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frames = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      return { transform: `translate(${dx * t}px, ${dy * t - arc * 4 * t * (1 - t)}px) rotate(${t * 600}deg) scale(${1 - 0.25 * t})` };
    });
    const flight = el.animate(frames, { duration: reduce ? 1 : SNOWBALL.flight * 1000, easing: "linear" });
    flight.onfinish = () => {
      setHit(true);
      done.current.onHit();
    };
    return () => flight.cancel();
  }, [plan]);
  useLayoutEffect(() => {
    if (!hit || !splat.current) return;
    const pop = splat.current.animate(
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.3) rotate(-12deg)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1.1) rotate(4deg)", offset: 0.25 },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)", offset: 0.6 },
        { opacity: 0, transform: "translate(-50%, -40%) scale(1.15) rotate(2deg)" },
      ],
      { duration: 900, easing: "ease-out" },
    );
    pop.onfinish = () => done.current.onDone();
    return () => pop.cancel();
  }, [hit]);
  const size = plan.size * SNOWBALL.splat;
  return (
    <>
      {!hit && (
        <span ref={ball} aria-hidden className="pointer-events-none absolute z-50" style={{ left: plan.from.x - SNOWBALL.ball / 2, top: plan.from.y - SNOWBALL.ball / 2 }}>
          <SnowballDots count={1} size={SNOWBALL.ball} />
        </span>
      )}
      {hit && (
        // eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff as the splat
        <img
          ref={splat}
          src={PUFF}
          alt=""
          aria-hidden
          draggable={false}
          width={size}
          height={(size * 235) / 306}
          className="pointer-events-none absolute z-50"
          style={{ left: plan.to.x, top: plan.to.y, transform: "translate(-50%, -50%)" }}
        />
      )}
    </>
  );
}

/** One of Rachel's thrower cut-outs, standing on the bottom of its box. */
function Cutout({ look, width, flip, style }: { look: SnowmanLook; width: number; flip?: boolean; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out art, sized by the pile
    <img
      src={ART[look]}
      alt=""
      aria-hidden
      draggable={false}
      width={width}
      height={width * PILE.aspect}
      className="self-end object-contain object-bottom select-none"
      style={{ width, height: width * PILE.aspect, transform: flip ? "scaleX(-1)" : undefined, filter: CUTOUT_SHADOW, ...style }}
    />
  );
}

/** A soft shadow on the cut-out itself, so it stands off the snow a little (light depth, no 3D). */
const CUTOUT_SHADOW = `drop-shadow(1px ${PILE.shadow.drop}px ${PILE.shadow.drop * 0.8}px color-mix(in oklab, var(--ink) 20%, transparent))`;

/** The nickname and score, written by hand on the snowman's belly (no tag, no box). Yours is a touch bolder. */
function BellyName({ entry, me, bottom, width, title }: { entry: BoardEntry; me: boolean; bottom: number; width: number; title?: TitleId }) {
  return (
    <span
      className="pointer-events-none absolute left-1/2 z-[2] flex flex-col items-center leading-none text-ink-deep"
      style={{ bottom, width, translate: "-50% 0", textShadow: HALO }}
    >
      {title && (
        <span className="block max-w-full truncate font-heading text-[9px] leading-[1.15] font-bold whitespace-nowrap text-berry-deep" title={TEXT.titles[title].en}>
          {TEXT.titles[title].zh}
        </span>
      )}
      <span className={`block max-w-full truncate font-heading text-[11px] leading-[1.1] ${me ? "font-bold" : ""}`}>{entry.name}</span>
      <span className="block font-heading text-[17px] leading-[1.05] font-bold tabular-nums">{entry.best}</span>
    </span>
  );
}

/** A soft paper-white halo around handwriting laid over art, so it stays readable without a box. */
const HALO = "0 0 2px var(--paper), 0 0 3px var(--paper), 0 0 5px var(--paper)";

/** Today's snowball hits: a clump of snow stuck to the head (Rachel's snow puff) and a small "×3" beside it. */
function StuckSnow({ hits, size, bottom, left }: { hits: number; size: number; bottom: number; left: boolean }) {
  return (
    <span
      className="absolute z-[3] flex items-center"
      style={{ bottom, ...(left ? { left: -size * 0.2, flexDirection: "row-reverse" } : { right: -size * 0.2 }) }}
      title={`${TEXT.snowball.hits(hits)} · ${TEXT.snowball.hitsEn(hits)}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff, as snow stuck on the head */}
      <img src={PUFF} alt="" aria-hidden draggable={false} width={size} height={(size * 235) / 306} style={{ rotate: left ? "14deg" : "-14deg" }} />
      <span className="font-heading text-[12px] leading-none font-bold text-ink-deep" style={{ textShadow: HALO }} aria-hidden>
        ×{hits}
      </span>
      <span className="sr-only">{TEXT.snowball.hits(hits)}</span>
    </span>
  );
}

/** A soft butter glow behind the viewer's snowman. */
function Glow({ size, seed }: { size: number; seed: number }) {
  const d = useMemo(() => pencilCircle(50, 50, 46, seed * 5 + 1, { wobble: 1.6, step: 9 }), [seed]);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`pointer-events-none absolute left-1/2 overflow-visible ${lb.glow}`}
      style={{ bottom: "8%", translate: "-50% 0", opacity: PILE.glow.opacity }}
    >
      <path d={d} fill="var(--butter)" />
    </svg>
  );
}
