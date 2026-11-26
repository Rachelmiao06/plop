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
  pileIn: "plop-lb-pile-in",
  squash: "plop-lb-squash",
  oof: "plop-lb-oof",
  glow: "plop-lb-glow",
  target: "plop-lb-target",
  splat: "plop-lb-splat",
  splatWobble: "plop-lb-splat-wobble",
  hopOn: "plop-lb-hop-on",
  squashed: "plop-lb-squashed",
  sway: "plop-lb-sway",
  smug: "plop-lb-smug",
  dropFade: "plop-lb-drop-fade",
  dropKeep: "plop-lb-drop-keep",
  glint: "plop-lb-glint",
  twinkle: "plop-lb-twinkle",
  rowTap: "plop-lb-row-tap",
  stickerPop: "plop-lb-sticker-pop",
  dizzy: "plop-lb-dizzy",
  orbit: "plop-lb-orbit",
  dizzyFace: "plop-lb-dizzy-face",
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

/* The pile pops in from the bottom row up on first view. */
.plop-lb-pile-in {
  transform-origin: 50% 100%;
  animation: plop-lb-pile-in 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: var(--lb-pile-delay, 0s);
}
@keyframes plop-lb-pile-in {
  from { opacity: 0; transform: translateY(-14px) scale(0.86, 1.1); }
  55% { opacity: 1; transform: translateY(0) scale(1.06, 0.92); }
  to { opacity: 1; transform: none; }
}
/* Being stood on: the squash springs in (it waits for a climber to land; the delay is set by the pile). */
.plop-lb-squash { transition: transform 420ms cubic-bezier(0.34, 1.7, 0.64, 1); }
/* A squashed snowman's startled lines twitch now and then. */
.plop-lb-oof { animation: plop-lb-oof 2.4s ease-in-out infinite; transform-origin: 50% 100%; }
@keyframes plop-lb-oof {
  0%, 70%, 100% { transform: scale(1); opacity: 0.9; }
  78% { transform: scale(1.25); opacity: 1; }
  86% { transform: scale(0.95); }
}
/* Your glow breathes softly. */
.plop-lb-glow { animation: plop-lb-glow 3s ease-in-out infinite; }
@keyframes plop-lb-glow {
  0%, 100% { scale: 1; }
  50% { scale: 1.06; }
}

/* A friend you can throw at: a tiny lean towards you on hover, a ring on keyboard focus. */
.plop-lb-target > div { transition: translate 200ms cubic-bezier(0.34, 1.56, 0.64, 1), rotate 200ms cubic-bezier(0.34, 1.56, 0.64, 1), scale 160ms ease-out; }
.plop-lb-target:hover > div { translate: 0 -2px; rotate: -2deg; }
.plop-lb-target:active > div { scale: 0.96 1.03; }
.plop-lb-target:focus-visible { outline: 2px dashed var(--ink); outline-offset: 2px; border-radius: 12px; }

/* The "you got hit" note: the splat lands on the face a beat after the card pops in, and the snowman shivers. */
.plop-lb-splat { animation: plop-lb-splat 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both; }
@keyframes plop-lb-splat {
  from { opacity: 0; scale: 0.2; rotate: -20deg; }
  to { opacity: 1; scale: 1; rotate: -4deg; }
}
.plop-lb-splat-wobble { transform-origin: 50% 100%; animation: plop-lb-splat-wobble 600ms ease-out 0.5s both; }
@keyframes plop-lb-splat-wobble {
  0%, 100% { rotate: 0deg; }
  20% { rotate: -8deg; scale: 1.06 0.92; }
  45% { rotate: 6deg; scale: 0.97 1.03; }
  70% { rotate: -3deg; }
}

/* "X just passed you": they hop up from the side onto your head (0.4s in), and you get squashed as they land. */
.plop-lb-hop-on { animation: plop-lb-hop-on 900ms cubic-bezier(0.3, 0.7, 0.4, 1) 0.4s both; }
@keyframes plop-lb-hop-on {
  0% { translate: 70px 130px; rotate: 10deg; }
  45% { translate: 30px -50px; rotate: -6deg; }
  75% { translate: 0 0; scale: 1.08 0.9; rotate: 0deg; }
  88% { scale: 0.97 1.04; }
  100% { translate: 0 0; scale: 1 1; rotate: -3deg; }
}
.plop-lb-squashed { transform-origin: 50% 100%; animation: plop-lb-squashed 520ms cubic-bezier(0.34, 1.6, 0.64, 1) 1.05s both; }
@keyframes plop-lb-squashed {
  from { scale: 1 1; }
  40% { scale: 1.16 0.8; }
  to { scale: 1.08 0.88; }
}

/* #1's sassy snowman: a gentle idle sway on its mound. */
.plop-lb-sway { animation: plop-lb-sway var(--lb-sway-loop, 3.4s) ease-in-out infinite; }
@keyframes plop-lb-sway {
  0%, 100% { rotate: calc(var(--lb-sway-tilt, 2.5deg) * -1); }
  50% { rotate: var(--lb-sway-tilt, 2.5deg); }
}
/* "Deal with it": the sunglasses fall from above, spinning a little, and land with a bounce. Their resting state
   (no animation, reduced motion) is landed: on the face, or faded onto the drawn ones with the stand-in art. */
