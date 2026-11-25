import { Suspense } from "react";
import type { Metadata } from "next";

import { Village3D } from "@/features/scenery/three/Village3D";

export const metadata: Metadata = {
  title: "Plop! · thick standees",
  robots: { index: false },
};

/** Optional: ?view=default|side|high picks the starting camera, ?look=full|flat|billboard|fixed the starting look. */
async function WithOptions({ searchParams }: { searchParams: PageProps<"/dev/scenery-3d">["searchParams"] }) {
  const query = await searchParams;
  const pick = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : undefined);
  return <Village3D view={pick("view")} look={pick("look")} />;
}

export default function Scenery3DPage(props: PageProps<"/dev/scenery-3d">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<Village3D />}>
        <WithOptions searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
