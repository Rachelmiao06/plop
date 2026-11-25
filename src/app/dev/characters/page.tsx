import type { Metadata } from "next";

import { CharacterLab } from "./CharacterLab";

export const metadata: Metadata = {
  title: "Plop! · characters test",
  robots: { index: false },
};

export default function CharactersTestPage() {
  return (
    <main className="flex flex-1 flex-col">
      <CharacterLab />
    </main>
  );
}
