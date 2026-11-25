/**
 * The readability check for formations (Rachel: "far too crowded"): every pin's card is projected through
 * the camera as it is now (the throwing view), and for each pair the nearer card's share of the farther
 * card's picture is measured. A formation passes when no card hides more than `OVERLAP.maxHidden` of another.
 * Pure maths on a Three.js camera; nothing is drawn. Run on /dev/pins (development, or `?overlap`).
 */
import { Vector3, type Camera } from "three";

import { FORMATIONS, OVERLAP, type Formation } from "./content";
import { buildPins, type GroundPatch, type PinSpec } from "./layout";

type Rect = { x0: number; x1: number; y0: number; y1: number };

export type PinOverlap = {
  /** The card in front, and the one it hides part of. */
  front: string;
  back: string;
  /** Share of the back card's picture covered by the front card (0..1). */
  hidden: number;
};

export type FormationOverlap = {
  id: string;
  pins: number;
  /** The worst pair (0 when nothing overlaps). */
  worst: PinOverlap | null;
  pass: boolean;
};

/** Screen rectangle (normalized device units) around a pin's card: the collider card, the drawing minus its empty corners. */
function cardRect(pin: PinSpec, camera: Camera, v: Vector3): Rect {
  const [hw, hh] = pin.card;
  const { x, y, z, yaw } = pin.home;
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  const r: Rect = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
  for (const sx of [-1, 1]) {
    for (const top of [0, 2]) {
      v.set(x + rx * hw * sx, y + hh * top, z + rz * hw * sx).project(camera);
      r.x0 = Math.min(r.x0, v.x);
      r.x1 = Math.max(r.x1, v.x);
      r.y0 = Math.min(r.y0, v.y);
      r.y1 = Math.max(r.y1, v.y);
    }
  }
  return r;
}

const area = (r: Rect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);

/** How much each card hides of the others, seen from this camera. */
export function formationOverlap(formation: Formation, ground: GroundPatch, camera: Camera): FormationOverlap {
  const pins = buildPins(formation, ground);
  const v = new Vector3();
  const seen = pins.map((p, i) => ({
    name: `${p.id} (${formation.pins[i].dx}, ${formation.pins[i].dz})`,
    rect: cardRect(p, camera, v),
    away: camera.position.distanceTo(v.set(p.home.x, p.home.y, p.home.z)),
  }));
  let worst: PinOverlap | null = null;
  for (let i = 0; i < seen.length; i++) {
    for (let j = 0; j < seen.length; j++) {
      const a = seen[i];
      const b = seen[j];
      if (i === j || a.away >= b.away) continue; // a is in front of b
      const cut: Rect = {
        x0: Math.max(a.rect.x0, b.rect.x0),
        x1: Math.min(a.rect.x1, b.rect.x1),
        y0: Math.max(a.rect.y0, b.rect.y0),
        y1: Math.min(a.rect.y1, b.rect.y1),
      };
      const hidden = area(cut) / Math.max(area(b.rect), 1e-9);
      if (!worst || hidden > worst.hidden) worst = { front: a.name, back: b.name, hidden };
    }
  }
  return { id: formation.id, pins: pins.length, worst, pass: (worst?.hidden ?? 0) <= OVERLAP.maxHidden };
}

/** Every formation, for the console table on /dev/pins. */
export function allFormationOverlaps(ground: GroundPatch, camera: Camera): FormationOverlap[] {
  return FORMATIONS.map((f) => formationOverlap(f, ground, camera));
}
