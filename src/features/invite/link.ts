/**
 * The invite link: `/invite?g=<group>&from=<name>&score=<n>&w=<wager>`. Only a random group id (so everyone invited
 * by the same person shares one group leaderboard), a first name (at most `INVITE.link.nameMax` characters), a score
 * and a preset wager's short code (`INVITE.wagers`) travel in it, nothing else. Used by the share feature to make a link and by the invite page to read it.
 * Plain functions, safe on the server and in the browser.
 */
import { INVITE } from "./content";

export type WagerCode = (typeof INVITE.wagers.lines)[number]["code"];
export type Wager = (typeof INVITE.wagers.lines)[number];

export type Invite = { group: string | null; name: string | null; score: number | null; wager?: WagerCode | null };

const GROUP = new RegExp(`^[A-Za-z0-9_-]{${INVITE.link.groupLength}}$`);

/** A group id exactly as the leaderboard accepts it (8 URL-safe characters), or nothing. */
export function cleanGroup(raw: unknown): string | null {
  return typeof raw === "string" && GROUP.test(raw) ? raw : null;
}

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

/** A preset wager's code exactly as listed in `INVITE.wagers`, or nothing (anything else in a link is dropped). */
export function cleanWager(raw: unknown): WagerCode | null {
  return INVITE.wagers.lines.find((l) => l.code === raw)?.code ?? null;
}

/** The preset line for a code, or nothing. */
export function wagerFor(code: unknown): Wager | null {
  return INVITE.wagers.lines.find((l) => l.code === code) ?? null;
}

/** Reads the page's search params (Next.js hands them over as string | string[] | undefined). */
export function readInvite(params: Record<string, string | string[] | undefined>): Invite {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return {
    group: cleanGroup(one(params.g)),
    name: cleanName(one(params.from)),
    score: cleanScore(one(params.score)),
    wager: cleanWager(one(params.w)),
  };
}

/** The path (no origin) of an invite. */
export function invitePath({ group, name, score, wager }: Invite): string {
  const q = new URLSearchParams();
  const g = cleanGroup(group);
  if (g) q.set("g", g);
  const n = cleanName(name);
  const s = cleanScore(score);
  if (n) q.set("from", n);
  if (s !== null) q.set("score", String(s));
  const w = cleanWager(wager);
  if (w) q.set("w", w);
  const query = q.toString();
  return query ? `/invite?${query}` : "/invite";
}

/**
 * Where "接受挑战" goes: the game, keeping everything the invite brought: the group (for its leaderboard), the
 * inviter's name and score (the end card's "Moss has 18 · so close" and who lost), and the wager:
 * `/?g=<group>&from=<name>&score=<n>&w=<wager>`. `scripts/check-match.mjs` checks nothing is dropped.
 */
export function gamePath({ name = null, group = null, score = null, wager = null }: Partial<Invite> = {}): string {
  const q = new URLSearchParams();
  const g = cleanGroup(group);
  const n = cleanName(name);
  const s = cleanScore(score);
  const w = cleanWager(wager);
  if (g) q.set("g", g);
  if (n) q.set("from", n);
  if (s !== null) q.set("score", String(s));
  if (w) q.set("w", w);
  const query = q.toString();
  return query ? `/?${query}` : "/";
}

/** Page title, also what WeChat's chat card shows. */
export function inviteTitle(name: string | null): string {
  return name ? INVITE.meta.title.replace("{name}", name) : INVITE.meta.titleNoName;
}

export function inviteDescription(score: number | null): string {
  return score !== null ? INVITE.meta.descriptionScore.replace("{score}", String(score)) : INVITE.meta.description;
}
