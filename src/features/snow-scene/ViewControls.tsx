"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { content } from "./content";
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
        <Button size="sm" variant="outline" onClick={() => snowView.reset()}>
          <RotateCcw data-icon="inline-start" />
          {content.resetView}
        </Button>
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
