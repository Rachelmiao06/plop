/**
 * The bowling throw, with no drawing, sound or input in it.
 * One thrower stands on the throwing line, slides to a spot, pulls back (the ball
 * grows), lets go, and the ball rolls down the lane until it stops.
 * Step it with `step(seconds)`; feed it slides and pull targets; read its state; listen to its events.
 */
import type { Feel } from "./content";
import { FRESH_SNOW, type Ground, ROLL_STEP, type RollPlan, planRoll, stepRoll } from "./roll";
import { type Vec2, add, clamp01, distance, ease, length, lerp, scale, sub } from "./vec";

/** ready (sliding allowed) → pulling → thrown (a little hop) → ready. */
export type ThrowerPhase = "ready" | "pulling" | "thrown";

/** The snowball while it is being pulled back behind the thrower. */
export type PulledBall = {
  /** Centre of the ball, on the ground. */
  position: Vec2;
  radius: number;
  /** Growth 0..1. Only goes up. */
  size: number;
  /** Farthest pull reached so far (capped at full pull). */
  reach: number;
  /** Smoothed velocity along the ground (units per second) and its length. */
  velocity: Vec2;
  speed: number;
  /** Total distance rolled. Spin angle for a renderer = rolled / radius. */
  rolled: number;
  /** Unit direction of the latest roll. */
  rollDirection: Vec2;
  /** Seconds the ball has sat still. 0 while it moves. */
  dwell: number;
  /** At the pull limit. */
  charged: boolean;
  /** 0..1, fades in once charged. */
  tremble: number;
  /** The shiver to add to the drawn position, already scaled by `tremble`. */
  trembleOffset: Vec2;
  /** Current follow rate (eased when the snow under it changes). */
  follow: number;
};

export type Thrower = {
  /** Who is throwing. Any name; swap it with `setThrower` between throws (turns are issue #26). */
  id: string;
  phase: ThrowerPhase;
  /** Where it stands on the line now, and where it is being slid to. */
  x: number;
  slideTo: number;
  /** Its feet: `(x, lane.lineZ)`. */
  foot: Vec2;
  /** Where the input is pulling to (before the aim limit and rubber band) and after. */
  rawTarget: Vec2;
  target: Vec2;
  /** Ball position minus foot: the pull a throw would use right now. */
  pull: Vec2;
  ball: PulledBall | null;
  /** The roll letting go now would make (also the aim line), or null if letting go would cancel. */
  aim: RollPlan | null;
  /** 0..1 how far it leans back (follows the pull, eases back after). */
  lean: number;
  /** Height of the hop after a throw, 0 when standing. */
  hopHeight: number;
  /** Seconds since the last throw (Infinity if never). */
  launchAge: number;
};

export type RollingBall = {
  id: number;
  thrower: string;
  plan: RollPlan;
  position: Vec2;
  speed: number;
  /** Direction times speed, for the snow's plough. */
  velocity: Vec2;
  rolled: number;
  rolling: boolean;
  /** Seconds since it stopped (0 while rolling). */
  restAge: number;
};

export type BowlEvent =
  | { type: "pressed"; thrower: string; at: Vec2 }
  | { type: "charged"; thrower: string; at: Vec2 }
  | { type: "launched"; thrower: string; ballId: number; plan: RollPlan }
  | {
      type: "cancelled";
      thrower: string;
      at: Vec2;
      radius: number;
      /** short: let go too close. interrupted: input lost (window lost focus, pointer cancelled). */
      reason: "short" | "interrupted";
    }
  | { type: "stopped"; thrower: string; ballId: number; at: Vec2; radius: number; size: number }
  | { type: "removed"; ballId: number };

export type BowlListener = (event: BowlEvent) => void;

/** Big frames are split into steps no longer than this, so a stutter never changes the outcome. */
const MAX_STEP = 1 / 120;
/** Longest frame accepted at all (a background tab coming back). */
const MAX_FRAME = 0.1;

export class Bowling {
  readonly feel: Feel;
  readonly thrower: Thrower;
  readonly balls: RollingBall[] = [];
  /** Seconds simulated so far. */
  time = 0;

  private ground: Ground;
  private listeners = new Set<BowlListener>();
  private nextBallId = 1;
  private rollClock = 0;
  private slow = { left: 0, length: 1, slowest: 1 };

