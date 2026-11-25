"use client";

/**
 * Speed you can see: Rachel's hand-drawn wind curls (`public/assets/effects/wind-curl.webp`) trail a fast
 * rolling ball, one on each side just behind it, turned to point the way it goes on screen. They fade in
 * above `LOOK.speed.from` and are fullest at `LOOK.speed.full`. Flat drawings that face the camera, never lit.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace, type Sprite, SpriteMaterial, Vector3 } from "three";

import type { SnowApi } from "@/features/snow-scene";

import { LOOK } from "../content";
import type { Bowling } from "../simulation";

const SRC = "/assets/effects/wind-curl.webp";
/** The drawing's own proportions (width / height). */
const ASPECT = 323 / 235;
/** One curl on each side of the ball. */
const SIDES = [-1, 1] as const;

export function SpeedLines({ game, snow }: { game: Bowling; snow: SnowApi }) {
  // Drawn in sRGB; without this the doodle shows pale.
  const map = useTexture(SRC, (t) => {
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
  });
  const materials = useMemo(
    () => SIDES.map(() => new SpriteMaterial({ map, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })),
    [map],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  const sprites = useRef<(Sprite | null)[]>([]);
  const scratch = useMemo(() => ({ a: new Vector3(), b: new Vector3() }), []);

  useFrame((state) => {
    const s = LOOK.speed;
    // The fastest rolling ball gets the curls.
    let ball = null;
    for (const b of game.balls) if (b.rolling && (!ball || b.speed > ball.speed)) ball = b;
    const fast = ball ? Math.max(0, Math.min(1, (ball.speed - s.from) / (s.full - s.from))) : 0;

    SIDES.forEach((side, i) => {
      const sprite = sprites.current[i];
      const mat = materials[i];
      if (!sprite) return;
      sprite.visible = fast > 0.01 && !!ball;
      if (!ball || !sprite.visible) return;
      const r = ball.plan.radius;
      const d = ball.plan.direction;
      // Behind the ball and out to its side, at about its middle height.
      const back = r + s.curlBehind;
      const across = r * s.curlOut * side;
      const x = ball.position.x - d.x * back + d.z * across;
      const z = ball.position.z - d.z * back - d.x * across;
      const y = snow.heightAt(x, z) + r * 0.6;
      sprite.position.set(x, y, z);
      const size = s.curlSize * (0.6 + 0.4 * Math.min(1, r / 0.4)) * (0.8 + 0.2 * fast);
      sprite.scale.set(size * ASPECT, size, 1);

      // Point the drawing (its curls lead to the right) the way the ball goes on screen.
      scratch.a.set(ball.position.x, y, ball.position.z).project(state.camera);
      scratch.b.set(ball.position.x + d.x, y, ball.position.z + d.z).project(state.camera);
      const angle = Math.atan2((scratch.b.y - scratch.a.y) * state.size.height, (scratch.b.x - scratch.a.x) * state.size.width);
      mat.rotation = angle;
      // A little hand-drawn flicker so they feel alive, never a steady stamp.
      mat.opacity = s.curlOpacity * fast * (0.85 + 0.15 * Math.sin(state.clock.elapsedTime * 23 + i * 2));
    });
  });

  return (
    <>
      {SIDES.map((side, i) => (
        <sprite
          key={side}
          ref={(sp) => {
            sprites.current[i] = sp;
          }}
          material={materials[i]}
          visible={false}
          renderOrder={3}
        />
      ))}
    </>
  );
}
