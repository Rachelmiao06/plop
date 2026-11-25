"use client";

/**
 * Decides when the 3D scene is ready to be seen, without touching the game:
 *
 * 1. a `<canvas>` is on the page and has drawn its first frame (two animation frames after it appears);
 * 2. three.js has nothing left to load: drei's `useProgress` (the shared texture loading manager that every
 *    `useTexture` goes through) is idle with everything loaded, and has stayed idle for `timing.settle`;
 *    if nothing ever starts loading, `timing.nothingToLoad` after the canvas counts as idle;
 * 3. at least `timing.minShow` has passed, so a cached visit never flashes.
 *
 * A `plop:ready` window event (if the game ever sends one) or `timing.maxWait` ends the wait at once.
 * Returns a progress value (0 to 1, never goes back) and `ready`.
 *
 * `scene: false` (a page with no 3D scene, the invite): step 1 is "the page and its fonts have loaded" instead, and
 * the minimum is `timing.minShowPage`, so the snowball's roll still reads.
 */
import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";

import { LOADING } from "./content";

export function useSceneReady(scene = true) {
  const { active, loaded, total } = useProgress();
  const [painted, setPainted] = useState(false);
  const [forced, setForced] = useState(false);
  const [idleLongEnough, setIdleLongEnough] = useState(false);
  const [minDone, setMinDone] = useState(false);
  const [creep, setCreep] = useState(0);
  const [peak, setPeak] = useState(0);

  const { settle, maxWait } = LOADING.timing;
  const minShow = scene ? LOADING.timing.minShow : LOADING.timing.minShowPage;
  const nothingToLoad = scene ? LOADING.timing.nothingToLoad : settle;

  // Minimum show time, hard fallback, the optional ready event, and the slow creep of the line.
  useEffect(() => {
    const start = performance.now();
    const min = window.setTimeout(() => setMinDone(true), minShow);
    const max = window.setTimeout(() => setForced(true), maxWait);
    const onReady = () => setForced(true);
    window.addEventListener(LOADING.readyEvent, onReady);
    const tick = window.setInterval(() => setCreep(((performance.now() - start) / 1000) * LOADING.progress.creep), 200);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(max);
      window.clearInterval(tick);
      window.removeEventListener(LOADING.readyEvent, onReady);
    };
  }, [minShow, maxWait]);

  // First frame: wait for a canvas, then two animation frames so it has really drawn.
  useEffect(() => {
    if (!scene) {
      // No scene: the page and its fonts have loaded.
      let live = true;
      const done = () => document.fonts.ready.then(() => live && setPainted(true));
      if (document.readyState === "complete") done();
      else window.addEventListener("load", done, { once: true });
      return () => {
        live = false;
        window.removeEventListener("load", done);
      };
    }
    let raf = 0;
    const look = () => {
      // The scene's canvas, not the loading strip's own little one.
      if (document.querySelector("canvas:not([data-loading-strip])")) {
        raf = requestAnimationFrame(() => {
          raf = requestAnimationFrame(() => setPainted(true));
        });
        return;
      }
      raf = requestAnimationFrame(look);
    };
    raf = requestAnimationFrame(look);
    return () => cancelAnimationFrame(raf);
  }, [scene]);

  // Loading has gone quiet: everything that started has finished and nothing new began for `settle` ms.
  const quiet = !active && (total === 0 || loaded >= total);
  useEffect(() => {
    if (!painted || !quiet) return;
    const wait = total === 0 ? nothingToLoad : settle;
    const id = window.setTimeout(() => setIdleLongEnough(true), wait);
    return () => {
      window.clearTimeout(id);
      setIdleLongEnough(false);
    };
  }, [painted, quiet, total, settle, nothingToLoad]);

  const ready = forced || (painted && idleLongEnough && minDone);

  const { floor, ceiling } = LOADING.progress;
  const share = total > 0 ? loaded / total : 0;
  const target = ready ? 1 : Math.min(ceiling, floor + share * (ceiling - floor) * 0.85 + creep);
  // Never move backwards when a new wave of textures starts.
  if (target > peak) setPeak(target);

  return { progress: Math.max(peak, target), ready };
}
