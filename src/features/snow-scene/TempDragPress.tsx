"use client";

// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY TEST HOOK. Delete this file when the real characters arrive.
// It exists only to check the snow scene (issue #2):
// The "Press" button (top right, in ViewControls.tsx) switches it on; in
// "Look" mode a drag turns the view instead. In press mode:
//   - press and hold on the snow: digs deeper the longer it is held
//   - drag: a groove that follows the finger with a little lag (friction)
//   - double click or double tap: punches a crater
// Always:
//   - add ?guides to the address: two stand-in blocks where characters stand
//   - add ?fps to the address: frame rate replaces the hint at the bottom
// (Turning and zooming the view are NOT temporary; they live in CameraRig.tsx.)
// To remove: delete this file and its lines in SnowCanvas.tsx; in
// ViewControls.tsx the look / press switch and the second hint; `lookOff` in
// pointers.ts; and `tempLook`, `tempPress`, `tempPressHint`, `tempDrag`,
// `colors.tempGuide` in content.ts.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { content } from "./content";
import { snowPointers } from "./pointers";
import { useSnow, useSnowLayout, useSnowPoint } from "./snowContext";

type Finger = {
  clientX: number;
  clientY: number;
  // The pressed point, which trails behind the finger.
  x: number;
  z: number;
  placed: boolean;
  // How quickly the point is following right now (eased, so it never jerks).
  follow: number;
  touch: boolean;
  // Seconds since it touched down.
  age: number;
};

// For measuring only: how far the pressed point trails the finger, and how
// much its speed changes from one frame to the next.
const tempTrail = { gap: 0, speed: 0, jolt: 0 };

// One entry per finger. Mouse and touch both count as fingers.
const fingers = new Map<number, Finger>();

export function TempDragPress() {
  const snow = useSnow();
  const pointOnSnow = useSnowPoint();
  const canvas = useThree((s) => s.gl.domElement);

  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (!snowPointers.lookOff) return;
      fingers.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
        x: 0,
        z: 0,
        placed: false,
        follow: content.tempDrag.followFresh,
        touch: e.pointerType !== "mouse",
        age: 0,
      });
      // Keep following the finger even if it slides off the canvas.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // Not every pointer can be captured; dragging still works without it.
      }
    };

    const move = (e: PointerEvent) => {
      const finger = fingers.get(e.pointerId);
      if (!finger) return;
      finger.clientX = e.clientX;
      finger.clientY = e.clientY;
    };

    const up = (e: PointerEvent) => {
      fingers.delete(e.pointerId);
    };

    // A double click or double tap punches a crater, to try that part too.
    let lastTap = { time: 0, x: 0, y: 0 };
    const tap = (e: PointerEvent) => {
      if (!snowPointers.lookOff) return;
      const near = Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30;
      if (near && e.timeStamp - lastTap.time < 350) {
        const p = pointOnSnow(e.clientX, e.clientY);
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
      fingers.clear();
    };
  }, [canvas, pointOnSnow, snow]);

  // The pressing itself happens once per frame, so that holding still keeps
  // digging and the pressed point can lag behind the finger.
  useFrame((_, delta) => {
    // Two fingers on empty snow are a pinch-to-zoom, not two presses.
    let touching = 0;
    for (const [id, finger] of fingers) {
      if (finger.touch && !snowPointers.claimed.has(id)) touching++;
    }
    if (snowPointers.pinching || touching >= 2 || !snowPointers.lookOff) {
      fingers.clear();
    }
    if (fingers.size === 0) return;

    const t = content.tempDrag;
    const seconds = Math.min(delta, 0.05);
    const radius = t.ballRadius;
    const step = radius * t.spacing;

    for (const [id, finger] of fingers) {
      if (snowPointers.claimed.has(id)) continue;
      const target = pointOnSnow(finger.clientX, finger.clientY);
      if (!target) continue;

      // A touch waits a moment before it presses, in case a second finger
      // is about to land and make it a pinch.
      finger.age += seconds;
      if (finger.touch && finger.age < t.touchDelay) continue;

      if (!finger.placed) {
        finger.placed = true;
        finger.x = target.x;
        finger.z = target.z;
        snow.pressGroove(finger.x, finger.z, radius);
        continue;
      }

      // Friction: fresh snow ahead holds the point back, a packed track lets it run.
      const toX = target.x - finger.x;
      const toZ = target.z - finger.z;
      const far = Math.hypot(toX, toZ);
      const aheadX = far > 0 ? finger.x + (toX / far) * radius : finger.x;
      const aheadZ = far > 0 ? finger.z + (toZ / far) * radius : finger.z;
      const packed = snow.packedAt(aheadX, aheadZ);
      const wanted = t.followFresh + (t.followPacked - t.followFresh) * packed;
      finger.follow +=
        (wanted - finger.follow) * (1 - Math.exp(-t.followSmoothing * seconds));
      // Close a share of the gap each frame (the same feel at any frame
      // rate), and never fall further behind than maxTrail.
      const share = 1 - Math.exp(-finger.follow * seconds);
      const distance = Math.max(far * share, far - t.maxTrail);
      const moveX = far > 0 ? (toX / far) * distance : 0;
      const moveZ = far > 0 ? (toZ / far) * distance : 0;
      const stamps = Math.max(Math.ceil(distance / step), 1);
      const speed = distance / seconds;
      tempTrail.gap = far - distance;
      tempTrail.jolt = Math.abs(speed - tempTrail.speed);
      tempTrail.speed = speed;
      const digging = Math.max(1 - speed / t.digStopSpeed, 0);
      const options = {
        dig: (t.digRate * digging * seconds) / stamps,
        velocityX: moveX / seconds,
        velocityZ: moveZ / seconds,
      };
      for (let n = 1; n <= stamps; n++) {
        const along = n / stamps;
        snow.pressGroove(
          finger.x + moveX * along,
          finger.z + moveZ * along,
          radius,
          options,
        );
      }
      finger.x += moveX;
      finger.z += moveZ;
    }
  });

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
    const bench = (frames: number, waitForGraphics = true) => {
      const { advance, gl } = get();
      const context = gl.getContext();
      const pixel = new Uint8Array(4);
      const start = performance.now();
      for (let n = 0; n < frames; n++) {
        advance(performance.now() / 1000);
        // Reading a pixel back makes the graphics card finish the frame.
        if (waitForGraphics) {
          context.readPixels(0, 0, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
        }
      }
      return (performance.now() - start) / frames;
    };
    const camera = () => get().camera.position.toArray();
    const w = window as unknown as {
      __plopBench?: typeof bench;
      __plopCamera?: typeof camera;
      __plopTrail?: () => typeof tempTrail;
      __plopSharpness?: (ratio: number) => void;
    };
    w.__plopBench = bench;
    w.__plopCamera = camera;
    w.__plopTrail = () => tempTrail;
    w.__plopSharpness = (ratio: number) => get().setDpr(ratio);
    return () => {
      delete w.__plopBench;
      delete w.__plopCamera;
      delete w.__plopTrail;
      delete w.__plopSharpness;
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
