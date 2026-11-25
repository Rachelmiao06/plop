"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { unlockAudioOnFirstTouch } from "@/lib/audio";

import { FEEL, type Feel, copyFeel } from "../content";
import { connectFeedback } from "../feedback";
import { createKeyboardInput } from "../keyboard";
import { createPointerInput } from "../pointer";
import { PLAYER_IDS, type PlayerId, Slingshot } from "../simulation";
import {
  type Effects,
  type View,
  drawScene,
  makeBurst,
  makeView,
  readPalette,
  toGround,
} from "./draw";

/** The feel numbers that get a slider. `path` is [section, name] in content.ts. */
const SLIDERS = [
  { path: ["pull", "max"], label: "Full pull distance", min: 0.8, max: 3, step: 0.05 },
  { path: ["pull", "rubberBand"], label: "Rubber band past full", min: 0, max: 0.8, step: 0.02 },
  { path: ["follow", "rateLight"], label: "Small ball snappiness", min: 3, max: 40, step: 1 },
  { path: ["follow", "rateHeavy"], label: "Big ball snappiness (weight)", min: 1, max: 30, step: 0.5 },
  { path: ["ball", "radiusBig"], label: "Biggest ball radius", min: 0.25, max: 0.8, step: 0.01 },
  { path: ["ball", "growthCurve"], label: "Growth curve (low = grows early)", min: 0.3, max: 2.5, step: 0.05 },
  { path: ["keyboard", "pullSpeed"], label: "Keyboard pull speed", min: 0.4, max: 4, step: 0.05 },
  { path: ["keyboard", "steerRate"], label: "Keyboard steering", min: 2, max: 30, step: 0.5 },
  { path: ["arc", "rangeMax"], label: "Longest throw", min: 3, max: 11, step: 0.1 },
  { path: ["arc", "speedSmall"], label: "Small ball flight speed", min: 3, max: 20, step: 0.5 },
  { path: ["arc", "speedBig"], label: "Big ball flight speed", min: 2, max: 15, step: 0.5 },
  { path: ["arc", "heightSmall"], label: "Small ball arc height", min: 0, max: 0.5, step: 0.01 },
  { path: ["arc", "heightBig"], label: "Big ball arc height", min: 0.05, max: 0.7, step: 0.01 },
  { path: ["impact", "radiusPerBall"], label: "Landing size (× ball)", min: 1, max: 3.5, step: 0.05 },
  { path: ["hit", "recovery"], label: "Recovery after a hit (s)", min: 0, max: 2.5, step: 0.05 },
] as const;

type SliderPath = (typeof SLIDERS)[number]["path"];
const keyOf = (path: SliderPath) => path.join(".");
const readNumber = (feel: Feel, [section, name]: SliderPath) =>
  (feel[section] as Record<string, number>)[name];
const writeNumber = (feel: Feel, [section, name]: SliderPath, value: number) => {
  (feel[section] as Record<string, number>)[name] = value;
};
const defaultValues = () =>
  Object.fromEntries(SLIDERS.map((s) => [keyOf(s.path), readNumber(FEEL, s.path)]));

type Stats = Record<
  PlayerId,
  { state: string; pull: number; size: number; radius: number; charged: boolean; flight: number | null }
>;

const MAX_TRAIL_POINTS = 2500;

