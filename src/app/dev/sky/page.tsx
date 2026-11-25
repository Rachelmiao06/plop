import type { Metadata } from "next";

import { Game } from "@/features/game";
import { SkyPanel } from "@/features/scenery";

export const metadata: Metadata = {
  title: "Plop! · sky",
  robots: { index: false },
};

/** The real game with a slider for the time of day (afternoon, sunset, evening). `?t=0.5` starts at sunset. */
export default function SkyTestPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Game />
      <SkyPanel />
    </div>
  );
}
