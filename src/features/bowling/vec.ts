/** A point or direction on the snow: `x` left to right, `z` back to front. Scene units. */
export type Vec2 = { x: number; z: number };

export const vec = (x = 0, z = 0): Vec2 => ({ x, z });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, z: a.z + b.z });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, z: a.z - b.z });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, z: a.z * s });
export const length = (a: Vec2): number => Math.hypot(a.x, a.z);
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.z - b.z);

export const clamp01 = (t: number): number =>
  Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Share of a gap to close this frame when closing `rate` per second: the same feel at any frame rate. */
export const ease = (rate: number, seconds: number): number => 1 - Math.exp(-rate * seconds);
