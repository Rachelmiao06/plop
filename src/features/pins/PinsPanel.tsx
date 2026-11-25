"use client";

/**
 * Small controls over the scene: the "next set" button (the game keeps it), and on the test page the
 * formation picker, reset, the physics-lines switch and the live count.
 */
import { useSyncExternalStore, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";

import { ALL_SETS, TEXT } from "./content";
import type { Pins } from "./controller";

/** Buttons give focus back, so Space keeps pulling the snowball instead of pressing the button again. */
const blurAfter = (run: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
  run();
  e.currentTarget.blur();
};

function usePinsState(pins: Pins) {
  return useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
}

/** The small "next set" button. */
export function NextSetButton({ pins }: { pins: Pins }) {
  const state = usePinsState(pins);
  return (
    <Button variant="outline" size="sm" className="font-heading text-base" disabled={state.phase === "changing"} onClick={blurAfter(pins.next)}>
      {TEXT.nextSet} →
    </Button>
  );
}

/** Everything the /dev/pins test page needs. */
export function PinsPanel({ pins }: { pins: Pins }) {
  const state = usePinsState(pins);
  return (
    <div className="absolute right-3 bottom-12 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-2">
      <p className="rounded-lg bg-background/75 px-3 py-1 font-heading text-lg text-ink">{TEXT.count(state.down, state.total)}</p>
      <div className="flex flex-wrap justify-end gap-1 rounded-lg bg-background/70 p-1">
        <span className="self-center px-1 text-xs text-muted-foreground">{TEXT.formation}</span>
        {ALL_SETS.map((f) => (
          <Button
            key={f.id}
            size="xs"
            variant={state.formation === f.id ? "default" : "ghost"}
            disabled={state.phase === "changing"}
            onClick={blurAfter(() => pins.setFormation(f.id))}
          >
            {f.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={blurAfter(() => pins.setDebug(!state.debug))} aria-pressed={state.debug}>
          {state.debug ? "✓ " : ""}
          {TEXT.debug}
        </Button>
        <Button variant="outline" size="sm" className="font-heading text-base" onClick={blurAfter(pins.reset)}>
          {TEXT.reset}
        </Button>
        <NextSetButton pins={pins} />
      </div>
    </div>
  );
}
