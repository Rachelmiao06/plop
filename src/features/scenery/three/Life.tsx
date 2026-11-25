"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { Color, DoubleSide, type Mesh, MeshBasicMaterial, PlaneGeometry, ShaderMaterial, SRGBColorSpace, type Texture } from "three";

import { useSnow } from "@/features/snow-scene";

import { propPx, propSettings, propSrc, village } from "../content";
import { fitPoint, type GameLane, type VillageProp } from "../village";
import { useReducedMotion } from "./motion";

/**
 * Chimney smoke: Rachel's smoke-puff doodle rising slowly from each cottage's chimney, two puffs half a loop
 * apart, growing and fading. A flat doodle that faces the camera; it holds still (half risen) for reduced motion.
 */
export function ChimneySmoke({ placed }: { placed: (VillageProp & { baseY: number })[] }) {
  const tex = useTexture(propSrc("chimney-smoke"), (loaded) => {
    const t = loaded as Texture;
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
  }) as Texture;
  const reduced = useReducedMotion();
  const s = village.smoke;

  const chimneys = useMemo(
    () =>
      placed.flatMap((p) => {
        const share = village.chimneys[p.id];
        if (share === undefined) return [];
        const along = (share - 0.5) * p.width * (p.flip ? -1 : 1);
        return [{ key: p.key, x: p.x + along, y: p.baseY + p.height * 0.97, z: p.z - 0.02, scale: p.scale }];
      }),
    [placed],
  );

  const h = propSettings("chimney-smoke")!.height;
  const px = propPx("chimney-smoke");
  const w = px ? (h * px.w) / px.h : h;
  const plane = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    // Origin at the bottom-left puff, so it grows up and away from the chimney.
    g.translate(0.35, 0.5, 0);
    return g;
  }, []);
  const puffs = useMemo(
    () =>
      chimneys.flatMap((c) =>
        [0, 0.5].map((offset) => ({
          ...c,
          offset,
          material: new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide }),
        })),
      ),
    [chimneys, tex],
  );
  const refs = useRef<(Mesh | null)[]>([]);
  useEffect(
    () => () => {
      plane.dispose();
      for (const p of puffs) p.material.dispose();
    },
    [plane, puffs],
  );

  useFrame(({ camera, clock }) => {
    puffs.forEach((p, i) => {
      const mesh = refs.current[i];
      if (!mesh) return;
      const u = reduced ? (p.offset === 0 ? 0.45 : -1) : (clock.elapsedTime / s.period + p.offset + p.x * 0.13) % 1;
      mesh.visible = u >= 0;
      if (u < 0) return;
      const k = (1 + s.grow * u) * p.scale * 0.55;
      mesh.position.set(p.x + u * s.rise * 0.25, p.y + u * s.rise, p.z);
      mesh.scale.set(w * k, h * k, 1);
      mesh.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
      // In softly, out slowly.
      p.material.opacity = s.opacity * Math.min(u / 0.2, 1) * (1 - Math.max((u - 0.45) / 0.55, 0));
    });
  });

  return (
    <>
      {puffs.map((p, i) => (
        <mesh
          key={`${p.key}-${p.offset}`}
          ref={(m) => {
            refs.current[i] = m;
          }}
          geometry={plane}
          material={p.material}
          raycast={() => null}
        />
      ))}
    </>
  );
}

/**
 * A few faint footprints and tracks pressed into the snow once at start (`village.tracks`), through the
 * snow scene's own pressGroove, so they shade, fill with fresh snow and take grooves like any dent.
 */
export function Tracks({ lane }: { lane: GameLane }) {
  const snow = useSnow();
  useEffect(() => {
    const t = village.tracks;
    for (const walk of t.walks) {
      const [x0, z0] = fitPoint(walk.from[0], walk.from[1], lane);
      const [x1, z1] = fitPoint(walk.to[0], walk.to[1], lane);
      const length = Math.hypot(x1 - x0, z1 - z0);
      const dx = (x1 - x0) / length;
      const dz = (z1 - z0) / length;
      // Across the walk (left and right feet, the two sled runners).
      const sx = -dz;
      const sz = dx;
      if (walk.kind === "sled") {
        for (let d = 0; d <= length; d += t.footRadius) {
          for (const side of [-1, 1]) {
            snow.pressGroove(x0 + dx * d + sx * side * 0.16, z0 + dz * d + sz * side * 0.16, t.footRadius * 0.7, { dig: t.depth });
          }
        }
        continue;
      }
      const step = walk.kind === "hops" ? t.step * 1.5 : t.step;
      let n = 0;
      for (let d = 0; d <= length; d += step, n++) {
        if (walk.kind === "hops") {
          // Rabbit: two small prints side by side, then a gap.
          for (const side of [-1, 1]) {
            snow.pressGroove(x0 + dx * d + sx * side * 0.05, z0 + dz * d + sz * side * 0.05, t.footRadius * 0.6, { dig: t.depth });
          }
        } else {
          const side = n % 2 === 0 ? -1 : 1;
          // A boot print: two touching presses along the walk.
          for (const along of [-0.04, 0.04]) {
            snow.pressGroove(
              x0 + dx * (d + along) + sx * side * 0.09,
              z0 + dz * (d + along) + sz * side * 0.09,
              t.footRadius,
              { dig: t.depth },
            );
          }
        }
      }
    }
  }, [snow, lane]);
  return null;
}

