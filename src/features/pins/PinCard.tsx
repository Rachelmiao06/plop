"use client";

/**
 * One pin drawn as the scenery feature's thick standee: the traced silhouette extruded into card,
 * the art on the front, paper sides shaded toward --snow-shadow from the fixed drawing light, a
 * faint --ink edge line. Origin at the bottom centre of the art, facing +z (the throwing line).
 *
 * Built from the scenery feature's exported pieces (`bodyGeometry`, `artGeometry`, `toonMaterial`,
 * `artMaterial`). Its `ThickStandee` component also half-turns, sways and sinks into a fake mound,
 * which pins must not do while physics moves them, so this is the same look without those parts.
 * Scenery could later export a `StandeeBody` (geometry + materials only) that both use.
 */
import { forwardRef, useEffect, useMemo } from "react";
import { Vector3, type Group, type Texture } from "three";

import { standee3d } from "@/features/scenery/content";
import { artMaterial, toonMaterial } from "@/features/scenery/three/materials";
import { artGeometry, bodyGeometry } from "@/features/scenery/three/standeeGeometry";

export type PaperColors = { paper: string; shade: string; ink: string };

/** The drawing light all paper shading comes from (same as the scenery look). */
const drawingLight = new Vector3(...standee3d.shading.from).normalize();

type Props = {
  id: string;
  width: number;
  height: number;
  depth: number;
  flip?: boolean;
  art: Texture;
  paper: PaperColors;
};

export const PinCard = forwardRef<Group, Props>(function PinCard({ id, width, height, depth, flip, art, paper }, ref) {
  const body = useMemo(() => bodyGeometry(id, width, height, depth), [id, width, height, depth]);
  const card = useMemo(() => artGeometry(width, height), [width, height]);
  const materials = useMemo(() => {
    const band = standee3d.shading.band;
    return {
      cap: toonMaterial({ base: paper.paper, shade: paper.shade, light: drawingLight, band, card: standee3d.card }),
      side: toonMaterial({
        base: paper.paper,
        shade: paper.shade,
        light: drawingLight,
        band,
        edge: { color: paper.ink, halfDepth: depth / 2 },
        card: standee3d.card,
      }),
      // Pillow shading is off in the approved look, so the art itself stands in for the unused normal map.
      art: artMaterial({
        map: art,
        normalMap: art,
        pillow: 0,
        shade: paper.shade,
        light: drawingLight,
        band: standee3d.pillow.band,
        doubleSided: !body,
      }),
    };
  }, [paper, depth, art, body]);

  useEffect(
    () => () => {
      body?.dispose();
      card.dispose();
      materials.cap.dispose();
      materials.side.dispose();
      materials.art.dispose();
    },
    [body, card, materials],
  );

  return (
    <group ref={ref}>
      <group scale-x={flip ? -1 : 1}>
        {body && <mesh geometry={body} material={[materials.cap, materials.side]} castShadow />}
        <mesh geometry={card} material={materials.art} position-z={body ? depth / 2 + 0.002 : 0} castShadow={!body} />
      </group>
    </group>
  );
});
