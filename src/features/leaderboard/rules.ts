/**
 * What a score submission must look like (shared by the server route and the nickname prompt).
 * Plain TypeScript: no drawing, no storage, no timers.
 */
import { GAME } from "@/features/game/content";
import { ROUND_SETS, SPECIALS } from "@/features/pins/content";
import { BOARD } from "./content";

export type Rounds = 3 | 5;
/**
 * "turns" (versus) and "together" (each player's own score, kept for older rows) are one player's score each;
 * "team" is one entry for a team-up match: both names ("小美 & 阿雪") and the two players' points added up.
 */
export type MatchMode = "turns" | "together" | "team";
const MODES: readonly unknown[] = ["turns", "together", "team"];

/**
 * A match's play-style numbers, for the funny titles (`titles.ts`): full clears, the longest run of full clears in
 * a row, friends knocked (the bunny, the sleepy cat), star cards down, throws, throws at full pull. Optional: an
 * older game sends none, and then the stored numbers stay as they were.
 */
export type MatchStats = { clears: number; streak: number; bumps: number; stars: number; throws: number; fullPower: number };

export type Submission = { group: string; name: string; score: number; rounds: Rounds; mode: MatchMode; stats?: MatchStats };

export type ErrorCode = "bad_json" | "bad_group" | "bad_name" | "rude_name" | "bad_score" | "bad_rounds" | "bad_mode" | "bad_stats";

export type Checked<T> = { ok: true; value: T } | { ok: false; error: ErrorCode };

const GROUP = new RegExp(`^[A-Za-z0-9_-]{${BOARD.groupLength}}$`);

export function isGroup(g: unknown): g is string {
  return typeof g === "string" && GROUP.test(g);
}

/** A fresh random group id, for the test page (the invite page makes its own). */
export function newGroup() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(BOARD.groupLength));
  return Array.from(bytes, (b) => abc[b % abc.length]).join("");
}

/**
 * The most points one player can make in a match of this length: for each round's set, every card down, the
 * full-clear bonus, every star friend, and the bunny's bonus (a full clear and a standing bunny cannot both
 * happen, so this is a safe ceiling). Read from the game and the pins so it follows any tuning.
 */
export function maxScore(rounds: Rounds) {
  const per = GAME.score.perCard;
  return GAME.match.rounds[rounds].reduce((sum, id) => {
    const set = ROUND_SETS.find((s) => s.id === id);
    if (!set) return sum + BOARD.fallbackRoundMax;
    const stars = set.pins.filter((p) => p.kind === "star").length;
    const friends = set.pins.some((p) => p.kind === "friend");
    return sum + set.pins.length * per + GAME.score.fullClearBonus + stars * SPECIALS.star.bonus + (friends ? SPECIALS.friend.bonus : 0);
  }, 0);
}

/**
 * A small block-list. Latin words are matched inside the name with spaces, dots and look-alike digits removed
 * ("f.u.c.k", "sh1t"); the short ones only as the whole name or a whole word, so "Cassie" and "Scunthorpe" pass.
 * Chinese words are matched anywhere.
 */
const RUDE_ANYWHERE = [
  "fuck", "shit", "cunt", "bitch", "nigger", "nigga", "faggot", "whore", "slut", "rape", "penis", "vagina",
  "dick", "pussy", "cock", "wank", "bastard", "retard", "nazi", "hitler", "porn", "asshole",
];
const RUDE_WHOLE = ["ass", "fag", "tit", "tits", "sex", "kill", "die", "kys", "wtf", "stfu", "fu", "fk"];
const RUDE_CHINESE = [
  "傻逼", "傻b", "煞笔", "沙比", "傻屄", "操你", "草你", "肏", "屄", "草泥马", "妈的", "他妈", "你妈", "尼玛", "妈逼",
  "贱人", "婊子", "狗日", "日你", "去死", "废物", "白痴", "鸡巴", "屌", "滚蛋", "王八蛋", "垃圾人", "智障", "脑残",
];
const LOOKALIKE: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

