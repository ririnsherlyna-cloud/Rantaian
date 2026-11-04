#!/usr/bin/env python3
# MATA-ORDERFLOW v1 — "mata baru" arah pasar MicroProfita.
# Sumber gagasan: insight pemilik 3-4 Nov — harga digerakkan aksi beli/jual agresif;
# likuidasi long/short = bahan bakar yang menarik harga bolak-balik;
# arah dibaca lewat HARGA + OI + CVD + FUNDING (4 mata), plus alur likuidasi (uji terpisah, WS).
#
# Catatan disiplin: IP sandbox pernah dibanned Binance (-1003) pada 4 Nov karena terlalu
# sering polling. Maka modul ini: (1) hanya panggil REST untuk snapshot, (2) sasaran sedikit
# (bukan 91 simbol), (3) data live nanti lewat websocket, (4) jejak ditulis ke data/mata_jejak.jsonl.
import json, time, urllib.request, urllib.error, io, os, sys

FAPI = "https://fapi.binance.com"
SASARAN_DEFAULT = ["BTCUSDT", "ETHUSDT", "SYNUSDT"]  # baseline pasar + sasaran aktif
DATA = "/home/z/my-project/data"

def get(path, **params):
    q = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
    url = FAPI + path + (("?" + q) if q else "")
    terakhir = None
    # IP keluar sandbox berotasi; beberapa pernah dibanned (-1003). Coba ulang
    # sampai 5x supaya mendarat di IP bersih (terbukti ada yang lolos).
    for _ in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "MicroProfita-MataArah/1"})
            with urllib.request.urlopen(req, timeout=15) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            try:
                pesan = json.loads(e.read().decode()).get("msg", "")
            except Exception:
                pesan = str(e)
            terakhir = RuntimeError(f"HTTP {e.code}: {pesan[:120]}")
            if "-1003" in pesan or "banned" in pesan.lower():
                time.sleep(2)
                continue
            raise
        except Exception as e:
            terakhir = e
            time.sleep(1.5)
    raise terakhir

def wib(ts):
    return time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(ts + 8 * 3600)) + " WIB"

def harga_fmt(p):
    # WAJIB: harga mikro tampil utuh (0.00001234), bukan 0 atau notasi ilmiah
    if p is None:
        return "-"
    s = f"{float(p):.10f}".rstrip("0").rstrip(".")
    return s if s else "0"

def baca_sasaran(simbol):
    """Baca 4 mata untuk satu simbol. Kembalikan dict metrik; raise bila gagal keras."""
    m = {"simbol": simbol}
    # MATA 1: harga sekarang + 24 jam
    pr = get("/fapi/v1/ticker/price", symbol=simbol)
    kl = get("/fapi/v1/klines", symbol=simbol, interval="15m", limit=97)  # ~24.25 jam
    p_now = float(pr["price"])
    p_lalu = float(kl[0][1])  # open candle pertama ~24 jam lalu
    dp = (p_now / p_lalu - 1) * 100 if p_lalu else 0.0
    m.update(harga=p_now, harga_24jam_lalu=p_lalu, dp24=round(dp, 3))
    # MATA 2: Open Interest (penguat) — live + sejarah 24 jam
    oi = get("/fapi/v1/openInterest", symbol=simbol)
    oih = get("/futures/data/openInterestHist", symbol=simbol, period="15m", limit=97)
    oi_now = float(oi["openInterest"])
    oi_lalu = float(oih[0]["sumOpenInterest"])
    oi_val_now = float(oih[-1]["sumOpenInterestValue"])
    doi = (oi_now / oi_lalu - 1) * 100 if oi_lalu else 0.0
    m.update(oi=oi_now, oi_24jam_lalu=oi_lalu, doi24=round(doi, 3), oi_value_usdt=oi_val_now)
    # MATA 3: CVD proxy — rasio taker beli/jual (agresivitas)
    tls = get("/futures/data/takerlongshortRatio", symbol=simbol, period="15m", limit=96)
    rasio = [float(t["buySellRatio"]) for t in tls if t.get("buySellRatio")]
    cvd24 = sum(rasio) / len(rasio) if rasio else 1.0
    cvd1h = sum(rasio[-4:]) / len(rasio[-4:]) if rasio else 1.0
    m.update(cvd24=round(cvd24, 4), cvd1h=round(cvd1h, 4))
    # MATA 4: funding (tekanan bahan bakar likuidasi)
    prem = get("/fapi/v1/premiumIndex", symbol=simbol)
    fund = get("/fapi/v1/fundingRate", symbol=simbol, limit=21)  # ~7 hari
    f_now = float(prem["lastFundingRate"]) * 100  # % per 8 jam
    f_hist = [float(x["lastFundingRate"]) * 100 for x in fund]
    f_avg = sum(f_hist) / len(f_hist) if f_hist else f_now
    f_maks = max((abs(x) for x in f_hist), default=0.0)
    m.update(fund_now=round(f_now, 4), fund_avg7d=round(f_avg, 4), fund_maks7d=round(f_maks, 4),
             next_funding=wib(int(prem["nextFundingTime"]) / 1000))
    return m

