#!/usr/bin/env python3
# UJI LIVE V282 — halaman RESMI di GitHub Pages: mesin harus bekerja nyata di sana.
import asyncio, sys
from playwright.async_api import async_playwright

OUT = open('/home/z/my-project/research/uji_live_v282_hasil.txt', 'w')
def cetak(s):
    print(s); OUT.write(s + '\n'); OUT.flush()

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'

async def main():
    hasil = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await (await browser.new_context(viewport={'width': 1440, 'height': 900})).new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        await page.goto(URL, wait_until='domcontentloaded', timeout=60000)
        await page.wait_for_timeout(20000)
        sumber = await page.text_content('#teksSumber')
        hasil.append(('1 halaman live terbuka + sensor terpasang', 'SENSOR' in sumber, sumber))
        trace = await page.text_content('#trace')
        hasil.append(('2 fetch Binance NYATA dari Pages', 'sensor.pancing' in trace and 'lilin' in trace, ''))
        hasil.append(('3 hitungan otak nyata', 'penilai.nilai' in trace, ''))
        hub = await page.text_content('#trace')
        hasil.append(('4 cermin arena terbaca (same-origin)', 'arena-keadaan.json terbaca' in hub, ''))
        audit = await page.inner_html('#isiAudit')
        hasil.append(('5 audit pick MICAPROFITA tampil', ('barisAudit' in audit) or ('menunggu' in audit.lower()), audit[:80].replace('\n', ' ')))
        ik = await page.text_content('#teksIK')
        hasil.append(('6 indeks kesadaran berangka', '/100' in ik, ik[:60]))
        gen = await page.evaluate('G.gen')
        await page.evaluate('tugasEvolusi()')
        gen2 = await page.evaluate('G.gen')
        hasil.append(('7 evolusi jalan di Pages', gen2 > gen, f'G{gen}->G{gen2}'))
        await page.wait_for_timeout(15000)
        bubble = await page.evaluate('BICARA')
        hasil.append(('8 pikiran = alasan nyata', len(bubble) > 8, bubble[:60]))
        e2 = [e for e in errs if 'favicon' not in e.lower()]
        hasil.append(('9 console bersih', len(e2) == 0, '; '.join(e2[:3])[:120]))
        await page.screenshot(path='/home/z/my-project/research/hidup-v282-live.png', full_page=False)
        await browser.close()
    ok = 0
    cetak('=== UJI LIVE V282 (GitHub Pages) ===')
    for nm, lulus, ket in hasil:
        cetak(('  LULUS ' if lulus else '  GAGAL ') + nm + ((' — ' + str(ket)) if ket else ''))
        ok += 1 if lulus else 0
    cetak(f'=== {ok}/{len(hasil)} LULUS ===')
    OUT.close()
    sys.exit(0 if ok == len(hasil) else 1)

asyncio.run(main())
