#!/usr/bin/env python3
# MATA-ORDERFLOW v2 — "mata baru" arah pasar MicroProfita (multi-sumber).
# Sumber gagasan: insight pemilik 3-4 Nov — harga digerakkan aksi beli/jual agresif;
# likuidasi long/short = bahan bakar; arah dibaca lewat HARGA + OI + CVD + FUNDING (+likuidasi).
#
# Kenapa bukan Binance REST: IP keluar sandbox berotasi dan sebagian dibanned Binance (-1003/418,
# retry memperpanjang ban hingga ~10 jam) -> REST Binance DIPARKIR. Websocket fstream tersambung
# tapi proxy sandbox tidak meneruskan frame streaming (uji 4 Nov: 0 frame/35 dtk).
# Padanan sumber: Bybit (harga, OI + sejarah, funding + sejarah, trade taker eksplisit),
# OKX (order likuidasi terisi via REST, taker-volume 24 jam terkalibrasi terhadap arah candle).
import json, time, urllib.request, io, os, sys, math

BYBIT = "https://api.bybit.com"
OKX = "https://www.okx.com"
SASARAN_DEFAULT = ["BTCUSDT", "ETHUSDT", "SYNUSDT"]
DATA = "/home/z/my-project/data"
KAL_FILE = os.path.join(DATA, "mata_kalibrasi.json")

OKX_HOSTS = ["https://www.okx.com", "https://aws.okx.com"]  # host cadangan resmi OKX
BYBIT_HOSTS = ["https://api.bybit.com", "https://api.bytick.com"]  # host cadangan resmi Bybit

def _curl_json(url):
    import subprocess
    out = subprocess.run(
        ["curl", "-s", "-m", "15", "-H", "User-Agent: MicroProfita-MataArah/2", url],
        capture_output=True, text=True, timeout=25).stdout
    return json.loads(out)

def http_json(url, tries=4):
    terakhir = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MicroProfita-MataArah/2"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except Exception as e:
            terakhir = e
            try:  # DNS/egress sandbox intermiten per-IP; curl sering lolos saat urllib gagal
                return _curl_json(url)
            except Exception as e2:
                terakhir = e2
                time.sleep(2)
    raise terakhir

def _q(**params):
    return "&".join(f"{k}={v}" for k, v in params.items() if v is not None)

def bybit_get(path, **params):
    terakhir = None
    for host in BYBIT_HOSTS:
        try:
            d = http_json(f"{host}{path}?{_q(**params)}")
            if d.get("retCode") != 0:
                raise RuntimeError(f"Bybit: {str(d.get('retMsg'))[:90]}")
            return d["result"]
        except RuntimeError:
            raise
        except Exception as e:
            terakhir = e
    raise terakhir

def okx_get(path, **params):
    terakhir = None
    for _ in range(6):  # egress OKX intermiten per-IP; ulang sampai mendarat di IP bagus
        try:
            d = http_json(f"https://www.okx.com/api{path}?{_q(**params)}")
            if d.get("code") != "0":
                raise RuntimeError(f"OKX: {str(d.get('msg'))[:90]}")
            return d["data"]
        except RuntimeError:
            raise
        except Exception as e:
            terakhir = e
            time.sleep(1)
    raise terakhir

def wib(ts):
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(ts + 8 * 3600)) + " WIB"

def harga_fmt(p):
    # WAJIB: harga mikro tampil utuh (0.00001234), bukan 0 atau notasi ilmiah
    if p is None:
        return "-"
    s = f"{float(p):.10f}".rstrip("0").rstrip(".")
    return s if s else "0"

def korelasi(pasangan):
    n = len(pasangan)
    if n < 10:
        return 0.0
    mx = sum(a for a, _ in pasangan) / n
    my = sum(b for _, b in pasangan) / n
    kov = sum((a - mx) * (b - my) for a, b in pasangan)
    varx = math.sqrt(sum((a - mx) ** 2 for a, _ in pasangan))
    vary = math.sqrt(sum((b - my) ** 2 for _, b in pasangan))
    return kov / (varx * vary) if varx and vary else 0.0

