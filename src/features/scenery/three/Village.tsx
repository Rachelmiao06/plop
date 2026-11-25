"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace, Vector3, type Group, type Texture } from "three";

import { useSnow } from "@/features/snow-scene";

import { propSrc, village, type PropId } from "../content";
import { drawnGameLane, throwingView, villageLayout, villageProblems, type GameLane } from "../village";
import { Flecks } from "./Flecks";
import { hasOutline } from "./standeeGeometry";
import { ThickStandee } from "./ThickStandee";
import { PaperContext, type PaperColors } from "./treatment";

type Props = {
  /** The game's lane (the bowling feature's `FEEL.lane` fits as is). Default: the lane the layout was drawn for. */
  lane?: GameLane;
  /** The point the half-turn swings around. Default: the throwing view's look-at point for this lane. */
  pivot?: [number, number, number];
};

/**
 * The cosy village framing the lane, as thick hand-drawn standees standing in the real snow.
 * Render inside <SnowScene>. Each base sits on the snow (heightAt), sunk by its manifest depth,
 * in a soft heap of real snow (heapSnow), so footprints, craters and fresh snowfall all treat it as snow.
 */
export function Village({ lane = drawnGameLane, pivot }: Props) {
  // Only ever runs in the browser (inside the snow scene's canvas), so the tokens can be read here.
  const [paper] = useState<PaperColors>(() => {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    return { paper: token("--paper"), shade: token("--snow-shadow"), ink: token("--ink") };
  });

  return (
    <PaperContext value={paper}>
      <Flecks>
        <Suspense fallback={null}>
          <Standees lane={lane} pivot={pivot} />
        </Suspense>
      </Flecks>
    </PaperContext>
  );
}

function Standees({ lane, pivot }: { lane: GameLane; pivot?: [number, number, number] }) {
  const snow = useSnow();
  const placed = useMemo(() => villageLayout(lane).filter((p) => hasOutline(p.id)), [lane]);
  const ids = useMemo(() => [...new Set(placed.map((p) => p.id))], [placed]);
  const urls = useMemo(() => Object.fromEntries(ids.map((id) => [id, propSrc(id)])), [ids]);
  const textures = useTexture(urls) as Record<string, Texture>;
  useMemo(() => {
    for (const tex of Object.values(textures)) {
      tex.colorSpace = SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
  }, [textures]);

  const [px, py, pz] = pivot ?? throwingView(lane).lookAt;
  const target = useMemo(() => new Vector3(px, py, pz), [px, py, pz]);

  // Heap the snow round every base first, then stand each prop on it. Heaps never stack
  // (the taller wins), so running this twice is harmless.
  const bases = useMemo(() => {
    const m = village.mound;
    return placed.map((p) => {
      snow.heapSnow(p.x, p.z, (p.width * m.widthShare), m.depth, m.height + m.heightPerUnit * p.height);
      // The lowest snow along the base edge, so no corner floats over a drift.
      const half = p.width * 0.35;
      return Math.min(snow.heightAt(p.x, p.z), snow.heightAt(p.x - half, p.z), snow.heightAt(p.x + half, p.z));
    });
  }, [placed, snow]);

  return (
    <>
      {placed.map((p, i) => (
        <Mover key={p.key} id={p.id} x={p.x} z={p.z} inward={p.x < lane.pinSpot.x ? 1 : -1}>
        <ThickStandee
          key={p.key}
          id={p.id}
          x={p.x}
          z={p.z}
          scale={p.scale}
          flip={p.flip}
          art={textures[p.id]}
          normal={textures[p.id]}
          target={target}
          baseY={bases[i]}
          mound={false}
        />
        </Mover>
      ))}
      {process.env.NODE_ENV === "development" && <SightCheck lane={lane} />}
    </>
  );
}

/**
 * The small loop for props that look like they are moving (`village.movers`): the sliding penguin glides
 * a short way toward the lane and back, the skier sways on its feet. Anything else is passed through.
 */
function Mover({ id, x, z, inward, children }: { id: PropId; x: number; z: number; inward: number; children: ReactNode }) {
  const loop = village.movers[id];
  const root = useRef<Group>(null);
  const phase = x * 0.9 + z * 0.4;
  useFrame(({ clock }) => {
    const g = root.current;
    if (!g || !loop) return;
    const t = clock.elapsedTime;
    if (loop.kind === "slide") {
      // 0 → 1 → 0 over the moving part of the loop, eased at both ends, then a rest.
      const u = (((t + phase) / loop.period) % 1) / (1 - loop.rest);
      const out = u < 1 ? (1 - Math.cos(u * Math.PI * 2)) / 2 : 0;
      g.position.x = inward * loop.distance * out;
    } else {
      const a = Math.sin((t + phase) * loop.speed * Math.PI * 2);
      g.rotation.z = (a * loop.angle * Math.PI) / 180;
      g.position.x = a * loop.step;
    }
  });
  if (!loop) return <>{children}</>;
  // The group pivots at the prop's feet, so the sway rocks it on the snow.
  return (
    <group position={[x, 0, z]}>
      <group ref={root}>
        <group position={[-x, 0, -z]}>{children}</group>
      </group>
    </group>
  );
}

/** Development only: once the camera has settled in its default view, list anything in the lane or the sight line. */
function SightCheck({ lane }: { lane: GameLane }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const problems = villageProblems(lane, camera.position);
      if (problems.length > 0) console.warn("Village layout:", problems);
      else console.info("Village layout: lane clear, pins in sight.");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [lane, camera]);
  return null;
}

