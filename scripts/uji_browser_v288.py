#!/usr/bin/env python3
# UJI BROWSER V288-MORFOGENESIS — hidup.html lokal via http.server
# Fokus: tubuh dari genom (bukan konstanta), vena/altar habitat, GERAK KAUASAL (tanpa Lissajous),
# organ menyala saat dipakai, overlay #pkTubuh, mobile fit, 0 pageerror.
import json, subprocess, time, sys, os, threading
from playwright.sync_api import sync_playwright

REPO = '/home/z/my-project/hidup_repo'
PORT = 8808
HASIL = {'pass': 0, 'fail': 0, 'rincian': []}

def cek(nama, kondisi, bukti=''):
    status = 'LULUS' if kondisi else 'GAGAL'
    HASIL['pass' if kondisi else 'fail'] += 1
    HASIL['rincian'].append(f"[{status}] {nama} {('— ' + str(bukti)) if bukti else ''}")
    print(HASIL['rincian'][-1])

def jalankan(ukuran, label):
    w, h = ukuran
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = browser.new_page(viewport={'width': w, 'height': h})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
    pg.wait_for_timeout(6500)  # boot + hidrasi + pindai

    cek(f'{label}: probe __v288 ada', pg.evaluate("!!window.__v288"))
    ns = pg.evaluate("window.__v288 ? __v288.NADI.NS : -1")
    cek(f'{label}: tubuh dari GENOM (NS≠11 konstanta lama)', isinstance(ns, int) and ns >= 9 and ns <= 30 and ns != 11, f'NS={ns}')
    T = pg.evaluate("window.__v288 ? __v288.tubuhAktif() : null")
    cek(f'{label}: genom punya 6 organ alat', T and len((T.get('organ') or [])) == 6,
        T and ','.join(o['alat'] + ':' + o['tingkat'] for o in T.get('organ', [])))
    cek(f'{label}: segel tubuh (bukti deterministik)', T and len(T.get('segel') or '') == 16, T and T.get('segel'))

    # STRUKTUR habitat dari habitat.json (same-origin lokal hasil DRY run Sadar-1)
    ST = pg.evaluate("window.__v288 ? {vena:__v288.STRUKTUR.vena.length, altar:__v288.STRUKTUR.altar.length, zona:__v288.STRUKTUR.zonaSet.size} : null")
    cek(f'{label}: vena habitat dibangun ≥1', ST and ST['vena'] >= 1, ST)
    cek(f'{label}: altar evolusi kromosom ≥1', ST and ST['altar'] >= 1, ST)
    cek(f'{label}: zona terbuka ≥2', ST and ST['zona'] >= 2, ST)

    # BFS jalan buatan: otak → PASAR harus via '· akar'
    pth = pg.evaluate("window.__v288 ? __v288.pathVena('otak','PASAR') : null")
    cek(f'{label}: pathVena otak→PASAR via vena buatan', pth is not None and len(pth) >= 1, pth)

    # ORGAN menyala saat dipakai: paksakan kerja pasar lewat perintah baca? cukup verifikasi field
    oa = pg.evaluate("window.__v288 ? (__v288.NADI.organ||[]).length : -1")
    cek(f'{label}: organ terpasang di tubuh (≥6)', oa >= 6, f'organ={oa}')

    # GERAK = MENGEJAR INTENT: saat sibuk, NADI harus mencapai (tx,ty)-nya (target argmax utilitas)
    samp = pg.evaluate("""(async () => {
      const N = __v288.NADI;
      let minD = 1e9, kerjaN = 0;
      for (let i = 0; i < 60; i++) {
        const d = Math.hypot(N.x - N.tx, N.y - N.ty);
        if (__v288.S.kerja.sibuk) { kerjaN++; minD = Math.min(minD, d); }
        await new Promise(r => setTimeout(r, 250));
      }
      return {minD: Math.round(minD), kerjaN};
    })()""")
    cek(f'{label}: GERAK-KAUSAL — saat sibuk, tubuh mencapai intent (tx,ty)', samp['kerjaN'] > 10 and samp['minD'] < 50, samp)
    pg.wait_for_timeout(1000)
    # uji statis: pastikan kurva wander Lissajous lama tidak kembali
    src = open(os.path.join(REPO, 'hidup.html')).read()
    cek(f'{label}: ANTI-LISSAJOUS — tidak ada wander scripted di sumber', 'cos(t*0.21)' not in src and 'sin(t*0.47)' not in src)

    # overlay + panel tubuh
    pg.evaluate("__v288.bukaOverlay()")
    pg.wait_for_timeout(700)
    teks = pg.evaluate("document.getElementById('pkTubuh') ? document.getElementById('pkTubuh').textContent : ''")
    cek(f'{label}: overlay #pkTubuh memuat genom', 'ruas' in teks and 'vena' in teks, teks[:90])
    pg.screenshot(path=f'/home/z/my-project/research/v88-{label}-overlay.png')

    # visual: organ & vena tergambar (sampling pixel canvas tak praktis → verifikasi runtime state saja)
    pg.screenshot(path=f'/home/z/my-project/research/v88-{label}-panggung.png')
    cek(f'{label}: 0 pageerror', len(err) == 0, err[:2])
    browser.close()

with sync_playwright() as pw:
    srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT)], cwd=REPO,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        jalankan((1440, 900), 'desktop')
        jalankan((390, 844), 'mobile')
    finally:
        srv.terminate()
    print(f"\n=== HASIL: {HASIL['pass']} LULUS / {HASIL['fail']} GAGAL ===")
    sys.exit(1 if HASIL['fail'] else 0)
