#!/usr/bin/env python3
# UJI LIVE V285-SADAR-REPO di GitHub Pages.
import sys, time
from playwright.sync_api import sync_playwright
URL='https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
hasil=[]
def cek(n, ok, k=''): hasil.append(ok); print(('LULUS ' if ok else 'GAGAL ')+n+((' — '+k) if k else ''))
with sync_playwright() as p:
    br=p.chromium.launch()
    pg=br.new_page(viewport={'width':1440,'height':900})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL)
    pg.wait_for_function("window.__v85 && __v85.S.pohon.files.length>40", timeout=90000)
    n=pg.evaluate("__v85.S.pohon.files.length")
    s=pg.evaluate("__v85.S.pohon.sumber")
    cek('L1 pohon repo live', n>40, f'{n} file via {s}')
    # pembacaan file asli dari raw/CDN
    pg.wait_for_function("Object.keys(__v85.S.baca).filter(k=>__v85.S.baca[k].fakta).length>=1", timeout=120000)
    baca=pg.evaluate("Object.keys(__v85.S.baca).filter(k=>__v85.S.baca[k].fakta)")
    cek('L2 membaca file repo nyata', len(baca)>=1, ', '.join(baca[:4]))
    # cermin same-origin arena-keadaan.json
    pg.wait_for_function("__v85.S.cermin.data && __v85.S.cermin.data.todayPicks", timeout=90000)
    pick=pg.evaluate("""(()=>{const m=(__v85.S.cermin.data.todayPicks||[]).find(x=>x.competitor==='MICAPROFITA');
      return m? m.symbol+' '+m.direction : 'kosong';})()""")
    cek('L3 cermin arena same-origin', pick!='', pick)
    # pasar nyata Binance
    pg.wait_for_function("Object.keys(__v85.S.pasar).length>=1", timeout=180000)
    syms=pg.evaluate("Object.keys(__v85.S.pasar)")
    cek('L4 pasar Binance nyata', len(syms)>=1, ', '.join(syms))
    # uji-jalan
    pg.wait_for_function("Object.values(__v85.S.pasar).some(p=>p.bt)", timeout=150000)
    bt=pg.evaluate("JSON.stringify(Object.values(__v85.S.pasar).find(p=>p.bt).bt)")
    cek('L5 uji-jalan nyata', '"n"' in bt, bt[:100])
    # audit pick (utilitas 55)
    try:
        pg.wait_for_function("Object.values(__v85.S.pasar).some(p=>p.audit)", timeout=240000)
        au=pg.evaluate("JSON.stringify(Object.values(__v85.S.pasar).find(p=>p.audit).audit)")
        cek('L6 audit pick vs momentum', 'vonis' in au, au[:110])
    except Exception as e:
        cek('L6 audit pick vs momentum', False, 'belum terpilih dalam 240 dtk')
    # status HUD jujur
    st=pg.evaluate("document.getElementById('hStatus').innerText")
    cek('L7 status jujur', 'REPO-LIVE' in st or 'CACHE' in st, st)
    # strip 9 fase + indeks
    strip=pg.evaluate("document.getElementById('faseStrip').children.length")
    cek('L8 strip 9 tahap', strip==9, f'{strip} chip')
    idx=pg.evaluate("document.getElementById('pkIndeks').innerText.split('\\n')[1]||''")
    cek('L9 indeks sadar-repo hidup', '/100' in pg.evaluate("document.getElementById('pkIndeks').innerText"), idx[:30])
    cek('L10 console bersih', len(errs)==0, '; '.join(errs[:2]))
    pg.screenshot(path='/home/z/my-project/research/v85-live.png')
    br.close()
print(f"=== {sum(hasil)}/{len(hasil)} LULUS ===")
sys.exit(0 if all(hasil) else 1)
