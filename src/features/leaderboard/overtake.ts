/**
 * "X just passed you": the board as this device last saw it, per group, and who has climbed past you since.
 * Kept only on the device (`localStorage`, `plop.seen.<group>`): your nickname key, your best then, and everyone's
 * best then (by nickname key). Nothing is sent anywhere. Plain TypeScript apart from the storage calls.
 */
import type { BoardEntry } from "./api";
import { nameKey } from "./rules";

export type Seen = { me: string; mine: number; others: Record<string, number> };

export type Passer = { name: string; by: number };

const KEY = (group: string) => `plop.seen.${group}`;

/** The board as it is now, from where `me` stands; null when `me` is not on it. */
export function snapshot(scores: BoardEntry[], me: string): Seen | null {
  const key = nameKey(me);
  const mine = scores.find((s) => nameKey(s.name) === key);
  if (!mine) return null;
  return {
    me: key,
    mine: mine.best,
    others: Object.fromEntries(scores.filter((s) => s !== mine).map((s) => [nameKey(s.name), s.best])),
  };
}

/**
 * Who is above you now but was not last time (new on the board, or at or below your best then), best first, with
 * how many points ahead of you they are. Empty when there is no earlier look, it was under another nickname, or
 * you are not on the board.
 */
export function passedBy(prev: Seen | null, scores: BoardEntry[], me: string): Passer[] {
  const now = snapshot(scores, me);
  if (!prev || !now || prev.me !== now.me) return [];
  return scores
    .filter((s) => {
      const key = nameKey(s.name);
      if (key === now.me || s.best <= now.mine) return false;
      const before = prev.others[key];
      return before === undefined || before <= prev.mine;
    })
    .sort((a, b) => b.best - a.best)
    .map((s) => ({ name: s.name, by: s.best - now.mine }));
}

export function readSeen(group: string): Seen | null {
  try {
    const raw = localStorage.getItem(KEY(group));
    if (!raw) return null;
    const v = JSON.parse(raw) as Seen;
    return typeof v?.me === "string" && typeof v.mine === "number" && v.others && typeof v.others === "object" ? v : null;
  } catch {
    return null;
  }
}

export function saveSeen(group: string, seen: Seen) {
  try {
    localStorage.setItem(KEY(group), JSON.stringify(seen));
  } catch {
    // Storage off: the note simply cannot tell what changed next time.
  }
}
