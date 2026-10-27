#!/usr/bin/env python3
# ============================================================
# SIAP V46 — sandbox uji V256-MESIN-DEAL-ODDS dengan data live nyata:
#   siklus 1: kunci (odds ranking top-3, rencana deal 3Commas, tag peristiwa,
#             laporan/odds.json, posisi terbuka, registri 101)
#   backdate 25 jam → siklus 2: penilaian matang + dealMedan (SO/BEP/trailing)
#             + hit-rate peristiwa + ilmu.deal
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta

SAND = '/tmp/v256'
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

# ---- strip entri hari-ini UTC agar jalur KUNCI V256 teruji end-to-end ----
led_path0 = f'{SAND}/laporan/prakira-server.jsonl'
tgl = datetime.utcnow().strftime('%Y-%m-%d')
led0 = [json.loads(l) for l in open(led_path0) if l.strip()]
led0 = [e for e in led0 if not (e.get('id') or '').endswith('-' + tgl)]
open(led_path0, 'w').write('\n'.join(json.dumps(e) for e in led0) + '\n')
print(f'strip  : entri id *-{tgl} dibuang — sisa {len(led0)} baris ledger')

# ---- siklus 1: kunci + mesin deal + odds ----
jalankan('siklus-1')
lap = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
odds = json.load(open(f'{SAND}/laporan/odds.json'))
print()
print('=== VERIFIKASI SIKLUS 1 ===')
print('organ            :', lap['organ'][:100])
w360 = lap.get('wawasan360') or {}
reg = w360.get('registri') or {}
print('registri total   :', reg.get('totalNama'), '· dealOdds', reg.get('dealOdds'), '· metakognisi', reg.get('metakognisi'))
print('odds identitas   :', (odds.get('identitas') or '')[:90])
print('sumber resmi     :', len(odds.get('sumber') or []), 'entri —', (odds.get('sumber') or [{}])[0].get('url'))
print('kunci diadopsi   :', len(odds.get('kunciDiadopsi') or []))
print('paramDeal        :', odds.get('paramDeal'))
print('paramEvent       :', odds.get('paramEvent'))
rank = odds.get('oddsSiklusIni') or []
print('ranking odds     :', [(x['simbol'], x['jalur'], x['odds'], x['terkunci'], x['alasan'][:28]) for x in rank][:9])
per = odds.get('peristiwa') or []
print('peristiwa        :', [(p['peristiwa'], p['n']) for p in per])
print('deal param       :', odds.get('deal', {}).get('param'))
print('deal medan       :', json.dumps(odds.get('deal', {}).get('medan', {}), ensure_ascii=False)[:260])
print('posisi terbuka   :', odds.get('posisiTerbuka', {}).get('jumlah'), '/', odds.get('posisiTerbuka', {}).get('batas'))
sas = lap.get('sasaranHariIni') or []
print('sasaran          :', [(s['simbol'], s['jalur'], s.get('keyakinan')) for s in sas])
if sas:
    s0 = sas[0]
    o0 = s0.get('odds') or {}
    print('sasaran odds     :', s0['simbol'], o0.get('skor'), '· komponen', o0.get('komponen'))
    print('sasaran peristiwa:', s0.get('peristiwa'))
    rd = s0.get('rencanaDeal') or {}
    print('rencanaDeal      : maxSO', rd.get('maxSO'), '· soDev', rd.get('soDevAtr'), '×', rd.get('soDevMult'), '· vol ×', rd.get('soVolMult'))
    print('  safetyOrders   :', [(x['tahap'], x['harga'], x['devPct'], x['volMult']) for x in rd.get('safetyOrders') or []])
    print('  avg penuh      :', rd.get('avgJikaSoPenuh'), '· TP-dari-avg', rd.get('tpDariAvgHarga'))
    print('  breakeven      : aktivasi', (rd.get('breakeven') or {}).get('aktivasiHarga'), '→ stop', (rd.get('breakeven') or {}).get('stopBaruHarga'))
    print('  trailing       :', (rd.get('trailing') or {}).get('jarakPct'), '% ·', (rd.get('trailing') or {}).get('aktivasi'))