.plop-lb-drop-keep, .plop-lb-drop-fade {
  transform-origin: 50% 50%;
  animation: var(--lb-drop-name) var(--lb-drop-fall, 0.92s) linear var(--lb-drop-delay, 0.3s) both;
}
.plop-lb-drop-keep { --lb-drop-name: plop-lb-drop-keep; }
.plop-lb-drop-fade { --lb-drop-name: plop-lb-drop-fade; opacity: 0; }
@keyframes plop-lb-drop-keep {
  0% { translate: 0 var(--lb-drop-from, -150px); rotate: var(--lb-drop-spin, 28deg); opacity: 1; animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6); }
  66% { translate: 0 0; rotate: -4deg; scale: 1.12 0.86; animation-timing-function: ease-out; }
  80% { translate: 0 -7px; rotate: 2deg; scale: 0.97 1.04; animation-timing-function: ease-in; }
  92% { translate: 0 0; rotate: 0deg; scale: 1.03 0.97; }
  100% { translate: 0 0; rotate: 0deg; scale: 1 1; opacity: 1; }
}
@keyframes plop-lb-drop-fade {
  0% { translate: 0 var(--lb-drop-from, -150px); rotate: var(--lb-drop-spin, 28deg); opacity: 1; animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.6); }
  66% { translate: 0 0; rotate: -4deg; scale: 1.12 0.86; opacity: 1; animation-timing-function: ease-out; }
  80% { translate: 0 -7px; rotate: 2deg; scale: 0.97 1.04; opacity: 1; animation-timing-function: ease-in; }
  92% { translate: 0 0; rotate: 0deg; scale: 1.03 0.97; opacity: 1; }
  100% { translate: 0 0; rotate: 0deg; scale: 1 1; opacity: 0; }
}
/* The glint on the lens: pops and turns, then is gone. */
.plop-lb-glint { opacity: 0; animation: plop-lb-glint 520ms ease-out var(--lb-glint-at, 1.3s) both; }
@keyframes plop-lb-glint {
  0% { opacity: 0; scale: 0.2; rotate: 0deg; }
  35% { opacity: 1; scale: 1.25; rotate: 45deg; }
  100% { opacity: 0; scale: 0.6; rotate: 90deg; }
}
/* The smug little lift once the glasses are on (like an eyebrow raise, with the whole head). */
.plop-lb-smug { animation: plop-lb-smug 700ms ease-in-out var(--lb-smug-at, 1.45s) both; }
@keyframes plop-lb-smug {
  0%, 100% { translate: 0 0; rotate: 0deg; }
  25% { translate: 0 -6px; rotate: -4deg; }
  50% { translate: 0 -2px; rotate: 3deg; }
  75% { translate: 0 -4px; rotate: -1.5deg; }
}
/* Sparkles around the crown. */
.plop-lb-twinkle { animation: plop-lb-twinkle 1.8s ease-in-out infinite both; }
@keyframes plop-lb-twinkle {
  0%, 100% { opacity: 0.2; scale: 0.6; rotate: 0deg; }
  50% { opacity: 1; scale: 1.1; rotate: 30deg; }
}

/* A friend's row you can tap to throw at: a soft wash on hover, a little press. */
.plop-lb-row-tap { transition: background-color 160ms ease-out, scale 140ms ease-out; }
.plop-lb-row-tap:hover { background-color: color-mix(in oklab, var(--snow-shadow) 45%, transparent); }
.plop-lb-row-tap:active { scale: 0.985; }

/* A sticker popping in, like it was slapped on. */
.plop-lb-sticker-pop { animation: plop-lb-sticker-pop 420ms cubic-bezier(0.34, 1.7, 0.64, 1) both; }
@keyframes plop-lb-sticker-pop {
  from { opacity: 0; scale: 0.2; }
  60% { opacity: 1; scale: 1.2; }
  to { opacity: 1; scale: 1; }
}

/* "今日最惨": the dizzy avatar. The wind curl spins over the head, a star goes round, the face wobbles. */
.plop-lb-dizzy { animation: plop-lb-dizzy 1.6s linear infinite; }
@keyframes plop-lb-dizzy { from { rotate: 0deg; } to { rotate: 360deg; } }
.plop-lb-orbit { width: 0; height: 0; animation: plop-lb-dizzy 2.2s linear infinite; }
.plop-lb-dizzy-face { animation: plop-lb-dizzy-face 2.4s ease-in-out infinite; }
@keyframes plop-lb-dizzy-face {
  0%, 100% { rotate: -6deg; }
  50% { rotate: 6deg; }
}

.plop-lb-input::placeholder { color: color-mix(in oklab, var(--ink) 45%, var(--paper)); }
.plop-lb-input:focus { outline: none; }
@media (prefers-reduced-motion: reduce) {
  .plop-lb-note, .plop-lb-bob, .plop-lb-row, .plop-lb-crown, .plop-lb-podium, .plop-lb-star,
  .plop-lb-scribble, .plop-lb-pile-in, .plop-lb-oof, .plop-lb-glow, .plop-lb-splat, .plop-lb-splat-wobble, .plop-lb-hop-on, .plop-lb-squashed,
  .plop-lb-sway, .plop-lb-smug, .plop-lb-drop-keep, .plop-lb-drop-fade, .plop-lb-glint, .plop-lb-twinkle, .plop-lb-sticker-pop,
  .plop-lb-dizzy, .plop-lb-orbit, .plop-lb-dizzy-face { animation: none; }
  .plop-lb-squash { transition: none; }
}
`;
