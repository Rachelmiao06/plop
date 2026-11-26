"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BoardSheet, type BoardEntry } from "@/features/leaderboard";
import { nameKey } from "@/features/leaderboard/rules";

const entry = (name: string, best: number, extra: Partial<BoardEntry> = {}): BoardEntry => ({
  name,
  best,
  bestRounds: 3,
  bestMode: "turns",
  latest: best,
  latestRounds: 3,
  plays: 1,
  ...extra,
});

/** Fake groups (no server): the pile with 2, 5 and 10 players. */
const GROUPS: { title: string; me: string; scores: BoardEntry[] }[] = [
  { title: "2 players", me: "小雪", scores: [entry("Mimi", 21), entry("小雪", 17, { plays: 3, latest: 12 })] },
  {
    title: "5 players",
    me: "Bao",
    scores: [entry("豆豆", 29), entry("Juniper", 24, { bestRounds: 5 }), entry("Bao", 19, { plays: 2, latest: 15 }), entry("Pip", 12), entry("Mimi", 7)],
  },
  {
    title: "10 players",
    me: "小美 & 阿雪",
    scores: [
      entry("Juniper", 31),
      entry("小美 & 阿雪", 30, { bestMode: "team" }),
      entry("Bao", 27, { bestRounds: 5 }),
      entry("豆豆", 24),
      entry("Pip", 21, { bestMode: "together" }),
      entry("Mimi", 18),
      entry("小雪", 15),
      entry("Clementine", 11),
      entry("团团", 8),
      entry("Oz", 3),
    ],
  },
];

const sorted = (s: BoardEntry[]) => [...s].sort((a, b) => b.best - a.best);

function FakeBoard({ title, me, scores: start }: (typeof GROUPS)[number]) {
  const [scores, setScores] = useState(start);
  const [landed, setLanded] = useState(0);
  const meIndex = scores.findIndex((s) => s.name === me);

  /** The player just under someone beats them by a point or two: they swap with a hop. */
  const overtake = (i: number) => {
    if (i <= 0) return;
    setScores((list) => sorted(list.map((s, j) => (j === i ? { ...s, best: list[i - 1].best + 1 + (i % 2), plays: s.plays + 1 } : s))));
  };
  const viewerClimbs = () => {
    overtake(meIndex);
    setLanded((n) => n + 1);
  };
  const newcomer = () =>
    setScores((list) =>
      list.some((s) => s.name === "Newbie") || list.length >= 10 ? list : sorted([...list, entry("Newbie", Math.round((list[0].best + list.at(-1)!.best) / 2))]),
    );

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <h2 className="font-heading text-2xl font-bold">{title}</h2>
      <div className="flex flex-wrap justify-center gap-1.5">
        <Button size="sm" variant="outline" onClick={viewerClimbs} disabled={meIndex <= 0}>
          you overtake
        </Button>
        <Button size="sm" variant="outline" onClick={() => overtake(scores.length - 1)}>
          last one climbs
        </Button>
        <Button size="sm" variant="outline" onClick={newcomer} disabled={scores.length >= 10}>
          someone new
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setScores(start)}>
          reset
        </Button>
      </div>
      <BoardSheet seed={title.length * 13} state={{ status: "ready", scores }} viewer={nameKey(me)} landed={landed} />
    </div>
  );
}

/** The snowman pile with fake groups, and buttons that make someone overtake someone. */
export function PileTester() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="font-heading text-4xl font-bold text-ink-deep">Snowman pile</h1>
        <p className="font-sans text-sm">Fake groups, nothing is sent to the server. Press a button to watch an overtake.</p>
      </header>
      <div className="grid grid-cols-1 items-start justify-items-center gap-8 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => (
          <FakeBoard key={g.title} {...g} />
        ))}
      </div>
    </section>
  );
}
