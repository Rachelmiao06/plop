"use client";

/**
 * The snowball's burst at 100 %: a real puff of snow from where it burst, drawn on a small 2D canvas. Fine powder
 * and a few soft clumps fly out (mostly up and out, then they fall and fade), over a faint mist that swells and
 * thins. Each flake is shaded like the snow: a pale `--snow-shadow` underside and a `--snow-white` lit top, so it
 * reads on the white page without an outline. Colours come from the tokens at run time; numbers from
 * `LOADING.burst`. Nothing draws for "reduce motion".
 */
import { useEffect, useRef } from "react";

import { LOADING } from "./content";

type Flake = { x: number; y: number; vx: number; vy: number; r: number; lobes: [number, number, number][]; life: number };

/** A small fixed random from a seed, so every visit's poof has the same character. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function token(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function SnowPoof({ at }: { at: { x: number; y: number } }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const p = LOADING.burst.poof;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const size = p.reach * 2;
    el.width = size * ratio;
    el.height = size * ratio;
    ctx.scale(ratio, ratio);

    const white = token("--snow-white", "#ffffff");
    const shade = token("--snow-shadow", "#cfe1f2");
    const sky = token("--sky-blue", "#8db7e2");

    const rand = seeded(7);
    const flakes: Flake[] = [];
    const add = (count: number, rMin: number, rMax: number, speed: number, lobes: number) => {
      for (let i = 0; i < count; i++) {
        // Mostly up and out: angles spread over the top, a few downward.
        const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 1.7;
        const v = speed * (0.35 + rand() * 0.75);
        const r = rMin + rand() * (rMax - rMin);
        flakes.push({
          x: (rand() - 0.5) * 10,
          y: (rand() - 0.5) * 6,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          r,
          lobes: Array.from({ length: lobes }, () => [(rand() - 0.5) * r * 1.1, (rand() - 0.5) * r * 0.9, r * (0.55 + rand() * 0.5)]),
          life: 0.65 + rand() * 0.35,
        });
      }
    };
    add(p.powder, 1, 2.8, p.speed, 1);
    add(p.clumps, 4, 9, p.speed * 0.7, 3);

    const start = performance.now();
    let last = start;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / p.duration;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      // The mist: a soft pale cloud that swells and thins.
      const mist = Math.min(1, t * 2.2);
      const mistR = p.mist * (0.4 + 0.8 * mist);
      const grad = ctx.createRadialGradient(cx, cy - mistR * 0.15, 0, cx, cy - mistR * 0.15, mistR);
      grad.addColorStop(0, shade);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = Math.max(0, 0.55 * (1 - t) * Math.min(1, t * 8));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy - mistR * 0.15, mistR, 0, Math.PI * 2);
      ctx.fill();

      for (const f of flakes) {
        f.vy += p.gravity * dt;
        f.vx *= 1 - p.drag * dt;
        f.vy *= 1 - p.drag * dt * 0.5;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        const fade = Math.max(0, 1 - t / f.life);
        if (fade <= 0) continue;
        ctx.globalAlpha = fade;
        for (const [ox, oy, r] of f.lobes) {
          // Underside in snow shadow, lit top in white: a tiny lit snowball, no outline.
          ctx.fillStyle = shade;
          ctx.beginPath();
          ctx.arc(cx + f.x + ox, cy + f.y + oy + r * 0.18, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = white;
          ctx.beginPath();
          ctx.arc(cx + f.x + ox - r * 0.12, cy + f.y + oy - r * 0.12, r * 0.82, 0, Math.PI * 2);
          ctx.fill();
        }
        // A hint of blue on the biggest clumps' shaded edge, like the strip's pressed snow.
        if (f.r > 6) {
          ctx.globalAlpha = fade * 0.25;
          ctx.strokeStyle = sky;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(cx + f.x, cy + f.y + f.r * 0.2, f.r * 0.9, Math.PI * 0.15, Math.PI * 0.85);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      if (t < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const reach = LOADING.burst.poof.reach;
  return (
    <canvas
      ref={ref}
      aria-hidden
      data-loading-strip
      className="pointer-events-none fixed z-[60]"
      style={{ left: at.x - reach, top: at.y - reach, width: reach * 2, height: reach * 2 }}
    />
  );
}
