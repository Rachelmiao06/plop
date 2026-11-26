"use client";

/**
 * The victory moment on the end card: the faces area of `MatchEnd`, with a little show before the totals settle in.
 *
 * - **versus:** the crowned winner pelts the loser with snowballs, faster and faster. Each one arcs over and splats
 *   (Rachel's snow puff and snow ring); the loser wobbles, goes surprised, then dizzy, and snow piles up on the head
 *   and face (her snow mound and puffs). Then the loser shakes it all off with a wiggle and sulks a little, and the
 *   winner hops, laughing.
 * - **tie:** both throw at each other at once and end up snowy and laughing.
 * - **team:** both throw snowballs up and the snow falls back on them like confetti.
 * - **soloBest / soloCheer:** alone, snow confetti and the crown popping on for a new best; otherwise a happy hop.
 *
 * Tapping or pressing a key anywhere jumps to the end. Reduced motion: no barrage, just the crown and one puff.
 * Everything moves on the compositor (Web Animations on transform and opacity, one small spring written per frame),
 * so it stays smooth on a phone. Feel numbers: `content.celebrate`.
 */
import { useEffect, useRef, useState } from "react";

import { playThump } from "@/lib/audio";
import { haptic } from "@/lib/haptics";

import { content } from "./content";
import { CrownDoodle, HaloDoodle } from "./Doodles";
import { EXPRESSION_FILES, ExpressiveFace, type Mood } from "./Expressions";
import { useReducedMotion } from "./hooks";
import { styles } from "./hudStyles";
import type { EndPlayer } from "./Match";

const c = content.celebrate;
const e = content.end;

export type CelebrationKind = "versus" | "tie" | "team" | "soloBest" | "soloCheer";

const ART = {
  pile: "/assets/scenery/snowball-pile.webp",
  puff: "/assets/effects/snow-puff.webp",
  ring: "/assets/effects/snow-ring.webp",
  mound: "/assets/scenery/snow-mound.webp",
};
/** The top ball of Rachel's snowball pile (365 × 299): its centre and radius in the image's pixels. */
const BALL = { w: 365, h: 299, x: 184, y: 51, r: 48 };
/** Where the face sits in its box (the box is face + 16 wide, face + 22 tall). */
const FACE_LEFT = 8;
const FACE_TOP = 19;
/** Puffs stuck on the face, as shares of the face size. */
const FACE_BITS = [
  [0.34, 0.66, -18],
  [0.68, 0.58, 22],
  [0.52, 0.42, 6],
] as const;
/** How big the snow pile is left at the end, per kind (0 = shaken off / none). */
const FINAL_MOUND: Record<CelebrationKind, number> = {
  versus: 0,
  tie: 0.75,
  team: 0.7,
  soloBest: 0.45,
  soloCheer: 0,
};

