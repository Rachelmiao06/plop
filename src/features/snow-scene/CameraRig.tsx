"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Camera } from "three";
import { content } from "./content";
import { cameraDistance, getLayout } from "./layout";
import { snowPointers, snowView } from "./pointers";
import { sharedUniforms } from "./sharedUniforms";

// The diorama camera. Its whole state is two numbers: where it is on one
// path (low and close, through the play view, up to high and far) and how
// far it is turned left or right. Every kind of input moves those two.

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const RAD = Math.PI / 180;

class CameraView {
  // Position on the path, 0 (low end) to 1 (high end): where it is asked to
  // be, and where it is now on its way there.
  private goalPath: number = content.cameraPath.playAt;
  private path: number = content.cameraPath.playAt;
  // Turned left/right, in degrees.
  private goalYaw = 0;
  private yaw = 0;
  // Leftover speed after a flicked drag (path per second, degrees per second).
  private spinPath = 0;
  private spinYaw = 0;
  private aspect = 1;

  setAspect(aspect: number): void {
    this.aspect = aspect;
  }

  /**
   * The play-view distance for a given turn: far enough that both character
   * spots stay in frame, never closer than the normal view.
   */
  private homeLevel(yaw: number): number {
    const layout = getLayout(this.aspect);
    const cos = Math.cos(yaw * RAD);
    const sin = Math.sin(yaw * RAD);
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
    return Math.max(1, wide);
  }

  /** Move along the path by this share of it (positive = rise). Eases into both ends. */
  movePath(amount: number): void {
    if (amount === 0) return;
    const room = amount > 0 ? 1 - this.goalPath : this.goalPath;
    const ease = clamp(room / content.cameraPath.endEase, 0.08, 1);
    this.goalPath = clamp(this.goalPath + amount * ease, 0, 1);
  }

  /** Turn by this many degrees. Eases into both limits. */
  turn(degrees: number): void {
    if (degrees === 0) return;
    const limit = content.orbit.yawLimit;
    const room = limit - Math.sign(degrees) * this.goalYaw;
    const ease = clamp(room / (limit * 0.15), 0.08, 1);
    this.goalYaw = clamp(this.goalYaw + degrees * ease, -limit, limit);
  }

  /** Let the view coast on after a flicked drag. */
  flick(pathPerSecond: number, yawPerSecond: number): void {
    this.spinPath = pathPerSecond;
    this.spinYaw = yawPerSecond;
  }

  reset(): void {
    this.goalPath = content.cameraPath.playAt;
    this.goalYaw = 0;
    this.spinPath = 0;
    this.spinYaw = 0;
  }

  update(seconds: number): void {
    const input = content.cameraInput;
    if (this.spinPath !== 0 || this.spinYaw !== 0) {
      this.movePath(this.spinPath * seconds);
      this.turn(this.spinYaw * seconds);
      const slow = Math.exp(-input.friction * seconds);
      this.spinPath *= slow;
      this.spinYaw *= slow;
      if (Math.abs(this.spinPath) < 0.002 && Math.abs(this.spinYaw) < 0.5) {
        this.spinPath = 0;
        this.spinYaw = 0;
      }
    }
    // Glide toward the goal by the same share per second at any frame rate.
    this.path += (this.goalPath - this.path) * (1 - Math.exp(-input.ease * seconds));
    this.yaw += (this.goalYaw - this.yaw) * (1 - Math.exp(-input.turnEase * seconds));
  }

