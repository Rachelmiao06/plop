/*
  Scenery: flat hand-drawn cut-outs ("standees") planted upright in the snow.
  Every standee turns to face the camera. See README.md for how part 2 places them.

  Units: one scene unit = one main character's height.
  Axes (same as Three.js): x to the right, z toward the default camera.
  Negative z is the back of the village. The play area is centred on (0, 0).

  Files are found by name: public/assets/scenery/<name>.webp. Pixel sizes are read from
  sizes.json, which `python3 scripts/slice_scenery.py` rewrites. Replacing art needs no code change.
*/

import effectSizes from "./effect-sizes.json";
import sizes from "./sizes.json";

export type PropGroup = "big" | "tree" | "mid" | "small" | "person" | "friend";

/**
 * standee: upright cut-out in the snow (the default).
 * character: a reference for a 3D main character; shown on the page, never placed as scenery.
 * decal: a flat flourish (for example drifting in the air); not a standee.
 */
export type PropKind = "standee" | "character" | "decal";

/**
 * What a standee does in paper bowling (docs/GAMEPLAY.md):
 * frame: village scenery along the lane, never knocked down. pin: a cut-out the ball can topple.
 * thrower: the paper snowman at the throwing line.
 */
export type PropRole = "frame" | "pin" | "thrower";

/** Rough physics hints for a pin, for the toppling work later (no physics here yet). */
export type PinSpec = {
  /** Width and depth of the card's base on the snow, in scene units. */
  footprint: [number, number];
  /** light = tips at a touch (tall, thin); heavy = needs a big ball (wide, low). */
  weight: "light" | "medium" | "heavy";
};

/** Settings per prop. */
export type SceneryProp = {
  /** Shown on /dev/scenery. */
  label: string;
  /** Height of the whole file above the snow once planted, in scene units (includes floating bits like snow dots). */
  height: number;
  group: PropGroup;
  /** How far the base sinks below the snow surface, in scene units (hides the hard bottom edge). */
  sink: number;
  /** "doodle" = Rachel's current set. "crayon" = the first set, kept as spares. */
  set: "doodle" | "crayon";
  kind?: PropKind;
  role?: PropRole;
  /** Only for pins. */
  pin?: PinSpec;
  /** Kept for later, not used in the layout. */
  spare?: boolean;
  /** Reads as moving: a candidate for a small looping motion later (part 2 or after). */
  motion?: "loop";
};

