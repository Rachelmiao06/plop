/**
 * The game's few styles, rendered as one small scoped `<style>` (this project's Next config makes every
 * `.css` file global, so CSS modules do not work; class names are prefixed "plop-game-").
 * Colours are token variables only; durations come from content.ts through CSS variables.
 */
export const styles = {
  root: "plop-game",
  note: "plop-game-note",
  wash: "plop-game-wash",
  rule: "plop-game-rule",
  ruleArt: "plop-game-rule-art",
  ruleStar: "plop-game-rule-star",
  result: "plop-game-result",
  marker: "plop-game-marker",
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

/* The round's rule card: the picture hops in, tilted like a paper cut-out; the star bobs over a star friend. */
.plop-game-rule-art {
  transform: rotate(var(--rule-tilt));
  transform-origin: 50% 100%;
  animation: plop-game-rule-hop var(--rule-pop, 0.55s) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-game-rule-hop {
  0% { opacity: 0; transform: translateY(18px) scale(0.6, 1.3) rotate(var(--rule-tilt)); }
  55% { opacity: 1; transform: translateY(0) scale(1.12, 0.88) rotate(var(--rule-tilt)); }
  100% { transform: rotate(var(--rule-tilt)); }
}
.plop-game-rule-star {
  animation: plop-game-rule-star 1.6s ease-in-out infinite;
}
@keyframes plop-game-rule-star {
  0%, 100% { transform: translateY(0) rotate(-10deg); }
  50% { transform: translateY(-5px) rotate(8deg) scale(1.08); }
}

/*
 * "N down!" says the round's rule outcome in big words: the pins' lines under the count ("Bunny still standing!
 * +2", "oops, the bunny fell", "Star friend down! +2") are drawn larger here. The words are the pins' (TEXT in
 * pins content); only their size is the game's. Wanted from pins: a size prop on <PinsPopup>, then this goes.
 */
.plop-game-result .flex-col > p {
  font-size: clamp(1.75rem, 5vw, 2.6rem);
  line-height: 1.05;
  margin-top: 0.15em;
}

/* The scene marker over the special card: a gentle bounce, a twinkle for the star. */
.plop-game-marker {
  pointer-events: none;
  animation: plop-game-marker var(--marker-for, 1.1s) ease-in-out infinite;
  transform-origin: 50% 100%;
}
@keyframes plop-game-marker {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  45% { transform: translateY(calc(var(--marker-bounce, 8px) * -1)) scale(0.96, 1.05); }
  62% { transform: translateY(0) scale(1.06, 0.94); }
  75% { transform: translateY(0) scale(1, 1); }
}
.plop-game-marker [data-twinkle] {
  animation: plop-game-twinkle 1.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
.plop-game-marker [data-twinkle="1"] { animation-delay: 0.45s; }
.plop-game-marker [data-twinkle="2"] { animation-delay: 0.9s; }
@keyframes plop-game-twinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.6); }
  50% { opacity: 1; transform: scale(1.1); }
}

@media (prefers-reduced-motion: reduce) {
  .plop-game-note { animation-timing-function: linear; }
  .plop-game-rule-art, .plop-game-rule-star, .plop-game-marker, .plop-game-marker [data-twinkle] { animation: none; }
}
`;
