#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# PENEMPAAN JUAL-AMBISIUS V301 — 3 RONDE GRID-SEARCH DI 50.000 SOAL RIIL
#
# Hukum penempaan (permintaan pemilik):
#   "bila belum akurat 50.000 soal ujian, harus terus ditempa
#    hingga lulusan maksimal" — R1 kasar → R2 halus → R3 mikro
#   → VONIS di validasi yang TAK PERNAH disentuh latihan.
#
# GRADING TIGA LAPIS (definisi pemilik + lantai ambisi):
#   LULUS-SEGI     : KENA (high_D >= A) & LANSOR (close_D < A & jatuh >= 0.5 ATR$)
#                    → "tembakan mengena, longsor menyusul"
#   TANGKAP        : (A - p) >= 0.5 x (high_D - p)
#                    → menangkap >= separuh kenaikan hari itu (anti-penakut)
#   LULUS-SEMPURNA : LULUS-SEGI & TANGKAP — METRIK UTAMA PENEMPAAAN
#                    → "setengah naikan hari itu masuk kantong, lalu longsor"
#   LANTAI AMBISI  : k0 >= 0.30 — di bawah 0,3xATR bukan ambisius,
#                    itu penjualan panik (dilarang ikut menang di papan skor)
#   Gagal: TAK-KENA | NAIK-LAGI (close_D > A) | LONGSOR-LEMAH (jatuh < 0.5 ATR$)
#
# Kejujuran V274 dipelihara: angka nyata per rezim, tak ada janji pasti.
# ============================================================
import itertools
import json
import os
import time

import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")

z = np.load(os.path.join(DATA_DIR, "ujian_50k.npz"), allow_pickle=False)
F_ALL, T_ALL, PUMP_ALL, REZIM_ALL = z["F_all"], z["T_all"], z["pump_all"], z["rezim_all"]
SYMS, TS, P_REF = z["syms"], z["ts"], z["p_ref"]
TR, VA = z["tr_idx"], z["va_idx"]
FULL = np.concatenate([TR, VA])
ATR_D = F_ALL[:, 10]
ATRP = F_ALL[:, 0]
GAP8 = F_ALL[:, 5]
POS = F_ALL[:, 4]
UP14 = F_ALL[:, 8]
VOLS = F_ALL[:, 7]
MED_ATRP = float(np.median(ATRP[TR]))


# ---------- GRADING TETAP ----------
def grade(A_pct, idx, sisi="UP"):
    p = P_REF[idx]
    A = p * (1 + A_pct / 100) if sisi == "UP" else p * (1 - np.abs(A_pct) / 100)
    high, low, close = T_ALL[idx, 1], T_ALL[idx, 2], T_ALL[idx, 3]
    ATR = ATR_D[idx]
    if sisi == "UP":
        kena = high >= A
        jatuh = high - close
        segi = kena & (close < A) & (jatuh >= 0.5 * ATR)
        tangkap = (A - p) >= 0.5 * (high - p)          # >= separuh ekskursi hari itu
        sempurna = segi & tangkap
        naik_lagi = kena & (close > A)
        den = np.maximum(high - T_ALL[idx, 0], 1e-12)
        porsi = np.where(kena, np.clip((A - T_ALL[idx, 0]) / den, 0, 1), np.nan)
    else:
        kena = low <= A
        naik = close - low
        segi = kena & (close > A) & (naik >= 0.5 * ATR)
        tangkap = (p - A) >= 0.5 * (p - low)
        sempurna = segi & tangkap
        naik_lagi = kena & (close < A)
        den = np.maximum(T_ALL[idx, 0] - low, 1e-12)
        porsi = np.where(kena, np.clip((T_ALL[idx, 0] - A) / den, 0, 1), np.nan)
    lemah = kena & ~segi & ~naik_lagi
    return {
        "segi": float(segi.mean() * 100),
        "sempurna": float(sempurna.mean() * 100),
        "kena": float(kena.mean() * 100),
        "takKena": float((~kena).mean() * 100),
        "naikLagi": float(naik_lagi.mean() * 100),
        "lemah": float(lemah.mean() * 100),
        "porsi": float(np.nanmean(porsi)) if not np.all(np.isnan(porsi)) else 0.0,
        "aRata": float(np.mean(A_pct)),
    }


