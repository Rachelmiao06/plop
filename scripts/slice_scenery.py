#!/usr/bin/env python3
"""Cut scenery sticker sheets into single transparent props.

Every sheet is a grid of separate drawings on white paper. The list of sheets,
their grid shape and the prop names live in art-source/scenery/sheets.json.

  Re-cut everything (run from the repo root):
      python3 scripts/slice_scenery.py
  Add or replace one sheet (it is also recorded in sheets.json, so a full run repeats it):
      python3 scripts/slice_scenery.py --sheet art-source/scenery/new.png --grid 2x2 --names tree,cottage,igloo,pine
  Also write contact sheets on dark and snow-blue backgrounds for checking by eye:
      ... --check <folder>

Writes
  public/assets/scenery/<name>.webp   transparent, trimmed, base on the bottom edge, long side <= 512 px
  src/features/scenery/sizes.json     pixel size of every file, read by content.ts (no code change needed)
  Sheets with "target": "effects" (sources in art-source/effects/) go to public/assets/effects/ and
  src/features/scenery/effect-sizes.json instead.
  WebPs in those folders that no sheet produces any more are deleted (listed in the output).
  "erase" boxes paint over drawn ground shadows before cutting (the turnaround sheets have them).

How the background is removed
  A colour key would eat the white snow, so only paper connected to the sheet's
  edge is removed: a flood fill from the border with a small tolerance.
  Thin or unclosed outlines would let that fill leak into white insides, so the
  ink lines are first thickened by `close_gap` pixels (closing any gap up to
  about twice that wide), the fill runs around the thickened lines, and then it
  grows back the same distance over paper only, so it reaches the real line again.
  See-through gaps fully fenced in by the drawing (between fence rails) are not
  reached by the fill; list a point inside each under "holes" in sheets.json.
  The last pixel or two beside the paper gets a soft alpha from how far its colour
  is from paper, and the paper colour is taken back out, so there is no white halo.

Needs Pillow, numpy and scipy (already on this machine; nothing goes in package.json).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "art-source" / "scenery" / "sheets.json"

# Where each kind of sheet comes from and goes to. A sheet's "target" picks one (default "scenery").
TARGETS = {
    "scenery": {  # standees, plus the character model and decals
        "src": ROOT / "art-source" / "scenery",
        "out": ROOT / "public" / "assets" / "scenery",
        "sizes": ROOT / "src" / "features" / "scenery" / "sizes.json",
    },
    "effects": {  # effect marks: surprise lines, stars, puffs, notes...
        "src": ROOT / "art-source" / "effects",
        "out": ROOT / "public" / "assets" / "effects",
        "sizes": ROOT / "src" / "features" / "scenery" / "effect-sizes.json",
    },
}

TOLERANCE = 12      # largest channel difference from paper that still counts as paper
INK = 40            # difference from paper that counts as a drawn line when closing gaps
CLOSE_GAP = 3       # default: outline gaps up to about twice this many pixels are closed
POCKET_MAX = 600    # default: cut-off paper pockets up to this many pixels that touch the outside are removed
EDGE_RING = 2      # pixels next to the removed paper that get a soft alpha
EDGE_FULL = 96      # colour difference at which an edge pixel is fully opaque
MIN_PIECE = 60      # default: loose specks smaller than this many pixels are dropped
MARGIN = 8          # clear pixels on the left, right and top (none at the bottom)
MAX_SIDE = 512      # long side limit; props are never enlarged
WEBP_QUALITY = 90

SQUARE = np.ones((3, 3), bool)


def disk(r: int) -> np.ndarray:
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


def parse_grid(text: str) -> tuple[int, int]:
    cols, rows = (int(v) for v in text.lower().split("x"))
    return cols, rows


def remove_background(rgb: np.ndarray, sheet: dict) -> tuple[np.ndarray, np.ndarray]:
    """Returns (alpha 0..1, colour with the paper taken out of soft edges)."""
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    paper = np.median(border, axis=0)
    dist = np.abs(rgb - paper).max(axis=2)
    paperlike = dist <= TOLERANCE

    # 1. Thicken the ink so small gaps in thin outlines are closed.
    gap = int(sheet.get("close_gap", CLOSE_GAP))
    walls = ndi.binary_dilation(dist > INK, structure=disk(gap)) if gap > 0 else dist > INK

    # 2. Flood the paper from the border, around the thickened lines.
    open_paper = paperlike & ~walls
    labels, _ = ndi.label(open_paper)
    edge_ids = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    outside = np.isin(labels, edge_ids[edge_ids > 0])

    # 3. Grow back up to the real line, over paper only, no farther than the thickening.
    for _ in range(gap + 1):
        outside = ndi.binary_dilation(outside, structure=SQUARE) & paperlike

    # 4. Narrow pockets of paper the thickened lines cut off from the outside (between
    #    scarf tassels, in sharp corners) are still background when they are small and
    #    touch it. A leak into a white inside through a gap would be large, so it stays.
    pocket_max = int(sheet.get("pocket_max", POCKET_MAX))
    left_over, n = ndi.label(paperlike & ~outside)
    if n:
        touching = np.unique(left_over[ndi.binary_dilation(outside, structure=SQUARE) & (left_over > 0)])
        areas = ndi.sum(np.ones_like(left_over), left_over, index=touching)
        small = touching[areas <= pocket_max]
        outside |= np.isin(left_over, small)

    # Hand-listed fenced-in see-through gaps.
    names = sheet["names"]
    all_paper, _ = ndi.label(paperlike)
    for name, points in sheet.get("holes", {}).items():
        if name not in names:
            raise SystemExit(f"{sheet['file']}: hole for unknown prop {name!r}")
        for x, y in points:
            lab = all_paper[y, x]
            if lab == 0:
                raise SystemExit(f"{name}: hole point ({x}, {y}) is not on paper")
            outside |= all_paper == lab
    yy, xx = np.mgrid[0:h, 0:w]
    for name, circles in sheet.get("keep", {}).items():
        for x, y, r in circles:
            outside &= (xx - x) ** 2 + (yy - y) ** 2 > r * r

    # Soft edge beside the removed paper.
    alpha = np.where(outside, 0.0, 1.0).astype(np.float32)
    ring = ndi.binary_dilation(outside, structure=SQUARE, iterations=EDGE_RING) & ~outside
    alpha[ring] = np.clip(dist[ring] / EDGE_FULL, 0.0, 1.0)

    a = np.clip(alpha, 1e-3, 1.0)[..., None]
    clean = np.clip((rgb - (1.0 - a) * paper) / a, 0, 255)
    clean[alpha == 0] = 0
    return alpha, clean


def erase_drawn_shadows(rgb: np.ndarray, sheet: dict) -> None:
    """Paint over drawn ground shadows (pale blue hatching under the feet) with the paper colour.

    sheets.json: "erase": [{"box": [x0, y0, x1, y1]}]. Only bluish, light pixels inside the box change,
    so the outline and white parts stay. The real 3D shadow replaces the drawn one.
    """
    if not sheet.get("erase"):
        return
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    paper = np.median(border, axis=0)
    for item in sheet["erase"]:
        x0, y0, x1, y1 = item["box"]
        region = rgb[y0:y1, x0:x1]
        lum = region.mean(axis=2)
        bluish = (region[..., 2] > region[..., 0] + 4) & (lum > 120)
        region[bluish] = paper


def cut_sheet(sheet: dict) -> dict[str, Image.Image]:
    path = TARGETS[sheet.get("target", "scenery")]["src"] / sheet["file"]
    if not path.exists():
        raise SystemExit(f"missing sheet: {path.relative_to(ROOT)}")
    cols, rows = parse_grid(sheet["grid"])
    names = sheet["names"]
    if len(names) > cols * rows:
        raise SystemExit(f"{sheet['file']}: {len(names)} names but only {cols * rows} cells")

    rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = rgb.shape
    erase_drawn_shadows(rgb, sheet)
    alpha, clean = remove_background(rgb, sheet)

    # Each solid piece belongs to the cell its centre falls in.
    solid = alpha > 0.5
    pieces, count = ndi.label(solid, structure=SQUARE)
    idx = np.arange(1, count + 1)
    sizes = ndi.sum(solid, pieces, index=idx)
    centres = ndi.center_of_mass(solid, pieces, index=idx)
    min_piece = int(sheet.get("min_piece", MIN_PIECE))
    owner = np.full(count + 1, -1)
    for i, (size, (cy, cx)) in enumerate(zip(sizes, centres), start=1):
        if size >= min_piece:
            owner[i] = min(int(cy // (h / rows)), rows - 1) * cols + min(int(cx // (w / cols)), cols - 1)
    cell_of = owner[pieces]

    out: dict[str, Image.Image] = {}
    for cell, name in enumerate(names):
        mine = cell_of == cell
        if not mine.any():
            raise SystemExit(f"{name}: nothing found in its cell of {sheet['file']}")
        keep = ndi.binary_dilation(mine, structure=SQUARE, iterations=EDGE_RING + 1)
        a_mine = np.where(keep, alpha, 0.0)
        ys, xs = np.nonzero(a_mine > 0.12)
        top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()

        rgba = np.dstack([clean, a_mine * 255.0]).round().astype(np.uint8)
        crop = Image.fromarray(rgba[top : bottom + 1, left : right + 1], "RGBA")
        canvas = Image.new("RGBA", (crop.width + 2 * MARGIN, crop.height + MARGIN), (0, 0, 0, 0))
        canvas.paste(crop, (MARGIN, MARGIN))

        if max(canvas.size) > MAX_SIDE:
            scale = MAX_SIDE / max(canvas.size)
            size = (round(canvas.width * scale), round(canvas.height * scale))
            # Premultiplied resize so no paper colour bleeds into the edge.
            canvas = canvas.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")
        out[name] = canvas
    return out


def check_sheet(props: dict[str, Image.Image], colour: tuple[int, int, int], path: Path) -> None:
    """Every prop on one flat colour, bases on a shared line per row."""
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
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--sheet", help="one sheet image to add or replace (recorded in sheets.json)")
    ap.add_argument("--grid", help="columns x rows, e.g. 2x2 (with --sheet)")
    ap.add_argument("--names", help="comma-separated prop names in reading order (with --sheet)")
    ap.add_argument("--target", choices=sorted(TARGETS), default="scenery", help="scenery (default) or effects (with --sheet)")
    ap.add_argument("--close-gap", type=int, help="outline gap closing in px for this sheet (with --sheet)")
    ap.add_argument("--check", metavar="FOLDER", help="write check images here")
    args = ap.parse_args()

    config = json.loads(CONFIG.read_text())
    if args.sheet:
        if not (args.grid and args.names):
            raise SystemExit("--sheet needs --grid and --names")
        src = Path(args.sheet).resolve()
        folder = TARGETS[args.target]["src"]
        if src.parent != folder:
            raise SystemExit(f"put the sheet in {folder.relative_to(ROOT)}/ first")
        entry = {"file": src.name, "grid": args.grid, "names": [n.strip() for n in args.names.split(",") if n.strip()]}
        if args.target != "scenery":
            entry["target"] = args.target
        if args.close_gap is not None:
            entry["close_gap"] = args.close_gap
        config["sheets"] = [s for s in config["sheets"] if s["file"] != src.name] + [entry]
        CONFIG.write_text(json.dumps(config, indent=2) + "\n")
        print(f"recorded {src.name} in {CONFIG.relative_to(ROOT)}")

    every: dict[str, Image.Image] = {}
    for target, where in TARGETS.items():
        props: dict[str, Image.Image] = {}
        for sheet in config["sheets"]:
            if sheet.get("target", "scenery") != target:
                continue
            for name, im in cut_sheet(sheet).items():
                if name in every:
                    raise SystemExit(f"name {name!r} is used twice")
                props[name] = every[name] = im

        out = where["out"]
        out.mkdir(parents=True, exist_ok=True)
        total = 0
        for name, im in props.items():
            path = out / f"{name}.webp"
            im.save(path, "WEBP", quality=WEBP_QUALITY, alpha_quality=100, method=6, exact=False)
            total += path.stat().st_size
            print(f"{name:18s} {im.width:4d} x {im.height:4d}  {path.stat().st_size / 1024:6.1f} KB")
        for old in sorted(out.glob("*.webp")):
            if old.stem not in props:
                old.unlink()
                print(f"deleted {old.relative_to(ROOT)} (no sheet makes it any more)")
        print(f"{len(props)} files, {total / 1024:.0f} KB in {out.relative_to(ROOT)}")

        sizes = {name: {"w": im.width, "h": im.height} for name, im in sorted(props.items())}
        where["sizes"].write_text(json.dumps(sizes, indent=2) + "\n")
        print(f"pixel sizes written to {where['sizes'].relative_to(ROOT)}\n")
    props = every

    if args.check:
        folder = Path(args.check)
        folder.mkdir(parents=True, exist_ok=True)
        check_sheet(props, (34, 34, 40), folder / "check-dark.png")
        check_sheet(props, (207, 225, 242), folder / "check-snow.png")
        for name, im in props.items():
            im.save(folder / f"{name}.png")
        print(f"check images in {folder}")


if __name__ == "__main__":
    main()
