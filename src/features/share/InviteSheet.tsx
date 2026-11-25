"use client";

/**
 * "Invite a friend": a small hand-drawn paper sheet above the share button. Its title says whose name the invite
 * carries ("邀请朋友，署名：小美", the name from the start card, or the snowman's default when none was typed, so an
 * invite never goes out unsigned) with "改名字 / change" to change it, and, once you have finished a match alone on
 * this device, it offers to include your best score.
 * Then it makes a short link to the invite card, `/invite?g=<group>&from=<name>&score=<n>` (the group id from
 * `ensureGroupId`, so all of one person's invites share a leaderboard), and shares it:
 *
 * - inside WeChat: copies the link and opens the card page, where the "tap ··· top right" hint shows, so WeChat's
 *   own menu sends it as a proper chat card (WeChat blocks sharing from a page without its JS-SDK);
 * - with the Web Share API: the system share sheet;
 * - otherwise: copies the link and says so.
 *
 * Nothing else about you goes in the link. The name is the game's (`readNames` / `savePlayerOne`), remembered on this
 * device only, so the start card, the score panel and the board say the same.
 */
import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { GAME, readNames, savePlayerOne, serverNames, shownName, subscribeNames } from "@/features/game";
import { cleanName, INVITE, invitePath } from "@/features/invite";

import { copy, isWeChat, store, systemShare } from "./actions";
import { SHARE } from "./content";
import { ensureGroupId } from "./group";

const words = SHARE.invite;

/** Best total kept by the game after a match alone (either length), or null. Read only, never written here. */
function readBest(): number | null {
  let best: number | null = null;
  for (const rounds of GAME.match.lengths) {
    const v = store.get("local", `${GAME.match.bestKey}.${rounds}`);
    const n = v === null ? NaN : Number(v);
    if (Number.isFinite(n) && n > 0) best = Math.max(best ?? 0, n);
  }
  return best;
}

// Edges in a 100 x 100 box, stretched to fit (strokes do not stretch).
const EDGE = "M4 5 C 30 2.5, 70 5.5, 96 3.5 C 98 35, 96 70, 97.5 96 C 70 98.5, 30 96, 3 97.5 C 4.5 70, 1.5 35, 4 5 Z";
const PILL = "M5 12 C 30 5, 70 7, 95 10 C 99 30, 99 70, 96 90 C 70 96, 30 95, 4 90 C 1 70, 1 30, 5 12 Z";

type Props = {
  onClose: () => void;
  /** The old one-tap share of the game itself. */
  onPlainShare: () => void;
  /** Tell the button what happened ("invite link copied!"). */
  onNote: (note: string) => void;
};

export function InviteSheet({ onClose, onPlainShare, onNote }: Props) {
  const id = useId();
  const typed = useSyncExternalStore(subscribeNames, readNames, serverNames)[0];
  /** What is in the field while changing the name (null = not changing). Nothing typed yet: the field is open. */
  const [editing, setEditing] = useState<string | null>(() => (readNames()[0] ? null : ""));
  const name = editing ?? typed;
  const signed = shownName(0, name);
  const [best] = useState(readBest);
  const [withScore, setWithScore] = useState(true);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const send = async () => {
    const clean = cleanName(name);
    if (clean && clean !== typed) savePlayerOne(clean);
    // Never unsigned: no name typed means the snowman's cute default.
    const path = invitePath({ group: ensureGroupId(), name: signed, score: best !== null && withScore ? best : null });
    const url = window.location.origin + path;

    if (isWeChat()) {
      await copy(url);
      onNote(words.wechat.zh);
      store.set("session", words.sentKey, "1");
      window.location.assign(path);
      return;
    }
    const text = words.text.replace("{name}", signed);
    const result = await systemShare({ title: "Plop!", text, url });
    if (result === "unavailable") onNote((await copy(url)) ? words.copied.zh : SHARE.copyFailed);
    if (result !== "closed") onClose();
  };

  return (
    <div
      role="dialog"
      aria-labelledby={`${id}-title`}
      className="plop-share-sheet absolute bottom-full left-0 mb-3 w-[min(80vw,300px)] px-5 pt-5 pb-5 text-ink"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        <path d={EDGE} className="fill-paper stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label={words.close}
          className="absolute -top-1 -right-2 size-8 rounded-full font-heading text-2xl leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ×
        </button>
        <h2 id={`${id}-title`} className="pr-6 text-xl leading-tight">
          {words.title.zh.replace("{name}", signed)}
          <span className="block font-sans text-xs">{words.title.en.replace("{name}", signed)}</span>
        </h2>

        {editing === null ? (
          <button
            type="button"
            onClick={() => setEditing(typed)}
            className="mt-1 text-sm underline decoration-wavy underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {words.change.zh} · <span className="text-xs">{words.change.en}</span>
          </button>
        ) : (
          <>
            <label htmlFor={`${id}-name`} className="mt-3 block text-sm">
              {words.name.zh} <span className="text-xs opacity-80">· {words.name.en}</span>
            </label>
            <input
              id={`${id}-name`}
              value={editing}
              placeholder={shownName(0, null)}
              onChange={(e) => setEditing(Array.from(e.target.value).slice(0, INVITE.link.nameMax).join(""))}
              onKeyDown={(e) => e.key === "Enter" && send()}
              autoComplete="nickname"
              enterKeyHint="send"
              className="mt-1 w-full rounded-2xl border-2 border-ink bg-paper px-3 py-1.5 font-heading text-xl outline-none placeholder:text-ink/45 focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        )}

        {best !== null && (
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={withScore}
              onChange={(e) => setWithScore(e.target.checked)}
              className="mt-0.5 size-4 accent-pine"
            />
            <span>
              {words.score.zh.replace("{score}", String(best))}
              <span className="block text-xs opacity-80">{words.score.en.replace("{score}", String(best))}</span>
            </span>
          </label>
        )}

        <button
          type="button"
          onClick={send}
          className="plop-share-btn relative mt-4 block w-full px-4 py-2 text-ink-deep outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
            <path d={PILL} className="fill-pine stroke-ink" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          <span className="relative block font-heading text-2xl font-bold leading-tight">{words.send.zh}</span>
          <span className="relative block text-xs">{words.send.en}</span>
        </button>

        <button
          type="button"
          onClick={onPlainShare}
          className="mt-3 block w-full text-center text-sm underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {words.plain.zh} · {words.plain.en}
        </button>
      </div>
    </div>
  );
}
