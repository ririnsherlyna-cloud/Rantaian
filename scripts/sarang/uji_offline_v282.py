#!/usr/bin/env python3
# UJI JUJUR OFFLINE V282 — blokir Binance & arena-keadaan:
# cyborg harus tetap bekerja dari arsip, MENYATAKAN gagalnya sensor dengan jujur, tanpa crash.
import asyncio, sys, threading, functools, os, socketserver
from playwright.async_api import async_playwright

OUT = open('/home/z/my-project/research/uji_offline_v282_hasil.txt', 'w')
def cetak(s):
    print(s); OUT.write(s + '\n'); OUT.flush()

PORT = 8965
BASE = f'http://127.0.0.1:{PORT}'

async def main():
    hasil = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await ctx.new_page()
        errs = []
        page.on('pageerror', lambda e: errs.append(str(e)))
        # blokir SEMUA jaringan luar (binance) — localhost tetap hidup
        await ctx.route('**/api/v3/**', lambda r: r.abort())
        await ctx.route('**/binance.*/**', lambda r: r.abort())
        # blokir arena-keadaan.json juga (cermin putus)
        await ctx.route('**/arena-keadaan.json', lambda r: r.abort())
        await page.goto(BASE + '/hidup.html')
        await page.wait_for_timeout(12000)
        trace = await page.text_content('#trace')
        sumber = await page.text_content('#teksSumber')
        hasil.append(('1 arsip dibangkitkan (jujur berlabel)', 'ARSIP' in sumber or 'CACHE' in sumber, sumber))
        hasil.append(('2 sensor MENYATAKAN gagal (tidak bohong)', 'GAGAL' in trace, ''))
        hasil.append(('3 tetap menghitung dari ingatan', 'penilai.nilai' in trace, ''))
        hasil.append(('4 audit jujur menunda', 'kutunda' in trace or 'tak terjangkau' in trace, ''))
        gen = await page.evaluate('G.gen')
        await page.evaluate('tugasEvolusi()')
        gen2 = await page.evaluate('G.gen')
        hasil.append(('5 evolusi tetap jalan dari arsip nyata', gen2 > gen, f'G{gen}->G{gen2}'))
        xp1 = await page.evaluate('G.xp')
        await page.evaluate('tugasSekolah()')
        xp2 = await page.evaluate('G.xp')
        hasil.append(('6 sekolah tetap jalan', xp2 > xp1, f'{xp1}->{xp2}'))
        await page.wait_for_timeout(3000)
        hasil.append(('7 tanpa pageerror', len(errs) == 0, '; '.join(errs[:2])[:120]))
        await page.screenshot(path='/home/z/my-project/research/hidup-v282-offline.png')
        await browser.close()
    ok = 0
    cetak('=== UJI JUJUR OFFLINE V282 ===')
    for nm, lulus, ket in hasil:
        cetak(('  LULUS ' if lulus else '  GAGAL ') + nm + ((' — ' + str(ket)) if ket else ''))
        ok += 1 if lulus else 0
    cetak(f'=== {ok}/{len(hasil)} LULUS ===')
    OUT.close()
    sys.exit(0 if ok == len(hasil) else 1)

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(__import__('http.server', fromlist=['x']).SimpleHTTPRequestHandler)
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    os.chdir('/home/z/my-project/download')
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        asyncio.run(main())
    finally:
        httpd.shutdown()
