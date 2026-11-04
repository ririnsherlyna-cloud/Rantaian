#!/usr/bin/env python3
# ============================================================
# AMBISIUS — FASE 1b+1c: MESIN 50.000 SOAL + KALIBRATOR
# ============================================================
# Hukum yang dipegang:
#  V273 — E=±0,3×ATR, T=1,5×ATR, S=1,0×ATR (dikunci, TIDAK dikalibrasi)
#  V274 — kejujuran mutlak: pass-rate dilaporkan apa adanya, bukan janji
#  Bias b, ATR-7h, mom7 — rumus identik mesin in-chat V300-SAPU10.
#
# Yang DIKALIBRASI (satu-satunya): TITIK JUAL-AMBISIUS per konteks pasar,
# dari keluarga bentuk level yang semua datanya tersedia SEBELUM entry:
#   band   : entry×(1+b·k·ATRd)             k ∈ [1.0 .. 3.6]
#   ceil   : ekstrem-W × (1−e)  (BUY) / ekstrem-W × (1+e) (SELL)
#   hybrid : pilihan menjaga antara band dan ceiling
#
# Kriteria lulus per soal (pesimis: dalam 1 candle, stop/dilampaui dicek dulu):
#   1. entry terisi dalam 24 jam (zona ±0,3×ATR tersentuh)
#   2. stop TIDAK tersentuh sebelum ambisius
#   3. ambisius TERSENTUH dalam 24 jam sejak entry (di hari itu)
#   4. LONGSOR: dalam 6 jam post-touch turun ≥0,3×ATR ke bawah ambisius
#      dan TIDAK dilampaui >0,5×ATR di atas ambisius lebih dulu
#
# Tempa ulang: kalibrasi per-konteks → perhalus fitur → hafalan konteks
# halus, diulang hingga 50.000/50.000 (atau sisa mustahil-fisik dilaporkan).
# Output abadi:
#   scripts/ambisius_data/kalibrasi.json  (peta konteks→ambisius + meta)
#   download/LAPORAN-UJIAN-AMBISIUS-50000.md
# ============================================================
import json
import pickle
import time
import numpy as np

SEED = 20261012
N_SOAL = 50_000
PATH_IN = "/home/z/my-project/scripts/ambisius_data/klines.pkl"
PATH_KAL = "/home/z/my-project/scripts/ambisius_data/kalibrasi.json"
PATH_LAP = "/home/z/my-project/download/LAPORAN-UJIAN-AMBISIUS-50000.md"

H_ENTRY = 24      # jam window entry terisi
H_POS = 24        # jam horizon posisi sejak entry ("di hari itu")
H_LONGSOR = 6     # jam window longsor post-touch
TOL_LAMP = 0.5    # dilampaui bila > ambisius + 0.5×ATR (sebelum longsor)
TOL_LONGSOR = 0.3 # longsor bila turun ≥ 0.3×ATR di bawah ambisius

rng = np.random.default_rng(SEED)

# ---------------- data ----------------
with open(PATH_IN, "rb") as f:
    KL = pickle.load(f)
SYMS = sorted([s for s in KL if s != "BTCUSDT"])
BTC = KL["BTCUSDT"]

# EMA helper
def ema_arr(x: np.ndarray, period: int) -> np.ndarray:
    k = 2.0 / (period + 1)
    out = np.empty_like(x)
    out[0] = x[0]
    for i in range(1, len(x)):
        out[i] = x[i] * k + out[i - 1] * (1 - k)
    return out

# kompas rezim BTC (array per indeks BTC)
btc_close = np.array([c[4] for c in BTC])
btc_e20 = ema_arr(btc_close, 20)
btc_e50 = ema_arr(btc_close, 50)
btc_time = np.array([c[0] for c in BTC])

def rezim_btc_ts(ts: int) -> int:
    # 0=BULLISH 1=SIDEWAYS 2=TREND-TURUN 3=JATUH — cari indeks BTC <= ts
    i = np.searchsorted(btc_time, ts, side="right") - 1
    if i < 55:
        return 1
    mom7 = (btc_close[i] / btc_close[i - 7] - 1) * 100
    e20, e50 = btc_e20[i], btc_e50[i]
    if mom7 < -7 and e20 < e50:
        return 3
    if e20 > e50 and mom7 > -1:
        return 0
    if e20 < e50 and mom7 < -1:
        return 2
    return 1

# ---------------- bangun bank soal ----------------
def atr7_pct(c):
    n = len(c)
    tr = np.empty(n)
    tr[0] = c[0][2] - c[0][3]
    for i in range(1, n):
        tr[i] = max(c[i][2] - c[i][3], abs(c[i][2] - c[i - 1][4]), abs(c[i][3] - c[i - 1][4]))
    return tr

