import Image from "next/image";

import { characters, layout, previewCamera, propPx, propSettings, propSrc, propWidth, type PropId } from "./content";
import { project } from "./view";

/** The bucket snowman stands in for both main characters (A is its model; B is not drawn yet). */
const CHARACTER_STAND_IN: PropId = "snowman-bucket-hat";

type Item = {
  key: string;
  id: PropId;
  x: number;
  z: number;
  scale: number;
  flip: boolean;
  character?: string;
};

/**
 * The first layout as the default camera would see it: every cut-out at its relative size,
 * painted back to front on a snow-coloured panel. Flat 2D, no Three.js.
 */
export function CameraPreview({ level = 1 }: { level?: number }) {
  const items: Item[] = [
    ...layout.map((p, i) => ({ key: `${p.prop}-${i}`, id: p.prop, x: p.x, z: p.z, scale: p.scale ?? 1, flip: Boolean(p.flip) })),
    ...characters.map((c) => ({
      key: `character-${c.name}`,
      id: CHARACTER_STAND_IN,
      x: c.x,
      z: c.z,
      scale: 1,
      flip: c.name === "B",
      character: c.name,
    })),
  ];
  const painted = items
    .map((item) => ({ item, base: project(item.x, -(propSettings(item.id)?.sink ?? 0), item.z, level) }))
    .sort((a, b) => b.base.depth - a.base.depth); // far first

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border-2 border-snow-shadow bg-muted"
      style={{ aspectRatio: `${previewCamera.aspect}` }}
    >
      {painted.map(({ item, base }) => {
        const settings = propSettings(item.id)!;
        const px = propPx(item.id) ?? { w: 1, h: 1 };
        const height = settings.height * item.scale;
        const width = propWidth(item.id) * item.scale;
        return (
          <div
            key={item.key}
            className={`absolute ${item.character ? "opacity-60" : ""}`}
            style={{
              left: `${base.left}%`,
              top: `${base.top}%`,
              width: `${width * base.unitWidth}%`,
              height: `${height * base.unitHeight}%`,
              transform: "translate(-50%, -100%)",
            }}
            title={item.character ? `Main character ${item.character} (stand-in)` : `${settings.label} (${item.x}, ${item.z})`}
          >
            <Image
              src={propSrc(item.id)}
              alt={item.character ? `Main character ${item.character}` : settings.label}
              width={px.w}
              height={px.h}
              unoptimized
              loading="eager"
              className={`h-full w-full ${item.flip ? "-scale-x-100" : ""}`}
            />
            {item.character && (
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-paper px-1.5 text-xs font-bold">
                {item.character}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
