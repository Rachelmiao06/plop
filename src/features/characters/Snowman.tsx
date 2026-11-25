"use client";

// Animation runs imperatively: springs and Three.js objects are mutated every frame
// inside useFrame and the handle, which is how React Three Fiber is meant to be used.
/* eslint-disable react-hooks/immutability */

import { RoundedBox, useTexture } from "@react-three/drei";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";

import {
  FACES,
  faceTexture,
  motion,
  shape,
  springs,
  variants,
  type FaceName,
  type SnowmanVariant,
} from "./content";
import { useSnowmanMaterials } from "./materials";
import { Beanie, BucketHat, Ink, ScarfEnd } from "./parts";
import { Spring, type SpringSettings } from "./spring";

/** States that last as long as you hold them (set by props or by the handle). */
export type SnowmanHeldState = "idle" | "pressed" | "charging";
/** One-shot moments: they play, then the snowman goes back to its held state. */
export type SnowmanAction = "launched" | "hit" | "dizzy" | "laugh";

export type SnowmanHandle = {
  /** The snowman's root group, for positions and raycasting. */
  object: THREE.Group | null;
  press: () => void;
  release: () => void;
  /** Enter charging with an amount from 0 to 1 (call every frame or on change). */
  charge: (amount: number) => void;
  launch: () => void;
  /** strength 0..1. side -1 or 1 picks which way it gets knocked (random if left out). */
  hit: (strength: number, side?: number) => void;
  dizzy: () => void;
  laugh: () => void;
};

export type SnowmanProps = Omit<ThreeElements["group"], "ref" | "children"> & {
  variant: SnowmanVariant;
  /** Turn around the vertical axis, in radians. 0 faces +Z (toward the default camera). */
  facing?: number;
  state?: SnowmanHeldState;
  /** 0..1, only used while state is "charging". */
  charge?: number;
  /** Called when a one-shot action finishes. */
  onActionEnd?: (action: SnowmanAction) => void;
  /** 1 = normal speed. Lower for slow motion, 0 to freeze (for a hit-stop on big impacts). */
  timeScale?: number;
};

type ActiveAction = { kind: SnowmanAction; t: number; duration: number; strength: number; side: number };

const ZERO3 = [0, 0, 0] as const;

