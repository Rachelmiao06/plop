import type { Metadata } from "next";

import { layout, layoutProblems, previewCamera } from "@/features/scenery/content";
import { CameraPreview } from "@/features/scenery/CameraPreview";
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
          Rachel&apos;s doodle stickers, cut out to stand upright in the snow and turn to face the camera. One
          unit = one main character&apos;s height. The first crayon set is kept at the bottom as spares.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold">The village from the default camera</h2>
        <p className="text-sm">
          {layout.length} standees, painted back to front at their relative sizes, as a landscape screen first sees
          them. The faded snowmen marked A and B stand in for the two 3D main characters.{" "}
          {problems.length === 0 ? (
            <span className="font-bold">Lane clear, nothing tall in front of the characters.</span>
          ) : (
            <span className="font-bold text-destructive">{problems.join(" · ")}</span>
          )}
        </p>
        <CameraPreview />
        <p className="text-xs">
          The same village pulled back to {previewCamera.pulledBack}× the distance (scroll-zoom out in the game):
        </p>
        <CameraPreview level={previewCamera.pulledBack} />
        <p className="text-sm">
          <b>Home</b> at the back: the big tree, the cottage and the igloo overlap a little, with the boy just in
          front and the flag alone behind. <b>Music corner</b> on the left: the log with the radio and the walking
          pine listening. <b>Watching bench</b> on the right: the bench snowmen with the girl, the sign and the bag
          penguin. Quiet snowy pines frame the back and sides, and a bush and a mound soften the clusters&apos; edges.
          The skier and the sliding penguin have open snow ahead for a little loop later.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-bold">Seen from above</h2>
        <LayoutPreview />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold">All cut-outs</h2>
        <PropSheet />
      </section>
    </main>
  );
}
