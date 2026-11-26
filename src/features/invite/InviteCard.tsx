"use client";

/**
 * The invite itself, on the white page (Rachel, 2026-11-25: all white, direct and exciting; no mouse, no envelope).
 * The loading screen's snowball rolls through real snow, bursts into a real puff at 100 %, and out of the puff this
 * card pops in with a springy bounce: "{name} 邀请你来打一局雪仗 ❄️", the score if one was shared, the group's board
 * when the link has a group (`<GroupBoard>`), and one big "接受挑战 / Play" button to the game
 * (`/?g=<group>&from=<name>`). Chinese first, English beneath in small text.
 *
 * Hand-drawn bits (card edge, button edge; no inner stitching: Rachel wants fewer boxes) are fixed uneven paths in token colours, like the share
 * button's; the fairy lights are Rachel's cut-out used as it is.
 */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { GroupBoard, GroupNotices } from "@/features/leaderboard";
import { useLoaded } from "@/features/loading";
import { SHARE, WeChatHint } from "@/features/share";
import { track } from "@/lib/analytics";

import { INVITE } from "./content";
import { gamePath, inviteDescription, inviteTitle, wagerFor, type Invite } from "./link";

// Card and button edges in a 100 x 100 box, stretched to fit (strokes do not stretch).
const EDGE = "M3 4 C 30 2, 70 5, 97 3 C 98.5 35, 96.5 70, 98 97 C 70 99, 30 96.5, 2 98 C 3.5 70, 1.5 35, 3 4 Z";
const PILL = "M6 10 C 30 4, 70 6, 94 9 C 99 30, 99 70, 95 90 C 70 96, 30 95, 5 91 C 1 70, 1 30, 6 10 Z";

const css = `
@keyframes plop-invite-card {
  0% { transform: translateY(8%) scale(0.18) rotate(-6deg); opacity: 0; }
  18% { opacity: 1; }
  52% { transform: translateY(-2%) scale(1.07) rotate(1.5deg); }
  70% { transform: translateY(0) scale(0.97) rotate(-1deg); }
  86% { transform: scale(1.015) rotate(-0.4deg); }
  100% { transform: scale(1) rotate(-0.6deg); opacity: 1; }
}
@keyframes plop-invite-twinkle { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.plop-invite-btn { transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1); }
.plop-invite-btn:hover { transform: scale(1.04) rotate(-1deg); }
.plop-invite-btn:active { transform: scale(0.94) rotate(1deg); }
@media (prefers-reduced-motion: reduce) {
  .plop-invite * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  .plop-invite-btn, .plop-invite-btn:hover, .plop-invite-btn:active { transition: none; transform: none; }
}
`;

/** One line of words (one language per line, Rachel). */
function Line({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`block font-heading leading-tight ${className}`}>{children}</span>;
}

/** Puts the score, big and berry red, where `{score}` is. */
function withScore(text: string, score: number) {
  const [before, after] = text.split("{score}");
  return (
    <>
      {before}
      <strong className="mx-0.5 text-3xl font-bold text-berry-deep">{score}</strong>
      {after}
    </>
  );
}

/** Puts the bold name where `{name}` is. */
function withName(text: string, name: string) {
  const [before, after] = text.split("{name}");
  return (
    <>
      {before}
      <strong className="font-bold text-berry-deep">{name}</strong>
      {after}
    </>
  );
}

