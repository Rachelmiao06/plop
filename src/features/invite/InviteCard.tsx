"use client";

/**
 * The invite itself, in front of the evening scene: once the loading screen has cleared, Rachel's
 * mouse-with-a-letter hops in and an envelope drops in front of it. A tap (or, after a while, nothing) opens it:
 * the flap folds back, the seal pops, a soft bell rings (only after a tap: browsers allow sound after one),
 * and the card slides out and comes to the front: "{name} 邀请你来打一局雪仗", the score if one was shared,
 * and one big "接受挑战 / Play" button to the game. Chinese first, English beneath in small text.
 *
 * Hand-drawn bits (envelope, card edge, button edge) are fixed uneven paths in token colours, like the share
 * button's; the characters and the fairy lights are Rachel's cut-outs used as they are.
 */
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { useLoaded } from "@/features/loading";
import { SHARE, WeChatHint } from "@/features/share";
import { playStarHit, playTie, unlockAudio } from "@/lib/audio";

import { INVITE } from "./content";
import { gamePath, inviteDescription, inviteTitle, type Invite } from "./link";

type Stage = "waiting" | "arriving" | "closed" | "opening" | "open";

// Envelope, drawn in a 320 x 210 box. Slightly uneven on purpose.
const BODY =
  "M10 14 C 90 11, 200 16, 311 12 C 313 70, 309 140, 312 198 C 220 201, 110 196, 9 199 C 11 140, 7 70, 10 14 Z";
const POCKET =
  "M10 16 C 60 52, 112 92, 160 118 C 208 92, 262 50, 311 14 C 313 80, 309 140, 312 198 C 220 201, 110 196, 9 199 C 11 140, 7 80, 10 16 Z";
const FOLDS = "M10 198 C 58 168, 104 148, 146 128 M311 197 C 262 168, 216 148, 174 128";
const FLAP = "M10 14 C 60 46, 112 90, 160 117 C 208 90, 262 46, 311 12 C 220 9, 100 11, 10 14 Z";
const SEAL =
  "M160 94 C 167 93, 173 98, 174 105 C 177 110, 174 117, 169 120 C 166 125, 158 125, 153 122 C 147 120, 145 113, 147 107 C 147 100, 153 94, 160 94 Z";
// Card and button edges in a 100 x 100 box, stretched to fit (strokes do not stretch).
const EDGE = "M3 4 C 30 2, 70 5, 97 3 C 98.5 35, 96.5 70, 98 97 C 70 99, 30 96.5, 2 98 C 3.5 70, 1.5 35, 3 4 Z";
const STITCH = "M7 8.5 C 35 7, 65 9.5, 93 8 C 94 38, 92.5 68, 93.5 92 C 66 93.5, 34 91.5, 6.5 92.5 C 8 66, 5.5 36, 7 8.5 Z";
const PILL = "M6 10 C 30 4, 70 6, 94 9 C 99 30, 99 70, 95 90 C 70 96, 30 95, 5 91 C 1 70, 1 30, 6 10 Z";

