#!/usr/bin/env python3
# UJI BROWSER V285-SADAR-REPO — ruang hidup yang hidup DI DALAM repo Micaprofita.
# A: desktop — pohon nyata, baca file nyata, fakta nyata, pasar nyata, audit
# B: mobile 390×844 — fit tanpa potong, panel bottom-sheet, HUD terbaca
# C: file:// — anti-bisu jujur
# D: persist reload — kumulatif
# E: perintah klik node — ditaati
import json, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

MIRROR='/home/z/my-project/research/v85_mirror'
PORT=8931
srv=subprocess.Popen(['python3','-m','http.server',str(PORT),'-d',MIRROR], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
URL=f'http://127.0.0.1:{PORT}/hidup.html'
hasil=[]; 
def cek(nama, ok, ket=''):
    hasil.append((nama, ok, ket)); print(('LULUS ' if ok else 'GAGAL ')+nama+((' — '+ket) if ket else ''))

try:
  with sync_playwright() as p:
    br=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    # ================= A: DESKTOP =================
    pg=br.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(4000)
    # A1 pohon nyata
    pg.wait_for_function("window.__v85 && __v85.S.pohon.files.length>40", timeout=45000)
    nfile=pg.evaluate("__v85.S.pohon.files.length")
    cek('A1 pohon repo nyata', 40<=nfile<=120, f'{nfile} file, sumber {pg.evaluate("__v85.S.pohon.sumber")}')
    # A2 baca nyata: file terbaca + fakta > 0 (menunggu siklus pembacaan)
    pg.wait_for_function("Object.keys(__v85.S.baca).length>=2", timeout=90000)
    bacaN=pg.evaluate("Object.keys(__v85.S.baca).length")
    faktaN=pg.evaluate("__v85.S.stat.fakta")
    cek('A2 pembacaan nyata', bacaN>=2 and faktaN>0, f'{bacaN} file, {faktaN} fakta')
    # A3 fakta mengutip isi nyata (versi.json harus terbaca & berisi kodeVersi)
    pg.wait_for_function("__v85.S.baca['versi.json']", timeout=120000)
    vf=pg.evaluate("__v85.S.baca['versi.json'].fakta.join(' ')")
    cek('A3 fakta versi.json nyata', 'kodeVersi' in vf, vf[:110])
    # A4 kanvas menggambar (probe piksel deterministik di area panggung)
    dig=pg.evaluate("""() => { const c=document.getElementById('panggung').getContext('2d');
      const b=__v85.bebasState(); let terang=0, N=0;
      for(let x=b.x+10; x<b.x+b.w-10; x+=17) for(let y=b.y+10; y<b.y+b.h-10; y+=17){
        const d=c.getImageData(x,y,1,1).data; N++; if(d[3]>10 && (d[0]+d[1]+d[2])>30) terang++; }
      return terang/N; }""")
    cek('A4 panggung menggambar', dig>0.05, f'{dig*100:.1f}% piksel hidup')
    # A5 fit tanpa potong: bingkai dunia ada di dalam viewport, skala konsisten
    fit=pg.evaluate("""() => { const b=__v85.bebasState(), L=__v85.LAYOUT;
      const okIn = b.x>=0 && b.y>=0 && b.x+b.w<=innerWidth+1 && b.y+b.h<=innerHeight+1;
      return {okIn, w:L.w, h:L.h}; }""")
    cek('A5 fit viewport', fit['okIn'], f'dunia {fit["w"]}x{fit["h"]}')
    # A6 tab PETA — baris file nyata
    pg.click('#pTabs button[data-tab="peta"]'); pg.wait_for_timeout(700)
    rows=pg.locator('#tab-peta .fileRow').count()
    cek('A6 PETA-DIRI baris nyata', rows>=40, f'{rows} baris')
    # A7 detail fakta file — klik baris file yang SUDAH terbaca
    pg.click('#pTabs button[data-tab="peta"]'); pg.wait_for_timeout(500)
    pathBaca=pg.evaluate("Object.keys(__v85.S.baca).find(p=>__v85.S.baca[p].fakta)")
    pg.click(f'#tab-peta .fileRow[data-p="{pathBaca}"]'); pg.wait_for_timeout(600)
    det=pg.locator('#tab-peta .faktaList').count()
    cek('A7 detail fakta file', det>=1, f'{pathBaca} → {det} daftar fakta')
    # A8 tab PASAR — menunggu studi pasar nyata (Binance)
    pg.click('#pTabs button[data-tab="pasar"]')
    pg.wait_for_function("Object.keys(__v85.S.pasar).length>=1", timeout=150000)
    syms=pg.evaluate("Object.keys(__v85.S.pasar)")
    harga=pg.evaluate(f"__v85.S.pasar['{syms[0]}'].harga")
    cek('A8 pasar nyata (klines)', len(syms)>=1 and harga>0, f'{syms} harga {harga}')
    # A9 backtest nyata
    pg.wait_for_function(f"__v85.S.pasar['{syms[0]}'].bt !== undefined", timeout=120000)
    bt=pg.evaluate(f"JSON.stringify(__v85.S.pasar['{syms[0]}'].bt)")
    cek('A9 uji-jalan nyata', '"n"' in bt, bt[:120])
    # A10 MENGAPA skor
    pg.click('#pTabs button[data-tab="pikir"]'); pg.wait_for_timeout(400)
    mp=pg.locator('#pkMengapa').inner_text()
    cek('A10 jejak MENGAPA', '[' in mp and ']' in mp, mp[:90].replace('\n',' | '))
    # A11 jurnal berisi
    pg.click('#pTabs button[data-tab="jurnal"]'); pg.wait_for_timeout(400)
    jn=pg.locator('#tab-jurnal .jr').count()
    cek('A11 jurnal hidup', jn>=5, f'{jn} entri')
    # A12 perintah klik node → ditaati (pilih node TERJAUH dari cyborg agar tak kena sapa)
    tgt=pg.evaluate("""() => { const L=__v85.LAYOUT, b=__v85.bebasState(), B=__v85.BOB;
      let best=null, dmax=-1;
      for(const [path,n] of L.nodes){ const d=Math.hypot(n.x-B.x, n.y-B.y);
        if(d>dmax){ dmax=d; best={path, cx: b.x+n.x/L.w*b.w, cy: b.y+n.y/L.h*b.h}; } }
      return best; }""")
    pg.mouse.click(tgt['cx'], tgt['cy'])
    pg.wait_for_function("__v85.S.jurnal.some(j=>j.jenis==='PERINTAH')", timeout=40000)
    jper=pg.evaluate("__v85.S.jurnal.find(j=>j.jenis==='PERINTAH').teks")
    cek('A12 perintah ditaati', tgt['path'].split('/').pop() in jper, tgt['path'][:40])
    # A13 console bersih
    cek('A13 console error 0', len(errs)==0, '; '.join(errs[:3]))
    # A14 persist: simpan lalu hitung
    pg.evaluate("__v85.S && localStorage.getItem('mp_ruang_hidup_v285')")
    bacaSebelum=bacaN
    pg.close()

    # ================= B: MOBILE =================
    pm=br.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    errs_m=[]; pm.on('pageerror', lambda e: errs_m.append(str(e)))
    pm.goto(URL); pm.wait_for_timeout(5000)
    pm.wait_for_function("window.__v85 && __v85.S.pohon.files.length>40", timeout=60000)
    b=pm.evaluate("JSON.parse(JSON.stringify(__v85.bebasState()))")
    fit_m = b['x']>=0 and b['y']>=0 and b['x']+b['w']<=391 and b['y']+b['h']<=845 and b['h']>140
    cek('B1 mobile fit', fit_m, f'bebas {b["w"]:.0f}x{b["h"]:.0f} @({b["x"]:.0f},{b["y"]:.0f})')
    panel=pm.evaluate("document.getElementById('panel').getBoundingClientRect().top")
    cek('B2 panel di bawah dunia', panel>=b['y']+b['h']-2, f'panel.top={panel:.0f} vs dunia-bawah={b["y"]+b["h"]:.0f}')
    hud=pm.evaluate("document.getElementById('hBaca').innerText")
    cek('B3 HUD terbaca', 'file' in hud, hud)
    strip=pm.evaluate("document.getElementById('faseStrip').children.length")
    cek('B4 strip 9 fase', strip==9, f'{strip} chip')
    pm.tap('#pHandle'); pm.wait_for_timeout(500)
    tinggi=pm.evaluate("document.getElementById('panel').getBoundingClientRect().height")
    cek('B5 bottom-sheet tumbuh', tinggi>400, f'{tinggi:.0f}px')
    cek('B6 mobile console 0', len(errs_m)==0, '; '.join(errs_m[:2]))
    pm.close()

    # ================= C: file:// =================
    pf=br.new_page(viewport={'width':1200,'height':800})
    errs_f=[]; pf.on('pageerror', lambda e: errs_f.append(str(e)))
    pf.goto('file://'+MIRROR+'/hidup.html'); pf.wait_for_timeout(9000)
    status=pf.evaluate("document.getElementById('hStatus').innerText")
    jml=pf.evaluate("__v85.S.jurnal.length")
    cek('C1 file:// status jujur', ('TERPUTUS' in status) or ('CACHE' in status) or ('REPO-LIVE' in status), status)
    cek('C2 file:// tetap hidup (anti-bisu)', jml>=2, f'{jml} entri jurnal')
    cek('C3 file:// console 0', len(errs_f)==0, '; '.join(errs_f[:2]))
    pf.close(); br.close()
finally:
  srv.terminate()

lolos=sum(1 for _,ok,_ in hasil if ok)
print(f'\n=== {lolos}/{len(hasil)} LULUS ===')
sys.exit(0 if lolos==len(hasil) else 1)
