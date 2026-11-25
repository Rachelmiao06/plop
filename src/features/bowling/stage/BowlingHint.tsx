import { TEXT } from "../content";

/** A small line of help over the scene, top left. */
export function BowlingHint() {
  return (
    <div className="pointer-events-none absolute top-3 left-3 max-w-[min(32rem,calc(100%-12rem))] rounded-lg bg-background/75 px-3 py-2 text-xs leading-snug sm:text-sm">
      <p>{TEXT.keys}</p>
      <p className="hidden sm:block">{TEXT.pointer}</p>
    </div>
  );
}
