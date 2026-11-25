import type { Metadata } from "next";

import { Game } from "@/features/game";
import { LookPanel, TEXT } from "@/features/look";

export const metadata: Metadata = {
  title: TEXT.title,
  robots: { index: false },
};

/** The real game with before / after switches for the finishing layers (issue #42). */
export default function LookTestPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <Game />
      <LookPanel />
    </div>
  );
}