  /** `feel` is read live. `ground` tells it how packed the snow is (the snow scene's `useSnow()` fits). */
  constructor(feel: Feel, ground: Ground = FRESH_SNOW, throwerId = "one") {
    this.feel = feel;
    this.ground = ground;
    const foot = { x: 0, z: feel.lane.lineZ };
    this.thrower = {
      id: throwerId,
      phase: "ready",
      x: 0,
      slideTo: 0,
      foot,
      rawTarget: { ...foot },
      target: { ...foot },
      pull: { x: 0, z: 0 },
      ball: null,
      aim: null,
      lean: 0,
      hopHeight: 0,
      launchAge: Infinity,
    };
  }

  setGround(ground: Ground): void {
    this.ground = ground;
  }

  /** Listen to every event. Returns a function that stops listening. */
  subscribe(listener: BowlListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Change who is throwing. Only between throws; returns false otherwise. */
  setThrower(id: string): boolean {
    if (this.thrower.phase !== "ready") return false;
    this.thrower.id = id;
    return true;
  }

  /** True if the thrower may slide or start a pull now. */
  get isReady(): boolean {
    return this.thrower.phase === "ready";
  }

  /** Slide the thrower to this spot on the line (kept inside the lane). Only while ready. */
  slideTo(x: number): void {
    if (!this.isReady) return;
    const half = this.feel.lane.halfWidth;
    this.thrower.slideTo = Math.min(half, Math.max(-half, x));
  }

  /** Slide by this much. */
  slideBy(dx: number): void {
    this.slideTo(this.thrower.slideTo + dx);
  }

  /** Start a pull: a small ball appears at the thrower's feet. Returns false if not ready. */
  press(): boolean {
    if (!this.isReady) return false;
    const t = this.thrower;
    // Stop sliding where it stands, so the feet do not move under the pull.
    t.slideTo = t.x;
    t.foot = { x: t.x, z: this.feel.lane.lineZ };
    t.phase = "pulling";
    t.rawTarget = { ...t.foot };
    t.target = { ...t.foot };
    t.pull = { x: 0, z: 0 };
    t.aim = null;
    t.ball = {
      position: { ...t.foot },
      radius: this.feel.ball.radiusSmall,
      size: 0,
      reach: 0,
      velocity: { x: 0, z: 0 },
      speed: 0,
      rolled: 0,
      rollDirection: { x: 0, z: 1 },
      dwell: 0,
      charged: false,
      tremble: 0,
      trembleOffset: { x: 0, z: 0 },
      follow: this.feel.follow.rateLight,
    };
    this.emit({ type: "pressed", thrower: t.id, at: { ...t.foot } });
    return true;
  }

  /** Where the input is pulling the ball to (a point on the ground). */
  setTarget(point: Vec2): void {
    if (this.thrower.phase !== "pulling") return;
    this.thrower.rawTarget = { x: point.x, z: point.z };
  }

  /** Let go: roll down the lane, or crumble if the pull is too short. */
  release(): void {
    const t = this.thrower;
    if (t.phase !== "pulling" || !t.ball) return;
    // Same function and inputs as the aim line drawn last frame.
    const plan = planRoll(t.foot, t.pull, t.ball.size, t.ball.radius, this.feel, this.ground);
    if (!plan) {
      this.crumble("short");
      return;
    }
    const ballId = this.nextBallId++;
    this.balls.push({
      id: ballId,
      thrower: t.id,
      plan,
      position: { ...plan.start },
      speed: plan.startSpeed,
      velocity: scale(plan.direction, plan.startSpeed),
      rolled: 0,
      rolling: true,
      restAge: 0,
    });
    t.phase = "thrown";
    t.launchAge = 0;
    t.ball = null;
    t.aim = null;
    t.pull = { x: 0, z: 0 };
    this.emit({ type: "launched", thrower: t.id, ballId, plan });
  }

  /** Drop a pull without throwing (the ball crumbles). */
  cancel(reason: "short" | "interrupted" = "interrupted"): void {
    if (this.thrower.phase === "pulling") this.crumble(reason);
  }

  /**
   * Hit-stop: slow the whole throw down to `slowest` (share of normal speed) for a moment, easing back
   * to full speed over `seconds` of real time. The stage turns real frames into game time with
   * `slowFrame`; other features (the pins' physics) read `timeScale` to slow down with it.
   */
  hitStop(seconds: number, slowest: number): void {
    if (seconds <= 0) return;
    this.slow = { left: seconds, length: seconds, slowest: clamp01(slowest) };
  }

  /** How fast game time runs right now (1 = normal, less during a hit-stop). */
  get timeScale(): number {
    const s = this.slow;
    if (s.left <= 0) return 1;
    const u = 1 - s.left / s.length; // 0 at the hit .. 1 when back to normal
    return lerp(s.slowest, 1, u * u);
  }

  /** A real frame length turned into game time (and the hit-stop counted down). Call once per frame. */
  slowFrame(realSeconds: number): number {
    if (this.slow.left <= 0) return realSeconds;
    const scaled = realSeconds * this.timeScale;
    this.slow.left -= realSeconds;
    return scaled;
  }

  /** Advance by `seconds` (any frame length; long ones are split up). */
  step(seconds: number): void {
    const total = Math.min(MAX_FRAME, Math.max(0, seconds));
    const steps = Math.max(1, Math.ceil(total / MAX_STEP));
    const dt = total / steps;
    for (let i = 0; i < steps; i++) this.tick(dt);
  }

  // ------------------------------------------------------------ internals

  private emit(event: BowlEvent) {
    for (const listener of this.listeners) listener(event);
  }

  private crumble(reason: "short" | "interrupted") {
    const t = this.thrower;
    const ball = t.ball;
    t.phase = "ready";
    t.ball = null;
    t.aim = null;
    t.pull = { x: 0, z: 0 };
    if (ball) {
      this.emit({ type: "cancelled", thrower: t.id, at: { ...ball.position }, radius: ball.radius, reason });
    }
  }

  private tick(dt: number) {
    this.time += dt;
    this.tickThrower(dt);
    this.tickPull(dt);
    this.tickRolls(dt);
  }

  private tickThrower(dt: number) {
    const t = this.thrower;
    const feel = this.feel;
    t.launchAge += dt;
    t.x += (t.slideTo - t.x) * ease(feel.thrower.slideRate, dt);
    if (t.phase !== "pulling") t.foot = { x: t.x, z: feel.lane.lineZ };

    if (t.phase === "thrown") {
      const u = t.launchAge / Math.max(0.01, feel.thrower.hopTime);
      if (u >= 1) {
        t.phase = "ready";
        t.hopHeight = 0;
      } else {
        t.hopHeight = 4 * feel.thrower.hopHeight * u * (1 - u);
      }
    } else {
      t.hopHeight = 0;
    }
    const leanGoal = t.phase === "pulling" ? clamp01(length(t.pull) / feel.pull.max) : 0;
    t.lean += (leanGoal - t.lean) * ease(t.phase === "pulling" ? 20 : 8, dt);
  }

  /** Where the ball is pulled to: kept behind the thrower within the aim limit, with a rubber band. */
  private pullTarget(): Vec2 {
    const t = this.thrower;
    const { max, rubberBand, maxAimDegrees } = this.feel.pull;
    const rel = sub(t.rawTarget, t.foot);
    if (length(rel) < 1e-9) return { ...t.foot };
    // Angle away from straight back (+z), limited to the aim range.
    const limit = (maxAimDegrees * Math.PI) / 180;
    const angle = Math.min(limit, Math.max(-limit, Math.atan2(rel.x, rel.z)));
    const back = { x: Math.sin(angle), z: Math.cos(angle) };
    // Only pulling back counts; pushing forward gives no pull.
    let pulled = Math.max(0, rel.x * back.x + rel.z * back.z);
    if (pulled > max) {
      pulled = rubberBand > 0 ? max + rubberBand * (1 - Math.exp(-(pulled - max) / rubberBand)) : max;
    }
    return add(t.foot, scale(back, pulled));
  }

  private tickPull(dt: number) {
    const t = this.thrower;
    const ball = t.ball;
    if (t.phase !== "pulling" || !ball) return;
    const feel = this.feel;
    t.target = this.pullTarget();

    // Snow just ahead of the ball, in the way it is heading (its own groove is under and behind it).
    const toward = sub(t.target, ball.position);
    const gapNow = length(toward);
    const heading = gapNow > 1e-6 ? scale(toward, 1 / gapNow) : ball.rollDirection;
    const packed = clamp01(
      this.ground.packedAt(
        ball.position.x + heading.x * ball.radius,
        ball.position.z + heading.z * ball.radius,
      ),
    );

    // Follow with lag: heavier (bigger) balls lag more, a packed track lets it run.
    // The rate itself eases, so crossing an old track never jerks the ball.
    const wanted =
      lerp(feel.follow.rateLight, feel.follow.rateHeavy, ball.size) *
      lerp(1, feel.follow.packedBoost, packed);
    ball.follow += (wanted - ball.follow) * ease(feel.follow.smoothing, dt);
    let next = add(ball.position, scale(toward, ease(ball.follow, dt)));
    const gap = sub(t.target, next);
    const gapLength = length(gap);
    if (gapLength > feel.follow.maxTrail) {
      next = sub(t.target, scale(gap, feel.follow.maxTrail / gapLength));
    }

    // Rolling.
    const move = sub(next, ball.position);
    const moved = length(move);
    ball.rolled += moved;
    if (moved > 1e-6) ball.rollDirection = scale(move, 1 / moved);
    const instant = dt > 0 ? scale(move, 1 / dt) : { x: 0, z: 0 };
    ball.velocity = add(ball.velocity, scale(sub(instant, ball.velocity), ease(20, dt)));
    ball.speed = length(ball.velocity);
    ball.position = next;

    // Growth: only while reaching farther than before, and less over packed snow.
    const max = Math.max(1e-6, feel.pull.max);
    const reach = Math.min(distance(next, t.foot), max);
    if (reach > ball.reach) {
      const freshness = lerp(1, feel.ball.growthOnPacked, packed);
      ball.size = clamp01(ball.size + ((reach - ball.reach) / max) * freshness);
      ball.reach = reach;
    }
    ball.radius = lerp(feel.ball.radiusSmall, feel.ball.radiusBig, Math.pow(ball.size, feel.ball.growthCurve));

    ball.dwell = moved / Math.max(dt, 1e-9) < feel.ball.stillSpeed ? ball.dwell + dt : 0;

    const wasCharged = ball.charged;
    ball.charged = ball.reach >= max * 0.999;
    if (ball.charged && !wasCharged) this.emit({ type: "charged", thrower: t.id, at: { ...next } });
    const c = feel.charge;
    ball.tremble = ball.charged ? Math.min(1, ball.tremble + dt / Math.max(0.01, c.trembleFadeIn)) : 0;
    const w = this.time * c.trembleSpeed * Math.PI * 2;
    const amount = c.trembleSize * ball.tremble;
    ball.trembleOffset = { x: Math.sin(w) * amount, z: Math.cos(w * 1.37) * amount };

    t.pull = sub(next, t.foot);
    t.aim = planRoll(t.foot, t.pull, ball.size, ball.radius, feel, this.ground);
  }

  private tickRolls(dt: number) {
    // Rolling uses its own fixed step so it matches the aim line exactly.
    this.rollClock += dt;
    while (this.rollClock >= ROLL_STEP) {
      this.rollClock -= ROLL_STEP;
      for (const ball of this.balls) {
        if (!ball.rolling) continue;
        const state = { position: ball.position, speed: ball.speed, rolled: ball.rolled };
        const still = stepRoll(state, ball.plan, this.feel, this.ground);
        ball.position = state.position;
        ball.speed = state.speed;
        ball.rolled = state.rolled;
        ball.velocity = scale(ball.plan.direction, ball.speed);
        if (!still) {
          ball.rolling = false;
          this.emit({
            type: "stopped",
            thrower: ball.thrower,
            ballId: ball.id,
            at: { ...ball.position },
            radius: ball.plan.radius,
            size: ball.plan.size,
          });
        }
      }
    }
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.rolling) continue;
      ball.restAge += dt;
      if (ball.restAge >= this.feel.roll.restTime) {
        this.balls.splice(i, 1);
        this.emit({ type: "removed", ballId: ball.id });
      }
    }
  }
}
