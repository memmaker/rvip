import struct, sys
from PIL import Image
d = open(sys.argv[1], 'rb').read()
h = struct.unpack('>25I', d[:100])
hsize, w, ht, border, bpl, ncol = h[0], h[4], h[5], h[7], h[12], h[19]
bpp, byte_order = h[11], h[7]
off = hsize + ncol * 12
order = 'BGRX' if h[7] == 0 else 'XRGB'
img = Image.frombuffer('RGBX', (w, ht), d[off:off + bpl * ht], 'raw', order, bpl, 1).convert('RGB')
img.save(sys.argv[2])
