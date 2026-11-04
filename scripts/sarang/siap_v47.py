#!/usr/bin/env python3
# ============================================================
# SIAP V47 — sandbox uji V257-SAMUDRA-DALAM dengan data live nyata:
#   1 siklus penuh otak server (penjaga.mjs) di sandbox /tmp/v257
#   state asli diunduh dari repo main; hasil diperiksa: registri 127,
#   param V257 terisi, iklim v257, odds/deal tetap hidup.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request

SAND = '/tmp/v257'
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

# ---- siap sandbox ----
shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
shutil.copy('/home/z/my-project/scripts/penjaga.mjs', f'{SAND}/scripts/penjaga.mjs')
n_ok = 0
for jalan, tujuan in STATE.items():
    try:
        n = unduh(jalan, tujuan)
        n_ok += 1
        print(f'unduh {jalan}: {n} B')
    except Exception as e:
        print(f'unduh {jalan} gagal ({e}) — sandbox mulai kosong untuk file ini')
print(f'state: {n_ok}/{len(STATE)}')

# ---- jalankan 1 siklus ----
p = subprocess.run(['node', 'scripts/penjaga.mjs'], cwd=SAND, capture_output=True, text=True, timeout=560)
print(f'--- siklus 1: rc={p.returncode}')
for baris in (p.stdout or '').splitlines():
    if baris.startswith('[PENJAGA]') or baris.startswith('RINGKASAN'):
        print(' ', baris[:200])
if p.returncode != 0:
    print(p.stderr[-4000:])
    sys.exit(1)

# ---- periksa hasil ----
w = json.load(open(f'{SAND}/laporan/wawasan.json'))
reg = w.get('registri', {})
print('\n=== HASIL V257 ===')
print('versi:', w.get('versi'))
print('registri.totalNama:', reg.get('totalNama'), '(target 127)')
print('registri.perKandang:', reg.get('perKandang'), '(target 72)')
print('registri.observasiV257:', reg.get('observasiV257'), '| iklimParam:', reg.get('iklimParam'))
print('pengukuranPerDenyut:', reg.get('pengukuranPerDenyut'))
pk = w.get('perKandang', [])
if pk:
    prms = pk[0].get('params', [])
    print('param per kandang (BTC):', len(prms))
    nama = {p['param'] for p in prms}
    baru = ['ema1d','rsi1d','macd1d','donchian30d','jarak90d','momen30d','streak1d','volRasio7d30d','lsAkun','lsTren','lsTaker','basisPct','jamFunding','fundVsBtc','bukuGradien','ixFundingOI','ixVolAtr','ixTrenFunding','ixBukuTren','ixDonchianVol','ixFlowTren']
    ada = [b for b in baru if b in nama]
    print(f'param V257 terisi: {len(ada)}/21 — {ada}')
    contoh = {p['param']: (p['nilai'], p['ket'][:90]) for p in prms if p['param'] in ('ema1d','donchian30d','lsAkun','lsTaker','basisPct','ixFundingOI')}
    for k, (v, ket) in contoh.items():
        print(f'  {k}: nilai={v} | {ket}')
v257 = (w.get('iklim') or {}).get('v257')
print('iklim.v257:', json.dumps(v257, ensure_ascii=False)[:220] if v257 else 'HILANG!')
s = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
print('sasaran: organ', s.get('organ', '')[:40], '| sasaranHariIni', len(s.get('sasaranHariIni') or []))
odds = json.load(open(f'{SAND}/laporan/odds.json'))
print('odds.json: sumber ada?', 'ranking' in json.dumps(list(odds.keys())))
ok = (reg.get('totalNama') == 127 and len(ada) >= 19 and v257)
print('\nSIMPULAN:', 'LULUS' if ok else 'PERIKSA-LAGI')
sys.exit(0 if ok else 2)