nm0 = [x for x in (lap.get('kandidatLain') or []) if (x.get('catatan') or '').startswith('ODDS MAKER')]
print('nearMiss odds    :', [(x['simbol'], (x.get('catatan') or '')[13:90]) for x in nm0][:6])
lapdo = lap.get('dealOdds') or {}
print('laporan.dealOdds :', 'ada' if lapdo else 'TIDAK ADA', '· sumberResmi', len(lapdo.get('sumberResmi') or []), '· ranking', len(lapdo.get('oddsSiklusIni') or []))
pi = lap.get('piagam') or {}
ot = [o['nama'] for o in (pi.get('otak') or [])]
print('otak piagam      :', ot, '· ada otak-deal-odds:', 'otak-deal-odds' in ot)
print('guru pengajaran  :', len(lap.get('guru', {}).get('pengajaran') or []), '· ada DEAL:', any('DEAL (' in x for x in (lap.get('guru', {}).get('pengajaran') or [])), '· ada ODDS:', any('ODDS (' in x for x in (lap.get('guru', {}).get('pengajaran') or [])))
jn = json.load(open(f'{SAND}/laporan/jurnal-ilmu.json'))
print('jurnal dealOdds  :', 'dealOdds' in (jn.get('buktiPemasangan') or {}))
print('odds.json size   :', os.path.getsize(f'{SAND}/laporan/odds.json'))
den = [json.loads(l) for l in open(f'{SAND}/laporan/denyut-server.jsonl') if l.strip()]
print('denyut terakhir  :', {k: den[-1].get(k) for k in ['oddsTop', 'oddsDitolak', 'posisiTerbuka', 'peristiwaHidup']})

# ---- backdate: semua TERBUKA dijadikan 25 jam lalu agar siklus 2 menilai ----
led_path = f'{SAND}/laporan/prakira-server.jsonl'
led = [json.loads(l) for l in open(led_path) if l.strip()]
n_bd = 0
for e in led:
    if e.get('status') == 'TERBUKA':
        t = datetime.fromisoformat(e['waktuKunci'].replace('Z', '+00:00')) - timedelta(hours=25)
        e['waktuKunci'] = t.isoformat().replace('+00:00', 'Z')
        n_bd += 1
open(led_path, 'w').write('\n'.join(json.dumps(e) for e in led) + '\n')
print(f'\nbackdate: {n_bd} entri TERBUKA diundur 25 jam')

# ---- siklus 2: penilaian + dealMedan + peristiwa stat ----
jalankan('siklus-2')
lap2 = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
odds2 = json.load(open(f'{SAND}/laporan/odds.json'))
print()
print('=== VERIFIKASI SIKLUS 2 ===')
print('organ            :', lap2['organ'][:60])
print('akurasi          :', lap2.get('akurasi', {}).get('akurasiPct'), '· net', lap2.get('akurasi', {}).get('netKumulatifPct'))
dm2 = (odds2.get('deal') or {}).get('medan') or {}
print('ilmu.deal.so     :', dm2.get('so'))
print('ilmu.deal.bep    :', dm2.get('bep'))
print('ilmu.deal.trail  :', dm2.get('trail'))
per2 = odds2.get('peristiwa') or []
print('peristiwa siklus2:', [(p['peristiwa'], p['n'], p['hitPct'], p['status']) for p in per2])
gw = json.load(open(f'{SAND}/otak/genome-server.json'))
ilmu = gw.get('ilmu') or {}
print('ilmu.deal tersimpan:', 'deal' in ilmu, '· ilmu.peristiwa:', len(ilmu.get('peristiwa') or {}))
# contoh dealMedan di ledger
entri_dm = []
for l in open(f'{SAND}/laporan/prakira-server.jsonl'):
    if not l.strip():
        continue
    e = json.loads(l)
    if e.get('dealMedan'):
        entri_dm.append((e['simbol'], e.get('status'), e['dealMedan'].get('ket', '')[:110]))
print('dealMedan ledger :', entri_dm[:4] if entri_dm else 'belum ada SO kena (pasar tidak menyentuh level — jujur)')
print()
print('SIAP V46 SELESAI')
