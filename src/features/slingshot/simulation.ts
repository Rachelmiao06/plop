/**
 * The slingshot rules, with no drawing, sound or input in them.
 * Step it with `step(seconds)`; feed it pull targets; read its state; listen to its events.
 * Frame-rate independent: every follow and fade uses time, and big steps are split up.
 */
import { type Arc, arcPoint, computeArc } from "./arc";
import type { Feel } from "./content";
import { type Vec2, add, clamp01, distance, ease, length, lerp, scale, sub } from "./vec";

export type PlayerId = "left" | "right";
export const PLAYER_IDS: readonly PlayerId[] = ["left", "right"];

/** idle → pulling → launched (character hops back home) → idle. */
export type Phase = "idle" | "pulling" | "launched";

/** The snowball while it sits under a character being pulled. */
export type PulledBall = {
  /** Centre of the ball, on the ground. */
  position: Vec2;
  radius: number;
  /** Growth 0..1 (0 = just appeared, 1 = fully charged). */
  size: number;
  /** Farthest pull reached so far (capped at full pull). Size comes from this; it never goes down. */
  reach: number;
  /** Smoothed velocity along the ground (units per second) and its length. */
  velocity: Vec2;
  speed: number;
  /** Total distance rolled. Spin angle for a renderer = rolled / radius (radians). */
  rolled: number;
  /** Unit direction of the latest roll. The spin axis is perpendicular to this, along the ground. */
  rollDirection: Vec2;
  /** Seconds the ball has sat still (slower than `ball.stillSpeed`). 0 while it moves. */
  dwell: number;
  charged: boolean;
  /** 0..1, fades in once charged. */
  tremble: number;
  /** The shiver to add to the drawn position, already scaled by `tremble`. */
  trembleOffset: Vec2;
};

export type PlayerState = {
  id: PlayerId;
  home: Vec2;
  phase: Phase;
  /** Where the input is pulling to (before the rubber band). */
  rawTarget: Vec2;
  /** Where the ball is being pulled to (after the rubber band). */
  target: Vec2;
  /** Ball position minus home: the pull a throw would use right now. */
  pull: Vec2;
  ball: PulledBall | null;
  /** The throw letting go now would make, or null if letting go would cancel. */
  aim: Arc | null;
  /** Seconds left before this character can pull again after being hit. */
  recovery: number;
  /** Seconds since this character was last hit (Infinity if never). For the wobble. */
  hitAge: number;
  /** Seconds since this character last threw (Infinity if never). */
  launchAge: number;
  /** Height of the hop back home after a throw, 0 when standing. */
  hopHeight: number;
};

export type FlyingBall = {
  id: number;
  owner: PlayerId;
  arc: Arc;
  /** Seconds since launch. */
  age: number;
  /** 0..1 along the arc. */
  progress: number;
  position: Vec2;
  /** Ball centre above the ground. */
  height: number;
};

export type SlingEvent =
  | { type: "pressed"; player: PlayerId; at: Vec2 }
  | { type: "charged"; player: PlayerId; at: Vec2 }
  | { type: "launched"; player: PlayerId; ballId: number; arc: Arc }
  | {
      type: "cancelled";
      player: PlayerId;
      at: Vec2;
      radius: number;
      /** short: let go too close to home. hit: knocked over mid-pull. interrupted: input lost (window lost focus). */
      reason: "short" | "hit" | "interrupted";
    }
  | {
      type: "landed";
      player: PlayerId;
      ballId: number;
      at: Vec2;
      radius: number;
      strength: number;
      size: number;
      /** Characters inside the hit zone. */
      hits: PlayerId[];
    }
  | { type: "hit"; player: PlayerId; by: PlayerId; at: Vec2; strength: number };

export type SlingListener = (event: SlingEvent) => void;

/** Big frames are split into steps no longer than this, so a stutter never changes the outcome. */
const MAX_STEP = 1 / 120;
/** Longest frame accepted at all (a background tab coming back). */
const MAX_FRAME = 0.1;

export class Slingshot {
  readonly feel: Feel;
  readonly players: Record<PlayerId, PlayerState>;
  readonly flying: FlyingBall[] = [];
  /** Seconds simulated so far. */
  time = 0;

  private listeners = new Set<SlingListener>();
  private nextBallId = 1;

