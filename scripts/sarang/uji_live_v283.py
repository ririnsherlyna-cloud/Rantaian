#!/usr/bin/env python3
# UJI LIVE hidup.html V283 di GitHub Pages
import sys
from playwright.sync_api import sync_playwright

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
galat, lulus = [], []

def cek(nama, kondisi, detail=''):
    (lulus if kondisi else galat).append(nama)
    print(('  LULUS ' if kondisi else '  GAGAL ') + nama + (f' — {detail}' if detail else ''))

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pg.on('pageerror', lambda e: galat.append(f'pageerror: {str(e)[:150]}'))
    pg.on('console', lambda m: galat.append(f'console: {m.text[:150]}') if m.type == 'error' and 'favicon' not in m.text else None)
    pg.goto(URL, wait_until='load')
    pg.wait_for_timeout(4500)
    cek('L1 halaman hidup tanpa error', not galat, str(galat[:2]))
    cek('L2 kesadaran V283 berjalan', pg.evaluate("() => typeof K !== 'undefined' && K !== null && K.keputusan !== null"))
    cek('L3 tautan arena NYATA dari Pages', pg.evaluate("() => K.data && K.data.ok"), str(pg.evaluate("() => K.data && K.data.nPicks")))
    cek('L4 zona utuh di ponsel nyata', pg.evaluate("() => ZONA_DEF.every(d => { const z = D.zona[d.id]; return z.x >= -0.01 && z.y >= -0.01 && z.x + z.w <= W.worldW + 0.01 && z.y + z.h <= W.worldH + 0.01; })"))
    cek('L5 aktivitas berjalan', pg.evaluate("() => !!K.kegiatan"), str(pg.evaluate("() => K.kegiatan && K.kegiatan.a")))
    cek('L6 jurnal hidup', pg.evaluate("() => K.jurnal.length") >= 3, f"n={pg.evaluate('() => K.jurnal.length')}")
    pg.wait_for_timeout(3500)
    cek('L7 dunia terus bergerak', pg.evaluate("() => !!K.kegiatan || K.jurnal.length >= 3"))
    pg.screenshot(path='/home/z/my-project/research/hidup-v4-live.png')
    br.close()

print(f"\n=== LIVE: {len(lulus)} LULUS / {len(galat)} GAGAL ===")
if galat:
    print('GALAT:'); [print(' -', g) for g in galat]
sys.exit(1 if galat else 0)
