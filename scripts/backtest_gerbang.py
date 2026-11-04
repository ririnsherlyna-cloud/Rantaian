#!/usr/bin/env python3
# BACKTEST GERBANG V262 — simulasikan gerbang baru mundur ke ledger historis
import json

REPO = '/home/z/my-project/micaprofita'
rows = [json.loads(l) for l in open(f'{REPO}/laporan/prakira-server.jsonl') if l.strip()]
D = [r for r in rows if r.get('status') in ('BENAR', 'SALAH')]

def rapor(sel, nama):
    if not sel:
        print(f'{nama:34s} n=0'); return
    nets = [r['net'] for r in sel]
    w = sum(1 for r in sel if r['status'] == 'BENAR')
    bw = sum(x for x in nets if x > 0); bl = abs(sum(x for x in nets if x <= 0))
    pf = bw / bl if bl > 0 else 99
    print(f'{nama:34s} n={len(sel):2d} ak={100*w/len(sel):5.1f}% netSum={100*sum(nets):+7.2f}% PF={pf:5.2f} ekspek={100*sum(nets)/len(sel):+.2f}%')

# --- kalibrasi MULTIPLIKATIF medan: keyakinan × (akurasiLane/keyakinanRataLane) ---
# jalur tanpa label (LAMA) digabung ke ARAH (satu garis keturunan engine)
def jalur_ef(r):
    j = r.get('jalur') or 'ARAH'
    return 'ARAH' if j == 'LAMA' else j

def kalib_medan(sel):
    if len(sel) < 6: return 1.0  # sampel kecil → netral (fallback jujur)
    km = sum(r.get('keyakinan') or 0 for r in sel) / len(sel)
    ak = 100 * sum(1 for r in sel if r['status'] == 'BENAR') / len(sel)
    return max(0.3, min(1.2, ak / km if km > 0 else 1.0))

kA = kalib_medan([r for r in D if jalur_ef(r) == 'ARAH'])
kP = kalib_medan([r for r in D if jalur_ef(r) == 'PHOENIX'])
print(f'faktor kalibrasi medan: ARAH={kA:.3f} PHOENIX={kP:.3f}')
AMBANG_KALIB = 40  # pada skala terkalibrasi

def lolos_zona(r):
    sr = (r.get('bukti') or {}).get('sr')
    if sr is None: return True  # data lama tanpa sr: tak diblokir (fallback jujur)
    if r['arah'] == 'SELL' and sr <= -0.5: return False   # menjual di dasar rentang
    if r['arah'] == 'BUY' and sr >= 0.5: return False     # membeli di puncak rentang
    return True

def lolos_kalib(r):
    f = kA if jalur_ef(r) == 'ARAH' else kP
    return (r.get('keyakinan') or 0) * f >= AMBANG_KALIB

# kuota ARAH dinamis: shrinkage EV trailing — simulasikan kuota 3/hari untuk ARAH
def dgn_kuota(sel, kuota_arah):
    per_hari = {}
    keep = []
    for r in sel:  # rows sudah urut waktu
        h = (r.get('waktuKunci') or '')[:10]
        j = jalur_ef(r)
        k = (h, j)
        per_hari.setdefault(k, 0)
        batas = kuota_arah if j == 'ARAH' else 99
        if per_hari[k] < batas:
            per_hari[k] += 1; keep.append(r)
    return keep

rapor(D, 'BASELINE (apa adanya)')
z = [r for r in D if lolos_zona(r)]
rapor(z, 'GERBANG ZONA saja')
k = [r for r in D if lolos_kalib(r)]
rapor(k, 'GERBANG KALIBRASI saja')
q = dgn_kuota(D, 3)
rapor(q, 'KUOTA ARAH=3/hari saja')
zk = [r for r in D if lolos_zona(r) and lolos_kalib(r)]
rapor(zk, 'ZONA+KALIBRASI')
zkq = dgn_kuota(zk, 3)
rapor(zkq, 'ZONA+KALIBRASI+KUOTA3 (paket penuh)')

# rincian per jalur paket penuh
print()
for j in ('ARAH', 'PHOENIX'):
    rapor([r for r in zkq if jalur_ef(r) == j], f'  paket|{j}')

# hari 29 Sep dengan paket penuh
print()
rapor([r for r in zkq if (r.get('waktuKunci') or '')[:10] == '2026-09-29'], '  paket|hari-29-Sep')
rapor([r for r in zkq if (r.get('waktuKunci') or '')[:10] == '2026-09-28'], '  paket|hari-28-Sep')
