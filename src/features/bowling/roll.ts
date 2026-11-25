/**
 * The roll down the lane. One step function is used both to preview the roll
 * (the aim line) and to run the real roll, with the same fixed step, so the ball
 * goes exactly where the line said, as long as the snow ahead has not changed.
 */
import type { Feel } from "./content";
import { type Vec2, clamp01, lerp } from "./vec";
import type { BackWall } from "./wall";

/** What the rules need to know about the snow. The snow scene's `useSnow()` fits. */
export type Ground = {
  /** How packed the snow is here: 0 untouched, 1 pressed hard. */
  packedAt(x: number, z: number): number;
  /** Optional: how soft and deep the snow is here, 0 normal .. 1 a soft mound (`roll.soft`). */
  softAt?(x: number, z: number): number;
  /**
   * Optional: the back wall (the paper theatre's sky and its snow bank, see `wall.ts`). A ball that reaches it
   * bounces back toward the lane, losing speed (`FEEL.wall`). Null or left out: the lane runs on.
   */
  readonly wall?: BackWall | null;
};

/** Untouched snow everywhere (for checks, or before the snow is ready). */
export const FRESH_SNOW: Ground = { packedAt: () => 0 };

/** The roll is always stepped in exactly this many seconds. */
export const ROLL_STEP = 1 / 120;
/** Safety limit on a roll's length, in seconds. */
const LONGEST_ROLL = 30;

export type RollPlan = {
  /** Where the ball starts (where it sat at the end of the pull). */
  start: Vec2;
  /** Unit direction down the lane (opposite to the pull). */
  direction: Vec2;
  startSpeed: number;
  /** Growth 0..1 and radius of the ball. */
  size: number;
  radius: number;
  /** How hard the pull was, 0..1 (0 = just past the cancel distance, 1 = full). */
  power: number;
  /** Where it will stop, how far that is and how long it takes, on the snow as it is now. */
  stop: Vec2;
  /** Where the ball's middle is each time it bounces off the back wall, in order (empty: it never gets there). */
  bounces: Vec2[];
  distance: number;
  duration: number;
};

/**
 * `speed` is the roll's own speed (slowed by the snow); `age` is seconds since letting go. `direction` is where it
 * rolls now (the plan's direction until it bounces off the back wall), `bounces` how often it has, and `hit` is set
 * by the step in which it meets the wall (where, and how hard), else null.
 */
export type RollState = {
  position: Vec2;
  speed: number;
  rolled: number;
  age: number;
  direction?: Vec2;
  bounces?: number;
  hit?: { at: Vec2; normalSpeed: number } | null;
};

/**
 * The snap of letting go: like a stretched band, the ball leaves at `snap.from` of its speed and reaches
 * full speed within `snap.time` (easing out), so the first moment visibly accelerates.
 */
export function snapShare(age: number, feel: Feel): number {
  const s = feel.roll.snap;
  const u = clamp01(age / Math.max(1e-6, s.time));
  return lerp(s.from, 1, 1 - (1 - u) * (1 - u));
}

/** How fast a rolling ball actually moves now (its speed times the snap). */
export function movingSpeed(state: Pick<RollState, "speed" | "age">, feel: Feel): number {
  return state.speed * snapShare(state.age, feel);
}

/**
 * Advance a rolling ball by one `ROLL_STEP`. Returns false once it has stopped.
 * It reads the snow just ahead of the ball, so its own groove behind does not count.
 */
export function stepRoll(
  state: RollState,
  plan: Pick<RollPlan, "direction" | "size" | "radius">,
  feel: Feel,
  ground: Ground,
): boolean {
  const r = feel.roll;
  const dt = ROLL_STEP;
  const dir = state.direction ?? plan.direction;
  state.hit = null;
  const ahead = plan.radius * 1.2;
  const packed = clamp01(
    ground.packedAt(
      state.position.x + dir.x * ahead,
      state.position.z + dir.z * ahead,
    ),
  );
  // Less drag early in the roll: it eases in over `early.time`, so the ball carries its snap.
  const early = lerp(r.early.dragShare, 1, clamp01(state.age / Math.max(1e-6, r.early.time)) ** 2);
  const slowing =
    (r.dragFresh + r.dragPerSpeed * state.speed) *
    lerp(1, r.dragOnPacked, packed) *
    lerp(1, r.dragBigShare, plan.size) *
    early;
  // A soft mound: its own slowing, not eased by `early`, heavier for a big ball.
  const soft = ground.softAt ? clamp01(ground.softAt(state.position.x, state.position.z)) : 0;
  const sinking = soft > 0 ? soft * r.soft.drag * lerp(1, r.soft.bigShare, plan.size) : 0;
  state.speed = Math.max(0, state.speed - (slowing + sinking) * dt);
  if (state.speed < r.stopSpeed) {
    state.speed = 0;
    return false;
  }
  const move = movingSpeed(state, feel) * dt;
  state.age += dt;
  state.position = {
    x: state.position.x + dir.x * move,
    z: state.position.z + dir.z * move,
  };
  state.rolled += move;
  bounceOffWall(state, dir, plan.radius, feel, ground.wall);
  return true;
}

