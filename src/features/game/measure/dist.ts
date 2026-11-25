// Where does the ball stop (and how fast is it at the pins) at each power? For tuning the sweet spot.
import { FEEL, ROLL_STEP, stepRoll } from "@/features/bowling";
import { planShot } from "./sim";

for (const k of [1, 0.92, 0.88, 0.84, 0.8]) {
  FEEL.pull.sweet.speedAtFull = k;
  const row: string[] = [];
  for (const p of [0.15, 0.35, 0.55, 0.62, 0.7, 0.85, 1]) {
    const plan = planShot({ x: 0, power: p, angle: 0 })!;
    const st = { position: { ...plan.start }, speed: plan.startSpeed, rolled: 0, age: 0 };
    let atPins = 0;
    while (stepRoll(st, plan, FEEL, { packedAt: () => 0 })) if (!atPins && st.position.z <= FEEL.lane.pinSpot.z) atPins = st.speed;
    row.push(`${p}: stop ${(plan.start.z - st.position.z).toFixed(1)} v@pins ${atPins.toFixed(1)} r ${plan.radius.toFixed(2)}`);
    void ROLL_STEP;
  }
  console.log(`speedAtFull ${k}\n  ` + row.join("\n  "));
}
