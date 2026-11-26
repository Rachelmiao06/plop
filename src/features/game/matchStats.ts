/**
 * The few play-style numbers a match sends with its score, for the board's funny titles (leaderboard feature,
 * `titles.ts`): full clears, the longest run of full clears in a row, friends (the bunny, the sleepy cat) knocked,
 * star cards down, throws, throws at full pull, and the worst throw (fewest cards down, for the opt-in "今日最惨").
 * Plain TypeScript; the bridge feeds it, the end card reads it.
 */
import { GAME } from "./content";

/** Same shape as the leaderboard's `MatchStats` (the submit payload checks it again on the server). */
export type MatchStats = {
  clears: number;
  streak: number;
  bumps: number;
  stars: number;
  throws: number;
  fullPower: number;
  /** Fewest cards down in one throw this match (left out when no throw was counted). */
  worst?: number;
};

type RoundCount = { fullClear: boolean; friend: "safe" | "bumped" | null; stars: number; down: number };

/** A pull at least this strong (0..1) counts as a full-power throw. */
export const FULL_POWER = 0.95;

export function createMatchStats() {
  const rounds: [Map<number, RoundCount>, Map<number, RoundCount>] = [new Map(), new Map()];
  const launches = [
    { throws: 0, full: 0 },
    { throws: 0, full: 0 },
  ];
  return {
    /** A new match. */
    reset() {
      rounds[0].clear();
      rounds[1].clear();
      launches.forEach((l) => ((l.throws = 0), (l.full = 0)));
    },
    /** Which player a thrower id belongs to. */
    playerOf: (thrower: string): 0 | 1 => (GAME.players[1].thrower === thrower ? 1 : 0),
    launched(player: 0 | 1, power: number) {
      launches[player].throws++;
      if (power >= FULL_POWER) launches[player].full++;
    },
    /** A round's count for a player (a recount after the roll back from the wall replaces it). */
    counted(player: 0 | 1, round: number, count: RoundCount) {
      rounds[player].set(round, { fullClear: count.fullClear, friend: count.friend, stars: count.stars, down: count.down });
    },
    /** One player's numbers. */
    of(player: 0 | 1): MatchStats {
      const list = [...rounds[player].entries()].sort((a, b) => a[0] - b[0]);
      let streak = 0;
      let run = 0;
      let prev = -2;
      for (const [round, c] of list) {
        run = c.fullClear ? (round === prev + 1 ? run + 1 : 1) : 0;
        if (c.fullClear) prev = round;
        streak = Math.max(streak, run);
      }
      return {
        clears: list.filter(([, c]) => c.fullClear).length,
        streak,
        bumps: list.filter(([, c]) => c.friend === "bumped").length,
        stars: list.reduce((n, [, c]) => n + c.stars, 0),
        throws: launches[player].throws,
        fullPower: launches[player].full,
        ...(list.length > 0 && { worst: Math.min(...list.map(([, c]) => c.down)) }),
      };
    },
    /** A team's numbers: both players' added up, the longer run of full clears. */
    team(): MatchStats {
      const [a, b] = [this.of(0), this.of(1)];
      return {
        clears: a.clears + b.clears,
        streak: Math.max(a.streak, b.streak),
        bumps: a.bumps + b.bumps,
        stars: a.stars + b.stars,
        throws: a.throws + b.throws,
        fullPower: a.fullPower + b.fullPower,
        ...((a.worst !== undefined || b.worst !== undefined) && { worst: Math.min(a.worst ?? Infinity, b.worst ?? Infinity) }),
      };
    },
  };
}

export type MatchStatsTracker = ReturnType<typeof createMatchStats>;
