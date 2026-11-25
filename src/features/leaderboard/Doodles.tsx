"use client";

/**
 * The board's own small pencil pieces. Outlines are warm-brown pencil (`--ink`), fills are token colours. The
 * wobbly-line maths, the paper and the faces come from the score display (`@/features/hud`), so both look alike.
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { CrownDoodle, PaperFill, PencilFrame } from "@/features/hud/Doodles";
import { pencilCircle } from "@/features/hud/pencil";
import { boardCss } from "./boardStyles";
import { BOARD } from "./content";

const stroke = { stroke: "var(--ink)", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A sheet of paper with a pencil edge: the board and the nickname prompt sit on one. */
export function PaperSheet({ seed, children, className = "", label }: { seed: number; children: ReactNode; className?: string; label?: string }) {
  return (
    <section
      aria-label={label}
      className={`relative isolate rounded-[calc(var(--radius)*1.4)] bg-paper/90 px-4 pt-3 pb-4 text-ink ${className}`}
      style={{ boxShadow: "0 6px 18px -10px color-mix(in oklab, var(--snow-shadow) 90%, var(--ink))" }}
    >
      <style href="plop-leaderboard" precedence="default">
        {boardCss}
      </style>
      <PaperFill seed={seed} />
      <PencilFrame seed={seed} radius={24} />
      {children}
    </section>
  );
}

/**
 * The rank: 1 to 3 written inside a little pencil circle coloured butter, snow and blush (the winner also wears
 * the score panel's crown); from 4 on just the number, in pencil.
 */
export function RankMark({ rank }: { rank: number }) {
  const fill = BOARD.look.podium[rank - 1];
  const ring = useMemo(() => pencilCircle(14, 15, 10.5, rank * 13 + 5, { wobble: 0.8, step: 5 }), [rank]);
  return (
    <span className="relative grid size-8 shrink-0 place-items-center" aria-label={`#${rank}`}>
      {fill && (
        <svg viewBox="0 0 28 30" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <path d={ring} fill={fill} {...stroke} />
        </svg>
      )}
      {rank === 1 && (
        <span className="absolute -top-3.5 left-1/2 -ml-[9px] rotate-[-8deg]" aria-hidden>
          <CrownDoodle size={18} />
        </span>
      )}
      <span className="relative font-heading text-xl leading-none font-bold text-ink-deep tabular-nums">{rank}</span>
    </span>
  );
}

/**
 * A crayon highlighter scribbled across the viewer's own row: three loose back-and-forth strokes in `--butter`,
 * stretched to the row (the stroke keeps its weight).
 */
export function CrayonHighlight() {
  const { meWash, meWashOpacity } = BOARD.look;
  return (
    <svg
      viewBox="0 0 100 20"
      preserveAspectRatio="none"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -inset-y-0.5 -z-10 size-full overflow-visible"
      style={{ opacity: meWashOpacity } as CSSProperties}
    >
      {[
        "M1.5 6.2 C20 4.6 45 5.4 70 4.8 C82 4.6 92 5.2 98.4 5.8",
        "M98 9.6 C76 10.6 50 9.2 26 10.4 C14 10.8 6 10.2 1.2 10.8",
        "M2 15.2 C22 14.2 48 15.6 72 14.6 C84 14.2 93 15 98.6 14.4",
      ].map((d, i) => (
        <path key={i} d={d} fill="none" stroke={meWash} strokeWidth={10 - i * 0.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
