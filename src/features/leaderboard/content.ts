/**
 * The group leaderboard's numbers and words. Tune here; the logic never changes for it.
 * Colours are token names from src/app/globals.css (`var(--…)`), never typed-in colours.
 */
export const BOARD = {
  /** Invite group ids (`?g=` on the invite link): exactly this many URL-safe characters (A-Z a-z 0-9 _ -). */
  groupLength: 8,
  /** Nicknames: 1 to this many characters after trimming (each emoji or Chinese character counts as one). */
  nameMax: 12,
  /** How many rows the board shows (and the GET route returns at most). */
  top: 10,
  /** The nickname is remembered on this device under this localStorage key (it works without it). */
  nameKey: "plop.nickname",
  /** Submits per IP and group in each window; past it the server says "slow down". */
  rateLimit: { max: 10, windowSeconds: 60 },
  /**
   * Upper bound on one round's points when a set is missing from the pins' round sets (it never should be):
   * 8 cards, the full-clear bonus, a star and the bunny.
   */
  fallbackRoundMax: 15,
  /** The board's look: rank doodle fills (token names), the viewer's row wash, pencil seed spread. */
  look: {
    podium: ["var(--butter)", "var(--snow-shadow)", "var(--blush)"] as const,
    meWash: "var(--butter)",
    meWashOpacity: 0.45,
    face: 30,
    /** Each row tilts a hair, alternating, so the list looks written by hand rather than typeset. */
    rowTilt: 0.35,
    /** The "you're #2!" note springs in: seconds and how far it overshoots (share of its size). */
    noteIn: 0.5,
    noteOvershoot: 0.12,
  },
} as const;

export const TEXT = {
  title: "our snowy board",
  loading: "warming up the snow…",
  empty: "no scores yet. be the first!",
  failed: "the board is napping. try again in a moment",
  rounds: (n: number) => `${n} rounds`,
  together: "together",
  plays: (n: number) => (n === 1 ? "1 match" : `${n} matches`),
  latest: (n: number) => `last ${n}`,
  you: "you",
  youAre: (rank: number) => (rank === 1 ? "you're #1! ✿" : `you're #${rank}!`),
  submit: {
    label: "put your score on the board",
    ask: "your nickname for the board",
    placeholder: "snowy friend",
    button: "pop it on!",
    sending: "rolling it over…",
    done: (name: string) => `nice one, ${name}!`,
    again: "change name",
    privacy: "only your nickname and score are kept, nothing else",
  },
  /** What the server's error codes mean, in friendly words. */
  errors: {
    bad_json: "that didn't come through. try again?",
    bad_group: "this link's group looks broken",
    bad_name: "a nickname of 1 to 12 letters, please",
    rude_name: "let's pick a kinder nickname",
    bad_score: "that score can't happen in this match",
    bad_rounds: "a match is 3 or 5 rounds",
    bad_mode: "a match is turns or together",
    rate_limited: "slow down a little, snow takes time ✿",
    server: "the board is napping. try again in a moment",
  } as Record<string, string>,
} as const;
