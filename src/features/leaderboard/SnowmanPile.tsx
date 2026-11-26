"use client";

/**
 * The "stand on top" board: every player is a little snowman (Rachel's thrower cut-outs, bucket or red hat) with
 * a paper name tag on its belly, and better scores stand higher, literally on the heads of the ones below, who get
 * squashed for it (and look startled: her surprise lines). #1 is alone on top in the crown. When someone overtakes
 * another, they hop over in an arc and plop down onto the one below, with a squish and a puff of snow; the one
 * going down slides to its new place first. Only changes animate. All numbers are in `PILE` (content.ts).
 */
import { useLayoutEffect, useMemo, useRef, type CSSProperties } from "react";
import { CrownDoodle } from "@/features/hud/Doodles";
import type { SnowmanLook } from "@/features/hud/content";
import { useSize } from "@/features/hud/hooks";
import { pencilCircle, pencilRoundRect } from "@/features/hud/pencil";
import type { BoardEntry } from "./api";
import { lb } from "./boardStyles";
import { PILE, TEXT } from "./content";
import { nameKey } from "./rules";

const ART: Record<SnowmanLook, string> = {
  bucket: "/assets/scenery/thrower-bucket.webp",
  redHat: "/assets/scenery/thrower-redhat.webp",
};
const PUFF = "/assets/effects/snow-puff.webp";
const OOF = "/assets/effects/surprise-lines.webp";

const stroke = { stroke: "var(--ink)", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

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
};

export function SnowmanPile({ scores, viewer }: SnowmanPileProps) {
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

  return (
    <div ref={box} role="img" aria-label={TEXT.pile} className="relative w-full" style={{ height: pile?.height ?? 0 }}>
      {pile?.slots.map((s) => {
        const isMe = viewer !== "" && s.key === viewer;
        const sq = s.squash;
        const standing = s.h * (1 - sq);
        return (
          <div
            key={s.key}
            ref={(el) => {
              if (el) els.current.set(s.key, el);
              else els.current.delete(s.key);
            }}
            className="absolute"
            style={{ left: w / 2 + s.x - slotW / 2, bottom: s.foot, width: slotW, height: s.h, zIndex: 20 - s.row }}
          >
            <div className={`absolute inset-0 ${lb.pileIn}`} style={{ "--lb-pile-delay": `${(rowsCount - 1 - s.row) * PILE.motion.rowStagger}s` } as CSSProperties}>
              {isMe && <Glow size={slotW * PILE.glow.size * 2} seed={s.rank} />}
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
              <NameTag entry={s.entry} width={slotW * PILE.tag.width} tilt={(s.rank % 2 ? -1 : 1) * PILE.tag.tilt} me={isMe} bottom={s.team ? 0 : standing * PILE.tag.lift} seed={s.rank * 7 + 3} />
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
    </div>
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
      style={{ width, height: width * PILE.aspect, transform: flip ? "scaleX(-1)" : undefined, ...style }}
    />
  );
}

/** A paper tag with a pencil edge: nickname on top, score big underneath. Yours is butter yellow. */
const TAG_H = PILE.tag.height;

function NameTag({ entry, width, tilt, me, bottom, seed }: { entry: BoardEntry; width: number; tilt: number; me: boolean; bottom: number; seed: number }) {
  const edge = useMemo(() => pencilRoundRect(width, TAG_H, 9, seed, { wobble: 0.9 }), [width, seed]);
  return (
    <div
      className="absolute left-1/2 grid place-items-center text-ink-deep"
      style={{ width, height: TAG_H, bottom, translate: "-50% 0", rotate: `${tilt}deg`, zIndex: 2 }}
    >
      <svg width={width} height={TAG_H} className="absolute inset-0 overflow-visible" aria-hidden>
        <path d={edge} fill={me ? "var(--butter)" : "var(--paper)"} {...stroke} />
      </svg>
      <span className="relative flex w-full flex-col items-center px-1 leading-none">
        <span className="block max-w-full truncate font-heading text-[11px] leading-[1.05]">{entry.name}</span>
        <span className="block font-heading text-[16px] leading-[1.05] font-bold tabular-nums">{entry.best}</span>
      </span>
    </div>
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
