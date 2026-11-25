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

export type GameState = {
  phase: MatchPhase;
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
export type ThrowCount = { down: number; fullClear: boolean; bonus: number };

export function pointsFor(count: ThrowCount, feel = GAME): number {
  return count.down * feel.score.perCard + (count.fullClear ? feel.score.fullClearBonus : 0) + count.bonus;
}

export function createGame(feel = GAME) {
  let state: GameState = {
    phase: "choosing",
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
  const fresh = (rounds: MatchLength, players: 1 | 2, phase: MatchPhase): GameState => ({
    ...state,
    phase,
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
  const lastThrower = () => (state.players === 2 ? 1 : 0);

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    /** The set (pins formation id) for a round of this match. */
    setFor: (round: number, rounds: MatchLength = state.rounds) => feel.match.rounds[rounds][Math.min(round, rounds - 1)],

    /** Is this throw the last one of its round? (Then the next round's set comes instead of a reset.) */
    lastOfRound: () => state.active === lastThrower(),
    /** Is this the last round? */
    lastRound: () => state.round >= state.rounds - 1,

    /** Start a match from the choice card. */
    start(rounds: MatchLength, players: 1 | 2) {
      set(fresh(rounds, players, "playing"));
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
    canThrow: (pinsStanding: boolean) => state.phase === "playing" && state.stage === "aim" && pinsStanding,

    /** The thrower id the bowling feature should use right now. */
    throwerId: () => feel.players[state.active].thrower,

    setPulling(pulling: boolean) {
      if (pulling !== state.pulling) set({ pulling });
    },

    /** The ball left the thrower's hand. */
    launched() {
      if (state.phase !== "playing" || state.stage !== "aim") return;
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
      const points = pointsFor(count, feel);
      const scores: [number, number] = [state.scores[0], state.scores[1]];
      scores[state.active] += points;
      const best: [GameState["best"][0], GameState["best"][1]] = [state.best[0], state.best[1]];
      const mine = best[state.active];
      if (!mine || points > mine.points) best[state.active] = { points, round: state.round };
      set({ stage: "counted", scores, best, gain: { id: ++gainId, player: state.active, points } });
    },

    /** The pins stand again (after their bounce, or the next round's set has hopped in). */
    pinsReady() {
      if (state.stage === "counted") set({ stage: "passing", down: 0 });
    },

    /** Hand the ball to the next player, or start the next round, or end the match. */
    passTurn() {
      if (state.stage !== "passing") return;
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
