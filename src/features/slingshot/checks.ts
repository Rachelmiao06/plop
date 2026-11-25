/**
 * Quick checks of the key slingshot rules. No test framework: `runSlingshotChecks()`
 * returns the list of rules that failed (empty = all good). The test page runs it once
 * in development and prints the result in the browser console.
 */
import { arcPoint, computeArc } from "./arc";
import { FEEL, copyFeel } from "./content";
import { type SlingEvent, Slingshot } from "./simulation";
import { distance } from "./vec";

function run(sim: Slingshot, seconds: number, dt: number) {
  for (let t = 0; t < seconds; t += dt) sim.step(dt);
}

export function runSlingshotChecks(): string[] {
  const failed: string[] = [];
  const check = (ok: boolean, rule: string) => {
    if (!ok) failed.push(rule);
  };
  const home = FEEL.homes.left;

  // Growth follows the farthest pull and never shrinks; charged at the limit.
  {
    const sim = new Slingshot(copyFeel());
    sim.press("left");
    sim.setTarget("left", { x: home.x - 1, z: 0 });
    run(sim, 1, 1 / 60);
    const half = sim.players.left.ball!.radius;
    sim.setTarget("left", { x: home.x - 0.4, z: 0 });
    run(sim, 1, 1 / 60);
    check(sim.players.left.ball!.radius === half, "easing back does not shrink the ball");
    check(!sim.players.left.ball!.charged, "not charged before the limit");
    sim.setTarget("left", { x: home.x - 5, z: 0 });
    run(sim, 1, 1 / 60);
    const ball = sim.players.left.ball!;
    check(ball.charged, "charged at the limit");
    check(ball.radius === FEEL.ball.radiusBig, "full size at the limit");
    const pulled = distance(ball.position, home);
    check(pulled > FEEL.pull.max && pulled <= FEEL.pull.max + FEEL.pull.rubberBand + 1e-9, "rubber band gives a little and stops");
  }

  // A tiny pull cancels.
  {
    const sim = new Slingshot(copyFeel());
    const events: SlingEvent[] = [];
    sim.subscribe((e) => events.push(e));
    sim.press("left");
    sim.setTarget("left", { x: home.x - 0.1, z: 0 });
    run(sim, 0.5, 1 / 60);
    sim.release("left");
    check(events.some((e) => e.type === "cancelled" && e.reason === "short"), "tiny pull cancels");
    check(sim.flying.length === 0, "cancelled ball does not fly");
  }

  // The ball lands exactly where the preview said, at any frame rate; a hit stops pulling.
  for (const dt of [1 / 30, 1 / 60, 1 / 144, 0.097]) {
    const sim = new Slingshot(copyFeel());
    const landed: SlingEvent[] = [];
    sim.subscribe((e) => (e.type === "landed" || e.type === "hit") && landed.push(e));
    sim.press("left");
    sim.setTarget("left", { x: home.x - 1.2, z: 0.15 });
    run(sim, 1.5, 1 / 60);
    const preview = sim.players.left.aim!;
    sim.release("left");
    run(sim, preview.flightTime + 0.5, dt);
    const land = landed.find((e) => e.type === "landed");
    check(
      !!land && land.type === "landed" && distance(land.at, preview.landing) < 1e-9,
      `lands on the preview ring (step ${dt.toFixed(3)}s)`,
    );
    const end = arcPoint(preview, 1);
    check(distance(end.position, preview.landing) < 1e-9, "arc ends at the landing point");
  }

  // Aimed at the other character: hit, recovery, no pulling meanwhile.
  {
    const sim = new Slingshot(copyFeel());
    const events: SlingEvent[] = [];
    sim.subscribe((e) => events.push(e));
    const right = FEEL.homes.right;
    // Find the pull that lands on the right character.
    let pullX = 0.4;
    for (; pullX <= FEEL.pull.max; pullX += 0.01) {
      const arc = computeArc(home, { x: -pullX, z: 0 }, 1, FEEL.ball.radiusBig, sim.feel);
      if (arc && arc.landing.x >= right.x) break;
    }
    sim.press("left");
    sim.setTarget("left", { x: home.x - FEEL.pull.max * 1.2, z: 0 }); // full charge first
    run(sim, 1, 1 / 60);
    sim.setTarget("left", { x: home.x - pullX, z: 0 });
    run(sim, 2, 1 / 60);
    sim.release("left");
    run(sim, 3, 1 / 60);
    check(events.some((e) => e.type === "hit" && e.player === "right"), "a ball landing on a character hits it");
    check(!events.some((e) => e.type === "hit" && e.player === "left"), "your own ball does not hit you");
    const sim2 = new Slingshot(copyFeel());
    sim2.players.right.recovery = 0.5;
    check(!sim2.press("right"), "cannot pull while recovering");
    run(sim2, 0.6, 1 / 60);
    check(sim2.press("right"), "can pull again after recovering");
  }

  // Frame-rate independence of the follow.
  {
    const at = (dt: number) => {
      const sim = new Slingshot(copyFeel());
      sim.press("left");
      sim.setTarget("left", { x: home.x - 1.5, z: 0.5 });
      run(sim, 0.12, dt);
      return sim.players.left.ball!.position;
    };
    check(distance(at(1 / 30), at(1 / 240)) < 0.02, "ball follows the same at 30 and 240 fps");
  }

  // Dwell grows while sitting still and resets when moving.
  {
    const sim = new Slingshot(copyFeel());
    sim.press("left");
    sim.setTarget("left", { x: home.x - 0.8, z: 0 });
    run(sim, 2, 1 / 60);
    check(sim.players.left.ball!.dwell > 1, "dwell grows while the ball sits still");
    sim.setTarget("left", { x: home.x - 1.6, z: 0 });
    run(sim, 0.05, 1 / 60);
    check(sim.players.left.ball!.dwell === 0, "dwell resets when the ball moves");
  }

  return failed;
}
