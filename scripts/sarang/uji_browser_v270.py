#!/usr/bin/env python3
"""UJI BROWSER V270 — arena.html dengan OTAK MANDIRI:
1) halaman muat tanpa error konsol; 2) panel PERTANYAANKU & SEKOLAH MANDIRI tampil;
3) pertanyaan mandiri pertama tumbuh (3.5s); 4) tanya 'Apa itu AGI?' -> jawaban otak mandiri;
5) sekolah mandiri jalan (kelas pertama); 6) screenshot desktop."""
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
    # lewati layar bootstrap (uji otak mandiri tak butuh unduhan 21 hari Binance)
    pg.evaluate("document.getElementById('boot').style.display='none'")
    pg.wait_for_timeout(500)

    # panel ada?
    for pid in ('omPanel', 'tanyaKu', 'sekolahBox', 'sekKelas'):
        vis = pg.locator('#' + pid).count()
        print(f'panel #{pid}: {"ADA" if vis else "HILANG"}')
    pg.click('button[data-tab="guru"]')
    pg.wait_for_timeout(500)

    # pertanyaan mandiri pertama (setTimeout 3500ms)
    pg.wait_for_timeout(4000)
    qt = pg.locator('#tanyaKu .qcard .qt').first.text_content() if pg.locator('#tanyaKu .qcard').count() else '(belum ada)'
    print('\nPERTANYAAN MANDIRI #1:', qt.strip()[:160])
    hyp = pg.locator('#tanyaKu .qcard .qh').first.text_content() if pg.locator('#tanyaKu .qcard .qh').count() else ''
    print('HIPOTESIS:', (hyp or '').strip()[:120])
    lvl = pg.locator('#omLevel').text_content()
    print('LEVEL OTAK:', lvl.strip())

    # sekolah kilat: kelas kilat 3 soal + bar fakultas + badge tingkat
    sek = pg.locator('#sekKelas .sekrec').count()
    line = pg.locator('#sekLine').text_content() if sek else '-'
    fak = pg.locator('#sekFak .fakrow').count()
    tt = pg.locator('#sekKelas .tt').first.text_content() if pg.locator('#sekKelas .tt').count() else '-'
    print('\nSEKOLAH KILAT: kelas tercatat =', sek, '(harus 3) |', line.strip(), '| bar fakultas =', fak, '| tingkat:', tt.strip())

    # uji tanya -> otak mandiri
    pg.fill('#ask', 'Apa itu AGI?')
    pg.click('#btnAsk')
    pg.wait_for_timeout(1200)
    badge = pg.locator('#turns .badge.om').first
    ans = pg.locator('#turns .ans .md').first
    print('\nBADGE JAWABAN:', badge.text_content().strip() if badge.count() else '(tak ada badge!)')
    print('AWAL JAWABAN:', (ans.text_content().strip()[:300] if ans.count() else '(kosong)'))

    # uji permanen (pertanyaan kunci pemilik) + uji sekolah
    pg.fill('#ask', 'Apa yang terjadi kalau z.ai hilang atau link di-restart?')
    pg.click('#btnAsk')
    pg.wait_for_timeout(1200)
    ans2 = pg.locator('#turns .ans .md').first
    print('\nUJI PERMANEN:', (ans2.text_content().strip()[:260] if ans2.count() else '(kosong)'))

    pg.fill('#ask', 'Apa arti sekolah bagimu?')
    pg.click('#btnAsk')
    pg.wait_for_timeout(1200)
    ans3 = pg.locator('#turns .ans .md').first
    print('\nUJI SEKOLAH:', (ans3.text_content().strip()[:300] if ans3.count() else '(kosong)'))

    pg.screenshot(path='/home/z/my-project/research/arena-v270-guru.png', full_page=False)
    b.close()

print('\nERROR KONSOL:', len(galat))
for g in galat[:6]: print('  •', g[:150])
print('SELESAI')
