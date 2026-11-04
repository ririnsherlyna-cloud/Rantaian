#!/usr/bin/env python3
# KOMPAS-PENGUAT v1 — penuntun arah buy/sell dari aliran penguat (OI + CVD + funding + bakar likuidasi)
# Arahan pemilik 2026-11-04: "harga digerakkan aksi beli/jual agresif; likuidasi long/short jadi bahan
# bakar yang menarik harga bolak-balik; arah dibaca lewat harga + OI + CVD + funding."
# Sumber data: Bybit v5 public (ticker: harga+OI+funding; open-interest hist; recent-trade -> CVD).
# Lapis senyap: TIDAK kirim Telegram, hanya tulis data/kompas_terakhir.json + cetak ringkas.
import json, sys, time, urllib.request, urllib.parse

BYBIT = "https://api.bybit.com"
TIMEOUT = 10

def http_json(url, params=None):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "kompas-penguat/1"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.load(r)

def bybit_ticker(sym):
    d = http_json(BYBIT + "/v5/market/tickers", {"category": "linear", "symbol": sym})
    lst = (d.get("result") or {}).get("list") or []
    return lst[0] if lst else None

def bybit_oi_hist(sym):
    # 60min kerap kosong di Bybit -> pakai 15min x13 = 3 jam
    d = http_json(BYBIT + "/v5/market/open-interest",
                  {"category": "linear", "symbol": sym, "intervalTime": "15min", "limit": "13"})
    lst = (d.get("result") or {}).get("list") or []
    if len(lst) < 2:  # fallback 5min x37 ~ 3 jam
        d = http_json(BYBIT + "/v5/market/open-interest",
                      {"category": "linear", "symbol": sym, "intervalTime": "5min", "limit": "37"})
        lst = (d.get("result") or {}).get("list") or []
    return lst  # terbaru dulu

def bybit_cvd(sym, limit=1000):
    d = http_json(BYBIT + "/v5/market/recent-trade",
                  {"category": "linear", "symbol": sym, "limit": str(limit)})
    rows = ((d.get("result") or {}).get("list") or [])
    beli = jual = 0.0
    n = len(rows)
    for t in rows:  # side = sisi TAKER (Buy = aksi beli agresif)
        try:
            q = float(t.get("size") or 0)
        except ValueError:
            q = 0.0
        if t.get("side") == "Buy":
            beli += q
        else:
            jual += q
    return beli, jual, n

def fmt(x, nd=4):
    try:
        return f"{float(x):.{nd}f}"
    except (TypeError, ValueError):
        return str(x)

def baca_sasaran(n=3):
    with open("/home/z/my-project/data/cache_sasaran.json") as f:
        d = json.load(f)
    out = []
    for s in (d.get("sasaranHariIni") or [])[:n]:
        out.append({"simbol": s.get("simbol", "?"), "arah": s.get("arah", "?"),
                    "entry": s.get("entry"), "keyakinan": s.get("keyakinan")})
    return out

