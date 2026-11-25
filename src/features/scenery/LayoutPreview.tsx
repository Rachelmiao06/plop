import Image from "next/image";

import { lane, mapArea as area, propPx, propSettings, propSrc, propWidth, sceneItems } from "./content";
import { groundFootprint } from "./view";

/** Extra room above the far end so the tall props there are not cut off on the map. */
const HEADROOM = 1.2;
const viewMinZ = area.minZ - HEADROOM;
const spanX = area.maxX - area.minX;
const spanZ = area.maxZ - viewMinZ;

/** Percent across the rectangle for x, and percent down for z (far end of the lane at the top). */
const left = (x: number) => ((x - area.minX) / spanX) * 100;
const top = (z: number) => ((z - viewMinZ) / spanZ) * 100;

/** Thumbnails are drawn a little smaller than true size so the ground between them stays readable. */
const THUMB = 0.7;

function Box({ minX, maxX, minZ, maxZ, className }: { minX: number; maxX: number; minZ: number; maxZ: number; className: string }) {
  return (
    <div
      className={`absolute rounded-lg border-2 border-dashed ${className}`}
      style={{
        left: `${left(minX)}%`,
        top: `${top(minZ)}%`,
        width: `${((maxX - minX) / spanX) * 100}%`,
        height: `${((maxZ - minZ) / spanZ) * 100}%`,
      }}
    />
  );
}

/**
 * A flat map of the lane seen from above, the throwing view at the bottom. Frame props, example pins and
 * the throwers stand on their base points; dashed boxes are the clear lane and the pin zone; the faint
 * outline is the patch of snow the throwing view sees.
 */
export function LayoutPreview() {
  const sorted = [...sceneItems].sort((a, b) => a.z - b.z); // far first, so nearer props overlap them
  const footprint = groundFootprint()
    .map(([x, z]) => `${left(x)},${top(z)}`)
    .join(" ");
  const { pinZone, throwLine, clear } = lane;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative w-full overflow-hidden rounded-xl border-2 border-snow-shadow bg-muted/60"
        style={{ aspectRatio: `${spanX} / ${spanZ}` }}
      >
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <polygon
            points={footprint}
            className="fill-paper/40 stroke-ink/40"
            strokeWidth={0.4}
            strokeDasharray="1.5 1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <Box {...clear} className="border-sky-blue bg-paper/50" />
        <Box
          minX={pinZone.x - pinZone.halfWidth}
          maxX={pinZone.x + pinZone.halfWidth}
          minZ={pinZone.z - pinZone.halfDepth}
          maxZ={pinZone.z + pinZone.halfDepth}
          className="border-berry/60"
        />
        {/* Throwing line */}
        <div
          className="absolute h-0.5 -translate-y-1/2 bg-ink/60"
          style={{
            left: `${left(-throwLine.halfWidth)}%`,
            top: `${top(throwLine.z)}%`,
            width: `${((2 * throwLine.halfWidth) / spanX) * 100}%`,
          }}
        />

        {sorted.map((item) => {
          const p = propSettings(item.id)!;
          const w = (propWidth(item.id) * (item.scale ?? 1) * THUMB) / spanX;
          const px = propPx(item.id) ?? { w: 1, h: 1 };
          return (
            <div
              key={item.key}
              className="absolute"
              style={{
                left: `${left(item.x)}%`,
                top: `${top(item.z)}%`,
                width: `${w * 100}%`,
                aspectRatio: `${px.w} / ${px.h}`,
                transform: "translate(-50%, -100%)",
              }}
              title={`${p.label} (${item.x}, ${item.z}) · ${item.role}`}
            >
              <Image
                src={propSrc(item.id)}
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
      </div>
      <p className="text-center text-xs">
        ↓ the throwing view looks from here, behind and above the thrower; dashed outline = what it sees; blue box = clear
        lane; red box = where pins stand ↓
      </p>
    </div>
  );
}
