import Image from "next/image";

import { characters, layout, layoutRules, propPx, props, propSrc, propWidth, type SceneryProp } from "./content";

const { area, lane } = layoutRules;
/** Extra room above the back row so the tall props there are not cut off in the preview. */
const HEADROOM = 1.8;
const viewMinZ = area.minZ - HEADROOM;
const spanX = area.maxX - area.minX;
const spanZ = area.maxZ - viewMinZ;

/** Percent across the rectangle for x, and percent down for z (back of the village at the top). */
const left = (x: number) => ((x - area.minX) / spanX) * 100;
const top = (z: number) => ((z - viewMinZ) / spanZ) * 100;

/** Thumbnails are drawn a little smaller than true size so the ground between them stays readable. */
const THUMB = 0.7;

/**
 * A flat map of the first village layout, seen from above with the default camera at the bottom.
 * Each prop is a small thumbnail standing on its base point; the dashed box is the throwing lane.
 */
export function LayoutPreview() {
  const sorted = [...layout].sort((a, b) => a.z - b.z); // back first, so nearer props overlap them

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-snow-shadow bg-muted/60"
        style={{ aspectRatio: `${spanX} / ${spanZ}` }}
      >
        {/* Throwing lane */}
        <div
          className="absolute rounded-lg border-2 border-dashed border-sky-blue bg-paper/50"
          style={{
            left: `${left(lane.minX)}%`,
            top: `${top(lane.minZ)}%`,
            width: `${((lane.maxX - lane.minX) / spanX) * 100}%`,
            height: `${((lane.maxZ - lane.minZ) / spanZ) * 100}%`,
          }}
        />

        {sorted.map((item, i) => {
          const p: SceneryProp = props[item.prop];
          const scale = item.scale ?? 1;
          const w = (propWidth(item.prop) * scale * THUMB) / spanX;
          const px = propPx(item.prop) ?? { w: 1, h: 1 };
          return (
            <div
              key={`${item.prop}-${i}`}
              className="absolute"
              style={{
                left: `${left(item.x)}%`,
                top: `${top(item.z)}%`,
                width: `${w * 100}%`,
                aspectRatio: `${px.w} / ${px.h}`,
                transform: "translate(-50%, -100%)",
              }}
              title={`${p.label} (${item.x}, ${item.z})`}
            >
              <Image
                src={propSrc(item.prop)}
                alt={p.label}
                width={px.w}
                height={px.h}
                unoptimized
                loading="eager"
                className={`h-full w-full ${item.flip ? "-scale-x-100" : ""}`}
              />
              <span className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-ink" />
            </div>
          );
        })}

        {characters.map((c) => (
          <div
            key={c.name}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${left(c.x)}%`, top: `${top(c.z)}%` }}
          >
            <span
              className={`size-5 rounded-full border-2 border-ink sm:size-7 ${c.name === "left" ? "bg-berry" : "bg-sky-blue"}`}
            />
            <span className="text-xs font-bold">{c.name}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs">↓ default camera looks from here, above and in front ↓</p>
    </div>
  );
}
