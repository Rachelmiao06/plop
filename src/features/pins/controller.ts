/**
 * The pins' public state and events, shared between the 3D stage (inside the canvas) and the page
 * around it (buttons, pop-up, later the score HUD). Plain TypeScript, no drawing.
 *
 *   const pins = createPins();
 *   <SnowScene><BowlingStage /><PinsStage pins={pins} /></SnowScene>
 *   <PinsPopup pins={pins} />
 *   pins.subscribe(e => { if (e.type === "result") ... });
 */
import { ALL_SETS, FORMATIONS } from "./content";
import { formationById } from "./layout";
import { countedCards, type PinsResult } from "./scoring";

export type { PinsResult };

export type PinsPhase =
  /** Standing, waiting for a throw. */
  | "ready"
  /** A ball is on its way or cards are still moving. */
  | "throw"
  /** Counted; the pop-up is showing. */
  | "result"
  /** Fallen cards are popping back up. */
  | "resetting"
  /** The set is changing: old cards duck into the snow, new ones hop in. */
  | "changing";

export type PinsEvent =
  /** A card just tipped past "down" (live, before everything settles). `down` is the running count. */
  | { type: "knocked"; down: number; total: number }
  /** Everything settled after a throw: the count. */
  | { type: "result"; result: PinsResult }
  /** Cards are back on their spots (after a reset or a new set). */
  | { type: "ready"; formation: string; total: number }
  | { type: "phase"; phase: PinsPhase };

export type PinsState = {
  formation: string;
  phase: PinsPhase;
  /** Cards down right now in this throw. */
  down: number;
  total: number;
  last: PinsResult | null;
  debug: boolean;
};

export type PinsCommand =
  | { type: "reset" }
  | { type: "next" }
  | { type: "formation"; id: string }
  /** After the result on show, change to this set instead of popping the cards back up. */
  | { type: "after"; id: string };

export type PinsOptions = {
  /**
   * After a full clear, change to the next set by itself (default true, free play). A match turns it off:
   * the same set pops back up for the other player, and the game says when the next round's set comes.
   */
  autoNext?: boolean;
};

export type Pins = ReturnType<typeof createPins>;

export function createPins(formation = FORMATIONS[0].id, options: PinsOptions = {}) {
  let state: PinsState = {
    formation,
    phase: "ready",
    down: 0,
    total: countedCards(formationById(formation)),
    last: null,
    debug: false,
  };
  const stateListeners = new Set<() => void>();
  const eventListeners = new Set<(e: PinsEvent) => void>();
  const commands: PinsCommand[] = [];

  const set = (patch: Partial<PinsState>) => {
    state = { ...state, ...patch };
    stateListeners.forEach((l) => l());
  };

  return {
    /** For useSyncExternalStore. */
    getState: () => state,
    subscribeState(listener: () => void) {
      stateListeners.add(listener);
      return () => void stateListeners.delete(listener);
    },
    /** Every pins event (knocked, result, ready, phase). Returns a function that stops listening. */
    subscribe(listener: (e: PinsEvent) => void) {
      eventListeners.add(listener);
      return () => void eventListeners.delete(listener);
    },

    /* ---- Asked by the page (the stage carries them out on its next frame) ---- */
    /** Pop every card back to its spot now. */
    reset: () => void commands.push({ type: "reset" }),
    /** Change to the next formation. */
    next: () => void commands.push({ type: "next" }),
    /** Change to this formation. */
    setFormation: (id: string) => void commands.push({ type: "formation", id }),
    /**
     * Once the result on show has been seen, change to this set instead of popping the cards back up (a new
     * round). If the cards already stand, it changes now.
     */
    changeAfterResult: (id: string) => void commands.push({ type: "after", id }),
    /** Free play changes set after a full clear; a match does not (`PinsOptions`). */
    autoNext: options.autoNext ?? true,
    /**
     * May the throw be counted yet? "Together" mode holds the count until every player has thrown this round
     * (the cards stay where they fell meanwhile). Default: always.
     */
    countGate: (() => true) as () => boolean,
    setCountGate(gate: () => boolean) {
      this.countGate = gate;
    },
    setDebug: (debug: boolean) => set({ debug }),

    /* ---- Used by the stage ---- */
    takeCommands: (): PinsCommand[] => commands.splice(0),
    update: set,
    emit(e: PinsEvent) {
      if (e.type === "phase") set({ phase: e.phase });
      if (e.type === "knocked") set({ down: e.down, total: e.total });
      if (e.type === "result") set({ last: e.result, down: e.result.down });
      if (e.type === "ready") set({ formation: e.formation, total: e.total, down: 0 });
      eventListeners.forEach((l) => l(e));
    },
  };
}

/** The formation after this one (wraps around). */
export function nextFormationId(id: string): string {
  const i = ALL_SETS.findIndex((f) => f.id === id);
  return ALL_SETS[(i + 1) % ALL_SETS.length].id;
}
