#!/usr/bin/env python3
# ============================================================
# SIAP V43 — sandbox uji V253-WAWASAN-360 dengan data live nyata:
#   siklus 1: kunci prediksi + wawasan360 (deriv/fng/dominasi/narasi) + snapshot OI
#   backdate 25 jam → siklus 2: penilaian matang + Hedge/evolusi wawasan + ΔOI antar-siklus
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request

SAND = '/tmp/v253'
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
            print(' ', baris[:180])
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

# ---- siklus 1: kunci + wawasan360 ----
jalankan('siklus-1')
lap = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
waw = json.load(open(f'{SAND}/laporan/wawasan.json'))
print()
print('=== VERIFIKASI SIKLUS 1 ===')
print('organ            :', lap['organ'][:80])
w360 = lap.get('wawasan360') or {}
ik = w360.get('iklim') or {}
print('dimensi          :', w360.get('dimensi'))
print('F&G              :', (ik.get('fng') or {}).get('nilai'), (ik.get('fng') or {}).get('klasifikasi'))
print('dominasi         :', (ik.get('dominasi') or {}).get('pct'), (ik.get('dominasi') or {}).get('sumber'))
print('fundingBTC %     :', ik.get('fundingBtcPct'))
print('oiBTC            :', ik.get('oiBtc'))
print('narasi makro len :', len(ik.get('narasi') or ''))
print('perKandang       :', len(w360.get('perKandang') or []), 'simbol')
pk0 = (w360.get('perKandang') or [{}])[0]
print('  contoh', pk0.get('simbol'), ': funding', pk0.get('fundingPct'), '· OI', pk0.get('oiJuta'), '· ΔOI', pk0.get('oiDeltaPct'), '· params', len(pk0.get('params') or []))
sas = lap.get('sasaranHariIni') or []
print('sasaran          :', [(s['simbol'], s['jalur'], s.get('keyakinan'), len(s.get('wawasan') or []), len(s.get('narasi') or '')) for s in sas])
if sas:
    print()
    print('NARASI CONTOH:', (sas[0].get('narasi') or '')[:400], '...')
    print()
    print('PARAM CONTOH :', [(p['param'], p['nilai'], p['arah']) for p in (sas[0].get('wawasan') or [])[:6]])
print('keadaan.wawasan  :', list((json.load(open(f'{SAND}/otak/penjaga-keadaan.json')).get('wawasan') or {}).get('oiLama', {}).items())[:4])
gw = json.load(open(f'{SAND}/otak/genome-server.json'))
print('genome.waw rezim :', {k: round(v, 3) for k, v in (gw.get('waw', {}).get(gw.get('waw', {}).get('NAIK') and 'NAIK' or list(gw.get('waw', {}).keys())[0], {}) or {}).get('bobot', {}).items()})
print('hedge.waw        :', 'ada' if gw.get('ilmu', {}).get('hedge', {}).get('waw') else 'TIDAK ADA')

# ---- backdate: semua TERBUKA dijadikan 25 jam lalu agar siklus 2 menilai ----
led_path = f'{SAND}/laporan/prakira-server.jsonl'
led = [json.loads(l) for l in open(led_path) if l.strip()]
n_bd = 0
for e in led:
    if e.get('status') == 'TERBUKA':
        e['waktuKunci'] = e['waktuKunci'].replace('T', 'T')  # placeholder
        from datetime import datetime, timedelta, timezone
        t = datetime.fromisoformat(e['waktuKunci'].replace('Z', '+00:00')) - timedelta(hours=25)
        e['waktuKunci'] = t.isoformat().replace('+00:00', 'Z')
        n_bd += 1
open(led_path, 'w').write('\n'.join(json.dumps(e) for e in led) + '\n')
print(f'\nbackdate: {n_bd} entri TERBUKA diundur 25 jam')

# ---- siklus 2: penilaian + belajar wawasan + ΔOI ----
jalankan('siklus-2')
lap2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
waw2 = json.load(open(f'{SAND}/laporan/wawasan.json'))
print()
print('=== VERIFIKASI SIKLUS 2 ===')
print('organ            :', lap2['organ'][:60])
ik2 = (lap2.get('wawasan360') or {}).get('iklim') or {}
print('ΔOI BTC          :', (ik2.get('oiBtc') or {}).get('deltaPct'))
print('akurasi          :', lap2.get('akurasi', {}).get('akurasiPct'), '· net', lap2.get('akurasi', {}).get('netKumulatifPct'))
pk0b = ((lap2.get('wawasan360') or {}).get('perKandang') or [{}])[0]
print('ΔOI kandang', pk0b.get('simbol'), ':', pk0b.get('oiDeltaPct'))
gw2 = json.load(open(f'{SAND}/otak/genome-server.json'))
rz = lap2.get('rezimBTC', {}).get('rezim')
gww = gw2.get('waw', {}).get(rz, {})
print(f'genome.waw[{rz}]  : generasi', gww.get('generasi'), '· belajar', gww.get('belajar'))
print('bobot waw sekarang:', {k: round(v, 3) for k, v in (gww.get('bobot') or {}).items()})
sd = lap2.get('sadardiri', {})
print('tindakan siklus  :', [t[:80] for t in (sd.get('tindakanSiklusIni') or [])][:4])
gj = json.load(open(f'{SAND}/laporan/guru.json'))
print('guru pengajaran  :', len(gj.get('pengajaran') or []), '· terakhir:', (gj.get('pengajaran') or [''])[-1][:110])
print()
print('SIAP V43 SELESAI')
