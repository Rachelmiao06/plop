/**
 * The game's rules: the match (3 or 5 rounds), whose turn it is, the scores, and when a throw may start.
 * Plain TypeScript, no drawing and no timers; the bridge feeds it the bowling and pins events and asks it questions.
 *
 *   choosing ──start()──► playing ──last throw of the last round──► over ──again()──► playing
 *
 * In a round each player throws once (one ball per turn), then the next round brings a new set:
 *
 *   aim ──launched──► rolling ──result──► counted ──pins ready──► passing ──passTurn()──► aim (next player or round)
 *
 * A pull that is cancelled is not a throw, so the turn stays. Playing alone, the bucket snowman throws once a
 * round and plays against its own best (kept by the page, not here).
 */
import { GAME, type MatchLength } from "./content";

export type Stage =
  /** The active player may slide, pull and throw. */
  | "aim"
  /** The ball is rolling or cards are still falling. */
  | "rolling"
  /** Counted; "N down!" shows and the pins pop back (or the next round's set slides in). */
  | "counted"
  /** Pins are standing again; the turn passes in a moment. */
  | "passing";

export type MatchPhase =
  /** Before the first throw: the small "3 or 5 rounds" card. */
  | "choosing"
  | "playing"
  /** After the last round: the end card. */
  | "over";

/** "turns": one throws, then the other. "together": both snowmen on the line at once, each throws once a round. */
export type PlayMode = "turns" | "together";

export type GameState = {
  phase: MatchPhase;
  mode: PlayMode;
  /** "Together" mode: who has thrown this round. */
  thrown: readonly [boolean, boolean];
  /** How many rounds this match has, and how many players (1 = alone, against your own best). */
  rounds: MatchLength;
  players: 1 | 2;
  /** The round being played, from 0. */
  round: number;
  scores: readonly [number, number];
  active: 0 | 1;
  stage: Stage;
  /** Throws made so far in this visit (the hint fades after the first). */
  throws: number;
  /** The thrower is holding a pull right now. */
  pulling: boolean;
  /** Cards down so far in this throw (live, from the pins). */
  down: number;
  /** The latest knock-down, for the score panel's "+1"s. A new id each time. */
  knock: { id: number; count: number } | null;
  /** The points of the latest throw flying into the thrower's total. A new id each time. */
  gain: { id: number; player: 0 | 1; points: number } | null;
  /** Each player's best throw of this match: points and the round it was in (for the end card). */
  best: readonly [{ points: number; round: number } | null, { points: number; round: number } | null];
  /** Bumped each time the turn passes or a round starts, so the turn note can show again. */
  turnId: number;
};

export type Game = ReturnType<typeof createGame>;

/** What one throw scored: points per card, the full-clear bonus, and the special cut-outs' bonus from the pins. */
export type ThrowCount = {
  down: number;
  fullClear: boolean;
  bonus: number;
  /** "Together" mode: each thrower's own count (thrower id → count), from the pins. */
  byThrower?: Record<string, { down: number; fullClear: boolean; bonus: number }>;
};

export function pointsFor(count: ThrowCount, feel = GAME): number {
  return count.down * feel.score.perCard + (count.fullClear ? feel.score.fullClearBonus : 0) + count.bonus;
}

/** The time of day (0 afternoon .. 1 evening) for a round of a match of this length (`GAME.evening`). */
export function dayFor(round: number, rounds: number, feel = GAME): number {
  if (rounds <= 1) return 0;
  return (Math.min(round, rounds - 1) / (rounds - 1)) * feel.evening.lastRound;
}

