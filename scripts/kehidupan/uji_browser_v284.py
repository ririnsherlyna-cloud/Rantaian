#!/usr/bin/env python3
# UJI BROWSER V284-PROTOLIFE — mobile 390x844 + desktop 1440x900, file:// lokal.
import asyncio, json, sys
from playwright.async_api import async_playwright

URL = 'file:///home/z/my-project/download/hidup.html'
hasil = {'lulus': 0, 'gagal': 0}
def uji(nama, kondisi, detail=''):
    if kondisi: hasil['lulus'] += 1; print('  LULUS ', nama)
    else: hasil['gagal'] += 1; print('  GAGAL ', nama, detail)

async def sorot(page, label):
    err = []
    page.on('pageerror', lambda e: err.append(str(e)))
    await page.goto(URL)
    await page.wait_for_timeout(3500)
    st = await page.evaluate('() => window.KEHIDUPAN ? KEHIDUPAN.state() : null')
    uji(f'[{label}] engine boot', st is not None)
    uji(f'[{label}] dunia berdenyut', st and st['tick'] > 50, f"tick={st and st['tick']}")
    # kanvas fit penuh: ukuran > 0 & dalam viewport
    box = await page.evaluate('''() => {
      const c = document.getElementById('dunia');
      const r = c.getBoundingClientRect();
      return {w: r.width, h: r.height, vw: innerWidth, vh: innerHeight};
    }''')
    uji(f'[{label}] kanvas terlihat', box['w'] > 100 and box['h'] > 100, json.dumps(box))
    uji(f'[{label}] kanvas tak melebihi viewport', box['w'] <= box['vw'] + 2 and box['h'] <= box['vh'] + 2, json.dumps(box))
    # teks di overlay DOM (terpisah dari kanvas)
    fase = await page.text_content('#tFase')
    uji(f'[{label}] fase tampil di overlay', fase and len(fase) > 3, str(fase))
    tg = await page.text_content('#tgNama')
    uji(f'[{label}] target kini tampil', tg and 'T' in tg, str(tg))
    # percepat 32x supaya fase MENCOBA & penemuan pertama tercapai dalam detik
    await page.click('.kecepatan button[data-v="32"]')
    await page.wait_for_timeout(4000)
    ev = await page.evaluate('''() => {
      const st = KEHIDUPAN.state();
      const kum = st.caps.length ? st.caps[0].evals : 0;
      return {kini: parseInt(document.getElementById('tgEval').textContent.replace(/\\./g,'')) || 0, kum: kum};
    }''')
    uji(f'[{label}] eval pencarian nyata tercatat', ev['kum'] > 0 or ev['kini'] > 0, json.dumps(ev))
    caps = await page.evaluate('''() => KEHIDUPAN.state().caps.length''')
    uji(f'[{label}] penemuan pertama terverifikasi', caps >= 1, f'caps={caps}')
    # tab TRAJEKTORI
    await page.click('.tab[data-isi="temuan"]')
    await page.wait_for_timeout(300)
    capsUI = await page.evaluate('''() => document.querySelectorAll('#capList .cap').length''')
    uji(f'[{label}] pohon kemampuan terisi', capsUI >= 1, f'capsUI={capsUI}')
    # panel mobile tak menutupi seluruh panggung
    if label == 'MOBILE':
        pan = await page.evaluate('''() => {
          const p = document.getElementById('panel');
          const r = p.getBoundingClientRect();
          return {h: r.height, vh: innerHeight};
        }''')
        uji('[MOBILE] panel <= 55% tinggi', pan['h'] <= pan['vh'] * 0.55, json.dumps(pan))
    # 4 detik lagi: dunia masih maju (hidup)
    t1 = st['tick']
    await page.wait_for_timeout(4000)
    t2 = await page.evaluate('() => KEHIDUPAN.state().tick')
    uji(f'[{label}] dunia terus maju', t2 > t1, f'{t1} -> {t2}')
    uji(f'[{label}] tanpa pageerror', len(err) == 0, '; '.join(err[:2]))
    return err

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        # MOBILE
        ctx = await br.new_context(viewport={'width': 390, 'height': 844},
                                   user_agent='Mozilla/5.0 (iPhone)', is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        await sorot(pg, 'MOBILE')
        await pg.screenshot(path='/home/z/my-project/research/hidup-v284-mobile.png')
        await ctx.close()
        # DESKTOP
        ctx2 = await br.new_context(viewport={'width': 1440, 'height': 900})
        pg2 = await ctx2.new_page()
        await sorot(pg2, 'DESKTOP')
        await pg2.screenshot(path='/home/z/my-project/research/hidup-v284-desktop.png')
        # speed 32x: dunia harus melaju lebih cepat
        await pg2.click('.kecepatan button[data-v="32"]')
        a = await pg2.evaluate('() => KEHIDUPAN.state().tick')
        await pg2.wait_for_timeout(3000)
        b = await pg2.evaluate('() => KEHIDUPAN.state().tick')
        uji('[DESKTOP] kecepatan 32x melaju', b - a > 500, f'delta={b-a}')
        # JEDA: dunia berhenti (kontrol jujur)
        await pg2.click('.kecepatan button[data-v="jeda"]')
        await pg2.wait_for_timeout(1200)
        c = await pg2.evaluate('() => KEHIDUPAN.state().tick')
        await pg2.wait_for_timeout(1500)
        d = await pg2.evaluate('() => KEHIDUPAN.state().tick')
        uji('[DESKTOP] jeda benar-benar menghentikan', c == d, f'{c} vs {d}')
        await pg2.screenshot(path='/home/z/my-project/research/hidup-v284-desktop-32x.png')
        await ctx2.close()
        await br.close()
    print(f"\nHASIL: {hasil['lulus']} lulus, {hasil['gagal']} gagal")
    sys.exit(1 if hasil['gagal'] else 0)

asyncio.run(main())
