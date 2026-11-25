"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { content, type SnowmanLook } from "./content";
import { CornerToggles } from "./CornerToggles";
import { CrownDoodle, PencilFrame, SnowmanFace } from "./Doodles";
import { ProgressBar } from "./ProgressBar";
import { hudCss, styles } from "./hudStyles";

export type HudPlayer = {
  name: string;
  total: number;
  look: SnowmanLook;
};

export type KnockEvent = {
  /** Change this for every new knock-down so the "+1"s fly again. */
  id: number;
  /** How many cut-outs fell. */
  count: number;
};

/** A throw's points flying into a player's total. */
export type GainEvent = {
  /** Change this for every throw so it flies again. */
  id: number;
  player: 0 | 1;
  points: number;
};

export type ScoreHudProps = {
  players: readonly [HudPlayer, HudPlayer];
  /** Whose turn it is: 0 = left, 1 = right. */
  active: 0 | 1;
  /** Cut-outs down in the current set, and how many the set has. */
  down: number;
  total: number;
  /** The latest knock-down. Each new id sends that many "+1"s into the bar. */
  knock?: KnockEvent | null;
  /** Hide the panel (the corner toggles stay). Leave out to let the eye toggle manage it. */
  hidden?: boolean;
  onHiddenChange?: (hidden: boolean) => void;
  /** Show the music and sound-effect switches in the corner (default true). */
  showAudioToggles?: boolean;
  /** In a match: "round 2 / 3" on a small tag under the panel. */
  round?: { now: number; of: number } | null;
  /** The latest throw's points: they fly up into that player's total, which then counts up. */
  gain?: GainEvent | null;
  /** Playing alone: the right side shows this best total (null = no best yet) instead of a second player. */
  soloBest?: number | null;
};

/**
 * The total as shown: it waits for a flying gain to land before it changes (and changes at once otherwise,
 * for example back to 0 for a new match).
 */
