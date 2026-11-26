"use client";

/**
 * The whole game on one screen: the snow in the throwing view, the village, the throw, the pins, the score
 * panel, "N down!", the hints and the turn note, and the match around them (the "3 or 5 rounds" card, a new set
 * each round, the end card). The home page only renders this.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { BowlingStage, FEEL, type Bowling } from "@/features/bowling";
import { HowToCard, MatchEnd, ScoreHud, StartFlow, type PlayMode, type StartChoice } from "@/features/hud";
import { cleanName, cleanScore, cleanWager, INVITE, wagerResult } from "@/features/invite";
import { GroupBoard, GroupNotices, SubmitScore, SubmitScores, teamName } from "@/features/leaderboard";
// The group id lives in the share feature's `group.ts`; imported directly because the share index imports this
// feature (its invite sheet reads the names), and a cycle through the index is not worth the risk.
import { getGroupId } from "@/features/share/group";
import { createPins, formationById, PinsPopup, PinsStage, softSnowFor } from "@/features/pins";
import { PaperFinish } from "@/features/look";
import { Village } from "@/features/scenery";
import { easeTimeOfDay, getTimeOfDay, setTimeOfDay, SnowScene } from "@/features/snow-scene";
import {
  getAudioSettings,
  playRoundStart,
  playTap,
  playTie,
  playWin,
  setAmbienceVolume,
  startAmbienceOnFirstTouch,
  stopAmbience,
  subscribeAudioSettings,
} from "@/lib/audio";
import { track } from "@/lib/analytics";

import { GAME, TEXT, type MatchLength } from "./content";
import { CameraDirector } from "./CameraDirector";
import { createMatchStats } from "./matchStats";
import { applyStall, createLink, GameBridge } from "./GameBridge";
import { CancelPull, GameHint, TurnNote } from "./GameOverlay";
import { gameCss, styles } from "./gameStyles";
import { readNames, saveNames, savePlayerOne, serverNames, shownName, subscribeNames } from "./names";
import { RuleCard, ruleFor, ruleIcon } from "./RuleCard";
import { RuleMarker } from "./RuleMarker";
import { choiceSnapshot, markHowTo, minutesFor, parseChoice, sawHowTo, saveChoice } from "./startChoice";
import { createGame, createWatchdog } from "./rules";
import { ThrowingView } from "./ThrowingView";

const fallbacks = [GAME.players[0].name, GAME.players[1].name] as const;

/** The page's address, read once in the browser (an invite brings `?from=<name>&score=<n>`). */
const noSubscribe = () => () => {};
const readSearch = () => window.location.search;
const readGroup = () => getGroupId();

/** Playing alone, the best total for each match length is kept on this device (never required: storage may fail). */
function readBest(rounds: MatchLength): number | null {
  try {
    const v = window.localStorage.getItem(`${GAME.match.bestKey}.${rounds}`);
    return v === null ? null : Number(v) || 0;
  } catch {
    return null;
  }
}
function writeBest(rounds: MatchLength, total: number) {
  try {
    window.localStorage.setItem(`${GAME.match.bestKey}.${rounds}`, String(total));
  } catch {
    // A private window or blocked storage: the best is simply not remembered.
  }
}

