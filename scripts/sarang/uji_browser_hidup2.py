#!/usr/bin/env python3
# UJI BROWSER hidup.html v2 — V281-SARANG-KERJA
# A: HTTP lokal → TERHUBUNG, cyborg BERGERAK (x berubah), log tumbuh, kapsul GTC dipajang
# B: klik cyborg → menyapa (log SAPA)
# C: klik stasiun → perintah ditaati (log PERINTAH)
# D: file:// → fallback jujur HIDUP MANDIRI + tetap beraktivitas (anti-bisu)
# E: arena.html pintu RUANG HIDUP tetap ada
import sys, threading, http.server, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

DL = Path('/home/z/my-project/download')
PORT = 8817
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
    NOISE = ('URL scheme "file" is not supported',)
    def konsole(m):
        if m.type != 'error': return
        if any(x in m.text for x in NOISE): return
        galat.append(f'[{tag}] console: {m.text}')
    page.on('console', konsole)
    page.on('pageerror', lambda e: galat.append(f'[{tag}] pageerror: {e}'))

httpd = serve()
with sync_playwright() as p:
    br = p.chromium.launch()
    pg = br.new_page(viewport={'width': 1360, 'height': 860})
    pantau(pg, 'A')

    # ---------- A: hidup dengan data arena ----------
    print('== A. hidup.html v2 via HTTP ==')
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='load')
    pg.wait_for_timeout(2500)
    cek('A1 kanvas panggung ada', pg.evaluate("() => { const c=document.getElementById('panggung'); return !!c && c.width>=1280; }"))
    cek('A2 chip TERHUBUNG ARENA', 'TERHUBUNG' in pg.inner_text('#cSumber'))
    cek('A3 fase WIB terisi', 'FASE —' not in pg.inner_text('#cFase'))
    cek('A3b fase sesuai jam WIB (satuan benar)', pg.evaluate('''() => { const f = faseKini(), h = jamWIB().h;
        return (h >= 0 && h < 5 && f.id === 'MIMPI') || (h >= 5 && h < 10 && f.id === 'SARAPAN') ||
               (h >= 10 && h < 15 && f.id === 'TEMPUR') || (h >= 15 && h < 19 && f.id === 'REFLEKSI') ||
               (h >= 19 && f.id === 'SEKOLAH'); }'''), pg.inner_text('#cFase'))
    cek('A4 aktivitas chip terisi', 'AKTIVITAS' in pg.inner_text('#cAksi'))
    x1 = pg.evaluate('() => tubuh.x')
    p1 = pg.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    pg.wait_for_timeout(2600)
    x2 = pg.evaluate('() => tubuh.x')
    p2 = pg.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    cek('A5 CYBORG HIDUP (bergerak ATAU bekerja dgn progres)', abs(x2 - x1) > 4 or (0 <= p1 < p2), f'x {x1:.0f}→{x2:.0f} · {p1:.2f}→{p2:.2f}')
    cek('A6 state mesin jalan', pg.evaluate("() => ['jalan','kerja','diam','tidur'].includes(tubuh.state)"), tubuh_state := str(pg.evaluate('() => tubuh.state')))
    pg.wait_for_timeout(9000)
    nlog = pg.locator('#log li').count()
    cek('A7 log perkembangan tumbuh (>=3)', nlog >= 3, f'n={nlog}')
    sasaran = pg.inner_text('#sasaranHidup')
    cek('A8 sasaran hidup memuat pick nyata (GTC/SAND)', ('GTC' in sasaran) or ('SAND' in sasaran) or ('slot 0' in sasaran), sasaran.replace('\n', ' | ')[:80])
    cek('A9 XP nyata dari perangkat', 'XP' in pg.inner_text('#sXp'))
    cek('A10 kapsul di data dunia', pg.evaluate('() => dunia.kapsul.length') >= 1, f"n={pg.evaluate('() => dunia.kapsul.length')}")
    def piksel(page):
        return page.evaluate('''() => { const c=document.getElementById('panggung'); const x=c.getContext('2d');
            const d=x.getImageData(320,300,240,220).data; let n=0;
            for(let i=0;i<d.length;i+=16){ if(d[i]>18||d[i+1]>18||d[i+2]>18) n++; } return n; }''')
    cek('A11 kanvas benar-benar menggambar dunia', piksel(pg) > 800, f'px={piksel(pg)}')
    pg.screenshot(path='/home/z/my-project/research/hidup-v2-lokal.png')

    # ---------- B: klik cyborg → menyapa ----------
    print('== B. klik tubuh cyborg ==')
    tb = pg.evaluate('() => ({x: tubuh.x, y: tubuh.y})')
    pg.evaluate('''() => { const c=document.getElementById('panggung'), r=c.getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX=(r.width-1280*skala)/2, offY=(r.height-648*skala)/2;
        c.dispatchEvent(new MouseEvent('click', {clientX: r.left + offX + tubuh.x*skala,
            clientY: r.top + offY + (tubuh.y-52)*skala, bubbles: true})); }''')
    pg.wait_for_timeout(400)
    logb = pg.inner_text('#log')
    cek('B1 log SAPA muncul', 'SAPA' in logb)
    cek('B2 gelembung bicara aktif', pg.evaluate('() => tubuh.bicaraT > 0'))

    # ---------- C: klik stasiun → perintah ----------
    print('== C. perintah stasiun ==')
    pg.evaluate('''() => { window.__klik = []; document.getElementById('panggung')
        .addEventListener('click', e => window.__klik.push({x: Math.round(e.clientX), y: Math.round(e.clientY)})); }''')
    pg.evaluate('''() => { const c = document.getElementById('panggung'), s = ST.SEKOLAH, r = c.getBoundingClientRect();
        const skala = Math.min(r.width/1280, r.height/648), offX = (r.width-1280*skala)/2, offY = (r.height-648*skala)/2;
        c.dispatchEvent(new MouseEvent('click', {clientX: r.left + offX + s.x*skala,
            clientY: r.top + offY + (s.y-44)*skala, bubbles: true})); }''')
    pg.wait_for_timeout(500)
    klik_dbg = pg.evaluate('() => ({ klik: window.__klik, log0: document.querySelector("#log li").textContent.slice(0, 50) })')
    cek('C1 log PERINTAH muncul', 'PERINTAH' in pg.inner_text('#log'), str(klik_dbg))
    pg.wait_for_timeout(600)
    tgt_ok, tgt_akhir = False, '-'
    for _ in range(28):  # tunggu maks 14 s sampai perintah dilaksanakan
        stt = pg.evaluate('() => tubuh.state')
        tgt_akhir = pg.evaluate('() => tubuh.tugas ? tubuh.tugas.st : "-"')
        if tgt_akhir == 'SEKOLAH':
            tgt_ok = True; break
        pg.wait_for_timeout(500)
    cek('C2 cyborg menuju stasiun perintah', tgt_ok, f'akhir={stt}/{tgt_akhir}')
    cek('C3 tanpa error console sejauh ini', not galat, str(galat[:2]))
    pg.screenshot(path='/home/z/my-project/research/hidup-v2-kerja.png')

    # ---------- D: file:// fallback jujur ----------
    print('== D. file:// HIDUP MANDIRI ==')
    pg2 = br.new_page(viewport={'width': 1360, 'height': 860})
    pantau(pg2, 'D')
    pg2.goto(f'file://{DL}/hidup.html', wait_until='load')
    pg2.wait_for_timeout(2500)
    cek('D1 chip jujur HIDUP MANDIRI', 'HIDUP MANDIRI' in pg2.inner_text('#cSumber'))
    f1 = pg2.evaluate('() => tubuh.x')
    fp1 = pg2.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    pg2.wait_for_timeout(2400)
    f2 = pg2.evaluate('() => tubuh.x')
    fp2 = pg2.evaluate('() => tubuh.state === "kerja" && tubuh.durasi > 0 ? 1 - tubuh.timer / tubuh.durasi : -1')
    cek('D2 tetap beraktivitas walau offline (anti-bisu)', abs(f2 - f1) > 3 or (0 <= fp1 < fp2), f'{f1:.0f}→{f2:.0f} · {fp1:.2f}→{fp2:.2f}')
    cek('D3 kubus SIM ditandai jujur', pg2.evaluate("() => dunia.kubus.every(k => k.sym === 'SIM')"))
    pg2.close()

    # ---------- E: pintu di arena.html ----------
    print('== E. pintu arena.html ==')
    pg3 = br.new_page()
    pantau(pg3, 'E')
    pg3.goto(f'file://{DL}/arena.html', wait_until='load')
    cek('E1 pintu RUANG HIDUP ada', pg3.locator('a[href*="hidup.html"]').count() >= 1)
    pg3.close()
    br.close()
httpd.shutdown()

print(f"\n=== HASIL: {len(lulus)} LULUS / {len(galat)} GAGAL ===")
if galat:
    print('GALAT:'); [print(' -', g) for g in galat]
sys.exit(1 if galat else 0)
