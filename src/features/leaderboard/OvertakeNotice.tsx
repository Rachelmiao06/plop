"use client";

/**
 * "小雪刚刚超过你 3 分 😤": when someone in the group has climbed past you since this device last looked at the board,
 * this note fills the screen (no box) the next time you open the game or the invite page: your snowman, and theirs
 * hopping onto your head and squashing you, the sentence, "+2 others" when more passed you, and a big
 * "复仇 · Get them back" that starts a match in the same group. Shown once per change: the board as seen now is
 * remembered as soon as it is checked (`overtake.ts`, on the device only). Preset words only.
 */
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { fetchBoard, readNickname, subscribeNickname } from "./api";
import { lb } from "./boardStyles";
import { TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { passedBy, readSeen, saveSeen, snapshot, type Passer } from "./overtake";
import { lookFor } from "./looks";

const ART = { bucket: "/assets/scenery/thrower-bucket.webp", redHat: "/assets/scenery/thrower-redhat.webp" } as const;
const SHADOW = "drop-shadow(1px 3px 2px color-mix(in oklab, var(--ink) 20%, transparent))";

export type OvertakeNoticeProps = {
  group: string;
  /** Who is looking (a start-card name). Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** "复仇 · Get them back": start a match in this group (the top one who passed you is given). */
  onRevenge: (name: string) => void;
  /** Nothing to show, or "later" was pressed. */
  onDone?: () => void;
  /** For the test page: show this instead of checking the board. */
  preview?: { passers: Passer[]; me: string };
};

export function OvertakeNotice({ group, me, onRevenge, onDone, preview }: OvertakeNoticeProps) {
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const who = (me || remembered).trim();
  const [found, setFound] = useState<Passer[] | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (preview) return;
    let live = true;
    if (!who) {
      onDone?.();
      return;
    }
    fetchBoard(group).then((answer) => {
      if (!live) return;
      if (!answer.ok) return onDone?.();
      const scores = answer.value.scores;
      const passers = passedBy(readSeen(group), scores, who);
      const now = snapshot(scores, who);
      if (now) saveSeen(group, now); // once per change: next time compares with this
      if (passers.length) setFound(passers);
      else onDone?.();
    });
    return () => {
      live = false;
    };
    // onDone is a callback from the page; checking once per group and name is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, who, preview]);

  const passers = preview?.passers ?? found;
  if (!passers?.length || closed) return null;
  const top = passers[0];
  const others = passers.length - 1;
  const mine = lookFor(preview?.me ?? who);
  const theirs = lookFor(top.name);
  const t = TEXT.overtake;

  const close = (revenge: boolean) => {
    setClosed(true);
    if (revenge) {
      track("revenge_tapped", { others });
      onRevenge(top.name);
    } else onDone?.();
  };

  return (
    // The whole screen is the snowy scene: no card, no frame, one action.
    <div className="fixed inset-0 z-[70] grid place-items-center bg-snow-white px-6" role="dialog" aria-modal="true" aria-labelledby="plop-overtake-title">
      <div className={`w-full max-w-xs ${lb.note}`} style={{ "--lb-note-in": "0.5s", "--lb-note-over": 0.08 } as CSSProperties}>
        <PaperSheet className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-[250px] w-full" aria-hidden>
            <div
              className="absolute inset-x-[-24px] bottom-0 h-[84px] bg-repeat-x opacity-70"
              style={{
                backgroundImage: "url(/assets/scenery/far-hills.webp)",
                backgroundSize: "auto 84px",
                backgroundPosition: "center bottom",
                maskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              }}
            />
            <span
              className="absolute bottom-[4px] left-1/2 h-4 w-28 -translate-x-1/2 rounded-[50%]"
              style={{ background: "color-mix(in oklab, var(--ink) 22%, transparent)", filter: "blur(3px)" }}
            />
            {/* You, squashed when they land on your head. */}
            <div className={`absolute bottom-[8px] left-1/2 w-[112px] -translate-x-1/2 ${lb.squashed}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out */}
              <img src={ART[mine]} alt="" width={112} height={160} className="w-[112px] select-none" style={{ filter: SHADOW }} draggable={false} />
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's surprise lines */}
              <img src="/assets/effects/surprise-lines.webp" alt="" width={36} height={20} className="absolute top-[40px] -left-6 -rotate-[58deg] select-none" draggable={false} />
            </div>
            {/* Them, hopping up from the side onto your head. */}
            {/* Centred by the outer box; the inner one hops (its animation moves it with `translate`). */}
            <div className="absolute bottom-[128px] left-1/2 w-[96px] -translate-x-1/2">
              <div className={lb.hopOn}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out */}
                <img src={ART[theirs]} alt="" width={96} height={136} className="w-[96px] scale-x-[-1] select-none" style={{ filter: SHADOW }} draggable={false} />
              </div>
            </div>
          </div>
          <h2 id="plop-overtake-title" className="text-balance">
            <span className="block font-heading text-2xl leading-tight font-bold text-ink-deep">{t.line(top.name, top.by)}</span>
            {others > 0 && <span className="mt-1 block font-heading text-base text-ink">{t.others(others)}</span>}
          </h2>
          <Button
            size="lg"
            onClick={() => close(true)}
            className="mt-1 h-auto w-full flex-col gap-0 rounded-full bg-berry py-2 font-heading text-ink-deep hover:bg-berry/85"
            autoFocus
          >
            <span className="text-3xl leading-tight font-bold">{t.revenge}</span>
          </Button>
          <button type="button" onClick={() => close(false)} className="font-sans text-xs text-ink underline decoration-dotted underline-offset-4 opacity-70">
            {t.later}
          </button>
        </PaperSheet>
      </div>
    </div>
  );
}
