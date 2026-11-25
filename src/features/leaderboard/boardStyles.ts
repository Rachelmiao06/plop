/**
 * The board's little bit of motion, as one scoped stylesheet the components render themselves (this project's
 * Next config makes every .css file global, so CSS modules do not work; class names are prefixed "plop-lb-").
 * Token colours only; timings come from content.ts through CSS variables.
 */
export const lb = {
  note: "plop-lb-note",
  row: "plop-lb-row",
  input: "plop-lb-input",
} as const;

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
.plop-lb-row {
  animation: plop-lb-row 360ms cubic-bezier(0.34, 1.4, 0.64, 1) both;
  animation-delay: calc(var(--lb-i, 0) * 45ms);
}
@keyframes plop-lb-row {
  from { opacity: 0; transform: translateY(4px) rotate(var(--lb-tilt, 0deg)); }
  to { opacity: 1; transform: translateY(0) rotate(var(--lb-tilt, 0deg)); }
}
.plop-lb-input::placeholder { color: color-mix(in oklab, var(--ink) 45%, var(--paper)); }
.plop-lb-input:focus { outline: none; }
@media (prefers-reduced-motion: reduce) {
  .plop-lb-note, .plop-lb-row { animation: none; }
}
`;
