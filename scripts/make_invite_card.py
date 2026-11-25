#!/usr/bin/env python3
"""
Makes the WeChat chat-card image for the invite page: Rachel's mouse-with-a-letter cut-out
(public/assets/scenery/mouse-letter.webp), centred on --paper, 600 x 600 JPEG.
WeChat (no Official Account) takes the first <img> in <body> of at least 300 x 300 for a link card.
No drawing: the art is used as it is. Run from the repo root: python3 scripts/make_invite_card.py
"""
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/assets/scenery/mouse-letter.webp"
OUT = ROOT / "public/assets/invite/invite-square.jpg"
SIZE = 600
ART_SHARE = 0.78  # the cut-out's long side as a share of the card

# --paper from src/app/globals.css, read so the card never drifts from the token.
css = (ROOT / "src/app/globals.css").read_text()
paper = re.search(r"--paper:\s*#([0-9a-fA-F]{6})", css).group(1)
bg = tuple(int(paper[i : i + 2], 16) for i in (0, 2, 4))

art = Image.open(SRC).convert("RGBA")
scale = SIZE * ART_SHARE / max(art.size)
art = art.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)
card = Image.new("RGBA", (SIZE, SIZE), bg + (255,))
card.alpha_composite(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
OUT.parent.mkdir(parents=True, exist_ok=True)
card.convert("RGB").save(OUT, "JPEG", quality=86, optimize=True, progressive=True)
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
