/*
  Scenery: flat hand-drawn cut-outs ("standees") planted upright in the snow.
  Every standee turns to face the camera. See README.md for how part 2 places them.

  Units: one scene unit = one main character's height.
  Axes (same as Three.js): x to the right, z toward the default camera.
  Negative z is the back of the village. The play area is centred on (0, 0).

  Files are found by name: public/assets/scenery/<name>.webp. Pixel sizes are read from
  sizes.json, which `python3 scripts/slice_scenery.py` rewrites. Replacing art needs no code change.
*/

import sizes from "./sizes.json";

export type PropGroup = "big" | "tree" | "mid" | "small" | "person" | "friend";

/**
 * standee: upright cut-out in the snow (the default).
 * character: a reference for a 3D main character; shown on the page, never placed as scenery.
 * decal: a flat flourish (for example drifting in the air); not a standee.
 */
export type PropKind = "standee" | "character" | "decal";

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
  /** Kept for later, not used in the layout. */
  spare?: boolean;
  /** Reads as moving: a candidate for a small looping motion later (part 2 or after). */
  motion?: "loop";
};

export const props = {
  /* ---- Current set: Rachel's doodle stickers ---- */

  // Big: back of the village
  "tree-snowmen": { label: "Big tree with tiny snowmen", height: 1.65, group: "big", sink: 0.08, set: "doodle" },
  "cottage-blue": { label: "Cottage with a blue roof", height: 1.5, group: "big", sink: 0.08, set: "doodle" },
  "igloo-friends": { label: "Igloo with a snowman in the window", height: 1.15, group: "big", sink: 0.08, set: "doodle" },

  // Middle distance
  "log-music": { label: "Hollow log with radio, snowman and penguin", height: 0.95, group: "mid", sink: 0.06, set: "doodle" },
  "bench-snowmen": { label: "Two snowmen on a bench", height: 0.85, group: "mid", sink: 0.04, set: "doodle" },
  "signpost-snowman": { label: "Signpost with a snowman arrow", height: 0.75, group: "mid", sink: 0.05, set: "doodle" },
  "flag-blue": { label: "Blue snowman flag", height: 1.15, group: "mid", sink: 0.06, set: "doodle" },

  // People and little friends
  "boy-snowman": { label: "Boy holding hands with a little snowman", height: 0.85, group: "person", sink: 0.03, set: "doodle" },
  "girl-earmuffs": { label: "Girl with earmuffs", height: 0.85, group: "person", sink: 0.03, set: "doodle" },
  skier: { label: "Skier in a mint coat", height: 0.85, group: "person", sink: 0.03, set: "doodle", motion: "loop" },
  "penguin-bag": { label: "Penguin with a shoulder bag", height: 0.6, group: "friend", sink: 0.03, set: "doodle" },
  "pine-walking": { label: "Walking pine with a backpack", height: 0.9, group: "friend", sink: 0.03, set: "doodle" },
  "penguin-slide": { label: "Sliding penguin", height: 0.35, group: "friend", sink: 0.02, set: "doodle", motion: "loop" },
  "snowman-newspaper": { label: "Snowman reading a newspaper", height: 0.85, group: "friend", sink: 0.03, set: "doodle", spare: true },

  // Not scenery
  "snowman-bucket-hat": { label: "Main character A (model for the 3D snowman)", height: 1, group: "person", sink: 0, set: "doodle", kind: "character" },
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
/* Camera (for the preview only)                                        */
/* ------------------------------------------------------------------ */

/**
 * The default camera of the snow scene (src/features/snow-scene/content.ts in PR #17), copied here
 * so /dev/scenery can show the village as the player first sees it. Keep in step if that changes.
 */
export const previewCamera = {
  elevation: 35, // degrees above the ground
  fieldOfView: 22, // vertical, degrees
  characterScreenShare: 0.2, // a character one unit tall fills this share of the screen height
  targetHeight: 0.35,
  aspect: 16 / 9, // a landscape screen; a phone held upright sees less at the sides
  /** A second preview, pulled back this many times the default distance, to see the whole village. */
  pulledBack: 1.6,
};

/* ------------------------------------------------------------------ */
/* First village layout                                                 */
/* ------------------------------------------------------------------ */

/**
 * Where the two main characters stand (they are 3D, not part of the scenery). The snow scene in PR #17
 * puts them 4.4 apart on a landscape screen (its layout.characterDistance).
 */
export const characters = [
  { name: "A", x: -2.2, z: 0 },
  { name: "B", x: 2.2, z: 0 },
] as const;

/** Rules the layout keeps. Part 2 can reuse them to check any edited layout. */
export const layoutRules = {
  /** The area shown on the top-down map. */
  area: { minX: -6, maxX: 6, minZ: -5.5, maxZ: 3.5 },
  /** Kept completely empty: a wide lane across the middle, between and around the characters. */
  lane: { minX: -4.6, maxX: 4.6, minZ: -1.4, maxZ: 1.4 },
  /** In front of the characters (z above this) and within `frontHalfWidth` of the middle, nothing taller than `frontMaxHeight`. */
  frontZ: 0.5,
  frontHalfWidth: 3.2,
  frontMaxHeight: 0.6,
};

export type Placement = {
  prop: PropId;
  x: number;
  z: number;
  /** Mirror the drawing left to right, so a character looks toward the middle. */
  flip?: boolean;
  /** Multiply the prop's height, for gentle variety in depth. Default 1. */
  scale?: number;
  /** Which cluster it belongs to (only for reading the layout). */
  cluster: "home" | "music" | "bench" | "edge";
};

/*
  Cosy first, not complete: 13 standees in three small clusters with empty snow between them.
  The default camera is a close diorama view, so the village sits fairly near the characters and
  the buildings are small: a cottage is one and a half characters tall.
  home   — back: the big tree as the tallest anchor just right of centre, the cottage in front of it on the
           left, the igloo on the right, at different depths so they overlap a little; the boy and his
           little snowman just in front; the flag alone farther back on the right as a landmark.
  music  — left, middle distance: the log with the radio, the walking pine standing by as its audience.
  bench  — right, middle distance: the bench snowmen (mirrored so the waving one is on the inside),
           the signpost a little in front and outside it (mirrored so the arrow points to the middle),
           the girl beside it and the bag penguin by the sign.
  edge   — the two that read as moving have open snow ahead: the skier at the back left,
           the sliding penguin crossing the empty front left.
*/
export const layout: Placement[] = [
  // home
  { prop: "tree-snowmen", x: 0.45, z: -3.0, cluster: "home" },
  { prop: "cottage-blue", x: -1.7, z: -2.6, cluster: "home" },
  { prop: "igloo-friends", x: 2.45, z: -2.8, cluster: "home" },
  { prop: "boy-snowman", x: -0.4, z: -1.9, cluster: "home" },
  { prop: "flag-blue", x: 4.3, z: -3.5, scale: 0.95, cluster: "home" },

  // music corner
  { prop: "log-music", x: -3.8, z: -2.2, cluster: "music" },
  { prop: "pine-walking", x: -2.7, z: -1.7, cluster: "music" },

  // watching bench
  { prop: "bench-snowmen", x: 3.7, z: -2.3, flip: true, cluster: "bench" },
  { prop: "signpost-snowman", x: 4.5, z: -1.6, flip: true, cluster: "bench" },
  { prop: "girl-earmuffs", x: 3.0, z: -1.75, cluster: "bench" },
  { prop: "penguin-bag", x: 4.0, z: -1.5, scale: 0.95, cluster: "bench" },

  // moving ones, with open snow ahead
  { prop: "skier", x: -3.7, z: -3.9, cluster: "edge" },
  { prop: "penguin-slide", x: -2.9, z: 2.1, cluster: "edge" },
];

/** Plain-language problems with the layout; empty when every rule holds. */
export function layoutProblems(list: Placement[] = layout): string[] {
  const { lane, frontZ, frontHalfWidth, frontMaxHeight, area } = layoutRules;
  const problems: string[] = [];
  for (const item of list) {
    const p = propSettings(item.prop)!;
    const h = p.height * (item.scale ?? 1);
    const halfW = (propWidth(item.prop) * (item.scale ?? 1)) / 2;
    const name = `${item.prop} at (${item.x}, ${item.z})`;
    const overlapsLane =
      item.x + halfW > lane.minX && item.x - halfW < lane.maxX && item.z > lane.minZ && item.z < lane.maxZ;
    if (overlapsLane) problems.push(`${name} is inside the throwing lane`);
    if (item.z > frontZ && h > frontMaxHeight && Math.abs(item.x) - halfW < frontHalfWidth)
      problems.push(`${name} is ${h} tall in front of the characters`);
    if (item.x < area.minX || item.x > area.maxX || item.z < area.minZ || item.z > area.maxZ)
      problems.push(`${name} is outside the play area`);
    if (p.spare) problems.push(`${name} is marked spare`);
    if (p.kind && p.kind !== "standee") problems.push(`${name} is a ${p.kind}, not a standee`);
    if (!propPx(item.prop)) problems.push(`${name} has no file yet`);
  }
  return problems;
}
