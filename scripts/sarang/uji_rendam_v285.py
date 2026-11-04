#!/usr/bin/env python3
# UJI RENDAM V285 — kemajuan kumulatif, audit, persist, tangkapan layar.
import subprocess, sys, time
from playwright.sync_api import sync_playwright
MIRROR='/home/z/my-project/research/v85_mirror'
srv=subprocess.Popen(['python3','-m','http.server','8934','-d',MIRROR], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
hasil=[]
def cek(n, ok, k=''): hasil.append(ok); print(('LULUS ' if ok else 'GAGAL ')+n+((' — '+k) if k else ''))
try:
  with sync_playwright() as p:
    br=p.chromium.launch()
    pg=br.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8934/hidup.html')
    pg.wait_for_function("window.__v85 && __v85.S.pohon.files.length>40", timeout=60000)
    # rendam 3 menit
    for i in range(3):
        pg.wait_for_timeout(60000)
        b=pg.evaluate("Object.keys(__v85.S.baca).filter(k=>__v85.S.baca[k].fakta).length")
        f=pg.evaluate("__v85.S.stat.fakta")
        ps=pg.evaluate("Object.keys(__v85.S.pasar).length")
        print(f'  menit {i+1}: terbaca={b}/54, fakta={f}, simbol={ps}')
    b1=pg.evaluate("Object.keys(__v85.S.baca).filter(k=>__v85.S.baca[k].fakta).length")
    cek('S1 kemajuan membaca kumulatif', b1>=6, f'{b1} file dalam 3 menit')
    jk=pg.evaluate("__v85.S.jurnal.map(j=>j.jenis)")
    dup=pg.evaluate("""() => { const b=__v85.S.jurnal.filter(j=>j.jenis==='BACA').map(j=>j.teks);
      return b.length - new Set(b).size; }""")
    cek('S2 tanpa loop baca-berulang', dup<=2, f'duplikat={dup}')
    naudit=jk.count('AUDIT')
    cek('S3 audit pick tercatat atau tertunda jujur', 'AUDIT' in jk or 'CERMIN' in jk, f'{naudit} audit')
    bt=pg.evaluate("Object.values(__v85.S.pasar).filter(p=>p.bt).length")
    cek('S4 uji-jalan pasar', bt>=1, f'{bt} simbol terbacktest')
    # persist reload
    bacaSebelum=b1
    pg.reload(); pg.wait_for_function("window.__v85 && __v85.S.pohon.files.length>40", timeout=60000)
    pg.wait_for_timeout(3000)
    bacaSesudah=pg.evaluate("Object.keys(__v85.S.baca).filter(k=>__v85.S.baca[k].fakta).length")
    cek('S5 persist lintas reload', bacaSesudah>=bacaSebelum, f'{bacaSebelum} → {bacaSesudah} (repo bisa berubah di antara)')
    # sapa
    bob=pg.evaluate("(b=>({x:b.x+ ( __v85.BOB.x/__v85.LAYOUT.w)*b.w, y:b.y+(__v85.BOB.y/__v85.LAYOUT.h)*b.h}))(__v85.bebasState())")
    pg.mouse.click(bob['x'], bob['y']); pg.wait_for_timeout(700)
    sapa=pg.evaluate("!document.getElementById('sapa').hidden")
    cek('S6 sapa saat disentuh', sapa, 'gelembung tampil')
    pg.screenshot(path='/home/z/my-project/research/v85-desktop.png')
    cek('S7 console bersih 3 menit', len(errs)==0, '; '.join(errs[:2]))
    br.close()
finally: srv.terminate()
print(f"=== {sum(hasil)}/{len(hasil)} LULUS ===")
sys.exit(0 if all(hasil) else 1)
