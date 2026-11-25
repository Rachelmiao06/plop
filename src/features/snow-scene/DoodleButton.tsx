"use client";

import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { content } from "./content";

/*
  The scene's own round buttons ("Fresh snow", "Reset view"), drawn in the score display's hand-drawn style:
  frosted paper glass, a wobbly warm-brown pencil circle gone over twice, a doodled icon. The HUD does not export
  its drawing helpers, so this is a small local copy of the same idea (seeded wobble, soft curve), sized for one
  fixed round button. Colours are tokens only.
*/

const ink = "var(--ink)";
const stroke = { stroke: ink, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Small seeded random numbers, so a button's line is the same on every render. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A hand-drawn circle: points round the rim nudged by slow seeded waves, running a little past the start. */
function pencilCircle(c: number, r: number, seed: number): string {
  const { wobble, overshoot } = content.doodleButtons.pencil;
  const rand = seeded(seed);
  const waves = [2, 3, 5].map((k, i) => ({ k, phase: rand() * Math.PI * 2, amp: wobble * [0.6, 0.3, 0.15][i] }));
  const start = -Math.PI / 2 + (rand() - 0.5) * 0.8;
  const steps = 18;
  const reach = Math.PI * 2 + overshoot / r;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const a = start + (reach * i) / steps;
    const rr = r + waves.reduce((s, w) => s + Math.sin(a * w.k + w.phase) * w.amp, 0) + (i / steps) * 0.8;
    return { x: c + Math.cos(a) * rr, y: c + Math.sin(a) * rr };
  });
  // Catmull-Rom through the points, as cubic curves.
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

/** One round hand-drawn button, 40 px, like the HUD's corner toggles. */
export function DoodleButton({
  label,
  shortcut,
  seed,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  seed: number;
  onClick: () => void;
  children: ReactNode;
}) {
  const b = content.doodleButtons;
  const size = b.size;
  const [main, second] = useMemo(
    () => [pencilCircle(size / 2, size / 2 - 1.5, seed), pencilCircle(size / 2, size / 2 - 1.2, seed + 7)],
    [size, seed],
  );
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-keyshortcuts={shortcut}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      style={{ width: size, height: size, backdropFilter: `blur(${b.blur})`, WebkitBackdropFilter: `blur(${b.blur})` }}
      className="relative rounded-full bg-paper/60 p-0 text-ink shadow-[0_6px_18px_-10px_var(--snow-shadow)] transition-transform duration-150 hover:bg-paper/80 active:scale-90 active:-rotate-6 motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:active:rotate-0"
    >
      <svg width={size} height={size} aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
        <path d={second} fill="none" {...stroke} strokeWidth={b.pencil.width * 0.7} opacity={b.pencil.secondPass} />
        <path d={main} fill="none" {...stroke} strokeWidth={b.pencil.width} />
      </svg>
      {children}
    </Button>
  );
}

/** A doodled snowflake: three wobbly strokes crossing, with little forks at the tips. */
export function SnowflakeDoodle() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden className="overflow-visible">
      <path d="M12.1 3.4 C11.9 9.2 12.2 14.8 11.9 20.6" fill="none" {...stroke} />
      <path d="M4.6 7.9 C9.6 10.6 14.4 13.6 19.4 16.2" fill="none" {...stroke} />
      <path d="M4.5 16.1 C9.4 13.4 14.6 10.5 19.5 7.7" fill="none" {...stroke} />
      <path
        d="M9.9 4.6 L12.1 6.4 L14.2 4.5 M9.8 19.5 L12 17.6 L14.1 19.4 M4.9 10.6 L7.4 9.3 L6.8 6.6 M19.2 13.4 L16.7 14.7 L17.3 17.5 M4.8 13.3 L7.3 14.7 L6.6 17.4 M19.2 10.7 L16.8 9.2 L17.4 6.5"
        fill="none"
        {...stroke}
        strokeWidth={1.3}
      />
      <circle cx="12" cy="12" r="1.3" fill="var(--paper)" {...stroke} strokeWidth={1.2} />
    </svg>
  );
}

/** A doodled "go back" arrow: a loose loop with an arrowhead, like a quick pencil mark. */
export function ResetDoodle() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden className="overflow-visible">
      <path d="M6.3 8.1 C8.4 4.6 13.9 3.9 17 6.9 C20.2 10.1 19.4 16.1 15 18.4 C11.1 20.4 6.1 18.6 4.9 14.4" fill="none" {...stroke} />
      <path d="M5.2 4.3 L6.1 8.6 L10.4 8" fill="none" {...stroke} />
    </svg>
  );
}
