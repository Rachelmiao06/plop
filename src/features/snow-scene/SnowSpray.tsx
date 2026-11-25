"use client";

import { useContext, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Points,
  ShaderMaterial,
} from "three";
import { content } from "./content";
import { sharedUniforms } from "./sharedUniforms";
import { SnowContext } from "./snowContext";
import type { Kick } from "./snowField";

// Snow thrown up when the snow is pressed or hit: soft puffs of dust, and a
// few small clumps that arc and settle. It listens to the snow itself, so
// anything that presses or craters the snow gets this for free.

const TAU = Math.PI * 2;

class SpraySim {
  readonly dust: Points;
  readonly clumps: InstancedMesh;

  private readonly s = content.spray;
  // Dust: position, speed, and life left (1 = just thrown, 0 = gone).
  private readonly dustPos = new Float32Array(this.s.dustCount * 3);
  private readonly dustVel = new Float32Array(this.s.dustCount * 3);
  private readonly dustLife = new Float32Array(this.s.dustCount);
  private readonly dustSize = new Float32Array(this.s.dustCount);
  private dustNext = 0;
  private dustOwed = 0;
  // Clumps: position, speed, size, and state (0 gone, 1 flying, below 0 settling).
  private readonly clumpPos = new Float32Array(this.s.clumpCount * 3);
  private readonly clumpVel = new Float32Array(this.s.clumpCount * 3);
  private readonly clumpSize = new Float32Array(this.s.clumpCount);
  private readonly clumpState = new Float32Array(this.s.clumpCount);
  private clumpNext = 0;
  private clumpsOwed = 0;
  private readonly matrix = new Matrix4();

