// Prints the sim's result for a few exact shots (compare with the same shots thrown in the browser).
import { FORMATIONS } from "@/features/pins";
import { aimAt, initPhysics, planShot, simulateThrow } from "./sim";

const shots = [
  [0, 1, 0], [0, 1, 0.3], [0, 0.55, 0], [1, 0.85, 0.25], [-1, 0.35, -0.5], [2, 1, 0], [0, 0.15, 0],
];
await initPhysics();
const f = FORMATIONS.find((x) => x.id === (process.argv[2] ?? "triangle"))!;
for (const [x, p, t] of shots) {
  const angle = aimAt(x, t, p);
  const plan = planShot({ x, power: p, angle })!;
  const r = simulateThrow(f, plan);
  console.log(JSON.stringify({ x, p, t, angle: +angle.toFixed(3), down: r.downs.filter(Boolean).length, downs: r.downs.map(Number).join(""), start: [+plan.start.x.toFixed(3), +plan.start.z.toFixed(3)], r: +plan.radius.toFixed(3) }));
}