def kalibrasi_taker(ccy="BTC"):
    """Pastikan urutan kolom OKX taker-volume dengan bukti, bukan tebakan:
    kolom yang benar 'buyVol' harus berkorelasi positif dengan arah candle 5m OKX."""
    tk = okx_get("/v5/rubik/stat/taker-volume", ccy=ccy, instType="CONTRACTS")
    cd = okx_get("/v5/market/candles", instId=f"{ccy}-USDT-SWAP", bar="5m", limit=100)
    ret = {int(c[0]): (float(c[4]) - float(c[1])) / float(c[1]) for c in cd}
    A, B = [], []
    for r in tk:
        ts, c1, c2 = int(r[0]), float(r[1]), float(r[2])
        if ts in ret:
            A.append((c2 - c1, ret[ts]))  # hipotesis A: [ts, sellVol, buyVol]
            B.append((c1 - c2, ret[ts]))  # hipotesis B: terbalik
    rA, rB = korelasi(A), korelasi(B)
    # pilih pemetaan dengan korelasi positif lebih kuat
    buy_col = 2 if rA >= rB else 1
    return {"buy_col": buy_col, "rA": round(rA, 3), "rB": round(rB, 3), "n": len(A),
            "waktu": wib(time.time())}

def muat_kalibrasi():
    if os.path.exists(KAL_FILE):
        try:
            return json.load(io.open(KAL_FILE, encoding="utf-8"))
        except Exception:
            pass
    try:
        k = kalibrasi_taker()
    except Exception as e:
        # kalibrasi gagal tidak boleh mematikan bacaan: mata CVD-24j ditandai butuh saja
        return {"buy_col": None, "status": f"kalibrasi gagal: {str(e)[:100]}"}
    io.open(KAL_FILE, "w", encoding="utf-8").write(json.dumps(k, ensure_ascii=False))
    return k

def baca_sasaran(simbol, kal):
    """Baca semua mata untuk satu simbol; tiap mata boleh gagal sendiri (tandai butuh)."""
    m = {"simbol": simbol}
    now_ms = time.time() * 1000
    # E1+OI live+FUNDING live dari Bybit tickers (1 panggilan)
    daftar = bybit_get("/v5/market/tickers", category="linear", symbol=simbol).get("list") or []
    if not daftar:
        raise RuntimeError(f"{simbol} tidak terdaftar di Bybit linear — mata Bybit butuh untuk simbol ini")
    t = daftar[0]
    m.update(harga=float(t["lastPrice"]), dp24=round(float(t["price24hPcnt"]) * 100, 3),
             oi=float(t["openInterest"]), oi_value_usdt=float(t["openInterestValue"]),
             fund_now=round(float(t["fundingRate"]) * 100, 4),
             next_funding=wib(int(t["nextFundingTime"]) / 1000))
    # E2: sejarah OI -> delta 24 jam (pakai titik terdekat target 24j, window sebenarnya diumumkan)
    try:
        h = bybit_get("/v5/market/open-interest", category="linear", symbol=simbol,
                      intervalTime="15min", limit=200)["list"]
        cand = min(h, key=lambda x: abs(int(x["timestamp"]) - (now_ms - 24 * 3600 * 1000)))
        oi_lalu = float(cand["openInterest"])
        m.update(doi24=round((m["oi"] / oi_lalu - 1) * 100, 3),
                 doi_window_jam=round((now_ms - int(cand["timestamp"])) / 3600000, 2))
    except Exception as e:
        m["doi24_gagal"] = str(e)[:80]
    # E4b: sejarah funding ~7 hari
    try:
        fh = bybit_get("/v5/market/funding/history", category="linear", symbol=simbol, limit=21)["list"]
        fr = [float(x["fundingRate"]) * 100 for x in fh]
        m.update(fund_avg7d=round(sum(fr) / len(fr), 4),
                 fund_maks7d=round(max(abs(x) for x in fr), 4))
    except Exception as e:
        m["fund_hist_gagal"] = str(e)[:80]
    # E3a: CVD jendela pendek dari trade taker Bybit (side eksplisit Buy/Sell)
    try:
        tr = bybit_get("/v5/market/recent-trade", category="linear", symbol=simbol, limit=1000)["list"]
        beli = sum(float(x["size"]) for x in tr if x["side"] == "Buy")
        jual = sum(float(x["size"]) for x in tr if x["side"] == "Sell")
        span = (int(tr[0]["time"]) - int(tr[-1]["time"])) / 60000 if len(tr) > 1 else 0.0
        m.update(cvd_beli=round(beli, 4), cvd_jual=round(jual, 4),
                 cvd_win=round(beli / jual, 4) if jual else None,
                 cvd_window_menit=round(span, 2))
    except Exception as e:
        m["cvd_win_gagal"] = str(e)[:80]
    # E3b: CVD 24 jam dari OKX taker-volume (urutan kolom dari kalibrasi)
    ccy = simbol[:-4]
    try:
        bcol = kal.get("buy_col")
        if bcol is None:
            raise RuntimeError("kalibrasi kolom taker belum ada")
        tk = okx_get("/v5/rubik/stat/taker-volume", ccy=ccy, instType="CONTRACTS")
        b = sum(float(r[bcol]) for r in tk if int(r[0]) >= now_ms - 24 * 3600 * 1000)
        s = sum(float(r[3 - bcol]) for r in tk if int(r[0]) >= now_ms - 24 * 3600 * 1000)
        m.update(cvd24=round(b / s, 4) if s else None, cvd24_sumber="OKX rubik (terkalibrasi)")
    except Exception as e:
        m["cvd24_gagal"] = str(e)[:80]
    # E5: likuidasi terisi 24 jam dari OKX (posSide eksplisit long/short)
    coba_id = f"{ccy}-USDT-SWAP"
    liq = {"long_n": 0, "short_n": 0, "sz_long": 0.0, "sz_short": 0.0, "tersedia": True}
    try:
        ld = okx_get("/v5/public/liquidation-orders", instType="SWAP", state="filled",
                     instFamily=f"{ccy}-USDT")
        for blok in ld:
            # instId/instFamily ada di level blok (bukan di tiap detail)
            bid, bfam = blok.get("instId") or "", blok.get("instFamily") or ""
            if bid and bid != coba_id:
                continue
            if bfam and bfam != f"{ccy}-USDT":
                continue
            for d in blok.get("details", []):
                if int(d["ts"]) < now_ms - 24 * 3600 * 1000:
                    continue
                did = d.get("instId")
                if did and did != coba_id:
                    continue
                if d.get("posSide") == "long":
                    liq["long_n"] += 1
                    liq["sz_long"] += float(d["sz"])
                elif d.get("posSide") == "short":
                    liq["short_n"] += 1
                    liq["sz_short"] += float(d["sz"])
    except Exception as e:
        liq["tersedia"] = False
        liq["alasan"] = str(e)[:80]
    m["likuidasi_24j"] = liq
    return m

