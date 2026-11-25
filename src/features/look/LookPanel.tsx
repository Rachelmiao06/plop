"use client";

/**
 * `/dev/look` controls: before / after switches for each finishing layer and a live frame-rate count.
 * `?grain=0` / `?edge=0` in the address start with a layer off (used for the measured screenshots).
 */
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import { TEXT } from "./content";
import { lookStore } from "./store";

function useFps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      frames++;
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return fps;
}

export function LookPanel() {
  const on = useSyncExternalStore(lookStore.subscribe, lookStore.get, lookStore.get);
  const fps = useFps();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    lookStore.set({ grain: q.get("grain") !== "0", edge: q.get("edge") !== "0" });
  }, []);

  return (
    <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border bg-background/85 p-2 font-sans text-sm text-ink">
      <span className="px-1 font-heading text-base font-bold">{TEXT.panel}</span>
      <Button size="sm" variant={on.grain ? "secondary" : "ghost"} aria-pressed={on.grain} onClick={() => lookStore.set({ grain: !on.grain })}>
        {TEXT.grain}: {on.grain ? "on" : "off"}
      </Button>
      <Button size="sm" variant={on.edge ? "secondary" : "ghost"} aria-pressed={on.edge} onClick={() => lookStore.set({ edge: !on.edge })}>
        {TEXT.edge}: {on.edge ? "on" : "off"}
      </Button>
      <span className="px-1 tabular-nums" data-look-fps={fps}>
        {TEXT.fps(fps)}
      </span>
    </div>
  );
}