def penilaian(m):
    """Ubah metrik jadi mode pasar + skor penguat (-4..+4). Ini mesin anti-rabun."""
    dp, doi, cvd, f = m["dp24"], m["doi24"], m["cvd24"], m["fund_now"]
    # mode pasar dari hubungan OI x harga (matriks penguat/bahan-bakar)
    if doi > 0.5 and dp > 0.2:
        mode = "LONG BARU MENGUAT — penguat naik sehat"
    elif doi > 0.5 and dp < -0.2:
        mode = "SHORT BARU MENGUAT — penguat turun sehat"
    elif doi < -0.5 and dp > 0.2:
        mode = "SHORT-COVER — bakar bahan bakar short, naik RAPUH"
    elif doi < -0.5 and dp < -0.2:
        mode = "FLUSH LONG — bakar bahan bakar long, pantau balik arah"
    else:
        mode = "GERAK TANPA PENGUAT (OI datar) — zona rabun"
    # 4 suara
    v1 = 1 if dp > 0.2 else (-1 if dp < -0.2 else 0)          # harga
    v2 = 1 if cvd > 1.02 else (-1 if cvd < 0.98 else 0)        # agresivitas
    if doi > 0.5:                                              # penguat: posisi baru dibangun
        v3 = 1 if dp > 0 else -1
    else:
        v3 = 0  # posisi ditutup = bahan bakar terbakar, tidak memilih arah
    v4 = -1 if f >= 0.03 else (1 if f <= -0.03 else 0)         # bahan bakar kontra-ramai
    skor = v1 + v2 + v3 + v4
    if skor >= 2:
        arah = f"ARAH NAIK TERKONFIRMASI (penguat +{skor}/4)"
    elif skor <= -2:
        arah = f"ARAH TURUN TERKONFIRMASI (penguat {skor}/4)"
    else:
        arah = f"RABUN — mata tidak seirama (penguat {skor:+d}/4) -> TUNGGU"
    # indikator bahan bakar dari funding
    if abs(f) >= 0.10:
        bakar = f"funding EKSTREM {f:+.4f}%/8h — bahan bakar likuidasi besar siap"
    elif abs(f) >= 0.03:
        bakar = f"funding tinggi {f:+.4f}%/8h — ramai sepihak, waspada likuidasi"
    else:
        bakar = f"funding netral {f:+.4f}%/8h"
    return {"mode": mode, "skor": skor, "arah": arah, "bahan_bakar": bakar}

def main():
    simbols = sys.argv[1:] or SASARAN_DEFAULT
    laporan = {"waktu": wib(time.time()), "endpoint": {}, "sasaran": {}}
    print(f"=== MATA-ORDERFLOW v1 — {laporan['waktu']} ===")
    for s in simbols:
        try:
            m = baca_sasaran(s)
            p = penilaian(m)
            m.update(p)
            laporan["sasaran"][s] = m
            print(f"\n{s}")
            print(f"  HARGA   {harga_fmt(m['harga'])} (24 jam {m['dp24']:+.2f}%)")
            print(f"  OI      {m['oi']:.4f} unit (24 jam {m['doi24']:+.2f}%) = {m['oi_value_usdt']/1e6:.1f} jt USDT")
            print(f"  CVD     24 jam {m['cvd24']:.3f} | 1 jam terakhir {m['cvd1h']:.3f} (>1 agresif beli, <1 agresif jual)")
            print(f"  FUNDING sekarang {m['fund_now']:+.4f}%/8h | rata 7d {m['fund_avg7d']:+.4f}% | maks |7d| {m['fund_maks7d']:.4f}%")
            print(f"  MODE    {m['mode']}")
            print(f"  ->      {m['arah']} | {m['bahan_bakar']}")
            # jejak untuk observasi pasif / backtest 48 jam
            jejak = {k: m[k] for k in ("simbol", "harga", "dp24", "doi24", "cvd24", "cvd1h",
                                       "fund_now", "fund_avg7d", "skor")}
            jejak["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            jejak["mode"] = m["mode"]
            jejak["arah"] = m["arah"]
            with io.open(os.path.join(DATA, "mata_jejak.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps(jejak, ensure_ascii=False) + "\n")
        except urllib.error.HTTPError as e:
            try:
                pesan = json.loads(e.read().decode()).get("msg", "")
            except Exception:
                pesan = str(e)
            laporan["sasaran"][s] = {"gagal": pesan[:200]}
            print(f"\n{s} -> GAGAL: {pesan[:200]}")
        except Exception as e:
            laporan["sasaran"][s] = {"gagal": str(e)[:200]}
            print(f"\n{s} -> GAGAL: {str(e)[:200]}")
    ok = sum(1 for v in laporan["sasaran"].values() if "gagal" not in v)
    print(f"\nRINGKAS: {ok}/{len(simbols)} sasaran terbaca; jejak ditambah ke data/mata_jejak.jsonl")
    with io.open(os.path.join(DATA, "mata_orderflow_uji.json"), "w", encoding="utf-8") as f:
        json.dump(laporan, f, ensure_ascii=False, indent=1)
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
