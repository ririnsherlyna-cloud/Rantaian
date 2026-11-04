#!/usr/bin/env python3
# FORENSIK KERUGIAN SAKTI — bedah 43 vonis tertutup: di kondisi apa dia menang/kalah
import json, math
from collections import Counter, defaultdict

lines = [json.loads(l) for l in open('/home/z/my-project/scripts/forensik/prakira-server.jsonl') if l.strip()]
closed = [l for l in lines if l['status'] in ('BENAR', 'SALAH')]

def metrik(sub):
    if not sub: return 'n=0'
    nets = [l['net'] for l in sub]
    w = [n for n in nets if n > 0]; L = [n for n in nets if n <= 0]
    benar = sum(1 for l in sub if l['status'] == 'BENAR')
    pf = sum(w) / abs(sum(L)) if L and sum(L) != 0 else float('inf')
    return (f"n={len(sub):2d} akurasi={benar/len(sub)*100:5.1f}% net={sum(nets)*100:+6.1f}% "
            f"PF={pf:.2f} ekspek={sum(nets)/len(sub)*100:+.2f}% "
            f"(menangRata={sum(w)/len(w)*100 if w else 0:+.1f}% kalahRata={sum(L)/len(L)*100 if L else 0:+.1f}%)")

print('=' * 100)
print('DASAR (semua tertutup):', metrik(closed))

print('\n== 1. ARAH x REZIM (apakah melawan arus membunuh kita?) ==')
for arah in ('BUY', 'SELL'):
    for rez in ('NAIK', 'TURUN', 'DATAR', 'PARABOLIK'):
        sub = [l for l in closed if l['arah'] == arah and l['rezim'] == rez]
        if sub: print(f'  {arah:4s} di rezim {rez:10s}: {metrik(sub)}')

print('\n== 2. KEYAKINAN (apakah keyakinan tinggi = menang lebih?) ==')
for lo, hi, nama in ((0, 55, '<55'), (55, 62, '55-61'), (62, 70, '62-69'), (70, 101, '>=70')):
    sub = [l for l in closed if lo <= l['keyakinan'] < hi]
    print(f'  keyakinan {nama:6s}: {metrik(sub)}')

print('\n== 3. KESELARASAN BUKTI-ARAH (tanda bukti vs arah yang dipilih) ==')
DIM = ['struktur', 'momentum', 'sr', 'tekanan', 'perubahan']
for l in closed:
    sgn = 1 if l['arah'] == 'BUY' else -1
    l['_sesuai'] = sum(1 for d in DIM if (l['bukti'].get(d, 0) != -1) and (l['bukti'].get(d, 0) * sgn > 0))
    l['_melawan'] = sum(1 for d in DIM if (l['bukti'].get(d, 0) != -1) and (l['bukti'].get(d, 0) * sgn < 0))
for lo, hi, nama in ((0, 1, 'bukti nyaris tak mendukung (0 sesuai)'), (1, 3, '1-2 sesuai'), (3, 6, '3-5 sesuai')):
    sub = [l for l in closed if lo <= l['_sesuai'] < hi]
    print(f'  {nama:36s}: {metrik(sub)}')
print('  -- dimensi mana yang paling sering melawan arah pada prediksi SALAH --')
for d in DIM:
    salah_melawan = sum(1 for l in closed if l['status'] == 'SALAH' and l['bukti'].get(d, 0) != -1 and l['bukti'].get(d, 0) * (1 if l['arah'] == 'BUY' else -1) < 0)
    benar_melawan = sum(1 for l in closed if l['status'] == 'BENAR' and l['bukti'].get(d, 0) != -1 and l['bukti'].get(d, 0) * (1 if l['arah'] == 'BUY' else -1) < 0)
    print(f'    {d:10s}: melawan-arah di {salah_melawan} SALAH vs {benar_melawan} BENAR')

print('\n== 4. DAYA (volatilitas/likuiditas/volume) ==')
for k in ('volume', 'volatilitas', 'likuiditas'):
    vals = sorted(set(l['daya'].get(k) for l in closed))
    for v in vals:
        sub = [l for l in closed if l['daya'].get(k) == v]
        print(f'  {k}={v}: {metrik(sub)}')

print('\n== 5. KOIN PEMBUNUH (top kerugian) ==')
per = defaultdict(lambda: {'n': 0, 'net': 0.0, 'benar': 0})
for l in closed:
    p = per[l['simbol']]; p['n'] += 1; p['net'] += l['net']; p['benar'] += l['status'] == 'BENAR'
