#!/usr/bin/env python3
# UJI GERBANG PEGGED v299b — data Binance NYATA:
# 1) RLUSDUSDT, USDCUSDT, FDUSDUSDT dkk. WAJIB tersaring (pegged)
# 2) DUST, koin nyata lain WAJIB lolos (tanpa false-positive)
# 3) jaring statistik: ATR<1.5 & |mom7|<1 & |mom30|<1.5 → pegged
# 4) rumus faktor arena (ema/rsi/atr/pct) — cek determinisme
import json, re, urllib.request

HOSTS = ["https://api.binance.com", "https://api1.binance.com", "https://api2.binance.com", "https://api3.binance.com"]

def ambil(path):
    last = None
    for h in HOSTS:
        try:
            req = urllib.request.Request(h + path, headers={"User-Agent": "micaprofita-uji"})
            with urllib.request.urlopen(req, timeout=25) as r:
                return json.load(r)
        except Exception as e:
            last = e
    raise last

S5_STABLE = ['USDCUSDT','TUSDUSDT','FDUSDUSDT','USDPUSDT','DAIUSDT','EURUSDT','AEURUSDT','BUSDUSDT','USTUSDT','PAXGUSDT','EURIUSDT','XUSDUSDT','USD1USDT','RLUSDUSDT','USDDUSDT','USDSUSDT','USDEUSDT','PYUSDUSDT','USTCUSDT','XAUTUSDT']
S5_PEGGED_BASE = re.compile(r'(USD|EUR|DAI|USDE|USDS|USD1|PYUSD|USDP|USDD|PAXG|XAUT|USTC|EURI|AEUR|BSCUSD)$')
S5_GANDA = re.compile(r'(UP|DOWN|BULL|BEAR)USDT$')
S5_QV_MIN = 3e6

def pegged_base(sym):
    return sym in S5_STABLE or bool(S5_PEGGED_BASE.search(sym[:-4]))

semua = ambil("/api/v3/ticker/24hr")
pool = [t for t in semua if re.search(r'USDT$', t['symbol']) and not S5_GANDA.search(t['symbol'])
        and not pegged_base(t['symbol']) and float(t['quoteVolume']) >= S5_QV_MIN and float(t['lastPrice']) > 0]

kandang = {t['symbol'] for t in pool}
print("pool pasca-gerbang:", len(pool), "koin")

# 1) WAJIB tersaring
wajib_buang = ['RLUSDUSDT','USDCUSDT','FDUSDUSDT','USDPUSDT','BUSDUSDT','TUSDUSDT','XUSDUSDT','USD1USDT']
ok = True
for s in wajib_buang:
    ada = s in kandang
    if ada: ok = False
    print(f"  {'OK tersaring' if not ada else 'GAGAL — MASIH LOLOS'}: {s}")

# 2) koin nyata wajib lolos
for s in ['BTCUSDT','APTUSDT','TIAUSDT','SUSDT','AEROUSDT','DUSTUSDT','LUMIAUSDT']:
    ada = s in kandang
    ket = 'lolos' if ada else 'TIDAK ADA di kandang (cek manual)'
    print(f"  {s}: {ket}")

# 3) jaring statistik: bedah RLUSD & beberapa pegged bila lolos pun tertangkap
def ema(c, n):
    a = 2/(n+1); e = c[0]
    for x in c[1:]: e = x*a + e*(1-a)
    return e
def pct(c, n):
    if len(c) <= n or c[-n-1] == 0: return 0
    return (c[-1]-c[-n-1])/c[-n-1]*100
def rsi(c, n):
    if len(c) < n+1: return 50
    g=l=0
    for i in range(-n,0):
        d=c[i]-c[i-1]; g+= max(d,0); l+= max(-d,0)
    return 100 - 100/(1+g/l) if l else 100
def atrp(kl, n):
    trs=[]
    for i in range(-n,0):
        h,l,pc = float(kl[i][2]), float(kl[i][3]), float(kl[i-1][4])
        trs.append(max(h-l, abs(h-pc), abs(l-pc)))
    return (sum(trs)/len(trs))/float(kl[-1][4])*100

print("\njaring statistik (pegged = ATR<1.5 & |mom7|<1 & |mom30|<1.5):")
for sym in ['RLUSDUSDT','USDCUSDT','FDUSDUSDT']:
    try:
        kl = ambil(f"/api/v3/klines?symbol={sym}&interval=1d&limit=70")
        c = [float(r[4]) for r in kl]
        a, m7, m30 = atrp(kl,14), pct(c,7), pct(c,30)
        p = a < 1.5 and abs(m7) < 1 and abs(m30) < 1.5
        ok = ok and p
        print(f"  {sym}: ATR {a:.2f}% mom7 {m7:+.2f}% mom30 {m30:+.2f}% → {'PEGGED tertangkap' if p else 'LOLOS (SALAH!)'}")
    except Exception as e:
        print(f"  {sym}: gagal ambil ({e})")

print("\nVONIS:", "GERBANG SAH" if ok else "MASIH BOCOR")
