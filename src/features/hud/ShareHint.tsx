"use client";

/**
 * The first time the home screen shows after a player's first finished match: a sketchy hand-drawn arrow and a
 * few handwritten words floating beside it, "invite your friend", pointing at the round share button in the
 * bottom-left corner. No box behind the words, no tutorial card (Rachel): only a soft paper-white halo, so they read
 * on the snow. It shows once (remembered on this device) and any tap hides it; the tap still reaches what
 * was tapped, the share button included. Reduced motion: drawn still. Words and numbers: `content.shareHint`.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { content } from "./content";
import { hudCss, styles } from "./hudStyles";
import { pencilCurveStrokes } from "./pencil";

const h = content.shareHint;

function read(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function remember(key: string) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // not remembered, that's all
  }
}

/** Remember that a match was finished on this device (the hint waits for that). */
export function rememberPlayed() {
  remember(h.playedKey);
}

/** Shows the hint when this device has finished a match and has not seen it yet. Put it on the home screen. */
export function ShareHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!read(h.playedKey) || read(h.seenKey)) return;
    remember(h.seenKey);
    // Storage is read after mounting (the server knows nothing about this device).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
    const hide = () => setShow(false);
    window.addEventListener("pointerdown", hide, { capture: true });
    window.addEventListener("keydown", hide, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", hide, { capture: true });
      window.removeEventListener("keydown", hide, { capture: true });
    };
  }, []);

  const { width: W, height: H, stroke } = h.arrow;
  // From the note's corner, curling down to just above the button's middle; then two short strokes for the head.
  const lines = useMemo(() => {
    const tip = { x: 20, y: H - 4 };
    return [
      ...pencilCurveStrokes({ x: W - 6, y: 12 }, { x: W * 0.35, y: 0 }, { x: 8, y: H * 0.35 }, tip, 11, stroke, { wobble: 1.4 }),
      ...pencilCurveStrokes(tip, { x: 16, y: H - 9 }, { x: 11, y: H - 13 }, { x: 7, y: H - 17 }, 23, stroke * 0.95, { wobble: 0.5, step: 3 }),
      ...pencilCurveStrokes(tip, { x: 25, y: H - 9 }, { x: 30, y: H - 11 }, { x: 35, y: H - 13 }, 37, stroke * 0.95, { wobble: 0.5, step: 3 }),
    ];
  }, [W, H, stroke]);

  if (!show) return null;
  const vars = { "--hud-hint-pop": `${h.popMs}ms`, "--hud-hint-nudge": `${h.nudgeMs}ms`, "--hud-hint-delay": `${h.delay}ms` } as CSSProperties;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed z-[45]"
      style={{
        ...vars,
        // The share button: 40 px round, bottom-left (share/ShareButton.tsx). The arrow's tip lands just above it.
        left: "max(0.75rem, env(safe-area-inset-left))",
        bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 44px)",
      }}
    >
      <style href="plop-hud" precedence="default">
        {hudCss}
      </style>
      <svg width={W} height={H} className={`block overflow-visible text-ink-deep ${styles.hintArrow}`} aria-hidden>
        {lines.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={s.width} opacity={s.opacity} />
        ))}
      </svg>
      {/* Just the words, doodled onto the scene: no card, border or background, a paper-white halo to read on snow. */}
      <p
        role="status"
        className={`absolute bottom-full whitespace-nowrap font-heading text-2xl leading-tight font-bold text-ink-deep ${styles.hint}`}
        style={{
          left: W - 14,
          marginBottom: -H * 0.18,
          textShadow:
            "0 0 2px var(--paper), 0 0 4px var(--paper), 0 0 8px var(--paper), 0 0 14px color-mix(in oklab, var(--paper) 70%, transparent)",
        }}
      >
        {h.note}
      </p>
    </div>
  );
}
