"use client";

/**
 * A calm paper screen over the game while the 3D scene and the art load: the "Plop!" title, Rachel's
 * bucket-hat snowman gently bobbing, and a pencil line that draws itself as things load. It fades out when
 * `useSceneReady` says the scene is ready, then leaves the page. Rendered on the server too, so it is the
 * very first thing a visitor sees.
 */
import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

import { LOADING } from "./content";
import { useSceneReady } from "./useSceneReady";

/** A slightly uneven hand line, drawn in a 320 x 24 box. Two passes make it read as pencil, not vector. */
const STROKE = "M6 13 C 48 9, 92 15, 140 12 S 228 9, 268 13 S 304 12, 314 11";
const STROKE_2 = "M7 14 C 50 11, 96 16, 142 13 S 226 11, 266 14 S 302 13, 313 12";

const css = `
@keyframes plop-loading-bob {
  0%, 100% { transform: translateY(0) rotate(calc(var(--tilt) * -1)); }
  50% { transform: translateY(calc(var(--rise) * -1)) rotate(var(--tilt)); }
}
.plop-loading-bob {
  animation: plop-loading-bob var(--bob) cubic-bezier(0.45, 0.05, 0.35, 1.25) infinite;
  transform-origin: 50% 92%;
}
@media (prefers-reduced-motion: reduce) {
  .plop-loading-bob { animation: none; }
}
`;

export function LoadingScreen() {
  const { progress, ready } = useSceneReady();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setGone(true), LOADING.timing.fade);
    return () => window.clearTimeout(id);
  }, [ready]);

  if (gone) return null;

  const bob = {
    "--rise": `${LOADING.bob.rise}px`,
    "--tilt": `${LOADING.bob.tilt}deg`,
    "--bob": `${LOADING.bob.seconds}s`,
  } as CSSProperties;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!ready}
      data-loading-screen={ready ? "done" : "loading"}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-paper px-4 text-ink"
      style={{
        opacity: ready ? 0 : 1,
        transition: `opacity ${LOADING.timing.fade}ms ease-out`,
        pointerEvents: ready ? "none" : "auto",
      }}
    >
      <style href="plop-loading" precedence="default">
        {css}
      </style>

      <h1 className="font-heading text-7xl font-bold leading-none tracking-wide sm:text-8xl">{LOADING.title}</h1>

      <div className="plop-loading-bob w-28 sm:w-32" style={bob}>
        <Image
          src={LOADING.art.src}
          width={LOADING.art.width}
          height={LOADING.art.height}
          alt={LOADING.art.alt}
          priority
          unoptimized
          className="h-auto w-full select-none"
          draggable={false}
        />
      </div>

      <svg viewBox="0 0 320 24" className="w-56 sm:w-64" aria-hidden>
        {/* faint track, like a guide line drawn first */}
        <path d={STROKE} fill="none" className="stroke-snow-shadow" strokeWidth={5} strokeLinecap="round" />
        <path
          d={STROKE}
          pathLength={1}
          fill="none"
          className="stroke-ink"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - progress}
          style={{ transition: "stroke-dashoffset 450ms ease-out" }}
        />
        <path
          d={STROKE_2}
          pathLength={1}
          fill="none"
          className="stroke-ink"
          strokeOpacity={0.45}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1 - progress}
          style={{ transition: "stroke-dashoffset 520ms ease-out" }}
        />
      </svg>

      <p className="font-heading text-2xl">{LOADING.note}</p>
      <span className="sr-only">{ready ? "Ready" : `Loading ${Math.round(progress * 100)}%`}</span>
    </div>
  );
}
