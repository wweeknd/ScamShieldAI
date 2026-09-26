"""
One-off asset generator for ScamShield AI social/share images.
Run:  python scripts/gen_og.py
Outputs PNGs into ../public (og-image.png, apple-touch-icon.png).
Kept out of the JS build so scrapers get real raster images (SVG og:image
is not reliably supported by Twitter/Facebook/LinkedIn).
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(HERE, "..", "public"))
os.makedirs(PUBLIC, exist_ok=True)

INK = (5, 7, 15)
INK2 = (10, 18, 32)
CYAN = (34, 211, 238)
VIOLET = (139, 92, 246)
WHITE = (241, 245, 249)
SLATE = (148, 163, 184)

FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_REG = "C:/Windows/Fonts/arial.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def vgradient(w, h, top, bottom):
    base = Image.new("RGB", (w, h), top)
    top_r, top_g, top_b = top
    bot_r, bot_g, bot_b = bottom
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        r = int(top_r + (bot_r - top_r) * t)
        g = int(top_g + (bot_g - top_g) * t)
        b = int(top_b + (bot_b - top_b) * t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return base


def glow(size, center, radius, color, alpha):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = center
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=color + (alpha,))
    return layer.filter(ImageFilter.GaussianBlur(radius // 2))


def shield(draw, cx, cy, w, h, outline, fill=None, width=6):
    hw, hh = w / 2, h / 2
    pts = [
        (cx - hw, cy - hh),
        (cx + hw, cy - hh),
        (cx + hw, cy + hh * 0.12),
        (cx, cy + hh),
        (cx - hw, cy + hh * 0.12),
    ]
    if fill:
        draw.polygon(pts, fill=fill)
    draw.line(pts + [pts[0]], fill=outline, width=width, joint="curve")
    # check mark
    s = w * 0.16
    p1 = (cx - s * 1.4, cy - s * 0.1)
    p2 = (cx - s * 0.2, cy + s * 1.0)
    p3 = (cx + s * 1.5, cy - s * 1.2)
    draw.line([p1, p2, p3], fill=outline, width=width + 1, joint="curve")


def centered(draw, text, cx, y, fnt, fill):
    l, t, r, b = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (r - l) / 2, y), text, font=fnt, fill=fill)
    return b - t


def make_og():
    W, H = 1200, 630
    img = vgradient(W, H, INK, INK2).convert("RGBA")
    img.alpha_composite(glow((W, H), (240, 120), 420, CYAN, 46))
    img.alpha_composite(glow((W, H), (1000, 560), 420, VIOLET, 40))
    d = ImageDraw.Draw(img)

    # faint node network on the right
    import math
    nodes = [(920, 180), (1040, 240), (980, 340), (1080, 430), (900, 300), (1010, 130)]
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if math.dist(nodes[i], nodes[j]) < 160:
                d.line([nodes[i], nodes[j]], fill=(56, 80, 122, 90), width=2)
    for (x, y) in nodes:
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=CYAN + (150,))

    # shield icon
    shield(d, 600, 172, 128, 150, CYAN, fill=(34, 211, 238, 28), width=8)

    # wordmark
    f_title = font(FONT_BOLD, 92)
    title = "ScamShield AI"
    l, t, r, b = d.textbbox((0, 0), title, font=f_title)
    tw = r - l
    x0 = 600 - tw / 2
    # draw "ScamShield " white + "AI" cyan
    part1 = "ScamShield "
    pl, pt, pr, pb = d.textbbox((0, 0), part1, font=f_title)
    d.text((x0, 300), part1, font=f_title, fill=WHITE)
    d.text((x0 + (pr - pl), 300), "AI", font=f_title, fill=CYAN)

    centered(d, "Multi-Channel Scam Detection & Correlation",
             600, 420, font(FONT_REG, 36), SLATE)
    centered(d, "SMS  •  Email  •  URL  •  QR  •  Job Offers",
             600, 500, font(FONT_BOLD, 26), CYAN)

    img.convert("RGB").save(os.path.join(PUBLIC, "og-image.png"), "PNG")
    print("wrote og-image.png (1200x630)")


def make_touch_icon():
    S = 180
    img = vgradient(S, S, (8, 12, 22), (12, 20, 36)).convert("RGBA")
    img.alpha_composite(glow((S, S), (60, 50), 130, CYAN, 60))
    d = ImageDraw.Draw(img)
    shield(d, 90, 86, 96, 112, CYAN, fill=(34, 211, 238, 30), width=8)
    img.convert("RGB").save(os.path.join(PUBLIC, "apple-touch-icon.png"), "PNG")
    print("wrote apple-touch-icon.png (180x180)")


if __name__ == "__main__":
    make_og()
    make_touch_icon()
