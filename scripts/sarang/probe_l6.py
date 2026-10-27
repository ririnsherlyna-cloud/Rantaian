#!/usr/bin/env python3
# PROBE L6 — bedah kenapa cek piksel live GAGAL padahal visual hidup:
# bandingkan sampling penuh vs patch pusat deterministik.
from playwright.sync_api import sync_playwright
import time

BASE = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pg.goto(BASE + '?cb=' + str(time.time()), wait_until='load', timeout=60000)
    pg.wait_for_timeout(3500)
    info = pg.evaluate('''() => {
        const c = document.getElementById('panggung');
        const x = c.getContext('2d');
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let terang = 0, n = 0;
        for (let i = 0; i < d.length; i += 4000) { n++; if (d[i] > 20 || d[i+1] > 20 || d[i+2] > 20) terang++; }
        // patch pusat 80x80 di sekitar inti (CX = w/2, CY = 0.53h)
        const cx = Math.round(c.width/2), cy = Math.round(c.height*0.53);
        const p = x.getImageData(cx-40, cy-40, 80, 80).data;
        let pusat = 0;
        for (let i = 0; i < p.length; i += 4) if (p[i]+p[i+1]+p[i+2] > 90) pusat++;
        return {w: c.width, h: c.height, sampel: n, terang, pusat,
                dpr: window.devicePixelRatio, hidden: document.hidden,
                fs: S.fase, act: S.act, motes: S.motes.length};
    }''')
    print('probe:', info)
    br.close()
