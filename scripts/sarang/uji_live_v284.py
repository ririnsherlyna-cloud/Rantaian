#!/usr/bin/env python3
# UJI LIVE V284-PROTOLIFE — https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html
import asyncio, json, sys
from playwright.async_api import async_playwright

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
hasil = {'lulus': 0, 'gagal': 0}
def uji(nama, kondisi, detail=''):
    if kondisi: hasil['lulus'] += 1; print('  LULUS ', nama)
    else: hasil['gagal'] += 1; print('  GAGAL ', nama, detail)

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        ctx = await br.new_context(viewport={'width': 1280, 'height': 860})
        pg = await ctx.new_page()
        err = []
        pg.on('pageerror', lambda e: err.append(str(e)))
        await pg.goto(URL, wait_until='domcontentloaded')
        await pg.wait_for_timeout(5000)
        st = await pg.evaluate('() => window.KEHIDUPAN ? KEHIDUPAN.state() : null')
        uji('engine hidup di Pages', st is not None)
        uji('dunia berdenyut', st and st['tick'] > 30, f"tick={st and st['tick']}")
        chip = await pg.text_content('#chipPasar')
        uji('mode pasar terdeteksi', chip and ('PASAR-LIVE' in chip or 'MANDIRI' in chip), str(chip))
        if st:
            print('   chip =', chip, '| byte pasar =', await pg.text_content('#pasarBytes'))
            print('   caps =', [c['id'] + ':' + c['nama'] for c in st['caps']])
            print('   target kini =', st['target']['id'], st['target']['nama'], '| eval =', st['sintesis']['evals'])
        # percepat + tunggu penemuan
        await pg.click('.kecepatan button[data-v="32"]')
        await pg.wait_for_timeout(5000)
        st2 = await pg.evaluate('() => KEHIDUPAN.state()')
        uji('penemuan terverifikasi di live', st2['caps'] and len(st2['caps']) >= 1, f"caps={len(st2['caps'])}")
        uji('bukti eval nyata tersimpan', st2['caps'] and st2['caps'][0]['evals'] > 0)
        uji('jurnal dunia terisi', len(st2['log']) > 3, f"log={len(st2['log'])}")
        uji('tanpa pageerror', len(err) == 0, '; '.join(err[:2]))
        await pg.screenshot(path='/home/z/my-project/research/hidup-v284-live.png', full_page=False)
        await br.close()
    print(f"\nHASIL: {hasil['lulus']} lulus, {hasil['gagal']} gagal")
    sys.exit(1 if hasil['gagal'] else 0)

asyncio.run(main())
