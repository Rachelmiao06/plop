"use client";

/**
 * Inside WeChat, sharing from a page needs WeChat's JS-SDK (an Official Account), so we point at its own
 * top-right "···" menu instead: a curly hand-drawn arrow and a paper note. Tap anywhere to close.
 */
import type { ReactNode } from "react";

import { SHARE } from "./content";

type Props = {
  onClose: () => void;
  /** The big line. Default: `SHARE.wechat.hint`. */
  hint?: ReactNode;
  /** The small line. Default: `SHARE.wechat.small`. */
  small?: ReactNode;
};

export function WeChatHint({ onClose, hint = SHARE.wechat.hint, small = SHARE.wechat.small }: Props) {
  return (
    <button
      type="button"
      aria-label={SHARE.wechat.small}
      onClick={onClose}
      className="fixed inset-0 z-[60] cursor-default"
      style={{ background: "color-mix(in oklab, var(--ink) 25%, transparent)" }}
    >
      <style href="plop-wechat-hint" precedence="default">{`
        @keyframes plop-share-nudge { 0%,100% { transform: translate(0,0) } 50% { transform: translate(4px,-5px) } }
        .plop-share-arrow { animation: plop-share-nudge 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .plop-share-arrow { animation: none; } }
      `}</style>
      <svg viewBox="0 0 80 90" className="plop-share-arrow absolute top-2 right-5 w-16 text-paper" aria-hidden>
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
      <span className="absolute top-24 right-5 max-w-64 -rotate-2 rounded-3xl border-2 border-ink bg-paper px-5 py-3 text-left text-ink">
        <span className="block font-heading text-2xl leading-tight">{hint}</span>
        <span className="mt-1 block text-xs">{small}</span>
      </span>
    </button>
  );
}
