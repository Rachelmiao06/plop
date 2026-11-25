"""Cut the snowman art Rachel drew into the small files the 3D characters use.

Writes to public/assets/characters/:
  face-<name>.png      six faces from art-source/characters/expressions-sheet.png (3 x 2 grid),
                       256 x 256, white strokes with ink darkness as alpha (tinted by a theme token)
  reference-*.jpg      small copies of the reference sheets for the /dev/characters page
  matcap-<part>.jpg    "drawn matcap" spheres for snow, mint, red and blue (see below), saved as
                       grey brightness only: the colour on screen always comes from the theme tokens

Matcaps come from one of two places:
  * default: clean crayon patches cut from the four-view sheets. The sheets have no whole,
    unobstructed sphere, so these are flat patches of her texture with no shading of their own.
  * --spheres <file>: a sheet of four hand-drawn spheres in a 2 x 2 grid. Each sphere is found,
    its outline ring is cut away, and the inside becomes the matcap. The sheet is copied into
    art-source/characters/matcap-spheres.png first, so the repo keeps the source.
    Grid order defaults to: top-left snow, top-right mint, bottom-left red, bottom-right blue.
    Change it with --order, for example --order snow,red,mint,blue.

Run from the repo root:
  python3 scripts/characters-slice-art.py
  python3 scripts/characters-slice-art.py --spheres "/Users/mac/Desktop/<sheet>.png"
"""

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "art-source/characters"
OUT = ROOT / "public/assets/characters"

FACE_NAMES = ["calm", "happy", "surprised", "straining", "dizzy", "laugh"]
FACE_SIZE = 256  # exported texture size
FACE_CROP = 300  # square window cut from the sheet around each face (faces are ~200 px wide)
INK_THRESHOLD = 200  # anything darker than this counts as a stroke when finding a face

MATCAP_PARTS = ["snow", "mint", "red", "blue"]
MATCAP_SIZE = 256
MATCAP_MID = 200  # average grey of a matcap; must match MATCAP_MID in materials.ts
# Clean crayon patches (left, top, right, bottom) in the four-view sheets.
MATCAP_PATCHES = {
    "snow": ("bucket-four-views.png", (200, 300, 260, 360)),  # bucket snowman's cheek
    "mint": ("bucket-four-views.png", (415, 378, 478, 418)),  # mint scarf band
    "red": ("redhat-four-views.png", (160, 555, 200, 600)),  # red scarf end
    "blue": ("bucket-four-views.png", (362, 158, 395, 192)),  # side of the bucket
}


def face_centre(gray: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int]:
    """Centre of the bounding box of the ink inside one grid cell."""
    cell = gray.crop(box)
    mask = cell.point(lambda v: 255 if v < INK_THRESHOLD else 0)
    left, top, right, bottom = mask.getbbox()
    return box[0] + (left + right) // 2, box[1] + (top + bottom) // 2


def slice_faces() -> None:
    gray = Image.open(ART / "expressions-sheet.png").convert("L")
    width, height = gray.size
    cols, rows = 3, 2
    for index, name in enumerate(FACE_NAMES):
        col, row = index % cols, index // cols
        cell = (col * width // cols, row * height // rows, (col + 1) * width // cols, (row + 1) * height // rows)
        cx, cy = face_centre(gray, cell)
        half = FACE_CROP // 2
        crop = gray.crop((cx - half, cy - half, cx + half, cy + half))
        # Darkness becomes alpha; stretch so paper is fully clear and strokes fully solid.
        alpha = ImageOps.invert(crop).point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 1.6)))
        alpha = alpha.resize((FACE_SIZE, FACE_SIZE), Image.LANCZOS)
        face = Image.new("RGBA", (FACE_SIZE, FACE_SIZE), (255, 255, 255, 0))
        face.putalpha(alpha)
        save(face, OUT / f"face-{name}.png")


def export_references() -> None:
    for name in ["bucket-four-views", "redhat-four-views", "expressions-sheet"]:
        sheet = Image.open(ART / f"{name}.png").convert("RGB")
        sheet.thumbnail((900, 900), Image.LANCZOS)
        save(sheet, OUT / f"reference-{name}.jpg", quality=82)


