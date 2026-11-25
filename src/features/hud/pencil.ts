/**
 * Hand-drawn lines as SVG paths: shapes are sampled along their outline, each
 * point nudged by a smooth seeded wobble, then joined with soft curves. The same
 * seed always gives the same line, so nothing flickers between renders.
 */
import { content } from "./content";

type Pt = { x: number; y: number };

/** Small fast seeded random generator (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth wobble along a line: a few slow sine waves with random phases. */
function wobbleFn(seed: number, amount: number) {
  const rand = seeded(seed);
  const waves = [0.045, 0.11, 0.23].map((freq, i) => ({
    freq: freq * (0.8 + rand() * 0.4),
    phase: rand() * Math.PI * 2,
    amp: amount * [0.6, 0.3, 0.15][i],
  }));
  return (s: number) => waves.reduce((sum, w) => sum + Math.sin(s * w.freq + w.phase) * w.amp, 0);
}

/** Join points with a soft curve (Catmull-Rom turned into cubic Béziers). */
function smooth(points: Pt[]): string {
  if (points.length < 2) return "";
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

type Sample = Pt & { nx: number; ny: number };

/** Points (with outward normals) every `step` pixels around a rounded rectangle, clockwise from the top-left. */
function roundRectSamples(x: number, y: number, w: number, h: number, r: number, step: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const out: Sample[] = [];
  const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      out.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, nx, ny });
    }
  };
  const arc = (cx: number, cy: number, from: number) => {
    const n = Math.max(2, Math.round((rr * Math.PI) / 2 / step) + 1);
    for (let i = 0; i < n; i++) {
      const a = from + (i / n) * (Math.PI / 2);
      out.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, nx: Math.cos(a), ny: Math.sin(a) });
    }
  };
  line(x + rr, y, x + w - rr, y, 0, -1);
  arc(x + w - rr, y + rr, -Math.PI / 2);
  line(x + w, y + rr, x + w, y + h - rr, 1, 0);
  arc(x + w - rr, y + h - rr, 0);
  line(x + w - rr, y + h, x + rr, y + h, 0, 1);
  arc(x + rr, y + h - rr, Math.PI / 2);
  line(x, y + h - rr, x, y + rr, -1, 0);
  arc(x + rr, y + rr, Math.PI);
  return out;
}

type LineOptions = { wobble?: number; step?: number; overshoot?: number };

/** Turn outline samples into a wobbly path that runs a little past its start. */
function wobblyLoop(samples: Sample[], seed: number, opts: LineOptions = {}) {
  const p = content.pencil;
  const amount = opts.wobble ?? p.wobble;
  const step = opts.step ?? p.step;
  const overshoot = opts.overshoot ?? p.overshoot;
  const wob = wobbleFn(seed, amount);
  const extra = Math.max(1, Math.round(overshoot / step));
  const pts: Pt[] = [];
  const total = samples.length + extra;
  for (let i = 0; i <= total; i++) {
    const s = samples[i % samples.length];
    // Past the start the pencil drifts slightly outward, so the ends overlap without meeting.
    const drift = i >= samples.length ? ((i - samples.length + 1) / extra) * amount * 0.7 : 0;
    const off = wob(i * step) + drift;
    pts.push({ x: s.x + s.nx * off, y: s.y + s.ny * off });
  }
  return smooth(pts);
}

/** A hand-drawn rounded rectangle, inset by half a stroke so it stays inside its box. */
export function pencilRoundRect(w: number, h: number, r: number, seed: number, opts?: LineOptions) {
  const inset = content.pencil.width + (opts?.wobble ?? content.pencil.wobble);
  if (w <= inset * 2 || h <= inset * 2) return "";
  const step = opts?.step ?? content.pencil.step;
  return wobblyLoop(
    roundRectSamples(inset, inset, w - inset * 2, h - inset * 2, r - inset, step),
    seed,
    opts,
  );
}

/** A hand-drawn circle. */
export function pencilCircle(cx: number, cy: number, r: number, seed: number, opts?: LineOptions) {
  const step = opts?.step ?? Math.max(2, r / 3);
  const n = Math.max(8, Math.round((Math.PI * 2 * r) / step));
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    samples.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
  }
  return wobblyLoop(samples, seed, { step, overshoot: step * 1.5, ...opts });
}

/**
 * Coloured-pencil hatching across a w × h box: slanted strokes, each a little
 * different in angle, weight and darkness. Returns one entry per stroke.
 */
export function hatchStrokes(w: number, h: number, seed: number) {
  const { hatchGap, hatchAngle } = content.bar;
  const rand = seeded(seed);
  const slope = Math.tan((hatchAngle * Math.PI) / 180);
  const reach = Math.abs(slope * h);
  const strokes: { d: string; width: number; opacity: number }[] = [];
  for (let x = -reach - hatchGap; x < w + reach + hatchGap; x += hatchGap * (0.75 + rand() * 0.5)) {
    const tilt = slope * (0.85 + rand() * 0.3);
    const top = { x: x + rand() * 1.2, y: -1 - rand() * 2 };
    const bottom = { x: x - tilt * h + rand() * 1.2, y: h + 1 + rand() * 2 };
    const bend = (rand() - 0.5) * 1.6;
    const mid = { x: (top.x + bottom.x) / 2 + bend, y: h / 2 };
    strokes.push({
      d: `M${top.x.toFixed(1)} ${top.y.toFixed(1)} Q${mid.x.toFixed(1)} ${mid.y.toFixed(1)} ${bottom.x.toFixed(1)} ${bottom.y.toFixed(1)}`,
      width: 1 + rand() * 0.9,
      opacity: 0.55 + rand() * 0.4,
    });
  }
  return strokes;
}

/** Fixed jitter values for the ragged leading edge of the bar fill. */
export function edgeJitter(count: number, seed: number) {
  const rand = seeded(seed);
  return Array.from({ length: count }, () => rand() * 2 - 1);
}

/** The fill shape: a rectangle `width` wide whose right edge is ragged like a crayon stroke. */
export function raggedFill(width: number, h: number, jitter: number[]) {
  if (width <= 0.5) return "";
  const jag = Math.min(content.bar.edgeJag, width / 2);
  const n = jitter.length;
  let d = `M-4 -2 L${(width + jitter[0] * jag).toFixed(1)} -2`;
  for (let i = 0; i < n; i++) {
    const y = -2 + ((h + 4) * i) / (n - 1);
    d += ` L${(width + jitter[i] * jag).toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d} L-4 ${h + 2} Z`;
}
