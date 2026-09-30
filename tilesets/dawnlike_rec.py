#!/usr/bin/env python3
"""DawnLike for the remapper (~/Projects/remapper), shared by the games' mkdawn.py:

  stack(out_dir, ...)  dawnlike-0.png / dawnlike-1.png (second animation frame):
                       every DawnLike sheet stacked, 16x16 cells, as wide as the
                       widest; below them "a+b" composites (b drawn over a). Cells
                       left empty keep what the old file had there (tiles the
                       remapper composed).
                       Returns cell(name) -> cell index.
  write_rec(path, ...) the game's runtime rec: a Tileset record and one section
                       per category; icons already in the file are kept.
Format: ~/Projects/c-rec/README.md."""
import os
from PIL import Image
from dawnlike_preview import pos as POS

HERE = os.path.dirname(os.path.abspath(__file__))


def stack(out_dir, extra_pos=None, composites=()):
    pos = dict(POS)
    pos.update(extra_pos or {})
    sheets = sorted({s for s, _, _ in pos.values()})
    img0 = {sh: Image.open(os.path.join(HERE, 'DawnLike', sh)).convert('RGBA') for sh in sheets}
    cols = max(im.width for im in img0.values()) // 16
    row, rows = {}, 0
    for sh in sheets:
        row[sh] = rows
        rows += (img0[sh].height + 15) // 16
    comp_cell = {c: rows * cols + i for i, c in enumerate(dict.fromkeys(composites))}
    rows += (len(comp_cell) + cols - 1) // cols

    def cell(name):
        if name in comp_cell:
            return comp_cell[name]
        sh, c, r = pos[name]
        return (row[sh] + r) * cols + c

    for fr in (0, 1):
        def sheet(sh):
            f1 = os.path.join(HERE, 'DawnLike', sh[:-5] + '1.png')
            return Image.open(f1).convert('RGBA') if fr and sh.endswith('0.png') and os.path.exists(f1) else img0[sh]
        img = Image.new('RGBA', (cols * 16, rows * 16), (0, 0, 0, 0))
        frames = {sh: sheet(sh) for sh in sheets}
        for sh in sheets:
            img.paste(frames[sh], (0, row[sh] * 16))
        for c, i in comp_cell.items():
            for part in c.split('+'):
                sh, x, y = pos[part]
                img.alpha_composite(frames[sh].crop((x * 16, y * 16, x * 16 + 16, y * 16 + 16)), (i % cols * 16, i // cols * 16))
        out = os.path.join(out_dir, 'dawnlike-%d.png' % fr)
        if os.path.exists(out):   # tiles the remapper composed (shift+click) in cells left empty here: kept
            old = Image.open(out).convert('RGBA')
            if old.height > img.height:
                grown = Image.new('RGBA', (img.width, old.height), (0, 0, 0, 0))
                grown.paste(img, (0, 0))
                img = grown
            alpha, old_alpha = img.getchannel('A'), old.getchannel('A')
            for y in range(0, min(old.height, img.height), 16):
                for x in range(0, min(old.width, img.width), 16):
                    box = (x, y, x + 16, y + 16)
                    if alpha.crop(box).getbbox() is None and old_alpha.crop(box).getbbox():
                        img.paste(old.crop(box), (x, y))
        img.save(out)
    return cell


def write_rec(path, header, tileset, categories, ents):
    """header: comment lines; tileset: [(field, value)]; categories: {category: display name};
    ents: [(category, id, display name, default cell)]; an icon the file already has for (category, id) wins"""
    old, typ, rid = {}, None, None
    if os.path.exists(path):
        for line in open(path).read().splitlines():
            if line.startswith('%rec:'):
                typ = line[5:].strip()
            elif line.startswith('id:'):
                rid = line[3:].strip()
            elif line.startswith('icon:'):
                old[typ, rid] = line[5:].strip()
    out = ['# ' + h for h in header] + ['', '%rec: Tileset'] + ['%s: %s' % f for f in tileset] + ['']
    for cat, doc in categories.items():
        out += ['%rec: ' + cat, '%doc: ' + doc, '']
        for c, i, name, icon in ents:
            if c == cat:
                out += ['id: ' + i, 'name: ' + name, 'icon: ' + old.get((c, i), str(icon)), '']
    open(path, 'w').write('\n'.join(out))
    return sum((e[0], e[1]) in old for e in ents)


def read_ids(path):
    """{category: [(id, display name)]} of a runtime rec (Tileset left out)"""
    out, typ, rid = {}, None, None
    for line in open(path).read().splitlines():
        if line.startswith('%rec:'):
            typ = line[5:].strip()
        elif line.startswith('id:') and typ != 'Tileset':
            rid = line[3:].strip()
        elif line.startswith('name:') and typ != 'Tileset' and rid:
            out.setdefault(typ, []).append((rid, line[5:].strip()))
            rid = None
    return out


def scene_lines(sid, name, categories, under, cells, mnemonic=None):
    """A "%rec: Scene" record (remapper preview): cells are rows of "category/id" or None; each id gets one
    legend character, mnemonic ones first ({"world/door": "+"}), a space is an empty cell"""
    mnemonic = mnemonic or {}
    keys = sorted({c for row in cells for c in row if c})
    pool = iter(c for c in [chr(i) for i in range(33, 127)] + [chr(i) for i in range(0xc0, 0x2af)]
                if c not in mnemonic.values() and c != '\\')   # rec joins a line ending in a backslash to the next
    ch = {k: mnemonic.get(k) or next(pool) for k in keys}
    out = ['id: ' + sid, 'name: ' + name, 'category: ' + ' '.join(categories), 'under: ' + under]
    out += ['legend: %s %s' % (ch[k], k) for k in keys]
    out += ['map:'] + ['+ ' + ''.join(ch[c] if c else ' ' for c in row).rstrip() for row in cells]
    return out