export const props = {
  /* ---- Current set: Rachel's doodle stickers ---- */

  // Throwers: the paper snowman at the line, one per player (front views of the turnaround sheets).
  "thrower-bucket": { label: "Thrower, player 1 (bucket snowman)", height: 1, group: "person", sink: 0.03, set: "doodle", role: "thrower" },
  "thrower-redhat": { label: "Thrower, player 2 (red-hat snowman)", height: 1, group: "person", sink: 0.03, set: "doodle", role: "thrower" },

  // Frame: village scenery along the lane and at the far end. Never knocked down.
  "tree-snowmen": { label: "Big tree with tiny snowmen", height: 2, group: "big", sink: 0.08, set: "doodle", role: "frame" },
  "cottage-blue": { label: "Cottage with a blue roof", height: 1.6, group: "big", sink: 0.08, set: "doodle", role: "frame" },
  "igloo-friends": { label: "Igloo with a snowman in the window", height: 1.2, group: "big", sink: 0.08, set: "doodle", role: "frame" },
  "pine-snow-tall": { label: "Tall snowy pine", height: 1.6, group: "tree", sink: 0.05, set: "doodle", role: "frame" },
  "pine-snow-short": { label: "Short snowy pine", height: 1.1, group: "tree", sink: 0.05, set: "doodle", role: "frame" },
  "mound-snow": { label: "Snow mound", height: 0.38, group: "small", sink: 0.06, set: "doodle", role: "frame" },
  "bush-snow": { label: "Round snowy bush", height: 0.5, group: "small", sink: 0.04, set: "doodle", role: "frame" },

  // Pins: the little friends the ball knocks down. Footprint = card base (width, depth); weight for the physics later.
  "flag-blue": { label: "Blue snowman flag", height: 1.15, group: "mid", sink: 0.06, set: "doodle", role: "pin", pin: { footprint: [0.2, 0.2], weight: "light" } },
  "girl-earmuffs": { label: "Girl with earmuffs", height: 0.85, group: "person", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.4, 0.2], weight: "light" } },
  skier: { label: "Skier in a mint coat", height: 0.85, group: "person", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.45, 0.25], weight: "light" }, motion: "loop" },
  "penguin-bag": { label: "Penguin with a shoulder bag", height: 0.6, group: "friend", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.3, 0.18], weight: "light" } },
  "penguin-slide": { label: "Sliding penguin", height: 0.35, group: "friend", sink: 0.02, set: "doodle", role: "pin", pin: { footprint: [0.4, 0.22], weight: "light" }, motion: "loop" },
  "pine-walking": { label: "Walking pine with a backpack", height: 0.9, group: "friend", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.45, 0.22], weight: "medium" } },
  "snowman-newspaper": { label: "Snowman reading a newspaper", height: 0.85, group: "friend", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.5, 0.25], weight: "medium" } },
  "boy-snowman": { label: "Boy holding hands with a little snowman", height: 0.85, group: "person", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.75, 0.25], weight: "medium" } },
  "signpost-snowman": { label: "Signpost with a snowman arrow", height: 0.75, group: "mid", sink: 0.05, set: "doodle", role: "pin", pin: { footprint: [0.75, 0.2], weight: "medium" } },
  "snowman-bucket-hat": { label: "Big sitting snowman (bucket hat)", height: 0.9, group: "friend", sink: 0.03, set: "doodle", role: "pin", pin: { footprint: [0.6, 0.35], weight: "heavy" } },
  "bench-snowmen": { label: "Two snowmen on a bench", height: 0.85, group: "mid", sink: 0.04, set: "doodle", role: "pin", pin: { footprint: [0.9, 0.35], weight: "heavy" } },
  "log-music": { label: "Hollow log with radio, snowman and penguin", height: 0.95, group: "mid", sink: 0.06, set: "doodle", role: "pin", pin: { footprint: [1.5, 0.45], weight: "heavy" } },

  // Not a standee
  "wind-swirl": { label: "Wind swirl (decal)", height: 0.6, group: "small", sink: 0, set: "doodle", kind: "decal" },

  /* ---- Spares: the first crayon set ---- */
  "tree-bare": { label: "Bare tree with ornaments", height: 3.4, group: "big", sink: 0.08, set: "crayon", spare: true },
  cottage: { label: "Cottage", height: 3, group: "big", sink: 0.1, set: "crayon", spare: true },
  igloo: { label: "Igloo", height: 2.2, group: "big", sink: 0.1, set: "crayon", spare: true },
  "pine-tall": { label: "Tall pine", height: 3, group: "tree", sink: 0.08, set: "crayon", spare: true },
  "pine-medium": { label: "Medium pine", height: 2.4, group: "tree", sink: 0.07, set: "crayon", spare: true },
  "pine-small": { label: "Small pine", height: 1.7, group: "tree", sink: 0.06, set: "crayon", spare: true },
  signpost: { label: "Signpost", height: 1.3, group: "mid", sink: 0.06, set: "crayon", spare: true },
  flag: { label: "Flag", height: 1.8, group: "mid", sink: 0.08, set: "crayon", spare: true },
  bench: { label: "Bench", height: 0.9, group: "mid", sink: 0.04, set: "crayon", spare: true },
  "log-hollow": { label: "Hollow log", height: 0.9, group: "mid", sink: 0.06, set: "crayon", spare: true },
  "street-lamp": { label: "Street lamp", height: 1.8, group: "mid", sink: 0.07, set: "crayon", spare: true },
  fence: { label: "Fence", height: 0.8, group: "mid", sink: 0.05, set: "crayon", spare: true },
  mailbox: { label: "Mailbox", height: 1.1, group: "mid", sink: 0.05, set: "crayon", spare: true },
  radio: { label: "Radio", height: 0.45, group: "small", sink: 0.02, set: "crayon", spare: true },
  bucket: { label: "Bucket", height: 0.4, group: "small", sink: 0.03, set: "crayon", spare: true },
  "berry-bush": { label: "Berry bush", height: 0.8, group: "small", sink: 0.05, set: "crayon", spare: true },
  "snow-mound": { label: "Snow mound", height: 0.45, group: "small", sink: 0.08, set: "crayon", spare: true },
  "snowball-pile": { label: "Snowball pile", height: 0.55, group: "small", sink: 0.04, set: "crayon", spare: true },
  sled: { label: "Sled", height: 0.45, group: "small", sink: 0.03, set: "crayon", spare: true },
  "snowman-sitting": { label: "Snowman sitting (red scarf)", height: 0.65, group: "friend", sink: 0.04, set: "crayon", spare: true },
  "snowman-reading": { label: "Snowman reading", height: 0.75, group: "friend", sink: 0.04, set: "crayon", spare: true },
  "snowman-waving": { label: "Snowman waving", height: 0.8, group: "friend", sink: 0.04, set: "crayon", spare: true },
  "penguin-standing": { label: "Penguin standing", height: 0.5, group: "friend", sink: 0.03, set: "crayon", spare: true },
  "penguin-sliding": { label: "Penguin sliding", height: 0.3, group: "friend", sink: 0.03, set: "crayon", spare: true },
} satisfies Record<string, SceneryProp>;

