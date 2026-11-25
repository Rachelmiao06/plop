import type { Metadata } from "next";

import { BowlingHint, BowlingStage, TEXT } from "@/features/bowling";
import { SnowScene } from "@/features/snow-scene";

export const metadata: Metadata = {
  title: TEXT.title,
  robots: { index: false },
};

export default function BowlingTestPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SnowScene>
        <BowlingStage />
      </SnowScene>
      <BowlingHint />
    </main>
  );
}
