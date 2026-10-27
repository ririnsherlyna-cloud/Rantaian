#!/usr/bin/env python3
# PROBE: kenapa klik stasiun tidak memicu PERINTAH?
import threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

DL = Path('/home/z/my-project/download')
PORT = 8819
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DL))
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1360, 'height': 860})
    pg.on('pageerror', lambda e: print('PAGEERROR:', e))
    pg.on('console', lambda m: print('CONSOLE', m.type, ':', m.text) if m.type == 'error' else None)
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pg.wait_for_timeout(2200)
    info = pg.evaluate('''() => {
        const c = document.getElementById('panggung'), r = c.getBoundingClientRect();
        const s = ST.SEKOLAH;
        const skala = Math.min(r.width/1280, r.height/648), offX=(r.width-1280*skala)/2, offY=(r.height-648*skala)/2;
        return { rect: {l:r.left,t:r.top,w:r.width,h:r.height}, skala, offX, offY,
                 st: {x:s.x, y:s.y}, cyborg: {x:tubuh.x, y:tubuh.y, state:tubuh.state},
                 antre: ANTRE.map(t=>t.st), klik: {cx: r.left+offX+s.x*skala, cy: r.top+offY+(s.y-44)*skala} };
    }''')
    print('INFO:', info)
    # sisipkan detektor pada listener klik dengan re-dispatch terpantau
    pg.evaluate('''() => { window.__klik = []; document.getElementById('panggung')
        .addEventListener('click', e => window.__klik.push({x:e.clientX, y:e.clientY})); }''')
    pg.evaluate('''() => { const c=document.getElementById('panggung'), s=ST.SEKOLAH, r=c.getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX=(r.width-1280*skala)/2, offY=(r.height-648*skala)/2;
        c.dispatchEvent(new MouseEvent('click', {clientX: r.left+offX+s.x*skala, clientY: r.top+offY+(s.y-44)*skala, bubbles: true})); }''')
    pg.wait_for_timeout(500)
    hasil = pg.evaluate('''() => ({ klik: window.__klik, log: [...document.querySelectorAll('#log li')].slice(0,3).map(li=>li.textContent.slice(0,60)),
        tugas: tubuh.tugas ? tubuh.tugas.st : null, state: tubuh.state })''')
    print('HASIL:', hasil)
    br.close()
httpd.shutdown()
