/**
 * What a snowball request must look like (the server route checks every one). Plain TypeScript.
 * Players are a nickname in a group, nothing else; names follow the board's rules (a team's joined name counts).
 */
import { BOARD } from "./content";
import { checkName, isGroup, nameKey, type Checked, type ErrorCode } from "./rules";

export type SnowballError = ErrorCode | "bad_action" | "same_person";

export type SnowballRequest =
  | { action: "throw"; group: string; from: string; to: string }
  | { action: "inbox"; group: string; me: string }
  | { action: "seen"; group: string; me: string };

const ACTIONS: readonly unknown[] = ["throw", "inbox", "seen"];

const name = (raw: unknown) => checkName(raw, BOARD.teamNameMax);

/** Everything a POST body to /api/snowballs must be. Unknown fields are ignored. */
export function checkSnowball(body: unknown): Checked<SnowballRequest> | { ok: false; error: SnowballError } {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_json" };
  const b = body as Record<string, unknown>;
  if (!ACTIONS.includes(b.action)) return { ok: false, error: "bad_action" };
  if (!isGroup(b.group)) return { ok: false, error: "bad_group" };
  if (b.action === "throw") {
    const from = name(b.from);
    if (!from.ok) return from;
    const to = name(b.to);
    if (!to.ok) return to;
    if (nameKey(from.value) === nameKey(to.value)) return { ok: false, error: "same_person" };
    return { ok: true, value: { action: "throw", group: b.group, from: from.value, to: to.value } };
  }
  const me = name(b.me);
  if (!me.ok) return me;
  return { ok: true, value: { action: b.action as "inbox" | "seen", group: b.group, me: me.value } };
}
