#!/usr/bin/env python3
"""Contact sheet of DawnLike sprites by name (dawnlike_names.tsv), 4x, labelled.
Usage: dawnlike_preview.py out.png name1 name2 ...   (frame 0)"""
import os, sys
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
pos = {}
for l in open(os.path.join(HERE, 'dawnlike_names.tsv')).read().split('\n')[1:]:
    f = l.split('\t')
    if len(f) == 5 and f[1] == '0': pos.setdefault(f[0], (f[2], int(f[3]), int(f[4])))
def sprite(name):
    sheet, c, r = pos[name]
    return Image.open(os.path.join(HERE, 'DawnLike', sheet)).convert('RGBA').crop((c*16, r*16, c*16+16, r*16+16))
if __name__ == '__main__':
    names, cols, W, H = sys.argv[2:], 8, 120, 84
    out = Image.new('RGB', (cols * W, (len(names) + cols - 1) // cols * H), (40, 40, 40))
    d = ImageDraw.Draw(out)
    for i, n in enumerate(names):
        x, y = i % cols * W, i // cols * H
        if n in pos: out.paste(sprite(n).resize((64, 64), Image.NEAREST), (x + 28, y + 2), sprite(n).resize((64, 64), Image.NEAREST))
        d.text((x + 2, y + 68), n[:20], fill=(255, 255, 255) if n in pos else (255, 80, 80))
    out.save(sys.argv[1])
