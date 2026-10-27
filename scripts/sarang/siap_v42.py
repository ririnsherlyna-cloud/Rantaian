#!/usr/bin/env python3
# ============================================================
# SIAP V42 — sandbox uji V252-GERBANG-PERFORMA dengan data live nyata:
# siklus 1 (forensik + gerbang racun + baseline performa),
# backdate 25 jam, siklus 2 (penilaian matang + evolusi + A/B jendela).
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

SAND = '/tmp/v252'
REPO = 'ririnsherlyna-cloud/Micaprofita-'
RAW = f'https://raw.githubusercontent.com/{REPO}/main/'
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
    return len(isi)

def jalankan(tag):
    p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND,
                       capture_output=True, text=True, timeout=560)
    print(f'--- {tag}: rc={p.returncode}')
    for baris in (p.stdout or '').splitlines():
        if baris.startswith('[PENJAGA]') or baris.startswith('RINGKASAN'):
            print(' ', baris[:200])
    if p.returncode != 0:
        print(p.stderr[-3000:])
        sys.exit(1)
    return p

# ---- siap sandbox ----
shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy('/home/z/my-project/scripts/penjaga.mjs', f'{SAND}/scripts/penjaga.mjs')
for jalan, tujuan in STATE.items():
    n = unduh(jalan, tujuan)
    print(f'unduh  : {jalan} ({n:,} B)')

# ---- siklus 1: forensik + gerbang + kunci baru ----
jalankan('siklus-1')
lap1 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print()
print('=== VERIFIKASI SIKLUS 1 ===')
print('organ          :', lap1['organ'][:70])
f1 = lap1.get('forensik') or {}
print('forensik.dasarN:', f1.get('dasarN'))
print('zona racun     :', len(f1.get('zonaRacun', [])))
for z in f1.get('zonaRacun', []):
    print(f"   {z['jalur']:8s} {z['nama']:44s} n={z['n']:2d} ak={z['akurasiPct']}% eks={z['ekspekPct']}%")
print('zona emas      :', len(f1.get('zonaEmas', [])))
for z in f1.get('zonaEmas', []):
    print(f"   {z['jalur']:8s} {z['nama']:44s} n={z['n']:2d} ak={z['akurasiPct']}% eks={z['ekspekPct']}%")
print('tindakan       :')
for t in f1.get('tindakan', []): print('   -', t[:130])
d1 = lap1.get('disiplin') or {}
print('disiplin       :', d1.get('mode'), '| ditolak siklus ini:', d1.get('ditolakSiklusIni'), '| zona racun aktif:', d1.get('zonaRacunAktif'))
p1 = lap1.get('performa') or {}
print('performa.base  :', p1.get('baseline', {}).get('versi'), 'ak', p1.get('baseline', {}).get('akurasiPct'), 'PF', p1.get('baseline', {}).get('pf'), 'eks', p1.get('baseline', {}).get('ekspekPct'), 'n', p1.get('baseline', {}).get('n'))
print('performa.sekar :', 'n', p1.get('sekarang', {}).get('n'), '| arahan:', p1.get('arahan'))
ss = lap1.get('sasaranHariIni', [])
print('sasaran        :', len(ss))
for s in ss:
    ek = s.get('ekspektasi')
    print(f"  {s['simbol']:14s} {s.get('jalur','ARAH'):8s} {s['arah']:4s} k{s['keyakinan']:3d} EV={ek.get('evPct') if ek else None} eksplorasi={s.get('eksplorasi', False)} zonaEmas={s.get('zonaEmas', False)}")
    print('      ketKeyakinan:', (s.get('ketKeyakinan') or '')[:120])
kl = lap1.get('kandidatLain', [])
gem = [k for k in kl if 'GERBANG FORENSIK' in (k.get('catatan') or '')]
print('kandidatLain   :', len(kl), '| dgn alasan gerbang forensik:', len(gem))
for k in gem[:3]: print('   -', k['simbol'], (k.get('catatan') or '')[:120])
ar1 = json.load(open(f'{SAND}/laporan/forensik.json'))
print('forensik.json  :', len(ar1.get('zona', {}).get('arah', [])), 'zona ARAH |', len(ar1.get('zona', {}).get('phoenix', [])), 'zona PHX | penyebab:', len(ar1.get('penyebab', [])))
perf1 = json.load(open(f'{SAND}/otak/performa.json'))
print('performa.json  : baseline n=', perf1['baseline']['n'], 'cutoff=', perf1['cutoff'][:19])
sd1 = lap1.get('sadardiri') or {}
print('sadar.tindakan :', len(sd1.get('tindakanSiklusIni', [])))
print('sadar.peringatan:', len(sd1.get('peringatan', [])))
for w in sd1.get('peringatan', []): print('   !', w[:130])
guru1 = json.load(open(f'{SAND}/laporan/guru.json'))
fgr = [g for g in guru1.get('pengajaran', []) if g.startswith('FORENSIK')]
print('guru forensik  :', (fgr[0][:150] if fgr else 'HILANG'))

# ---- backdate 25 jam semua entri terbuka → siklus 2 menilai ----
ledger = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
dulu = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat().replace('+00:00', 'Z')
n_bak = 0
for e in ledger:
    if e.get('status') == 'TERBUKA':
        e['waktuKunci'] = dulu; n_bak += 1
with open(f'{SAND}/laporan/prakira-server.jsonl', 'w') as f:
    for e in ledger:
        f.write(json.dumps(e) + '\n')
keadaan = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
keadaan['epochTerakhir'] = '2026-09-28'
json.dump(keadaan, open(f'{SAND}/otak/penjaga-keadaan.json', 'w'), indent=2)
print()
print('backdate 25 jam pada', n_bak, 'entri terbuka')

# ---- siklus 2: penilaian + evolusi + A/B ----
jalankan('siklus-2')
lap2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print()
print('=== VERIFIKASI SIKLUS 2 (penilaian) ===')
a2 = lap2.get('akurasi', {})
print('akurasi        :', a2.get('akurasiPct'), '% | net kum', a2.get('netKumulatifPct'), '%')
profit2 = a2.get('profit') or {}
print('profit         :', {k: profit2.get(k) for k in ['ekspektasiPct', 'menangRataPct', 'rugiRataPct', 'profitFactor']})
p2 = lap2.get('performa') or {}
print('A/B sekarang   : n=', p2.get('sekarang', {}).get('n'), 'ak', p2.get('sekarang', {}).get('akurasiPct'), 'PF', p2.get('sekarang', {}).get('pf'), 'eks', p2.get('sekarang', {}).get('ekspekPct'), '→ arahan:', p2.get('arahan'))
print('A/B lulus      :', p2.get('lulus'))
f2 = lap2.get('forensik') or {}
print('zona racun s2  :', len(f2.get('zonaRacun', [])), '| zona emas:', len(f2.get('zonaEmas', [])))
ss2 = lap2.get('sasaranHariIni', [])
print('sasaran s2     :', len(ss2), '| disiplin:', (lap2.get('disiplin') or {}).get('mode'))
for s in ss2[:5]:
    print(f"  {s['simbol']:14s} {s.get('jalur','ARAH'):8s} {s['arah']:4s} k{s['keyakinan']:3d} eksplorasi={s.get('eksplorasi', False)}")
print()
print('SELESAI — sandbox V252 lolos verifikasi struktural')
