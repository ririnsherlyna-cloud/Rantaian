#!/usr/bin/env python3
# UJI LIVE hidup.html v2 di GitHub Pages — V281-SARANG-KERJA
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
galat, lulus = [], []

def cek(nama, kondisi, detail=''):
    (lulus if kondisi else galat).append(nama)
    print(('  LULUS ' if kondisi else '  GAGAL ') + nama + (f' — {detail}' if detail else ''))

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1360, 'height': 860})
    pg.on('console', lambda m: galat.append(f'console: {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: galat.append(f'pageerror: {e}'))
    pg.goto(URL, wait_until='load', timeout=60000)
    pg.wait_for_timeout(4000)
    cek('L1 chip TERHUBUNG ARENA live', 'TERHUBUNG' in pg.inner_text('#cSumber'), pg.inner_text('#cSumber'))
    cek('L2 fase WIB terisi', 'FASE —' not in pg.inner_text('#cFase'), pg.inner_text('#cFase'))
    x1 = pg.evaluate('() => tubuh.x')
    prg1 = pg.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    pg.wait_for_timeout(3000)
    x2 = pg.evaluate('() => tubuh.x')
    prg2 = pg.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    cek('L3 cyborg hidup (bergerak ATAU bekerja dgn progres naik)',
        abs(x2 - x1) > 3 or (0 <= prg1 < prg2), f'x {x1:.0f}→{x2:.0f} · progres {prg1:.2f}→{prg2:.2f}')
    cek('L3b jam WIB benar (UTC murni)', pg.evaluate('() => { const j = jamWIB(); const k = new Date(Date.now() + 7 * 3600000); return j.h === k.getUTCHours(); }'))
    cek('L4 stasiun dikenal', pg.evaluate('() => Object.keys(ST).length') == 8)
    cek('L5 sasaran hidup nyata', ('GTC' in pg.inner_text('#sasaranHidup')) or ('SAND' in pg.inner_text('#sasaranHidup')), pg.inner_text('#sasaranHidup').replace('\n', ' '))
    cek('L6 kapsul dari data arena', pg.evaluate('() => dunia.kapsul.length') >= 1, f"n={pg.evaluate('() => dunia.kapsul.length')}")
    pg.evaluate('''() => { const c=document.getElementById('panggung'), r=c.getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX=(r.width-1280*skala)/2, offY=(r.height-648*skala)/2;
        c.dispatchEvent(new MouseEvent('click', {clientX: r.left + offX + tubuh.x*skala,
            clientY: r.top + offY + (tubuh.y-52)*skala, bubbles: true})); }''')
    pg.wait_for_timeout(400)
    cek('L7 sentuh tubuh → menyapa', pg.evaluate('() => tubuh.bicaraT > 0'))
    nlog = pg.locator('#log li').count()
    cek('L8 log perkembangan tumbuh', nlog >= 3, f'n={nlog}')
    cek('L9 tanpa error console', not [g for g in galat if 'console' in g or 'pageerror' in g], str(galat[:2]))
    pg.screenshot(path='/home/z/my-project/research/hidup-v2-live.png')
    br.close()

print(f"\n=== LIVE: {len(lulus)} LULUS / {len(galat)} GAGAL ===")
[print(' -', g) for g in galat]
raise SystemExit(1 if galat else 0)