export function InviteCard({ group, name, score, wager }: Invite) {
  /** True at the snowball's burst: the card pops out of the puff. */
  const shown = useLoaded();
  const router = useRouter();
  const [boardOpen, setBoardOpen] = useState(false);
  // The sender, just back from making this invite inside WeChat: show them where "···" is (read once, cleared below).
  const [sendHint, setSendHint] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage.getItem(SHARE.invite.sentKey) === "1";
    } catch {
      return false; // storage blocked: no hint, the card still works
    }
  });

  // WeChat builds its chat card from the live page: make sure the title and description say who is inviting.
  useEffect(() => {
    document.title = inviteTitle(name);
    document.querySelector('meta[name="description"]')?.setAttribute("content", inviteDescription(score));
  }, [name, score]);

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(SHARE.invite.sentKey);
    } catch {
      // nothing to clear
    }
    // Coarse facts only: whether the link carried a score and a group, never the name.
    track("invite_opened", { with_score: score !== null, with_group: group !== null });
    // Once per visit, on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { words, art, timing } = INVITE;
  const stake = wagerFor(wager);
  const invite = name ? words.invite : words.inviteNoName;

  return (
    <div className="plop-invite absolute inset-0 z-10 flex items-center justify-center overflow-y-auto px-4 py-10 text-ink">
      <style href="plop-invite" precedence="default">
        {css}
      </style>

      {shown && (
        <div className="relative w-[min(86vw,380px)]">
          <div
            className="relative mx-auto px-5 pt-16 pb-7 text-center"
            style={{ animation: `plop-invite-card ${timing.cardIn}ms cubic-bezier(0.3, 1.2, 0.5, 1) both` }}
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
              <path d={EDGE} className="fill-snow-white stroke-ink" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </svg>
            {/* Rachel's fairy lights strung across the top of the card. */}
            <Image
              src={art.lights.src}
              width={art.lights.width}
              height={art.lights.height}
              alt=""
              unoptimized
              className="pointer-events-none absolute -top-12 left-1/2 w-[72%] -translate-x-1/2 select-none"
              style={{ animation: "plop-invite-twinkle 2.6s ease-in-out infinite" }}
              draggable={false}
            />
            <h1 className="relative text-[1.6rem] text-balance sm:text-3xl">
              <Line>{name ? withName(invite, name) : invite}</Line>
            </h1>
            {score !== null && (
              <p className="relative mt-4 text-xl">
                <Line>{withScore(words.score, score)}</Line>
              </p>
            )}
            {/* The inviter's preset wager, quiet: a pencil underline, no box. */}
            {stake && (
              <p className="relative mx-auto mt-3 w-fit text-lg">
                <Line>
                  <span className="text-base opacity-75">{INVITE.wagers.stake}：</span>
                  <span className="underline decoration-berry decoration-wavy decoration-1 underline-offset-[6px]">{stake.zh}</span> {stake.emoji}
                </Line>
              </p>
            )}
            <Link
              href={gamePath({ name, group, score, wager })}
              className="plop-invite-btn relative mx-auto mt-6 block w-[min(70vw,250px)] px-6 py-3 text-ink-deep outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
                <path d={PILL} className="fill-pine stroke-ink" strokeWidth={2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
              <Line className="relative text-4xl font-bold">{words.play}</Line>
            </Link>
            {/* This group's board (from the leaderboard feature), only when the link has a group, folded away so the
                first screen has one action: play. */}
            {group && (
              <button
                type="button"
                onClick={() => setBoardOpen((o) => !o)}
                aria-expanded={boardOpen}
                className="relative mx-auto mt-3 block font-heading text-base text-ink underline decoration-dotted underline-offset-4 opacity-80"
              >
                {boardOpen ? words.board.hide : words.board.show}
              </button>
            )}
            {group && boardOpen && (
              <div data-leaderboard-slot={group} className="relative mt-2 flex justify-center text-left">
                <GroupBoard group={group} limit={INVITE.board.limit} className="w-full" hint={false} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Returning to this group: "you got hit" and "X just passed you", one at a time; either button goes to the game,
          challenged by that friend. */}
      {group && shown && <GroupNotices group={group} onPlay={(friend) => router.push(gamePath({ name: friend, group }))} />}

      {sendHint && shown && (
        <WeChatHint onClose={() => setSendHint(false)} hint={words.sendHint} />
      )}
    </div>
  );
}
