/**
 * The invite link: `/invite?from=<name>&score=<n>`. Only a first name (at most `INVITE.link.nameMax` characters)
 * and a score travel in it, nothing else. Used by the share feature to make a link and by the invite page to read it.
 * Plain functions, safe on the server and in the browser.
 */
import { INVITE } from "./content";

export type Invite = { name: string | null; score: number | null };

/** Trim, drop control characters and angle brackets, squeeze spaces, cap at `nameMax` characters (not bytes). */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const plain = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  const capped = Array.from(plain).slice(0, INVITE.link.nameMax).join("").trim();
  return capped || null;
}

/** A whole number from 0 to `scoreMax`, or nothing. */
export function cleanScore(raw: unknown): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const n = typeof raw === "number" ? raw : Number(raw.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(INVITE.link.scoreMax, Math.round(n));
}

/** Reads the page's search params (Next.js hands them over as string | string[] | undefined). */
export function readInvite(params: Record<string, string | string[] | undefined>): Invite {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return { name: cleanName(one(params.from)), score: cleanScore(one(params.score)) };
}

/** The path (no origin) of an invite. */
export function invitePath({ name, score }: Invite): string {
  const q = new URLSearchParams();
  const n = cleanName(name);
  const s = cleanScore(score);
  if (n) q.set("from", n);
  if (s !== null) q.set("score", String(s));
  const query = q.toString();
  return query ? `/invite?${query}` : "/invite";
}

/** Where "接受挑战" goes: the game, keeping the inviter's name so the game can say "vs {name}" one day. */
export function gamePath(name: string | null): string {
  const n = cleanName(name);
  return n ? `/?from=${encodeURIComponent(n)}` : "/";
}

/** Page title, also what WeChat's chat card shows. */
export function inviteTitle(name: string | null): string {
  return name ? INVITE.meta.title.replace("{name}", name) : INVITE.meta.titleNoName;
}

export function inviteDescription(score: number | null): string {
  return score !== null ? INVITE.meta.descriptionScore.replace("{score}", String(score)) : INVITE.meta.description;
}
