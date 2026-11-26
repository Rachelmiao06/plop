"use client";

/**
 * "You got hit!": when friends threw snowballs at you on the group's board since you last looked, this note pops in
 * the next time you open the game or the invite page: your snowman with a splat of snow on its face, "你被小雪砸了一脸雪！
 * · 小雪 got you!", and a big "砸回去 · Throw back" button. Throwing back sends a snowball back to whoever got you
 * (if they can be hit again yet) and hands over to the page to start a match in the same group; "later" just
 * closes it. Either way the hits count as seen. Preset words only. Renders nothing when there is nothing to show.
 */
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { fetchInbox, markSeen, readNickname, subscribeNickname, throwSnowball } from "./api";
import { lb } from "./boardStyles";
import { TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { lookFor } from "./SnowmanPile";

const ART = { bucket: "/assets/scenery/thrower-bucket.webp", redHat: "/assets/scenery/thrower-redhat.webp" } as const;

export type SplatNoticeProps = {
  /** The invite group id. */
  group: string;
  /** Who is looking (a start-card name). Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** "Throw back" was pressed (the snowball back is already sent): start a match in this group. */
  onThrowBack: (from: string) => void;
  /** For the test page: show this instead of asking the server, and send nothing. */
  preview?: { from: string; more: number };
};

type Shown = { from: string; more: number; me: string };

export function SplatNotice({ group, me, onThrowBack, preview }: SplatNoticeProps) {
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const who = (me || remembered).trim();
  const [shown, setShown] = useState<Shown | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (preview || !who) return;
    let live = true;
    fetchInbox(group, who).then((answer) => {
      if (!live || !answer.ok || answer.value.hits.length === 0) return;
      const names = [...new Set(answer.value.hits.map((h) => h.from))];
      setShown({ from: names[0], more: names.length - 1, me: who });
    });
    return () => {
      live = false;
    };
  }, [group, who, preview]);

  const note = preview ? { ...preview, me: who || "you" } : shown;
  if (!note || closed) return null;

  const close = (back: boolean) => {
    setClosed(true);
    if (!preview) {
      markSeen(group, note.me);
      if (back) throwSnowball(group, note.me, note.from);
    }
    if (back) onThrowBack(note.from);
  };

  const look = lookFor(note.me);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-snow-shadow/55 px-4" role="dialog" aria-modal="true" aria-labelledby="plop-splat-title">
      <div className={`w-full max-w-xs ${lb.note}`} style={{ "--lb-note-in": "0.55s", "--lb-note-over": 0.08 } as CSSProperties}>
        <PaperSheet seed={note.from.length * 7 + 3} className="flex flex-col items-center gap-2 pt-5 text-center">
          <div className={`relative h-[132px] w-[110px] ${lb.splatWobble}`} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out */}
            <img src={ART[look]} alt="" width={96} height={136} className="absolute bottom-0 left-1/2 w-24 -translate-x-1/2 select-none" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff, as a splat on the face */}
            <img
              src="/assets/effects/snow-puff.webp"
              alt=""
              width={84}
              height={64}
              className={`absolute top-[38px] left-1/2 w-[84px] -translate-x-1/2 select-none ${lb.splat}`}
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's surprise lines */}
            <img src="/assets/effects/surprise-lines.webp" alt="" width={34} height={19} className="absolute -top-1 right-0 rotate-[24deg] select-none" draggable={false} />
          </div>
          <h2 id="plop-splat-title" className="text-balance">
            <span className="block font-heading text-2xl leading-tight font-bold text-ink-deep">{TEXT.snowball.gotYouZh(note.from, note.more)}</span>
            <span className="mt-0.5 block font-sans text-xs opacity-80">{TEXT.snowball.gotYouEn(note.from, note.more)}</span>
          </h2>
          <Button
            size="lg"
            onClick={() => close(true)}
            className="mt-1 h-auto w-full flex-col gap-0 rounded-full bg-berry py-2 font-heading text-ink-deep hover:bg-berry/85"
            autoFocus
          >
            <span className="text-3xl leading-tight font-bold">{TEXT.snowball.back.zh}</span>
            <span className="font-sans text-xs opacity-80">{TEXT.snowball.back.en}</span>
          </Button>
          <button type="button" onClick={() => close(false)} className="font-sans text-xs underline decoration-dotted underline-offset-4 opacity-70">
            {TEXT.snowball.later}
          </button>
        </PaperSheet>
      </div>
    </div>
  );
}