/**
 * The back wall: once the ball's edge reaches `wall.inset` in front of the paper (the snow bank), it bounces back
 * inside the circle. Straight off the wall it keeps `wall.bounce` of its speed, along the wall `wall.slide`, so it
 * rolls back toward the lane, slower. At most `wall.most` bounces a roll.
 */
function bounceOffWall(state: RollState, dir: Vec2, radius: number, feel: Feel, wall: BackWall | null | undefined) {
  const w = feel.wall;
  if (!wall || (state.bounces ?? 0) >= w.most) return;
  const reach = wall.radius - w.inset - radius;
  const dx = state.position.x - wall.cx;
  const dz = state.position.z - wall.cz;
  const out = Math.hypot(dx, dz);
  if (out < reach || out < 1e-6) return;
  const n = { x: dx / out, z: dz / out };
  const along = dir.x * n.x + dir.z * n.z;
  if (along <= 0) return; // already heading back in
  // Split the way it goes into straight at the wall and along it; bounce the first back, keep some of the second.
  const tx = dir.x - along * n.x;
  const tz = dir.z - along * n.z;
  const nx = -along * w.bounce * n.x + tx * w.slide;
  const nz = -along * w.bounce * n.z + tz * w.slide;
  const kept = Math.hypot(nx, nz);
  state.hit = { at: { x: wall.cx + n.x * (reach + radius), z: wall.cz + n.z * (reach + radius) }, normalSpeed: along * state.speed };
  state.position = { x: wall.cx + n.x * reach, z: wall.cz + n.z * reach };
  state.direction = { x: nx / kept, z: nz / kept };
  state.speed *= kept;
  state.bounces = (state.bounces ?? 0) + 1;
}

/** How far past the sweet spot a pull of this power is: 0 at or below it, 1 at a full pull (`pull.sweet`). */
export function pastSweet(power: number, feel: Feel): number {
  const at = feel.pull.sweet.at;
  return clamp01((power - at) / Math.max(1e-6, 1 - at));
}

/** The power (0..1) of a pull this long (0 = just past cancel). */
export function powerOf(pulled: number, feel: Feel): number {
  const { max, cancelBelow } = feel.pull;
  return clamp01((Math.min(pulled, max) - cancelBelow) / Math.max(1e-6, max - cancelBelow));
}

/** The pull length that reaches the sweet spot. */
export function sweetPull(feel: Feel): number {
  const { max, cancelBelow, sweet } = feel.pull;
  return cancelBelow + sweet.at * (max - cancelBelow);
}

/**
 * The roll that letting go now would make, for a ball at `foot + pull + beside` of growth
 * `size` and radius `radius`. The direction and power come from `pull` alone; `beside` only moves
 * where the roll starts (the ball sits beside the thrower's feet). Null when the pull is too short
 * (letting go cancels).
 */
export function planRoll(
  foot: Vec2,
  pull: Vec2,
  size: number,
  radius: number,
  feel: Feel,
  ground: Ground,
  beside: Vec2 = { x: 0, z: 0 },
): RollPlan | null {
  const pulled = Math.hypot(pull.x, pull.z);
  const { cancelBelow } = feel.pull;
  if (pulled < cancelBelow || pulled < 1e-6) return null;

  const direction = { x: -pull.x / pulled, z: -pull.z / pulled };
  const power = powerOf(pulled, feel);
  const s = clamp01(size);
  const r = feel.roll;
  // Past the sweet spot the ball is heavy and starts slower.
  const heavy = lerp(1, feel.pull.sweet.speedAtFull, pastSweet(power, feel));
  const startSpeed = lerp(r.speedSmall, r.speedBig, s) * lerp(r.weakPull, 1, power) * heavy;
  const start = { x: foot.x + pull.x + beside.x, z: foot.z + pull.z + beside.z };

  const state: RollState = { position: { ...start }, speed: startSpeed, rolled: 0, age: 0 };
  const shape = { direction, size: s, radius };
  const bounces: Vec2[] = [];
  let steps = 0;
  const most = LONGEST_ROLL / ROLL_STEP;
  while (steps < most && stepRoll(state, shape, feel, ground)) {
    steps++;
    if (state.hit) bounces.push({ ...state.position });
  }

  return {
    start,
    direction,
    startSpeed,
    size: s,
    radius,
    power,
    stop: state.position,
    bounces,
    distance: state.rolled,
    duration: steps * ROLL_STEP,
  };
}
