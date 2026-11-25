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

/* A total that just went up. */
.plop-hud-pop {
  animation: plop-hud-pop var(--hud-pop) cubic-bezier(0.34, 1.8, 0.64, 1);
}
@keyframes plop-hud-pop {
  40% {
    transform: scale(1.35) rotate(-6deg);
  }
}

/* "+1" rising from the lane into the bar. */
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
  75% {
    opacity: 1;
    transform: translate(0, 0) scale(1.1) rotate(4deg);
  }
  100% {
    opacity: 0;
    transform: translate(0, -4px) scale(0.7);
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
  .plop-hud-toggle,
  .plop-hud-toggle:active {
    animation: none;
    transition: none;
    transform: none;
  }
  /* Still show what happened, just without movement. */
  .plop-hud-plusOne {
    animation: plop-hud-fade var(--hud-fly) ease-out both;
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
