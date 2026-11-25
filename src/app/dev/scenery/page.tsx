import type { Metadata } from "next";

import { layout, layoutProblems, propIds, props } from "@/features/scenery/content";
import { LayoutPreview } from "@/features/scenery/LayoutPreview";
import { PropSheet } from "@/features/scenery/PropSheet";

export const metadata: Metadata = {
  title: "Plop! · scenery",
  robots: { index: false },
};

export default function SceneryPage() {
  const problems = layoutProblems();
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-4xl font-bold">Scenery cut-outs</h1>
        <p className="text-sm">
          {propIds.length} props cut from Rachel&apos;s sticker sheets ({propIds.filter((id) => !("spare" in props[id])).length}{" "}
          used in the layout, the rest spare). Each stands upright in the snow and turns to face the camera. One
          unit = one main character&apos;s height. The art is provisional: a looser doodle set is coming, and new
          files with the same names replace these with no code change.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold">First village layout</h2>
        <p className="text-sm">
          {layout.length} props seen from above, back of the village at the top.{" "}
          {problems.length === 0 ? (
            <span className="font-bold">Lane clear, nothing tall in front of the characters.</span>
          ) : (
            <span className="font-bold text-destructive">{problems.join(" · ")}</span>
          )}
        </p>
        <LayoutPreview />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold">All props</h2>
        <PropSheet />
      </section>
    </main>
  );
}
