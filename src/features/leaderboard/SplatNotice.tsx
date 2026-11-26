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
  /** Nothing to show, or "later" was pressed (the page may show its next note). */
  onDone?: () => void;
  /** For the test page: show this instead of asking the server, and send nothing. */
  preview?: { from: string; more: number };
};

type Shown = { from: string; more: number; me: string };

export function SplatNotice({ group, me, onThrowBack, onDone, preview }: SplatNoticeProps) {
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const who = (me || remembered).trim();
  const [shown, setShown] = useState<Shown | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (preview) return;
    if (!who) {
      onDone?.();
      return;
    }
    let live = true;
    fetchInbox(group, who).then((answer) => {
      if (!live) return;
      if (!answer.ok || answer.value.hits.length === 0) return onDone?.();
      const names = [...new Set(answer.value.hits.map((h) => h.from))];
      setShown({ from: names[0], more: names.length - 1, me: who });
    });
    return () => {
      live = false;
    };
    // onDone is a callback from the page; asking once per group and name is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    else onDone?.();
  };

  const look = lookFor(note.me);
  return (
    // The whole screen is the snowy scene: no card, no frame (Rachel), one action.
    <div className="fixed inset-0 z-[70] grid place-items-center bg-snow-white px-6" role="dialog" aria-modal="true" aria-labelledby="plop-splat-title">
      <div className={`w-full max-w-xs ${lb.note}`} style={{ "--lb-note-in": "0.55s", "--lb-note-over": 0.08 } as CSSProperties}>
        <PaperSheet className="flex flex-col items-center gap-3 text-center">
          <div className="relative flex h-[200px] w-full justify-center" aria-hidden>
            {/* Rachel's far hills behind, the snowman standing on their ground line. */}
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
            <div className={`relative h-[190px] w-[134px] ${lb.splatWobble}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out */}
              <img
                src={ART[look]}
                alt=""
                width={134}
                height={190}
                className="absolute bottom-[8px] left-0 w-[134px] select-none"
                style={{ filter: "drop-shadow(1px 3px 2px color-mix(in oklab, var(--ink) 20%, transparent))" }}
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's snow puff, as a splat on the face */}
              <img
                src="/assets/effects/snow-puff.webp"
                alt=""
                width={112}
                height={86}
                className={`absolute top-[54px] left-1/2 w-[112px] -translate-x-1/2 select-none ${lb.splat}`}
                draggable={false}
              />
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's surprise lines */}
              <img src="/assets/effects/surprise-lines.webp" alt="" width={40} height={22} className="absolute top-2 -right-3 rotate-[24deg] select-none" draggable={false} />
            </div>
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
          <button type="button" onClick={() => close(false)} className="font-sans text-xs text-ink underline decoration-dotted underline-offset-4 opacity-70">
            {TEXT.snowball.later}
          </button>
        </PaperSheet>
      </div>
    </div>
  );
}
