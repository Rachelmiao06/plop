/**
 * The one place the game stores anything: the group leaderboards.
 *
 * Two backends behind the same two functions:
 * - **Supabase** when the server has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Vercel → Settings →
 *   Environment Variables). The service key never leaves the server; the table has row-level security on with no
 *   public policies, so nothing in the browser can read or write it directly (supabase/README.md).
 * - **Demo mode** otherwise (local `npm run dev`, previews before the keys exist): kept in the server's memory
 *   and a JSON file in the system temp folder. It forgets everything on a redeploy and each server instance has
 *   its own copy, so it is for trying things, not for keeping scores.
 *
 * Only a nickname, the score, the match length and mode, and times are stored. Callers validate first
 * (`checkSubmission` in src/features/leaderboard/rules.ts); this file only stores and reads.
 */
import "server-only";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type MatchMode = "turns" | "together" | "team";

/** A match's play-style numbers (checked by `checkStats` in the leaderboard rules). */
export type MatchStatsInput = { clears: number; streak: number; bumps: number; stars: number; throws: number; fullPower: number };

export type ScoreInput = { group: string; name: string; score: number; rounds: 3 | 5; mode: MatchMode; stats?: MatchStatsInput };

/** Running totals of play style for one line on a board (for the funny titles; supabase/migrations/0004). */
export type PlayStats = {
  fullClears: number;
  bestStreak: number;
  bumps: number;
  stars: number;
  throws: number;
  fullPower: number;
  /** Matches in a row without a full clear (only matches that sent numbers count). */
  dryMatches: number;
  /** Matches that sent play-style numbers. */
  matches: number;
};

const NO_STATS: PlayStats = { fullClears: 0, bestStreak: 0, bumps: 0, stars: 0, throws: 0, fullPower: 0, dryMatches: 0, matches: 0 };

/** One person's line on a group's board: their best match on top, and their latest one. */
export type BoardEntry = {
  name: string;
  best: number;
  bestRounds: 3 | 5;
  bestMode: MatchMode;
  latest: number;
  latestRounds: 3 | 5;
  plays: number;
  stats: PlayStats;
};

/** `players`: how many lines the group's board has now (so the end card knows who is last). */
export type SubmitResult = { entry: BoardEntry; rank: number; improved: boolean; players: number };

export type Backend = "supabase" | "demo";

export function backend(): Backend {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "demo";
}

export async function submitScore(input: ScoreInput): Promise<SubmitResult> {
  return backend() === "supabase" ? supabaseSubmit(input) : demoSubmit(input);
}

export async function topScores(group: string, limit: number): Promise<BoardEntry[]> {
  return backend() === "supabase" ? supabaseTop(group, limit) : demoTop(group, limit);
}

const keyOf = (name: string) => name.toLowerCase();

// ---------------------------------------------------------------------------------------------------- Supabase

type Row = {
  name: string;
  best_score: number;
  best_rounds: 3 | 5;
  best_mode: MatchMode;
  latest_score: number;
  latest_rounds: 3 | 5;
  plays: number;
  full_clears?: number;
  best_streak?: number;
  friend_bumps?: number;
  star_hits?: number;
  throws?: number;
  full_power_throws?: number;
  dry_matches?: number;
  stats_matches?: number;
};

const COLUMNS =
  "name, best_score, best_rounds, best_mode, latest_score, latest_rounds, plays, full_clears, best_streak, friend_bumps, star_hits, throws, full_power_throws, dry_matches, stats_matches";

const toEntry = (r: Row): BoardEntry => ({
  name: r.name,
  best: r.best_score,
  bestRounds: r.best_rounds,
  bestMode: r.best_mode,
  latest: r.latest_score,
  latestRounds: r.latest_rounds,
  plays: r.plays,
  stats: {
    fullClears: r.full_clears ?? 0,
    bestStreak: r.best_streak ?? 0,
    bumps: r.friend_bumps ?? 0,
    stars: r.star_hits ?? 0,
    throws: r.throws ?? 0,
    fullPower: r.full_power_throws ?? 0,
    dryMatches: r.dry_matches ?? 0,
    matches: r.stats_matches ?? 0,
  },
});

let client: SupabaseClient | null = null;

