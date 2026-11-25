"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { GroupBoard, SubmitScore } from "@/features/leaderboard";
import { postScore } from "@/features/leaderboard/api";
import { BOARD } from "@/features/leaderboard/content";
import { maxScore, newGroup, type MatchMode, type Rounds } from "@/features/leaderboard/rules";

const FRIENDS = ["Mimi", "小雪", "Bao", "Juniper", "豆豆", "Pip"];

type Log = { label: string; status: number | "ok"; body: string };

/** Test page: make a group, submit scores through the real prompt or raw, watch the board, try bad input. */
export function LeaderboardTester() {
  const [group, setGroup] = useState("demoTest");
  const [score, setScore] = useState(20);
  const [rounds, setRounds] = useState<Rounds>(3);
  const [mode, setMode] = useState<MatchMode>("turns");
  const [round, setRound] = useState(0);
  const [log, setLog] = useState<Log[]>([]);

  const send = async (label: string, body: unknown) => {
    const answer = await postScore(body);
    const line: Log = answer.ok
      ? { label, status: "ok", body: `backend ${answer.value.backend} · ${answer.value.entry.name} best ${answer.value.entry.best} · #${answer.value.rank}` }
      : { label, status: answer.status, body: answer.error };
    setLog((l) => [line, ...l].slice(0, 30));
    if (answer.ok) window.dispatchEvent(new CustomEvent("plop:scores", { detail: { group, name: answer.value.entry.name, rank: answer.value.rank } }));
    return answer;
  };

  const good = { group, name: "Tester", score: 10, rounds: 3, mode: "turns" };
  const bad: [string, unknown][] = [
    ["rude name (English)", { ...good, name: "sh1tface" }],
    ["rude name (Chinese)", { ...good, name: "你是傻逼" }],
    ["name too long", { ...good, name: "abcdefghijklm" }],
    ["empty name", { ...good, name: "   " }],
    ["control characters only", { ...good, name: "\u0000​" }],
    [`score too high (> ${maxScore(3)} for 3 rounds)`, { ...good, score: maxScore(3) + 1 }],
    ["negative score", { ...good, score: -1 }],
    ["half a point", { ...good, score: 4.5 }],
    ["4 rounds", { ...good, rounds: 4 }],
    ["mode 'solo'", { ...good, mode: "solo" }],
    ["group 'abc'", { ...good, group: "abc" }],
    ["group with a slash", { ...good, group: "abc/defg" }],
  ];

  const addFriends = async () => {
    for (const name of FRIENDS.slice(0, 4 + Math.floor(Math.random() * 3))) {
      const r: Rounds = Math.random() < 0.5 ? 3 : 5;
      await send(`friend ${name}`, { group, name, score: Math.floor(Math.random() * maxScore(r) * 0.7), rounds: r, mode: "turns" });
    }
  };

  const spam = async () => {
    for (let i = 0; i < BOARD.rateLimit.max + 2; i++) await send(`spam ${i + 1}`, { ...good, name: "Spammy", score: i });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-4xl font-bold text-ink-deep">Leaderboard test</h1>
        <p className="font-sans text-sm">
          Without Supabase keys the server runs in demo mode (memory, forgotten on redeploy). Max points: 3 rounds{" "}
          {maxScore(3)}, 5 rounds {maxScore(5)}.
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-3 font-sans text-sm">
        <label className="flex flex-col gap-1">
          group (8 letters)
          <input value={group} onChange={(e) => setGroup(e.target.value)} className="h-9 w-32 rounded-md border border-border bg-paper px-2 font-mono" />
        </label>
        <Button variant="outline" onClick={() => setGroup(newGroup())}>
          new group
        </Button>
        <label className="flex flex-col gap-1">
          score
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="h-9 w-20 rounded-md border border-border bg-paper px-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          rounds
          <select value={rounds} onChange={(e) => setRounds(Number(e.target.value) as Rounds)} className="h-9 rounded-md border border-border bg-paper px-2">
            <option value={3}>3</option>
            <option value={5}>5</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          mode
          <select value={mode} onChange={(e) => setMode(e.target.value as MatchMode)} className="h-9 rounded-md border border-border bg-paper px-2">
            <option value="turns">turns</option>
            <option value="together">together</option>
          </select>
        </label>
        <Button variant="outline" onClick={() => setRound((n) => n + 1)}>
          end another match
        </Button>
        <Button variant="outline" onClick={addFriends}>
          add a few friends
        </Button>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <div className="flex flex-col items-center gap-4">
          <SubmitScore key={`${group}-${round}-${score}-${rounds}-${mode}`} group={group} score={score} rounds={rounds} mode={mode} />
        </div>
        <div className="flex flex-col items-center gap-4">
          <GroupBoard key={group} group={group} />
        </div>
      </div>

      <section className="flex flex-col gap-2 font-sans text-sm">
        <h2 className="font-heading text-2xl font-bold">Try bad input (each should be refused)</h2>
        <div className="flex flex-wrap gap-2">
          {bad.map(([label, body]) => (
            <Button key={label} variant="outline" size="sm" onClick={() => send(label, body)}>
              {label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={spam}>
            {BOARD.rateLimit.max + 2} submits in a row (rate limit)
          </Button>
        </div>
        <ol className="flex flex-col gap-0.5 font-mono text-xs" aria-label="server answers">
          {log.map((l, i) => (
            <li key={log.length - i} className={l.status === "ok" ? "" : "text-berry-deep"}>
              {l.status === "ok" ? "200" : l.status} · {l.label} → {l.body}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
