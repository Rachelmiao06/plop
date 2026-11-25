// Everything about how the snowmen look and move lives here, so it can be tuned
// without touching the logic. Lengths are in scene units: a snowman is 1 unit tall
// from the snow to the top of its head (hats stick out above that).

export type SnowmanVariant = "bucket" | "redhat";

export const FACES = ["calm", "happy", "surprised", "straining", "dizzy", "laugh"] as const;
export type FaceName = (typeof FACES)[number];

export const faceTexture = (face: FaceName) => `/assets/characters/face-${face}.png`;

/**
 * Theme tokens (CSS variables in globals.css) used for each part. Never hex here.
 * `lighten` mixes the token toward --paper, the way a light crayon layer lets paper show through.
 */
export const tokens = {
  snow: { token: "--paper" },
  snowShade: { token: "--snow-shadow" },
  outline: { token: "--ink-deep" },
  face: { token: "--ink-deep" },
  bucket: { token: "--sky-blue", lighten: 0.22 },
  mintScarf: { token: "--pine", lighten: 0.3 },
  red: { token: "--berry", lighten: 0.08 },
  pompom: { token: "--paper" },
  handle: { token: "--paper" },
  ribs: { token: "--ink-deep" },
} satisfies Record<string, { token: string; lighten?: number }>;

/** The look of Rachel's sheets: flat crayon fills, almost no shading, a thick rough brown line. */
export const look = {
  /**
   * Outline thickness in scene units (a snowman is 1 unit tall), so it scales with zoom like a
   * drawn line, but never thinner or thicker than these pixel limits.
   */
  outlineWidth: 0.016,
  outlineMinPx: 1.6,
  outlineMaxPx: 9,
  /** How much the line width wobbles along its length (0 = perfectly even). */
  outlineWobble: 0.35,
  /** Light specks inside the line, like crayon skipping over paper tooth. */
  outlineSpecks: 0.18,
  /** Where light turns to shade (0..1 across the ball) and how soft that edge is. */
  shadeEdge: 0.2,
  shadeSoftness: 0.18,
  /** How far white snow leans to the pale-blue shade colour on its shaded side. Kept tiny: the drawings have no shading. */
  snowShadeMix: 0.16,
  /** Same for coloured parts. */
  colourShadeMix: 0.1,
  /** Coloured-pencil strokes on coloured parts, and on snow (snow is nearly plain paper). */
  hatchColour: 0.22,
  hatchSnow: 0.045,
  /** Soft blotches, like uneven crayon pressure. */
  mottle: 0.1,
  /** Light comes from the upper front-left of the world. */
  lightDirection: [-0.45, 0.8, 0.55] as [number, number, number],
  /** In "drawn matcap" mode, how much of the light direction is blended over the drawing (0..1). */
  matcapLightBlend: 0.35,
  /** Strength of the optional screen-space paper grain laid over the characters. */
  paperGrain: 0.09,
  /** "On twos": the optional hand-drawn animation step rate, in poses per second. */
  twosRate: 12,
};

/** Shading styles the test page can switch between. */
export type SnowmanShading = "computed" | "matcap";

/** Hand-drawn spheres for "drawn matcap" mode (made by scripts/characters-slice-art.py). */
export const MATCAPS = ["snow", "mint", "red", "blue"] as const;
export type MatcapName = (typeof MATCAPS)[number];
export const matcapTexture = (name: MatcapName) => `/assets/characters/matcap-${name}.jpg`;

/** Body shape. Slightly lopsided on purpose: nothing is perfectly round in a drawing. */
export const shape = {
  sink: 0.02,
  body: { radius: 0.34, scale: [1.02, 0.85, 0.96] as [number, number, number] },
  /** Head centre height and radius; head and body overlap a little at the neck. */
  head: { radius: 0.27, y: 0.735, offsetX: 0.008, tilt: 0.04 },
  feet: [
    { x: -0.155, z: 0.235, radius: 0.1 },
    { x: 0.16, z: 0.23, radius: 0.105 },
  ],
  neckY: 0.53,
  scarf: { ringRadius: 0.205, tube: 0.068, height: 1.25, tilt: 0.06 },
  /** The face covers this much of the head's front (radians across and down). */
  face: { width: 2.3, height: 2.3, drop: 0.12 },
};

/** swing: sideways angle. out: how far the end leans forward to lie over the round belly. */
type ScarfEnd = { x: number; y: number; swing: number; out: number; length: number };

