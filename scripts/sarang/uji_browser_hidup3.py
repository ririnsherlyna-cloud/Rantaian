#!/usr/bin/env python3
# UJI BROWSER hidup.html v4 — V283-KESADARAN
# A: mobile 390x844 — dunia UTUH (semua zona di dalam ruang bebas), hidup, panel bottom-sheet
# B: panel dibuka via tab JURNAL — dunia menyusut adaptif, tak tertutup
# C: desktop 1440x900 — panel kanan, panggung tak tertutup
# D: persistensi — lahir/usia/jurnal selamat reload
# E: file:// — TAUT PUTUS jujur tapi tetap hidup (anti-bisu)
import os, sys, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

DL = Path('/home/z/my-project/download')
PORT = 8831
os.makedirs('/home/z/my-project/research', exist_ok=True)
galat, lulus = [], []

def cek(nama, kondisi, detail=''):
    (lulus if kondisi else galat).append(nama)
    print(('  LULUS ' if kondisi else '  GAGAL ') + nama + (f' — {detail}' if detail else ''))

def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DL))
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd

def pantau(page, tag):
    NOISE = ('URL scheme "file" is not supported', 'favicon')
    def konsole(m):
        if m.type != 'error': return
        if any(x in m.text for x in NOISE): return
        galat.append(f'[{tag}] console: {m.text[:160]}')
    page.on('console', konsole)
    page.on('pageerror', lambda e: galat.append(f'[{tag}] pageerror: {str(e)[:160]}'))

