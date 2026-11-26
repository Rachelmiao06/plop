/**
 * Funny titles by play style: at most one per player, the first that fits in `TITLES` order (top to bottom). Read
 * from the running totals each board line keeps (`PlayStats`, from the matches that sent their numbers) and the
 * player's place on the board. Words and thresholds are in `content.ts` (`TITLE_RULES`, `TEXT.titles`); always kind.
 * Plain TypeScript.
 */
import type { BoardEntry, PlayStats } from "./api";
import { TITLE_RULES } from "./content";

export type TitleId =
  | "king"
  | "bowlingGod"
  | "bunnyBane"
  | "bigPower"
  | "starCatcher"
  | "gentle"
  | "littleOne"
  | "newBest"
  | "regular"
  | "newcomer";

const NONE: PlayStats = { fullClears: 0, bestStreak: 0, bumps: 0, stars: 0, throws: 0, fullPower: 0, dryMatches: 0, matches: 0 };
const st = (e: BoardEntry) => e.stats ?? NONE;

/**
 * The order is the priority: being top of the group wins over everything; play-style titles come next, the rarest
 * first; being last comes after them (so a last player with a style gets the style); then the soft ones.
 */
export const TITLES: readonly { id: TitleId; fits: (e: BoardEntry, rank: number, players: number) => boolean }[] = [
  { id: "king", fits: (_e, rank, players) => rank === 1 && players >= TITLE_RULES.kingMinPlayers },
  { id: "bowlingGod", fits: (e) => st(e).bestStreak >= TITLE_RULES.godStreak },
  { id: "bunnyBane", fits: (e) => st(e).bumps >= TITLE_RULES.bunnyBumps },
  {
    id: "bigPower",
    fits: (e) => st(e).throws >= TITLE_RULES.powerMinThrows && st(e).fullPower === st(e).throws,
  },
  { id: "starCatcher", fits: (e) => st(e).stars >= TITLE_RULES.stars },
  { id: "gentle", fits: (e) => st(e).dryMatches >= TITLE_RULES.gentleMatches },
  { id: "littleOne", fits: (_e, rank, players) => players >= TITLE_RULES.lastMinPlayers && rank === players },
  { id: "newBest", fits: (e) => e.plays > 1 && e.latest === e.best },
  { id: "regular", fits: (e) => e.plays >= TITLE_RULES.regularPlays },
  { id: "newcomer", fits: (e) => e.plays === 1 },
];

/** This player's title (`rank` from 1, `players` on the board), or null. */
export function titleFor(entry: BoardEntry, rank: number, players: number): TitleId | null {
  return TITLES.find((t) => t.fits(entry, rank, players))?.id ?? null;
}
