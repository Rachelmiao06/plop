import { content } from "./content";

// The snow as numbers. Untouched snow is a formula (baseHeightAt), the same
// everywhere. Where something presses, small square tiles of fine height grid
// are made on the spot and remember the dents. So the snow can be pressed
// anywhere, and only the pressed places cost memory.
// No drawing happens here; SnowGround draws the tiles and the plain snow
// around them, and SnowSpray reads the "kicks" to throw snow up.

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

/** Options for a fresh snowfall. */
export type FreshSnowfallOptions = {
  /** Seconds from the first heavy flakes to smooth snow. Default in content.ts (about 3). */
  duration?: number;
};

/** A local refill: a circle on the snow. */
export type FreshRegion = { x: number; z: number; radius: number };

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

const smooth = (lo: number, hi: number, v: number) => {
  const t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

/**
 * Height of untouched snow anywhere: gentle drifts near the middle, slowly
 * giving way to bigger mounds in the distance. (The fine ripples are drawn
 * as shading only.) Tiles and the plain snow both use this, so they meet exactly.
 */
export function baseHeightAt(x: number, z: number): number {
  const g = content.ground;
  const f = content.surround;
  const far = Math.hypot(x, z - g.centerZ);
  const near = 1 - smooth(f.driftFadeStart, f.driftFadeEnd, far);
  let h = 0;
  if (near > 0) {
    h +=
      (smoothNoise(x * g.driftScale + 11.3, z * g.driftScale + 4.7) - 0.5) *
      2 *
      g.driftHeight *
      near;
  }
  const mid =
    smooth(f.midStart, f.midFull, far) * (1 - smooth(f.midFadeStart, f.midFadeEnd, far));
  if (mid > 0) {
    h +=
      (smoothNoise(x * f.midScale + 21.4, z * f.midScale + 2.6) - 0.5) *
      2 *
      f.midHeight *
      mid;
  }
  const mounds = smooth(f.moundStart, f.moundFull, far);
  if (mounds > 0) {
    h +=
      (smoothNoise(x * f.moundScale + 31.7, z * f.moundScale + 17.9) - 0.4) *
      f.moundHeight *
      mounds;
  }
  return h;
}

/** Slope of untouched snow at a point, written as an upward-pointing normal. */
export function baseNormalInto(
  x: number,
  z: number,
  out: Float32Array,
  offset: number,
): void {
  const e = content.ground.cell;
  const sx = (baseHeightAt(x + e, z) - baseHeightAt(x - e, z)) / (2 * e);
  const sz = (baseHeightAt(x, z + e) - baseHeightAt(x, z - e)) / (2 * e);
  const inv = 1 / Math.sqrt(sx * sx + sz * sz + 1);
  out[offset] = -sx * inv;
  out[offset + 1] = inv;
  out[offset + 2] = -sz * inv;
}

/** One square of fine, pressable snow. Made the first time something presses there. */
export class SnowTile {
  readonly tx: number;
  readonly tz: number;
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
  dirty: DirtyRect | null = null;
  /**
   * Fresh snowfall on this tile: when its refill starts (field clock,
   * seconds; null = not refilling), how far it got (0 to 1), and the circle
   * it is limited to (null = the whole tile).
   */
  freshStart: number | null = null;
  freshDone = 0;
  freshLength = 1;
  freshRegion: FreshRegion | null = null;

  constructor(tx: number, tz: number) {
    const g = content.ground;
    const size = g.tileSize;
    this.tx = tx;
    this.tz = tz;
    const away = Math.hypot((tx + 0.5) * size, (tz + 0.5) * size - g.centerZ);
    this.cell = away < g.fineRadius ? g.cell : g.farCell;
    this.cols = Math.round(size / this.cell) + 1;
    this.rows = this.cols;
    this.originX = tx * size;
    this.originZ = tz * size;
    const n = this.cols * this.rows;
    this.height = new Float32Array(n);
    this.base = new Float32Array(n);
    this.pressed = new Float32Array(n);
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const k = j * this.cols + i;
        const h = baseHeightAt(this.xAt(i), this.zAt(j));
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

  sample(grid: Float32Array, x: number, z: number): number {
    const cx = Math.min(Math.max((x - this.originX) / this.cell, 0), this.cols - 1.001);
    const cz = Math.min(Math.max((z - this.originZ) / this.cell, 0), this.rows - 1.001);
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

  markDirty(i0: number, i1: number, j0: number, j1: number): void {
    if (!this.dirty) {
      this.dirty = { x0: i0, x1: i1, z0: j0, z1: j1 };
    } else {
      this.dirty.x0 = Math.min(this.dirty.x0, i0);
      this.dirty.x1 = Math.max(this.dirty.x1, i1);
      this.dirty.z0 = Math.min(this.dirty.z0, j0);
      this.dirty.z1 = Math.max(this.dirty.z1, j1);
    }
  }

  /** The part changed since the last call, or null if nothing changed. */
  takeDirty(): DirtyRect | null {
    const d = this.dirty;
    this.dirty = null;
    return d;
  }

  isBorder(i: number, j: number): boolean {
    return i === 0 || j === 0 || i === this.cols - 1 || j === this.rows - 1;
  }
}

/** A tile and the part of it a press touches. */
type Span = { tile: SnowTile; i0: number; i1: number; j0: number; j1: number };

export class SnowField implements SnowApi {
  readonly cell = content.ground.cell;
  readonly tiles = new Map<string, SnowTile>();
  /** Which tile squares exist, for the plain snow to hide itself under them. */
  readonly occupancy: Uint8Array;
  readonly occupancySize: number;

  private fresh: SnowTile[] = [];
  private freed: SnowTile[] = [];
  private kicks: Kick[] = [];

  // Fresh snowfall. The field keeps its own clock (advanced by the drawing
  // code every frame), so refills are timed the same at any frame rate.
  private clock = 0;
  private heavyUntil = -1;
  private heavy = 0;
  private freshCursor = 0;

  constructor() {
    const g = content.ground;
    this.occupancySize = 2 * Math.ceil(g.pressReach / g.tileSize);
    this.occupancy = new Uint8Array(this.occupancySize * this.occupancySize);
  }

  private key(tx: number, tz: number): string {
    return `${tx},${tz}`;
  }

  private tileAt(x: number, z: number): SnowTile | undefined {
    const size = content.ground.tileSize;
    return this.tiles.get(this.key(Math.floor(x / size), Math.floor(z / size)));
  }

  /** Make sure tiles exist over this area (within reach and the tile limit). */
  private ensureTiles(x0: number, x1: number, z0: number, z1: number): void {
    const g = content.ground;
    const size = g.tileSize;
    const half = this.occupancySize / 2;
    for (let tz = Math.floor(z0 / size); tz <= Math.floor(z1 / size); tz++) {
      for (let tx = Math.floor(x0 / size); tx <= Math.floor(x1 / size); tx++) {
        if (tx < -half || tz < -half || tx >= half || tz >= half) continue;
        const key = this.key(tx, tz);
        if (this.tiles.has(key) || this.tiles.size >= g.maxTiles) continue;
        const tile = new SnowTile(tx, tz);
        this.tiles.set(key, tile);
        this.fresh.push(tile);
        // 255 = "tile here" (the graphics card reads a byte as 0 to 1).
        this.occupancy[(tz + half) * this.occupancySize + (tx + half)] = 255;
      }
    }
  }

  /** The parts of existing tiles that this area covers. */
  private spans(x0: number, x1: number, z0: number, z1: number): Span[] {
    const size = content.ground.tileSize;
    const out: Span[] = [];
    for (let tz = Math.floor(z0 / size); tz <= Math.floor(z1 / size); tz++) {
      for (let tx = Math.floor(x0 / size); tx <= Math.floor(x1 / size); tx++) {
        const tile = this.tiles.get(this.key(tx, tz));
        if (!tile) continue;
        const i0 = Math.max(Math.floor((x0 - tile.originX) / tile.cell), 0);
        const i1 = Math.min(Math.ceil((x1 - tile.originX) / tile.cell), tile.cols - 1);
        const j0 = Math.max(Math.floor((z0 - tile.originZ) / tile.cell), 0);
        const j1 = Math.min(Math.ceil((z1 - tile.originZ) / tile.cell), tile.rows - 1);
        if (i0 <= i1 && j0 <= j1) out.push({ tile, i0, i1, j0, j1 });
      }
    }
    return out;
  }

  heightAt = (x: number, z: number): number => {
    const tile = this.tileAt(x, z);
    return tile ? tile.sample(tile.height, x, z) : baseHeightAt(x, z);
  };

  packedAt = (x: number, z: number): number => {
    const tile = this.tileAt(x, z);
    return tile ? clamp01(tile.sample(tile.pressed, x, z)) : 0;
  };

  pressGroove = (
    x: number,
    z: number,
    ballRadius: number,
    options?: PressOptions,
  ): void => {
    const p = content.press;
    const depth = content.ground.depth;
    const r = Math.max(ballRadius, this.cell);
    const surface = baseHeightAt(x, z);
    const current = this.heightAt(x, z);
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
      rimWidth: Math.min(radius * p.rimWidth, p.rimWidthMax * Math.max(r / 0.28, 1)),
      rimCap: Math.min(
        Math.max(Math.min(sink, depth) * p.rimHeightPerDepth, p.rimMinHeight),
        p.rimMaxHeight * Math.max(r / 0.28, 1),
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
    const surface = this.heightAt(x, z);
    const removed = this.stamp(x, z, {
      radius: r,
      // A bowl: deepest in the middle, meeting the surface at the edge.
      shapeAt: (d2) => surface - depth * (1 - d2 / (r * r)),
      rimShare: c.rimShare,
      rimWidth: r * c.rimWidth,
      rimCap: c.rimMaxHeight * Math.max(r / 0.5, 1),
      lumpiness: c.rimLumpiness,
      moveX: 0,
      moveZ: 0,
      plough: 0,
    });
    this.addKick(x, surface, z, r, removed, 0, 0, true);
  };

  /**
   * Lower the snow inside `radius` to the given shape, then pile part of the
   * snow that was pushed away into a ring just outside it. Works across tile
   * borders. Returns how much snow was pushed away (summed height over grid points).
   */
  private stamp(x: number, z: number, s: Stamp): number {
    const floorDepth = content.ground.depth;
    const p = content.press;
    const rimOuter = s.radius + s.rimWidth;
    // One extra grid square all round, because the slope there changes too.
    const reach = rimOuter + this.cell * 2;
    this.ensureTiles(x - reach, x + reach, z - reach, z + reach);
    const spans = this.spans(x - rimOuter, x + rimOuter, z - rimOuter, z + rimOuter);
    if (spans.length === 0) return 0;

    const r2 = s.radius * s.radius;
    const outer2 = rimOuter * rimOuter;
    let removed = 0;
    let rimWeight = 0;

    // First pass: press down, and measure how much room the rim has.
    for (const { tile, i0, i1, j0, j1 } of spans) {
      const { cols, height, base, pressed } = tile;
      for (let j = j0; j <= j1; j++) {
        const dz = tile.zAt(j) - z;
        for (let i = i0; i <= i1; i++) {
          const dx = tile.xAt(i) - x;
          const d2 = dx * dx + dz * dz;
          const k = j * cols + i;
          if (d2 < r2) {
            const floor = base[k] - floorDepth;
            const target = Math.max(s.shapeAt(d2), floor);
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
            rimWeight += this.rimWeightAt(tile, dx, dz, d2, k, s);
          }
        }
      }
    }

    if (removed > 0 && rimWeight > 0) {
      // Second pass: pile the pushed-away snow onto the ring.
      const perWeight = (removed * s.rimShare) / rimWeight;
      for (const { tile, i0, i1, j0, j1 } of spans) {
        const { cols, height, base } = tile;
        for (let j = j0; j <= j1; j++) {
          const dz = tile.zAt(j) - z;
          for (let i = i0; i <= i1; i++) {
            const dx = tile.xAt(i) - x;
            const d2 = dx * dx + dz * dz;
            if (d2 < r2 || d2 >= outer2) continue;
            const k = j * cols + i;
            const w = this.rimWeightAt(tile, dx, dz, d2, k, s);
            if (w <= 0) continue;
            const top = base[k] + s.rimCap * Math.min(w, 1 + s.plough);
            if (height[k] < top) {
              height[k] = Math.min(height[k] + perWeight * w, top);
            }
          }
        }
      }

      // Third pass: soften the piled-up ring a little, so it reads as loose
      // snow instead of single sharp points. A point on a tile border is
      // shared with the next tile, so it is done once and written to both.
      const done = new Set<string>();
      for (const { tile, i0, i1, j0, j1 } of spans) {
        const { cols, height, base, cell } = tile;
        for (let j = j0; j <= j1; j++) {
          const pz = tile.zAt(j);
          const dz = pz - z;
          for (let i = i0; i <= i1; i++) {
            const px = tile.xAt(i);
            const dx = px - x;
            const d2 = dx * dx + dz * dz;
            if (d2 < r2 || d2 >= outer2) continue;
            const k = j * cols + i;
            if (height[k] <= base[k]) continue;
            if (!tile.isBorder(i, j)) {
              const around =
                (height[k - 1] + height[k + 1] + height[k - cols] + height[k + cols]) / 4;
              height[k] += (Math.max(around, base[k]) - height[k]) * p.rimSoften;
              continue;
            }
            const key = `${Math.round(px / cell)},${Math.round(pz / cell)},${cell}`;
            if (done.has(key)) continue;
            done.add(key);
            const around =
              (this.heightAt(px - cell, pz) +
                this.heightAt(px + cell, pz) +
                this.heightAt(px, pz - cell) +
                this.heightAt(px, pz + cell)) /
              4;
            const next = height[k] + (Math.max(around, base[k]) - height[k]) * p.rimSoften;
            for (const other of spans) {
              const t = other.tile;
              if (t.cell !== cell) continue;
              const oi = Math.round((px - t.originX) / cell);
              const oj = Math.round((pz - t.originZ) / cell);
              if (oi < 0 || oj < 0 || oi >= t.cols || oj >= t.rows) continue;
              t.height[oj * t.cols + oi] = next;
            }
          }
        }
      }
    }

    // Mark what changed, plus a square all round (its slope changes too).
    for (const { tile, i0, i1, j0, j1 } of this.spans(
      x - rimOuter - this.cell,
      x + rimOuter + this.cell,
      z - rimOuter - this.cell,
      z + rimOuter + this.cell,
    )) {
      tile.markDirty(i0, i1, j0, j1);
    }
    return removed;
  }

  private rimWeightAt(
    tile: SnowTile,
    dx: number,
    dz: number,
    d2: number,
    k: number,
    s: Stamp,
  ): number {
    const d = Math.sqrt(d2);
    // A soft hump across the ring; snow already pushed down (an older groove) takes none.
    let w = Math.sin(Math.PI * clamp01((d - s.radius) / s.rimWidth));
    const sunk = (tile.base[k] - tile.height[k]) / content.press.rimSkipDepth;
    w *= clamp01(1 - sunk);
    if (s.plough > 0 && d > 0) {
      // More ahead of the movement, some beside it, very little behind.
      const ahead = (dx * s.moveX + dz * s.moveZ) / d;
      w *= Math.max(1 + s.plough * ahead, content.press.ploughBehind);
    }
    if (s.lumpiness > 0) {
      const angle = Math.atan2(dz, dx);
      const lump = smoothNoise(angle * 2.5 + (dx + dz) * 0.37, s.radius * 9.1);
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

  /** Tiles made since the last call (for drawing). */
  takeNewTiles(): SnowTile[] {
    if (this.fresh.length === 0) return this.fresh;
    const t = this.fresh;
    this.fresh = [];
    return t;
  }

  /**
   * Fresh snowfall over all the snow: the snow falls harder, then every dent
   * settles back to untouched snow over a few seconds, and the tiles are
   * freed. Safe to call again while one is running (it carries on, and also
   * takes in anything pressed since).
   */
  freshSnowfall = (options?: FreshSnowfallOptions): void => {
    const timing = this.startHeavy(options);
    for (const tile of this.tiles.values()) {
      // Already refilling the whole tile: leave it on its own schedule.
      if (tile.freshStart !== null && tile.freshRegion === null) continue;
      tile.freshStart = timing.start;
      tile.freshDone = 0;
      tile.freshLength = timing.settle;
      tile.freshRegion = null;
    }
  };

  /**
   * Fresh snowfall on one round patch only (centre x, z and radius in scene
   * units), fading out towards its edge. Tiles left completely smooth are freed.
   */
  freshSnowfallAt = (
    x: number,
    z: number,
    radius: number,
    options?: FreshSnowfallOptions,
  ): void => {
    if (!(radius > 0)) return;
    const timing = this.startHeavy(options);
    const size = content.ground.tileSize;
    for (const tile of this.tiles.values()) {
      // A tile already refilling completely needs nothing more.
      if (tile.freshStart !== null && tile.freshRegion === null) continue;
      const nx = Math.min(Math.max(x, tile.originX), tile.originX + size);
      const nz = Math.min(Math.max(z, tile.originZ), tile.originZ + size);
      if (Math.hypot(nx - x, nz - z) >= radius) continue;
      tile.freshStart = timing.start;
      tile.freshDone = 0;
      tile.freshLength = timing.settle;
      tile.freshRegion = { x, z, radius };
    }
  };

  /** How heavy the falling snow is right now: 0 normal, 1 a full fresh snowfall. */
  heaviness(): number {
    return this.heavy;
  }

  private startHeavy(options?: FreshSnowfallOptions): { start: number; settle: number } {
    const f = content.freshSnow;
    const duration = Math.max(options?.duration ?? f.duration, 0.3);
    // Keep the same share of the time for the snow to thicken first.
    const delay = Math.min(f.settleDelay, duration * 0.3);
    // If heavy snow is already falling, the ground can start straight away.
    const start = this.clock + (this.heavy > 0.5 ? 0 : delay);
    const settle = duration - delay;
    this.heavyUntil = Math.max(this.heavyUntil, start + settle);
    return { start, settle };
  }

  /**
   * Advance fresh snowfall by this many seconds: heavier or lighter flakes,
   * and the refilling tiles a step nearer smooth. Called once per frame by
   * the drawing code.
   */
  stepFresh(seconds: number): void {
    const f = content.freshSnow;
    const dt = Math.min(Math.max(seconds, 0), 0.1);
    this.clock += dt;
    const target = this.clock < this.heavyUntil ? 1 : 0;
    const rate = target > this.heavy ? 1 / f.heavyRise : 1 / f.heavyFall;
    this.heavy =
      target > this.heavy
        ? Math.min(this.heavy + rate * dt, 1)
        : Math.max(this.heavy - rate * dt, 0);

    const active: SnowTile[] = [];
    for (const tile of this.tiles.values()) {
      if (tile.freshStart !== null) active.push(tile);
    }
    if (active.length === 0) return;

    // Within the per-frame budget, take tiles in turn starting where the last
    // frame stopped. A skipped tile catches up next frame: its shape depends
    // only on how far its refill has got, not on how many steps it took.
    let budget = f.pointsPerFrame;
    const startAt = this.freshCursor % active.length;
    for (let n = 0; n < active.length; n++) {
      const tile = active[(startAt + n) % active.length];
      const cost = tile.cols * tile.rows;
      if (n > 0 && cost > budget) {
        this.freshCursor = startAt + n;
        return;
      }
      budget -= cost;
      this.refillTile(tile);
    }
    this.freshCursor = 0;
  }

  /** Tiles freed since the last call (for drawing). */
  takeFreedTiles(): SnowTile[] {
    if (this.freed.length === 0) return this.freed;
    const t = this.freed;
    this.freed = [];
    return t;
  }

  /** How many pressed tiles exist right now (each costs memory and drawing). */
  tileCount(): number {
    return this.tiles.size;
  }

  private refillTile(tile: SnowTile): void {
    const f = content.freshSnow;
    const p = content.press;
    const floorDepth = content.ground.depth;
    const start = tile.freshStart ?? this.clock;
    const linear = clamp01((this.clock - start) / Math.max(tile.freshLength, 0.01));
    if (linear <= 0) return;
    // Eased, so the snow starts settling gently and arrives softly.
    const done = linear * linear * (3 - 2 * linear);
    const before = tile.freshDone;
    if (done <= before) return;
    tile.freshDone = done;

    const { cols, rows, height, base, pressed } = tile;
    const region = tile.freshRegion;
    const finished = done >= 1;

    if (finished && region === null) {
      // All the way: exactly untouched snow, then let the tile go.
      height.set(base);
      pressed.fill(0);
      this.freeTile(tile);
      return;
    }

    const edge = Math.max(f.localEdge, 1e-3);
    let i0 = 0;
    let i1 = cols - 1;
    let j0 = 0;
    let j1 = rows - 1;
    if (region) {
      i0 = Math.max(Math.floor((region.x - region.radius - tile.originX) / tile.cell), 0);
      i1 = Math.min(Math.ceil((region.x + region.radius - tile.originX) / tile.cell), cols - 1);
      j0 = Math.max(Math.floor((region.z - region.radius - tile.originZ) / tile.cell), 0);
      j1 = Math.min(Math.ceil((region.z + region.radius - tile.originZ) / tile.cell), rows - 1);
    }

    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const k = j * cols + i;
        let weight = 1;
        if (region) {
          const d = Math.hypot(tile.xAt(i) - region.x, tile.zAt(j) - region.z) / region.radius;
          if (d >= 1) continue;
          const t = clamp01((1 - d) / edge);
          weight = t * t * (3 - 2 * t);
        }
        const qBefore = before * weight;
        const qNow = done * weight;
        if (qNow >= 1) {
          height[k] = base[k];
          pressed[k] = 0;
          continue;
        }
        const keep = (1 - qNow) / (1 - qBefore);
        const dev = height[k] - base[k];
        let below = 0;
        if (dev > 0) {
          // Rims and ploughed snow sink back.
          height[k] = base[k] + dev * keep ** f.rimFade;
        } else if (dev < 0) {
          // Pits: everything shallower, and nothing deeper than the rising
          // floor of new snow, so the bottom fills first.
          const cap = f.fillFromDepth * (1 - qNow) ** f.fillCurve;
          below = Math.min(-dev * keep, cap);
          height[k] = base[k] - below;
        }
        if (pressed[k] > 0) {
          // New snow on top is fresh: the pressed tint follows the depth that
          // is left and fades out with the refill.
          const tint = Math.min((below / p.fullTintDepth) ** 0.7, 1);
          const hard = clamp01(1 - (height[k] - (base[k] - floorDepth)) / p.hardGroundBlend);
          pressed[k] = Math.min(pressed[k] * keep, tint + hard);
        }
      }
    }

    // Settling snow rounds off sharp walls and rims: relax the dents (not the
    // untouched shape) a little towards their neighbours. Tile borders are
    // left alone so neighbouring tiles always agree there.
    const amount = Math.min((done - before) * f.soften, 0.5);
    if (amount > 0) {
      for (let j = Math.max(j0, 1); j <= Math.min(j1, rows - 2); j++) {
        for (let i = Math.max(i0, 1); i <= Math.min(i1, cols - 2); i++) {
          const k = j * cols + i;
          const dev = height[k] - base[k];
          const around =
            (height[k - 1] - base[k - 1] +
              height[k + 1] - base[k + 1] +
              height[k - cols] - base[k - cols] +
              height[k + cols] - base[k + cols]) /
            4;
          if (dev === 0 && around === 0) continue;
          let share = amount;
          if (region) {
            const d = Math.hypot(tile.xAt(i) - region.x, tile.zAt(j) - region.z) / region.radius;
            share *= clamp01((1 - d) / edge);
          }
          height[k] = base[k] + dev + (around - dev) * share;
        }
      }
    }
    tile.markDirty(i0, i1, j0, j1);

    if (finished) {
      // A local refill is done: free the tile if nothing pressed is left on it.
      tile.freshStart = null;
      tile.freshRegion = null;
      tile.freshDone = 0;
      if (this.isSmooth(tile)) {
        height.set(base);
        pressed.fill(0);
        this.freeTile(tile);
      }
    }
  }

  private isSmooth(tile: SnowTile): boolean {
    const { height, base, pressed } = tile;
    for (let k = 0; k < height.length; k++) {
      if (Math.abs(height[k] - base[k]) > 1e-4 || pressed[k] > 1e-3) return false;
    }
    return true;
  }

  private freeTile(tile: SnowTile): void {
    const key = this.key(tile.tx, tile.tz);
    if (this.tiles.get(key) !== tile) return;
    this.tiles.delete(key);
    const half = this.occupancySize / 2;
    this.occupancy[(tile.tz + half) * this.occupancySize + (tile.tx + half)] = 0;
    // A tile made and freed before it was ever drawn needs no drawing work.
    const unseen = this.fresh.indexOf(tile);
    if (unseen >= 0) this.fresh.splice(unseen, 1);
    else this.freed.push(tile);
  }

  /** Surface slope at a tile's grid point, written as an upward-pointing normal. */
  normalInto(tile: SnowTile, i: number, j: number, out: Float32Array, offset: number): void {
    let sx: number;
    let sz: number;
    if (tile.isBorder(i, j)) {
      // At a tile's edge, look across into the neighbour (or plain snow), so
      // both sides of the edge get the same slope and no line shows.
      const x = tile.xAt(i);
      const z = tile.zAt(j);
      const e = tile.cell;
      sx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
      sz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    } else {
      const { cols, height, cell } = tile;
      const k = j * cols + i;
      sx = (height[k + 1] - height[k - 1]) / (2 * cell);
      sz = (height[k + cols] - height[k - cols]) / (2 * cell);
    }
    const inv = 1 / Math.sqrt(sx * sx + sz * sz + 1);
    out[offset] = -sx * inv;
    out[offset + 1] = inv;
    out[offset + 2] = -sz * inv;
  }
}
