"""Contact sheet: two frames per script line (30 % and 75 % of the line) to check every named action is on screen.
Usage: python scripts/line_sheet.py videos/<slug> out/<slug>/final.mp4 out/<slug>/lines.png"""
import json, subprocess, sys, os
from PIL import Image, ImageDraw
d, video, out = sys.argv[1], sys.argv[2], sys.argv[3]
sj = json.load(open(d + '/script.json', encoding='utf8'))
words = json.load(open(d + '/voice/words.json', encoding='utf8'))
tmp = os.path.dirname(out)
i, tiles = 0, []
for n, ln in enumerate(sj['lines'], 1):
    k = len([t for t in ln['narration'].split() if any(c.isalnum() for c in t)])
    a, b = words[i]['start'], words[i + k - 1]['end']
    i += k
    for q in (0.3, 0.75):
        t = a + q * (b - a)
        p = f'{tmp}/_l{n}_{q}.png'
        subprocess.run(['npx', 'remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{t:.3f}', '-i', video, '-vf', 'scale=216:-1', '-frames:v', '1', p], shell=True, check=True, capture_output=True)
        im = Image.open(p).convert('RGB')
        ImageDraw.Draw(im).text((6, 6), f'{n}', fill=(255, 255, 0))
        tiles.append(im)
w, h = tiles[0].size
cols = 12
sheet = Image.new('RGB', (w * cols, h * ((len(tiles) + cols - 1) // cols)))
for j, im in enumerate(tiles):
    sheet.paste(im, ((j % cols) * w, (j // cols) * h))
sheet.save(out)
print(sheet.size)
