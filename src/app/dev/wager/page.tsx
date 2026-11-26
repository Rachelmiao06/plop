import type { Metadata } from "next";

import { WagerTester } from "./WagerTester";

export const metadata: Metadata = {
  title: "Plop! · wager test",
  robots: { index: false },
};

export default function WagerTestPage() {
  return (
    <main className="min-h-dvh w-full bg-snow-shadow/40 px-4 py-6 text-ink">
      <WagerTester />
    </main>
  );
}
