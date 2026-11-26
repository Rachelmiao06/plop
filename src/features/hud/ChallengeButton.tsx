"use client";

/**
 * "Send to a friend" on the end card: one tap shares a challenge, no sheet and no form (Rachel: "最好最好是一步就直接可以分享").
 * The link is the invite card's (`/invite?g=<group>&from=<name>&score=<n>&w=<wager>`), made with the share and invite
 * features' own helpers: this device's group (`ensureGroupId`, so the friend lands on the same board), the name and
 * score the game passes (a two-player match: the winner), and the invite's wager if the match came from one.
 *
 * - Inside WeChat: opens the poster (same QR, same link) to long-press and save (Rachel): without JS-SDK, a pasted
 *   link shows a grey icon there, and a picture always looks right. Without poster details: copy + the "···" note.
 * - Elsewhere: the system share sheet; without one, copies the link and says "链接已复制".
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { cleanName, INVITE, wagerFor, type WagerCode } from "@/features/invite";
import { posterLink, usePoster, type PosterOptions } from "@/features/poster";
import { copy, ensureGroupId, isWeChat, SHARE, systemShare, WeChatHint } from "@/features/share";
import { track } from "@/lib/analytics";

import { content } from "./content";
import { PencilFrame } from "./Doodles";

const t = content.text.end;

/** Stand-in players when the card gives no poster details (then the poster is never opened). */
const NO_PLAYERS = [
  { name: "", look: "bucket", total: 0 },
  { name: "", look: "redHat", total: 0 },
] as const satisfies PosterOptions["players"];

export type Challenge = { name: string; score: number | null; wager: WagerCode | null };

export function ChallengeButton({
  challenge,
  poster,
  className,
}: {
  challenge: Challenge;
  /** The match for the poster (inside WeChat the tap opens it). */
  poster?: Omit<PosterOptions, "link">;
  className?: string;
}) {
  const [note, setNote] = useState<string | null>(null);
  const players = poster?.players ?? NO_PLAYERS;
  const posterSheet = usePoster({ players, solo: !!poster?.solo, team: !!poster?.team, rounds: poster?.rounds, link: challenge });
  const [wechat, setWechat] = useState(false);

  useEffect(() => {
    if (!note) return;
    const id = window.setTimeout(() => setNote(null), t.copiedFor);
    return () => window.clearTimeout(id);
  }, [note]);

  const send = async () => {
    const name = cleanName(challenge.name);
    // The same link the poster's QR code opens (one function makes both).
    const path = posterLink({ players, team: !!poster?.team, link: challenge }, ensureGroupId());
    const url = window.location.origin + path;
    // Coarse facts only (never the name).
    track("invite_made", { with_score: challenge.score !== null, wager: challenge.wager ?? "none", from: "end_card" });
    if (isWeChat() && poster) {
      posterSheet.open();
      return;
    }
    if (isWeChat()) {
      await copy(url);
      setWechat(true);
      return;
    }
    const stake = wagerFor(challenge.wager);
    const text =
      (name ? SHARE.invite.text.replace("{name}", name) : SHARE.text) + (stake ? ` ${INVITE.wagers.stake}：${stake.zh} ${stake.emoji}` : "");
    const result = await systemShare({ title: SHARE.title, text, url });
    if (result === "unavailable") setNote((await copy(url)) ? t.copied : t.copyFailed);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <Button
        size="lg"
        onClick={send}
        className="relative h-14 w-full rounded-full bg-butter font-heading text-2xl font-bold text-ink-deep hover:bg-butter/80"
      >
        <PencilFrame seed={41} radius={28} overshoot={8} />
        <span className="relative">{t.challenge}</span>
      </Button>
      {note && (
        <p role="status" className="absolute inset-x-0 top-full mt-1 text-center font-heading text-lg leading-tight text-ink-deep">
          {note}
        </p>
      )}
      {posterSheet.sheet}
      {/* On the page itself, not inside the card (the card's pop-in transform would trap a fixed overlay). */}
      {wechat && createPortal(<WeChatHint onClose={() => setWechat(false)} hint={t.wechat} small={t.wechatSmall} />, document.body)}
    </div>
  );
}
