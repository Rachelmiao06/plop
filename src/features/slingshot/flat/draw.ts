/**
 * Top-down 2D drawing of the slingshot, for the /dev/slingshot test page only.
 * Height (ball in the air, a hopping character) is shown by lifting things up the
 * screen, with a shadow left on the ground. Colours come from the theme tokens.
 */
import { arcPoint } from "../arc";
import { PLAYER_IDS, type PlayerId, type Slingshot } from "../simulation";
import type { Vec2 } from "../vec";

export const TOKEN_NAMES = [
  "paper",
  "ink",
  "snow-shadow",
  "sky-blue",
  "berry",
  "butter",
  "slate",
] as const;
export type Palette = Record<(typeof TOKEN_NAMES)[number], string> & { font: string };

export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(`--${name}`).trim();
  const colours = Object.fromEntries(TOKEN_NAMES.map((n) => [n, read(n)]));
  // Canvas cannot read CSS variables in a font, so take the page's resolved font.
  return { ...colours, font: getComputedStyle(document.body).fontFamily } as Palette;
}

/** What part of the scene is visible: scene units across and down. */
const VIEW_WIDTH = 12.6;
const VIEW_HEIGHT = 8.6;
/** How far up the screen one unit of height lifts a thing. */
const LIFT = 0.6;
/** Size of a drawn character, in scene units. */
const CHARACTER_RADIUS = 0.3;

export type View = { cx: number; cy: number; s: number };

export function makeView(width: number, height: number): View {
  return { cx: width / 2, cy: height / 2, s: Math.min(width / VIEW_WIDTH, height / VIEW_HEIGHT) };
}

export const toScreen = (v: View, p: Vec2, height = 0): [number, number] => [
  v.cx + p.x * v.s,
  v.cy + (p.z - height * LIFT) * v.s,
];

export const toGround = (v: View, x: number, y: number): Vec2 => ({
  x: (x - v.cx) / v.s,
  z: (y - v.cy) / v.s,
});

export type TrailPoint = { x: number; z: number; r: number };
export type Dent = { at: Vec2; radius: number; strength: number };
export type Burst = {
  at: Vec2;
  radius: number;
  age: number;
  life: number;
  bits: { angle: number; speed: number; size: number; up: number }[];
};

/** Marks left in the snow and things flying about, kept by the page between frames. */
export type Effects = {
  trails: Record<PlayerId, TrailPoint[][]>;
  dents: Dent[];
  bursts: Burst[];
};

export function makeBurst(at: Vec2, radius: number, strength: number, small = false): Burst {
  const count = small ? 8 : Math.round(12 + 22 * strength);
  return {
    at,
    radius,
    age: 0,
    life: small ? 0.4 : 0.65,
    bits: Array.from({ length: count }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: (small ? 0.6 : 1.5 + 2.5 * strength) * (0.4 + Math.random() * 0.8),
      size: (small ? 0.03 : 0.04 + 0.05 * strength) * (0.6 + Math.random() * 0.8),
      up: (small ? 0.2 : 0.5 + strength) * Math.random(),
    })),
  };
}

const KEY_LABELS: Record<PlayerId, string> = { left: "W A S D", right: "← ↑ ↓ →" };

