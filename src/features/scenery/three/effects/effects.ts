/*
  Numbers for the real-world effects on the paper village (Rachel, 2026-11-25): warm light, chimney smoke, ice, and
  the snow banked at the backdrop's foot. Kept apart from the layout and the prop list (scenery `content.ts`, owned by
  the village layout work) so either can change without touching the other.

  Effects attach to props by name, through three optional tags on a prop in `content.ts` `props` (positions are shares
  of the drawing: x from the left, y from the foot):
    emitsLight: [x, y][]               a warm glow at each point (a lamp's glass, a lit window, bulbs)
    chimneyAt:  [x, y]                 smoke rises from here
    icicleEdge: [x0, y0, x1, y1][]     icicles hang along each edge (eaves, arches, a lamp cap)
  A prop without tags falls back to `fallbackTags` below (the drawings in use before the tags existed).
*/

import { propSettings, type PropId } from "../../content";

export type EffectTags = {
  emitsLight?: [number, number][];
  chimneyAt?: [number, number];
  icicleEdge?: [number, number, number, number][];
};

/** Tags for props whose manifest entry has none yet (manifest tags always win). */
const fallbackTags: Partial<Record<string, EffectTags>> = {
  "street-lamp": { emitsLight: [[0.5, 0.61]], icicleEdge: [[0.1, 0.73, 0.24, 0.7], [0.76, 0.7, 0.9, 0.73]] },
  "cottage-red": { emitsLight: [[0.615, 0.355]], chimneyAt: [0.7, 0.97], icicleEdge: [[0.2, 0.47, 0.55, 0.49]] },
  "cottage-blue": { chimneyAt: [0.76, 0.97], icicleEdge: [[0.22, 0.37, 0.4, 0.53], [0.68, 0.45, 0.82, 0.37]] },
  "fairy-lights": { emitsLight: [[0.172, 0.61], [0.332, 0.509], [0.502, 0.459], [0.677, 0.513], [0.836, 0.615]] },
  "igloo-friends": {
    icicleEdge: [
      [0.2, 0.545, 0.43, 0.545],
      [0.55, 0.51, 0.71, 0.51],
      [0.12, 0.6, 0.17, 0.66],
      [0.83, 0.58, 0.88, 0.5],
    ],
  },
};

/** The effect tags of a prop: from its manifest entry, else the fallback above. */
export function effectTags(id: string): EffectTags {
  const own = (propSettings(id) ?? {}) as unknown as EffectTags;
  const fallback = fallbackTags[id] ?? {};
  return {
    emitsLight: own.emitsLight ?? fallback.emitsLight,
    chimneyAt: own.chimneyAt ?? fallback.chimneyAt,
    icicleEdge: own.icicleEdge ?? fallback.icicleEdge,
  };
}

/** A halo: size (units across), strength (0 to 1), flicker (share of strength) and its speed (Hz). */
type Halo = { size: number; strength: number; flicker: number; speed: number };