function useLandedTotal(total: number, gain: GainEvent | null | undefined, me: 0 | 1) {
  const [shown, setShown] = useState(total);
  const seen = useRef<number | null>(gain?.id ?? null);
  useEffect(() => {
    const fresh = gain && gain.id !== seen.current && gain.player === me && total > shown;
    if (gain) seen.current = gain.id;
    if (!fresh) {
      setShown(total);
      return;
    }
    const t = setTimeout(() => setShown(total), content.gain.duration * content.gain.landAt);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` is read only to compare, not to re-run
  }, [total, gain, me]);
  return shown;
}

/** Playing alone: the right side keeps your best total, with a little crown. */
function SoloBest({ best }: { best: number | null }) {
  return (
    <div className="flex shrink-0 flex-col items-center leading-none text-ink">
      <CrownDoodle size={26} />
      <span className="font-heading text-base">{content.text.soloBest}</span>
      <span className="font-heading text-2xl font-bold tabular-nums">{best ?? "–"}</span>
    </div>
  );
}

function PlayerScore({
  player,
  active,
  side,
  gain,
}: {
  player: HudPlayer;
  active: boolean;
  side: "left" | "right";
  gain?: GainEvent | null;
}) {
  const me = side === "left" ? 0 : 1;
  const total = useLandedTotal(player.total, gain, me);
  const flying = gain && gain.player === me && gain.points > 0 ? gain : null;
  return (
    <div className={`relative flex shrink-0 items-center gap-1.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
      {flying && (
        <span
          key={flying.id}
          aria-hidden
          className={`pointer-events-none absolute top-1 z-10 font-heading text-3xl font-bold text-ink-deep ${side === "left" ? "left-12" : "right-12"} ${styles.gain}`}
          style={
            {
              "--hud-gain": `${content.gain.duration}ms`,
              "--hud-rise": `${content.gain.rise}px`,
              "--hud-dx": side === "left" ? "60px" : "-60px",
            } as CSSProperties
          }
        >
          {content.text.gain(flying.points)}
        </span>
      )}
      <div className="relative grid size-10 place-items-center">
        {active && <div className={`absolute -inset-2.5 rounded-full ${styles.glow}`} />}
        <div className={`relative transition-transform duration-300 ${active ? "scale-110" : "scale-95 opacity-80"}`}>
          <SnowmanFace look={player.look} size={38} seed={side === "left" ? 3 : 8} />
        </div>
      </div>
      <span
        key={total}
        className={`inline-block min-w-[1.4ch] text-center font-heading text-3xl leading-none font-bold tabular-nums md:text-4xl ${
          active ? "text-ink-deep" : "text-ink"
        } ${total > 0 ? styles.pop : ""}`}
      >
        {total}
      </span>
    </div>
  );
}

/**
 * Floating score display. Props only: it shows the numbers it is given and
 * animates the changes; no game rules live here.
 */
export function ScoreHud({
  players,
  active,
  down,
  total,
  knock,
  hidden: hiddenProp,
  onHiddenChange,
  showAudioToggles = true,
  round,
  gain,
  soloBest,
}: ScoreHudProps) {
  const solo = soloBest !== undefined;
  const [hiddenState, setHiddenState] = useState(false);
  const hidden = hiddenProp ?? hiddenState;
  const setHidden = (h: boolean) => {
    setHiddenState(h);
    onHiddenChange?.(h);
  };

  const t = content.text;
  const color = content.looks[players[active].look].fill;
  const vars = {
    "--hud-blur": content.glass.blur,
    "--hud-tint": content.glass.tint,
    "--hud-pop": `${content.pop.duration}ms`,
  } as CSSProperties;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10" style={vars}>
      <style href="plop-hud" precedence="default">
        {hudCss}
      </style>
      <div className="absolute top-3 left-3">
        <CornerToggles hidden={hidden} onHiddenChange={setHidden} showAudio={showAudioToggles} />
      </div>

      {/* Phone: full width below the row of corner toggles and the scene's top-right buttons. Wider: centred at the top. */}
      <div className="flex justify-center px-3 pt-16 md:pt-3">
        {!hidden && (
          <section
            aria-label={t.panelLabel}
            className={`pointer-events-auto relative w-full max-w-md rounded-[var(--radius)] md:max-w-lg px-4 pt-2 pb-2.5 ${styles.glass} ${styles.enter}`}
          >
            <PencilFrame seed={17} radius={20} />
            <p className="sr-only" aria-live="polite">
              {round ? `${t.roundLabel(round.now, round.of)}. ` : ""}
              {t.set(down, total)}. {t.total(players[0].name, players[0].total)}.{" "}
              {solo ? "" : `${t.total(players[1].name, players[1].total)}. ${t.turn(players[active].name)}.`}
            </p>
            <div className="flex items-center gap-3">
              <PlayerScore player={players[0]} active={active === 0} side="left" gain={gain} />
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div aria-hidden className="font-heading text-lg leading-none text-ink">
                  <span className="font-bold text-ink-deep tabular-nums">{down}</span>
                  <span className="mx-0.5">/</span>
                  <span className="tabular-nums">{total}</span>
                  <span className="ml-1 text-base">{t.down}</span>
                </div>
                <ProgressBar down={down} total={total} color={color} knock={knock} />
              </div>
              {solo ? <SoloBest best={soloBest ?? null} /> : <PlayerScore player={players[1]} active={active === 1} side="right" gain={gain} />}
            </div>
            {round && (
              <div className="pointer-events-none absolute inset-x-0 -bottom-4 flex justify-center">
                <span
                  key={round.now}
                  className={`relative rounded-full px-3 py-0.5 font-heading text-base leading-tight text-ink ${styles.glass} ${styles.tag}`}
                  aria-label={t.roundLabel(round.now, round.of)}
                >
                  <PencilFrame seed={round.now * 5 + 2} radius={11} overshoot={4} />
                  {t.round(round.now, round.of)}
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
