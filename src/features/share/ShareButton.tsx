"use client";

/**
 * A small hand-drawn share button in the bottom-left corner, out of the lane (the game's "Put it down" button
 * lives bottom-right). A tap opens the "invite a friend" sheet (`InviteSheet.tsx`); its "just share the game" line
 * shares the game itself:
 *
 * - Inside WeChat (`MicroMessenger` in the user agent): WeChat blocks sharing from a page without its JS-SDK, so
 *   it shows a paper note with an arrow to the top-right "···" menu.
 * - Browsers with the Web Share API: the system share sheet.
 * - Everywhere else: copies the link and says so.
 */
import { useCallback, useEffect, useState } from "react";

import { track } from "@/lib/analytics";

import { copy, isWeChat, systemShare } from "./actions";
import { SHARE } from "./content";
import { InviteSheet } from "./InviteSheet";
import { WeChatHint } from "./WeChatHint";

/** Wobbly circle and a paper plane, drawn once by hand as fixed paths (no generated shapes). */
const RING =
  "M20 2.6 C 30.2 2.2, 37.6 9.4, 37.4 19.6 C 37.2 29.8, 30.4 37.6, 20.2 37.4 C 9.6 37.6, 2.4 30.6, 2.6 20.4 C 2.4 10.2, 9.2 3.2, 19.4 2.4 C 21.8 2.2, 23.6 2.8, 24.6 3.4";
const PLANE = "M10.5 19.2 L 29.4 11.2 L 23.6 29.2 L 19.2 22.4 Z M 19.2 22.4 L 29.4 11.2";

export function ShareButton() {
  const [note, setNote] = useState<string | null>(null);
  const [wechatHint, setWechatHint] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), SHARE.button.copiedFor);
    return () => window.clearTimeout(id);
  }, [note]);

  /** Share the game itself (no invite). */
  const share = async () => {
    setSheet(false);
    if (isWeChat()) {
      setWechatHint(true);
      return;
    }
    const url = window.location.origin + "/";
    const result = await systemShare({ title: SHARE.title, text: SHARE.text, url });
    if (result === "unavailable") setNote((await copy(url)) ? SHARE.copied : SHARE.copyFailed);
  };
  const closeSheet = useCallback(() => setSheet(false), []);

  return (
    <>
      <style href="plop-share" precedence="default">{`
        .plop-share-btn { transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .plop-share-btn:active { transform: scale(0.9) rotate(-4deg); }
        .plop-share-glass {
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          background: color-mix(in oklab, var(--paper) 70%, transparent);
        }
        @keyframes plop-share-sheet-in {
          0% { transform: translateY(10px) scale(0.92) rotate(-2deg); opacity: 0; }
          70% { transform: translateY(-2px) scale(1.02) rotate(0.6deg); opacity: 1; }
          100% { transform: none; opacity: 1; }
        }
        .plop-share-sheet { animation: plop-share-sheet-in 260ms cubic-bezier(0.3, 1.3, 0.5, 1) both; transform-origin: 10% 100%; }
        @media (prefers-reduced-motion: reduce) {
          .plop-share-btn, .plop-share-btn:active { transition: none; transform: none; }
          .plop-share-sheet { animation: none; }
        }
      `}</style>

      <div
        className="fixed z-40 flex items-center gap-2"
        style={{
          left: "max(0.75rem, env(safe-area-inset-left))",
          bottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        {sheet && <InviteSheet onClose={closeSheet} onPlainShare={share} onNote={setNote} />}
        <button
          type="button"
          aria-label={SHARE.button.label}
          title={SHARE.button.label}
          aria-expanded={sheet}
          onClick={() => {
            if (!sheet) track("share_tapped");
            setSheet((v) => !v);
          }}
          className="plop-share-btn plop-share-glass relative size-10 rounded-full text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 40 40" className="absolute inset-0 size-full" aria-hidden>
            <path d={RING} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            <path
              d={PLANE}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {note && (
          <span role="status" className="plop-share-glass rounded-full px-3 py-1 font-heading text-lg text-ink">
            {note}
          </span>
        )}
      </div>

      {wechatHint && <WeChatHint onClose={() => setWechatHint(false)} />}
    </>
  );
}
