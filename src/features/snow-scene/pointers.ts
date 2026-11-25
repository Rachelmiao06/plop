import { type Camera, Plane, Raycaster, Vector2, Vector3 } from "three";

// Who owns which finger. A feature that starts dragging something (a
// character, later) claims that finger, so the scene does not also treat it
// as half of a pinch-to-zoom. Fingers that nobody claimed are "on empty snow".

export const snowPointers = {
  /** Fingers a feature has claimed for its own drag. */
  claimed: new Set<number>(),
  /** True while two unclaimed fingers are pinching to zoom. */
  pinching: false,
};

/**
 * Call from a pointer-down handler to keep this finger for your own drag.
 * It is released by itself when the finger lifts.
 */
export function claimSnowPointer(pointerId: number): void {
  snowPointers.claimed.add(pointerId);
}

const raycaster = new Raycaster();
const ndc = new Vector2();
const plane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();

/**
 * Where on the snow a screen position points. Writes x and z into `out` and
 * returns false if it points at the sky. Aims at a flat plane first, then
 * once more at the snow's real height there (the mesh itself is not ray-tested).
 */
export function groundPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: Camera,
  heightAt: (x: number, z: number) => number,
  out: { x: number; z: number },
): boolean {
  const rect = canvas.getBoundingClientRect();
  ndc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  plane.constant = 0;
  if (!raycaster.ray.intersectPlane(plane, hit)) return false;
  plane.constant = -heightAt(hit.x, hit.z);
  if (!raycaster.ray.intersectPlane(plane, hit)) return false;
  out.x = hit.x;
  out.z = hit.z;
  return true;
}
