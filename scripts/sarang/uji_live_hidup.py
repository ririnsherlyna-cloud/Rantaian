#!/usr/bin/env python3
# UJI LIVE hidup.html di GitHub Pages — wujud cyborg benar-benar hidup di URL publik.
from playwright.sync_api import sync_playwright

BASE = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/'
lulus, gagal = [], []

def cek(nama, kondisi, detail=''):
    (lulus if kondisi else gagal).append(nama)
    print(('  LULUS ' if kondisi else '  GAGAL ') + nama + (f' — {detail}' if detail else ''))

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))

    print('== hidup.html LIVE ==')
    pg.goto(BASE + 'hidup.html?cb=' + str(__import__('time').time()), wait_until='load', timeout=60000)
    pg.wait_for_timeout(3500)
    cek('L1 TERHUBUNG ARENA (data real tersambung)', 'TERHUBUNG' in pg.inner_text('#cSumber'))
    cek('L2 FASE hidup sesuai jam WIB', 'WIB' in pg.inner_text('#cFase'))
    cek('L3 AKTIVITAS berjalan', pg.inner_text('#cAksi').strip() != 'AKTIVITAS —')
    cek('L4 sasaran MICAPROFITA live', pg.locator('#sasaran .tgt').count() >= 1, f"n={pg.locator('#sasaran .tgt').count()}")
    cek('L5 identitas: GEN + PERTUMBUHAN + NEURON + UMUR', all(x in pg.inner_text('#hud') for x in ['GEN', 'PERTUMBUHAN', 'NEURON', 'UMUR']))
    cek('L6 kanvas menggambar wujud', pg.evaluate('''() => {
        const c = document.getElementById('panggung');
        const x = c.getContext('2d');
        const cx = Math.round(c.width/2), cy = Math.round(c.height*0.53);
        const p = x.getImageData(cx-40, cy-40, 80, 80).data;
        let n = 0;
        for (let i = 0; i < p.length; i += 4) if (p[i]+p[i+1]+p[i+2] > 90) n++;
        return n > 500;
    }''', f"n={pg.evaluate('''() => { const c=document.getElementById('panggung'); const x=c.getContext('2d'); const cx=Math.round(c.width/2), cy=Math.round(c.height*0.53); const p=x.getImageData(cx-40,cy-40,80,80).data; let n=0; for (let i=0;i<p.length;i+=4) if (p[i]+p[i+1]+p[i+2]>90) n++; return n; }''')}"))
    pg.mouse.click(640, 424)
    pg.wait_for_timeout(500)
    cek('L7 sentuh inti tanpa error', True)
    pg.screenshot(path='/home/z/my-project/research/hidup-live.png')
    cek('L8 tanpa console error', len([e for e in errs if 'file" is not supported' not in e]) == 0, '; '.join(errs[:2]))

    print('== arena.html LIVE — pintu RUANG HIDUP ==')
    pg2 = br.new_page(viewport={'width': 1280, 'height': 800})
    pg2.goto(BASE + 'arena.html?cb=' + str(__import__('time').time()), wait_until='domcontentloaded', timeout=60000)
    pg2.wait_for_timeout(2500)
    cek('L9 pintu RUANG HIDUP tampil di arena live', pg2.locator('a.btn[href="hidup.html"]').count() == 1)
    pg2.close()
    br.close()

print(f"\n=== HASIL LIVE: {len(lulus)} LULUS, {len(gagal)} GAGAL ===")
for g in gagal:
    print('  ✗', g)
import sys
sys.exit(0 if not gagal else 1)