export function drawScene(
  ctx: CanvasRenderingContext2D,
  view: View,
  width: number,
  height: number,
  sim: Slingshot,
  fx: Effects,
  c: Palette,
) {
  const { s } = view;
  const colour: Record<PlayerId, string> = { left: c["sky-blue"], right: c.berry };
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const circle = (p: Vec2, r: number, h = 0) => {
    const [x, y] = toScreen(view, p, h);
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, r * s), 0, Math.PI * 2);
  };

  // Grooves: where balls rolled.
  ctx.strokeStyle = c["snow-shadow"];
  for (const id of PLAYER_IDS) {
    for (const trail of fx.trails[id]) {
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const [ax, ay] = toScreen(view, a);
        const [bx, by] = toScreen(view, b);
        ctx.lineWidth = Math.max(1, b.r * 1.6 * s);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
    }
  }

  // Dents where balls landed.
  for (const d of fx.dents) {
    ctx.fillStyle = c["snow-shadow"];
    circle(d.at, d.radius * 0.85);
    ctx.fill();
    ctx.globalAlpha = 0.15 + 0.2 * d.strength;
    ctx.fillStyle = c.slate;
    circle(d.at, d.radius * 0.45);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 1;
    circle(d.at, d.radius * 0.9);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Aim previews.
  for (const id of PLAYER_IDS) {
    const aim = sim.players[id].aim;
    if (!aim) continue;
    ctx.fillStyle = c.ink;
    const dots = Math.max(4, Math.ceil(aim.distance / 0.28));
    for (let i = 1; i < dots; i++) {
      const pt = arcPoint(aim, i / dots);
      ctx.globalAlpha = 0.55;
      const [x, y] = toScreen(view, pt.position, pt.height);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, 0.035 * s), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    circle(aim.landing, aim.impactRadius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Characters.
  for (const id of PLAYER_IDS) {
    const p = sim.players[id];
    const hop = p.hopHeight;
    // A small shadow while hopping.
    if (hop > 0.001) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = c["snow-shadow"];
      circle(p.home, CHARACTER_RADIUS * (1 - 0.3 * Math.min(1, hop)));
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Wobble after a hit: a quick shake that dies away, and a squash.
    const t = Math.min(p.hitAge, 1.5); // hitAge is Infinity before the first hit
    const wobble = t < 1.5 ? Math.exp(-t * 3.5) : 0;
    const angle = Math.sin(t * 24) * 0.6 * wobble;
    const [x, y] = toScreen(view, p.home, hop);
    ctx.save();
    ctx.translate(x + Math.sin(t * 24) * 0.12 * s * wobble, y);
    ctx.rotate(angle);
    ctx.scale(1 + 0.25 * wobble, 1 - 0.25 * wobble);
    ctx.beginPath();
    ctx.arc(0, 0, CHARACTER_RADIUS * s, 0, Math.PI * 2);
    ctx.fillStyle = colour[id];
    ctx.fill();
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // Recovery: a shrinking ring.
    if (p.recovery > 0) {
      const share = p.recovery / Math.max(0.01, sim.feel.hit.recovery);
      ctx.strokeStyle = c.slate;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, (CHARACTER_RADIUS + 0.1) * s, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = c.ink;
    ctx.globalAlpha = 0.7;
    ctx.font = `600 ${Math.max(10, Math.round(0.2 * s))}px ${c.font}`;
    ctx.textAlign = "center";
    ctx.fillText(KEY_LABELS[id], toScreen(view, p.home)[0], toScreen(view, p.home)[1] + (CHARACTER_RADIUS + 0.38) * s);
    ctx.globalAlpha = 1;
  }

  // Balls being pulled.
  for (const id of PLAYER_IDS) {
    const p = sim.players[id];
    const ball = p.ball;
    if (!ball) continue;
    const at = { x: ball.position.x + ball.trembleOffset.x, z: ball.position.z + ball.trembleOffset.z };
    // The slingshot band from the character to the ball.
    const [hx, hy] = toScreen(view, p.home);
    const [bx, by] = toScreen(view, at);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = c.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(bx, by);
    ctx.stroke();
    // Snow sinking under a resting ball.
    ctx.globalAlpha = Math.min(0.35, ball.dwell * 0.12);
    ctx.fillStyle = c.slate;
    circle(ball.position, ball.radius * 1.15);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawBall(ctx, view, at, 0, ball.radius, c, ball.rolled, ball.rollDirection);
    if (ball.charged) {
      ctx.strokeStyle = c.butter;
      ctx.lineWidth = 3 + 2 * Math.sin(sim.time * 12);
      circle(at, ball.radius + 0.08);
      ctx.stroke();
    }
  }

  // Balls in flight, with a shadow that shrinks and fades as they rise.
  for (const f of sim.flying) {
    const rise = Math.min(1, (f.height - f.arc.ballRadius) / Math.max(0.05, f.arc.apex));
    ctx.globalAlpha = 0.65 - 0.35 * rise;
    ctx.fillStyle = c.slate;
    circle(f.position, f.arc.ballRadius * (1 - 0.45 * rise));
    ctx.fill();
    ctx.globalAlpha = 1;
    drawBall(ctx, view, f.position, f.height, f.arc.ballRadius, c, f.age * 8, f.arc.direction);
  }

  // Bursts of snow.
  for (const b of fx.bursts) {
    const u = b.age / b.life;
    ctx.globalAlpha = Math.max(0, 1 - u);
    ctx.strokeStyle = c["snow-shadow"];
    ctx.lineWidth = 3;
    circle(b.at, b.radius * (0.6 + 0.8 * u));
    ctx.stroke();
    for (const bit of b.bits) {
      const along = bit.speed * b.age * (1 - 0.4 * u);
      const p = { x: b.at.x + Math.cos(bit.angle) * along, z: b.at.z + Math.sin(bit.angle) * along };
      const h = 4 * bit.up * u * (1 - u);
      ctx.fillStyle = c.paper;
      ctx.strokeStyle = c.ink;
      ctx.lineWidth = 1;
      circle(p, bit.size, h);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** A snowball with a stripe that turns as it rolls. */
function drawBall(
  ctx: CanvasRenderingContext2D,
  view: View,
  at: Vec2,
  height: number,
  radius: number,
  c: Palette,
  rolled: number,
  direction: Vec2,
) {
  const [x, y] = toScreen(view, at, height);
  const r = radius * view.s;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c.paper;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Two stripes across the roll direction, sliding over as it turns.
  const phase = rolled / Math.max(0.01, radius);
  for (const offset of [0, Math.PI]) {
    const front = Math.cos(phase + offset);
    const d = Math.sin(phase + offset) * r;
    const half = Math.sqrt(Math.max(0, r * r - d * d));
    const mx = x + direction.x * d;
    const my = y + direction.z * d;
    ctx.globalAlpha = front > 0 ? 0.55 : 0.12;
    ctx.strokeStyle = c["snow-shadow"];
    ctx.lineWidth = Math.max(1.5, r * 0.25);
    ctx.beginPath();
    ctx.moveTo(mx - direction.z * half, my + direction.x * half);
    ctx.lineTo(mx + direction.z * half, my - direction.x * half);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
