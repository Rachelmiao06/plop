"use client";

/**
 * The pins on the snow: Rapier physics for toppling cut-outs, the bowling ball as a pushing sphere,
 * counting, the reset bounce and changing sets. Render inside `<SnowScene>`, next to `<BowlingStage>`.
 *
 *   const [pins] = useState(() => createPins());
 *   <SnowScene><BowlingStage /><PinsStage pins={pins} /></SnowScene>
 */
import { memo, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  BallCollider,
  CuboidCollider,
  HeightfieldCollider,
  Physics,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
  type CollisionEnterPayload,
  type RapierCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Euler, Quaternion, SRGBColorSpace, Vector3, type Group, type Texture } from "three";

import { playThump } from "@/lib/audio";
import { haptic } from "@/lib/haptics";

import type { BowlEvent, Bowling } from "@/features/bowling";
import { propSrc } from "@/features/scenery";
import { freshSnowfallAt, useSnow } from "@/features/snow-scene";

import { currentBowling, tapBowling } from "./ballTap";
import { PINS } from "./content";
import { nextFormationId, type Pins, type PinsPhase } from "./controller";
import { playFwump, unlockFwumpOnFirstTouch } from "./fwump";
import { buildPins, formationById, pinPropIds, sampleGround, type PinSpec } from "./layout";
import { PinCard, type PaperColors } from "./PinCard";

/** Same as the bowling stage's ball limit. */
const MAX_BALLS = 6;
/** Where unused ball colliders wait, far under the snow. */
const PARK_Y = -40;
const DEG = Math.PI / 180;

type Pose = { p: Vector3; q: Quaternion };
type Anim = { kind: "reset" | "leave" | "arrive"; start: number; duration: number; from: Pose; to: Pose };
type PinRuntime = {
  down: boolean;
  landed: boolean;
  anim: Anim | null;
  boingAt: number;
  hidden: boolean;
  /** The ball has touched this card in this throw (the extra impact shove is given once). */
  struck?: boolean;
  /** The flop squash spring (drawing only): amount and its speed. */
  squash: { q: number; v: number };
};

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Share of squash to keep: all of it, or `PINS.reducedMotion` when the device asks for less motion. */
function motionShare(): number {
  return typeof window !== "undefined" && window.matchMedia?.(MOTION_QUERY).matches ? PINS.reducedMotion : 1;
}

export function PinsStage({ pins }: { pins: Pins }) {
  const debug = useSyncExternalStore(
    pins.subscribeState,
    () => pins.getState().debug,
    () => false,
  );
  // During a hit-stop the physics is paused and stepped by hand with slowed time (see PinsWorld).
  const [slowed, setSlowed] = useState(false);
  return (
    <Suspense fallback={null}>
      <Physics
        gravity={[0, PINS.world.gravity, 0]}
        timeStep={1 / PINS.world.stepsPerSecond}
        debug={debug}
        colliders={false}
        paused={slowed}
      >
        <PinsWorld pins={pins} setSlowed={setSlowed} />
      </Physics>
    </Suspense>
  );
}

function readPaper(): PaperColors {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  return { paper: token("--paper"), shade: token("--snow-shadow"), ink: token("--ink") };
}

