"use client";

/**
 * Visit analytics through Vercel Web Analytics and Speed Insights. Privacy first:
 * - no cookies and nothing stored on the device (Vercel counts visitors with a hash that resets every day);
 * - page addresses are sent without their query (`/invite?g=…&from=<name>&score=…` is sent as `/invite`),
 *   except `utm_*` campaign tags, so no names, group ids or scores leave the page through a URL;
 * - custom events carry only coarse facts about the game (rounds, mode) and where the visit came from
 *   (`source`: "wechat", "home_screen" or "browser"), never a name or anything typed in.
 *
 * Features call `track("match_start", { rounds: 3, mode: "turns" })`. On the server, and in local dev, it does
 * nothing (Vercel only collects on deployments).
 */
import { track as vercelTrack } from "@vercel/analytics";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { createElement, Fragment } from "react";

export type AnalyticsEvent =
  | "match_start"
  | "match_end"
  | "invite_made"
  | "invite_opened"
  | "share_tapped"
  | "poster_made"
  /** "复仇 · Get them back" on the "X just passed you" note (only how many others passed too, never names). */
  | "revenge_tapped";
type Value = string | number | boolean | null;

/**
 * Vercel Pro keeps at most 2 properties per custom event (8 with the Web Analytics Plus add-on). One slot is
 * always `source`; if a call passes more than one property, they are folded into one `detail` string
 * ("mode=turns rounds=3") so nothing is silently dropped. Raise this to 8 if the add-on is ever bought.
 */
const MAX_PROPERTIES = 2;

/** Where this visit is being played: inside WeChat's browser, from the home-screen icon, or a normal browser. */
export function visitSource(): "wechat" | "home_screen" | "browser" | "server" {
  if (typeof window === "undefined") return "server";
  if (/MicroMessenger/i.test(navigator.userAgent)) return "wechat";
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches) return "home_screen";
  return "browser";
}

/** Send one custom event. Safe to call anywhere on the client; never throws. */
export function track(name: AnalyticsEvent, props: Record<string, Value> = {}): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(props).filter(([, v]) => v !== undefined);
    const data: Record<string, Value> = { source: visitSource() };
    if (entries.length > 0 && entries.length <= MAX_PROPERTIES - 1) Object.assign(data, Object.fromEntries(entries));
    else if (entries.length > 0)
      data.detail = entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
        .slice(0, 255);
    vercelTrack(name, data);
  } catch {
    // Analytics must never break the toy.
  }
}

/** Keep the path and any utm_* campaign tags; drop every other query value (names, group ids, scores). */
export function scrubUrl(url: string): string {
  try {
    const u = new URL(url);
    const keep = new URLSearchParams();
    u.searchParams.forEach((v, k) => {
      if (k.startsWith("utm_")) keep.append(k, v);
    });
    u.search = keep.toString();
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

const scrub = <E extends { url: string }>(event: E): E => ({ ...event, url: scrubUrl(event.url) });

/** Web Analytics (page views + custom events) and Speed Insights, both with URLs scrubbed. Put once in the layout. */
export function PlopAnalytics() {
  return createElement(
    Fragment,
    null,
    createElement(Analytics, { beforeSend: scrub }),
    createElement(SpeedInsights, { beforeSend: scrub }),
  );
}
