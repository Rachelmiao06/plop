"use client";

/**
 * Inside the canvas: a gentle hand-drawn marker over the round's special card while the player aims, so the rule
 * card's picture can be found on the snow. A friend to leave alone (the bunny, the sleepy cat) gets a berry pencil
 * "don't" sign with a little arrow, bouncing; a star friend gets butter twinkles around its star; a soft mound gets
 * an arrow. Gone while the ball rolls and the cards fall (the pins are not "ready").
 *
 * Where the card stands comes from the pins' public layout (`setCentre`, `placeIn`, `moundsOf`) and the card's
 * height from the scenery manifest; the pins' behaviour is not touched.
 */
import { Html } from "@react-three/drei";
import { useMemo, useSyncExternalStore, type CSSProperties } from "react";

import { formationById, moundsOf, placeIn, setCentre, SPECIALS, type Pins } from "@/features/pins";
import { propSettings } from "@/features/scenery";
import { useSnow } from "@/features/snow-scene";

import { GAME } from "./content";
import { styles } from "./gameStyles";
import type { Game } from "./rules";
import { ruleFor } from "./RuleCard";

type Mark = { kind: "friend" | "star" | "mound"; at: [number, number, number] };

/** A slightly wobbly pencil line through points (fixed wobble, so it never shimmers). */
const ARROW = "M24 4 C 23.4 12, 24.8 19, 24 27";
const HEAD = "M16.5 20.5 C 19.5 23.5, 22 26, 24.2 28.6 C 26.4 25.8, 28.6 23.6, 31.8 20.2";
const SIGN = "M24 -14.5 C 31.5 -14.8, 36.6 -9.6, 36.4 -2.2 C 36.2 5.4, 30.8 10.2, 23.8 10.1 C 16.4 10, 11.4 4.6, 11.6 -2.6 C 11.9 -9.8, 17 -14.2, 24.6 -14.3";
const SLASH = "M15.6 -10.6 C 20.5 -6.2, 26.4 -0.2, 32.4 6.2";

function FriendSign({ size }: { size: number }) {
  return (
    <svg width={size} height={size * 1.05} viewBox="0 -17 48 50" className="overflow-visible">
      {/* A paper disc so the sign reads on snow and sky alike. */}
      <circle cx={24} cy={-2.2} r={12.4} fill="var(--paper)" />
      <path d={SIGN} fill="none" stroke="var(--berry-deep)" strokeWidth={2.6} strokeLinecap="round" />
      <path d={SLASH} fill="none" stroke="var(--berry-deep)" strokeWidth={2.4} strokeLinecap="round" />
      <path d={ARROW} transform="translate(0 9)" fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinecap="round" />
      <path d={HEAD} transform="translate(0 9)" fill="none" stroke="var(--ink)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownArrow({ size }: { size: number }) {
  return (
    <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 48 36" className="overflow-visible">
      <path d={ARROW} fill="none" stroke="var(--ink)" strokeWidth={2.6} strokeLinecap="round" />
      <path d={HEAD} fill="none" stroke="var(--ink)" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Four-point twinkles in butter with a pencil edge, around the star friend's star. */
function Twinkles({ size }: { size: number }) {
  const twinkle = (x: number, y: number, r: number, i: number) => (
    <path
      key={i}
      data-twinkle={i}
      d={`M${x} ${y - r} C ${x + r * 0.18} ${y - r * 0.18}, ${x + r * 0.18} ${y - r * 0.18}, ${x + r} ${y} C ${x + r * 0.18} ${y + r * 0.2}, ${x + r * 0.2} ${y + r * 0.18}, ${x} ${y + r} C ${x - r * 0.2} ${y + r * 0.2}, ${x - r * 0.18} ${y + r * 0.2}, ${x - r} ${y} C ${x - r * 0.2} ${y - r * 0.18}, ${x - r * 0.2} ${y - r * 0.2}, ${x} ${y - r} Z`}
      fill="var(--butter)"
      stroke="var(--ink)"
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
  );
  return (
    <svg width={size * 1.5} height={size} viewBox="0 0 72 48" className="overflow-visible">
      {twinkle(10, 14, 7, 0)}
      {twinkle(62, 10, 8, 1)}
      {twinkle(58, 40, 5.5, 2)}
    </svg>
  );
}

export function RuleMarker({ game, pins }: { game: Game; pins: Pins }) {
  const snow = useSnow();
  const { phase, round } = useSyncExternalStore(game.subscribe, game.getState, game.getState);
  const { formation, phase: pinsPhase } = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
  // The marker follows the set standing on the snow, and only when it is this round's set (not while it changes).
  const setId = phase === "playing" && formation === game.setFor(round) ? formation : null;

  const mark = useMemo<Mark | null>(() => {
    if (!setId) return null;
    const rule = ruleFor(setId);
    if (!rule?.marks) return null;
    const set = formationById(setId);
    const centre = setCentre(set);
    const lift = GAME.rule.marker.lift;
    if (rule.marks === "mound") {
      const m = moundsOf(set)[0];
      return m ? { kind: "mound", at: [m.x, snow.heightAt(m.x, m.z) + m.radius * 0.7 + lift, m.z] } : null;
    }
    const pin = set.pins.find((p) => p.kind === rule.marks);
    if (!pin) return null;
    const off = placeIn(set, pin.dx, pin.dz);
    const x = centre.x + off.dx;
    const z = centre.z + off.dz;
    const top = snow.heightAt(x, z) + (propSettings(pin.prop)?.height ?? 1) * (pin.scale ?? 1);
    // A star friend already wears its star doodle: the twinkles sit around that star.
    const y = rule.marks === "star" ? top + SPECIALS.star.above + SPECIALS.star.size * 0.5 : top + lift;
    return { kind: rule.marks, at: [x, y, z] };
  }, [setId, snow]);

  if (!mark || pinsPhase !== "ready") return null;
  const m = GAME.rule.marker;
  return (
    <Html position={mark.at} zIndexRange={[4, 0]} style={{ pointerEvents: "none" }}>
      <div
        aria-hidden
        style={{ transform: mark.kind === "star" ? "translate(-50%, -50%)" : "translate(-50%, -100%)" }}
      >
        <div
          className={styles.marker}
          style={{ "--marker-for": `${m.bounceFor}s`, "--marker-bounce": `${Math.round(m.bounce * 90)}px` } as CSSProperties}
        >
          {mark.kind === "friend" && <FriendSign size={m.size} />}
          {mark.kind === "star" && <Twinkles size={m.size} />}
          {mark.kind === "mound" && <DownArrow size={m.size} />}
        </div>
      </div>
    </Html>
  );
}
