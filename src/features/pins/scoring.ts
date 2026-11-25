/**
 * What a throw scored at a set, from which cards are down. Plain TypeScript, shared by the stage (the result
 * event) and the shot measure (`src/features/game/measure`), so both count the same way.
 *
 * - Plain and star cards count: `down` of `total`, and a full clear when every one of them is down.
 * - A star card down adds `SPECIALS.star.bonus`.
 * - Friends (the rabbit) never count as cards. All friends still standing adds `SPECIALS.friend.bonus`;
 *   knocking one over simply scores nothing for it (no taking points away: Rachel, never punishing).
 */
import { SPECIALS, type Formation } from "./content";

export type PinsResult = {
  down: number;
  total: number;
  fullClear: boolean;
  /** Star cards down in this throw. */
  stars: number;
  /** The set has a friend: was it left standing ("safe") or knocked ("bumped")? null without one. */
  friend: "safe" | "bumped" | null;
  /** Extra points from the special cut-outs (stars down, friends safe). */
  bonus: number;
};

/** The count of a throw. `downs[i]` is pin `i` of the formation (same order as `formation.pins`). */
export function countThrow(formation: Formation, downs: readonly boolean[]): PinsResult {
  let down = 0;
  let total = 0;
  let stars = 0;
  let friends = 0;
  let friendsDown = 0;
  formation.pins.forEach((p, i) => {
    if (p.kind === "friend") {
      friends++;
      if (downs[i]) friendsDown++;
      return;
    }
    total++;
    if (downs[i]) {
      down++;
      if (p.kind === "star") stars++;
    }
  });
  const friend = friends === 0 ? null : friendsDown === 0 ? "safe" : "bumped";
  const bonus = stars * SPECIALS.star.bonus + (friend === "safe" ? SPECIALS.friend.bonus : 0);
  return { down, total, fullClear: total > 0 && down === total, stars, friend, bonus };
}

/** Cards that count in a set (friends do not). */
export const countedCards = (formation: Formation) => formation.pins.filter((p) => p.kind !== "friend").length;
