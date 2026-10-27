#!/usr/bin/env python3
# ============================================================
# UJI PAKSA GERBANG V262 — pola uji_paksa_v51/v260g:
# salinan sandbox penjaga.mjs DIUBAH sementara (produksi tak tersentuh):
#   RUN A: ambang odds efektif diturunkan + kuota suhu dibuka → kandidat ARAH
#          sampai ke gerbang impas → karantina-kalibrasi & zona-chase & alokasi
#          harus MENOLAK dengan alasan (buku-tekok + nearMiss terisi).
# ============================================================
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request

SAND = '/tmp/v262u'
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'
SUMBER_PENJAGA = '/home/z/my-project/micaprofita/scripts/penjaga.mjs'
STATE = {
    'otak/genome-server.json': f'{SAND}/otak/genome-server.json',
    'otak/penjaga-keadaan.json': f'{SAND}/otak/penjaga-keadaan.json',
    'laporan/prakira-server.jsonl': f'{SAND}/laporan/prakira-server.jsonl',
    'laporan/pelajaran-server.json': f'{SAND}/laporan/pelajaran-server.json',
    'laporan/denyut-server.jsonl': f'{SAND}/laporan/denyut-server.jsonl',
    'laporan/jurnal-ilmu.json': f'{SAND}/laporan/jurnal-ilmu.json',
}

def unduh(jalan, tujuan):
    with urllib.request.urlopen(RAW + jalan, timeout=30) as r:
        isi = r.read()
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    open(tujuan, 'wb').write(isi)

def siapkan():
    shutil.rmtree(SAND, ignore_errors=True)
    os.makedirs(f'{SAND}/scripts', exist_ok=True)
    shutil.copy(SUMBER_PENJAGA, f'{SAND}/scripts/penjaga.mjs')
    for jalan, tujuan in STATE.items():
        try:
            unduh(jalan, tujuan)
        except Exception as e:
            print(f'unduh {jalan} gagal ({e})')

def patch(kode, lama, baru, label):
    if lama not in kode:
        print(f'PATCH GAGAL: {label} — anchor tak ditemukan')
        sys.exit(1)
    print(f'patch: {label}')
    return kode.replace(lama, baru)

def jalankan(label):
    p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
    print(f'--- {label}: rc={p.returncode}')
    for baris in (p.stdout or '').splitlines():
        if any(k in baris for k in ('impas-', 'RINGKASAN', 'denyut #')):
            print(' ', baris[:200])
    if p.returncode != 0:
        print(p.stderr[-3000:])
        sys.exit(1)
    return p

print('=== RUN A — bypass gerbang hulu (metakognisi/peluang/slip/komite/kartu/kuanta/mandat) + buka ambang & kuota → kandidat sampai ke gerbang impas ===')
siapkan()
kode = open(f'{SAND}/scripts/penjaga.mjs').read()
kode = patch(kode,
    'const ambangOddsEfektif = +(ambangOdds + tambahanAmbangImpas).toFixed(1)',
    'const ambangOddsEfektif = 40   // UJI PAKSA: ambang dibuka agar kandidat sampai ke gerbang impas',
    'ambang dibuka')
kode = patch(kode,
    'const kuotaArahSuhu = suhu.kuota',
    'const kuotaArahSuhu = 12   // UJI PAKSA: kuota suhu dibuka',
    'kuota dibuka')
