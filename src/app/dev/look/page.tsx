import type { Metadata } from "next";

import { Game } from "@/features/game";
import { LookPanel, PaperFinish, TEXT } from "@/features/look";

export const metadata: Metadata = {
  title: TEXT.title,
  robots: { index: false },
};

/**
 * The real game with the finishing layers on top and before / after switches (issue #42).
 * Here the finish sits over the whole game (under the z-10 score panel only, so the hint and "N down!"
 * get it too). On the home page it goes inside `Game.tsx`, right after `</SnowScene>`, under all UI.
 */
export default function LookTestPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Game />
      <PaperFinish />
      <LookPanel />
    </div>
  );
}
