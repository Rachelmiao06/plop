/**
 * A headless replay of one throw, for measuring which shots score best (`npm run measure`, see README).
 * Not used by the game. It runs the real bowling roll (`planRoll` / `stepRoll` from bowling, the same code
 * the aim line and the game use) and rebuilds the pins' Rapier world the way `PinsStage` does: the same card
 * and foot colliders, masses, damping, caps, the extra shove on first touch, the burst once the ball is
 * through, and the same "settled" rule for the count. Differences: the snow is flat (the drawn drifts near the
 * pins are a few hundredths of a unit), no hit-stop (it only slows time), and old grooves are not simulated.
 */
import RAPIER from "@dimforge/rapier3d-compat";

import { FEEL, planRoll, ROLL_STEP, stepRoll, type Feel, type Ground, type RollPlan } from "@/features/bowling";
import { PINS, type Formation } from "@/features/pins";
import { buildPins, type GroundPatch } from "@/features/pins/layout";

export type Shot = {
  /** Where the thrower stands on the line. */
  x: number;
  /** How hard the pull is, 0..1 (0 = just past cancel, 1 = full). */
  power: number;
  /** Aim angle in degrees, + = to the right (toward +x). */
  angle: number;
};

export type ThrowResult = { downs: boolean[]; plan: RollPlan };

let ready: Promise<void> | null = null;
export const initPhysics = () => (ready ??= RAPIER.init());

const flat: GroundPatch = {
  cx: FEEL.lane.pinSpot.x,
  cz: FEEL.lane.pinSpot.z,
  span: PINS.ground.span,
  cells: 1,
  heights: new Float32Array(4),
  min: 0,
  at: () => 0,
};

const DEG = Math.PI / 180;
const tiltOf = (q: { x: number; y: number; z: number; w: number }) =>
  Math.acos(Math.max(-1, Math.min(1, 1 - 2 * (q.x * q.x + q.z * q.z)))) / DEG;

/** The pull for a shot, the way a player would make it (size grows with the pull on fresh snow). */
export function planShot(shot: Shot, feel: Feel = FEEL, ground: Ground = { packedAt: () => 0 }, wobble = 0) {
  const { max, cancelBelow, beside: b } = feel.pull;
  const pulled = cancelBelow + 0.001 + shot.power * (max - cancelBelow - 0.001);
  const size = Math.min(1, pulled / max);
  const radius = feel.ball.radiusSmall + (feel.ball.radiusBig - feel.ball.radiusSmall) * Math.pow(size, feel.ball.growthCurve);
  const a = (Math.max(-feel.pull.maxAimDegrees, Math.min(feel.pull.maxAimDegrees, shot.angle)) + wobble) * DEG;
  // Rolling toward (sin a, -cos a) means pulling the other way.
  const back = { x: -Math.sin(a), z: Math.cos(a) };
  const pull = { x: back.x * pulled, z: back.z * pulled };
  const side = shot.x > b.middle ? -1 : 1;
  const aside = (b.base + b.share * radius) * Math.min(1, pulled / b.rampOver) * side;
  const beside = { x: back.z * aside, z: -back.x * aside };
  return planRoll({ x: shot.x, z: feel.lane.lineZ }, pull, size, radius, feel, ground, beside);
}

/** The aim angle that sends the ball's path through `targetX` at the pin spot's depth, from `x` at `power`. */
export function aimAt(x: number, targetX: number, power: number, feel: Feel = FEEL): number {
  let angle = 0;
  for (let k = 0; k < 6; k++) {
    const plan = planShot({ x, power, angle }, feel, { packedAt: () => 0 });
    if (!plan) return 0;
    const dz = plan.start.z - feel.lane.pinSpot.z;
    const want = Math.atan2(targetX - plan.start.x, dz) / DEG;
    angle = want;
  }
  return angle;
}

