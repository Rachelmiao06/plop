"use client";

/**
 * The finishing layer over the 3D picture: paper grain and a soft paper edge. Plain CSS, drawn once and
 * composited by the browser, so it costs no frame time and never changes how the 3D scene renders.
 * Put it right after the canvas and before any UI, so the score panel and buttons stay crisp on top.
 * Nothing moves, so there is nothing to slow down for "reduce motion".
 */
import { useSyncExternalStore, type CSSProperties } from "react";

import { LOOK } from "./content";
import { lookStore } from "./store";

/** A tile of fractal noise; only its alpha is used, as a mask, so the colour comes from the token. */
function noiseMask() {
  const { frequency, tile } = LOOK.grain;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${tile}' height='${tile}'>` +
    `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.6 -0.55'/></filter>` +
    `<rect width='100%' height='100%' filter='url(%23n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${svg}")`;
}

const pct = (share: number) => `${Math.round(share * 100)}%`;

export function PaperFinish() {
  const on = useSyncExternalStore(lookStore.subscribe, lookStore.get, lookStore.get);
  const e = LOOK.edge;
  const g = LOOK.grain;

  const edge: CSSProperties = {
    background: [
      `radial-gradient(ellipse 75% 80% at 50% 42%, transparent ${pct(e.cornerFrom)}, color-mix(in oklab, var(--paper) ${pct(e.corner)}, transparent) 100%)`,
      `linear-gradient(to top, color-mix(in oklab, var(--paper) ${pct(e.bottom)}, transparent), transparent ${pct(e.bottomHeight)})`,
    ].join(", "),
  };

  const mask = noiseMask();
  const grain: CSSProperties = {
    background: "var(--ink)",
    opacity: g.strength,
    maskImage: mask,
    WebkitMaskImage: mask,
    maskSize: `${g.tile}px ${g.tile}px`,
    WebkitMaskSize: `${g.tile}px ${g.tile}px`,
  };

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0" data-look-finish>
      {on.edge && <div className="absolute inset-0" style={edge} data-look="edge" />}
      {on.grain && <div className="absolute inset-0" style={grain} data-look="grain" />}
    </div>
  );
}
