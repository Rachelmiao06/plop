"use client";

import { useContext, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Camera } from "three";
import { content } from "./content";
import { cameraDistance, getLayout } from "./layout";
import { groundPoint, snowPointers, snowView } from "./pointers";
import { SnowContext } from "./snowContext";

// The diorama camera. One finger (or the mouse) on empty snow turns the view
// within limits; two fingers or the wheel zoom. It never goes behind or
// under the scene, and "reset view" brings back the starting angle.

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const RAD = Math.PI / 180;

class CameraView {
  // Zoom: 1 = a character is a fifth of the screen height; smaller = closer.
  private level = 1;
  private goalLevel = 1;
  // True while the view is zoomed all the way out, so it stays that way when turned.
  private atFull = true;
  // The point on the ground the camera looks at.
  private x = 0;
  private z = 0;
  private goalX = 0;
  private goalZ = 0;
  // Turn left/right and tilt up/down, in degrees.
  private yaw = 0;
  private goalYaw = 0;
  private pitch: number = content.camera.elevation;
  private goalPitch: number = content.camera.elevation;
  // Leftover turning speed after a flick (degrees per second).
  private spinYaw = 0;
  private spinPitch = 0;
  private aspect = 1;

  setAspect(aspect: number): void {
    if (aspect === this.aspect) return;
    this.aspect = aspect;
    this.refit();
  }

  /**
   * The furthest zoom-out for the current turn: far enough that both
   * character spots stay in frame, never closer than the normal full view.
   */
  private fullLevel(): number {
    const layout = getLayout(this.aspect);
    const cos = Math.cos(this.goalYaw * RAD);
    const sin = Math.sin(this.goalYaw * RAD);
    // How much width the two spots need now, and how much they needed
    // before any turning (the starting view is never changed by this).
    let need = 0;
    let needAtStart = 0;
    for (const spot of layout.spots) {
      need = Math.max(need, Math.abs(spot.x * cos - spot.z * sin));
      needAtStart = Math.max(needAtStart, Math.abs(spot.x));
    }
    const margin = content.orbit.fitMargin;
    const wide =
      (need + margin) / Math.max(needAtStart + margin, layout.visibleWidth / 2);
    // From high above, the whole depth of the slab must fit up the screen too.
    const g = content.ground;
    const tall =
      ((g.sizeX / 2) * Math.abs(sin) + (g.sizeZ / 2) * Math.abs(cos)) *
        Math.sin(this.goalPitch * RAD) +
      content.orbit.fitMargin * 0.5;
    return Math.max(1, wide, tall / (layout.visibleHeight / 2));
  }

  private refit(): void {
    const full = this.fullLevel();
    this.goalLevel = this.atFull ? full : Math.min(this.goalLevel, full);
    this.keepInBounds();
  }

  /** Zoom by `factor` (below 1 = closer), keeping this ground point in place on screen. */
  zoomAbout(px: number, pz: number, factor: number): void {
    const full = this.fullLevel();
    const next = clamp(this.goalLevel * factor, content.zoom.closest, full);
    const ratio = next / this.goalLevel;
    this.goalX = px + (this.goalX - px) * ratio;
    this.goalZ = pz + (this.goalZ - pz) * ratio;
    this.goalLevel = next;
    this.atFull = next >= full * 0.995;
    this.keepInBounds();
  }

  panBy(dx: number, dz: number): void {
    this.goalX += dx;
    this.goalZ += dz;
    this.keepInBounds();
  }

  /** Turn and tilt by this many degrees, within the limits. */
  orbitBy(yaw: number, pitch: number): void {
    const o = content.orbit;
    this.goalYaw = clamp(this.goalYaw + yaw, -o.yawLimit, o.yawLimit);
    this.goalPitch = clamp(this.goalPitch + pitch, o.pitchMin, o.pitchMax);
    this.refit();
  }

  /** Let the view coast on after a flick. */
  flick(yawPerSecond: number, pitchPerSecond: number): void {
    this.spinYaw = yawPerSecond;
    this.spinPitch = pitchPerSecond;
  }

  reset(): void {
    this.goalYaw = 0;
    this.goalPitch = content.camera.elevation;
    this.spinYaw = 0;
    this.spinPitch = 0;
    this.goalX = 0;
    this.goalZ = 0;
    this.atFull = true;
    this.goalLevel = this.fullLevel();
  }

  // The closer the view, the further it may wander; at full view it is centred.
  private keepInBounds(): void {
    const z = content.zoom;
    const full = this.fullLevel();
    const room = clamp((full - this.goalLevel) / (full - z.closest), 0, 1);
    this.goalX = clamp(this.goalX, -z.panX * room, z.panX * room);
    this.goalZ = clamp(this.goalZ, -z.panZFar * room, z.panZNear * room);
  }

  update(seconds: number): void {
    const o = content.orbit;
    if (this.spinYaw !== 0 || this.spinPitch !== 0) {
      this.orbitBy(this.spinYaw * seconds, this.spinPitch * seconds);
      const slow = Math.exp(-o.friction * seconds);
      this.spinYaw *= slow;
      this.spinPitch *= slow;
      if (Math.abs(this.spinYaw) + Math.abs(this.spinPitch) < 0.5) {
        this.spinYaw = 0;
        this.spinPitch = 0;
      }
    }
    const zoomEase = 1 - Math.exp(-content.zoom.ease * seconds);
    this.level += (this.goalLevel - this.level) * zoomEase;
    this.x += (this.goalX - this.x) * zoomEase;
    this.z += (this.goalZ - this.z) * zoomEase;
    const turnEase = 1 - Math.exp(-o.ease * seconds);
    this.yaw += (this.goalYaw - this.yaw) * turnEase;
    this.pitch += (this.goalPitch - this.pitch) * turnEase;
  }