const css = `
/* The scene's own corner buttons and help line: not on the invite. */
.plop-invite section > div.absolute, .plop-invite section > [data-temp-hint] { display: none; }
@keyframes plop-invite-hop-in {
  0% { transform: translateX(-70vw) translateY(0) rotate(-6deg); }
  20% { transform: translateX(-52vw) translateY(-18px) rotate(4deg); }
  40% { transform: translateX(-34vw) translateY(0) rotate(-4deg); }
  60% { transform: translateX(-17vw) translateY(-14px) rotate(4deg); }
  80% { transform: translateX(-2vw) translateY(0) rotate(-2deg); }
  90% { transform: translateX(0) translateY(-5px) rotate(1deg); }
  100% { transform: translateX(0) translateY(0) rotate(0); }
}
@keyframes plop-invite-drop {
  0% { transform: translateY(-46px) scale(0.86) rotate(-5deg); opacity: 0; }
  55% { transform: translateY(6px) scale(1.03) rotate(1.5deg); opacity: 1; }
  80% { transform: translateY(-3px) scale(0.99) rotate(-0.8deg); }
  100% { transform: translateY(0) scale(1) rotate(-1.5deg); opacity: 1; }
}
@keyframes plop-invite-wiggle {
  0%, 86%, 100% { transform: rotate(-1.5deg); }
  90% { transform: rotate(2deg); }
  94% { transform: rotate(-3deg); }
}
@keyframes plop-invite-flap {
  0% { transform: perspective(700px) rotateX(0deg); z-index: 4; }
  49% { z-index: 4; }
  51% { z-index: 1; }
  100% { transform: perspective(700px) rotateX(178deg); z-index: 1; }
}
@keyframes plop-invite-seal { 0% { transform: scale(1); opacity: 1; } 40% { transform: scale(1.25); } 100% { transform: scale(0); opacity: 0; } }
@keyframes plop-invite-peek { from { transform: translateY(0); } to { transform: translateY(-46%); } }
@keyframes plop-invite-sink { to { transform: translateY(40%) rotate(-4deg); opacity: 0; } }
@keyframes plop-invite-card {
  0% { transform: translateY(-6%) scale(0.62) rotate(-1.5deg); opacity: 0; }
  12% { opacity: 1; }
  60% { transform: translateY(0) scale(1.04) rotate(0.8deg); }
  80% { transform: scale(0.985) rotate(-0.6deg); }
  100% { transform: scale(1) rotate(-0.6deg); opacity: 1; }
}
@keyframes plop-invite-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
@keyframes plop-invite-twinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.plop-invite-btn { transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.plop-invite-btn:hover { transform: scale(1.04) rotate(-1deg); }
.plop-invite-btn:active { transform: scale(0.94) rotate(1deg); }
@media (prefers-reduced-motion: reduce) {
  .plop-invite * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  .plop-invite-btn, .plop-invite-btn:hover, .plop-invite-btn:active { transition: none; transform: none; }
}
`;

/** Chinese first, English beneath in small text. */
function Bi({ zh, en, className = "" }: { zh: ReactNode; en: ReactNode; className?: string }) {
  return (
    <span className={`block ${className}`}>
      <span className="block font-heading leading-tight">{zh}</span>
      <span className="mt-0.5 block font-sans text-xs opacity-80">{en}</span>
    </span>
  );
}

/** Puts the score, big and berry red, where `{score}` is. */
function withScore(text: string, score: number) {
  const [before, after] = text.split("{score}");
  return (
    <>
      {before}
      <strong className="mx-0.5 text-3xl font-bold text-berry-deep">{score}</strong>
      {after}
    </>
  );
}

/** Puts the bold name where `{name}` is. */
function withName(text: string, name: string) {
  const [before, after] = text.split("{name}");
  return (
    <>
      {before}
      <strong className="font-bold text-berry-deep">{name}</strong>
      {after}
    </>
  );
}