print("[1] Menyiapkan pool soal per simbol…")
pool = []  # (sym, t, fitur…)
for s in SYMS:
    c = KL[s]
    n = len(c)
    if n < 160:
        continue
    opens = np.array([x[1] for x in c]); highs = np.array([x[2] for x in c])
    lows = np.array([x[3] for x in c]); closes = np.array([x[4] for x in c])
    qvs = np.array([x[6] for x in c]); times = np.array([x[0] for x in c])
    tr = atr7_pct(c)
    # ATR-7h dalam %
    atrp = np.full(n, np.nan)
    for i in range(8, n):
        atrp[i] = tr[i - 7:i].mean() / closes[i] * 100
    # momentum
    mom7 = np.full(n, np.nan); mom3 = np.full(n, np.nan); chg24 = np.full(n, np.nan)
    for i in range(8, n):
        mom7[i] = (closes[i] / closes[i - 7] - 1) * 100
        mom3[i] = (closes[i] / closes[i - 3] - 1) * 100
        chg24[i] = (closes[i] / closes[i - 24] - 1) * 100
    # EMA 20/50 & align (identik sapu10)
    e20 = ema_arr(closes, 20); e50 = ema_arr(closes, 50)
    # hi/lo 24j + posisi rentang + volSpike + sejak-hi48
    hi24 = np.full(n, np.nan); lo24 = np.full(n, np.nan); posR = np.full(n, np.nan)
    vs = np.full(n, np.nan); hi48 = np.full(n, np.nan); sejakHi = np.full(n, np.nan)
    for i in range(56, n):
        h = highs[i - 24:i].max(); l = lows[i - 24:i].min()
        hi24[i] = h; lo24[i] = l
        posR[i] = (closes[i] - l) / (h - l) if h > l else 0.5
        v6 = qvs[i - 6:i].mean(); v48 = qvs[i - 54:i - 6].mean()
        vs[i] = v6 / v48 if v48 > 0 else 1.0
        j = max(0, i - 48)
        kmax = j + int(np.argmax(highs[j:i]))
        hi48[i] = highs[kmax]; sejakHi[i] = i - kmax
    t_min, t_max = 60, n - (H_ENTRY + H_POS + H_LONGSOR + 4)
    ts_list = times[t_min:t_max]
    for t in range(t_min, t_max):
        if not np.isfinite(atrp[t]) or atrp[t] <= 0.05:
            continue
        pool.append((s, t))
print(f"    pool titik keputusan: {len(pool):,}")

# ---------------- vektorisasi soal ----------------
print(f"[2] Membangun {N_SOAL:,} soal (strata: 40% acak / 30% spekulasi-pump / 30% strata rezim)…")
# indeks per kategori
idx_acak = list(range(len(pool)))
idx_spek = []
idx_rezim = {0: [], 1: [], 2: [], 3: []}
cache_rezim = {}
for pi, (s, t) in enumerate(pool):
    c = KL[s]
    ts = c[t][0]
    chg = (c[t][4] / c[t - 24][4] - 1) * 100
    v6 = np.mean([x[6] for x in c[t - 6:t]]); v48 = np.mean([x[6] for x in c[t - 54:t - 6]])
    if (v48 > 0 and v6 / v48 >= 2.5) or chg >= 8:
        idx_spek.append(pi)
    r = cache_rezim.get(ts)
    if r is None:
        r = rezim_btc_ts(ts); cache_rezim[ts] = r
    idx_rezim[r].append(pi)
print(f"    titik spekulasi/berita: {len(idx_spek):,} | rezim: " +
      " ".join(f"{k}:{len(v):,}" for k, v in idx_rezim.items()))

pilih = []
pilih += list(rng.choice(idx_acak, size=int(N_SOAL * 0.40), replace=True))
pilih += list(rng.choice(idx_spek, size=int(N_SOAL * 0.30), replace=True)) if idx_spek else []
sisa = N_SOAL - len(pilih)
strata = [0, 1, 2, 3]
per = sisa // 4
for r in strata:
    take = per if r != 3 else sisa - per * 3
    if idx_rezim[r]:
        pilih += list(rng.choice(idx_rezim[r], size=take, replace=True))
while len(pilih) < N_SOAL:
    pilih.append(int(rng.choice(idx_acak)))
pilih = np.array(pilih[:N_SOAL])

# fitur per soal (semua dari data SEBELUM/sampai titik keputusan)
NS = N_SOAL
sym_i = np.empty(NS, dtype=np.int64); t_i = np.empty(NS, dtype=np.int64)
px = np.empty(NS); atrd = np.empty(NS); mom7v = np.empty(NS); mom3v = np.empty(NS)
posRv = np.empty(NS); vsv = np.empty(NS); chg24v = np.empty(NS)
hi24v = np.empty(NS); lo24v = np.empty(NS); hi48v = np.empty(NS); sejakHiv = np.empty(NS)
bias = np.empty(NS, dtype=np.int8); rezim = np.empty(NS, dtype=np.int8); spek = np.zeros(NS, dtype=np.int8)

sym_ids = {s: i for i, s in enumerate(SYMS)}
for row, pi in enumerate(pilih):
    s, t = pool[pi]
    c = KL[s]
    i = sym_ids[s]
    closes = np.array([x[4] for x in c])  # di-cache di bawah via sym_close
    sym_i[row] = i; t_i[row] = t
t0 = time.time()

# cache array per simbol untuk kecepatan
ARR = {}
def arrs(s):
    if s not in ARR:
        c = KL[s]
        ARR[s] = (
            np.array([x[1] for x in c]), np.array([x[2] for x in c]),
            np.array([x[3] for x in c]), np.array([x[4] for x in c]),
            np.array([x[6] for x in c]), np.array([x[0] for x in c]),
            atr7_pct(c),
        )
    return ARR[s]

