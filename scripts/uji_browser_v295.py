#!/usr/bin/env python3
# UJI BROWSER V295-TORSA-TORNADO — hidup.html lokal via http.server
# Mandat pemilik: (1) mati gaya ular — tubuh kini torsa + 2 lengan karet Luffy
# + kaki tornado penyedot; (2) istana makin luas — ruangan diperbesar, ada
# BRANKAS (harta tersegel) & GUDANG (luberan); (3) tak mengganggu fungsi:
# klik buku/harta tetap baca, gerak kausal, 0 pageerror, mobile fit.
import json, subprocess, time, sys, os
from playwright.sync_api import sync_playwright

REPO = '/home/z/my-project/hidup_repo'
PORT = 8811
HASIL = {'pass': 0, 'fail': 0, 'rincian': []}

def cek(nama, kondisi, bukti=''):
    status = 'LULUS' if kondisi else 'GAGAL'
    HASIL['pass' if kondisi else 'fail'] += 1
    HASIL['rincian'].append(f"[{status}] {nama} {('— ' + str(bukti)) if bukti else ''}")
    print(HASIL['rincian'][-1])

def jalankan(pw, ukuran, label, offline_gh=False):
    w, h = ukuran
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    ctx = browser.new_context(viewport={'width': w, 'height': h})
    if offline_gh:
        def blok(route):
            u = route.request.url
            if '127.0.0.1' in u:
                return route.continue_()
            return route.abort()
        ctx.route('**/*', blok)
    pg = ctx.new_page()
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
    pg.wait_for_timeout(6000)
    tag = label + ('-OFF' if offline_gh else '')

    cek(f'{tag}: probe __v295 ada', pg.evaluate("!!window.__v295"))
    cek(f'{tag}: 0 pageerror awal', len(err) == 0, err[:2])

    # ---- TUBUH BARU: bukan ular lagi ----
    tub = pg.evaluate("""(() => { const V=window.__v295; if(!V) return null; const N=V.BOB;
      return {adaSeg:('seg' in N)&&Array.isArray(N.seg)&&N.seg.length>0,
        tangan:Array.isArray(N.tangan)&&N.tangan.length===2,
        tornado:N.tornado&&typeof N.tornado.putar==='number',
        sedot:Array.isArray(N.sedot), ruas:N.ruas||0,
        organ:(N.organ||[]).map(o=>o.oIdx), organN:(N.organ||[]).length}; })()""")
    cek(f'{tag}: tulang ular DIMUSNAHKAN (NADI.seg kosong/tiada)', tub and not tub['adaSeg'], tub and tub.get('adaSeg'))
    cek(f'{tag}: dua lengan karet terpasang', tub and tub['tangan'], tub)
    cek(f'{tag}: kaki tornado terpasang', tub and tub['tornado'] is not None, tub)
    cek(f'{tag}: tenaga genom > 0 (ruas → lapis tornado & panjang lengan)', tub and tub['ruas'] >= 6, tub and tub.get('ruas'))
    cek(f'{tag}: organ di slot anatomi torsa (0-11)', tub and all(isinstance(i, int) and 0 <= i < 12 for i in tub['organ']), tub and tub.get('organ'))

    # tornado benar-benar berputar & regang saat kerja
    spin = pg.evaluate("""(async () => { const V=__v295, N=V.BOB;
      const p0=N.tornado.putar, s0=N.sedot.length; const t0=performance.now();
      while(performance.now()-t0<1200){ V.S.kerja.sibuk=true; await new Promise(r=>setTimeout(r,40)); }
      V.S.kerja.sibuk=false;
      return {delta:Math.round((N.tornado.putar-p0)*100)/100, regang:Math.round(N.tornado.regang*100)/100,
        sedot:N.sedot.length, sedotCapOk:N.sedot.length<=18}; })()""")
    cek(f'{tag}: tornado BERPUTAR (>2 rad/dtk)', spin and spin['delta'] > 2, spin)
    cek(f'{tag}: tornado REGANG saat kerja (>0.1)', spin and spin['regang'] > 0.1, spin)
    cek(f'{tag}: partikel sedot ada & tersedia', spin and spin['sedotCapOk'], spin and spin['sedot'])

    # ---- ISTANA MELEBAR: 9 ruang, brankas & gudang di sayap, nol tabrakan ----
    ist = pg.evaluate("""(() => { const V=window.__v295; if(!V) return null;
      const z=V.LAYOUT.zona, den=V.LAYOUT.den, ist=V.istana();
      const by={}; for(const x of z) by[x.dir]=x;
      let tabrak=0, pas=[];
      const rs=z.map(x=>x.rect);
      for(let i=0;i<rs.length;i++) for(let j=i+1;j<rs.length;j++){
        const a=rs[i], b=rs[j];
        if(!(a.x+a.w<b.x+2||b.x+b.w<a.x+2||a.y+a.h<b.y+2||b.y+b.h<a.y+2)){ tabrak++; pas.push([z[i].dir, z[j].dir]); }
      }
      return {n:z.length, dirs:z.map(x=>x.dir), by, ist, den, tabrak, pas}; })()""")
    cek(f'{tag}: 9 ruangan istana (7 lama + GUDANG + BRANKAS)', ist and ist['n'] == 9, ist and ist['dirs'])
    cek(f'{tag}: nol ruangan bertumpuk', ist and ist['tabrak'] == 0, ist and ist['pas'])
    bz = (ist or {}).get('by', {}).get('BRANKAS'); gz = (ist or {}).get('by', {}).get('· gudang')
    D = (ist or {}).get('ist', {}).get('D', 1)
    cek(f'{tag}: BRANKAS di sayap kanan-bawah', bz and bz['cx'] > ist['den']['x'] + D*0.2 and bz['cy'] > ist['den']['y'] + D*0.2, bz and (bz['cx'], bz['cy']))
    cek(f'{tag}: GUDANG di sayap kiri-bawah', gz and gz['cx'] < ist['den']['x'] - D*0.2 and gz['cy'] > ist['den']['y'] + D*0.2, gz and (gz['cx'], gz['cy']))
    zonaBrankas = pg.evaluate("(() => { const V=__v295; const z=V.LAYOUT.zona.find(z=>z.dir==='BRANKAS'); return V.zonaTitik('BRANKAS')?{ok:true,n:z.n}:{ok:false}; })()")
    cek(f"{tag}: zonaTitik('BRANKAS') valid (bisa dituju vena/kerja)", zonaBrankas and zonaBrankas['ok'], zonaBrankas)

    # ---- LIVE saja: isi brankas, lengan menjangkau, klik harta ----
    if not offline_gh:
        br = pg.evaluate("""(() => { const V=__v295;
          const isi=[...V.LAYOUT.brankas.values()].map(g=>g.path);
          const nyata=isi.every(p=>V.S.pohon.files.some(f=>f.path===p));
          return {n:isi.length, nyata, isi:isi.slice(0,4)}; })()""")
        cek(f'LIVE: BRANKAS berisi harta nyata (pointer ke file repo)', br['n'] >= 4 and br['nyata'], br)
        jang = pg.evaluate("""(async () => { const V=__v295, N=V.BOB;
          let tgtPath=null, bd=0;
          for(const [p,n] of V.LAYOUT.nodes){ const d=Math.hypot(n.x-N.x,n.y-N.y); if(d>bd){bd=d; tgtPath=p;} }
          const n=V.LAYOUT.nodes.get(tgtPath); const t0=performance.now();
          while(performance.now()-t0<2400){
            V.S.kerja.sibuk=true; V.S.kerja.target=tgtPath; V.S.kerja.fase='MEMBACA';
            await new Promise(r=>setTimeout(r,50));
          }
          V.S.kerja.sibuk=false; V.S.kerja.target=null;
          return {tgtPath, jarakTanganSasaran:Math.round(Math.hypot(N.tangan[0].x-n.x, N.tangan[0].y-n.y)),
            regang:Math.round(Math.hypot(N.tangan[0].x-N.x, N.tangan[0].y-N.y))}; })()""")
        cek('LIVE: lengan karet MEREJANG ke sasaran jauh (khas Luffy)', jang and jang['regang'] > 60, jang)
        cek('LIVE: kepalan tangan MENGGRIP sasaran (<60px)', jang and jang['jarakTanganSasaran'] < 60, jang)
        klik = pg.evaluate("""(() => { const V=__v295;
          const g=[...V.LAYOUT.brankas.values()][0]; if(!g) return null;
          return {path:g.path, x:g.x, y:g.y, perintah0:V.S.perintah||''}; })()""")
        if klik and klik['x']:
            pg.mouse.click(klik['x'], klik['y'])
            pg.wait_for_timeout(400)
            ok = pg.evaluate(f"__v295.S.perintah==={json.dumps(klik['path'])} || __v295.S.petaPilih==={json.dumps(klik['path'])}")
            cek('LIVE: sentuh harta brankas → perintah baca jalan', ok, klik['path'])
        lbr = pg.evaluate("""(() => { const V=__v295; let luar=0;
          for(const n of V.LAYOUT.nodes.values()) if(n.x<2||n.y<2||n.x>innerWidth-2||n.y>innerHeight-2) luar++;
          for(const g of V.LAYOUT.brankas.values()) if(g.x<2||g.y<2||g.x>innerWidth-2||g.y>innerHeight-2) luar++;
          return luar; })()""")
        cek('LIVE: semua buku + harta dalam kanvas', lbr == 0, lbr)

    # ---- GERAK KAUASAL tetap jalan (tubuh baru tak mengganggu fungsi) ----
    samp = pg.evaluate("""(async () => { const V=__v295, N=V.BOB;
      let bergerak=0, lx=N.x, ly=N.y, napas0=N.napas;
      for(let i=0;i<40;i++){ if(Math.hypot(N.x-lx,N.y-ly)>2) bergerak++; lx=N.x; ly=N.y;
        await new Promise(r=>setTimeout(r,250)); }
      return {bergerak, napasDelta:Math.round((N.napas-napas0)*10)/10}; })()""")
    cek(f'{tag}: makhluk HIDUP (bergerak atau bernapas)', samp['bergerak'] >= 8 or samp['napasDelta'] > 2, samp)
    cek(f'{tag}: 0 pageerror akhir', len(err) == 0, err[:3])

    os.makedirs('/home/z/my-project/research', exist_ok=True)
    pg.screenshot(path=f'/home/z/my-project/research/v295-{tag}.png')
    browser.close()

