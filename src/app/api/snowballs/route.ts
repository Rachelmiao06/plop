// Snowballs between friends on a group board (src/features/leaderboard/README.md, "Snowballs").
// GET  /api/snowballs?g=<group>                     → { backend, today: { [lower-case name]: count } }
// POST /api/snowballs {action:"throw", group, from, to} → { backend, thrown, retrySeconds, today }
//      (`to` must be on the group's board; one throw per friend per hour, else thrown:false with the seconds left)
// POST /api/snowballs {action:"inbox", group, me}   → { backend, hits: [{from, at}], cooldowns: { [name]: seconds } }
// POST /api/snowballs {action:"seen",  group, me}   → { backend, ok: true }
// Errors answer { error: <code> } with 400 (bad input), 404 (not on the board), 429 (too many) or 500.
// Only nicknames in a group, nothing else; words shown to players are preset in the game, never typed.
import { SNOWBALL } from "@/features/leaderboard/content";
import { allowThrow, ipOf } from "@/features/leaderboard/rateLimit";
import { isGroup, nameKey } from "@/features/leaderboard/rules";
import { checkSnowball } from "@/features/leaderboard/snowballRules";
import { startOfDay } from "@/features/leaderboard/day";
import { backend, hitsSince, markSnowballsSeen, onBoard, snowballInbox, throwSnowball } from "@/lib/db";

const NO_STORE = { "Cache-Control": "no-store" };
const COOLDOWN = SNOWBALL.cooldownMinutes * 60;

const fail = (error: string, status: number) => Response.json({ error }, { status, headers: NO_STORE });

export async function GET(request: Request) {
  const group = new URL(request.url).searchParams.get("g");
  if (!isGroup(group)) return fail("bad_group", 400);
  try {
    return Response.json({ backend: backend(), today: await hitsSince(group, startOfDay()) }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] snowballs GET:", e instanceof Error ? e.message : e);
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
  const checked = checkSnowball(body);
  if (!checked.ok) return fail(checked.error, 400);
  const r = checked.value;
  try {
    if (r.action === "throw") {
      if (!allowThrow(ipOf(request.headers), r.group)) return fail("rate_limited", 429);
      if (!(await onBoard(r.group, r.to))) return fail("not_on_board", 404);
      const result = await throwSnowball({ group: r.group, from: r.from, to: r.to, cooldownSeconds: COOLDOWN });
      const today = (await hitsSince(r.group, startOfDay()))[nameKey(r.to)] ?? 0;
      return Response.json({ backend: backend(), ...result, today }, { headers: NO_STORE });
    }
    if (r.action === "inbox") {
      const since = new Date(Date.now() - SNOWBALL.inboxDays * 86_400_000);
      const inbox = await snowballInbox(r.group, r.me, since, SNOWBALL.inboxMax, COOLDOWN);
      return Response.json({ backend: backend(), ...inbox }, { headers: NO_STORE });
    }
    await markSnowballsSeen(r.group, r.me);
    return Response.json({ backend: backend(), ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] snowballs POST:", e instanceof Error ? e.message : e);
    return fail("server", 500);
  }
}
