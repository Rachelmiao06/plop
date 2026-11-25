import Image from "next/image";

import { previewCamera, propPx, propSettings, propSrc, propWidth, sceneItems } from "./content";
import { project } from "./view";

/**
 * The lane as the throwing view would see it: frame props, the example pins and the throwers, every cut-out
 * at its relative size, painted back to front on a paper-coloured panel. Flat 2D, no Three.js.
 */
export function CameraPreview({ level = 1 }: { level?: number }) {
  const painted = sceneItems
    .map((item) => ({ item, base: project(item.x, -(propSettings(item.id)?.sink ?? 0), item.z, level) }))
    .sort((a, b) => b.base.depth - a.base.depth); // far first

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border-2 border-snow-shadow bg-paper"
      style={{ aspectRatio: `${previewCamera.aspect}` }}
    >
      {painted.map(({ item, base }) => {
        const settings = propSettings(item.id)!;
        const px = propPx(item.id) ?? { w: 1, h: 1 };
        const scale = item.scale ?? 1;
        const height = settings.height * scale;
        const width = propWidth(item.id) * scale;
        return (
          <div
            key={item.key}
            className="absolute"
            style={{
              left: `${base.left}%`,
              top: `${base.top}%`,
              width: `${width * base.unitWidth}%`,
              height: `${height * base.unitHeight}%`,
              transform: "translate(-50%, -100%)",
            }}
            title={`${settings.label} (${item.x}, ${item.z}) · ${item.role}`}
          >
            <Image
              src={propSrc(item.id)}
              alt={settings.label}
              width={px.w}
              height={px.h}
              unoptimized
              loading="eager"
              className={`h-full w-full ${item.flip ? "-scale-x-100" : ""}`}
            />
          </div>
        );
      })}
    </div>
  );
}
