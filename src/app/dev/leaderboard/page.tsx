import type { Metadata } from "next";

import { LeaderboardTester } from "./LeaderboardTester";

export const metadata: Metadata = {
  title: "Plop! · leaderboard test",
  robots: { index: false },
};

export default function LeaderboardTestPage() {
  return (
    <main className="min-h-dvh w-full bg-snow-shadow/40 px-4 py-6 text-ink">
      <LeaderboardTester />
    </main>
  );
}
