/**
 * Which shot scores best at each set? Throws a grid of shots at every formation with the headless replay
 * (`sim.ts`) and prints, per set: the expected points of "full power, straight at the middle" (the shot
 * everyone tries first), the best shot found, and the best shot at each power.
 *
 * Every grid shot is thrown a few times with a little aim error (a hand is not a robot), and the points are
 * the average. Run: `node src/features/game/measure/measure.mjs [rounds | old | set ids...]` (see README).
 */
import { FEEL } from "@/features/bowling";
import { ALL_SETS, FORMATIONS, ROUND_SETS, type Formation } from "@/features/pins";

import { aimAt, initPhysics, planShot, simulateThrow, type Shot } from "./sim";
import { scoreThrow, setGround, setShift, wobbleDegrees } from "./rules";

/** Aim error of a hand, in units sideways at the pins (each grid shot is thrown at these offsets). */
const HAND = [-0.24, -0.12, 0, 0.12, 0.24];
const POWERS = [0.15, 0.35, 0.55, 0.7, 0.85, 1];
const STANDS = [-2, -1, 0, 1, 2];
const TARGETS = Array.from({ length: 21 }, (_, i) => -2.5 + i * 0.25);

type Row = { shot: Shot; target: number; points: number };

function expected(formation: Formation, stand: number, target: number, power: number): number {
  const spot = FEEL.lane.pinSpot.x + setShift(formation);
  const ground = setGround(formation);
  let sum = 0;
  let n = 0;
  for (const hand of HAND) {
    const angle = aimAt(stand, spot + target + hand, power);
    // Past the sweet spot the aim wobbles: the hand cannot time it, so it lands anywhere in the wobble.
    const wob = wobbleDegrees(power);
    for (const w of wob > 0 ? [-0.85 * wob, 0, 0.85 * wob] : [0]) {
      const plan = planShot({ x: stand, power, angle }, FEEL, ground, w);
      if (!plan) continue;
      const { downs } = simulateThrow(formation, plan, FEEL, ground);
      sum += scoreThrow(formation, downs);
      n++;
    }
  }
  return n ? sum / n : 0;
}

async function main() {
  await initPhysics();
  const only = process.argv.slice(2);
  const sets = only[0] === "old" ? FORMATIONS : only[0] === "rounds" || !only.length ? ROUND_SETS : ALL_SETS.filter((f) => only.includes(f.id));
  const summary: string[] = [];
  for (const f of sets) {
    const rows: Row[] = [];
    for (const power of POWERS)
      for (const stand of STANDS)
        for (const target of TARGETS) rows.push({ shot: { x: stand, power, angle: 0 }, target, points: expected(f, stand, target, power) });
    rows.sort((a, b) => b.points - a.points);
    const naive = rows.find((r) => r.shot.x === 0 && r.shot.power === 1 && r.target === 0)!;
    const best = rows[0];
    const rank = rows.indexOf(naive) + 1;
    const byPower = POWERS.map((p) => {
      const r = rows.find((x) => x.shot.power === p)!;
      return `${p.toFixed(2)}:${r.points.toFixed(2)}`;
    }).join("  ");
    // "Middle at full power": from the middle of the line, full pull, straight at the middle of the set.
    const fullBest = rows.find((x) => x.shot.power === 1)!.points;
    const line = `${f.id.padEnd(14)} full-power best ${fullBest.toFixed(2)}  middle-full ${naive.points.toFixed(2)} (rank ${rank}/${rows.length})  best ${best.points.toFixed(2)} @ stand ${best.shot.x} aim ${best.target >= 0 ? "+" : ""}${best.target.toFixed(2)} from set middle power ${best.shot.power}  ${naive.points >= best.points - 0.25 ? "MIDDLE-FULL ~BEST" : "middle-full beaten"}`;
    console.log(line);
    console.log(`               best per power  ${byPower}`);
    summary.push(line);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
