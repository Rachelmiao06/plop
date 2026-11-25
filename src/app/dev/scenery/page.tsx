import type { Metadata } from "next";

import { examplePins, layout, layoutProblems, previewCamera } from "@/features/scenery/content";
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
          Rachel&apos;s doodle stickers as paper cut-outs for paper bowling on snow: village props frame the lane,
          little friends are the pins, and two paper snowmen take turns at the line. One unit = one thrower&apos;s
          height. The first crayon set is kept at the bottom as spares.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-3xl font-bold">The lane from the throwing view</h2>
        <p className="text-sm">
          {layout.length} frame props and an example triangle of {examplePins.length} pins, painted back to front at
          their relative sizes, as the throwing view (behind and above the thrower) would see them on a landscape
          screen. Player 2 waits beside the line.{" "}
          {problems.length === 0 ? (
            <span className="font-bold">Lane clear, nothing tall between the camera and the thrower.</span>
          ) : (
            <span className="font-bold text-destructive">{problems.join(" · ")}</span>
          )}
        </p>
        <CameraPreview />
        <p className="text-xs">
          The same lane pulled back to {previewCamera.pulledBack}× the distance:
        </p>
        <CameraPreview level={previewCamera.pulledBack} />
        <p className="text-sm">
          <b>Far end:</b> the big tree just right of centre behind the pins, with a pine on each side and a bush and a
          mound at its foot. <b>Left:</b> the cottage about level with the pins, a pine behind it, a short pine and a
          mound nearer the thrower. <b>Right:</b> the igloo a little nearer, pines before and after it, a mound at its
          foot. The middle stays clear from the line to past the pins. The pins shown are only an example; real
          formations come with the pins work.
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
