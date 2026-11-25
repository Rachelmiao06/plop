"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import { getTimeOfDay, setTimeOfDay, subscribeTimeOfDay } from "./timeOfDay";

const MARKS = [
  { t: 0, label: "afternoon" },
  { t: 0.5, label: "sunset" },
  { t: 1, label: "evening" },
];

/**
 * The `/dev/sky` check panel: a slider for the time of day (t from 0 to 1), quick jumps to the three moments,
 * and the frame rate. `?t=0.5` in the address starts there.
 */
export function SkyPanel() {
  const t = useSyncExternalStore(subscribeTimeOfDay, getTimeOfDay, () => 0);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const start = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(start)) setTimeOfDay(start);
    let frames = 0;
    let since = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      frames++;
      if (now - since >= 500) {
        setFps(Math.round((frames * 1000) / (now - since)));
        frames = 0;
        since = now;
      }
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="absolute inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-lg border border-ink/40 bg-paper/90 p-3 text-ink shadow-sm">
      <div className="flex items-center justify-between text-sm">
        <span className="font-heading text-lg">time of day: {t.toFixed(2)}</span>
        <span className="font-mono text-xs">{fps} fps</span>
      </div>
      <input
        aria-label="Time of day"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={t}
        onChange={(e) => setTimeOfDay(Number(e.target.value))}
        className="my-2 w-full accent-ink"
      />
      <div className="flex justify-between gap-2">
        {MARKS.map((m) => (
          <Button key={m.label} variant="outline" size="sm" onClick={() => setTimeOfDay(m.t)}>
            {m.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