  constructor() {
    const s = this.s;

    const geometry = new BufferGeometry();
    const position = new BufferAttribute(this.dustPos, 3);
    const life = new BufferAttribute(this.dustLife, 1);
    const size = new BufferAttribute(this.dustSize, 1);
    position.setUsage(DynamicDrawUsage);
    life.setUsage(DynamicDrawUsage);
    geometry.setAttribute("position", position);
    geometry.setAttribute("aLife", life);
    geometry.setAttribute("aSize", size);

    this.dust = new Points(
      geometry,
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPixelsPerUnit: sharedUniforms.uPixelsPerUnit,
          uColor: { value: new Color(content.colors.snowDust) },
          uOpacity: { value: s.dustOpacity },
        },
        vertexShader: /* glsl */ `
          uniform float uPixelsPerUnit;
          uniform float uOpacity;
          attribute float aLife;
          attribute float aSize;
          varying float vAlpha;
          void main() {
            vec4 mv = viewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            // A puff swells as it thins out.
            gl_PointSize = aSize * (1.8 - aLife) * uPixelsPerUnit / -mv.z;
            vAlpha = uOpacity * aLife * smoothstep(1.0, 0.85, aLife) * step(0.001, aLife);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor, a);
            #include <colorspace_fragment>
          }
        `,
      }),
    );
    this.dust.frustumCulled = false;
    this.dust.raycast = () => {};

    this.clumps = new InstancedMesh(
      new IcosahedronGeometry(1, 0),
      new MeshStandardMaterial({ color: content.colors.snow, roughness: 0.9 }),
      s.clumpCount,
    );
    this.clumps.instanceMatrix.setUsage(DynamicDrawUsage);
    this.clumps.frustumCulled = false;
    this.clumps.raycast = () => {};
    this.matrix.makeScale(0, 0, 0);
    for (let i = 0; i < s.clumpCount; i++) this.clumps.setMatrixAt(i, this.matrix);
  }

  throwFrom(kick: Kick): void {
    const s = this.s;
    const speed = Math.hypot(kick.velocityX, kick.velocityZ);
    const share = kick.burst
      ? s.burstBoost
      : s.stillShare + (1 - s.stillShare) * Math.min(speed / s.fullSpeed, 1);

    this.dustOwed += kick.volume * s.dustPerVolume * share;
    this.clumpsOwed += kick.volume * s.clumpsPerVolume * share;
    const dust = Math.min(Math.floor(this.dustOwed), s.maxPerKick);
    const clumps = Math.min(Math.floor(this.clumpsOwed), s.maxPerKick / 4);
    this.dustOwed = Math.min(this.dustOwed - dust, 1);
    this.clumpsOwed = Math.min(this.clumpsOwed - clumps, 1);

    const heading = Math.atan2(kick.velocityZ, kick.velocityX);
    for (let n = 0; n < dust + clumps; n++) {
      // A crater throws all round; a moving press throws ahead and to the sides.
      const angle =
        kick.burst || speed < 0.05
          ? Math.random() * TAU
          : heading + (Math.random() - 0.5) * Math.PI * 1.2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const px = kick.x + cos * kick.radius * (0.7 + Math.random() * 0.4);
      const pz = kick.z + sin * kick.radius * (0.7 + Math.random() * 0.4);
      const out =
        (kick.burst ? s.burstSpeed : 0.35 + speed * 0.3) *
        (0.35 + Math.random() * 0.65);

      if (n < dust) {
        const i = this.dustNext;
        this.dustNext = (i + 1) % s.dustCount;
        this.dustPos[i * 3] = px;
        this.dustPos[i * 3 + 1] = kick.y + 0.03;
        this.dustPos[i * 3 + 2] = pz;
        this.dustVel[i * 3] = cos * out * 0.6;
        this.dustVel[i * 3 + 1] =
          s.dustRise * (0.4 + Math.random() * 0.8) * (kick.burst ? 1.6 : 1);
        this.dustVel[i * 3 + 2] = sin * out * 0.6;
        this.dustLife[i] = 1;
        this.dustSize[i] = s.dustSize * (0.6 + Math.random() * 0.9);
      } else {
        const i = this.clumpNext;
        this.clumpNext = (i + 1) % s.clumpCount;
        this.clumpPos[i * 3] = px;
        this.clumpPos[i * 3 + 1] = kick.y + 0.04;
        this.clumpPos[i * 3 + 2] = pz;
        this.clumpVel[i * 3] = cos * out;
        this.clumpVel[i * 3 + 1] =
          s.clumpRise * (0.5 + Math.random() * 0.6) * (kick.burst ? 1.35 : 1);
        this.clumpVel[i * 3 + 2] = sin * out;
        this.clumpSize[i] = s.clumpSize * (0.5 + Math.random());
        this.clumpState[i] = 1;
      }
    }
  }

  update(seconds: number, heightAt: (x: number, z: number) => number): void {
    const s = this.s;
    const { dustPos, dustVel, dustLife, clumpPos, clumpVel, clumpState } = this;

    const slow = Math.exp(-s.dustDrag * seconds);
    let dustAlive = false;
    for (let i = 0; i < s.dustCount; i++) {
      if (dustLife[i] <= 0) continue;
      dustAlive = true;
      dustLife[i] = Math.max(dustLife[i] - seconds / s.dustLife, 0);
      dustVel[i * 3] *= slow;
      dustVel[i * 3 + 1] = dustVel[i * 3 + 1] * slow - s.dustGravity * seconds;
      dustVel[i * 3 + 2] *= slow;
      dustPos[i * 3] += dustVel[i * 3] * seconds;
      dustPos[i * 3 + 1] += dustVel[i * 3 + 1] * seconds;
      dustPos[i * 3 + 2] += dustVel[i * 3 + 2] * seconds;
    }
    if (dustAlive || this.dust.visible) {
      this.dust.geometry.getAttribute("position").needsUpdate = true;
      this.dust.geometry.getAttribute("aLife").needsUpdate = true;
      this.dust.geometry.getAttribute("aSize").needsUpdate = true;
    }
    this.dust.visible = dustAlive;

    let clumpsAlive = false;
    for (let i = 0; i < s.clumpCount; i++) {
      const state = clumpState[i];
      if (state === 0) continue;
      clumpsAlive = true;
      let scale = this.clumpSize[i];
      if (state > 0) {
        clumpVel[i * 3 + 1] -= s.clumpGravity * seconds;
        clumpPos[i * 3] += clumpVel[i * 3] * seconds;
        clumpPos[i * 3 + 1] += clumpVel[i * 3 + 1] * seconds;
        clumpPos[i * 3 + 2] += clumpVel[i * 3 + 2] * seconds;
        const ground = heightAt(clumpPos[i * 3], clumpPos[i * 3 + 2]);
        if (clumpVel[i * 3 + 1] < 0 && clumpPos[i * 3 + 1] <= ground + scale * 0.5) {
          // Landed: sit on the snow, then melt into it.
          clumpPos[i * 3 + 1] = ground + scale * 0.5;
          clumpState[i] = -1;
        }
      } else {
        const left = state + seconds / s.clumpSettle;
        clumpState[i] = left >= 0 ? 0 : left;
        scale *= Math.min(-clumpState[i] * 2, 1);
      }
      this.matrix.makeScale(scale, scale, scale);
      this.matrix.setPosition(clumpPos[i * 3], clumpPos[i * 3 + 1], clumpPos[i * 3 + 2]);
      this.clumps.setMatrixAt(i, this.matrix);
    }
    if (clumpsAlive || this.clumps.visible) {
      this.clumps.instanceMatrix.needsUpdate = true;
    }
    this.clumps.visible = clumpsAlive;
  }

  dispose(): void {
    this.dust.geometry.dispose();
    (this.dust.material as ShaderMaterial).dispose();
    this.clumps.geometry.dispose();
    (this.clumps.material as MeshStandardMaterial).dispose();
  }
}

export function SnowSpray() {
  const field = useContext(SnowContext);
  if (!field) throw new Error("SnowSpray must be inside the snow scene");
  const sim = useMemo(() => new SpraySim(), []);

  useEffect(() => () => sim.dispose(), [sim]);

  useFrame((_, delta) => {
    for (const kick of field.takeKicks()) sim.throwFrom(kick);
    sim.update(Math.min(delta, 0.05), field.heightAt);
  });

  return (
    <>
      <primitive object={sim.dust} />
      <primitive object={sim.clumps} />
    </>
  );
}
