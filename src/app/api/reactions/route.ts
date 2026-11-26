// Sticker reactions on friends' board lines (src/features/leaderboard/README.md, "Stickers").
// GET  /api/reactions?g=<group>                          → { backend, counts: { [lower-case name]: { star?, wow?, lol?, music? } } }
// POST /api/reactions {action:"react", group, from, to, kind} → { backend, counts }  (kind null takes it back;
//      `to` must be on the group's board; one sticker per person per line, a new one replaces it)
// POST /api/reactions {action:"inbox", group, me}        → { backend, got: [{from, kind, at}], given: { [name]: kind } }
// POST /api/reactions {action:"seen",  group, me}        → { backend, ok: true }
// Errors answer { error: <code> } with 400 (bad input), 404 (not on the board), 429 (too many) or 500.
// Only nicknames in a group and one of four preset stickers; nothing typed is stored.
import { REACTIONS } from "@/features/leaderboard/content";
import { allowReact, ipOf } from "@/features/leaderboard/rateLimit";
import { checkReaction } from "@/features/leaderboard/reactionRules";
import { isGroup } from "@/features/leaderboard/rules";
import { backend, markReactionsSeen, onBoard, reactionCounts, reactionInbox, setReaction } from "@/lib/db";

const NO_STORE = { "Cache-Control": "no-store" };

const fail = (error: string, status: number) => Response.json({ error }, { status, headers: NO_STORE });

export async function GET(request: Request) {
  const group = new URL(request.url).searchParams.get("g");
  if (!isGroup(group)) return fail("bad_group", 400);
  try {
    return Response.json({ backend: backend(), counts: await reactionCounts(group) }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] reactions GET:", e instanceof Error ? e.message : e);
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
  const checked = checkReaction(body);
  if (!checked.ok) return fail(checked.error, 400);
  const r = checked.value;
  try {
    if (r.action === "react") {
      if (!allowReact(ipOf(request.headers), r.group)) return fail("rate_limited", 429);
      if (!(await onBoard(r.group, r.to))) return fail("not_on_board", 404);
      await setReaction(r.group, r.from, r.to, r.kind);
      return Response.json({ backend: backend(), counts: await reactionCounts(r.group) }, { headers: NO_STORE });
    }
    if (r.action === "inbox") {
      const since = new Date(Date.now() - REACTIONS.inboxDays * 86_400_000);
      return Response.json({ backend: backend(), ...(await reactionInbox(r.group, r.me, since, REACTIONS.inboxMax)) }, { headers: NO_STORE });
    }
    await markReactionsSeen(r.group, r.me);
    return Response.json({ backend: backend(), ok: true }, { headers: NO_STORE });
  } catch (e) {
    console.error("[plop] reactions POST:", e instanceof Error ? e.message : e);
    return fail("server", 500);
  }
}
