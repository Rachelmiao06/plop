import type { Metadata } from "next";

import { BowlingHint, BowlingStage, FEEL } from "@/features/bowling";
import { throwingView, Village } from "@/features/scenery";
import { SnowCameraView, SnowScene } from "@/features/snow-scene";

export const metadata: Metadata = {
  title: "Plop! · village",
  robots: { index: false },
};

/** The whole scene: the throwing view, the village standing in the snow, and the throw. Add ?fps for the frame rate. */
export default function VillageTestPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SnowScene>
        <SnowCameraView {...throwingView(FEEL.lane)} />
        <Village lane={FEEL.lane} />
        <BowlingStage />
      </SnowScene>
      <BowlingHint />
    </main>
  );
}
