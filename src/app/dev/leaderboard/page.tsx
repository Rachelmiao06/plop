import type { Metadata } from "next";

import { LeaderboardTester } from "./LeaderboardTester";
import { PileTester } from "./PileTester";

export const metadata: Metadata = {
  title: "Plop! · leaderboard test",
  robots: { index: false },
};

export default function LeaderboardTestPage() {
  return (
    <main className="min-h-dvh w-full bg-snow-shadow/40 px-4 py-6 text-ink">
      <PileTester />
      <hr className="mx-auto my-10 max-w-5xl border-snow-shadow" />
      <LeaderboardTester />
    </main>
  );
}
