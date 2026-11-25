import type { Metadata } from "next";

import { SnowfallTester } from "./SnowfallTester";

export const metadata: Metadata = {
  title: "Plop! · fresh snowfall test",
  robots: { index: false },
};

export default function SnowfallTestPage() {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <SnowfallTester />
    </main>
  );
}