function usePinTextures(): Record<string, Texture> {
  const urls = useMemo(() => Object.fromEntries(pinPropIds().map((id) => [id, propSrc(id)])), []);
  const textures = useTexture(urls);
  useMemo(() => {
    for (const tex of Object.values(textures)) {
      tex.colorSpace = SRGBColorSpace; // drawn in sRGB; without this the art shows pale
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
  }, [textures]);
  return textures;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInCubic = (t: number) => t * t * t;
const easeOutBack = (t: number) => {
  const c = 1.5;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Degrees a body is tilted from upright. */
function tiltOf(q: { x: number; y: number; z: number; w: number }): number {
  const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
  return Math.acos(Math.max(-1, Math.min(1, upY))) / DEG;
}

/** A new throw: nothing is down or landed yet. */
function clearCounts(list: PinRuntime[]) {
  for (const rt of list) {
    rt.down = false;
    rt.landed = false;
    rt.struck = false;
  }
}

const homePose = (s: PinSpec): Pose => ({
  p: new Vector3(s.home.x, s.home.y, s.home.z),
  q: new Quaternion().setFromEuler(new Euler(0, s.home.yaw, 0)),
});

const PinsWorld = memo(function PinsWorld({ pins, setSlowed }: { pins: Pins; setSlowed: (slowed: boolean) => void }) {
  const snow = useSnow();
  const { rapier, world, step: stepPhysics, isPaused } = useRapier();
  const [ground] = useState(() => sampleGround(snow.heightAt));
  const [paper] = useState(readPaper);
  const textures = usePinTextures();
  /** The set on the snow, and whether it mounts hidden to hop in. */
  const [entry, setEntry] = useState(() => ({ id: pins.getState().formation, arrive: false }));
  const specs = useMemo(() => buildPins(formationById(entry.id), ground), [entry.id, ground]);

  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const visuals = useRef<(Group | null)[]>([]);
  const runtime = useRef<PinRuntime[]>([]);
  /** Which set `runtime` was made for (it is replaced in an effect, a moment after the new set mounts). */
  const runtimeFor = useRef<string | null>(null);
  const ballBodies = useRef<(RapierRigidBody | null)[]>([]);
  const ballColliders = useRef<(RapierCollider | null)[]>([]);
  const flow = useRef({
    phase: "ready" as PinsPhase,
    clock: 0,
    /** When the current phase started. */
    since: 0,
    launchedAt: 0,
    stoppedAt: null as number | null,
    settledFor: 0,
    activeBalls: new Set<number>(),
    /** Balls thrown in the throw being counted; only these (and rolling ones) push cards. */
    throwBalls: new Set<number>(),
    /** A throw came in while the set was resetting or changing: count it once they stand. */
    pendingThrow: false,
    /** The set that is ducking out: once every card is under the snow, this one mounts. */
    nextFormation: null as string | null,
    /** The set that just mounted hidden and should hop in. */
    arriveFor: null as string | null,
    fullClear: false,
    game: null as Bowling | null,
    off: null as null | (() => void),
    /** Ball id → collider slot, so a ball never jumps from one slot to another. */
    slots: new Map<number, number>(),
    /** Ball id → the height it came to rest at. A resting ball stays put even when landing cards dent the snow under it. */
    restY: new Map<number, number>(),
    groundChecked: false,
    /** The ball has met a card in this throw (the hit-stop plays once per throw). */
    hitThisThrow: false,
    /** A hit-stop is slowing the physics (it is paused and stepped by hand). */
    slowing: false,
  });

  // A new set: fresh per-pin state (hidden if it is about to hop in).
  useEffect(() => {
    runtime.current = specs.map(() => ({
      down: false,
      landed: false,
      anim: null,
      boingAt: -10,
      hidden: entry.arrive,
      squash: { q: 0, v: 0 },
    }));
    runtimeFor.current = entry.id;
    if (!entry.arrive) pins.emit({ type: "ready", formation: entry.id, total: specs.length });
  }, [specs, entry, pins]);

  useEffect(() => {
    tapBowling();
    const stopUnlock = unlockFwumpOnFirstTouch();
    const f = flow.current;
    return () => {
      stopUnlock();
      f.off?.();
      f.off = null;
      f.game = null;
    };
  }, []);

  /* ---------------- phases ---------------- */

  const setPhase = (phase: PinsPhase) => {
    const f = flow.current;
    f.phase = phase;
    f.since = f.clock;
    pins.emit({ type: "phase", phase });
  };

  const toKinematic = (b: RapierRigidBody) => {
    // CCD would stop an animated card at the snow it starts lying on, freezing it half way.
    b.enableCcd(false);
    b.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
  };

  const poseOf = (b: RapierRigidBody): Pose => {
    const t = b.translation();
    const r = b.rotation();
    return { p: new Vector3(t.x, t.y, t.z), q: new Quaternion(r.x, r.y, r.z, r.w) };
  };

  const startThrow = () => {
    const f = flow.current;
    f.launchedAt = f.clock;
    f.stoppedAt = f.activeBalls.size ? null : f.clock;
    f.settledFor = 0;
    f.pendingThrow = false;
    f.hitThisThrow = false;
    clearCounts(runtime.current);
    pins.emit({ type: "knocked", down: 0, total: specs.length });
    setPhase("throw");
  };

  /** Everything stands again (after a reset or a new set). */
  const standReady = () => {
    const f = flow.current;
    // Every card goes back to the physics together, so one still hopping never knocks a settled one.
    specs.forEach((_, i) => {
      const b = bodies.current[i];
      if (!b || b.isDynamic() || runtime.current[i]?.hidden) return;
      const t = b.nextTranslation();
      const q = b.nextRotation();
      b.setBodyType(rapier.RigidBodyType.Dynamic, true);
      b.enableCcd(true);
      b.setTranslation(t, true);
      b.setRotation(q, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
      b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    });
    pins.emit({ type: "ready", formation: entry.id, total: specs.length });
    if (f.pendingThrow && f.activeBalls.size) startThrow();
    else {
      f.pendingThrow = false;
      setPhase("ready");
    }
  };

  const startReset = () => {
    const f = flow.current;
    const r = PINS.reset;
    let order = 0;
    specs.forEach((s, i) => {
      const b = bodies.current[i];
      const rt = runtime.current[i];
      if (!b || !rt || rt.anim) return;
      const from = poseOf(b);
      const to = homePose(s);
      // Everyone holds still while the fallen pop back, so nothing is knocked on the way.
      toKinematic(b);
      // Only cards that moved pop back; untouched ones stay put.
      if (from.p.distanceTo(to.p) < 0.03 && from.q.angleTo(to.q) < 3 * DEG) return;
      rt.anim = { kind: "reset", start: f.clock + 0.05 + order++ * r.stagger, duration: r.time, from, to };
    });
    setPhase("resetting");
    if (order === 0) standReady();
  };

  const startChange = (id: string) => {
    const f = flow.current;
    const n = PINS.nextSet;
    f.nextFormation = id;
    specs.forEach((s, i) => {
      const b = bodies.current[i];
      const rt = runtime.current[i];
      if (!b || !rt) return;
      const from = poseOf(b);
      const to = { p: from.p.clone().add(new Vector3(0, -(s.height + 0.2), 0)), q: from.q.clone() };
      toKinematic(b);
      rt.anim = { kind: "leave", start: f.clock + i * n.leaveStagger, duration: n.leaveTime, from, to };
    });
    // New snow settles over the old dents while the set changes.
    freshSnowfallAt(ground.cx, ground.cz, n.clearSnowRadius);
    setPhase("changing");
  };

  const finishThrow = () => {
    const f = flow.current;
    const down = runtime.current.filter((rt) => rt.down).length;
    const total = specs.length;
    const fullClear = total > 0 && down === total;
    f.fullClear = fullClear;
    f.throwBalls.clear();
    pins.emit({ type: "result", result: { down, total, fullClear } });
    // The pop-up's beat you feel: a celebration on a full clear, a small double tap otherwise.
    if (fullClear) haptic("fullClear");
    else if (down > 0) haptic("down");
    setPhase("result");
  };

  /* ---------------- bowling events ---------------- */

  const onBowl = (e: BowlEvent) => {
    const f = flow.current;
    if (e.type === "launched") {
      f.activeBalls.add(e.ballId);
      f.throwBalls.add(e.ballId);
      if (f.phase === "ready") startThrow();
      else if (f.phase === "throw") f.stoppedAt = null;
      else {
        f.pendingThrow = true;
        if (f.phase === "result") {
          if (f.fullClear) startChange(nextFormationId(entry.id));
          else startReset();
        }
      }
    } else if (e.type === "stopped" || e.type === "removed") {
      f.activeBalls.delete(e.ballId);
      if (!f.activeBalls.size && f.stoppedAt === null) f.stoppedAt = f.clock;
    }
  };
  const onBowlRef = useRef(onBowl);
  useEffect(() => {
    onBowlRef.current = onBowl;
  });

  /* ---------------- landing in the snow ---------------- */

  const handlers = useMemo(
    () =>
      specs.map((s, i) => (e: CollisionEnterPayload) => {
        const f = flow.current;
        if (e.other.rigidBodyObject?.name === "ball") {
          const ball = f.game?.balls.find((b) => b.rolling);
          const rt = runtime.current[i];
          const body = e.target.rigidBody;
          if (!ball || !f.game || f.phase !== "throw" || !rt || !body || rt.anim) return;
          // A bit more energy than the plain push: a shove, a lift and a tumble, once per card.
          if (!rt.struck) {
            rt.struck = true;
            const im = PINS.impact;
            const d = ball.plan.direction;
            const m = body.mass();
            const v = ball.speed;
            body.applyImpulse({ x: d.x * im.push * m * v, y: im.lift * m, z: d.z * im.push * m * v }, true);
            body.applyTorqueImpulse(
              { x: d.z * im.tumble * m * v, y: (Math.random() * 2 - 1) * im.twist * m * v, z: -d.x * im.tumble * m * v },
              true,
            );
          }
          // The ball meets the first card of the throw: a hit-stop, a thump and a bump you feel.
          if (!f.hitThisThrow) {
            f.hitThisThrow = true;
            const h = PINS.hitStop;
            const size = ball.plan.size;
            f.game.hitStop(h.seconds + h.bigExtra * size, h.slowest + (h.bigSlowest - h.slowest) * size);
            playThump(h.thump + h.thumpPerSize * size);
            haptic("hit", ball.plan.size);
          }
          return;
        }
        if (e.other.rigidBodyObject?.name !== "snow") return;
        const rt = runtime.current[i];
        const b = e.target.rigidBody;
        if (!rt || !b || rt.landed || rt.anim) return;
        const r = b.rotation();
        if (tiltOf(r) < PINS.landing.tiltDegrees) return;
        rt.landed = true;
        const l = PINS.landing;
        const t = b.translation();
        const up = new Vector3(0, 1, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w));
        const length = s.card[1] * 2;
        const radius = Math.max(l.dentMin, Math.min(l.dentMax, s.card[0] * 2 * l.dentShare));
        for (let k = 0; k < l.dents; k++) {
          const along = ((k + 0.5) / l.dents) * length;
          snow.pressGroove(t.x + up.x * along, t.z + up.z * along, radius);
        }
        if (l.puff > 0) snow.punchCrater(t.x + up.x * length, t.z + up.z * length, l.puff);
        const v = b.linvel();
        const w = b.angvel();
        const speed = Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z) * length * 0.5;
        const strength = clamp01((speed - l.softSpeed) / (l.hardSpeed - l.softSpeed));
        playFwump(strength, clamp01((s.height * s.width - 0.15) / 0.8));
        haptic("flop", strength);
        // A little squash on landing, harder for a harder flop.
        rt.squash.v += PINS.flop.squash * (0.5 + 0.5 * strength) * 30;
      }),
    [specs, snow],
  );

  /* ---------------- every physics step ---------------- */

  useBeforePhysicsStep(() => {
    const f = flow.current;
    const game = f.game;
    const list = game?.balls ?? [];
    const live = new Set<number>();
    for (const ball of list) {
      live.add(ball.id);
      let slot = f.slots.get(ball.id);
      const isNew = slot === undefined;
      if (slot === undefined) {
        const used = new Set(f.slots.values());
        for (let k = 0; k < MAX_BALLS; k++) if (!used.has(k)) { slot = k; break; }
        if (slot === undefined) continue;
        f.slots.set(ball.id, slot);
      }
      const body = ballBodies.current[slot];
      const collider = ballColliders.current[slot];
      if (!body || !collider || !game) continue;
      const fade = ball.rolling ? 1 : clamp01((game.feel.roll.restTime - ball.restAge) / PINS.ball.fadeTime);
      const r = ball.plan.radius * fade;
      collider.setRadius(Math.max(0.005, r * PINS.ball.radiusShare));
      // Only a rolling ball, or one still part of the throw being counted, pushes cards.
      const pushes = ball.rolling || (f.phase === "throw" && f.throwBalls.has(ball.id));
      if (collider.isSensor() === pushes) collider.setSensor(!pushes);
      let ground = snow.heightAt(ball.position.x, ball.position.z);
      if (!ball.rolling) {
        if (!f.restY.has(ball.id)) f.restY.set(ball.id, ground);
        ground = f.restY.get(ball.id)!;
      }
      const at = { x: ball.position.x, y: ground + r * (1 - game.feel.ball.sink), z: ball.position.z };
      // A new ball is placed, not swept from where its slot was parked (that would hit like a cannon).
      if (isNew) body.setTranslation(at, true);
      body.setNextKinematicTranslation(at);
    }
    for (const [id, slot] of f.slots) {
      if (live.has(id)) continue;
      f.slots.delete(id);
      f.restY.delete(id);
      const body = ballBodies.current[slot];
      body?.setTranslation({ x: slot * 3, y: PARK_Y, z: 0 }, false);
      body?.setNextKinematicTranslation({ x: slot * 3, y: PARK_Y, z: 0 });
    }
  });

  useAfterPhysicsStep(() => {
    const f = flow.current;
    const dt = 1 / PINS.world.stepsPerSecond;
    const c = PINS.caps;
    const d = PINS.down;
    let moving = false;
    let newlyDown = false;
    specs.forEach((_, i) => {
      const b = bodies.current[i];
      const rt = runtime.current[i];
      if (!b || !rt || rt.anim || rt.hidden || !b.isDynamic()) return;
      // Speed limits: never fly off, never launch upward.
      const v = b.linvel();
      const flat = Math.hypot(v.x, v.z);
      let { x, y, z } = v;
      let capped = false;
      if (flat > c.linear) {
        x *= c.linear / flat;
        z *= c.linear / flat;
        capped = true;
      }
      if (y > c.up) {
        y = c.up;
        capped = true;
      }
      if (capped) b.setLinvel({ x, y, z }, true);
      const w = b.angvel();
      const spin = Math.hypot(w.x, w.y, w.z);
      if (spin > c.angular) b.setAngvel({ x: (w.x * c.angular) / spin, y: (w.y * c.angular) / spin, z: (w.z * c.angular) / spin }, true);
      if (!b.isSleeping() && (Math.hypot(x, y, z) > d.settleSpeed || spin > d.settleSpin)) moving = true;

      const isDown = tiltOf(b.rotation()) > d.tiltDegrees;
      if (f.phase === "throw" && isDown && !rt.down) newlyDown = true;
      if (f.phase === "throw") rt.down = isDown;
    });
    if (f.phase !== "throw") return;
    if (newlyDown) {
      pins.emit({ type: "knocked", down: runtime.current.filter((rt) => rt.down).length, total: specs.length });
    }
    f.settledFor = moving ? 0 : f.settledFor + dt;
    const ballsDone = f.activeBalls.size === 0;
    const timedOut =
      (f.stoppedAt !== null && f.clock - f.stoppedAt > d.timeoutAfterStop) || f.clock - f.launchedAt > d.timeoutAfterLaunch;
    if ((ballsDone && f.settledFor >= d.settleHold) || timedOut) finishThrow();
  });

  /* ---------------- every frame ---------------- */

  const scratch = useMemo(() => ({ p: new Vector3(), q: new Quaternion() }), []);

  useFrame((_, delta) => {
    const f = flow.current;
    // Hit-stop: while the bowling game runs slow, pause the physics and step it by hand with slowed time.
    const scale = f.game?.timeScale ?? 1;
    const slowing = scale < 1;
    if (slowing !== f.slowing) {
      f.slowing = slowing;
      setSlowed(slowing);
    }
    if (isPaused) stepPhysics(Math.min(delta, 0.1) * scale);
    const dt = Math.min(delta, 0.1) * scale;
    f.clock += dt;

    // Follow whichever bowling game is running.
    const game = currentBowling();
    if (game !== f.game) {
      f.off?.();
      f.game = game;
      f.off = game ? game.subscribe((e) => onBowlRef.current(e)) : null;
    }

    // Asked by the page.
    for (const cmd of pins.takeCommands()) {
      if (cmd.type === "reset" && (f.phase === "ready" || f.phase === "throw" || f.phase === "result")) startReset();
      if (cmd.type === "next" && f.phase !== "changing") startChange(nextFormationId(entry.id));
      if (cmd.type === "formation" && f.phase !== "changing" && cmd.id !== entry.id) startChange(cmd.id);
    }

    // A new set mounted hidden: hop it in once its bodies exist.
    if (
      f.arriveFor === entry.id &&
      runtimeFor.current === entry.id &&
      runtime.current.length === specs.length &&
      specs.every((_, i) => bodies.current[i] && runtime.current[i].hidden)
    ) {
      f.arriveFor = null;
      const n = PINS.nextSet;
      specs.forEach((s, i) => {
        const b = bodies.current[i]!;
        const to = homePose(s);
        const from = { p: to.p.clone().add(new Vector3(0, 0, n.slideFrom)), q: to.q.clone() };
        toKinematic(b);
        b.setTranslation(from.p, false);
        b.setNextKinematicTranslation(from.p);
        runtime.current[i].anim = { kind: "arrive", start: f.clock + i * n.arriveStagger, duration: n.arriveTime, from, to };
      });
    }

    // Result shown long enough: reset, or a new set after a full clear.
    if (f.phase === "result") {
      const wait = f.fullClear ? PINS.nextSet.delayAfterFullClear : PINS.reset.delayAfterResult;
      const ballOnSpots =
        !f.fullClear &&
        (f.game?.balls ?? []).some((ball) =>
          specs.some((s) => Math.hypot(ball.position.x - s.home.x, ball.position.z - s.home.z) < ball.plan.radius + s.card[0]),
        );
      const waited = f.clock - f.since;
      if (waited > wait && (!ballOnSpots || waited > wait + PINS.reset.waitForBallMax)) {
        if (f.fullClear) startChange(nextFormationId(entry.id));
        else startReset();
      }
    }

    // Animations (kinematic) and the boing on landing upright (drawing only).
    const r = PINS.reset;
    const n = PINS.nextSet;
    const fl = PINS.flop;
    const motion = motionShare();
    let animating = false;
    specs.forEach((s, i) => {
      const b = bodies.current[i];
      const rt = runtime.current[i];
      const visual = visuals.current[i];
      if (!b || !rt || !visual) return;
      const a = rt.anim;
      if (a) {
        animating = true;
        const t = (f.clock - a.start) / a.duration;
        if (t >= 0) {
          if (rt.hidden && a.kind === "arrive") {
            rt.hidden = false;
            visual.visible = true;
          }
          const u = clamp01(t);
          if (a.kind === "reset") {
            scratch.p.lerpVectors(a.from.p, a.to.p, easeOutCubic(u));
            scratch.p.y += r.hop * Math.sin(Math.PI * u);
            scratch.q.slerpQuaternions(a.from.q, a.to.q, easeOutBack(u));
          } else if (a.kind === "leave") {
            scratch.p.lerpVectors(a.from.p, a.to.p, easeInCubic(u));
            scratch.q.copy(a.from.q);
          } else {
            scratch.p.lerpVectors(a.from.p, a.to.p, easeOutCubic(u));
            scratch.p.y += n.hop * Math.abs(Math.sin(Math.PI * n.hops * u)) * (1 - 0.5 * u);
            scratch.q.copy(a.to.q);
          }
          // A sleeping body ignores kinematic targets, and a still kinematic body falls asleep: keep it awake.
          b.wakeUp();
          b.setNextKinematicTranslation(scratch.p);
          b.setNextKinematicRotation(scratch.q);
          if (t >= 1) {
            rt.anim = null;
            if (a.kind === "leave") {
              rt.hidden = true;
              visual.visible = false;
            } else {
              // Stays kinematic, exactly home, until every card has landed (see standReady).
              b.setNextKinematicTranslation(a.to.p);
              b.setNextKinematicRotation(a.to.q);
              rt.boingAt = f.clock;
              rt.down = false;
              rt.landed = false;
            }
          }
        }
      }
      // The flop squash: a quick spring along the card's length (it lies in the snow, so this reads as a squish).
      const sq = rt.squash;
      sq.v += (-sq.q * fl.stiffness - sq.v * fl.damping) * dt;
      sq.q += sq.v * dt;
      if (Math.abs(sq.q) < 1e-4 && Math.abs(sq.v) < 1e-3) sq.q = sq.v = 0;
      const flop = Math.max(-0.3, Math.min(0.3, sq.q)) * motion;

      const since = f.clock - rt.boingAt;
      if (since >= 0 && since < 1.6) {
        const fade = Math.exp(-r.boingDecay * since);
        const wave = since * r.boingFrequency * Math.PI * 2;
        visual.rotation.z = Math.sin(wave) * r.boingDegrees * DEG * fade * motion;
        const squash = r.boingSquash * fade * Math.cos(wave * 2) * motion + flop;
        visual.scale.set(1 + squash * 0.5, 1 - squash, 1);
      } else if (flop !== 0) {
        visual.rotation.z = 0;
        visual.scale.set(1 + flop * 0.5, 1 - flop, 1);
      } else if (visual.rotation.z !== 0 || visual.scale.y !== 1) {
        visual.rotation.z = 0;
        visual.scale.set(1, 1, 1);
      }
    });

    if (!animating) {
      if (f.phase === "resetting") standReady();
      else if (f.phase === "changing") {
        if (f.nextFormation) {
          // Every old card is under the snow: mount the new set, hidden, to hop in.
          const id = f.nextFormation;
          f.nextFormation = null;
          f.arriveFor = id;
          setEntry({ id, arrive: true });
        } else if (f.arriveFor === null) {
          standReady();
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      // Handy from the browser console while tuning: window.__pins.runtime
      (window as unknown as { __pins?: unknown }).__pins = { flow: f, runtime: runtime.current, bodies: bodies.current, visuals: visuals.current, specs, entry };
    }

    // Development check: the physics ground lines up with the drawn snow.
    if (process.env.NODE_ENV !== "production" && !f.groundChecked && f.clock > 0.5) {
      f.groundChecked = true;
      let worst = 0;
      // Off the sample grid on purpose: a straight-down ray through a grid corner can slip between triangles.
      for (const [dx, dz] of [[-5.13, -4.91], [5.07, -3.89], [-3.93, 5.11], [4.61, 4.37], [0.11, 5.93]]) {
        const x = ground.cx + dx;
        const z = ground.cz + dz;
        const hit = world.castRay(new rapier.Ray({ x, y: 10, z }, { x: 0, y: -1, z: 0 }), 30, true, undefined, undefined, undefined, undefined, (c) => c.shape.type === rapier.ShapeType.HeightField);
        if (hit) worst = Math.max(worst, Math.abs(10 - hit.timeOfImpact - snow.heightAt(x, z)));
      }
      if (worst > 0.02) console.error(`Pins: physics ground is off the snow by ${worst.toFixed(3)}`);
      else console.info(`Pins: physics ground matches the snow (worst ${worst.toFixed(4)})`);
    }
  });

  /* ---------------- drawing ---------------- */

  const halfSpan = ground.span / 2;
  return (
    <>
      <RigidBody type="fixed" colliders={false} name="snow" position={[ground.cx, 0, ground.cz]}>
        <HeightfieldCollider
          args={[ground.cells, ground.cells, Array.from(ground.heights), { x: ground.span, y: 1, z: ground.span }]}
          friction={PINS.ground.friction}
          restitution={PINS.ground.restitution}
        />
        {/* A safety floor in case a card slides off the sampled patch. */}
        <CuboidCollider args={[halfSpan * 4, 0.5, halfSpan * 4]} position={[0, ground.min - 0.55, 0]} friction={PINS.ground.friction} />
      </RigidBody>

      {Array.from({ length: MAX_BALLS }, (_, k) => (
        <RigidBody
          key={`ball-${k}`}
          ref={(b) => {
            ballBodies.current[k] = b;
          }}
          type="kinematicPosition"
          colliders={false}
          name="ball"
          position={[k * 3, PARK_Y, 0]}
        >
          <BallCollider
            ref={(c) => {
              ballColliders.current[k] = c;
            }}
            args={[1]}
            friction={0.4}
            restitution={0.1}
          />
        </RigidBody>
      ))}

      {specs.map((s, i) => {
        const w = PINS.weight[s.weight];
        const lift = PINS.card.sink; // colliders start at the snow; the drawing sinks a little into it
        return (
          <RigidBody
            key={s.key}
            ref={(b) => {
              bodies.current[i] = b;
            }}
            type={entry.arrive ? "kinematicPosition" : "dynamic"}
            colliders={false}
            name="pin"
            position={[s.home.x, s.home.y, s.home.z]}
            rotation={[0, s.home.yaw, 0]}
            ccd
            canSleep
            linearDamping={w.linearDamping}
            angularDamping={w.angularDamping}
            onCollisionEnter={handlers[i]}
          >
            <CuboidCollider
              args={s.card}
              position={[0, lift + s.card[1], 0]}
              mass={w.mass * (1 - w.footShare)}
              friction={w.friction}
              restitution={w.restitution}
            />
            <CuboidCollider
              args={s.foot}
              position={[0, lift + s.foot[1], 0]}
              mass={w.mass * w.footShare}
              friction={w.friction}
              restitution={w.restitution}
            />
            <group
              ref={(g) => {
                visuals.current[i] = g;
              }}
              visible={!entry.arrive}
            >
              <PinCard id={s.id} width={s.width} height={s.height} depth={s.depth} flip={s.flip} art={textures[s.id]} paper={paper} artOnBack={PINS.card.artOnBack} />
            </group>
          </RigidBody>
        );
      })}
    </>
  );
});
