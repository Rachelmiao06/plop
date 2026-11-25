"use client";

/**
 * A calm paper screen over the page while the 3D scene and the art load: the "Plop!" title, one of Rachel's
 * cut-outs gently bobbing, and the snow strip: a real snowball rolling through real snow as things load
 * (`SnowStrip.tsx`). When `useSceneReady` says the scene is ready, the ball rolls to the end and bursts, and a
 * puff of snow clears the screen outward from that point. Then the screen leaves the page and `whenLoaded`
 * callbacks run. Rendered on the server too, so it is the very first thing a visitor sees.
 */
import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

import { LOADING } from "./content";
import { markLoaded } from "./loaded";
import { SnowStrip } from "./SnowStrip";
import { useSceneReady } from "./useSceneReady";

const css = `
@keyframes plop-loading-bob {
  0%, 100% { transform: translateY(0) rotate(calc(var(--tilt) * -1)); }
  50% { transform: translateY(calc(var(--rise) * -1)) rotate(var(--tilt)); }
}
.plop-loading-bob {
  animation: plop-loading-bob var(--bob) cubic-bezier(0.45, 0.05, 0.35, 1.25) infinite;
  transform-origin: 50% 92%;
}
@keyframes plop-loading-puff {
  0% { transform: translate(-50%, -50%) scale(0.3) rotate(-8deg); opacity: 1; }
  35% { opacity: 0.9; }
  100% { transform: translate(-50%, -50%) scale(2.6) rotate(6deg); opacity: 0; }
}
.plop-loading-puff { animation: plop-loading-puff var(--clear) cubic-bezier(0.2, 0.7, 0.3, 1) forwards; }
@media (prefers-reduced-motion: reduce) {
  .plop-loading-bob { animation: none; }
}
`;

const reduceQuery = "(prefers-reduced-motion: reduce)";
function useStill() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(reduceQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(reduceQuery).matches,
    () => false,
  );
}

type Art = { src: string; width: number; height: number; alt?: string };
type Props = {
  /** One of Rachel's cut-outs to bob above the strip. Default: the bucket-hat thrower. */
  art?: Art;
  /** The small line under the strip. Default: `LOADING.note`. */
  note?: string;
  /** A second, smaller line (the invite page's English beneath the Chinese). */
  small?: string;
};

export function LoadingScreen({ art = LOADING.art, note = LOADING.note, small }: Props) {
  const { progress, ready } = useSceneReady();
  const still = useStill();
  /** Where the ball burst (client px); set once the strip has finished. */
  const [burst, setBurst] = useState<{ x: number; y: number } | null | undefined>(undefined);
  const [clearing, setClearing] = useState(0);
  const [gone, setGone] = useState(false);
  const finished = burst !== undefined;

  const onFinished = useCallback((at: { x: number; y: number } | null) => setBurst((b) => (b === undefined ? at : b)), []);

  // The clearing: a hole grows from the burst point (or a plain fade), then the screen leaves the page.
  useEffect(() => {
    if (!finished) return;
    const plain = still || burst === null;
    const ms = plain ? LOADING.timing.fade : LOADING.burst.clear;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setClearing(t);
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        setGone(true);
        markLoaded();
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [finished, still, burst]);

  if (gone) return null;

  const bob = {
    "--rise": `${LOADING.bob.rise}px`,
    "--tilt": `${LOADING.bob.tilt}deg`,
    "--bob": `${LOADING.bob.seconds}s`,
  } as CSSProperties;

  // How the screen goes: a soft-edged hole opening from the burst (eased out), or a fade.
  let look: CSSProperties = {};
  if (finished) {
    if (burst && !still) {
      const e = 0.5 - 0.5 * Math.cos(Math.PI * clearing); // starts gently, so the hole reads
      const far = Math.hypot(window.innerWidth, window.innerHeight) + LOADING.burst.soft;
      const r = e * far;
      // A mask only reads alpha: `transparent` = cleared, `currentColor` (opaque ink) = still paper.
      const mask = `radial-gradient(circle at ${burst.x}px ${burst.y}px, transparent ${Math.max(0, r - LOADING.burst.soft)}px, currentColor ${r}px)`;
      look = { maskImage: mask, WebkitMaskImage: mask, opacity: 1 - Math.max(0, clearing - 0.7) / 0.3 };
    } else {
      look = { opacity: 1 - clearing };
    }
  }

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-busy={!ready}
        data-loading-screen={ready ? "done" : "loading"}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-paper px-4 text-ink"
        style={{ ...look, pointerEvents: finished ? "none" : "auto" }}
      >
        <style href="plop-loading" precedence="default">
          {css}
        </style>

        <h1 className="font-heading text-7xl font-bold leading-none tracking-wide sm:text-8xl">{LOADING.title}</h1>

        <div className="plop-loading-bob w-28 sm:w-32" style={bob}>
          <Image
            src={art.src}
            width={art.width}
            height={art.height}
            alt={art.alt ?? ""}
            priority
            unoptimized
            className="h-auto w-full select-none"
            draggable={false}
          />
        </div>

        <SnowStrip progress={progress} ready={ready} still={still} onFinished={onFinished} />

        <p className="-mt-1 text-center font-heading text-2xl leading-tight">
          {note}
          {small && <span className="block font-sans text-xs">{small}</span>}
        </p>
        <span className="sr-only">{ready ? "Ready" : `Loading ${Math.round(progress * 100)}%`}</span>
      </div>

      {/* Rachel's snow-puff doodle, blooming from where the ball burst (loaded from the start, so it is ready). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOADING.burst.puff.src}
        width={LOADING.burst.puff.width}
        height={LOADING.burst.puff.height}
        alt=""
        aria-hidden
        className={`pointer-events-none fixed z-50 w-40 ${burst && !still ? "plop-loading-puff" : "opacity-0"}`}
        style={{ left: burst?.x ?? 0, top: burst?.y ?? 0, "--clear": `${LOADING.burst.clear}ms` } as CSSProperties}
      />
    </>
  );
}