def ringkas(g):
    return {k: round(v, 3) for k, v in g.items()}


# ---------- KELUARGA RUMUS (hanya fitur 30 bar TERLIHAT) ----------
def f1(idx, k):
    return k * ATRP[idx]


def f2(idx, k0, mB, mR):
    a = k0 * ATRP[idx]
    r = REZIM_ALL[idx]
    return a * np.where(r == "BULL", mB, np.where(r == "BEAR", mR, 1.0))


def f4(idx, k0, mHi, mLo):
    a = k0 * ATRP[idx]
    return a * np.where(POS[idx] > 0.8, mHi, np.where(POS[idx] < 0.3, mLo, 1.0))


def f5(idx, k0, e, fl):
    cap = GAP8[idx] + e
    a = np.minimum(k0 * ATRP[idx], cap)
    return np.maximum(a, fl * ATRP[idx])


def f6(idx, k0, mB, mR, e, fl):
    return np.maximum(np.minimum(f2(idx, k0, mB, mR), GAP8[idx] + e), fl * ATRP[idx])


# F7: adaptif gabungan — rezim + posisi + denyut naik + surge volume
def f7(idx, k0, mB, mR, mUp, mDn, mVs, e, fl):
    r = REZIM_ALL[idx]
    a = k0 * ATRP[idx]
    a = a * np.where(r == "BULL", mB, np.where(r == "BEAR", mR, 1.0))
    a = a * np.where(UP14[idx] >= 0.6, mUp, np.where(UP14[idx] <= 0.4, mDn, 1.0))
    a = a * np.where(VOLS[idx] >= 1.5, mVs, 1.0)
    return np.maximum(np.minimum(a, GAP8[idx] + e), fl * ATRP[idx])


FN = {"F1": f1, "F2": f2, "F4": f4, "F5": f5, "F6": f6, "F7": f7}


# F8: PREDIKSI LANGIT-LANGIT — regresi ridge ke log1p((high_D-p)/ATR),
#     lalu A dipasang di fraksi q dari puncak hari yang diprediksi.
#     Ini satu-satunya keluarga yang BELAJAR dari 40.000 soal latihan
#     (koefisien beku setelah dilatih — tak ada kebocoran validasi).
XKOLOM = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

def fitur_x(idx):
    F = F_ALL[idx][:, XKOLOM]
    return np.column_stack([np.ones(len(idx)), F,
                            F_ALL[idx, 3] * F_ALL[idx, 8],   # chg24 x up14
                            F_ALL[idx, 4] * F_ALL[idx, 5],   # posisi x gap8
                            np.log1p(np.maximum(F_ALL[idx, 7], 0))])

def latih_f8(idx_train, lam, sisi="UP"):
    X = fitur_x(idx_train)
    ones = X[:, :1]
    Fz = X[:, 1:]
    mu, sd = Fz.mean(axis=0), Fz.std(axis=0); sd[sd < 1e-9] = 1.0
    Xs = np.column_stack([ones, (Fz - mu) / sd])
    if sisi == "UP":
        x = np.maximum(T_ALL[idx_train, 1] - P_REF[idx_train], 0) / ATR_D[idx_train]
    else:
        x = np.maximum(P_REF[idx_train] - T_ALL[idx_train, 2], 0) / ATR_D[idx_train]
    y = np.log1p(x)
    d = Xs.shape[1]
    A = Xs.T @ Xs + lam * np.eye(d); A[0, 0] -= lam   # intersep bebas penalti
    return np.linalg.solve(A, Xs.T @ y), mu, sd

