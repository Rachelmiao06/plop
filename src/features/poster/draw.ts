/**
 * Draws the share poster on a canvas in the browser: white paper, snow dots, a pencil frame, "Plop!", Rachel's
 * snowmen and penguin (her files, never redrawn), the score line, the invite line, rounds and date, and a QR code to
 * the player's invite link. Fonts and images are loaded before anything is drawn. Browser only.
 */
import { POSTER } from "./content";
import { qrMatrix } from "./qr";

export type PosterPlayer = { name: string; look: "bucket" | "redHat"; total: number };

export type PosterData = {
  kind: "solo" | "versus" | "team";
  /** One player when alone, two otherwise. */
  players: readonly PosterPlayer[];
  rounds: number | null;
  /** The full invite link the QR code opens. */
  url: string;
  date: Date;
};

const { width: W, height: H } = POSTER.size;

type Ctx = CanvasRenderingContext2D;
type Colors = Record<keyof typeof POSTER.tokens, string>;

/** Small seeded random generator (mulberry32): the same poster always gets the same wobble and snow. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readColors(): Colors {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Colors;
  for (const [k, v] of Object.entries(POSTER.tokens)) out[k as keyof Colors] = css.getPropertyValue(v).trim();
  return out;
}

function headingFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(POSTER.fontVar).trim();
  return `${v || "Gaegu"}, ${POSTER.fontFallback}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`poster art failed to load: ${src}`));
    img.src = src;
  });
}

/** A rounded rectangle traced as a wobbly pencil line (a smooth seeded wander along the outline). */
function pencilRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, seed: number, color: string, width: number = POSTER.pencil.width) {
  const { wobble, step, secondPass } = POSTER.pencil;
  const pass = (s: number, lw: number, alpha: number, shift: number) => {
    const rand = seeded(s);
    const waves = [0.011, 0.027, 0.06].map((f, i) => ({ f: f * (0.8 + rand() * 0.4), p: rand() * 6.3, a: wobble * [0.7, 0.35, 0.18][i] }));
    const off = (d: number) => waves.reduce((sum, wv) => sum + Math.sin(d * wv.f + wv.p) * wv.a, 0);
    const pts: { x: number; y: number }[] = [];
    let dist = 0;
    const push = (px: number, py: number, nx: number, ny: number) => {
      const o = off(dist) + shift;
      pts.push({ x: px + nx * o, y: py + ny * o });
    };
    const line = (ax: number, ay: number, bx: number, by: number, nx: number, ny: number) => {
      const len = Math.hypot(bx - ax, by - ay);
      const n = Math.max(1, Math.round(len / step));
      for (let i = 0; i < n; i++, dist += len / n) push(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, nx, ny);
    };
    const arc = (cx: number, cy: number, from: number) => {
      const n = Math.max(2, Math.round((r * Math.PI) / 2 / step) + 1);
      for (let i = 0; i < n; i++, dist += (r * Math.PI) / 2 / n) {
        const a = from + (i / n) * (Math.PI / 2);
        push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.cos(a), Math.sin(a));
      }
    };
    line(x + r, y, x + w - r, y, 0, -1);
    arc(x + w - r, y + r, -Math.PI / 2);
    line(x + w, y + r, x + w, y + h - r, 1, 0);
    arc(x + w - r, y + h - r, 0);
    line(x + w - r, y + h, x + r, y + h, 0, 1);
    arc(x + r, y + h - r, Math.PI / 2);
    line(x, y + h - r, x, y + r, -1, 0);
    arc(x + r, y + r, Math.PI);
    // Overshoot past the start a little, like a hand closing the loop.
    pts.push(pts[0], pts[1], { x: pts[2].x + 2, y: pts[2].y - 1 });

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    // Weight varies along the stroke: draw in short runs with a slowly changing width.
    for (let i = 0; i < pts.length - 1; i += 3) {
      ctx.beginPath();
      ctx.lineWidth = lw * (0.78 + 0.32 * Math.sin(i * 0.21 + s));
      ctx.moveTo(pts[i].x, pts[i].y);
      for (let j = i; j < Math.min(i + 3, pts.length - 1); j++) {
        const mx = (pts[j].x + pts[j + 1].x) / 2;
        const my = (pts[j].y + pts[j + 1].y) / 2;
        ctx.quadraticCurveTo(pts[j].x, pts[j].y, mx, my);
      }
      ctx.lineTo(pts[Math.min(i + 3, pts.length - 1)].x, pts[Math.min(i + 3, pts.length - 1)].y);
      ctx.stroke();
    }
    ctx.restore();
  };
  pass(seed, width, 1, 0);
  pass(seed + 11, width * 0.55, secondPass, 2.2);
}

