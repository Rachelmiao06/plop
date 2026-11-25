import { content } from "./content";

// Where the camera sits and where the two characters stand, worked out from
// the shape of the screen. Pure maths, no drawing.

export type Spot = { x: number; z: number };

export type SnowLayout = {
  /** Where the left and right characters stand on the snow. */
  spots: [Spot, Spot];
  /** How many scene units fit across the screen at the play area. */
  visibleWidth: number;
  /** How many scene units fit up the screen at the play area. */
  visibleHeight: number;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distance from the camera to the point it looks at. Same for every screen. */
export function cameraDistance(): number {
  const c = content.camera;
  const visibleHeight = 1 / c.characterScreenShare;
  return visibleHeight / (2 * Math.tan(toRadians(c.fieldOfView) / 2));
}

/** Camera position before the slow sway is added. */
export function cameraHome(): [number, number, number] {
  const c = content.camera;
  const d = cameraDistance();
  const e = toRadians(c.elevation);
  return [0, c.targetHeight + d * Math.sin(e), d * Math.cos(e)];
}

/**
 * The camera keeps a character at a fixed share of the screen height, so a
 * narrow screen simply shows less width. When the two spots no longer fit
 * side by side, they are staggered front-to-back (left one further away) and
 * stay the same distance apart.
 */
export function getLayout(aspect: number): SnowLayout {
  const visibleHeight = 1 / content.camera.characterScreenShare;
  const visibleWidth = visibleHeight * aspect;
  const half = content.layout.characterDistance / 2;
  const x = Math.min(half, (visibleWidth * content.layout.widthShare) / 2);
  const z = Math.sqrt(Math.max(half * half - x * x, 0));
  return {
    spots: [
      { x: -x, z: -z },
      { x, z },
    ],
    visibleWidth,
    visibleHeight,
  };
}

/** Unit direction pointing from the scene toward the sun. */
export function sunDirection(): [number, number, number] {
  return sunDirectionAt(content.light.sunElevation, content.light.sunAzimuth);
}

/** The same for any height and compass direction (degrees), as the time of day moves the sun. */
export function sunDirectionAt(elevation: number, azimuth: number): [number, number, number] {
  const el = toRadians(elevation);
  const az = toRadians(azimuth);
  return [Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az)];
}
