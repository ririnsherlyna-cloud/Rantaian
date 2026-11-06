#!/usr/bin/env python3
# SKOR-MASTER v1 — Formula Komposit Berlapis untuk 100 Sasaran
# Majikan: "lu gak ciptakan formula harusnya lu percanggih" -> ini formulanya.
# 5 lapis: Likuiditas(MC log) / Ruang-ATH / Divergensi lintas-bursa / Momentum / Rezim F&G
# Output: data/skor_master.json + top-list siap dimakan heartbeat.
# MENUSKOR-MASTER v1
import json, math, os, sys, time

F_PASAR = "/home/z/my-project/data/pasar_lintas.json"
F_SASARAN = "/home/z/my-project/data/zai_picks_last.json"
F_OUT = "/home/z/my-project/data/skor_master.json"

SASARAN_TETAP = {"BTCUSDT", "ETHUSDT", "XAUUSDT"}

def baca_json(f):
    try:
        with open(f) as fh:
            return json.load(fh)
    except Exception:
        return None

def ambil_sasaran():
    """Sasaran dari picks terakhir + BTC/ETH/XAU tetap, unik, max 100."""
    s = set(SASARAN_TETAP)
    d = baca_json(F_SASARAN)
    if d:
        items = d if isinstance(d, list) else d.get("picks") or d.get("sasaran") or []
        for it in items:
            if isinstance(it, dict):
                sym = (it.get("symbol") or it.get("sym") or it.get("simbol")
                       or it.get("s"))
            elif isinstance(it, str):
                sym = it
            else:
                sym = None
            if sym:
                s.add(str(sym).upper())
    return sorted(s)[:100]

def klasifikasi_fear(v):
    if v is None:
        return "N/A"
    if v <= 24:
        return "Extreme Fear"
    if v <= 44:
        return "Fear"
    if v <= 55:
        return "Netral"
    if v <= 74:
        return "Greed"
    return "Extreme Greed"

def skor_satu(sym, p, fg):
    """Rumus komposit: bobot 0.25/0.25/0.20/0.20/0.10, semua disubkan (-1..1)."""
    r = {"symbol": sym}
    alasan = []

    # L1 LIKUIDITAS: log10(market_cap) dinormalkan (BTC ~11.5 -> 1.0; ~1e7 -> 0.0)
    mc = p.get("market_cap")
    if isinstance(mc, (int, float)) and mc > 0:
        s1 = max(0.0, min(1.0, (math.log10(mc) - 7.0) / 4.5))
        r["mc"] = int(mc)
        alasan.append(f"MC ${mc/1e9:.2f}B" if mc >= 1e9 else f"MC ${mc/1e6:.1f}M")
    else:
        s1 = 0.30  # tanpa data MC = netral-rendah, jujur tidak mengarang
        r["mc"] = None
    r["s1"] = round(s1, 3)

    # L2 RUANG-ATH: CoinPaprika ath_pct NEGATIF = harga di bawah ATH.
    # drop = seberapa jauh di bawah puncak. drop=0 (di ATH) -> tanh negatif;
    # drop besar (jauh di bawah) -> ruang naik besar -> tanh positif.
    athp = p.get("ath_pct")
    if isinstance(athp, (int, float)) and -10000 <= athp <= 10000:
        drop = max(0.0, -athp)               # athp negatif -> drop positif
        s2 = math.tanh((min(drop, 90.0) - 25.0) / 35.0)
        alasan.append(f"{drop:.0f}% di bawah ATH" if drop >= 1 else "dekat/di ATH")
    else:
        s2 = 0.0
        athp = None
    r["ath_pct"] = round(athp, 1) if athp is not None else None
    r["s2"] = round(s2, 3)

    # L3 DIVERGENSI: cross-exchange arah divergence = sinyal paling tajam
    dv = p.get("divergensi_arah")
    dvb = p.get("divergensi_pct")
    if dv in ("BINANCE-TURUN-LAIN-NAIK",):
        s3 = -1.0  # Binance jatuh sementara bursa lain naik: risiko arus keluar
        alasan.append("DIVERGENSI Binance turun, lain naik")
    elif dv in ("BINANCE-NAIK-LAIN-TURUN",):
        s3 = 1.0  # Binance naik sendirian: akumulasi terdeteksi
        alasan.append("DIVERGENSI Binance naik, lain turun")
    elif isinstance(dvb, (int, float)) and abs(dvb) >= 0.5:
        s3 = max(-0.5, min(0.5, dvb / 10.0))  # divergensi lemah = mikro-sinyal
        alasan.append(f"div {dvb:+.1f}pp")
    else:
        s3 = 0.0
    r["s3"] = round(s3, 3)

    # L4 MOMENTUM: median chg 24h lintas bursa (lebih adil daripada Binance saja)
    cb = p.get("chg_median_lain")
    if cb is None:
        cb = p.get("chg24h")
    if isinstance(cb, (int, float)) and -99 < cb < 900:
        s4 = max(-1.0, min(1.0, cb / 15.0))  # +15% = full, -15% = full minus
        alasan.append(f"chg24h {cb:+.1f}%")
    else:
        s4 = 0.0
        cb = None
    r["chg24h"] = round(cb, 2) if cb is not None else None
    r["s4"] = round(s4, 3)

    # L5 REZIM F&G: satu rezim untuk semua sasaran
    if isinstance(fg, (int, float)):
        # rezim ekstrem takut = contra-beli peluang; ekstrem serakah = risiko
        s5 = (50.0 - fg) / 50.0  # F&G 0 -> +1 (peluang), 100 -> -1 (bahaya)
        alasan.append(f"F&G {int(fg)}")
    else:
        s5 = 0.0
    r["s5"] = round(s5, 3)

    total = 0.25 * s1 + 0.25 * s2 + 0.20 * s3 + 0.20 * s4 + 0.10 * s5
    r["skor"] = round(total, 4)
    r["skor_100"] = round(50 + 50 * total, 1)  # skala 0-100, 50 = netral
    r["alasan"] = "; ".join(alasan) if alasan else "data minim"
    return r

