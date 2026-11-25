#!/usr/bin/env python3
"""Trace the silhouettes of the scenery standees and bake their pillow normal maps.

Run after scripts/slice_scenery.py, from the repo root:
    python3 scripts/trace_standees.py

Reads   public/assets/scenery/<name>.webp for every prop cut from a doodle sheet
        (sheets in art-source/scenery/sheets.json whose file starts with "doodle-"),
        except decals listed in SKIP.
Writes  src/features/scenery/outlines.json
            {name: {"w": px, "h": px, "shapes": [{"outer": [[x, y], ...], "holes": [[[x, y], ...], ...]}]}}
            Pixel coordinates of the file, y down. Simplified so a whole prop stays a few hundred
            points; the 3D page extrudes these into thick cut-outs (cached here, never traced at load).
        public/assets/scenery/normals/<name>.webp
            A soft "pillow" normal map: thicker in the middle, curving down at the silhouette, from a
            distance field of the alpha. OpenGL convention (green = up), as Three.js expects.

Needs OpenCV (cv2), numpy, scipy and Pillow (already on this machine; nothing goes in package.json).
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "art-source" / "scenery" / "sheets.json"
ART = ROOT / "public" / "assets" / "scenery"
NORMALS = ART / "normals"
OUTLINES = ROOT / "src" / "features" / "scenery" / "outlines.json"

SKIP = {"wind-swirl"}   # decals are not standees
ALPHA_CUT = 128         # alpha above this is inside the silhouette
SIMPLIFY = 1.3          # max distance (px) a simplified outline may stray from the traced one
MIN_AREA = 40           # pieces smaller than this many px are left out of the thick shape
NORMAL_SIDE = 256       # long side of the normal maps
PILLOW_RADIUS = 0.07    # how far in from the edge the pillow curve reaches, as a share of the long side
PILLOW_STRENGTH = 1.0   # steepness of the curve in the normal map (the page also scales it)


def doodle_names() -> list[str]:
    config = json.loads(CONFIG.read_text())
    names: list[str] = []
    for sheet in config["sheets"]:
        if sheet.get("target", "scenery") == "scenery" and sheet["file"].startswith("doodle-"):
            names += [n for n in sheet["names"] if n not in SKIP]
    return names


def trace(alpha: np.ndarray) -> list[dict]:
    mask = (alpha > ALPHA_CUT).astype(np.uint8)
    contours, hierarchy = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]
    shapes: list[dict] = []
    for i, contour in enumerate(contours):
        if hierarchy[i][3] != -1:  # a hole; handled with its parent
            continue
        if cv2.contourArea(contour) < MIN_AREA:
            continue
        outer = cv2.approxPolyDP(contour, SIMPLIFY, True)[:, 0, :]
        if len(outer) < 3:
            continue
        holes = []
        child = hierarchy[i][2]
        while child != -1:
            if cv2.contourArea(contours[child]) >= MIN_AREA:
                hole = cv2.approxPolyDP(contours[child], SIMPLIFY, True)[:, 0, :]
                if len(hole) >= 3:
                    holes.append(hole.tolist())
            child = hierarchy[child][0]
        shapes.append({"outer": outer.tolist(), "holes": holes})
    return shapes


def pillow_normals(alpha: np.ndarray) -> Image.Image:
    h, w = alpha.shape
    scale = NORMAL_SIDE / max(w, h)
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    a = np.asarray(Image.fromarray(alpha).resize(size, Image.LANCZOS)).astype(np.float32) / 255.0
    inside = a > 0.5
    # Distance in from the silhouette, then a rounded (quarter-circle) profile near the edge.
    d = ndi.distance_transform_edt(inside)
    r = PILLOW_RADIUS * NORMAL_SIDE
    t = np.clip(d / r, 0.0, 1.0)
    height = np.sqrt(1.0 - (1.0 - t) ** 2) * r
    height = ndi.gaussian_filter(height, 1.2)
    gy, gx = np.gradient(height)
    # Image rows go down; OpenGL normal maps want +y up.
    nx = -gx * PILLOW_STRENGTH
    ny = gy * PILLOW_STRENGTH
    nz = np.ones_like(nx)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    n = np.dstack([nx / length, ny / length, nz / length])
    n[~inside] = (0.0, 0.0, 1.0)
    rgb = ((n * 0.5 + 0.5) * 255).round().clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgb, "RGB")


def main() -> None:
    NORMALS.mkdir(parents=True, exist_ok=True)
    outlines: dict[str, dict] = {}
    total_points = 0
    total_bytes = 0
    names = doodle_names()
    for name in names:
        im = Image.open(ART / f"{name}.webp").convert("RGBA")
        alpha = np.asarray(im)[..., 3]
        shapes = trace(alpha)
        points = sum(len(s["outer"]) + sum(len(hl) for hl in s["holes"]) for s in shapes)
        total_points += points
        outlines[name] = {"w": im.width, "h": im.height, "shapes": shapes}

        target = NORMALS / f"{name}.webp"
        pillow_normals(alpha).save(target, "WEBP", lossless=True, quality=100, method=6)
        total_bytes += target.stat().st_size
        print(f"{name:18s} {len(shapes):3d} pieces {points:5d} points  normals {target.stat().st_size / 1024:5.1f} KB")

    for old in NORMALS.glob("*.webp"):
        if old.stem not in outlines:
            old.unlink()
            print(f"deleted {old.relative_to(ROOT)}")
    OUTLINES.write_text(json.dumps(outlines, separators=(",", ":")) + "\n")
    print(f"{len(outlines)} props, {total_points} outline points -> {OUTLINES.relative_to(ROOT)} "
          f"({OUTLINES.stat().st_size / 1024:.0f} KB); normal maps {total_bytes / 1024:.0f} KB")


if __name__ == "__main__":
    main()
