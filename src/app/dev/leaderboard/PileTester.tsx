"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BoardSheet, SplatNotice, type BoardEntry } from "@/features/leaderboard";
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
  // Fake snowballs: each friend can be hit once a "session" here, then the board says to wait.
  const [hits, setHits] = useState<Record<string, number>>({ [nameKey(start[0].name)]: 2 });
  const [hitOnce, setHitOnce] = useState<Set<string>>(new Set());
  const onThrow = async (to: BoardEntry) => {
    const key = nameKey(to.name);
    if (hitOnce.has(key)) return { waitMinutes: 42 };
    setHitOnce((s) => new Set(s).add(key));
    setTimeout(() => setHits((h) => ({ ...h, [key]: (h[key] ?? 0) + 1 })), 620);
    return { thrown: true as const };
  };
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
      <BoardSheet seed={title.length * 13} state={{ status: "ready", scores }} viewer={nameKey(me)} landed={landed} hits={hits} onThrow={onThrow} />
    </div>
  );
}

/** The snowman pile with fake groups, and buttons that make someone overtake someone. */
export function PileTester() {
  const [splat, setSplat] = useState<null | { from: string; more: number }>(null);
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4">
      <header>
        <h1 className="font-heading text-4xl font-bold text-ink-deep">Snowman pile</h1>
        <p className="font-sans text-sm">
          Fake groups, nothing is sent to the server. Press a button to watch an overtake; tap a friend&apos;s snowman to
          throw a snowball (tap the same one again: &quot;wait&quot;).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSplat({ from: "小雪", more: 0 })}>
            show &quot;you got hit&quot;
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSplat({ from: "Juniper", more: 2 })}>
            hit by 3 friends
          </Button>
        </div>
        {splat && (
          <SplatNotice key={`${splat.from}${splat.more}`} group="demoTest" me="Bao" preview={splat} onThrowBack={() => setSplat(null)} />
        )}
      </header>
      <div className="grid grid-cols-1 items-start justify-items-center gap-8 md:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => (
          <FakeBoard key={g.title} {...g} />
        ))}
      </div>
    </section>
  );
}
