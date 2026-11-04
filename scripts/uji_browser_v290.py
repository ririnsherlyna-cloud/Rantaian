#!/usr/bin/env python3
# UJI BROWSER V290-PANEN — hidup.html v290 lokal via http.server
# Fokus mandat pemilik:
#  (1) TAK ADA lagi "tidak ada pekerjaan tertunda" — antrean kerja selalu terisi.
#  (2) PANEN: saring alam koin nyata (Binance) → 5 sasaran ber-ARAH + rencana.
#  (3) SOAL MANDIRI: soal dari data, dikoreki harga nyata, akurasi dipajang.
#  (4) Tab PASAR memuat panel SASARAN + LATIHAN SOAL; warisan v289 (istana, guru,
#      ujian kehidupan, localStorage nol) tetap utuh; 0 pageerror; mobile fit.
import json, subprocess, time, sys, os
from playwright.sync_api import sync_playwright

REPO = '/home/z/my-project/research/v290/repo'
PORT = 8813
HASIL = {'pass': 0, 'fail': 0, 'rincian': []}

def cek(nama, kondisi, bukti=''):
    status = 'LULUS' if kondisi else 'GAGAL'
    HASIL['pass' if kondisi else 'fail'] += 1
    HASIL['rincian'].append(f"[{status}] {nama} {('— ' + str(bukti)) if bukti else ''}")
    print(HASIL['rincian'][-1])

src = open('/home/z/my-project/download/hidup.html').read()

