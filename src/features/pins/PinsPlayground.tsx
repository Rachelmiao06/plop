"use client";

/**
 * The /dev/pins test: the snow, the bowling throw (as /dev/bowling has it) and the pins,
 * with the pop-up and the test controls. The page itself only renders this.
 */
import { useState } from "react";

import { BowlingHint, BowlingStage } from "@/features/bowling";
import { SnowScene } from "@/features/snow-scene";

import { createPins } from "./controller";
import { PinsPanel } from "./PinsPanel";
import { PinsPopup } from "./PinsPopup";
import { PinsStage } from "./PinsStage";

export function PinsPlayground() {
  const [pins] = useState(() => createPins());
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SnowScene>
        <BowlingStage />
        <PinsStage pins={pins} />
      </SnowScene>
      <BowlingHint />
      <PinsPopup pins={pins} />
      <PinsPanel pins={pins} />
    </main>
  );
}
