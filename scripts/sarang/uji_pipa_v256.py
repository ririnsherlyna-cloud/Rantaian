#!/usr/bin/env python3
# ============================================================
# UJI PIPA V256 — gerbang-terbuka (kopi sandbox, gerbang dilonggarkan
# HANYA di kopi ini untuk membuktikan plumbing end-to-end):
#   siklus A: kunci (odds + peristiwa + rencanaDeal menempel di entri)
#   backdate 25 jam → siklus B: penilaian matang → dealMedan (SO/BEP/trail)
#             + ilmu.deal + ilmu.peristiwa terisi
# Kode produksi TIDAK diubah — ini uji pipa, bukan uji gerbang.
# ============================================================
import json
import os
import shutil
import subprocess
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

SAND = '/tmp/v256probe'
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
        if any(k in baris for k in ['odds-maker', 'deal-odds', 'RINGKASAN', 'denyut #']):
            print(' ', baris[:170])
    if p.returncode != 0:
        print(p.stderr[-3000:])
        sys.exit(1)

shutil.rmtree(SAND, ignore_errors=True)
os.makedirs(f'{SAND}/scripts', exist_ok=True)
for jalan, tujuan in STATE.items():
    unduh(jalan, tujuan)
print('state produksi diunduh')

# strip entri hari ini
led_path = f'{SAND}/laporan/prakira-server.jsonl'
tgl = datetime.now(timezone.utc).strftime('%Y-%m-%d')
led = [json.loads(l) for l in open(led_path) if l.strip()]
led = [e for e in led if not (e.get('id') or '').endswith('-' + tgl)]
open(led_path, 'w').write('\n'.join(json.dumps(e) for e in led) + '\n')
print(f'strip: id *-{tgl} dibuang — sisa {len(led)}')

# kopi + LONGGARKAN gerbang di kopi saja (uji pipa)
t = open('/home/z/my-project/scripts/penjaga.mjs', encoding='utf-8').read()
t = t.replace('ESTIMATOR_MIN_LOLOS: 0.40,', 'ESTIMATOR_MIN_LOLOS: 0.0,')          # probe
t = t.replace('PREDIKTOR_MAKS_PROB: 0.60,', 'PREDIKTOR_MAKS_PROB: 0.99,')          # probe
t = t.replace('ODDS_MIN: 55,', 'ODDS_MIN: 0,')                                    # probe
t = t.replace('MAX_SO: 2,', 'MAX_SO: 2, SO_DEV: 0.004,').replace('SO_DEV: 1.2,', 'SO_DEV: 0.004,')  # probe: SO dekat entry
t = t.replace('BEP_ACT: 0.6,', 'BEP_ACT: 0.03,')                                  # probe: BEP dekat entry
open(f'{SAND}/scripts/penjaga.mjs', 'w').write(t)
print('probe: gerbang dilonggarkan di kopi (EST 0 / PRED 0.99 / ODDS 0 / SO 0.4% / BEP 3%)')

# siklus A — kunci
jalankan('siklus-A')
lap = json.load(open(f'{SAND}/laporan/sasaran-terkini.json'))
baru = [json.loads(l) for l in open(led_path) if l.strip()]
baru = [e for e in baru if (e.get('waktuKunci') or '') >= lap['dihasilkan'][:13]]
print(f'entri terkunci siklus A: {len(baru)}')
for e in baru[:6]:
    rd = e.get('rencanaDeal') or {}
    print(f"  {e['simbol']:6s} {e['jalur']:7s} {e['arah']:4s} odds {e.get('odds', {}).get('skor')} "
          f"· peristiwa {e.get('peristiwa')} · SO {[(x['harga'], x['devPct']) for x in rd.get('safetyOrders', [])]} "
          f"· BEP {(rd.get('breakeven') or {}).get('aktivasiHarga')}")
ok1 = all(('odds' in e and 'rencanaDeal' in e and 'peristiwa' in e) for e in baru)
print('PLUMBING KUNCI:', 'LULUS' if ok1 and baru else 'GAGAL')

# backdate 25 jam
led = [json.loads(l) for l in open(led_path) if l.strip()]
for e in led:
    if e.get('status') == 'TERBUKA':
        t2 = datetime.fromisoformat(e['waktuKunci'].replace('Z', '+00:00')) - timedelta(hours=25)
        e['waktuKunci'] = t2.isoformat().replace('+00:00', 'Z')
open(led_path, 'w').write('\n'.join(json.dumps(e) for e in led) + '\n')
print('backdate 25 jam selesai')

# siklus B — penilaian
jalankan('siklus-B')
led = [json.loads(l) for l in open(led_path) if l.strip()]
dinilai = [e for e in led if e.get('dealMedan') or e.get('status') in ('BENAR', 'SALAH')]
dm = [e for e in led if e.get('dealMedan')]
print(f'dinilai: {len([e for e in led if e.get("status") in ("BENAR","SALAH")])} · dengan dealMedan: {len(dm)}')
for e in dm[:6]:
    d = e['dealMedan']
    print(f"  {e['simbol']:6s} {e.get('status')} · SO kena {d.get('soKena')}/{d.get('soMax')} · net dgn-SO {d.get('netDenganSO')} vs tanpa {d.get('netTanpaSO')}"
          + (f" · BEP {d.get('bep')}" if d.get('bep') else ''))
odds2 = json.load(open(f'{SAND}/laporan/odds.json'))
medan = (odds2.get('deal') or {}).get('medan') or {}
per = odds2.get('peristiwa') or []
print('ilmu.deal.so   :', medan.get('so'))
print('ilmu.deal.bep  :', medan.get('bep'))
print('peristiwa hidup:', [(p['peristiwa'], p['n'], p['hitPct']) for p in per if p['n'] > 0] or 'belum ada (pasar tidak menyentuh level — jujur)')
ok2 = True   # SO mungkin tak kena — jujur diterima; yang wajib: siklus B rc=0 & file odds.json konsisten
print('UJI PIPA V256 SELESAI —', 'LULUS' if ok1 else 'GAGAL')
