"use client";

/**
 * The camera choreography of a throw, through the snow scene's camera shots (`setSnowCameraShot`):
 *
 *   aim ──(let go)──► launch ─► chase ──(the ball stops or poofs, or the count is in)──► settle ──(pins pop back)──► return ─► aim
 *
 * - aim: the player's own view; as the pull grows it eases a little lower and closer behind the thrower.
 * - launch: a quick push forward and a field-of-view kick, both scaled by the pull's power.
 * - chase: the view follows the ball, gently (Rachel): the look-at point rides on it down the lane, to the back
 *   wall and back again, while the camera rises a little and glides in a modest way, never past the snowman
 *   (it sits at the bottom edge of the picture, slipping just out of it while the ball is at the far wall).
 * - settle: the look-at point eases onto the pins while they fall and "N down!" shows; the camera holds.
 * - return: a calm glide back to the player's own view for the next turn.
 *
 * "Together" mode has no single ball to chase: the look-at point leans toward the middle of both rolling balls and
 * the camera glides in a little, then eases onto the pins (`CAMERA.together`); no key ends it, as the other player's
 * keys would. Elsewhere any drag, scroll or key during the chase or the settle hands the view back (the snow scene
 * drops interruptible shots); it comes back for the next throw. "Reduce motion" keeps only a gentle lean.
 * Numbers: `CAMERA` in `camera.ts` (chase, settle, together) and `GAME.camera` in `content.ts` (aim, launch, return,
 * reduce motion). Every move is an offset on top of the player's own view, so turning and zooming still work.
 * Render inside `<SnowScene>`. Draws nothing.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { FEEL, type Bowling, type RollingBall } from "@/features/bowling";
import { formationById, setCentre, type Pins } from "@/features/pins";
import { throwingView } from "@/features/scenery";
import { kickSnowCamera, resumeSnowCamera, setSnowCameraShot, snowCameraFov, useSnow } from "@/features/snow-scene";

import { CAMERA } from "./camera";
import { GAME } from "./content";
import type { GameLink } from "./GameBridge";
import { phoneThrowingView } from "./ThrowingView";

type Stage = "aim" | "chase" | "settle";
type V3 = [number, number, number];

const QUERY = "(prefers-reduced-motion: reduce)";
function prefersLessMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

const smooth = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** A ball still on its way (rolling, not poofing). */
const live = (b: RollingBall | undefined): b is RollingBall => !!b && b.rolling && b.bursting === null;

