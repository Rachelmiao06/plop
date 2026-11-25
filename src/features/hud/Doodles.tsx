"use client";

/**
 * Small hand-drawn pieces of the score display. Every line is warm-brown pencil
 * (var(--ink)); fills are token colours.
 *
 * STAND-INS: the snowman faces are simple drawings until Rachel's character art
 * has face crops, and the star and surprise lines are drawn here until the effect
 * doodles from PR #20 land in public/assets/effects/.
 */
import { useMemo, useRef } from "react";
import { content, type SnowmanLook } from "./content";
import { useSize } from "./hooks";
import { pencilCircle, pencilRoundRect } from "./pencil";
import { styles } from "./hudStyles";

const ink = "var(--ink)";
const stroke = {
  stroke: ink,
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** A wobbly pencil outline that fills its parent (the parent must be `relative`). */
export function PencilFrame({ seed, radius, overshoot }: { seed: number; radius: number; overshoot?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const [main, second] = useMemo(
    () => [
      pencilRoundRect(w, h, radius, seed, { overshoot }),
      pencilRoundRect(w, h, radius, seed + 7, { overshoot: Math.min(4, overshoot ?? 4) }),
    ],
    [w, h, radius, seed, overshoot],
  );
  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-0">
      {w > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible">
          <path d={second} fill="none" {...stroke} strokeWidth={content.pencil.width * 0.7} opacity={content.pencil.secondPass} />
          <path d={main} fill="none" {...stroke} strokeWidth={content.pencil.width} />
        </svg>
      )}
    </div>
  );
}

/** A tiny snowman face. Stand-in until the character art has face crops. */
export function SnowmanFace({ look, size = 36, seed = 1 }: { look: SnowmanLook; size?: number; seed?: number }) {
  const colors = content.looks[look];
  const head = useMemo(() => pencilCircle(20, 24, 12.5, seed, { wobble: 0.5 }), [seed]);
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="overflow-visible">
      <path d={head} fill="var(--paper)" {...stroke} />
      {/* blush */}
      <ellipse cx="11.6" cy="27.4" rx="2.1" ry="1.4" fill="var(--blush)" />
      <ellipse cx="28.4" cy="27.4" rx="2.1" ry="1.4" fill="var(--blush)" />
      {/* dot eyes, set far apart */}
      <circle cx="14.2" cy="24.2" r="1.35" fill={ink} />
      <circle cx="25.9" cy="24" r="1.35" fill={ink} />
      {/* little smile */}
      <path d="M17.6 28.1 C18.9 29.7 21.3 29.8 22.6 28" fill="none" {...stroke} strokeWidth={1.3} />
      {look === "bucket" ? (
        // A small tipped bucket.
        <g transform="rotate(-9 20 10)">
          <path
            d="M13.2 13.1 L14.9 3.6 C18.1 2.9 22.2 2.9 25.3 3.5 L27.1 12.9 C22.6 13.9 17.7 13.9 13.2 13.1 Z"
            fill={colors.hat}
            {...stroke}
          />
          <path d="M14.4 6.4 C18.2 7 22.1 7 25.8 6.3" fill="none" {...stroke} strokeWidth={1} opacity={0.6} />
          <path d="M25.6 4.6 C28.4 5.3 29.4 7.6 28.3 9.6" fill="none" {...stroke} strokeWidth={1.1} />
        </g>
      ) : (
        // A knitted red hat with a pompom.
        <g>
          <path
            d="M8.6 17.4 C9.3 10.4 14.1 6.6 20.2 6.5 C26.4 6.6 30.8 10.6 31.4 17.2 C24 15.6 16 15.7 8.6 17.4 Z"
            fill={colors.hat}
            {...stroke}
          />
          <path
            d="M7.9 17.6 C15.9 15.3 24.4 15.2 32.1 17.3 L31.7 20.2 C24 18.4 16 18.5 8.2 20.6 Z"
            fill={colors.hat}
            {...stroke}
          />
          <path d="M14.6 10.6 L15.6 15.8 M20.1 8.8 L20.2 15.4 M25.6 10.4 L24.8 15.6" {...stroke} strokeWidth={0.9} opacity={0.55} />
          <circle cx="20.3" cy="5.2" r="2.9" fill="var(--paper)" {...stroke} />
        </g>
      )}
    </svg>
  );
}

/** Stand-in star doodle (until PR #20's effect art lands). */
export function StarDoodle({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden className="overflow-visible">
      <path
        d="M20.4 4.2 C21.9 9 23.3 12.4 24.6 14.6 C28.6 14.9 32.4 15.2 35.6 15.9 C32.7 18.8 30.2 21.1 28.1 23 C29.1 27.4 29.8 31.4 30.1 35.1 C26.4 32.7 23.2 30.8 20.3 29.4 C16.9 31.3 13.6 33.3 10.2 35.4 C10.8 31.2 11.6 27.2 12.6 23.1 C9.8 20.7 7.2 18.4 4.6 15.8 C8.6 15.1 12.3 14.8 15.8 14.5 C17.4 11.2 18.8 7.8 20.4 4.2 Z"
        fill="var(--butter)"
        {...stroke}
      />
      <circle cx="16.6" cy="20.6" r="1.1" fill={ink} />
      <circle cx="23.8" cy="20.4" r="1.1" fill={ink} />
      <path d="M18.6 23.6 C19.6 24.6 21 24.6 21.9 23.5" fill="none" {...stroke} strokeWidth={1.1} />
    </svg>
  );
}

