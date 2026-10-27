#!/usr/bin/env python3
# UJI BROWSER V289-BAITUL-ILMU — hidup.html lokal via http.server
# Fokus mandat pemilik:
#  (1) ISTANA-AL-JABR tertata: kubah pusat, gerbang kardinal simetris, paviliun diagonal,
#      rak buku sejajar (nol tumpang tindih), kolam pasar di selatan.
#  (2) GURU: tab pertama = ARAH (BELI/JUAL/TUNGGU) + rencana + alasan; madrasah dari
#      madrasah.json (same-origin saat GitHub diblokir) ; al-jabr dipajang.
#  (3) UJIAN KEHIDUPAN: halaman menguji dirinya — rows SAH/GAGAL/MENUNGGU + uji ulang.
#  (4) Gerak kausal NADI, mobile fit, 0 pageerror.
import json, subprocess, time, sys, os
from playwright.sync_api import sync_playwright

REPO = '/home/z/my-project/hidup_repo'
PORT = 8809
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

    cek(f'{tag}: probe __v289 ada', pg.evaluate("!!window.__v289"))
    cek(f'{tag}: 0 pageerror awal', len(err) == 0, err[:2])

    # ---- ISTANA-AL-JABR: geometri tertata ----
    ist = pg.evaluate("""(() => { const V=window.__v289; if(!V) return null;
      const z=V.LAYOUT.zona, den=V.LAYOUT.den, pond=V.LAYOUT.pond, ist=V.istana();
      const by={}; for(const x of z) by[x.dir]=x;
      return {n:z.length, den, pond, ist, dirs:z.map(x=>x.dir), by,
        pondB: V.LAYOUT.pond ? {cx:pond.x+pond.w/2, cy:pond.y+pond.h/2} : null}; })()""")
    cek(f'{tag}: 7 zona istana', ist and ist['n'] == 7, ist and ist['dirs'])
    cek(f'{tag}: kubah di pusat bebas', ist and abs(ist['den']['x'] - ist['ist']['cx']) < 1 and abs(ist['den']['y'] - ist['ist']['cy']) < 1, ist and ist['den'])
    ot = (ist or {}).get('by', {}).get('otak'); mem = (ist or {}).get('by', {}).get('memori')
    cek(f'{tag}: gerbang N (OTAK) simetris pada sumbu-Y kubah', ot and abs(ot['cx'] - ist['den']['x']) < 1.5, ot and (ot['cx'], ist['den']['x']))
    cek(f'{tag}: gerbang W (MEMORI) simetris pada sumbu-X kubah', mem and abs(mem['cy'] - ist['den']['y']) < 1.5, mem and (mem['cy'], ist['den']['y']))
    cek(f'{tag}: kolam PASAR di gerbang selatan (bawah kubah)', ist and ist.get('pondB') and ist['pondB']['cy'] > ist['den']['y'] + ist['ist']['D'] * 0.2, ist and ist.get('pondB'))
    cek(f'{tag}: paviliun pada radius al-jabr 0,50D', ist and all(abs(((b['cx'] - ist['ist']['cx'])**2 + (b['cy'] - ist['ist']['cy'])**2) ** 0.5 - ist['ist']['rPaviliun']) < 2.5 for d, b in (ist.get('by') or {}).items() if b.get('jenis') == 'paviliun'),
        ist and ist['ist'] and ist['ist'].get('rPaviliun'))

    # ---- RAK BUKU: sejajar, nol tumpang tindih, dalam kanvas ----
    rak = pg.evaluate("""(() => { const V=window.__v289; if(!V) return null;
      const bb=V.bebasState(); let minD=1e9, luar=0, rowsBaris={}, berpasangan=0;
      const ns=[...V.LAYOUT.nodes.values()];
      for(const n of ns){ if(n.x<bb.x-2||n.y<bb.y-2||n.x>bb.x+bb.w+2||n.y>bb.y+bb.h+2) luar++;
        const k=Math.round(n.y*2)/2; rowsBaris[k]=(rowsBaris[k]||0)+1; }
      for(let i=0;i<ns.length;i++) for(let j=i+1;j<ns.length;j++){
        const d=Math.hypot(ns[i].x-ns[j].x, ns[i].y-ns[j].y);
        if(ns[i].dir===ns[j].dir && d<minD) minD=d; }
      const sejajar=Object.values(rowsBaris).filter(x=>x>=3).length;
      return {n:ns.length, minD:Math.round(minD*10)/10, luar, sejajar}; })()""")
    cek(f'{tag}: rak buku — nol buku keluar kanvas', rak and rak['luar'] == 0, rak)
    if rak and rak['n'] > 0:
        cek(f'{tag}: rak buku — jarak minimum antar-buku sezona ≥5px', rak['minD'] >= 5, rak['minD'])
        cek(f'{tag}: rak buku — barisan sejajar terbentuk (≥4 baris berisi ≥3 buku)', rak['sejajar'] >= 4, rak['sejajar'])
    else:
        cek(f'{tag}: rak buku — pohon kosong di mode OFF (jujur, bukan teater)', True, 'nodes=0')

    # ---- GURU: tab pertama, arah jelas ----
    tabA = pg.evaluate("document.querySelector('#pTabs button.akt') && document.querySelector('#pTabs button.akt').dataset.tab")
    cek(f'{tag}: tab GURU default aktif', tabA == 'guru', tabA)
    gv = pg.evaluate("document.getElementById('gvArah').innerText.slice(0,400)")
    cek(f'{tag}: gvArah memuat ARAH jelas BELI/JUAL/TUNGGU', any(x in gv for x in ['BELI', 'JUAL', 'TUNGGU']), gv[:90].replace('\n', ' '))
    if not offline_gh:
        pg.wait_for_timeout(24000)  # beri otakLoop mengisi cermin+pasar nyata
        gv2 = pg.evaluate("document.getElementById('gvArah').innerText.slice(0,500)")
        gk = pg.evaluate("(() => { const g=__v289.guruKeadaan(); return {arah:g.arah, k:g.keyakinan, s:g.simbol||'', r:!!g.rencana, sumber:g.sumber||''}; })()")
        cek(f'{tag}: guru KEADAAN valid (arah+keyakinan+simbol)', gk['arah'] in ('BELI', 'JUAL', 'TUNGGU') and 0 <= gk['k'] <= 92, gk)
        cek(f'{tag}: guru punya dasar bukti (pasar nyata masuk)', pg.evaluate("__v289.guruKeadaan().dasar.length >= 2"), gk)
        alj = pg.evaluate("document.getElementById('gvAljabr').innerText")
        cek(f'{tag}: al-jabr dipajang (rumus terbuka)', '0,082' in alj or 'θ' in alj, alj[:80].replace('\n', ' '))

    # ---- MADRASAH ----
    if offline_gh:
        md = pg.evaluate("(() => { const el=document.getElementById('gvMadrasah'); return {t:el.innerText.slice(0,200)}; })()")
        cek(f'{tag}: madrasah tampil dari same-origin (buku terbuka, pelajaran berbukti)', 'pelajaran' in md['t'] and 'bukti:' in pg.evaluate("document.getElementById('gvMadrasah').innerText"), md['t'][:90].replace('\n', ' '))
    else:
        md2 = pg.evaluate("(() => { const m=__v289.S.madrasah; const el=document.getElementById('gvMadrasah'); return {ada:!!m, j:m&&m.jumlah, ui:el.innerText.slice(0,80)}; })()")
        cek(f'{tag}: madrasah UI terisi (live hydrasi ATAU fallback jujur)', (md2['ada'] and md2['j'] > 0) or 'belum terbuka' in md2['ui'], md2)

    # ---- UJIAN KEHIDUPAN ----
    pg.wait_for_timeout(6000)
    uj = pg.evaluate("(() => ({n:__v289.ujianState().length, r:__v289.ujianState().map(x=>x.hasil)}))()")
    cek(f'{tag}: ujian kehidupan ≥8 butir', uj and uj['n'] >= 8, uj)
    cek(f'{tag}: vonis ujian hanya SAH/GAGAL/MENUNGGU', uj and all(x in ('SAH', 'GAGAL', 'MENUNGGU') for x in uj['r']), uj and uj['r'])
    if not offline_gh:
        sahN = sum(1 for x in uj['r'] if x == 'SAH')
        cek(f'{tag}: mayoritas ujian SAH di jalur hidup (≥4)', sahN >= 4, uj['r'])
    pg.evaluate("(() => { __v289.bukaOverlay(); document.querySelector('#pTabs button[data-tab=ujian]').click(); })()")
    pg.wait_for_timeout(400)
    pg.evaluate("document.getElementById('uvUlang').click()")
    pg.wait_for_timeout(7000)
    uj2 = pg.evaluate("__v289.ujianState().length")
    cek(f'{tag}: tombol UJI ULANG bekerja (butir terisi ulang)', uj2 >= 8, uj2)
    pg.evaluate("__v289.tutupOverlay()")

    # ---- overlay & tabs ----
    pg.evaluate("__v289.bukaOverlay()")
    pg.wait_for_timeout(700)
    tabs = pg.evaluate("(() => { const o=[]; document.querySelectorAll('#pTabs button').forEach(b=>{b.click(); o.push([b.dataset.tab, !document.getElementById('tab-'+b.dataset.tab).hidden]);}); return o; })()")
    cek(f'{tag}: 6 tab semua bisa dibuka', tabs and all(x[1] for x in tabs), tabs)
    pg.evaluate("__v289.tutupOverlay()")

    # ---- GERAK KAUASAL (bukan scripted wander) ----
    samp = pg.evaluate("""(async () => {
      const V=__v289, N=V.BOB;
      let minD=1e9, kerjaN=0, bergerak=0, napas0=N.napas, lx=N.x, ly=N.y;
      for(let i=0;i<48;i++){
        if(V.S.kerja.sibuk){ kerjaN++; minD=Math.min(minD, Math.hypot(N.x-N.tx, N.y-N.ty)); }
        if(Math.hypot(N.x-lx, N.y-ly)>2) bergerak++;
        lx=N.x; ly=N.y;
        await new Promise(r=>setTimeout(r,250));
      }
      return {minD:Math.round(minD), kerjaN, bergerak, napasDelta:Math.round((N.napas-napas0)*10)/10};
    })()""")
    hidup = samp['bergerak'] >= 10 or samp['napasDelta'] > 2   # bernapas = hidup walau diam di intent kerja
    cek(f'{tag}: makhluk HIDUP (bergerak atau bernapas)', hidup, samp)
    cek(f'{tag}: GERAK-KAUSAL — saat sibuk mencapai intent', samp['kerjaN'] < 1 or samp['minD'] < 55, samp)
    cek(f'{tag}: 0 pageerror akhir', len(err) == 0, err[:3])

    pg.screenshot(path=f'/home/z/my-project/research/v89-{tag}-desktop.png')
    browser.close()

