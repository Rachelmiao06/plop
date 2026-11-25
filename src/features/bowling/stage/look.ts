/**
 * Colours for the bowling stage, all from the design tokens in `src/app/globals.css`.
 */
import { Color } from "three";

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
