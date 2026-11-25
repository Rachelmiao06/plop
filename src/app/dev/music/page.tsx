import type { Metadata } from "next";

import { MusicTester } from "./MusicTester";

export const metadata: Metadata = {
  title: "Plop! · music test",
  robots: { index: false },
};

export default function MusicTestPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MusicTester />
    </main>
  );
}
