#!/usr/bin/env python3
"""Name every DawnLike sprite: match DawnLikeAtlas/renamed/*.png (Tommy Ettinger's
names) pixel-for-pixel against the original DawnLike sheets and write
dawnlike_names.tsv: name, frame, sheet (relative to DawnLike/), col, row.
Use it to write tile maps by name instead of by guessing grid positions."""
import os, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
DL, RN = os.path.join(HERE, 'DawnLike'), os.path.join(HERE, 'DawnLikeAtlas', 'renamed')
key = lambda im: im.convert('RGBA').tobytes()
where = {}
for p in sorted(glob.glob(os.path.join(DL, '**', '*.png'), recursive=True)):
    rel = os.path.relpath(p, DL)
    if rel.startswith(('Examples', 'Commissions')): continue
    im = Image.open(p).convert('RGBA')
    for r in range(im.height // 16):
        for c in range(im.width // 16):
            t = im.crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
            if t.getextrema()[3][1]: where.setdefault(key(t), (rel, c, r))
out, miss = [], 0
for p in sorted(glob.glob(os.path.join(RN, '*.png'))):
    n = os.path.basename(p)[:-4]
    name, _, frame = n.rpartition('_')
    if not frame.isdigit(): name, frame = n, '0'
    im = Image.open(p)
    hit = where.get(key(im)) if im.size == (16, 16) else None
    if hit: out.append('%s\t%s\t%s\t%d\t%d' % (name, frame, *hit))
    else: miss += 1
open(os.path.join(HERE, 'dawnlike_names.tsv'), 'w').write('name\tframe\tsheet\tcol\trow\n' + '\n'.join(out) + '\n')
print(len(out), 'named,', miss, 'unmatched')
