"use client";

/**
 * The camera choreography of a throw, through the snow scene's camera shots (`setSnowCameraShot`):
 *
 *   aim ──(let go)──► launch ─► chase ──(the ball meets the pins / stops)──► impact ──(pins pop back)──► return ─► aim
 *
 * - aim: the player's own view; as the pull grows it eases a little lower and closer behind the thrower.
 * - launch: a quick push forward and a field-of-view kick, both scaled by the pull's power.
 * - chase: behind and a little above the ball, low over the snow, looking ahead down the lane, with a little lag.
 * - impact: a three-quarter side angle on the pins while they fall (the hit-stop runs underneath), held
 *   through "N down!".
 * - return: a calm glide back to the player's own view for the next turn.
 *
 * Any drag, scroll or key during the chase or the impact hands the view back (the snow scene drops
 * interruptible shots); it comes back for the next throw. "Reduce motion" keeps only a gentle follow.
 * Every number is `GAME.camera` in `content.ts`. Render inside `<SnowScene>`. Draws nothing.
 */
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { FEEL, type Bowling, type RollingBall } from "@/features/bowling";
import type { Pins } from "@/features/pins";
import { kickSnowCamera, resumeSnowCamera, setSnowCameraShot, useSnow } from "@/features/snow-scene";

import { GAME } from "./content";
import type { GameLink } from "./GameBridge";

type Stage = "aim" | "chase" | "impact";

const QUERY = "(prefers-reduced-motion: reduce)";
function prefersLessMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

const smooth = (u: number) => u * u * (3 - 2 * u);
const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export function CameraDirector({ pins, link }: { pins: Pins; link: GameLink }) {
  const snow = useSnow();
  const s = useRef({
    stage: "aim" as Stage,
    ballId: -1,
    /** Seconds since letting go (real time). */
    since: 0,
    power: 0,
    /** Which side the impact view swings to (+1 right, -1 left). */
    side: 1,
    /** The last place the ball was seen, for the impact view if it has gone. */
    last: { x: FEEL.lane.pinSpot.x, z: FEEL.lane.pinSpot.z },
    release: GAME.camera.aim.rate as number,
    bound: null as { bowling: Bowling; off: () => void } | null,
  });

  // Let go of the camera when the game goes away.
  useEffect(
    () => () => {
      s.current.bound?.off();
      setSnowCameraShot(null);
    },
    [],
  );

  // The pins popping back up (or a new set arriving) ends the impact view: glide home for the next turn.
  useEffect(
    () =>
      pins.subscribe((e) => {
        const st = s.current;
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

  useFrame((_, delta) => {
    const c = GAME.camera;
    const st = s.current;
    const less = prefersLessMotion();
    const bowling = link.get();

    // Listen to the running bowling game for the launch.
    if (bowling && bowling !== st.bound?.bowling) {
      st.bound?.off();
      const off = bowling.subscribe((e) => {
        if (e.type !== "launched") return;
        st.stage = "chase";
        st.ballId = e.ballId;
        st.since = 0;
        st.power = e.plan.power;
        if (!prefersLessMotion()) {
          const p = c.launch.minShare + (1 - c.launch.minShare) * e.plan.power;
          kickSnowCamera({ forward: c.launch.push * p, fov: c.launch.fovKick * p });
        }
      });
      st.bound = { bowling, off };
    }
    if (!bowling) return;

    st.since += Math.min(delta, 0.1);
    const pin = FEEL.lane.pinSpot;
    const ball: RollingBall | undefined = bowling.balls.find((b) => b.id === st.ballId);
    if (ball) st.last = { x: ball.position.x, z: ball.position.z };

    // ---- aim: the player's own view, pulled in a little as the pull loads up.
    if (st.stage === "aim") {
      const t = bowling.thrower;
      if (t.phase === "pulling" && !less) {
        const a = c.aim;
        const p = clamp01(Math.hypot(t.pull.x, t.pull.z) / FEEL.pull.max) ** a.curve;
        setSnowCameraShot({
          closer: a.closer * p,
          lower: a.lower * p,
          lookShift: [t.x * a.followSlide * p, 0, a.lookBack * p],
          rate: a.rate,
        });
        st.release = a.rate;
      } else {
        setSnowCameraShot(null, st.release);
      }
      return;
    }

    // ---- chase: ride behind the ball until it reaches the pins (or the hit-stop says it has), or stops.
    if (st.stage === "chase") {
      const reached =
        !ball ||
        !ball.rolling ||
        bowling.timeScale < 1 ||
        ball.position.z <= pin.z + c.impact.triggerAhead;
      if (reached) {
        st.stage = "impact";
        // Swing to the side the ball is on, so it ploughs through toward the camera's side.
        st.side = st.last.x < pin.x - c.impact.sideDeadZone ? -1 : 1;
      } else if (less) {
        // Reduce motion: only a gentle look after the ball.
        const r = c.reduced;
        const dx = ball.position.x - bowling.thrower.x;
        const dz = ball.position.z - FEEL.lane.lineZ;
        const far = Math.hypot(dx, dz);
        const k = far > 0 ? Math.min(r.max, far * r.share) / far : 0;
        setSnowCameraShot({ lookShift: [dx * k, 0, dz * k], rate: r.rate, interruptible: true });
        return;
      } else {
        const ch = c.chase;
        const d = ball.plan.direction;
        const r = ball.plan.radius;
        const bx = ball.position.x;
        const bz = ball.position.z;
        const back = ch.back + r * ch.backPerRadius;
        // Never drive into the pins: the camera stops short of them and only turns to look.
        const cz = Math.max(bz - d.z * back, pin.z + ch.stopBefore);
        const cx = bx - d.x * back;
        const ground = snow.heightAt(cx, cz);
        const lx = bx + d.x * ch.ahead;
        const lz = bz + d.z * ch.ahead;
        // Ease from the launch push into the steady chase.
        const u = smooth(clamp01(st.since / c.launch.time));
        setSnowCameraShot({
          position: [cx, ground + ch.height + r * ch.heightPerRadius, cz],
          lookAt: [lx, snow.heightAt(lx, lz) + ch.lookHeight, lz],
          fov: ch.fov + ch.fovPerSpeed * Math.min(ball.speed, ch.fullSpeed),
          rate: c.launch.rate + (ch.rate - c.launch.rate) * u,
          lookRate: ch.lookRate,
          interruptible: true,
        });
        return;
      }
    }

    // ---- impact: three-quarter side view on the pins, held through "N down!".
    if (less) {
      const r = c.reduced;
      const dz = pin.z - FEEL.lane.lineZ;
      setSnowCameraShot({ lookShift: [0, 0, Math.max(dz * r.share, -r.max)], rate: r.rate, interruptible: true });
      return;
    }
    const im = c.impact;
    const a = (im.angle * Math.PI) / 180;
    const px = pin.x + st.side * Math.sin(a) * im.distance;
    const pz = pin.z + Math.cos(a) * im.distance;
    const lz = pin.z + im.lookBack;
    setSnowCameraShot({
      position: [px, snow.heightAt(px, pz) + im.height, pz],
      lookAt: [pin.x + st.side * im.lookSide, snow.heightAt(pin.x, lz) + im.lookHeight, lz],
      fov: im.fov,
      rate: im.rate,
      lookRate: im.lookRate,
      interruptible: true,
    });
  });

  return null;
}
