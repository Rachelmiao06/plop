/**
 * Colours and simple textures for the bowling stage, all from the design tokens
 * in `src/app/globals.css`. Placeholders only: real paper art replaces the thrower card.
 */
import { CanvasTexture, Color, SRGBColorSpace } from "three";

const TOKENS = ["paper", "ink", "skin", "snow-shadow", "sky-blue"] as const;
export type Token = (typeof TOKENS)[number];
export type Palette = Record<Token, Color> & { css: Record<Token, string>; handwriting: string };

/** Reads the token colours from the page (browser only). */
export function readPalette(): Palette {
  const root = getComputedStyle(document.documentElement);
  const css = Object.fromEntries(
    TOKENS.map((t) => [t, root.getPropertyValue(`--${t}`).trim()]),
  ) as Record<Token, string>;
  const colours = Object.fromEntries(TOKENS.map((t) => [t, new Color(css[t])])) as Record<Token, Color>;
  // Canvas needs a real font name, not a CSS variable.
  const handwriting = root.getPropertyValue("--font-gaegu").trim() || "cursive";
  return { ...colours, css, handwriting };
}

/** A tiny seeded wobble, so hand-drawn lines look the same every time. */
function wobbly(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s / 2147483647) * 2 - 1;
  };
}

/** A wobbly closed outline through the corners of a rounded box, like a pencil line. */
function pencilBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, seed: number) {
  const jitter = wobbly(seed);
  const points: [number, number][] = [];
  const corner = (cx: number, cy: number, from: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = from + (i / 6) * (Math.PI / 2);
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  ctx.beginPath();
  points.forEach(([px, py], i) => {
    const jx = px + jitter() * 2.2;
    const jy = py + jitter() * 2.2;
    if (i === 0) ctx.moveTo(jx, jy);
    else ctx.lineTo(jx, jy);
  });
  ctx.closePath();
}

/** Front of the placeholder thrower card: paper, a pencil outline and a handwritten label. */
export function throwerCardTexture(palette: Palette, label: string): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 464;
  const ctx = canvas.getContext("2d")!;
  const draw = () => {
    ctx.fillStyle = palette.css.paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = palette.css.ink;
    ctx.lineWidth = 5;
    pencilBox(ctx, 14, 14, 228, 436, 40, 7);
    ctx.stroke();
    ctx.fillStyle = palette.css.ink;
    ctx.textAlign = "center";
    ctx.font = `700 58px ${palette.handwriting}`;
    ctx.fillText(label, 128, 250);
    ctx.font = `400 34px ${palette.handwriting}`;
    ctx.fillText("(placeholder)", 128, 300);
  };
  draw();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // The handwriting font may still be loading; draw again once it is here.
  void document.fonts?.ready.then(() => {
    draw();
    texture.needsUpdate = true;
  });
  return texture;
}

/** A snowball skin: paper white with a few pale-blue pencil marks, so the roll shows. */
export function snowballTexture(palette: Palette): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = palette.css.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = palette.css["snow-shadow"];
  ctx.lineCap = "round";
  ctx.lineWidth = 6;
  const jitter = wobbly(3);
  for (let i = 0; i < 9; i++) {
    const x = ((i * 97) % 256) + jitter() * 10;
    const y = 18 + ((i * 41) % 92);
    ctx.beginPath();
    ctx.arc(x, y, 10 + Math.abs(jitter()) * 10, 0.3, 0.3 + 1.6 + jitter() * 0.5);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
