"use client";

/**
 * /dev/pins only: once the camera has settled in the throwing view, measure how much the cards of every
 * formation hide each other (overlap.ts) and log a table. Runs in development, or anywhere with `?overlap`
 * (so a Vercel preview can be checked too). Measures again when the window changes shape.
 */
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";

import { useSnow } from "@/features/snow-scene";

import { OVERLAP } from "./content";
import { sampleGround } from "./layout";
import { allFormationOverlaps } from "./overlap";

export function OverlapCheck() {
  const [on] = useState(
    () => process.env.NODE_ENV === "development" || new URLSearchParams(window.location.search).has("overlap"),
  );
  return on ? <Measure /> : null;
}

function Measure() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const snow = useSnow();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const ground = sampleGround(snow.heightAt);
      const rows = allFormationOverlaps(ground, camera);
      const table = rows.map((r) => ({
        set: r.id,
        pins: r.pins,
        "worst hidden %": Math.round((r.worst?.hidden ?? 0) * 1000) / 10,
        front: r.worst?.front ?? "",
        behind: r.worst?.back ?? "",
        pass: r.pass,
      }));
      const ok = rows.every((r) => r.pass);
      const head = `Pin overlap at ${size.width}x${size.height} (limit ${OVERLAP.maxHidden * 100}%): ${ok ? "all pass" : "TOO CROWDED"}`;
      if (ok) console.info(head);
      else console.warn(head);
      console.table(table);
      console.info(`Pin overlap JSON ${JSON.stringify(table)}`);
      console.info(`Pin overlap CAMERA ${JSON.stringify({ m: camera.matrixWorld.elements, p: camera.projectionMatrix.elements })}`);
    }, OVERLAP.measureAfter * 1000);
    return () => window.clearTimeout(timer);
  }, [camera, size.width, size.height, snow]);
  return null;
}
