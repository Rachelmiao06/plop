/**
 * What a throw scored at a set, from which cards are down. Plain TypeScript, shared by the stage (the result
 * event) and the shot measure (`src/features/game/measure`), so both count the same way.
 *
 * - Plain and star cards count: `down` of `total`, and a full clear when every one of them is down.
 * - A star card down adds `SPECIALS.star.bonus`.
 * - Friends (the rabbit, the sleeping cat) never count as cards. All friends still standing adds `SPECIALS.friend.bonus`;
 *   knocking one over simply scores nothing for it (no taking points away: Rachel, never punishing).
 */
import { SPECIALS, type Formation, type FormationPin } from "./content";

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
  /** Which cut-out the friend is (the rabbit, the bench with the sleeping cat), for its words; null without one. */
  friendProp: FormationPin["prop"] | null;
  /**
   * "Together" mode (two throwers at once): the count for each thrower id, from the cards their ball knocked
   * first (`countByThrower`). Left out when one thrower threw.
   */
  byThrower?: Record<string, PinsResult>;
};

/** The count of a throw. `downs[i]` is pin `i` of the formation (same order as `formation.pins`). */
export function countThrow(formation: Formation, downs: readonly boolean[]): PinsResult {
  let down = 0;
  let total = 0;
  let stars = 0;
  let friends = 0;
  let friendsDown = 0;
  let friendProp: FormationPin["prop"] | null = null;
  formation.pins.forEach((p, i) => {
    if (p.kind === "friend") {
      friends++;
      friendProp ??= p.prop;
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
  return { down, total, fullClear: total > 0 && down === total, stars, friend, bonus, friendProp };
}

/**
 * Two throwers at the same set: each card counts for whoever's ball touched it first (or knocked the card that
 * knocked it), `by[i]`; a card down with no owner counts for `fallback`. Each thrower's own count works like
 * `countThrow` on their cards: their stars, the friend bonus unless their own ball bumped it. The full-clear bonus
 * goes to every thrower who knocked a card when the whole set is down (both helped).
 */
export function countByThrower(
  formation: Formation,
  downs: readonly boolean[],
  by: readonly (string | undefined)[],
  throwers: readonly string[],
  fallback: string,
): Record<string, PinsResult> {
  const all = countThrow(formation, downs);
  const out: Record<string, PinsResult> = {};
  for (const who of throwers) {
    const mine = downs.map((d, i) => d && (by[i] ?? fallback) === who);
    const r = countThrow(formation, mine);
    const fullClear = all.fullClear && r.down > 0;
    out[who] = { ...r, total: all.total, fullClear };
  }
  return out;
}

/** Cards that count in a set (friends do not). */
export const countedCards = (formation: Formation) => formation.pins.filter((p) => p.kind !== "friend").length;