for s, p in sorted(per.items(), key=lambda x: x[1]['net'])[:8]:
    print(f"  {s:12s}: n={p['n']} net={p['net']*100:+.1f}% akurasi={p['benar']}/{p['n']}")

print('\n== 6. TEKANAN TAKER (align tekanan dengan arah?) ==')
for nama, cond in (
    ('tekanan searah kuat (|t|>=0.3 searah)', lambda l: abs(l['bukti'].get('tekanan', 0)) >= 0.3 and l['bukti'].get('tekanan', 0) * (1 if l['arah'] == 'BUY' else -1) > 0),
    ('tekanan melawan (melawan arah)', lambda l: l['bukti'].get('tekanan', 0) * (1 if l['arah'] == 'BUY' else -1) < 0),
    ('tekanan netral/sr sentinel', lambda l: abs(l['bukti'].get('tekanan', 0)) < 0.3 or l['bukti'].get('tekanan', 0) == -1),
):
    sub = [l for l in closed if cond(l)]
    print(f'  {nama:40s}: {metrik(sub)}')

print('\n== 7. JAM KUNCI (UTC) ==')
for lo, hi in ((0, 6), (6, 12), (12, 18), (18, 24)):
    sub = [l for l in closed if lo <= int(l['waktuKunci'][11:13]) < hi]
    print(f'  jam {lo:02d}-{hi:02d} UTC: {metrik(sub)}')

print('\n== 8. SKOR vs HASIL (apakah model skor informatif?) ==')
def sk(l): return l.get('skor', l.get('skorPhoenix', 0)) or 0
print('  -- jalur ARAH vs jalur PHOENIX --')
print('  ARAH :', metrik([l for l in closed if not l['id'].startswith('PHX')]))
print('  PHX  :', metrik([l for l in closed if l['id'].startswith('PHX')]))
sub_hi = [l for l in closed if abs(sk(l)) >= 0.5]
sub_lo = [l for l in closed if abs(sk(l)) < 0.5]
print(f'  |skor|>=0.5: {metrik(sub_hi)}')
print(f'  |skor|<0.5 : {metrik(sub_lo)}')
korek = [l for l in closed if (sk(l) > 0) == (l['arah'] == 'BUY')]
print(f'  arah == tanda skor: {metrik(korek)}')
korek2 = [l for l in closed if (sk(l) > 0) != (l['arah'] == 'BUY')]
print(f'  arah != tanda skor: {metrik(korek2)}')

print('\n== 9. KRONOLOGIS: net kumulatif dari waktu ke waktu ==')
urut = sorted(closed, key=lambda l: l['waktuDinilai'])
cum = 0.0
for l in urut:
    cum += l['net']
    l['_cum'] = cum
for i in range(0, len(urut), 8):
    l = urut[min(i + 7, len(urut) - 1)]
    print(f"  s/d {l['waktuDinilai'][:10]} (vonis {min(i+8, len(urut)):2d}): cum={l['_cum']*100:+.1f}%")

print('\n== 10. ZONA NO-TRADE kandidat (kondisi dengan ekspektasi negatif terburuk) ==')
zona = []
def uji(nama, cond):
    sub = [l for l in closed if cond(l)]
    if len(sub) >= 4:
        nets = [l['net'] for l in sub]
        benar = sum(1 for l in sub if l['status'] == 'BENAR')
        zona.append((sum(nets) / len(sub), nama, len(sub), benar))
uji('SELL saat rezim NAIK', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'NAIK')
uji('BUY saat rezim TURUN', lambda l: l['arah'] == 'BUY' and l['rezim'] == 'TURUN')
uji('keyakinan < 62', lambda l: l['keyakinan'] < 62)
uji('tekanan melawan arah', lambda l: l['bukti'].get('tekanan', 0) * (1 if l['arah'] == 'BUY' else -1) < 0)
uji('volatilitas daya = 1 (mencekik)', lambda l: l['daya'].get('volatilitas') == 1)
uji('bukti sesuai <= 1', lambda l: l.get('_sesuai', 3) <= 1)
for e, n, c, b in sorted(zona):
    print(f'  ekspek={e*100:+.2f}% akurasi={b}/{c} ({b/c*100:.0f}%) — {n}')
