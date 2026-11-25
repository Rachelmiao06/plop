import type { Metadata } from "next";

import { PinsPlayground, TEXT } from "@/features/pins";

export const metadata: Metadata = {
  title: TEXT.title,
  robots: { index: false },
};

export default function PinsTestPage() {
  return <PinsPlayground />;
}
