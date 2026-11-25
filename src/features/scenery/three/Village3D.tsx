"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";

import { flatPaper, FrameStats, fullTreatment, looks, views, type Treatment } from "./treatment";

// The canvas is loaded in the browser only; the server never renders 3D.
const VillageCanvas = dynamic(() => import("./VillageCanvas"), { ssr: false });

const switches: { key: "thick" | "shadow" | "pillow" | "sink" | "life"; label: string }[] = [
  { key: "thick", label: "Thickness" },
  { key: "shadow", label: "Shadow" },
  { key: "pillow", label: "Pillow shading" },
  { key: "sink", label: "Sunk + mound" },
  { key: "life", label: "Sway + wobble" },
];

const turns: { value: Treatment["turn"]; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "half", label: "Half-turn" },
  { value: "full", label: "Billboard" },
];

/** Full-screen test of the thick-standee look, with switches to compare it against flat paper. */
export function Village3D({ view, look }: { view?: string; look?: string }) {
  const [t, setT] = useState<Treatment>((look && looks[look]) || fullTreatment);
  const start = (view && views[view]) || views.default;
  const [stats] = useState(() => new FrameStats());
  const fpsText = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      if (fpsText.current) fpsText.current.textContent = `${Math.round(stats.fps)} fps`;
    }, 500);
    return () => clearInterval(id);
  }, [stats]);

  const set = (patch: Partial<Treatment>) => setT((prev) => ({ ...prev, ...patch }));

  return (
    <section className="relative h-dvh w-full touch-none overflow-hidden bg-background select-none">
      <h1 className="sr-only">Thick standee test</h1>
      <VillageCanvas treatment={t} stats={stats} start={start} />

      <div className="absolute right-3 bottom-3 flex max-w-[calc(100%-1.5rem)] flex-col gap-2 rounded-xl border border-border bg-card/90 p-3 text-sm shadow-sm">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-heading text-xl font-bold">Thick standees</span>
          <span ref={fpsText} className="font-mono text-xs" aria-live="off">
            … fps
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {switches.map((s) => (
            <Button
              key={s.key}
              size="sm"
              variant={t[s.key] ? "default" : "outline"}
              aria-pressed={t[s.key]}
              onClick={() => set({ [s.key]: !t[s.key] })}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold">Turning</span>
          {turns.map((o) => (
            <Button
              key={o.value}
              size="sm"
              variant={t.turn === o.value ? "default" : "outline"}
              aria-pressed={t.turn === o.value}
              onClick={() => set({ turn: o.value })}
            >
              {o.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="font-bold">Turn cap</span>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={t.cap}
            onChange={(e) => set({ cap: Number(e.target.value) })}
            disabled={t.turn !== "half"}
            className="w-32 accent-primary"
          />
          <span className="w-8 font-mono">{t.cap}°</span>
        </label>
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setT(fullTreatment)}>
            All on
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setT(flatPaper)}>
            Flat paper
          </Button>
        </div>
        <p className="text-xs">Drag to orbit, scroll to zoom. Click a prop to knock it.</p>
      </div>
    </section>
  );
}
