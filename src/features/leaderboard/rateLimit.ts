/**
 * A simple fixed-window limit on score submits, per IP and group, kept in the server's memory.
 * Best effort: each server instance counts on its own (Vercel may run a few), which is enough to stop a
 * stuck button or a casual spammer. Not a security wall; the score check is what keeps the board honest.
 */
import { BOARD, SNOWBALL } from "./content";

type Window = { start: number; count: number };

const store = ((globalThis as { __plopRate?: Map<string, Window> }).__plopRate ??= new Map());

/** True if this submit is allowed (and counts it), false if the caller should slow down. */
export function allowSubmit(ip: string, group: string, now = Date.now()) {
  return allow(`${ip}|${group}`, BOARD.rateLimit, now);
}

/** The same for snowball throws (its own count, `SNOWBALL.rateLimit`). */
export function allowThrow(ip: string, group: string, now = Date.now()) {
  return allow(`snowball|${ip}|${group}`, SNOWBALL.rateLimit, now);
}

function allow(key: string, { max, windowSeconds }: { max: number; windowSeconds: number }, now: number) {
  const span = windowSeconds * 1000;
  const w = store.get(key);
  if (!w || now - w.start >= span) {
    store.set(key, { start: now, count: 1 });
    if (store.size > 5000) sweep(now, span);
    return true;
  }
  if (w.count >= max) return false;
  w.count++;
  return true;
}

function sweep(now: number, span: number) {
  for (const [key, w] of store) if (now - w.start >= span) store.delete(key);
}

/** The caller's IP from the proxy headers Vercel sets (first hop), or "local". */
export function ipOf(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "local";
}
