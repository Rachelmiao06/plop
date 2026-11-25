/**
 * The board's little bit of motion, as one scoped stylesheet the components render themselves (this project's
 * Next config makes every .css file global, so CSS modules do not work; class names are prefixed "plop-lb-").
 * Token colours only; timings come from content.ts through CSS variables (`motionVars`).
 */
import type { CSSProperties } from "react";
import { BOARD } from "./content";

export const lb = {
  note: "plop-lb-note",
  bob: "plop-lb-bob",
  row: "plop-lb-row",
  input: "plop-lb-input",
  crown: "plop-lb-crown",
  podium: "plop-lb-podium",
  star: "plop-lb-star",
  scribble: "plop-lb-scribble",
  hop: "plop-lb-hop",
} as const;

/** content.ts motion numbers as CSS variables; put them on the sheet. */
export function motionVars(): CSSProperties {
  const m = BOARD.motion;
  return {
    "--lb-crown-loop": `${m.crownLoop}s`,
    "--lb-crown-tilt": `${m.crownTilt}deg`,
    "--lb-crown-hop": `${-m.crownHop}px`,
    "--lb-podium-loop": `${m.podiumLoop}s`,
    "--lb-podium-tilt": `${m.podiumTilt}deg`,
    "--lb-star-loop": `${m.starLoop}s`,
    "--lb-star-tilt": `${m.starTilt}deg`,
    "--lb-star-swell": 1 + m.starSwell,
    "--lb-scribble-in": `${m.scribbleIn}s`,
    "--lb-hop-loop": `${m.meHopLoop}s`,
    "--lb-hop": `${-m.meHop}px`,
    "--lb-bob-loop": `${m.noteBobLoop}s`,
    "--lb-bob": `${-m.noteBob}px`,
  } as CSSProperties;
}

export const boardCss = `
.plop-lb-note {
  animation: plop-lb-note var(--lb-note-in, 0.5s) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transform-origin: 50% 100%;
}
@keyframes plop-lb-note {
  from { opacity: 0; transform: translateY(6px) scale(0.6) rotate(-6deg); }
  60% { opacity: 1; transform: translateY(-2px) scale(calc(1 + var(--lb-note-over, 0.12))) rotate(2deg); }
  to { opacity: 1; transform: translateY(0) scale(1) rotate(-1.5deg); }
}
/* The note's soft bob, on an inner span so it never fights the pop-in. */
.plop-lb-bob {
  display: inline-block;
  animation: plop-lb-bob var(--lb-bob-loop) ease-in-out var(--lb-note-in, 0.5s) infinite;
}
@keyframes plop-lb-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(var(--lb-bob)) rotate(1.5deg); }
}

.plop-lb-row {
  animation: plop-lb-row 360ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: calc(var(--lb-i, 0) * 45ms);
}
@keyframes plop-lb-row {
  from { opacity: 0; transform: translateY(4px) rotate(var(--lb-tilt, 0deg)); }
  to { opacity: 1; transform: translateY(0) rotate(var(--lb-tilt, 0deg)); }
}

/* The winner's crown: rocks on its base and hops a little at the top of each swing. */
.plop-lb-crown {
  transform-origin: 50% 100%;
  animation: plop-lb-crown var(--lb-crown-loop) ease-in-out infinite;
}
@keyframes plop-lb-crown {
  0%, 100% { transform: translateY(0) rotate(calc(var(--lb-crown-tilt) * -1)); }
  22% { transform: translateY(var(--lb-crown-hop)) rotate(calc(var(--lb-crown-tilt) * 0.2)); }
  30% { transform: translateY(0) scaleY(0.92) rotate(calc(var(--lb-crown-tilt) * 0.6)); }
  50% { transform: translateY(0) rotate(var(--lb-crown-tilt)); }
  72% { transform: translateY(var(--lb-crown-hop)) rotate(calc(var(--lb-crown-tilt) * -0.2)); }
  80% { transform: translateY(0) scaleY(0.92) rotate(calc(var(--lb-crown-tilt) * -0.6)); }
}

/* The #1 circle, like a sticker not quite stuck down. */
.plop-lb-podium {
  animation: plop-lb-podium var(--lb-podium-loop) ease-in-out infinite;
}
@keyframes plop-lb-podium {
  0%, 100% { transform: rotate(calc(var(--lb-podium-tilt) * -1)); }
  50% { transform: rotate(var(--lb-podium-tilt)); }
}

/* The title star twinkles. */
.plop-lb-star {
  display: inline-block;
  animation: plop-lb-star var(--lb-star-loop) ease-in-out infinite;
}
@keyframes plop-lb-star {
  0%, 100% { transform: rotate(calc(var(--lb-star-tilt) * -1)) scale(1); }
  40% { transform: rotate(var(--lb-star-tilt)) scale(var(--lb-star-swell)); }
  55% { transform: rotate(calc(var(--lb-star-tilt) * 0.5)) scale(1); }
}

/* Your row's crayon highlight is scribbled in from the left (on the outer svg: clip-path on its strokes does not draw in Chrome). */
.plop-lb-scribble {
  animation: plop-lb-scribble var(--lb-scribble-in) cubic-bezier(0.3, 0.7, 0.4, 1) both;
}
@keyframes plop-lb-scribble {
  from { clip-path: inset(-20% 100% -20% -2%); }
  to { clip-path: inset(-20% -2% -20% -2%); }
}

/* Your snowman's tiny happy hop now and then. */
.plop-lb-hop {
  display: inline-block;
  transform-origin: 50% 100%;
  animation: plop-lb-hop var(--lb-hop-loop) ease-in-out infinite;
}
@keyframes plop-lb-hop {
  0%, 62%, 100% { transform: translateY(0) scale(1, 1); }
  70% { transform: translateY(0) scale(1.06, 0.92); }
  78% { transform: translateY(var(--lb-hop)) scale(0.96, 1.05); }
  86% { transform: translateY(0) scale(1.04, 0.95); }
  92% { transform: translateY(0) scale(1, 1); }
}

.plop-lb-input::placeholder { color: color-mix(in oklab, var(--ink) 45%, var(--paper)); }
.plop-lb-input:focus { outline: none; }
@media (prefers-reduced-motion: reduce) {
  .plop-lb-note, .plop-lb-bob, .plop-lb-row, .plop-lb-crown, .plop-lb-podium, .plop-lb-star,
  .plop-lb-scribble, .plop-lb-hop { animation: none; }
}
`;
