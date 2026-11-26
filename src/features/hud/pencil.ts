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

/** Outline samples nudged into a wobbly line that runs a little past its start. */
function wobblyPoints(samples: Sample[], seed: number, opts: LineOptions = {}): Pt[] {
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
  return pts;
}

/** Turn outline samples into a wobbly path that runs a little past its start. */
function wobblyLoop(samples: Sample[], seed: number, opts: LineOptions = {}) {
  return smooth(wobblyPoints(samples, seed, opts));
}

/** One piece of a pencil line drawn with its own weight and darkness. */
export type PencilStroke = { d: string; width: number; opacity: number };

/**
 * A pencil line whose weight changes along the stroke, like a real pencil pressed harder and lighter: the same
 * soft curve as `smooth`, cut into short pieces (round caps hide the joins), each with a weight and darkness taken
 * from a slow seeded wave. The last pieces (the overshoot) lift off lighter, as a hand does.
 */
function pressuredStrokes(points: Pt[], seed: number, baseWidth: number): PencilStroke[] {
  if (points.length < 2) return [];
  const { pressure, darkness, piece } = content.pencil;
  const press = wobbleFn(seed * 13 + 5, 1);
  const f = (n: number) => n.toFixed(2);
  const out: PencilStroke[] = [];
  const last = points.length - 1;
  // Distance along the line, so the pressure changes slowly in pixels whatever the point spacing.
  const along = [0];
  for (let i = 1; i <= last; i++) along.push(along[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  for (let start = 0; start < last; start += piece) {
    const end = Math.min(last, start + piece);
    let d = `M${f(points[start].x)} ${f(points[start].y)}`;
    for (let i = start; i < end; i++) {
      const p0 = points[i - 1] ?? points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] ?? p2;
      d += ` C${f(p1.x + (p2.x - p0.x) / 6)} ${f(p1.y + (p2.y - p0.y) / 6)} ${f(p2.x - (p3.x - p1.x) / 6)} ${f(p2.y - (p3.y - p1.y) / 6)} ${f(p2.x)} ${f(p2.y)}`;
    }
    // -1..1 wave along the line, slow enough that neighbours stay close.
    const mid = (along[start] + along[Math.min(last, start + piece)]) / 2;
    const wave = Math.max(-1, Math.min(1, press(mid * 0.35) * 1.5));
    const lift = Math.max(0, (start + piece - (last - 3 * piece)) / (3 * piece)); // 0, then up to 1 at the end
    out.push({
      d,
      width: baseWidth * (1 + wave * pressure) * (1 - lift * 0.45),
      opacity: Math.min(1, (1 - darkness / 2 + (wave * darkness) / 2) * (1 - lift * 0.35)),
    });
  }
  return out;
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

/** A hand-drawn rounded rectangle as pencil pieces of varying weight (see `pressuredStrokes`). */
export function pencilRoundRectStrokes(w: number, h: number, r: number, seed: number, width: number, opts?: LineOptions) {
  const inset = width + (opts?.wobble ?? content.pencil.wobble);
  if (w <= inset * 2 || h <= inset * 2) return [];
  const step = opts?.step ?? content.pencil.step;
  const pts = wobblyPoints(roundRectSamples(inset, inset, w - inset * 2, h - inset * 2, r - inset, step), seed, opts);
  return pressuredStrokes(pts, seed, width);
}

/** A hand-drawn circle as pencil pieces of varying weight. */
export function pencilCircleStrokes(cx: number, cy: number, r: number, seed: number, width: number, opts?: LineOptions) {
  return pressuredStrokes(circlePoints(cx, cy, r, seed, opts), seed, width);
}

function circlePoints(cx: number, cy: number, r: number, seed: number, opts?: LineOptions) {
  const step = opts?.step ?? Math.max(2, r / 3);
  const n = Math.max(8, Math.round((Math.PI * 2 * r) / step));
  const samples: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    samples.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, nx: Math.cos(a), ny: Math.sin(a) });
  }
  return wobblyPoints(samples, seed, { step, overshoot: step * 1.5, ...opts });
}

