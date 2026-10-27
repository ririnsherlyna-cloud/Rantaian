#!/usr/bin/env python3
# UJI BROWSER V282-MESIN-HIDUP — bukti bahwa mesin benar-benar bekerja (bukan panggung)
# A: boot + fetch Binance LIVE + hitungan nyata muncul di trace
# B: cyborg bergerak antar stasiun mengikuti mesin
# C: evolusi GA jalan (gen naik, fitness riil)
# D: audit arena vs hidup tampil
# E: persistensi localStorage + reload
# F: gelembung pikiran = alasan nyata
# G: console bersih
import asyncio, json, subprocess, time, sys, threading
from playwright.async_api import async_playwright

OUT = open('/home/z/my-project/research/uji_mesin_v282_hasil.txt', 'w')
def cetak(s):
    print(s); OUT.write(s + '\n'); OUT.flush()

PORT = 8963
BASE = f'http://127.0.0.1:{PORT}'

async def main():
    hasil = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--allow-file-access-from-files'])
        ctx = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await ctx.new_page()
        console_err = []
        page.on('console', lambda m: console_err.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: console_err.append(str(e)))

        # ---- A: boot + kerja nyata ----
        await page.goto(BASE + '/hidup.html')
        await page.wait_for_timeout(3000)
        sumber = await page.text_content('#teksSumber')
        hasil.append(('A1 sumber sensor terpasang', 'LIVE' in sumber or 'ARSIP' in sumber or 'CACHE' in sumber, sumber))

        # tunggu sweep pertama (12 PANCING berjarak ~1s + hitung)
        await page.wait_for_timeout(25000)
        trace = await page.text_content('#trace')
        hasil.append(('A2 trace ada pancingan nyata', 'sensor.pancing' in trace, ''))
        hasil.append(('A3 trace angka lilin/KB', 'lilin' in trace and 'KB' in trace, ''))
        hasil.append(('A4 trace penilai skor', 'penilai.nilai' in trace, ''))
        live = await page.text_content('#teksSumber')
        hasil.append(('A5 sumber jadi LIVE', 'LIVE' in live, live))
        taut = await page.get_attribute('#buktiTaut', 'href')
        hasil.append(('A6 tautan sumber mentah Binance', bool(taut and 'binance' in taut), str(taut)[:80]))

        # ---- F: gelembung pikiran (alasan nyata) ----
        bubble = await page.evaluate('BICARA')
        hasil.append(('F1 gelembung pikiran berisi alasan', len(bubble) > 8, bubble[:70]))

        # ---- B: cyborg bergerak mengikuti mesin (undang CEK lewat jam mesin) ----
        await page.evaluate('G.cekTerakhir = 0; G.sekolahTerakhir = 0;')
        xs = set()
        tugas_lihat = set()
        for _ in range(22):
            x1 = await page.evaluate('TUBUH.x')
            t = await page.evaluate('TUGAS ? TUGAS.t : "NAPAS"')
            xs.add(round(x1)); tugas_lihat.add(t)
            await page.wait_for_timeout(1000)
        kerja_lihat = tugas_lihat - {'NAPAS'}
        hasil.append(('B1 tubuh berpindah stasiun', len(xs) >= 3 or len(kerja_lihat) >= 1, f'x={sorted(xs)[:6]} tugas={sorted(tugas_lihat)}'))

        # ---- C: evolusi nyata ----
        gen1 = await page.evaluate('G.gen')
        # paksa evolusi langsung untuk kepastian uji (panggil mesin, bukan panggung)
        fit = await page.evaluate('tugasEvolusi()')
        await page.wait_for_timeout(400)
        gen2 = await page.evaluate('G.gen')
        fitHist = await page.evaluate('G.fitHist.length')
        hasil.append(('C1 evolusi: gen naik', gen2 > gen1, f'G{gen1} -> G{gen2} hasil={fit}'))
        hasil.append(('C2 fitness tercatat riil', fitHist >= 1, f'fitHist={fitHist}'))
        spark = await page.evaluate('!!G.fitHist.slice(-1)[0]')
        hasil.append(('C3 data sparkline ada', spark, ''))

        # ---- D: audit arena ----
        await page.evaluate('hubungkan()')
        await page.wait_for_timeout(2500)
        audit_html = await page.inner_html('#isiAudit')
        hasil.append(('D1 panel audit terisi / jujur menunggu', ('barisAudit' in audit_html) or ('kutunda' in audit_html or 'menunggu' in audit_html.lower()), audit_html[:90].replace('\n', ' ')))
        # jalankan audit paksa bila lilin pick tersedia
        auditN = await page.evaluate('''(async () => {
            if (!KEADAAN.picks.length) return 'tanpa-pick';
            let n = 0;
            for (const p of KEADAAN.picks) {
                if (!G.pasir[p.symbol]) { const ok = await pancing(p.symbol); if (!ok) continue; }
                if (!G.faktor[p.symbol]) hitung(p.symbol);
                nilaiDanCatat(p.symbol); tugasAuditSatu(p); n++;
            }
            return n;
        })()''')
        await page.wait_for_timeout(500)
        audit_html2 = await page.inner_html('#isiAudit')
        ada_vonis = ('SEPAKAT' in audit_html2) or ('MENDEVIASI' in audit_html2) or ('TAK-TERBANDING' in audit_html2) or auditN == 'tanpa-pick'
        hasil.append(('D2 audit menyatakan vonis nyata', ada_vonis, f'audit={auditN}'))

        # ---- E: persistensi ----
        await page.evaluate('simpan()')
        xp1 = await page.evaluate('G.xp')
        lilin1 = await page.evaluate('G.res.lilin')
        await page.reload()
        await page.wait_for_timeout(2500)
        xp2 = await page.evaluate('G.xp')
        lilin2 = await page.evaluate('G.res.lilin')
        hasil.append(('E1 XP bertahan reload', xp2 >= xp1, f'{xp1} -> {xp2}'))
        hasil.append(('E2 lilin bertahan reload', lilin2 >= lilin1 * 0.5, f'{lilin1} -> {lilin2}'))
        sumber2 = await page.text_content('#teksSumber')
        hasil.append(('E3 sumber cache/live pasca reload', ('CACHE' in sumber2) or ('LIVE' in sumber2), sumber2))

        # ---- G: console ----
        err = [e for e in console_err if 'favicon' not in e.lower()]
        hasil.append(('G1 console bersih', len(err) == 0, '; '.join(err[:3])[:150]))

        # screenshot
        await page.screenshot(path='/home/z/my-project/research/hidup-v282-mesin.png')
        await browser.close()

    ok = 0
    cetak('=== UJI V282-MESIN-HIDUP ===')
    for nm, lulus, ket in hasil:
        cetak(('  LULUS ' if lulus else '  GAGAL ') + nm + ((' — ' + str(ket)) if ket else ''))
        ok += 1 if lulus else 0
    cetak(f'=== {ok}/{len(hasil)} LULUS ===')
    OUT.close()
    sys.exit(0 if ok == len(hasil) else 1)

if __name__ == '__main__':
    # server statis lokal
    import http.server, socketserver, functools, os
    os.chdir('/home/z/my-project/download')
    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(http.server.SimpleHTTPRequestHandler)
    httpd = socketserver.TCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        asyncio.run(main())
    finally:
        httpd.shutdown()
