import type { Metadata } from "next";

import { FlatSlingshot } from "@/features/slingshot";

export const metadata: Metadata = {
  title: "Plop! · slingshot test",
  robots: { index: false },
};

export default function SlingshotTestPage() {
  return (
    <main className="flex flex-1 flex-col">
      <FlatSlingshot />
    </main>
  );
}
