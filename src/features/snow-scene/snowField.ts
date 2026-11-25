import { content } from "./content";

// The snow as numbers: a grid of heights that can be pressed down.
// No drawing happens here; SnowGround reads this grid and redraws only the
// part that changed, and SnowSpray reads the "kicks" to throw snow up.

export type DirtyRect = { x0: number; x1: number; z0: number; z1: number };

export type PressOptions = {
  /**
   * Dig this much deeper than the snow currently is at this point (scene
   * units). Pass `rate * secondsSinceLastFrame` every frame to make a press
   * that deepens the longer it is held. Stops at hard ground.
   */
  dig?: number;
  /**
   * How fast the ball is moving across the snow (units per second). Snow
   * ploughs up ahead of the movement, and faster movement kicks up more.
   */
  velocityX?: number;
  velocityZ?: number;
};

/** What other features may do to the snow. All positions are scene x and z. */
export type SnowApi = {
  /**
   * Press a rounded groove, as a ball of this radius resting at this point
   * would. One call is a shallow touch; see PressOptions to go deeper.
   */
  pressGroove: (
    x: number,
    z: number,
    ballRadius: number,
    options?: PressOptions,
  ) => void;
  /** Punch a crater of this radius, with a lumpy rim thrown up around it. */
  punchCrater: (x: number, z: number, radius: number) => void;
  /** Height of the snow surface at this point. */
  heightAt: (x: number, z: number) => number;
  /** How packed the snow is at this point: 0 untouched, 1 pressed hard. */
  packedAt: (x: number, z: number) => number;
};

/** Snow pushed away by one press or crater: where, how much, how fast. */
export type Kick = {
  x: number;
  y: number;
  z: number;
  radius: number;
  volume: number;
  velocityX: number;
  velocityZ: number;
  burst: boolean;
};

type Stamp = {
  radius: number;
  shapeAt: (distanceSquared: number) => number;
  rimShare: number;
  rimWidth: number;
  rimCap: number;
  lumpiness: number;
  // Direction of travel (length 1) and how strongly snow ploughs that way.
  moveX: number;
  moveZ: number;
  plough: number;
};

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/**
 * Distance from a point to the edge of the rounded snow slab:
 * negative inside, zero on the edge, positive outside.
 */
