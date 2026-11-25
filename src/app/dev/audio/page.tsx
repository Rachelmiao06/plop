import type { Metadata } from "next";

import { AudioTester } from "./AudioTester";

export const metadata: Metadata = {
  title: "Plop! · sound test",
  robots: { index: false },
};

export default function AudioTestPage() {
  return (
    <main className="flex flex-1 flex-col">
      <AudioTester />
    </main>
  );
}
