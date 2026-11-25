"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

/** The element's current size in pixels, kept up to date. */
export function useSize<T extends Element>(ref: RefObject<T | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry.contentRect;
      setSize((old) =>
        Math.abs(old.w - box.width) < 0.5 && Math.abs(old.h - box.height) < 0.5
          ? old
          : { w: box.width, h: box.height },
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

const motionQuery = "(prefers-reduced-motion: reduce)";

/** True when the person has asked their device for less motion. */
export function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(motionQuery);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(motionQuery).matches,
    () => false,
  );
}

/**
 * A number that springs towards `target` (a little overshoot, then settles).
 * With reduced motion it jumps straight there.
 */
export function useSpring(target: number, stiffness: number, damping: number, instant: boolean) {
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0 });

  useEffect(() => {
    if (instant) {
      state.current = { x: target, v: 0 };
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s = state.current;
      s.v += (stiffness * (target - s.x) - damping * s.v) * dt;
      s.x += s.v * dt;
      if (Math.abs(target - s.x) < 0.0005 && Math.abs(s.v) < 0.001) {
        s.x = target;
        s.v = 0;
        setValue(target);
        return;
      }
      setValue(s.x);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, stiffness, damping, instant]);

  return value;
}

/** The match's time of day (0 afternoon → 1 evening), so the paper can stay readable on the evening snow. */
export { useTimeOfDay as useEvening } from "@/features/snow-scene";
