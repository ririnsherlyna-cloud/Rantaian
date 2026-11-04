#!/usr/bin/env python3
# ============================================================
# SIAP V41 — sandbox uji V251-RUH-GURU dengan data live nyata:
# siklus 1 (kunci prediksi baru + ruh/kompas/guru/ekspektasi),
# backdate 25 jam, siklus 2 (penilaian matang + evolusi + guru ulang).
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

SAND = '/tmp/v251'
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
            print(' ', baris[:220])
    if p.returncode != 0:
        print(p.stderr[-2500:])
        sys.exit(1)
    return p

# ---- siap sandbox ----
shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy('/home/z/my-project/scripts/penjaga.mjs', f'{SAND}/scripts/penjaga.mjs')
for jalan, tujuan in STATE.items():
    n = unduh(jalan, tujuan)
    print(f'unduh  : {jalan} ({n:,} B)')

# ---- siklus 1: kunci prediksi baru ----
jalankan('siklus-1')
lap1 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print()
print('=== VERIFIKASI SIKLUS 1 ===')
print('organ          :', lap1['organ'][:60])
print('ruh.inti       :', (lap1.get('ruh', {}).get('inti') or 'HILANG')[:80])
print('ruh.anatomi    :', len(lap1.get('ruh', {}).get('anatomi', [])), 'organ')
print('jaminan.terjamin:', lap1.get('jaminan', {}).get('terjamin'), '| produk:', lap1.get('jaminan', {}).get('produk'))
kompas = (lap1.get('jaminan') or {}).get('kompas') or {}
print('kompas         :', kompas.get('arah'), kompas.get('keyakinan'), '|', (kompas.get('alasan') or '')[:90])
guru = lap1.get('guru', {})
print('guru.judul     :', guru.get('judul'))
print('guru.pengajaran:', len(guru.get('pengajaran', [])), 'butir')
print('guru.kuis      :', guru.get('kuis', {}).get('jawaban'), '|', (guru.get('kuis', {}).get('pertanyaan') or '')[:80])
guruFile = json.load(open(f'{SAND}/laporan/guru.json'))
print('guru.json      :', len(guruFile.get('pengajaran', [])), 'pengajaran, etika', len(guruFile.get('etika', [])))
profit = (lap1.get('akurasi') or {}).get('profit') or {}
print('akurasi.profit :', {k: profit.get(k) for k in ['ekspektasiPct', 'menangRataPct', 'rugiRataPct', 'profitFactor']})
sasarans = lap1.get('sasaranHariIni', [])
print('sasaran        :', len(sasarans))
for s in sasarans[:3]:
    ek = s.get('ekspektasi')
    print(f"  {s['simbol']:14s} {s['arah']:4s} k{s['keyakinan']:3d} EV={ek.get('evPct') if ek else None} RR={ek.get('rr') if ek else None} tangga={len(ek.get('tanggaProfit', [])) if ek else 0}")
arahAda = [s for s in sasarans if s.get('ekspektasi')]
print('ekspektasi terpasang pada', len(arahAda), 'dari', len(sasarans), 'sasaran')

# ---- backdate 25 jam semua entri terbuka → siklus 2 menilai ----
ledger = [json.loads(l) for l in open(f'{SAND}/laporan/prakira-server.jsonl') if l.strip()]
dulu = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat().replace('+00:00', 'Z')
for e in ledger:
    if e.get('status') == 'TERBUKA':
        e['waktuKunci'] = dulu
with open(f'{SAND}/laporan/prakira-server.jsonl', 'w') as f:
    for e in ledger:
        f.write(json.dumps(e) + '\n')
keadaan = json.load(open(f'{SAND}/otak/penjaga-keadaan.json'))
keadaan['epochTerakhir'] = '2026-09-28'   # paksa epoch baru utk siklus 2
json.dump(keadaan, open(f'{SAND}/otak/penjaga-keadaan.json', 'w'), indent=2)
print()
print('backdate 25 jam pada', sum(1 for e in ledger if e.get('status') == 'TERBUKA'), 'entri terbuka')

# ---- siklus 2: penilaian + evolusi ----
jalankan('siklus-2')
lap2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print()
print('=== VERIFIKASI SIKLUS 2 (penilaian) ===')
a2 = lap2.get('akurasi', {})
print('akurasi        :', a2.get('akurasiPct'), '% | net kum', a2.get('netKumulatifPct'), '%')
profit2 = a2.get('profit') or {}
print('profit         :', {k: profit2.get(k) for k in ['ekspektasiPct', 'menangRataPct', 'rugiRataPct', 'profitFactor']})
print('kompas         :', (lap2.get('jaminan', {}).get('kompas') or {}).get('arah'), (lap2.get('jaminan', {}).get('kompas') or {}).get('keyakinan'))
g2 = lap2.get('guru', {})
print('guru siklus2   :', g2.get('judul'), '| kuis:', g2.get('kuis', {}).get('jawaban'))
p2 = lap2.get('pertumbuhan', {})
print('evolusi        :', (p2.get('evolusiCatatan') or '')[:110])
print('metamorfosis   :', (p2.get('metamorfosis') or '')[:90])
ep = [f for f in os.listdir(f'{SAND}/laporan') if f.startswith('epoch-')]
print('epoch files    :', ep)
# kuis jawaban benar-benar ada di pilihan?
kuis = g2.get('kuis') or {}
print('kuis konsisten :', kuis.get('jawaban') in ('A', 'B', 'C') and len(kuis.get('pilihan', [])) == 3)
print()
print('SIAP-SELESAI')
