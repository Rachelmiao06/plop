/**
 * The group leaderboard's numbers and words. Tune here; the logic never changes for it.
 * Colours are token names from src/app/globals.css (`var(--…)`), never typed-in colours.
 */
export const BOARD = {
  /** Invite group ids (`?g=` on the invite link): exactly this many URL-safe characters (A-Z a-z 0-9 _ -). */
  groupLength: 8,
  /** Nicknames: 1 to this many characters after trimming (each emoji or Chinese character counts as one). */
  nameMax: 12,
  /** A team-up entry's name, both nicknames joined: two of `nameMax` and " & " between. */
  teamNameMax: 27,
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
    face: 22,
    /** The list under the pile shows this many from the top, plus your own line; the rest behind "see all". */
    listTop: 3,
    /** Each row tilts a hair, alternating, so the list looks written by hand rather than typeset. */
    rowTilt: 0.35,
    /** The "you're #2!" note springs in: seconds and how far it overshoots (share of its size). */
    noteIn: 0.5,
    noteOvershoot: 0.12,
  },
  /**
   * Gentle idle motion (Rachel: cuter with a little movement). Seconds per loop, degrees, pixels. All of it stops
   * when the device asks for reduced motion.
   */
  motion: {
    /** The winner's crown rocks side to side and hops a little at the top of each rock. */
    crownLoop: 2.8,
    crownTilt: 9,
    crownHop: 3,
    /** The #1 circle wobbles slowly, like a sticker not quite stuck down. */
    podiumLoop: 3.6,
    podiumTilt: 4,
    /** The title star twinkles: a small turn and a swell. */
    starLoop: 3.4,
    starTilt: 12,
    starSwell: 0.14,
    /** Your row's crayon highlight is scribbled in from the left when it appears (and when your score lands). */
    scribbleIn: 0.7,
    /** The "you're #2!" note bobs softly once it has popped in. */
    noteBobLoop: 2.6,
    noteBob: 2.5,
  },
} as const;

/**
 * The snowman pile (the "stand on top" board): every player is a little snowman from Rachel's thrower cut-outs,
 * and better scores stand higher, on the heads of the ones below. Sizes are shares of a slot's width; seconds,
 * degrees, pixels otherwise.
 */
export const PILE = {
  /**
   * How many snowmen stand in each row, top row first, for 1 to 10 players. #1 is always alone on top; a row is
   * never wider than the one under it, so everyone stands on someone (or on the snow).
   */
  rows: [[1], [1, 1], [1, 2], [1, 1, 2], [1, 2, 2], [1, 2, 3], [1, 1, 2, 3], [1, 2, 2, 3], [1, 2, 3, 3], [1, 2, 3, 4]] as const,
  /** Widest a slot gets (px); on a phone the widest row shares the board's width. */
  maxSlot: 72,
  /** The cut-out's width as a share of its slot (the rest is breathing room). */
  body: 0.92,
  /** Cut-out height over width (Rachel's thrower art is about 309 × 421 and 323 × 479). */
  aspect: 1.42,
  /** A team entry: both snowmen side by side, each this much smaller, overlapping this share of a width. */
  team: { scale: 0.8, overlap: 0.5 },
  /** How deep the feet sink into the head below (share of a snowman's height): they stand on the hat. */
  sink: 0.13,
  /** Somebody on your head: you get squashed this much, a bit more for every row stacked above that. */
  squash: { base: 0.12, perRow: 0.04, max: 0.24, widen: 0.5 },
  /** Each snowman leans a hair, from its name, so the pile looks wobbly rather than stacked by a machine. */
  lean: 3.5,
  /** The nickname and score, handwritten on the belly: share of the slot width, and how high up the body (share). */
  name: { width: 0.96, lift: 0.17 },
  /** Light depth (Rachel: no boxes, a little 3D feel, not real 3D): a soft shadow under the feet (shares of a slot's
   * width, blur px) and on the cut-out itself (px). */
  shadow: { width: 0.72, height: 0.11, blur: 2.5, drop: 2.5 },
  /** Rachel's far hills behind the pile: height (px), how much of it sits below the bottom row's feet (share, so
   * they stand on its ground line), and how faint. */
  hills: { height: 70, ground: 0.1, opacity: 0.7 },
  /** Today's hits: a clump of snow stuck to the head (share of a slot's width, how high up the body). */
  stuck: { size: 0.34, lift: 0.7 },
  /** The crown on #1: share of a slot's width, and how high above the head. */
  crown: { size: 0.42, lift: 0.1 },
  /** The viewer's own snowman gets a soft butter glow behind it. */
  glow: { opacity: 0.55, size: 0.62 },
  /** Rachel's surprise lines beside a squashed snowman's head (px). */
  oof: 18,
  /**
   * Overtaking: the one going up hops over in an arc and plops onto the one below with a squish and a puff of
   * snow; the one going down slides to its new place first and is squashed as the other lands.
   */
  motion: {
    /** Seconds for the hop over. */
    hop: 0.9,
    /** How high above its new place the climber goes (share of a snowman's height). */
    hopHeight: 0.55,
    /** Seconds for the one going down. */
    slide: 0.5,
    /** The landing squish: wide and short, then a little stretch, then still. */
    landSquish: 0.24,
    land: 0.42,
    /** New players drop in from this high (share of a snowman's height). */
    dropFrom: 1.4,
    /** On first view the pile pops in from the bottom row up, this many seconds per row. */
    rowStagger: 0.09,
  },
} as const;

