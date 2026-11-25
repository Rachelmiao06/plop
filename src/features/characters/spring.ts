/** A tiny damped spring. Cheap secondary motion without a physics engine. */
export type SpringSettings = { stiffness: number; damping: number };

export class Spring {
  value: number;
  velocity = 0;

  constructor(value = 0) {
    this.value = value;
  }

  step(target: number, settings: SpringSettings, dt: number) {
    // Small fixed sub-steps keep stiff springs stable on slow frames.
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const force = (target - this.value) * settings.stiffness - this.velocity * settings.damping;
      this.velocity += force * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}