def ukur(simbol):
    sym = simbol.upper() + "USDT" if not simbol.upper().endswith("USDT") else simbol.upper()
    t = bybit_ticker(sym)
    if not t:
        return {"simbol": sym, "status": "TIDAK-ADA-DI-BYBIT"}
    oi0 = float(t["openInterestValue"] or 0)          # nilai OI sekarang (USD)
    oi_unit0 = float(t["openInterest"] or 0)          # OI sekarang (unit kontrak)
    hist = bybit_oi_hist(sym)
    oi_lama = float(hist[-1]["openInterest"]) if len(hist) >= 2 else oi_unit0
    oi_chg_pct = ((oi_unit0 - oi_lama) / oi_lama * 100.0) if oi_lama else 0.0
    beli, jual, n = bybit_cvd(sym)
    cvd = beli - jual
    imb = (cvd / (beli + jual) * 100.0) if (beli + jual) else 0.0   # -100..+100
    harga = float(t["lastPrice"] or 0)
    p24 = float(t.get("price24hPcnt") or 0) * 100.0
    p1h = float(t.get("prevPrice1h") or 0)
    d1h = ((harga - p1h) / p1h * 100.0) if p1h else 0.0
    fr = float(t.get("fundingRate") or 0) * 100.0     # % per interval
    # ---- skor arah (bobot: CVD 45, OI 30, funding 15, momentum 10) ----
    s = 0.0
    s += max(-45.0, min(45.0, imb * 0.45))            # CVD imbalance -> +-45
    if d1h > 0:                                       # OI vs harga: uang baru vs pelepasan
        s += max(30.0, min(30.0, (oi_chg_pct * 6))) * (1 if oi_chg_pct > 0 else 0.6) * -1 if False else 0
    # matriks OI-harga:
    if d1h > 0 and oi_chg_pct >= 0:   s += 30 * min(1, oi_chg_pct / 2 + 0.3)      # uang baru long
    elif d1h > 0 and oi_chg_pct < 0:  s += 12                                     # short squeeze (bakar short)
    elif d1h < 0 and oi_chg_pct >= 0: s -= 30 * min(1, oi_chg_pct / 2 + 0.3)      # short baru agresif
    elif d1h < 0 and oi_chg_pct < 0:  s -= 12                                     # long flushing (bakar long)
    if fr > 0.03:   s -= 15 * min(1, (fr - 0.03) / 0.07)   # long terlalu ramai -> rawan bongkar
    elif fr < -0.03: s += 15 * min(1, (-fr - 0.03) / 0.07)  # short terlalu ramai -> rawan squeeze
    s += max(-10.0, min(10.0, imb * 0.1))              # momentum taker kecil
    skor = max(-100.0, min(100.0, s))
    arah = "NAIK" if skor >= 25 else ("TURUN" if skor <= -25 else "NETRAL")
    if d1h > 0 and oi_chg_pct < 0: narasi = "short squeeze: likuidasi short menarik harga NAIK (bahan bakar terbatas)"
    elif d1h > 0 and oi_chg_pct >= 0: narasi = "uang baru masuk long: naik SEHAT ber-OI"
    elif d1h < 0 and oi_chg_pct >= 0: narasi = "short baru agresif: tekanan turun BER-OI"
    else: narasi = "long flushing: OI rontok, turun karena bakar long"
    if abs(fr) > 0.03:
        narasi += f"; funding {fmt(fr,4)}% {'ramai-long rawan bongkar' if fr>0 else 'ramai-short rawan squeeze'}"
    return {"simbol": sym, "status": "OK", "harga": harga, "chg1h_pct": round(d1h, 2),
            "chg24h_pct": round(p24, 2), "oi_usd": oi0, "oi_chg3j_pct": round(oi_chg_pct, 2),
            "cvd_net": round(cvd, 2), "cvd_imb_pct": round(imb, 1), "cvd_n": n,
            "funding_pct": round(fr, 4), "skor": round(skor, 1), "arah": arah, "narasi": narasi}

def main():
    n = 3
    simbol_arg = [a for a in sys.argv[1:] if not a.startswith("-")]
    if simbol_arg:
        daftar = [{"simbol": x.upper(), "arah": "?", "entry": None, "keyakinan": None} for x in simbol_arg]
    else:
        daftar = baca_sasaran(n)
    hasil = []
    for s in daftar:
        try:
            r = ukur(s["simbol"])
        except Exception as e:
            r = {"simbol": s["simbol"], "status": f"GAGAL: {e}"}
        r["arah_organ"] = s.get("arah")
        r["entry_organ"] = s.get("entry")
        if r.get("arah") and s.get("arah") in ("NAIK", "TURUN", "BUY", "SELL"):
            org = "NAIK" if s["arah"] in ("NAIK", "BUY") else "TURUN"
            r["selaras"] = ("SELARAS" if r.get("arah") == org else
                            "KONTRA" if r.get("arah") in ("NAIK", "TURUN") else "ORGAN-SENDIRI")
        hasil.append(r)
    keluar = {"protokol": "KOMPAS-PENGUAT", "versi": 1, "waktu_epoch": time.time(),
              "catatan": "CVD = delta taker dari 1000 trade terakhir Bybit; OI 3 jam; funding per interval",
              "hasil": hasil}
    with open("/home/z/my-project/data/kompas_terakhir.json", "w") as f:
        json.dump(keluar, f, indent=1)
    print(f"KOMPAS-PENGUAT v1 — {time.strftime('%Y-%m-%d %H:%M WIB', time.gmtime(time.time()+8*3600))}")
    for r in hasil:
        if r["status"] != "OK":
            print(f"  {r['simbol']:<12} {r['status']}")
            continue
        print(f"  {r['simbol']:<12} skor {r['skor']:>6} {r['arah']:<6} | organ: {r['arah_organ']} "
              f"(entry {fmt(r['entry_organ'])}) -> {r.get('selaras','-')}")
        print(f"               harga {fmt(r['harga'])} 1h {r['chg1h_pct']:+.2f}% 24h {r['chg24h_pct']:+.2f}% "
              f"| OI ${r['oi_usd']:,.0f} (3j {r['oi_chg3j_pct']:+.2f}%) | CVD {r['cvd_net']:,.0f} ({r['cvd_imb_pct']:+.1f}%, n={r['cvd_n']}) "
              f"| funding {r['funding_pct']:+.4f}%")
        print(f"               {r['narasi']}")

if __name__ == "__main__":
    main()
