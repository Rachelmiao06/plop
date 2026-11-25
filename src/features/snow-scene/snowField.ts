import { content } from "./content";

// The snow as numbers: a grid of heights that can be pressed down.
// No drawing happens here; SnowGround reads this grid and redraws only the
// part that changed.

export type DirtyRect = { x0: number; x1: number; z0: number; z1: number };

/** What other features may do to the snow. All positions are scene x and z. */
export type SnowApi = {
  /** Press a rounded groove, as a ball of this radius resting at this point would. */
  pressGroove: (x: number, z: number, ballRadius: number) => void;
  /** Punch a crater of this radius, with a lumpy rim thrown up around it. */
  punchCrater: (x: number, z: number, radius: number) => void;
  /** Height of the snow surface at this point. */
  heightAt: (x: number, z: number) => number;
};

type RimSettings = {
  rimShare: number;
  rimWidth: number;
  rimMaxHeight: number;
  lumpiness: number;
};

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
  /** How packed the snow is per grid point, 0 (fresh) to 1 (fully pressed). */
  readonly pressed: Float32Array;

  private dirty: DirtyRect | null = null;

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

  pressGroove = (x: number, z: number, ballRadius: number): void => {
    const p = content.press;
    const r = Math.max(ballRadius, this.cell);
    const sink = Math.min(r * p.sinkPerRadius, content.ground.depth, r);
    // The ball rests with its lowest point `sink` below the untouched surface.
    const centerY = this.sample(this.base, x, z) - sink + r;
    const contact = Math.sqrt(Math.max(r * r - (r - sink) * (r - sink), 0));
    this.stamp(
      x,
      z,
      contact,
      (d2) => centerY - Math.sqrt(Math.max(r * r - d2, 0)),
      {
        rimShare: p.rimShare,
        rimWidth: p.rimWidth,
        rimMaxHeight: p.rimMaxHeight,
        lumpiness: 0,
      },
    );
  };

  punchCrater = (x: number, z: number, radius: number): void => {
    const c = content.crater;
    const r = Math.max(radius, this.cell);
    const depth = Math.min(r * c.depthPerRadius, content.ground.depth);
    const surface = this.sample(this.base, x, z);
    this.stamp(
      x,
      z,
      r,
      // A bowl: deepest in the middle, meeting the surface at the edge.
      (d2) => surface - depth * (1 - d2 / (r * r)),
      {
        rimShare: c.rimShare,
        rimWidth: c.rimWidth,
        rimMaxHeight: c.rimMaxHeight,
        lumpiness: c.rimLumpiness,
      },
    );
  };

  /**
   * Lower the snow inside `radius` to the given shape, then pile part of the
   * snow that was pushed away into a ring just outside it.
   */
  private stamp(
    x: number,
    z: number,
    radius: number,
    shapeAt: (distanceSquared: number) => number,
    rim: RimSettings,
  ): void {
    const { cols, rows, cell, height, base, pressed } = this;
    const floorDepth = content.ground.depth;
    const fullTint = content.press.fullTintDepth;
    const rimOuter = radius * (1 + rim.rimWidth);

    const i0 = Math.max(Math.floor((x - rimOuter - this.originX) / cell), 0);
    const i1 = Math.min(Math.ceil((x + rimOuter - this.originX) / cell), cols - 1);
    const j0 = Math.max(Math.floor((z - rimOuter - this.originZ) / cell), 0);
    const j1 = Math.min(Math.ceil((z + rimOuter - this.originZ) / cell), rows - 1);
    if (i0 > i1 || j0 > j1) return;

    const r2 = radius * radius;
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
          const target = Math.max(shapeAt(d2), base[k] - floorDepth);
          if (height[k] > target) {
            removed += height[k] - target;
            height[k] = target;
          }
          const packed = Math.min((base[k] - height[k]) / fullTint, 1);
          if (packed > pressed[k]) pressed[k] = packed;
        } else if (d2 < outer2) {
          rimWeight += this.rimWeightAt(dx, dz, d2, radius, rim, k);
        }
      }
    }

    // Second pass: pile the pushed-away snow onto the ring.
    if (removed > 0 && rimWeight > 0) {
      const perWeight = (removed * rim.rimShare) / rimWeight;
      for (let j = j0; j <= j1; j++) {
        const dz = this.zAt(j) - z;
        for (let i = i0; i <= i1; i++) {
          const dx = this.xAt(i) - x;
          const d2 = dx * dx + dz * dz;
          if (d2 < r2 || d2 >= outer2) continue;
          const k = j * cols + i;
          const w = this.rimWeightAt(dx, dz, d2, radius, rim, k);
          if (w <= 0) continue;
          const top = base[k] + rim.rimMaxHeight * Math.min(w, 1);
          if (height[k] < top) {
            height[k] = Math.min(height[k] + perWeight * w, top);
          }
        }
      }

      // Third pass: soften the piled-up ring a little, so it reads as loose
      // snow instead of single sharp points.
      const soften = content.press.rimSoften;
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
          height[k] += (Math.max(around, base[k]) - height[k]) * soften;
        }
      }
    }

    this.markDirty(i0, i1, j0, j1);
  }

  private rimWeightAt(
    dx: number,
    dz: number,
    d2: number,
    radius: number,
    rim: RimSettings,
    k: number,
  ): number {
    const t = (Math.sqrt(d2) - radius) / (radius * rim.rimWidth);
    // A soft hump across the ring; snow already pushed down (an older groove) takes none.
    let w = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1));
    const sunk = (this.base[k] - this.height[k]) / content.press.rimSkipDepth;
    w *= Math.min(Math.max(1 - sunk, 0), 1);
    if (rim.lumpiness > 0) {
      const angle = Math.atan2(dz, dx);
      const lump = smoothNoise(angle * 2.5 + k * 0.0001, radius * 9.1);
      w *= 1 - rim.lumpiness + rim.lumpiness * 2 * lump;
    }
    return w;
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
