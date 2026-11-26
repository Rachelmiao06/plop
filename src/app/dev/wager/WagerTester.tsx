"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MatchEnd, type EndPlayer } from "@/features/hud";
import { INVITE, invitePath, wagerResult, type WagerCode } from "@/features/invite";

type Case = { label: string; players: [EndPlayer, EndPlayer]; solo?: boolean; rival?: { name: string; score: number }; team?: boolean };

const CASES: Case[] = [
  {
    label: "versus: Mimi wins",
    players: [
      { name: "小美", look: "bucket", total: 14 },
      { name: "Mimi", look: "redHat", total: 21 },
    ],
  },
  { label: "alone vs the inviter's 18: you lose", players: [{ name: "小雪", look: "bucket", total: 12 }, { name: "-", look: "redHat", total: 0 }], solo: true, rival: { name: "Moss", score: 18 } },
  { label: "alone vs the inviter's 18: you win", players: [{ name: "小雪", look: "bucket", total: 23 }, { name: "-", look: "redHat", total: 0 }], solo: true, rival: { name: "Moss", score: 18 } },
  {
    label: "versus: a tie",
    players: [
      { name: "小美", look: "bucket", total: 16 },
      { name: "Mimi", look: "redHat", total: 16 },
    ],
  },
];

/** Test page: the end card with each preset wager, settled for a few match endings, and the invite links they make. */
export function WagerTester() {
  const [code, setCode] = useState<WagerCode>("cocoa");
  const [which, setWhich] = useState(0);
  const c = CASES[which];
  // Alone after an invite, the other side of the result is the inviter.
  const players: [EndPlayer, EndPlayer] = c.rival ? [c.players[0], { name: c.rival.name, look: "redHat", total: c.rival.score }] : c.players;
  const [a, b] = players;
  const [loser, winner] = a.total > b.total ? [b.name, a.name] : b.total > a.total ? [a.name, b.name] : [null, null];
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <header>
        <h1 className="font-heading text-4xl font-bold text-ink-deep">Wager test</h1>
        <p className="font-sans text-sm">
          The end card settles the invite&apos;s wager. Invite link for this one:{" "}
          <a className="underline" href={invitePath({ group: "wagerTst", name: "Moss", score: 18, wager: code })}>
            {invitePath({ group: "wagerTst", name: "Moss", score: 18, wager: code })}
          </a>
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {INVITE.wagers.lines.map((l) => (
          <Button key={l.code} size="sm" variant={code === l.code ? "default" : "outline"} onClick={() => setCode(l.code)}>
            {l.zh} {l.emoji}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {CASES.map((x, i) => (
          <Button key={x.label} size="sm" variant={which === i ? "default" : "outline"} onClick={() => setWhich(i)}>
            {x.label}
          </Button>
        ))}
      </div>
      <div className="relative mx-auto w-full max-w-sm">
        <MatchEnd
          key={`${which}-${code}`}
          players={players}
          solo={c.solo ? { best: 20 } : null}
          rival={!!c.rival}
          wager={wagerResult(code, loser, winner)}
          onAgain={() => {}}
          onChoose={() => {}}
        />
      </div>
    </div>
  );
}
