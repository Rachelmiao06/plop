"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import {
  Color,
  DirectionalLight,
  FogExp2,
  MeshStandardMaterial,
  NeutralToneMapping,
  NoColorSpace,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from "three";

import { characters, layout, previewCamera, propSrc, standee3d, type PropId } from "../content";
import { cameraTarget, defaultCameraPosition } from "../view";
import { Flecks } from "./Flecks";
import { hasOutline } from "./standeeGeometry";
import { ThickStandee } from "./ThickStandee";
import { PaperContext, TreatmentContext, type FrameStats, type PaperColors, type Treatment } from "./treatment";

/** The bucket snowman stands in for both main characters (A is its model; B is not drawn yet). */
const CHARACTER_STAND_IN: PropId = "snowman-bucket-hat";

const normalSrc = (id: string) => `/assets/scenery/normals/${id}.webp`;

type Placed = { key: string; id: PropId; x: number; z: number; scale?: number; flip?: boolean };

const placed: Placed[] = [
  ...layout.filter((p) => hasOutline(p.prop)).map((p, i) => ({ key: `${p.prop}-${i}`, id: p.prop, x: p.x, z: p.z, scale: p.scale, flip: p.flip })),
  ...characters.map((c) => ({ key: `character-${c.name}`, id: CHARACTER_STAND_IN, x: c.x, z: c.z, flip: c.name === "B" })),
];
const ids = [...new Set(placed.map((p) => p.id))];

function startPosition({ yaw, elevation, level }: { yaw: number; elevation: number; level: number }): [number, number, number] {
  const [, , homeZ] = defaultCameraPosition(level);
  const [, homeY] = defaultCameraPosition(level);
  const distance = Math.hypot(homeY - cameraTarget[1], homeZ);
  const e = (elevation * Math.PI) / 180;
  const a = (yaw * Math.PI) / 180;
  const flat = distance * Math.cos(e);
  return [flat * Math.sin(a), cameraTarget[1] + distance * Math.sin(e), flat * Math.cos(a)];
}

function sunDirection(): Vector3 {
  const { sunElevation, sunAzimuth } = standee3d.light;
  const el = (sunElevation * Math.PI) / 180;
  const az = (sunAzimuth * Math.PI) / 180;
  return new Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), -Math.cos(el) * Math.sin(az));
}

function Lights({ shadow }: { shadow: boolean }) {
  const l = standee3d.light;
  const c = standee3d.colors;
  const sun = useRef<DirectionalLight>(null);
  const dir = useMemo(() => sunDirection().multiplyScalar(20), []);
  useEffect(() => {
    sun.current?.target.position.set(0, 0, 0);
    sun.current?.target.updateMatrixWorld();
  }, []);
  return (
    <>
      <hemisphereLight args={[c.skyFill, c.groundBounce, l.skyStrength]} />
      <directionalLight
        ref={sun}
        color={c.sun}
        intensity={l.sunStrength}
        position={dir.toArray()}
        castShadow={shadow}
        shadow-mapSize={[l.shadowMapSize, l.shadowMapSize]}
        shadow-radius={l.shadowSoftness}
        shadow-bias={l.shadowBias}
        shadow-normalBias={l.shadowNormalBias}
        shadow-intensity={l.shadowIntensity}
      >
        <orthographicCamera attach="shadow-camera" args={[-l.shadowArea, l.shadowArea, l.shadowArea, -l.shadowArea, 1, 45]} />
      </directionalLight>
    </>
  );
}

/** Art is drawn in sRGB; normal maps are plain data. */
function prepareTextures(loaded: unknown) {
  for (const [key, tex] of Object.entries(loaded as Record<string, Texture>)) {
    tex.colorSpace = key.startsWith("art:") ? SRGBColorSpace : NoColorSpace;
    tex.anisotropy = 8;
  }
}

function Village({ snow }: { snow: MeshStandardMaterial }) {
  const urls = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of ids) {
      out[`art:${id}`] = propSrc(id);
      out[`normal:${id}`] = normalSrc(id);
    }
    return out;
  }, []);
  const textures = useTexture(urls, prepareTextures);
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
          snow={snow}
        />
      ))}
    </>
  );
}

function FpsMeter({ stats }: { stats: FrameStats }) {
  useFrame((_, delta) => stats.tick(delta));
  return null;
}

/** The 3D test scene: flat snow, low warm sun, light haze, free orbit camera, the village as thick standees. */
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
    return { side: css.getPropertyValue("--paper").trim(), edge: css.getPropertyValue("--ink").trim() };
  });

  const c = standee3d.colors;
  const snow = useMemo(() => new MeshStandardMaterial({ color: new Color(c.snow), roughness: 1, metalness: 0 }), [c.snow]);
  const mound = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(c.snow),
        emissive: new Color(c.snow),
        emissiveIntensity: standee3d.mound.glow,
        roughness: 1,
        metalness: 0,
      }),
    [c.snow],
  );
  const cam = standee3d.camera;

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ fov: previewCamera.fieldOfView, near: 0.5, far: 120, position: startPosition(start) }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = standee3d.light.exposure;
        scene.background = new Color(c.fog);
        scene.fog = new FogExp2(c.fog, standee3d.hazeDensity);
      }}
      style={{ touchAction: "none" }}
    >
      <TreatmentContext value={treatment}>
        <PaperContext value={paper}>
          <Lights key={treatment.shadow ? "shadow" : "flat"} shadow={treatment.shadow} />
          <mesh rotation-x={-Math.PI / 2} receiveShadow material={snow}>
            <planeGeometry args={[120, 120]} />
          </mesh>
          <Flecks>
            <Suspense fallback={null}>
              <Village snow={mound} />
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
          />
          <FpsMeter stats={stats} />
        </PaperContext>
      </TreatmentContext>
    </Canvas>
  );
}