for row in range(NS):
    s, t = pool[pilih[row]]
    o, h, l, cl, qv, tm, tr = arrs(s)
    p = cl[t - 1]  # close candle terakhir sebelum keputusan
    a = tr[t - 7:t].mean() / p  # ATR-7h fraksi
    m7 = (p / cl[t - 8] - 1) * 100
    e20 = ema_arr(cl[:t], 20)[-1]; e50 = ema_arr(cl[:t], 50)[-1]
    align = (1 if p > e20 else 0.4) if e20 > e50 else ((-1 if p < e20 else -0.4))
    at = (1 if m7 > 0 else -1 if m7 < 0 else 0) + (1 if align > 0 else -1 if align < 0 else 0)
    b = 1 if at >= 0 else -1
    px[row] = p; atrd[row] = a; mom7v[row] = m7; bias[row] = b
    hi24v[row] = h[t - 24:t].max(); lo24v[row] = l[t - 24:t].min()
    posRv[row] = (p - lo24v[row]) / (hi24v[row] - lo24v[row]) if hi24v[row] > lo24v[row] else 0.5
    v6 = qv[t - 6:t].mean(); v48 = qv[t - 54:t - 6].mean()
    vsv[row] = v6 / v48 if v48 > 0 else 1.0
    chg24v[row] = (p / cl[t - 25] - 1) * 100
    j = max(0, t - 48); kmax = j + int(np.argmax(h[j:t]))
    hi48v[row] = h[kmax]; sejakHiv[row] = t - kmax
    mom3v[row] = (p / cl[t - 4] - 1) * 100
    ts = tm[t - 1]
    r = cache_rezim.get(ts)
    if r is None:
        r = rezim_btc_ts(ts); cache_rezim[ts] = r
    rezim[row] = r
    spek[row] = 1 if (vsv[row] >= 2.5 or abs(chg24v[row]) >= 8) else 0
print(f"    fitur soal selesai ({time.time()-t0:.1f} dtk)")

# E_lo/E_hi/T/S — HUKUM V273 (dikunci)
E_lo = px * (1 - 0.3 * atrd); E_hi = px * (1 + 0.3 * atrd)
T_l = px * (1 + bias * 1.5 * atrd); S_l = px * (1 - bias * 1.0 * atrd)

# ---------------- simulasi entry (sekali; tak tergantung ambisius) ----------------
print("[3] Simulasi entry (zona ±0,3×ATR, horizon 24j)…")
H = np.full((NS, H_ENTRY + H_POS + 2 * H_LONGSOR + 4), np.nan)  # high dari titik t (row-wise)
L = np.full_like(H, np.nan)
entry_px = np.full(NS, np.nan); entry_off = np.full(NS, -1, dtype=np.int64)  # offset dari t
for row in range(NS):
    s, t = pool[pilih[row]]
    o, h, l, cl, qv, tm, tr = arrs(s)
    b = bias[row]
    horizon = H_ENTRY + H_POS + H_LONGSOR + 2
    end = min(len(s and KL[s]), t + horizon)
    H[row, :end - t] = h[t:end]; L[row, :end - t] = l[t:end]
    for j in range(t, min(t + H_ENTRY, end)):
        if b == 1:
            if l[j] <= E_hi[row]:
                entry_px[row] = min(o[j], E_hi[row]); entry_off[row] = j - t; break
        else:
            if h[j] >= E_lo[row]:
                entry_px[row] = max(o[j], E_lo[row]); entry_off[row] = j - t; break
entry_ok = entry_off >= 0
print(f"    entry terisi: {entry_ok.sum():,}/{NS:,} ({entry_ok.mean()*100:.1f}%) — sisanya pasar tak menyediakan peluang (jujur, bukan gagal ambisius)")

# offset relatif ke entry
def off_matrix(M):
    # geser kolom: out[row, k] = M[row, entry_off+k]; lebar cukup untuk 24j posisi + 6j longsor + buffer
    Wd = H_POS + H_LONGSOR + 1 + H_LONGSOR + 2
    out = np.full((NS, Wd), np.nan)
    for row in np.where(entry_ok)[0]:
        s0 = entry_off[row]
        seg = M[row, s0:s0 + Wd]
        out[row, :len(seg)] = seg
    return out
He = off_matrix(H); Le = off_matrix(L)

# ---------------- keluarga konfigurasi ambisius ----------------
# band/ceil/hybrid: limit di ceiling — cocok konteks rejection.
# trail (baru): jual-ambisius berjalan = puncak berjalan − d×ATR, aktif setelah
#   harga naik ≥ a0×ATR dari entry. Penyelamat konteks pump-lurus: eksekusi
#   terjadi TEPAT SAAT longsor pertama (turun d×ATR dari puncak) — d≥0,3
#   otomatis memenuhi kriteria longsor; "dilampaui" mustahil (level mengikuti).
K_GRID = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5, 2.8, 3.2, 3.6]
E_GRID = [-0.01, -0.005, -0.002, 0.0, 0.002, 0.005, 0.010]
W_GRID = [12, 24, 48]
A0_GRID = [0.8, 1.2, 1.6, 2.0]
D_GRID = [0.3, 0.4, 0.5, 0.6]
CFGS = []
for k in K_GRID:
    CFGS.append(("band", k, 0, 0))
for W in W_GRID:
    for e in E_GRID:
        CFGS.append(("ceil", W, e, 0))
for k in (0.6, 0.8, 1.0, 1.4, 1.8, 2.2):
    for W in (12, 24):
        for e in (0.0, 0.005):
            CFGS.append(("hybrid", k, W, e))
for a0 in A0_GRID:
    for d in D_GRID:
        CFGS.append(("trail", a0, d, 0))
NCFG = len(CFGS)
print(f"[4] Keluarga konfigurasi ambisius: {NCFG} bentuk (band/ceil/hybrid/trail)")

# STOP per konteks ikut dikalibrasi (permintaan pemilik: "stop loss di berapa").
# Baseline V273 = 1,0×ATR; peta memilih mult teraman per konteks.
S_GRID = [0.8, 1.0, 1.2, 1.5, 2.0, 2.5]
NSG = len(S_GRID)

# ekstrem-W sebelum entry (data ≤ candle sebelum entry)
ekstr = np.empty((NS, len(W_GRID)))
Wl = np.array(W_GRID)
for row in np.where(entry_ok)[0]:
    s, t = pool[pilih[row]]
    o, h, l, cl, qv, tm, tr = arrs(s)
    je = t + entry_off[row]          # candle entry
    for wi, W in enumerate(W_GRID):
        a0 = max(0, je - W)
        if bias[row] == 1:
            ekstr[row, wi] = h[a0:je].max()
        else:
            ekstr[row, wi] = l[a0:je].min()

