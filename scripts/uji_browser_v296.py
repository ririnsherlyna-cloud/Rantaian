#!/usr/bin/env python3
# UJI BROWSER V296-ISTANA-TERAS-PARU-DUNIA — hidup.html + arena.html via http.server
# Mandat pemilik: (1) mobile tak ada yang terpotong/keluar pandangan; (2) tubuh utuh
# bergerak ke ruang lebih luas (patroli + lean); (3) akses internet nyata (paru-dunia);
# (4) tak mengganggu fungsi lama.
import json, subprocess, time, os, sys
from playwright.sync_api import sync_playwright

REPO = '/home/z/my-project/hidup_repo'
PORT = 8813
HASIL = {'pass': 0, 'fail': 0, 'rincian': []}
OUT = '/home/z/my-project/research'

def cek(nama, kondisi, bukti=''):
    status = 'LULUS' if kondisi else 'GAGAL'
    HASIL['pass' if kondisi else 'fail'] += 1
    HASIL['rincian'].append(f"[{status}] {nama} {('— ' + str(bukti)) if bukti else ''}")
    print(HASIL['rincian'][-1])

srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)], cwd=REPO,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)

Ukur = """(() => {
  const V = window.__v296 || window.__v295; if(!V) return {probe:false};
  const z = V.LAYOUT.zona, nodes = V.LAYOUT.nodes, br = V.LAYOUT.brankas||new Map();
  let luarZona=[], tabrak=[], luarNode=0, luarBrankas=0;
  const rects = z.map(x=>({dir:x.dir, x:x.rect.x, y:x.rect.y, w:x.rect.w, h:x.rect.h}));
  for(const r of rects) if(r.x<0||r.y<0||r.x+r.w>innerWidth+1||r.y+r.h>innerHeight+1) luarZona.push(r.dir);
  for(let i=0;i<rects.length;i++) for(let j=i+1;j<rects.length;j++){
    const a=rects[i], b=rects[j];
    if(!(a.x+a.w<b.x+2||b.x+b.w<a.x+2||a.y+a.h<b.y+2||b.y+b.h<a.y+2)) tabrak.push([a.dir,b.dir]);
  }
  for(const n of nodes.values()) if(n.x<0||n.y<0||n.x>innerWidth||n.y>innerHeight) luarNode++;
  for(const g of br.values()) if(g.x<0||g.y<0||g.x>innerWidth||g.y>innerHeight) luarBrankas++;
  const pintu={x0:innerWidth-54, y0:innerHeight-54};
  const bz=rects.find(r=>r.dir==='BRANKAS');
  const tabrakPintu = bz && !(bz.x+bz.w<pintu.x0||pintu.x0+54<bz.x||bz.y+bz.h<pintu.y0||pintu.y0+54<bz.y);
  const bz2=z.find(x=>x.dir==='BRANKAS');
  const brankasDalam = bz2 ? (bz2.rect.y+bz2.rect.h <= innerHeight-56) : false;
  return {probe:true, mode:V.mode(), layar:[innerWidth,innerHeight], nZona:z.length,
    luarZona, tabrak, luarNode, luarBrankas, tabrakPintu, brankasDalam,
    nNode:nodes.size, nBrankas:br.size, paruN:V.paru().n};
})()"""

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(args=['--use-gl=swiftshader'])
        # ============ MOBILE 360x740 (lantai tersulit) ============
        for (w, h, nm) in [(360, 740, 'hape-kecil'), (390, 844, 'iphone'), (412, 915, 'android'), (768, 900, 'tablet'), (1280, 800, 'desktop')]:
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1,
                                is_mobile=w < 800, has_touch=w < 800)
            pg = ctx.new_page()
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
            pg.wait_for_timeout(7000)
            d = pg.evaluate(Ukur)
            cek(f'{nm}: probe __v296', bool(d.get('probe')), d.get('mode'))
            cek(f'{nm}: 0 pageerror', len(errs) == 0, errs[:2])
            cek(f'{nm}: mode istana benar (hape=teras, lebar=lingkar)',
                d['mode'] == ('teras' if (w < 760 or h > w*1.15) else 'lingkar'), d['mode'])
            cek(f'{nm}: 9 ruangan', d['nZona'] == 9, d['nZona'])
            cek(f'{nm}: NOL ruangan keluar layar', len(d['luarZona']) == 0, d['luarZona'])
            cek(f'{nm}: NOL ruangan bertumpuk', len(d['tabrak']) == 0, d['tabrak'])
            cek(f'{nm}: NOL buku/harta keluar kanvas', d['luarNode'] == 0 and d['luarBrankas'] == 0,
                (d['luarNode'], d['luarBrankas']))
            cek(f'{nm}: BRANKAS tak ditimpa tombol +', not d['tabrakPintu'], d.get('brankasDalam'))
            cek(f'{nm}: BRANKAS utuh di atas zona tombol', d['brankasDalam'], (bz2y := d.get('brankasDalam')))
            pg.screenshot(path=f'{OUT}/v296-uji-{nm}.png')
            # overlay buka — lembaran bawah
            if w < 800:
                pg.click('#pintu'); pg.wait_for_timeout(800)
                ov = pg.evaluate("""(() => { const o=document.getElementById('overlay').getBoundingClientRect();
                  return {fit: o.width<=innerWidth+1 && o.height<=innerHeight+1, w:o.width}; })()""")
                cek(f'{nm}: overlay muat layar', ov['fit'], ov)
                pg.click('#pintu'); pg.wait_for_timeout(500)
            # tubuh baru tetap utuh
            tub = pg.evaluate("(() => { const N=(window.__v296||window.__v295).BOB; return {tangan:Array.isArray(N.tangan)&&N.tangan.length===2, tor:N.tornado&&typeof N.tornado.putar==='number', ruas:N.ruas}; })()")
            cek(f'{nm}: 2 lengan + tornado + tenaga', tub['tangan'] and tub['tor'] and tub['ruas'] >= 6, tub)
            # PATROLI + LEAN (gerak tubuh utuh)
            ger = pg.evaluate("""(async () => { const V=window.__v296||window.__v295, N=V.BOB;
              V.S.kerja.sibuk=false; V.S.kerja.target=null; N.idleAt=Date.now()-8000;
              const x0=N.x, y0=N.y; const t0=performance.now(); let leanMax=0;
              while(performance.now()-t0<2600){ leanMax=Math.max(leanMax, Math.abs(N.lean||0));
                await new Promise(r=>setTimeout(r,60)); }
              const jurnalAda=V.S.jurnal.some(j=>j.jenis==='PATROLI');
              return {pindah:Math.round(Math.hypot(N.x-x0,N.y-y0)), leanMax:Math.round(leanMax*1000)/1000, jurnalAda};
            })()""")
            cek(f'{nm}: PATROLI — tubuh utuh melintasi istana (>60px)', ger['pindah'] > 60, ger)
            cek(f'{nm}: jurnal PATROLI tercatat', ger['jurnalAda'])
            cek(f'{nm}: MERUNDUK (lean) terukur saat bergerak', ger['leanMax'] > 0.01, ger['leanMax'])
            ctx.close()
        # ============ PARU-DUNIA (butuh jaringan) ============
        ctx = b.new_context(viewport={'width': 1280, 'height': 800})
        pg = ctx.new_page()
        pg.add_init_script("""(() => { window.__extLS=[]; try{
          const si=localStorage.setItem.bind(localStorage), sr=localStorage.removeItem.bind(localStorage), sc=localStorage.clear.bind(localStorage);
          localStorage.setItem=(k,v)=>{ window.__extLS.push('+'+k); return si(k,v); };
          localStorage.removeItem=(k)=>{ window.__extLS.push('-'+k); return sr(k); };
          localStorage.clear=()=>{ window.__extLS.push('CLEAR'); return sc(); };
        }catch(e){} })()""")
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
        pg.wait_for_timeout(9000)
        paru = pg.evaluate("""(() => { const V=window.__v296; const P=V.paru();
          return {n:P.n, byte:P.byte, sumber:Object.keys(P.sumber||{}), blokAda:!!document.getElementById('pkParu')}; })()""")
        cek('PARU-DUNIA: napas internet tercatat (>2)', paru['n'] > 2, paru['n'])
        cek('PARU-DUNIA: sumur nyata tercatat', len(paru['sumber']) >= 1, paru['sumber'])
        cek('PARU-DUNIA: blok UI ada', paru['blokAda'])
        jam = pg.evaluate("(async () => { await (window.__v296, Promise.resolve()); const P=(window.__v296).paru(); return {waktu:P.waktu||0}; })()")
        # jam dunia diuji lewat pemanggilan eksplisit
        jam2 = pg.evaluate("""(async () => {
          const r = await fetch('https://data-api.binance.vision/api/v3/time', {cache:'no-store'}).then(x=>x.json()).catch(()=>null);
          return r && r.serverTime ? {ok:true, dt:Math.abs(r.serverTime-Date.now())} : {ok:false}; })()""")
        cek('PARU-DUNIA: jam dunia Binance terjangkau', jam2['ok'] and jam2['dt'] < 10000, jam2)
        # fungsi lama: klik brankas → perintah baca
        klik = pg.evaluate("""(() => { const V=window.__v296; const g=[...V.LAYOUT.brankas.values()][0]; if(!g) return null;
          return {path:g.path, x:g.x, y:g.y}; })()""")
        if klik and klik['x']:
            pg.mouse.click(klik['x'], klik['y']); pg.wait_for_timeout(400)
            ok = pg.evaluate(f"__v296.S.perintah==={json.dumps(klik['path'])} || __v296.S.petaPilih==={json.dumps(klik['path'])}")
            cek('FUNGSI LAMA: sentuh harta brankas → perintah baca', ok, klik['path'])
        # nol localStorage tulisan
        ls = pg.evaluate("window.__extLS ? __extLS.length : -1")
        cek('NOL-TULIS: halaman tak menulis localStorage', ls == 0, ls)
        ctx.close()
        # ============ ARENA mobile overflow ============
        ctx = b.new_context(viewport={'width': 360, 'height': 740}, is_mobile=True)
        pg = ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{PORT}/arena.html', wait_until='domcontentloaded')
        pg.wait_for_timeout(6000)
        ar = pg.evaluate("(() => ({sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}))()")
        cek('ARENA hape: NOL luber horizontal', ar['sw'] <= ar['cw'] + 1, (ar['sw'], ar['cw']))
        pg.screenshot(path=f'{OUT}/v296-uji-arena-hape.png')
        cek('ARENA: 0 pageerror', len(errs) == 0, errs[:2])
        ctx.close()
        b.close()
finally:
    srv.terminate()

print(f"\n=== HASIL: {HASIL['pass']} LULUS / {HASIL['fail']} GAGAL ===")
with open(f'{OUT}/v296-uji-hasil.json', 'w') as f:
    json.dump(HASIL, f, ensure_ascii=False, indent=1)
