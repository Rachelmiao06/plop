"use client";

/**
 * The guided start: one question per paper card, sliding softly from one to the next, the snow still showing
 * around it. A first-timer is told the ways to play before anything else:
 *
 *   who ("just me" / "with a friend") ─► how (friends only: take turns / at the same time) ─► names ─► how long
 *     ─► how to throw (first time on this device only) ─► the match
 *
 * A returning player gets one card, "welcome back", with last time's choices and one tap to play.
 * Props only: the game remembers the choices and starts the match; this shows and asks.
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { content, type SnowmanLook } from "./content";
import { PencilFrame, SnowmanFace } from "./Doodles";
import { styles } from "./hudStyles";
import { Card, NameField } from "./Match";

const t = content.text.start;

export type PlayMode = "turns" | "together";
export type StartChoice = { players: 1 | 2; mode: PlayMode; rounds: number };
type Words = string;
type Step = "again" | "how" | "setup" | "howto";

const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const m = window.matchMedia(coarseQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** A touch screen (no keys to show): "drag the snowman" instead of key pictures. */
function useTouch() {
  return useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
}

const thrower: Record<SnowmanLook, string> = {
  bucket: "/assets/scenery/thrower-bucket.webp",
  redHat: "/assets/scenery/thrower-redhat.webp",
};