/**
 * Snowballs between friends: tap a friend's snowman on the board to throw one. They see a splat and "you got hit"
 * the next time they open the game or the invite page, with a "throw back" button. Preset words only.
 */
export const SNOWBALL = {
  /** One throw per friend per this many minutes (the database checks it). */
  cooldownMinutes: 60,
  /** Throws per IP and group per window, in the server's memory, on top of the per-friend rule. */
  rateLimit: { max: 20, windowSeconds: 60 },
  /** "Today" for the count on each snowman starts at midnight in this UTC offset (China, no daylight saving). */
  dayUtcOffsetHours: 8,
  /** How far back the "you got hit" note looks, and how many throws it reads at most. */
  inboxDays: 7,
  inboxMax: 20,
  /** The throw on the board: seconds of flight, arc height (share of the distance, at least `arcMin` px). */
  flight: 0.62,
  arc: 0.45,
  arcMin: 50,
  /** The snowball's size (px) and the splat's (share of a slot's width). */
  ball: 16,
  splat: 0.9,
  /** How long the "in a bit" note stays when a friend was hit too recently (seconds). */
  waitNote: 2.2,
} as const;

/** When a funny title fits (see `titles.ts` for the order). Matches and throws count only games that sent numbers. */
export const TITLE_RULES = {
  /** 雪球大王 needs at least this many on the board (alone you are not a king of anything). */
  kingMinPlayers: 2,
  /** 保龄球之神: this many full clears in a row in one match. */
  godStreak: 2,
  /** 兔子杀手: friends (the bunny, the sleepy cat) knocked over, in all. */
  bunnyBumps: 3,
  /** 大力出奇迹: every throw at full pull, over at least this many throws. */
  powerMinThrows: 5,
  /** 星星收集家: star cards down, in all. */
  stars: 3,
  /** 温柔的人: this many matches in a row without a full clear. */
  gentleMatches: 3,
  /** 雪地小可怜: last on a board of at least this many. */
  lastMinPlayers: 3,
  /** 雪地常客: matches played. */
  regularPlays: 8,
} as const;

export const TEXT = {
  title: "our snowy board",
  loading: "warming up the snow…",
  empty: "no scores yet. be the first!",
  failed: "the board is napping. try again in a moment",
  rounds: (n: number) => `${n} rounds`,
  together: "together",
  team: "team",
  plays: (n: number) => (n === 1 ? "1 match" : `${n} matches`),
  latest: (n: number) => `last ${n}`,
  you: "you",
  youAre: (rank: number) => (rank === 1 ? "you're #1! ✿" : `you're #${rank}!`),
  pile: "who's standing on whom",
  /** The funny titles: Chinese on the board, a short English line beside it. Always kind. */
  titles: {
    king: { zh: "雪球大王", en: "king of the snowballs" },
    bowlingGod: { zh: "保龄球之神", en: "two full clears in a row!" },
    bunnyBane: { zh: "兔子杀手", en: "sorry, bunny (×3)" },
    bigPower: { zh: "大力出奇迹", en: "every throw at full power" },
    starCatcher: { zh: "星星收集家", en: "loves the star friends" },
    gentle: { zh: "温柔的人", en: "too kind to clear them all" },
    littleOne: { zh: "雪地小可怜", en: "cheer up, little snowman" },
    newBest: { zh: "刚刚破纪录", en: "just beat their best" },
    regular: { zh: "雪地常客", en: "always out in the snow" },
    newcomer: { zh: "新来的小雪人", en: "just rolled in" },
  },
  snowball: {
    hint: "tap a friend to throw ❄",
    hintZh: "点朋友扔个雪球",
    throwAt: (name: string) => `throw a snowball at ${name}`,
    hits: (n: number) => `被砸了${n}次`,
    hitsEn: (n: number) => (n === 1 ? "hit once today" : `hit ${n} times today`),
    wait: (minutes: number) => `再等${minutes}分钟 · in ${minutes} min`,
    failed: "雪球没扔出去 · missed, try again",
    gotYouZh: (name: string, more: number) => (more > 0 ? `你被${name}和另外${more}人砸了一脸雪！` : `你被${name}砸了一脸雪！`),
    gotYouEn: (name: string, more: number) => (more > 0 ? `${name} and ${more} more got you!` : `${name} got you!`),
    back: { zh: "砸回去", en: "Throw back" },
    later: "later · 下次吧",
  },
  list: "the exact scores",
  seeAll: (n: number) => `看全部 · see all ${n}`,
  fewer: "收起 · fewer",
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
    bad_mode: "a match is turns, together or a team",
    bad_stats: "those match numbers look off. try again?",
    rate_limited: "slow down a little, snow takes time ✿",
    server: "the board is napping. try again in a moment",
  } as Record<string, string>,
} as const;