export type PropId = keyof typeof props;

export const propIds = Object.keys(props) as PropId[];

/** The settings of a prop, typed loosely so optional fields can be read. */
export const propSettings = (id: string): SceneryProp | undefined =>
  (props as Record<string, SceneryProp | undefined>)[id];

/** Pixel sizes of the files, written by scripts/slice_scenery.py. */
const pixelSizes: Record<string, { w: number; h: number } | undefined> = sizes;

/** Where the file for a prop lives (under /public). */
export const propSrc = (id: string) => `/assets/scenery/${id}.webp`;

/** Pixel size of the prop's file, or undefined if no sheet has produced it yet. */
export const propPx = (id: string) => pixelSizes[id];

/** Width in scene units, from the height and the file's shape (square if the file is missing). */
export function propWidth(id: PropId): number {
  const px = propPx(id);
  return px ? (props[id].height * px.w) / px.h : props[id].height;
}

/** Files the slicer made that have no settings above yet (new names from new sheets). */
export const filesWithoutSettings = Object.keys(pixelSizes).filter((name) => !(name in props));

/* ------------------------------------------------------------------ */
/* Effects                                                              */
/* ------------------------------------------------------------------ */

/**
 * Effect marks: flat doodles that pop or drift for a moment (on a hit, a launch, near music).
 * Not standees and never in the layout. Files: public/assets/effects/<name>.webp.
 * `size` is a suggested height in scene units when shown in the scene.
 */
export type Effect = { label: string; size: number; note: string };

export const effects = {
  "surprise-lines": { label: "Surprise lines", size: 0.45, note: "Pop above a character's head when hit." },
  star: { label: "Star", size: 0.3, note: "A twinkle on a good hit or a full charge." },
  "snow-puff": { label: "Snow puff with droplets", size: 0.6, note: "Where a snowball bursts." },
  "music-notes": { label: "Music notes", size: 0.4, note: "Float above the radio on the log (log-music), drifting up and fading." },
  "snow-ring": { label: "Ring of snow dots", size: 0.5, note: "A small burst ring on landing." },
  "wind-curl": { label: "Wind curl", size: 0.6, note: "Drifts past now and then, or trails a fast snowball." },
} satisfies Record<string, Effect>;

export type EffectId = keyof typeof effects;

const effectPixelSizes: Record<string, { w: number; h: number } | undefined> = effectSizes;

/** Where an effect's file lives (under /public). */
export const effectSrc = (id: string) => `/assets/effects/${id}.webp`;

/** Pixel size of an effect's file, or undefined if no sheet has produced it yet. */
export const effectPx = (id: string) => effectPixelSizes[id];

/* ------------------------------------------------------------------ */
/* Throwing view camera (for the previews)                              */
/* ------------------------------------------------------------------ */

/**
 * The paper-bowling throwing view (docs/GAMEPLAY.md): behind and above the thrower, looking down the lane.
 * The snow scene does not have this view yet; this is the proposal the previews use. Same lens as the
 * snow scene (22 degree field of view). Its camera turns at most 60 degrees left or right and never
 * looks at the back of the cut-outs.
 */
export const previewCamera = {
  elevation: 20, // degrees above the ground
  fieldOfView: 22, // vertical, degrees (the snow scene's lens)
  distance: 14, // from the point it looks at
  /** The point it looks at: a little above the snow, part way down the lane. */
  target: [0, 0.5, -4] as [number, number, number],
  aspect: 16 / 9, // a landscape screen; a phone held upright sees less at the sides
  /** A second preview, pulled back this many times the distance, to see the whole lane. */
  pulledBack: 1.45,
};