# bypass gerbang hulu di SALINAN sandbox (produksi tak disentuh) — pola uji_paksa_v51:
kode = patch(kode, "if (!eksplor && (!estM.lolos || !predM.lanjut)) {", "if (false && !eksplor && (!estM.lolos || !predM.lanjut)) {", 'bypass metakognisi')
kode = patch(kode, "if (!eksplor && auto?.peluang && auto.peluang.skor < AUT.PELUANG_AMBANG) {", "if (false && !eksplor && auto?.peluang && auto.peluang.skor < AUT.PELUANG_AMBANG) {", 'bypass peluang')
kode = patch(kode, "if (!eksplor && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {", "if (false && !eksplor && auto?.slip && auto.slip.edgeBersih != null && auto.slip.edgeBersih <= 0) {", 'bypass slip-neto')
kode = patch(kode, "if (!eksplor && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {", "if (false && !eksplor && komC && komC.terbaca >= 3 && komC.arah && komC.arah !== v.arah) {", 'bypass komite-lawan')
kode = patch(kode, "if (!eksplor && komC && komC.terbaca >= 3 && komC.keyakinan < CLAW.KOMITE_MINCONF) {", "if (false && !eksplor && komC && komC.terbaca >= 3 && komC.keyakinan < CLAW.KOMITE_MINCONF) {", 'bypass komite-lemah')
kode = patch(kode, "if (!eksplor && kartC && !kartC.approved) {", "if (false && !eksplor && kartC && !kartC.approved) {", 'bypass kartu')
kode = patch(kode, "if (!eksplor && kuaC.kuanta === 0) {", "if (false && !eksplor && kuaC.kuanta === 0) {", 'bypass kuanta-nol')
kode = patch(kode, "if (!eksplor && kuaC.kuanta >= CLAW.KUANTA_1 && !konfirmOk) {", "if (false && !eksplor && kuaC.kuanta >= CLAW.KUANTA_1 && !konfirmOk) {", 'bypass mandat')
kode = patch(kode, "const bersihArah = kandidatArah.filter((k) => !k.vetoW.length && !k.kena.some((z) => z.status === 'RACUN'))", "const bersihArah = kandidatArah.filter((k) => true)   // UJI PAKSA: forensik/veto dibuka agar kandidat sampai ke gerbang impas", 'bypass forensik-veto')
open(f'{SAND}/scripts/penjaga.mjs', 'w').write(kode)
jalankan('run A')

im = json.load(open(f'{SAND}/laporan/impas.json'))
si = im.get('siklusIni', {})
ledger = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
near = json.load(open(f'{SAND}/laporan/sasaran-terkini.json')).get('nearMiss') or []
print('impas.siklusIni:', json.dumps(si, ensure_ascii=False)[:280])
bt = (json.load(open(f'{SAND}/otak/penjaga-keadaan.json')).get('claw', {}) or {}).get('bukuTekok', {})
print('buku-tekok:', bt)
zona = [n for n in near if 'ZONA-CHASE' in (n.get('catatan') or '')]
karn = [n for n in near if 'KARANTINA-KALIBRASI' in (n.get('catatan') or '')]
alok = [n for n in near if 'ALOKASI-DINAMIS' in (n.get('catatan') or '')]
print('nearMiss zona-chase:', len(zona), '| karantina:', len(karn), '| alokasi:', len(alok))
if zona: print('  contoh zona:', zona[0].get('simbol'), zona[0].get('arah'), '—', zona[0].get('catatan', '')[:170])
if karn: print('  contoh karantina:', karn[0].get('simbol'), karn[0].get('arah'), '—', karn[0].get('catatan', '')[:170])
if alok: print('  contoh alokasi:', alok[0].get('simbol'), alok[0].get('arah'), '—', alok[0].get('catatan', '')[:170])
# kunci yang lolos harus membawa lapis impas + stop/target
hari = si.get('dihasilkan') or ''
baru = [e for e in ledger if e.get('impas')]
telanjang = [e for e in baru if not e.get('stop') or not e.get('target')]
print('entri terkunci dgn lapis impas:', len(baru), '| tanpa stop/target:', len(telanjang))

print('\n=== SIMPULAN UJI PAKSA ===')
ok = []
ok.append(('gerbang karantina MENOLAK dgn alasan', si.get('karantinaCt', 0) > 0 or len(karn) > 0))
ok.append(('gerbang zona/alokasi terpasang di buku-tekok atau menolak', any('impas' in k for k in bt) or si.get('zonaCt', 0) > 0 or len(alok) > 0 or len(zona) > 0))
ok.append(('tak ada kunci baru tanpa stop/target', len(telanjang) == 0))
for nama, lulus in ok:
    print(('LULUS ' if lulus else 'GAGAL ') + nama)
print('SIMPULAN:', 'LULUS' if all(l for _, l in ok) else 'PERIKSA MANUAL')
