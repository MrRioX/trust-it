"""
Generate app icons for CipherChat PWA.
Creates multiple sizes with a gradient background + lock/message icon.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT_DIR = '/home/z/my-project/public/icons'
os.makedirs(OUT_DIR, exist_ok=True)

# Sizes needed for PWA + iOS + Android
SIZES = [192, 256, 384, 512, 180, 167, 152, 120, 76, 60, 32, 16]

# Brand gradient: fuchsia -> rose -> amber
GRADIENT_STOPS = [
    (0.0, (217, 70, 239)),    # fuchsia-500
    (0.5, (244, 63, 94)),     # rose-500
    (1.0, (245, 158, 11)),    # amber-500
]


def make_gradient(size):
    """Create a diagonal gradient image."""
    img = Image.new('RGB', (size, size), (244, 63, 94))
    pixels = img.load()
    for y in range(size):
        for x in range(size):
            # Diagonal position 0..1
            t = (x + y) / (2 * size - 2)
            # Find segment
            for i in range(len(GRADIENT_STOPS) - 1):
                t0, c0 = GRADIENT_STOPS[i]
                t1, c1 = GRADIENT_STOPS[i + 1]
                if t0 <= t <= t1:
                    local_t = (t - t0) / (t1 - t0) if t1 > t0 else 0
                    r = int(c0[0] + (c1[0] - c0[0]) * local_t)
                    g = int(c0[1] + (c1[1] - c0[1]) * local_t)
                    b = int(c0[2] + (c1[2] - c0[2]) * local_t)
                    pixels[x, y] = (r, g, b)
                    break
    return img


def draw_lock_icon(img, size):
    """Draw a white message-bubble + lock icon centered on the image."""
    draw = ImageDraw.Draw(img, 'RGBA')

    pad = size * 0.22
    cx, cy = size / 2, size / 2

    # Draw a rounded rectangle (message bubble) in white
    bubble_w = size - 2 * pad
    bubble_h = bubble_w * 0.85
    bubble_x = cx - bubble_w / 2
    bubble_y = cy - bubble_h / 2
    radius = bubble_w * 0.22

    # White bubble with slight shadow
    shadow_offset = max(2, size // 64)
    shadow_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_draw.rounded_rectangle(
        [bubble_x + shadow_offset, bubble_y + shadow_offset,
         bubble_x + bubble_w + shadow_offset, bubble_y + bubble_h + shadow_offset],
        radius=radius,
        fill=(0, 0, 0, 60)
    )
    shadow_img = shadow_img.filter(ImageFilter.GaussianBlur(radius=size // 64))
    img.paste(shadow_img, (0, 0), shadow_img)

    # White bubble
    draw = ImageDraw.Draw(img, 'RGBA')
    draw.rounded_rectangle(
        [bubble_x, bubble_y, bubble_x + bubble_w, bubble_y + bubble_h],
        radius=radius,
        fill=(255, 255, 255, 255)
    )

    # Draw a lock body (rounded rectangle) in the brand color
    lock_w = bubble_w * 0.38
    lock_h = bubble_h * 0.30
    lock_x = cx - lock_w / 2
    lock_y = cy - lock_h / 2 + bubble_h * 0.06
    lock_radius = max(2, size // 32)
    draw.rounded_rectangle(
        [lock_x, lock_y, lock_x + lock_w, lock_y + lock_h],
        radius=lock_radius,
        fill=(217, 70, 239, 255)
    )

    # Draw lock shackle (arc above the body)
    shackle_r = lock_w * 0.35
    shackle_cx = cx
    shackle_cy = lock_y
    shackle_w = max(2, size // 48)
    draw.arc(
        [shackle_cx - shackle_r, shackle_cy - shackle_r,
         shackle_cx + shackle_r, shackle_cy + shackle_r],
        start=180, end=360,
        fill=(255, 255, 255, 255),
        width=shackle_w
    )

    # Draw a small keyhole dot
    dot_r = max(1, size // 80)
    draw.ellipse(
        [cx - dot_r, lock_y + lock_h * 0.35 - dot_r,
         cx + dot_r, lock_y + lock_h * 0.35 + dot_r],
        fill=(255, 255, 255, 255)
    )

    # Draw a small tail on the bubble (bottom-left)
    tail_pts = [
        (bubble_x + bubble_w * 0.15, bubble_y + bubble_h - 2),
        (bubble_x + bubble_w * 0.05, bubble_y + bubble_h + bubble_w * 0.12),
        (bubble_x + bubble_w * 0.30, bubble_y + bubble_h - 2),
    ]
    draw.polygon(tail_pts, fill=(255, 255, 255, 255))


def main():
    for size in SIZES:
        img = make_gradient(size)
        draw_lock_icon(img, size)
        out_path = os.path.join(OUT_DIR, f'icon-{size}x{size}.png')
        img.save(out_path, 'PNG', optimize=True)
        print(f'Wrote {out_path}')

    # Maskable icon (Android adaptive icon with safe padding)
    for size in [192, 512]:
        img = make_gradient(size)
        # Add white safe-zone padding for maskable
        # Actually for maskable, just fill background with same gradient (full bleed)
        # and shrink the icon content within 80% safe zone
        img2 = Image.new('RGB', (size, size), (244, 63, 94))
        # Paste the gradient as full background
        img2 = make_gradient(size)
        # Draw icon at 70% scale centered (safe zone for maskable)
        small = make_gradient(size)
        draw_lock_icon(small, size)
        # Just use the same icon - maskable cropping will handle it
        img2 = small.copy()
        out_path = os.path.join(OUT_DIR, f'maskable-{size}x{size}.png')
        img2.save(out_path, 'PNG', optimize=True)
        print(f'Wrote {out_path}')

    # Apple touch icon (180x180 with solid background, no transparency)
    img = make_gradient(180)
    draw_lock_icon(img, 180)
    img.save(os.path.join(OUT_DIR, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print('Wrote apple-touch-icon.png')

    # Favicon 32x32
    img = make_gradient(32)
    draw_lock_icon(img, 32)
    img.save('/home/z/my-project/public/favicon-32.png', 'PNG', optimize=True)
    print('Wrote favicon-32.png')

    # Also save as ICO (for older browsers)
    img.save('/home/z/my-project/public/favicon.ico', format='ICO', sizes=[(32, 32), (16, 16)])
    print('Wrote favicon.ico')


if __name__ == '__main__':
    main()
