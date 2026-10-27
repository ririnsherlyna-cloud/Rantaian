#!/usr/bin/env python3
# UJI LIVE V288 di https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html
import sys, time
from playwright.sync_api import sync_playwright

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
P = {'pass': 0, 'fail': 0}
def cek(nama, ok, bukti=''):
    P['pass' if ok else 'fail'] += 1
    print(f"[{'LULUS' if ok else 'GAGAL'}] {nama} {('— '+str(bukti)) if bukti else ''}")

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = b.new_page(viewport={'width': 1440, 'height': 900})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(URL, wait_until='domcontentloaded')
    pg.wait_for_timeout(9000)   # boot + hidrasi GitHub + pindai

    cek('probe __v288', pg.evaluate('!!window.__v288'))
    H = pg.evaluate("window.__v288 ? __v288.S.habitat : null")
    cek('habitat.json LIVE terhidrasi dari GitHub', bool(H and H.get('versi') == 'habitat-v288'),
        H and f"versi={H['versi']} bangun={H.get('bangunTerakhir')}")
    if H:
        cek('tubuh dari genom Sadar-1 (bukan konstanta)', (H.get('tubuh') or {}).get('ruas', 0) >= 10,
            f"{(H.get('tubuh') or {}).get('ruas')} ruas / {(H.get('tubuh') or {}).get('mata')} mata · segel {(H.get('tubuh') or {}).get('segel')}")
        cek('vena dibangun ≥4', len(H.get('vena') or []) >= 4, f"vena={len(H.get('vena') or [])}")
        cek('altar evolusi ≥1 (kromosom nyata)', len(H.get('altar') or []) >= 1,
            ', '.join(f"G{a['gen']} {a.get('skorLama')}→{a.get('skorBaru')}" for a in (H.get('altar') or [])[:3]))
        cek('zona terbuka ≥5', sum(1 for z in H['zona'] if z['status'] == 'terbuka') >= 5)
    NS = pg.evaluate('__v288.NADI.NS')
    cek('NS tubuh = ruas genom', isinstance(NS, int) and NS >= 10, f'NS={NS}')
    cek('organ 6 terpasang', (pg.evaluate('(__v288.NADI.organ||[]).length') >= 6))
    pth = pg.evaluate("__v288.pathVena('otak','PASAR')")
    cek('pathVena jalan buatan', pth is not None and len(pth) >= 1, pth)
    # sadar1 hidup tanpa penonton: keadaan bangun terbaru
    k = pg.evaluate('__v288.S1.keadaan')
    cek('S1 keadaan v288 hidup', bool(k) and k.get('versi') == 'sadar1-v288', k and f"bangun={k.get('bangunKe')} versi={k.get('versi')}")
    # overlay panel tubuh
    pg.evaluate('__v288.bukaOverlay()')
    pg.wait_for_timeout(700)
    teks = pg.evaluate("document.getElementById('pkTubuh')?.textContent || ''")
    cek('overlay Tubuh & Habitat', 'ruas' in teks and 'vena' in teks, teks[:80].replace(chr(10), ' '))
    pg.screenshot(path='/home/z/my-project/research/v88-live-overlay.png')
    pg.evaluate('__v288.tutupOverlay()')
    pg.wait_for_timeout(500)
    pg.screenshot(path='/home/z/my-project/research/v88-live-panggung.png')
    # mobile
    pg2 = b.new_page(viewport={'width': 390, 'height': 844})
    err2 = []
    pg2.on('pageerror', lambda e: err2.append(str(e)))
    pg2.goto(URL, wait_until='domcontentloaded')
    pg2.wait_for_timeout(7000)
    ns2 = pg2.evaluate('__v288 ? __v288.NADI.NS : -1')
    cek('mobile: tubuh genom', isinstance(ns2, int) and ns2 >= 10, f'NS={ns2}')
    ov = pg2.evaluate("(() => { __v288.bukaOverlay(); return document.getElementById('overlay').classList.contains('buka'); })()")
    cek('mobile: overlay buka', ov)
    pg2.screenshot(path='/home/z/my-project/research/v88-live-mobile.png')
    cek('desktop: 0 pageerror', not err, err[:2])
    cek('mobile: 0 pageerror', not err2, err2[:2])
    b.close()
print(f"\\n=== LIVE: {P['pass']} LULUS / {P['fail']} GAGAL ===")
sys.exit(1 if P['fail'] else 0)
