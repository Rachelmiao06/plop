"""Slice the six snowman faces out of Rachel's expression sheet.

Reads  art-source/characters/expressions-sheet.png (3 x 2 grid of faces on white)
Writes public/assets/characters/face-<name>.png, 256 x 256, transparent,
and small JPEG copies of the three reference sheets for the /dev/characters page.

The strokes are exported in plain white with the ink darkness as alpha, so the
component tints them with a theme token (the face colour is never baked into a file).

Run from the repo root:  python3 scripts/characters-slice-faces.py
"""

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "art-source/characters/expressions-sheet.png"
OUT = ROOT / "public/assets/characters"

# Reading order on the sheet: top row left to right, then bottom row.
NAMES = ["calm", "happy", "surprised", "straining", "dizzy", "laugh"]
SIZE = 256  # exported texture size
CROP = 300  # square window cut from the sheet around each face (faces are ~200 px wide)
INK_THRESHOLD = 200  # anything darker than this counts as a stroke when finding a face


def face_centre(gray: Image.Image, box: tuple[int, int, int, int]) -> tuple[int, int]:
    """Centre of the bounding box of the ink inside one grid cell."""
    cell = gray.crop(box)
    mask = cell.point(lambda v: 255 if v < INK_THRESHOLD else 0)
    left, top, right, bottom = mask.getbbox()
    return box[0] + (left + right) // 2, box[1] + (top + bottom) // 2


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    gray = Image.open(SOURCE).convert("L")
    width, height = gray.size
    cols, rows = 3, 2
    for index, name in enumerate(NAMES):
        col, row = index % cols, index // cols
        cell = (
            col * width // cols,
            row * height // rows,
            (col + 1) * width // cols,
            (row + 1) * height // rows,
        )
        cx, cy = face_centre(gray, cell)
        half = CROP // 2
        crop = gray.crop((cx - half, cy - half, cx + half, cy + half))
        # Darkness becomes alpha; stretch so paper is fully clear and strokes fully solid.
        alpha = ImageOps.invert(crop).point(lambda v: 0 if v < 40 else min(255, int((v - 40) * 1.6)))
        alpha = alpha.resize((SIZE, SIZE), Image.LANCZOS)
        face = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
        face.putalpha(alpha)
        target = OUT / f"face-{name}.png"
        face.save(target, optimize=True)
        print(f"{target.relative_to(ROOT)}  centre=({cx},{cy})  {target.stat().st_size // 1024} KB")

    # Small copies of the reference sheets, shown beside the 3D snowmen for comparison.
    for name in ["bucket-four-views", "redhat-four-views", "expressions-sheet"]:
        sheet = Image.open(ROOT / f"art-source/characters/{name}.png").convert("RGB")
        sheet.thumbnail((900, 900), Image.LANCZOS)
        target = OUT / f"reference-{name}.jpg"
        sheet.save(target, quality=82, optimize=True)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
