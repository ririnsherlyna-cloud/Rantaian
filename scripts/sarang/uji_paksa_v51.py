#!/usr/bin/env python3
# ============================================================
# UJI PAKSA GERBANG CLAW V261 — verifikasi jalur veto & antrean
# mandat TERPICU NYATA. Gerbang hulu (forensik/odds/metakognisi/
# autopilot) DI-BYPASS ala uji gerbang v260g agar kandidat sampai
# ke gerbang claw; kode produksi sandbox, konstanta diuji:
#   Run A: KARTU_MAKS 70→30 → kartu-panas harus VETO + buku-tekok
#   Run B: KUANTA_T1 0.8→0.3 → ukuran penuh harus MASUK ANTREAN
#          menunggu-mandat (confirmation queue), TIDAK dikunci seketika
# ============================================================
import json
import os
import shutil
import subprocess
import sys

SRC = '/home/z/my-project/scripts/penjaga.mjs'
STATE = {
    'otak/genome-server.json',
    'otak/penjaga-keadaan.json',
    'laporan/prakira-server.jsonl',
    'laporan/pelajaran-server.json',
    'laporan/denyut-server.jsonl',
    'laporan/jurnal-ilmu.json',
}
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'

BYPASS = [
    ("const bersihArah = kandidatArah.filter((k) => !k.vetoW.length && !k.kena.some((z) => z.status === 'RACUN'))",
     "const bersihArah = kandidatArah   // UJI-PAKSA: bypass forensik/vetoW"),
    ("const pilihArah = rankArah.filter((k) => k.odds.skor >= ambangOdds).slice(0, Math.min(kuotaArahSuhu, sisaPosisi))",
     "const pilihArah = rankArah.slice(0, 3)   // UJI-PAKSA: bypass odds/suhu"),
    ("if (!eksplor && (!estM.lolos || !predM.lanjut)) {",
     "if (false && !eksplor && (!estM.lolos || !predM.lanjut)) {   // UJI-PAKSA: bypass metakognisi"),
    ("if (!eksplor && auto?.peluang && auto.peluang.skor < AUT.PELUANG_AMBANG) {",
     "if (false && !eksplor && auto?.peluang && auto.peluang.skor < AUT.PELUANG_AMBANG) {   // UJI-PAKSA"),
    ("if (!eksplor && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {",
     "if (false && !eksplor && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {   // UJI-PAKSA"),
    ("if (!eksplor && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {",
     "if (false && !eksplor && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {   // UJI-PAKSA: bypass komite-lawan"),
    ("if (!eksplor && komC && komC.terbaca >= 3 && komC.keyakinan < CLAW.KOMITE_MINCONF) {",
     "if (false && !eksplor && komC && komC.terbaca >= 3 && komC.keyakinan < CLAW.KOMITE_MINCONF) {   // UJI-PAKSA: bypass komite-lemah"),
]

def siap(sand, ekstra):
    shutil.rmtree(sand, ignore_errors=True)
    os.makedirs(f'{sand}/scripts', exist_ok=True)
    teks = open(SRC, encoding='utf-8').read()
    for lama, baru in BYPASS + ekstra:
        assert lama in teks, f'anchor hilang: {lama[:60]}'
        teks = teks.replace(lama, baru)
    open(f'{sand}/scripts/penjaga.mjs', 'w', encoding='utf-8').write(teks)
    return teks

def unduh_state(sand):
    import urllib.request
    for jalan in STATE:
        try:
            isi = urllib.request.urlopen(RAW + jalan, timeout=30).read()
            pth = f'{sand}/{jalan}'
            os.makedirs(os.path.dirname(pth), exist_ok=True)
            open(pth, 'wb').write(isi)
        except Exception as e:
            print('  state', jalan, 'kosong:', e)

def jalan(sand, label):
    p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=sand, capture_output=True, text=True, timeout=560)
    if p.returncode != 0:
        print(p.stderr[-3000:]); sys.exit(1)
    print(f'  {label}: rc=0')

def hasil(sand):
    cl = json.load(open(f'{sand}/laporan/clawtrade.json'))
    return cl.get('siklusIni', {})

# ---- Run A: KARTU_MAKS 30 (kartu-panas diveto) ----
print('=== RUN A — KARTU_MAKS 70→30 (hulu di-bypass) ===')
A = '/tmp/v261a'
siap(A, [("KARTU_MAKS: 70,", "KARTU_MAKS: 30,   // UJI-PAKSA")])
unduh_state(A)
jalan(A, 'run A')
siA = hasil(A)
print('  siklusIni:', json.dumps({k: siA.get(k) for k in ('komiteVeto', 'kartuVeto', 'kuantaVeto', 'kuota', 'hitamAktif', 'hitamCt', 'hitamBaru')}, ensure_ascii=False))
print('  bukuTekok:', siA.get('bukuTekok'))
okA = (siA.get('kartuVeto', 0) >= 1) and (siA.get('bukuTekok', {}).get('claw-kartu', 0) >= 1)
print('  RUN A:', 'LULUS — veto-saksi kartu terpicu nyata' if okA else 'TIDAK terpicu')

# ---- Run B: KUANTA_T1 0.3 (ukuran penuh → antre mandat) ----
print('=== RUN B — KUANTA_T1 0.8→0.3 + SLIP_MAKS 99 (hulu di-bypass) ===')
B = '/tmp/v261b'
siap(B, [("KUANTA_T1: 0.8,", "KUANTA_T1: 0.3,   // UJI-PAKSA"), ("SLIP_MAKS_PCT: 1.2,", "SLIP_MAKS_PCT: 99,   // UJI-PAKSA")])
unduh_state(B)
jalan(B, 'run B')
siB = hasil(B)
kB = json.load(open(f'{B}/otak/penjaga-keadaan.json')).get('claw', {})
antre = [q for q in (kB.get('konfirm') or []) if q.get('status') == 'pending']
print('  siklusIni:', json.dumps({k: siB.get(k) for k in ('komiteVeto', 'kartuVeto', 'kuantaVeto', 'konfirmQue', 'konfirmOk', 'konfirmExp')}, ensure_ascii=False))
print('  antrean mandat:', [(q.get('simbol'), q.get('arah'), q.get('detail', '')[:60]) for q in antre])
okB = (siB.get('konfirmQue', 0) >= 1) and len(antre) >= 1
print('  RUN B:', 'LULUS — antrean menunggu-mandat terpicu nyata' if okB else 'TIDAK terpicu')

print('\nSIMPULAN UJI PAKSA:', 'LULUS' if (okA and okB) else ('SEBAGIAN' if (okA or okB) else 'PERIKSA'))
sys.exit(0 if (okA and okB) else 2)