def f8(idx, lam, zq, q, koef, mu, sd, sisi="UP"):
    X = fitur_x(idx)
    Xs = np.column_stack([X[:, :1], (X[:, 1:] - mu) / sd])
    pred = Xs @ koef + zq                              # geser kuantil (sigma resid ~1)
    xhat = np.expm1(np.clip(pred, -2.0, 4.0))
    return xhat * ATRP[idx] * q

FN["F8"] = f8


def evaluasi(fam, params, idx, sisi="UP"):
    pp = {}
    for k, v in params.items():
        if k.startswith("_"):
            pp[k[1:]] = np.asarray(v)
        else:
            pp[k] = v
    A = FN[fam](idx, **pp, sisi=sisi) if fam == "F8" else FN[fam](idx, **pp)
    g = grade(A, idx, sisi=sisi)
    return {"fam": fam, "params": {k: (np.asarray(v).tolist() if isinstance(v, (np.ndarray, list)) else float(v) if not isinstance(v, (int, np.integer)) else int(v)) for k, v in params.items()}, **ringkas(g)}


def papan(board, n=8):
    return sorted(board, key=lambda r: (-r["sempurna"], -r["segi"]))[:n]


def tampil(b):
    pr = {k: v for k, v in b["params"].items() if not k.startswith("_")}
    extra = " +koef" if "_koef" in b["params"] else ""
    print(f"  {b['fam']} {pr}{extra} → SEGI {b['segi']:.2f}% | SEMPURNA {b['sempurna']:.2f}% | kena {b['kena']:.2f}% | naik-lagi {b['naikLagi']:.2f}% | tak-kena {b['takKena']:.2f}%")


def siapkan(params):
    """Ubah kunci '_x' (JSON) menjadi argumen array untuk F8."""
    return {k[1:] if k.startswith("_") else k: (np.asarray(v) if k.startswith("_") else v)
            for k, v in params.items()}


