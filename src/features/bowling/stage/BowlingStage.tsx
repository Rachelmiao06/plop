"use client";

/**
 * The bowling throw drawn on the real snow. Render inside `<SnowScene>`.
 * Rachel's paper snowman as the thrower, the drawn snowball growing and rolling (with clumps falling
 * off big ones), the aim line, the throwing line, the roll with its groove and dust.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CircleGeometry,
  DoubleSide,
  IcosahedronGeometry,
  type InstancedMesh,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  Raycaster,
  RingGeometry,
  SphereGeometry,
  Vector2,
  Vector3,
} from "three";

import { claimSnowPointer, useSnow, useSnowPoint } from "@/features/snow-scene";
import { unlockAudioOnFirstTouch } from "@/lib/audio";

import { FEEL, LOOK, type ThrowerLook } from "../content";
import { connectFeedback, type Feedback } from "../feedback";
import { createKeyboardInput, type KeyboardInput } from "../keyboard";
import { createPointerInput } from "../pointer";
import { Bowling } from "../simulation";
import { type Vec2, lerp } from "../vec";
import { Clumps } from "./clumps";
import { readPalette } from "./look";
import { ballMaterial, ballOutlineMaterial } from "./snowballLook";
import { ThrowerStandee, type ThrowerHandle } from "./ThrowerStandee";

/** The fixed drawing light the ball's shade side comes from (see LOOK.ball.light). */
const ballLight = new Vector3(...LOOK.ball.light).normalize();

/** Drawing sizes (scene units). Not feel numbers: they only change how marks look. */
const MAX_BALLS = 6;
const AIM = { dots: 80, spacing: 0.22, dotRadius: 0.035 };
const MARK = { lift: 0.012, dashLength: 0.16, dashWidth: 0.035, pinRingRadius: 0.9 };

type Dash = { x: number; z: number; angle: number; length: number };

/** The throwing line and a faint ring where the pins will stand, as pencil dashes. */
function laneDashes(): Dash[] {
  const { lineZ, halfWidth, pinSpot } = FEEL.lane;
  let seed = 11;
  const jitter = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
  const dashes: Dash[] = [];
  const from = -halfWidth - 0.5;
  const to = halfWidth + 0.5;
  const lineAt = lineZ - 0.18; // just in front of the thrower's feet
  for (let x = from; x <= to; x += MARK.dashLength * 1.9) {
    dashes.push({ x, z: lineAt + jitter() * 0.012, angle: jitter() * 0.07, length: MARK.dashLength * (0.85 + 0.3 * Math.abs(jitter())) });
  }
  const around = 2 * Math.PI * MARK.pinRingRadius;
  const count = Math.round(around / (MARK.dashLength * 2.2));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    dashes.push({
      x: pinSpot.x + Math.cos(a) * MARK.pinRingRadius,
      z: pinSpot.z + Math.sin(a) * MARK.pinRingRadius,
      angle: -a + Math.PI / 2 + jitter() * 0.08,
      length: MARK.dashLength * 0.8,
    });
  }
  return dashes;
}

export type BowlingStageProps = {
  /**
   * Who is throwing, as drawn: "one" (bucket snowman) or "two" (red-hat snowman). Applied between
   * throws (it waits if a throw is under way). Leave it out to keep whatever `game.setThrower` set;
   * test pages also take `?thrower=two`.
   */
  thrower?: ThrowerLook;
  /** Called once with the running game, for features that read the balls or events (pins, score). */
  onGame?: (game: Bowling) => void;
};

/** `?thrower=one|two` on the page, for test pages (no prop given). */
function throwerFromPage(): ThrowerLook | undefined {
  if (typeof window === "undefined") return undefined;
  const v = new URLSearchParams(window.location.search).get("thrower");
  return v === "one" || v === "two" ? v : undefined;
}