export function CameraDirector({ pins, link }: { pins: Pins; link: GameLink }) {
  const snow = useSnow();
  const s = useRef({
    stage: "aim" as Stage,
    ballId: -1,
    /** Seconds since letting go (real time). */
    since: 0,
    /** How far down the lane the throw has got (0 at the line .. 1 at the back wall); it never goes back down. */
    reach: 0,
    /** The aim's last closer / lower, so the chase starts from there instead of backing off first. */
    fromCloser: 0,
    fromLower: 0,
    /** The camera's glide now (closer, lower), held through the settle. */
    closer: 0,
    lower: 0,
    release: GAME.camera.aim.rate as number,
    /** The running bowling games (two in "together" mode) and their event listeners. */
    bound: new Map<Bowling, () => void>(),
  });

  // Let go of the camera when the game goes away.
  useEffect(() => {
    const st = s.current;
    return () => {
      st.bound.forEach((off) => off());
      st.bound.clear();
      setSnowCameraShot(null);
    };
  }, []);

  useEffect(
    () =>
      pins.subscribe((e) => {
        const st = s.current;
        // The count is in: whatever still rolls is poofing, so settle on the pins.
        if (e.type === "result" && st.stage === "chase") st.stage = "settle";
        // The pins popping back up (or a new set arriving) ends it: glide home for the next turn.
        if (e.type === "phase" && (e.phase === "resetting" || e.phase === "changing" || e.phase === "ready")) {
          if (st.stage !== "aim") {
            st.stage = "aim";
            st.release = GAME.camera.ret.rate;
            setSnowCameraShot(null, st.release);
          }
          resumeSnowCamera();
        }
      }),
    [pins],
  );

  useFrame(({ size, camera }, delta) => {
    // Handy from the browser console while tuning (development only): window.__camera.position
    if (process.env.NODE_ENV !== "production") (window as unknown as { __camera?: unknown }).__camera = camera;
    const c = GAME.camera;
    const st = s.current;
    const less = prefersLessMotion();
    const games = link.all();
    const together = games.length > 1;

    // Listen to every running bowling game for the launch (again if one was remade, or the mode changed).
    for (const [old, off] of st.bound) {
      if (games.includes(old)) continue;
      off();
      st.bound.delete(old);
    }
    for (const bowling of games) {
      if (st.bound.has(bowling)) continue;
      const off = bowling.subscribe((e) => {
        if (e.type !== "launched") return;
        const fresh = st.stage !== "chase";
        st.stage = "chase";
        st.ballId = e.ballId;
        if (fresh) {
          st.since = 0;
          st.reach = 0;
          st.fromCloser = st.closer;
          st.fromLower = st.lower;
        }
        if (!prefersLessMotion() && link.all().length === 1) {
          const p = c.launch.minShare + (1 - c.launch.minShare) * e.plan.power;
          kickSnowCamera({ forward: c.launch.push * p, fov: c.launch.fovKick * p });
        }
      });
      st.bound.set(bowling, off);
    }
    const bowling = games[0];
    if (!bowling) return;

    st.since += Math.min(delta, 0.1);
    // The player's own look-at point (lookShift is added to it): the phone's framing on a phone held upright.
    const phone = size.width / Math.max(size.height, 1) < GAME.phoneView.maxAspect;
    const base = (phone ? phoneThrowingView() : throwingView(FEEL.lane)).lookAt;
    const shiftTo = (x: number, y: number, z: number): V3 => [x - base[0], y - base[1], z - base[2]];
    // The set on the lane now: round sets stand left or right of the middle.
    const pin = setCentre(formationById(pins.getState().formation));
    const lineZ = FEEL.lane.lineZ;

    // ---- aim: the player's own view, pulled in a little as the pull loads up (one thrower only).
    if (st.stage === "aim") {
      const t = bowling.thrower;
      if (!together && t.phase === "pulling" && !less) {
        const a = c.aim;
        const p = clamp01(Math.hypot(t.pull.x, t.pull.z) / FEEL.pull.max) ** a.curve;
        st.closer = a.closer * p;
        st.lower = a.lower * p;
        setSnowCameraShot({
          closer: st.closer,
          lower: st.lower,
          lookShift: [t.x * a.followSlide * p, 0, a.lookBack * p],
          rate: a.rate,
        });
        st.release = a.rate;
      } else {
        st.closer = 0;
        st.lower = 0;
        setSnowCameraShot(null, st.release);
      }
      return;
    }

    // ---- together: lean toward the middle of both balls, glide in a little; then ease onto the pins.
    if (together) {
      const tg = CAMERA.together;
      const rolling = games.flatMap((g) => g.balls.filter(live));
      if (rolling.length) {
        st.stage = "chase";
        const mx = rolling.reduce((sum, b) => sum + b.position.x, 0) / rolling.length;
        const mz = rolling.reduce((sum, b) => sum + b.position.z, 0) / rolling.length;
        st.reach = Math.max(st.reach, clamp01((lineZ - mz) / tg.wallZ));
        const share = less ? c.reduced.share : tg.share;
        const [sx, dy, sz] = shiftTo(mx, snow.heightAt(mx, mz) + CAMERA.chase.lookHeight, mz).map((v) => v * share);
        const cap = Math.min(1, tg.max / Math.max(Math.hypot(sx, sz), 1e-6));
        const [dx, dz] = [sx * cap, sz * cap];
        st.closer = less ? 0 : tg.closer * smooth(st.reach);
        st.lower = 0;
        setSnowCameraShot({ closer: st.closer, lookShift: [dx, dy, dz], rate: tg.rate, lookRate: tg.lookRate });
      } else {
        st.stage = "settle";
        const se = CAMERA.settle;
        const lz = pin.z + se.lookBack;
        const share = less ? c.reduced.share : 1;
        const [dx, dy, dz] = shiftTo(pin.x, snow.heightAt(pin.x, lz) + se.lookHeight, lz).map((v) => v * share);
        setSnowCameraShot({ closer: st.closer, lookShift: [dx, dy, dz], rate: se.rate, lookRate: se.lookRate });
      }
      return;
    }

    const ball = bowling.balls.find((b) => b.id === st.ballId);
    if (st.stage === "chase" && !live(ball)) st.stage = "settle";

    // ---- reduce motion: no glide, the view only leans a little after the ball, then toward the pins.
    if (less) {
      const r = c.reduced;
      const at = st.stage === "chase" && ball ? ball.position : pin;
      const dx = at.x - bowling.thrower.x;
      const dz = at.z - lineZ;
      const far = Math.hypot(dx, dz);
      const k = far > 0 ? Math.min(r.max, far * r.share) / far : 0;
      setSnowCameraShot({ lookShift: [dx * k, 0, dz * k], rate: r.rate, interruptible: true });
      return;
    }

    // ---- chase: the look-at point rides on the ball; the camera rises a little and glides in, gently.
    if (st.stage === "chase" && live(ball)) {
      const ch = CAMERA.chase;
      const pinShare = clamp01((lineZ - pin.z) / ch.wallZ);
      st.reach = Math.max(st.reach, clamp01((lineZ - ball.position.z) / ch.wallZ));
      // How far the glide has got: `atPins` of it by the pins, all of it at the wall.
      const glide =
        st.reach <= pinShare
          ? ch.atPins * smooth(st.reach / Math.max(pinShare, 1e-6))
          : lerp(ch.atPins, 1, smooth((st.reach - pinShare) / Math.max(1 - pinShare, 1e-6)));
      st.closer = Math.max(st.fromCloser, ch.closer * glide);
      st.lower = lerp(st.fromLower, -ch.rise, glide);
      let lx = ball.position.x + ball.direction.x * ch.ahead;
      let lz = ball.position.z + ball.direction.z * ch.ahead;
      // Past the pins (on to the wall, or rolling back): keep the cards in the picture.
      if (lz < pin.z) {
        lx = lerp(lx, pin.x, ch.keepPins);
        lz = lerp(lz, pin.z, ch.keepPins);
      }
      // Ease from the launch push into the steady follow.
      const u = smooth(clamp01(st.since / c.launch.time));
      setSnowCameraShot({
        closer: st.closer,
        lower: st.lower,
        lookShift: shiftTo(lx, snow.heightAt(lx, lz) + ch.lookHeight, lz),
        fov: lerp(snowCameraFov, ch.fovFar, glide),
        rate: lerp(c.launch.rate, ch.rate, u),
        lookRate: ch.lookRate,
        interruptible: true,
      });
      return;
    }

    // ---- settle: hold the camera where the chase left it, ease the look onto the pins, held through "N down!".
    const se = CAMERA.settle;
    const lz = pin.z + se.lookBack;
    setSnowCameraShot({
      closer: st.closer,
      lower: st.lower,
      lookShift: shiftTo(pin.x, snow.heightAt(pin.x, lz) + se.lookHeight, lz),
      fov: snowCameraFov,
      rate: se.rate,
      lookRate: se.lookRate,
      interruptible: true,
    });
  });

  return null;
}
