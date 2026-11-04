# Bedah OPGUSDT OFFLINE dari data tersimpan (opg_1h.json 48 candle 1j + opg_t24.json ticker)
import json, time
from datetime import datetime, timezone

d1h = json.load(open("/home/z/my-project/scripts/jaga_fix/opg_1h.json"))
t24 = json.load(open("/home/z/my-project/scripts/jaga_fix/opg_t24.json"))

last = float(t24["lastPrice"]); hi24 = float(t24["highPrice"]); lo24 = float(t24["lowPrice"])
chg = float(t24["priceChangePercent"]); qv = float(t24["quoteVolume"])
entry = 0.1475

closes = [float(x[4]) for x in d1h]; highs = [float(x[2]) for x in d1h]
lows = [float(x[3]) for x in d1h]; vols = [float(x[5]) for x in d1h]
opens = [float(x[1]) for x in d1h]

def ema(vals, period):
    k = 2 / (period + 1); e = sum(vals[:period]) / period
    for v in vals[period:]: e = v * k + e * (1 - k)
    return e

def rsi(vals, period=14):
    g = l = 0.0
    for i in range(1, period + 1):
        d = vals[i] - vals[i - 1]
        g += d if d > 0 else 0; l += -d if d < 0 else 0
    ag, al = g / period, l / period
    for i in range(period + 1, len(vals)):
        d = vals[i] - vals[i - 1]
        ag = (ag * (period - 1) + max(d, 0)) / period
        al = (al * (period - 1) + max(-d, 0)) / period
    return 100.0 if al == 0 else 100 - 100 / (1 + ag / al)

def pct(a, b): return (a - b) / b * 100

now_ms = d1h[-1][6]
print("=== OPGUSDT · Binance · data 48 jam 1h + ticker 24j ===")
print("Waktu candle terakhir (UTC):", datetime.fromtimestamp(now_ms/1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M"))
print(f"HARGA KINI : {last:.4f}  ({chg:+.2f}% / 24j)")
print(f"HIGH/LOW24 : {hi24:.4f} / {lo24:.4f}   QV: {qv:,.0f} USDT ({'LIKUID' if qv>=5e6 else 'TIPIS <5jt'})")
print(f"RSI-14 (1h): {rsi(closes):.1f}")
print(f"EMA9/21 (1h): {ema(closes,9):.4f} / {ema(closes,21):.4f} -> {'NAIK' if ema(closes,9)>ema(closes,21) else 'TURUN'}")
print(f"ATR-14 (1h): {sum(max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1])) for i in range(1,15))/14:.4f} ({sum(max(highs[i]-lows[i], abs(highs[i]-closes[i-1]), abs(lows[i]-closes[i-1])) for i in range(1,15))/14/last*100:.1f}%/hari setara)")

# hari UTC ini = candle yang open-nya >= 00:00 UTC hari ini
today_start = datetime.fromtimestamp(now_ms/1000, tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).timestamp()*1000
idx = [i for i, x in enumerate(d1h) if x[0] >= today_start]
t_hi = max(highs[i] for i in idx); t_lo = min(lows[i] for i in idx); t_op = opens[idx[0]]
print(f"\nHARI INI (UTC {len(idx)} jam berjalan): open {t_op:.4f}  high {t_hi:.4f}  low {t_lo:.4f}")
print(f"Low 24 jam terakhir: {lo24:.4f}  (terjadi {datetime.fromtimestamp(d1h[lows.index(min(lows))][0]/1000, tz=timezone.utc).strftime('%d %b %H:%M')} UTC)")

# Posisi short
pl = (entry - last) / entry * 100
print(f"\n=== POSISI SHORT @ {entry:.4f} ===")
print(f"P/L tanpa leverage : {pl:+.2f}%  (harga {'DI ATAS' if last>entry else 'DI BAWAH'} entry)")
for lv in (2, 3, 5, 10):
    liq = entry * (1 + 0.99 / lv)
    print(f"  {lv:2d}x -> P/L {pl*lv:+.1f}% margin | likuidasi kasar ~{liq:.4f} ({pct(liq,last):+.1f}% dari harga kini)")

print(f"\nBreak-even short   : {entry:.4f}")
print(f"Resistance di atas : {hi24:.4f} (high 24j) -> {pct(hi24,last):+.2f}% dari kini")
print(f"Support di bawah   : {entry:.4f} (entry kamu) -> {pct(entry,last):+.2f}% | lalu {t_lo:.4f} (low hari ini) -> {pct(t_lo,last):+.2f}% | lalu {lo24:.4f} (low 24j)")

# Struktur jam: berapa kali harga sentuh entry sejak posisi?
touch = [i for i, x in enumerate(d1h) if float(x[3]) <= entry <= float(x[2])]
print(f"\nCandle 1h yang menyentuh zona entry 0.1475: {len(touch)} dari 48 jam terakhir")
if touch:
    print("  terakhir:", datetime.fromtimestamp(d1h[touch[-1]][0]/1000, tz=timezone.utc).strftime("%d %b %H:%M"), "UTC")
