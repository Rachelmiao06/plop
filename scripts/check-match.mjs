// The match flow check: `npm run check:match` (CI runs it in the `check` job).
// Plays whole matches on the game's real rules (src/features/game/rules.ts, no drawing, no timers) for every mode and
// length, and checks the match reaches "over" (the end card) with the right totals: in a normal match, when the last
// throw's result never comes, when the pins never stand again, when the hand-over never comes, and while the tab is
// in the background. Node's own TypeScript support runs the source as it is; no packages.
import assert from "node:assert/strict";
import { register } from "node:module";

// The source imports its neighbours without ".ts" (the bundler's way): try that ending when Node cannot find one.
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); } catch (error) {
    if (/^\\.\\.?\\//.test(spec) && !/\\.[cm]?[jt]sx?$/.test(spec)) return next(spec + ".ts", ctx);
    throw error;
  }
}`),
);

const { createGame, createWatchdog, pointsFor, stallStep } = await import("../src/features/game/rules.ts");
const { GAME } = await import("../src/features/game/content.ts");

const W = GAME.timing.watchdog;
const [ONE, TWO] = [GAME.players[0].thrower, GAME.players[1].thrower];

/** A small seeded random, so a failure can be played again. */
function random(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** One throw's count, as the pins would send it. */
function aCount(rnd) {
  const total = 6;
  const down = Math.floor(rnd() * (total + 1));
  return { down, fullClear: down === total, bonus: rnd() < 0.3 ? 2 : 0 };
}

/**
 * Plays a whole match. `stallAt` (a throw number) leaves out one step of that throw ("result", "ready" or "pass") and
 * lets the safety net take it, ticking a frame of 1/60 s at a time.
 */
function play({ rounds, players, mode, seed = 1, stallAt = -1, stall = null }) {
  const rnd = random(seed);
  const game = createGame();
  const dog = createWatchdog();
  game.start(rounds, players, mode);
  const expected = [0, 0];
  let throwNo = 0;
  let netSteps = 0;

  /** Frames go by until the state changes (the safety net acts) or `limit` seconds pass. */
  const wait = (limit) => {
    const before = game.getState();
    for (let t = 0; t < limit; t += 1 / 60) {
      const step = dog.tick(game.getState(), 1 / 60);
      if (step) {
        netSteps++;
        game.stall(step);
      }
      if (game.getState() !== before) return t;
    }
    return Infinity;
  };

  for (let guard = 0; game.getState().phase === "playing" && guard < 100; guard++) {
    const st = game.getState();
    const stalled = throwNo === stallAt ? stall : null;
    const throwers = mode === "together" ? [ONE, TWO] : [GAME.players[st.active].thrower];
    for (const t of throwers) game.launched(t);
    dog.tick(game.getState(), 0);
    assert.equal(game.getState().stage, "rolling", "a launched throw rolls");

    const counts = throwers.map(() => aCount(rnd));
    const live = counts.reduce((n, c) => n + c.down, 0);
    game.knocked(Math.min(live, 6));
    const liveDown = game.getState().down;
    if (stalled === "result") {
      const took = wait(W.rolling + 1);
      assert.ok(took <= W.rolling + 1 / 30, `the safety net counts a throw that never got its result (${took}s)`);
      // Counted as the cards lie, for the thrower on the line.
      expected[game.getState().active] += liveDown * GAME.score.perCard;
      // The real result arriving late changes nothing.
      const scores = game.getState().scores;
      game.result(counts[0]);
      assert.deepEqual(game.getState().scores, scores, "a late result after the safety net is ignored");
    } else if (mode === "together") {
      const byThrower = { [ONE]: counts[0], [TWO]: counts[1] };
      const down = Math.min(live, 6);
      game.result({ down, fullClear: false, bonus: 0, byThrower });
      expected[0] += pointsFor(counts[0]);
      expected[1] += pointsFor(counts[1]);
    } else {
      game.result(counts[0]);
      expected[st.active] += pointsFor(counts[0]);
    }
    dog.tick(game.getState(), 0);
    assert.equal(game.getState().stage, "counted", "the throw is counted");

    if (stalled === "ready") assert.ok(wait(W.counted + 1) < Infinity, "the safety net goes on when the pins never stand");
    else game.pinsReady();
    dog.tick(game.getState(), 0);
    assert.equal(game.getState().stage, "passing", "the turn is about to pass");

    if (stalled === "pass") assert.ok(wait(W.passing + 1) < Infinity, "the safety net hands over when the hand-over never comes");
    else game.passTurn();
    dog.tick(game.getState(), 0);
    throwNo++;
  }

  const end = game.getState();
  return { end, expected, throwNo, netSteps };
}

const MODES = [
  { name: "just me", players: 1, mode: "turns", throwsPerRound: 1 },
  { name: "take turns", players: 2, mode: "turns", throwsPerRound: 2 },
  { name: "team up", players: 2, mode: "together", throwsPerRound: 1 },
];

let checks = 0;
for (const m of MODES) {
  for (const rounds of GAME.match.lengths) {
    const total = rounds * m.throwsPerRound;
    const cases = [
      { label: "normal", stall: null, stallAt: -1 },
      ...["result", "ready", "pass"].flatMap((stall) => [
        { label: `last throw: no ${stall}`, stall, stallAt: total - 1 },
        { label: `first throw: no ${stall}`, stall, stallAt: 0 },
      ]),
    ];
    for (const c of cases) {
      for (const seed of [1, 7, 42]) {
        const { end, expected, throwNo, netSteps } = play({ rounds, players: m.players, mode: m.mode, seed, ...c });
        const what = `${m.name}, ${rounds} rounds, ${c.label} (seed ${seed})`;
        assert.equal(end.phase, "over", `${what}: the match ends (the end card shows)`);
        assert.equal(throwNo, total, `${what}: ${total} throws`);
        assert.equal(end.round, rounds - 1, `${what}: ends in the last round`);
        assert.deepEqual([...end.scores], expected, `${what}: the totals`);
        if (m.players === 1) assert.equal(end.scores[1], 0, `${what}: alone, nobody else scores`);
        assert.equal(netSteps > 0, c.stall !== null, `${what}: the safety net acts only when a step is missing`);
        checks++;
      }
    }
  }
}

// The tab in the background (no frames: no seconds of play), or one player of a team still aiming: never a stall.
{
  const game = createGame();
  game.start(3, 2, "turns");
  game.launched(ONE);
  const dog = createWatchdog();
  dog.tick(game.getState(), 0);
  for (let i = 0; i < 100000; i++) assert.equal(dog.tick(game.getState(), 0), null, "a hidden tab never trips the net");
  checks++;

  const team = createGame();
  team.start(3, 2, "together");
  team.launched(ONE);
  assert.equal(stallStep(team.getState(), 1000), null, "team up: waiting for the second thrower is not a stall");
  team.launched(TWO);
  assert.equal(stallStep(team.getState(), W.rolling + 1), "count", "team up: both thrown and nothing counted is a stall");
  checks++;
}

// "Play again" and "choose again" after the end card start clean.
{
  const game = createGame();
  game.start(3, 2, "turns");
  for (let i = 0; i < 6; i++) {
    game.launched(GAME.players[game.getState().active].thrower);
    game.result({ down: 1, fullClear: false, bonus: 0 });
    game.pinsReady();
    game.passTurn();
  }
  assert.equal(game.getState().phase, "over");
  game.again();
  assert.equal(game.getState().phase, "playing", "play again starts a match");
  assert.deepEqual([...game.getState().scores], [0, 0], "play again starts from zero");
  game.choose();
  assert.equal(game.getState().phase, "choosing", "choose again goes back to the start cards");
  checks++;
}

// The invite's way into the game: what "接受挑战" opens must keep everything the invite brought, or the end card loses
// the inviter's score ("Moss has 18 · so close", who lost the wager). Read back the way Game.tsx reads its address.
{
  const { invitePath, readInvite, gamePath, cleanName, cleanScore, cleanWager, cleanGroup } = await import(
    "../src/features/invite/link.ts"
  );
  const sent = { group: "qaTest01", name: "Bub b", score: 17, wager: "penguin" };
  const opened = readInvite(Object.fromEntries(new URL(invitePath(sent), "https://x").searchParams));
  assert.deepEqual(opened, sent, "the invite page reads back what the invite link carries");
  const game = new URL(gamePath(opened), "https://x").searchParams;
  assert.deepEqual(
    { group: cleanGroup(game.get("g")), name: cleanName(game.get("from")), score: cleanScore(game.get("score")), wager: cleanWager(game.get("w")) },
    sent,
    "接受挑战 keeps the group, the inviter's name, their score and the wager",
  );
  assert.equal(new URL(gamePath({ ...opened, score: 0 }), "https://x").searchParams.get("score"), "0", "a score of 0 is kept too");
  assert.equal(gamePath({ name: "Moss", group: "qaTest01" }), "/?g=qaTest01&from=Moss", "without a score or wager, none is added");
  checks++;
}

console.log(`match flow: ${checks} checks passed (every mode, 3 and 5 rounds, with and without a missing step; the invite's way into the game)`);