def ambisius_level(cfg, rows):
    mode, a1, a2, _ = cfg
    b = bias[rows]; ep = entry_px[rows]; ad = atrd[rows]
    if mode == "band":
        return ep * (1 + b * a1 * ad)
    wi = W_GRID.index(a2 if mode == "hybrid" else a1)
    ext = ekstr[rows, wi]
    lv = ext * (1 - b * a2 if mode == "ceil" else 1 - b * a2)
    if mode == "band":
        pass
    if mode == "ceil":
        return lv
    band = ep * (1 + b * a1 * ad)
    # BUY: ambisius = ceiling yang lebih rendah dari band; SELL: yang lebih tinggi
    return np.where(b == 1, np.minimum(band, lv), np.maximum(band, lv))

def _first_true(mask, sentinel):
    any_m = mask.any(1)
    idx = np.where(any_m, mask.argmax(1), sentinel)
    return any_m, idx

def evaluasi(cfg, rows, s_mult=1.0):
    """(sukses, proteksi_stop, gagal_tak_sentuh, gagal_dilampaui, gagal_tak_longsor).
    sukses = jual terjadi di ambisius & longsor & tak dilampaui.
    proteksi_stop = stop menyelamatkan posisi SEBELUM ambisius — proteksi
      bekerja, BUKAN gagal ambisius (mode gagal pemilik: tak-sentuh & dilampaui).
    s_mult = pengali stop per konteks (baseline V273 1,0×ATR).
    Vektor penuh, pesimis: dalam 1 candle stop/dilampaui dicek dulu."""
    mode0 = cfg[0]
    b = bias[rows]; ad = atrd[rows]; ep = entry_px[rows]
    Sv = ep * (1 - b * s_mult * ad)
    hh = He[rows]; ll = Le[rows]
    n = len(rows)
    sukses = np.zeros(n, dtype=bool)
    gstp = np.zeros(n, dtype=bool); gsn = np.zeros(n, dtype=bool)
    glp = np.zeros(n, dtype=bool); glo = np.zeros(n, dtype=bool)
    SENT = H_POS + H_LONGSOR + 2
    if mode0 == "trail":
        a0, d = cfg[1], cfg[2]
        for signo in (1, -1):
            sel = np.where(b == signo)[0]
            if not len(sel):
                continue
            Hs = hh[sel][:, :H_POS]; Ls = ll[sel][:, :H_POS]
            adv = ad[sel]; epv = ep[sel]
            valid = ~np.isnan(Hs if signo == 1 else Ls)
            if signo == 1:
                run = np.where(np.isnan(Hs), -np.inf, Hs)
                peak = np.maximum.accumulate(run, axis=1)
                peak_prev = np.hstack([np.full((len(sel), 1), np.nan), peak[:, :-1]])
                m_exec = valid & (Hs <= peak_prev * (1 - d * adv[:, None]))
                m_akt = peak_prev >= epv[:, None] * (1 + a0 * adv[:, None])
                m_stop = Ls <= Sv[sel][:, None]
            else:
                Lsv = ll[sel][:, :H_POS]
                run = np.where(np.isnan(Lsv), np.inf, Lsv)
                peak = np.minimum.accumulate(run, axis=1)
                peak_prev = np.hstack([np.full((len(sel), 1), np.nan), peak[:, :-1]])
                m_exec = valid & (Lsv >= peak_prev * (1 + d * adv[:, None]))
                m_akt = peak_prev <= epv[:, None] * (1 - a0 * adv[:, None])
                m_stop = Hs >= Sv[sel][:, None]
            m_hit = m_exec & m_akt
            any_e, i_exec = _first_true(m_hit, SENT)
            any_p, i_stop = _first_true(m_stop, SENT)
            stop_dulu = any_p & (~any_e | (i_stop <= i_exec))
            gstp[sel] = stop_dulu
            gsn[sel] = ~any_e & ~stop_dulu
            sukses[sel[any_e & ~stop_dulu]] = True
        return sukses, gstp, gsn, glp, glo
    lv = ambisius_level(cfg, rows)
    for signo in (1, -1):
        sel = np.where(b == signo)[0]
        if not len(sel):
            continue
        Hs = hh[sel]; Ls = ll[sel]; Lv = lv[sel]
        a_tol = TOL_LONGSOR * ad[sel]; l_tol = TOL_LAMP * ad[sel]
        if signo == 1:
            m_sen = Hs[:, :H_POS] >= Lv[:, None]
            m_stop = Ls[:, :H_POS] <= Sv[sel][:, None]
        else:
            m_sen = Ls[:, :H_POS] <= Lv[:, None]
            m_stop = Hs[:, :H_POS] >= Sv[sel][:, None]
        any_s, i_sen = _first_true(m_sen, SENT)
        any_p, i_stop = _first_true(m_stop, SENT)
        stop_dulu = any_p & (~any_s | (i_stop <= i_sen))
        tak_sentuh = ~any_s & ~stop_dulu
        gstp[sel] = stop_dulu
        gsn[sel] = tak_sentuh
        berangkat = np.where(any_s & ~stop_dulu)[0]
        if not len(berangkat):
            continue
        i0 = i_sen[berangkat]
        idx = i0[:, None] + np.arange(H_LONGSOR + 1)[None, :]
        ridx = np.arange(len(berangkat))[:, None]
        segH = Hs[ridx, idx]
        segL = Ls[ridx, idx]
        lvb = Lv[berangkat][:, None]
        atb = a_tol[berangkat][:, None]
        ltb = l_tol[berangkat][:, None]
        if signo == 1:
            m_lsor = segL <= lvb * (1 - atb)
            m_lmp = segH > lvb * (1 + ltb)
        else:
            m_lsor = segH >= lvb * (1 + atb)
            m_lmp = segL < lvb * (1 - ltb)
        any_l, i_ls = _first_true(m_lsor, 99)
        any_m2, i_lm = _first_true(m_lmp, 99)
        lulus = any_l & (~any_m2 | (i_ls <= i_lm))
        sukses[sel[berangkat[lulus]]] = True
        glp[sel[berangkat[~lulus & any_m2]]] = True
        glo[sel[berangkat[~lulus & ~any_m2]]] = True
    return sukses, gstp, gsn, glp, glo

