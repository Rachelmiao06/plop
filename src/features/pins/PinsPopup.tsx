"use client";

/**
 * The hand-drawn "N down!" that pops up over the scene after each throw, with Rachel's effect doodles
 * (star, surprise lines). A full clear gets a bigger burst with music notes and a ring of snow dots.
 * Put it inside the same `relative` box as `<SnowScene>`.
 */
import { useEffect, useState } from "react";

import { PINS, TEXT } from "./content";
import type { Pins, PinsResult } from "./controller";

/** Doodles around the words: file, size (rem), where (percent of the pop-up box), turn (degrees), delay (s). */
type Doodle = { src: string; size: number; x: number; y: number; turn: number; delay: number };

const DOODLES: Doodle[] = [
  { src: "/assets/effects/surprise-lines.webp", size: 3.2, x: -6, y: -30, turn: -18, delay: 0.05 },
  { src: "/assets/effects/star.webp", size: 2.4, x: 92, y: -22, turn: 14, delay: 0.12 },
];
const FULL_CLEAR_DOODLES: Doodle[] = [
  { src: "/assets/effects/snow-ring.webp", size: 11, x: 50, y: 50, turn: 0, delay: 0 },
  { src: "/assets/effects/surprise-lines.webp", size: 4, x: -10, y: -34, turn: -20, delay: 0.05 },
  { src: "/assets/effects/star.webp", size: 3, x: 98, y: -30, turn: 16, delay: 0.1 },
  { src: "/assets/effects/star.webp", size: 2, x: 8, y: 108, turn: -10, delay: 0.22 },
  { src: "/assets/effects/music-notes.webp", size: 3.6, x: 104, y: 70, turn: 8, delay: 0.16 },
  { src: "/assets/effects/music-notes.webp", size: 2.8, x: -14, y: 64, turn: -12, delay: 0.28 },
];

const STYLE = `
@keyframes pins-pop {
  0% { transform: scale(0.3) rotate(-8deg); opacity: 0; }
  45% { transform: scale(1.14) rotate(2deg); opacity: 1; }
  65% { transform: scale(0.95) rotate(-2.5deg); }
  82% { transform: scale(1.03) rotate(-1deg); }
  100% { transform: scale(1) rotate(-2deg); opacity: 1; }
}
@keyframes pins-doodle {
  0% { transform: translate(-50%, -50%) scale(0) rotate(var(--turn)); opacity: 0; }
  55% { transform: translate(-50%, -50%) scale(1.2) rotate(var(--turn)); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1) rotate(var(--turn)); opacity: 1; }
}
@keyframes pins-float {
  0%, 100% { margin-top: 0; }
  50% { margin-top: -0.35rem; }
}
@keyframes pins-out {
  to { transform: scale(0.85) rotate(-2deg); opacity: 0; }
}
`;

export function PinsPopup({ pins }: { pins: Pins }) {
  const [shown, setShown] = useState<{ id: number; result: PinsResult; leaving: boolean } | null>(null);

  useEffect(() => {
    let id = 0;
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const off = pins.subscribe((e) => {
      if (e.type !== "result") return;
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
      const mine = ++id;
      setShown({ id: mine, result: e.result, leaving: false });
      const stay = (e.result.fullClear ? PINS.popup.showForFullClear : PINS.popup.showFor) * 1000;
      leaveTimer = setTimeout(() => setShown((s) => (s && s.id === mine ? { ...s, leaving: true } : s)), stay);
      hideTimer = setTimeout(() => setShown((s) => (s && s.id === mine ? null : s)), stay + 300);
    });
    return () => {
      off();
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, [pins]);

  if (!shown) return <style>{STYLE}</style>;
  const { result, leaving } = shown;
  const big = result.fullClear;
  const words = big ? TEXT.fullClear : result.down === 0 ? TEXT.none : TEXT.down(result.down);
  const doodles = big ? FULL_CLEAR_DOODLES : result.down === 0 ? [] : DOODLES;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[18%] flex justify-center" aria-live="polite">
      <style>{STYLE}</style>
      <div
        key={shown.id}
        className="relative"
        style={{ animation: leaving ? "pins-out 0.3s ease-in forwards" : "pins-pop 0.55s cubic-bezier(.2,.9,.3,1.2) both" }}
      >
        {doodles.map((d, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- small decorative doodles, no layout shift to optimise
          <img
            key={i}
            src={d.src}
            alt=""
            className="absolute"
            style={
              {
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: `${d.size}rem`,
                height: "auto",
                "--turn": `${d.turn}deg`,
                transform: `translate(-50%, -50%) rotate(${d.turn}deg)`,
                animation: `pins-doodle 0.45s ${d.delay + 0.15}s cubic-bezier(.2,.9,.3,1.3) both`,
                zIndex: d.src.includes("snow-ring") ? 0 : 2,
              } as React.CSSProperties
            }
          />
        ))}
        <p
          className="font-heading relative z-[1] leading-none font-bold text-ink"
          style={{
            fontSize: big ? "clamp(3.5rem, 9vw, 6rem)" : "clamp(2.6rem, 6.5vw, 4.2rem)",
            // A paper-white sticker edge around the pencil letters, so they read over any snow.
            textShadow:
              "0.06em 0 0 var(--paper), -0.06em 0 0 var(--paper), 0 0.06em 0 var(--paper), 0 -0.06em 0 var(--paper), 0.045em 0.045em 0 var(--paper), -0.045em 0.045em 0 var(--paper), 0.045em -0.045em 0 var(--paper), -0.045em -0.045em 0 var(--paper), 0.07em 0.11em 0 var(--snow-shadow)",
            animation: "pins-float 1.6s 0.6s ease-in-out infinite",
          }}
        >
          {words}
        </p>
      </div>
    </div>
  );
}
