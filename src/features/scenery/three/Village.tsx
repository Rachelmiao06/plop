"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { DirectionalLight, SRGBColorSpace, Vector3, type Texture } from "three";

import { useSnow } from "@/features/snow-scene";

import { propSrc, village } from "../content";
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
      <PaleShadows />
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
      ))}
      {process.env.NODE_ENV === "development" && <SightCheck lane={lane} />}
    </>
  );
}

/**
 * The snow scene's sun throws deep blue-violet shadows; next to paper cut-outs they read heavy, and the
 * design rule is pale blue (--snow-shadow). While the village is shown, the sun's shadows are lightened
 * (`village.shadowStrength`; the sky's blue fill then shows through). Put back when the village goes.
 */
function PaleShadows() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const changed: { light: DirectionalLight; was: number }[] = [];
    scene.traverse((o) => {
      if (o instanceof DirectionalLight && o.castShadow) {
        changed.push({ light: o, was: o.shadow.intensity });
        o.shadow.intensity = village.shadowStrength;
      }
    });
    return () => changed.forEach(({ light, was }) => (light.shadow.intensity = was));
  }, [scene]);
  return null;
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