/** Simulate one throw at a formation. `pinShift` moves the whole set sideways (round sets carry their own). */
export function simulateThrow(formation: Formation, plan: RollPlan, feel: Feel = FEEL, ground: Ground = { packedAt: () => 0 }): ThrowResult {
  const world = new RAPIER.World({ x: 0, y: PINS.world.gravity, z: 0 });
  world.timestep = 1 / PINS.world.stepsPerSecond;
  const events = new RAPIER.EventQueue(true);

  // The snow: flat, top at y = 0.
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(flat.cx, -0.5, flat.cz));
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40).setFriction(PINS.ground.friction).setRestitution(PINS.ground.restitution), floor);

  const specs = buildPins(formation, flat);
  const lift = PINS.card.sink;
  const bodies = specs.map((s) => {
    const w = PINS.weight[s.weight];
    const q = { x: 0, y: Math.sin(s.home.yaw / 2), z: 0, w: Math.cos(s.home.yaw / 2) };
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(s.home.x, s.home.y, s.home.z)
        .setRotation(q)
        .setLinearDamping(w.linearDamping)
        .setAngularDamping(w.angularDamping)
        .setCcdEnabled(true)
        .setCanSleep(true),
    );
    for (const [half, mass] of [
      [s.card, w.mass * (1 - w.footShare)],
      [s.foot, w.mass * w.footShare],
    ] as const) {
      world.createCollider(
        RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2])
          .setTranslation(0, lift + half[1], 0)
          .setMass(mass)
          .setFriction(w.friction)
          .setRestitution(w.restitution)
          .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
      );
    }
    return body;
  });
  const owner = new Map<number, number>();
  bodies.forEach((b, i) => {
    for (let k = 0; k < b.numColliders(); k++) owner.set(b.collider(k).handle, i);
  });

  const ballBody = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(plan.start.x, plan.radius, plan.start.z));
  const ballCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(plan.radius * PINS.ball.radiusShare).setFriction(0.4).setRestitution(0.1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    ballBody,
  );

  const roll = { position: { ...plan.start }, speed: plan.startSpeed, rolled: 0, age: 0 };
  let rolling = true;
  let moving = plan.startSpeed;
  let bursting: number | null = null;
  const struck = new Set<number>();
  const downs = specs.map(() => false);
  const dt = world.timestep;
  let clock = 0;
  let clearAt: number | null = null;
  let settledFor = 0;
  const d = PINS.down;

  for (let stepN = 0; stepN < PINS.world.stepsPerSecond * d.timeoutAfterLaunch; stepN++) {
    // The ball: the bowling roll at its own fixed step.
    for (let k = 0; k < Math.round(dt / ROLL_STEP); k++) {
      if (!rolling) break;
      if (!stepRoll(roll, plan, feel, ground)) {
        rolling = false;
        moving = 0;
      } else {
        const s = feel.roll.snap;
        const u = Math.min(1, roll.age / s.time);
        moving = roll.speed * (s.from + (1 - s.from) * (1 - (1 - u) * (1 - u)));
      }
    }
    if (bursting !== null) bursting += dt;
    const fade = bursting !== null ? 1 - Math.min(1, bursting / feel.roll.burstTime) ** 2 : 1;
    ballCollider.setRadius(Math.max(0.005, plan.radius * fade * PINS.ball.radiusShare));
    ballCollider.setSensor(bursting !== null);
    ballBody.setNextKinematicTranslation({ x: roll.position.x, y: plan.radius * fade * (1 - feel.ball.sink), z: roll.position.z });

    world.step(events);
    clock += dt;

    events.drainCollisionEvents((h1, h2, started) => {
      if (!started || bursting !== null) return;
      const other = h1 === ballCollider.handle ? h2 : h2 === ballCollider.handle ? h1 : null;
      if (other === null) return;
      const i = owner.get(other);
      if (i === undefined || struck.has(i)) return;
      struck.add(i);
      const body = bodies[i];
      const im = PINS.impact;
      const dir = plan.direction;
      const m = body.mass();
      const v = moving;
      body.applyImpulse({ x: dir.x * im.push * m * v, y: im.lift * m, z: dir.z * im.push * m * v }, true);
      const r = body.rotation();
      const ax = 1 - 2 * (r.y * r.y + r.z * r.z);
      const az = 2 * (r.x * r.z - r.w * r.y);
      const back = -im.faceUp * m * v;
      body.applyTorqueImpulse({ x: dir.z * im.tumble * m * v + ax * back, y: 0, z: -dir.x * im.tumble * m * v + az * back }, true);
    });

    // After the step: caps, the count, settled.
    let still = true;
    let anyNew = false;
    bodies.forEach((b, i) => {
      const c = PINS.caps;
      const v = b.linvel();
      const flatV = Math.hypot(v.x, v.z);
      let { x, y, z } = v;
      let capped = false;
      if (flatV > c.linear) {
        x *= c.linear / flatV;
        z *= c.linear / flatV;
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
      const loose = isDown ? d.lyingShare : 1;
      if (!b.isSleeping() && (Math.hypot(x, y, z) > d.settleSpeed * loose || spin > d.settleSpin * loose)) still = false;
      if (isDown && !downs[i]) anyNew = true;
      downs[i] = isDown;
    });
    void anyNew;
    settledFor = still ? settledFor + dt : 0;

    // The burst: past every card's foot, or slow among them.
    if (bursting === null) {
      const B = PINS.burst;
      let past = true;
      let near = false;
      const dir = plan.direction;
      for (const b of bodies) {
        const t = b.translation();
        if ((roll.position.x - t.x) * dir.x + (roll.position.z - t.z) * dir.z < plan.radius + B.pastMargin) past = false;
        if (Math.hypot(roll.position.x - t.x, roll.position.z - t.z) < plan.radius + 0.5 + B.amongMargin) near = true;
      }
      if (past || (near && moving < B.slowSpeed) || (!rolling && !near)) bursting = 0;
    }
    const clear = bursting !== null || !rolling;
    if (clear && clearAt === null) clearAt = clock;
    if ((clear && settledFor >= d.settleHold) || (clearAt !== null && clock - clearAt > d.timeoutAfterClear)) break;
  }
  world.free();
  events.free();
  return { downs, plan };
}
