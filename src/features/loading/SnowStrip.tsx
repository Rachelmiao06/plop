"use client";

/**
 * The loading bar: a small strip of real lit snow. A snowball rolls left to right through a shallow trench,
 * growing as it rolls and pressing a groove behind it with a little spray; how far it has rolled is the progress.
 * When the page is ready and the ball reaches the end it bursts, and `onFinished` gets the burst point (client px)
 * so the loading screen can clear from there.
 *
 * Raw WebGL 1 in a tiny canvas (no three.js), so it is drawing within a frame of the page arriving. Without WebGL it
 * is the old pencil line. With "reduce motion" the ball moves straight to the progress, no spray, no twinkle.
 */
import { useEffect, useRef, useState } from "react";

import { LOADING } from "./content";
import { FRAGMENT, LANE_Y, VERTEX } from "./snowStripShader";

/** A slightly uneven hand line, drawn in a 320 x 24 box. Two passes make it read as pencil, not vector. */
const STROKE = "M6 13 C 48 9, 92 15, 140 12 S 228 9, 268 13 S 304 12, 314 11";
const STROKE_2 = "M7 14 C 50 11, 96 16, 142 13 S 226 11, 266 14 S 302 13, 313 12";

type Props = {
  /** Real progress, 0 to 1 (never goes back). */
  progress: number;
  /** The page is ready: roll to the end and burst. */
  ready: boolean;
  /** Reduce motion. */
  still: boolean;
  /** Called once, when the ball bursts (or at once without WebGL), with the burst point in client px. */
  onFinished: (at: { x: number; y: number } | null) => void;
};

