"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  FrontSide,
  Group,
  MeshDepthMaterial,
  MeshStandardMaterial,
  RGBADepthPacking,
  SphereGeometry,
  Vector2,
  Vector3,
  type Texture,
} from "three";

import { propSettings, propWidth, standee3d, type PropId } from "../content";
import { useFlecks } from "./Flecks";
import { artGeometry, bodyGeometry } from "./standeeGeometry";
import { usePaper, useTreatment } from "./treatment";

const DEG = Math.PI / 180;
const moundGeometry = new SphereGeometry(1, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2);

type Props = {
  id: PropId;
  x: number;
  z: number;
  scale?: number;
  flip?: boolean;
  art: Texture;
  normal: Texture;
  /** Where the orbit camera looks; the half-turn follows the camera's swing around this point. */
  target: Vector3;
  /** Material for the snow mound (shared with the ground). */
  snow: MeshStandardMaterial;
};

/** Side wall of the cut-out: cream paper with a faint brown line along both edges. */
function paperSideMaterial(side: string, edge: string, halfDepth: number) {
  const material = new MeshStandardMaterial({ color: new Color(side), roughness: 0.95, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uHalfDepth = { value: halfDepth };
    shader.uniforms.uEdge = { value: new Color(edge) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vLocalZ;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalZ = position.z;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uHalfDepth;\nuniform vec3 uEdge;\nvarying float vLocalZ;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float rim = uHalfDepth - abs(vLocalZ);
        float line = 1.0 - smoothstep(0.0, uHalfDepth * 0.4, rim);
        diffuseColor.rgb = mix(diffuseColor.rgb, uEdge, line * 0.5);`,
      );
  };
  return material;
}

/**
 * One scenery prop as a thick cut-out ornament: traced silhouette body, art on the front with a
 * soft pillow normal map, true-silhouette shadow, sunk into a small snow mound, half-turning toward
 * the camera, swaying and wobbling. Every part can be switched off (see treatment.ts).
 */
export function ThickStandee({ id, x, z, scale = 1, flip = false, art, normal, target, snow }: Props) {
  const t = useTreatment();
  const paper = usePaper();
  const spawnFlecks = useFlecks();
  const settings = propSettings(id)!;
  const height = settings.height * scale;
  const width = propWidth(id) * scale;
  const depth = height * standee3d.thicknessShare;
  const sways = standee3d.sway.props.includes(id);

  const turnRoot = useRef<Group>(null);
  const lifeRoot = useRef<Group>(null);
  const angle = useRef(0);
  const speed = useRef(0);
  const wobbleStart = useRef(-100);
  const wobblePending = useRef(false);
  const phase = x * 1.7 + z * 2.3; // different for each spot, so the sway is not in step

  const body = useMemo(() => bodyGeometry(id, width, height, depth), [id, width, height, depth]);
  const card = useMemo(() => artGeometry(width, height), [width, height]);

  const capMaterial = useMemo(
    () => new MeshStandardMaterial({ color: new Color(paper.side), roughness: 0.95, metalness: 0 }),
    [paper.side],
  );
  const sideMaterial = useMemo(() => paperSideMaterial(paper.side, paper.edge, depth / 2), [paper, depth]);

  const p = standee3d.pillow;
  const artMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: art,
        // The drawn colour mostly shows as-is (emissive); the lights only add a faint light and shade side.
        color: new Color(p.litShare, p.litShare, p.litShare),
        emissive: new Color(1, 1, 1),
        emissiveMap: art,
        emissiveIntensity: p.artGlow,
        normalMap: t.pillow ? normal : null,
        normalScale: new Vector2(p.normalScale, p.normalScale),
        roughness: 1,
        metalness: 0,
        alphaTest: 0.5,
        side: t.thick ? FrontSide : DoubleSide,
        // Keep the drawn colours as drawn: no tone mapping on the art itself.
        toneMapped: false,
      }),
    [art, normal, t.pillow, t.thick, p.artGlow, p.litShare, p.normalScale],
  );

  // When there is no thick body, the flat card itself casts a silhouette shadow (alpha-tested).
  const cardDepth = useMemo(
    () => new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: art, alphaTest: 0.5, side: DoubleSide }),
    [art],
  );

  useEffect(
    () => () => {
      body?.dispose();
      card.dispose();
      capMaterial.dispose();
      sideMaterial.dispose();
      artMaterial.dispose();
      cardDepth.dispose();
    },
    [body, card, capMaterial, sideMaterial, artMaterial, cardDepth],
  );

  useFrame(({ camera, clock }, delta) => {
    const turn = turnRoot.current;
    const life = lifeRoot.current;
    if (!turn || !life) return;
    const dt = Math.min(delta, 0.05);

    // Turning: where should this prop face?
    let goal = 0;
    if (t.turn === "full") {
      goal = Math.atan2(camera.position.x - x, camera.position.z - z);
    } else if (t.turn === "half") {
      const yaw = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
      const cap = t.cap * DEG;
      goal = Math.max(-cap, Math.min(cap, yaw * standee3d.turn.fraction));
    }
    if (t.turn === "full") {
      angle.current = goal; // a billboard snaps; no lag
      speed.current = 0;
    } else {
      const { stiffness, damping } = standee3d.turn;
      speed.current += ((goal - angle.current) * stiffness - speed.current * damping) * dt;
      angle.current += speed.current * dt;
    }
    turn.rotation.y = angle.current;

    // Life: a gentle sway, plus a wobble that settles after a click.
    const time = clock.elapsedTime;
    if (wobblePending.current) {
      wobbleStart.current = time;
      wobblePending.current = false;
    }
    let tilt = 0;
    let squash = 0;
    if (t.life) {
      const s = standee3d.sway;
      if (sways) tilt += Math.sin(time * s.speed * Math.PI * 2 + phase) * s.angle * DEG;
      const w = standee3d.wobble;
      const since = time - wobbleStart.current;
      if (since >= 0 && since < 4) {
        const fade = Math.exp(-w.decay * since);
        tilt += Math.sin(since * w.frequency * Math.PI * 2) * w.angle * DEG * fade;
        squash = w.squash * fade * Math.cos(since * w.frequency * Math.PI * 4);
      }
    }
    life.rotation.z = tilt;
    life.scale.set(1 + squash * 0.5, 1 - squash, 1);
  });

  const onHit = (e: ThreeEvent<PointerEvent>) => {
    if (!t.life) return;
    e.stopPropagation();
    wobblePending.current = true;
    const top = new Vector3(x, (t.sink ? -settings.sink : 0) + height * 0.85, z + depth);
    spawnFlecks(top, width * 0.7, standee3d.wobble.flecks);
  };

  const y = t.sink ? -settings.sink * scale : 0;
  const thickOn = t.thick && body;

  return (
    <group position={[x, y, z]}>
      <group ref={turnRoot}>
        <group ref={lifeRoot} onPointerDown={onHit}>
          <group scale-x={flip ? -1 : 1}>
          {thickOn && (
            <mesh geometry={body!} material={[capMaterial, sideMaterial]} castShadow={t.shadow} receiveShadow />
          )}
          <mesh
            geometry={card}
            material={artMaterial}
            position-z={thickOn ? depth / 2 + 0.002 : 0}
            castShadow={t.shadow && !thickOn}
            receiveShadow
            customDepthMaterial={cardDepth}
          />
          </group>
        </group>
      </group>
      {t.sink && (
        <mesh
          geometry={moundGeometry}
          material={snow}
          scale={[(width * standee3d.mound.widthShare) / 2, standee3d.mound.height, standee3d.mound.depth / 2]}
          position-y={-y * 0.15}
        />
      )}
    </group>
  );
}
