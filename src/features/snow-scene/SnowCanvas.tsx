"use client";

import { type ReactNode, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { NeutralToneMapping } from "three";
import { content } from "./content";
import { cameraHome } from "./layout";
import { Backdrop, CameraRig, Lights, Snowfall } from "./SceneLook";
import { SnowContext } from "./snowContext";
import { SnowField } from "./snowField";
import { SnowGround } from "./SnowGround";
import { TempDragPress, TempFps, TempGuides } from "./TempDragPress";

// The 3D canvas. Loaded in the browser only (see SnowScene.tsx).
export default function SnowCanvas({ children }: { children?: ReactNode }) {
  const [field] = useState(() => new SnowField());

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, content.maxPixelRatio]}
      camera={{
        fov: content.camera.fieldOfView,
        near: 1,
        far: 80,
        position: cameraHome(),
      }}
      onCreated={({ gl }) => {
        // Keeps colours true and leaves headroom for bright highlights.
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = content.light.exposure;
      }}
      // Dragging on the snow must not scroll or zoom the page.
      style={{ touchAction: "none" }}
    >
      <SnowContext value={field}>
        <CameraRig />
        <Backdrop />
        <Lights />
        <SnowGround />
        <Snowfall />
        {/* TEMPORARY test hook, see TempDragPress.tsx */}
        <TempDragPress />
        <TempGuides />
        <TempFps />
        {children}
      </SnowContext>
    </Canvas>
  );
}