export function FlatSlingshot() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const feelRef = useRef<Feel | null>(null);
  const clearRef = useRef<() => void>(() => {});
  const [values, setValues] = useState<Record<string, number>>(defaultValues);
  const [stats, setStats] = useState<Stats | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const feel = copyFeel();
    feelRef.current = feel;
    const sim = new Slingshot(feel);
    const palette = readPalette();
    const fx: Effects = { trails: { left: [], right: [] }, dents: [], bursts: [] };
    clearRef.current = () => {
      fx.trails = { left: [], right: [] };
      fx.dents = [];
      fx.bursts = [];
    };

    // Canvas size follows its box, sharp on high-density screens.
    let view: View = makeView(1, 1);
    let size = { w: 1, h: 1, dpr: 1 };
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      view = makeView(rect.width, rect.height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const keyboard = createKeyboardInput(sim);
    const pointer = createPointerInput(sim, canvas, {
      toGround: (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        return toGround(view, clientX - rect.left, clientY - rect.top);
      },
    });
    const feedback = connectFeedback(sim);
    const stopUnlock = unlockAudioOnFirstTouch(() => setSoundOn(true));

    const off = sim.subscribe((e) => {
      if (e.type === "pressed") fx.trails[e.player].push([]);
      if (e.type === "landed") {
        fx.dents.push({ at: e.at, radius: e.radius, strength: e.strength });
        if (fx.dents.length > 80) fx.dents.shift();
        fx.bursts.push(makeBurst(e.at, e.radius, e.strength));
      }
      if (e.type === "cancelled") fx.bursts.push(makeBurst(e.at, e.radius, 0, true));
    });

    // Last flight time per player, for the panel.
    const lastFlight: Record<PlayerId, number | null> = { left: null, right: null };
    const offFlight = sim.subscribe((e) => {
      if (e.type === "launched") lastFlight[e.player] = e.arc.flightTime;
    });

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      keyboard.update(dt);
      sim.step(dt);
      feedback.update();

      // Grooves: add a point whenever a pulled ball has rolled a little.
      let points = 0;
      for (const id of PLAYER_IDS) {
        const ball = sim.players[id].ball;
        const trails = fx.trails[id];
        if (ball && trails.length) {
          const trail = trails[trails.length - 1];
          const end = trail[trail.length - 1];
          const p = ball.position;
          if (!end || Math.hypot(p.x - end.x, p.z - end.z) > 0.03) {
            trail.push({ x: p.x, z: p.z, r: ball.radius });
          } else {
            end.r = ball.radius;
          }
        }
        points += trails.reduce((n, t) => n + t.length, 0);
      }
      if (points > MAX_TRAIL_POINTS) {
        for (const id of PLAYER_IDS) if (fx.trails[id].length > 1) fx.trails[id].shift();
      }
      for (const b of fx.bursts) b.age += dt;
      fx.bursts = fx.bursts.filter((b) => b.age < b.life);

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawScene(ctx, view, size.w, size.h, sim, fx, palette);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const statsTimer = window.setInterval(() => {
      const next = {} as Stats;
      for (const id of PLAYER_IDS) {
        const p = sim.players[id];
        next[id] = {
          state: p.recovery > 0 ? "recovering" : p.phase,
          pull: Math.hypot(p.pull.x, p.pull.z),
          size: p.ball?.size ?? 0,
          radius: p.ball?.radius ?? 0,
          charged: p.ball?.charged ?? false,
          flight: p.aim?.flightTime ?? lastFlight[id],
        };
      }
      setStats(next);
    }, 100);

    if (process.env.NODE_ENV !== "production") {
      // Handy from the browser console while tuning: window.__slingshot.players.left
      (window as unknown as { __slingshot?: Slingshot }).__slingshot = sim;
      void import("../checks").then(({ runSlingshotChecks }) => {
        const failed = runSlingshotChecks();
        if (failed.length) console.error("Slingshot checks failed:", failed);
        else console.info("Slingshot checks: all pass");
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(statsTimer);
      observer.disconnect();
      keyboard.dispose();
      pointer.dispose();
      feedback.dispose();
      stopUnlock();
      off();
      offFlight();
      feelRef.current = null;
    };
  }, []);

  const setValue = (path: SliderPath, value: number) => {
    if (feelRef.current) writeNumber(feelRef.current, path, value);
    setValues((v) => ({ ...v, [keyOf(path)]: value }));
  };

  const resetValues = () => {
    for (const s of SLIDERS) setValue(s.path, readNumber(FEEL, s.path));
  };

  const copyValues = () => {
    const changed = SLIDERS.filter((s) => values[keyOf(s.path)] !== readNumber(FEEL, s.path)).map(
      (s) => `${keyOf(s.path)}: ${values[keyOf(s.path)]}`,
    );
    const text = changed.length ? changed.join("\n") : "No numbers changed from content.ts";
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl">Slingshot test</h1>
        <p className="text-sm">
          <strong>Left:</strong> hold W A S D to pull back, let go to throw.{" "}
          <strong>Right:</strong> same with the arrow keys. <strong>Mouse or finger:</strong> press
          a snowman and drag back, let go to throw. A tiny pull crumbles.{" "}
          {soundOn ? "Sound on." : "Sound turns on with your first tap or key."}
        </p>
      </header>

      <div
        ref={wrapRef}
        className="relative aspect-[12.6/8.6] max-h-[68vh] min-h-56 w-full overflow-hidden rounded-xl border-2 border-border"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full touch-none select-none"
          aria-label="Top-down slingshot test: two snowmen on snow"
        />
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="flex flex-col gap-3 rounded-xl bg-muted p-4 font-mono text-sm tabular-nums">
          {PLAYER_IDS.map((id) => {
            const st = stats?.[id];
            return (
              <div key={id}>
                <div className="font-sans font-bold capitalize">{id}</div>
                <div>state {st?.state ?? "idle"}</div>
                <div>pull {(st?.pull ?? 0).toFixed(2)}</div>
                <div>
                  size {(st?.size ?? 0).toFixed(2)} (r {(st?.radius ?? 0).toFixed(2)})
                </div>
                <div>charged {st?.charged ? "yes" : "no"}</div>
                <div>flight {st?.flight != null ? `${st.flight.toFixed(2)} s` : "–"}</div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={resetValues}>
              Reset numbers
            </Button>
            <Button variant="outline" onClick={copyValues}>
              {copied ? "Copied" : "Copy changed numbers"}
            </Button>
            <Button variant="outline" onClick={() => clearRef.current()}>
              Clear snow
            </Button>
          </div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {SLIDERS.map((s) => {
              const key = keyOf(s.path);
              return (
                <label key={key} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="font-mono tabular-nums">{values[key]}</span>
                  </span>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={values[key]}
                    onChange={(e) => setValue(s.path, Number(e.target.value))}
                    // Give the keyboard back to the players after dragging a slider.
                    onPointerUp={(e) => e.currentTarget.blur()}
                    className="h-7 w-full accent-primary"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
