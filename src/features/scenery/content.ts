/*
  Scenery: flat hand-drawn cut-outs ("standees") planted upright in the snow.
  Every prop turns to face the camera. See README.md for how part 2 places them.

  Units: one scene unit = one main character's height.
  Axes (same as Three.js): x to the right, z toward the default camera.
  Negative z is the back of the village. The play area is centred on (0, 0).

  Pixel sizes are read from sizes.json, which `python3 scripts/slice_scenery.py` rewrites.
*/

import sizes from "./sizes.json";

export type PropGroup = "big" | "tree" | "mid" | "small" | "friend";

/** Settings per prop. The file is found by name; its pixel size comes from sizes.json. */
export type SceneryProp = {
  /** Shown on /dev/scenery. */
  label: string;
  /** Height above the snow surface once planted, in scene units. */
  height: number;
  group: PropGroup;
  /** How far the base sinks below the snow surface, in scene units (hides the hard bottom edge). */
  sink: number;
  /** Kept for later, but not used in the first layout. */
  spare?: boolean;
};

/*
  Props by name. The name is the file name in public/assets/scenery/ (`<name>.webp`), so when the art
  is re-cut from new sheets the files are swapped with no code change, as long as the names stay.
  The first layout uses only the short priority list; everything marked `spare` waits.
  The art is provisional: Rachel is regenerating the sheets in a looser, thinner-lined doodle style.
*/
export const props = {
  // Big buildings and the old tree: back of the village.
  "tree-bare": { label: "Bare tree with ornaments", height: 3.4, group: "big", sink: 0.08 },
  cottage: { label: "Cottage", height: 3, group: "big", sink: 0.1 },
  igloo: { label: "Igloo", height: 2.2, group: "big", sink: 0.1 },

  // Pines: frame the sides.
  "pine-tall": { label: "Tall pine", height: 3, group: "tree", sink: 0.08 },
  "pine-medium": { label: "Medium pine", height: 2.4, group: "tree", sink: 0.07 },
  "pine-small": { label: "Small pine", height: 1.7, group: "tree", sink: 0.06, spare: true },

  // Village furniture: middle distance.
  signpost: { label: "Signpost", height: 1.3, group: "mid", sink: 0.06 },
  flag: { label: "Flag", height: 1.8, group: "mid", sink: 0.08 },
  bench: { label: "Bench", height: 0.9, group: "mid", sink: 0.04 },
  "log-hollow": { label: "Hollow log", height: 0.9, group: "mid", sink: 0.06 },
  "street-lamp": { label: "Street lamp", height: 1.8, group: "mid", sink: 0.07, spare: true },
  fence: { label: "Fence", height: 0.8, group: "mid", sink: 0.05, spare: true },
  mailbox: { label: "Mailbox", height: 1.1, group: "mid", sink: 0.05, spare: true },

  // Small things.
  radio: { label: "Radio", height: 0.45, group: "small", sink: 0.02 },
  bucket: { label: "Bucket", height: 0.4, group: "small", sink: 0.03 },
  "berry-bush": { label: "Berry bush", height: 0.8, group: "small", sink: 0.05, spare: true },
  "snow-mound": { label: "Snow mound", height: 0.45, group: "small", sink: 0.08, spare: true },
  "snowball-pile": { label: "Snowball pile", height: 0.55, group: "small", sink: 0.04, spare: true },
  sled: { label: "Sled", height: 0.45, group: "small", sink: 0.03, spare: true },

  // Little friends: decoration only, never targets.
  "snowman-sitting": { label: "Snowman sitting (red scarf)", height: 0.65, group: "friend", sink: 0.04 },
  "snowman-reading": { label: "Snowman reading", height: 0.75, group: "friend", sink: 0.04 },
  "penguin-standing": { label: "Penguin standing", height: 0.5, group: "friend", sink: 0.03 },
  "penguin-sliding": { label: "Penguin sliding", height: 0.3, group: "friend", sink: 0.03 },
  "snowman-waving": { label: "Snowman waving", height: 0.8, group: "friend", sink: 0.04, spare: true },
} satisfies Record<string, SceneryProp>;

