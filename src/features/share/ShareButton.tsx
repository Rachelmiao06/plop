"use client";

/**
 * A small hand-drawn share button in the bottom-left corner, out of the lane (the game's "Put it down" button
 * lives bottom-right).
 *
 * - Inside WeChat (`MicroMessenger` in the user agent): WeChat blocks sharing from a page without its JS-SDK, so
 *   it shows a paper note with an arrow to the top-right "···" menu.
 * - Browsers with the Web Share API: the system share sheet.
 * - Everywhere else: copies the link and says so.
 */
import { useEffect, useState } from "react";

import { SHARE } from "./content";

const isWeChat = () => typeof navigator !== "undefined" && /MicroMessenger/i.test(navigator.userAgent);

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older webviews: the old textarea trick.
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** Wobbly circle and a paper plane, drawn once by hand as fixed paths (no generated shapes). */
const RING =
  "M20 2.6 C 30.2 2.2, 37.6 9.4, 37.4 19.6 C 37.2 29.8, 30.4 37.6, 20.2 37.4 C 9.6 37.6, 2.4 30.6, 2.6 20.4 C 2.4 10.2, 9.2 3.2, 19.4 2.4 C 21.8 2.2, 23.6 2.8, 24.6 3.4";
const PLANE = "M10.5 19.2 L 29.4 11.2 L 23.6 29.2 L 19.2 22.4 Z M 19.2 22.4 L 29.4 11.2";

export function ShareButton() {
  const [note, setNote] = useState<string | null>(null);
  const [wechatHint, setWechatHint] = useState(false);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), SHARE.button.copiedFor);
    return () => window.clearTimeout(id);
  }, [note]);

  const share = async () => {
    if (isWeChat()) {
      setWechatHint(true);
      return;
    }
    const url = window.location.origin + "/";
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE.title, text: SHARE.text, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // closed the sheet
      }
    }
    setNote((await copy(url)) ? SHARE.copied : SHARE.copyFailed);
  };

  return (
    <>
      <style href="plop-share" precedence="default">{`
        .plop-share-btn { transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .plop-share-btn:active { transform: scale(0.9) rotate(-4deg); }
        .plop-share-glass {
          -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
          background: color-mix(in oklab, var(--paper) 70%, transparent);
        }
        @keyframes plop-share-nudge { 0%,100% { transform: translate(0,0) } 50% { transform: translate(4px,-5px) } }
        .plop-share-arrow { animation: plop-share-nudge 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .plop-share-btn, .plop-share-btn:active { transition: none; transform: none; }
          .plop-share-arrow { animation: none; }
        }
      `}</style>

      <div
        className="fixed z-40 flex items-center gap-2"
        style={{
          left: "max(0.75rem, env(safe-area-inset-left))",
          bottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          aria-label={SHARE.button.label}
          title={SHARE.button.label}
          onClick={share}
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

      {wechatHint && (
        <button
          type="button"
          aria-label={SHARE.wechat.small}
          onClick={() => setWechatHint(false)}
          className="fixed inset-0 z-50 cursor-default"
          style={{ background: "color-mix(in oklab, var(--ink) 25%, transparent)" }}
        >
          <svg
            viewBox="0 0 80 90"
            className="plop-share-arrow absolute top-2 right-5 w-16 text-paper"
            aria-hidden
          >
            {/* a curly hand-drawn arrow up to WeChat's ··· menu */}
            <path
              d="M14 84 C 10 60, 22 40, 40 34 C 54 29, 62 22, 66 8"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <path
              d="M55 13 L 66.5 7 L 70 19.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="absolute top-24 right-5 max-w-60 -rotate-2 rounded-3xl border-2 border-ink bg-paper px-5 py-3 text-left text-ink">
            <span className="block font-heading text-2xl leading-tight">{SHARE.wechat.hint}</span>
            <span className="mt-1 block text-xs">{SHARE.wechat.small}</span>
          </span>
        </button>
      )}
    </>
  );
}