export function Game() {
  const [game] = useState(() => createGame());
  const [pins] = useState(() => createPins(GAME.match.rounds[GAME.match.lengths[0]][0], { autoNext: false }));
  const [link] = useState(createLink);
  const state = useSyncExternalStore(game.subscribe, game.getState, game.getState);
  const set = useSyncExternalStore(pins.subscribeState, pins.getState, pins.getState);
  /** Playing alone: the best total before this match started (the end card compares with it). */
  const [bestBefore, setBestBefore] = useState<number | null>(null);
  const saved = useRef(false);

  // The names typed on the start card (remembered on this device), shown everywhere; never empty.
  const typed = useSyncExternalStore(subscribeNames, readNames, serverNames);
  const names = useMemo(() => [shownName(0, typed[0]), shownName(1, typed[1])] as const, [typed]);
  const players = useMemo(
    () => [
      { name: names[0], look: GAME.players[0].look },
      { name: names[1], look: GAME.players[1].look },
    ] as const,
    [names],
  );
  /** Thrower id → name, for "N down!" per player in together mode. */
  const throwerNames = useMemo(() => Object.fromEntries(GAME.players.map((p, i) => [p.thrower, names[i]])), [names]);

  // Arrived from a friend's invite: who is waiting, and (alone) their score to beat.
  const search = useSyncExternalStore(noSubscribe, readSearch, () => "");
  const invite = useMemo(() => {
    const q = new URLSearchParams(search);
    return { name: cleanName(q.get("from")), score: cleanScore(q.get("score")), wager: cleanWager(q.get("w")) };
  }, [search]);
  // The guided start: last time's choices (a returning player taps straight through) and whether "how to throw"
  // was shown on this device. "Change how we play" on the end card walks the cards from the start instead.
  const lastRaw = useSyncExternalStore(noSubscribe, choiceSnapshot, () => "");
  const last = useMemo(() => parseChoice(lastRaw), [lastRaw]);
  const firstTime = !useSyncExternalStore(noSubscribe, sawHowTo, () => true);
  const [rechoose, setRechoose] = useState(false);
  /** "How to throw" opened again from the "?" in the corner. */
  const [help, setHelp] = useState(false);
  const onMode = useCallback((m: PlayMode) => game.setMode(m), [game]);
  // The group board: the invite's group, or the one this device made when it sent an invite.
  const group = useSyncExternalStore(noSubscribe, readGroup, () => null);

  const together = state.mode === "together";
  // Each bowling stage hands its game to the bridge, by slot (one in turns mode, two side by side together).
  const onSolo = useCallback((g: Bowling) => link.set("solo", g), [link]);
  const onLeft = useCallback((g: Bowling) => link.set("left", g), [link]);
  const onRight = useCallback((g: Bowling) => link.set("right", g), [link]);
  useEffect(() => link.keep(together ? ["left", "right"] : ["solo"]), [link, together]);

  // The current set's soft mounds, for the roll.
  const softAt = useMemo(() => softSnowFor(formationById(set.formation)) ?? undefined, [set.formation]);

  // A match starts in the afternoon light. The quiet village ambience starts after the first tap (it follows the
  // sound switch) and sits a little lower while the music plays.
  useEffect(() => {
    setTimeOfDay(0);
    const cancel = startAmbienceOnFirstTouch();
    const duck = () => {
      const s = getAudioSettings();
      setAmbienceVolume(s.music ? GAME.sound.ambienceUnderMusic : GAME.sound.ambienceAlone);
    };
    duck();
    const off = subscribeAudioSettings(duck);
    return () => {
      cancel();
      off();
      stopAmbience();
    };
  }, []);

  // A round starts: a soft chime (with the "Round 2 / 3" note).
  useEffect(() => {
    if (state.phase === "playing" && state.active === 0 && state.turnId > 0) playRoundStart();
  }, [state.phase, state.active, state.turnId]);

  // The end card: a little jingle for a winner (or a new best alone), a gentle ding-dong for a tie.
  useEffect(() => {
    if (state.phase !== "over") return;
    const [a, b] = game.getState().scores;
    // No names: the length, the mode and how many played.
    track("match_end", { rounds: game.getState().rounds, mode: game.getState().mode, players: game.getState().players });
    // Taking turns is a match (a tie gets its own tune); teaming up always wins together.
    if (game.getState().players === 2 && game.getState().mode === "turns" && a === b) playTie();
    else playWin();
  }, [state.phase, game]);

  // The safety net's backup, outside the canvas: if the frame loop stops altogether (a lost WebGL context, a browser
  // that stopped drawing), the turn and the end card still come. Counts only seconds the page is visible and the canvas
  // has drawn nothing for `stoppedAfter` (a slow phone still draws, so the net inside the canvas, `GameBridge`, keeps
  // the time there), and waits `backupTimes` as long.
  useEffect(() => {
    const w = GAME.timing.watchdog;
    const dog = createWatchdog({
      rolling: w.rolling * w.backupTimes,
      counted: w.counted * w.backupTimes,
      passing: w.passing * w.backupTimes,
      lastCounted: w.lastCounted * w.backupTimes,
      lastPassing: w.lastPassing * w.backupTimes,
    });
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // A throttled or sleeping timer counts at most one tick; a hidden page counts nothing.
      const stopped = now - link.frameAt() > w.stoppedAfter * 1000;
      const seconds = document.visibilityState === "visible" && stopped ? Math.min((now - last) / 1000, 1) : 0;
      last = now;
      const step = dog.tick(game.getState(), seconds);
      if (step) applyStall(step, game, pins);
    }, 500);
    return () => window.clearInterval(id);
  }, [game, pins, link]);

  // Space throws, so it must never also press a button that still has focus (a toggle just tapped).
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      // Space, Enter and the together keys throw, so they must never also press a focused button.
      if (e.code !== "Space" && e.code !== "Enter" && e.code !== "KeyW" && e.code !== "ArrowUp") return;
      if (game.getState().phase !== "playing") return;
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.closest("button")) el.blur();
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [game]);

  /** The play-style numbers each match sends with its score (for the board's funny titles). */
  const stats = useMemo(() => createMatchStats(), []);

  /** A new match: the first round's set comes in (the cards pop back if it is already there). */
  const begin = useCallback(
    (rounds: MatchLength, playing: 1 | 2, again: boolean, mode: PlayMode = game.getState().mode) => {
      stats.reset();
      if (again) game.again();
      else game.start(rounds, playing, mode);
      const first = game.setFor(0, rounds);
      if (pins.getState().formation !== first) pins.setFormation(first);
      else pins.reset();
      setBestBefore(playing === 1 ? readBest(rounds) : null);
      track("match_start", { rounds, mode: game.getState().mode, players: playing });
      // Back to the afternoon with a soft fade (the end card sat in the evening light).
      if (getTimeOfDay() > 0) easeTimeOfDay(0, GAME.evening.back);
      saved.current = false;
    },
    [game, pins, stats],
  );

  /** "Let's roll!" (or "same as last time"): remember the choices on this device and start. */
  const onStart = useCallback(
    (c: StartChoice) => {
      saveChoice(c);
      markHowTo();
      begin(c.rounds as MatchLength, c.players, false, c.mode);
    },
    [begin],
  );

  // Playing alone: remember a new best once the match is over.
  useEffect(() => {
    if (state.phase !== "over" || state.players !== 1 || saved.current) return;
    saved.current = true;
    if (bestBefore === null || state.scores[0] > bestBefore) writeBest(state.rounds, state.scores[0]);
  }, [state.phase, state.players, state.rounds, state.scores, bestBefore]);

  const solo = state.players === 1;
  const rival = solo && invite.name && invite.score !== null ? { name: invite.name, score: invite.score } : null;
  // The invite's preset wager, settled on the end card: the loser and what they owe (a team or a tie: nobody pays).
  const wager = (() => {
    if (state.phase !== "over" || !invite.wager || together) return null;
    const [mine, theirs] = state.scores;
    // Who lost and who won: alone, against the inviter's score; two on one phone, the lower and higher totals.
    const [me, them] = solo ? [mine, rival?.score ?? null] : [mine, theirs];
    if (them === null) return null;
    const [mineName, theirName] = solo ? [names[0], rival!.name] : [names[0], names[1]];
    if (me === them) return wagerResult(invite.wager, null, null);
    return me > them ? wagerResult(invite.wager, theirName, mineName) : wagerResult(invite.wager, mineName, theirName);
  })();
  const rule = state.phase === "playing" ? ruleFor(game.setFor(state.round)) : null;

  return (
    <main className={`relative h-dvh w-full overflow-hidden ${styles.root}`}>
      <style href="plop-game" precedence="default">
        {gameCss}
      </style>
      <SnowScene>
        <ThrowingView />
        <Village lane={FEEL.lane} />
        {together ? (
          <>
            <BowlingStage
              key="left"
              thrower="one"
              keys={GAME.together.keys.left}
              slide={GAME.together.slide.left}
              ballSide={-1}
              pinRing={false}
              softAt={softAt}
              onGame={onLeft}
            />
            <BowlingStage
              key="right"
              thrower="two"
              keys={GAME.together.keys.right}
              slide={GAME.together.slide.right}
              ballSide={1}
              pinRing={false}
              laneMarks={false}
              softAt={softAt}
              onGame={onRight}
            />
          </>
        ) : (
          <BowlingStage key="solo" pinRing={false} softAt={softAt} onGame={onSolo} />
        )}
        <PinsStage pins={pins} />
        <RuleMarker game={game} pins={pins} />
        <GameBridge game={game} pins={pins} link={link} stats={stats} />
        {/* Together: a gentle shared follow of both balls instead of a chase of one (CameraDirector decides). */}
        <CameraDirector pins={pins} link={link} />
      </SnowScene>
      <PaperFinish />
      <GameHint game={game} names={names} />
      <TurnNote game={game} names={names} />
      <div className={`contents ${styles.result}`}>
        <PinsPopup pins={pins} names={throwerNames} />
      </div>
      <ScoreHud
        players={[
          { ...players[0], total: state.scores[0] },
          { ...players[1], total: state.scores[1] },
        ]}
        active={together ? "both" : state.active}
        down={set.down}
        total={set.total}
        knock={state.knock}
        gain={state.gain}
        round={state.phase === "choosing" ? null : { now: state.round + 1, of: state.rounds }}
        soloBest={solo ? (state.phase === "over" ? Math.max(bestBefore ?? 0, state.scores[0]) : bestBefore) : undefined}
        rival={rival}
        // Hidden until the match starts (the start cards ask first); alone it shows one player and your best.
        panel={state.phase !== "choosing"}
        // Team up: one team total for both snowmen (taking turns is a match between them).
        team={together}
        onHelp={state.phase === "playing" ? () => setHelp(true) : undefined}
        rule={
          rule
            ? { icon: ruleIcon(rule), words: rule.words.chip, label: `${rule.words.big}: ${rule.words.line(rule.points)}` }
            : null
        }
      />
      <RuleCard game={game} names={names} />
      {help && state.phase === "playing" && <HowToCard onClose={() => setHelp(false)} />}
      <CancelPull game={game} link={link} />
      {/* The start and end cards: every button there gives a soft paper tap (the cards are the hud's; the sound is the game's). */}
      <div
        className="contents"
        onPointerDownCapture={(e) => {
          if ((e.target as HTMLElement).closest("button")) playTap();
        }}
      >
      {state.phase === "choosing" && (
        <StartFlow
          // Opens again once the browser has read the address and this device's memory (the server knows neither).
          key={`${invite.name ?? ""}|${rechoose ? "" : lastRaw}|${firstTime}`}
          lengths={GAME.match.lengths}
          // A friend's invite is a challenge: alone against their score, unless the player picks "with a friend".
          initial={{ players: invite.name ? 1 : state.players, mode: state.mode, rounds: state.rounds }}
          last={rechoose ? null : last}
          howTo={firstTime}
          minutes={minutesFor}
          names={typed}
          fallbacks={fallbacks}
          nameMax={INVITE.link.nameMax}
          onNames={(next) => saveNames(next)}
          greeting={invite.name ? TEXT.waiting(invite.name) : null}
          onMode={onMode}
          onStart={onStart}
        />
      )}
      {/* Returning to the group: "you got hit" ("砸回去") and "X just passed you" ("复仇"), one at a time; either starts a match. */}
      {state.phase === "choosing" && group && (
        <GroupNotices group={group} me={typed[0] || undefined} onPlay={() => last && onStart(last)} />
      )}
      {state.phase === "over" && (
        <MatchEnd
          players={[
            { ...players[0], total: state.scores[0] },
            // Alone after a friend's invite, the other side of the result scene is them (their name and score).
            rival ? { name: rival.name, look: players[1].look, total: rival.score } : { ...players[1], total: state.scores[1] },
          ]}
          solo={solo ? { best: bestBefore } : null}
          team={together}
          rival={!!rival}
          wager={wager}
          onAgain={() => begin(state.rounds, state.players, true)}
          onChoose={() => {
            setRechoose(true);
            game.choose();
            if (getTimeOfDay() > 0) easeTimeOfDay(0, GAME.evening.back);
          }}
        >
          {group && (
            <>
              {together ? (
                // Team up: one entry for the team, both names ("小美 & 阿雪") and the points added up.
                <SubmitScore
                  group={group}
                  score={state.scores[0] + state.scores[1]}
                  rounds={state.rounds}
                  mode="team"
                  stats={stats.team()}
                  defaultName={teamName(names[0], names[1])}
                  remember={false}
                />
              ) : (
                solo ? (
                  // Alone: one row, under the name from the start card (one tap).
                  <SubmitScore
                    group={group}
                    score={state.scores[0]}
                    rounds={state.rounds}
                    mode={state.mode}
                    stats={stats.of(0)}
                    defaultName={typed[0] || undefined}
                    onSubmitted={(r) => r.entry.name !== typed[0] && savePlayerOne(r.entry.name)}
                  />
                ) : (
                  // Taking turns: ONE prompt, a row per player (their face, start-card name, score), one "Pop us on".
                  <SubmitScores
                    group={group}
                    rounds={state.rounds}
                    mode={state.mode}
                    players={[
                      { ...players[0], score: state.scores[0], stats: stats.of(0) },
                      { ...players[1], score: state.scores[1], stats: stats.of(1) },
                    ]}
                    onSubmitted={([r]) => r.entry.name !== typed[0] && savePlayerOne(r.entry.name)}
                  />
                )
              )}
              <GroupBoard group={group} me={together ? teamName(names[0], names[1]) : typed[0] || undefined} limit={GAME.board.limit} />
            </>
          )}
        </MatchEnd>
      )}
      </div>
    </main>
  );
}
