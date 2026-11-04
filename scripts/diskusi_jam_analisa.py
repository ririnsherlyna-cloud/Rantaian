# Diskusi jam 00:00 analisa harian — diukur dari data Binance NYATA (V274: tanpa karangan)
# Pertanyaan pemilik: apakah 00:00 (pergantian hari analisa) itu matang, atau perlu digeser?
# Metode: klines 1-jam futures Binance, ~60-80 hari, distribusi:
#   (1) jam WIB saat pump besar tercapai (jam kejadian max-rise 24j)
#   (2) max-rise 24j ke depan utk setiap jam-mulai (jam berapa terbaik menerbitkan laporan)
#   (3) khusus koin bermomentum (naik >5% dalam 24j terakhir) — konteks MAGMA/AXIS
import json, time, urllib.request, statistics
from collections import Counter

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

# Sampel koin: dari picks MICAPROFITA DB + kasus pemilik (MAGMA/AXIS) + top likuid
import sqlite3
con = sqlite3.connect("db/custom.db")
syms = [r[0] for r in con.execute(
    "SELECT DISTINCT symbol FROM Pick WHERE competitor='MICAPROFITA' ORDER BY RANDOM() LIMIT 22").fetchall()]
for s in ["MAGMAUSDT", "AXISUSDT"]:
    if s not in syms:
        syms.append(s)

print(f"Kandidat (spot USDT, dual-listed): {', '.join(syms)}")

MS_H = 3600_000
semua = {}          # sym -> list candle 1h
for s in syms:
    try:
        kl = get("/api/v3/klines", f"symbol={s}&interval=1h&limit=1000")
        t0 = kl[0][0] - MS_H
        kl2 = get("/api/v3/klines", f"symbol={s}&interval=1h&startTime={t0}&limit=1000") if t0 > 0 else []
        kl = (kl2[:-1] if kl2 and kl2[-1][0] == kl[0][0] else kl2) + kl
        if len(kl) > 1200:
            semua[s] = [(int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4])) for k in kl]
        time.sleep(0.25)
    except Exception as e:
        print(f"  {s} gagal: {str(e)[:60]}")

print(f"Koin berdata: {len(semua)} (total {sum(len(v) for v in semua.values()):,} candle 1j)")

def wib(utc_h): return (utc_h + 7) % 24

# ---- (1) JAM KEJADIAN max-rise: untuk tiap hari UTC tiap koin, jam UTC ke-berapa high harian tercapai
jam_kejadian = Counter()
for s, kl in semua.items():
    per_hari = {}
    for t, o, h, l, c in kl:
        per_hari.setdefault(t // 86400_000, []).append((t, o, h, l, c))
    for d, cans in per_hari.items():
        if len(cans) < 20: continue
        # max high, jam UTC index di dalam hari
        i_max = max(range(24), key=lambda i: cans[i][2] if i < len(cans) else -1)
        jam_kejadian[i_max] += 1
print("\n=== (1) JAM WIB SAAT HIGH HARIAN TERCAPAI (pump terjadi jam berapa) ===")
tot = sum(jam_kejadian.values())
for i in range(24):
    bar = "#" * round(60 * jam_kejadian[i] / tot)
    print(f"  {wib(i):02d}:00 WIB  {jam_kejadian[i]:4d} ({100*jam_kejadian[i]/tot:4.1f}%) {bar}")

# ---- (2) MAX-RISE 24J KE DEPAN per jam-mulai
hasil = {h: [] for h in range(24)}
for s, kl in semua.items():
    for i in range(0, len(kl) - 25, 1):
        h_utc = (kl[i][0] // MS_H) % 24
        base = kl[i][4]
        hi = max(c[2] for c in kl[i + 1: i + 25])
        hasil[h_utc].append((hi / base - 1) * 100)
print("\n=== (2) POTENSI MAKS 24 JAM KE DEPAN, DARI SETIAP JAM MULAI (semua koin) ===")
print("  jam mulai (UTC→WIB) | median  | p75   | p90   | P(>10%) | P(>30%)")
for h in range(24):
    v = sorted(hasil[h])
    n = len(v)
    med = v[n // 2] * 100 / 100
    p75 = v[int(n * 0.75)] if n else 0
    p90 = v[int(n * 0.90)] if n else 0
    p10 = sum(1 for x in v if x > 10) / n * 100
    p30 = sum(1 for x in v if x > 30) / n * 100
    print(f"  {h:02d}UTC={wib(h):02d}WIB     | {med:5.2f}%  | {p75:5.2f} | {p90:5.2f} | {p10:4.1f}%  | {p30:4.1f}%")

# ---- (3) KOIN BERMOMENTUM (naik >5% dalam 24j terakhir) — konteks MAGMA saat laporan pagi
hasil2 = {h: [] for h in range(24)}
n_mom = 0
for s, kl in semua.items():
    for i in range(24, len(kl) - 25, 1):
        base_now = kl[i][4]
        base24 = kl[i - 24][4]
        if base24 <= 0: continue
        if (base_now / base24 - 1) * 100 <= 5: continue
        h_utc = (kl[i][0] // MS_H) % 24
        hi = max(c[2] for c in kl[i + 1: i + 25])
        hasil2[h_utc].append((hi / base_now - 1) * 100)
        n_mom += 1
print(f"\n=== (3) KOIN BERMOMENTUM (+5%/24j) — {n_mom:,} kasus ===")
print("  jam mulai (UTC→WIB) | median | p75   | p90   | P(>10%) | P(>30%)")
for h in range(24):
    v = sorted(hasil2[h])
    n = len(v)
    if not n: continue
    med = v[n // 2]
    p75 = v[int(n * 0.75)]
    p90 = v[int(n * 0.90)]
    p10 = sum(1 for x in v if x > 10) / n * 100
    p30 = sum(1 for x in v if x > 30) / n * 100
    print(f"  {h:02d}UTC={wib(h):02d}WIB     | {med:5.2f}% | {p75:5.2f} | {p90:5.2f} | {p10:4.1f}%  | {p30:4.1f}%")

# ringkas: skor gabungan (median + p90) utk urutan jam terbaik
print("\n=== URUTAN JAM MULAI TERBAIK (skor = median + p90, semua koin) ===")
skor = []
for h in range(24):
    v = sorted(hasil[h]); n = len(v)
    if n: skor.append((v[n // 2] + v[int(n * 0.90)], h))
for sk, h in sorted(skor, reverse=True)[:6]:
    print(f"  {h:02d} UTC = {wib(h):02d}:00 WIB  skor {sk:.2f}")
