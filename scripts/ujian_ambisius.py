#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# ============================================================
# MESIN UJIAN 50.000 SOAL — JUAL-AMBISIUS (V301-AMBISIUS)
#
# Filosofi anti-hindsight (identik tradisi ujian arena):
#   cyborg HANYA melihat 30 bar harian masa lalu (jendela H);
#   vonis diambil dari bar hari-D yang sesungguhnya (data riil).
#   Acuan keputusan = close bar terakhir H (cyborg memutuskan saat tutup).
#
# STRATIFIKASI (permintaan pemilik): sideways / bearish / bullish
#   + tag HARI-PUMP (berita & spekulasi: high_D >= +5% dari p)
#   + tag HARI-CRASH (low_D <= -5%).
# SAMPLING BERBIBIT: rng(50500) — bisa direproduksi siapa pun.
# ============================================================
import json
import os
import time

import numpy as np

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")

N_SOAL = 50_000
QUOTA = {"SIDE": 20_000, "BULL": 15_000, "BEAR": 15_000}
SEED = 50500
PUMP_TH = 5.0
CRASH_TH = -5.0


def muat_pool():
    z = np.load(os.path.join(DATA_DIR, "ambisius_pool.npz"))
    meta = json.load(open(os.path.join(DATA_DIR, "ambisius_meta.json")))
    idx = meta["idx"]
    pool = {}
    for s in meta["symbols"]:
        i = idx[s]
        pool[s] = {f: z[f"{f}__{i}"] for f in
                   ("openTime", "open", "high", "low", "close", "volume", "qv")}
    return pool


def bangun_semua_soal(pool):
    """Semua (koin, t) sah: fitur dari t-30..t-1, kebenaran dari bar t."""
    feats, truth, pump, crash, syms, ts, p_ref = [], [], [], [], [], [], []
    for sym, k in pool.items():
        o, h, l, c, qv = k["open"], k["high"], k["low"], k["close"], k["qv"]
        n = len(c)
        if n < 31:
            continue
        pc = np.concatenate([[c[0]], c[:-1]])
        tr = np.maximum(h - l, np.maximum(np.abs(h - pc), np.abs(l - pc)))
        t_arr = np.arange(30, n)
        p = c[t_arr - 1]                       # acuan keputusan: close H
        atr14 = np.array([tr[t - 14:t].mean() for t in t_arr])
        atrp14 = atr14 / p * 100
        sw8 = np.array([h[t - 8:t].max() for t in t_arr])
        sw30 = np.array([h[t - 30:t].max() for t in t_arr])
        lo30 = np.array([l[t - 30:t].min() for t in t_arr])
        rng30 = sw30 - lo30
        pos = np.where(rng30 > 0, (p - lo30) / np.where(rng30 > 0, rng30, 1.0), 0.5)
        vs = np.array([qv[t - 3:t].mean() / max(qv[t - 30:t].mean(), 1e-9) for t in t_arr])
        up14 = np.array([(c[t - 14:t] > pc[t - 14:t]).mean() for t in t_arr])
        sig = np.array([np.std(np.diff(np.log(c[t - 15:t - 1]))) * 100 for t in t_arr])
        mom7 = (c[t_arr - 1] / c[t_arr - 8] - 1) * 100
        mom30 = (c[t_arr - 1] / c[t_arr - 30] - 1) * 100
        chg24 = (c[t_arr - 1] / c[t_arr - 2] - 1) * 100
        g8 = (sw8 / p - 1) * 100
        g30 = (sw30 / p - 1) * 100
        F = np.column_stack([atrp14, mom7, mom30, chg24, pos, g8, g30, vs, up14, sig, atr14])
        T = np.column_stack([o[t_arr], h[t_arr], l[t_arr], c[t_arr]])
        pm = (h[t_arr] / p - 1) * 100 >= PUMP_TH
        cr = (l[t_arr] / p - 1) * 100 <= CRASH_TH
        ok = np.isfinite(p) & (p > 0) & np.isfinite(atrp14) & (atrp14 >= 0.05) & (atrp14 <= 40)
        if ok.sum() == 0:
            continue
        feats.append(F[ok]); truth.append(T[ok])
        pump.append(pm[ok]); crash.append(cr[ok])
        syms += [sym] * int(ok.sum())
        ts += list(k["openTime"][t_arr][ok])
        p_ref.append(p[ok])
    return (np.vstack(feats), np.vstack(truth), np.concatenate(pump),
            np.concatenate(crash), syms, ts, np.concatenate(p_ref))


