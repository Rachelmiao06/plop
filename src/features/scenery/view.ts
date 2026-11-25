/*
  A tiny pinhole camera for the flat previews on /dev/scenery. No Three.js: it only turns a
  point in the scene into a spot on a 2D panel, the way the default 3D camera would see it.
*/

import { previewCamera } from "./content";

const rad = (deg: number) => (deg * Math.PI) / 180;

const { elevation, fieldOfView, characterScreenShare, targetHeight, aspect } = previewCamera;
const tanHalf = Math.tan(rad(fieldOfView) / 2);
/** Distance at which a one-unit character fills `characterScreenShare` of the screen height. */
const distance = 1 / characterScreenShare / 2 / tanHalf;
const sinE = Math.sin(rad(elevation));
const cosE = Math.cos(rad(elevation));

/** Depth along the view direction, and the up/down offset across it, for a scene point. */
function toCamera(x: number, y: number, z: number, level = 1) {
  const camY = targetHeight + distance * level * sinE;
  const camZ = distance * level * cosE;
  const dy = y - camY;
  const dz = z - camZ;
  // forward = (0, -sinE, -cosE), up = (0, cosE, -sinE), right = (1, 0, 0)
  return { depth: -dy * sinE - dz * cosE, up: dy * cosE - dz * sinE, right: x };
}

export type ScreenPoint = {
  /** Percent of the panel width from the left. */
  left: number;
  /** Percent of the panel height from the top. */
  top: number;
  /** Depth from the camera, for back-to-front painting. */
  depth: number;
  /** Percent of the panel height that one scene unit covers at this depth. */
  unitHeight: number;
  /** Percent of the panel width that one scene unit covers at this depth. */
  unitWidth: number;
};

/** `level` 1 = the default camera; larger = pulled back along the same direction. */
export function project(x: number, y: number, z: number, level = 1): ScreenPoint {
  const c = toCamera(x, y, z, level);
  const ndcX = c.right / (c.depth * tanHalf * aspect);
  const ndcY = c.up / (c.depth * tanHalf);
  return {
    left: ((ndcX + 1) / 2) * 100,
    top: ((1 - ndcY) / 2) * 100,
    depth: c.depth,
    unitHeight: 100 / (2 * c.depth * tanHalf),
    unitWidth: 100 / (2 * c.depth * tanHalf * aspect),
  };
}

/** The patch of snow the default camera sees: four ground corners (x, z), near left first, clockwise. */
export function groundFootprint(): [number, number][] {
  const camY = targetHeight + distance * sinE;
  const camZ = distance * cosE;
  const groundZ = (ndcY: number) => {
    // Ray through the screen's vertical position ndcY, hitting the ground (y = 0).
    const pitch = rad(elevation) - Math.atan(ndcY * tanHalf);
    return camZ - camY / Math.tan(pitch);
  };
  const halfWidthAt = (z: number) => toCamera(0, 0, z).depth * tanHalf * aspect;
  const near = groundZ(-1);
  const far = groundZ(1);
  return [
    [-halfWidthAt(near), near],
    [-halfWidthAt(far), far],
    [halfWidthAt(far), far],
    [halfWidthAt(near), near],
  ];
}

/** Where the default camera sits, `level` times its normal distance away. Looks at (0, targetHeight, 0). */
export function defaultCameraPosition(level = 1): [number, number, number] {
  return [0, targetHeight + distance * level * sinE, distance * level * cosE];
}

export const cameraTarget: [number, number, number] = [0, targetHeight, 0];
