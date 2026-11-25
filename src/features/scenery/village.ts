/*
  The village fitted onto the game's lane: where each frame prop stands, the blockers a ball can
  burst on, the throwing view, and plain-language checks. Pure maths, no drawing.
*/

import type { SnowViewSettings } from "@/features/snow-scene";

import { lane as drawnLane, layout, propSettings, propWidth, village, type Placement, type PropId } from "./content";

/** The game's lane, in the bowling feature's shape (its `FEEL.lane` fits as is). */
export type GameLane = {
  /** Where the throwing line is (z). */
  lineZ: number;
  /** How far the thrower may slide left or right of the middle. */
  halfWidth: number;
  /** Where the pins stand. */
  pinSpot: { x: number; z: number };
};

/** The lane the layout was drawn for (scenery `lane`), in the same shape. */
export const drawnGameLane: GameLane = {
  lineZ: drawnLane.throwLine.z,
  halfWidth: drawnLane.throwLine.halfWidth,
  pinSpot: { x: drawnLane.pinZone.x, z: drawnLane.pinZone.z },
};

/** One frame prop placed on the game's lane. */
export type VillageProp = {
  key: string;
  id: PropId;
  x: number;
  z: number;
  scale: number;
  flip: boolean;
  height: number;
  width: number;
  side: Placement["side"];
  /** Height above the snow it stands at (0 = in the snow). */
  lift: number;
};

/**
 * The frame layout fitted onto a lane: depth stretched so the drawn line and pin zone land on the
 * lane's line and pin spot, side props moved out by the lane's extra slide room. Pins (the friend
 * cut-outs) are never part of it; they belong to the pins feature.
 */
export function villageLayout(lane: GameLane = drawnGameLane): VillageProp[] {
  const drawn = drawnGameLane;
  const k = (lane.lineZ - lane.pinSpot.z) / (drawn.lineZ - drawn.pinSpot.z);
  const shift = Math.max(lane.halfWidth - drawn.halfWidth, 0) + village.sideMargin;
  return layout.map((p, i) => {
    const scale = p.scale ?? 1;
    const out = p.side === "left" ? -shift : p.side === "right" ? shift : 0;
    return {
      key: `village-${p.prop}-${i}`,
      id: p.prop,
      x: p.x + out + (lane.pinSpot.x - drawn.pinSpot.x),
      z: lane.lineZ + (p.z - drawn.lineZ) * k,
      scale,
      flip: p.flip ?? false,
      height: propSettings(p.prop)!.height * scale,
      width: propWidth(p.prop) * scale,
      side: p.side,
      lift: p.lift ?? 0,
    };
  });
}

/** A big prop a snowball bursts on: a short round post at its base. */
export type Blocker = { name: PropId; x: number; z: number; radius: number };

/** Blockers for the big props (buildings, the big tree, pines) on this lane. */
export function villageBlockers(lane: GameLane = drawnGameLane): Blocker[] {
  return villageLayout(lane)
    .filter((p) => village.blockers.groups.includes(propSettings(p.id)!.group))
    .map((p) => ({ name: p.id, x: p.x, z: p.z, radius: p.width * village.blockers.radiusShare }));
}

/** The snow scene camera's throwing view for this lane: behind and above the line, looking down the lane. */
export function throwingView(lane: GameLane = drawnGameLane): SnowViewSettings {
  const v = village.view;
  return {
    lookAt: [
      lane.pinSpot.x * v.lookAtShare,
      v.lookAtHeight,
      lane.lineZ + (lane.pinSpot.z - lane.lineZ) * v.lookAtShare,
    ],
    pathAt: v.pathAt,
    distance: v.distance,
    turn: v.turn,
  };
}

/**
 * Plain-language problems; empty when every rule holds. The roll lane (the slide width plus a margin,
 * from just in front of the line to past the pins) must be clear, and when a camera position is given,
 * nothing may stand taller than the sight line from the camera to the pins.
 */
export function villageProblems(
  lane: GameLane = drawnGameLane,
  camera?: { x: number; y: number; z: number },
): string[] {
  const problems: string[] = [];
  const margin = drawnLane.clear.maxX - drawnLane.throwLine.halfWidth;
  const k = (lane.lineZ - lane.pinSpot.z) / (drawnGameLane.lineZ - drawnGameLane.pinSpot.z);
  const clear = {
    halfX: lane.halfWidth + margin,
    maxZ: lane.lineZ + (drawnLane.clear.maxZ - drawnLane.throwLine.z) * k,
    minZ: lane.lineZ + (drawnLane.clear.minZ - drawnLane.throwLine.z) * k,
  };
  for (const p of villageLayout(lane)) {
    const name = `${p.id} at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`;
    const half = p.width / 2;
    const inLane =
      p.x + half > lane.pinSpot.x - clear.halfX &&
      p.x - half < lane.pinSpot.x + clear.halfX &&
      p.z > clear.minZ &&
      p.z < clear.maxZ;
    if (inLane) problems.push(`${name} reaches into the roll lane`);
    if (!camera) continue;
    // Nearest point of the camera → pins line (seen from above) to the prop, and the sight line's height there.
    const ax = camera.x;
    const az = camera.z;
    const bx = lane.pinSpot.x;
    const bz = lane.pinSpot.z;
    const len2 = (bx - ax) ** 2 + (bz - az) ** 2;
    const t = Math.min(Math.max(((p.x - ax) * (bx - ax) + (p.z - az) * (bz - az)) / len2, 0), 1);
    const nx = ax + (bx - ax) * t;
    const nz = az + (bz - az) * t;
    const sightY = camera.y + (village.pinSightHeight - camera.y) * t;
    if (t < 1 && Math.hypot(p.x - nx, p.z - nz) < half && p.height > sightY) {
      problems.push(`${name} hides the pins from the throwing view`);
    }
  }
  return problems;
}

/** Drawn lane coordinates (layout space) to the game's lane, the same fit as `villageLayout`. */
export function fitPoint(x: number, z: number, lane: GameLane = drawnGameLane): [number, number] {
  const drawn = drawnGameLane;
  const k = (lane.lineZ - lane.pinSpot.z) / (drawn.lineZ - drawn.pinSpot.z);
  const shift = Math.max(lane.halfWidth - drawn.halfWidth, 0) + village.sideMargin;
  const out = Math.abs(x) > drawnLane.clear.maxX ? Math.sign(x) * shift : 0;
  return [x + out + (lane.pinSpot.x - drawn.pinSpot.x), lane.lineZ + (z - drawn.lineZ) * k];
}
