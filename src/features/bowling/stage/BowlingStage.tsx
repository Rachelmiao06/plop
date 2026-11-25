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
  type Group,
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
import { createKeyboardInput, SOLO_KEYS, type KeyboardInput, type KeyMap } from "../keyboard";
import { createPointerInput } from "../pointer";
import { powerOf, sweetPull } from "../roll";
import { Bowling } from "../simulation";
import { type Vec2, lerp } from "../vec";
import { Clumps } from "./clumps";
import { readPalette } from "./look";
import { motionShare } from "./motion";
import { ballMaterial, ballOutlineMaterial } from "./snowballLook";
import { SpeedLines } from "./SpeedLines";
import { ThrowerStandee, type ThrowerHandle } from "./ThrowerStandee";

/** The fixed drawing light the ball's shade side comes from (see LOOK.ball.light). */
const ballLight = new Vector3(...LOOK.ball.light).normalize();

/** Turns a squash amount from LOOK.ballSquash into a spring kick that peaks at about that amount. */
const KICK = 30;
const UP = new Vector3(0, 1, 0);

/** Drawing sizes (scene units). Not feel numbers: they only change how marks look. */
const MAX_BALLS = 6;
const AIM = { dots: 80, spacing: 0.22, dotRadius: 0.035 };
const MARK = { lift: 0.012, dashLength: 0.16, dashWidth: 0.035, pinRingRadius: 0.9 };

type Dash = { x: number; z: number; angle: number; length: number };

/** The throwing line and a faint ring where the pins will stand, as pencil dashes. */
function laneDashes(pinRing: boolean): Dash[] {
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
  if (!pinRing) return dashes;
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
  /**
   * The faint dashed ring where the pins stand (default true). The game turns it off: its sets move around
   * the lane, so a ring in the middle would point at the wrong place.
   */
  pinRing?: boolean;
  /**
   * Soft snow on the lane (a mound the game puts down), 0 normal .. 1 soft: the roll slows in it
   * (`FEEL.roll.soft`), and the aim line shows it. Leave out for plain snow.
   */
  softAt?: (x: number, z: number) => number;
  /** The keys this thrower listens to (default A / D or ← / → and Space). "Together" mode gives each its own. */
  keys?: KeyMap;
  /** Keep this thrower to part of the line, `[min, max]` in x (two throwers side by side). Default: all of it. */
  slide?: [number, number];
  /** Draw the throwing line's pencil dashes (default true). With two stages, only one draws them. */
  laneMarks?: boolean;
  /** Which side of the thrower the pulled ball grows on (1 = right, -1 = left). Default: toward the lane's middle. */
  ballSide?: 1 | -1;
};

/** `?thrower=one|two` on the page, for test pages (no prop given). */
function throwerFromPage(): ThrowerLook | undefined {
  if (typeof window === "undefined") return undefined;
  const v = new URLSearchParams(window.location.search).get("thrower");
  return v === "one" || v === "two" ? v : undefined;
}

