#!/usr/bin/env python3
# ============================================================
# SIAP V44 — sandbox uji V254-SAMUDRA-PARAMETER dengan data live nyata:
#   siklus 1: kunci prediksi + registri 46 param/kandang (multi-TF, funding-riwayat,
#             order book, lintas-pasar, kalender) + iklim OKX + veto + sekolah
#   backdate 25 jam → siklus 2: penilaian matang + sekolah paramHit + ΔOI
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request

SAND = '/tmp/v254'
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
            print(' ', baris[:190])
    if p.returncode != 0:
        print(p.stderr[-3500:])
        sys.exit(1)
    return p

# ---- siap sandbox ----
shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy('/home/z/my-project/scripts/penjaga.mjs', f'{SAND}/scripts/penjaga.mjs')
for jalan, tujuan in STATE.items():
    n = unduh(jalan, tujuan)
    print(f'unduh  : {jalan} ({n:,} B)')

# ---- siklus 1: kunci + samudra parameter ----
jalankan('siklus-1')
lap = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
waw = json.load(open(f'{SAND}/laporan/wawasan.json'))
print()
print('=== VERIFIKASI SIKLUS 1 ===')
print('organ            :', lap['organ'][:90])
w360 = lap.get('wawasan360') or {}
reg = w360.get('registri') or {}
ik = w360.get('iklim') or {}
ok = ik.get('okx') or {}
print('registri total   :', reg.get('totalNama'), '· inti', reg.get('intiBerbobot'), '· observasi', reg.get('observasi'), '· pengukuran/denyut', reg.get('pengukuranPerDenyut'))
print('perDomain        :', reg.get('perDomain'))
print('F&G              :', (ik.get('fng') or {}).get('nilai'), '· Δ7h', (ik.get('fngRiwayat') or {}).get('delta7d'))
print('iklim OKX        :', {k: ok.get(k) for k in ['dari', 'naikPct', 'medianChgPct', 'dispersiPct', 'altseasonProxy', 'dominasiVolumeOkxPct']})
print('narasi makro len :', len(ik.get('narasi') or ''))
pk = waw.get('perKandang') or []
print('perKandang(full) :', len(pk), 'kandang · jumlahParam', [x.get('jumlahParam') for x in pk])
if pk:
    p0 = pk[0]
    print('  konsensus', p0.get('simbol'), ':', {k: v.get('arah') for k, v in (p0.get('konsensus') or {}).items()})
    paramDict = {p['param']: p for p in (p0.get('params') or [])}
    for nm in ['ema4h', 'sejajar4h', 'fundRata3', 'bukuImbalans', 'bukuSpread', 'bukuKedalaman', 'persenChg', 'sesi', 'garchSigma', 'mcPnaik', 'atrPctile']:
        p = paramDict.get(nm)
        print(f"  {nm:14s}:", (p['nilai'], p['arah'], (p['ket'] or '')[:90]) if p else 'TIDAK ADA')
    nulls = [p['param'] for p in p0.get('params') or [] if p.get('nilai') is None]
    print('  param null    :', nulls)
vs = w360.get('vetoSiklusIni') or {}
print('veto siklus      : arah', [(v['simbol'], v['kunci']) for v in (vs.get('arah') or [])], '· phoenix', vs.get('phoenixDitolak'))
sas = lap.get('sasaranHariIni') or []
print('sasaran          :', [(s['simbol'], s['jalur'], s.get('keyakinan'), len(s.get('wawasan') or []), len(s.get('narasi') or '')) for s in sas])
nm0 = [x for x in (lap.get('kandidatLain') or []) if (x.get('catatan') or '').startswith('GERBANG VETO')]
print('nearMiss veto    :', [(x['simbol'], x.get('kunci')) for x in nm0][:8])
if sas:
    print()
    print('NARASI CONTOH:', (sas[0].get('narasi') or '')[:600], '...')
print('wawasan.json size:', os.path.getsize(f'{SAND}/laporan/wawasan.json'))
print('sasaran json size:', os.path.getsize(f'{SAND}/laporan/sasaran-terkini.json'))

# ---- backdate: semua TERBUKA dijadikan 25 jam lalu agar siklus 2 menilai ----
led_path = f'{SAND}/laporan/prakira-server.jsonl'
led = [json.loads(l) for l in open(led_path) if l.strip()]
n_bd = 0
for e in led:
    if e.get('status') == 'TERBUKA':
        from datetime import datetime, timedelta
        t = datetime.fromisoformat(e['waktuKunci'].replace('Z', '+00:00')) - timedelta(hours=25)
        e['waktuKunci'] = t.isoformat().replace('+00:00', 'Z')
        n_bd += 1
open(led_path, 'w').write('\n'.join(json.dumps(e) for e in led) + '\n')
print(f'\nbackdate: {n_bd} entri TERBUKA diundur 25 jam')

# ---- siklus 2: penilaian + sekolah parameter + ΔOI ----
jalankan('siklus-2')
lap2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
waw2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
print()
print('=== VERIFIKASI SIKLUS 2 ===')
print('organ            :', lap2['organ'][:60])
print('akurasi          :', lap2.get('akurasi', {}).get('akurasiPct'), '· net', lap2.get('akurasi', {}).get('netKumulatifPct'))
sk = (waw2.get('sekolahParameter') or [])[:8]
print('sekolah (top 8)  :', [(x['param'], x['n'], x['hitPct'], x['status']) for x in sk])
print('ΔOI BTC          :', ((waw2.get('iklim') or {}).get('oiBtc') or {}).get('deltaPct'))
gw2 = json.load(open(f'{SAND}/otak/genome-server.json'))
print('paramHit di ilmu :', len((gw2.get('ilmu') or {}).get('paramHit') or {}), 'param tercatat')
print()
print('SIAP V44 SELESAI')