/* ------------------------------------------------------------------ */
/* The lane and its framing                                             */
/* ------------------------------------------------------------------ */

/**
 * Paper bowling: the thrower stands at the line near the camera (z = 0) and rolls toward the pins further
 * down the lane (negative z). Village props frame both sides and the far end; the lane stays clear.
 */
export const lane = {
  /** Where the thrower stands and slides left and right. */
  throwLine: { z: 0, halfWidth: 1.6 },
  /** Where pin formations stand (centre and half sizes). */
  pinZone: { x: 0, z: -6.5, halfWidth: 1.6, halfDepth: 1.5 },
  /** No frame prop may reach into this box: the roll path from the line to past the pins. */
  clear: { minX: -2, maxX: 2, minZ: -8.6, maxZ: 1.6 },
  /** Between the camera and the line (z above this) nothing taller than `nearMaxHeight` within the camera's middle. */
  nearZ: 0.6,
  nearHalfWidth: 3,
  nearMaxHeight: 0.45,
};

/** Who throws: player 1 and player 2 (docs/GAMEPLAY.md section 2). */
export const throwers: [PropId, PropId] = ["thrower-bucket", "thrower-redhat"];

/** The area shown on the top-down map. */
export const mapArea = { minX: -6.5, maxX: 6.5, minZ: -11.8, maxZ: 2.2 };

export type Placement = {
  prop: PropId;
  x: number;
  z: number;
  /** Mirror the drawing left to right, so a character looks toward the middle. */
  flip?: boolean;
  /** Multiply the prop's height, for gentle variety in depth. Default 1. */
  scale?: number;
  /** Which part of the frame it belongs to (only for reading the layout). */
  side: "left" | "right" | "far";
};

/*
  Lane framing, cosy and airy: village props on both sides and at the far end, the lane clear down the middle.
  far    — the big tree as the anchor just right of centre behind the pins, a tall pine to its left and a short
           one to its right, a bush and a mound softening the foot.
  left   — the cottage about level with the pins, a tall pine behind it, a bush at its foot, and a short pine
           and a mound nearer the thrower so the lane has a soft edge all the way.
  right  — the igloo a little nearer than the cottage (not mirrored), a tall pine nearer the thrower, a short pine
           further down and a mound at the igloo's foot.
  Big things far, small things near; pines mirrored and scaled so no two look copy-pasted.
*/
export const layout: Placement[] = [
  // far end
  { prop: "tree-snowmen", x: 0.5, z: -10.3, side: "far" },
  { prop: "pine-snow-tall", x: -2.5, z: -10.8, scale: 1.05, side: "far" },
  { prop: "pine-snow-short", x: 3.1, z: -10.0, flip: true, side: "far" },
  { prop: "bush-snow", x: -1.25, z: -9.5, scale: 0.9, side: "far" },
  { prop: "mound-snow", x: 2.0, z: -9.2, scale: 0.85, side: "far" },

  // left side
  { prop: "cottage-blue", x: -3.75, z: -6.9, side: "left" },
  { prop: "pine-snow-tall", x: -5.3, z: -8.9, scale: 0.9, flip: true, side: "left" },
  { prop: "bush-snow", x: -2.75, z: -5.3, scale: 0.85, side: "left" },
  { prop: "pine-snow-short", x: -3.7, z: -2.6, scale: 0.85, side: "left" },
  { prop: "mound-snow", x: -3.4, z: -1.6, scale: 0.8, side: "left" },

  // right side
  { prop: "igloo-friends", x: 3.6, z: -5.6, side: "right" },
  { prop: "pine-snow-tall", x: 4.6, z: -2.2, scale: 0.8, side: "right" },
  { prop: "pine-snow-short", x: 3.9, z: -8.3, scale: 1.1, flip: true, side: "right" },
  { prop: "mound-snow", x: 2.75, z: -4.3, scale: 0.75, flip: true, side: "right" },
];

/**
 * An example pin formation (a triangle of six) so the previews show the whole picture.
 * Preview only: real formations belong to the pins work (docs/GAMEPLAY.md section 6).
 */
export const examplePins: Omit<Placement, "side">[] = [
  { prop: "penguin-bag", x: 0, z: -5.4 },
  { prop: "girl-earmuffs", x: -0.48, z: -6.1 },
  { prop: "snowman-newspaper", x: 0.5, z: -6.1 },
  { prop: "pine-walking", x: -0.98, z: -6.8 },
  { prop: "flag-blue", x: 0.02, z: -6.85 },
  { prop: "signpost-snowman", x: 1.02, z: -6.8 },
];

