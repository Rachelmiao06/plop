/*
  Scenery: flat hand-drawn cut-outs ("standees") planted upright in the snow.
  Every prop turns to face the camera. See README.md for how part 2 places them.

  Units: one scene unit = one main character's height.
  Axes (same as Three.js): x to the right, z toward the default camera.
  Negative z is the back of the village. The play area is centred on (0, 0).

  The pixel sizes below are printed by `python3 scripts/slice_scenery.py`;
  re-run it and copy the numbers here if the art is ever re-cut.
*/

export type PropGroup = "big" | "tree" | "mid" | "small" | "friend";

export type SceneryProp = {
  /** Shown on /dev/scenery. */
  label: string;
  /** Under /public. Transparent WebP; the bottom edge is where it meets the snow. */
  src: string;
  /** Pixel size of the file. */
  px: { w: number; h: number };
  /** Height above the snow surface once planted, in scene units. */
  height: number;
  group: PropGroup;
  /** How far the base sinks below the snow surface, in scene units (hides the hard bottom edge). */
  sink: number;
};

const file = (name: string) => `/assets/scenery/${name}.webp`;

export const props = {
  // Big buildings and the old tree: back of the village.
  "tree-bare": { label: "Bare tree with ornaments", src: file("tree-bare"), px: { w: 445, h: 436 }, height: 3.4, group: "big", sink: 0.08 },
  cottage: { label: "Cottage", src: file("cottage"), px: { w: 428, h: 383 }, height: 3, group: "big", sink: 0.1 },
  igloo: { label: "Igloo", src: file("igloo"), px: { w: 438, h: 323 }, height: 2.2, group: "big", sink: 0.1 },

  // Pines: frame the sides.
  "pine-tall": { label: "Tall pine", src: file("pine-tall"), px: { w: 296, h: 444 }, height: 3, group: "tree", sink: 0.08 },
  "pine-medium": { label: "Medium pine", src: file("pine-medium"), px: { w: 345, h: 376 }, height: 2.4, group: "tree", sink: 0.07 },
  "pine-small": { label: "Small pine", src: file("pine-small"), px: { w: 362, h: 308 }, height: 1.7, group: "tree", sink: 0.06 },

  // Village furniture: middle distance.
  signpost: { label: "Signpost", src: file("signpost"), px: { w: 380, h: 359 }, height: 1.3, group: "mid", sink: 0.06 },
  flag: { label: "Flag", src: file("flag"), px: { w: 250, h: 363 }, height: 1.8, group: "mid", sink: 0.08 },
  bench: { label: "Bench", src: file("bench"), px: { w: 402, h: 307 }, height: 0.9, group: "mid", sink: 0.04 },
  "log-hollow": { label: "Hollow log", src: file("log-hollow"), px: { w: 424, h: 281 }, height: 0.9, group: "mid", sink: 0.06 },
  "street-lamp": { label: "Street lamp", src: file("street-lamp"), px: { w: 203, h: 385 }, height: 1.8, group: "mid", sink: 0.07 },
  fence: { label: "Fence", src: file("fence"), px: { w: 390, h: 245 }, height: 0.8, group: "mid", sink: 0.05 },
  mailbox: { label: "Mailbox", src: file("mailbox"), px: { w: 304, h: 351 }, height: 1.1, group: "mid", sink: 0.05 },

  // Small things: dotted around the edges.
  "berry-bush": { label: "Berry bush", src: file("berry-bush"), px: { w: 365, h: 281 }, height: 0.8, group: "small", sink: 0.05 },
  "snow-mound": { label: "Snow mound", src: file("snow-mound"), px: { w: 380, h: 179 }, height: 0.45, group: "small", sink: 0.08 },
  "snowball-pile": { label: "Snowball pile", src: file("snowball-pile"), px: { w: 365, h: 299 }, height: 0.55, group: "small", sink: 0.04 },
  bucket: { label: "Bucket", src: file("bucket"), px: { w: 315, h: 306 }, height: 0.4, group: "small", sink: 0.03 },
  radio: { label: "Radio", src: file("radio"), px: { w: 334, h: 330 }, height: 0.45, group: "small", sink: 0.02 },
  sled: { label: "Sled", src: file("sled"), px: { w: 429, h: 251 }, height: 0.45, group: "small", sink: 0.03 },

  // Little friends: decoration only, never targets.
  "snowman-sitting": { label: "Snowman sitting (red scarf)", src: file("snowman-sitting"), px: { w: 320, h: 340 }, height: 0.65, group: "friend", sink: 0.04 },
  "snowman-reading": { label: "Snowman reading", src: file("snowman-reading"), px: { w: 344, h: 383 }, height: 0.75, group: "friend", sink: 0.04 },
  "snowman-waving": { label: "Snowman waving", src: file("snowman-waving"), px: { w: 317, h: 404 }, height: 0.8, group: "friend", sink: 0.04 },
  "penguin-standing": { label: "Penguin standing", src: file("penguin-standing"), px: { w: 316, h: 328 }, height: 0.5, group: "friend", sink: 0.03 },
  "penguin-sliding": { label: "Penguin sliding", src: file("penguin-sliding"), px: { w: 384, h: 230 }, height: 0.3, group: "friend", sink: 0.03 },
} satisfies Record<string, SceneryProp>;

