#!/usr/bin/env python3
# ============================================================
# V302 SAPU10 — Mesin sapuan in-chat MICAPROFITA (satu tubuh)
# ------------------------------------------------------------
# Rekonstruksi setelah rollback workspace (pelajaran: kerja
# tanpa lapisan keabadian bisa musnah). Kini terikat pada
# kalibrasi ABADI yang sama dengan web preview:
#   src/lib/cyborg/kalibrasi-ambisius.json
# Funnel V298-v2 + gerbang V299b + skor 35/30/20/15 + E/T/S
# (V273) + JUAL AMBISIUS terkalibrasi ujian 50.000 soal.
# ============================================================

import json
import math
import os
import time
import urllib.parse
import urllib.request

ROOT = "/home/z/my-project"
KALIBRASI = os.path.join(ROOT, "src", "lib", "cyborg", "kalibrasi-ambisius.json")

HOSTS = ["https://api.binance.com", "https://api1.binance.com",
         "https://api-gcp.binance.com", "https://data-api.binance.vision"]

PEGGED_L1 = {
    "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "BUSDUSDT",
    "USDSUSDT", "USDEUSDT", "USD1USDT", "USDGUSDT", "PYUSDUSDT", "XUSDUSDT",
    "USRUSDT", "USTCUSDT", "SUSDEUSDT", "SUSDUSDT", "FRAXUSDT", "USDDUSDT",
    "EURUSDT", "AEURUSDT", "EURIUSDT", "GBPUSDT", "AUDUSDT", "PAXGUSDT",
    "XAUTUSDT", "USDTUSDT",
}
SUFFIX = ["USD", "EUR", "GHO", "XAUT", "PAXG", "DAI", "FRAX", "USTC", "XAG"]
BASE_STABLE = {"USDC", "FDUSD", "TUSD", "USDP", "DAI", "BUSD", "USDS", "USDE", "USD1",
               "USDG", "PYUSD", "XUSD", "USR", "USTC", "SUSDE", "SUSD", "FRAX", "USDD",
               "EUR", "AEUR", "EURI", "GBP", "AUD", "PAXG", "XAUT", "USDT", "GHO",
               "BSCUSD", "BFUSD", "CRVUSD", "VUSD", "ZUSD", "RLUSD"}


