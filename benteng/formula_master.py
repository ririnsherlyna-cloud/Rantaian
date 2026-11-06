#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FORMULA-MASTER v1 (6 Nov, mandat pemilik: "lu gak ciptakan formula,
harusnya lu percanggih" — bukan mainan, ini nyawa):
3 rumus KUANTITATIF nyata yang dihitung dari data gratis hidup, bukan tempelan:

F1 — SKG (Skor Kekuatan Gabungan, 0-100):
    SKG = 100 x ( 0.40*K + 0.20*M + 0.15*A + 0.15*L + 0.10*D )
    K = keyakinan otak z.ai (0-100)            [arena, 91 sasaran]
    M = momentum lintas bursa = clamp((chg24h_median+10)/20)*100  [8 bursa, gratis]
    A = posisi siklus ATH (arah-sadar):
        BUY  -> 100 - clamp(|%dariATH|)   (makin dekat ATH makin kuat)
        SELL -> clamp(|%dariATH|)         (makin dalam makin layak fade)
    L = likuiditas = clamp(log10(market_cap),0,11)/11*100  [paprika/CG]
    D = kepercayaan lintas bursa: ada divergensi arah 35; konsisten >=3 bursa 85;
        <3 bursa 55; tanpa data 50 (jujur netral, bukan karangan)
    Semua komponen 0-100. Data hilang = 50 NETRAL (tidak pernah dikarang).

F2 — RR-GERBANG v2 (rasio reward/risk struktural lintas bursa):
    BUY : R = (ambisius - kini) / (kini - stop)
    SELL: R = (kini - ambisius) / (stop - kini)
    kini = MEDIAN harga lintas bursa (bukan 1 bursa saja)
    penalti: R*0.8 bila divergensi arah MELAWAN arah pick;
             R*0.9 bila sebar harga antar bursa > 5% (pasar kotor)

F3 — RADAR-DIVERGENSI:
    skor = |chg_binance - median_lain| * min(n_bursa,8)/8
    sinyal saat skor >= 2.0 dan n_bursa >= 3
    (persis skenario pemilik: "di Binance turun tapi di lain naik")

