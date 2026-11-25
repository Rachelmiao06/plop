"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Shuffle, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  freshSnowfall,
  SnowScene,
  snowTileCount,
  useSnow,
} from "@/features/snow-scene";

// Test page for fresh snowfall (issue #27): stamp a mess of grooves and
// craters, then press "Fresh snow" (or N) and watch it settle back.

const MESS = {
  grooves: 14,
  craters: 9,
  // Where the mess goes (scene units around the middle).
  spreadX: 7,
  spreadZ: 4.5,
  // Groove ball sizes and lengths, crater sizes.
  ballMin: 0.18,
  ballMax: 0.42,
  lengthMin: 2,
  lengthMax: 6,
  craterMin: 0.3,
  craterMax: 0.75,
  // How many grooves and craters are pressed per frame, so it plays out quickly.
  perFrame: 2,
};

type Job = () => void;
const queue: Job[] = [];
const stats = { fps: 0, frames: 0, since: 0, worst: 0, worstSince: 0 };

/** Lives inside the 3D scene: presses the queued grooves and craters, counts frames. */
function MessMaker() {
  const snow = useSnow();

  useEffect(() => {
    mess.make = () => {
      const r = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
      for (let n = 0; n < MESS.grooves; n++) {
        queue.push(() => {
          const ball = r(MESS.ballMin, MESS.ballMax);
          const length = r(MESS.lengthMin, MESS.lengthMax);
          let x = r(-MESS.spreadX, MESS.spreadX);
          let z = r(-MESS.spreadZ, MESS.spreadZ);
          let heading = r(0, Math.PI * 2);
          const bend = r(-0.5, 0.5);
          const step = 0.05;
          const speed = r(0.5, 3);
          for (let d = 0; d < length; d += step) {
            heading += bend * step;
            const vx = Math.cos(heading) * speed;
            const vz = Math.sin(heading) * speed;
            snow.pressGroove(x, z, ball, { velocityX: vx, velocityZ: vz, dig: Math.random() < 0.3 ? 0.02 : 0 });
            x += Math.cos(heading) * step;
            z += Math.sin(heading) * step;
          }
        });
      }
      for (let n = 0; n < MESS.craters; n++) {
        queue.push(() => {
          const x = r(-MESS.spreadX, MESS.spreadX);
          const z = r(-MESS.spreadZ, MESS.spreadZ);
          const radius = r(MESS.craterMin, MESS.craterMax);
          snow.punchCrater(x, z, radius);
          if (Math.random() < 0.4) snow.punchCrater(x, z, radius * 0.8);
        });
      }
    };
    return () => {
      mess.make = () => {};
    };
  }, [snow]);

  useFrame((_, seconds) => {
    for (let n = 0; n < MESS.perFrame && queue.length > 0; n++) queue.shift()?.();
    const now = performance.now();
    stats.frames++;
    stats.worst = Math.max(stats.worst, seconds * 1000);
    if (now - stats.since >= 500) {
      stats.fps = (stats.frames * 1000) / (now - stats.since);
      stats.frames = 0;
      stats.since = now;
    }
  });

  return null;
}

const mess = { make: () => {} };

export function SnowfallTester() {
  const [line, setLine] = useState("");
  const worst = useRef(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      worst.current = stats.worst;
      stats.worst = 0;
      setLine(
        `${stats.fps.toFixed(0)} fps · slowest frame ${worst.current.toFixed(0)} ms · ${snowTileCount()} pressed tiles`,
      );
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative h-full w-full">
      <SnowScene>
        <MessMaker />
      </SnowScene>
      <div className="absolute top-3 left-3 flex flex-col items-start gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => mess.make()}>
            <Shuffle data-icon="inline-start" />
            Stamp a mess
          </Button>
          <Button size="sm" variant="outline" onClick={() => freshSnowfall()}>
            <Snowflake data-icon="inline-start" />
            Fresh snow
          </Button>
        </div>
        <p
          data-snowfall-stats
          className="rounded-lg bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground"
        >
          {line}
        </p>
      </div>
    </div>
  );
}
