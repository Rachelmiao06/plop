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
import {
  Euler,
  Quaternion,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type Texture,
} from "three";

import { playNearMiss, playStarHit, playThump } from "@/lib/audio";
import { haptic } from "@/lib/haptics";

import { FEEL, type BowlEvent, type Bowling } from "@/features/bowling";
import { propSettings, propSrc, propWidth } from "@/features/scenery";
import { standee3d } from "@/features/scenery/content";
import { toonMaterial } from "@/features/scenery/three/materials";
import { freshSnowfallAt, useSnow } from "@/features/snow-scene";

import { currentBowlings, tapBowling } from "./ballTap";
import { MOUND, PINS, SPECIALS } from "./content";
import { nextFormationId, type Pins, type PinsPhase } from "./controller";
import { playFwump, unlockFwumpOnFirstTouch } from "./fwump";
import { buildPins, formationById, moundsOf, pinPropIds, sampleGround, type PinSpec } from "./layout";
import { countByThrower, countThrow, countedCards } from "./scoring";
import { PinCard, type PaperColors } from "./PinCard";

/** Same as the bowling stage's ball limit. */
const MAX_BALLS = 6;
/** Where unused ball colliders wait, far under the snow. */
const PARK_Y = -40;
const DEG = Math.PI / 180;
const UP = new Vector3(0, 1, 0);
/** The heap under a fallen card: a soft half dome, scaled to size each frame (same shape as the scenery's mound). */
const heapGeometry = new SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2);
/** The star doodle a star friend carries above its head (Rachel's effect art). */
const STAR_SRC = "/assets/effects/star.webp";
/** A soft mound on the lane is Rachel's snow-mound cut-out (the village's), as a thick card like the pins. */
const MOUND_ART = "mound-snow";
/** Its key among the pin textures (loaded together, so they share one Suspense and colour setup). */
const STAR_KEY = "__star";
/** The drawing light all paper shading comes from (same as the scenery look and PinCard). */
const drawingLight = new Vector3(...standee3d.shading.from).normalize();

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
  /** How far the drawing of a fallen card is propped up off the snow (radians, drawing only). */
  lift: number;
  /** When a star card went down (for its star's pop), on the pins clock. */
  starAt?: number;
  /** Its sparkle sound has played in this throw. */
  sparkled?: boolean;
  /** Whose card it is this throw: the thrower whose ball (or a card that ball knocked) touched it first. */
  by?: string;
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
  const urls = useMemo(
    () => ({ ...Object.fromEntries(pinPropIds().map((id) => [id, propSrc(id)])), [MOUND_ART]: propSrc(MOUND_ART), [STAR_KEY]: STAR_SRC }),
    [],
  );
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

/** Distance on the ground from (x, z) to the segment from (ax, az) to (bx, bz). */
function segmentDistance(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax;
  const vz = bz - az;
  const len = vx * vx + vz * vz;
  const t = len > 1e-9 ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / len)) : 0;
  return Math.hypot(x - (ax + vx * t), z - (az + vz * t));
}

