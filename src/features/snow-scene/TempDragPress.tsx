"use client";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY TEST HOOK. Delete this file when the real characters arrive.
// It exists only to check the snow scene (issue #2):
//   - drag a finger or the mouse on the snow: presses a groove that stays
//   - double click or double tap: punches a crater
//   - add ?guides to the address: two stand-in blocks where characters stand
//   - add ?fps to the address: frame rate replaces the hint at the bottom
// To remove: delete this file, its lines in SnowCanvas.tsx, the hint in
// SnowScene.tsx, and `tempHint`, `tempDrag`, `colors.tempGuide` in content.ts.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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
      last.set(e.pointerId, p);
      snow.pressGroove(p.x, p.z, radius);
      // Keep following the finger even if it slides off the canvas.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Not every pointer can be captured; dragging still works without it.
      }
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

    // A double click or double tap punches a crater, to try that part too.
    let lastTap = { time: 0, x: 0, y: 0 };
    const tap = (e: PointerEvent) => {
      const near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
      if (near && e.timeStamp - lastTap.time < 350) {
        const p = pointOnSnow(e);
        if (p) snow.punchCrater(p.x, p.z, content.tempDrag.craterRadius);
        lastTap = { time: 0, x: 0, y: 0 };
      } else {
        lastTap = { time: e.timeStamp, x: e.clientX, y: e.clientY };
      }
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointerdown", tap);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerdown", tap);
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

/**
 * TEMPORARY: with ?fps in the address, writes the frame rate into the hint
 * line at the bottom of the screen (averaged over each second).
 */
export function TempFps() {
  const [show] = useState(() =>
    new URLSearchParams(window.location.search).has("fps"),
  );
  const get = useThree((s) => s.get);

  useEffect(() => {
    if (!show) return;
    // For measuring the cost of one frame when the page cannot animate freely.
    const bench = (frames: number) => {
      const { advance, gl } = get();
      const context = gl.getContext();
      const pixel = new Uint8Array(4);
      const start = performance.now();
      for (let n = 0; n < frames; n++) {
        advance(performance.now() / 1000);
        // Reading a pixel back makes the graphics card finish the frame.
        context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
      }
      return (performance.now() - start) / frames;
    };
    const w = window as unknown as { __plopBench?: typeof bench };
    w.__plopBench = bench;
    return () => {
      delete w.__plopBench;
    };
  }, [show, get]);

  useFrame(() => {
    if (!show) return;
    const now = performance.now();
    fpsCount.frames++;
    if (now - fpsCount.since < 1000) return;
    const fps = (fpsCount.frames * 1000) / (now - fpsCount.since);
    fpsCount.frames = 0;
    fpsCount.since = now;
    const label = document.querySelector("[data-temp-hint]");
    if (label) label.textContent = `${fps.toFixed(0)} frames per second`;
  });

  return null;
}

const fpsCount = { frames: 0, since: 0 };