/** Everything the previews draw: the frame, the example pins and both throwers (player 2 waiting beside the line). */
export type SceneItem = { key: string; id: PropId; x: number; z: number; scale?: number; flip?: boolean; role: PropRole };

export const sceneItems: SceneItem[] = [
  ...layout.map((p, i) => ({ key: `frame-${p.prop}-${i}`, id: p.prop, x: p.x, z: p.z, scale: p.scale, flip: p.flip, role: "frame" as const })),
  ...examplePins.map((p, i) => ({ key: `pin-${p.prop}-${i}`, id: p.prop, x: p.x, z: p.z, scale: p.scale, flip: p.flip, role: "pin" as const })),
  { key: "thrower-1", id: throwers[0], x: 0, z: lane.throwLine.z, role: "thrower" },
  { key: "thrower-2", id: throwers[1], x: -2.15, z: lane.throwLine.z - 0.6, scale: 0.95, role: "thrower" },
];

/** Plain-language problems with the framing; empty when every rule holds. */
export function layoutProblems(list: Placement[] = layout): string[] {
  const { clear, nearZ, nearHalfWidth, nearMaxHeight } = lane;
  const problems: string[] = [];
  for (const item of list) {
    const p = propSettings(item.prop)!;
    const h = p.height * (item.scale ?? 1);
    const halfW = (propWidth(item.prop) * (item.scale ?? 1)) / 2;
    const name = `${item.prop} at (${item.x}, ${item.z})`;
    const inLane = item.x + halfW > clear.minX && item.x - halfW < clear.maxX && item.z > clear.minZ && item.z < clear.maxZ;
    if (inLane) problems.push(`${name} reaches into the lane`);
    if (item.z > nearZ && h > nearMaxHeight && Math.abs(item.x) - halfW < nearHalfWidth)
      problems.push(`${name} is ${h} tall between the camera and the thrower`);
    const area = mapArea;
    if (item.x < area.minX || item.x > area.maxX || item.z < area.minZ || item.z > area.maxZ)
      problems.push(`${name} is outside the map`);
    if (p.role !== "frame") problems.push(`${name} is not a frame prop`);
    if (p.spare) problems.push(`${name} is marked spare`);
    if (!propPx(item.prop)) problems.push(`${name} has no file yet`);
  }
  return problems;
}

/* ------------------------------------------------------------------ */
/* Thick standees in 3D (/dev/scenery-3d)                               */
/* ------------------------------------------------------------------ */

/**
 * Feel settings for the "half-turning thick standee" look. Tune here, not in the components.
 * Every colour on the 3D page comes from the design tokens in globals.css: --paper (snow, paper sides,
 * haze), --snow-shadow (shadows and the shade side), --ink (edge line). None are typed here.
 */
