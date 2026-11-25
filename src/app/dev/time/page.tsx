import type { Metadata } from "next";

import { BowlingStage, FEEL } from "@/features/bowling";
import { throwingView, Village } from "@/features/scenery";
import { SnowCameraView, SnowScene, TimeOfDaySlider } from "@/features/snow-scene";

export const metadata: Metadata = {
  title: "Plop! · time of day",
  robots: { index: false },
};

/**
 * The village through a match's day: afternoon → sunset → evening (setTimeOfDay). Drag the slider; `?t=0.5` starts
 * at sunset, `?play` sweeps the day slowly, `?fps` shows the frame rate.
 */
export default function TimeOfDayTestPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SnowScene>
        <SnowCameraView {...throwingView(FEEL.lane)} />
        <Village lane={FEEL.lane} />
        <BowlingStage />
      </SnowScene>
      <TimeOfDaySlider />
    </main>
  );
}
