/**
 * What a sticker reaction request must look like (the server route checks every one). Plain TypeScript.
 * Players are a nickname in a group, nothing else; stickers are the four presets in `REACTIONS.kinds`.
 */
import { BOARD, REACTIONS } from "./content";
import { checkName, isGroup, nameKey, type ErrorCode } from "./rules";

export type ReactionKind = (typeof REACTIONS.kinds)[number];

export type ReactionError = ErrorCode | "bad_action" | "same_person" | "bad_kind";

export type ReactionRequest =
  /** `kind: null` takes your sticker back. */
  | { action: "react"; group: string; from: string; to: string; kind: ReactionKind | null }
  | { action: "inbox"; group: string; me: string }
  | { action: "seen"; group: string; me: string };

const ACTIONS: readonly unknown[] = ["react", "inbox", "seen"];

export const isKind = (k: unknown): k is ReactionKind => (REACTIONS.kinds as readonly unknown[]).includes(k);

const name = (raw: unknown) => checkName(raw, BOARD.teamNameMax);

/** Everything a POST body to /api/reactions must be. Unknown fields are ignored. */
export function checkReaction(body: unknown): { ok: true; value: ReactionRequest } | { ok: false; error: ReactionError } {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_json" };
  const b = body as Record<string, unknown>;
  if (!ACTIONS.includes(b.action)) return { ok: false, error: "bad_action" };
  if (!isGroup(b.group)) return { ok: false, error: "bad_group" };
  if (b.action === "react") {
    const from = name(b.from);
    if (!from.ok) return from;
    const to = name(b.to);
    if (!to.ok) return to;
    if (nameKey(from.value) === nameKey(to.value)) return { ok: false, error: "same_person" };
    if (b.kind !== null && !isKind(b.kind)) return { ok: false, error: "bad_kind" };
    return { ok: true, value: { action: "react", group: b.group, from: from.value, to: to.value, kind: b.kind as ReactionKind | null } };
  }
  const me = name(b.me);
  if (!me.ok) return me;
  return { ok: true, value: { action: b.action as "inbox" | "seen", group: b.group, me: me.value } };
}
