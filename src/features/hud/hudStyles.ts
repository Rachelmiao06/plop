/**
 * Score display motion and glass, as one small stylesheet the HUD renders itself.
 * (This project's Next config turns every .css file into plain global CSS, so
 * CSS modules do not work here; class names are prefixed "plop-hud-" instead.)
 * Colours are token variables only; durations come from content.ts via CSS variables.
 */
export const styles = {
  glass: "plop-hud-glass",
  enter: "plop-hud-enter",
  glow: "plop-hud-glow",
  pop: "plop-hud-pop",
  plusOne: "plop-hud-plusOne",
  burst: "plop-hud-burst",
  lines: "plop-hud-lines",
  toggle: "plop-hud-toggle",
  bump: "plop-hud-bump",
  gain: "plop-hud-gain",
  tag: "plop-hud-tag",
  card: "plop-hud-card",
  crown: "plop-hud-crown",
  pick: "plop-hud-pick",
} as const;

export const hudCss = `
/* Score display motion. Durations come from content.ts through inline CSS variables. */

/* Frosted glass: the snow behind is blurred and softened with paper white. */
.plop-hud-glass {
  -webkit-backdrop-filter: blur(var(--hud-blur)) saturate(1.15);
  backdrop-filter: blur(var(--hud-blur)) saturate(1.15);
  background: color-mix(in oklab, var(--paper) calc(var(--hud-tint) * 1%), transparent);
  box-shadow: 0 6px 18px -10px color-mix(in oklab, var(--snow-shadow) 90%, var(--ink));
}

/* Gentle hello when the panel appears. */
.plop-hud-enter {
  animation: plop-hud-enter 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-hud-enter {
  from {
    opacity: 0;
    transform: translateY(-14px) scale(0.96) rotate(-1deg);
  }
}

/* The active player's soft glow, breathing slowly. */
.plop-hud-glow {
  background: radial-gradient(circle, color-mix(in oklab, var(--butter) 85%, transparent) 0%, transparent 70%);
  animation: plop-hud-breathe 2.4s ease-in-out infinite;
}
@keyframes plop-hud-breathe {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.75;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

/* A total that just went up: shoots up tall, lands wide, springs back. Pivot at the bottom. */
.plop-hud-pop {
  animation: plop-hud-pop var(--hud-pop) cubic-bezier(0.3, 0.7, 0.4, 1);
  transform-origin: 50% 90%;
}
@keyframes plop-hud-pop {
  30% {
    transform: scale(0.85, 1.4) rotate(-6deg);
  }
  55% {
    transform: scale(1.25, 0.82) rotate(3deg);
  }
  78% {
    transform: scale(0.96, 1.06) rotate(-1deg);
  }
}

/* The bar when a "+1" drops into it: a small springy bump, kept to its own height. */
.plop-hud-bump {
  animation: plop-hud-bump var(--hud-bump) cubic-bezier(0.3, 0.7, 0.4, 1) both;
  transform-origin: 50% 100%;
}
@keyframes plop-hud-bump {
  0%,
  100% {
    transform: none;
  }
  25% {
    transform: scale(0.99, calc(1 - var(--hud-sq)));
  }
  55% {
    transform: scale(1.005, calc(1 + var(--hud-sq) * 0.6));
  }
  80% {
    transform: scale(1, calc(1 - var(--hud-sq) * 0.15));
  }
}

/* "+1" rising from the lane into the bar. It is centred on the bar's fill end (ProgressBar), lands there
   with a squash and sinks into the fill, so it never rises over the "N / 6 down" label (#50). */
.plop-hud-plusOne {
  animation: plop-hud-fly var(--hud-fly) cubic-bezier(0.22, 0.9, 0.3, 1) both;
  text-shadow:
    0 0 2px var(--paper),
    0 0 4px var(--paper),
    0 0 6px var(--paper);
}
@keyframes plop-hud-fly {
  0% {
    opacity: 0;
    transform: translate(var(--hud-dx), var(--hud-rise)) scale(0.6) rotate(-8deg);
  }
  20% {
    opacity: 1;
  }
  62% {
    transform: translate(0, -3px) scale(0.92, 1.18) rotate(4deg);
  }
  72% {
    opacity: 1;
    transform: translate(0, 0) scale(1.28, 0.78) rotate(2deg);
  }
  82% {
    opacity: 1;
    transform: translate(0, 0) scale(0.95, 1.08) rotate(-1deg);
  }
  100% {
    opacity: 0;
    transform: translate(0, 2px) scale(0.6);
  }
}

/* Full-clear burst: star pops, lines flick outward, then all fade. */
.plop-hud-burst {
  animation: plop-hud-burst var(--hud-burst) ease-out both;
}
@keyframes plop-hud-burst {
  0% {
    opacity: 0;
    transform: scale(0.2) rotate(-25deg);
  }
  25% {
    opacity: 1;
    transform: scale(1.15) rotate(6deg);
  }
  40% {
    transform: scale(0.95) rotate(-2deg);
  }
  75% {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
  100% {
    opacity: 0;
    transform: scale(1.05);
  }
}
.plop-hud-lines {
  animation: plop-hud-lines var(--hud-burst) ease-out both;
}
@keyframes plop-hud-lines {
  0% {
    opacity: 0;
    stroke-dashoffset: 10;
  }
  25% {
    opacity: 1;
    stroke-dashoffset: 0;
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* A throw's points flying up from the lane into the thrower's total: rises, lands squashed, sinks in. */
.plop-hud-gain {
  animation: plop-hud-gain var(--hud-gain) cubic-bezier(0.22, 0.9, 0.3, 1) both;
  text-shadow:
    0 0 2px var(--paper),
    0 0 4px var(--paper),
    0 0 7px var(--paper);
}
@keyframes plop-hud-gain {
  0% {
    opacity: 0;
    transform: translate(var(--hud-dx), var(--hud-rise)) scale(0.7) rotate(-6deg);
  }
  15% {
    opacity: 1;
    transform: translate(calc(var(--hud-dx) * 0.8), calc(var(--hud-rise) * 0.8)) scale(1.15) rotate(3deg);
  }
  60% {
    transform: translate(0, -4px) scale(0.95, 1.12) rotate(-2deg);
  }
  70% {
    opacity: 1;
    transform: translate(0, 0) scale(1.25, 0.8);
  }
  100% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
}

/* The round tag under the panel: a little hello each new round. */
.plop-hud-tag {
  animation: plop-hud-tag 520ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-hud-tag {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.8) rotate(-4deg);
  }
}

/* The start and end cards: drop in like a paper note. */
.plop-hud-card {
  animation: plop-hud-card 560ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-hud-card {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.92) rotate(-2deg);
  }
}

/* The winner's crown bobs a little. */
.plop-hud-crown {
  animation: plop-hud-crown 1.8s ease-in-out infinite;
  transform-origin: 50% 100%;
}
@keyframes plop-hud-crown {
  0%,
  100% {
    transform: translateY(0) rotate(-8deg);
  }
  50% {
    transform: translateY(-4px) rotate(4deg);
  }
}

/* A choice on the start card: springs when picked. */
.plop-hud-pick {
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.plop-hud-pick:active {
  transform: scale(0.94) rotate(-2deg);
}

/* A little wiggle on toggle buttons when pressed. */
.plop-hud-toggle:active {
  transform: scale(0.9) rotate(-4deg);
}
.plop-hud-toggle {
  transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: reduce) {
  .plop-hud-enter,
  .plop-hud-glow,
  .plop-hud-pop,
  .plop-hud-bump,
  .plop-hud-toggle,
  .plop-hud-toggle:active,
  .plop-hud-tag,
  .plop-hud-card,
  .plop-hud-crown,
  .plop-hud-pick,
  .plop-hud-pick:active {
    animation: none;
    transition: none;
    transform: none;
  }
  /* Still show what happened, just without movement. */
  .plop-hud-plusOne {
    animation: plop-hud-fade var(--hud-fly) ease-out both;
  }
  .plop-hud-gain {
    animation: plop-hud-fade var(--hud-gain) ease-out both;
  }
  .plop-hud-burst,
  .plop-hud-lines {
    animation: plop-hud-fade var(--hud-burst) ease-out both;
  }
}
@keyframes plop-hud-fade {
  0%,
  100% {
    opacity: 0;
  }
  15%,
  70% {
    opacity: 1;
  }
}
`;