def penilaian(m):
    """Mesin anti-rabun: mode pasar dari OI x harga + 4 suara arah (-4..+4)."""
    dp = m.get("dp24", 0)
    doi = m.get("doi24")
    cvd = m.get("cvd24") or m.get("cvd_win")
    f = m.get("fund_now", 0)
    doi_ada = doi is not None
    doi = doi if doi_ada else 0.0
    if not doi_ada:
        mode = "MATA OI BUTUH — mode pasar tak bisa dibaca"
    elif doi > 0.5 and dp > 0.2:
        mode = "LONG BARU MENGUAT — penguat naik sehat"
    elif doi > 0.5 and dp < -0.2:
        mode = "SHORT BARU MENGUAT — penguat turun sehat"
    elif doi < -0.5 and dp > 0.2:
        mode = "SHORT-COVER — bakar bahan bakar short, naik RAPUH"
    elif doi < -0.5 and dp < -0.2:
        mode = "FLUSH LONG — bakar bahan bakar long, pantau balik arah"
    else:
        mode = "GERAK TANPA PENGUAT (OI datar) — zona rabun"
    v1 = 1 if dp > 0.2 else (-1 if dp < -0.2 else 0)
    v2 = 0 if cvd is None else (1 if cvd > 1.02 else (-1 if cvd < 0.98 else 0))
    if doi_ada and doi > 0.5:
        v3 = 1 if dp > 0 else -1   # posisi baru dibangun mengikuti arah harga
    else:
        v3 = 0                     # posisi ditutup = bahan bakar terbakar, tidak memilih
    v4 = -1 if f >= 0.03 else (1 if f <= -0.03 else 0)
    skor = v1 + v2 + v3 + v4
    if skor >= 2:
        arah = f"ARAH NAIK TERKONFIRMASI (penguat +{skor}/4)"
    elif skor <= -2:
        arah = f"ARAH TURUN TERKONFIRMASI (penguat {skor}/4)"
    else:
        arah = f"RABUN — mata tidak seirama (penguat {skor:+d}/4) -> TUNGGU"
    if abs(f) >= 0.10:
        bakar = f"funding EKSTREM {f:+.4f}%/8h — bahan bakar likuidasi besar siap"
    elif abs(f) >= 0.03:
        bakar = f"funding tinggi {f:+.4f}%/8h — ramai sepihak, waspada likuidasi"
    else:
        bakar = f"funding netral {f:+.4f}%/8h"
    liq = m.get("likuidasi_24j", {})
    if liq.get("tersedia"):
        if liq["long_n"] >= 3 * max(1, liq["short_n"]) and liq["long_n"] >= 10:
            bakar += f"; bahan bakar LONG terbakar ({liq['long_n']}x likuidasi/24j)"
        elif liq["short_n"] >= 3 * max(1, liq["long_n"]) and liq["short_n"] >= 10:
            bakar += f"; bahan bakar SHORT terbakar ({liq['short_n']}x likuidasi/24j)"
    return {"mode": mode, "skor": skor, "arah": arah, "bahan_bakar": bakar}

