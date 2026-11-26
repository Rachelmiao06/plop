/**
 * The game's day: it starts at midnight China time (`SNOWBALL.dayUtcOffsetHours`, no daylight saving), decided by
 * the server's clock. Used for the snowball counts and "今日最惨". Plain TypeScript.
 */
import { SNOWBALL } from "./content";

const OFFSET = SNOWBALL.dayUtcOffsetHours * 3_600_000;

/** Midnight today in the game's day. */
export function startOfDay(now = Date.now()) {
  return new Date(Math.floor((now + OFFSET) / 86_400_000) * 86_400_000 - OFFSET);
}

/** Today's date in the game's day, "2026-11-25". */
export function dayKey(now = Date.now()) {
  return new Date(now + OFFSET).toISOString().slice(0, 10);
}