  apply(camera: Camera, time: number): void {
    const c = content.camera;
    const p = content.cameraPath;

    // -1 at the low end, 0 at the play view, 1 at the high end, with finer
    // control around the play view.
    const side = this.path >= p.playAt ? 1 - p.playAt : p.playAt;
    const v = clamp((this.path - p.playAt) / side, -1, 1);
    const w = v * (p.middleSpeed + (1 - p.middleSpeed) * Math.abs(v));

    // Distance and angle move together along the path. Distance is blended
    // on a log scale, so each step feels the same size near and far.
    const home = this.homeLevel(this.yaw);
    const level =
      w >= 0
        ? Math.exp(lerp(Math.log(home), Math.log(Math.max(p.highDistance, home)), w))
        : Math.exp(lerp(Math.log(home), Math.log(p.lowDistance), -w));
    const pitch =
      (w >= 0 ? lerp(c.elevation, p.highPitch, w) : lerp(c.elevation, p.lowPitch, -w)) *
      RAD;

    const thin = clamp(
      (level - p.flakeFadeStart) / (p.flakeFadeEnd - p.flakeFadeStart),
      0,
      1,
    );
    sharedUniforms.uFlakeFade.value = 1 - thin;

    const d = cameraDistance() * level;
    const yaw = this.yaw * RAD;
    const flat = d * Math.cos(pitch);
    // A tiny slow sway so sparkles glint; smaller when close so it never swims.
    const t = time * c.swaySpeed;
    const sway = c.swayAmount * Math.min(level, 1);
    const across = Math.sin(t) * sway;
    camera.position.set(
      flat * Math.sin(yaw) + across * Math.cos(yaw),
      c.targetHeight + d * Math.sin(pitch) + Math.cos(t * 1.3) * sway * 0.5,
      flat * Math.cos(yaw) - across * Math.sin(yaw),
    );
    camera.lookAt(0, c.targetHeight, 0);
  }

  /** For measuring: where on the path and how far turned. */
  state() {
    return {
      path: this.path,
      goalPath: this.goalPath,
      yaw: this.yaw,
      goalYaw: this.goalYaw,
    };
  }
}

type Touch = { x: number; y: number; time: number; mouse: boolean };
type GestureLike = Event & { scale?: number };

