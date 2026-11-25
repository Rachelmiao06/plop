"use client";

import { useContext, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Camera } from "three";
import { content } from "./content";
import { cameraDistance } from "./layout";
import { groundPoint, snowPointers } from "./pointers";
import { SnowContext } from "./snowContext";

// The diorama camera. It always looks down at the same angle; zooming only
// moves it closer along that line and slides the point it looks at.

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

class CameraZoom {
  // 1 = the full scene, content.zoom.closest = right up to the snow.
  private level = 1;
  private goalLevel = 1;
  // The point on the ground the camera looks at.
  private x = 0;
  private z = 0;
  private goalX = 0;
  private goalZ = 0;

  /** Zoom by `factor` (below 1 = closer), keeping this ground point in place on screen. */
  zoomAbout(px: number, pz: number, factor: number): void {
    const next = clamp(this.goalLevel * factor, content.zoom.closest, 1);
    const ratio = next / this.goalLevel;
    this.goalX = px + (this.goalX - px) * ratio;
    this.goalZ = pz + (this.goalZ - pz) * ratio;
    this.goalLevel = next;
    this.keepInBounds();
  }

  panBy(dx: number, dz: number): void {
    this.goalX += dx;
    this.goalZ += dz;
    this.keepInBounds();
  }

  // The closer the view, the further it may wander; at full view it is centred.
  private keepInBounds(): void {
    const z = content.zoom;
    const room = (1 - this.goalLevel) / (1 - z.closest);
    this.goalX = clamp(this.goalX, -z.panX * room, z.panX * room);
    this.goalZ = clamp(this.goalZ, -z.panZFar * room, z.panZNear * room);
  }

  update(seconds: number): void {
    const a = 1 - Math.exp(-content.zoom.ease * seconds);
    this.level += (this.goalLevel - this.level) * a;
    this.x += (this.goalX - this.x) * a;
    this.z += (this.goalZ - this.z) * a;
  }

  apply(camera: Camera, time: number): void {
    const c = content.camera;
    const e = (c.elevation * Math.PI) / 180;
    const d = cameraDistance() * this.level;
    // A tiny slow sway so sparkles glint; smaller when close so it never swims.
    const t = time * c.swaySpeed;
    const sway = c.swayAmount * this.level;
    camera.position.set(
      this.x + Math.sin(t) * sway,
      c.targetHeight + d * Math.sin(e) + Math.cos(t * 1.3) * sway * 0.5,
      this.z + d * Math.cos(e),
    );
    camera.lookAt(this.x, c.targetHeight, this.z);
  }
}

export function CameraRig() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("CameraRig must be inside the snow scene");
  const canvas = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  const zoom = useMemo(() => new CameraZoom(), []);

  useEffect(() => {
    const point = { x: 0, z: 0 };
    const onSnow = (clientX: number, clientY: number) =>
      groundPoint(clientX, clientY, canvas, get().camera, field.heightAt, point);

    // Mouse wheel, and trackpad pinch (which browsers report as ctrl + wheel).
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const lines = e.deltaMode === 1 ? 16 : 1;
      const speed = e.ctrlKey
        ? content.zoom.trackpadPinchSpeed
        : content.zoom.wheelSpeed;
      const factor = Math.exp(e.deltaY * lines * speed);
      if (onSnow(e.clientX, e.clientY)) zoom.zoomAbout(point.x, point.z, factor);
    };

    // Two fingers on empty snow: pinch to zoom, and slide to move the view.
    const touches = new Map<number, { x: number; y: number }>();
    let pair: [number, number] | null = null;
    let lastGap = 0;
    let lastMidX = 0;
    let lastMidY = 0;

    const endPinch = () => {
      pair = null;
      snowPointers.pinching = false;
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    };

    const move = (e: PointerEvent) => {
      const touch = touches.get(e.pointerId);
      if (!touch) return;
      touch.x = e.clientX;
      touch.y = e.clientY;

      if (!pair) {
        // Decided here, not on touch-down, so a feature has had its chance
        // to claim the finger first.
        const free = [...touches.keys()].filter(
          (id) => !snowPointers.claimed.has(id),
        );
        if (free.length < 2) return;
        pair = [free[0], free[1]];
        snowPointers.pinching = true;
        lastGap = 0;
      }

      const a = touches.get(pair[0]);
      const b = touches.get(pair[1]);
      if (!a || !b) return endPinch();
      const gap = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (lastGap > 0 && gap > 0) {
        // Slide: keep the snow under the fingers under the fingers.
        if (onSnow(lastMidX, lastMidY)) {
          const fromX = point.x;
          const fromZ = point.z;
          if (onSnow(midX, midY)) zoom.panBy(fromX - point.x, fromZ - point.z);
        }
        if (onSnow(midX, midY)) zoom.zoomAbout(point.x, point.z, lastGap / gap);
      }
      lastGap = gap;
      lastMidX = midX;
      lastMidY = midY;
    };

    const up = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      snowPointers.claimed.delete(e.pointerId);
      if (pair && pair.includes(e.pointerId)) endPinch();
    };

    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      endPinch();
    };
  }, [canvas, get, field, zoom]);

  useFrame((state, delta) => {
    zoom.update(Math.min(delta, 0.1));
    zoom.apply(state.camera, state.clock.elapsedTime);
  });

  return null;
}
