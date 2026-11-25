"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  Color,
  DirectionalLight,
  FogExp2,
  MeshBasicMaterial,
  NoColorSpace,
  NoToneMapping,
  ShadowMaterial,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from "three";

import { previewCamera, propSrc, sceneItems, standee3d, type PropId } from "../content";
import { cameraTarget } from "../view";
import { Flecks } from "./Flecks";
import { hasOutline } from "./standeeGeometry";
import { ThickStandee } from "./ThickStandee";
import { PaperContext, TreatmentContext, type FrameStats, type PaperColors, type Treatment } from "./treatment";

const normalSrc = (id: string) => `/assets/scenery/normals/${id}.webp`;

type Placed = { key: string; id: PropId; x: number; z: number; scale?: number; flip?: boolean };

/** The frame, the example pins and both throwers, as on /dev/scenery. */
const placed: Placed[] = sceneItems.filter((p) => hasOutline(p.id));
const ids = [...new Set(placed.map((p) => p.id))];

function startPosition({ yaw, elevation, level }: { yaw: number; elevation: number; level: number }): [number, number, number] {
  const d = previewCamera.distance * level;
  const e = (elevation * Math.PI) / 180;
  const a = (yaw * Math.PI) / 180;
  const [tx, ty, tz] = cameraTarget;
  return [tx + d * Math.cos(e) * Math.sin(a), ty + d * Math.sin(e), tz + d * Math.cos(e) * Math.cos(a)];
}

function sunDirection(): Vector3 {
  const { sunElevation, sunAzimuth } = standee3d.light;
  const el = (sunElevation * Math.PI) / 180;
  const az = (sunAzimuth * Math.PI) / 180;
  return new Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
}

/** The sun only casts shadows; nothing on this page is lit physically (see materials.ts). */
function Sun({ shadow }: { shadow: boolean }) {
  const l = standee3d.light;
  const sun = useRef<DirectionalLight>(null);
  const dir = useMemo(() => sunDirection().multiplyScalar(20), []);
  useEffect(() => {
    sun.current?.target.position.set(0, 0, 0);
    sun.current?.target.updateMatrixWorld();
  }, []);
  return (
    <directionalLight
      ref={sun}
      position={dir.toArray()}
      castShadow={shadow}
      shadow-mapSize={[l.shadowMapSize, l.shadowMapSize]}
      shadow-radius={l.shadowSoftness}
      shadow-bias={l.shadowBias}
      shadow-normalBias={l.shadowNormalBias}
    >
      <orthographicCamera attach="shadow-camera" args={[-l.shadowArea, l.shadowArea, l.shadowArea, -l.shadowArea, 1, 45]} />
    </directionalLight>
  );
}

/** Art is drawn in sRGB; normal maps are plain data. */
function prepareTextures(loaded: Record<string, Texture>) {
  for (const [key, tex] of Object.entries(loaded)) {
    tex.colorSpace = key.startsWith("art:") ? SRGBColorSpace : NoColorSpace;
    tex.anisotropy = 8;
    // Re-upload with the right colour space, or the art shows pale and washed out.
    tex.needsUpdate = true;
  }
}

function Village() {
  const urls = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of ids) {
      out[`art:${id}`] = propSrc(id);
      out[`normal:${id}`] = normalSrc(id);
    }
    return out;
  }, []);
  const textures = useTexture(urls);
  // Before the first draw: art is sRGB, normal maps are data.
  useMemo(() => prepareTextures(textures), [textures]);
  const target = useMemo(() => new Vector3(...cameraTarget), []);

  return (
    <>
      {placed.map((p) => (
        <ThickStandee
          key={p.key}
          id={p.id}
          x={p.x}
          z={p.z}
          scale={p.scale}
          flip={p.flip}
          art={textures[`art:${p.id}`]}
          normal={textures[`normal:${p.id}`]}
          target={target}
        />
      ))}
    </>
  );
}

function FpsMeter({ stats }: { stats: FrameStats }) {
  useFrame((_, delta) => stats.tick(delta));
  return null;
}

/**
 * The 3D test scene: flat paper-white snow, shadows painted in --snow-shadow, a light haze into --paper,
 * a free orbit camera and the village as thick standees. Only token colours appear.
 */
export default function VillageCanvas({
  treatment,
  stats,
  start,
}: {
  treatment: Treatment;
  stats: FrameStats;
  /** Starting camera: swing (degrees), height (degrees) and distance (times the default). */
  start: { yaw: number; elevation: number; level: number };
}) {
  // This file only ever loads in the browser (dynamic import, no server render), so the tokens can be read here.
  const [paper] = useState<PaperColors>(() => {
    const css = getComputedStyle(document.documentElement);
    const token = (name: string) => css.getPropertyValue(name).trim();
    return { paper: token("--paper"), shade: token("--snow-shadow"), ink: token("--ink") };
  });

  // The snow is plain paper colour; shadows are painted on top in exactly the shade token.
  const ground = useMemo(() => new MeshBasicMaterial({ color: new Color(paper.paper) }), [paper.paper]);
  const shadowPaint = useMemo(
    () => new ShadowMaterial({ color: new Color(paper.shade), opacity: standee3d.light.shadowStrength }),
    [paper.shade],
  );
  const cam = standee3d.camera;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: previewCamera.fieldOfView, near: 0.5, far: 120, position: startPosition(start) }}
      onCreated={({ gl, scene }) => {
        // Token colours exactly as written: no tone mapping.
        gl.toneMapping = NoToneMapping;
        scene.background = new Color(paper.paper);
        scene.fog = new FogExp2(paper.paper, standee3d.hazeDensity);
      }}
      style={{ touchAction: "none" }}
    >
      <TreatmentContext value={treatment}>
        <PaperContext value={paper}>
          <Sun key={treatment.shadow ? "shadow" : "flat"} shadow={treatment.shadow} />
          <mesh rotation-x={-Math.PI / 2} material={ground}>
            <planeGeometry args={[120, 120]} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow material={shadowPaint}>
            <planeGeometry args={[120, 120]} />
          </mesh>
          <Flecks>
            <Suspense fallback={null}>
              <Village />
            </Suspense>
          </Flecks>
          <OrbitControls
            makeDefault
            target={cameraTarget}
            enableDamping
            dampingFactor={0.08}
            minDistance={cam.minDistance}
            maxDistance={cam.maxDistance}
            maxPolarAngle={Math.PI / 2 - (cam.minElevation * Math.PI) / 180}
            minPolarAngle={Math.PI / 2 - (cam.maxElevation * Math.PI) / 180}
            minAzimuthAngle={-(cam.maxTurn * Math.PI) / 180}
            maxAzimuthAngle={(cam.maxTurn * Math.PI) / 180}
          />
          <FpsMeter stats={stats} />
        </PaperContext>
      </TreatmentContext>
    </Canvas>
  );
}