export const effects = {
  /**
   * Warm light. Every `emitsLight` point gets a halo drawn like a crayon glow (a few soft bands with paper grain, a
   * slightly wobbly edge), never a smooth airbrush. `front` halos sit on the drawing and add light (glass, windows,
   * bulbs); `behind` halos stand just behind the cut-out so the drawing stays crisp with the glow round it (the
   * lamp). A real point light that warms the lit snow is added only for the props in `pointLights` (each costs a
   * little on every snow pixel; the cut-outs stay unlit). Colour: `--butter`, softened toward `--paper`.
   */
  lights: {
    /** Which halo style a prop's points use: `lamp` for these, `bulbs` when it has 3 or more points, else `window`. */
    lamps: ["street-lamp", "cafe-stump", "mice-lantern"] as PropId[],
    styles: {
      lamp: {
        front: { size: 0.55, strength: 0.55, flicker: 0.07, speed: 1.3 } as Halo,
        behind: { size: 1.6, strength: 0.55, flicker: 0.05, speed: 0.35 } as Halo | null,
      },
      window: {
        front: { size: 0.7, strength: 0.32, flicker: 0.03, speed: 0.7 } as Halo,
        behind: null as Halo | null,
      },
      bulbs: {
        front: { size: 0.26, strength: 0.38, flicker: 0.12, speed: 2.1 } as Halo,
        behind: null as Halo | null,
      },
    },
    /** Props that also light the snow, with intensity (candela; the sun is about 3) and reach (units). */
    pointLights: {
      "street-lamp": { intensity: 2.6, distance: 3.6 },
      "cottage-red": { intensity: 0.35, distance: 2.2 },
      "fairy-lights": { intensity: 0.3, distance: 2 },
    } as Partial<Record<string, { intensity: number; distance: number }>>,
    /** Point lights sit this far in front of the drawing (units), so the pool falls on the snow before it. */
    lightForward: 0.25,
    /** How warm: `--butter` mixed this much toward `--paper` (0 = pure butter). */
    warmSoftening: 0.15,
    /** The crayon look of every halo: number of bands, how much they show (0 = smooth), paper grain. */
    bands: 4,
    banding: 0.6,
    grain: 0.3,
  },

  /**
   * Chimney smoke: soft puffs that rise, drift sideways in a gentle wind, grow and fade. Camera-facing sprites,
   * `--paper` tinted toward `--snow-shadow` (paper-white smoke vanished against the paper sky), shaded underneath.
   */
  smoke: {
    puffsPerChimney: 6,
    /** Seconds for one puff from the chimney to gone (reduced motion: `reducedSlowdown` times slower). */
    life: 6.5,
    reducedSlowdown: 3,
    /** How high it rises and how far the wind carries it sideways (units) over its life. */
    rise: 1.05,
    wind: 0.55,
    /** Little side-to-side wander (units) and its speed. */
    wander: 0.06,
    wanderSpeed: 0.6,
    /** Size at the chimney and at the end of its life (units across). */
    sizeFrom: 0.16,
    sizeTo: 0.72,
    /** Most opacity, reached early, then a long fade. */
    opacity: 0.85,
    /** Share of `--snow-shadow` in the whole puff, extra on its lower side, and an `--ink` rim (0 = none). */
    tint: 0.45,
    shade: 0.75,
    outline: 0,
  },

  /**
   * Clear ice, faked cheaply (no screen-space transmission): nearly clear and lightly tinted in the middle, deeper
   * `--sky-blue` toward the edges, a sky reflection and a bright rim at grazing angles, one sharp sun glint, and tiny
   * facets that flash as the view moves.
   */
  ice: {
    body: 0.45,
    edge: 0.85,
    glintSharpness: 90,
    glint: 1.6,
    sparkle: 0.18,
    sparkleBright: 1.4,
    /** One icicle per this much eave (units), at least one per edge. Length range (units) and top width. */
    icicleSpacing: 0.075,
    icicleLength: [0.07, 0.19] as [number, number],
    icicleWidth: 0.028,
    /**
     * Chunks of ice lying in the snow beside a prop (`near`, by name; every placed copy gets them), offset in scene
     * units, with a size (units across) and a turn (degrees). Each sits a little sunk in a small heap of real snow.
     */
    chunks: [
      { near: "pond-frozen", dx: 0.7, dz: 0.35, size: 0.3, turn: 20 },
      { near: "pond-frozen", dx: 0.95, dz: -0.2, size: 0.19, turn: 75 },
      { near: "pond-frozen", dx: -0.85, dz: 0.25, size: 0.24, turn: 140 },
      { near: "pond-frozen", dx: 0.55, dz: -0.6, size: 0.14, turn: 200 },
      { near: "igloo-friends", dx: -0.8, dz: 0.3, size: 0.36, turn: 40 },
      { near: "igloo-friends", dx: -0.55, dz: 0.65, size: 0.15, turn: 110 },
      { near: "igloo-friends", dx: 0.95, dz: 0.25, size: 0.28, turn: 300 },
    ] as { near: PropId; dx: number; dz: number; size: number; turn: number }[],
    /** How deep a chunk sinks (share of its size) and the snow cap on top (share of its size). */
    chunkSink: 0.35,
    snowCap: 0.42,
  },

  /** Real snow banked against the foot of the paper hills, so the low view has no hard line (#51). */
  footBank: {
    /** Heaps along the backdrop's foot: spacing along the arc, half-width, half-depth, height (units). */
    spacing: 1.6,
    radiusX: 1.6,
    radiusZ: 1.3,
    height: 0.11,
    /** Heaps sit this far in front of the paper hills. */
    inset: 0.45,
    /**
     * Only this middle share of the backdrop's arc gets a bank: the part the low view looks at. Each heap makes fine
     * snow tiles, and a bank round the whole arc cost about 15 fps in the high view.
     */
    arcShare: 0.3,
    /** How uneven the row is: spacing and distance jitter (share of a step) and size variety (share of size). */
    jitter: 0.7,
    vary: 0.6,
  },
};