function snowDots(ctx: Ctx, color: string) {
  const { count, minR, maxR, seed } = POSTER.snow;
  const rand = seeded(seed);
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = 60 + rand() * (W - 120);
    const y = 60 + rand() * (H - 120);
    const r = minR + rand() ** 2 * (maxR - minR);
    ctx.globalAlpha = 0.55 + rand() * 0.45;
    ctx.beginPath();
    // A slightly squashed dot so it looks dabbed, not stamped.
    ctx.ellipse(x, y, r, r * (0.82 + rand() * 0.3), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** An image drawn by its width (height from its own shape), centred on (cx, cy), turned by `deg`. */
function art(ctx: Ctx, img: HTMLImageElement, cx: number, cy: number, width: number, deg = 0) {
  const h = (img.naturalHeight / img.naturalWidth) * width;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.drawImage(img, -width / 2, -h / 2, width, h);
  ctx.restore();
}

/** An image drawn by its height, its bottom centre at (cx, bottom). Returns its width. */
function standee(ctx: Ctx, img: HTMLImageElement, cx: number, bottom: number, height: number) {
  const w = (img.naturalWidth / img.naturalHeight) * height;
  ctx.drawImage(img, cx - w / 2, bottom - height, w, height);
  return w;
}

/** Centred text, shrunk until it fits `max` px wide. */
function text(ctx: Ctx, s: string, x: number, y: number, size: number, opts: { family: string; color: string; bold?: boolean; max?: number }) {
  const max = opts.max ?? W - 200;
  let px = size;
  const set = () => (ctx.font = `${opts.bold ? 700 : 400} ${px}px ${opts.family}`);
  set();
  while (ctx.measureText(s).width > max && px > 20) {
    px -= 2;
    set();
  }
  ctx.fillStyle = opts.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(s, x, y);
}

/** The QR code in deep ink on white, inside a pencil square, with a white quiet zone of 4 squares all round. */
function qr(ctx: Ctx, url: string, x: number, y: number, size: number, colors: Colors) {
  const m = qrMatrix(url);
  const n = m.length;
  const cell = Math.floor(size / (n + 8));
  const inner = cell * n;
  const ox = Math.round(x + (size - inner) / 2);
  const oy = Math.round(y + (size - inner) / 2);
  ctx.save();
  ctx.fillStyle = colors.page;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = colors.inkDeep;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (m[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell, cell);
  ctx.restore();
  pencilRect(ctx, x - 6, y - 6, size + 12, size + 12, 30, 41, colors.ink, 4.5);
}

/** Loads fonts and art, then draws the poster. Throws if the art cannot load (the sheet offers to try again). */
export async function drawPoster(data: PosterData): Promise<HTMLCanvasElement> {
  const family = headingFamily();
  const t = POSTER.text;
  const sample = `${t.title}${data.players.map((p) => p.name).join("")}0123456789 scored team wins`;
  await Promise.all([document.fonts.load(`700 120px ${family}`, sample), document.fonts.load(`400 60px ${family}`, sample)]);
  await document.fonts.ready;
  const a = POSTER.art;
  const [penguin, bucket, redHat, star, notes, ring, puff] = await Promise.all(
    [a.penguin, a.bucket, a.redHat, a.star, a.notes, a.ring, a.puff].map(loadImage),
  );
  const looks = { bucket, redHat };

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d canvas");
  const colors = readColors();
  const cx = W / 2;

  // Paper, snow, frame.
  ctx.fillStyle = colors.page;
  ctx.fillRect(0, 0, W, H);
  snowDots(ctx, colors.snow);
  pencilRect(ctx, 40, 40, W - 80, H - 80, 54, 5, colors.ink);

  // Title with her star and music notes.
  text(ctx, t.title, cx, 250, 210, { family, color: colors.ink, bold: true });
  art(ctx, star, 205, 135, 120, -14);
  art(ctx, notes, 880, 130, 140, 10);

  const [p1, p2] = data.players;
  if (data.kind === "solo") {
    const ground = 730;
    art(ctx, ring, 250, ground - 300, 130, -8);
    standee(ctx, looks[p1.look], cx - 40, ground, 450);
    art(ctx, penguin, 815, ground - 70, 270, -4);
    const line = t.solo(p1.name, p1.total);
    text(ctx, line, cx, 860, 96, { family, color: colors.inkDeep, bold: true });
  } else {
    const ground = 690;
    const xs = [cx - 235, cx + 235];
    standee(ctx, looks[p1.look], xs[0], ground, 370);
    standee(ctx, looks[p2.look], xs[1], ground, 370);
    art(ctx, penguin, cx, ground - 70, 200, -4);
    if (data.kind === "versus") {
      const winner = p1.total > p2.total ? 0 : p2.total > p1.total ? 1 : null;
      if (winner !== null) art(ctx, star, xs[winner] + 150, ground - 300, 90, 12);
      [p1, p2].forEach((p, i) => {
        text(ctx, p.name, xs[i], 750, 58, { family, color: colors.ink, max: 400 });
        text(ctx, String(p.total), xs[i], 850, 120, { family, color: colors.inkDeep, bold: true });
      });
      const head = winner === null ? t.tie : t.wins([p1, p2][winner].name);
      text(ctx, head, cx, 928, 64, { family, color: colors.berryDeep, bold: true });
    } else {
      art(ctx, star, xs[0] + 150, ground - 300, 80, -10);
      art(ctx, star, xs[1] + 150, ground - 300, 80, 12);
      const line = t.team(p1.name, p2.name, p1.total + p2.total);
      text(ctx, line, cx, 840, 88, { family, color: colors.inkDeep, bold: true });
    }
  }

  // The invite line.
  text(ctx, t.invite, cx, 1050, 66, { family, color: colors.inkDeep });

  // Bottom row: the QR code on the left; "scan to play", rounds and date, and a snow puff on the right.
  const q = 260;
  qr(ctx, data.url, 120, 1120, q, colors);
  const rx = 120 + q + (W - 120 - q - 120) / 2 + 20;
  text(ctx, t.scan, rx, 1200, 60, { family, color: colors.inkDeep, max: 480 });
  text(ctx, t.meta(data.rounds, data.date), rx, 1265, 38, { family, color: colors.ink, max: 480 });
  art(ctx, puff, rx + 120, 1338, 110, 8);

  return canvas;
}
