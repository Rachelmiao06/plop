"use client";

/**
 * A white screen over the page while things load (Rachel: all white, brown ink): the "Plop!" title with her little
 * penguin sliding on its belly beside it, and the snow strip: a real snowball rolling through real snow as things
 * load (`SnowStrip.tsx`). When it is ready the ball rolls to the end and bursts into a real puff of snow
 * (`SnowPoof.tsx`), with a soft bell if the visitor has already tapped (never before: sound needs a gesture). Then:
 *
 * - `reveal: false` (the game): the screen clears outward from the burst into the game;
 * - `reveal: true` (the invite): the title, penguin and strip fade out and the white stays; the page's own card
 *   pops out of the puff (it starts on `useLoaded()`, which turns true at the burst).
 *
 * Rendered on the server too, so it is the very first thing a visitor sees.
 */
import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";

import { isAudioUnlocked, playTie, unlockAudio } from "@/lib/audio";

import { LOADING } from "./content";
import { markLoaded } from "./loaded";
import { SnowPoof } from "./SnowPoof";
import { SnowStrip } from "./SnowStrip";
import { useSceneReady } from "./useSceneReady";

const css = `
/* The penguin's loop: a belly slide forward with a little hop and wobble, then a slow slide back. */
@keyframes plop-loading-slide {
  0%, 100% { transform: translateX(calc(var(--slide) * -0.5)) rotate(calc(var(--tilt) * -0.5)); }
  30% { transform: translateX(calc(var(--slide) * 0.5)) translateY(calc(var(--rise) * -1)) rotate(var(--tilt)); }
  42% { transform: translateX(calc(var(--slide) * 0.55)) translateY(0) rotate(calc(var(--tilt) * -1)); }
  52% { transform: translateX(calc(var(--slide) * 0.5)) rotate(calc(var(--tilt) * 0.5)); }
}
.plop-loading-slide {
  animation: plop-loading-slide var(--loop) cubic-bezier(0.45, 0.05, 0.35, 1.25) infinite;
  transform-origin: 50% 90%;
}
@media (prefers-reduced-motion: reduce) {
  .plop-loading-slide { animation: none; }
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
  /** One of Rachel's cut-outs beside the title. Default: the sliding penguin. */
  art?: Art;
  /** The small line under the strip. Default: `LOADING.note`. */
  note?: string;
  /** A second, smaller line (the invite page's English beneath the Chinese). */
  small?: string;
  /** The page has no 3D scene to wait for (the invite): ready once the page has loaded. */
  noScene?: boolean;
  /** Keep the white at the burst and let the page's own card pop out of the puff (the invite). */
  reveal?: boolean;
};

export function LoadingScreen({ art = LOADING.art, note = LOADING.note, small, noScene = false, reveal = false }: Props) {
  const { progress, ready } = useSceneReady(!noScene);
  const still = useStill();
  /** Where the ball burst (client px); set once the strip has finished. */
  const [burst, setBurst] = useState<{ x: number; y: number } | null | undefined>(undefined);
  const [clearing, setClearing] = useState(0);
  const [gone, setGone] = useState(false);
  const finished = burst !== undefined;

  const onFinished = useCallback((at: { x: number; y: number } | null) => {
    setBurst((b) => (b === undefined ? at : b));
    // A soft bell with the poof, only if the visitor has already tapped (browsers allow sound after a gesture).
    if (at && isAudioUnlocked()) playTie();
    // Reveal: the page's card starts popping out of the puff right now.
    if (reveal) markLoaded();
  }, [reveal]);

  // The clearing: a hole grows from the burst point (or a plain fade), then the screen leaves the page.
  useEffect(() => {
    if (!finished) return;
    const plain = still || burst === null;
    const ms = reveal ? LOADING.burst.contentOut : plain ? LOADING.timing.fade : LOADING.burst.clear;
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
  }, [finished, still, burst, reveal]);


  const loop = {
    "--slide": `${LOADING.slide.slide}px`,
    "--rise": `${LOADING.slide.rise}px`,
    "--tilt": `${LOADING.slide.tilt}deg`,
    "--loop": `${LOADING.slide.seconds}s`,
  } as CSSProperties;

  // How the screen goes: a soft-edged hole opening from the burst (eased out), or a fade. Reveal: only the words,
  // penguin and strip fade; the white stays under the page's card (the page is white too).
  let look: CSSProperties = {};
  let content: CSSProperties = {};
  if (finished) {
    if (reveal) {
      content = { opacity: 1 - clearing, transform: `scale(${1 - 0.04 * clearing})` };
    } else if (burst && !still) {
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
      {!gone && (
      <div
        role="status"
        aria-live="polite"
        aria-busy={!ready}
        data-loading-screen={ready ? "done" : "loading"}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-snow-white px-4 text-ink"
        style={{ ...look, pointerEvents: finished ? "none" : "auto" }}
        // A tap while waiting counts as the gesture that lets the poof ring its bell.
        onPointerDown={() => unlockAudio()}
      >
        <style href="plop-loading" precedence="default">
          {css}
        </style>

        <div className="flex flex-col items-center gap-4" style={content}>
        <div className="flex items-end gap-2">
          <h1 className="font-heading text-7xl font-bold leading-none tracking-wide sm:text-8xl">{LOADING.title}</h1>
          <div className="plop-loading-slide -mb-1 w-24 sm:w-28" style={loop}>
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
        </div>

        <SnowStrip progress={progress} ready={ready} still={still} onFinished={onFinished} />

        <p className="-mt-1 text-center font-heading text-2xl leading-tight">
          {note}
          {small && <span className="block font-sans text-xs">{small}</span>}
        </p>
        </div>
        <span className="sr-only">{ready ? "Ready" : `Loading ${Math.round(progress * 100)}%`}</span>
      </div>
      )}

      {/* The real puff of snow where the ball burst (it outlives the screen until it has settled). */}
      {burst && !still && <SnowPoof at={burst} />}
    </>
  );
}
