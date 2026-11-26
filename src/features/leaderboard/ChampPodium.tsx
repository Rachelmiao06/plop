"use client";

/**
 * #1 on top of the board: Rachel's sassy snowman (the one matching #1's snowman) on a little snow mound with a gentle
 * sway, the crown doodle and sparkles above, and the name, score and title below. When it appears (the board opens,
 * or someone new takes #1: give it a new `key`), the "deal with it" moment plays: sunglasses drop from above,
 * spinning a little, land on its face with a bounce, a glint flashes on the lens, it gives a smug little lift, and
 * an original jingle plays (when sound is on). With reduced motion the glasses are simply on. Numbers in `CHAMP`.
 */
import { useEffect, type CSSProperties } from "react";
import { CrownDoodle, StarDoodle } from "@/features/hud/Doodles";
import type { BoardEntry } from "./api";
import { lb } from "./boardStyles";
import { CHAMP, TEXT } from "./content";
import { playChampJingle } from "./jingle";
import { lookFor } from "./looks";
import { TitleLine } from "./TitleLine";
import type { TitleId } from "./titles";

export function ChampPodium({ entry, title, me }: { entry: BoardEntry; title?: TitleId; me: boolean }) {
  const look = lookFor(entry.name, entry.bestMode === "team");
  const { width, aspect, glassesAt, drop, art } = CHAMP;
  const height = width * aspect;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    playChampJingle();
  }, []);

  const vars = {
    "--lb-drop-delay": `${drop.delay}s`,
    "--lb-drop-fall": `${drop.fall + drop.bounce}s`,
    "--lb-drop-from": `${-drop.from}px`,
    "--lb-drop-spin": `${drop.spin}deg`,
    "--lb-glint-at": `${drop.glintAt}s`,
    "--lb-smug-at": `${drop.smugAt}s`,
    "--lb-sway-loop": `${CHAMP.sway.loop}s`,
    "--lb-sway-tilt": `${CHAMP.sway.tilt}deg`,
  } as CSSProperties;

  return (
    <figure className="relative mx-auto flex w-full flex-col items-center pt-2" style={vars} aria-label={TEXT.champ}>
      {/* The crown with sparkles, above the head. */}
      <div className="relative z-10 -mb-3 flex justify-center" aria-hidden>
        <span className={`block ${lb.crown}`}>
          <CrownDoodle size={40} />
        </span>
        {[
          { left: -16, top: 2, size: 12, delay: 0 },
          { left: 44, top: -6, size: 14, delay: 0.6 },
          { left: 50, top: 18, size: 9, delay: 1.2 },
        ].map((t, i) => (
          <span key={i} className={`absolute ${lb.twinkle}`} style={{ left: t.left, top: t.top, animationDelay: `${t.delay}s` }}>
            <StarDoodle size={t.size} />
          </span>
        ))}
      </div>

      {/* The snowman on its mound. */}
      <div className="relative" style={{ width: width * CHAMP.mound, height: height + 10 }} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow mound */}
        <img
          src="/assets/scenery/snow-mound.webp"
          alt=""
          width={width * CHAMP.mound}
          height={(width * CHAMP.mound * 179) / 380}
          className="absolute bottom-0 left-0 w-full select-none"
          draggable={false}
        />
        <div className={`absolute bottom-[14px] left-1/2 origin-bottom ${lb.sway}`} style={{ width, marginLeft: -width / 2 }}>
          <div className={`relative origin-bottom ${lb.smug}`} style={{ width, height }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's sassy snowman */}
            <img
              src={art.bare[look]}
              alt=""
              width={width}
              height={height}
              className="absolute inset-0 size-full select-none"
              style={{ filter: "drop-shadow(1px 3px 2px color-mix(in oklab, var(--ink) 20%, transparent))" }}
              draggable={false}
            />
            {/* The sunglasses: they fall onto the face and stay (or, with the stand-in art, fade onto the drawn ones). */}
            {/* eslint-disable-next-line @next/next/no-img-element -- the sunglasses piece */}
            <img
              src={art.glasses}
              alt=""
              width={width * glassesAt.width}
              className={`absolute select-none ${art.bareHasGlasses ? lb.dropFade : lb.dropKeep}`}
              style={{ left: `${glassesAt.left * 100}%`, top: `${glassesAt.top * 100}%`, width: `${glassesAt.width * 100}%` }}
              draggable={false}
            />
            {/* The glint on the right lens. */}
            <svg
              viewBox="0 0 20 20"
              width={16}
              height={16}
              className={`absolute overflow-visible ${lb.glint}`}
              style={{ left: `${(glassesAt.left + glassesAt.width * 0.72) * 100}%`, top: `${(glassesAt.top - 0.025) * 100}%` }}
            >
              <path
                d="M10 0.8 C10.9 6.6 13.4 9.1 19.2 10 C13.4 10.9 10.9 13.4 10 19.2 C9.1 13.4 6.6 10.9 0.8 10 C6.6 9.1 9.1 6.6 10 0.8 Z"
                fill="var(--snow-white)"
                stroke="var(--ink)"
                strokeWidth={1.1}
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <figcaption className="mt-1 flex flex-col items-center leading-tight">
        <span className={`font-heading text-xl text-ink-deep ${me ? "font-bold" : ""}`}>
          {entry.name}
          {me && <span className="ml-1 text-sm opacity-70">({TEXT.you})</span>}
        </span>
        <span className="font-heading text-3xl leading-none font-bold text-ink-deep tabular-nums">{entry.best}</span>
        {title && <TitleLine id={title} className="mt-1" />}
      </figcaption>
    </figure>
  );
}
