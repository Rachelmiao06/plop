/**
 * Clumps of snow falling off a big rolling ball: tiny paper-white lumps thrown up from its surface
 * that drop, plop into the snow (a small crater puff from the snow scene) and sink away.
 * Plain data plus one instanced mesh update per frame; numbers in `LOOK.clumps`.
 */
import { type InstancedMesh, Object3D } from "three";

import type { SnowApi } from "@/features/snow-scene";

import { LOOK } from "../content";
import type { RollingBall } from "../simulation";

type Clump = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  spin: number;
  /** Seconds since it came to rest; -1 while still in the air (or rolling). */
  landed: number;
  /** A big chunk knocked off by a card: it rolls on after landing, and melts slower. */
  chunk: boolean;
  /** Has touched the snow (a chunk then rolls until it stops). */
  down: boolean;
};

export class Clumps {
  private list: Clump[] = [];
  /** Distance rolled since the last clump, per ball id. */
  private owed = new Map<number, number>();
  private lastRolled = new Map<number, number>();
  private seed = 7;
  private holder = new Object3D();

  constructor(private snow: SnowApi, private radiusBig: number) {}

  private rnd() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** Shed clumps from each rolling ball and move the ones in the air. */
  step(balls: readonly RollingBall[], sink: number, dt: number) {
    const c = LOOK.clumps;
    const live = new Set<number>();
    for (const ball of balls) {
      live.add(ball.id);
      const r = ball.radius;
      const before = this.lastRolled.get(ball.id) ?? ball.rolled;
      this.lastRolled.set(ball.id, ball.rolled);
      const fast = Math.max(0, Math.min(1, (ball.speed - LOOK.speed.from) / (LOOK.speed.full - LOOK.speed.from)));
      if (!ball.rolling || (r < c.fromRadius && fast <= 0)) continue;
      const share = Math.max(0, Math.min(1, (r - c.fromRadius) / Math.max(0.01, this.radiusBig - c.fromRadius)));
      let owed =
        (this.owed.get(ball.id) ?? this.rnd() * 0.5) +
        (ball.rolled - before) * c.perUnit * (0.35 + 0.65 * share) * (1 + c.fastBoost * fast);
      while (owed >= 1 && this.list.length < c.max) {
        owed -= 1;
        this.spawn(ball, sink);
      }
      this.owed.set(ball.id, Math.min(owed, 1));
    }
    for (const id of [...this.owed.keys()]) {
      if (!live.has(id)) {
        this.owed.delete(id);
        this.lastRolled.delete(id);
      }
    }

    const ch = LOOK.chunks;
    for (const k of this.list) {
      if (k.landed >= 0) {
        k.landed += dt;
        continue;
      }
      if (k.down) {
        // A chunk tumbling on along the snow, slowing, until it stops.
        const v = Math.hypot(k.vx, k.vz);
        const slower = Math.max(0, v - ch.roll * dt);
        if (slower <= 0.05) {
          k.landed = 0;
          continue;
        }
        k.vx *= slower / v;
        k.vz *= slower / v;
        k.x += k.vx * dt;
        k.z += k.vz * dt;
        k.spin += (slower * dt) / Math.max(0.01, k.size * 0.5);
        k.y = this.snow.heightAt(k.x, k.z) + k.size * 0.35;
        continue;
      }
      k.vy -= c.gravity * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.z += k.vz * dt;
      k.spin += dt * 6;
      const ground = this.snow.heightAt(k.x, k.z);
      if (k.y - k.size * 0.4 <= ground && k.vy < 0) {
        k.y = ground + k.size * 0.4;
        this.snow.punchCrater(k.x, k.z, k.size * 1.1); // a little plop of snow
        if (k.chunk) {
          // A chunk keeps tumbling along the snow, having lost a little of its speed in the landing.
          k.down = true;
          k.vx *= 0.7;
          k.vz *= 0.7;
        } else k.landed = 0;
      }
    }
    this.list = this.list.filter((k) => k.landed < (k.chunk ? ch.melt : c.melt));
  }

