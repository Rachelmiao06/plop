"use client";

import { useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { content } from "./content";
import { StarDoodle, SurpriseLines } from "./Doodles";
import { useReducedMotion, useSize, useSpring } from "./hooks";
import { edgeJitter, hatchStrokes, pencilRoundRect, raggedFill } from "./pencil";
import { styles } from "./hudStyles";

type Props = {
  down: number;
  total: number;
  /** Token colour of the coloured pencil (the active player's colour). */
  color: string;
  /** Latest knock-down event; each new id sends that many "+1"s flying into the bar. */
  knock?: { id: number; count: number } | null;
};

/** A hand-drawn bar for the current set, with a coloured-pencil fill and a burst on a full clear. */
export function ProgressBar({ down, total, color, knock }: Props) {
  const clipId = useId();
  const box = useRef<HTMLDivElement>(null);
  const { w } = useSize(box);
  const h = content.bar.height;
  const reduced = useReducedMotion();

  const safeTotal = Math.max(1, total);
  const target = Math.min(1, Math.max(0, down / safeTotal));
  const fraction = useSpring(target, content.bar.stiffness, content.bar.damping, reduced);

  // A burst each time the set goes from not-full to full.
  const [prevDown, setPrevDown] = useState(down);
  const [burstId, setBurstId] = useState(0);
  if (down !== prevDown) {
    if (down >= total && prevDown < total && total > 0) setBurstId((n) => n + 1);
    setPrevDown(down);
  }

  const inner = Math.max(0, w - 4);
  const outline = useMemo(() => pencilRoundRect(w, h, h / 2, 11, { step: 10, overshoot: 6 }), [w, h]);
  const track = useMemo(
    () => pencilRoundRect(w, h, h / 2, 23, { wobble: 0.2, overshoot: 0 }),
    [w, h],
  );
  const hatch = useMemo(() => hatchStrokes(w, h, 5), [w, h]);
  const jitter = useMemo(() => edgeJitter(8, 3), []);
  const fillWidth = Math.max(0, Math.min(1.04, fraction)) * inner + 2;

  const flights =
    knock && knock.count > 0
      ? Array.from({ length: Math.min(knock.count, safeTotal) }, (_, i) => {
          const landing = Math.min(1, (down - knock.count + i + 1) / safeTotal);
          return {
            key: `${knock.id}-${i}`,
            left: 2 + landing * inner,
            delay: i * content.plusOne.stagger,
            dx: `${((i * 37 + knock.id * 53) % 60) - 30}px`,
          };
        })
      : [];

  return (
    <div ref={box} className="relative w-full" style={{ height: h }} aria-hidden>
      {w > 0 && (
        <div
          key={knock?.id ?? 0}
          className={`absolute inset-0 ${knock && knock.count > 0 ? styles.bump : ""}`}
          style={
            {
              "--hud-bump": `${content.bump.duration}ms`,
              "--hud-sq": content.bump.squash,
              animationDelay: `${Math.round(content.plusOne.duration * content.bump.at)}ms`,
            } as CSSProperties
          }
        >
          <svg width={w} height={h} className="absolute inset-0 overflow-visible">
            <defs>
              <clipPath id={clipId}>
                <path d={track} />
              </clipPath>
            </defs>
            {/* paper-white groove */}
            <path d={track} fill="var(--paper)" opacity={0.7} />
            {/* coloured-pencil fill: a light wash with hatching on top, ragged at the front */}
            <g clipPath={`url(#${clipId})`}>
              <clipPath id={`${clipId}-fill`}>
                <path d={raggedFill(fillWidth, h, jitter)} />
              </clipPath>
              <g clipPath={`url(#${clipId}-fill)`}>
                <rect x={0} y={0} width={w} height={h} fill={color} opacity={content.bar.wash} />
                {hatch.map((s, i) => (
                  <path key={i} d={s.d} stroke={color} strokeWidth={s.width} opacity={s.opacity} strokeLinecap="round" fill="none" />
                ))}
              </g>
            </g>
            <path
              d={outline}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={content.pencil.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {flights.map((f) => (
        <span
          key={f.key}
          className={`pointer-events-none absolute bottom-1/2 font-heading text-2xl leading-none font-bold text-ink-deep ${styles.plusOne}`}
          style={
            {
              left: f.left,
              translate: "-50% 0",
              animationDelay: `${f.delay}ms`,
              "--hud-fly": `${content.plusOne.duration}ms`,
              "--hud-rise": `${content.plusOne.rise}px`,
              "--hud-dx": f.dx,
            } as CSSProperties
          }
        >
          +1
        </span>
      ))}

      {burstId > 0 && (
        <div
          key={burstId}
          className="pointer-events-none absolute top-0 right-0 flex -translate-y-3/4 items-center"
          style={{ "--hud-burst": `${content.burst.duration}ms` } as CSSProperties}
        >
          <div className="absolute -top-2 -left-7">
            <SurpriseLines size={30} flip />
          </div>
          <div className={styles.burst}>
            <StarDoodle size={44} />
          </div>
          <div className="absolute -top-2 -right-7">
            <SurpriseLines size={30} />
          </div>
        </div>
      )}
    </div>
  );
}