export function BowlingStage({ thrower, onGame }: BowlingStageProps = {}) {
  const snow = useSnow();
  const snowPoint = useSnowPoint();
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  const [game] = useState(() => new Bowling(FEEL, snow));
  const [palette] = useState(readPalette);
  const looks = useMemo(() => {
    const colors = { paper: palette.css.paper, shade: palette.css["snow-shadow"], ink: palette.css.ink };
    const flatCircle = new CircleGeometry(1, 14);
    flatCircle.rotateX(-Math.PI / 2);
    const flatRing = new RingGeometry(0.86, 1, 40);
    flatRing.rotateX(-Math.PI / 2);
    const flatDash = new PlaneGeometry(1, 1);
    flatDash.rotateX(-Math.PI / 2);
    const ink = (opacity: number) =>
      new MeshBasicMaterial({ color: palette.ink, transparent: true, opacity, depthWrite: false, side: DoubleSide });
    return {
      colors,
      ball: new SphereGeometry(1, 40, 24),
      ballMaterial: ballMaterial(colors, ballLight),
      ballOutline: ballOutlineMaterial(colors),
      clump: new IcosahedronGeometry(1, 1),
      clumpMaterial: ballMaterial(colors, ballLight, { marks: false }),
      clumpOutline: ballOutlineMaterial(colors, LOOK.ball.outline * 0.6),
      flatCircle,
      flatRing,
      flatDash,
      aimInk: ink(0.7),
      markInk: ink(0.45),
    };
  }, [palette]);
  const dashes = useMemo(laneDashes, []);

  const throwerRef = useRef<ThrowerHandle>(null);
  const ballRefs = useRef<(Mesh | null)[]>([]);
  const outlineRefs = useRef<(Mesh | null)[]>([]);
  const clumpRef = useRef<InstancedMesh>(null);
  const clumpOutlineRef = useRef<InstancedMesh>(null);
  const [clumps] = useState(() => new Clumps(snow, FEEL.ball.radiusBig));
  const wantThrower = useRef<ThrowerLook | undefined>(undefined);

  // Who throws: the prop, else ?thrower= on test pages. Applied as soon as the thrower is ready.
  useEffect(() => {
    wantThrower.current = thrower ?? throwerFromPage();
  }, [thrower]);
  useEffect(() => {
    onGame?.(game);
  }, [game, onGame]);
  const dotsRef = useRef<InstancedMesh>(null);
  const endRef = useRef<Mesh>(null);
  const dashesRef = useRef<InstancedMesh>(null);
  const io = useRef<{ keyboard: KeyboardInput; feedback: Feedback } | null>(null);
  /** Per ball ("pull" while pulled, then its id): where the snow was last pressed, the spin, and distance rolled. */
  const marks = useRef(new Map<string | number, { pressed: Vec2 | null; spin: Quaternion; rolled: number }>());

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const keyboard = createKeyboardInput(game);
    const pointer = createPointerInput(game, canvas, {
      toGround: snowPoint,
      hitsThrower: (clientX, clientY) => {
        const standee = throwerRef.current;
        if (!standee) return false;
        const r = canvas.getBoundingClientRect();
        ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        return standee.hits(raycaster);
      },
      onClaim: claimSnowPointer,
    });
    const feedback = connectFeedback(game);
    const stopUnlock = unlockAudioOnFirstTouch();
    const map = marks.current;
    const off = game.subscribe((e) => {
      if (e.type === "pressed") map.set("pull", { pressed: null, spin: new Quaternion(), rolled: 0 });
      if (e.type === "launched") {
        const pulled = map.get("pull");
        map.delete("pull");
        if (pulled) map.set(e.ballId, { ...pulled, rolled: 0 });
      }
      if (e.type === "cancelled") {
        map.delete("pull");
        snow.punchCrater(e.at.x, e.at.z, e.radius); // the ball crumbles into the snow
      }
      if (e.type === "removed") map.delete(e.ballId);
    });
    io.current = { keyboard, feedback };

    if (process.env.NODE_ENV !== "production") {
      // Handy from the browser console while tuning: window.__bowling.thrower
      (window as unknown as { __bowling?: Bowling }).__bowling = game;
      void import("../checks").then(({ runBowlingChecks }) => {
        const failed = runBowlingChecks();
        if (failed.length) console.error("Bowling checks failed:", failed);
        else console.info("Bowling checks: all pass");
      });
    }

    return () => {
      io.current = null;
      clumps.clear();
      keyboard.dispose();
      pointer.dispose();
      feedback.dispose();
      stopUnlock();
      off();
    };
  }, [game, gl, camera, snowPoint, snow, clumps]);

  // Scratch objects reused every frame.
  const scratch = useMemo(
    () => ({ holder: new Object3D(), axis: new Vector3(), turn: new Quaternion() }),
    [],
  );

  /** Press the snow along a ball's path since last frame. */
  const pressAlong = (key: string | number, to: Vec2, radius: number, velocity: Vec2, dig: number) => {
    const mark = marks.current.get(key);
    if (!mark) return;
    const g = FEEL.groove;
    const options = { velocityX: velocity.x, velocityZ: velocity.z, dig: 0 };
    const from = mark.pressed;
    if (!from) {
      options.dig = dig;
      snow.pressGroove(to.x, to.z, radius, options);
      mark.pressed = { ...to };
      return;
    }
    const far = Math.hypot(to.x - from.x, to.z - from.z);
    if (far < 1e-4 && dig <= 0) return;
    const step = Math.min(radius * g.spacing, g.maxStep);
    const stamps = Math.max(1, Math.ceil(far / step));
    options.dig = dig / stamps;
    for (let n = 1; n <= stamps; n++) {
      const u = n / stamps;
      snow.pressGroove(lerp(from.x, to.x, u), lerp(from.z, to.z, u), radius, options);
    }
    mark.pressed = { ...to };
  };

  useFrame((state, delta) => {
    const inputs = io.current;
    if (!inputs) return;
    const dt = Math.min(delta, 0.1);
    const want = wantThrower.current;
    if (want && game.thrower.id !== want) game.setThrower(want); // only takes between throws
    inputs.keyboard.update(dt);
    game.step(dt);
    inputs.feedback.update();

    const feel = game.feel;
    const t = game.thrower;
    const g = feel.groove;

    // ---- Press the snow: the pulled ball and every rolling ball.
    const pulled = t.ball;
    if (pulled) {
      pressAlong("pull", pulled.position, pulled.radius, pulled.velocity, pulled.dwell > 0 ? g.digResting * dt : 0);
    }
    for (const ball of game.balls) {
      // No dig while rolling: the groove depth comes from the ball's size. Called for stopped
      // balls too, so the last stretch before stopping is pressed even after a slow frame.
      pressAlong(ball.id, ball.position, ball.plan.radius, ball.velocity, 0);
    }

    // ---- The snowman.
    throwerRef.current?.update(game, snow.heightAt(t.x, t.foot.z), state.camera, state.clock.elapsedTime, dt);

    // ---- Clumps falling off big rolling balls.
    clumps.step(game.balls, feel.ball.sink, dt);
    if (clumpRef.current && clumpOutlineRef.current) clumps.draw(clumpRef.current, clumpOutlineRef.current);

    // ---- Balls.
    const shown: { key: string | number; at: Vec2; radius: number; rolled: number; dir: Vec2; scale: number }[] = [];
    if (pulled) {
      shown.push({
        key: "pull",
        at: { x: pulled.position.x + pulled.trembleOffset.x, z: pulled.position.z + pulled.trembleOffset.z },
        radius: pulled.radius,
        rolled: pulled.rolled,
        dir: pulled.rollDirection,
        scale: 1,
      });
    }
    for (const ball of game.balls) {
      const fadeLeft = feel.roll.restTime - ball.restAge;
      shown.push({
        key: ball.id,
        at: ball.position,
        radius: ball.plan.radius,
        rolled: ball.rolled,
        dir: ball.plan.direction,
        scale: Math.min(1, fadeLeft / 0.4),
      });
    }
    ballRefs.current.forEach((mesh, i) => {
      const outline = outlineRefs.current[i];
      if (!mesh || !outline) return;
      const b = shown[i];
      mesh.visible = outline.visible = !!b;
      if (!b) return;
      const mark = marks.current.get(b.key);
      if (mark) {
        // Spin about the ground axis across the roll direction.
        const turned = b.rolled - mark.rolled;
        mark.rolled = b.rolled;
        if (turned > 0) {
          scratch.axis.set(b.dir.z, 0, -b.dir.x).normalize();
          scratch.turn.setFromAxisAngle(scratch.axis, turned / b.radius);
          mark.spin.premultiply(scratch.turn);
        }
        mesh.quaternion.copy(mark.spin);
      }
      const r = b.radius * b.scale;
      mesh.scale.setScalar(Math.max(0.001, r));
      mesh.position.set(b.at.x, snow.heightAt(b.at.x, b.at.z) + r * (1 - feel.ball.sink), b.at.z);
      outline.position.copy(mesh.position);
      outline.quaternion.copy(mesh.quaternion);
      outline.scale.copy(mesh.scale);
    });

    // ---- Aim line: dots on the snow from the ball to where it will stop, and a ring there.
    const dots = dotsRef.current;
    const end = endRef.current;
    const aim = t.aim;
    if (dots && end) {
      let n = 0;
      if (aim) {
        const start = aim.radius + 0.1;
        for (let d = start; d < aim.distance && n < AIM.dots; d += AIM.spacing, n++) {
          const x = aim.start.x + aim.direction.x * d;
          const z = aim.start.z + aim.direction.z * d;
          scratch.holder.position.set(x, snow.heightAt(x, z) + MARK.lift, z);
          scratch.holder.rotation.set(0, 0, 0);
          scratch.holder.scale.setScalar(AIM.dotRadius);
          scratch.holder.updateMatrix();
          dots.setMatrixAt(n, scratch.holder.matrix);
        }
        end.visible = true;
        end.position.set(aim.stop.x, snow.heightAt(aim.stop.x, aim.stop.z) + MARK.lift, aim.stop.z);
        end.scale.setScalar(aim.radius);
      } else {
        end.visible = false;
      }
      dots.count = n;
      dots.instanceMatrix.needsUpdate = true;
    }

    // ---- Lane marks follow the snow if it gets pressed.
    const marksMesh = dashesRef.current;
    if (marksMesh) {
      dashes.forEach((d, i) => {
        scratch.holder.position.set(d.x, snow.heightAt(d.x, d.z) + MARK.lift, d.z);
        scratch.holder.rotation.set(0, d.angle, 0);
        scratch.holder.scale.set(d.length, 1, MARK.dashWidth);
        scratch.holder.updateMatrix();
        marksMesh.setMatrixAt(i, scratch.holder.matrix);
      });
      marksMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <Suspense fallback={null}>
        <ThrowerStandee ref={throwerRef} paper={looks.colors} />
      </Suspense>
      {Array.from({ length: MAX_BALLS }, (_, i) => (
        <group key={i}>
          <mesh
            ref={(m) => {
              ballRefs.current[i] = m;
            }}
            geometry={looks.ball}
            material={looks.ballMaterial}
            visible={false}
            castShadow
          />
          <mesh
            ref={(m) => {
              outlineRefs.current[i] = m;
            }}
            geometry={looks.ball}
            material={looks.ballOutline}
            visible={false}
          />
        </group>
      ))}
      <instancedMesh
        ref={clumpRef}
        args={[looks.clump, looks.clumpMaterial, LOOK.clumps.max]}
        frustumCulled={false}
        castShadow
      />
      <instancedMesh
        ref={clumpOutlineRef}
        args={[looks.clump, looks.clumpOutline, LOOK.clumps.max]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dotsRef}
        args={[looks.flatCircle, looks.aimInk, AIM.dots]}
        frustumCulled={false}
        renderOrder={2}
      />
      <mesh ref={endRef} geometry={looks.flatRing} material={looks.aimInk} visible={false} renderOrder={2} />
      <instancedMesh
        ref={dashesRef}
        args={[looks.flatDash, looks.markInk, dashes.length]}
        frustumCulled={false}
        renderOrder={1}
      />
    </group>
  );
}
