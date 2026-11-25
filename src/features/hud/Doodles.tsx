"use client";

/**
 * Small hand-drawn pieces of the score display. Every line is warm-brown pencil
 * (var(--ink)); fills are token colours.
 *
 * The snowman faces are crops of Rachel's thrower cut-outs, and the star and surprise lines are her effect
 * doodles (public/assets/effects/). The crown is still a pencil stand-in until she draws one.
 */
import { useMemo, useRef } from "react";
import { content, type SnowmanLook } from "./content";
import { useEvening, useSize } from "./hooks";
import { hatchStrokes, pencilCircle, pencilCircleStrokes, pencilRoundRect, pencilRoundRectStrokes } from "./pencil";
import { styles } from "./hudStyles";

const ink = "var(--ink)";
const stroke = {
  stroke: ink,
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A wobbly pencil outline that fills its parent (the parent must be `relative`). The main line swells and thins
 * along the stroke like a pencil pressed harder and lighter; a fainter second pass sits slightly off it.
 */
export function PencilFrame({ seed, radius, overshoot }: { seed: number; radius: number; overshoot?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const width = content.pencil.width;
  const [main, second] = useMemo(
    () =>
      [
        pencilRoundRectStrokes(w, h, radius, seed, width, { overshoot }),
        pencilRoundRect(w, h, radius, seed + 7, { overshoot: Math.min(4, overshoot ?? 4) }),
      ] as const,
    [w, h, radius, seed, overshoot, width],
  );
  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-0">
      {w > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible">
          <path d={second} fill="none" {...stroke} strokeWidth={width * 0.7} opacity={content.pencil.secondPass} />
          {main.map((s, i) => (
            <path key={i} d={s.d} fill="none" {...stroke} strokeWidth={s.width} opacity={s.opacity} />
          ))}
        </svg>
      )}
    </div>
  );
}

/** A tile of fractal noise used as a mask; the colour comes from the --ink token. */
const grainMask = (() => {
  const { grainFrequency, grainTile } = content.paper;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${grainTile}' height='${grainTile}'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${grainFrequency}' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.7 -0.6'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
})();

/**
 * The paper inside a panel or card (#31): a faint --ink grain and a light coloured-pencil wash, so it reads as
 * paper first and glass second. Cool --snow-shadow in the afternoon, warming to --butter by evening, like paper
 * under the lamps. Put it first inside a `relative` box that makes its own stacking context (the glass does).
 */
export function PaperFill({ seed }: { seed: number }) {
  const box = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(box);
  const evening = useEvening();
  const p = content.paper;
  // Short hatched bands, like shading with the side of a coloured pencil, not strokes running the full height.
  const wash = useMemo(() => {
    const bands = [];
    for (let y = -4, i = 0; y < h; y += p.washBand * 0.8, i++) {
      const strokes = hatchStrokes(w, p.washBand, seed * 31 + i, 1, p.washGap, p.washAngle);
      bands.push(...strokes.map((s) => ({ ...s, y })));
    }
    return bands;
  }, [w, h, seed, p.washGap, p.washAngle, p.washBand]);
  const strokes = (color: string, opacity: number) =>
    opacity > 0.01 && (
      <g opacity={opacity}>
        {wash.map((s, i) => (
          <path
            key={i}
            d={s.d}
            transform={`translate(0 ${s.y})`}
            stroke={color}
            strokeWidth={s.width * 1.3}
            opacity={s.opacity}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </g>
    );
  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {w > 0 && (
        <svg width={w} height={h} className="absolute inset-0">
          {strokes("var(--snow-shadow)", p.wash * (1 - evening))}
          {strokes("var(--butter)", p.wash * evening)}
        </svg>
      )}
      <div
        className="absolute inset-0"
        style={{
          background: "var(--ink)",
          opacity: p.grain,
          maskImage: grainMask,
          WebkitMaskImage: grainMask,
          maskSize: `${p.grainTile}px ${p.grainTile}px`,
          WebkitMaskSize: `${p.grainTile}px ${p.grainTile}px`,
        }}
      />
    </div>
  );
}

/**
 * The active player's halo: a --butter crayon ring scribbled a few times round, with a light crayon fill, instead
 * of a smooth radial glow. Fills its parent (60 × 60 drawing units).
 */
export function HaloDoodle({ seed = 1 }: { seed?: number }) {
  const { width, passes, fill } = content.halo;
  const rings = useMemo(
    () =>
      Array.from({ length: passes }, (_, i) =>
        pencilCircleStrokes(30 + (i % 2 ? 0.8 : -0.6), 30 + (i - 1) * 0.7, 25 - i * 1.6, seed * 7 + i * 3, width * (1 - i * 0.22), {
          wobble: 1.4,
          step: 6,
        }),
      ),
    [seed, passes, width],
  );
  const inside = useMemo(() => pencilCircle(30, 30, 23, seed * 11, { wobble: 1.2, step: 7 }), [seed]);
  return (
    <svg viewBox="0 0 60 60" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d={inside} fill="var(--butter)" opacity={fill} />
      {rings.map((ring, r) =>
        ring.map((s, i) => (
          <path
            key={`${r}-${i}`}
            d={s.d}
            fill="none"
            stroke="var(--butter)"
            strokeWidth={s.width}
            opacity={Math.min(1, s.opacity * (r === 0 ? 1 : 0.75))}
            strokeLinecap="round"
          />
        )),
      )}
    </svg>
  );
}

/**
 * Head and hat of Rachel's thrower cut-out (`public/assets/scenery/thrower-*.webp`), cropped square. Crop boxes
 * are in the source image's pixels: x, y, side, then the full image size.
 */
const FACE_ART: Record<SnowmanLook, { src: string; x: number; y: number; side: number; w: number; h: number }> = {
  bucket: { src: "/assets/scenery/thrower-bucket.webp", x: 22, y: 0, side: 270, w: 309, h: 421 },
  redHat: { src: "/assets/scenery/thrower-redhat.webp", x: 32, y: 8, side: 260, w: 323, h: 479 },
};

/** A snowman's head from Rachel's cut-out. `seed` is kept for callers and no longer used. */
export function SnowmanFace({ look, size = 36 }: { look: SnowmanLook; size?: number; seed?: number }) {
  const a = FACE_ART[look];
  const k = size / a.side;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 bg-no-repeat"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${a.src})`,
        backgroundSize: `${a.w * k}px ${a.h * k}px`,
        backgroundPosition: `${-a.x * k}px ${-a.y * k}px`,
      }}
    />
  );
}

/** Rachel's star doodle. */
export function StarDoodle({ size = 34 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- small decorative doodle
  return <img src="/assets/effects/star.webp" alt="" aria-hidden width={size} height={(size * 178) / 205} draggable={false} />;
}

/** Rachel's surprise lines: three crayon flicks fanning up (set above the thing that surprised). */
export function SurpriseLines({ size = 30 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small decorative doodle
    <img
      src="/assets/effects/surprise-lines.webp"
      alt=""
      aria-hidden
      width={size}
      height={(size * 145) / 264}
      draggable={false}
      className={styles.lines}
    />
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
