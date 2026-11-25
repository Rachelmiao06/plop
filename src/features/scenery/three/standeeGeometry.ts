import { ExtrudeGeometry, Path, PlaneGeometry, Shape } from "three";

import outlines from "../outlines.json";

type Point = [number, number];
type Outline = { w: number; h: number; shapes: { outer: Point[]; holes: Point[][] }[] };

const traced = outlines as unknown as Record<string, Outline | undefined>;

/** True when scripts/trace_standees.py has traced this prop. */
export const hasOutline = (id: string) => Boolean(traced[id]);

/**
 * The thick body of a cut-out: the traced silhouette extruded `depth` deep, centred on z = 0.
 * Units: scene units, origin at the bottom centre of the art, y up. Built once per prop and size.
 */
export function bodyGeometry(id: string, width: number, height: number, depth: number): ExtrudeGeometry | null {
  const o = traced[id];
  if (!o) return null;
  const sx = width / o.w;
  const sy = height / o.h;
  const toVec = ([x, y]: Point): [number, number] => [(x - o.w / 2) * sx, (o.h - y) * sy];

  const shapes = o.shapes.map((piece) => {
    const shape = new Shape();
    piece.outer.forEach((p, i) => (i === 0 ? shape.moveTo(...toVec(p)) : shape.lineTo(...toVec(p))));
    shape.closePath();
    for (const hole of piece.holes) {
      const path = new Path();
      hole.forEach((p, i) => (i === 0 ? path.moveTo(...toVec(p)) : path.lineTo(...toVec(p))));
      path.closePath();
      shape.holes.push(path);
    }
    return shape;
  });

  const geometry = new ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 1, steps: 1 });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/** The flat art card, origin at its bottom centre. */
export function artGeometry(width: number, height: number): PlaneGeometry {
  const geometry = new PlaneGeometry(width, height);
  geometry.translate(0, height / 2, 0);
  return geometry;
}
