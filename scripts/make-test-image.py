from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (400, 300), color='#fde68a')
d = ImageDraw.Draw(img)
d.rectangle([50, 50, 350, 250], fill='#fca5a5', outline='#7c2d12', width=4)
d.ellipse([150, 100, 250, 200], fill='#7c2d12')
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
except:
    font = ImageFont.load_default()
d.text((100, 20), "Test Image", fill='#7c2d12', font=font)
img.save('/home/z/my-project/download/test-image.png')
print('Saved')
