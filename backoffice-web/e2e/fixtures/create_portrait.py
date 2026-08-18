from pathlib import Path
from PIL import Image, ImageDraw

output = Path(__file__).with_name('portrait-source.png')
image = Image.new('RGB', (1200, 1200), '#dbeafe')
draw = ImageDraw.Draw(image)
draw.ellipse((390, 210, 810, 630), fill='#2c4270')
draw.rounded_rectangle((250, 590, 950, 1120), radius=100, fill='#c9a84c')
image.save(output, 'PNG', optimize=True)
print(output)
