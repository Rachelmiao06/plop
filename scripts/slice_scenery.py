#!/usr/bin/env python3
"""Cut the scenery sticker sheets into single transparent props.

Reads   art-source/scenery/sheet-*.png   (six objects each, white paper background)
Writes  public/assets/scenery/<name>.webp (transparent, trimmed, base on the bottom edge)
Prints  one line per prop with its pixel size, to copy into src/features/scenery/content.ts

Run from the repo root:   python3 scripts/slice_scenery.py
Check sheets for the eye:  python3 scripts/slice_scenery.py --check <folder>
Needs Pillow, numpy and scipy (already on this machine; nothing is added to package.json).

How the background is removed
  A colour key would eat the white snow, so only paper that is connected to the
  sheet's edge is removed (a flood fill from the border with a small tolerance).
  The brown outlines stop the flood. A few props have see-through gaps that are
  fully fenced in by the drawing (between the fence rails, under the bench back,
  between the sled runners); those are listed by hand in HOLES below.
  The last one or two pixels next to the paper get a soft alpha taken from how
  far their colour is from the paper, and the paper colour is subtracted from
  them, so there is no white halo on dark or blue backgrounds.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-source" / "scenery"
OUT = ROOT / "public" / "assets" / "scenery"

# Sheet file -> six names, reading order (top row left to right, then bottom row).
SHEETS: dict[str, list[str]] = {
    "sheet-1-buildings-trees.png": [
        "tree-bare", "cottage", "igloo",
        "pine-tall", "pine-medium", "pine-small",
    ],
    "sheet-2-village-props.png": [
        "signpost", "flag", "bench",
        "log-hollow", "street-lamp", "fence",
    ],
    "sheet-3-small-props.png": [
        "berry-bush", "snow-mound", "snowball-pile",
        "bucket", "radio", "sled",
    ],
    "sheet-4-friends.png": [
        "snowman-sitting", "snowman-reading", "snowman-waving",
        "penguin-standing", "penguin-sliding", "mailbox",
    ],
}

# Fenced-in paper gaps to make transparent: prop name -> points (x, y) on the sheet.
HOLES: dict[str, list[tuple[int, int]]] = {
    "bench": [(1344, 304)],                              # under the backrest
    "fence": [(1228, 854), (1335, 852)],                 # between the two rails, both sides
    "sled": [(1173, 832), (1364, 855), (1235, 886)],     # under the deck, between the runners
}

# White highlights drawn without an outline that touch a hole: circles (x, y, radius) kept solid.
KEEP: dict[str, list[tuple[int, int, int]]] = {
    "sled": [(1178, 834, 6)],                            # shine on the tip of the front runner
}

TOLERANCE = 12     # how far (0-255, largest channel) a pixel may be from paper and still count as paper
EDGE_RING = 2       # pixels next to the removed paper that get a soft alpha
EDGE_FULL = 96      # colour distance from paper at which an edge pixel is fully opaque
MIN_PIECE = 60      # loose specks smaller than this many pixels are dropped
MARGIN = 8          # clear pixels kept on the left, right and top (none at the bottom)
MAX_SIDE = 512      # long side limit; props are never enlarged
WEBP_QUALITY = 90


def cut_sheet(path: Path, names: list[str]) -> dict[str, Image.Image]:
    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape

    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    paper = np.median(border, axis=0)
    dist = np.abs(rgb - paper).max(axis=2)
    paperlike = dist <= TOLERANCE

    # Paper connected to the sheet edge.
    labels, _ = ndi.label(paperlike)
    edge_ids = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    outside = np.isin(labels, edge_ids[edge_ids > 0])

    # Hand-listed fenced-in gaps.
    for name, points in HOLES.items():
        if name not in names:
            continue
        for x, y in points:
            lab = labels[y, x]
            if lab == 0:
                raise SystemExit(f"{name}: hole point ({x}, {y}) is not on paper")
            outside |= labels == lab
    yy, xx = np.mgrid[0:h, 0:w]
    for name, circles in KEEP.items():
        if name not in names:
            continue
        for x, y, r in circles:
            outside &= (xx - x) ** 2 + (yy - y) ** 2 > r * r

    # Soft edge: alpha from colour distance in a thin ring beside the removed paper.
    alpha = np.where(outside, 0.0, 1.0).astype(np.float32)
    ring = ndi.binary_dilation(outside, structure=np.ones((3, 3), bool), iterations=EDGE_RING) & ~outside
    alpha[ring] = np.clip(dist[ring] / EDGE_FULL, 0.0, 1.0)

    # Take the paper colour back out of the half-transparent pixels.
    a = np.clip(alpha, 1e-3, 1.0)[..., None]
    clean = np.clip((rgb - (1.0 - a) * paper) / a, 0, 255)
    clean[alpha == 0] = 0

    # Which solid piece belongs to which of the six cells.
    solid = alpha > 0.5
    pieces, count = ndi.label(solid, structure=np.ones((3, 3), bool))
    sizes = ndi.sum(solid, pieces, index=np.arange(1, count + 1))
    centres = ndi.center_of_mass(solid, pieces, index=np.arange(1, count + 1))
    owner = np.full(count + 1, -1)
    for i, (size, (cy, cx)) in enumerate(zip(sizes, centres), start=1):
        if size < MIN_PIECE:
            continue
        owner[i] = int(cy // (h / 2)) * 3 + int(cx // (w / 3))
    cell_of = owner[pieces]

    out: dict[str, Image.Image] = {}
    for cell, name in enumerate(names):
        mine = cell_of == cell
        if not mine.any():
            raise SystemExit(f"{name}: nothing found in its cell")
        # Keep this prop's solid pieces plus the soft ring touching them.
        keep = ndi.binary_dilation(mine, structure=np.ones((3, 3), bool), iterations=EDGE_RING + 1)
        a_mine = np.where(keep, alpha, 0.0)
        ys, xs = np.nonzero(a_mine > 0.12)
        top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()

        rgba = np.dstack([clean, a_mine * 255.0]).round().astype(np.uint8)
        crop = Image.fromarray(rgba[top : bottom + 1, left : right + 1], "RGBA")
        canvas = Image.new("RGBA", (crop.width + 2 * MARGIN, crop.height + MARGIN), (0, 0, 0, 0))
        canvas.paste(crop, (MARGIN, MARGIN))

        long_side = max(canvas.size)
        if long_side > MAX_SIDE:
            scale = MAX_SIDE / long_side
            size = (round(canvas.width * scale), round(canvas.height * scale))
            # Resize with premultiplied alpha so no paper colour bleeds into the edge.
            canvas = canvas.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")
        out[name] = canvas
    return out


def check_sheet(props: dict[str, Image.Image], colour: tuple[int, int, int], path: Path) -> None:
    """A contact sheet of every prop on one flat colour, bases on a shared line per row."""
    names = list(props)
    cols, cell, pad = 6, 520, 12
    rows = -(-len(names) // cols)
    sheet = Image.new("RGB", (cols * cell, rows * cell), colour)
    for i, name in enumerate(names):
        im = props[name]
        x = (i % cols) * cell + (cell - im.width) // 2
        y = (i // cols) * cell + cell - pad - im.height
        sheet.paste(im, (x, y), im)
    sheet.save(path)


def main() -> None:
    props: dict[str, Image.Image] = {}
    for filename, names in SHEETS.items():
        props.update(cut_sheet(SRC / filename, names))

    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, im in props.items():
        target = OUT / f"{name}.webp"
        im.save(target, "WEBP", quality=WEBP_QUALITY, alpha_quality=100, method=6, exact=False)
        size = target.stat().st_size
        total += size
        print(f'{name:18s} {im.width:4d} x {im.height:4d}  {size / 1024:6.1f} KB')
    print(f"{len(props)} props, {total / 1024:.0f} KB in {OUT.relative_to(ROOT)}")

    if "--check" in sys.argv:
        folder = Path(sys.argv[sys.argv.index("--check") + 1])
        folder.mkdir(parents=True, exist_ok=True)
        check_sheet(props, (34, 34, 40), folder / "check-dark.png")
        check_sheet(props, (207, 225, 242), folder / "check-snow.png")
        for name, im in props.items():
            im.save(folder / f"{name}.png")
        print(f"check sheets in {folder}")


if __name__ == "__main__":
    main()
