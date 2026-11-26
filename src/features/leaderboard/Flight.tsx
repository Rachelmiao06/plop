"use client";

/** A snowball thrown on the board: it arcs from one point to another, spinning, splats and is gone. */
import { useLayoutEffect, useRef, useState } from "react";
import { SnowballDots } from "@/features/hud/Doodles";
import { SNOWBALL } from "./content";

const PUFF = "/assets/effects/snow-puff.webp";

export type Point = { x: number; y: number };
/** `size`: how big the splat is drawn (px, times `SNOWBALL.splat`). */
export type FlightPlan = { id: number; from: Point; to: Point; target: string; size: number };

/** One snowball in the air: arcs from `from` to `to`, spinning, then splats (Rachel's snow puff) and is gone. */
export function Flight({ plan, onHit, onDone }: { plan: FlightPlan; onHit: () => void; onDone: () => void }) {
  const ball = useRef<HTMLSpanElement>(null);
  const splat = useRef<HTMLImageElement>(null);
  const [hit, setHit] = useState(false);
  const done = useRef({ onHit, onDone });
  useLayoutEffect(() => {
    done.current = { onHit, onDone };
  });
  useLayoutEffect(() => {
    const el = ball.current;
    if (!el) return;
    const dx = plan.to.x - plan.from.x;
    const dy = plan.to.y - plan.from.y;
    const arc = Math.max(SNOWBALL.arcMin, Math.hypot(dx, dy) * SNOWBALL.arc);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frames = Array.from({ length: 13 }, (_, i) => {
      const t = i / 12;
      return { transform: `translate(${dx * t}px, ${dy * t - arc * 4 * t * (1 - t)}px) rotate(${t * 600}deg) scale(${1 - 0.25 * t})` };
    });
    const flight = el.animate(frames, { duration: reduce ? 1 : SNOWBALL.flight * 1000, easing: "linear" });
    flight.onfinish = () => {
      setHit(true);
      done.current.onHit();
    };
    return () => flight.cancel();
  }, [plan]);
  useLayoutEffect(() => {
    if (!hit || !splat.current) return;
    const pop = splat.current.animate(
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.3) rotate(-12deg)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1.1) rotate(4deg)", offset: 0.25 },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1) rotate(0deg)", offset: 0.6 },
        { opacity: 0, transform: "translate(-50%, -40%) scale(1.15) rotate(2deg)" },
      ],
      { duration: 900, easing: "ease-out" },
    );
    pop.onfinish = () => done.current.onDone();
    return () => pop.cancel();
  }, [hit]);
  const size = plan.size * SNOWBALL.splat;
  return (
    <>
      {!hit && (
        <span ref={ball} aria-hidden className="pointer-events-none absolute z-50" style={{ left: plan.from.x - SNOWBALL.ball / 2, top: plan.from.y - SNOWBALL.ball / 2 }}>
          <SnowballDots count={1} size={SNOWBALL.ball} />
        </span>
      )}
      {hit && (
        // eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff as the splat
        <img
          ref={splat}
          src={PUFF}
          alt=""
          aria-hidden
          draggable={false}
          width={size}
          height={(size * 235) / 306}
          className="pointer-events-none absolute z-50"
          style={{ left: plan.to.x, top: plan.to.y, transform: "translate(-50%, -50%)" }}
        />
      )}
    </>
  );
}