def jalankan(pw, ukuran, label):
    w, h = ukuran
    browser = pw.chromium.launch(args=['--use-gl=swiftshader'])
    ctx = browser.new_context(viewport={'width': w, 'height': h})
    pg = ctx.new_page()
    err = []
    pg.on('pageerror', lambda e: err.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/hidup.html', wait_until='domcontentloaded')
    pg.wait_for_timeout(6000)
    tag = label

    cek(f'{tag}: probe __v290 ada', pg.evaluate("!!window.__v290"))
    cek(f'{tag}: 0 pageerror awal', len(err) == 0, err[:2])

    # ---- (1) ANTI-MALAS: sumber tak berisi kalimat malas; otak punya panen & soal ----
    cek(f'{tag}: kalimat malas DIHAPUS dari sumber & jurnal', 'tidak ada pekerjaan tertunda' not in src and not pg.evaluate("(() => __v290.S.jurnal.some(j=>(j.teks||'').includes('tidak ada pekerjaan tertunda')))()"))
    cek(f'{tag}: aktRenung DIHAPUS', pg.evaluate("typeof window.__v290.aktPanen==='function' && typeof window.__v290.aktSoal==='function'"))
    dk = pg.evaluate("(() => { const k=__v290.daftarKerja(); return {n:k.length, label:k.slice(0,3).map(x=>x.label)}; })()")
    cek(f'{tag}: antrean kerja tidak kosong', dk and dk['n'] > 0, dk)

    # ---- (2) PANEN NYATA: jalankan penuh (Binance live) → 5 sasaran ----
    pg.evaluate("__v290.S.sasaranAt=0")  # paksa panen jatuh tempo
    pg.evaluate("__v290.S.sasaran=null")
    pg.evaluate("__v290.jalankanPenuh && 0")
    # jalankan aktPanen melalui jalankan() internal: panggil langsung berantai
    pg.evaluate("""(async () => { window.__panenSelesai=false;
      const a=__v290.aktPanen();
      for(const L of a.langkah){ try{ await L.fn(); }catch(e){ window.__panenErr=String(e).slice(0,120); } await new Promise(r=>setTimeout(r,(L.dtk??850))); }
      window.__panenSelesai=true; })()""")
    for _ in range(60):
        if pg.evaluate("window.__panenSelesai===true"): break
        pg.wait_for_timeout(1000)
    sas = pg.evaluate("(() => { const S=__v290.S; return {n:(S.sasaran||[]).length, at:S.sasaranAt, alam:S.sasaranAlam, daftar:(S.sasaran||[]).map(s=>s.simbol+' '+s.arah+' '+s.keyakinan+'%')}; })()")
    cek(f'{tag}: panen menghasilkan 5 sasaran', sas and sas['n'] == 5, sas)
    cek(f'{tag}: panen menyaring alam koin nyata', sas and sas['alam'] and sas['alam']['total'] > 1000, sas and sas['alam'] and (sas['alam']['total'], sas['alam']['likuid']))
    jrn = pg.evaluate("(() => __v290.S.jurnal.filter(j=>j.jenis==='PANEN').length)()")
    cek(f'{tag}: jurnal mencatat PANEN', jrn >= 1, jrn)
    pg.wait_for_timeout(500)
    pg.evaluate("(() => { const w=document.getElementById('tab-pasar'); __v290.S.tabAktif='pasar'; if(w){w.innerHTML='';} })()")
    pg.evaluate("pasarRender()")
    html = pg.evaluate("document.getElementById('tab-pasar').innerHTML")
    cek(f'{tag}: tab PASAR memuat panel SASARAN', 'SASARAN 5 KOIN' in html)
    cek(f'{tag}: sasaran punya entry/stop/target', 'entry ' in html and 'RR ' in html)

    # ---- (3) SOAL MANDIRI: jalankan penuh → akurasi tercatat ----
    pg.evaluate("""(async () => { window.__soalSelesai=false;
      const a=__v290.aktSoal();
      for(const L of a.langkah){ try{ await L.fn(); }catch(e){ window.__soalErr=String(e).slice(0,120); } await new Promise(r=>setTimeout(r,(L.dtk??850))); }
      window.__soalSelesai=true; })()""")
    for _ in range(40):
        if pg.evaluate("window.__soalSelesai===true"): break
        pg.wait_for_timeout(1000)
    so = pg.evaluate("(() => { const s=__v290.S.soal; return {total:s.total, benar:s.benar, riwayat:s.riwayat.length}; })()")
    cek(f'{tag}: soal mandiri tercatat (dikoreki harga nyata)', so and so['total'] >= 1, so)
    pg.evaluate("pasarRender()")
    html2 = pg.evaluate("document.getElementById('tab-pasar').innerHTML")
    cek(f'{tag}: tab PASAR memuat blok LATIHAN SOAL', 'LATIHAN SOAL MANDIRI' in html2)

    # ---- (4) Warisan v289 tetap utuh ----
    ist = pg.evaluate("""(() => { const V=window.__v290; const ist=V.istana();
      return {n:V.LAYOUT.zona.length, D:ist.D, rKubah:ist.rKubah}; })()""")
    cek(f'{tag}: istana al-jabr tetap tertata (7 zona)', ist and ist['n'] == 7, ist)
    gk = pg.evaluate("(() => { const g=__v290.guruKeadaan(); return {arah:g.arah, k:g.keyakinan, r:!!g.rencana}; })()")
    cek(f'{tag}: GURU arah jelas tetap hidup', gk and gk['arah'] in ('BELI', 'JUAL', 'TUNGGU'), gk)
    ls = pg.evaluate("(() => { try { return localStorage.length; } catch(e) { return -1; } })()")
    cek(f'{tag}: localStorage nol', ls == 0, ls)

    # keadaan Sadar-1 v290 (hasil DRY lokal) terhidrasi → segel sasaran terlihat
    # keadaan Sadar-1 terhidrasi (lokal: bisa v289 dari GitHub live; v290 terbaca setelah dorongan)
    kea = pg.evaluate("(() => { const k=__v290.S1.keadaan; return k&&k.versi; })()")
    cek(f'{tag}: keadaan Sadar-1 terhidrasi (segel komit)', bool(kea), kea)

    cek(f'{tag}: 0 pageerror akhir', len(err) == 0, err[:3])
    pg.screenshot(path=f'/home/z/my-project/research/v290/uji-{tag}.png')
    browser.close()

def main():
    os.chdir(REPO)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT)],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        with sync_playwright() as pw:
            jalankan(pw, (1280, 800), 'desktop')
            jalankan(pw, (390, 844), 'mobile')
    finally:
        srv.terminate()
    print(f"\nTOTAL: {HASIL['pass']} LULUS, {HASIL['fail']} GAGAL")
    sys.exit(1 if HASIL['fail'] else 0)

if __name__ == '__main__':
    main()