def satu_siklus():
    d = baca_json(F_PASAR)
    if not d or not isinstance(d.get("pasar"), dict):
        print("TANPA-DATA-PASAR: jalankan lintang_pasar.py dulu", file=sys.stderr)
        return 1
    pasar = d["pasar"]
    fg = None
    rk = d.get("ringkas") or {}
    fgd = rk.get("fear_greed")
    if isinstance(fgd, dict):
        fg = fgd.get("nilai", fgd.get("value"))
    elif isinstance(fgd, (int, float)):
        fg = fgd

    sasaran = ambil_sasaran()
    hasil = []
    cocok = 0
    for sym in sasaran:
        p = pasar.get(sym)
        if not isinstance(p, dict):
            p = pasar.get(sym.replace("USDT", ""))
        if isinstance(p, dict):
            cocok += 1
            hasil.append(skor_satu(sym, p, fg))
        else:
            hasil.append({"symbol": sym, "skor": None, "skor_100": None,
                          "alasan": "tidak ada di pasar_lintas", "s1": None, "s2": None,
                          "s3": None, "s4": None, "s5": None})

    ada = [x for x in hasil if x.get("skor") is not None]
    ada.sort(key=lambda x: x["skor"], reverse=True)

    fg_kelas = klasifikasi_fear(fg)
    out = {
        "versi": "SKOR-MASTER v1",
        "ts": int(time.time()),
        "waktu": time.strftime("%Y-%m-%d %H:%M:%S"),
        "formula": "skor = 0.25*likuiditas + 0.25*ruang_ath + 0.20*divergensi + 0.20*momentum + 0.10*rezim_fng; skala 0-100 (50=netral)",
        "bobot": {"likuiditas": 0.25, "ruang_ath": 0.25, "divergensi": 0.20, "momentum": 0.20, "rezim": 0.10},
        "fear_greed": fg, "fear_greed_kelas": fg_kelas,
        "n_sasaran": len(sasaran), "n_dinilai": len(ada),
        "top12": ada[:12], "bawah5": ada[-5:] if len(ada) > 5 else [],
        "hasil": hasil,
    }
    with open(F_OUT, "w") as fh:
        json.dump(out, fh, indent=1, ensure_ascii=False)
    print(f"SKOR-MASTER: {len(ada)}/{len(sasaran)} sasaran dinilai | F&G {fg} ({fg_kelas})")
    for x in out["top12"]:
        print(f"  {x['symbol']:12s} {x['skor_100']:6.1f}  {x['alasan']}")
    return 0

if __name__ == "__main__":
    sys.exit(satu_siklus())
