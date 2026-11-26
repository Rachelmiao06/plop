"use client";

/**
 * The browser side of the leaderboard: talks only to our own `/api/scores` route (never to the database),
 * remembers the nickname on this device, and tells every `<GroupBoard>` on the page when a score lands.
 */
import { BOARD } from "./content";
import type { MatchMode, Rounds } from "./rules";

export type BoardEntry = {
  name: string;
  best: number;
  bestRounds: Rounds;
  bestMode: MatchMode;
  latest: number;
  latestRounds: Rounds;
  plays: number;
};

export type Backend = "supabase" | "demo";

export type Submitted = { backend: Backend; entry: BoardEntry; rank: number; improved: boolean };

/** Either the answer, or one of the error codes in `TEXT.errors`. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

async function call<T>(input: string, init?: RequestInit): Promise<Answer<T>> {
  try {
    const res = await fetch(input, { cache: "no-store", ...init });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? "server", status: res.status };
    return { ok: true, value: json };
  } catch {
    return { ok: false, error: "server", status: 0 };
  }
}

export function fetchBoard(group: string) {
  return call<{ backend: Backend; scores: BoardEntry[] }>(`/api/scores?g=${encodeURIComponent(group)}`);
}

/** Sends any body as is (the test page uses this to try bad input); the server checks everything. */
export function postScore(body: unknown) {
  return call<Submitted>("/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ------------------------------------------------------------------------------------- "a score just landed"

const EVENT = "plop:scores";

export type LandedDetail = { group: string; name: string; rank: number };

export function announce(detail: LandedDetail) {
  window.dispatchEvent(new CustomEvent<LandedDetail>(EVENT, { detail }));
}

export function onLanded(fn: (detail: LandedDetail) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<LandedDetail>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// ------------------------------------------------------------------------------------- the remembered nickname

const NAME_EVENT = "plop:nickname";

export function readNickname(): string {
  try {
    return localStorage.getItem(BOARD.nameKey) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(name: string) {
  try {
    localStorage.setItem(BOARD.nameKey, name);
  } catch {
    // Private mode or storage off: the prompt simply asks again next time.
  }
  window.dispatchEvent(new Event(NAME_EVENT));
}

export function subscribeNickname(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === BOARD.nameKey && cb();
  window.addEventListener(NAME_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(NAME_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

// ------------------------------------------------------------------------------------- snowballs

export type ThrowAnswer = { backend: Backend; thrown: boolean; retrySeconds: number; today: number };
export type Inbox = { backend: Backend; hits: { from: string; at: string }[]; cooldowns: Record<string, number> };

/** Today's hits per snowman in a group, by lower-case nickname. */
export function fetchHits(group: string) {
  return call<{ backend: Backend; today: Record<string, number> }>(`/api/snowballs?g=${encodeURIComponent(group)}`);
}

const snowball = <T>(body: Record<string, unknown>) =>
  call<T>("/api/snowballs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const throwSnowball = (group: string, from: string, to: string) => snowball<ThrowAnswer>({ action: "throw", group, from, to });
export const fetchInbox = (group: string, me: string) => snowball<Inbox>({ action: "inbox", group, me });
export const markSeen = (group: string, me: string) => snowball<{ ok: true }>({ action: "seen", group, me });

const BALL_EVENT = "plop:snowball";

export type BallDetail = { group: string; to: string; today: number };

/** A snowball landed: every board for that group updates its count. */
export function announceBall(detail: BallDetail) {
  window.dispatchEvent(new CustomEvent<BallDetail>(BALL_EVENT, { detail }));
}

export function onBall(fn: (detail: BallDetail) => void) {
  const handler = (e: Event) => fn((e as CustomEvent<BallDetail>).detail);
  window.addEventListener(BALL_EVENT, handler);
  return () => window.removeEventListener(BALL_EVENT, handler);
}