httpd = serve()
with sync_playwright() as p:
    br = p.chromium.launch()

    # ============ A: MOBILE ============
    print('== A. mobile 390x844 ==')
    pg = br.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pantau(pg, 'A')
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pg.wait_for_timeout(3000)
    cek('A1 tanpa error console', not [g for g in galat if g.startswith('[A]')], str([g for g in galat if g.startswith('[A]')][:2]))
    cek('A2 HUD energi terisi', pg.evaluate("() => /E \\d+%/.test(document.getElementById('cEnergi').textContent)"), pg.inner_text('#cEnergi'))
    cek('A3 siklus sadar 9 pil', pg.evaluate("() => document.querySelectorAll('#siklus .pil').length") == 9)
    cek('A4 kegiatan berjalan (bukan menimbang terus)', pg.evaluate("() => !!K.kegiatan"), str(pg.evaluate("() => K.kegiatan && K.kegiatan.a")))
    # dunia utuh: semua zona di dalam [0..worldW/H]
    cek('A5 SEMUA zona utuh di dunia (tak terpotong)', pg.evaluate('''() => {
        return ZONA_DEF.every(d => { const z = D.zona[d.id];
            return z.x >= -0.01 && z.y >= -0.01 && z.x + z.w <= W.worldW + 0.01 && z.y + z.h <= W.worldH + 0.01; }); }'''))
    cek('A6 dunia mengisi ruang bebas (fit, tanpa crop)', pg.evaluate('''() => {
        const f = D.fit; return f.w >= 200 && f.h >= 200 && f.y >= document.getElementById('hud').getBoundingClientRect().bottom - 2; }'''))
    x1 = pg.evaluate('() => D.ent.x'); fp1 = pg.evaluate("() => { const g = K.kegiatan; return g ? g.a + ':' + g.i + ':' + Math.round(g.t0) + ':' + Math.round(g.dur) : '-'; }")
    pg.wait_for_timeout(3200)
    x2 = pg.evaluate('() => D.ent.x'); fp2 = pg.evaluate("() => { const g = K.kegiatan; return g ? g.a + ':' + g.i + ':' + Math.round(g.t0) + ':' + Math.round(g.dur) : '-'; }")
    cek('A7 POLA HIDUP (bergerak ATAU fase/fase berubah)', abs(x2 - x1) > 0.3 or fp1 != fp2, f'x {x1:.1f}→{x2:.1f} · {fp1} → {fp2}')
    cek('A8 jurnal tumbuh (>=2)', pg.evaluate("() => K.jurnal.length") >= 2, f"n={pg.evaluate('() => K.jurnal.length')}")
    cek('A9 trace MENGAPA berisi skor numerik', pg.evaluate('''() => {
        const rows = document.querySelectorAll('#mengapa .barisU');
        return rows.length >= 2 && /\\d\\.\\d\\d/.test(rows[0].textContent); }'''))
    # kanvas benar menggambar
    cek('A10 kanvas menggambar dunia', pg.evaluate('''() => {
        const c = document.getElementById('panggung'), x = c.getContext('2d');
        const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
        for (let i = 0; i < d.length; i += 64) { if (d[i] > 12 || d[i+1] > 12 || d[i+2] > 12) n++; } return n; }''') > 300)
    cek('A11 panel mobile awal TERTUTUP (panggung lega)', pg.evaluate("() => document.getElementById('panel').offsetHeight") <= 50,
        str(pg.evaluate("() => document.getElementById('panel').offsetHeight")))
    pg.screenshot(path='/home/z/my-project/research/hidup-v4-mobile.png')

    # ============ B: PANEL DIBUKA — dunia menyusut adaptif ============
    print('== B. panel bottom-sheet dibuka ==')
    pg.click('#tab button[data-t="jurnal"]')
    pg.wait_for_timeout(700)
    hPan = pg.evaluate("() => document.getElementById('panel').offsetHeight")
    cek('B1 panel terbuka tinggi layak (>220px)', hPan > 220, f'h={hPan}')
    cek('B2 dunia menyusut mengikuti panel (adaptif, tak tertutup)', pg.evaluate('''() => {
        const p = document.getElementById('panel'), f = D.fit;
        return f.y + f.h <= p.offsetTop + 2; }'''))
    cek('B3 jurnal terisi di panel', pg.evaluate("() => document.querySelectorAll('#jurnal li').length") >= 2)
    pg.click('#tab button[data-t="dunia"]')
    pg.wait_for_timeout(500)
    cek('B4 pohon pengetahuan 15 node', pg.evaluate("() => document.querySelectorAll('#pohon .node').length") == 15)
    cek('B5 sistem tubuh 4 bar', pg.evaluate("() => document.querySelectorAll('#sistem .sRow').length") == 4)
    cek('B6 koneksi kode 3 baris', pg.evaluate("() => document.querySelectorAll('#koneksi .kRow').length") == 3)
    pg.screenshot(path='/home/z/my-project/research/hidup-v4-panel.png')
    lahir1 = pg.evaluate('() => K.lahir')
    pg.close()

    # ============ C: DESKTOP ============
    print('== C. desktop 1440x900 ==')
    pd = br.new_page(viewport={'width': 1440, 'height': 900})
    pantau(pd, 'C')
    pd.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pd.wait_for_timeout(2500)
    cek('C1 panel desktop kolom kanan 334px', abs(pd.evaluate("() => document.getElementById('panel').offsetWidth") - 334) <= 2)
    cek('C2 panggung tak tertutup panel (fit.kanan <= panel.kiri)', pd.evaluate('''() => {
        const f = D.fit, p = document.getElementById('panel');
        return f.x + f.w <= p.offsetLeft + 2; }'''))
    cek('C3 zona utuh di desktop', pd.evaluate('''() => ZONA_DEF.every(d => { const z = D.zona[d.id];
        return z.x >= -0.01 && z.y >= -0.01 && z.x + z.w <= W.worldW + 0.01 && z.y + z.h <= W.worldH + 0.01; })'''))
    cek('C4 data arena NYATA terbaca', pd.evaluate("() => K.data && K.data.ok === true"), str(pd.evaluate("() => K.data && K.data.nPicks")))
    cek('C5 statusZona tautan menampilkan cermin', pd.evaluate("() => statusZona('tautan').includes('cermin')"), pd.evaluate("() => statusZona('tautan')"))
    pd.wait_for_timeout(3000)
    cek('C6 tanpa error console desktop', not [g for g in galat if g.startswith('[C]')], str([g for g in galat if g.startswith('[C]')][:2]))
    pd.screenshot(path='/home/z/my-project/research/hidup-v4-desktop.png')

    # ============ D: PERSISTENSI ============
    print('== D. persistensi reload ==')
    lahir1 = pd.evaluate('() => K.lahir')
    j1 = pd.evaluate("() => K.jurnal.length")
    pd.reload(wait_until='load'); pd.wait_for_timeout(2200)
    lahir2 = pd.evaluate('() => K.lahir')
    cek('D1 usia dunia selamat (lahir sama)', lahir1 == lahir2, f'{lahir1} vs {lahir2}')
    cek('D2 jurnal bertahan/kembali', pd.evaluate("() => K.jurnal.length") >= min(3, j1))
    cek('D3 keputusan pertama diambil lagi dari utilitas', pd.evaluate("() => !!K.keputusan && K.keputusan.kandidat.length >= 3"))
    pd.close()

    # ============ E: file:// jujur tapi hidup ============
    print('== E. file:// mode mandiri ==')
    pf = br.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pantau(pf, 'E')
    pf.goto(f'file://{DL}/hidup.html', wait_until='load')
    pf.wait_for_timeout(2500)
    cek('E1 chip jujur TAUT PUTUS', 'TAUT PUTUS' in pf.inner_text('#tTaut'), pf.inner_text('#tTaut'))
    f1 = pf.evaluate('() => D.ent.x')
    pf.wait_for_timeout(2600)
    cek('E2 tetap beraktivitas walau tanpa tautan (anti-bisu)', abs(pf.evaluate('() => D.ent.x') - f1) > 0.2 or pf.evaluate("() => !!K.kegiatan"))
    cek('E3 tanpa error console file://', not [g for g in galat if g.startswith('[E]')], str([g for g in galat if g.startswith('[E]')][:2]))
    pf.close()
    br.close()
httpd.shutdown()

print(f"\n=== HASIL: {len(lulus)} LULUS / {len(galat)} GAGAL ===")
if galat:
    print('GALAT:'); [print(' -', g) for g in galat]
sys.exit(1 if galat else 0)
