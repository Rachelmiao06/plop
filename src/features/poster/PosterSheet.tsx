"use client";

/**
 * The sheet that shows the finished poster as a plain `<img>` (a data URL, not a canvas, so WeChat's press-and-hold
 * "save image" works). Inside WeChat it says "长按保存，发给朋友" (no save button: WeChat blocks downloads); elsewhere a save button downloads the PNG, and a
 * share button hands the file to the system share sheet where the browser can share files.
 * Rendered into `document.body`, because the end card's frosted glass would trap a fixed overlay inside it.
 */
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isWeChat } from "@/features/share";

import { POSTER } from "./content";

const words = POSTER.sheet;

// Same hand-drawn edges as the invite sheet: a 100 x 100 box stretched to fit (strokes do not stretch).
const EDGE = "M4 5 C 30 2.5, 70 5.5, 96 3.5 C 98 35, 96 70, 97.5 96 C 70 98.5, 30 96, 3 97.5 C 4.5 70, 1.5 35, 4 5 Z";
const PILL = "M5 12 C 30 5, 70 7, 95 10 C 99 30, 99 70, 96 90 C 70 96, 30 95, 4 90 C 1 70, 1 30, 5 12 Z";

type Props = {
  /** The poster as a data URL, null while drawing. */
  src: string | null;
  failed: boolean;
  onRetry: () => void;
  onClose: () => void;
};

function Pill({ fill, onClick, href, download, children }: { fill: string; onClick?: () => void; href?: string; download?: string; children: React.ReactNode }) {
  const inner = (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        <path d={PILL} className={`${fill} stroke-ink`} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <span className="relative block leading-tight">{children}</span>
    </>
  );
  const cls =
    "plop-poster-btn relative block flex-1 px-4 py-2 text-center font-heading text-xl font-bold text-ink-deep outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return href ? (
    <a href={href} download={download} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function PosterSheet({ src, failed, onRetry, onClose }: Props) {
  const id = useId();
  const close = useRef<HTMLButtonElement>(null);
  const [wechat] = useState(isWeChat);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => close.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  // A file for the system share sheet, only where the browser says it can share one.
  useEffect(() => {
    if (!src || wechat || typeof navigator.canShare !== "function") return;
    let live = true;
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        const f = new File([b], words.file, { type: "image/png" });
        if (live && navigator.canShare({ files: [f] })) setFile(f);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [src, wechat]);

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "Plop!" });
    } catch {
      // closed or refused: the save button is still there
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/35 px-4 py-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style href="plop-poster" precedence="default">{`
        @keyframes plop-poster-in {
          0% { transform: translateY(14px) scale(0.92) rotate(-1.5deg); opacity: 0; }
          70% { transform: translateY(-2px) scale(1.02) rotate(0.5deg); opacity: 1; }
          100% { transform: none; opacity: 1; }
        }
        .plop-poster-sheet { animation: plop-poster-in 280ms cubic-bezier(0.3, 1.3, 0.5, 1) both; }
        .plop-poster-btn { transition: transform 160ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .plop-poster-btn:active { transform: scale(0.94) rotate(-1.5deg); }
        @keyframes plop-poster-wiggle { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .plop-poster-wait { animation: plop-poster-wiggle 900ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .plop-poster-sheet, .plop-poster-wait { animation: none; }
          .plop-poster-btn, .plop-poster-btn:active { transition: none; transform: none; }
        }
      `}</style>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="plop-poster-sheet relative flex max-h-full w-full max-w-sm flex-col px-6 pt-10 pb-9 text-ink"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d={EDGE} className="fill-snow-white stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
        <div className="relative flex min-h-0 flex-col items-center">
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label={words.close}
            className="absolute -top-3 -right-1 size-9 rounded-full font-heading text-3xl leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ×
          </button>
          <h2 id={`${id}-title`} className="pr-6 font-heading text-2xl leading-tight font-bold text-ink-deep">
            {words.title}
          </h2>

          <div className="mt-2 grid aspect-[3/4] max-h-[62dvh] w-full min-h-0 place-items-center">
            {src ? (
              // A real <img> with a data URL: what WeChat lets you press and hold to save.
              // eslint-disable-next-line @next/next/no-img-element -- generated data URL, must stay a plain img
              <img src={src} alt={words.alt} className="max-h-full max-w-full object-contain" />
            ) : failed ? (
              <button type="button" onClick={onRetry} className="font-heading text-xl underline decoration-wavy underline-offset-4">
                {words.failed}
              </button>
            ) : (
              <p role="status" className="plop-poster-wait font-heading text-xl">
                {words.drawing}
              </p>
            )}
          </div>

          {src &&
            (wechat ? (
              <p className="mt-3 text-center font-heading text-xl leading-tight font-bold text-ink-deep">
                {words.wechat}
              </p>
            ) : (
              <div className="mt-3 flex w-full gap-2">
                <Pill fill="fill-pine" href={src} download={words.file}>
                  {words.save}
                </Pill>
                {file && (
                  <Pill fill="fill-sky-blue" onClick={share}>
                    {words.share}
                  </Pill>
                )}
              </div>
            ))}
        </div>
      </section>
    </div>,
    document.body,
  );
}