def label_rezim(F):
    mom30 = F[:, 2]
    return np.where(mom30 >= 8.0, "BULL", np.where(mom30 <= -8.0, "BEAR", "SIDE"))


def sampling(pump, rezim):
    """50.000 soal terstratifikasi berbibit; 20% tiap stratum jadi VALIDASI dipegang."""
    rng = np.random.default_rng(SEED)
    pick_train, pick_val = [], []
    for r, quota in QUOTA.items():
        ids = np.where(rezim == r)[0].copy()
        rng.shuffle(ids)
        n_val = int(round(quota * 0.20))
        pm = ids[pump[ids]]
        npm = ids[~pump[ids]]
        # pump wajib terwakili ~12% per stratum (berita & spekulasi hadir di ujian)
        t_pm = min(int(quota * 0.12), len(pm))
        t_npm = min(quota - t_pm, len(npm))
        ambil = np.concatenate([pm[:t_pm], npm[:t_npm]])
        if len(ambil) < quota:
            sisa = np.setdiff1d(ids, ambil)
            ambil = np.concatenate([ambil, sisa[:quota - len(ambil)]])
        # train = sisanya setelah val dipotong dari ekor
        tr = ambil[:quota - n_val]
        va = ambil[quota - n_val:quota]
        if len(va) < n_val:
            sisa = np.setdiff1d(ids, ambil)
            va = np.concatenate([va, sisa[:n_val - len(va)]])
        pick_train.append(tr); pick_val.append(va)
    tr = np.concatenate(pick_train); va = np.concatenate(pick_val)
    rng.shuffle(tr); rng.shuffle(va)
    return tr, va


def main():
    t0 = time.time()
    print("[1/4] Memuat pool & membangun semua soal mentah...")
    pool = muat_pool()
    F, T, pump, crash, syms, ts, p_ref = bangun_semua_soal(pool)
    rezim = label_rezim(F)
    uniq, cnt = np.unique(rezim, return_counts=True)
    print(f"      soal mentah: {len(F):,} | rezim: {dict(zip(uniq.tolist(), cnt.tolist()))} | pump: {int(pump.sum()):,} | crash: {int(crash.sum()):,}")

    print("[2/4] Sampling 50.000 soal terstratifikasi (seed 50500)...")
    tr_idx, va_idx = sampling(pump, rezim)
    print(f"      train: {len(tr_idx):,} | validasi dipegang: {len(va_idx):,}")

    print("[3/4] Mengemas & menyimpan NPZ ujian...")
    np.savez_compressed(
        os.path.join(DATA_DIR, "ujian_50k.npz"),
        F_all=F, T_all=T, pump_all=pump, crash_all=crash, rezim_all=rezim,
        tr_idx=tr_idx, va_idx=va_idx, syms=np.array(syms), ts=np.array(ts),
        p_ref=p_ref,
    )
    ring = {
        "versi": "V301-AMBISIUS-UJIAN",
        "mentah": int(len(F)), "train": int(len(tr_idx)), "val": int(len(va_idx)),
        "rezim": {u: int(c) for u, c in zip(uniq.tolist(), cnt.tolist())},
        "pump": int(pump.sum()), "crash": int(crash.sum()),
        "seed": SEED, "detik": round(time.time() - t0, 1),
    }
    json.dump(ring, open(os.path.join(DATA_DIR, "ujian_ringkasan.json"), "w"), indent=1)
    print(f"      SELESAI {ring['detik']}s → ujian_50k.npz")


if __name__ == "__main__":
    main()