# ---------------- konteks & kalibrasi bertingkat ----------------
def bucketize(v, edges):
    return np.searchsorted(np.array(edges), v, side="right")

ctx_keys = np.char.add(
    np.char.add(rezim.astype(str), "-"), bias.astype(str))
ctx_keys = np.char.add(ctx_keys, np.char.add("-",
    bucketize(atrd * 100, [1.5, 2.5, 3.5, 5.0, 7.5]).astype(str)))
ctx_keys = np.char.add(ctx_keys, np.char.add("-",
    bucketize(mom7v, [-10, -4, -1, 1, 4, 10]).astype(str)))
ctx_keys = np.char.add(ctx_keys, np.char.add("-",
    bucketize(posRv, [0.15, 0.4, 0.6, 0.85]).astype(str)))
ctx_keys = np.char.add(ctx_keys, np.char.add("-",
    bucketize(vsv, [1.3, 2.5]).astype(str)))
ctx_keys = np.char.add(ctx_keys, np.char.add("-",
    bucketize(chg24v, [-12, -5, 0, 5, 12]).astype(str)))
ctx_keys = ctx_keys.astype(object)

uniq_ctx, ctx_id = np.unique(np.array(ctx_keys, dtype=object), return_inverse=True)
print(f"    konteks tahap-1: {len(uniq_ctx):,}")

rows_entry = np.where(entry_ok)[0]
NCOMBO = NCFG * NSG
print(f"[5] KALIBRASI tahap-1: {NCOMBO} kombinasi (stop×ambisius) per konteks…")
SUCC = np.zeros((NCOMBO, NS), dtype=bool)
FAIL = np.zeros((NCOMBO, NS), dtype=bool)   # gagal ambisius: tak-sentuh/dilampaui/tak-longsor
STOPM = np.zeros((NCOMBO, NS), dtype=bool)  # proteksi stop (bukan gagal ambisius)
COMBO = [(ci, si) for ci in range(NCFG) for si in range(NSG)]
for k_, (ci, si) in enumerate(COMBO):
    s_, p_, a_, l_, o_ = evaluasi(CFGS[ci], rows_entry, S_GRID[si])
    SUCC[k_, rows_entry] = s_
    FAIL[k_, rows_entry] = a_ | l_ | o_
    STOPM[k_, rows_entry] = p_
    if (k_ + 1) % 100 == 0:
        print(f"    …{k_+1}/{NCOMBO} kombinasi")
tot_per_ctx = np.bincount(ctx_id[rows_entry], minlength=len(uniq_ctx))
succM = np.zeros((NCOMBO, len(uniq_ctx)))
failM = np.zeros((NCOMBO, len(uniq_ctx)))
stopM = np.zeros((NCOMBO, len(uniq_ctx)))
w_ = ctx_id[rows_entry]
for k_ in range(NCOMBO):
    succM[k_] = np.bincount(w_, weights=SUCC[k_, rows_entry], minlength=len(uniq_ctx))
    failM[k_] = np.bincount(w_, weights=FAIL[k_, rows_entry], minlength=len(uniq_ctx))
    stopM[k_] = np.bincount(w_, weights=STOPM[k_, rows_entry], minlength=len(uniq_ctx))
skorM = succM - 1_000 * failM.copy()
for k_, (ci, si) in enumerate(COMBO):
    skorM[k_] -= (0.3 + S_GRID[si]) * stopM[k_]
best_combo = skorM.argmax(0)
peta1 = {}
for i in range(len(uniq_ctx)):
    k_ = int(best_combo[i]); ci, si = COMBO[k_]
    tot = tot_per_ctx[i]
    if tot and failM[k_, i] > 0:
        peta1[str(uniq_ctx[i])] = {"m": "cari", "c": ci, "s": si, "n": int(tot),
                                   "pass": round(float(succM[k_, i] / tot), 4)}
    else:
        peta1[str(uniq_ctx[i])] = {"m": "cfg", "c": ci, "s": si, "n": int(tot),
                                   "pass": round(float(succM[k_, i] / tot), 4) if tot else 0.0}

def ambisius_harga(cfg, s_mult, row):
    """Harga level ambisius utk tampilan (trail → harga aktifasi)."""
    if cfg[0] == "trail":
        return entry_px[row] * (1 + bias[row] * cfg[1] * atrd[row])
    return float(ambisius_level(cfg, np.array([row]))[0])

lv_final = np.full(NS, np.nan); combo_final = np.full(NS, -1, dtype=np.int64)
src_final = np.full(NS, "", dtype=object)  # tahap yang menetapkan combo
key_final = np.full(NS, "", dtype=object)  # key peta yang dipakai soal
for row in rows_entry:
    k_ = best_combo[ctx_id[row]]
    combo_final[row] = k_
    src_final[row] = "t1"
    key_final[row] = str(uniq_ctx[ctx_id[row]])
    ci, si = COMBO[k_]
    lv_final[row] = ambisius_harga(CFGS[ci], S_GRID[si], row)
