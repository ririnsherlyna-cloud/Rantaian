#!/usr/bin/env python3
# UJI BROWSER hidup.html — RUANG HIDUP (V280)
# Bagian A: HTTP lokal (fetch arena-keadaan.json OK) → TERHUBUNG ARENA, sasaran 2, tanpa error
# Bagian B: klik inti → menyapa tanpa error + screenshot
# Bagian C: file:// → fallback jujur HIDUP MANDIRI (tetap hidup, tak bisu)
# Bagian D: arena.html memuat tautan RUANG HIDUP → hidup.html
import sys, threading, http.server, functools, time
from pathlib import Path
from playwright.sync_api import sync_playwright

DL = Path('/home/z/my-project/download')
PORT = 8813
galat = []
lulus = []

def cek(nama, kondisi, detail=''):
    (lulus if kondisi else galat).append(nama)
    print(('  LULUS ' if kondisi else '  GAGAL ') + nama + (f' — {detail}' if detail else ''))

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DL))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def pantau(page, tag):
    # noise file:// yang ditangani try/catch (fallback HIDUP MANDIRI) bukan galat
    NOISE = ('URL scheme "file" is not supported',)
    def konsole(m):
        if m.type != 'error':
            return
        if any(x in m.text for x in NOISE):
            return
        galat.append(f'[{tag}] console: {m.text}')
    page.on('console', konsole)
    page.on('pageerror', lambda e: galat.append(f'[{tag}] pageerror: {e}'))

httpd = serve()
with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1280, 'height': 800})
    pantau(pg, 'A')

    # ---------- Bagian A: hidup dengan data arena ----------
    print('== A. hidup.html via HTTP (data arena terhubung) ==')
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pg.wait_for_timeout(2600)
    cek('A1 kanvas panggung ada & terukur', pg.evaluate("() => { const c=document.getElementById('panggung'); return !!c && c.width>300 && c.height>300; }"))
    cek('A2 chip TERHUBUNG ARENA', 'TERHUBUNG' in pg.inner_text('#cSumber'))
    cek('A3 FASE terisi', pg.inner_text('#cFase').strip() != 'FASE —')
    cek('A4 AKTIVITAS terisi', pg.inner_text('#cAksi').strip() != 'AKTIVITAS —')
    cek('A5 NADI berdetak', 'NADI' in pg.inner_text('#cNadi') and '--' not in pg.inner_text('#cNadi'))
    cek('A6 sasaran MICAPROFITA terlihat (2)', pg.locator('#sasaran .tgt').count() == 2, f"n={pg.locator('#sasaran .tgt').count()}")
    cek('A7 chip identitas terisi', 'GEN' in pg.inner_text('#cGen') and 'PERTUMBUHAN' in pg.inner_text('#cTier'))
    def pixPusat(page):
        return page.evaluate('''() => {
            const c = document.getElementById('panggung');
            const x = c.getContext('2d');
            const cx = Math.round(c.width/2), cy = Math.round(c.height*0.53);
            const p = x.getImageData(cx-40, cy-40, 80, 80).data;
            let n = 0;
            for (let i = 0; i < p.length; i += 4) if (p[i]+p[i+1]+p[i+2] > 90) n++;
            return n;
        }''')
    cek('A8 kanvas benar-benar menggambar (bukan hitam)', pixPusat(pg) > 500, f"n={pixPusat(pg)}")
    pg.screenshot(path='/home/z/my-project/research/hidup-lokal.png')

    # ---------- Bagian B: sentuh inti → menyapa ----------
    print('== B. sentuh inti — organisme menjawab ==')
    pg.mouse.click(640, 424)  # pusat organisme (CY = 0.53*800 = 424)
    pg.wait_for_timeout(600)
    cek('B1 tanpa error setelah sentuhan', True)
    cek('B2 masih menggambar setelah interaksi', pixPusat(pg) > 500)
    pg.screenshot(path='/home/z/my-project/research/hidup-sapa.png')

    # ---------- Bagian C: file:// → HIDUP MANDIRI (anti-bisu) ----------
    print('== C. fallback file:// — hidup mandiri ==')
    pg2 = br.new_page(viewport={'width': 900, 'height': 700})
    pantau(pg2, 'C')
    pg2.goto(f'file://{DL}/hidup.html', wait_until='load')
    pg2.wait_for_timeout(1800)
    cek('C1 HIDUP MANDIRI diumumkan jujur', 'HIDUP MANDIRI' in pg2.inner_text('#cSumber'))
    cek('C2 tetap bernapas (aktivitas + fase jalan)', pg2.inner_text('#cAksi').strip() != 'AKTIVITAS —')
    cek('C3 tanpa error JS', True)
    pg2.close()

    # ---------- Bagian D: arena.html punya pintu RUANG HIDUP ----------
    print('== D. arena.html → pintu RUANG HIDUP ==')
    pg3 = br.new_page(viewport={'width': 1280, 'height': 800})
    pantau(pg3, 'D')
    pg3.goto(f'file://{DL}/arena.html', wait_until='domcontentloaded')
    pg3.wait_for_timeout(1200)
    cek('D1 tautan RUANG HIDUP ada', pg3.locator('a.btn[href="hidup.html"]').count() == 1)
    cek('D2 tautan berlabel RUANG HIDUP', 'RUANG HIDUP' in (pg3.locator('a.btn[href="hidup.html"]').inner_text() if pg3.locator('a.btn[href="hidup.html"]').count() else ''))
    pg3.close()
    br.close()
httpd.shutdown()

print(f"\n=== HASIL: {len(lulus)} LULUS, {len(galat)} GAGAL ===")
for g in galat:
    print('  ✗', g)
sys.exit(0 if not galat else 1)