def main():
    simbols = sys.argv[1:] or SASARAN_DEFAULT
    kal = muat_kalibrasi()
    if kal.get("buy_col") is not None:
        print(f"Kalibrasi OKX taker-volume: buy_col={kal['buy_col']} (r_hipotesisA={kal['rA']}, r_hipotesisB={kal['rB']}, n={kal['n']})")
    else:
        print(f"Kalibrasi OKX taker-volume: GAGAL ({kal.get('status')}) — mata CVD-24j butuh kali ini")
    laporan = {"waktu": wib(time.time()), "kalibrasi": kal, "sasaran": {}}
    print(f"=== MATA-ORDERFLOW v2 — {laporan['waktu']} ===")
    for s in simbols:
        try:
            m = baca_sasaran(s, kal)
            m.update(penilaian(m))
            laporan["sasaran"][s] = m
            liq = m["likuidasi_24j"]
            lik = (f"long {liq['long_n']}x (sz {liq['sz_long']:.2f}) vs short {liq['short_n']}x (sz {liq['sz_short']:.2f})"
                   if liq.get("tersedia") else f"tak tersedia ({liq.get('alasan', '?')})")
            print(f"\n{s}")
            print(f"  HARGA    {harga_fmt(m['harga'])} (24 jam {m['dp24']:+.2f}%)")
            if "doi24" in m:
                print(f"  OI       {m['oi']:.4f} unit = {m['oi_value_usdt']/1e6:.1f} jt USDT | 24 jam {m['doi24']:+.2f}% (window {m['doi_window_jam']}j)")
            else:
                print(f"  OI       live {m['oi']:.4f}, sejarah gagal: {m.get('doi24_gagal')}")
            cvd_s = []
            if m.get("cvd24") is not None:
                cvd_s.append(f"24 jam {m['cvd24']:.3f} ({m.get('cvd24_sumber')})")
            if m.get("cvd_win") is not None:
                cvd_s.append(f"jendela {m['cvd_window_menit']:.1f} menit rasio {m['cvd_win']:.3f} (Bybit, beli {m['cvd_beli']:.3f} vs jual {m['cvd_jual']:.3f})")
            print(f"  CVD      {' | '.join(cvd_s) if cvd_s else 'TIDAK TERSEDIA'}")
            print(f"  FUNDING  {m['fund_now']:+.4f}%/8h | rata 7d {m.get('fund_avg7d', '-')}% | maks |7d| {m.get('fund_maks7d', '-')}% | jadwal {m['next_funding']}")
            print(f"  LIKUIDASI 24j OKX: {lik}")
            print(f"  MODE     {m['mode']}")
            print(f"  ->       {m['arah']} | {m['bahan_bakar']}")
            jejak = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "simbol": s,
                     "harga": m["harga"], "dp24": m["dp24"], "doi24": m.get("doi24"),
                     "cvd24": m.get("cvd24"), "cvd_win": m.get("cvd_win"),
                     "fund_now": m["fund_now"], "fund_avg7d": m.get("fund_avg7d"),
                     "lik_long_n": liq.get("long_n"), "lik_short_n": liq.get("short_n"),
                     "skor": m["skor"], "mode": m["mode"], "arah": m["arah"]}
            with io.open(os.path.join(DATA, "mata_jejak.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps(jejak, ensure_ascii=False) + "\n")
        except Exception as e:
            laporan["sasaran"][s] = {"gagal": str(e)[:200]}
            print(f"\n{s} -> GAGAL: {str(e)[:200]}")
    ok = sum(1 for v in laporan["sasaran"].values() if "gagal" not in v)
    print(f"\nRINGKAS: {ok}/{len(simbols)} sasaran terbaca; jejak + baris ke data/mata_jejak.jsonl")
    with io.open(os.path.join(DATA, "mata_orderflow_uji.json"), "w", encoding="utf-8") as f:
        json.dump(laporan, f, ensure_ascii=False, indent=1)
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