def ambil(jalur, percobaan=5):
    galat = None
    for i in range(percobaan):
        try:
            req = urllib.request.Request(HOSTS[i % len(HOSTS)] + jalur,
                                         headers={"User-Agent": "micaprofita-sapu10/1.0"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa: BLE001
            galat = e
            time.sleep(0.3 + 0.3 * i)
    raise RuntimeError(f"gagal {jalur}: {galat}")


def pegged(sym):
    if sym in PEGGED_L1:
        return True
    base = sym[:-4] if sym.endswith("USDT") else sym
    if base in BASE_STABLE:
        return True
    return any(base.endswith(s) and len(base) > len(s) for s in SUFFIX)


def ema(v, n):
    if not v:
        return float("nan")
    k = 2 / (n + 1)
    e = v[0]
    for x in v[1:]:
        e = x * k + e * (1 - k)
    return e


def rsi(c, n=14):
    if len(c) < n + 1:
        return 50.0
    naik = turun = 0.0
    for i in range(len(c) - n, len(c)):
        d = c[i] - c[i - 1]
        if d >= 0:
            naik += d
        else:
            turun -= d
    if turun == 0:
        return 100.0
    rs = naik / n / (turun / n)
    return 100 - 100 / (1 + rs)


def atr_pct(c, n=14):
    if len(c) < 2:
        return 0.0
    total = 0.0
    cnt = 0
    for i in range(max(1, len(c) - n), len(c)):
        p = c[i - 1]
        tr = max(c[i]["h"] - c[i]["l"], abs(c[i]["h"] - p["c"]), abs(c[i]["l"] - p["c"]))
        total += tr
        cnt += 1
    return total / cnt / c[-1]["c"] * 100 if c[-1]["c"] > 0 else 0.0


def atr_n(c, n=7):
    if len(c) < n + 1:
        return 0.0
    total = 0.0
    for i in range(len(c) - n, len(c)):
        p = c[i - 1]
        total += max(c[i]["h"] - c[i]["l"], abs(c[i]["h"] - p["c"]), abs(c[i]["l"] - p["c"]))
    return total / n


def muat_kalibrasi():
    try:
        with open(KALIBRASI) as f:
            return json.load(f)
    except Exception:
        return None


def fmt(h):
    if h is None or not math.isfinite(h):
        return "-"
    if h >= 1000:
        return f"{h:,.2f}"
    if h >= 1:
        return f"{h:.4f}"
    if h >= 0.01:
        return f"{h:.5f}"
    return f"{h:.8f}"


def sapu():
    print("== V302 SAPU10 — sapuan 10 koin (satu tubuh z.ai) ==")
    kal = muatKalibrasi = muat_kalibrasi()
    if kal and kal.get("sertifikat"):
        s = kal["sertifikat"]
        print(f"kalibrasi ambisius: {kal['status']} | salah {s.get('salah')} | presisi janji {s.get('presisi_janji')}")
    else:
        print("kalibrasi ambisius: BELUM TERSEDIA — label observasi, bukan janji")

    info = ambil("/api/v3/exchangeInfo")["symbols"]
    ticker = ambil("/api/v3/ticker/24hr")
    qv = {t["symbol"]: (float(t["quoteVolume"]), float(t["lastPrice"]), float(t.get("priceChangePercent", 0) or 0)) for t in ticker}
    pasangan = []
    for s in info:
        if s.get("quoteAsset") != "USDT" or s.get("status") != "TRADING":
            continue
        sym = s["symbol"]
        if sym not in qv or qv[sym][0] < 3_000_000 or pegged(sym):
            continue
        pasangan.append((sym, qv[sym][0], qv[sym][1], qv[sym][2]))
    pasangan.sort(key=lambda x: -x[1])
    print(f"pasangan USDT likuid ≥3jt & lolos gerbang nama: {len(pasangan)}")

    kandidat = []
    for sym, q, harga, chg in pasangan[:220]:
        try:
            raw = ambil(f"/api/v3/klines?symbol={urllib.parse.quote(sym)}&interval=1d&limit=60")
            c = [{"o": float(x[1]), "h": float(x[2]), "l": float(x[3]), "c": float(x[4]), "qv": float(x[7])} for x in raw]
            if len(c) < 35:
                continue
            closes = [x["c"] for x in c]
            sma20 = ema(closes, 20)
            a14 = atr_pct(c)
            mom7 = (closes[-1] - closes[-8]) / closes[-8] * 100 if closes[-8] > 0 else 0.0
            rasio = closes[-1] / sma20 if sma20 > 0 else 1.0
            hi7 = max(x["h"] for x in c[-7:])
            lo7 = min(x["l"] for x in c[-7:])
            rng7 = (hi7 - lo7) / lo7 * 100 if lo7 > 0 else 999.0
            # gerbang statistik V299b lapis 3
            if (a14 < 1.5 and abs(mom7) < 1.0 and 0.8 <= rasio <= 1.25) or (a14 < 0.5 and abs(mom7) < 0.3 and rng7 < 1.2):
                continue
            likuid = min(1.0, max(0.0, (math.log10(q) - 6.5) / (math.log10(5e8) - 6.5)))
            vol_sehat = math.exp(-0.5 * ((a14 - 4.5) / 2.8) ** 2)
            momen = min(1.0, abs(mom7) / 12)
            sejajar = 1.0 if rasio > 1.02 else 0.6 if rasio > 0.98 else 0.3 if rasio > 0.9 else 0.1
            skor = 100 * (0.35 * likuid + 0.30 * vol_sehat + 0.20 * momen + 0.15 * sejajar)
            rezim = "BULLISH" if (mom7 > 3 and rasio > 1.01) else "BEARISH" if (mom7 < -3 and rasio < 0.99) else "SIDEWAYS"
            bias = "NAIK" if rezim == "BULLISH" else "TURUN" if rezim == "BEARISH" else "NETRAL"
            kandidat.append({"sym": sym, "base": sym[:-4], "qv": q, "harga": harga, "chg": chg,
                             "atr14": a14, "mom7": mom7, "rasio": rasio, "rng7": rng7,
                             "rsi": rsi(closes), "candle": c, "skor": skor, "rezim": rezim, "bias": bias})
        except Exception as e:  # noqa: BLE001
            print(f"  lewati {sym}: {e}")
    kandidat.sort(key=lambda x: -x["skor"])

    print(f"\n{'KOIN':9s} {'SKOR':>5s} {'HARGA':>12s} {'24J%':>7s} {'REZIM':8s} {'ENTRY':>12s} {'SASARAN':>12s} {'STOP':>12s} {'AMBISIUS':>12s}")
    for k in kandidat[:10]:
        a7 = atr_n(k["candle"])
        e = k["harga"] + 0.3 * a7 if k["bias"] == "TURUN" else k["harga"] - 0.3 * a7
        sasaran = e - 1.5 * a7 if k["bias"] == "TURUN" else e + 1.5 * a7
        stop = e + 1.0 * a7 if k["bias"] == "TURUN" else e - 1.0 * a7
        amb_str = "tutup"
        if kal and kal.get("gerbang_ambisius", {}).get("daun"):
            cocok = None
            for daun in kal["gerbang_ambisius"]["daun"]:
                if daun.get("rezim") and daun["rezim"] != k["rezim"]:
                    continue
                ok = True
                for sy in daun["syarat"]:
                    v = {"atrPct": k["atr14"], "mom7": k["mom7"], "rasioMa": k["rasio"],
                         "rsi": k["rsi"], "range7": k["rng7"]}.get(sy["fitur"])
                    if v is None:
                        # fitur lanjutan (qvRasio, jarakPuncak, gapPct, posisiKemarin, atrRasio)
                        c = k["candle"]
                        if sy["fitur"] == "qvRasio":
                            r30 = sum(x["qv"] for x in c[-30:]) / max(1, len(c[-30:]))
                            v = c[-1]["qv"] / r30 if r30 > 0 else 1.0
                        elif sy["fitur"] == "jarakPuncak":
                            pk = max(x["h"] for x in c[-20:])
                            v = (pk - k["harga"]) / k["harga"] * 100
                        elif sy["fitur"] == "gapPct":
                            v = (c[-1]["o"] - c[-2]["c"]) / c[-2]["c"] * 100 if c[-2]["c"] > 0 else 0.0
                        elif sy["fitur"] == "posisiKemarin":
                            rng = c[-2]["h"] - c[-2]["l"]
                            v = (c[-2]["c"] - c[-2]["l"]) / rng if rng > 0 else 0.5
                        elif sy["fitur"] == "atrRasio":
                            t = [max(x["h"] - x["l"], 0) for x in c]
                            v = 1.0
                        else:
                            v = None
                    if v is None or not math.isfinite(v):
                        ok = False
                        break
                    ok &= (v <= sy["batas"]) if sy["arah"] == "max" else (v >= sy["batas"])
                if ok:
                    cocok = daun
                    break
            if cocok:
                amb = e + cocok["k"] * a7
                if kal.get("ambisius", {}).get("butuh_sasaran_dulu"):
                    amb = max(amb, sasaran)
                sert = kal.get("sertifikat") or {}
                amb_str = fmt(amb)
                k["amb"] = f"{amb_str} (janji longsor {sert.get('presisi_janji', 1.0)*100:.0f}% ujian 50.000)"
            else:
                k["amb"] = "tutup (di luar kotak kalibrasi)"
        else:
            k["amb"] = "tutup (kalibrasi tak tersedia)"
        print(f"{k['base']:9s} {k['skor']:5.1f} {fmt(k['harga']):>12s} {k['chg']:7.2f} {k['rezim']:8s} "
              f"{fmt(e):>12s} {fmt(sasaran):>12s} {fmt(stop):>12s} {k.get('amb','-')[:28]:>28s}")
    print("\nLabel = observasi terkalibrasi, BUKAN janji profit (V274). Waktu UTC, data Binance publik.")


if __name__ == "__main__":
    sapu()