export function slabEdgeDistance(x: number, z: number): number {
  const g = content.ground;
  const r = g.cornerRadius;
  const qx = Math.abs(x) - (g.sizeX / 2 - r);
  const qz = Math.abs(z - g.centerZ) - (g.sizeZ / 2 - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qz, 0));
  return outside + Math.min(Math.max(qx, qz), 0) - r;
}

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export class SnowField implements SnowApi {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  readonly originX: number;
  readonly originZ: number;
  /** Current surface height per grid point. */
  readonly height: Float32Array;
  /** Untouched surface height per grid point. */
  readonly base: Float32Array;
  /**
   * How packed the snow is per grid point: 0 (fresh) to 1 (deeply pressed),
   * plus up to 1 more where it is pressed right down to hard ground.
   */
  readonly pressed: Float32Array;
  /**
   * How far the snow may be pressed per grid point: 1 in the middle of the
   * slab, easing to 0 at its edge so the side wall never breaks.
   */
  readonly give: Float32Array;

  private dirty: DirtyRect | null = null;
  private kicks: Kick[] = [];

  constructor() {
    const g = content.ground;
    this.cell = g.cell;
    this.cols = Math.round(g.sizeX / g.cell) + 1;
    this.rows = Math.round(g.sizeZ / g.cell) + 1;
    this.originX = -((this.cols - 1) * g.cell) / 2;
    this.originZ = g.centerZ - ((this.rows - 1) * g.cell) / 2;

    const n = this.cols * this.rows;
    this.height = new Float32Array(n);
    this.base = new Float32Array(n);
    this.pressed = new Float32Array(n);
    this.give = new Float32Array(n);

    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const x = this.originX + i * g.cell;
        const z = this.originZ + j * g.cell;
        const drift =
          (smoothNoise(x * g.driftScale + 11.3, z * g.driftScale + 4.7) - 0.5) *
          2 *
          g.driftHeight;
        const ripple =
          (smoothNoise(x * g.rippleScale + 3.1, z * g.rippleScale * 1.7 + 8.2) -
            0.5) *
          2 *
          g.rippleHeight;
        const h = drift + ripple;
        const k = j * this.cols + i;
        this.base[k] = h;
        this.height[k] = h;
        const inset = clamp01(-slabEdgeDistance(x, z) / g.edgeLock);
        this.give[k] = inset * inset * (3 - 2 * inset);
      }
    }
  }

  xAt(i: number): number {
    return this.originX + i * this.cell;
  }

  zAt(j: number): number {
    return this.originZ + j * this.cell;
  }

  private sample(grid: Float32Array, x: number, z: number): number {
    const fx = (x - this.originX) / this.cell;
    const fz = (z - this.originZ) / this.cell;
    const cx = Math.min(Math.max(fx, 0), this.cols - 1.001);
    const cz = Math.min(Math.max(fz, 0), this.rows - 1.001);
    const i = Math.floor(cx);
    const j = Math.floor(cz);
    const u = cx - i;
    const v = cz - j;
    const k = j * this.cols + i;
    const a = grid[k];
    const b = grid[k + 1];
    const c = grid[k + this.cols];
    const d = grid[k + this.cols + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  heightAt = (x: number, z: number): number => this.sample(this.height, x, z);

  packedAt = (x: number, z: number): number =>
    clamp01(this.sample(this.pressed, x, z));

  /** True if this point is on the slab (not past its edge). */
  insideAt = (x: number, z: number): boolean => slabEdgeDistance(x, z) <= 0;

  pressGroove = (
    x: number,
    z: number,
    ballRadius: number,
    options?: PressOptions,
  ): void => {
    const p = content.press;
    const depth = content.ground.depth;
    const r = Math.max(ballRadius, this.cell);
    const surface = this.sample(this.base, x, z);
    const current = this.sample(this.height, x, z);
    const rest = Math.min(r * p.sinkPerRadius, depth);
    // The lowest point of the ball: at least its resting depth, deeper if
    // asked to dig. It may dip a little "below" hard ground so that the pit
    // gets a flat hard floor instead of ending in a point.
    const bottom = Math.max(
      Math.min(surface - rest, current - (options?.dig ?? 0)),
      surface - depth - r * 0.5,
    );
    const sink = surface - bottom;

    // A ball at the bottom, and above it walls that lean outward: a deep pit
    // is wider at the top, as loose snow would slump.
    const m = p.wallSlope;
    const d0 = (r * m) / Math.sqrt(1 + m * m);
    const h0 = r - Math.sqrt(r * r - d0 * d0);
    const radius =
      sink <= h0
        ? Math.sqrt(Math.max(r * r - (r - sink) * (r - sink), 0))
        : d0 + (sink - h0) / m;

    const vx = options?.velocityX ?? 0;
    const vz = options?.velocityZ ?? 0;
    const speed = Math.hypot(vx, vz);
    const moving = speed > 1e-4;

    const removed = this.stamp(x, z, {
      radius,
      shapeAt: (d2) => {
        const d = Math.sqrt(d2);
        return d < d0
          ? bottom + r - Math.sqrt(r * r - d2)
          : bottom + h0 + (d - d0) * m;
      },
      rimShare: p.rimShare,
      rimWidth: Math.min(radius * p.rimWidth, p.rimWidthMax),
      rimCap: Math.min(
        Math.max(Math.min(sink, depth) * p.rimHeightPerDepth, p.rimMinHeight),
        p.rimMaxHeight,
      ),
      lumpiness: 0,
      moveX: moving ? vx / speed : 0,
      moveZ: moving ? vz / speed : 0,
      plough: moving ? p.plough * Math.min(speed / p.ploughFullSpeed, 1) : 0,
    });

    this.addKick(x, surface, z, radius, removed, vx, vz, false);
  };

  punchCrater = (x: number, z: number, radius: number): void => {
    const c = content.crater;
    const r = Math.max(radius, this.cell);
    const depth = Math.min(r * c.depthPerRadius, content.ground.depth);
    // Measured from the snow as it is now, so a second hit digs deeper.
    const surface = this.sample(this.height, x, z);
    const removed = this.stamp(x, z, {
      radius: r,
      // A bowl: deepest in the middle, meeting the surface at the edge.
      shapeAt: (d2) => surface - depth * (1 - d2 / (r * r)),
      rimShare: c.rimShare,
      rimWidth: r * c.rimWidth,
      rimCap: c.rimMaxHeight,
      lumpiness: c.rimLumpiness,
      moveX: 0,
      moveZ: 0,
      plough: 0,
    });
    this.addKick(x, surface, z, r, removed, 0, 0, true);
  };

  /**
   * Lower the snow inside `radius` to the given shape, then pile part of the
   * snow that was pushed away into a ring just outside it. Returns how much
   * snow was pushed away (summed height over grid points).
   */
  private stamp(x: number, z: number, s: Stamp): number {
    const { cols, rows, cell, height, base, pressed, give } = this;
    const floorDepth = content.ground.depth;
    const p = content.press;
    const rimOuter = s.radius + s.rimWidth;

    const i0 = Math.max(Math.floor((x - rimOuter - this.originX) / cell), 0);
    const i1 = Math.min(Math.ceil((x + rimOuter - this.originX) / cell), cols - 1);
    const j0 = Math.max(Math.floor((z - rimOuter - this.originZ) / cell), 0);
    const j1 = Math.min(Math.ceil((z + rimOuter - this.originZ) / cell), rows - 1);
    if (i0 > i1 || j0 > j1) return 0;

    const r2 = s.radius * s.radius;
    const outer2 = rimOuter * rimOuter;
    let removed = 0;
    let rimWeight = 0;

    // First pass: press down, and measure how much room the rim has.
    for (let j = j0; j <= j1; j++) {
      const dz = this.zAt(j) - z;
      for (let i = i0; i <= i1; i++) {
        const dx = this.xAt(i) - x;
        const d2 = dx * dx + dz * dz;
        const k = j * cols + i;
        if (d2 < r2) {
          const floor = base[k] - floorDepth;
          // Near the edge of the slab the snow gives less and less.
          const target = Math.max(s.shapeAt(d2), base[k] - floorDepth * give[k]);
          if (height[k] > target) {
            removed += height[k] - target;
            height[k] = target;
          }
          const sunk = base[k] - height[k];
          if (sunk > 0) {
            // Deeper = darker and bluer; right at hard ground, a second tint.
            const tint = Math.min((sunk / p.fullTintDepth) ** 0.7, 1);
            const hard = clamp01(1 - (height[k] - floor) / p.hardGroundBlend);
            if (tint + hard > pressed[k]) pressed[k] = tint + hard;
          }
        } else if (d2 < outer2) {
          rimWeight += this.rimWeightAt(dx, dz, d2, k, s);
        }
      }
    }

    if (removed > 0 && rimWeight > 0) {
      // Second pass: pile the pushed-away snow onto the ring.
      const perWeight = (removed * s.rimShare) / rimWeight;
      for (let j = j0; j <= j1; j++) {
        const dz = this.zAt(j) - z;
        for (let i = i0; i <= i1; i++) {
          const dx = this.xAt(i) - x;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2 || d2 >= outer2) continue;
          const k = j * cols + i;
          const w = this.rimWeightAt(dx, dz, d2, k, s);
          if (w <= 0) continue;
          const top = base[k] + s.rimCap * Math.min(w, 1 + s.plough) * give[k];
          if (height[k] < top) {
            height[k] = Math.min(height[k] + perWeight * w, top);
          }
        }
      }

      // Third pass: soften the piled-up ring a little, so it reads as loose
      // snow instead of single sharp points.
      for (let j = Math.max(j0, 1); j <= Math.min(j1, rows - 2); j++) {
        const dz = this.zAt(j) - z;
        for (let i = Math.max(i0, 1); i <= Math.min(i1, cols - 2); i++) {
          const dx = this.xAt(i) - x;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2 || d2 >= outer2) continue;
          const k = j * cols + i;
          if (height[k] <= base[k]) continue;
          const around =
            (height[k - 1] + height[k + 1] + height[k - cols] + height[k + cols]) / 4;
          height[k] += (Math.max(around, base[k]) - height[k]) * p.rimSoften;
        }
      }
    }

    this.markDirty(i0, i1, j0, j1);
    return removed;
  }

  private rimWeightAt(
    dx: number,
    dz: number,
    d2: number,
    k: number,
    s: Stamp,
  ): number {
    const d = Math.sqrt(d2);
    // A soft hump across the ring; snow already pushed down (an older groove) takes none.
    let w = Math.sin(Math.PI * clamp01((d - s.radius) / s.rimWidth));
    const sunk = (this.base[k] - this.height[k]) / content.press.rimSkipDepth;
    w *= clamp01(1 - sunk);
    if (s.plough > 0 && d > 0) {
      // More ahead of the movement, some beside it, very little behind.
      const ahead = (dx * s.moveX + dz * s.moveZ) / d;
      w *= Math.max(1 + s.plough * ahead, content.press.ploughBehind);
    }
    if (s.lumpiness > 0) {
      const angle = Math.atan2(dz, dx);
      const lump = smoothNoise(angle * 2.5 + k * 0.0001, s.radius * 9.1);
      w *= 1 - s.lumpiness + s.lumpiness * 2 * lump;
    }
    return w;
  }

  private addKick(
    x: number,
    y: number,
    z: number,
    radius: number,
    removed: number,
    velocityX: number,
    velocityZ: number,
    burst: boolean,
  ): void {
    if (removed <= 0 || this.kicks.length >= 64) return;
    this.kicks.push({
      x,
      y,
      z,
      radius,
      volume: removed * this.cell * this.cell,
      velocityX,
      velocityZ,
      burst,
    });
  }

  /** Snow pushed away since the last call (for the spray of dust and clumps). */
  takeKicks(): Kick[] {
    if (this.kicks.length === 0) return this.kicks;
    const k = this.kicks;
    this.kicks = [];
    return k;
  }

  private markDirty(i0: number, i1: number, j0: number, j1: number): void {
    // One extra grid point all round, because the slope of the neighbours changes too.
    const x0 = Math.max(i0 - 1, 0);
    const x1 = Math.min(i1 + 1, this.cols - 1);
    const z0 = Math.max(j0 - 1, 0);
    const z1 = Math.min(j1 + 1, this.rows - 1);
    if (!this.dirty) {
      this.dirty = { x0, x1, z0, z1 };
    } else {
      this.dirty.x0 = Math.min(this.dirty.x0, x0);
      this.dirty.x1 = Math.max(this.dirty.x1, x1);
      this.dirty.z0 = Math.min(this.dirty.z0, z0);
      this.dirty.z1 = Math.max(this.dirty.z1, z1);
    }
  }

  /** The region changed since the last call, or null if nothing changed. */
  takeDirty(): DirtyRect | null {
    const d = this.dirty;
    this.dirty = null;
    return d;
  }

  /** Surface slope at a grid point, written as an upward-pointing normal. */
  normalInto(i: number, j: number, out: Float32Array, offset: number): void {
    const { cols, rows, height, cell } = this;
    const il = i > 0 ? i - 1 : i;
    const ir = i < cols - 1 ? i + 1 : i;
    const jd = j > 0 ? j - 1 : j;
    const ju = j < rows - 1 ? j + 1 : j;
    const sx = (height[j * cols + ir] - height[j * cols + il]) / ((ir - il) * cell);
    const sz = (height[ju * cols + i] - height[jd * cols + i]) / ((ju - jd) * cell);
    const inv = 1 / Math.sqrt(sx * sx + sz * sz + 1);
    out[offset] = -sx * inv;
    out[offset + 1] = inv;
    out[offset + 2] = -sz * inv;
  }
}
