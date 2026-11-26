"use client";

/**
 * The notes a returning player may get when opening the game or the invite page, one at a time: first "you got hit"
 * (`SplatNotice`), then "X just passed you" (`OvertakeNotice`). Either button that starts a match ends the queue.
 */
import { useState } from "react";
import { OvertakeNotice } from "./OvertakeNotice";
import { SplatNotice } from "./SplatNotice";

export type GroupNoticesProps = {
  group: string;
  /** Who is looking (a start-card name). Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** "砸回去" or "复仇" was pressed: start a match in this group (the friend it is aimed at is given). */
  onPlay: (name: string) => void;
};

export function GroupNotices({ group, me, onPlay }: GroupNoticesProps) {
  const [step, setStep] = useState<"splat" | "overtake" | "done">("splat");
  const play = (name: string) => {
    setStep("done");
    onPlay(name);
  };
  if (step === "splat") return <SplatNotice group={group} me={me} onThrowBack={play} onDone={() => setStep("overtake")} />;
  if (step === "overtake") return <OvertakeNotice group={group} me={me} onRevenge={play} onDone={() => setStep("done")} />;
  return null;
}
