#!/usr/bin/env python3
# ============================================================
# UKUR POWER-MAX (V303) — dasar empiris tier "jual power max
# ambisius" atas permintaan pemilik (pelajaran MAGMA + BIRB).
#
# Pertanyaan yang dijawab dari DATA NYATA (bukan opini):
#   Setelah koin naik ≥ X% dalam 24 jam (target/ambisius
#   tersentuh), berapa % kasus yang MELANJUTKAN ke +70%, +100%,
#   +150%? Dan kondisi apa yang membuat lanjutan LEBIH SERING
#   terjadi (syarat ketat tier)?
# ============================================================
import json, time, math, urllib.request, urllib.error

HOSTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://data-api.binance.vision",
]
HDR = {"User-Agent": "Mozilla/5.0"}
_cache = {}

def get(path, timeout=15):
    if path in _cache:
        return _cache[path]
    err = None
    for h in HOSTS:
        try:
            req = urllib.request.Request(h + path, headers=HDR)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                d = json.loads(r.read().decode())
                _cache[path] = d
                return d
        except Exception as e:
            err = e
            time.sleep(0.3)
    raise RuntimeError(f"gagal semua host {path}: {err}")

def klines1h(sym, total=5000):
    out = []
    end = None
    while len(out) < total:
        lim = min(1000, total - len(out))
        p = f"/api/v3/klines?symbol={sym}&interval=1h&limit={lim}"
        if end:
            p += f"&endTime={end}"
        try:
            batch = get(p)
        except Exception:
            break
        if not batch:
            break
        out = batch + out
        end = batch[0][0] - 1
        if len(batch) < lim:
            break
        time.sleep(0.15)
    return out

def pct(arr, q):
    a = sorted(arr)
    if not a:
        return None
    i = min(len(a) - 1, max(0, int(round(q * (len(a) - 1)))))
    return a[i]

def stat(ekor, ambang_list):
    n = len(ekor)
    if n == 0:
        return None
    d = {"n": n,
         "median": round(pct(ekor, .5) * 100, 1),
         "p25": round(pct(ekor, .25) * 100, 1),
         "p75": round(pct(ekor, .75) * 100, 1),
         "p90": round(pct(ekor, .9) * 100, 1)}
    for t in ambang_list:
        d[f"P>= {t}%"] = round(sum(1 for x in ekor if x >= t / 100) / n * 100, 1)
    return d

def main():
    AMBANG = [19, 36, 60, 100]
    TIER_LIST = [36, 70, 100, 150, 200]
    tick = get("/api/v3/ticker/24hr")
    symbs = []
    for t in tick:
        s = t["symbol"]
        if not s.endswith("USDT") or not s.replace("USDT", "").isalnum() or not s.replace("USDT", "").isupper():
            continue
        if any(s.endswith(x) for x in ("UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT")):
            continue
        base = s[:-4]
        if base in ("USDC", "FDUSD", "TUSD", "USDP", "DAI", "BUSD", "EUR", "EURI", "AEUR", "USD1", "USDE", "USDS", "PYUSD", "PAXG", "USTC"):
            continue
        try:
            qv = float(t["quoteVolume"])
        except Exception:
            continue
        if qv >= 15_000_000:
            symbs.append((s, qv))
    symbs.sort(key=lambda x: -x[1])
    symbs = [s for s, _ in symbs[:55]]

    hasil = {a: [] for a in AMBANG}          # ekor semua kasus
    kondisi = {a: {"volTinggi": [], "volRendah": [], "naik6Kencang": [], "naik6Pelan": []} for a in AMBANG}
    per_sym = {}
    for idx, sym in enumerate(symbs):
        try:
            ks = klines1h(sym, 5000)
        except Exception:
            continue
        if len(ks) < 500:
            continue
        c = [float(k[4]) for k in ks]
        h = [float(k[2]) for k in ks]
        v = [float(k[5]) * (float(k[1]) if False else 1) for k in ks]  # qty
        # volume quote per jam
        vq = [float(k[7]) for k in ks]
        n24 = len(c) - 24
        if n24 < 100:
            continue
        hits = {a: 0 for a in AMBANG}
        i = 24
        while i < len(c) - 24:
            naik = c[i] / c[i - 24] - 1
            if naik <= 0:
                i += 1
                continue
            for a in AMBANG:
                if naik >= a / 100:
                    ekor72 = max(h[i + 1: i + 73]) / c[i] - 1
                    hasil[a].append(ekor72)
                    hits[a] += 1
                    # kondisi
                    ma20v = sum(vq[i - 24 * 20: i]) / max(1, 20 * 24)
                    volRatio = (sum(vq[i - 23: i + 1]) / max(1, 24)) / ma20v if ma20v > 0 else 0
                    naik6 = c[i] / c[i - 6] - 1
                    if volRatio >= 2:
                        kondisi[a]["volTinggi"].append(ekor72)
                    else:
                        kondisi[a]["volRendah"].append(ekor72)
                    if naik6 >= 0.15:
                        kondisi[a]["naik6Kencang"].append(ekor72)
                    else:
                        kondisi[a]["naik6Pelan"].append(ekor72)
                    i += 24  # pemantik non-overlap
                    break
            else:
                i += 1
        if any(hits.values()):
            per_sym[sym] = hits
        time.sleep(0.2)
        if (idx + 1) % 10 == 0:
            print(f"  ... {idx+1}/{len(symbs)} simbol")

    luar = {"disimpan": time.strftime("%Y-%m-%d %H:%M"), "simbol": len(symbs),
            "dianalisa": {str(a): stat(hasil[a], TIER_LIST) for a in AMBANG},
            "kondisi": {str(a): {k: stat(v, TIER_LIST) for k, v in kk.items()} for a, kk in kondisi.items()},
            "perSimbol": per_sym}
    with open("/home/z/my-project/research/power_max.json", "w") as f:
        json.dump(luar, f, indent=1)
    print(json.dumps({str(a): stat(hasil[a], TIER_LIST) for a in AMBANG}, indent=1))
    print("=== KONDISI (syarat ketat tier) ===")
    for a in AMBANG:
        for k, v in kondisi[a].items():
            s = stat(v, TIER_LIST)
            if s:
                print(f"ambang {a}% | {k}: n={s['n']} median={s['median']}% p90={s['p90']}% P>=70%={s['P>= 70%']}% P>=100%={s['P>= 100%']}%")

if __name__ == "__main__":
    main()