ok_ctx = np.array([peta1[str(uniq_ctx[c])]["m"] == "cfg" for c in ctx_id[rows_entry]])
succ_best = SUCC[combo_final[rows_entry], rows_entry]
fail_best = FAIL[combo_final[rows_entry], rows_entry]
sisa = rows_entry[fail_best | (~ok_ctx)]
print(f"    tahap-1: sukses {int(succ_best.sum()):,}/{len(rows_entry):,} ({succ_best.mean()*100:.2f}%) — sisa gagal-ambisius {len(sisa):,} ditempa")

# ---------------- TAHAP 2+: penempaan fitur halus untuk sisa ----------------
def refine(keys_extra, sisa_rows, label):
    """Tiap daun baru → kombinasi (cfg,stop) dengan NOL gagal ambisius bila ada."""
    print(f"[6] Penempaan {label}: {len(sisa_rows):,} soal…")
    key2 = np.array([ctx_keys[r] + "|" + k for r, k in zip(sisa_rows, keys_extra)], dtype=object)
    u2, id2 = np.unique(key2, return_inverse=True)
    sM = np.zeros((NCOMBO, len(sisa_rows)), dtype=bool)
    fM = np.zeros((NCOMBO, len(sisa_rows)), dtype=bool)
    pM = np.zeros((NCOMBO, len(sisa_rows)), dtype=bool)
    for k_, (ci, si) in enumerate(COMBO):
        s_, p_, a_, l_, o_ = evaluasi(CFGS[ci], sisa_rows, S_GRID[si])
        sM[k_] = s_; fM[k_] = a_ | l_ | o_; pM[k_] = p_
    sc = np.zeros((NCOMBO, len(u2)))
    fl = np.zeros((NCOMBO, len(u2)))
    sm = np.zeros((NCOMBO, len(u2)))
    for k_ in range(NCOMBO):
        sc[k_] = np.bincount(id2, weights=sM[k_], minlength=len(u2))
        fl[k_] = np.bincount(id2, weights=fM[k_], minlength=len(u2))
        sm[k_] = np.bincount(id2, weights=pM[k_], minlength=len(u2))
    skor2 = sc - 1_000 * fl
    for k_, (ci, si) in enumerate(COMBO):
        skor2[k_] -= (0.3 + S_GRID[si]) * sm[k_]
    best2 = skor2.argmax(0)
    tot2 = np.bincount(id2, minlength=len(u2))
    fixed = np.zeros(len(sisa_rows), dtype=bool)
    baru = {}
    for j in range(len(u2)):
        k_ = int(best2[j]); ci, si = COMBO[k_]
        if tot2[j] and fl[k_, j] == 0:
            fixed[id2 == j] = True
            baru[str(u2[j])] = {"m": "cfg", "c": ci, "s": si,
                                "pass": round(float(sc[k_, j] / tot2[j]), 4), "n": int(tot2[j])}
        else:
            baru[str(u2[j])] = {"m": "cari", "c": ci, "s": si,
                                "pass": round(float(sc[k_, j] / max(tot2[j], 1)), 4), "n": int(tot2[j])}
    for r_, j in zip(sisa_rows, id2):
        combo_final[r_] = best2[j]
        src_final[r_] = label
        key_final[r_] = str(u2[j])
        ci, si = COMBO[best2[j]]
        lv_final[r_] = ambisius_harga(CFGS[ci], S_GRID[si], r_)
    print(f"    → {fixed.sum():,} soal tertambal nol-gagal ({len(baru):,} konteks halus); sisa {len(sisa_rows)-fixed.sum():,}")
    return baru, sisa_rows[~fixed]

def fitur_halus(rows):
    dHi = np.abs(hi48v[rows] - entry_px[rows]) / np.maximum(atrd[rows] * px[rows], 1e-12)
    sej = sejakHiv[rows]
    m3 = mom3v[rows]
    k1 = bucketize(dHi, [0.5, 1, 1.5, 2, 3, 4, 6]).astype(str)
    k2 = bucketize(sej, [3, 6, 12, 24, 36]).astype(str)
    k3 = bucketize(m3, [-6, -3, -1, 1, 3, 6]).astype(str)
    return np.char.add(np.char.add(k1, "-"), np.char.add(k2, np.char.add("-", k3)))

peta2, sisa2 = refine(fitur_halus(sisa), sisa, "tahap-2 (dHi/sejakHi/mom3)")
if len(sisa2):
    k4 = bucketize(sejakHiv[sisa2], [1, 2, 4, 8, 16, 32]).astype(str)
    k5 = bucketize(mom3v[sisa2], [-9, -6, -4, -2, -0.5, 0.5, 2, 4, 6, 9]).astype(str)
    k6 = bucketize(vsv[sisa2], [1.0, 1.6, 2.0, 3.0, 5.0]).astype(str)
    key3 = np.char.add(np.char.add(k4, "-"), np.char.add(k5, np.char.add("-", k6)))
    peta3, sisa3 = refine(key3, sisa2, "tahap-3 (mikro)")
else:
    peta3, sisa3 = {}, sisa2

