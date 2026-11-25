/**
 * The invite group id: a short random id that travels on every invite link (`?g=`) so everyone invited by the same
 * person lands on one group leaderboard. No login, nothing personal: 8 random URL-safe characters.
 *
 *   getGroupId()     the group this page belongs to, or null: the page's own `?g=` (opened from an invite), else the
 *                    one remembered on this device. Never creates one.
 *   ensureGroupId()  the same, but creates and remembers one when there is none yet (call it when making an invite).
 *
 * A page opened from an invite keeps that `g` when re-shared, so the group grows. A device with no group of its own
 * yet adopts that one. Browser only; storage may be blocked (then the id lives for this page only).
 */
import { cleanGroup, INVITE } from "@/features/invite";

import { store } from "./actions";
import { SHARE } from "./content";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Kept for this page when storage is blocked, so one visit's invites still share a group. */
let thisPage: string | null = null;

function fromAddress(): string | null {
  if (typeof window === "undefined") return null;
  return cleanGroup(new URLSearchParams(window.location.search).get("g"));
}

function newGroupId(): string {
  const bytes = new Uint8Array(INVITE.link.groupLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b & 63]).join("");
}

export function getGroupId(): string | null {
  if (typeof window === "undefined") return null;
  return fromAddress() ?? cleanGroup(store.get("local", SHARE.invite.groupKey)) ?? thisPage;
}

export function ensureGroupId(): string {
  const stored = cleanGroup(store.get("local", SHARE.invite.groupKey));
  const page = fromAddress();
  if (page) {
    if (!stored) store.set("local", SHARE.invite.groupKey, page);
    return page;
  }
  if (stored) return stored;
  const id = thisPage ?? newGroupId();
  thisPage = id;
  store.set("local", SHARE.invite.groupKey, id);
  return id;
}