export function createGame(feel = GAME) {
  let state: GameState = {
    phase: "choosing",
    mode: "turns",
    thrown: [false, false],
    rounds: feel.match.lengths[0],
    players: 2,
    round: 0,
    scores: [0, 0],
    active: 0,
    stage: "aim",
    throws: 0,
    pulling: false,
    down: 0,
    knock: null,
    gain: null,
    best: [null, null],
    turnId: 0,
  };
  /** A new match: scores and rounds from zero; the hint count and the note counter carry on. */
  const fresh = (rounds: MatchLength, players: 1 | 2, phase: MatchPhase, mode: PlayMode = state.mode): GameState => ({
    ...state,
    phase,
    mode,
    thrown: [false, false],
    rounds,
    players,
    round: 0,
    scores: [0, 0],
    active: 0,
    stage: "aim",
    pulling: false,
    down: 0,
    knock: null,
    gain: null,
    best: [null, null],
    turnId: state.turnId + 1,
  });
  let knockId = 0;
  let gainId = 0;
  /** "Together" mode: the second player's points wait a moment, so the two flights never overlap. */
  let pendingGain: GameState["gain"] = null;
  /** The points this throw has given so far, per player (a bonus recount adds only the difference). */
  let given: [number, number] = [0, 0];
  const listeners = new Set<() => void>();
  const set = (patch: Partial<GameState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  /** Send "+1"s for the cards that fell since the last count. */
  const countTo = (down: number) => {
    const count = down - state.down;
    if (count > 0) set({ down, knock: { id: ++knockId, count } });
  };

  /** The player who throws last in a round. */
  const lastThrower = () => (state.players === 2 && state.mode === "turns" ? 1 : 0);
  const together = () => state.mode === "together";
  const playerOf = (thrower: string): 0 | 1 => (feel.players[1].thrower === thrower ? 1 : 0);

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    /** The set (pins formation id) for a round of this match. */
    setFor: (round: number, rounds: MatchLength = state.rounds) => feel.match.rounds[rounds][Math.min(round, rounds - 1)],

    /** Is this throw the last one of its round? (Then the next round's set comes instead of a reset.) */
    lastOfRound: () => together() || state.active === lastThrower(),
    /** Is this the last round? */
    lastRound: () => state.round >= state.rounds - 1,

    /** Start a match from the choice card. */
    start(rounds: MatchLength, players: 1 | 2, mode: PlayMode = "turns") {
      // Together needs two throwers.
      set(fresh(rounds, mode === "together" ? 2 : players, "playing", mode));
    },
    /** The mode on the start card (before "Let's roll!"). */
    setMode(mode: PlayMode) {
      if (state.phase === "choosing" && mode !== state.mode) set({ mode });
    },
    /** The player (0 or 1) a bowling thrower id belongs to. */
    playerOf,
    /**
     * "Together" mode holds the pins' count until both have thrown this round (the cards stay where they fell).
     * Turns mode never holds it.
     */
    countGate: () => !together() || (state.thrown[0] && state.thrown[1]),
    /** Send the second player's points flying (together mode, a moment after the first). */
    flushGain() {
      if (!pendingGain) return;
      const gain = { ...pendingGain, id: ++gainId };
      pendingGain = null;
      set({ gain });
    },
    /** Play the same match again from the end card. */
    again() {
      set(fresh(state.rounds, state.players, "playing"));
    },
    /** Back to the choice card (to pick another length). */
    choose() {
      set(fresh(state.rounds, state.players, "choosing"));
    },

    /** May the thrower start a pull now? Only while playing, in the aim stage, and while the pins stand still. */
    canThrow: (pinsStanding: boolean, player: 0 | 1 = state.active, pinsInPlay = false) => {
      if (state.phase !== "playing") return false;
      if (!together()) return state.stage === "aim" && pinsStanding;
      // Together: each once a round, while the cards stand or the other ball is still rolling.
      return !state.thrown[player] && (state.stage === "aim" || state.stage === "rolling") && (pinsStanding || pinsInPlay);
    },

    /** The thrower id the bowling feature should use right now. */
    throwerId: () => feel.players[state.active].thrower,

    setPulling(pulling: boolean) {
      if (pulling !== state.pulling) set({ pulling });
    },

    /** The ball left the thrower's hand. */
    launched(thrower?: string) {
      if (state.phase !== "playing") return;
      if (together() && thrower !== undefined) {
        const p = playerOf(thrower);
        if (state.thrown[p] || (state.stage !== "aim" && state.stage !== "rolling")) return;
        const thrown: [boolean, boolean] = [state.thrown[0], state.thrown[1]];
        thrown[p] = true;
        const first = state.stage === "aim";
        set({ stage: "rolling", thrown, active: p, throws: state.throws + 1, pulling: false, ...(first ? { down: 0 } : {}) });
        return;
      }
      if (state.stage !== "aim") return;
      set({ stage: "rolling", throws: state.throws + 1, pulling: false, down: 0 });
    },

    /** A card tipped over (live). `down` is the running count for this throw. */
    knocked(down: number) {
      if (state.stage === "rolling") countTo(down);
    },

    /** Everything settled: add the points (they fly into the thrower's total). */
    result(count: ThrowCount) {
      if (state.stage !== "rolling") return;
      countTo(count.down); // a card counted only at the end still gets its "+1"
      if (together() && count.byThrower) {
        // Each player's own cards (whoever's ball reached them first), their own bonuses.
        const scores: [number, number] = [state.scores[0], state.scores[1]];
        const best: [GameState["best"][0], GameState["best"][1]] = [state.best[0], state.best[1]];
        const got: [number, number] = [0, 0];
        for (const p of [0, 1] as const) {
          const mine = count.byThrower[feel.players[p].thrower];
          if (!mine) continue;
          got[p] = pointsFor(mine, feel);
          scores[p] += got[p];
          if (!best[p] || got[p] > best[p]!.points) best[p] = { points: got[p], round: state.round };
        }
        pendingGain = { id: 0, player: 1, points: got[1] };
        given = [got[0], got[1]];
        set({ stage: "counted", scores, best, gain: { id: ++gainId, player: 0, points: got[0] } });
        return;
      }
      const points = pointsFor(count, feel);
      given = [0, 0];
      given[state.active] = points;
      const scores: [number, number] = [state.scores[0], state.scores[1]];
      scores[state.active] += points;
      const best: [GameState["best"][0], GameState["best"][1]] = [state.best[0], state.best[1]];
      const mine = best[state.active];
      if (!mine || points > mine.points) best[state.active] = { points, round: state.round };
      set({ stage: "counted", scores, best, gain: { id: ++gainId, player: state.active, points } });
    },

    /**
     * After the count, the ball's roll back from the wall knocked more cards (the pins' `recount`): their "+1"s fly and
     * the difference in points is added (never taken away). Returns true when the second player's points wait a moment.
     */
    recount(count: ThrowCount): boolean {
      if (state.stage !== "counted" && state.stage !== "passing") return false;
      countTo(count.down);
      const got: [number, number] = [given[0], given[1]];
      if (together() && count.byThrower) {
        for (const p of [0, 1] as const) {
          const mine = count.byThrower[feel.players[p].thrower];
          if (mine) got[p] = Math.max(given[p], pointsFor(mine, feel));
        }
      } else got[state.active] = Math.max(given[state.active], pointsFor(count, feel));
      const more: [number, number] = [got[0] - given[0], got[1] - given[1]];
      if (more[0] <= 0 && more[1] <= 0) return false;
      given = got;
      const scores: [number, number] = [state.scores[0] + more[0], state.scores[1] + more[1]];
      const best: [GameState["best"][0], GameState["best"][1]] = [state.best[0], state.best[1]];
      for (const p of [0, 1] as const) {
        if (more[p] > 0 && (!best[p] || got[p] > best[p]!.points)) best[p] = { points: got[p], round: state.round };
      }
      const first: 0 | 1 = more[0] > 0 ? 0 : 1;
      if (first === 0 && more[1] > 0) pendingGain = { id: 0, player: 1, points: more[1] };
      set({ scores, best, gain: { id: ++gainId, player: first, points: more[first] } });
      return first === 0 && more[1] > 0;
    },

    /** The pins stand again (after their bounce, or the next round's set has hopped in). */
    pinsReady() {
      if (state.stage === "counted") set({ stage: "passing", down: 0 });
    },

    /** Hand the ball to the next player, or start the next round, or end the match. */
    passTurn() {
      if (state.stage !== "passing") return;
      if (together()) {
        if (state.round < state.rounds - 1) {
          set({ stage: "aim", active: 0, thrown: [false, false], round: state.round + 1, turnId: state.turnId + 1 });
        } else set({ stage: "aim", thrown: [false, false], phase: "over" });
        return;
      }
      if (state.active !== lastThrower()) {
        set({ stage: "aim", active: 1, turnId: state.turnId + 1 });
      } else if (state.round < state.rounds - 1) {
        set({ stage: "aim", active: 0, round: state.round + 1, turnId: state.turnId + 1 });
      } else {
        set({ stage: "aim", phase: "over" });
      }
    },
  };
}