export type PropId = keyof typeof props;

export const propIds = Object.keys(props) as PropId[];

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
/* First village layout                                                 */
/* ------------------------------------------------------------------ */

/** Where the two main characters stand (they are 3D, not part of the scenery). */
export const characters = [
  { name: "left", x: -3, z: 0 },
  { name: "right", x: 3, z: 0 },
] as const;

/** Rules the layout keeps. Part 2 can reuse them to check any edited layout. */
export const layoutRules = {
  /** The play area shown on /dev/scenery (and a sensible size for the snow ground). */
  area: { minX: -9.5, maxX: 9.5, minZ: -7.5, maxZ: 4.5 },
  /** Kept completely empty: the throwing lane between and around the two characters. */
  lane: { minX: -4.2, maxX: 4.2, minZ: -1.4, maxZ: 1.4 },
  /** In front of the characters (z above this), nothing taller than `frontMaxHeight`. */
  frontZ: 0.5,
  frontMaxHeight: 0.6,
};

export type Placement = {
  prop: PropId;
  x: number;
  z: number;
  /** Mirror the drawing left to right, for variety when a prop is used twice. */
  flip?: boolean;
  /** Multiply the prop's height, for small variety between repeats. Default 1. */
  scale?: number;
};

/*
  A small, airy village with lots of empty snow, built from the priority list only:
  back row  — igloo, cottage, the big tree;
  sides     — one tall pine on the left, one medium pine on the right;
  middle    — signpost, flag, bench with the reading snowman, the hollow log with the radio beside it;
  front     — only small things and little friends near the edges.
*/
export const layout: Placement[] = [
  // Back row
  { prop: "igloo", x: -5.6, z: -5.4 },
  { prop: "cottage", x: -0.8, z: -6.2 },
  { prop: "tree-bare", x: 4.6, z: -5.6 },

  // Pines framing the sides
  { prop: "pine-tall", x: -8.2, z: -2.8 },
  { prop: "pine-medium", x: 8.2, z: -3.2, flip: true },

  // Middle, behind the characters
  { prop: "signpost", x: -3.4, z: -3.2 },
  { prop: "flag", x: -6.6, z: -0.8 },
  { prop: "bench", x: 1.6, z: -3.4 },
  { prop: "snowman-reading", x: 2.7, z: -3.0 },
  { prop: "log-hollow", x: 6.2, z: -1.2 },
  { prop: "radio", x: 7.2, z: -0.8 },

  // Edges and front: small things and little friends
  { prop: "snowman-sitting", x: -6.2, z: 2.0 },
  { prop: "bucket", x: -4.8, z: 2.8 },
  { prop: "penguin-sliding", x: 3.6, z: 3.2 },
  { prop: "penguin-standing", x: 5.4, z: 2.4 },
];

/** Plain-language problems with the layout; empty when every rule holds. */
export function layoutProblems(list: Placement[] = layout): string[] {
  const { lane, frontZ, frontMaxHeight, area } = layoutRules;
  const problems: string[] = [];
  for (const item of list) {
    const p: SceneryProp = props[item.prop];
    const h = p.height * (item.scale ?? 1);
    const halfW = (propWidth(item.prop) * (item.scale ?? 1)) / 2;
    const name = `${item.prop} at (${item.x}, ${item.z})`;
    const overlapsLane =
      item.x + halfW > lane.minX && item.x - halfW < lane.maxX && item.z > lane.minZ && item.z < lane.maxZ;
    if (overlapsLane) problems.push(`${name} is inside the throwing lane`);
    if (item.z > frontZ && h > frontMaxHeight && Math.abs(item.x) - halfW < 5)
      problems.push(`${name} is ${h} tall in front of the characters`);
    if (item.x < area.minX || item.x > area.maxX || item.z < area.minZ || item.z > area.maxZ)
      problems.push(`${name} is outside the play area`);
    if (p.spare) problems.push(`${name} is marked spare`);
    if (!propPx(item.prop)) problems.push(`${name} has no file yet`);
  }
  return problems;
}