/** Rachel's whole thrower cut-out (the faces in the panel are crops of the same art). */
function Thrower({ look, height, className = "" }: { look: SnowmanLook; height: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out, small and decorative
  return <img src={thrower[look]} alt="" draggable={false} className={`w-auto select-none ${className}`} style={{ height }} />;
}

function Title({ words }: { words: Words }) {
  return (
    <h2 className="font-heading text-2xl leading-tight text-ink">
      {words}
    </h2>
  );
}

/** A big friendly choice: a picture, the name and one line saying what it means (one language per line). */
function Choice({
  picked,
  onPick,
  picture,
  name,
  line,
  seed,
  tag,
  children,
}: {
  picked: boolean;
  onPick: () => void;
  picture: ReactNode;
  name: Words;
  line: Words;
  seed: number;
  /** A small chip after the name ("versus", "one team"). */
  tag?: Words;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      onClick={onPick}
      className={`relative flex w-full items-center gap-3 rounded-[calc(var(--radius)*1.2)] px-3 py-2.5 text-left transition-colors ${
        picked ? "bg-butter/55" : "bg-paper/70 hover:bg-butter/25"
      } ${styles.pick}`}
    >
      <PencilFrame seed={seed} radius={22} overshoot={picked ? 7 : 3} />
      <span className="relative flex w-[5.5rem] shrink-0 items-end justify-center">{picture}</span>
      <span className="relative min-w-0 flex-1">
        {/* The name and its chip each stay on one line (at 375 px they used to break apart). */}
        <span className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 font-heading text-xl leading-none text-ink ${picked ? "font-bold" : ""}`}>
          <span className="whitespace-nowrap">{name}</span>
          {tag && (
            <span className="shrink-0 rounded-full bg-butter/70 px-1.5 py-0.5 font-heading text-sm leading-none font-normal whitespace-nowrap text-ink">
              {tag}
            </span>
          )}
        </span>
        <span className="mt-1 block font-heading text-base leading-tight text-ink">{line}</span>
        {children}
      </span>
    </button>
  );
}

/** A little paper key with a pencil edge. */
function Key({ label, wide }: { label: string; wide?: boolean }) {
  return (
    <span
      className={`relative inline-grid h-6 place-items-center rounded-md bg-paper font-heading text-sm leading-none font-bold text-ink-deep ${
        wide ? "px-2.5" : "w-6"
      }`}
    >
      <PencilFrame seed={label.charCodeAt(0)} radius={6} overshoot={2} />
      <span className="relative">{label}</span>
    </span>
  );
}

/** One player's keys for "at the same time": the pull key on top, the slide keys below (like the keyboard). */
function KeyCluster({ look, keys }: { look: SnowmanLook; keys: { pull: string; slide: readonly string[] } }) {
  return (
    <span className="flex items-center gap-1">
      <SnowmanFace look={look} size={22} />
      <span className="flex flex-col items-center gap-0.5">
        <Key label={keys.pull} />
        <span className="flex gap-0.5">
          {keys.slide.map((k) => (
            <Key key={k} label={k} />
          ))}
        </span>
      </span>
    </span>
  );
}

/** A small pencil arrow from one snowman to the other: "then it's your turn". */
function TurnArrow() {
  return (
    <svg aria-hidden width="26" height="18" viewBox="0 0 26 18" className="mx-[-4px] mb-6 shrink-0 overflow-visible">
      <path d="M2 13 C 8 2, 17 2, 23 10" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18.5 9.5 L23.3 10.4 L23 5.6" fill="none" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The how-to picture, a short loop: the snowman pulls back (the snowball grows behind it), lets go, the ball rolls
 * up to three friends and they tip over. Reduced motion shows the pulled-back moment still.
 */
export function HowToPicture({ touch }: { touch: boolean }) {
  const vars = { "--hud-howto": `${content.flow.howToLoop}ms` } as CSSProperties;
  const pins = ["/assets/scenery/penguin-standing.webp", "/assets/scenery/girl-earmuffs.webp", "/assets/scenery/boy-snowman.webp"];
  return (
    <div aria-hidden className="relative mx-auto mt-2 h-44 w-56" style={vars}>
      <div className="absolute inset-x-0 top-0 flex items-end justify-center gap-1">
        {pins.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-outs as the little pins
          <img
            key={src}
            src={src}
            alt=""
            draggable={false}
            className={`h-11 w-auto select-none ${styles.howPin}`}
            style={{ "--hud-tip": `${(i - 1) * 50 || 60}deg` } as CSSProperties}
          />
        ))}
      </div>
      {/* The groove the ball will roll up: a faint dotted pencil line. */}
      <div className="absolute top-12 bottom-14 left-1/2 border-l-2 border-dotted border-ink/30" />
      <div className={`absolute bottom-9 left-1/2 -ml-6 origin-bottom ${styles.howThrower}`}>
        <Thrower look="bucket" height={64} />
      </div>
      <div className={`absolute bottom-3 left-1/2 -ml-4 size-8 ${styles.howBall}`}>
        <div className="relative size-full rounded-full bg-snow-white">
          <PencilFrame seed={23} radius={16} overshoot={3} />
        </div>
      </div>
      {touch ? (
        // A fingertip pressing the snowman and pulling back.
        <div className={`absolute bottom-6 left-1/2 ml-8 size-7 rounded-full bg-butter/60 ${styles.howTouch}`}>
          <PencilFrame seed={29} radius={14} overshoot={3} />
        </div>
      ) : (
        <div className={`absolute right-0 bottom-6 ${styles.howKey}`}>
          <Key label={t.space} wide />
        </div>
      )}
    </div>
  );
}

function HowToLines({ touch }: { touch: boolean }) {
  return (
    <ol className="mt-1 space-y-1.5 text-left">
      {t.howLines(touch).map((line, i) => (
        <li key={line} className="flex items-start gap-2">
          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-butter/70 font-heading text-base font-bold text-ink-deep">
            {i + 1}
          </span>
          <span className="font-heading text-lg leading-tight text-ink">{line}</span>
        </li>
      ))}
    </ol>
  );
}

/** A big sky-blue button. */
function BigButton({ words, onClick, ...rest }: { words: Words; onClick: () => void; autoFocus?: boolean }) {
  return (
    <Button
      size="lg"
      onClick={onClick}
      {...rest}
      className="mt-4 h-12 w-full rounded-full bg-sky-blue font-heading text-2xl leading-none font-bold text-ink-deep hover:bg-sky-blue/80"
    >
      {words}
    </Button>
  );
}

/** "How to throw" again, any time during play (the "?" in the corner). Closes on its button, Escape or a tap outside. */
export function HowToCard({ onClose }: { onClose: () => void }) {
  const touch = useTouch();
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <>
      <div className="absolute inset-0 z-20" onPointerDown={onClose} aria-hidden />
      <Card label={t.howTo} seed={61} wide>
        <Title words={t.howTo} />
        <HowToPicture touch={touch} />
        <HowToLines touch={touch} />
        <BigButton words={t.gotIt} onClick={onClose} autoFocus />
      </Card>
    </>
  );
}

export type StartFlowProps = {
  /** Round counts to offer (the first is the default). */
  lengths: readonly number[];
  /** What is picked when the cards open (an invite picks "just me"). */
  initial: StartChoice;
  /** Last time's choices on this device: a returning player starts on "welcome back". */
  last?: StartChoice | null;
  /** First time on this device: the "how to throw" link says "New here?". */
  howTo: boolean;
  /** About how many minutes a match of this choice takes. */
  minutes: (choice: StartChoice) => number;
  /** The names as typed ("" = skipped), each snowman's cute default, and the longest name allowed. */
  names: readonly [string, string];
  fallbacks: readonly [string, string];
  nameMax: number;
  onNames: (names: readonly [string, string]) => void;
  /** Arrived from a friend's invite: "小美 is waiting" on top of the first card. */
  greeting?: string | null;
  /** The mode as soon as it is picked, so the scene behind can already show one snowman or two. */
  onMode?: (mode: PlayMode) => void;
  onStart: (choice: StartChoice) => void;
};

/** A small choice in a row of two (the rounds): a soft pill, outlined in pencil when picked. */
function Pill({ picked, onPick, words, sub, seed }: { picked: boolean; onPick: () => void; words: Words; sub: Words; seed: number }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      onClick={onPick}
      className={`relative flex-1 rounded-full px-2 py-1.5 leading-none transition-colors ${
        picked ? "bg-butter/60" : "bg-paper/70 hover:bg-butter/25"
      } ${styles.pick}`}
    >
      <PencilFrame seed={seed} radius={22} overshoot={picked ? 6 : 3} />
      <span className={`relative block font-heading text-lg text-ink ${picked ? "font-bold" : ""}`}>
        {words} <span className="font-normal">· {sub}</span>
      </span>
    </button>
  );
}

/**
 * Before the first throw: two paper cards (Rachel, 2026-11-25: five steps was too rigid for a simple game).
 *
 *   how (take turns / at the same time; "just me" is a small option on top) ─► names, 3 or 5 rounds, "Let's roll!"
 *
 * Playing with a friend is the main case, so it is what the first card asks; "how to throw" is a link on the
 * second card (and the "?" during play). A returning player gets "welcome back" and one tap.
 */
export function StartFlow({
  lengths,
  initial,
  last,
  howTo,
  minutes,
  names,
  fallbacks,
  nameMax,
  onNames,
  greeting,
  onMode,
  onStart,
}: StartFlowProps) {
  const touch = useTouch();
  // An invite is a challenge: its own preselection ("just me") wins over last time's.
  const [choice, setChoice] = useState<StartChoice>(greeting ? initial : (last ?? initial));
  const [step, setStep] = useState<Step>(last && !greeting ? "again" : "how");
  const [dir, setDir] = useState<1 | -1>(1);
  const two = choice.players === 2;
  /** Highlight last time's (or a going-back) pick on the first card; a first-timer sees none picked. */
  const [known, setKnown] = useState(!!last);
  const path: Step[] = ["how", "setup"];
  const at = path.indexOf(step);

  // The scene behind follows the picks: one snowman, or two side by side for "at the same time".
  const mode: PlayMode = two ? choice.mode : "turns";
  useEffect(() => onMode?.(mode), [mode, onMode]);

  // Keyboard players land on the new card's first control (never scrolling the page, never on a phone's keyboard).
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (touch) return;
    box.current?.querySelector<HTMLElement>('input, [aria-checked="true"], button')?.focus({ preventScroll: true });
  }, [step, touch]);

  const go = (next: Step, d: 1 | -1 = 1) => {
    setDir(d);
    setStep(next);
  };
  const start = (c: StartChoice = choice) => onStart({ ...c, mode: c.players === 2 ? c.mode : "turns" });
  const pick = (patch: Partial<StartChoice>) => {
    setKnown(true);
    setChoice((c) => ({ ...c, ...patch }));
    go("setup");
  };
  const back = () =>
    step === "howto" ? go("setup", -1) : step === "setup" ? go("how", -1) : last && !greeting ? go("again", -1) : undefined;
  const canBack = step === "howto" || step === "setup" || (step === "how" && !!last && !greeting);

  let body: ReactNode;
  switch (step) {
    case "again": {
      const c = last ?? choice;
      const shown = (i: 0 | 1) => names[i] || fallbacks[i];
      const how = c.players === 1 ? t.solo : c.mode === "together" ? t.together : t.turns;
      const len = t.rounds(c.rounds);
      body = (
        <>
          <Title words={t.welcome} />
          <div className="mt-3 flex items-end justify-center gap-3">
            <span className="flex flex-col items-center">
              <Thrower look="bucket" height={72} />
              <span className="font-heading text-lg leading-tight text-ink">{shown(0)}</span>
            </span>
            {c.players === 2 && (
              <span className="flex flex-col items-center">
                <Thrower look="redHat" height={72} />
                <span className="font-heading text-lg leading-tight text-ink">{shown(1)}</span>
              </span>
            )}
          </div>
          <p className="mt-2 font-heading text-lg leading-tight text-ink">
            {how.name} · {len} · {t.minutes(minutes(c))}
          </p>
          <BigButton words={t.same} onClick={() => start(c)} />
          <button
            type="button"
            onClick={() => go("how")}
            className="mt-2 font-heading text-lg text-ink underline decoration-wavy underline-offset-4"
          >
            {t.change}
          </button>
        </>
      );
      break;
    }
    case "how":
      body = (
        <>
          {greeting && (
            <p className={`mb-1 font-heading text-2xl leading-tight font-bold text-berry-deep ${styles.greet}`}>
              {greeting}
            </p>
          )}
          {/* Playing alone: a small side option on top, not a step of its own (an invite's challenge has it marked). */}
          <button
            type="button"
            role="radio"
            aria-checked={(known || !!greeting) && !two}
            onClick={() => pick({ players: 1 })}
            className={`relative mx-auto mb-3 flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 ${
              (known || greeting) && !two ? "bg-butter/60" : "bg-paper/70 hover:bg-butter/25"
            } ${styles.pick}`}
          >
            <PencilFrame seed={11} radius={18} overshoot={4} />
            <span className="relative">
              <SnowmanFace look="bucket" size={26} />
            </span>
            <span className="relative font-heading text-base leading-none text-ink">{t.soloSide} →</span>
          </button>
          <Title words={t.how} />
          <div role="radiogroup" aria-label={t.how} className="mt-3 flex flex-col gap-2.5">
            <Choice
              picked={known && two && choice.mode === "turns"}
              onPick={() => pick({ players: 2, mode: "turns" })}
              picture={
                <span className="flex items-end">
                  <Thrower look="bucket" height={50} />
                  <TurnArrow />
                  <Thrower look="redHat" height={54} className="opacity-60" />
                </span>
              }
              name={t.turns.name}
              tag={t.turns.tag}
              line={t.turns.line}
              seed={19}
            />
            <Choice
              picked={known && two && choice.mode === "together"}
              onPick={() => pick({ players: 2, mode: "together" })}
              picture={
                <span className="flex items-end gap-1">
                  <Thrower look="bucket" height={54} />
                  <Thrower look="redHat" height={58} />
                </span>
              }
              name={t.together.name}
              tag={t.together.tag}
              line={touch ? t.together.lineTouch : t.together.line}
              seed={23}
            >
              {!touch && (
                <span className="mt-1.5 flex gap-3">
                  <KeyCluster look="bucket" keys={t.keys.left} />
                  <KeyCluster look="redHat" keys={t.keys.right} />
                </span>
              )}
            </Choice>
          </div>
        </>
      );
      break;
    case "setup": {
      const hint = two ? t.namesHint(fallbacks[0], fallbacks[1]) : t.nameHint(fallbacks[0]);
      const link = howTo ? t.howToFirst : t.howTo;
      body = (
        <>
          <Title words={two ? t.names : t.name} />
          <div className={`mt-3 flex gap-2.5 ${two ? "flex-col sm:flex-row" : "flex-col"}`}>
            <NameField
              look="bucket"
              value={names[0]}
              fallback={fallbacks[0]}
              max={nameMax}
              seed={3}
              size={40}
              onChange={(v) => onNames([v, names[1]])}
              onEnter={() => start()}
            />
            {two && (
              <NameField
                look="redHat"
                value={names[1]}
                fallback={fallbacks[1]}
                max={nameMax}
                seed={8}
                size={40}
                onChange={(v) => onNames([names[0], v])}
                onEnter={() => start()}
              />
            )}
          </div>
          <p className="mt-1.5 font-heading text-sm leading-tight text-ink">
            {hint}
          </p>
          <div role="radiogroup" aria-label={t.length} className="mt-3 flex gap-2">
            {lengths.map((n, i) => (
              <Pill
                key={n}
                picked={choice.rounds === n}
                onPick={() => setChoice((c) => ({ ...c, rounds: n }))}
                words={t.rounds(n)}
                sub={t.minutes(minutes({ ...choice, rounds: n }))}
                seed={29 + i}
              />
            ))}
          </div>
          <BigButton words={t.go} onClick={() => start()} />
          <button
            type="button"
            onClick={() => go("howto")}
            className="mt-2 font-heading text-base text-ink underline decoration-wavy underline-offset-4"
          >
            {link}
          </button>
        </>
      );
      break;
    }
    case "howto":
      body = (
        <>
          <Title words={t.howTo} />
          <HowToPicture touch={touch} />
          <HowToLines touch={touch} />
          <BigButton words={t.go} onClick={() => start()} />
        </>
      );
      break;
  }

  const vars = {
    "--hud-slide": `${dir * content.flow.slide}px`,
    "--hud-slide-for": `${content.flow.slideFor}ms`,
  } as CSSProperties;
  return (
    <Card label={t.label} seed={41} wide>
      <div className="relative flex h-7 items-center justify-between">
        {canBack ? (
          <button
            type="button"
            onClick={back}
            className="-ml-1 rounded-full px-2 py-0.5 font-heading text-base text-ink hover:bg-butter/30"
          >
            ← {t.back}
          </button>
        ) : (
          <span />
        )}
        {at >= 0 && (
          // Where you are: one snowball per step, the current one filled.
          <span role="img" aria-label={t.step(at + 1, path.length)} className="flex gap-1.5">
            {path.map((s, i) => (
              <span
                key={s}
                className={`size-2.5 rounded-full border-[1.5px] border-ink transition-colors ${i <= at ? "bg-ink" : "bg-snow-white"} ${i < at ? "opacity-50" : ""}`}
              />
            ))}
          </span>
        )}
      </div>
      <div ref={box} key={step} className={styles.step} style={vars}>
        {body}
      </div>
    </Card>
  );
}
