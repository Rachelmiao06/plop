"use client";

import { useEffect } from "react";
import { content } from "./content";
import { setTimeOfDay } from "./timeOfDay";
import { useTimeOfDay } from "./useTimeOfDay";

/**
 * A test slider for the time of day (the /dev/time page): drag from afternoon to evening. `?t=0.5` in the address
 * starts there; `?play` sweeps afternoon → evening → afternoon slowly, as a match might.
 */
export function TimeOfDaySlider() {
  const t = useTimeOfDay();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const start = q.get("t");
    if (start !== null) setTimeOfDay(parseFloat(start));
    if (!q.has("play")) return;
    let frame = 0;
    const begin = performance.now();
    const loop = () => {
      // 40 seconds there and back.
      const u = ((performance.now() - begin) / 40000) % 1;
      setTimeOfDay(1 - Math.abs(1 - 2 * u));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const name = t < 0.25 ? "afternoon" : t < 0.75 ? "sunset" : "evening";
  return (
    <label className="absolute bottom-12 left-1/2 flex w-72 max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col gap-1 rounded-[var(--radius)] bg-paper/80 px-4 py-2 text-sm text-ink shadow-[0_6px_18px_-10px_var(--snow-shadow)]">
      <span className="flex justify-between font-heading text-base">
        <span>{content.timeOfDay.sliderLabel}</span>
        <span>
          {name} · {t.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
        className="w-full accent-ink"
        aria-label={content.timeOfDay.sliderLabel}
      />
    </label>
  );
}
