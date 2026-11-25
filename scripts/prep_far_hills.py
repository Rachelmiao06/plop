#!/usr/bin/env python3
"""Make Rachel's tileable far-hills panorama meet itself exactly at the joint (run once, from the repo root).

Reads  art-source/scenery/far-2-panorama-tileable-original.png (Rachel's file, unchanged)
Writes art-source/scenery/far-2-panorama-tileable.png (what the slicer cuts, see sheets.json)

Her two ends met within a few pixels: the hill line is 7 px higher at the right edge and the ground line 1 px
lower. Over the last 127 px on the right (open hill only, no trees or houses there) the hill line eases down
and the ground line eases up, so a copy placed next to another continues without a step.
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent.parent / "art-source" / "scenery"
X0 = 2045                     # where the easing starts
HILL_BAND, HILL_STEP = (520, 600), 8     # rows round the hill line, and how far down it moves at the edge
GROUND_BAND, GROUND_STEP = (601, 616), -1  # rows round the ground line, and how far (up) it moves


def ease(a: np.ndarray, out: np.ndarray, band: tuple[int, int], step: int) -> None:
    w = a.shape[1]
    lo, hi = band
    for x in range(X0, w):
        s = int(round(step * (x - X0) / (w - 1 - X0)))
        if s == 0:
            continue
        col = a[lo:hi, x].copy()
        if s > 0:
            out[lo + s:hi, x] = col[: hi - lo - s]
            out[lo:lo + s, x] = a[lo, x]
        else:
            out[lo:hi + s, x] = col[-s:]
            out[hi + s:hi, x] = a[hi - 1, x]


a = np.array(Image.open(HERE / "far-2-panorama-tileable-original.png").convert("RGB"))
out = a.copy()
ease(a, out, HILL_BAND, HILL_STEP)
ease(a, out, GROUND_BAND, GROUND_STEP)
Image.fromarray(out).save(HERE / "far-2-panorama-tileable.png")
print("wrote", HERE / "far-2-panorama-tileable.png")
