#!/usr/bin/env python3
"""
Makes the WeChat chat-card image for the invite page, matching the white opening page (Rachel, 2026-11-25):
the "Plop!" title with Rachel's little penguin sliding on its belly (public/assets/scenery/penguin-slide.webp)
on --snow-white, 600 x 600 JPEG.
WeChat (no Official Account) takes the first <img> in <body> of at least 300 x 300 for a link card.

No drawing: the penguin is used as it is, and the "Plop!" lettering is lifted from the existing share card
(public/share/plop-square.jpg, the Gaegu title in --ink on --paper): its paper is made clear, so only the brown
letters are placed on white. Run from the repo root: python3 scripts/make_invite_card.py
"""
import re
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
PENGUIN = ROOT / "public/assets/scenery/penguin-slide.webp"
TITLE_FROM = ROOT / "public/share/plop-square.jpg"
TITLE_BOX = (120, 40, 470, 185)  # where "Plop!" sits on that card (left, top, right, bottom)
OUT = ROOT / "public/assets/invite/invite-square.jpg"
SIZE = 600
TITLE_WIDTH = 400  # the lettering's width on the card
PENGUIN_WIDTH = 380  # the penguin's width on the card

css = (ROOT / "src/app/globals.css").read_text()


def token(name):
    hex_ = re.search(rf"--{name}:\s*#([0-9a-fA-F]{{6}})", css).group(1)
    return tuple(int(hex_[i : i + 2], 16) for i in (0, 2, 4))


white, paper, ink = token("snow-white"), token("paper"), token("ink")

# The title: alpha from how far each pixel is from the paper, colour = --ink. A small floor drops the card's faint
# paper grain and JPEG noise, so no box shows on white; the soft anti-aliased edges of the letters are kept.
title_src = Image.open(TITLE_FROM).convert("RGB").crop(TITLE_BOX)
diff = ImageChops.difference(title_src, Image.new("RGB", title_src.size, paper)).convert("L")
far = max(abs(p - i) for p, i in zip(paper, ink))
FLOOR = 0.3  # share of the paper-to-ink distance treated as plain paper
alpha = diff.point(lambda v: max(0, min(255, round(255 * (v / far - FLOOR) / (0.75 - FLOOR)))))
title = Image.new("RGBA", title_src.size, ink + (0,))
title.putalpha(alpha)
title = title.crop(title.getbbox())
title = title.resize((TITLE_WIDTH, round(title.height * TITLE_WIDTH / title.width)), Image.LANCZOS)

penguin = Image.open(PENGUIN).convert("RGBA")
penguin = penguin.resize((PENGUIN_WIDTH, round(penguin.height * PENGUIN_WIDTH / penguin.width)), Image.LANCZOS)

card = Image.new("RGBA", (SIZE, SIZE), white + (255,))
gap = 34
top = (SIZE - (title.height + gap + penguin.height)) // 2
card.alpha_composite(title, ((SIZE - title.width) // 2, top))
# The penguin slides in from the right, a little off-centre like on the opening page.
card.alpha_composite(penguin, ((SIZE - penguin.width) // 2 + 30, top + title.height + gap))
OUT.parent.mkdir(parents=True, exist_ok=True)
card.convert("RGB").save(OUT, "JPEG", quality=88, optimize=True, progressive=True)
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