Output: data/formula_terkini.json + ringkas stdout.
Tanpa API berbayar, tanpa kunci, tanpa rotasi IP.
"""
import json, math, statistics, time, os

BASE = "/home/z/my-project"
F_PICKS = f"{BASE}/data/zai_picks_last.json"
F_PASAR = f"{BASE}/data/pasar_lintas.json"
F_OUT = f"{BASE}/data/formula_terkini.json"

def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))

def n_float(v):
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except (TypeError, ValueError):
        return None

def basis(s):
    s = str(s).upper().strip()
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s

def komponen_momentum(psr):
    v = n_float(psr.get("chg24h"))
    if v is None and psr.get("chg_bursa"):
        vals = [x for x in psr["chg_bursa"].values() if n_float(x) is not None]
        if vals:
            v = statistics.median(vals)
    if v is None:
        return 50.0, None
    return clamp((v + 10.0) / 20.0 * 100.0), v

def komponen_ath(psr, arah):
    ap = n_float(psr.get("ath_pct"))
    if ap is None:
        return 50.0, None
    dalam = clamp(abs(ap))
    a = (100.0 - dalam) if str(arah).upper() == "BUY" else dalam
    return a, ap

def komponen_likuiditas(psr):
    mc = n_float(psr.get("market_cap"))
    if not mc or mc <= 0:
        return 50.0, None
    return clamp(math.log10(mc) / 11.0 * 100.0), mc

def komponen_lintas(psr):
    if psr.get("divergensi_arah"):
        return 35.0, "divergensi-arah"
    if (psr.get("jumlah_exchange") or 0) >= 3:
        return 85.0, "konsisten"
    if (psr.get("jumlah_exchange") or 0) >= 1:
        return 55.0, "bursa-sedikit"
    return 50.0, "tanpa-data-chg"

def rr_v2(pick, psr):
    """RR struktural lintas bursa + penalti jujur + status rencana.
    PELAJARAN DASH (live 6 Nov): kini sudah memakan 92% risiko -> RR 18
    TIPIS tapi itu jebakan rencana mati. Guard: status_rencana.
    None = data tak cukup."""
    ent, amb, stp = n_float(pick.get("entry")), n_float(pick.get("ambisius")), n_float(pick.get("stop"))
    hargae = psr.get("harga_exchange") or {}
    vals = [n_float(v) for v in hargae.values() if n_float(v)]
    kini = statistics.median(vals) if vals else None
    if not (ent and amb and stp and kini) or ent <= 0:
        return None, kini, 1.0, None, "tanpa-data"
    arah = str(pick.get("arah") or "BUY").upper()
    if arah == "SELL":
        untung, rugi = kini - amb, stp - kini
        risiko_band = stp - ent  # SELL: stop di ATAS entry -> band positif
        risk_used = (kini - ent) / risiko_band if risiko_band > 0 else 1.0
    else:
        untung, rugi = amb - kini, kini - stp
        risiko_band = ent - stp  # BUY: stop di BAWAH entry -> band positif
        risk_used = (ent - kini) / risiko_band if risiko_band > 0 else 1.0
    if rugi <= 0:
        return None, kini, 1.0, "stop-sudah-terbus", "stop-terbus"
    r = untung / rugi
    penalti, alasan = 1.0, []
    fl = psr.get("divergensi_arah")
    if fl:
        bin_bersalah = n_float(psr.get("chg_binance")) or 0.0
        melawan = ((arah == "BUY" and bin_bersalah <= -1.0) or (arah == "SELL" and bin_bersalah >= 1.0))
        if melawan:
            penalti *= 0.8
            alasan.append("divergensi-melawan")
    div = n_float(psr.get("divergensi_pct")) or 0.0
    if div > 5.0:
        penalti *= 0.9
        alasan.append("sebar-harga>5%")
    if risk_used >= 1.0:
        status = "stop-terbus"
    elif risk_used > 0.7:
        status = "plan-rusak"
    else:
        status = "sehat"
    if status != "sehat":
        alasan.append(f"risk-{round(risk_used * 100)}%-terpakai")
    return r * penalti, kini, penalti, ";".join(alasan) or None, status

def satu_siklus():
    picks = (json.load(open(F_PICKS)) or {}).get("picks") or []
    pasar = (json.load(open(F_PASAR)) or {}).get("pasar") or {}
    sasaran, n_mc, n_momen = {}, 0, 0
    for p in picks:
        sim = p.get("simbol")
        if not sim or sim == "XAUUSDT":
            continue
        b = basis(sim)
        psr = pasar.get(b) or {}
        K = n_float(p.get("keyakinan"))
        K = clamp(K) if K is not None else 50.0
        M, momen = komponen_momentum(psr)
        A, athp = komponen_ath(psr, p.get("arah"))
        L, mc = komponen_likuiditas(psr)
        D, dket = komponen_lintas(psr)
        skg = 100.0 * (0.40 * K + 0.20 * M + 0.15 * A + 0.15 * L + 0.10 * D) / 100.0
        R, kini, penalti, alasan, status = rr_v2(p, psr)
        rad = None
        cb, ml = n_float(psr.get("chg_binance")), n_float(psr.get("chg_median_lain"))
        if cb is not None and ml is not None:
            rad = abs(cb - ml) * min(psr.get("jumlah_exchange") or 0, 8) / 8.0
        if mc:
            n_mc += 1
        if momen is not None:
            n_momen += 1
        sasaran[b] = {
            "simbol": b, "arah": str(p.get("arah") or "?").upper(),
            "skg": round(skg, 1),
            "komponen": {"keyakinan_arena": round(K, 1), "momentum": round(M, 1),
                         "posisi_ath": round(A, 1), "likuiditas": round(L, 1),
                         "lintas_bursa": round(D, 1)},
            "chg24h_median": round(momen, 2) if momen is not None else None,
            "pct_dari_ath": round(athp, 1) if athp is not None else None,
            "market_cap": mc, "jumlah_exchange": psr.get("jumlah_exchange") or 0,
            "rr_v2": round(R, 2) if R is not None else None,
            "rr_penalti": penalti, "rr_alasan": alasan, "status_rencana": status,
            "kini_median": kini,
            "radar_skor": round(rad, 2) if rad is not None else None,
            "divergensi_arah": psr.get("divergensi_arah"),
        }
    urut_skg = sorted(sasaran.values(), key=lambda x: -x["skg"])
    rr_ok = [v for v in sasaran.values() if v["rr_v2"] is not None and v["status_rencana"] == "sehat"]
    urut_rr = sorted(rr_ok, key=lambda x: -x["rr_v2"])
    rusak = sum(1 for v in sasaran.values() if v["status_rencana"] in ("plan-rusak", "stop-terbus"))
    radar = [v for v in sasaran.values()
             if v["radar_skor"] is not None and v["radar_skor"] >= 2.0 and v["jumlah_exchange"] >= 3]
    radar.sort(key=lambda x: -x["radar_skor"])
    data = {
        "ts": time.time(),
        "versi": "FORMULA-MASTER v1",
        "rumus": {
            "SKG": "100x(0.40*keyakinan + 0.20*momentum + 0.15*posisiATH + 0.15*likuiditas + 0.10*lintasBursa); data hilang=50 netral",
            "RR_V2": "BUY:(ambisius-kini)/(kini-stop); SELL:(kini-ambisius)/(stop-kini); kini=median lintas bursa; x0.8 divergensi melawan, x0.9 sebar>5%",
            "RADAR": "|chg_binance-median_lain| x min(n_bursa,8)/8; sinyal >=2.0 & n_bursa>=3",
        },
        "sumber_testimoni": {
            "sasaran": len(sasaran), "dengan_market_cap": n_mc, "dengan_momentum": n_momen,
            "pasar_sumber": (json.load(open(F_PASAR)) or {}).get("sumber") or {},
        },
        "sasaran": sasaran,
        "teratas_skg": [{"simbol": v["simbol"], "skg": v["skg"], "arah": v["arah"],
                         "komponen": v["komponen"]} for v in urut_skg[:5]],
        "rr_terbaik": [{"simbol": v["simbol"], "arah": v["arah"], "rr_v2": v["rr_v2"],
                        "penalti": v["rr_penalti"], "alasan": v["rr_alasan"]} for v in urut_rr[:5]],
        "rencana_rusak": rusak,
        "sinyal_radar": [{"simbol": v["simbol"], "skor": v["radar_skor"],
                          "flag": v["divergensi_arah"],
                          "binance": (pasar.get(v["simbol"]) or {}).get("chg_binance"),
                          "lain": (pasar.get(v["simbol"]) or {}).get("chg_median_lain")} for v in radar[:5]],
    }
    tmp = F_OUT + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp, F_OUT)
    return data

def main():
    d = satu_siklus()
    print(f"FORMULA-MASTER: sasaran={d['sumber_testimoni']['sasaran']} "
          f"mcap={d['sumber_testimoni']['dengan_market_cap']} momentum={d['sumber_testimoni']['dengan_momentum']}")
    print("SKG teratas:", " · ".join(f"{x['simbol']} {x['skg']}" for x in d["teratas_skg"][:5]))
    print("RR-v2 terbaik (rencana sehat):", " · ".join(f"{x['simbol']} {x['rr_v2']}" for x in d["rr_terbaik"][:5]))
    print("RADAR sinyal:", " · ".join(f"{x['simbol']} {x['skor']}" for x in d["sinyal_radar"][:5]) or "-")

if __name__ == "__main__":
    main()
