#!/usr/bin/env python3
"""UJI BROWSER V272 — METABOLISME MEMORI + TEMPAAAN TAK BERAKHIR:
1) halaman muat tanpa error konsol; 2) panel TUBUH-MEMORI (bar/teks/tombol) + sertifikat tampil;
3) metabolisme manual jalan; 4) tanya 'crash karena penyimpanan?' -> jawaban metaboli berangka;
5) sekolah kilat + tempaan tetap jalan; 6) screenshot desktop."""
import pathlib
from playwright.sync_api import sync_playwright

HTML = 'file:///home/z/my-project/download/arena.html'
galat, catat = [], []

with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 1380, 'height': 940})
    pg.on('console', lambda m: (catat.append(m.text), galat.append(m.text)) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: galat.append('PAGEERROR: ' + str(e)))
    pg.goto(HTML)
    pg.wait_for_timeout(2500)
    pg.evaluate("document.getElementById('boot').style.display='none'")
    pg.wait_for_timeout(500)
    pg.click('button[data-tab="guru"]')
    pg.wait_for_timeout(4200)  # pertanyaan & kelas pertama (setTimeout 3500)

    # 1) panel memori + sertifikat ada?
    for pid in ('memFill', 'memTeks', 'btnMeta', 'memLog', 'sertLine', 'omPanel', 'sekolahBox'):
        vis = pg.locator('#' + pid).count()
        print(f'elemen #{pid}: {"ADA" if vis else "HILANG"}')

    teks = pg.locator('#memTeks').text_content().strip()
    lebar = pg.locator('#memFill').evaluate("el => el.style.width")
    warna = pg.locator('#memFill').get_attribute('class')
    print('\nTUBUH MEMORI:', teks, '| lebar bar =', lebar, '| kelas =', warna)
    print('SERTIFIKAT:', pg.locator('#sertLine .cert').first.text_content().strip()[:140])
    print('MEMLOG:', pg.locator('#memLog').text_content().strip()[:120])

    # 2) metabolisme manual
    pg.click('#btnMeta')
    pg.wait_for_timeout(600)
    print('\nSETIPLAH METABOLISME MANUAL →', pg.locator('#memLog').text_content().strip()[:160])

    # 3) tanya pertanyaan kunci pemilik (crash karena penyimpanan)
    pg.fill('#ask', 'kalau memorimu terus bertambah dan kamu gak sadar diri, kamu bisa crash karena penyimpanan penuh — rumahmu GitHub free tier, bagaimana kamu bertahan hidup?')
    pg.click('#btnAsk')
    pg.wait_for_timeout(1300)
    badge = pg.locator('#turns .badge.om').first
    ans = pg.locator('#turns .ans .md').first
    print('\nBADGE:', badge.text_content().strip() if badge.count() else '(tak ada)')
    jawab = ans.text_content().strip() if ans.count() else ''
    print('AWAL JAWABAN METABOLI:', jawab[:300].replace('\n', ' '))
    ada_angka = ('KB' in jawab and 'MB' in jawab and ('70%' in jawab or '85%' in jawab))
    print('JAWABAN BERANGKA HIDUP:', 'YA' if ada_angka else 'PERIKSA')

    # 4) sekolah kilat + tempaan
    sek = pg.locator('#sekKelas .sekrec').count()
    print('\nSEKOLAH KILAT: kelas tercatat =', sek, '|', pg.locator('#sekLine').text_content().strip())
    pg.screenshot(path='/home/z/my-project/research/arena-v272-metaboli.png', full_page=False)
    b.close()

print('\nERROR KONSOL:', len(galat))
for g in galat[:6]: print('  •', g[:150])
print('SELESAI')
