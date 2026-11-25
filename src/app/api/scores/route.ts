// Group leaderboards (src/features/leaderboard/README.md).
// GET  /api/scores?g=<group>  → { backend, scores: BoardEntry[] }  (top 10, best first)
// POST /api/scores {group, name, score, rounds, mode} → { backend, entry, rank, improved }
// Errors answer { error: <code> } with 400 (bad input), 429 (too many submits) or 500.
// Every read and write goes through here with the server's key; the browser never talks to the database.
import { allowSubmit, ipOf } from "@/features/leaderboard/rateLimit";
import { BOARD } from "@/features/leaderboard/content";
import { checkSubmission, isGroup } from "@/features/leaderboard/rules";
import { backend, submitScore, topScores } from "@/lib/db";

const NO_STORE = { "Cache-Control": "no-store" };

const fail = (error: string, status: number) => Response.json({ error }, { status, headers: NO_STORE });

export async function GET(request: Request) {
  const group = new URL(request.url).searchParams.get("g");
  if (!isGroup(group)) return fail("bad_group", 400);
  try {
    const scores = await topScores(group, BOARD.top);
    return Response.json({ backend: backend(), scores }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] scores GET:", e instanceof Error ? e.message : e);
    return fail("server", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("bad_json", 400);
  }
  const checked = checkSubmission(body);
  if (!checked.ok) return fail(checked.error, 400);
  if (!allowSubmit(ipOf(request.headers), checked.value.group)) return fail("rate_limited", 429);
  try {
    const result = await submitScore(checked.value);
    return Response.json({ backend: backend(), ...result }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] scores POST:", e instanceof Error ? e.message : e);
    return fail("server", 500);
  }
}
