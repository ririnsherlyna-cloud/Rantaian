#!/usr/bin/env python3
# UJI LIVE V289-BAITUL-ILMU — https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html
# Fokus: istana tertata, tab Guru (segel Sadar-1 v289 live), madrasah hidup,
# ujian kehidupan SAH di produksi, mobile fit, 0 pageerror.
import sys, time
from playwright.sync_api import sync_playwright

URL = 'https://ririnsherlyna-cloud.github.io/Micaprofita-/hidup.html'
HASIL = {'pass': 0, 'fail': 0, 'rincian': []}

def cek(nama, kondisi, bukti=''):
    status = 'LULUS' if kondisi else 'GAGAL'
    HASIL['pass' if kondisi else 'fail'] += 1
    HASIL['rincian'].append(f"[{status}] {nama} {('— ' + str(bukti)) if bukti else ''}")
    print(HASIL['rincian'][-1])

def jalankan(pw, w, h, label, sampai=26000):
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = browser.new_page(viewport={'width': w, 'height': h})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(URL + '?t=' + str(int(time.time() * 1000)), wait_until='domcontentloaded', timeout=45000)
    pg.wait_for_timeout(sampai)
    tag = label

    cek(f'{tag}: probe __v289 ada', pg.evaluate("!!window.__v289"))
    s1 = pg.evaluate("(() => { const k=__v289.S1.keadaan; return k?{v:k.versi, b:k.bangunKe, host:k.host&&k.host.nama}:null; })()")
    cek(f'{tag}: hidrasi ingatan resmi GitHub (v289)', s1 and 'v289' in str(s1.get('v')), s1)
    ist = pg.evaluate("""(() => { const V=__v289; const z=V.LAYOUT.zona, den=V.LAYOUT.den, ist=V.istana();
      const by={}; for(const x of z) by[x.dir]=x;
      return {n:z.length, den, ist, ot:by['otak'], mem:by['memori']}; })()""")
    cek(f'{tag}: 7 zona istana tertata', ist and ist['n'] == 7, ist and ist['n'])
    cek(f'{tag}: kubah pusat + gerbang simetris', ist and abs(ist['ot']['cx'] - ist['den']['x']) < 2 and abs(ist['mem']['cy'] - ist['den']['y']) < 2,
        ist and (round(ist['ot']['cx']), round(ist['den']['x'])))
    rak = pg.evaluate("""(() => { const V=__v289; const bb=V.bebasState();
      let luar=0, minD=1e9, rows={}; const ns=[...V.LAYOUT.nodes.values()];
      for(const n of ns){ if(n.x<bb.x-2||n.y<bb.y-2||n.x>bb.x+bb.w+2||n.y>bb.y+bb.h+2) luar++;
        const k=Math.round(n.y*2)/2; rows[k]=(rows[k]||0)+1; }
      for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++){
        const d=Math.hypot(ns[i].x-ns[j].x, ns[i].y-ns[j].y);
        if(ns[i].dir===ns[j].dir && d<minD) minD=d; }
      return {n:ns.length, luar, minD:Math.round(minD*10)/10, sejajar:Object.values(rows).filter(x=>x>=3).length}; })()""")
    cek(f'{tag}: rak buku — nol keluar kanvas, jarak min ≥5, barisan sejajar ≥4',
        rak['luar'] == 0 and rak['minD'] >= 5 and rak['sejajar'] >= 4, rak)
    gk = pg.evaluate("(() => { const g=__v289.guruKeadaan(); return {arah:g.arah, k:g.keyakinan, s:g.simbol||'', sumber:g.sumber||''}; })()")
    cek(f'{tag}: GURU arah jelas dari bukti', gk['arah'] in ('BELI', 'JUAL', 'TUNGGU') and 0 <= gk['k'] <= 92, gk)
    cek(f'{tag}: GURU bersumber segel Sadar-1 (dua sadari)', 'segel Sadar-1' in gk['sumber'], gk['sumber'])
    gv = pg.evaluate("document.getElementById('gvArah').innerText.slice(0,300)")
    cek(f'{tag}: tab Guru menampilkan arah+alasan ber-bukti', (gk['arah'] in gv) and ('momentum' in gv or 'EMA' in gv), gv[:100].replace('\n', ' '))
    md = pg.evaluate("(() => { const m=__v289.S.madrasah; return m?{j:m.jumlah, k:(m.kelas||[]).length}:null; })()")
    cek(f'{tag}: MADRASAH hidup (pelajaran berbukti dari GitHub)', md and md['j'] >= 5, md)
    alj = pg.evaluate("document.getElementById('gvAljabr').innerText.slice(0,120)")
    cek(f'{tag}: AL-JABR dipajang di tab Guru', 'kubah' in alj and 'θ' in alj, alj[:90].replace('\n', ' '))
    uj = pg.evaluate("(() => __v289.ujianState().map(x=>x.hasil))()")
    sahN = sum(1 for x in uj if x == 'SAH')
    cek(f'{tag}: UJIAN KEHIDUPAN ≥8 butir & mayoritas SAH (≥5)', len(uj) >= 8 and sahN >= 5, {'r': uj, 'sah': sahN})
    ls = pg.evaluate("(()=>{try{return localStorage.length}catch(e){return -1}})()")
    cek(f'{tag}: localStorage tetap NOL di produksi', ls == 0, ls)
    pg.screenshot(path=f'/home/z/my-project/research/v89-live-{label}.png')
    cek(f'{tag}: 0 pageerror', len(err) == 0, err[:2])
    browser.close()

with sync_playwright() as pw:
    srv_lbl = 'DESKTOP'
    jalankan(pw, 1280, 800, srv_lbl)
    # mobile
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = browser.new_page(viewport={'width': 390, 'height': 760})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(URL + '?m=' + str(int(time.time() * 1000)), wait_until='domcontentloaded', timeout=45000)
    pg.wait_for_timeout(22000)
    fit = pg.evaluate("""(() => { let luar=0; for(const n of __v289.LAYOUT.nodes.values()) if(n.x<2||n.y<2||n.x>388||n.y>758) luar++;
      return {luar, n:__v289.LAYOUT.nodes.size}; })()""")
    cek('MOBILE: semua buku dalam layar', fit['luar'] == 0, fit)
    gk = pg.evaluate("(()=>{const g=__v289.guruKeadaan(); return g.arah+' '+g.keyakinan+'%';})()")
    cek('MOBILE: tab guru terisi arah', any(x in gk for x in ['BELI', 'JUAL', 'TUNGGU']), gk)
    ov = pg.evaluate("(() => { const o=document.getElementById('overlay').getBoundingClientRect(); return Math.round(o.height); })()")
    cek('MOBILE: overlay lembaran bawah', 420 <= ov <= 580, ov)
    pg.evaluate("__v289.bukaOverlay()")
    pg.wait_for_timeout(800)
    pg.screenshot(path='/home/z/my-project/research/v89-live-MOBILE.png')
    cek('MOBILE: 0 pageerror', len(err) == 0, err[:2])
    browser.close()
    print(f"\n=== HASIL LIVE: {HASIL['pass']} LULUS / {HASIL['fail']} GAGAL ===")
    sys.exit(1 if HASIL['fail'] else 0)
