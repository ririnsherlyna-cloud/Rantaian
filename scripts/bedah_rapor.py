#!/usr/bin/env python3
# BEDAH RAPOR SAKTI — audit data prakira-server.jsonl untuk jawaban 4 kasus dev
import json, math, collections
from datetime import datetime, timezone

REPO = '/home/z/my-project/micaprofita'
rows = []
for line in open(f'{REPO}/laporan/prakira-server.jsonl'):
    line = line.strip()
    if line:
        rows.append(json.loads(line))

def hari(iso):
    return (iso or '')[:10]

def metrik(sel):
    """sel: list entri; return dict metrik"""
    dinilai = [r for r in sel if r.get('status') in ('BENAR', 'SALAH')]
    n = len(dinilai)
    if n == 0:
        return {'n': 0}
    nets = [r['net'] for r in dinilai if r.get('net') is not None]
    wins = [x for x in nets if x > 0]
    losses = [x for x in nets if x <= 0]
    bruto_win = sum(wins); bruto_loss = abs(sum(losses))
    pf = (bruto_win / bruto_loss) if bruto_loss > 0 else float('inf')
    net_sum = sum(nets)
    net_komp = 1.0
    for x in nets: net_komp *= (1 + x)
    net_komp = net_komp - 1
    return {
        'n': n, 'benar': sum(1 for r in dinilai if r['status'] == 'BENAR'),
        'akurasiPct': round(100 * sum(1 for r in dinilai if r['status'] == 'BENAR') / n, 1),
        'netSumPct': round(100 * net_sum, 2),
        'netKompPct': round(100 * net_komp, 2),
        'pf': round(pf, 3) if pf != float('inf') else 999,
        'ekspekPct': round(100 * (net_sum / n), 3),
        'menangRataPct': round(100 * (bruto_win / len(wins)), 2) if wins else 0,
        'rugiRataPct': round(100 * (-bruto_loss / len(losses)), 2) if losses else 0,
        'terbuka': sum(1 for r in sel if r.get('status') == 'TERBUKA'),
    }

def bagi(nama, sel, keluar):
    m = metrik(sel)
    if m.get('n', 0) or m.get('terbuka', 0):
        keluar.append((nama, m))

L = []  # laporan
L.append(('TOTAL SEMUA', metrik(rows)))

# Per jalur
for j in ('ARAH', 'PHOENIX'):
    bagi(f'jalur={j}', [r for r in rows if r.get('jalur') == j], L)

# Per arah
for a in ('BUY', 'SELL'):
    bagi(f'arah={a}', [r for r in rows if r.get('arah') == a], L)

# arah × jalur
for j in ('ARAH', 'PHOENIX'):
    for a in ('BUY', 'SELL'):
        bagi(f'{j}×{a}', [r for r in rows if r.get('jalur') == j and r.get('arah') == a], L)

# Selaras vs lawan rezim (saat KUNCI): SELL di rezim TURUN = selaras; BUY di NAIK = selaras
def selaras(r):
    if r['arah'] == 'SELL': return r.get('rezim') == 'TURUN'
    if r['arah'] == 'BUY': return r.get('rezim') == 'NAIK'
    return None
bagi('SELARAS-rezim', [r for r in rows if selaras(r) is True], L)
bagi('LAWAN-rezim', [r for r in rows if selaras(r) is False], L)
for j in ('ARAH', 'PHOENIX'):
    bagi(f'LAWAN-rezim|{j}', [r for r in rows if selaras(r) is False and r.get('jalur') == j], L)

# Bukti kunci: tekanan (taker-buy) searah?
# SELL menguntungkan bila tekanan negatif (taker-buy < 50%) → bukti.tekanan < 0
def tekanan_searah(r):
    t = (r.get('bukti') or {}).get('tekanan')
    if t is None: return None
    return (t < 0) if r['arah'] == 'SELL' else (t > 0)
bagi('tekanan-SEARAH', [r for r in rows if tekanan_searah(r) is True], L)
bagi('tekanan-LAWAN', [r for r in rows if tekanan_searah(r) is False], L)

# struktur (EMA20/50) searah
def struktur_searah(r):
    s = (r.get('bukti') or {}).get('struktur')
    if s is None: return None
    return (s < 0) if r['arah'] == 'SELL' else (s > 0)
bagi('struktur-SEARAH', [r for r in rows if struktur_searah(r) is True], L)
bagi('struktur-LAWAN', [r for r in rows if struktur_searah(r) is False], L)

# Per hari (waktuKunci)
per_hari = collections.defaultdict(list)
for r in rows: per_hari[hari(r.get('waktuKunci'))].append(r)
print('=== PER HARI (waktuKunci) ===')
for h in sorted(per_hari):
    m = metrik(per_hari[h])
    print(h, json.dumps(m))

# Keyakinan kalibrasi: bucket 40-49, 50-59, 60-69, 70+
print('=== KALIBRASI KEYAKINAN ===')
for lo in (30, 40, 50, 60, 70, 80):
    sel = [r for r in rows if lo <= (r.get('keyakinan') or 0) < lo + 10 and r.get('status') in ('BENAR', 'SALAH')]
    if sel:
        ak = 100 * sum(1 for r in sel if r['status'] == 'BENAR') / len(sel)
        km = sum(r.get('keyakinan') for r in sel) / len(sel)
        print(f'{lo}-{lo+9}: n={len(sel)} akurasi={ak:.1f}% keyakinan-rata={km:.1f} deviasi={ak-km:+.1f}pp net={100*sum(r["net"] for r in sel):+.2f}%')

# Stop/target keberadaan per jalur
print('=== STOP/TARGET ===')
for j in ('ARAH', 'PHOENIX', 'tanpa-jalur'):
    sel = [r for r in rows if (r.get('jalur') == j) or (j == 'tanpa-jalur' and not r.get('jalur'))]
    ada_s = sum(1 for r in sel if r.get('stop') not in (None, '', 0))
    ada_t = sum(1 for r in sel if r.get('target') not in (None, '', 0))
    print(f'{j}: n={len(sel)} stop_ada={ada_s} target_ada={ada_t}')

# Phoenix vs ARAH detail
print('=== BLOK UTAMA ===')
for nama, m in L:
    print(f'{nama:24s}', json.dumps(m))

# Simpan JSON utk laporan
hasil = {'tgl': datetime.now(timezone.utc).isoformat(), 'blok': [{'nama': n, **m} for n, m in L],
         'perHari': {h: metrik(v) for h, v in sorted(per_hari.items())}}
json.dump(hasil, open('/home/z/my-project/scripts/hasil_bedah.json', 'w'), ensure_ascii=False, indent=1)
print('\nDISIMPAN: scripts/hasil_bedah.json')