/** Small repeatable random numbers for blink gaps and hit sides (no Math.random during render). */
function nextRandom(sim: { seed: number }) {
  sim.seed = (sim.seed * 16807) % 2147483647;
  return sim.seed / 2147483647;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const Snowman = forwardRef<SnowmanHandle, SnowmanProps>(function Snowman(
  { variant, facing = 0, state = "idle", charge = 0, onActionEnd, timeScale = 1, ...groupProps },
  ref,
) {
  const look = variants[variant];
  const mats = useSnowmanMaterials();
  const textures = useTexture(FACES.map(faceTexture), (loaded) => {
    for (const tex of loaded) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
    }
  });
  const faceMaps = useMemo(
    () => Object.fromEntries(FACES.map((name, i) => [name, textures[i]])) as Record<FaceName, THREE.Texture>,
    [textures],
  );

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: mats.faceColour,
        map: faceMaps.calm,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        toneMapped: false,
      }),
    [mats.faceColour, faceMaps],
  );

  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const neck = useRef<THREE.Group>(null);
  const hat = useRef<THREE.Group>(null);
  const ends = useRef<(THREE.Group | null)[]>([]);

  // Held state can come from props or from the handle; the latest one wins.
  const held = useRef({ state, charge });
  useEffect(() => {
    held.current = { state, charge };
  }, [state, charge]);
  const speed = useRef(timeScale);
  useEffect(() => {
    speed.current = timeScale;
  }, [timeScale]);

  const action = useRef<ActiveAction | null>(null);
  const onEnd = useRef(onActionEnd);
  useEffect(() => {
    onEnd.current = onActionEnd;
  }, [onActionEnd]);

  const sim = useMemo(
    () => ({
      // Each variant breathes and blinks on its own rhythm, so the two are never in sync.
      phase: look.lean > 0 ? 0 : 3.7,
      seed: look.lean > 0 ? 17 : 91,
      time: 0,
      squash: new Spring(1),
      tiltX: new Spring(),
      tiltZ: new Spring(),
      lunge: new Spring(),
      hop: new Spring(),
      headX: new Spring(),
      headZ: new Spring(),
      headOff: [new Spring(), new Spring(), new Spring()],
      headSquash: new Spring(1),
      hatOff: [new Spring(), new Spring(), new Spring()],
      hatRot: [new Spring(), new Spring(), new Spring()],
      scarfX: new Spring(),
      scarfZ: new Spring(),
      prevTiltX: 0,
      prevTiltZ: 0,
      blinkIn: look.lean > 0 ? 2.4 : 3.6,
      blinkLeft: 0,
      face: "calm" as FaceName,
    }),
    [look.lean],
  );

  useImperativeHandle(
    ref,
    () => {
      const start = (kind: SnowmanAction, duration: number, strength = 1, side = 1) => {
        action.current = { kind, t: 0, duration, strength, side };
      };
      return {
        get object() {
          return root.current;
        },
        press: () => {
          held.current = { state: "pressed", charge: 0 };
          sim.squash.velocity -= 3;
        },
        release: () => {
          held.current = { state: "idle", charge: 0 };
        },
        charge: (amount: number) => {
          held.current = { state: "charging", charge: clamp01(amount) };
        },
        launch: () => {
          held.current = { state: "idle", charge: 0 };
          start("launched", motion.launched.duration);
          sim.tiltX.velocity += motion.launched.kick;
          sim.squash.velocity += 4;
        },
        hit: (strength: number, side?: number) => {
          const s = clamp01(strength);
          held.current = { state: "idle", charge: 0 };
          const m = motion.hit;
          start("hit", m.apart * (0.5 + s * 0.5) + m.settle, s, side ?? (nextRandom(sim) < 0.5 ? -1 : 1));
          sim.squash.velocity -= m.squashKick * s;
          sim.headSquash.velocity -= 5 * s;
        },
        dizzy: () => start("dizzy", motion.dizzy.duration),
        laugh: () => start("laugh", motion.laugh.duration),
      };
    },
    [sim],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20) * speed.current;
    if (dt <= 0) return;
    sim.time += dt;
    const t = sim.time + sim.phase;
    const { state: heldState, charge: amount } = held.current;

    // ----- targets from the held state -----
    let squashT = 1;
    let tiltXT = 0;
    let tiltZT = 0;
    let lungeT = 0;
    let hopT = 0;
    let headXT = 0;
    let headZT = 0;
    let headOffT: readonly number[] = ZERO3;
    let hatOffT: readonly number[] = ZERO3;
    let hatRotT: readonly number[] = ZERO3;
    let face: FaceName = "calm";
    let addTiltZ = 0;
    let addHeadX = 0;
    let addHeadZ = 0;
    let addSquash = 0;
    let bodySpring: SpringSettings = springs.tilt;
    let headSpring: SpringSettings = springs.head;
    let hatSpring: SpringSettings = springs.hat;

    if (heldState === "pressed") {
      squashT = motion.pressed.squash;
      face = "surprised";
    } else if (heldState === "charging") {
      const c = motion.charging;
      const a = clamp01(amount);
      squashT = 1 - c.squash * a;
      tiltXT = -c.lean * a;
      face = a > 0.04 ? "straining" : "surprised";
      addTiltZ += Math.sin(t * c.wobbleSpeed) * c.wobble * a * a;
      if (a > 0.97) addTiltZ += Math.sin(t * c.trembleSpeed) * c.tremble;
    }

    // ----- one-shot actions override the held state -----
    const act = action.current;
    if (act) {
      act.t += dt;
      const { kind, strength: s, side } = act;
      if (kind === "launched") {
        const m = motion.launched;
        face = "happy";
        if (act.t < m.snap) {
          lungeT = m.lunge;
          tiltXT = m.lean;
          squashT = m.stretch;
        }
      } else if (kind === "hit") {
        const m = motion.hit;
        const apart = m.apart * (0.5 + s * 0.5);
        if (act.t < apart) {
          face = "surprised";
          squashT = 1 - m.squash * s;
          tiltXT = -m.knockBack * s;
          tiltZT = side * 0.25 * s;
          if (s >= m.headPopAt) {
            headOffT = [m.headPop[0] * side * s, m.headPop[1] * s, m.headPop[2] * s];
            headXT = -m.headPopTilt * s;
            headZT = side * m.headPopTilt * 0.8 * s;
          } else {
            headXT = -m.headTip * s;
            headZT = side * m.headTip * 0.7 * s;
          }
          if (s >= m.hatFlyAt) {
            hatOffT = [m.hatFly[0] * side * s, m.hatFly[1] * s, m.hatFly[2] * s];
            hatRotT = [m.hatSpin[0] * s, m.hatSpin[1] * s, m.hatSpin[2] * side * s];
          }
        } else {
          // Back together, with an extra springy bounce.
          bodySpring = springs.reassemble;
          headSpring = springs.reassemble;
          hatSpring = springs.reassemble;
          face = act.t < apart + 0.35 ? "surprised" : "calm";
        }
      } else if (kind === "dizzy") {
        const m = motion.dizzy;
        const fade = clamp01((act.duration - act.t) / 0.5);
        face = "dizzy";
        addHeadX += Math.sin(t * m.speed) * m.headCircle * fade;
        addHeadZ += Math.cos(t * m.speed) * m.headCircle * fade;
        addTiltZ += Math.sin(t * m.speed * 0.5) * m.sway * fade;
      } else if (kind === "laugh") {
        const m = motion.laugh;
        const fade = clamp01((act.duration - act.t) / 0.4);
        face = "laugh";
        addSquash += Math.sin(t * m.bounceSpeed) * m.bounce * fade;
        hopT = Math.abs(Math.sin(t * m.hopSpeed)) * m.hop * fade;
        tiltXT = -m.lean * fade;
      }

      if (act.t >= act.duration) {
        action.current = null;
        if (kind === "hit" && act.strength >= motion.hit.dizzyAt) {
          action.current = { kind: "dizzy", t: 0, duration: motion.dizzy.duration, strength: 1, side: 1 };
        }
        onEnd.current?.(kind);
      }
    }

    // ----- idle life: breathing and a slight wobble, always on underneath -----
    const idle = motion.idle;
    addSquash += Math.sin(t * idle.breathSpeed) * idle.breathAmount;
    addTiltZ += Math.sin(t * idle.wobbleSpeed) * idle.wobble * look.lean;

    // ----- step the springs -----
    const sy = sim.squash.step(squashT, springs.squash, dt) + addSquash;
    const tiltX = sim.tiltX.step(tiltXT, bodySpring, dt);
    const tiltZ = sim.tiltZ.step(tiltZT, bodySpring, dt) + addTiltZ;
    const lunge = sim.lunge.step(lungeT, springs.lunge, dt);
    const hop = sim.hop.step(hopT, springs.lunge, dt);

    const body = rig.current;
    if (body) {
      // Squash and stretch keep the volume: taller means thinner.
      const sxz = 1 / Math.sqrt(Math.max(0.3, sy));
      body.scale.set(sxz, sy, sxz);
      body.rotation.set(tiltX, 0, tiltZ);
      body.position.set(0, hop, lunge);
    }

    const head = neck.current;
    if (head) {
      head.rotation.set(
        sim.headX.step(headXT, headSpring, dt) + addHeadX,
        0,
        sim.headZ.step(headZT, headSpring, dt) + addHeadZ + shape.head.tilt * look.lean,
      );
      head.position.set(
        shape.head.offsetX * look.lean + sim.headOff[0].step(headOffT[0], headSpring, dt),
        shape.head.y + sim.headOff[1].step(headOffT[1], headSpring, dt),
        sim.headOff[2].step(headOffT[2], headSpring, dt),
      );
      const hs = sim.headSquash.step(1, springs.headSquash, dt);
      const hxz = 1 / Math.sqrt(Math.max(0.3, hs));
      head.scale.set(hxz, hs, hxz);
    }

    // ----- secondary motion: hat and scarf lag behind quick moves -----
    const vX = (tiltX - sim.prevTiltX) / Math.max(dt, 1e-4);
    const vZ = (tiltZ - sim.prevTiltZ) / Math.max(dt, 1e-4);
    sim.prevTiltX = tiltX;
    sim.prevTiltZ = tiltZ;
    const sec = motion.secondary;

    const hatNode = hat.current;
    if (hatNode) {
      hatNode.position.set(
        sim.hatOff[0].step(hatOffT[0], hatSpring, dt),
        shape.head.radius + sim.hatOff[1].step(hatOffT[1], hatSpring, dt),
        sim.hatOff[2].step(hatOffT[2], hatSpring, dt),
      );
      hatNode.rotation.set(
        sim.hatRot[0].step(hatRotT[0] - vX * sec.hatLag, hatSpring, dt),
        sim.hatRot[1].step(hatRotT[1], hatSpring, dt),
        sim.hatRot[2].step(hatRotT[2] - vZ * sec.hatLag, hatSpring, dt),
      );
    }

    const swingX = sim.scarfX.step(-tiltX * sec.scarfGravity - vX * sec.scarfLag, springs.scarf, dt);
    const swingZ = sim.scarfZ.step(-tiltZ * sec.scarfGravity - vZ * sec.scarfLag, springs.scarf, dt);
    ends.current.forEach((end, i) => {
      if (!end) return;
      const { out, swing } = look.ends[i];
      end.rotation.set(Math.min(0.9, Math.max(-1.4, out + swingX)), 0, swing + swingZ);
    });

    // ----- face, with an occasional blink while calm -----
    if (face === "calm") {
      sim.blinkIn -= dt;
      if (sim.blinkIn <= 0) {
        sim.blinkLeft = motion.blink.length;
        sim.blinkIn = motion.blink.minGap + nextRandom(sim) * (motion.blink.maxGap - motion.blink.minGap);
      }
      if (sim.blinkLeft > 0) {
        sim.blinkLeft -= dt;
        face = "happy";
      }
    }
    if (face !== sim.face) {
      sim.face = face;
      faceMaterial.map = faceMaps[face];
    }
  });

  const r = shape.head.radius;
  const f = shape.face;
  const scarfMat = mats[look.scarfToken];

  return (
    <group ref={root} rotation={[0, facing, 0]} {...groupProps}>
      <group ref={rig}>
        <group position={[0, -shape.sink, 0]}>
          {shape.feet.map((foot) => (
            <mesh
              key={foot.x}
              position={[foot.x * (look.lean > 0 ? 1 : -1), foot.radius * 0.85, foot.z]}
              scale={[1, 0.85, 1.05]}
              material={mats.snow}
              castShadow
            >
              <sphereGeometry args={[foot.radius, 24, 16]} />
              <Ink colour={mats.outlineColour} />
            </mesh>
          ))}
          <mesh
            position={[0, shape.body.radius * shape.body.scale[1], 0]}
            scale={shape.body.scale}
            material={mats.snow}
            castShadow
          >
            <sphereGeometry args={[shape.body.radius, 40, 28]} />
            <Ink colour={mats.outlineColour} />
          </mesh>
        </group>

        {/* Scarf ring around the neck, slightly crooked, plus the knot and hanging ends. */}
        <group position={[0, shape.neckY, 0]} rotation={[0.04, 0, shape.scarf.tilt * look.lean]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, shape.scarf.height]} material={scarfMat} castShadow>
            <torusGeometry args={[shape.scarf.ringRadius, shape.scarf.tube, 14, 44]} />
            <Ink colour={mats.outlineColour} />
          </mesh>
          {look.knot && (
            <RoundedBox
              args={[0.1, 0.1, 0.06]}
              radius={0.022}
              smoothness={3}
              position={[0, -0.01, shape.scarf.ringRadius + shape.scarf.tube * 0.85]}
              material={scarfMat}
            >
              <Ink colour={mats.outlineColour} />
            </RoundedBox>
          )}
          {look.ends.map((end, i) => (
            <ScarfEnd
              key={i}
              ref={(node) => {
                ends.current[i] = node;
              }}
              mats={mats}
              material={scarfMat}
              length={end.length}
              position={[end.x, end.y, shape.scarf.ringRadius + shape.scarf.tube * 0.9]}
            />
          ))}
        </group>

        {/* Head pivots at its own centre so it can tip, wobble and pop off. */}
        <group ref={neck} position={[0, shape.head.y, 0]}>
          <mesh material={mats.snow} castShadow>
            <sphereGeometry args={[r, 40, 28]} />
            <Ink colour={mats.outlineColour} />
          </mesh>
          {/* The face: a thin patch of sphere just above the head's front surface. */}
          <mesh material={faceMaterial} renderOrder={2}>
            <sphereGeometry
              args={[r * 1.004, 24, 24, Math.PI / 2 - f.width / 2, f.width, Math.PI / 2 + f.drop - f.height / 2, f.height]}
            />
          </mesh>
          {/* The hat pivots on the top of the head, so it flips and spins from there. */}
          <group ref={hat} position={[0, r, 0]}>
            <group position={[0, -r, 0]}>
              {look.hat === "bucket" ? <BucketHatOnHead mats={mats} /> : <Beanie mats={mats} />}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

/** The bucket's position in content.ts is measured from the snow; move it into head space. */
function BucketHatOnHead({ mats }: { mats: ReturnType<typeof useSnowmanMaterials> }) {
  return (
    <group position={[0, -shape.head.y, 0]}>
      <BucketHat mats={mats} />
    </group>
  );
}