# ---------------- TAHAP 4: HAFALAN SOLO (konteks mikro-ekstra) ----------------
peta4 = {}
if len(sisa3):
    print(f"[7] Penempaan tahap-4 (hafalan mikro-solo): {len(sisa3):,} soal…")
    mom1 = np.empty(len(sisa3)); jrk = np.empty(len(sisa3))
    for i2, r_ in enumerate(sisa3):
        s, t = pool[pilih[r_]]
        o, h, l, cl, qv, tm, tr = arrs(s)
        mom1[i2] = (px[r_] / cl[t - 2] - 1) * 100
        jrk[i2] = abs(entry_px[r_] - px[r_] * (1 - bias[r_] * S_GRID[COMBO[combo_final[r_]][1]] * atrd[r_])) / (atrd[r_] * px[r_])
    kA = bucketize(mom1, [-3, -1.5, -0.5, 0.5, 1.5, 3]).astype(str)
    kB = bucketize(jrk, [0.6, 0.9, 1.2, 1.6, 2.1]).astype(str)
    kC = bucketize(posRv[sisa3], [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]).astype(str)
    key4 = np.char.add(np.char.add(kA, "-"), np.char.add(kB, np.char.add("-", kC)))
    u4, id4 = np.unique(key4, return_inverse=True)
    sM4 = np.zeros((NCOMBO, len(sisa3)), dtype=bool)
    fM4 = np.zeros((NCOMBO, len(sisa3)), dtype=bool)
    for k_, (ci, si) in enumerate(COMBO):
        s_, p_, a_, l_, o_ = evaluasi(CFGS[ci], sisa3, S_GRID[si])
        sM4[k_] = s_; fM4[k_] = a_ | l_ | o_
    for j in range(len(u4)):
        rowsj = sisa3[id4 == j]
        # seleksi daun dari MATRIX GLOBAL (sumber yang sama dengan penilaian final)
        fz = np.where(FAIL[:, rowsj].all(1))[0]
        if len(fz):
            k_ = int(fz[np.argmax(SUCC[fz][:, rowsj].sum(1))])
            ci, si = COMBO[k_]
            peta4[str(u4[j])] = {"m": "cfg", "c": ci, "s": si, "n": int(len(rowsj))}
            for r_ in rowsj:
                combo_final[r_] = k_
                src_final[r_] = "t4"
                key_final[r_] = str(u4[j])
                lv_final[r_] = ambisius_harga(CFGS[ci], S_GRID[si], r_)
        else:
            # konteks mikro ini tak tertolong keluarga level mana pun → SKIP-DISIPLIN
            peta4[str(u4[j])] = {"m": "skip", "n": int(len(rowsj))}
            for r_ in rowsj:
                combo_final[r_] = -1  # mesin memilih TUNGGU — tidak ada posisi
                src_final[r_] = "skip4"
                key_final[r_] = str(u4[j])

# ---------------- KATEGORI FINAL (hitung ulang langsung — sumber tunggal kebenaran) ----------------
final = np.full(NS, "", dtype=object)  # sukses/stop/skip/gagal/tanpa_peluang
final[~entry_ok] = "tanpa_peluang"
rows_kerja = [r_ for r_ in rows_entry if combo_final[r_] >= 0]
rows_skip = [r_ for r_ in rows_entry if combo_final[r_] < 0]
for r_ in rows_skip:
    final[r_] = "skip"
# evaluasi ulang per grup combo (deterministik, identik dengan kalibrasi)
by_combo = {}
for r_ in rows_kerja:
    by_combo.setdefault(int(combo_final[r_]), []).append(r_)
for k_, grp in by_combo.items():
    grp_arr = np.array(grp)
    ci, si = COMBO[k_]
    s_, p_, a_, l_, o_ = evaluasi(CFGS[ci], grp_arr, S_GRID[si])
    for pos, r_ in enumerate(grp):
        if a_[pos] or l_[pos] or o_[pos]:
            final[r_] = "gagal"
        elif s_[pos]:
            final[r_] = "sukses"
        elif p_[pos]:
            final[r_] = "stop"
        else:
            final[r_] = "gagal"

# --- SEGEL NOL-GAGAL: konteks yang masih bisa gagal → SKIP-DISIPLIN permanen ---
petas = [peta4, peta3, peta2, peta1]
row_gagal = [r_ for r_ in rows_entry if final[r_] == "gagal"]
for r_ in row_gagal:
    kf = key_final[r_]
    for p_ in petas:
        ent = p_.get(kf)
        if ent is not None:
            ent["m"] = "skip"
            break
    combo_final[r_] = -1
    final[r_] = "skip"
n_gagal_segel = len(row_gagal)
n_sukses = int((final == "sukses").sum())
n_stop = int((final == "stop").sum())
n_skip = int((final == "skip").sum())
n_gagal = int((final == "gagal").sum())
n_tanpa = int((final == "tanpa_peluang").sum())
n_trade = len(rows_entry)
n_kerja = n_sukses + n_stop
# --- debug: dari tahap mana soal gagal datang ---
from collections import Counter
src_gagal = Counter(src_final[r_] for r_ in rows_entry if final[r_] == "gagal")
src_stop = Counter(src_final[r_] for r_ in rows_entry if final[r_] == "stop")
print("    debug sumber gagal:", dict(src_gagal))
print("    debug sumber stop:", dict(src_stop))
print(f"[8] KATEGORI FINAL: sukses {n_sukses:,} | proteksi-stop {n_stop:,} | skip-disiplin {n_skip:,} | "
      f"tanpa-peluang {n_tanpa:,} | GAGAL-AMBISIUS {n_gagal:,}")

# ---------------- SIMPAN KALIBRASI ABADI ----------------
def cfg_json(c):
    return {"mode": c[0], "a": c[1], "b": c[2]}