def main():
    t0 = time.time()
    laporan = {
        "versi": "V301-AMBISIUS-KALIBRASI", "seed": 50500,
        "grading": "SEGI=kena&close<A&jatuh>=0.5ATR | SEMPURNA=segi&tangkap>=0.5ekskursi | lantaiAmbisi k0>=0.30",
    }

    # ---------- BASELINE ----------
    print("== BASELINE (termasuk proxy rumus lama q75-MC) ==")
    rng = np.random.default_rng(50500)
    baseline = []
    baseline.append({"fam": "DADU k~U(0.3,3)", "params": {},
                     **ringkas(grade(rng.uniform(0.3, 3.0, len(TR)), TR))})
    for k in (0.25, 0.5, 0.75, 1.0, 1.5):
        baseline.append({"fam": f"TETAP k={k}", "params": {"k": k}, **ringkas(grade(f1(TR, k), TR))})
    baseline.append({"fam": "SELALU-SWING8+0.3%", "params": {},
                     **ringkas(grade(np.maximum(GAP8[TR] + 0.3, 0.2), TR))})
    for b in sorted(baseline, key=lambda r: -r["segi"]):
        print(f"  {b['fam']:<28} SEGI {b['segi']:.2f}% | SEMPURNA {b['sempurna']:.2f}% | kena {b['kena']:.2f}% | naik-lagi {b['naikLagi']:.2f}%")
    laporan["baseline"] = baseline

    # ---------- KURVA KENA-k (peta kandidat tangga T & A) ----------
    print("\n== KURVA kENA-k (peta tangga harga dari data) ==")
    kurva = []
    for k in (0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.75, 0.9, 1.0, 1.25, 1.5):
        g = grade(f1(TR, k), TR)
        kurva.append({"k": k, "kenaPct": round(g["kena"], 2), "segiPct": round(g["segi"], 2)})
        print(f"  k={k:<5} kena {g['kena']:.2f}% | segi {g['segi']:.2f}%")
    laporan["kurvaK"] = kurva

    # ---------- RONDE 1 ----------
    print("\n== RONDE 1 — keluarga dasar (F1/F2/F4/F5) ==")
    r1 = []
    for k in np.arange(0.15, 1.21, 0.05):
        r1.append(evaluasi("F1", {"k": round(float(k), 2)}, TR))
    for k0, mB, mR in itertools.product(np.arange(0.30, 1.01, 0.05),
                                        (0.85, 0.95, 1.05, 1.15, 1.3),
                                        (0.6, 0.7, 0.8, 0.9, 1.0)):
        r1.append(evaluasi("F2", {"k0": round(float(k0), 2), "mB": mB, "mR": mR}, TR))
    for k0, mHi, mLo in itertools.product(np.arange(0.30, 1.01, 0.05),
                                          (0.85, 0.95, 1.05, 1.15), (0.8, 0.9, 1.0, 1.1)):
        r1.append(evaluasi("F4", {"k0": round(float(k0), 2), "mHi": mHi, "mLo": mLo}, TR))
    for k0, e, fl in itertools.product(np.arange(0.30, 1.01, 0.05),
                                       (0.3, 0.6, 1.0, 1.5, 2.5), (0.0, 0.1, 0.2)):
        r1.append(evaluasi("F5", {"k0": round(float(k0), 2), "e": e, "fl": fl}, TR))
    top1 = papan(r1)
    for b in top1:
        tampil(b)
    laporan["ronde1"] = {"jumlah": len(r1), "top": top1}

    # ---------- RONDE 2 ----------
    print("\n== RONDE 2 — tutup-swing + rezim (F6) ==")
    r2 = []
    for k0, mB, mR, e, fl in itertools.product(
            np.arange(0.30, 1.01, 0.05),
            (0.85, 0.95, 1.05, 1.15, 1.3),
            (0.6, 0.7, 0.8, 0.9, 1.0),
            (0.3, 0.6, 1.0, 1.5), (0.0, 0.1, 0.2)):
        r2.append(evaluasi("F6", {"k0": round(float(k0), 2), "mB": mB, "mR": mR, "e": e, "fl": fl}, TR))
    top2 = papan(r2)
    for b in top2:
        tampil(b)
    laporan["ronde2"] = {"jumlah": len(r2), "top": top2}

    # ---------- RONDE 3 ----------
    print("\n== RONDE 3 — F7 adaptif penuh (rezim+denyut+surge+tutup-swing) ==")
    r3 = []
    for k0, mB, mR, mUp, mDn, mVs, e, fl in itertools.product(
            np.arange(0.30, 0.81, 0.05),
            (0.85, 0.95, 1.05, 1.15), (0.65, 0.75, 0.85),
            (0.9, 1.0, 1.1), (0.9, 1.0, 1.1), (0.85, 0.95, 1.0),
            (0.6, 1.0, 1.5), (0.0, 0.1)):
        r3.append(evaluasi("F7", {"k0": round(float(k0), 2), "mB": mB, "mR": mR,
                                   "mUp": mUp, "mDn": mDn, "mVs": mVs, "e": e, "fl": fl}, TR))
    top3 = papan(r3)
    for b in top3:
        tampil(b)
    laporan["ronde3"] = {"jumlah": len(r3), "top": top3}

    # ---------- RONDE 4 — mikro-segel di sekitar juara gabungan ----------
    print("\n== RONDE 4 — mikro-penempaan (segel final) ==")
    best6 = top2[0]
    p6 = dict(best6["params"])
    r4 = []
    for dk0, dmB, dmR, de, dfl in itertools.product((-0.03, 0.0, 0.03), (-0.05, 0.0, 0.05),
                                                    (-0.05, 0.0, 0.05), (-0.15, 0.0, 0.15),
                                                    (-0.05, 0.0, 0.05)):
        q = {"k0": round(max(0.30, p6["k0"] + dk0), 3), "mB": round(p6["mB"] + dmB, 3),
             "mR": round(max(0.5, p6["mR"] + dmR), 3), "e": round(max(0.1, p6["e"] + de), 3),
             "fl": round(max(0.0, p6["fl"] + dfl), 3)}
        r4.append(evaluasi("F6", q, TR))
    b7 = top3[0]; p7 = dict(b7["params"])
    for dk0, dmB, dmR, dmUp, dmDn, dmVs, de, dfl in itertools.product(
            (-0.03, 0.0, 0.03), (-0.05, 0.0, 0.05), (-0.05, 0.0, 0.05),
            (-0.05, 0.0, 0.05), (-0.05, 0.0, 0.05), (-0.05, 0.0, 0.05),
            (-0.15, 0.0, 0.15), (-0.05, 0.0, 0.05)):
        q = {"k0": round(max(0.30, p7["k0"] + dk0), 3), "mB": round(p7["mB"] + dmB, 3),
             "mR": round(max(0.5, p7["mR"] + dmR), 3), "mUp": round(p7["mUp"] + dmUp, 3),
             "mDn": round(p7["mDn"] + dmDn, 3), "mVs": round(p7["mVs"] + dmVs, 3),
             "e": round(max(0.1, p7["e"] + de), 3), "fl": round(max(0.0, p7["fl"] + dfl), 3)}
        r4.append(evaluasi("F7", q, TR))
    top4 = papan(r4)
    for b in top4:
        tampil(b)
    laporan["ronde4"] = {"jumlah": len(r4), "top": top4}

    # ---------- RONDE 5 — prediksi langit-langit (F8, belajar dari 40k latihan) ----------
    print("\n== RONDE 5 — prediksi langit-langit (F8 ridge; koefisien dilatih di train, beku setelahnya) ==")
    r5 = []
    f8_model = {}
    for lam in (0.1, 1.0, 10.0):
        koef, mu, sd = latih_f8(TR, lam, "UP")
        f8_model[lam] = (koef, mu, sd)
        for zq in (0.0, 0.25, 0.5):
            for q in (0.5, 0.6, 0.7, 0.8, 0.9):
                b = evaluasi("F8", {"lam": lam, "zq": zq, "q": q,
                                     "_koef": koef.tolist(), "_mu": mu.tolist(), "_sd": sd.tolist()}, TR)
                r5.append(b)
    top5 = papan(r5)
    for b in top5:
        tampil(b)
    laporan["ronde5"] = {"jumlah": len(r5), "top": top5}

    # ---------- JUARA GABUNGAN R4+R5 ----------
    top45 = papan(r4 + r5, n=10)
    print("\n  Papan juara gabungan R4+R5:")
    for b in top45[:6]:
        tampil(b)
    juara = top45[0]
    fn_juara = FN[juara["fam"]]; params_juara = juara["params"]

    # ---------- VONIS FINAL ----------
    print("\n== VONIS FINAL (segel digel — validasi 10.000 tak pernah disentuh) ==")
    vonis = {}
    for label, idx in (("train", TR), ("validasi", VA), ("penuh", FULL)):
        A = fn_juara(idx, **siapkan(params_juara), sisi="UP") if juara["fam"] == "F8" else fn_juara(idx, **params_juara)
        g = grade(A, idx)
        vonis[label] = ringkas(g)
        print(f"  {label:<9} SEGI {g['segi']:.2f}% | SEMPURNA {g['sempurna']:.2f}% | kena {g['kena']:.2f}% | naik-lagi {g['naikLagi']:.2f}% | tak-kena {g['takKena']:.2f}%")

    # bedah per rezim & hari spesial (posisi dalam FULL, bukan indeks mentah)
    A_full = fn_juara(FULL, **siapkan(params_juara), sisi="UP") if juara["fam"] == "F8" else fn_juara(FULL, **params_juara)
    pos_lookup = {int(v): i for i, v in enumerate(FULL)}
    bedah = {}
    for r in ("SIDE", "BULL", "BEAR"):
        sel = REZIM_ALL[FULL] == r
        i = FULL[sel]
        g = grade(A_full[sel], i)
        bedah[f"rezim_{r}"] = ringkas(g)
    sel = PUMP_ALL[FULL]
    bedah["hariPump"] = ringkas(grade(A_full[sel], FULL[sel]))
    bedah["hariBiasa"] = ringkas(grade(A_full[~sel], FULL[~sel]))
    selc = z["crash_all"][FULL]
    bedah["hariCrash"] = ringkas(grade(A_full[selc], FULL[selc]))
    print("\n  Bedah per rezim & hari spesial (penuh 50.000):")
    for k, v in bedah.items():
        print(f"    {k:<12} SEGI {v['segi']:.2f}% | SEMPURNA {v['sempurna']:.2f}% | kena {v['kena']:.2f}% | tak-kena {v['takKena']:.2f}% | naik-lagi {v['naikLagi']:.2f}%")
    laporan["juara"] = {"keluarga": juara["fam"], "params": params_juara, "vonis": vonis, "bedah": bedah}

    # ---------- MIRROR BAWAH ----------
    print("\n== MIRROR BAWAH — ambisius-beli (low<=A & pantul >=0.5ATR & tangkap) ==")
    dn = []
    for k0, mB, mR in itertools.product(np.arange(0.30, 1.21, 0.05),
                                        (0.6, 0.7, 0.8, 0.9, 1.0),
                                        (0.85, 0.95, 1.05, 1.15, 1.3)):
        dn.append(evaluasi("F2", {"k0": round(float(k0), 2), "mB": mB, "mR": mR}, TR, sisi="DOWN"))
    for lam in (0.1, 1.0, 10.0):
        koefd, mud, sdd = latih_f8(TR, lam, "DOWN")
        for zq in (0.0, 0.25, 0.5):
            for q in (0.5, 0.6, 0.7, 0.8, 0.9):
                dn.append(evaluasi("F8", {"lam": lam, "zq": zq, "q": q,
                                           "_koef": koefd.tolist(), "_mu": mud.tolist(), "_sd": sdd.tolist()},
                                   TR, sisi="DOWN"))
    topd = sorted(dn, key=lambda r: (-r["sempurna"], -r["segi"]))[:6]
    for b in topd:
        tampil(b)
    jd = topd[0]
    ppd = siapkan(jd["params"])
    A_dn_va = FN[jd["fam"]](VA, **ppd, sisi="DOWN") if jd["fam"] == "F8" else FN[jd["fam"]](VA, **ppd)
    A_dn_fu = FN[jd["fam"]](FULL, **ppd, sisi="DOWN") if jd["fam"] == "F8" else FN[jd["fam"]](FULL, **ppd)
    vonis_dn = {
        "validasi": ringkas(grade(A_dn_va, VA, sisi="DOWN")),
        "penuh": ringkas(grade(A_dn_fu, FULL, sisi="DOWN")),
    }
    print(f"  vonis bawah: validasi SEGI {vonis_dn['validasi']['segi']:.2f}% | penuh {vonis_dn['penuh']['segi']:.2f}%")
    laporan["juaraBawah"] = {"keluarga": jd["fam"], "params": jd["params"], "vonis": vonis_dn}

    laporan["detik"] = round(time.time() - t0, 1)
    json.dump(laporan, open(os.path.join(DATA_DIR, "kalibrasi_hasil.json"), "w"), indent=1)

    konst = {
        "versi": "V301-AMBISIUS",
        "atas": {"keluarga": juara["fam"], "params": params_juara,
                 "vonisValidasi": vonis["validasi"], "vonisPenuh": vonis["penuh"]},
        "bawah": {"keluarga": jd["fam"], "params": jd["params"],
                  "vonisValidasi": vonis_dn["validasi"], "vonisPenuh": vonis_dn["penuh"]},
        "medAtrp": MED_ATRP,
    }
    json.dump(konst, open(os.path.join(DATA_DIR, "ambisius_juara.json"), "w"), indent=1)
    print(f"\nSELESAI {laporan['detik']}s → kalibrasi_hasil.json + ambisius_juara.json")


if __name__ == "__main__":
    main()
