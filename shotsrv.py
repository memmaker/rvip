#!/usr/bin/env python3
"""Screenshot rig for shrine pages (RVIP step 11).

  shotsrv.py ~/Games <out dir> [port=8765]

Serves a folder (run it on ~/Games; open /<game>/web/dist/) and saves PNGs
POSTed to /?n=<name>.png into <out dir>. In the page (browser pane,
javascript_tool): `await import('/rvip-tools/shot.js')` defines
window.shot(name, selector) and window.keys('x{Enter}{Escape}') (selector: windows to keep, e.g. '#t-map,#t-msg';
pop-up canvases outside the windows are always drawn).

then `await shot('fight.png')`, and crop with `magick in.png -crop WxH+X+Y +repage`.
"""
import http.server, sys, os, base64
OUT = os.path.abspath(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        name = os.path.basename(self.path.split('=')[-1])
        data = self.rfile.read(int(self.headers['Content-Length'])).split(b',')[-1]
        open(os.path.join(OUT, name), 'wb').write(base64.b64decode(data))
        self.send_response(204); self.end_headers()
os.chdir(sys.argv[1]); http.server.test(H, port=int(sys.argv[3]) if len(sys.argv) > 3 else 8765, bind='127.0.0.1')
