/**
 * The players' names: asked once on the start card, remembered on this device, and used everywhere (the score
 * panel, the turn note, "N down!", the end card, the group board and invites). One place, so every part says the
 * same name.
 *
 *   readNames()        the two typed names as remembered ("" when skipped). Browser only; storage may be blocked.
 *   saveNames(names)   remember them (cleaned, at most `INVITE.link.nameMax` characters) and tell every listener.
 *   subscribeNames(cb) for `useSyncExternalStore`.
 *   shownName(i, raw)  what to show: the typed name, or the snowman's cute default ("Bucket" / "Red Hat").
 *
 * Nothing leaves the device from here; the share sheet and the board send a name only when the player taps them.
 */
import { cleanName } from "@/features/invite";

import { GAME } from "./content";

export type Names = readonly [string, string];

const EVENT = "plop:names";
const EMPTY: Names = ["", ""];
/** Older keys that may already hold player one's name on this device (the old share sheet, the board prompt). */
const OLDER_KEYS = ["plop.invite.name", "plop.nickname"];

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

let cache: { raw: string | null; names: Names } | null = null;
/** Kept for this page when storage is blocked. */
let memory: string | null = null;

export function readNames(): Names {
  if (typeof window === "undefined") return EMPTY;
  const raw = get(GAME.names.key) ?? memory;
  // Same string, same array: useSyncExternalStore needs a stable snapshot.
  if (cache && cache.raw === raw) return cache.names;
  let names: Names = EMPTY;
  try {
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) names = [cleanName(parsed[0]) ?? "", cleanName(parsed[1]) ?? ""];
  } catch {
    // A broken value: start fresh.
  }
  if (raw === null) {
    // First visit since names moved here: player one may have typed a name in the share sheet or on a board.
    const older = OLDER_KEYS.map(get).map(cleanName).find(Boolean);
    if (older) names = [older, ""];
  }
  cache = { raw, names };
  return names;
}

export function serverNames(): Names {
  return EMPTY;
}

export function saveNames(next: readonly [string | null | undefined, string | null | undefined]) {
  const names: Names = [cleanName(next[0]) ?? "", cleanName(next[1]) ?? ""];
  memory = JSON.stringify(names);
  try {
    window.localStorage.setItem(GAME.names.key, memory);
  } catch {
    // Private window or blocked storage: the names last for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Player one's name only (the share sheet and the board change it). */
export function savePlayerOne(name: string) {
  saveNames([name, readNames()[1]]);
}

export function subscribeNames(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === GAME.names.key && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** The name to show for player `i`: what they typed, or their snowman's cute default. Never empty. */
export function shownName(i: 0 | 1, raw: string | null | undefined): string {
  return cleanName(raw) ?? GAME.players[i].name;
}