function supabase() {
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

async function supabaseSubmit(input: ScoreInput): Promise<SubmitResult> {
  const db = supabase();
  // One atomic upsert in the database (supabase/migrations/0001_scores.sql): keeps the best, replaces the latest; and
  // adds the match's play-style numbers to the totals when it sent them (0004_score_stats.sql).
  const st = input.stats;
  const { data, error } = await db.rpc("submit_score_v2", {
    p_group: input.group,
    p_name: input.name,
    p_name_key: keyOf(input.name),
    p_score: input.score,
    p_rounds: input.rounds,
    p_mode: input.mode,
    p_clears: st?.clears ?? null,
    p_streak: st?.streak ?? null,
    p_bumps: st?.bumps ?? null,
    p_stars: st?.stars ?? null,
    p_throws: st?.throws ?? null,
    p_full_power: st?.fullPower ?? null,
  });
  if (error) throw new Error(`submit_score_v2 failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as Row & { improved: boolean; best_at: string };
  const { count, error: rankError } = await db
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("group_id", input.group)
    .or(`best_score.gt.${row.best_score},and(best_score.eq.${row.best_score},best_at.lt."${row.best_at}")`);
  if (rankError) throw new Error(`rank failed: ${rankError.message}`);
  const { count: players, error: countError } = await db
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("group_id", input.group);
  if (countError) throw new Error(`players failed: ${countError.message}`);
  return { entry: toEntry(row), rank: (count ?? 0) + 1, improved: row.improved, players: players ?? 1 };
}

async function supabaseTop(group: string, limit: number): Promise<BoardEntry[]> {
  const { data, error } = await supabase()
    .from("scores")
    .select(COLUMNS)
    .eq("group_id", group)
    .order("best_score", { ascending: false })
    .order("best_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`top scores failed: ${error.message}`);
  return (data as Row[]).map(toEntry);
}

// ---------------------------------------------------------------------------------------------------- Demo mode

type DemoEntry = BoardEntry & { bestAt: number; updatedAt: number };
type DemoStore = Record<string, Record<string, DemoEntry>>;

const DEMO_FILE = join(tmpdir(), "plop-scores-demo.json");
const DEMO_LIMITS = { maxGroups: 500, maxNamesPerGroup: 200 };
const g = globalThis as { __plopDemo?: DemoStore; __plopDemoSaid?: boolean };

function demo(): DemoStore {
  if (!g.__plopDemoSaid) {
    g.__plopDemoSaid = true;
    console.warn(
      "[plop] scores: demo mode (no SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Scores live in memory and " +
        `${DEMO_FILE}, and are forgotten on redeploy. See supabase/README.md.`,
    );
  }
  if (!g.__plopDemo) {
    g.__plopDemo = {};
    try {
      if (existsSync(DEMO_FILE)) g.__plopDemo = JSON.parse(readFileSync(DEMO_FILE, "utf8")) as DemoStore;
    } catch {
      // A broken or unreadable file just means an empty demo board.
    }
  }
  return g.__plopDemo;
}

function save(store: DemoStore) {
  try {
    writeFileSync(DEMO_FILE, JSON.stringify(store));
  } catch {
    // Read-only disk: memory is enough for a demo.
  }
}

const sortDemo = (list: DemoEntry[]) => list.sort((a, b) => b.best - a.best || a.bestAt - b.bestAt);

async function demoSubmit(input: ScoreInput): Promise<SubmitResult> {
  const store = demo();
  const now = Date.now();
  const board = (store[input.group] ??= {});
  const key = keyOf(input.name);
  const old = board[key];
  const improved = !old || input.score > old.best;
  const entry: DemoEntry = {
    name: input.name,
    best: improved ? input.score : old.best,
    bestRounds: improved ? input.rounds : old.bestRounds,
    bestMode: improved ? input.mode : old.bestMode,
    bestAt: improved ? now : old.bestAt,
    latest: input.score,
    latestRounds: input.rounds,
    plays: (old?.plays ?? 0) + 1,
    stats: addStats(old?.stats ?? NO_STATS, input.stats),
    updatedAt: now,
  };
  board[key] = entry;
  trim(store, input.group);
  save(store);
  const rank = sortDemo(Object.values(board)).indexOf(entry) + 1;
  return { entry: strip(entry), rank, improved, players: Object.keys(board).length };
}

async function demoTop(group: string, limit: number): Promise<BoardEntry[]> {
  return sortDemo(Object.values(demo()[group] ?? {})).slice(0, limit).map(strip);
}

function strip(e: DemoEntry): BoardEntry {
  const { name, best, bestRounds, bestMode, latest, latestRounds, plays } = e;
  return { name, best, bestRounds, bestMode, latest, latestRounds, plays, stats: e.stats ?? NO_STATS };
}

/** The demo store's version of what submit_score_v2 does with a match's numbers. */
function addStats(old: PlayStats, m?: MatchStatsInput): PlayStats {
  if (!m) return old;
  return {
    fullClears: old.fullClears + m.clears,
    bestStreak: Math.max(old.bestStreak, m.streak),
    bumps: old.bumps + m.bumps,
    stars: old.stars + m.stars,
    throws: old.throws + m.throws,
    fullPower: old.fullPower + m.fullPower,
    dryMatches: m.clears > 0 ? 0 : old.dryMatches + 1,
    matches: old.matches + 1,
  };
}

/** Keeps the demo store small: drops the least recently played names and groups past the limits. */
function trim(store: DemoStore, group: string) {
  const board = store[group];
  const names = Object.entries(board);
  if (names.length > DEMO_LIMITS.maxNamesPerGroup) {
    names.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    for (const [key] of names.slice(0, names.length - DEMO_LIMITS.maxNamesPerGroup)) delete board[key];
  }
  const groups = Object.keys(store);
  if (groups.length > DEMO_LIMITS.maxGroups) {
    const last = (id: string) => Math.max(...Object.values(store[id]).map((e) => e.updatedAt));
    groups.sort((a, b) => last(a) - last(b));
    for (const id of groups.slice(0, groups.length - DEMO_LIMITS.maxGroups)) delete store[id];
  }
}

// ---------------------------------------------------------------------------------------------------- Snowballs
//
// Friends throw snowballs at each other on a group board (src/features/leaderboard/README.md, "Snowballs"). One row
// per throw: who threw and who got hit, by nickname, in one group (supabase/migrations/0003_snowballs.sql). Callers
// validate first (`checkSnowball`); the one-per-friend-per-hour rule is enforced here (atomically in Supabase).

export type ThrowInput = { group: string; from: string; to: string; cooldownSeconds: number };
export type ThrowResult = { thrown: boolean; retrySeconds: number };
export type Hit = { from: string; at: string };

/** True if this nickname has a line on the group's board (you can only hit someone who is on it). */
export async function onBoard(group: string, name: string): Promise<boolean> {
  if (backend() === "demo") return Boolean(demo()[group]?.[keyOf(name)]);
  const { count, error } = await supabase()
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("group_id", group)
    .eq("name_key", keyOf(name));
  if (error) throw new Error(`on board failed: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function throwSnowball(input: ThrowInput): Promise<ThrowResult> {
  if (backend() === "demo") return demoThrow(input);
  const { data, error } = await supabase().rpc("throw_snowball", {
    p_group: input.group,
    p_from: input.from,
    p_from_key: keyOf(input.from),
    p_to: input.to,
    p_to_key: keyOf(input.to),
    p_cooldown_seconds: input.cooldownSeconds,
  });
  if (error) throw new Error(`throw_snowball failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as { thrown: boolean; retry_seconds: number };
  return { thrown: row.thrown, retrySeconds: row.retry_seconds };
}

/** How many snowballs each name in the group got since `since`, by lower-case name. */
export async function hitsSince(group: string, since: Date): Promise<Record<string, number>> {
  const keys =
    backend() === "demo"
      ? demoBalls()
          .filter((b) => b.group === group && b.at >= since.getTime())
          .map((b) => b.toKey)
      : await (async () => {
          const { data, error } = await supabase()
            .from("snowballs")
            .select("to_key")
            .eq("group_id", group)
            .gte("thrown_at", since.toISOString())
            .limit(5000);
          if (error) throw new Error(`hits failed: ${error.message}`);
          return (data as { to_key: string }[]).map((r) => r.to_key);
        })();
  const counts: Record<string, number> = {};
  for (const k of keys) counts[k] = (counts[k] ?? 0) + 1;
  return counts;
}

/** Snowballs that hit this name and were not seen yet (newest first), and who it may not hit again yet. */
export async function snowballInbox(
  group: string,
  me: string,
  since: Date,
  max: number,
  cooldownSeconds: number,
): Promise<{ hits: Hit[]; cooldowns: Record<string, number> }> {
  const key = keyOf(me);
  const now = Date.now();
  const coolFrom = now - cooldownSeconds * 1000;
  if (backend() === "demo") {
    const mine = demoBalls().filter((b) => b.group === group);
    const hits = mine
      .filter((b) => b.toKey === key && !b.seen && b.at >= since.getTime())
      .sort((a, b) => b.at - a.at)
      .slice(0, max)
      .map((b) => ({ from: b.from, at: new Date(b.at).toISOString() }));
    return { hits, cooldowns: cooldownsOf(mine.filter((b) => b.fromKey === key && b.at > coolFrom).map((b) => [b.toKey, b.at]), cooldownSeconds, now) };
  }
  const db = supabase();
  const [inbox, thrown] = await Promise.all([
    db
      .from("snowballs")
      .select("from_name, thrown_at")
      .eq("group_id", group)
      .eq("to_key", key)
      .is("seen_at", null)
      .gte("thrown_at", since.toISOString())
      .order("thrown_at", { ascending: false })
      .limit(max),
    db
      .from("snowballs")
      .select("to_key, thrown_at")
      .eq("group_id", group)
      .eq("from_key", key)
      .gt("thrown_at", new Date(coolFrom).toISOString())
      .limit(500),
  ]);
  if (inbox.error) throw new Error(`inbox failed: ${inbox.error.message}`);
  if (thrown.error) throw new Error(`cooldowns failed: ${thrown.error.message}`);
  return {
    hits: (inbox.data as { from_name: string; thrown_at: string }[]).map((r) => ({ from: r.from_name, at: r.thrown_at })),
    cooldowns: cooldownsOf(
      (thrown.data as { to_key: string; thrown_at: string }[]).map((r) => [r.to_key, Date.parse(r.thrown_at)]),
      cooldownSeconds,
      now,
    ),
  };
}

/** Marks every snowball that hit this name in the group as seen. */
export async function markSnowballsSeen(group: string, me: string): Promise<void> {
  const key = keyOf(me);
  if (backend() === "demo") {
    for (const b of demoBalls()) if (b.group === group && b.toKey === key) b.seen = true;
    saveBalls();
    return;
  }
  const { error } = await supabase()
    .from("snowballs")
    .update({ seen_at: new Date().toISOString() })
    .eq("group_id", group)
    .eq("to_key", key)
    .is("seen_at", null);
  if (error) throw new Error(`seen failed: ${error.message}`);
}

/** Seconds left before each friend may be hit again, from the latest throw at them. */
function cooldownsOf(throws: [string, number][], cooldownSeconds: number, now: number) {
  const out: Record<string, number> = {};
  for (const [to, at] of throws) {
    const left = Math.ceil((at + cooldownSeconds * 1000 - now) / 1000);
    if (left > 0) out[to] = Math.max(out[to] ?? 0, left);
  }
  return out;
}

type DemoBall = { group: string; from: string; fromKey: string; to: string; toKey: string; at: number; seen: boolean };

const BALLS_FILE = join(tmpdir(), "plop-snowballs-demo.json");
const gb = globalThis as { __plopBalls?: DemoBall[] };

function demoBalls(): DemoBall[] {
  if (!gb.__plopBalls) {
    gb.__plopBalls = [];
    try {
      if (existsSync(BALLS_FILE)) gb.__plopBalls = JSON.parse(readFileSync(BALLS_FILE, "utf8")) as DemoBall[];
    } catch {
      // A broken file just means no snowballs yet.
    }
  }
  return gb.__plopBalls;
}

function saveBalls() {
  try {
    writeFileSync(BALLS_FILE, JSON.stringify(demoBalls()));
  } catch {
    // Read-only disk: memory is enough for a demo.
  }
}

async function demoThrow(input: ThrowInput): Promise<ThrowResult> {
  const now = Date.now();
  const fromKey = keyOf(input.from);
  const toKey = keyOf(input.to);
  const old = demoBalls().filter((b) => now - b.at < 8 * 86_400_000).slice(-5000);
  gb.__plopBalls = old;
  const last = Math.max(0, ...old.filter((b) => b.group === input.group && b.fromKey === fromKey && b.toKey === toKey).map((b) => b.at));
  const left = Math.ceil((last + input.cooldownSeconds * 1000 - now) / 1000);
  if (last && left > 0) return { thrown: false, retrySeconds: left };
  old.push({ group: input.group, from: input.from, fromKey, to: input.to, toKey, at: now, seen: false });
  saveBalls();
  return { thrown: true, retrySeconds: 0 };
}