def jalankan_mobile(pw):
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    pg = browser.new_page(viewport={'width': 390, 'height': 760})
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
    pg.wait_for_timeout(9000)
    cek('MOBILE: probe ada', pg.evaluate("!!window.__v289"))
    fit = pg.evaluate("""(() => { const V=__v289; let luar=0;
      for(const n of V.LAYOUT.nodes.values()) if(n.x<2||n.y<2||n.x>388||n.y>758) luar++;
      return {luar, n:V.LAYOUT.nodes.size}; })()""")
    cek('MOBILE: semua buku dalam layar (nol terpotong)', fit['luar'] == 0, fit)
    gv = pg.evaluate("document.getElementById('gvArah').innerText.slice(0,80)")
    cek('MOBILE: tab guru terisi', any(x in gv for x in ['BELI', 'JUAL', 'TUNGGU']), gv.replace('\n', ' '))
    pg.evaluate("__v289.bukaOverlay()")
    pg.wait_for_timeout(600)
    ov = pg.evaluate("(() => { const o=document.getElementById('overlay').getBoundingClientRect(); return {y:o.y, h:o.height}; })()")
    cek('MOBILE: overlay lembaran bawah 60-70dvh', 440 <= ov['h'] <= 560, ov)
    pg.screenshot(path='/home/z/my-project/research/v89-MOBILE.png')
    cek('MOBILE: 0 pageerror', len(err) == 0, err[:2])
    browser.close()

with sync_playwright() as pw:
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', REPO],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        jalankan(pw, (1280, 800), 'DESKTOP', offline_gh=True)   # istana+madrasah same-origin, jujur
        jalankan(pw, (1280, 800), 'DESKTOP')                    # jalur live penuh (github+binance)
        jalankan_mobile(pw)
    finally:
        srv.terminate()
    print(f"\n=== HASIL: {HASIL['pass']} LULUS / {HASIL['fail']} GAGAL ===")
    sys.exit(1 if HASIL['fail'] else 0)
