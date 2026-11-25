/**
 * Quick checks of the key bowling rules. No test framework: `runBowlingChecks()`
 * returns the list of rules that failed (empty = all good). The test page runs it once
 * in development and prints the result in the browser console.
 */
import { FEEL, copyFeel } from "./content";
import { pastSweet, planRoll, sweetPull, type Ground } from "./roll";
import { type BowlEvent, Bowling } from "./simulation";
import { distance } from "./vec";

function run(game: Bowling, seconds: number, dt: number) {
  for (let t = 0; t < seconds; t += dt) game.step(dt);
}

const PACKED: Ground = { packedAt: () => 1 };

export function runBowlingChecks(): string[] {
  const failed: string[] = [];
  const check = (ok: boolean, rule: string) => {
    if (!ok) failed.push(rule);
  };
  const lineZ = FEEL.lane.lineZ;

  // Sliding stays inside the lane and only while ready.
  {
    const game = new Bowling(copyFeel());
    game.slideTo(99);
    run(game, 1, 1 / 60);
    check(Math.abs(game.thrower.x - FEEL.lane.halfWidth) < 1e-3, "slides to the lane edge and stops");
    game.press();
    game.slideTo(0);
    run(game, 0.5, 1 / 60);
    check(Math.abs(game.thrower.x - FEEL.lane.halfWidth) < 1e-3, "cannot slide while pulling");
  }

  // Growth: farthest pull only, never shrinks; limit reached; rubber band.
  {
    const game = new Bowling(copyFeel());
    game.press();
    game.setTarget({ x: 0, z: lineZ + 0.8 });
    run(game, 1, 1 / 60);
    const half = game.thrower.ball!.radius;
    game.setTarget({ x: 0, z: lineZ + 0.3 });
    run(game, 1, 1 / 60);
    check(game.thrower.ball!.radius === half, "easing back does not shrink the ball");
    check(!game.thrower.ball!.charged, "not at the limit before full pull");
    game.setTarget({ x: 0, z: lineZ + 5 });
    run(game, 1.5, 1 / 60);
    const ball = game.thrower.ball!;
    check(ball.charged, "at the limit after a full pull");
    check(Math.abs(ball.radius - FEEL.ball.radiusBig) < 1e-9, "full size after a full pull on fresh snow");
    const pulled = distance(ball.track, game.thrower.foot);
    check(pulled > FEEL.pull.max && pulled <= FEEL.pull.max + FEEL.pull.rubberBand + 1e-9, "rubber band gives a little and stops");
  }

  // Packed snow grows the ball less.
  {
    const game = new Bowling(copyFeel(), PACKED);
    game.press();
    game.setTarget({ x: 0, z: lineZ + 5 });
    run(game, 1.5, 1 / 60);
    check(game.thrower.ball!.size < 0.5, "pulling over packed snow grows the ball less");
  }

  // The pull stays behind the thrower and inside the aim limit.
  {
    const game = new Bowling(copyFeel());
    game.press();
    game.setTarget({ x: 3, z: lineZ + 0.2 }); // far to the side
    run(game, 1, 1 / 60);
    const pull = game.thrower.pull;
    const degrees = (Math.atan2(pull.x, pull.z) * 180) / Math.PI;
    check(degrees <= FEEL.pull.maxAimDegrees + 1e-6, "aim stays inside its limit");
    game.setTarget({ x: 0, z: lineZ - 2 }); // pushed forward
    run(game, 1, 1 / 60);
    check(game.thrower.pull.z >= -1e-9 && game.thrower.aim === null, "pushing forward gives no pull");
  }

  // A tiny pull cancels.
  {
    const game = new Bowling(copyFeel());
    const events: BowlEvent[] = [];
    game.subscribe((e) => events.push(e));
    game.press();
    game.setTarget({ x: 0, z: lineZ + 0.1 });
    run(game, 0.5, 1 / 60);
    game.release();
    check(events.some((e) => e.type === "cancelled" && e.reason === "short"), "tiny pull cancels");
    check(game.balls.length === 0, "a cancelled ball does not roll");
  }

  // The ball rolls along the aim line and stops where the line said, at any frame rate.
  for (const dt of [1 / 30, 1 / 60, 1 / 144, 0.097]) {
    const game = new Bowling(copyFeel());
    const events: BowlEvent[] = [];
    game.subscribe((e) => events.push(e));
    game.slideTo(-1);
    run(game, 0.5, 1 / 60);
    game.press();
    game.setTarget({ x: game.thrower.foot.x + 0.4, z: lineZ + 1.1 });
    run(game, 1.5, 1 / 60);
    const aim = game.thrower.aim!;
    game.release();
    run(game, aim.duration + 0.5, dt);
    const stop = events.find((e) => e.type === "stopped");
    check(
      !!stop && stop.type === "stopped" && distance(stop.at, aim.stop) < 1e-9,
      `stops where the aim line ends (step ${dt.toFixed(3)}s)`,
    );
    check(aim.direction.z < 0 && aim.direction.x < 0, "rolls down the lane, opposite to the pull");
  }

  // Packed tracks run further; small balls are quicker than big ones.
  {
    const throwOn = (ground: Ground | undefined, pullBack: number) => {
      const game = new Bowling(copyFeel(), ground);
      game.press();
      game.setTarget({ x: 0, z: lineZ + pullBack });
      run(game, 2, 1 / 60);
      return game.thrower.aim!;
    };
    // The same ball (a full pull grows a smaller ball on packed snow, so compare the roll itself).
    const big = throwOn(undefined, 1.6);
    const onPacked = planRoll(big.start, { x: 0, z: 1.6 }, big.size, big.radius, FEEL, PACKED);
    check(!!onPacked && onPacked.distance > big.distance, "a packed track runs further");
    // The back wall: a full throw meets it, bounces back toward the lane and stops inside it.
    const wall = { cx: 0, cz: FEEL.lane.pinSpot.z * 0.45, radius: 11 };
    const walled = planRoll(big.start, { x: 0, z: 1.6 }, big.size, big.radius, FEEL, { packedAt: () => 0, wall });
    const out = walled ? Math.hypot(walled.stop.x - wall.cx, walled.stop.z - wall.cz) : Infinity;
    check(
      !!walled && walled.bounces.length > 0 && out < wall.radius - FEEL.wall.inset && walled.stop.z > walled.bounces[0].z,
      "a full throw bounces off the back wall and rolls back",
    );
    check(throwOn(undefined, 0.5).startSpeed > throwOn(undefined, 1.6).startSpeed, "a small ball starts faster than a big one");
    // The sweet spot: a full pull is heavy (slower than its size alone would make it) and its aim sways.
    const sweetAt = sweetPull(FEEL);
    const full = throwOn(undefined, 1.6);
    check(pastSweet(full.power, FEEL) > 0.95, "a full pull is past the sweet spot");
    check(pastSweet(throwOn(undefined, sweetAt - 0.05).power, FEEL) === 0, "a pull short of the sweet spot is not heavy");
    const swaying = new Bowling(copyFeel());
    swaying.press();
    swaying.setTarget({ x: 0, z: lineZ + 1.6 });
    let most = 0;
    for (let k = 0; k < 120; k++) {
      run(swaying, 1 / 60, 1 / 60);
      most = Math.max(most, Math.abs(swaying.thrower.wobble));
    }
    check(most > FEEL.pull.sweet.wobbleDegrees * 0.5, "the aim sways at a full pull");
    // Soft snow slows the roll (the aim line shows it).
    const soft: Ground = { packedAt: () => 0, softAt: () => 1 };
    check(throwOn(soft, 1.2).distance < throwOn(undefined, 1.2).distance * 0.6, "a soft mound slows the ball");
  }

  // Follow is frame-rate independent.
  {
    const at = (dt: number) => {
      const game = new Bowling(copyFeel());
      game.press();
      game.setTarget({ x: 0.3, z: lineZ + 1.2 });
      run(game, 0.12, dt);
      return game.thrower.ball!.position;
    };
    check(distance(at(1 / 30), at(1 / 240)) < 0.02, "ball follows the same at 30 and 240 fps");
  }

  // Swapping the thrower only between throws.
  {
    const game = new Bowling(copyFeel());
    check(game.setThrower("two") && game.thrower.id === "two", "thrower can be swapped while ready");
    game.press();
    check(!game.setThrower("one"), "thrower cannot be swapped mid-pull");
  }

  return failed;
}
