import type { Metadata } from "next";

import { HudTester } from "./HudTester";

export const metadata: Metadata = {
  title: "Plop! · score test",
  robots: { index: false },
};

export default function HudTestPage() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <HudTester />
    </main>
  );
}