export function BowlingStage({
  thrower,
  onGame,
  pinRing = true,
  softAt,
  keys = SOLO_KEYS,
  slide,
  laneMarks = true,
  ballSide,
}: BowlingStageProps = {}) {
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
      sweetInk: ink(LOOK.sweetTick.faint),
      markInk: ink(0.45),
    };
  }, [palette]);
  const dashes = useMemo(() => (laneMarks ? laneDashes(pinRing) : []), [pinRing, laneMarks]);
  useEffect(() => game.setBallSide(ballSide ?? null), [game, ballSide]);
  // Part of the line only (two throwers side by side); it waits for the thrower to be ready.
  const slideMin = slide?.[0];
  const slideMax = slide?.[1];
  useEffect(() => {
    game.setSlideRange(slideMin === undefined || slideMax === undefined ? null : [slideMin, slideMax]);
    if (slideMin !== undefined && slideMax !== undefined) game.slideTo((slideMin + slideMax) / 2);
  }, [game, slideMin, slideMax]);
  // The snow the rules read: the real snow, plus any soft mound the game laid down.
  useEffect(() => {
    game.setGround(softAt ? { packedAt: (x, z) => snow.packedAt(x, z), softAt } : snow);
  }, [game, snow, softAt]);

  const throwerRef = useRef<ThrowerHandle>(null);
  const ballGroups = useRef<(Group | null)[]>([]);
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
  const sweetRefs = useRef<(Mesh | null)[]>([]);
  const dashesRef = useRef<InstancedMesh>(null);
  const io = useRef<{ keyboard: KeyboardInput; feedback: Feedback } | null>(null);
  /**
   * Per ball ("pull" while pulled, then its id): where the snow was last pressed, the spin, distance
   * rolled, and its springy squash (value, speed; above 0 = squashed flat, below 0 = stretched).
   */
  const marks = useRef(
    new Map<string | number, { pressed: Vec2 | null; spin: Quaternion; rolled: number; squash: { q: number; v: number } }>(),
  );
  const seenTicks = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const keyboard = createKeyboardInput(game, window, keys);
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
      const kick = (key: string | number, amount: number) => {
        const m = map.get(key);
        if (m) m.squash.v += amount * KICK;
      };
      if (e.type === "pressed") map.set("pull", { pressed: null, spin: new Quaternion(), rolled: 0, squash: { q: 0, v: 0 } });
      if (e.type === "charged") kick("pull", LOOK.ballSquash.charge);
      if (e.type === "launched") {
        const pulled = map.get("pull");
        map.delete("pull");
        if (pulled) map.set(e.ballId, { ...pulled, rolled: 0 });
        // Pushed off: squashed flat against the snow for a moment, then the spring throws it into a stretch.
        const p = 0.5 + 0.5 * e.plan.power;
        const m = map.get(e.ballId);
        if (m) m.squash.q = Math.max(m.squash.q, LOOK.ballSquash.launchSquash * p);
        kick(e.ballId, -LOOK.ballSquash.launch * p);
        // A puff of snow kicked up behind the thrower's feet, thrown back and up.
        const r = LOOK.kick.release;
        const foot = game.thrower.foot;
        snow.kickUpSnow(foot.x, foot.z + r.back, r.radius, {
          amount: r.amount * p,
          velocityX: -e.plan.direction.x * r.speed * p,
          velocityZ: -e.plan.direction.z * r.speed * p,
        });
      }
      if (e.type === "cancelled") {
        map.delete("pull");
        snow.punchCrater(e.at.x, e.at.z, e.radius); // the ball crumbles into the snow
      }
      if (e.type === "burst") {
        // Poof: a puff of snow and clumps thrown up where it is, carried a little along its roll.
        const b = LOOK.burst;
        const big = e.radius / game.feel.ball.radiusBig;
        snow.kickUpSnow(e.at.x, e.at.z, e.radius * b.radius, {
          amount: b.amount * big * motionShare(),
          velocityX: e.velocity.x * b.carry,
          velocityZ: e.velocity.z * b.carry,
        });
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
  }, [game, gl, camera, snowPoint, snow, clumps, keys]);

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

  /**
   * Snow a rolling ball throws besides its groove: a plume behind that grows with speed and size, and for a
   * big ball a bow wave ahead and out to the sides, so it visibly bulldozes the snow (`LOOK.kick`).
   */
  const throwSnow = (ball: Bowling["balls"][number], fast: number, dt: number) => {
    const k = LOOK.kick;
    const r = ball.plan.radius;
    const d = ball.plan.direction;
    const big = Math.max(0, Math.min(1, (r - FEEL.ball.radiusSmall) / (FEEL.ball.radiusBig - FEEL.ball.radiusSmall)));
    const { x, z } = ball.position;
    const plume = k.plume.amount * fast * (k.plume.sizeFloor + (1 - k.plume.sizeFloor) * big) * dt;
    if (plume > 0) {
      const s = k.plume.speed * (0.5 + 0.5 * fast);
      snow.kickUpSnow(x - d.x * r * k.plume.behind, z - d.z * r * k.plume.behind, r * 0.8, {
        amount: plume,
        velocityX: -d.x * s,
        velocityZ: -d.z * s,
      });
    }
    const heavy = Math.max(0, (r - k.plough.fromRadius) / Math.max(0.01, FEEL.ball.radiusBig - k.plough.fromRadius));
    const going = Math.min(1, ball.speed / LOOK.speed.from);
    const plough = k.plough.amount * heavy * going * dt;
    if (plough > 0) {
      const s = k.plough.speed * (0.6 + 0.4 * going);
      snow.kickUpSnow(x + d.x * r * k.plough.ahead, z + d.z * r * k.plough.ahead, r * 0.9, {
        amount: plough,
        velocityX: d.x * s,
        velocityZ: d.z * s,
      });
    }
  };

  useFrame((state, delta) => {
    const inputs = io.current;
    if (!inputs) return;
    // Game time: slowed for a moment during a hit-stop (the pins ask for one when the ball meets them).
    const dt = game.slowFrame(Math.min(delta, 0.1));
    const want = wantThrower.current;
    if (want && game.thrower.id !== want) game.setThrower(want); // only takes between throws
    inputs.keyboard.update(dt);
    game.step(dt);
    inputs.feedback.update(dt);

    // Each crunch tick while pulling gives the ball a tiny squash.
    const ticks = inputs.feedback.beats.ticks;
    if (ticks !== seenTicks.current) {
      seenTicks.current = ticks;
      const m = marks.current.get("pull");
      if (m) m.squash.v += LOOK.ballSquash.tick * KICK;
    }

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
      // A fast ball ploughs up more spray: the snow is told it moves faster than it does.
      const fast = Math.max(0, Math.min(1, (ball.speed - LOOK.speed.from) / (LOOK.speed.full - LOOK.speed.from)));
      const boost = 1 + (LOOK.speed.sprayBoost - 1) * fast;
      pressAlong(ball.id, ball.position, ball.plan.radius, { x: ball.velocity.x * boost, z: ball.velocity.z * boost }, 0);
      if (ball.rolling) throwSnow(ball, fast, dt);
    }

    // ---- The snowman.
    throwerRef.current?.update(game, snow.heightAt(t.x, t.foot.z), state.camera, state.clock.elapsedTime, dt);

    // ---- Clumps falling off big rolling balls.
    clumps.step(game.balls, feel.ball.sink, dt);
    if (clumpRef.current && clumpOutlineRef.current) clumps.draw(clumpRef.current, clumpOutlineRef.current);

    // ---- Balls.
    const motion = motionShare();
    const sq = LOOK.ballSquash;
    const shown: { key: string | number; at: Vec2; radius: number; rolled: number; dir: Vec2; scale: number; load: number }[] = [];

    if (pulled) {
      shown.push({
        key: "pull",
        at: { x: pulled.position.x + pulled.trembleOffset.x, z: pulled.position.z + pulled.trembleOffset.z },
        radius: pulled.radius,
        rolled: pulled.rolled,
        dir: pulled.rollDirection,
        scale: 1,
        // Loading up: pressed into the snow more the farther it is pulled.
        load: Math.min(1, Math.hypot(t.pull.x, t.pull.z) / feel.pull.max) * sq.pullLoad,
      });
    }
    for (const ball of game.balls) {
      const fadeLeft = feel.roll.restTime - ball.restAge;
      // Bursting: it flattens (the squash spring's goal) and shrinks away, quick at the end.
      const burst = ball.bursting === null ? 0 : Math.min(1, ball.bursting / Math.max(1e-6, feel.roll.burstTime));
      shown.push({
        key: ball.id,
        at: ball.position,
        radius: ball.plan.radius,
        rolled: ball.rolled,
        dir: ball.plan.direction,
        scale: Math.min(1, fadeLeft / 0.4) * (1 - burst * burst),
        load: burst > 0 ? LOOK.burst.flatten : 0,
      });
    }
    ballRefs.current.forEach((mesh, i) => {
      const outline = outlineRefs.current[i];
      const holder = ballGroups.current[i];
      if (!mesh || !outline || !holder) return;
      const b = shown[i];
      mesh.visible = outline.visible = !!b;
      if (!b) return;
      const mark = marks.current.get(b.key);
      // Squash spring: flattens (q > 0) or stretches along the roll (q < 0), always upright.
      let q = 0;
      if (mark) {
        const s = mark.squash;
        s.v += (-(s.q - b.load) * sq.stiffness - s.v * sq.damping) * dt;
        s.q += s.v * dt;
        q = Math.max(-sq.max, Math.min(sq.max, s.q)) * motion;
      }
      if (mark) {
        // Spin about the ground axis across the roll direction.
        const turned = b.rolled - mark.rolled;
        mark.rolled = b.rolled;
        if (turned > 0) {
          scratch.axis.set(b.dir.z, 0, -b.dir.x).normalize();
          scratch.turn.setFromAxisAngle(scratch.axis, turned / b.radius);
          mark.spin.premultiply(scratch.turn);
        }
      }
      // The holder below is turned to the roll; undo that turn so the spin stays as rolled.
      const yaw = Math.atan2(b.dir.x, b.dir.z);
      if (mark) mesh.quaternion.setFromAxisAngle(UP, -yaw).multiply(mark.spin);
      const r = Math.max(0.001, b.radius * b.scale);
      mesh.scale.setScalar(r);
      outline.quaternion.copy(mesh.quaternion);
      outline.scale.copy(mesh.scale);
      // The holder carries position and squash, turned to the roll so a stretch points the way it goes.
      const side = 1 + q / 2;
      const up = q >= 0 ? 1 - q : side;
      const along = q >= 0 ? side : 1 - q;
      holder.rotation.set(0, yaw, 0);
      holder.scale.set(side, up, along);
      holder.position.set(b.at.x, snow.heightAt(b.at.x, b.at.z) + r * (up - feel.ball.sink), b.at.z);
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

    // ---- The sweet spot: two pencil ticks across the pull line, where a pull reaches it (FEEL.pull.sweet).
    const sw = LOOK.sweetTick;
    const pulledBall = t.phase === "pulling" ? t.ball : null;
    const pullLength = Math.hypot(t.pull.x, t.pull.z);
    sweetRefs.current.forEach((tick, k) => {
      if (!tick) return;
      tick.visible = !!pulledBall && pullLength > 0.05;
      if (!pulledBall || !tick.visible) return;
      const back = { x: t.pull.x / pullLength, z: t.pull.z / pullLength };
      const at = sweetPull(feel);
      const off = (k - 0.5) * sw.gap;
      // On the pull line itself, which runs beside the ball (it sits `pull.beside` off it), so the ball never covers it.
      const x = t.foot.x + back.x * (at + off);
      const z = t.foot.z + back.z * (at + off);
      tick.position.set(x, snow.heightAt(x, z) + MARK.lift, z);
      tick.rotation.set(0, Math.atan2(back.x, back.z) + Math.PI / 2 + (k ? 0.06 : -0.05), 0);
      tick.scale.set(sw.length * (k ? 0.85 : 1), 1, sw.width);
      const gap = feel.pull.sweet.at - powerOf(pullLength, feel);
      const material = tick.material as MeshBasicMaterial;
      material.opacity = gap > sw.near ? sw.faint : gap >= 0 ? 1 : sw.faint;
    });

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
        <SpeedLines game={game} snow={snow} />
      </Suspense>
      {Array.from({ length: MAX_BALLS }, (_, i) => (
        <group
          key={i}
          ref={(g) => {
            ballGroups.current[i] = g;
          }}
        >
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
      {[0, 1].map((k) => (
        <mesh
          key={`sweet-${k}`}
          ref={(m) => {
            sweetRefs.current[k] = m;
          }}
          geometry={looks.flatDash}
          material={looks.sweetInk}
          visible={false}
          renderOrder={2}
        />
      ))}
{dashes.length > 0 && (
      <instancedMesh
        ref={dashesRef}
        args={[looks.flatDash, looks.markInk, dashes.length]}
        frustumCulled={false}
        renderOrder={1}
      />
      )}
    </group>
  );
}