export type PropId = keyof typeof props;

/** Width in scene units, from the height and the file's shape. */
export function propWidth(id: PropId): number {
  const p: SceneryProp = props[id];
  return (p.height * p.px.w) / p.px.h;
}

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
  A tidy little sticker-sheet village:
  back row  — igloo, cottage with its mailbox, the big tree;
  sides     — pines stepping down in size toward the front;
  middle    — bench, signpost, lamp, log and fence behind the characters;
  front     — only small things and little friends near the edges.
*/
export const layout: Placement[] = [
  // Back row
  { prop: "igloo", x: -5.4, z: -5.6 },
  { prop: "cottage", x: -1.2, z: -6.2 },
  { prop: "mailbox", x: 1.2, z: -5.0 },
  { prop: "tree-bare", x: 4.4, z: -5.8 },

  // Pines framing the sides
  { prop: "pine-tall", x: -8.2, z: -4.6 },
  { prop: "pine-medium", x: -8.4, z: -1.6 },
  { prop: "pine-small", x: -7.6, z: 0.6 },
  { prop: "pine-tall", x: 8.2, z: -3.4, flip: true },
  { prop: "pine-medium", x: 7.6, z: -6.2, flip: true },
  { prop: "pine-small", x: 8.4, z: -0.6, flip: true },

  // Middle: village furniture behind the characters
  { prop: "signpost", x: -3.4, z: -3.2 },
  { prop: "fence", x: -6.0, z: -2.6 },
  { prop: "bench", x: 1.0, z: -3.4 },
  { prop: "snowman-reading", x: 2.1, z: -3.0 },
  { prop: "street-lamp", x: 3.8, z: -2.8 },
  { prop: "log-hollow", x: 6.4, z: -1.8 },
  { prop: "flag", x: -1.0, z: -2.4 },

  // Edges and front: small things and little friends
  { prop: "berry-bush", x: -6.4, z: 1.8 },
  { prop: "snowman-sitting", x: -5.6, z: 2.8 },
  { prop: "bucket", x: -4.2, z: 3.4 },
  { prop: "snow-mound", x: 0, z: 3.8 },
  { prop: "snowball-pile", x: 1.6, z: 3.4 },
  { prop: "penguin-sliding", x: 4.4, z: 3.2 },
  { prop: "penguin-standing", x: 5.6, z: 2.6 },
  { prop: "sled", x: 6.8, z: 1.6 },
  { prop: "snowman-waving", x: 6.2, z: -4.4, flip: true },
  { prop: "radio", x: -2.4, z: -4.0 },
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
  }
  return problems;
}
