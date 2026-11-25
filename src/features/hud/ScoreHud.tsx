"use client";

import { useState, type CSSProperties } from "react";
import { content, type SnowmanLook } from "./content";
import { CornerToggles } from "./CornerToggles";
import { PencilFrame, SnowmanFace } from "./Doodles";
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
};

function PlayerScore({ player, active, side }: { player: HudPlayer; active: boolean; side: "left" | "right" }) {
  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
      <div className="relative grid size-10 place-items-center">
        {active && <div className={`absolute -inset-2.5 rounded-full ${styles.glow}`} />}
        <div className={`relative transition-transform duration-300 ${active ? "scale-110" : "scale-95 opacity-80"}`}>
          <SnowmanFace look={player.look} size={38} seed={side === "left" ? 3 : 8} />
        </div>
      </div>
      <span
        key={player.total}
        className={`inline-block min-w-[1.4ch] text-center font-heading text-3xl leading-none font-bold tabular-nums md:text-4xl ${
          active ? "text-ink-deep" : "text-ink"
        } ${player.total > 0 ? styles.pop : ""}`}
      >
        {player.total}
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
}: ScoreHudProps) {
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
              {t.set(down, total)}. {t.total(players[0].name, players[0].total)}.{" "}
              {t.total(players[1].name, players[1].total)}. {t.turn(players[active].name)}.
            </p>
            <div className="flex items-center gap-3">
              <PlayerScore player={players[0]} active={active === 0} side="left" />
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div aria-hidden className="font-heading text-lg leading-none text-ink">
                  <span className="font-bold text-ink-deep tabular-nums">{down}</span>
                  <span className="mx-0.5">/</span>
                  <span className="tabular-nums">{total}</span>
                  <span className="ml-1 text-base">{t.down}</span>
                </div>
                <ProgressBar down={down} total={total} color={color} knock={knock} />
              </div>
              <PlayerScore player={players[1]} active={active === 1} side="right" />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