export function isRude(name: string) {
  const lower = name.toLowerCase();
  if (RUDE_CHINESE.some((w) => lower.includes(w))) return true;
  const words = lower.split(/[^\p{L}\p{N}@$!]+/u).filter(Boolean);
  const plain = (s: string) => s.replace(/[0134579@$!]/g, (c) => LOOKALIKE[c] ?? c).replace(/[^a-z]/g, "");
  if (words.some((w) => RUDE_WHOLE.includes(plain(w)))) return true;
  const squashed = plain(lower);
  return RUDE_ANYWHERE.some((w) => squashed.includes(w));
}

/** Trim, drop control and invisible characters, fold runs of spaces into one, normalise look-alike forms. */
export function cleanName(raw: string) {
  return raw
    .normalize("NFKC")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The same nickname written in different case counts as the same person in a group. */
export function nameKey(name: string) {
  return cleanName(name).toLowerCase();
}

/** A team's board name: both nicknames joined ("小美 & 阿雪"). */
export function teamName(a: string, b: string) {
  return `${cleanName(a)} & ${cleanName(b)}`;
}

/** The most a submission of this mode may score: a team adds two players' points. */
export function maxFor(rounds: Rounds, mode: MatchMode) {
  return mode === "team" ? 2 * maxScore(rounds) : maxScore(rounds);
}

export function checkName(raw: unknown, max: number = BOARD.nameMax): Checked<string> {
  if (typeof raw !== "string") return { ok: false, error: "bad_name" };
  const name = cleanName(raw);
  const length = Array.from(name).length;
  if (length < 1 || length > max) return { ok: false, error: "bad_name" };
  if (isRude(name)) return { ok: false, error: "rude_name" };
  return { ok: true, value: name };
}

/** Everything a POST body must be. Unknown fields are ignored. */
export function checkSubmission(body: unknown): Checked<Submission> {
  if (!body || typeof body !== "object") return { ok: false, error: "bad_json" };
  const b = body as Record<string, unknown>;
  if (!isGroup(b.group)) return { ok: false, error: "bad_group" };
  if (!MODES.includes(b.mode)) return { ok: false, error: "bad_mode" };
  const mode = b.mode as MatchMode;
  const name = checkName(b.name, mode === "team" ? BOARD.teamNameMax : BOARD.nameMax);
  if (!name.ok) return name;
  if (b.rounds !== 3 && b.rounds !== 5) return { ok: false, error: "bad_rounds" };
  const score = b.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > maxFor(b.rounds, mode)) {
    return { ok: false, error: "bad_score" };
  }
  if (b.stats === undefined) return { ok: true, value: { group: b.group, name: name.value, score, rounds: b.rounds, mode } };
  const stats = checkStats(b.stats, b.rounds, mode);
  if (!stats) return { ok: false, error: "bad_stats" };
  return { ok: true, value: { group: b.group, name: name.value, score, rounds: b.rounds, mode, stats } };
}

/** Star cards a single round can have at most (from the pins' round sets). */
const MAX_STARS = Math.max(1, ...ROUND_SETS.map((s) => s.pins.filter((p) => p.kind === "star").length));

/**
 * The play-style numbers must be whole numbers a match of this length can make: one throw a round per player (two
 * players' worth for a team), no more full clears, friends or full-power throws than throws, the run of full clears
 * no longer than the match.
 */
export function checkStats(raw: unknown, rounds: Rounds, mode: MatchMode): MatchStats | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const per = mode === "team" ? 2 : 1;
  const whole = (v: unknown, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null);
  const throws = whole(r.throws, rounds * per);
  if (throws === null) return null;
  const clears = whole(r.clears, rounds * per);
  const streak = whole(r.streak, rounds);
  const bumps = whole(r.bumps, rounds * per);
  const stars = whole(r.stars, rounds * per * MAX_STARS);
  const fullPower = whole(r.fullPower, throws);
  if (clears === null || streak === null || bumps === null || stars === null || fullPower === null) return null;
  if (streak > clears) return null;
  return { clears, streak, bumps, stars, throws, fullPower };
}
