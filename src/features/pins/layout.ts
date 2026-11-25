/**
 * Pure maths for the pins: the sampled snow patch the physics stands on, and each pin's size,
 * collider and home spot from a formation. No drawing, no physics engine.
 */
import { FEEL } from "@/features/bowling";
import { propSettings, propWidth, type PropId } from "@/features/scenery";

import { FORMATIONS, PINS, type Formation, type Weight } from "./content";

/* ---- The snow patch ---- */

export type GroundPatch = {
  /** Centre of the patch. */
  cx: number;
  cz: number;
  span: number;
  cells: number;
  /** Heights in rapier's heightfield order: column-major, (cells + 1) rows along z by (cells + 1) columns along x. */
  heights: Float32Array;
  /** Lowest sample, for the safety floor under the patch. */
  min: number;
  /** Height of the patch at a point (bilinear between samples; edge value outside). */
  at: (x: number, z: number) => number;
};

/** Sample the snow surface once around the pin spot, so the physics ground matches the drawn drifts. */
export function sampleGround(heightAt: (x: number, z: number) => number): GroundPatch {
  const { span, cells } = PINS.ground;
  const { x: cx, z: cz } = FEEL.lane.pinSpot;
  const n = cells + 1;
  const step = span / cells;
  const grid = new Float32Array(n * n); // grid[row * n + col], row along z, col along x
  const heights = new Float32Array(n * n);
  let min = Infinity;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const h = heightAt(cx - span / 2 + col * step, cz - span / 2 + row * step);
      grid[row * n + col] = h;
      heights[row + col * n] = h; // column-major
      min = Math.min(min, h);
    }
  }
  const at = (x: number, z: number) => {
    const fx = Math.max(0, Math.min(cells - 1e-6, (x - (cx - span / 2)) / step));
    const fz = Math.max(0, Math.min(cells - 1e-6, (z - (cz - span / 2)) / step));
    const c = Math.floor(fx);
    const r = Math.floor(fz);
    const u = fx - c;
    const v = fz - r;
    const h00 = grid[r * n + c];
    const h01 = grid[r * n + c + 1];
    const h10 = grid[(r + 1) * n + c];
    const h11 = grid[(r + 1) * n + c + 1];
    return (h00 * (1 - u) + h01 * u) * (1 - v) + (h10 * (1 - u) + h11 * u) * v;
  };
  return { cx, cz, span, cells, heights, min, at };
}

/* ---- Pins ---- */

export type PinSpec = {
  key: string;
  id: PropId;
  flip: boolean;
  weight: Weight;
  /** Drawing size. */
  width: number;
  height: number;
  depth: number;
  /** Collider half sizes: the card, and the hidden foot. */
  card: [number, number, number];
  foot: [number, number, number];
  /** Where it stands: base centre and turn about the vertical (radians). */
  home: { x: number; y: number; z: number; yaw: number };
};

/** A small fixed wobble per pin, so the same set always looks the same. */
function jitter(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

export function formationById(id: string): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

/** Every pin of a formation with its sizes, colliders and home spot on the sampled ground. */
export function buildPins(formation: Formation, ground: GroundPatch): PinSpec[] {
  const c = PINS.card;
  const spot = FEEL.lane.pinSpot;
  return formation.pins.map((p, i) => {
    const settings = propSettings(p.prop)!;
    const scale = p.scale ?? 1;
    const weight = settings.pin?.weight ?? "medium";
    const width = propWidth(p.prop) * scale;
    const height = settings.height * scale;
    const depth = Math.max(0.02, height * c.thicknessShare);
    const colW = width * c.widthShare;
    const colH = height * c.heightShare;
    const footprint = settings.pin?.footprint ?? [colW, 0.1];
    const footW = Math.min(footprint[0] * scale, colW);
    const x = spot.x + p.dx;
    const z = spot.z + p.dz;
    const yaw = (((p.turn ?? 0) + jitter(i + formation.id.length * 7) * c.yawJitterDegrees) * Math.PI) / 180;
    return {
      key: `${formation.id}-${i}-${p.prop}`,
      id: p.prop,
      flip: !!p.flip,
      weight,
      width,
      height,
      depth,
      card: [colW / 2, colH / 2, depth / 2],
      foot: [footW / 2, c.footHeight / 2, PINS.weight[weight].footDepth / 2],
      home: { x, y: ground.at(x, z) - c.sink, z, yaw },
    };
  });
}

/** Every prop that is a pin in the scenery manifest (for loading their art up front). */
export function pinPropIds(): PropId[] {
  const ids = new Set<PropId>();
  for (const f of FORMATIONS) for (const p of f.pins) ids.add(p.prop);
  return [...ids];
}
