# UJIAN EMPIRIS "JUAL POWER MAX AMBISIUS" — data Binance nyata, tanpa karangan.
# Pertanyaan: dari koin yang MENYENTUH level jual-ambisius, seberapa sering & sejauh
#             harga MELANJUTKAN naik dalam 24 jam berikutnya? Faktor pembeda apa?
# Metode meniru semangat sistem: ambisius per koin = kuantil-75 ekskursi harian
# (max high / open - 1) dari sejarah koin itu sendiri; entry = close hari-D-1
# (data yang tersedia saat laporan pagi); sentuhan dicari di hari-D (1h klines);
# kelanjutan = max high [sentuh .. sentuh+23] / level - 1.
import json, time, math, urllib.request
from collections import defaultdict

HOSTS = ["https://api.binance.com", "https://api1.binance.com", "https://data-api.binance.vision"]

def get(path, params=""):
    last = None
    for h in HOSTS:
        try:
            req = urllib.request.Request(f"{h}{path}?{params}", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except Exception as e:
            last = e
    raise last

import sqlite3
con = sqlite3.connect("db/custom.db")
syms = [r[0] for r in con.execute(
    "SELECT DISTINCT symbol FROM Pick WHERE competitor='MICAPROFITA' ORDER BY symbol").fetchall()]
# tambah top likuid bervolatil biar n besar
for s in ["SOLUSDT", "DOGEUSDT", "WIFUSDT", "PEPEUSDT", "LINKUSDT", "AVAXUSDT", "SUIUSDT", "ARBUSDT"]:
    if s not in syms:
        syms.append(s)

MS_H = 3600_000
data = {}
for s in syms:
    try:
        kl = get("/api/v3/klines", f"symbol={s}&interval=1h&limit=1000")
        t0 = kl[0][0] - MS_H
        kl2 = get("/api/v3/klines", f"symbol={s}&interval=1h&startTime={t0}&limit=1000")
        kl = kl2[:-1] + kl if kl2 and kl2[-1][0] == kl[0][0] else kl2 + kl
        data[s] = [(int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])) for k in kl]
        time.sleep(0.18)
    except Exception:
        pass

print(f"Koin berdata: {len(data)} | total {sum(len(v) for v in data.values()):,} candle 1j")

def rsi14(closes):
    if len(closes) < 15: return None
    naik = turun = 0.0
    for i in range(len(closes) - 14, len(closes)):
        d = closes[i] - closes[i - 1]
        if d > 0: naik += d
        else: turun -= d
    avgG, avgL = naik / 14, turun / 14
    if avgL == 0: return 100.0
    return 100 - 100 / (1 + avgG / avgL)

def kuantil(v, q):
    if not v: return None
    v = sorted(v)
    i = min(int(q * len(v)), len(v) - 1)
    return v[i]

