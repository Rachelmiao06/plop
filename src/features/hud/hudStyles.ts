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
  nameInput: "plop-hud-name",
  greet: "plop-hud-greet",
  chip: "plop-hud-chip",
  step: "plop-hud-step",
  howPin: "plop-hud-how-pin",
  howThrower: "plop-hud-how-thrower",
  howBall: "plop-hud-how-ball",
  howTouch: "plop-hud-how-touch",
  howKey: "plop-hud-how-key",
  stake: "plop-hud-stake",
  hint: "plop-hud-hint",
  hintArrow: "plop-hud-hint-arrow",
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

/* The active player's crayon halo (HaloDoodle inside), breathing slowly. */
.plop-hud-glow {
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

/* Full-clear burst: Rachel's star pops, her surprise lines spring up above it, then all fade. */
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
    transform: translateY(6px) scale(0.6);
  }
  25% {
    opacity: 1;
    transform: translateY(0) scale(1.08);
  }
  40% {
    transform: scale(1);
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

/* The name field: no browser outline, a soft butter crayon wash while typing. */
.plop-hud-name {
  outline: none;
  caret-color: var(--ink-deep);
}
.plop-hud-name:focus {
  background: color-mix(in oklab, var(--butter) 45%, transparent);
}

/* "小美 在等你": a gentle wave hello. */
.plop-hud-greet {
  animation: plop-hud-greet 2.6s 0.6s ease-in-out infinite;
  transform-origin: 50% 80%;
}
@keyframes plop-hud-greet {
  0%, 70%, 100% { transform: rotate(0deg); }
  78% { transform: rotate(-3deg) translateY(-1px); }
  86% { transform: rotate(2.5deg); }
  93% { transform: rotate(-1deg); }
}

/* The round's rule chip beside the round tag: hops in with each new round, then sits still. */
.plop-hud-chip {
  animation: plop-hud-chip 620ms 0.15s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes plop-hud-chip {
  from { opacity: 0; transform: translateY(-8px) scale(0.6) rotate(-8deg); }
  to { opacity: 1; transform: none; }
}

/* The guided start: each new card slides in softly (from the right going on, from the left going back). */
.plop-hud-step {
  animation: plop-hud-step var(--hud-slide-for) cubic-bezier(0.34, 1.3, 0.64, 1) both;
}
@keyframes plop-hud-step {
  from { opacity: 0; transform: translateX(var(--hud-slide)) rotate(0.6deg); }
  to { opacity: 1; transform: none; }
}

/* "How to throw", one loop: pull back (the ball grows behind the snowman), let go, roll, the friends tip over. */
.plop-hud-how-ball {
  animation: plop-hud-how-ball var(--hud-howto) ease-in-out infinite;
}
@keyframes plop-hud-how-ball {
  0% { opacity: 0; transform: translateY(-14px) scale(0.35); }
  6% { opacity: 1; transform: translateY(-14px) scale(0.35); }
  40% { transform: translateY(6px) scale(1); }
  43% { transform: translate(-1px, 6px) scale(1); }
  46% { transform: translate(1px, 6px) scale(1); }
  50% { transform: translateY(6px) scale(1); }
  66% { transform: translateY(-118px) scale(0.72); }
  86% { opacity: 1; transform: translateY(-122px) scale(0.7); }
  100% { opacity: 0; transform: translateY(-122px) scale(0.7); }
}
.plop-hud-how-thrower {
  animation: plop-hud-how-thrower var(--hud-howto) ease-in-out infinite;
}
@keyframes plop-hud-how-thrower {
  0%, 6% { transform: none; }
  40%, 50% { transform: rotate(-5deg) translateY(2px); }
  56% { transform: translateY(-7px) rotate(2deg); }
  64%, 100% { transform: none; }
}
.plop-hud-how-pin {
  transform-origin: 50% 100%;
  animation: plop-hud-how-pin var(--hud-howto) ease-out infinite;
}
@keyframes plop-hud-how-pin {
  0%, 64% { transform: none; opacity: 1; }
  74% { transform: rotate(var(--hud-tip)) translateY(3px); }
  88% { transform: rotate(var(--hud-tip)) translateY(3px); opacity: 1; }
  94% { opacity: 0; }
  100% { transform: none; opacity: 1; }
}
.plop-hud-how-touch {
  animation: plop-hud-how-touch var(--hud-howto) ease-in-out infinite;
}
@keyframes plop-hud-how-touch {
  0%, 4% { opacity: 0; transform: translateY(-16px) scale(0.8); }
  8% { opacity: 1; transform: translateY(-16px) scale(1); }
  40%, 50% { opacity: 1; transform: translateY(8px); }
  56%, 100% { opacity: 0; transform: translateY(8px) scale(1.3); }
}
.plop-hud-how-key {
  animation: plop-hud-how-key var(--hud-howto) ease-in-out infinite;
}
@keyframes plop-hud-how-key {
  0%, 6% { transform: none; }
  9%, 50% { transform: translateY(2px) scale(0.94); background: color-mix(in oklab, var(--butter) 70%, transparent); border-radius: 8px; }
  53%, 100% { transform: none; }
}

/* A little wiggle on toggle buttons when pressed. */
.plop-hud-toggle:active {
  transform: scale(0.9) rotate(-4deg);
}
.plop-hud-toggle {
  transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* The invite's wager on the end card, no words: its emoji drops onto the loser's head and bounces (Rachel). */
.plop-hud-stake {
  animation: plop-hud-stake var(--hud-stake) cubic-bezier(0.3, 0, 0.4, 1) both;
  transform-origin: 50% 100%;
}
@keyframes plop-hud-stake {
  0% {
    opacity: 0;
    transform: translateY(calc(var(--hud-stake-drop) * -1)) scale(0.5) rotate(-18deg);
  }
  45% {
    opacity: 1;
    transform: translateY(2px) scale(1.18, 0.8) rotate(4deg);
  }
  62% {
    transform: translateY(-9px) scale(0.92, 1.08) rotate(-3deg);
  }
  80% {
    transform: translateY(0) scale(1.05, 0.95) rotate(1deg);
  }
  100% {
    opacity: 1;
    transform: rotate(var(--hud-stake-tilt));
  }
}

/* The first-time share hint: the note pops in, the arrow nudges toward the button now and then. */
.plop-hud-hint {
  animation: plop-hud-hint var(--hud-hint-pop) cubic-bezier(0.3, 1.4, 0.5, 1) var(--hud-hint-delay) both;
  transform-origin: 0% 100%;
}
@keyframes plop-hud-hint {
  from { opacity: 0; transform: translateY(8px) scale(0.6) rotate(-6deg); }
  to { opacity: 1; transform: rotate(-3deg); }
}
.plop-hud-hint-arrow {
  animation:
    plop-hud-hint-in var(--hud-hint-pop) ease-out var(--hud-hint-delay) both,
    plop-hud-hint-nudge var(--hud-hint-nudge) ease-in-out calc(var(--hud-hint-delay) + var(--hud-hint-pop)) infinite;
}
@keyframes plop-hud-hint-in {
  from { opacity: 0; }
}
@keyframes plop-hud-hint-nudge {
  0%, 60%, 100% { transform: translate(0, 0); }
  75% { transform: translate(-3px, 4px); }
}

@media (prefers-reduced-motion: reduce) {
  .plop-hud-hint {
    animation: none;
    transform: rotate(-3deg);
  }
  .plop-hud-hint-arrow {
    animation: none;
  }
  .plop-hud-stake {
    animation: none;
    transform: rotate(var(--hud-stake-tilt));
  }
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
  .plop-hud-pick:active,
  .plop-hud-greet,
  .plop-hud-chip,
  .plop-hud-step,
  .plop-hud-how-thrower,
  .plop-hud-how-pin,
  .plop-hud-how-touch,
  .plop-hud-how-key {
    animation: none;
    transition: none;
    transform: none;
  }
  /* How to throw, still: the pulled-back moment, the ball big behind the snowman. */
  .plop-hud-how-ball {
    animation: none;
    transform: translateY(6px);
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
