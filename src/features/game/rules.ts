/**
 * The game's rules: whose turn it is, the scores, and when a throw may start. Plain TypeScript,
 * no drawing and no timers; the bridge feeds it the bowling and pins events and asks it questions.
 *
 *   aim ──launched──► rolling ──result──► counted ──pins ready──► passing ──passTurn()──► aim (other player)
 *
 * One ball per turn. A pull that is cancelled is not a throw, so the turn stays.
 */
import { GAME } from "./content";

export type Stage =
  /** The active player may slide, pull and throw. */
  | "aim"
  /** The ball is rolling or cards are still falling. */
  | "rolling"
  /** Counted; "N down!" shows and the pins pop back (or the next set slides in). */
  | "counted"
  /** Pins are standing again; the turn passes in a moment. */
  | "passing";

export type GameState = {
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
  /** Bumped each time the turn passes, so the turn note can show again. */
  turnId: number;
};

export type Game = ReturnType<typeof createGame>;

export function createGame(feel = GAME) {
  let state: GameState = {
    scores: [0, 0],
    active: 0,
    stage: "aim",
    throws: 0,
    pulling: false,
    down: 0,
    knock: null,
    turnId: 0,
  };
  let knockId = 0;
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

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    /** May the thrower start a pull now? Only in the aim stage, and only while the pins stand still. */
    canThrow: (pinsStanding: boolean) => state.stage === "aim" && pinsStanding,

    /** The thrower id the bowling feature should use right now. */
    throwerId: () => feel.players[state.active].thrower,

    setPulling(pulling: boolean) {
      if (pulling !== state.pulling) set({ pulling });
    },

    /** The ball left the thrower's hand. */
    launched() {
      if (state.stage !== "aim") return;
      set({ stage: "rolling", throws: state.throws + 1, pulling: false, down: 0 });
    },

    /** A card tipped over (live). `down` is the running count for this throw. */
    knocked(down: number) {
      if (state.stage === "rolling") countTo(down);
    },

    /** Everything settled: add the points. */
    result(down: number, fullClear: boolean) {
      if (state.stage !== "rolling") return;
      countTo(down); // a card counted only at the end still gets its "+1"
      const points = down * feel.score.perCard + (fullClear ? feel.score.fullClearBonus : 0);
      const scores: [number, number] = [state.scores[0], state.scores[1]];
      scores[state.active] += points;
      set({ stage: "counted", scores });
    },

    /** The pins stand again (after their bounce, or a new set has hopped in). */
    pinsReady() {
      if (state.stage === "counted") set({ stage: "passing", down: 0 });
    },

    /** Hand the ball to the other player. */
    passTurn() {
      if (state.stage !== "passing") return;
      set({ stage: "aim", active: state.active === 0 ? 1 : 0, turnId: state.turnId + 1 });
    },
  };
}