export function CameraRig() {
  const canvas = useThree((s) => s.gl.domElement);
  const view = useMemo(() => new CameraView(), []);

  useEffect(() => {
    snowView.reset = () => view.reset();
    snowView.state = () => view.state();
    const input = content.cameraInput;
    // The whole scene (canvas and the buttons over it).
    const scene = canvas.closest("section") ?? canvas;
    const overScene = (e: Event) => e.target instanceof Node && scene.contains(e.target);

    // ---- Trackpad, mouse wheel and trackpad pinch -------------------------
    let lastWheel = -Infinity;
    let axis: "path" | "turn" | null = null;
    let travelled = 0;
    let travelledX = 0;

    const wheel = (e: WheelEvent) => {
      if (!overScene(e)) return;
      // Keep the page from scrolling, bouncing or zooming.
      e.preventDefault();
      const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dx = e.deltaX * lines;
      const dy = e.deltaY * lines;
      if (dx === 0 && dy === 0) return;
      const sinceLast = e.timeStamp - lastWheel;
      lastWheel = e.timeStamp;
      const scroll = input.invertScroll ? -1 : 1;

      if (e.ctrlKey) {
        // Trackpad pinch (Chrome, Firefox): fingers together = rise.
        view.movePath(
          clamp(dy, -input.pinchMaxDelta, input.pinchMaxDelta) * input.pinchPath,
        );
        return;
      }

      // A mouse wheel notch: one big step on its own. Move a fixed share of
      // the path, whatever size this browser reports a notch as.
      const notch =
        e.deltaMode !== 0 ||
        (dx === 0 && Math.abs(dy) >= 50 && Number.isInteger(dy) && sinceLast > 40);
      if (notch) {
        view.movePath(scroll * Math.sign(dy) * input.wheelStep);
        axis = null;
        return;
      }

      // A trackpad swipe: many small deltas, then a momentum tail. Pick the
      // main direction once per swipe, so a mostly-vertical swipe never turns.
      if (sinceLast > input.gestureGap) {
        axis = null;
        travelled = 0;
        travelledX = 0;
      }
      if (!axis) {
        travelled += Math.abs(dx) + Math.abs(dy);
        travelledX += Math.abs(dx);
        if (travelled < input.axisDeadZone) return;
        axis = travelledX * 2 > travelled ? "turn" : "path";
      }
      const most = input.trackpadMaxDelta;
      if (axis === "path") {
        view.movePath(scroll * clamp(dy, -most, most) * input.trackpadPath);
      } else {
        const turn = input.invertTurn ? -1 : 1;
        view.turn(turn * clamp(dx, -most, most) * input.trackpadTurn);
      }
    };

    // Trackpad pinch in Safari arrives as gesture events instead.
    let lastScale = 1;
    const gestureStart = (e: GestureLike) => {
      if (!overScene(e)) return;
      e.preventDefault();
      lastScale = e.scale ?? 1;
    };
    const gestureChange = (e: GestureLike) => {
      if (!overScene(e)) return;
      e.preventDefault();
      const scale = e.scale ?? 1;
      if (scale > 0 && lastScale > 0) {
        view.movePath(-Math.log(scale / lastScale) * input.gesturePath);
      }
      lastScale = scale;
    };
    const gestureEnd = (e: GestureLike) => {
      if (overScene(e)) e.preventDefault();
    };

    // ---- Fingers and mouse on the canvas ----------------------------------
    const touches = new Map<number, Touch>();
    // Two fingers on empty snow: pinch moves along the path.
    let pair: [number, number] | null = null;
    let lastGap = 0;
    // One finger (or the mouse) on empty snow: turn, and up/down moves along the path.
    let dragging: number | null = null;
    let flickPath = 0;
    let flickYaw = 0;

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
      // claim the finger first. Claimed fingers never move the camera.
      const free = [...touches.keys()].filter((id) => !snowPointers.claimed.has(id));
      const freeFingers = free.filter((id) => !touches.get(id)?.mouse);

      if (!pair && freeFingers.length >= 2) {
        pair = [freeFingers[0], freeFingers[1]];
        snowPointers.pinching = true;
        dragging = null;
        lastGap = 0;
      }

      if (pair) {
        const a = touches.get(pair[0]);
        const b = touches.get(pair[1]);
        if (!a || !b) return endPinch();
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        // Fingers together = rise, the same as a trackpad pinch.
        if (lastGap > 0 && gap > 0) {
          view.movePath(Math.log(lastGap / gap) * input.touchPinchPath);
        }
        lastGap = gap;
        return;
      }

      if (snowPointers.lookOff || free.length !== 1 || free[0] !== e.pointerId) return;
      // Dragging right turns the scene to the right; dragging down rises
      // toward the high view.
      const yaw = -dx * input.dragTurn;
      const path = dy * input.dragPath;
      view.turn(yaw);
      view.movePath(path);
      dragging = e.pointerId;
      flickYaw = flickYaw * 0.6 + (yaw / seconds) * 0.4;
      flickPath = flickPath * 0.6 + (path / seconds) * 0.4;
    };

    const up = (e: PointerEvent) => {
      const touch = touches.get(e.pointerId);
      if (dragging === e.pointerId && touch) {
        // Coast on only if the finger was still moving when it lifted.
        if (e.timeStamp - touch.time <= 90) view.flick(flickPath, flickYaw);
        dragging = null;
      }
      flickPath = 0;
      flickYaw = 0;
      touches.delete(e.pointerId);
      snowPointers.claimed.delete(e.pointerId);
      if (pair && pair.includes(e.pointerId)) endPinch();
    };

    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("gesturestart", gestureStart, { passive: false });
    window.addEventListener("gesturechange", gestureChange, { passive: false });
    window.addEventListener("gestureend", gestureEnd, { passive: false });
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("gesturestart", gestureStart);
      window.removeEventListener("gesturechange", gestureChange);
      window.removeEventListener("gestureend", gestureEnd);
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      snowView.reset = () => {};
      snowView.state = undefined;
      endPinch();
    };
  }, [canvas, view]);

  useFrame((state, delta) => {
    view.setAspect(state.size.width / Math.max(state.size.height, 1));
    view.update(Math.min(delta, 0.1));
    view.apply(state.camera, state.clock.elapsedTime);
  });

  return null;
}
