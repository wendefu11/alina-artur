# Generate PWA icons (192, 512, maskable 512) — no external assets required.
# Aurora gradient circle with a stylized heart in the middle.

from PIL import Image, ImageDraw, ImageFilter
import os, math

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def aurora_bg(size, padding=0, bg_dark=(7, 8, 13)):
    """Create a circle with aurora gradient on a dark bg."""
    s = size
    img = Image.new("RGB", (s, s), bg_dark)
    px = img.load()
    pink = (255, 93, 143)
    viol = (167, 139, 250)
    cyan = (34, 211, 238)
    cx, cy, r = s / 2, s / 2, s / 2 - padding
    for y in range(s):
        for x in range(s):
            dx, dy = x - cx, y - cy
            d = math.sqrt(dx * dx + dy * dy)
            if d > r:
                continue
            t = (math.atan2(dy, dx) + math.pi) / (2 * math.pi)
            # blend two stops based on angle, modulate brightness by distance
            if t < 0.5:
                c = lerp(pink, viol, t * 2)
            else:
                c = lerp(viol, cyan, (t - 0.5) * 2)
            depth = 1 - (d / r) ** 1.5 * 0.35
            c = tuple(int(min(255, ch * depth)) for ch in c)
            px[x, y] = c
    return img


def draw_heart(size, color=(255, 255, 255, 235)):
    """Return an RGBA layer with a centered heart."""
    s = size
    layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # heart via two circles + triangle, scaled to fit
    scale = s * 0.45
    cx, cy = s / 2, s / 2 - scale * 0.12
    half = scale / 2
    # left & right humps
    d.ellipse([cx - scale * 0.55, cy - half, cx + scale * 0.05, cy + half * 0.6], fill=color)
    d.ellipse([cx - scale * 0.05, cy - half, cx + scale * 0.55, cy + half * 0.6], fill=color)
    # bottom point
    d.polygon([
        (cx - scale * 0.55, cy + half * 0.18),
        (cx + scale * 0.55, cy + half * 0.18),
        (cx, cy + scale * 0.78),
    ], fill=color)
    # soft glow
    blurred = layer.filter(ImageFilter.GaussianBlur(radius=s * 0.01))
    return blurred


def build(size, padding=0, mask=False):
    bg = aurora_bg(size, padding=padding).convert("RGBA")
    # crop to circle (alpha mask) unless mask=True (maskable icon → full square)
    if not mask:
        alpha = Image.new("L", (size, size), 0)
        ImageDraw.Draw(alpha).ellipse([padding, padding, size - padding, size - padding], fill=255)
        bg.putalpha(alpha)
    heart = draw_heart(size)
    bg.alpha_composite(heart)
    return bg


def main():
    for (name, size, pad, mask) in [
        ("icon-192.png", 192, 0, False),
        ("icon-512.png", 512, 0, False),
        ("icon-maskable.png", 512, int(512 * 0.10), True),
    ]:
        img = build(size, pad, mask)
        img.save(os.path.join(OUT_DIR, name), "PNG", optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main()
