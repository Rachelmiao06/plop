"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { content } from "./content";
import { DoodleButton, ResetDoodle, SnowflakeDoodle } from "./DoodleButton";
import { freshSnowfall } from "./freshSnow";
import { snowPointers, snowView } from "./pointers";

// The few buttons that sit on top of the scene.
export function ViewControls() {
  // TEMPORARY: "press" mode for the press test hook, see TempDragPress.tsx.
  const [pressing, setPressing] = useState(false);
  const choose = (press: boolean) => {
    setPressing(press);
    // While pressing, a one-finger drag presses the snow instead of turning the view.
    snowPointers.lookOff = press;
  };

  // N for fresh snow (not while typing, and not with shortcut keys held).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "n" && e.key !== "N") return;
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      freshSnowfall();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <>
      <div className="absolute top-3 right-3 flex gap-2">
        {/* TEMPORARY: look / press switch for the press test hook. */}
        <div className="flex gap-1 rounded-lg bg-background/70 p-0.5">
          <Button
            size="sm"
            variant={pressing ? "ghost" : "secondary"}
            aria-pressed={!pressing}
            onClick={() => choose(false)}
          >
            {content.tempLook}
          </Button>
          <Button
            size="sm"
            variant={pressing ? "secondary" : "ghost"}
            aria-pressed={pressing}
            onClick={() => choose(true)}
          >
            {content.tempPress}
          </Button>
        </div>
        {/* Round hand-drawn buttons (#49), side by side in the top-right corner: on a phone the score
            panel leaves this band free for them. */}
        <div className="flex gap-2">
          <DoodleButton label={content.freshSnow.buttonLabel} shortcut="N" seed={67} onClick={() => freshSnowfall()}>
            <SnowflakeDoodle />
          </DoodleButton>
          <DoodleButton label={content.resetView} seed={79} onClick={() => snowView.reset()}>
            <ResetDoodle />
          </DoodleButton>
        </div>
      </div>
      <p
        data-temp-hint
        className="pointer-events-none absolute inset-x-0 bottom-4 px-4 text-center text-sm text-muted-foreground"
      >
        {/* TEMPORARY: the second hint belongs to the press test hook. */}
        {pressing ? content.tempPressHint : content.lookHint}
      </p>
    </>
  );
}
