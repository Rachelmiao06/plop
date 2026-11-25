"use client";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY TEST HOOK. Delete this file when the real characters arrive.
// Dragging a finger or the mouse on the snow presses a dent that stays, and
// adding ?guides to the address shows two stand-in blocks where the
// characters will stand. Both exist only to check the snow scene (issue #2).
// To remove: delete this file, its two lines in SnowCanvas.tsx, the hint in
// SnowScene.tsx, and `tempHint`, `tempDrag`, `colors.tempGuide` in content.ts.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Plane, Raycaster, Vector2, Vector3 } from "three";
import { content } from "./content";
import { useSnow, useSnowLayout } from "./snowContext";

export function TempDragPress() {
  const snow = useSnow();
  const canvas = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);

  useEffect(() => {
    const raycaster = new Raycaster();
    const pointer = new Vector2();
    const plane = new Plane(new Vector3(0, 1, 0), 0);
    const hit = new Vector3();
    // One entry per finger, so two people can drag at once.
    const last = new Map<number, { x: number; z: number }>();
    const radius = content.tempDrag.ballRadius;
    const step = radius * content.tempDrag.spacing;

    const pointOnSnow = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, get().camera);
      // Aim at a flat plane first, then once more at the snow's real height there.
      plane.constant = 0;
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      plane.constant = -snow.heightAt(hit.x, hit.z);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return { x: hit.x, z: hit.z };
    };

    const down = (e: PointerEvent) => {
      const p = pointOnSnow(e);
      if (!p) return;
      canvas.setPointerCapture(e.pointerId);
      last.set(e.pointerId, p);
      snow.pressGroove(p.x, p.z, radius);
    };

    const move = (e: PointerEvent) => {
      const from = last.get(e.pointerId);
      if (!from) return;
      const to = pointOnSnow(e);
      if (!to) return;
      const dx = to.x - from.x;
      const dz = to.z - from.z;
      const distance = Math.hypot(dx, dz);
      const stamps = Math.floor(distance / step);
      if (stamps < 1) return;
      for (let n = 1; n <= stamps; n++) {
        const t = (n * step) / distance;
        snow.pressGroove(from.x + dx * t, from.z + dz * t, radius);
      }
      const t = (stamps * step) / distance;
      last.set(e.pointerId, { x: from.x + dx * t, z: from.z + dz * t });
    };

    const up = (e: PointerEvent) => {
      last.delete(e.pointerId);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, [canvas, get, snow]);

  return null;
}

/** TEMPORARY: with ?guides in the address, shows where the characters will stand. */
export function TempGuides() {
  const snow = useSnow();
  const { spots } = useSnowLayout();
  const [show] = useState(() =>
    new URLSearchParams(window.location.search).has("guides"),
  );
  if (!show) return null;
  return (
    <>
      {spots.map((spot, n) => (
        <mesh
          key={n}
          position={[spot.x, snow.heightAt(spot.x, spot.z) + 0.5, spot.z]}
          castShadow
        >
          <boxGeometry args={[0.6, 1, 0.3]} />
          <meshStandardMaterial color={content.colors.tempGuide} />
        </mesh>
      ))}
    </>
  );
}