  private spawn(ball: RollingBall, sink: number) {
    const c = LOOK.clumps;
    const r = ball.radius;
    const { x: dx, z: dz } = ball.direction;
    // From the upper sides and back of the ball, never the front.
    const side = this.rnd() < 0.5 ? -1 : 1;
    const around = 0.35 + this.rnd() * 0.6; // 0 = straight up, 1 = level with the side
    const back = -0.3 - this.rnd() * 0.5;
    const sx = dz * side; // across the roll
    const sz = -dx * side;
    const up = Math.cos(around * Math.PI * 0.5);
    const out = Math.sin(around * Math.PI * 0.5);
    const cx = ball.position.x;
    const cz = ball.position.z;
    const cy = this.snow.heightAt(cx, cz) + r * (1 - sink);
    const ox = sx * out + dx * back * 0.5;
    const oz = sz * out + dz * back * 0.5;
    const kickUp = c.kickUp[0] + this.rnd() * (c.kickUp[1] - c.kickUp[0]);
    const kickSide = c.kickSide * (0.3 + this.rnd() * 0.7);
    this.list.push({
      x: cx + ox * r,
      y: cy + up * r,
      z: cz + oz * r,
      vx: ball.velocity.x * c.carry + sx * kickSide,
      vy: kickUp,
      vz: ball.velocity.z * c.carry + sz * kickSide,
      size: c.size[0] + this.rnd() * (c.size[1] - c.size[0]),
      spin: this.rnd() * 6,
      landed: -1,
      chunk: false,
      down: false,
    });
  }

  /**
   * Big chunks knocked off a ball by a card (`LOOK.chunks`): `count` of them thrown out around `from` (unit, on the
   * snow) at the ball's edge point `x, z` (at height `y`), carried along `velocity` a little. Up to `scale` times
   * the usual size (a crumbling small ball throws smaller ones).
   */
  shatter(x: number, y: number, z: number, from: { x: number; z: number }, velocity: { x: number; z: number }, count: number, scale = 1) {
    const ch = LOOK.chunks;
    const cap = LOOK.clumps.max + ch.max;
    for (let n = 0; n < count && this.list.length < cap; n++) {
      // Spread across the struck side: up to about 70 degrees either way from straight out.
      const a = (this.rnd() * 2 - 1) * 1.2;
      const ox = from.x * Math.cos(a) - from.z * Math.sin(a);
      const oz = from.x * Math.sin(a) + from.z * Math.cos(a);
      const out = ch.speed[0] + this.rnd() * (ch.speed[1] - ch.speed[0]);
      this.list.push({
        x: x + ox * 0.05,
        y,
        z: z + oz * 0.05,
        vx: velocity.x * ch.carry + ox * out,
        vy: ch.up[0] + this.rnd() * (ch.up[1] - ch.up[0]),
        vz: velocity.z * ch.carry + oz * out,
        size: (ch.size[0] + this.rnd() * (ch.size[1] - ch.size[0])) * scale,
        spin: this.rnd() * 6,
        landed: -1,
        chunk: true,
        down: false,
      });
    }
  }

  /** Write the clumps into the two instanced meshes (body and outline share the same matrices). */
  draw(body: InstancedMesh, outline: InstancedMesh) {
    const h = this.holder;
    this.list.forEach((k, i) => {
      const melt = k.chunk ? LOOK.chunks.melt : LOOK.clumps.melt;
      const left = k.landed < 0 ? 1 : 1 - k.landed / melt;
      h.position.set(k.x, k.y - (1 - left) * k.size, k.z);
      h.rotation.set(k.spin, k.spin * 0.7, 0);
      // A lumpy, slightly flattened clump that sinks and shrinks after landing.
      h.scale.set(k.size * left, k.size * 0.8 * left, k.size * 1.1 * left);
      h.updateMatrix();
      body.setMatrixAt(i, h.matrix);
      outline.setMatrixAt(i, h.matrix);
    });
    body.count = this.list.length;
    outline.count = this.list.length;
    body.instanceMatrix.needsUpdate = true;
    outline.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.list = [];
    this.owed.clear();
    this.lastRolled.clear();
  }
}