kasus = []          # tiap sentuhan ambisius
n_hari = 0
for s, kl in data.items():
    # ekskursi harian per koin
    ekskursi = []
    per_hari = defaultdict(list)
    for c in kl:
        per_hari[c[0] // 86400_000].append(c)
    hari_urut = sorted(per_hari.keys())
    for d in hari_urut:
        cans = per_hari[d]
        if len(cans) < 20: continue
        ekskursi.append(max(c[2] for c in cans) / cans[0][1] - 1)
    ambF = kuantil(ekskursi, 0.75) if len(ekskursi) >= 10 else None
    if ambF is None or ambF < 0.01: continue
    closes = [c[4] for c in kl]
    for idx, d in enumerate(hari_urut):
        if idx == 0: continue
        cans = per_hari[d]
        if len(cans) < 20: continue
        prev = per_hari[hari_urut[idx - 1]]
        if len(prev) < 20: continue
        n_hari += 1
        entry = prev[-1][4]
        if entry <= 0: continue
        level = entry * (1 + ambF)
        # jam sentuhan pertama (butuh 24 candle sebelum utk fitur → mulai idx global >= 24)
        gpos = {id(c): i for i, c in enumerate(kl)}
        first = None
        for c in cans:
            if c[2] >= level:
                gi = gpos[id(c)]
                if gi >= 24:
                    first = (c, gi)
                break
        if first is None: continue
        c, gi = first
        end = min(gi + 24, len(kl) - 1)
        hi_lanjut = max(kl[j][2] for j in range(gi, end + 1))
        lanjut = hi_lanjut / level - 1
        # fitur saat jam SEBELUM sentuh
        rs = rsi14(closes[max(0, gi - 14):gi])
        v6 = sum(kl[j][5] for j in range(max(0, gi - 6), gi))
        v48 = sum(kl[j][5] for j in range(max(0, gi - 54), max(0, gi - 6))) / 48
        spike = v6 / (v48 * 6) if v48 > 0 else 1.0
        w = kl[max(0, gi - 24):gi]
        hi24 = max(x[2] for x in w); lo24 = min(x[3] for x in w)
        posisi = (c[4] - lo24) / (hi24 - lo24) if hi24 > lo24 else 0.5
        kasus.append({
            "s": s, "hari": d, "entry": entry, "level": level,
            "ambF": ambF, "jamSentuh": cans.index(c), "lanjut24": lanjut,
            "rsi": rs, "spike": spike, "posisi": posisi,
            "t_ms": c[0],
        })

n = len(kasus)
print(f"\nHari dipindai: {n_hari:,} | kasus SENTUH-AMBISIUS: {n}")
if n < 30:
    print("Sampel kurang — ujian TIDAK SAH."); raise SystemExit

l24 = [k["lanjut24"] for k in kasus]
print("Distribusi kelanjutan 24j pasca-ambisius (% di atas level ambisius):")
for q, nama in [(0.5, "median"), (0.6, "p60"), (0.65, "p65"), (0.75, "p75"), (0.9, "p90")]:
    print(f"  {nama}: {kuantil(l24, q)*100:+.2f}%")
for th in [0.02, 0.05, 0.10, 0.15, 0.20]:
    p = sum(1 for x in l24 if x >= th) / n * 100
    print(f"  P(lanjut >= +{th*100:.0f}%): {p:.1f}%")

# Kandidat K: kuantil-60 → P(lanjut>=K)=40% ("sering tercapai" dlm konteks kondisional)
K = round(kuantil(l24, 0.60) * 200) / 200
P_K = sum(1 for x in l24 if x >= K) / n * 100
print(f"\nK FINAL (p60 dibulatkan 0.5%): +{K*100:.1f}% di atas ambisius → P={P_K:.1f}%")

# validasi stabilitas waktu: paruh pertama vs kedua
kasus.sort(key=lambda k: k["t_ms"])
h1, h2 = kasus[: n // 2], kasus[n // 2:]
for nm, hh in [("paruh-1", h1), ("paruh-2", h2)]:
    ll = [x["lanjut24"] for x in hh]
    print(f"  {nm}: n={len(hh)} p60={kuantil(ll,0.6)*100:+.2f}% P(>=K)={sum(1 for x in ll if x>=K)/len(hh)*100:.1f}%")

# faktor pembeda: bagi di median fitur, bandingkan median kelanjutan
print("\nFaktor pembeda (median kelanjutan atas-vs-bawah median fitur):")
for f in ["rsi", "spike", "posisi", "jamSentuh"]:
    vals = sorted([k[f] for k in kasus if k[f] is not None])
    med = kuantil(vals, 0.5)
    atas = [k["lanjut24"] for k in kasus if k[f] is not None and k[f] >= med]
    bawah = [k["lanjut24"] for k in kasus if k[f] is not None and k[f] < med]
    if atas and bawah:
        print(f"  {f:10s} >= {med:6.2f}: med {kuantil(atas,0.5)*100:+6.2f}% (n={len(atas)}) | < {med:6.2f}: med {kuantil(bawah,0.5)*100:+6.2f}% (n={len(bawah)})")

# aturan gabungan sederhana (uji kejujuran): RSI tidak ekstrem (>70) & spike >= 1.5
lolos = [k["lanjut24"] for k in kasus if k["rsi"] is not None and k["rsi"] <= 70 and k["spike"] >= 1.5]
gagal = [k["lanjut24"] for k in kasus if not (k["rsi"] is not None and k["rsi"] <= 70 and k["spike"] >= 1.5)]
def stat(v):
    return f"n={len(v)} med {kuantil(v,0.5)*100:+.2f}% P(>=K)={sum(1 for x in v if x>=K)/len(v)*100:.1f}%" if v else "n=0 (kosong)"
print(f"\nAturan coba: RSI<=70 & volSpike>=1.5 → lolos {stat(lolos)} | sisanya {stat(gagal)}")

import os
os.makedirs("research/ujian-powermax", exist_ok=True)
out = {
    "at": "2026-10-23", "sumber": "klines 1h Binance spot nyata (api.binance.com)",
    "koin": len(data), "hariDipindai": n_hari, "nSentuhAmbisius": n,
    "kelanjutan24": {f"p{int(q*100)}": round(kuantil(l24, q), 4) for q in [0.5, 0.6, 0.75, 0.9]},
    "probabilitas": {f"lanjut>={int(t*100)}%": round(sum(1 for x in l24 if x >= t) / n, 4) for t in [0.02, 0.05, 0.10, 0.15]},
    "K_final": K, "P_lanjut_sampai_K": round(P_K / 100, 4),
    "stabilitas": {nm: {"n": len(hh), "p60": round(kuantil([x['lanjut24'] for x in hh], 0.6), 4),
                        "pK": round(sum(1 for x in hh if x["lanjut24"] >= K) / len(hh), 4)} for nm, hh in [("paruh1", h1), ("paruh2", h2)]},
    "aturan": {"rsi_max": 70, "spike_min": 1.5,
               "n_lolos": len(lolos), "P_K_lolos": round(sum(1 for x in lolos if x >= K) / max(1, len(lolos)), 4),
               "n_gagal": len(gagal), "P_K_gagal": round(sum(1 for x in gagal if x >= K) / max(1, len(gagal)), 4)},
    "kasus": kasus,
}
with open("research/ujian-powermax/hasil.json", "w") as f:
    json.dump(out, f)
print("\nTersimpan: research/ujian-powermax/hasil.json")