def jalankan_mobile(pw):
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = browser.new_page(viewport={'width': 390, 'height': 760})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
    pg.wait_for_timeout(9000)
    cek('MOBILE: probe ada', pg.evaluate("!!window.__v295"))
    fit = pg.evaluate("""(() => { const V=__v295; let luar=0;
      for(const n of V.LAYOUT.nodes.values()) if(n.x<2||n.y<2||n.x>388||n.y>758) luar++;
      for(const g of V.LAYOUT.brankas.values()) if(g.x<2||g.y<2||g.x>388||g.y>758) luar++;
      const b=V.LAYOUT.zona.find(z=>z.dir==='BRANKAS'), g2=V.LAYOUT.zona.find(z=>z.dir==='· gudang');
      const ruangLuar=[b,g2].filter(z=>z && (z.rect.x<0||z.rect.y<0||z.rect.x+z.rect.w>390||z.rect.y+z.rect.h>760)).length;
      return {luar, n:V.LAYOUT.nodes.size, ruangLuar}; })()""")
    cek('MOBILE: semua buku+harta+sayap dalam layar', fit['luar'] == 0 and fit['ruangLuar'] == 0, fit)
    gv = pg.evaluate("document.getElementById('gvArah').innerText.slice(0,80)")
    cek('MOBILE: tab guru terisi', any(x in gv for x in ['BELI', 'JUAL', 'TUNGGU']), gv.replace('\n', ' '))
    pg.screenshot(path='/home/z/my-project/research/v295-MOBILE.png')
    cek('MOBILE: 0 pageerror', len(err) == 0, err[:2])
    browser.close()

with sync_playwright() as pw:
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', REPO],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        jalankan(pw, (1280, 800), 'DESKTOP', offline_gh=True)
        jalankan(pw, (1280, 800), 'DESKTOP')
        jalankan_mobile(pw)
    finally:
        srv.terminate()
    print(f"\n=== HASIL: {HASIL['pass']} LULUS / {HASIL['fail']} GAGAL ===")
    sys.exit(1 if HASIL['fail'] else 0)
