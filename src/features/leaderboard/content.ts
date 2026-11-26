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
 * #1 on top of the ranked list (Rachel's approved design): her "sassy" snowman (hands in pockets, sunglasses,
 * leaning) on a little snow mound, with the crown and sparkles above, and the "deal with it" moment when the board
 * opens or someone takes #1: sunglasses drop onto its face, bounce, glint, and it does a smug little lift.
 */
export const CHAMP = {
  art: {
    /** #1's snowman with sunglasses on, matching the player's snowman. Cleaned copies of Rachel's sprites. */
    sassy: { bucket: "/assets/leaderboard/sassy-bucket.webp", redHat: "/assets/leaderboard/sassy-redhat.webp" },
    /**
     * The same pose without sunglasses, shown while they fall. STAND-IN until Rachel's versions arrive: the art with
     * the glasses drawn on. When they do, point these at the new files and set `bareHasGlasses` to false.
     */
    bare: { bucket: "/assets/leaderboard/sassy-bucket.webp", redHat: "/assets/leaderboard/sassy-redhat.webp" },
    /** The falling sunglasses. STAND-IN: cut from the sassy art (frames and lenses only). Swap for Rachel's file. */
    glasses: "/assets/leaderboard/sunglasses-standin.webp",
    /** While `bare` still has glasses drawn on, the falling pair fades out as it lands on the drawn ones. */
    bareHasGlasses: true,
  },
  /** Where the sunglasses sit on the sprite (shares of its width and height), and the sprite's height over width. */
  glassesAt: { left: 0.2, top: 0.3746, width: 0.5692 },
  aspect: 705 / 440,
  /** The sprite's width (px), and the snow mound's (share of it). */
  width: 112,
  mound: 1.45,
  /** The idle sway: seconds per loop, degrees. */
  sway: { loop: 3.4, tilt: 2.5 },
  /**
   * The "deal with it" moment, in seconds from the start: the glasses wait, fall (from `from` px above, spinning
   * `spin` degrees), bounce, then the glint and the smug lift. The jingle follows the same clock.
   */
  drop: { delay: 0.3, fall: 0.62, bounce: 0.3, from: 150, spin: 28, glintAt: 1.32, smugAt: 1.45 },
  /** The cheeky jingle (synthesized, original): how loud (0..1). */
  jingle: { volume: 0.32 },
} as const;

/** The ranked list's rows. */
export const LIST = {
  /** The avatar's size (px) and its corner radius. */
  avatar: 34,
  /** The tiny snow mark for today's hits on the avatar (px). */
  hitMark: 15,
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

/**
 * Sticker reactions on friends' lines: four of Rachel's effect doodles, one per person per line, changeable. The
 * owner sees who reacted the next time they open the game or the invite page. Preset only.
 */
export const REACTIONS = {
  kinds: ["star", "wow", "lol", "music"] as const,
  art: {
    star: { src: "/assets/effects/star.webp", w: 205, h: 178 },
    wow: { src: "/assets/effects/surprise-lines.webp", w: 264, h: 145 },
    lol: { src: "/assets/effects/snow-puff.webp", w: 306, h: 235 },
    music: { src: "/assets/effects/music-notes.webp", w: 284, h: 234 },
  },
  /** Sets and changes per IP and group per window, in the server's memory. */
  rateLimit: { max: 30, windowSeconds: 60 },
  /** Hold a friend's row this long (ms) to open the stickers. */
  holdMs: 420,
  /** The doodle size in the picker and next to the score (px). */
  pickSize: 30,
  countSize: 15,
  /** How far back the "X reacted" note looks, and how many it reads at most. */
  inboxDays: 14,
  inboxMax: 30,
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
  title: "雪仗排行榜",
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
  champ: "the snowball champion",
  /**
   * One language per line (Rachel): Chinese where the fun is in Chinese (titles, stickers, 今日最惨, the notes' headlines
   * and their buttons), simple English for plain UI.
   */
  /** The opt-in "今日最惨". Gentle: only for those who asked to be laughed at. */
  oops: {
    /** On the end card's score prompt (left as it was: the end card is being redesigned on its own). */
    optIn: { zh: "让大家笑一下我最惨的一球", en: "Let the group laugh at my worst throw today" },
    heading: "今日最惨",
    line: (name: string, n: number) => `${name}今天有一球只倒了${n}个 😵`,
  },
  reactions: {
    names: { star: "厉害", wow: "哇", lol: "笑死", music: "好听" },
    open: (name: string) => `stick a sticker on ${name}`,
    hint: "hold a friend or tap + for a sticker",
    remove: "take it back",
    got: (name: string, more: number) => (more > 0 ? `${name}和另外${more}人给你贴了贴纸` : `${name}给你点了个`),
    nice: "好耶",
    failed: "didn't stick, try again",
  },
  toPass: (n: number, name: string) => `${n} to pass ${name}`,
  onTop: "you're #1!",
  /** "X just passed you" (`OvertakeNotice`). Never mean: a little huff, then a way back. */
  overtake: {
    line: (name: string, by: number) => `${name}刚刚超过你${by}分 😤`,
    others: (n: number) => `还有${n}人也超过了你`,
    revenge: "复仇",
    later: "later",
  },
  /**
   * The funny titles: the board shows the Chinese only; the end card (being redesigned on its own) still shows the
   * short English line under it. Always kind.
   */
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
    hint: "tap a friend to throw a snowball ❄",
    throwAt: (name: string) => `throw a snowball at ${name}`,
    hits: (n: number) => `被砸了${n}次`,
    wait: (minutes: number) => `try again in ${minutes} min`,
    failed: "missed, try again",
    gotYou: (name: string, more: number) => (more > 0 ? `你被${name}和另外${more}人砸了一脸雪！` : `你被${name}砸了一脸雪！`),
    back: "砸回去",
    later: "later",
  },
  list: "the exact scores",
  seeAll: (n: number) => `see all ${n}`,
  fewer: "fewer",
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
    bad_kind: "that sticker isn't one of ours",
    rate_limited: "slow down a little, snow takes time ✿",
    server: "the board is napping. try again in a moment",
  } as Record<string, string>,
} as const;