type Seat = 0 | 1;
type Pair<T> = [T | null, T | null];
type Els = {
  box: Pair<HTMLDivElement>;
  body: Pair<HTMLDivElement>;
  mound: Pair<HTMLImageElement>;
  bits: Pair<HTMLSpanElement>;
  crown: Pair<HTMLDivElement>;
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function startMoods(kind: CelebrationKind, winner: Seat | null): [Mood, Mood] {
  if (kind === "versus") return winner === 0 ? ["happy", "calm"] : ["calm", "happy"];
  if (kind === "soloCheer") return ["calm", "calm"];
  return ["happy", "happy"];
}

function finalMoods(kind: CelebrationKind, winner: Seat | null): [Mood, Mood] {
  if (kind === "versus") return winner === 0 ? ["laugh", "sulky"] : ["sulky", "laugh"];
  if (kind === "soloCheer") return ["happy", "calm"];
  return ["laugh", "laugh"];
}

export function Celebration({
  players,
  kind,
  winner,
  crowns,
  onSettled,
}: {
  players: readonly [EndPlayer, EndPlayer];
  kind: CelebrationKind;
  /** Versus only: who won. */
  winner: Seat | null;
  /** Who wears a crown (a new best alone: the first, popping on during the show). */
  crowns: readonly [boolean, boolean];
  /** The show is over (or was skipped): the rest of the card may settle in. */
  onSettled: () => void;
}) {
  const reduce = useReducedMotion();
  const solo = kind === "soloBest" || kind === "soloCheer";
  const team = kind === "team";
  const seats: Seat[] = solo ? [0] : [0, 1];

  const [moods, setMoods] = useState<[Mood, Mood]>(() => startMoods(kind, winner));
  const [done, setDone] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  // The seats' elements, filled by callback refs; the show moves them directly.
  const els = useRef<Els>({
    box: [null, null],
    body: [null, null],
    mound: [null, null],
    bits: [null, null],
    crown: [null, null],
  });
  const settledCb = useRef(onSettled);
  useEffect(() => {
    settledCb.current = onSettled;
  });

  // The show, run once when the card opens.
  useEffect(() => {
    const winnerSeat: Seat | null = kind === "versus" ? winner : null;
    const E = els.current;
    // Warm the expression files so the first swap never blinks.
    for (const src of [...EXPRESSION_FILES, ART.pile, ART.puff, ART.ring, ART.mound]) new Image().src = src;

    let finished = false;
    const timers: number[] = [];
    const later = (seconds: number, fn: () => void) => timers.push(window.setTimeout(fn, seconds * 1000));
    const setMood = (seat: Seat, mood: Mood) =>
      setMoods((m) => {
        if (m[seat] === mood) return m;
        const next: [Mood, Mood] = [m[0], m[1]];
        next[seat] = mood;
        return next;
      });

    const settle = () => {
      if (finished) return;
      finished = true;
      setDone(true);
      settledCb.current();
    };

    // The end state, at once (reduced motion, a tap, or a key).
    const jumpToEnd = (snowy = true) => {
      if (finished) return;
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
      layer.current?.replaceChildren();
      const fm = finalMoods(kind, winnerSeat);
      for (const s of [0, 1] as const) {
        const body = E.body[s];
        body?.getAnimations({ subtree: true }).forEach((a) => a.cancel());
        if (body) body.style.transform = "";
        const crown = E.crown[s];
        if (crown) crown.style.opacity = "";
        const mound = E.mound[s];
        const keep = snowy && FINAL_MOUND[kind] > 0;
        if (mound) {
          mound.style.opacity = keep ? "1" : "0";
          mound.style.transform = `scale(${keep ? FINAL_MOUND[kind] : 0})`;
        }
        E.bits[s]?.querySelectorAll<HTMLElement>("img").forEach((b) => {
          if (!keep) b.style.opacity = "0";
          b.style.transform = b.dataset.rest ?? "";
        });
      }
      setMoods(fm);
      if (kind === "versus") {
        const loser = winnerSeat === 0 ? 1 : 0;
        later(c.sulkFor, () => setMood(loser, "calm"));
      }
      settle();
    };

    // ---- geometry, in the layer's pixels (layout offsets, so the card's pop-in scale and page zoom do not skew it)
    const face = e.face;
    const centre = (seat: Seat) => {
      const l = layer.current!;
      let x = FACE_LEFT + face / 2 - l.offsetLeft;
      let y = FACE_TOP + face / 2 - l.offsetTop;
      for (
        let el: HTMLElement | null = E.box[seat];
        el && el !== l.offsetParent;
        el = el.offsetParent as HTMLElement | null
      ) {
        x += el.offsetLeft;
        y += el.offsetTop;
      }
      return { x, y };
    };

    // ---- one small spring per seat for the hit wobble
    const spin = [
      { a: 0, v: 0 },
      { a: 0, v: 0 },
    ];
    const springOn = [true, true];
    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(1 / 30, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      let moving = false;
      for (const s of [0, 1] as const) {
        const p = spin[s];
        if (!springOn[s] || (Math.abs(p.a) < 0.02 && Math.abs(p.v) < 0.02)) continue;
        p.v += (-c.wobble.stiffness * p.a - c.wobble.damping * p.v) * dt;
        p.a = Math.max(-c.wobble.max, Math.min(c.wobble.max, p.a + p.v * dt));
        const body = E.body[s];
        if (body) body.style.transform = `translateX(${(p.a * 0.35).toFixed(2)}px) rotate(${p.a.toFixed(2)}deg)`;
        moving = true;
      }
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = (seat: Seat, dir: number) => {
      spin[seat].v += c.wobble.kick * 14 * dir;
      if (!frame) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    // ---- little throwaway elements in the layer
    const add = <K extends "span" | "img">(tag: K, size: number) => {
      const el = document.createElement(tag);
      el.setAttribute("aria-hidden", "true");
      el.style.cssText = `position:absolute;left:0;top:0;width:${size}px;pointer-events:none;will-change:transform,opacity;`;
      layer.current?.appendChild(el);
      return el;
    };
    const ball = (size: number) => {
      const el = add("span", size);
      const k = size / (BALL.r * 2);
      el.style.height = `${size}px`;
      el.style.backgroundImage = `url(${ART.pile})`;
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundSize = `${BALL.w * k}px ${BALL.h * k}px`;
      el.style.backgroundPosition = `${-(BALL.x - BALL.r) * k}px ${-(BALL.y - BALL.r) * k}px`;
      el.style.clipPath = "circle(50%)";
      return el;
    };
    const gone = (el: Element, a: Animation) => a.addEventListener("finish", () => el.remove());

    /** A snowball along an arc from `a` to `b`, `ms` long. */
    const fly = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      ms: number,
      size: number = c.ball,
      fade = false,
    ) => {
      const el = ball(size);
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const arc = Math.max(c.arcMin, dist * c.arc);
      const turn = (b.x >= a.x ? 1 : -1) * rand(300, 460);
      const frames: Keyframe[] = [];
      for (let i = 0; i <= 10; i++) {
        const p = i / 10;
        const x = lerp(a.x, b.x, p) - size / 2;
        const y = lerp(a.y, b.y, p) - arc * 4 * p * (1 - p) - size / 2;
        frames.push({
          transform: `translate(${x}px, ${y}px) rotate(${turn * p}deg)`,
          opacity: fade && p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1,
        });
      }
      gone(
        el,
        el.animate(frames, {
          duration: ms,
          easing: "linear",
          fill: "forwards",
        }),
      );
    };

    /** Rachel's snow puff and ring popping at a point. */
    const splat = (p: { x: number; y: number }, scale = 1) => {
      const puff = add("img", c.puff * scale) as HTMLImageElement;
      puff.src = ART.puff;
      const r = rand(-30, 30);
      const at = `translate(${p.x - (c.puff * scale) / 2}px, ${p.y - (c.puff * scale * 235) / 306 / 2}px)`;
      gone(
        puff,
        puff.animate(
          [
            { transform: `${at} scale(0.3) rotate(${r}deg)`, opacity: 1 },
            {
              transform: `${at} scale(1) rotate(${r}deg)`,
              opacity: 1,
              offset: 0.35,
            },
            { transform: `${at} scale(1.15) rotate(${r}deg)`, opacity: 0 },
          ],
          { duration: 440, easing: "ease-out", fill: "forwards" },
        ),
      );
      const ring = add("img", c.ring * scale) as HTMLImageElement;
      ring.src = ART.ring;
      const rat = `translate(${p.x - (c.ring * scale) / 2}px, ${p.y - (c.ring * scale * 254) / 235 / 2}px)`;
      gone(
        ring,
        ring.animate(
          [
            { transform: `${rat} scale(0.45)`, opacity: 0.9 },
            { transform: `${rat} scale(1.35)`, opacity: 0 },
          ],
          { duration: 380, easing: "ease-out", fill: "forwards" },
        ),
      );
    };

    // ---- snow piling on a head
    const hits = [0, 0];
    const pile = (seat: Seat) => {
      hits[seat] += 1;
      const n = hits[seat];
      const m = E.mound[seat];
      if (m) {
        const s = Math.min(1, c.mound.first + c.mound.perHit * (n - 1));
        m.style.opacity = "1";
        m.animate([{ transform: `scale(${s * 1.12}, ${s * 0.85})` }, { transform: `scale(${s})` }], {
          duration: 220,
          easing: "ease-out",
        });
        m.style.transform = `scale(${s})`;
      }
      const which = c.mound.faceBits.indexOf(n as (typeof c.mound.faceBits)[number]);
      const bit = E.bits[seat]?.querySelectorAll<HTMLElement>("img")[which];
      if (bit) {
        bit.style.opacity = "1";
        bit.animate(
          [
            { transform: `${bit.dataset.rest} scale(0.2)` },
            { transform: `${bit.dataset.rest} scale(1.15)` },
            { transform: bit.dataset.rest ?? "" },
          ],
          {
            duration: 260,
            easing: "ease-out",
          },
        );
      }
    };
    /** Shake the snow off: the pile and the puffs tumble down and fade. */
    const shakeOff = (seat: Seat) => {
      springOn[seat] = false;
      spin[seat] = { a: 0, v: 0 };
      const body = E.body[seat];
      if (body) {
        body.style.transform = "";
        const w = c.shake.swing;
        body.animate(
          [0, -w, w, -w * 0.8, w * 0.8, -w * 0.45, w * 0.3, 0].map((d) => ({
            transform: `rotate(${d}deg)`,
          })),
          { duration: c.shake.ms, easing: "ease-in-out" },
        );
      }
      const drop = (el: HTMLElement | null, base: string) => {
        if (!el || el.style.opacity !== "1") return;
        const dx = rand(-22, 22);
        el.animate(
          [
            { transform: base, opacity: 1 },
            {
              transform: `${base} translate(${dx}px, ${face * 0.7}px) rotate(${dx * 2}deg)`,
              opacity: 0,
            },
          ],
          {
            duration: c.shake.ms * 0.8,
            delay: c.shake.ms * 0.15,
            easing: "cubic-bezier(0.5, 0, 0.9, 0.6)",
            fill: "forwards",
          },
        ).addEventListener("finish", (ev) => {
          el.style.opacity = "0";
          (ev.target as Animation).cancel();
        });
      };
      drop(E.mound[seat], E.mound[seat]?.style.transform ?? "");
      E.bits[seat]?.querySelectorAll<HTMLElement>("img").forEach((b) => drop(b, b.dataset.rest ?? ""));
    };
    const hop = (seat: Seat, count: number = c.hop.count) => {
      const h = c.hop.height;
      const frames: Keyframe[] = [];
      for (let i = 0; i < count; i++) {
        frames.push(
          { transform: "translateY(0) scale(1.08, 0.9)", offset: i / count },
          {
            transform: `translateY(${-h}px) scale(0.95, 1.06)`,
            offset: (i + 0.45) / count,
          },
        );
      }
      frames.push({ transform: "translateY(0) scale(1)", offset: 1 });
      E.body[seat]?.animate(frames, {
        duration: c.hop.ms * count,
        easing: "ease-in-out",
      });
    };
    const lean = (seat: Seat, dir: number) =>
      E.body[seat]?.animate(
        [{ transform: "rotate(0)" }, { transform: `rotate(${-c.lean.angle * dir}deg)` }, { transform: "rotate(0)" }],
        {
          duration: c.lean.ms,
          easing: "ease-out",
        },
      );
    const plop = () => {
      playThump(c.plop);
      haptic("flop", c.buzz);
    };

    /** A stream of snowballs from one seat to the other, faster and faster. */
    const barrage = (
      from: Seat,
      to: Seat,
      cfg: {
        duration: number;
        firstGap: number;
        lastGap: number;
        flight: readonly [number, number];
      },
      offset = 0,
      onHit?: (n: number) => void,
    ) => {
      let t = offset;
      let lastHit = 0;
      while (t < cfg.duration) {
        const p = t / cfg.duration;
        const flight = lerp(cfg.flight[0], cfg.flight[1], p);
        later(c.startDelay + t, () => {
          const a = centre(from);
          const b = centre(to);
          const dir = b.x >= a.x ? 1 : -1;
          lean(from, -dir);
          const hand = { x: a.x + dir * face * 0.42, y: a.y + face * 0.12 };
          const aim = {
            x: b.x + rand(-1, 1) * c.aim * face,
            y: b.y + rand(-1, 0.6) * c.aim * face,
          };
          fly(hand, aim, flight * 1000);
          later(flight, () => {
            splat(aim);
            plop();
            kick(to, dir);
            pile(to);
            onHit?.(hits[to]);
          });
        });
        lastHit = t + flight;
        t += lerp(cfg.firstGap, cfg.lastGap, p);
      }
      return lastHit;
    };

    /** Snow falling like confetti over the faces, some of it landing on heads. */
    const confetti = (count: number, from: number, span: number, heads: Seat[], onHead: (s: Seat) => void) => {
      for (let i = 0; i < count; i++) {
        const delay = from + Math.random() * span;
        later(c.startDelay + delay, () => {
          const l = layer.current;
          if (!l) return;
          const width = l.clientWidth;
          const size = rand(c.bit[0], c.bit[1]);
          const fall = rand(c.team.fall[0], c.team.fall[1]);
          const toHead = heads.length > 0 && Math.random() < c.team.onHeads;
          const seat = heads[Math.floor(Math.random() * heads.length)] ?? 0;
          const head = centre(seat);
          const start = {
            x: toHead ? head.x + rand(-30, 30) : rand(-10, width + 10),
            y: -face * 0.9 - rand(0, face * 0.5),
          };
          const end = toHead
            ? {
                x: head.x + rand(-face * 0.2, face * 0.2),
                y: head.y - face * 0.42,
              }
            : { x: start.x + rand(-30, 30), y: l.clientHeight + 10 };
          const el = ball(size);
          const sway = rand(10, 22) * (Math.random() < 0.5 ? -1 : 1);
          const frames: Keyframe[] = [];
          for (let k = 0; k <= 8; k++) {
            const p = k / 8;
            const x = lerp(start.x, end.x, p) + Math.sin(p * Math.PI * 2) * sway * (1 - p * 0.6) - size / 2;
            const y = lerp(start.y, end.y, p * p * 0.5 + p * 0.5) - size / 2;
            frames.push({
              transform: `translate(${x}px, ${y}px) rotate(${sway * p * 8}deg)`,
              opacity: k === 0 ? 0 : !toHead && p > 0.8 ? (1 - p) * 5 : 1,
            });
          }
          gone(
            el,
            el.animate(frames, {
              duration: fall * 1000,
              easing: "linear",
              fill: "forwards",
            }),
          );
          if (toHead)
            later(fall, () => {
              splat(end, 0.45);
              onHead(seat);
            });
        });
      }
    };

    const end = (at: number, fn: () => void, settleIn: number) => {
      later(c.startDelay + at, fn);
      later(c.startDelay + at + settleIn + c.settleAfter, settle);
    };

    // ---- reduced motion: the crown and one puff, then the card at once.
    if (reduce) {
      later(0, () => jumpToEnd(false));
      const target: Seat = kind === "versus" ? (winner === 0 ? 1 : 0) : 0;
      requestAnimationFrame(() => {
        if (!layer.current) return;
        const p = centre(target);
        const el = add("img", c.puff) as HTMLImageElement;
        el.src = ART.puff;
        el.style.transform = `translate(${p.x - c.puff / 2}px, ${p.y - face * 0.55}px)`;
        gone(
          el,
          el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], {
            duration: 900,
            fill: "forwards",
          }),
        );
      });
      return () => timers.forEach(clearTimeout);
    }

    // ---- the shows
    if (kind === "versus" && winnerSeat !== null) {
      const loser: Seat = winnerSeat === 0 ? 1 : 0;
      const lastHit = barrage(winnerSeat, loser, c.versus, 0, (n) => {
        if (n >= c.versus.dizzyAt) setMood(loser, "dizzy");
        else if (n >= c.versus.surprisedAt) setMood(loser, "surprised");
      });
      end(
        lastHit + c.endAfter,
        () => {
          setMood(loser, "straining");
          shakeOff(loser);
          later(c.shake.ms / 1000, () => setMood(loser, "sulky"));
          later(c.shake.ms / 1000 + c.sulkFor, () => setMood(loser, "calm"));
          setMood(winnerSeat, "laugh");
          hop(winnerSeat);
        },
        Math.max(c.shake.ms, c.hop.ms * c.hop.count) / 1000,
      );
    } else if (kind === "tie") {
      const moodOn = (s: Seat) => (n: number) => setMood(s, n >= c.tie.dizzyAt ? "dizzy" : "surprised");
      const a = barrage(0, 1, c.tie, 0, moodOn(1));
      const b = barrage(1, 0, c.tie, c.tie.firstGap / 2, moodOn(0));
      end(
        Math.max(a, b) + c.endAfter,
        () => {
          setMoods(["laugh", "laugh"]);
          hop(0);
          hop(1);
        },
        (c.hop.ms * c.hop.count) / 1000,
      );
    } else if (kind === "team") {
      for (const s of [0, 1] as const) {
        for (let i = 0; i < c.team.throws; i++) {
          later(c.startDelay + i * c.team.throwGap + s * c.team.throwGap * 0.5, () => {
            const a = centre(s);
            lean(s, s === 0 ? 1 : -1);
            const top = {
              x: a.x + rand(-0.5, 0.5) * face,
              y: a.y - c.team.up * face,
            };
            fly({ x: a.x, y: a.y - face * 0.3 }, top, c.team.upFlight * 1000, c.ball * 0.9, true);
          });
        }
      }
      const firstOnHead = [true, true];
      confetti(c.team.confetti, c.team.fallFrom, c.team.duration - c.team.fallFrom - c.team.fall[1], [0, 1], (s) => {
        pile(s);
        playThump(c.plop * 0.6);
        if (firstOnHead[s]) {
          firstOnHead[s] = false;
          setMood(s, "surprised");
          later(0.35, () => setMood(s, "happy"));
        }
      });
      end(
        c.team.duration,
        () => {
          setMoods(["laugh", "laugh"]);
          hop(0);
          hop(1);
        },
        (c.hop.ms * c.hop.count) / 1000,
      );
    } else if (kind === "soloBest") {
      const crown = E.crown[0];
      if (crown) crown.style.opacity = "0";
      later(c.startDelay + c.solo.crownAt, () => {
        if (!crown) return;
        crown.style.opacity = "";
        crown.animate(
          [
            {
              transform: "translateY(-30px) scale(0.3) rotate(-30deg)",
              opacity: 0,
            },
            {
              transform: "translateY(4px) scale(1.15) rotate(6deg)",
              opacity: 1,
              offset: 0.6,
            },
            { transform: "none", opacity: 1 },
          ],
          { duration: 520, easing: "ease-out" },
        );
        playThump(c.plop);
      });
      confetti(c.solo.confetti, 0.1, c.solo.bestDuration - c.team.fall[1], [0], (s) => pile(s));
      end(
        c.solo.bestDuration,
        () => {
          setMood(0, "laugh");
          hop(0);
        },
        (c.hop.ms * c.hop.count) / 1000,
      );
    } else {
      // A gentle cheer: a happy face and one hop.
      later(c.startDelay, () => {
        setMood(0, "happy");
        hop(0, 1);
      });
      later(c.startDelay + c.solo.cheerDuration, settle);
    }

    // Tap or key anywhere: straight to the end.
    const skip = () => jumpToEnd(true);
    window.addEventListener("pointerdown", skip, { capture: true });
    window.addEventListener("keydown", skip, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", skip, { capture: true });
      window.removeEventListener("keydown", skip, { capture: true });
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    };
    // The show runs once, when the card opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seat = (s: Seat, hideTotal: boolean) => (
    <Finisher
      key={s}
      player={players[s]}
      crown={crowns[s]}
      seed={s === 0 ? 3 : 8}
      mood={moods[s]}
      hideTotal={hideTotal}
      showTotal={done}
      refs={(key, el) => {
        (els.current[key] as (Element | null)[])[s] = el;
      }}
    />
  );

  return (
    <div className="relative mt-3">
      {team ? (
        <div className="flex flex-col items-center">
          <div className="flex items-end justify-center gap-2">{seats.map((s) => seat(s, true))}</div>
          <p
            className="font-heading text-5xl leading-tight font-bold text-ink-deep tabular-nums transition-opacity"
            style={{
              opacity: done ? 1 : 0,
              transitionDuration: `${c.reveal}ms`,
            }}
          >
            {players[0].total + players[1].total}
          </p>
        </div>
      ) : (
        <div className="flex items-end justify-center gap-6">{seats.map((s) => seat(s, false))}</div>
      )}
      {/* Snowballs, splats and falling snow fly over the faces here. */}
      <div ref={layer} aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-visible" />
    </div>
  );
}

/** A snowman's face with its name and total, a crown when it won; it can wobble, hop and wear snow. */
function Finisher({
  player,
  crown,
  seed,
  mood,
  hideTotal,
  showTotal,
  refs,
}: {
  player: EndPlayer;
  crown: boolean;
  seed: number;
  mood: Mood;
  hideTotal: boolean;
  showTotal: boolean;
  refs: (key: keyof Els, el: Element | null) => void;
}) {
  const face = e.face;
  const moundH = (c.mound.width * 179) / 380;
  return (
    <div className="flex flex-col items-center">
      <div ref={(el) => refs("box", el)} className="relative" style={{ width: face + 16, height: face + 22 }}>
        {crown && (
          <div className={`absolute inset-x-0 top-3 bottom-[-6px] ${styles.glow}`}>
            <HaloDoodle seed={seed} />
          </div>
        )}
        <div ref={(el) => refs("body", el)} className="absolute inset-0" style={{ transformOrigin: "50% 100%" }}>
          <span className="absolute" style={{ left: FACE_LEFT, top: FACE_TOP }}>
            <ExpressiveFace look={player.look} size={face} mood={mood} />
          </span>
          {/* Puffs of snow stuck on the face (Rachel's snow puff). */}
          <span ref={(el) => refs("bits", el)} aria-hidden>
            {FACE_BITS.map(([x, y, r], i) => {
              const w = c.mound.faceBit;
              const rest = `rotate(${r}deg)`;
              return (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative doodle
                <img
                  key={i}
                  src={ART.puff}
                  alt=""
                  data-rest={rest}
                  draggable={false}
                  className="absolute"
                  style={{
                    left: FACE_LEFT + x * face - w / 2,
                    top: FACE_TOP + y * face - w / 2,
                    width: w,
                    opacity: 0,
                    transform: rest,
                  }}
                />
              );
            })}
          </span>
          {/* The snow piling up on the head (Rachel's snow mound). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- small decorative doodle */}
          <img
            ref={(el) => refs("mound", el)}
            src={ART.mound}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute"
            style={{
              left: FACE_LEFT + face / 2 - c.mound.width / 2,
              top: FACE_TOP + face * 0.24 - moundH,
              width: c.mound.width,
              opacity: 0,
              transform: "scale(0)",
              transformOrigin: "50% 100%",
            }}
          />
          {crown && (
            <div ref={(el) => refs("crown", el)} className="absolute -top-1 left-1/2 -ml-[22px]">
              <div className={styles.crown}>
                <CrownDoodle size={e.crown} />
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="font-heading text-lg leading-none">{player.name}</p>
      {!hideTotal && (
        <p
          className="font-heading text-4xl leading-tight font-bold text-ink-deep tabular-nums transition-opacity"
          style={{
            opacity: showTotal ? 1 : 0,
            transitionDuration: `${c.reveal}ms`,
          }}
        >
          {player.total}
        </p>
      )}
    </div>
  );
}