  apply(camera: Camera, time: number): void {
    const c = content.camera;
    const d = cameraDistance() * this.level;
    const pitch = this.pitch * RAD;
    const yaw = this.yaw * RAD;
    const flat = d * Math.cos(pitch);
    // Look a little in front of the middle (toward the viewer), so the cut
    // side of the slab is in frame. Less so from above, where no side shows.
    const o = content.orbit;
    const lean =
      c.targetZ *
      this.level *
      clamp((o.pitchMax - this.pitch) / (o.pitchMax - c.elevation), 0, 1.2);
    const lookX = this.x + Math.sin(yaw) * lean;
    const lookZ = this.z + Math.cos(yaw) * lean;
    // A tiny slow sway so sparkles glint; smaller when close so it never swims.
    const t = time * c.swaySpeed;
    const sway = c.swayAmount * this.level;
    const side = Math.sin(t) * sway;
    camera.position.set(
      lookX + flat * Math.sin(yaw) + side * Math.cos(yaw),
      c.targetHeight + d * Math.sin(pitch) + Math.cos(t * 1.3) * sway * 0.5,
      lookZ + flat * Math.cos(yaw) - side * Math.sin(yaw),
    );
    camera.lookAt(lookX, c.targetHeight, lookZ);
  }
}

type Touch = { x: number; y: number; time: number; mouse: boolean };

export function CameraRig() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("CameraRig must be inside the snow scene");
  const canvas = useThree((s) => s.gl.domElement);
  const get = useThree((s) => s.get);
  const view = useMemo(() => new CameraView(), []);

  useEffect(() => {
    snowView.reset = () => view.reset();

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
      if (onSnow(e.clientX, e.clientY)) view.zoomAbout(point.x, point.z, factor);
    };

    // Every finger (and the mouse while its button is down) on the canvas.
    const touches = new Map<number, Touch>();
    // Two fingers on empty snow: pinch to zoom, and slide to move the view.
    let pair: [number, number] | null = null;
    let lastGap = 0;
    let lastMidX = 0;
    let lastMidY = 0;
    // One finger on empty snow: turn the view. Remember its recent speed for a flick.
    let turning: number | null = null;
    let turnYaw = 0;
    let turnPitch = 0;

    const endPinch = () => {
      pair = null;
      snowPointers.pinching = false;
    };

    const down = (e: PointerEvent) => {
      touches.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        time: e.timeStamp,
        mouse: e.pointerType === "mouse",
      });
      view.flick(0, 0);
    };

    const move = (e: PointerEvent) => {
      const touch = touches.get(e.pointerId);
      if (!touch) return;
      const dx = e.clientX - touch.x;
      const dy = e.clientY - touch.y;
      const seconds = Math.max((e.timeStamp - touch.time) / 1000, 0.001);
      touch.x = e.clientX;
      touch.y = e.clientY;
      touch.time = e.timeStamp;

      // Decided here, not on touch-down, so a feature has had its chance to
      // claim the finger first. Claimed fingers never turn or zoom the view.
      const free = [...touches.keys()].filter((id) => !snowPointers.claimed.has(id));
      const freeFingers = free.filter((id) => !touches.get(id)?.mouse);

      if (!pair && freeFingers.length >= 2) {
        pair = [freeFingers[0], freeFingers[1]];
        snowPointers.pinching = true;
        turning = null;
        lastGap = 0;
      }

      if (pair) {
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
            if (onSnow(midX, midY)) view.panBy(fromX - point.x, fromZ - point.z);
          }
          if (onSnow(midX, midY)) view.zoomAbout(point.x, point.z, lastGap / gap);
        }
        lastGap = gap;
        lastMidX = midX;
        lastMidY = midY;
        return;
      }

      if (snowPointers.lookOff || free.length !== 1 || free[0] !== e.pointerId) return;
      // Dragging right turns the scene to the right; dragging down tips it
      // toward you (a more top-down view).
      const yaw = -dx * content.orbit.speed;
      const pitch = dy * content.orbit.speed;
      view.orbitBy(yaw, pitch);
      turning = e.pointerId;
      turnYaw = turnYaw * 0.6 + (yaw / seconds) * 0.4;
      turnPitch = turnPitch * 0.6 + (pitch / seconds) * 0.4;
    };

    const up = (e: PointerEvent) => {
      const touch = touches.get(e.pointerId);
      if (turning === e.pointerId && touch) {
        // Coast on only if the finger was still moving when it lifted.
        const paused = e.timeStamp - touch.time > 90;
        if (!paused) view.flick(turnYaw, turnPitch);
        turning = null;
      }
      turnYaw = 0;
      turnPitch = 0;
      touches.delete(e.pointerId);
      snowPointers.claimed.delete(e.pointerId);
      if (pair && pair.includes(e.pointerId)) endPinch();
    };

    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      snowView.reset = () => {};
      endPinch();
    };
  }, [canvas, get, field, view]);

  useFrame((state, delta) => {
    view.setAspect(state.size.width / Math.max(state.size.height, 1));
    view.update(Math.min(delta, 0.1));
    view.apply(state.camera, state.clock.elapsedTime);
  });

  return null;
}