/** Stand-in surprise lines: three short pencil flicks fanning out. */
export function SurpriseLines({ size = 30, flip = false }: { size?: number; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 30 30"
      width={size}
      height={size}
      aria-hidden
      className="overflow-visible"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path
        className={styles.lines}
        d="M6.2 19.5 C9.4 18.6 12.1 18.1 15.2 18 M8.6 10.4 C11.4 12.1 13.6 13.6 16 15.6 M16.5 4.4 C17.3 7.6 17.7 10.2 18 13.2"
        fill="none"
        {...stroke}
        strokeWidth={1.8}
        strokeDasharray="12"
      />
    </svg>
  );
}

// --- toggle icons (24 × 24)

export function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden className="overflow-visible">
      {open ? (
        <>
          <path d="M2.8 12.6 C6.4 6.9 17 6.3 21.2 11.9 C17.6 17.7 7 18.1 2.8 12.6 Z" fill="var(--paper)" {...stroke} />
          <circle cx="12.1" cy="12.2" r="2.7" fill={ink} />
          <circle cx="13" cy="11.3" r="0.7" fill="var(--paper)" />
        </>
      ) : (
        <path
          d="M3.2 10.8 C7.4 15.6 16.6 15.9 20.8 10.5 M6.6 14.1 L5.4 16.4 M12 15.3 L11.9 17.9 M17.4 14 L18.7 16.2"
          fill="none"
          {...stroke}
        />
      )}
    </svg>
  );
}

const offSlash = (
  <path d="M4.2 4.6 C8.8 9.4 14.9 14.7 19.9 19.6" fill="none" {...stroke} strokeWidth={2} />
);

export function MusicIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden className="overflow-visible">
      <g opacity={on ? 1 : 0.55}>
        <ellipse cx="7.1" cy="17.9" rx="2.6" ry="2" transform="rotate(-18 7.1 17.9)" fill={ink} />
        <ellipse cx="16.6" cy="15.9" rx="2.6" ry="2" transform="rotate(-18 16.6 15.9)" fill={ink} />
        <path d="M9.4 17.2 L9.3 6.6 C12.6 5.6 15.8 4.8 18.9 4.4 L19 15.3" fill="none" {...stroke} />
        <path d="M9.3 9.2 C12.5 8.2 15.7 7.5 18.9 7" fill="none" {...stroke} strokeWidth={1.3} />
      </g>
      {!on && offSlash}
    </svg>
  );
}

export function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden className="overflow-visible">
      <g opacity={on ? 1 : 0.55}>
        <path
          d="M3.6 9.6 L7.4 9.4 L11.9 5.6 C12.2 9.9 12.2 14.2 12 18.6 L7.5 14.8 L3.7 14.7 C3.5 13 3.5 11.3 3.6 9.6 Z"
          fill="var(--paper)"
          {...stroke}
        />
        {on && (
          <path d="M15.1 9.3 C16.6 10.7 16.7 13.4 15.2 14.9 M17.8 6.9 C20.8 9.7 20.9 14.5 17.9 17.4" fill="none" {...stroke} />
        )}
      </g>
      {!on && offSlash}
    </svg>
  );
}

/**
 * A little pencil crown for the winner. STAND-IN, drawn here like the faces and the star, until Rachel draws one
 * (then it becomes a file in public/assets/effects/).
 */
export function CrownDoodle({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 34" width={size} height={(size * 34) / 44} aria-hidden className="overflow-visible">
      <path
        d="M6.2 27.6 C5.6 21.2 4.6 14.6 3.6 8.4 C8.4 12.4 11.6 15.2 14.4 17.8 C16.8 12.6 19.2 7.8 22.1 3.4 C24.9 8 27.3 12.6 29.6 17.6 C32.6 14.8 36 12 40.6 8.6 C39.6 14.8 38.6 21.2 37.9 27.4 C27.4 29.4 16.6 29.5 6.2 27.6 Z"
        fill="var(--butter)"
        {...stroke}
      />
      <path d="M7.4 23.6 C17.2 25.2 27.2 25.1 36.8 23.4" fill="none" {...stroke} strokeWidth={1.1} opacity={0.55} />
      <circle cx="3.6" cy="7.6" r="2.1" fill="var(--berry)" {...stroke} strokeWidth={1.2} />
      <circle cx="22.1" cy="2.6" r="2.3" fill="var(--sky-blue)" {...stroke} strokeWidth={1.2} />
      <circle cx="40.7" cy="7.8" r="2.1" fill="var(--berry)" {...stroke} strokeWidth={1.2} />
      <circle cx="22" cy="19.6" r="1.9" fill="var(--mint)" {...stroke} strokeWidth={1.1} />
    </svg>
  );
}

/** A few little snowballs in a row, for the "3 or 5 rounds" choice. */
export function SnowballDots({ count, size = 10 }: { count: number; size?: number }) {
  return (
    <span aria-hidden className="inline-flex items-center gap-0.5">
      {Array.from({ length: count }, (_, i) => (
        <svg key={i} viewBox="0 0 12 12" width={size} height={size} className="overflow-visible">
          <path d={pencilCircle(6, 6, 4.6, i * 3 + count, { wobble: 0.35 })} fill="var(--paper)" {...stroke} strokeWidth={1.2} />
          <path d="M3.6 7.6 C4.6 8.6 6.4 8.8 7.8 7.9" fill="none" stroke="var(--snow-shadow)" strokeWidth={1.4} strokeLinecap="round" />
        </svg>
      ))}
    </span>
  );
}