/** A new throw: nothing is down or landed yet. */
function clearCounts(list: PinRuntime[]) {
  for (const rt of list) {
    rt.down = false;
    rt.landed = false;
    rt.struck = false;
    rt.sparkled = false;
    rt.by = undefined;
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
  const formation = useMemo(() => formationById(entry.id), [entry.id]);
  const specs = useMemo(() => buildPins(formation, ground), [formation, ground]);
  /** Cards that count (friends do not). */
  const counted = useMemo(() => countedCards(formation), [formation]);
  const mounds = useMemo(() => moundsOf(formation), [formation]);
  const moundArt = useMemo(() => ({ width: propWidth(MOUND_ART), height: propSettings(MOUND_ART)?.height ?? 1 }), []);
  /** Each mound's drawing, and how flat it is pressed (1 = full height) and how grown in (0..1). */
  const moundMeshes = useRef<(Group | null)[]>([]);
  const moundState = useRef<{ flat: number; grow: number; puffed: boolean }[]>([]);
  // Drawn as is, like the cut-outs: no lighting, no tone mapping.
  const starMaterial = useMemo(
    () => new SpriteMaterial({ map: textures[STAR_KEY], toneMapped: false, transparent: true, depthWrite: false }),
    [textures],
  );
  useEffect(() => () => starMaterial.dispose(), [starMaterial]);
  const stars = useRef<(Sprite | null)[]>([]);

  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const visuals = useRef<(Group | null)[]>([]);
  const runtime = useRef<PinRuntime[]>([]);
  /** Which set `runtime` was made for (it is replaced in an effect, a moment after the new set mounts). */
  const runtimeFor = useRef<string | null>(null);
  /** The group inside each card's drawing that props it up when it lies fallen, and its heap of snow. */
  const lifts = useRef<(Group | null)[]>([]);
  const heaps = useRef<(Mesh | null)[]>([]);
  const heapMaterial = useMemo(
    () => toonMaterial({ base: paper.paper, shade: paper.shade, light: drawingLight, band: standee3d.shading.band }),
    [paper],
  );
  useEffect(() => () => heapMaterial.dispose(), [heapMaterial]);
  const ballBodies = useRef<(RapierRigidBody | null)[]>([]);
  const ballColliders = useRef<(RapierCollider | null)[]>([]);
  const flow = useRef({
    phase: "ready" as PinsPhase,
    clock: 0,
    /** When the current phase started. */
    since: 0,
    launchedAt: 0,
    /** When every ball of the throw was through the pins (burst or stopped clear of them); null while one still rolls among them. */
    clearAt: null as number | null,
    settledFor: 0,
    activeBalls: new Set<number>(),
    /** Balls thrown in the throw being counted; only these (and rolling ones) push cards. */
    throwBalls: new Set<number>(),
    /** A throw came in while the set was resetting or changing: count it once they stand. */
    pendingThrow: false,
    /** The game asked for this set once the result on show has been seen (`changeAfterResult`). */
    after: null as string | null,
    /** The set that is ducking out: once every card is under the snow, this one mounts. */
    nextFormation: null as string | null,
    /** The set that just mounted hidden and should hop in. */
    arriveFor: null as string | null,
    fullClear: false,
    /** The bowling games on the line (two in "together" mode), and their event listeners. */
    games: [] as Bowling[],
    offs: [] as (() => void)[],
    off: null as null | (() => void),
    /** Ball id → collider slot, so a ball never jumps from one slot to another. */
    slots: new Map<number, number>(),
    /** Ball id → the height it came to rest at. A resting ball stays put even when landing cards dent the snow under it. */
    restY: new Map<number, number>(),
    groundChecked: false,
    /** The ball has met a card in this throw (the hit-stop plays once per throw). */
    hitThisThrow: false,
    /**
     * When a ball of this throw first met a card, or first rolled past them all (null: not yet). The count comes at
     * the latest `FEEL.wall.countWithin` after it, even while a ball is still rolling back from the wall.
     */
    reachedAt: null as number | null,
    /** Balls of this throw that have rolled past every card at least once (on to the back wall, maybe back again). */
    wentPast: new Set<number>(),
    /** Who threw in this throw (thrower ids), and the latest one (owner of a card nobody touched). */
    throwers: new Set<string>(),
    lastThrower: "",
    /** The closest a ball of this throw came to a friend (gap between their edges), for the near-miss mew. */
    friendGap: Infinity,
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
      lift: 0,
    }));
    runtimeFor.current = entry.id;
    moundState.current = mounds.map(() => ({ flat: 1, grow: entry.arrive ? 0 : 1, puffed: false }));
    if (!entry.arrive) pins.emit({ type: "ready", formation: entry.id, total: counted });
  }, [specs, entry, pins, counted, mounds]);

  useEffect(() => {
    tapBowling();
    const stopUnlock = unlockFwumpOnFirstTouch();
    const f = flow.current;
    return () => {
      stopUnlock();
      f.offs.forEach((off) => off());
      f.offs = [];
      f.games = [];
    };
  }, []);

  /** Every ball on the lane, from every bowling game, with the game it belongs to. */
  const allBalls = () => flow.current.games.flatMap((game) => game.balls.map((ball) => ({ ball, game })));
  /** The ball whose collider is in this slot. */
  const ballInSlot = (slot: number) => {
    const f = flow.current;
    for (const [id, k] of f.slots) {
      if (k !== slot) continue;
      for (const game of f.games) {
        const ball = game.balls.find((b) => b.id === id);
        if (ball) return { ball, game };
      }
    }
    return null;
  };

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
    f.clearAt = null;
    f.settledFor = 0;
    f.pendingThrow = false;
    f.hitThisThrow = false;
    f.reachedAt = null;
    f.wentPast.clear();
    f.friendGap = Infinity;
    clearCounts(runtime.current);
    pins.emit({ type: "knocked", down: 0, total: counted });
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
    pins.emit({ type: "ready", formation: entry.id, total: counted });
    // The mounds are back to full height for the next throw.
    moundState.current = moundState.current.map((m) => ({ ...m, flat: 1, puffed: false }));
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
    const downs = runtime.current.map((rt) => rt.down);
    const result = countThrow(formation, downs);
    // Two throwers at once: each card counts for whoever's ball reached it first.
    if (f.throwers.size > 1) {
      result.byThrower = countByThrower(formation, downs, runtime.current.map((rt) => rt.by), [...f.throwers], f.lastThrower);
    }
    f.throwers.clear();
    const { down, fullClear } = result;
    // The ball came close to the bunny and it is still standing: a tiny surprised mew.
    if (result.friend === "safe" && f.friendGap < SPECIALS.friend.nearMiss) playNearMiss();
    f.fullClear = fullClear;
    // A ball still rolling back from the wall poofs now, so nothing knocks a card after the count.
    for (const { ball, game } of allBalls()) if (f.throwBalls.has(ball.id) && ball.rolling) game.burst(ball.id);
    f.throwBalls.clear();
    pins.emit({ type: "result", result });
    // The pop-up's beat you feel: a celebration on a full clear, a small double tap otherwise.
    if (fullClear) haptic("fullClear");
    else if (down > 0) haptic("down");
    setPhase("result");
  };

  /** The result has been seen: a new set (the game's next round, or free play after a full clear), or pop back up. */
  const afterResult = () => {
    const f = flow.current;
    if (f.after) {
      const id = f.after;
      f.after = null;
      startChange(id);
    } else if (f.fullClear && pins.autoNext) startChange(nextFormationId(entry.id));
    else startReset();
  };

  /* ---------------- bowling events ---------------- */

  const onBowl = (e: BowlEvent) => {
    const f = flow.current;
    if (e.type === "launched") {
      f.throwers.add(e.thrower);
      f.lastThrower = e.thrower;
      f.activeBalls.add(e.ballId);
      f.throwBalls.add(e.ballId);
      if (f.phase === "ready") startThrow();
      else if (f.phase === "throw") f.clearAt = null;
      else {
        f.pendingThrow = true;
        if (f.phase === "result") afterResult();
      }
    } else if (e.type === "stopped" || e.type === "removed") {
      f.activeBalls.delete(e.ballId);
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
        const otherName = e.other.rigidBodyObject?.name ?? "";
        // Another card falling onto this one: it was knocked by the same ball (for "whose card is it").
        if (otherName.startsWith("pin-")) {
          const rt = runtime.current[i];
          const other = runtime.current[Number(otherName.slice(4))];
          if (rt && other?.by && !rt.by && f.phase === "throw") rt.by = other.by;
          return;
        }
        if (otherName.startsWith("ball-")) {
          const slot = Number(otherName.slice(5));
          const hit = ballInSlot(slot);
          const ball = hit?.ball;
          const game = hit?.game;
          const rt = runtime.current[i];
          const body = e.target.rigidBody;
          if (!ball || !game || f.phase !== "throw" || !rt || !body || rt.anim) return;
          // The first ball to touch a card makes it that thrower's card ("together" mode counts per player).
          if (!rt.by) rt.by = ball.thrower;
          // A bit more energy than the plain push: a shove, a lift and a tumble, once per card.
          if (!rt.struck) {
            rt.struck = true;
            const im = PINS.impact;
            const d = ball.direction;
            const m = body.mass();
            const v = ball.speed;
            body.applyImpulse({ x: d.x * im.push * m * v, y: im.lift * m, z: d.z * im.push * m * v }, true);
            // Plus a tip backward about the card's own width (away from the throwing line), so it lands face-up.
            const r = body.rotation();
            const across = new Vector3(1, 0, 0).applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w));
            const back = -im.faceUp * m * v;
            body.applyTorqueImpulse(
              {
                x: d.z * im.tumble * m * v + across.x * back,
                y: (Math.random() * 2 - 1) * im.twist * m * v,
                z: -d.x * im.tumble * m * v + across.z * back,
              },
              true,
            );
          }
          // The ball meets the first card of the throw: a hit-stop, a thump and a bump you feel.
          if (!f.hitThisThrow) {
            f.hitThisThrow = true;
            if (f.reachedAt === null) f.reachedAt = f.clock;
            const h = PINS.hitStop;
            const size = ball.plan.size;
            game.hitStop(h.seconds + h.bigExtra * size, h.slowest + (h.bigSlowest - h.slowest) * size);
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
    const live = new Set<number>();
    for (const { ball, game } of allBalls()) {
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
      if (!body || !collider) continue;
      const bursting = ball.bursting !== null;
      const fade = bursting
        ? 1 - clamp01(ball.bursting! / game.feel.roll.burstTime) ** 2
        : ball.rolling
          ? 1
          : clamp01((game.feel.roll.restTime - ball.restAge) / PINS.ball.fadeTime);
      const r = ball.plan.radius * fade;
      collider.setRadius(Math.max(0.005, r * PINS.ball.radiusShare));
      // Only a rolling ball, or one still part of the throw being counted, pushes cards; a bursting one never.
      const pushes = !bursting && (ball.rolling || (f.phase === "throw" && f.throwBalls.has(ball.id)));
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

  /**
   * The balls of this throw roll on through the pins to the back wall and may roll back through them (Rachel: it
   * should go all the way to the back), so a ball no longer poofs as soon as it is through. It bursts into snow
   * when it slows down among the cards, or anywhere once it has been past them all (so it never parks over the
   * fallen cards seen from the low camera), and the count bursts any still rolling (`finishThrow`).
   * True once none of them can touch a card any more (burst or stopped).
   */
  const cardEnd = useMemo(() => new Vector3(), []);
  const scratchQ = useMemo(() => new Quaternion(), []);
  const ballsThrough = (): boolean => {
    const f = flow.current;
    const B = PINS.burst;
    let clear = true;
    for (const { ball, game } of allBalls()) {
      if (!f.throwBalls.has(ball.id) || ball.bursting !== null) continue;
      const r = ball.plan.radius;
      const bx = ball.position.x;
      const bz = ball.position.z;
      let past = true;
      let near = false;
      specs.forEach((s, i) => {
        const b = bodies.current[i];
        if (!b || runtime.current[i]?.hidden) return;
        const t = b.translation();
        const q = b.rotation();
        // The card on the ground: from its foot to where its head is now (upright, that is the foot again).
        cardEnd.set(0, s.height, 0).applyQuaternion(scratchQ.set(q.x, q.y, q.z, q.w));
        const hx = t.x + cardEnd.x;
        const hz = t.z + cardEnd.z;
        // Past it down the lane (toward the back wall): beyond its foot and wherever its head lies.
        if (bz > Math.min(t.z, hz) - r - B.pastMargin) past = false;
        if (segmentDistance(bx, bz, t.x, t.z, hx, hz) < r + s.card[0] + B.amongMargin) near = true;
      });
      if (past && !f.wentPast.has(ball.id)) {
        f.wentPast.add(ball.id);
        if (f.reachedAt === null) f.reachedAt = f.clock;
      }
      // Slow among the cards: poof now. Back from the wall: once it is nearly still (or has stopped).
      const settled = !ball.rolling || ball.speed < FEEL.wall.poofBelow;
      if ((near && ball.speed < B.slowSpeed) || (f.wentPast.has(ball.id) && settled)) game.burst(ball.id);
      else if (ball.rolling) clear = false;
    }
    return clear;
  };

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
      const isDown = tiltOf(b.rotation()) > d.tiltDegrees;
      // A card lying in the snow can no longer change the count, so it may still slide a little.
      const loose = isDown && rt.landed ? d.lyingShare : 1;
      if (!b.isSleeping() && (Math.hypot(x, y, z) > d.settleSpeed * loose || spin > d.settleSpin * loose)) moving = true;

      if (f.phase === "throw" && isDown && !rt.down) {
        newlyDown = true;
        // A star friend tipping over: a little rising sparkle (once a throw, even if it rocks).
        if (specs[i]?.kind === "star" && !rt.sparkled) {
          rt.sparkled = true;
          playStarHit();
        }
      }
      if (f.phase === "throw") rt.down = isDown;
    });
    if (f.phase !== "throw") return;
    for (const { ball } of allBalls()) {
      if (!f.throwBalls.has(ball.id) || ball.bursting !== null) continue;
      specs.forEach((s, i) => {
        if (s.kind !== "friend" || runtime.current[i]?.down) return;
        const gap = Math.hypot(ball.position.x - s.home.x, ball.position.z - s.home.z) - ball.plan.radius - s.card[0];
        if (gap < f.friendGap) f.friendGap = gap;
      });
    }
    if (newlyDown) {
      pins.emit({ type: "knocked", down: runtime.current.filter((rt, i) => rt.down && specs[i]?.kind !== "friend").length, total: counted });
    }
    f.settledFor = moving ? 0 : f.settledFor + dt;
    const clear = ballsThrough();
    if (clear && f.clearAt === null) f.clearAt = f.clock;
    if (!clear) f.clearAt = null;
    const timedOut =
      (f.clearAt !== null && f.clock - f.clearAt > d.timeoutAfterClear) ||
      (f.reachedAt !== null && f.clock - f.reachedAt > FEEL.wall.countWithin) ||
      f.clock - f.launchedAt > d.timeoutAfterLaunch;
    // The count is certain once no ball can reach a card and the cards are still: "N down!" pops now.
    // "Together" mode waits until every player has thrown before it counts (`pins.setCountGate`).
    if (((clear && f.settledFor >= d.settleHold) || timedOut) && pins.countGate()) finishThrow();
  });

  /* ---------------- a fallen card rests propped up on a little heap ---------------- */

  const prop = useMemo(() => ({ q: new Quaternion(), inv: new Quaternion(), up: new Vector3(), axis: new Vector3(), along: new Vector3() }), []);
  /**
   * Drawing only: a card lying in the snow lifts its head (turning on its bottom edge) until it rests
   * `rest.elevationDegrees` off the snow, on a heap of snow, so it stays readable from the low camera.
   */
  const propUp = (s: PinSpec, i: number, b: RapierRigidBody, rt: PinRuntime, dt: number) => {
    const lifted = lifts.current[i];
    const heap = heaps.current[i];
    if (!lifted || !heap) return;
    const R = PINS.rest;
    const r = b.rotation();
    prop.q.set(r.x, r.y, r.z, r.w);
    // The card's own up (bottom to head) in the world, and its height off the snow as an angle.
    prop.along.copy(UP).applyQuaternion(prop.q);
    const elevation = Math.asin(Math.max(-1, Math.min(1, prop.along.y)));
    const lying = rt.landed && rt.down && !rt.anim && !rt.hidden && b.isDynamic();
    const goal = lying ? Math.max(0, Math.min(R.elevationDegrees * DEG - elevation, (R.elevationDegrees + 12) * DEG)) : 0;
    // Back down quickly when it pops up again, so the hop starts from the card itself.
    const rate = lying ? R.rate : R.rate * 4;
    rt.lift += (goal - rt.lift) * (1 - Math.exp(-rate * dt));
    if (rt.lift < 1e-3) {
      rt.lift = 0;
      if (heap.visible) {
        heap.visible = false;
        lifted.quaternion.identity();
      }
      return;
    }
    // Turn about the bottom edge, toward the sky: the axis is across the card, at right angles to world up.
    prop.up.copy(UP).applyQuaternion(prop.inv.copy(prop.q).invert());
    prop.axis.set(0, 1, 0).cross(prop.up);
    if (prop.axis.lengthSq() < 0.04) {
      lifted.quaternion.identity();
      heap.visible = false;
      return;
    }
    lifted.quaternion.setFromAxisAngle(prop.axis.normalize(), rt.lift);

    // The heap: under the lifted part, as tall as the gap it props up there.
    const t = b.translation();
    const flat = Math.hypot(prop.along.x, prop.along.z);
    if (flat < 0.2) {
      heap.visible = false;
      return;
    }
    const H = R.heap;
    const reach = s.height * H.at;
    const x = t.x + (prop.along.x / flat) * reach;
    const z = t.z + (prop.along.z / flat) * reach;
    const shown = Math.min(1, rt.lift / (6 * DEG));
    const tall = H.fill * reach * Math.sin(elevation + rt.lift) * shown;
    heap.visible = tall > 0.005;
    heap.position.set(x, snow.heightAt(x, z) - 0.01, z);
    heap.rotation.set(0, Math.atan2(prop.along.x, prop.along.z), 0);
    heap.scale.set(((s.width * H.widthShare) / 2) * shown, Math.max(0.001, tall), ((s.height * H.lengthShare) / 2) * shown);
  };

  /* ---------------- every frame ---------------- */

  const scratch = useMemo(() => ({ p: new Vector3(), q: new Quaternion() }), []);

  useFrame((_, delta) => {
    const f = flow.current;
    // Hit-stop: while the bowling game runs slow, pause the physics and step it by hand with slowed time.
    const scale = f.games.reduce((least, g) => Math.min(least, g.timeScale), 1);
    const slowing = scale < 1;
    if (slowing !== f.slowing) {
      f.slowing = slowing;
      setSlowed(slowing);
    }
    if (isPaused) stepPhysics(Math.min(delta, 0.1) * scale);
    const dt = Math.min(delta, 0.1) * scale;
    f.clock += dt;

    // Follow every bowling game that is running (one, or two side by side in "together" mode).
    const games = currentBowlings();
    if (games.length !== f.games.length || games.some((g, k) => g !== f.games[k])) {
      f.offs.forEach((off) => off());
      f.games = games;
      f.offs = games.map((g) => g.subscribe((e) => onBowlRef.current(e)));
    }

    // Asked by the page.
    for (const cmd of pins.takeCommands()) {
      if (cmd.type === "reset" && (f.phase === "ready" || f.phase === "throw" || f.phase === "result")) startReset();
      if (cmd.type === "next" && f.phase !== "changing") startChange(nextFormationId(entry.id));
      if (cmd.type === "formation" && f.phase !== "changing" && cmd.id !== entry.id) startChange(cmd.id);
      if (cmd.type === "after") {
        // Standing and waiting: change now. Otherwise once the result has been seen.
        if (f.phase === "ready" && cmd.id !== entry.id) startChange(cmd.id);
        else if (f.phase !== "ready") f.after = cmd.id === entry.id ? null : cmd.id;
      }
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
      const changing = f.after !== null || (f.fullClear && pins.autoNext);
      const wait = f.fullClear ? PINS.nextSet.delayAfterFullClear : PINS.reset.delayAfterResult;
      const ballOnSpots =
        !changing &&
        allBalls().some(({ ball }) =>
          specs.some((s) => Math.hypot(ball.position.x - s.home.x, ball.position.z - s.home.z) < ball.plan.radius + s.card[0]),
        );
      const waited = f.clock - f.since;
      if (waited > wait && (!ballOnSpots || waited > wait + PINS.reset.waitForBallMax)) afterResult();
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

      propUp(s, i, b, rt, dt);

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

    // The star friends: a gentle bob and rock above their heads, and a pop when their card goes down.
    const st = SPECIALS.star;
    specs.forEach((s, i) => {
      const star = stars.current[i];
      const rt = runtime.current[i];
      if (!star || !rt) return;
      const t = f.clock * st.bobSpeed * Math.PI * 2 + i;
      const popped = rt.down ? 1 + st.pop * Math.exp(-6 * Math.max(0, f.clock - (rt.starAt ?? f.clock))) : 1;
      if (rt.down && rt.starAt === undefined) rt.starAt = f.clock;
      if (!rt.down) rt.starAt = undefined;
      star.position.y = s.height + st.above + st.size / 2 + Math.sin(t) * st.bob * motion;
      star.scale.setScalar(st.size * popped);
      (star.material as SpriteMaterial).rotation = Math.sin(t * 0.5) * st.rock * DEG * motion;
    });

    // The soft mounds: grow in with a new set, sink away when it leaves, and press flat where a ball ploughs through.
    mounds.forEach((m, k) => {
      const mesh = moundMeshes.current[k];
      const ms = moundState.current[k];
      if (!mesh || !ms) return;
      const leaving = f.phase === "changing" && f.nextFormation !== null;
      const arriving = f.arriveFor === entry.id;
      ms.grow += ((leaving || arriving ? 0 : 1) - ms.grow) * (1 - Math.exp(-6 * dt));
      for (const { ball } of allBalls()) {
        if (!f.throwBalls.has(ball.id) && !ball.rolling) continue;
        if (Math.hypot(ball.position.x - m.x, ball.position.z - m.z) > m.radius + ball.plan.radius * 0.5) continue;
        ms.flat += (MOUND.flatten - ms.flat) * (1 - Math.exp(-MOUND.flattenRate * dt));
        if (!ms.puffed && ball.rolling) {
          ms.puffed = true;
          snow.kickUpSnow(m.x, m.z, m.radius * 0.8, {
            amount: MOUND.puff * motion,
            velocityX: ball.direction.x * 2,
            velocityZ: ball.direction.z * 2,
          });
        }
      }
      const g = Math.max(0.001, ms.grow);
      mesh.visible = ms.grow > 0.01;
      mesh.position.set(m.x, snow.heightAt(m.x, m.z) - MOUND.sink, m.z);
      mesh.scale.set(g, Math.max(0.001, g * ms.flat), g);
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
          name={`ball-${k}`}
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

      {specs.map((s, i) => (
        <mesh
          key={`heap-${s.key}`}
          ref={(m) => {
            heaps.current[i] = m;
          }}
          geometry={heapGeometry}
          material={heapMaterial}
          visible={false}
        />
      ))}

      {mounds.map((m, k) => {
        // As wide as the mound; height from the drawing's shape.
        const width = m.radius * 2 * MOUND.widthShare;
        const height = (width * moundArt.height) / moundArt.width;
        return (
          <group
            key={`mound-${entry.id}-${k}`}
            ref={(g) => {
              moundMeshes.current[k] = g;
            }}
            visible={false}
          >
            <PinCard id={MOUND_ART} width={width} height={height} depth={Math.max(0.02, height * PINS.card.thicknessShare)} flip={k % 2 === 1} art={textures[MOUND_ART]} paper={paper} artOnBack={false} />
          </group>
        );
      })}

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
            name={`pin-${i}`}
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
              <group
                ref={(g) => {
                  lifts.current[i] = g;
                }}
              >
                <PinCard id={s.id} width={s.width} height={s.height} depth={s.depth} flip={s.flip} art={textures[s.id]} paper={paper} artOnBack={PINS.card.artOnBack} />
                {s.kind === "star" && (
                  <sprite
                    ref={(sp) => {
                      stars.current[i] = sp;
                    }}
                    material={starMaterial}
                    position={[0, s.height + SPECIALS.star.above + SPECIALS.star.size / 2, 0]}
                    scale={SPECIALS.star.size}
                  />
                )}
              </group>
            </group>
          </RigidBody>
        );
      })}
    </>
  );
});
