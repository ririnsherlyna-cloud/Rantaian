#!/usr/bin/env python3
# UJI BROWSER V287-NADI — RUANG HIDUP ditata ulang total:
#   A: makhluk NADI hidup + habitat terasering + panggung bersih + overlay tersembunyi
#   B: mobile 390×844 — fit, lembaran bawah, geser-tutup
#   C: 0 pageerror
import subprocess, sys, time, re, os, json
from playwright.sync_api import sync_playwright

URL = os.environ.get('UJI_URL', '')
LIVE = bool(URL)
MIRROR = '/home/z/my-project/hidup_repo'
PORT = 8943
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
    # ================= A: DESKTOP 1440×900 =================
    pg = br.new_page(viewport={'width': 1440, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(3000)

    # A1 hidrasi ingatan resmi S1 dari GitHub
    try:
        pg.wait_for_function("window.__v287 && __v287.S1.keadaan && __v287.S1.keadaan.bangunKe>=1", timeout=25000)
        cek('A1 hidrasi S1 dari GitHub', True, f"bangunKe={pg.evaluate('__v287.S1.keadaan.bangunKe')}")
    except Exception:
        cek('A1 hidrasi S1 dari GitHub', False, 'S1.keadaan tak terisi')

    # A2 PANGGUNG BERSIH: tanpa badge/panel/teks menempel; overlay tertutup; satu tombol samar
    bekas = pg.evaluate("document.querySelectorAll('#hud,#faseStrip,#panel,#pintuArena').length")
    ovBuka = pg.evaluate("document.getElementById('overlay').classList.contains('buka')")
    pintu = pg.evaluate("() => { const b=document.getElementById('pintu').getBoundingClientRect(); return b.width>30 && b.height>30 && getComputedStyle(document.getElementById('pintu')).opacity!=='0'; }")
    cek('A2 panggung 100% habitat (0 badge/panel, overlay tutup, tombol samar ada)',
        bekas==0 and (not ovBuka) and pintu, f'relik={bekas} overlayBuka={ovBuka} pintu={pintu}')

    # A3 pindai rumah live
    try:
        pg.wait_for_function("__v287.S.pohon.files.length>40 && __v287.S.pohon.live", timeout=45000)
        cek('A3 pindai repo live', True, f"{pg.evaluate('__v287.S.pohon.files.length')} file via {pg.evaluate('__v287.S.pohon.sumber')}")
    except Exception:
        cek('A3 pindai repo live', False, 'pohon tak terpindai')

    # A4 pasar dari ingatan S1
    psym = pg.evaluate("Object.keys(__v287.S.pasar)")
    oc = pg.evaluate("Object.values(__v287.S.pasar).filter(p=>p.oc&&p.oc.length>10).length")
    cek('A4 pasar dari ingatan S1', len(psym) >= 3 and oc >= 3, f'{psym}, oc lengkap: {oc}')

    # A5 TANPA localStorage
    ls = pg.evaluate("Object.keys(localStorage).filter(k=>k.indexOf('mp_')===0)")
    cek('A5 localStorage kosong', len(ls) == 0, str(ls))

    # A6 NADI hidup: bergerak + napas
    x1 = pg.evaluate("__v287.NADI.x"); y1 = pg.evaluate("__v287.NADI.y")
    pg.wait_for_timeout(2600)
    x2 = pg.evaluate("__v287.NADI.x"); y2 = pg.evaluate("__v287.NADI.y")
    jarak = ((x2-x1)**2 + (y2-y1)**2) ** 0.5
    napas = pg.evaluate("__v287.NADI.napas > 0")
    cek('A6 NADI bergerak & bernapas', jarak > 6 and napas, f'jarak {jarak:.1f}px, napas={napas}')

    # A7 habitat tertata: sel dalam batas, nol tumpang tindih, zona terpisah
    tata = pg.evaluate("""() => {
      const N=[...__v287.LAYOUT.nodes.values()]; const b=__v287.bebasState();
      let dalam=N.every(n=>n.x>=b.x-2 && n.x<=b.x+b.w+2 && n.y>=b.y-2 && n.y<=b.y+b.h+2);
      let minD=1e9;
      for(let i=0;i<N.length;i++) for(let j=i+1;j<N.length;j++){
        const d=Math.hypot(N[i].x-N[j].x, N[i].y-N[j].y); if(d<minD) minD=d; }
      return {dalam, minD: Math.round(minD*10)/10, zona: __v287.LAYOUT.zona.length, n: N.length};
    }""")
    cek('A7 habitat tertata (dalam batas + min jarak sel ≥8 + zona ada)',
        tata['dalam'] and tata['minD']>=8 and tata['zona']>=5, str(tata))

    # A8 sentuh makhluk → kaget + menyapa (gelembung sesaat)
    nx = pg.evaluate("__v287.NADI.x"); ny = pg.evaluate("__v287.NADI.y")
    pg.mouse.click(nx, ny); pg.wait_for_timeout(120)
    startle = pg.evaluate("__v287.NADI.startle > 0.5")
    pg.wait_for_timeout(600)
    sapaT = pg.evaluate("document.getElementById('sapa').classList.contains('tampak')")
    cek('A8 sentuh NADI → menyapa + kaget', sapaT and startle, f'sapa={sapaT} startle={startle}')
    pg.evaluate("document.getElementById('sapa').classList.remove('tampak')")

    # A9 sentuh sel file → NADI datang membaca (perilaku, bukan angka) — perintah ditaati
    sasaran = pg.evaluate("() => { const fs=[...__v287.S.pohon.files]; return (fs.find(f=>f.path.startsWith('laporan/'))||fs[0]).path; }")
    pg.evaluate("tgt => { window.__v287._tgt = tgt; __v287.S.perintah = tgt; }", sasaran)
    try:
        pg.wait_for_function("__v287.S.kerja.target === __v287._tgt", timeout=30000)
        cek('A9 sel disentuh → NADI membacanya', True, f"target={pg.evaluate('__v287.S.kerja.target')}")
    except Exception:
        cek('A9 sel disentuh → NADI membacanya', False, f'perintah tak ditaati 30 dtk (sasaran {sasaran})')

    # A10 overlay buka/tutup lewat tombol yang sama + tab berganti
    pg.click('#pintu'); pg.wait_for_timeout(650)
    buka = pg.evaluate("document.getElementById('overlay').classList.contains('buka')")
    tetap = pg.evaluate("__v287.NADI.x !== null && __v287.NADI.napas > 0")  # makhluk tetap bergerak di balik overlay
    pg.click('#pTabs button[data-tab="peta"]'); pg.wait_for_timeout(500)
    petaAda = pg.evaluate("document.getElementById('tab-peta').innerText.length > 50")
    pg.click('#pTabs button[data-tab="pikir"]'); pg.wait_for_timeout(300)
    pg.click('#pintu'); pg.wait_for_timeout(650)
    tutup = pg.evaluate("!document.getElementById('overlay').classList.contains('buka')")
    cek('A10 overlay: buka→tab→tutup via tombol sama, NADI tetap hidup',
        buka and tetap and petaAda and tutup, f'buka={buka} peta={petaAda} tutup={tutup}')

    # A11 status lewat perilaku: TIDAK BANGUN → redup + mata terpejam (simulasi keadaan, bukan teks)
    perilaku = pg.evaluate("""() => {
      const k=__v287.S1.keadaan; const simpan=k.waktu.selesai;
      k.waktu.selesai = new Date(Date.now()-70*60000).toISOString();   // usang → tidak bangun
      const m=__v287.keadaanTubuh();
      k.waktu.selesai = simpan;
      return m;
    }""")
    cek('A11 status via perilaku (TIDAK BANGUN → dim≤0.3)',
        perilaku['mode']=='tidak-bangun' and perilaku['dim']<=0.3, str(perilaku))

    # A12 kanvas menggambar
    dig = pg.evaluate("""() => { const c=document.getElementById('panggung').getContext('2d');
      const b=__v287.bebasState(); let terang=0, N=0;
      for(let x=b.x+10; x<b.x+b.w-10; x+=21) for(let y=b.y+10; y<b.y+b.h-10; y+=21){
        const d=c.getImageData(x,y,1,1).data; N++; if(d[3]>10 && (d[0]+d[1]+d[2])>24) terang++; }
      return terang/N; }""")
    cek('A12 kanvas menggambar habitat', dig > 0.04, f'{dig*100:.1f}% piksel menyala')

    # ================= B: MOBILE 390×844 =================
    pgm = br.new_page(viewport={'width': 390, 'height': 844})
    errsM = []; pgm.on('pageerror', lambda e: errsM.append(str(e)))
    pgm.goto(URL); pgm.wait_for_timeout(4500)
    fitM = pgm.evaluate("""() => { const N=[...__v287.LAYOUT.nodes.values()]; const b=__v287.bebasState();
      return N.every(n=>n.x>=b.x-2 && n.x<=b.x+b.w+2 && n.y>=b.y-2 && n.y<=b.y+b.h+2); }""")
    noScroll = pgm.evaluate("() => document.documentElement.scrollWidth<=391")
    cek('B1 mobile fit + tanpa scroll-x', fitM and noScroll, f'fit={fitM} noScrollX={noScroll}')
    # B2 overlay jadi lembaran bawah + geser ke bawah menutup
    pgm.click('#pintu'); pgm.wait_for_timeout(700)
    bukaM = pgm.evaluate("document.getElementById('overlay').classList.contains('buka')")
    boxM = pgm.evaluate("() => { const r=document.getElementById('overlay').getBoundingClientRect(); return r.height>300 && r.top>=0; }")
    # geser ke bawah dari handle
    pgm.evaluate("""() => { const h=document.getElementById('ovHandle'); const r=h.getBoundingClientRect();
      window.__y0=(r.top+r.height/2); }""")
    y0 = pgm.evaluate("window.__y0")
    pgm.mouse.move(195, y0); pgm.mouse.down()
    for i in range(1, 8): pgm.mouse.move(195, y0 + i*18, steps=2)
    pgm.mouse.up(); pgm.wait_for_timeout(700)
    tutupM = pgm.evaluate("!document.getElementById('overlay').classList.contains('buka')")
    cek('B2 lembaran bawah + geser-tutup', bukaM and boxM and tutupM, f'buka={bukaM} box={boxM} geserTutup={tutupM}')

    # ================= C: ERROR =================
    cek('C1 pageerror desktop=0', len(errs) == 0, '; '.join(errs[:3]))
    cek('C2 pageerror mobile=0', len(errsM) == 0, '; '.join(errsM[:3]))
    br.close()
finally:
  if srv: srv.terminate()

ok = all(o for _, o, _ in hasil)
print(f"\nTOTAL: {sum(1 for _,o,_ in hasil if o)}/{len(hasil)} LULUS")
sys.exit(0 if ok else 1)
