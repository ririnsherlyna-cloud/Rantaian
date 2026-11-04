# Bedah OPGUSDT untuk vonis posisi SHORT @0.1475 (data Binance nyata, jalur api-gcp)
import json, time, urllib.request

BASE = "https://api1.binance.com"  # api1-api4 hidup; api-gcp & api utama kena ban sementara

def get(path):
    req = urllib.request.Request(BASE + path, headers={"User-Agent": "micaprofita-bedah/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode())

def ema(vals, period):
    k = 2 / (period + 1); e = sum(vals[:period]) / period
    for v in vals[period:]: e = v * k + e * (1 - k)
    return e

def rsi(closes, period=14):
    g = l = 0.0
    for i in range(1, period + 1):
        d = closes[i] - closes[i - 1]
        if d > 0: g += d
        else: l -= d
    ag, al = g / period, l / period
    for i in range(period + 1, len(closes)):
        d = closes[i] - closes[i - 1]
        ag = (ag * (period - 1) + max(d, 0)) / period
        al = (al * (period - 1) + max(-d, 0)) / period
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)

def pct(a, b): return (a - b) / b * 100

t0 = get("/api/v3/ticker/24hr?symbol=OPGUSDT")
last = float(t0["lastPrice"]); hi24 = float(t0["highPrice"]); lo24 = float(t0["lowPrice"])
qv = float(t0["quoteVolume"]); chg = float(t0["priceChangePercent"])

d = get("/api/v3/klines?symbol=OPGUSDT&interval=1d&limit=70")
closes = [float(x[4]) for x in d]; highs = [float(x[2]) for x in d]; lows = [float(x[3]) for x in d]; vols = [float(x[5]) for x in d]

r14 = rsi(closes, 14)
e9, e21, e50 = ema(closes, 9), ema(closes, 21), ema(closes, 50)
atr = sum(max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1])) for i in range(1, 15)) / 14
atr_pct = atr / last * 100
mom7 = pct(last, closes[-8]); mom30 = pct(last, closes[-31])
hi60 = max(highs[-60:]); lo60 = min(lows[-60:])
vol_surge = vols[-1] / (sum(vols[-8:-1]) / 7) if len(vols) > 8 else 1

# klines 1 jam untuk struktur intraday hari ini
h = get("/api/v3/klines?symbol=OPGUSDT&interval=1h&limit=48")
hhighs = [float(x[2]) for x in h]; hlows = [float(x[3]) for x in h]; hcloses = [float(x[4]) for x in h]
jam_ini_hi, jam_ini_lo = hhighs[-12:], hlows[-12:]
today_hi, today_lo = max(hhighs[-10:]), min(hlows[-10:])

print("=== OPGUSDT · Binance langsung ·", time.strftime("%Y-%m-%d %H:%M", time.gmtime(t0["closeTime"]/1000)), "UTC ===")
print(f"HARGA KINI      : {last:.4f}  ({chg:+.2f}% 24 jam)")
print(f"HIGH/LOW 24J    : {hi24:.4f} / {lo24:.4f}")
print(f"VOLUME 24J      : {qv:,.0f} USDT  (likuid? {'YA' if qv >= 5_000_000 else 'TIDAK - tipis'})")
print(f"RSI-14 (1D)     : {r14:.1f}")
print(f"EMA 9/21/50     : {e9:.4f} / {e21:.4f} / {e50:.4f}  -> align {'NAIK' if e9>e21>e50 else 'CAMPUR' if e9>e50 else 'TURUN'}")
print(f"ATR-14          : {atr:.4f} ({atr_pct:.1f}% per hari)")
print(f"MOM 7H/30H      : {mom7:+.1f}% / {mom30:+.1f}%")
print(f"PUNCAK60/DASAR60: {hi60:.4f} / {lo60:.4f}  (jarak dari puncak {pct(last,hi60):+.1f}%)")
print(f"VOL SURGE       : {vol_surge:.2f}x")
print(f"STRUKTUR 10 JAM : high {today_hi:.4f} / low {today_lo:.4f}")
print(f"5 low jam terakhir: {[f'{x:.4f}' for x in hlows[-5:]]}")
print(f"5 close jam terakhir: {[f'{x:.4f}' for x in hcloses[-5:]]}")

# posisi short user
entry = 0.1475
pnls = (entry - last) / entry * 100
print(f"\n=== POSISI SHORT @ {entry} ===")
print(f"P/L TANPA LEVERAGE : {pnls:+.2f}%")
for lv in (2, 3, 5, 10):
    print(f"  leverage {lv:2d}x -> {pnls*lv:+.1f}% dari margin")
print(f"Harga breakeven    : {entry:.4f}")
print(f"Jarak harga kini ke entry: {pct(last, entry):+.2f}% (harga {('DI ATAS entry -> short RUGI' if last > entry else 'DI BAWAH entry -> short UNTUNG')})")
# level likuidasi kasar (maintenance ~0.5-1% di bourse kecil, pakai 1%)
liq = entry * (1 + 1 / 1 - 0.01)  # short: liq saat harga naik ~ (1/lv) - mm
for lv in (2, 3, 5, 10):
    print(f"  estimasi likuidasi kasar {lv:2d}x : {entry * (1 + 0.99/lv):.4f}")

# level kunci
print("\n=== LEVEL KUNCI ===")
print(f"Resistance: {hi24:.4f} (high 24j), {hi60:.4f} (puncak 60 hari)")
print(f"Support   : {today_lo:.4f} (low 10 jam), {lo24:.4f} (low 24j), {entry:.4f} (entry kamu), {lo60:.4f} (dasar 60 hari)")
