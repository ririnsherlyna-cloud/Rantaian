#!/usr/bin/env python3
# UJI BROWSER V286-DUA-SADARI — hidup.html kini punya DUA sadar:
#   SADAR-1: ingatan resmi dihidrasi dari GitHub (ruang-hidup/*.json via commit)
#   SADAR-2: mata interaktif (pindai/baca/pasar live)
# Kunci yang diuji:
#   A desktop: hidrasi S1 (bangunKe/kromosom/penemuan), tanpa localStorage,
#              S2 tetap hidup (pindai+baca), pasar dari ingatan S1, ·S1 di peta
#   B mobile : fit, panel, chip S1
#   C        : 0 pageerror
import subprocess, sys, time, re, os
from playwright.sync_api import sync_playwright

URL = os.environ.get('UJI_URL', '')
LIVE = bool(URL)
MIRROR = '/home/z/my-project/hidup_repo'
PORT = 8942
srv = None if LIVE else subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '-d', MIRROR],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
URL = URL or f'http://127.0.0.1:{PORT}/hidup.html'
print('TARGET:', URL)
hasil = []
def cek(nama, ok, ket=''):
    hasil.append((nama, ok, ket)); print(('LULUS ' if ok else 'GAGAL ') + nama + ((' — ' + ket) if ket else ''))

try:
  with sync_playwright() as p:
    br = p.chromium.launch()
    # ================= A: DESKTOP =================
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(2500)

    # A1 hidrasi ingatan resmi dari GitHub → S1.keadaan terisi
    try:
        pg.wait_for_function("window.__v286 && __v286.S1.keadaan && __v286.S1.keadaan.bangunKe>=1", timeout=25000)
        bk = pg.evaluate("__v286.S1.keadaan.bangunKe")
        cek('A1 hidrasi S1 dari GitHub', True, f'bangunKe={bk}, sumber={pg.evaluate("__v286.S1.sumber")}')
    except Exception:
        cek('A1 hidrasi S1 dari GitHub', False, 'S1.keadaan tak terisi (gerbang GitHub gagal?)')

    # A2 chip HUD S1
    chip = pg.locator('#hS1').inner_text()
    cek('A2 chip HUD S1', bool(re.search(r'S1 bangun ke-\d+', chip)), chip)

    # A3 panel PIKIRAN memuat tubuh otonom (host + kromosom + bukti)
    pk = pg.locator('#pkS1').inner_text()
    ok3 = ('GitHub Actions' in pk or 'host' in pk) and 'kromosom' in pk.lower()
    cek('A3 panel Sadar-1', ok3, pk[:120].replace('\n', ' | '))

    # A4 jurnal menurunkan peristiwa S1
    jrn = pg.locator('#tab-jurnal').inner_text() if False else pg.evaluate("(() => { document.querySelector('#pTabs button[data-tab=jurnal]').click(); return document.getElementById('tab-jurnal').innerText; })()")
    pg.click('#pTabs button[data-tab="pikir"]')
    cek('A4 jurnal peristiwa S1', 'S1' in jrn and 'BANGUN' in jrn.upper(), (jrn[:90]).replace('\n', ' | '))

    # A5 TANPA localStorage — hukum pemilik
    ls = pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('mp_ruang')===0)")
    cek('A5 localStorage kosong', len(ls) == 0, str(ls))

    # A6 S2 tetap hidup: pindai rumah live (pohon nyata dari jaringan)
    try:
        pg.wait_for_function("__v286.S.pohon.files.length>40 && __v286.S.pohon.live", timeout=45000)
        cek('A6 S2 hidup: pindai repo live', True, f"{pg.evaluate('__v286.S.pohon.files.length')} file via {pg.evaluate('__v286.S.pohon.sumber')}")
    except Exception:
        cek('A6 S2 hidup: pindai repo live', False, 'pohon tak terpindai')

    # A7 pasar dari ingatan S1 tersedia sebelum S2 bekerja
    psym = pg.evaluate("Object.keys(__v286.S.pasar)")
    oc = pg.evaluate("Object.values(__v286.S.pasar).filter(p=>p.oc&&p.oc.length>10).length")
    cek('A7 pasar dari ingatan S1', len(psym) >= 3 and oc >= 3, f'{psym}, oc lengkap: {oc}')

    # A8 umur hidup = kelahiran dari GitHub (bukan sesi browser)
    umur = pg.locator('#hUmur').inner_text()
    cek('A8 umur hidup dari kelahiran GitHub', 'umur' in umur and umur != '—', umur)

    # A9 kanvas menggambar + fit
    pg.wait_for_timeout(1200)
    dig = pg.evaluate("""() => { const c=document.getElementById('panggung').getContext('2d');
      const b=__v286.bebasState(); let terang=0, N=0;
      for(let x=b.x+10; x<b.x+b.w-10; x+=19) for(let y=b.y+10; y<b.y+b.h-10; y+=19){
        const d=c.getImageData(x,y,1,1).data; N++; if(d[3]>10 && (d[0]+d[1]+d[2])>30) terang++; }
      return terang/N; }""")
    fit = pg.evaluate("() => { const b=__v286.bebasState(); return b.x>=0 && b.y>=0 && b.x+b.w<=innerWidth+1 && b.y+b.h<=innerHeight+1; }")
    cek('A9 panggung menggambar + fit', dig > 0.05 and fit, f'{dig*100:.1f}% piksel, fit={fit}')

    # A10 peta menandai bacaan resmi S1 (·S1)
    pg.click('#pTabs button[data-tab="peta"]'); pg.wait_for_timeout(800)
    peta = pg.locator('#tab-peta').inner_text()
    cek('A10 peta menandai ·S1', '·S1' in peta, f"{pg.evaluate('Object.keys(__v286.S.baca).filter(p=>__v286.S.baca[p].s1).length')} bacaan resmi S1")
    pg.click('#pTabs button[data-tab="pikir"]')

    # ================= B: MOBILE 390×844 =================
    pgm = br.new_page(viewport={'width': 390, 'height': 844})
    errsM = []; pgm.on('pageerror', lambda e: errsM.append(str(e)))
    pgm.goto(URL); pgm.wait_for_timeout(4000)
    fitM = pgm.evaluate("() => { const b=__v286.bebasState(); return b.x>=0 && b.y>=0 && b.x+b.w<=innerWidth+1 && b.y+b.h<=innerHeight+1; }")
    panelM = pgm.evaluate("() => { const p=document.getElementById('panel').getBoundingClientRect(); return p.height>200 && p.top>=0; }")
    noScroll = pgm.evaluate("() => document.documentElement.scrollWidth<=391")
    s1M = pgm.evaluate("() => !!__v286.S1.keadaan")
    cek('B1 mobile fit + panel + tanpa scroll-x + S1', fitM and panelM and noScroll and s1M,
        f'fit={fitM} panel={panelM} noScrollX={noScroll} S1={s1M}')

    # ================= C: ERROR =================
    cek('C1 pageerror desktop=0', len(errs) == 0, '; '.join(errs[:3]))
    cek('C2 pageerror mobile=0', len(errsM) == 0, '; '.join(errsM[:3]))
    br.close()
finally:
  if srv: srv.terminate()

ok = all(o for _, o, _ in hasil)
print(f"\nTOTAL: {sum(1 for _,o,_ in hasil if o)}/{len(hasil)} LULUS")
sys.exit(0 if ok else 1)