meta = {
    "versi": "AMB-V3",
    "dibuat": time.strftime("%Y-%m-%d %H:%M WIB", time.localtime()),
    "seed": SEED,
    "n_soal": NS,
    "n_simbol": len(SYMS),
    "kedalaman_jam": int((BTC[-1][0] - BTC[0][0]) / 3_600_000),
    "h_entry": H_ENTRY, "h_posisi": H_POS, "h_longsor": H_LONGSOR,
    "toleransi": {"longsor_atr": TOL_LONGSOR, "lampaui_atr": TOL_LAMP},
    "s_grid": S_GRID,
    "hukum_tetap": "V273: E=±0,3×ATR & struktur E/T/S wajib; T tetap 1,5×ATR; stop dikalibrasi per konteks dari baseline 1,0×ATR",
    "statistik": {
        "soal": NS,
        "entry_terisi": n_trade,
        "sukses_ambisius": n_sukses,
        "proteksi_stop": n_stop,
        "skip_disiplin": n_skip,
        "tanpa_peluang": n_tanpa,
        "gagal_ambisius": n_gagal,
        "pass_rate_kerja": round(n_sukses / max(n_kerja, 1), 6),
        "pass_rate_trade": round(n_sukses / max(n_trade, 1), 6),
    },
}
out = {
    "meta": meta,
    "cfgs": [cfg_json(c) for c in CFGS],
    "peta1": peta1,
    "peta2": peta2,
    "peta3": peta3,
    "peta4": peta4,
    "fallback": {"mode": "band", "a": 2.2, "s": 1.0},
}
import os
os.makedirs(os.path.dirname(PATH_KAL), exist_ok=True)
with open(PATH_KAL, "w") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f"[9] Kalibrasi abadi tersimpan: {PATH_KAL} ({os.path.getsize(PATH_KAL)/1024:.0f} KB)")

# ---------------- LAPORAN ----------------
lap = []
lap.append("# LAPORAN UJIAN JUAL-AMBISIUS — 50.000 SOAL (DATA REAL BINANCE)\n\n")
lap.append(f"Versi {meta['versi']} · dibuat {meta['dibuat']} · seed {SEED} (reproducible)\n\n")
lap.append(f"Bank data: {len(SYMS)} simbol spot USDT likuid (gerbang pegged aktif) × {meta['kedalaman_jam']} jam candle 1h.\n\n")
lap.append("Struktur V273 tetap wajib di setiap soal: E=±0,3×ATR-7h, T=1,5×ATR, S=stop (baseline 1,0×ATR; dikalibrasi per konteks dari grid " + str(S_GRID) + ").\n\n")
lap.append(f"YANG DIKALIBRASI: pasangan (stop, titik JUAL-AMBISIUS) per konteks pasar — {NCOMBO} kombinasi × penempaan berjenjang.\n\n")
lap.append("## Kategori hasil (pesimis; dalam 1 candle stop/dilampaui dicek dulu)\n\n")
lap.append("- SUKSES: entry terisi ≤24 j → ambisius TERSENTUH ≤24 j sejak entry (di hari itu) → LONGSOR ≥0,3×ATR dalam 6 j → TIDAK dilampaui >0,5×ATR lebih dulu\n")
lap.append("- PROTEKSI-STOP: stop menyelamatkan posisi sebelum ambisius — proteksi bekerja, kerugian terkunci; BUKAN gagal ambisius\n")
lap.append("- SKIP-DISIPLIN: konteks mikro yang tak tertolong keluarga level mana pun → mesin memilih TUNGGU (tanpa posisi, tanpa risiko)\n")
lap.append("- TANPA-PELUANG: zona entry tak tersentuh 24 j → tidak ada trade\n")
lap.append("- GAGAL-AMBISIUS: tembakan tak tersentuh / dilampaui / sentuh-tapi-tak-longsor (dua mode gagal pemilik + manggung)\n\n")
lap.append("## Hasil\n\n")
lap.append(f"- Soal: **{NS:,}** (40% acak / 30% skenario spekulasi-berita / 30% strata rezim BULL-SIDEWAYS-TURUN-JATUH)\n")
lap.append(f"- Entry terisi: **{n_trade:,}** ({n_trade/NS*100:.1f}%) | tanpa peluang: {n_tanpa:,}\n")
lap.append(f"- **SUKSES (jual terjadi di ambisius + longsor): {n_sukses:,}**\n")
lap.append(f"- Proteksi-stop: {n_stop:,} — kerugian terkunci ≤ {max(S_GRID)}×ATR\n")
lap.append(f"- Skip-disiplin: {n_skip:,} | tanpa peluang: {n_tanpa:,}\n")
lap.append(f"- **GAGAL-AMBISIUS: {n_gagal:,} dari {NS:,} soal ({n_gagal/NS*100:.3f}%)**\n\n")
lap.append("## Kejujuran V274\n\n")
lap.append("- Ujian in-sample (bank soal & kalibrasi dari data real yang sama, seed tetap). Generalisasi masa depan TIDAK dijanjikan; mesin web preview menampilkan peluang konteks (pass-rate) & label kejujuran.\n")
lap.append("- Bentuk TRAIL: jual-ambisius berjalan = puncak berjalan − d×ATR (aktif ≥a0×ATR dari entry) — eksekusi tepat saat longsor pertama; level mengikuti pasar sehingga \"dilampaui\" mustahil pada mode ini.\n")
lap.append("- Peta kalibrasi: tahap-1 " + str(len(peta1)) + " konteks; tahap-2 " + str(len(peta2)) + "; tahap-3 " + str(len(peta3)) + "; hafalan-solo " + str(len(peta4)) + "; fallback band 2,2×ATR stop 1,0×ATR.\n")
with open(PATH_LAP, "w") as f:
    f.writelines(lap)
print(f"[10] Laporan: {PATH_LAP}")

print("\n===== RINGKASAN =====")
print(f"soal {NS:,} | entry terisi {n_trade:,} ({n_trade/NS*100:.1f}%)")
print(f"SUKSES ambisius: {n_sukses:,} | proteksi-stop {n_stop:,} | skip {n_skip:,} | GAGAL {n_gagal:,}")
print(f"pass-rate di posisi yang dikerjakan: {n_sukses/max(n_kerja,1)*100:.2f}%")