/** A hand-drawn circle. */
export function pencilCircle(cx: number, cy: number, r: number, seed: number, opts?: LineOptions) {
  return smooth(circlePoints(cx, cy, r, seed, opts));
}

/**
 * Coloured-pencil hatching across a w × h box, done the way a hand does it: slanted strokes of uneven spacing
 * (now and then a wider gap where the pencil skipped), uneven length (some stop short of an edge), bent a little,
 * each with its own weight and darkness, plus a sparser lighter second layer at a slightly different angle.
 * `mess` (0..1, `content.bar.hatchMess`) scales all of that. Returns one entry per stroke.
 */
export function hatchStrokes(
  w: number,
  h: number,
  seed: number,
  mess: number = content.bar.hatchMess,
  hatchGap: number = content.bar.hatchGap,
  hatchAngle: number = content.bar.hatchAngle,
) {
  const rand = seeded(seed);
  const strokes: PencilStroke[] = [];
  const layer = (angle: number, gap: number, light: number) => {
    const slope = Math.tan((angle * Math.PI) / 180);
    const reach = Math.abs(slope * h);
    for (let x = -reach - gap; x < w + reach + gap; ) {
      const skip = rand() < 0.12 * mess ? 1.8 + rand() : 1;
      x += gap * (1 - 0.5 * mess + rand() * mess) * skip;
      const tilt = slope * (1 - 0.2 * mess + rand() * 0.4 * mess);
      // Some strokes start late or stop early instead of running edge to edge.
      const t0 = rand() < 0.3 * mess ? rand() * 0.35 : -0.08 - rand() * 0.06;
      const t1 = rand() < 0.3 * mess ? 1 - rand() * 0.35 : 1.08 + rand() * 0.06;
      const ax = x - tilt * h * t0 + rand() * 1.4;
      const bx = x - tilt * h * t1 + rand() * 1.4;
      const bend = (rand() - 0.5) * (1.6 + 2.4 * mess);
      const my = (h * (t0 + t1)) / 2;
      strokes.push({
        d: `M${ax.toFixed(1)} ${(h * t0).toFixed(1)} Q${((ax + bx) / 2 + bend).toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${(h * t1).toFixed(1)}`,
        width: (0.8 + rand() * (0.6 + 0.6 * mess)) * (light < 1 ? 0.8 : 1),
        opacity: (0.45 + rand() * 0.5) * light,
      });
    }
  };
  layer(hatchAngle, hatchGap, 1);
  if (mess > 0) layer(hatchAngle + 14, hatchGap * 2.6, 0.45 * mess);
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

/**
 * An open hand-drawn line along a cubic curve from `a` to `d` (controls `b`, `c`), as pencil pieces of varying
 * weight: for doodled arrows. Same seeded wobble as the outlines, no overshoot (the ends are the arrow's).
 */
export function pencilCurveStrokes(a: Pt, b: Pt, c: Pt, d: Pt, seed: number, width: number, opts?: LineOptions) {
  const at = (t: number): Pt => {
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    };
  };
  const step = opts?.step ?? 6;
  let length = 0;
  for (let i = 1, prev = at(0); i <= 40; i++) {
    const p = at(i / 40);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  const n = Math.max(4, Math.round(length / step));
  const wob = wobbleFn(seed, opts?.wobble ?? content.pencil.wobble);
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = at(t);
    const q = at(Math.min(1, t + 0.01));
    const r = at(Math.max(0, t - 0.01));
    const len = Math.hypot(q.x - r.x, q.y - r.y) || 1;
    // The wobble fades out at both ends, so the arrow starts and lands where it is aimed.
    const off = wob(i * step) * Math.sin(Math.PI * t);
    pts.push({ x: p.x + (-(q.y - r.y) / len) * off, y: p.y + ((q.x - r.x) / len) * off });
  }
  return pressuredStrokes(pts, seed, width);
}
