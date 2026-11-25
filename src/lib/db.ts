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

export type MatchMode = "turns" | "together";

export type ScoreInput = { group: string; name: string; score: number; rounds: 3 | 5; mode: MatchMode };

/** One person's line on a group's board: their best match on top, and their latest one. */
export type BoardEntry = {
  name: string;
  best: number;
  bestRounds: 3 | 5;
  bestMode: MatchMode;
  latest: number;
  latestRounds: 3 | 5;
  plays: number;
};

export type SubmitResult = { entry: BoardEntry; rank: number; improved: boolean };

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
};

const COLUMNS = "name, best_score, best_rounds, best_mode, latest_score, latest_rounds, plays";

const toEntry = (r: Row): BoardEntry => ({
  name: r.name,
  best: r.best_score,
  bestRounds: r.best_rounds,
  bestMode: r.best_mode,
  latest: r.latest_score,
  latestRounds: r.latest_rounds,
  plays: r.plays,
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
  // One atomic upsert in the database (supabase/migrations/0001_scores.sql): keeps the best, replaces the latest.
  const { data, error } = await db.rpc("submit_score", {
    p_group: input.group,
    p_name: input.name,
    p_name_key: keyOf(input.name),
    p_score: input.score,
    p_rounds: input.rounds,
    p_mode: input.mode,
  });
  if (error) throw new Error(`submit_score failed: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as Row & { improved: boolean; best_at: string };
  const { count, error: rankError } = await db
    .from("scores")
    .select("id", { count: "exact", head: true })
    .eq("group_id", input.group)
    .or(`best_score.gt.${row.best_score},and(best_score.eq.${row.best_score},best_at.lt."${row.best_at}")`);
  if (rankError) throw new Error(`rank failed: ${rankError.message}`);
  return { entry: toEntry(row), rank: (count ?? 0) + 1, improved: row.improved };
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
    updatedAt: now,
  };
  board[key] = entry;
  trim(store, input.group);
  save(store);
  const rank = sortDemo(Object.values(board)).indexOf(entry) + 1;
  return { entry: strip(entry), rank, improved };
}

async function demoTop(group: string, limit: number): Promise<BoardEntry[]> {
  return sortDemo(Object.values(demo()[group] ?? {})).slice(0, limit).map(strip);
}

function strip(e: DemoEntry): BoardEntry {
  const { name, best, bestRounds, bestMode, latest, latestRounds, plays } = e;
  return { name, best, bestRounds, bestMode, latest, latestRounds, plays };
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
