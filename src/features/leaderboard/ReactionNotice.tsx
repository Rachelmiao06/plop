"use client";

/**
 * "小美给你点了个 ⭐": friends stuck stickers on your line since you last looked, so the next time you open the game
 * or the invite page this note fills the screen (no box): your snowman with the stickers popping in around it, who
 * sent them, and one "好耶 · Yay" that closes it (the stickers then count as seen). Preset words and stickers only.
 */
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { fetchReactionInbox, markReactionsSeen, readNickname, subscribeNickname, type ReactionKind } from "./api";
import { lb } from "./boardStyles";
import { TEXT } from "./content";
import { PaperSheet } from "./Doodles";
import { lookFor } from "./looks";
import { Sticker } from "./RankedList";

const ART = { bucket: "/assets/scenery/thrower-bucket.webp", redHat: "/assets/scenery/thrower-redhat.webp" } as const;

/** Where the stickers pop in around the snowman (px from its box's top left, tilt). */
const SPOTS = [
  { x: -42, y: 18, r: -14 },
  { x: 118, y: 6, r: 12 },
  { x: -48, y: 92, r: 8 },
  { x: 124, y: 88, r: -10 },
  { x: 40, y: -26, r: 4 },
  { x: -20, y: 150, r: -6 },
] as const;

export type ReactionNoticeProps = {
  group: string;
  /** Who is looking (a start-card name). Leave it out to use the nickname remembered on this device. */
  me?: string;
  /** Nothing to show, or it was closed. */
  onDone?: () => void;
  /** For the test page: show these instead of asking the server, and mark nothing seen. */
  preview?: { got: { from: string; kind: ReactionKind }[]; me: string };
};

export function ReactionNotice({ group, me, onDone, preview }: ReactionNoticeProps) {
  const remembered = useSyncExternalStore(subscribeNickname, readNickname, () => "");
  const who = (me || remembered).trim();
  const [got, setGot] = useState<{ from: string; kind: ReactionKind }[] | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (preview) return;
    if (!who) {
      onDone?.();
      return;
    }
    let live = true;
    fetchReactionInbox(group, who).then((answer) => {
      if (!live) return;
      if (!answer.ok || answer.value.got.length === 0) return onDone?.();
      setGot(answer.value.got);
    });
    return () => {
      live = false;
    };
    // onDone is a callback from the page; asking once per group and name is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, who, preview]);

  const list = preview?.got ?? got;
  if (!list?.length || closed) return null;
  const names = [...new Set(list.map((g) => g.from))];
  const more = names.length - 1;
  const first = list[0];
  const t = TEXT.reactions;
  const look = lookFor(preview?.me ?? who);

  const close = () => {
    setClosed(true);
    if (!preview) markReactionsSeen(group, who);
    onDone?.();
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-snow-white px-6" role="dialog" aria-modal="true" aria-labelledby="plop-reaction-title">
      <div className={`w-full max-w-xs ${lb.note}`} style={{ "--lb-note-in": "0.5s", "--lb-note-over": 0.08 } as CSSProperties}>
        <PaperSheet className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-[230px] w-full" aria-hidden>
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
            <div className="absolute bottom-[8px] left-1/2 h-[170px] w-[118px] -translate-x-1/2">
              {/* eslint-disable-next-line @next/next/no-img-element -- Rachel's cut-out */}
              <img
                src={ART[look]}
                alt=""
                width={118}
                height={168}
                className="absolute bottom-0 w-[118px] select-none"
                style={{ filter: "drop-shadow(1px 3px 2px color-mix(in oklab, var(--ink) 20%, transparent))" }}
                draggable={false}
              />
              {/* The stickers pop in around the snowman, one after another. */}
              {list.slice(0, SPOTS.length).map((g, i) => (
                <span
                  key={i}
                  className={`absolute w-max ${lb.stickerPop}`}
                  style={{ left: SPOTS[i].x, top: SPOTS[i].y, rotate: `${SPOTS[i].r}deg`, animationDelay: `${0.45 + i * 0.18}s` }}
                >
                  <Sticker kind={g.kind} size={40} />
                </span>
              ))}
            </div>
          </div>
          <h2 id="plop-reaction-title" className="text-balance">
            <span className="flex items-center justify-center gap-1 font-heading text-2xl leading-tight font-bold text-ink-deep">
              {t.got(first.from, more)}
              {more === 0 && (
                <>
                  <Sticker kind={first.kind} size={30} />
                  <span className="text-lg">{t.names[first.kind]}</span>
                </>
              )}
            </span>
          </h2>
          <Button
            size="lg"
            onClick={close}
            className="mt-1 h-auto w-full flex-col gap-0 rounded-full bg-butter py-2 font-heading text-ink-deep hover:bg-butter/85"
            autoFocus
          >
            <span className="text-3xl leading-tight font-bold">{t.nice}</span>
          </Button>
        </PaperSheet>
      </div>
    </div>
  );
}
