"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, Group, MeshDepthMaterial, RGBADepthPacking, SphereGeometry, Vector3, type Texture } from "three";

import { propSettings, propWidth, standee3d, type PropId } from "../content";
import { useFlecks } from "./Flecks";
import { artMaterial, toonMaterial } from "./materials";
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
  /** Height of the snow under the prop (the real snow scene's heightAt). Default 0 (flat test snow). */
  baseY?: number;
  /** Draw the stand-in paper mound at the base. Off on the real snow, which heaps its own. Default true. */
  mound?: boolean;
};

/** The fixed drawing light all paper shading comes from (see standee3d.shading). */
const drawingLight = new Vector3(...standee3d.shading.from).normalize();

/**
 * One scenery prop as a thick cut-out ornament: traced silhouette body, art on the front with a
 * soft pillow normal map, true-silhouette shadow, sunk into a small snow mound, half-turning toward
 * the camera, swaying and wobbling. Every part can be switched off (see treatment.ts).
 */
export function ThickStandee({ id, x, z, scale = 1, flip = false, art, normal, target, baseY = 0, mound = true }: Props) {
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

  const band = standee3d.shading.band;
  const capMaterial = useMemo(
    () => toonMaterial({ base: paper.paper, shade: paper.shade, light: drawingLight, band, card: standee3d.card }),
    [paper, band],
  );
  const sideMaterial = useMemo(
    () =>
      toonMaterial({
        base: paper.paper,
        shade: paper.shade,
        light: drawingLight,
        band,
        edge: { color: paper.ink, halfDepth: depth / 2 },
        card: standee3d.card,
      }),
    [paper, band, depth],
  );
  const moundMaterial = useMemo(
    () => toonMaterial({ base: paper.paper, shade: paper.shade, light: drawingLight, band }),
    [paper, band],
  );
  const artCard = useMemo(
    () =>
      artMaterial({
        map: art,
        normalMap: normal,
        pillow: t.pillow ? standee3d.pillow.strength : 0,
        shade: paper.shade,
        light: drawingLight,
        band: standee3d.pillow.band,
        doubleSided: !t.thick,
      }),
    [art, normal, t.pillow, t.thick, paper.shade],
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
      moundMaterial.dispose();
      artCard.dispose();
      cardDepth.dispose();
    },
    [body, card, capMaterial, sideMaterial, moundMaterial, artCard, cardDepth],
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
    const top = new Vector3(x, baseY + (t.sink ? -settings.sink : 0) + height * 0.85, z + depth);
    spawnFlecks(top, width * 0.7, standee3d.wobble.flecks);
  };

  const sunk = t.sink ? -settings.sink * scale : 0;
  const y = baseY + sunk;
  const thickOn = t.thick && body;

  return (
    <group position={[x, y, z]}>
      <group ref={turnRoot}>
        <group ref={lifeRoot} onPointerDown={onHit}>
          <group scale-x={flip ? -1 : 1}>
          {thickOn && (
            <mesh geometry={body!} material={[capMaterial, sideMaterial]} castShadow={t.shadow} />
          )}
          <mesh
            geometry={card}
            material={artCard}
            position-z={thickOn ? depth / 2 + 0.002 : 0}
            castShadow={t.shadow && !thickOn}
            customDepthMaterial={cardDepth}
          />
          </group>
        </group>
      </group>
      {t.sink && mound && (
        <mesh
          geometry={moundGeometry}
          material={moundMaterial}
          scale={[(width * standee3d.mound.widthShare) / 2, standee3d.mound.height, standee3d.mound.depth / 2]}
          position-y={-sunk * 0.15}
        />
      )}
    </group>
  );
}