const hex = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[loading] snow strip shader:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export function SnowStrip({ progress, ready, still, onFinished }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const percent = useRef<HTMLSpanElement>(null);
  /** null until we know; true once the first frame is drawn; false = no WebGL, pencil line. */
  const [gl, setGl] = useState<boolean | null>(null);

  // Latest props for the animation loop (it starts once and reads these every frame).
  const live = useRef({ progress, ready, still, onFinished });
  useEffect(() => {
    live.current = { progress, ready, still, onFinished };
  });

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false });
    const vs = ctx && compile(ctx, ctx.VERTEX_SHADER, VERTEX);
    const fs = ctx && compile(ctx, ctx.FRAGMENT_SHADER, FRAGMENT);
    const program = ctx?.createProgram();
    if (!ctx || !vs || !fs || !program) {
      setGl(false);
      return;
    }
    ctx.attachShader(program, vs);
    ctx.attachShader(program, fs);
    ctx.linkProgram(program);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
      setGl(false);
      return;
    }
    ctx.useProgram(program);
    const buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    const aPos = ctx.getAttribLocation(program, "aPos");
    ctx.enableVertexAttribArray(aPos);
    ctx.vertexAttribPointer(aPos, 2, ctx.FLOAT, false, 0, 0);

    const u = (name: string) => ctx.getUniformLocation(program, name);
    const { strip } = LOADING;
    const L = strip.light;
    ctx.uniform3fv(u("uSnow"), hex(L.snow));
    ctx.uniform3fv(u("uPressed"), hex(L.pressed));
    ctx.uniform3fv(u("uSun"), hex(L.sun));
    ctx.uniform3fv(u("uSky"), hex(L.sky));
    ctx.uniform3fv(u("uBounce"), hex(L.bounce));
    ctx.uniform3fv(u("uSparkle"), hex(L.sparkle));
    ctx.uniform1f(u("uGrain"), L.grain);
    ctx.uniform1f(u("uSparkleAmount"), L.sparkleAmount);
    ctx.uniform1f(u("uExposure"), L.exposure);
    const uni = {
      aspect: u("uAspect"),
      time: u("uTime"),
      ballX: u("uBallX"),
      startX: u("uStartX"),
      endX: u("uEndX"),
      r0: u("uR0"),
      r1: u("uR1"),
      spin: u("uSpin"),
      speed: u("uSpeed"),
      burst: u("uBurst"),
      motion: u("uMotion"),
    };

    let aspect = strip.width / strip.height;
    const resize = () => {
      const w = el.clientWidth || strip.width;
      const h = el.clientHeight || strip.height;
      const dpr = Math.min(window.devicePixelRatio || 1, strip.maxPixelRatio);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      aspect = w / h;
      ctx.viewport(0, 0, el.width, el.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let lost = false;
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setGl(false);
    };
    el.addEventListener("webglcontextlost", onLost);

    const r0 = strip.ballStart;
    const r1 = strip.ballEnd;
    // Carry on from where the pencil line (server-rendered, before this started) had got to.
    let shown = live.current.progress;
    let spun = 0;
    let burstAt = -1;
    let first = true;
    let raf = 0;
    let last = performance.now();
    const t0 = last;

    const frame = (now: number) => {
      if (lost) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { progress: target, ready: done, still: calm } = live.current;
      const goal = done ? 1 : target;
      const before = shown;
      if (calm) shown = goal;
      else {
        const step = (goal - shown) * (1 - Math.exp(-strip.follow * (done ? 2.2 : 1) * dt));
        shown += Math.min(step, strip.maxSpeed * (done ? 2 : 1) * dt);
      }
      shown = Math.min(1, Math.max(shown, 0));
      if (done && shown > 0.994) shown = 1;

      const startX = r0 + 0.3;
      const endX = aspect - r1 - 0.22;
      const ballX = startX + (endX - startX) * shown;
      const r = r0 + (r1 - r0) * shown;
      const moved = (shown - before) * (endX - startX);
      spun += moved / r;
      const speed = Math.min(1, Math.abs(moved) / Math.max(dt, 1e-3) / (strip.maxSpeed * aspect * 0.5));

      if (shown >= 1 && done && burstAt < 0) {
        burstAt = now;
        const rect = el.getBoundingClientRect();
        live.current.onFinished({
          x: rect.left + (ballX / aspect) * rect.width,
          y: rect.top + (1 - (LANE_Y + r * 0.42)) * rect.height,
        });
      }
      if (percent.current) percent.current.textContent = `${Math.round(shown * 100)}%`;

      ctx.uniform1f(uni.aspect, aspect);
      ctx.uniform1f(uni.time, calm ? 0 : (now - t0) / 1000);
      ctx.uniform1f(uni.ballX, ballX);
      ctx.uniform1f(uni.startX, startX);
      ctx.uniform1f(uni.endX, endX);
      ctx.uniform1f(uni.r0, r0);
      ctx.uniform1f(uni.r1, r1);
      ctx.uniform1f(uni.spin, spun);
      ctx.uniform1f(uni.speed, speed);
      ctx.uniform1f(uni.burst, burstAt < 0 ? -1 : (now - burstAt) / 1000);
      ctx.uniform1f(uni.motion, calm ? 0 : 1);
      ctx.clearColor(0, 0, 0, 0);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
      if (first) {
        first = false;
        setGl(true);
      }
      // After the burst has played out, stop drawing.
      if (burstAt >= 0 && now - burstAt > 1200) return;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("webglcontextlost", onLost);
      ctx.deleteProgram(program);
      ctx.deleteShader(vs);
      ctx.deleteShader(fs);
      ctx.deleteBuffer(buf);
    };
  }, []);

  // No WebGL: the pencil line finishes the moment the page is ready.
  useEffect(() => {
    if (gl === false && ready) onFinished(null);
  }, [gl, ready, onFinished]);

  const { width, height } = LOADING.strip;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: `min(${width}px, 78vw)`, height }}>
        <canvas
          ref={canvas}
          data-loading-strip
          aria-hidden
          className="absolute inset-0 size-full"
          style={{ opacity: gl ? 1 : 0, transition: "opacity 200ms ease-out" }}
        />
        {!gl && (
          <svg viewBox="0 0 320 24" className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2" aria-hidden>
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
        )}
      </div>
      {/* While the snow draws, the loop writes the ball's own percentage into the first span (React leaves it alone). */}
      <span ref={percent} aria-hidden hidden={!gl} className="font-heading text-xl leading-none tabular-nums" />
      {!gl && (
        <span aria-hidden className="font-heading text-xl leading-none tabular-nums">
          {`${Math.round(progress * 100)}%`}
        </span>
      )}
    </div>
  );
}
