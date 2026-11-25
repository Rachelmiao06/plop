/**
 * The guided start's memory on this device: last time's choices (so a returning player gets "welcome back, same as
 * last time") and whether "how to throw" was already shown. Storage may be blocked (a private window): then nothing
 * is remembered and every start is a first one.
 */
import type { StartChoice } from "@/features/hud";

import { GAME, type MatchLength } from "./content";

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function put(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Not remembered; the cards simply ask again next time.
  }
}

/** The remembered choices as stored ("" = none): a stable snapshot for `useSyncExternalStore`. */
export function choiceSnapshot(): string {
  return get(GAME.start.choiceKey) ?? "";
}

/** Last time's choices, or null (first visit, blocked storage or something unreadable). */
export function parseChoice(raw: string): StartChoice | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<StartChoice>;
    const players = c.players === 2 ? 2 : c.players === 1 ? 1 : null;
    const mode = c.mode === "together" ? "together" : "turns";
    const rounds = (GAME.match.lengths as readonly number[]).includes(c.rounds ?? -1) ? (c.rounds as MatchLength) : null;
    return players && rounds ? { players, mode: players === 2 ? mode : "turns", rounds } : null;
  } catch {
    return null;
  }
}

export function saveChoice(c: StartChoice) {
  put(GAME.start.choiceKey, JSON.stringify({ players: c.players, mode: c.mode, rounds: c.rounds }));
}

/** Has "how to throw" been shown on this device? */
export function sawHowTo(): boolean {
  return get(GAME.start.howToKey) === "1";
}
export function markHowTo() {
  put(GAME.start.howToKey, "1");
}

/** About how many minutes a match of this choice takes (whole minutes, rounded up). */
export function minutesFor(c: StartChoice): number {
  const m = GAME.start.minutes;
  const throws = c.players === 1 ? 1 : c.mode === "together" ? m.togetherThrows : 2;
  return Math.max(1, Math.ceil((c.rounds * (throws * m.perThrow + m.perRound)) / 60));
}