export function InviteCard({ name, score }: Invite) {
  const loaded = useLoaded();
  const [stage, setStage] = useState<Stage>("waiting");
  // The sender, just back from making this invite inside WeChat: show them where "···" is (read once, cleared below).
  const [sendHint, setSendHint] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage.getItem(SHARE.invite.sentKey) === "1";
    } catch {
      return false; // storage blocked: no hint, the card still works
    }
  });
  const timers = useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  // WeChat builds its chat card from the live page: make sure the title and description say who is inviting.
  useEffect(() => {
    document.title = inviteTitle(name);
    document.querySelector('meta[name="description"]')?.setAttribute("content", inviteDescription(score));
  }, [name, score]);

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(SHARE.invite.sentKey);
    } catch {
      // nothing to clear
    }
  }, []);

  // Once the paper loading screen has cleared: the mouse hops in, the envelope drops.
  useEffect(() => {
    if (!loaded || stage !== "waiting") return;
    const { mouseIn, envelopeIn } = INVITE.timing;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the entrance starts when the loading store says so
    setStage("arriving");
    later(() => setStage((s) => (s === "arriving" ? "closed" : s)), mouseIn + envelopeIn);
  }, [loaded, stage]);

  const open = useCallback((withSound: boolean) => {
    setStage((s) => {
      if (s !== "arriving" && s !== "closed") return s;
      const { flap, cardOut, bellAt } = INVITE.timing;
      if (withSound && unlockAudio()) {
        later(playTie, bellAt);
        later(playStarHit, flap + cardOut * 0.55);
      }
      later(() => setStage("open"), flap + cardOut * 0.5);
      return "opening";
    });
  }, []);

  // Nobody tapped: open by itself (silently: sound needs a tap).
  useEffect(() => {
    if (stage !== "closed") return;
    const id = window.setTimeout(() => open(false), INVITE.timing.autoOpen);
    return () => window.clearTimeout(id);
  }, [stage, open]);

  const { words, art, timing } = INVITE;
  const invite = name ? words.invite : words.inviteNoName;
  const shown = stage !== "waiting";
  const closedish = stage === "arriving" || stage === "closed";

  return (
    <div
      className="plop-invite absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-4 py-10 text-ink"
      onClick={closedish ? () => open(true) : undefined}
    >
      <style href="plop-invite" precedence="default">
        {css}
      </style>

      <div className="relative w-[min(86vw,380px)]" style={{ visibility: shown ? "visible" : "hidden" }}>
        {/* The envelope (until the card is out). */}
        {stage !== "open" && (
          <div
            className="relative mx-auto w-[min(80vw,330px)]"
            style={{
              aspectRatio: "320 / 210",
              animation:
                stage === "opening"
                  ? `plop-invite-sink ${timing.cardOut}ms ease-in ${timing.flap}ms forwards`
                  : stage === "closed"
                    ? "plop-invite-wiggle 3.2s ease-in-out infinite"
                    : `plop-invite-drop ${timing.envelopeIn}ms cubic-bezier(0.3, 1.4, 0.5, 1) ${timing.mouseIn * 0.55}ms both`,
            }}
          >
            <button
              type="button"
              aria-label={`${words.tapToOpen.zh} / ${words.tapToOpen.en}`}
              className="absolute inset-0 z-[5] rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                open(true);
              }}
            />
            <svg viewBox="0 0 320 210" className="absolute inset-0 z-[1] size-full" aria-hidden>
              <path
                d={BODY}
                className="stroke-ink"
                style={{ fill: "color-mix(in oklab, var(--paper) 72%, var(--snow-shadow))" }}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
            </svg>
            {/* The card peeking out as the flap opens. */}
            <div
              className="absolute inset-x-[9%] top-[10%] z-[2] h-[80%] rounded-md border-2 border-ink bg-paper"
              style={{
                animation:
                  stage === "opening"
                    ? `plop-invite-peek ${timing.cardOut * 0.6}ms cubic-bezier(0.3, 1.3, 0.5, 1) ${timing.flap * 0.8}ms forwards`
                    : undefined,
              }}
            >
              <span className="mt-[4%] block text-center font-heading text-2xl text-pine">❄</span>
            </div>
            <svg viewBox="0 0 320 210" className="absolute inset-0 z-[3] size-full" aria-hidden>
              <path d={POCKET} className="fill-paper stroke-ink" strokeWidth={2.4} strokeLinejoin="round" />
              <path d={FOLDS} fill="none" className="stroke-ink" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
            </svg>
            <div
              className="absolute inset-0 z-[4]"
              style={{
                transformOrigin: "50% 6.5%",
                animation:
                  stage === "opening" ? `plop-invite-flap ${timing.flap}ms cubic-bezier(0.5, 0, 0.3, 1) forwards` : undefined,
              }}
            >
              <svg viewBox="0 0 320 210" className="size-full overflow-visible" aria-hidden>
                <path d={FLAP} className="fill-paper stroke-ink" strokeWidth={2.4} strokeLinejoin="round" />
                <g
                  style={{
                    transformOrigin: "160px 109px",
                    animation: stage === "opening" ? `plop-invite-seal ${timing.flap * 0.6}ms ease-in forwards` : undefined,
                  }}
                >
                  <path d={SEAL} className="fill-berry stroke-berry-deep" strokeWidth={2} />
                  <circle cx={160} cy={109} r={7} fill="none" className="stroke-berry-deep" strokeWidth={1.4} strokeOpacity={0.7} />
                </g>
              </svg>
            </div>
          </div>
        )}

        {closedish && (
          <p className="mt-14 text-center text-ink-deep drop-shadow-[0_0_6px_var(--paper)]" aria-hidden>
            <Bi zh={words.tapToOpen.zh} en={words.tapToOpen.en} className="text-2xl" />
          </p>
        )}

        {/* The card. */}
        {stage === "open" && (
          <div
            className="relative mx-auto px-5 pt-16 pb-7 text-center"
            style={{ animation: `plop-invite-card ${timing.cardOut}ms cubic-bezier(0.3, 1.2, 0.5, 1) both` }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <path d={EDGE} className="fill-paper stroke-ink" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              <path
                d={STITCH}
                fill="none"
                className="stroke-pine"
                strokeWidth={1.6}
                strokeDasharray="5 6"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {/* Rachel's fairy lights strung across the top of the card. */}
            <Image
              src={art.lights.src}
              width={art.lights.width}
              height={art.lights.height}
              alt=""
              unoptimized
              className="pointer-events-none absolute -top-12 left-1/2 w-[72%] -translate-x-1/2 select-none"
              style={{ animation: "plop-invite-twinkle 2.6s ease-in-out infinite" }}
              draggable={false}
            />
            <h1 className="relative text-[1.6rem] text-balance sm:text-3xl">
              <Bi
                zh={name ? withName(invite.zh, name) : invite.zh}
                en={name ? withName(invite.en, name) : invite.en}
                className="[&>span:last-child]:text-sm"
              />
            </h1>
            {score !== null && (
              <p className="relative mt-4 text-xl">
                <Bi
                  zh={withScore(words.score.zh, score)}
                  en={words.score.en.replace("{score}", String(score))}
                />
              </p>
            )}
            <Link
              href={gamePath(name)}
              className="plop-invite-btn relative mx-auto mt-6 block w-[min(70vw,250px)] px-6 py-3 text-ink-deep outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
                <path d={PILL} className="fill-pine stroke-ink" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
              <Bi zh={words.play.zh} en={words.play.en} className="relative text-4xl font-bold" />
            </Link>
          </div>
        )}

        {/* Rachel's mouse, who brought the letter. */}
        {shown && (
          <div
            className="pointer-events-none absolute -bottom-8 -left-6 z-20 w-[34%] max-w-36 sm:-left-16"
            style={{
              animation:
                stage === "arriving"
                  ? `plop-invite-hop-in ${timing.mouseIn}ms cubic-bezier(0.4, 0, 0.4, 1) both`
                  : "plop-invite-bob 2.4s ease-in-out infinite",
            } as CSSProperties}
          >
            <Image
              src={art.mouse.src}
              width={art.mouse.width}
              height={art.mouse.height}
              alt=""
              priority
              unoptimized
              className="h-auto w-full select-none"
              draggable={false}
            />
          </div>
        )}
      </div>

      {sendHint && stage === "open" && (
        <WeChatHint onClose={() => setSendHint(false)} hint={words.sendHint.zh} small={words.sendHint.en} />
      )}
    </div>
  );
}
