"use client";

/**
 * A short camera follow: while the ball rolls toward the pins the view eases a little after it, and once
 * the ball meets the pins (or stops) it settles back. Render inside `<SnowScene>`, after the scene's own
 * camera. Draws nothing.
 *
 * WORKAROUND: the snow scene's public camera API (`useSnowCameraView`) only sets the default view and jumps
 * there, which resets the player's turn and path, so it cannot follow smoothly. Instead this slides the
 * camera sideways and forward by a small offset after the scene's camera rig has placed it each frame
 * (same frame order: the rig is mounted before the scene's children). The rig places the camera from
 * scratch every frame, so the offset never builds up. Wanted from snow-scene: an additive, eased look
 * offset, e.g. `nudgeSnowCamera({ x, z })`, applied inside the rig. See the game README.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { FEEL } from "@/features/bowling";
import type { Pins } from "@/features/pins";

import { GAME } from "./content";
import type { GameLink } from "./GameBridge";

export function CameraFollow({ pins, link }: { pins: Pins; link: GameLink }) {
  const s = useRef({ x: 0, z: 0, hit: false, ball: -1 });

  // Settle back once the ball reaches the pins.
  useEffect(
    () =>
      pins.subscribe((e) => {
        if ((e.type === "knocked" && e.down > 0) || e.type === "result") s.current.hit = true;
      }),
    [pins],
  );

  useFrame(({ camera }, delta) => {
    const f = GAME.cameraFollow;
    const st = s.current;
    const bowling = link.get();
    let goalX = 0;
    let goalZ = 0;
    const ball = bowling?.balls.find((b) => b.rolling) ?? null;
    if (ball && ball.id !== st.ball) {
      st.ball = ball.id;
      st.hit = false;
    }
    if (ball && !st.hit) {
      // Follow a share of how far the ball has come from the throwing line, never more than `max`.
      const dx = ball.position.x - bowling!.thrower.x;
      const dz = ball.position.z - FEEL.lane.lineZ;
      const far = Math.hypot(dx, dz);
      const k = far > 0 ? Math.min(f.max, far * f.share) / far : 0;
      goalX = dx * k;
      goalZ = dz * k;
    }
    const rate = ball && !st.hit ? f.easeIn : f.easeBack;
    const u = 1 - Math.exp(-rate * Math.min(delta, 0.1));
    st.x += (goalX - st.x) * u;
    st.z += (goalZ - st.z) * u;
    if (Math.abs(st.x) + Math.abs(st.z) > 1e-4) {
      camera.position.x += st.x;
      camera.position.z += st.z;
    }
  });

  return null;
}