  /** `feel` is read live: change its numbers (for example from sliders) and the next step uses them. */
  constructor(feel: Feel) {
    this.feel = feel;
    const make = (id: PlayerId): PlayerState => {
      const home = { ...feel.homes[id] };
      return {
        id,
        home,
        phase: "idle",
        rawTarget: { ...home },
        target: { ...home },
        pull: { x: 0, z: 0 },
        ball: null,
        aim: null,
        recovery: 0,
        hitAge: Infinity,
        launchAge: Infinity,
        hopHeight: 0,
      };
    };
    this.players = { left: make("left"), right: make("right") };
  }

  /** Listen to every event. Returns a function that stops listening. */
  subscribe(listener: SlingListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** True if this character may start a pull now. */
  canPull(id: PlayerId): boolean {
    const p = this.players[id];
    return p.phase === "idle" && p.recovery <= 0;
  }

  /** The character whose home is nearest `point` within `radius` (default `character.grabRadius`). */
  playerAt(point: Vec2, radius = this.feel.character.grabRadius): PlayerId | null {
    let best: PlayerId | null = null;
    let bestDistance = radius;
    for (const id of PLAYER_IDS) {
      const d = distance(point, this.players[id].home);
      if (d <= bestDistance) {
        best = id;
        bestDistance = d;
      }
    }
    return best;
  }

  /** Start a pull: a small ball appears under the character. Returns false if it cannot pull now. */
  press(id: PlayerId): boolean {
    if (!this.canPull(id)) return false;
    const p = this.players[id];
    p.phase = "pulling";
    p.rawTarget = { ...p.home };
    p.target = { ...p.home };
    p.pull = { x: 0, z: 0 };
    p.aim = null;
    p.ball = {
      position: { ...p.home },
      radius: this.feel.ball.radiusSmall,
      size: 0,
      reach: 0,
      velocity: { x: 0, z: 0 },
      speed: 0,
      rolled: 0,
      rollDirection: { x: 1, z: 0 },
      dwell: 0,
      charged: false,
      tremble: 0,
      trembleOffset: { x: 0, z: 0 },
    };
    this.emit({ type: "pressed", player: id, at: { ...p.home } });
    return true;
  }

  /** Where the input is pulling this character's ball to (a point on the ground). */
  setTarget(id: PlayerId, point: Vec2): void {
    const p = this.players[id];
    if (p.phase !== "pulling") return;
    p.rawTarget = { x: point.x, z: point.z };
  }

  /** Let go: throw, or crumble if the pull is too short. */
  release(id: PlayerId): void {
    const p = this.players[id];
    if (p.phase !== "pulling" || !p.ball) return;
    // Same function and same inputs as the preview drawn last frame, so the same arc.
    const arc = computeArc(p.home, p.pull, p.ball.size, p.ball.radius, this.feel);
    if (!arc) {
      this.crumble(p, "short");
      return;
    }
    const ballId = this.nextBallId++;
    const start = arcPoint(arc, 0);
    this.flying.push({
      id: ballId,
      owner: id,
      arc,
      age: 0,
      progress: 0,
      position: start.position,
      height: start.height,
    });
    p.phase = "launched";
    p.launchAge = 0;
    p.ball = null;
    p.aim = null;
    this.emit({ type: "launched", player: id, ballId, arc });
  }

  /** Drop a pull without throwing (the ball crumbles). */
  cancel(id: PlayerId, reason: "short" | "hit" | "interrupted" = "interrupted"): void {
    const p = this.players[id];
    if (p.phase === "pulling") this.crumble(p, reason);
  }

  /** Advance by `seconds` (any frame length; long ones are split up). */
  step(seconds: number): void {
    const total = Math.min(MAX_FRAME, Math.max(0, seconds));
    const steps = Math.max(1, Math.ceil(total / MAX_STEP));
    const dt = total / steps;
    for (let i = 0; i < steps; i++) this.tick(dt);
  }

  // ------------------------------------------------------------ internals

  private emit(event: SlingEvent) {
    for (const listener of this.listeners) listener(event);
  }

  private crumble(p: PlayerState, reason: "short" | "hit" | "interrupted") {
    const ball = p.ball;
    p.phase = "idle";
    p.ball = null;
    p.aim = null;
    p.pull = { x: 0, z: 0 };
    if (ball) {
      this.emit({
        type: "cancelled",
        player: p.id,
        at: { ...ball.position },
        radius: ball.radius,
        reason,
      });
    }
  }

  private tick(dt: number) {
    this.time += dt;
    for (const id of PLAYER_IDS) this.tickPlayer(this.players[id], dt);
    this.tickFlying(dt);
  }

  /** Rubber band: past full pull, the ball gives a little more and then stops. */
  private band(pulled: number): number {
    const { max, rubberBand } = this.feel.pull;
    if (pulled <= max) return pulled;
    if (rubberBand <= 0) return max;
    return max + rubberBand * (1 - Math.exp(-(pulled - max) / rubberBand));
  }

  private tickPlayer(p: PlayerState, dt: number) {
    const feel = this.feel;
    p.hitAge += dt;
    p.launchAge += dt;
    if (p.recovery > 0) p.recovery = Math.max(0, p.recovery - dt);

    if (p.phase === "launched") {
      const u = p.launchAge / Math.max(0.01, feel.character.hopTime);
      if (u >= 1) {
        p.phase = "idle";
        p.hopHeight = 0;
      } else {
        p.hopHeight = 4 * feel.character.hopHeight * u * (1 - u);
      }
      return;
    }
    p.hopHeight = 0;
    const ball = p.ball;
    if (p.phase !== "pulling" || !ball) return;

    // Where the ball is pulled to, after the rubber band.
    const raw = sub(p.rawTarget, p.home);
    const rawLength = length(raw);
    p.target = rawLength > 1e-9 ? add(p.home, scale(raw, this.band(rawLength) / rawLength)) : { ...p.home };

    // Follow with lag; heavier (bigger) balls lag more. Never trail too far.
    const rate = lerp(feel.follow.rateLight, feel.follow.rateHeavy, ball.size);
    let next = add(ball.position, scale(sub(p.target, ball.position), ease(rate, dt)));
    const gap = sub(p.target, next);
    const gapLength = length(gap);
    if (gapLength > feel.follow.maxTrail) {
      next = sub(p.target, scale(gap, feel.follow.maxTrail / gapLength));
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

    // Growth: from the farthest pull reached, never shrinking.
    const max = Math.max(1e-6, feel.pull.max);
    ball.reach = Math.max(ball.reach, Math.min(distance(next, p.home), max));
    ball.size = Math.pow(clamp01(ball.reach / max), feel.ball.growthCurve);
    ball.radius = lerp(feel.ball.radiusSmall, feel.ball.radiusBig, ball.size);

    // Sitting still: the snow sinks under it the longer it stays.
    ball.dwell = moved / Math.max(dt, 1e-9) < feel.ball.stillSpeed ? ball.dwell + dt : 0;

    // Charge.
    const wasCharged = ball.charged;
    ball.charged = ball.reach >= max * 0.999;
    if (ball.charged && !wasCharged) {
      this.emit({ type: "charged", player: p.id, at: { ...next } });
    }
    const c = feel.charge;
    ball.tremble = ball.charged ? Math.min(1, ball.tremble + dt / Math.max(0.01, c.trembleFadeIn)) : 0;
    const w = this.time * c.trembleSpeed * Math.PI * 2;
    const amount = c.trembleSize * ball.tremble;
    ball.trembleOffset = { x: Math.sin(w) * amount, z: Math.cos(w * 1.37) * amount };

    p.pull = sub(next, p.home);
    p.aim = computeArc(p.home, p.pull, ball.size, ball.radius, feel);
  }

  private tickFlying(dt: number) {
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const ball = this.flying[i];
      ball.age += dt;
      ball.progress = clamp01(ball.age / ball.arc.flightTime);
      const point = arcPoint(ball.arc, ball.progress);
      ball.position = point.position;
      ball.height = point.height;
      if (ball.progress >= 1) {
        this.flying.splice(i, 1);
        this.land(ball);
      }
    }
  }

  private land(ball: FlyingBall) {
    const { arc, owner } = ball;
    const at = { ...arc.landing };
    const reach = arc.impactRadius + this.feel.hit.extraReach;
    const hits = PLAYER_IDS.filter(
      (id) =>
        (id !== owner || this.feel.hit.canHitYourself) &&
        distance(this.players[id].home, at) <= reach,
    );
    this.emit({
      type: "landed",
      player: owner,
      ballId: ball.id,
      at,
      radius: arc.impactRadius,
      strength: arc.strength,
      size: arc.size,
      hits,
    });
    for (const id of hits) {
      const p = this.players[id];
      p.recovery = this.feel.hit.recovery;
      p.hitAge = 0;
      if (p.phase === "pulling") this.crumble(p, "hit");
      this.emit({ type: "hit", player: id, by: owner, at, strength: arc.strength });
    }
  }
}

export function createSlingshot(feel: Feel): Slingshot {
  return new Slingshot(feel);
}