export const variants: Record<
  SnowmanVariant,
  {
    label: string;
    hat: "bucket" | "beanie";
    scarfToken: keyof typeof tokens;
    knot: boolean;
    ends: ScarfEnd[];
    /** Mirror the lopsidedness so the two snowmen are not clones. */
    lean: number;
  }
> = {
  bucket: {
    label: "Bucket",
    hat: "bucket",
    scarfToken: "mintScarf",
    knot: true,
    ends: [
      { x: -0.05, y: -0.02, swing: -0.55, out: -0.42, length: 0.2 },
      { x: 0.05, y: -0.02, swing: 0.5, out: -0.42, length: 0.19 },
    ],
    lean: 1,
  },
  redhat: {
    label: "Red hat",
    hat: "beanie",
    scarfToken: "red",
    knot: false,
    ends: [{ x: -0.09, y: -0.01, swing: -0.08, out: -0.5, length: 0.26 }],
    lean: -1,
  },
};

export const bucketHat = {
  position: [0.13, 1.0, -0.07] as [number, number, number],
  rotation: [-0.22, 0, -0.4] as [number, number, number],
  radiusTop: 0.14,
  radiusBottom: 0.105,
  height: 0.19,
  handleRadius: 0.085,
  handleTube: 0.01,
};

export const beanie = {
  /** The cap is part of a sphere a bit bigger than the head, cut off at `cut` radians from the top. */
  grow: 1.07,
  cut: 1.2,
  /** Stretch the dome upward so the hat sits tall above the cuff, like the sheet. */
  domeHeight: 1.3,
  cuffTube: 0.06,
  cuffHeight: 1.35,
  ribs: 18,
  pompomRadius: 0.065,
  tilt: [-0.12, 0, 0.06] as [number, number, number],
};

/** Spring settings: stiffness pulls toward the target, damping calms the wobble. */
export const springs = {
  squash: { stiffness: 260, damping: 11 },
  tilt: { stiffness: 120, damping: 10 },
  lunge: { stiffness: 140, damping: 12 },
  head: { stiffness: 110, damping: 9 },
  headSquash: { stiffness: 300, damping: 12 },
  hat: { stiffness: 70, damping: 6 },
  scarf: { stiffness: 45, damping: 4 },
  /** Used while the snowman puts itself back together after a hit: extra bouncy. */
  reassemble: { stiffness: 90, damping: 7 },
};

export const motion = {
  idle: {
    breathSpeed: 2.1,
    breathAmount: 0.022,
    wobbleSpeed: 0.9,
    wobble: 0.035,
  },
  pressed: { squash: 0.84 },
  charging: {
    squash: 0.14,
    lean: 0.32,
    wobbleSpeed: 7,
    wobble: 0.09,
    /** At full charge it trembles fast and small. */
    trembleSpeed: 46,
    tremble: 0.025,
  },
  launched: {
    duration: 1.1,
    snap: 0.14,
    lunge: 0.12,
    lean: 0.3,
    stretch: 1.16,
    kick: 4,
  },
  hit: {
    /** Seconds spent "apart" at full strength, then it reassembles. */
    apart: 0.55,
    settle: 1.1,
    knockBack: 0.65,
    squash: 0.22,
    /** Kick given to the squash spring at the moment of impact. */
    squashKick: 3,
    /** How far the head leans back when it pops off (radians at full strength). */
    headPopTilt: 0.7,
    /** Head tips at any strength; above this it pops off. */
    headPopAt: 0.55,
    headTip: 0.6,
    headPop: [0.13, 0.42, -0.32] as [number, number, number],
    /** The hat flies off above this strength. */
    hatFlyAt: 0.3,
    hatFly: [-0.35, 0.75, -0.45] as [number, number, number],
    hatSpin: [-1.1, 2.6, 1.3] as [number, number, number],
    /** After a hit at least this hard it is dizzy for a moment. */
    dizzyAt: 0.7,
  },
  dizzy: { duration: 2.4, speed: 7, headCircle: 0.16, sway: 0.08 },
  laugh: { duration: 1.6, bounceSpeed: 17, bounce: 0.07, hopSpeed: 8.5, hop: 0.035, lean: 0.14 },
  blink: { minGap: 2.2, maxGap: 5.5, length: 0.13 },
  secondary: {
    /** How much the hat lags behind quick tilts of the body. */
    hatLag: 0.12,
    /** Scarf ends try to keep hanging straight down, and lag behind quick moves. */
    scarfGravity: 0.85,
    scarfLag: 0.18,
  },
};