def clean_patch(patch: Image.Image) -> Image.Image:
    """Replace any stray outline pixels in a patch with the patch's middle colour."""
    gray = patch.convert("L")
    pixels = sorted((patch.getpixel((x, y)) for y in range(patch.height) for x in range(patch.width)), key=sum)
    middle = pixels[len(pixels) // 2]
    out = patch.copy()
    for y in range(patch.height):
        for x in range(patch.width):
            if gray.getpixel((x, y)) < 150:
                out.putpixel((x, y), middle)
    return out


def matcaps_from_patches() -> None:
    for part in MATCAP_PARTS:
        sheet_name, box = MATCAP_PATCHES[part]
        patch = clean_patch(Image.open(ART / sheet_name).convert("RGB").crop(box))
        # A plain enlargement: the crayon grain gets bigger but stays one continuous drawing.
        save(to_brightness(patch.resize((MATCAP_SIZE, MATCAP_SIZE), Image.BICUBIC)), OUT / f"matcap-{part}.jpg", quality=88)


def ring_width(gray: Image.Image, cx: int, cy: int, radius: int) -> int:
    """Walk in from the left edge of a sphere until the dark outline ends; that is the ring width."""
    seen_ink = False
    for step in range(radius):
        dark = gray.getpixel((cx - radius + step, cy)) < 140
        if dark:
            seen_ink = True
        elif seen_ink:
            return step
    return max(2, radius // 30)


def matcaps_from_spheres(sheet_path: Path, order: list[str]) -> None:
    target = ART / "matcap-spheres.png"
    if sheet_path.resolve() != target.resolve():
        shutil.copyfile(sheet_path, target)  # copy only, never move the original
    sheet = Image.open(target).convert("RGB")
    gray = sheet.convert("L")
    width, height = sheet.size
    for index, part in enumerate(order):
        col, row = index % 2, index // 2
        cell = (col * width // 2, row * height // 2, (col + 1) * width // 2, (row + 1) * height // 2)
        mask = gray.crop(cell).point(lambda v: 255 if v < 235 else 0)
        box = mask.getbbox()
        if not box:
            raise SystemExit(f"No sphere found in the {part} cell")
        left, top, right, bottom = (box[0] + cell[0], box[1] + cell[1], box[2] + cell[0], box[3] + cell[1])
        cx, cy = (left + right) // 2, (top + bottom) // 2
        radius = min(right - left, bottom - top) // 2
        inner = radius - int(ring_width(gray, cx, cy, radius) * 1.3)
        crop = sheet.crop((cx - inner, cy - inner, cx + inner, cy + inner))
        save(to_brightness(crop.resize((512, 512), Image.LANCZOS)), OUT / f"matcap-{part}.jpg", quality=88)


def to_brightness(image: Image.Image) -> Image.Image:
    """Keep only her strokes and shading: grey, normalised so the average is MATCAP_MID.
    The component multiplies this onto the exact token colour, so no art colour reaches the screen."""
    gray = image.convert("L")
    values = [gray.getpixel((x, y)) for y in range(gray.height) for x in range(gray.width)]
    mean = sum(values) / len(values)
    return gray.point(lambda v: max(0, min(255, round(v * MATCAP_MID / mean))))


def save(image: Image.Image, target: Path, quality: int | None = None) -> None:
    if quality is None:
        image.save(target, optimize=True)
    else:
        image.save(target, quality=quality, optimize=True)
    print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--spheres", type=Path, help="2 x 2 sheet of hand-drawn spheres to use as matcaps")
    parser.add_argument("--order", default=",".join(MATCAP_PARTS), help="parts in grid reading order")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    slice_faces()
    export_references()
    sphere_sheet = args.spheres or (ART / "matcap-spheres.png" if (ART / "matcap-spheres.png").exists() else None)
    if sphere_sheet:
        order = [p.strip() for p in args.order.split(",")]
        if sorted(order) != sorted(MATCAP_PARTS):
            raise SystemExit(f"--order must name each of {MATCAP_PARTS} once")
        matcaps_from_spheres(sphere_sheet, order)
    else:
        matcaps_from_patches()


if __name__ == "__main__":
    main()
