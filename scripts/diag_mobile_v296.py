#!/usr/bin/env python3
# DIAGNOSA MOBILE V296 — lihat LIVE hidup.html & arena.html seperti di hape pengguna.
# Screenshot + ukur: zona di luar layar, zona bertumpuk, tabrakan dengan tombol pintu,
# posisi NADI, teks label keluar kanvas.
import json, os, time
from playwright.sync_api import sync_playwright

OUT = '/home/z/my-project/research'
os.makedirs(OUT, exist_ok=True)
LIVE = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
ARENA = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/arena.html'
HASIL = []

def ukur_hidup(pg, label, w, h):
    d = pg.evaluate("""(() => {
      const V = window.__v295 || window.__v289; if(!V) return {probe:false};
      const bebas = V.bebasState();
      const z = V.LAYOUT.zona, nodes = V.LAYOUT.nodes, br = V.LAYOUT.brankas||new Map();
      let luarZona=[], tabrak=[], luarNode=0;
      const rects = z.map(x=>({dir:x.dir, x:x.rect.x, y:x.rect.y, w:x.rect.w, h:x.rect.h, cx:x.cx, cy:x.cy}));
      for(const r of rects){
        if(r.x < 0 || r.y < 0 || r.x+r.w > innerWidth+1 || r.y+r.h > innerHeight+1)
          luarZona.push({dir:r.dir, kanan:r.x+r.w-innerWidth, bawah:r.y+r.h-innerHeight});
      }
      for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++){
        const a=rects[i], b=rects[j];
        if(!(a.x+a.w<b.x+2||b.x+b.w<a.x+2||a.y+a.h<b.y+2||b.y+b.h<a.y+2)) tabrak.push([a.dir,b.dir]);
      }
      for(const n of nodes.values()) if(n.x<0||n.y<0||n.x>innerWidth||n.y>innerHeight) luarNode++;
      for(const g of br.values()) if(g.x<0||g.y<0||g.x>innerWidth||g.y>innerHeight) luarNode++;
      // tombol pintu (40px, right 14 bottom 14) vs BRANKAS
      const pintu = {x0:innerWidth-14-40, y0:innerHeight-14-40};
      const bz = rects.find(r=>r.dir==='BRANKAS');
      const tabrakPintu = bz && !(bz.x+bz.w<pintu.x0||pintu.x0+40<bz.x||bz.y+bz.h<pintu.y0||pintu.y0+40<bz.y);
      const D = (V.istana()||{}).D || 0;
      return {probe:true, layar:[innerWidth,innerHeight], D, bebas,
        luarZona, tabrak, luarNode, tabrakPintu: !!tabrakPintu,
        nZona: z.length, nNode: nodes.size, nBrankas: br.size,
        nadi:{x:Math.round(V.BOB.x), y:Math.round(V.BOB.y)},
        pond: V.LAYOUT.pond ? {x:Math.round(V.LAYOUT.pond.x), y:Math.round(V.LAYOUT.pond.y), w:Math.round(V.LAYOUT.pond.w), h:Math.round(V.LAYOUT.pond.h)} : null};
    })()""")
    HASIL.append({label: d})
    print(label, json.dumps(d, ensure_ascii=False))
    return d

with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--use-gl=swiftshader'])
    # ==== HIDUP di 3 viewport hape umum ====
    for (w, h, nm) in [(360, 740, 'hape-kecil'), (390, 844, 'iphone'), (412, 915, 'android-besar'), (768, 900, 'tablet')]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        try:
            pg.goto(LIVE, wait_until='domcontentloaded', timeout=45000)
        except Exception as e:
            print(nm, 'GOTO GAGAL', e); continue
        pg.wait_for_timeout(9000)
        d = ukur_hidup(pg, f'HIDUP {nm} {w}x{h} (overlay tutup)', w, h)
        pg.screenshot(path=f'{OUT}/v296-hidup-{nm}.png')
        # buka overlay → cek lembaran bawah
        pg.click('#pintu'); pg.wait_for_timeout(900)
        pg.screenshot(path=f'{OUT}/v296-hidup-{nm}-overlay.png')
        ov = pg.evaluate("""(() => { const o=document.getElementById('overlay'); const r=o.getBoundingClientRect();
          const isi=document.getElementById('pIsi');
          return {rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],
            isiScroll: isi.scrollWidth>isi.clientWidth+1, scrollW:isi.scrollWidth, clientW:isi.clientWidth}; })()""")
        HASIL.append({f'HIDUP {nm} overlay': ov}); print(nm, 'overlay', json.dumps(ov))
        if errs: HASIL.append({f'HIDUP {nm} pageerror': errs[:3]}); print(nm, 'PAGEERROR', errs[:3])
        ctx.close()
    # ==== ARENA di hape kecil ====
    ctx = b.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    try:
        pg.goto(ARENA, wait_until='domcontentloaded', timeout=45000)
        pg.wait_for_timeout(9000)
        ar = pg.evaluate("""(() => {
          const doc=document.documentElement;
          return {scrollW:doc.scrollWidth, clientW:doc.clientWidth, overflowX: doc.scrollWidth>doc.clientWidth+1,
            layar:[innerWidth,innerHeight]}; })()""")
        HASIL.append({'ARENA hape-kecil': ar}); print('ARENA', json.dumps(ar))
        pg.screenshot(path=f'{OUT}/v296-arena-hape.png', full_page=False)
        pg.screenshot(path=f'{OUT}/v296-arena-hape-full.png', full_page=True)
        if errs: HASIL.append({'ARENA pageerror': errs[:3]}); print('ARENA PAGEERROR', errs[:3])
    except Exception as e:
        print('ARENA GAGAL', e)
    ctx.close()
    b.close()

with open(f'{OUT}/v296-diag.json', 'w') as f:
    json.dump(HASIL, f, ensure_ascii=False, indent=1)
print('\n=== RINGKAS ===')
for x in HASIL:
    print(json.dumps(x, ensure_ascii=False)[:400])
