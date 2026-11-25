/**
 * The game's few styles, rendered as one small scoped `<style>` (this project's Next config makes every
 * `.css` file global, so CSS modules do not work; class names are prefixed "plop-game-").
 * Colours are token variables only; durations come from content.ts through CSS variables.
 */
export const styles = {
  root: "plop-game",
  note: "plop-game-note",
  wash: "plop-game-wash",
} as const;

export const gameCss = `
/*
 * The snow scene still shows its TEMPORARY press-test switch ("Look / Press") and its test hint on
 * every page. They are dev tools, so the home page hides them here. Wanted from snow-scene: drop the
 * temporary hook, or a prop to leave it out (see the game README).
 */
.plop-game [data-temp-hint],
.plop-game section > .absolute.top-3.right-3 > div:first-child {
  display: none;
}

/* A soft paper wash behind handwritten words, so they read on bright snow without a hard box. */
.plop-game-wash {
  background: radial-gradient(closest-side, color-mix(in oklab, var(--paper) 88%, transparent) 55%, transparent);
}

/* "Red Hat's turn!": pops in with a little overshoot, rests, fades. */
.plop-game-note {
  animation: plop-game-note var(--plop-note-for) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-game-note {
  0% { opacity: 0; transform: translateY(10px) scale(0.85) rotate(-3deg); }
  14% { opacity: 1; transform: translateY(0) scale(1.06) rotate(1deg); }
  24% { transform: scale(1) rotate(-1deg); }
  78% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px) scale(0.98) rotate(-1deg); }
}

@media (prefers-reduced-motion: reduce) {
  .plop-game-note { animation-timing-function: linear; }
}
`;
