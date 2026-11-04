#!/usr/bin/env python3
# Interseksi zona racun: cari kombinasi kondisi dengan ekspektasi terburuk (n>=4)
import json
lines = [json.loads(l) for l in open('/home/z/my-project/scripts/forensik/prakira-server.jsonl') if l.strip()]
closed = [l for l in lines if l['status'] in ('BENAR', 'SALAH')]
DIM = ['struktur', 'momentum', 'sr', 'tekanan', 'perubahan']
for l in closed:
    sgn = 1 if l['arah'] == 'BUY' else -1
    l['sesuai'] = sum(1 for d in DIM if l['bukti'].get(d, 0) != -1 and l['bukti'].get(d, 0) * sgn > 0)
    t = l['bukti'].get('tekanan', 0)
    l['takerSearah'] = t != -1 and abs(t) >= 0.3 and t * sgn > 0
    l['takerMelawan'] = t != -1 and t * sgn < 0

def metrik(sub):
    n = len(sub)
    if not n: return None
    nets = [l['net'] for l in sub]
    benar = sum(1 for l in sub if l['status'] == 'BENAR')
    return (benar / n * 100, sum(nets) / n * 100, n)

# kombinasi kandidat zona racun
kombin = [
    ('SELL di TURUN + takerSearah', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'TURUN' and l['takerSearah']),
    ('SELL di TURUN + bukti>=3', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'TURUN' and l['sesuai'] >= 3),
    ('SELL di TURUN + keyakinan>=55', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'TURUN' and l['keyakinan'] >= 55),
    ('SELL TURUN + takerSearah + bukti>=3', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'TURUN' and l['takerSearah'] and l['sesuai'] >= 3),
    ('keyakinan 55-69 (semua arah)', lambda l: 55 <= l['keyakinan'] < 70),
    ('keyakinan 55-69 + takerSearah', lambda l: 55 <= l['keyakinan'] < 70 and l['takerSearah']),
    ('takerSearah + bukti>=3', lambda l: l['takerSearah'] and l['sesuai'] >= 3),
    ('takerSearah (apa pun)', lambda l: l['takerSearah']),
    ('BUY saat rezim bukan TURUN', lambda l: l['arah'] == 'BUY' and l['rezim'] != 'TURUN'),
    ('keyakinan>=55 (semua)', lambda l: l['keyakinan'] >= 55),
    ('keyakinan<55 (semua)', lambda l: l['keyakinan'] < 55),
    ('ZONA EMAS: SELL di NAIK', lambda l: l['arah'] == 'SELL' and l['rezim'] == 'NAIK'),
    ('ZONA EMAS: keyakinan<55 & takerMelawan', lambda l: l['keyakinan'] < 55 and l['takerMelawan']),
    ('ZONA EMAS: takerMelawan (apa pun)', lambda l: l['takerMelawan']),
]
print(f"{'kombinasi':45s} {'n':>3s} {'akurasi':>8s} {'ekspek':>8s}")
for nama, cond in kombin:
    m = metrik([l for l in closed if cond(l)])
    if m: print(f"{nama:45s} {m[2]:3d} {m[0]:7.1f}% {m[1]:+7.2f}%")

# berapa yang TERSIMPAN bila zona racun terburuk diblok?
print('\n-- Simulasi gerbang: blok kombinasi & hitung ulang portfolio --')
for nama, cond in kombin[:10]:
    blok = [l for l in closed if cond(l)]
    sisa = [l for l in closed if not cond(l)]
    m2 = metrik(sisa)
    if m2 and blok:
        print(f"blok '{nama}': buang {len(blok)} vonis (net {sum(l['net'] for l in blok)*100:+.1f}%) → sisa n={m2[2]} akurasi={m2[0]:.1f}% ekspek={m2[1]:+.2f}%")