/**
 * The street lamp's warm light: a soft halo round its glass and a warm patch on the snow below, both in the
 * `--butter` token. The falloff is laid in a few crayon-like bands with paper grain (never a smooth airbrush
 * gradient), and it breathes very gently (held still for reduced motion). Numbers: `village.lampGlow`.
 */
// Changed every frame (the gentle breathing), so the strengths live outside the component, like the backdrop fade.
const glowStrength = { halo: { value: 0 }, pool: { value: 0 } };

export function LampGlow({ placed }: { placed: (VillageProp & { baseY: number })[] }) {
  const g = village.lampGlow;
  const reduced = useReducedMotion();
  const [butter] = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return [new Color(css.getPropertyValue("--butter").trim() || "#f6d77a")];
  }, []);
  const lamps = useMemo(
    () =>
      placed
        .filter((p) => p.id === "street-lamp")
        .map((p) => ({
          key: p.key,
          x: p.x + (g.head[0] - 0.5) * p.width * (p.flip ? -1 : 1),
          y: p.baseY + p.height * g.head[1],
          z: p.z,
          baseY: p.baseY,
          scale: p.scale,
        })),
    [placed, g.head],
  );
  const { halo, pool, plane, disc } = useMemo(() => {
    const make = (strength: { value: number }, rings: number) =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: DoubleSide,
        uniforms: { uColor: { value: butter }, uStrength: strength, uRings: { value: rings } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uStrength;
          uniform float uRings;
          varying vec2 vUv;
          float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
          void main() {
            vec2 d = vUv - 0.5;
            float a = atan(d.y, d.x);
            // A slightly wobbly, hand-drawn edge, and the falloff laid in a few soft bands.
            float r = length(d) * 2.0 * (1.0 + 0.05 * sin(a * 5.0) + 0.03 * sin(a * 11.0 + 1.3));
            float lit = clamp(1.0 - r, 0.0, 1.0);
            float banded = floor(lit * uRings + 0.65) / uRings;
            float soft = mix(lit, banded, 0.6);
            float grain = 0.85 + 0.3 * hash(floor(vUv * 90.0));
            float alpha = pow(soft, 1.25) * uStrength * grain;
            if (alpha < 0.004) discard;
            gl_FragColor = vec4(uColor, alpha);
            #include <colorspace_fragment>
          }
        `,
      });
    const flat = new PlaneGeometry(1, 1);
    flat.rotateX(-Math.PI / 2);
    return { halo: make(glowStrength.halo, g.bands), pool: make(glowStrength.pool, g.bands), plane: new PlaneGeometry(1, 1), disc: flat };
  }, [butter, g.bands]);
  useEffect(
    () => () => {
      halo.dispose();
      pool.dispose();
      plane.dispose();
      disc.dispose();
    },
    [halo, pool, plane, disc],
  );
  const snow = useSnow();
  const haloRefs = useRef<(Mesh | null)[]>([]);

  useFrame(({ camera, clock }) => {
    const breathe = reduced ? 1 : 1 + g.breathe * Math.sin(clock.elapsedTime * g.breatheSpeed * Math.PI * 2);
    glowStrength.halo.value = g.haloOpacity * breathe;
    glowStrength.pool.value = g.poolOpacity * breathe;
    lamps.forEach((l, i) => {
      const mesh = haloRefs.current[i];
      if (!mesh) return;
      // Face the camera, and sit just behind the lamp, so the drawing stays crisp and the glow shows round it.
      const dx = camera.position.x - l.x;
      const dz = camera.position.z - l.z;
      const len = Math.hypot(dx, dz) || 1;
      mesh.position.set(l.x - (dx / len) * g.haloBehind, l.y, l.z - (dz / len) * g.haloBehind);
      mesh.rotation.y = Math.atan2(dx, dz);
    });
  });

  return (
    <>
      {lamps.map((l, i) => (
        <group key={l.key}>
          <mesh
            ref={(m) => {
              haloRefs.current[i] = m;
            }}
            geometry={plane}
            material={halo}
            scale={[g.haloSize * l.scale, g.haloSize * l.scale, 1]}
            renderOrder={5}
            raycast={() => null}
          />
          <mesh
            geometry={disc}
            material={pool}
            position={[l.x + g.poolOffset[0], snow.heightAt(l.x, l.z) + 0.015, l.z + g.poolOffset[1]]}
            scale={[g.poolSize[0] * l.scale, 1, g.poolSize[1] * l.scale]}
            renderOrder={1}
            raycast={() => null}
          />
        </group>
      ))}
    </>
  );
}