export const standee3d = {
  /** Depth of the cut-out, as a share of the prop's height. */
  thicknessShare: 0.035,

  /** Half-turn toward the camera when it orbits. */
  turn: {
    /** Share of the camera's swing around the lane that each prop follows. */
    fraction: 0.5,
    /** Largest turn away from the home facing, in degrees. */
    cap: 30,
    /** Spring: higher stiffness = quicker; damping keeps it from bouncing. */
    stiffness: 30,
    damping: 9,
  },

  /**
   * Drawn-style shading. Nothing is lit physically: each surface is a token colour, mixed toward the
   * token shade colour (--snow-shadow) on the side facing away from a fixed drawing light, like a crayon
   * artist shading the far side. The light comes from the upper left and a little in front, the way
   * the stickers themselves are drawn; the real sun (below) only decides where shadows fall.
   */
  shading: {
    /** Direction the drawing light comes from (x right, y up, z toward the default camera). */
    from: [-0.55, 0.75, 0.6] as [number, number, number],
    /** Paper sides and mounds: where lit turns to shade (0 = facing away, 1 = facing the light). */
    band: { from: 0.3, to: 0.7 },
  },

  /** The card's side wall and back: fibre speckle and uneven shading, so it reads as real card, not plastic. */
  card: {
    grain: 0.18,
    uneven: 0.18,
  },

  /**
   * Faint "pillow" volume on the art, from the silhouette's normal map. Off by default (see treatment.ts):
   * next to the source sheets even a faint tint read as a soft computer vignette rather than a pencil pass.
   */
  pillow: {
    /** How strongly the far edges are tinted toward the shade colour when switched on. 0 = flat. */
    strength: 0.3,
    band: { from: 0.2, to: 0.62 },
  },

  /** Soft mound of snow around each base (a stand-in for the real snow's API, see README). */
  mound: {
    /** Mound width as a share of the prop's width. */
    widthShare: 0.62,
    /** Mound depth front to back, in scene units. */
    depth: 0.3,
    height: 0.05,
  },

  /** Gentle sway in the wind. */
  sway: {
    props: ["tree-snowmen", "pine-snow-tall", "pine-snow-short", "flag-blue"] as PropId[],
    /** Degrees either way. */
    angle: 1.4,
    /** Swings per second. */
    speed: 0.35,
  },

  /** Wobble when clicked (stand-in for a snowball hit), with snow flecks falling off. */
  wobble: {
    angle: 9, // degrees at the start
    frequency: 2.6, // wobbles per second
    decay: 2.8, // how fast it settles (per second)
    squash: 0.06, // a little squash at the start
    flecks: 14, // how many flecks fall
    fleckSize: 0.035,
    fleckLife: 1.3, // seconds
  },

  /** The sun of the snow scene in PR #17: only used to cast shadows (painted in --snow-shadow). */
  light: {
    sunElevation: 24, // degrees above the horizon
    sunAzimuth: 128, // 0 = from the right, 90 = from behind the scene toward the viewer
    shadowMapSize: 2048,
    shadowSoftness: 9,
    shadowArea: 12,
    shadowBias: -0.0004,
    shadowNormalBias: 0.02,
    /** How much of the shadow colour shows over the paper snow (1 = exactly --snow-shadow; lower = paler, still only the two tokens). */
    shadowStrength: 0.75,
  },

  /** Light haze: far things fade into the paper colour (fog density, exponential). */
  hazeDensity: 0.012,

  /** Free camera limits on the test page. */
  camera: {
    minDistance: 3,
    maxDistance: 40,
    /** Lowest the camera may go, in degrees above the ground. */
    minElevation: 6,
    /** Highest, in degrees: never straight down (the snow scene's limit). */
    maxElevation: 76,
    /** Turn left or right at most this far, in degrees: never round to the back of the cut-outs (the snow scene's limit). */
    maxTurn: 60,
  },
};

/* ------------------------------------------------------------------ */
/* The village on the real snow (<Village />, /dev/village)             */
/* ------------------------------------------------------------------ */

/**
 * Feel settings for the village standing in the real snow scene. The layout above was drawn for the
 * `lane` above (line at z = 0, pins at z = -6.5, thrower sliding 1.6 either way); `villageLayout()` fits it
 * onto the game's own lane (the bowling feature's line, pin spot and slide width) without changing it.
 */
export const village = {
  /** Soft heap of real snow round each base (the snow scene's heapSnow), so the prop stands in the snow. */
  mound: {
    /** Half-width of the heap as a share of the prop's drawn width (the heap is wider than the base edge). */
    widthShare: 0.42,
    /** Half-depth front to back, in scene units. */
    depth: 0.32,
    /** Height in the middle: this much, plus `heightPerUnit` per unit of prop height. */
    height: 0.035,
    heightPerUnit: 0.018,
  },

  /** Big props a ball bursts on later: a short round post at the base. */
  blockers: {
    groups: ["big", "tree"] as PropGroup[],
    /** Radius as a share of the prop's drawn width (the README's "propWidth / 3"). */
    radiusShare: 1 / 3,
  },

  /** Side props move out by this much more than the thrower's extra slide room, to keep the roll lane open. */
  sideMargin: 0,

  /**
   * The throwing view for the snow scene camera (useSnowCameraView): behind and above the line, looking
   * down the lane. The point looked at sits `lookAtShare` of the way from the line to the pin spot.
   * `pathAt` 0.15 is about 24 degrees above the snow on the camera path; `distance` pulls it back so the
   * pulled-back ball near the camera and the far end of the village both fit (22 degree lens).
   */
  view: {
    lookAtShare: 0.45,
    lookAtHeight: 0.4,
    pathAt: 0.15,
    distance: 1.6,
    turn: 0,
  },

  /** For the sight-line check: how tall the pins are that must stay visible from the throwing view. */
  pinSightHeight: 0.5,
};
