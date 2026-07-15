"""
Generate app icons for Trust It — dark stylized "T" logo.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT_DIR = '/home/z/my-project/public/icons'
os.makedirs(OUT_DIR, exist_ok=True)

SIZES = [192, 256, 384, 512, 180, 167, 152, 120, 76, 60, 32, 16]

def make_icon(size):
    """Dark background with a stylized white T."""
    img = Image.new('RGB', (size, size), color='#0a0a0a')
    d = ImageDraw.Draw(img, 'RGBA')
    
    # Add subtle gradient overlay
    for y in range(size):
        alpha = int(40 * (y / size))
        d.line([(0, y), (size, y)], fill=(40, 40, 50, alpha))
    
    cx, cy = size / 2, size / 2
    
    # Draw a stylized "T" — thick top bar + tapered stem
    t_height = int(size * 0.55)
    t_width = int(size * 0.50)
    stem_width = int(size * 0.14)
    
    # Top bar of T (horizontal)
    top_bar_height = int(size * 0.12)
    top_y = int(cy - t_height / 2)
    d.rounded_rectangle(
        [cx - t_width / 2, top_y, cx + t_width / 2, top_y + top_bar_height],
        radius=int(size * 0.02),
        fill=(240, 240, 245, 255)
    )
    
    # Stem of T (vertical) — slightly tapered
    stem_top = top_y + top_bar_height
    stem_bottom = int(cy + t_height / 2)
    # Tapered stem: wider at top, narrower at bottom
    stem_top_half = stem_width / 2
    stem_bottom_half = stem_width * 0.35
    d.polygon([
        (cx - stem_top_half, stem_top),
        (cx + stem_top_half, stem_top),
        (cx + stem_bottom_half, stem_bottom),
        (cx - stem_bottom_half, stem_bottom),
    ], fill=(240, 240, 245, 255))
    
    # Add a subtle glow
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    glow_d = ImageDraw.Draw(glow)
    glow_d.rounded_rectangle(
        [cx - t_width / 2 - 2, top_y - 2, cx + t_width / 2 + 2, top_y + top_bar_height + 2],
        radius=int(size * 0.03),
        fill=(100, 100, 255, 30)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=size // 30))
    img.paste(glow, (0, 0), glow)
    
    return img

def main():
    for size in SIZES:
        img = make_icon(size)
        out_path = os.path.join(OUT_DIR, f'icon-{size}x{size}.png')
        img.save(out_path, 'PNG', optimize=True)
        print(f'Wrote {out_path}')

    # Maskable icons
    for size in [192, 512]:
        img = make_icon(size)
        out_path = os.path.join(OUT_DIR, f'maskable-{size}x{size}.png')
        img.save(out_path, 'PNG', optimize=True)
        print(f'Wrote {out_path}')

    # Apple touch icon
    img = make_icon(180)
    img.save(os.path.join(OUT_DIR, 'apple-touch-icon.png'), 'PNG', optimize=True)
    print('Wrote apple-touch-icon.png')

    # Favicon
    img = make_icon(32)
    img.save('/home/z/my-project/public/favicon-32.png', 'PNG', optimize=True)
    img.save('/home/z/my-project/public/favicon.ico', format='ICO', sizes=[(32, 32), (16, 16)])
    print('Wrote favicon')

if __name__ == '__main__':
    main()
