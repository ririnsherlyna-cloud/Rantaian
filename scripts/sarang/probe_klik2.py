#!/usr/bin/env python3
# PROBE 2: replikasi urutan persis test A->B->C dan pantau catat() + jarak klik
import threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

DL = Path('/home/z/my-project/download')
PORT = 8821
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DL))
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1360, 'height': 860})
    pg.on('pageerror', lambda e: print('PAGEERROR:', e))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pg.wait_for_timeout(14000)  # mirip test: A-section memakan ~14 detik
    # pantau catat
    pg.evaluate('''() => { window.__catat = []; const asli = catat;
        catat = function(j, i) { window.__catat.push(j); asli(j, i); }; }''')
    # B: klik cyborg dgn pemetaan LAMA (seperti test)
    tb = pg.evaluate('() => ({x: tubuh.x, y: tubuh.y})')
    pg.evaluate('''() => { const c=document.getElementById('panggung');
        c.dispatchEvent(new MouseEvent('click', {clientX: c.getBoundingClientRect().left + tubuh.x/1280*c.getBoundingClientRect().width,
            clientY: c.getBoundingClientRect().top + (tubuh.y-52)/720*c.getBoundingClientRect().height, bubbles: true})); }''')
    pg.wait_for_timeout(1200)
    print('setelah B, catat:', pg.evaluate('() => window.__catat'), '| pos:', pg.evaluate('() => ({x: Math.round(tubuh.x), y: tubuh.y, st: tubuh.state, tg: tubuh.tugas && tubuh.tugas.st})'))
    # C: dispatch persis seperti test
    pg.evaluate('''() => { const c = document.getElementById('panggung'), s = ST.SEKOLAH, r = c.getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX = (r.width-1280*skala)/2, offY = (r.height-648*skala)/2;
        window.__kirim = {cx: r.left + offX + s.x*skala, cy: r.top + offY + (s.y-44)*skala};
        c.dispatchEvent(new MouseEvent('click', {clientX: window.__kirim.cx, clientY: window.__kirim.cy, bubbles: true})); }''')
    pg.wait_for_timeout(600)
    diag = pg.evaluate('''() => {
        const kirim = window.__kirim, r = document.getElementById('panggung').getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX=(r.width-1280*skala)/2, offY=(r.height-648*skala)/2;
        const vx = (kirim.cx - r.left - offX)/skala, vy = (kirim.cy - r.top - offY)/skala;
        return { catat: window.__catat, virtual: {x: vx, y: vy}, cyborg: {x: Math.round(tubuh.x), y: tubuh.y, st: tubuh.state, tg: tubuh.tugas && tubuh.tugas.st},
                 dSapa: Math.hypot(vx - tubuh.x, vy - (tubuh.y - 52)),
                 dSekolah: Math.hypot(vx - ST.SEKOLAH.x, vy - (ST.SEKOLAH.y - 44)) };
    }''')
    print('setelah C:', diag)
    br.close()
httpd.shutdown()
