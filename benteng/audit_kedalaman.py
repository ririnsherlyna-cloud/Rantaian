#!/usr/bin/env python3
# AUDIT-KEDALAMAN v2: replikasi EKSAK rumus dari bahan mentah, toleransi 0.05.
# Pelajaran v1: salah kunci (arah vs flag) & salah input (chg24h vs median)
# = "kegagalan" palsu. Audit harus memakai definisi yang sama persis.
import json, math

def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))

def n_float(v):
    try:
        f = float(v)
        return f if math.isfinite(f) else None
    except Exception:
        return None

lint = json.load(open("/home/z/my-project/data/pasar_lintas.json"))
pasar = lint["pasar"]
fm = json.load(open("/home/z/my-project/data/formula_terkini.json"))
sm = json.load(open("/home/z/my-project/data/skor_master.json"))
picks = json.load(open("/home/z/my-project/data/zai_picks_last.json"))["picks"]

ok, gagal = 0, 0
def cek(nama, a, b, tol=0.05):
    global ok, gagal
    s = abs(a - b)
    st = "OK " if s <= tol else "GAGAL"
    ok, gagal = (ok + 1, gagal) if s <= tol else (ok, gagal + 1)
    print(f"[{st}] {nama}: rehitung {a:.2f} vs mesin {b:.2f} (selisih {s:.3f})")

# ---- 1) SKG MAGIC replikasi eksak (0.40K + 0.20M + 0.15A + 0.15L + 0.10D)
pick = next((p for p in picks if p.get("simbol") == "MAGICUSDT"), None)
psr = pasar.get("MAGIC") or {}
K = clamp(n_float(pick.get("keyakinan")) or 50.0)
v = n_float(psr.get("chg24h"))
if v is None and psr.get("chg_bursa"):
    vals = [x for x in psr["chg_bursa"].values() if n_float(x) is not None]
    if vals:
        vals.sort()
        v = vals[len(vals) // 2]
M = clamp((v + 10.0) / 20.0 * 100.0) if v is not None else 50.0
ap = n_float(psr.get("ath_pct"))
if ap is None:
    A = 50.0
else:
    dalam = clamp(abs(ap))
    A = (100.0 - dalam) if str(pick.get("arah")).upper() == "BUY" else dalam
mc = n_float(psr.get("market_cap"))
L = clamp(math.log10(mc) / 11.0 * 100.0) if (mc and mc > 0) else 50.0
D = 35.0 if psr.get("divergensi_arah") else (85.0 if (psr.get("jumlah_exchange") or 0) >= 3 else (55.0 if (psr.get("jumlah_exchange") or 0) >= 1 else 50.0))
skg_est = 0.40 * K + 0.20 * M + 0.15 * A + 0.15 * L + 0.10 * D
skg_real = next((x.get("skg") for x in fm.get("teratas_skg", []) if x.get("simbol") == "MAGIC"), None)
if skg_real is not None:
    print(f"1) SKG MAGIC eksak: K={K} M={M:.1f} A={A:.1f} L={L:.1f} D={D} (arah {pick.get('arah')})")
    cek("SKG MAGIC", skg_est, skg_real)
else:
    print("1) MAGIC tidak di teratas_skg — lewati")

# ---- 2) skor ZECUSDT replikasi eksak (pakai chg_median_lain seperti mesin)
zec = pasar.get("ZEC") or {}
fgd = (lint.get("ringkas", {}).get("fear_greed") or {}).get("nilai")
mcz = zec.get("market_cap")
s1 = max(0.0, min(1.0, (math.log10(mcz) - 7.0) / 4.5))
dropz = max(0.0, -(zec.get("ath_pct") or 0.0))
s2 = math.tanh((min(dropz, 90.0) - 25.0) / 35.0)
dvp = zec.get("divergensi_pct")
s3 = -1.0 if zec.get("divergensi_arah") == "BINANCE-TURUN-LAIN-NAIK" else (
     1.0 if zec.get("divergensi_arah") == "BINANCE-NAIK-LAIN-TURUN" else (
     max(-0.5, min(0.5, dvp / 10.0)) if isinstance(dvp, (int, float)) and abs(dvp) >= 0.5 else 0.0))
cb4 = zec.get("chg_median_lain") or zec.get("chg24h")
s4 = max(-1.0, min(1.0, cb4 / 15.0))
s5 = (50.0 - fgd) / 50.0
skor_z = 50 + 50 * (0.25 * s1 + 0.25 * s2 + 0.20 * s3 + 0.20 * s4 + 0.10 * s5)
sm_z = {x["symbol"]: x["skor_100"] for x in sm.get("top12", [])}.get("ZECUSDT")
print(f"2) skor ZEC eksak: s1={s1:.3f} s2={s2:.3f} s3={s3:.3f} s4={s4:.3f} (median-lain {cb4:+.2f}%) s5={s5:.3f}")
cek("skor ZECUSDT", skor_z, sm_z if sm_z is not None else -999)

# ---- 3) divergensi arah OXT: verifikasi tanda dari chg_bursa MENTAH
da = lint.get("ringkas", {}).get("divergensi_arah") or []
d0 = next((x for x in da if x.get("simbol") == "OXT"), da[0] if da else None)
if d0:
    p = pasar.get(d0["simbol"]) or {}
    cb = p.get("chg_bursa") or {}
    cbin = p.get("chg_binance")
    lain = sorted(v2 for k, v2 in cb.items() if k != "Binance" and n_float(v2) is not None)
    med = lain[len(lain) // 2] if len(lain) % 2 else (lain[len(lain)//2 - 1] + lain[len(lain)//2]) / 2
    fl = d0.get("flag")
    cocok = ((cbin < 0 < med) if fl == "BINANCE-TURUN-LAIN-NAIK"
             else (cbin > 0 > med) if fl == "BINANCE-NAIK-LAIN-TURUN" else False)
    print(f"3) divergensi {d0['simbol']}: flag={fl} | mentah: Binance {cbin:+.2f}% vs median-lain {med:+.2f}% ({len(lain)} bursa) -> {'OK cocok' if cocok else 'TIDAK COCOK!'}")
    ok, gagal = (ok + 1, gagal) if cocok else (ok, gagal + 1)

# ---- 4) mesin_formula backtest
try:
    pl = json.load(open("/home/z/my-project/data/formula_peluang.json"))
    pel = pl.get("peluang") or []
    alpha, hit, nh = pl.get("alpha_pct"), pl.get("hit_pct"), pl.get("n_hari")
    print(f"4) MESIN-FORMULA: {len(pel)} peluang | backtest {nh} hari | alpha {alpha:+.2f}%/hari | hit {hit:.1f}% | dibuat {pl.get('waktu', '?')}")
    if alpha is not None and alpha > 0 and (hit or 0) >= 40:
        ok += 1
    else:
        gagal += 1
except FileNotFoundError:
    print("4) formula_peluang.json hilang")

print(f"\nAUDIT-KEDALAMAN v2: {ok} lolos, {gagal} gagal")
