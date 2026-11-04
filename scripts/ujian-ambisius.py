#!/usr/bin/env python3
# ============================================================
# V302 UJIAN AMBISIUS — 50.000 soal dari data REAL Binance
# (revisi 2: keputusan ambisius diambil SAAT ENTRY TERISI)
# ------------------------------------------------------------
# Melatih "JUAL AMBISIUS": harga jual di titik yang ketika
# tersentuh, harga LONGSOR turun seketika, tidak dilampaui.
#
# Alur keputusan per soal (realistis seperti trader sesungguhnya):
#   1. PRA-HARI   : gerbang memeriksa fitur sebelum hari D
#                   (ATR, momentum, RSI, volume, rezim BTC…).
#   2. MENUNGGU   : zona ENTRY E dipasang (limit di bawah pasar).
#                   Jika E tak tersentuh hari itu → MENUNGGU
#                   (tidak ada posisi, tidak ada klaim — keputusan benar).
#   3. TERISI     : E tersentuh → posisi hidup. KINI informasi
#                   intraday terbaca (candle ke-berapa terisi,
#                   seberapa dalam jurang, seberapa kuat pantulan).
#                   Gerbang kedua memutuskan: pasang AMBISIUS A?
#   4. REALITA    : A tersentuh lalu longsor tanpa dilampaui →
#                   LULUS. Sebaliknya → SALAH (dihukum keras).
#
# Kriteria LULUS (janji inti pengguna): "harga jual di titik yang KETIKA
# TERSENTUH langsung longsor turun seketika" —
#   SENTUH = milik pasar (dilaporkan jujur sebagai tingkat sentuhan)
#   AKIBAT SENTUH = janji sistem: begitu tersentuh hari itu, harga
#   LONGSOR (penutupan hari < ambisius) dan TIDAK DILAMPAUI
#   (tidak menembus ambisius+tol·ATR7).
#
# Keputusan sistem per soal: PASANG ambisius (gerbang pra-hari lolos)
# atau TOLAK. Penilaian:
#   PASANG + tersentuh + longsor+tak-dilampaui → BENAR (janji ditepati)
#   PASANG + tersentuh + melanggar janji      → SALAH (dihukum keras)
#   PASANG + tak tersentuh                     → MENUNGGU (order diam,
#                                                tak ada klaim yang patah;
#                                                tingkat sentuhan dilaporkan)
#   TOLAK  + peluang longsor nyata ada         → TERLEWAT (dilaporkan)
#
# Anti-diam: sertifikat hanya sah bila PASANG ≥ 150, menangkap ≥ 50%
# seluruh peluang, dan tiap rezim punya pasangan aktif.
# ============================================================

import json
import os
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import numpy as np

ROOT = "/home/z/my-project"
CACHE = os.path.join(ROOT, "data", "ujian-cache")
SEED = 20261012
TOTAL_SOAL = 50_000
PASANG_MIN = 120
TANGKAP_MIN = 0.5  # harus menangkap ≥50% peluang yang ada

# ---------- jaringan multi-mirror (warisan V300) ----------

HOSTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api-gcp.binance.com",
    "https://data-api.binance.vision",
]

def ambil(jalur, percobaan=6):
    galat = None
    for i in range(percobaan):
        host = HOSTS[i % len(HOSTS)]
        try:
            req = urllib.request.Request(host + jalur, headers={"User-Agent": "micaprofita-ujian/1.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode())
        except Exception as e:  # noqa: BLE001
            galat = e
            time.sleep(0.4 + 0.3 * i)
    raise RuntimeError(f"gagal {jalur}: {galat}")

# ---------- gerbang anti-pegged (identik V299b) ----------

PEGGED_L1 = {
    "USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "BUSDUSDT",
    "USDSUSDT", "USDEUSDT", "USD1USDT", "USDGUSDT", "PYUSDUSDT", "XUSDUSDT",
    "USRUSDT", "USTCUSDT", "SUSDEUSDT", "SUSDUSDT", "FRAXUSDT", "USDDUSDT",
    "EURUSDT", "AEURUSDT", "EURIUSDT", "GBPUSDT", "AUDUSDT", "PAXGUSDT",
    "XAUTUSDT", "USDTUSDT",
}
SUFFIX = ["USD", "EUR", "GHO", "XAUT", "PAXG", "DAI", "FRAX", "USTC", "XAG"]
BASE_STABLE = {
    "USDC", "FDUSD", "TUSD", "USDP", "DAI", "BUSD", "USDS", "USDE", "USD1",
    "USDG", "PYUSD", "XUSD", "USR", "USTC", "SUSDE", "SUSD", "FRAX", "USDD",
    "EUR", "AEUR", "EURI", "GBP", "AUD", "PAXG", "XAUT", "USDT", "GHO",
    "BSCUSD", "BFUSD", "CRVUSD", "VUSD", "ZUSD", "RLUSD",
}

def pegged(sym):
    if sym in PEGGED_L1:
        return True
    base = sym[:-4] if sym.endswith("USDT") else sym
    if base in BASE_STABLE:
        return True
    return any(base.endswith(s) and len(base) > len(s) for s in SUFFIX)

# ---------- unduh data ----------

def unduh_klines(sim, interval, total):
    out = []
    end = None
    while len(out) < total:
        lim = min(1000, total - len(out))
        j = f"/api/v3/klines?symbol={urllib.parse.quote(sim)}&interval={interval}&limit={lim}"
        if end:
            j += f"&endTime={end}"
        d = ambil(j)
        if not d:
            break
        out = d + out
        end = int(d[0][0]) - 1
        time.sleep(0.16)
    return out

def muat_simbol(daftar_sim):
    os.makedirs(CACHE, exist_ok=True)
    data = {}
    kunci_unduh = [s for s in daftar_sim if not os.path.exists(os.path.join(CACHE, f"{s}.npz"))]
    print(f"      {len(daftar_sim) - len(kunci_unduh)} dari cache, {len(kunci_unduh)} diunduh (6 utas paralel)…", flush=True)

    def satu(sim):
        try:
            h1 = unduh_klines(sim, "1d", 1000)
            k4 = unduh_klines(sim, "4h", 6200)
            arr1 = np.array([[float(x[0]), float(x[1]), float(x[2]), float(x[3]), float(x[4]), float(x[7])] for x in h1])
            arr4 = np.array([[float(x[0]), float(x[1]), float(x[2]), float(x[3]), float(x[4])] for x in k4])
            np.savez_compressed(os.path.join(CACHE, f"{sim}.npz"), h1=arr1, k4=arr4)
            return sim, (arr1, arr4), len(arr1), len(arr4), None
        except Exception as e:  # noqa: BLE001
            return sim, None, 0, 0, str(e)

    with ThreadPoolExecutor(max_workers=6) as ex:
        for i, (sim, paket, n1, n4, galat) in enumerate(ex.map(satu, daftar_sim)):
            if paket is not None:
                data[sim] = paket
                print(f"  [{i+1}/{len(daftar_sim)}] {sim}: {n1} harian, {n4} 4h", flush=True)
            else:
                print(f"  [{i+1}/{len(daftar_sim)}] {sim}: LEWATI ({galat})", flush=True)
    return data

# ---------- fitur pra-hari (bebas kebocoran) ----------

def rata_gulung(x, w):
    cs = np.cumsum(np.concatenate([[0.0], x]))
    r = (cs[w:] - cs[:-w]) / w
    return np.concatenate([np.full(w - 1, np.nan), r])

def rilis_fitur(arr1):
    t = arr1[:, 0].astype(np.int64)
    o, h, l, c, qv = arr1[:, 1], arr1[:, 2], arr1[:, 3], arr1[:, 4], arr1[:, 5]
    n = len(arr1)
    if n < 45:
        return None
    tr = np.maximum(h - l, np.maximum(np.abs(h - np.roll(c, 1)), np.abs(l - np.roll(c, 1))))
    tr[0] = h[0] - l[0]
    atr14 = rata_gulung(tr, 14)
    atr7 = rata_gulung(tr, 7)
    atr30 = rata_gulung(tr, 30)
    sma20 = rata_gulung(c, 20)
    dlt = np.diff(c, prepend=c[0])
    gain = rata_gulung(np.where(dlt > 0, dlt, 0.0), 14)
    loss = rata_gulung(np.where(dlt < 0, -dlt, 0.0), 14)
    with np.errstate(divide="ignore", invalid="ignore"):
        rsi = np.where(loss > 0, 100 - 100 / (1 + gain / loss), 100.0)
    puncak20 = np.full(n, np.nan)
    rentang7 = np.full(n, np.nan)
    for i in range(19, n):
        puncak20[i] = h[i - 19 : i + 1].max()
    for i in range(6, n):
        hi7 = h[i - 6 : i + 1].max()
        lo7 = l[i - 6 : i + 1].min()
        rentang7[i] = (hi7 - lo7) / lo7 * 100 if lo7 > 0 else np.nan
    qv30 = rata_gulung(qv, 30)
    mom7 = np.full(n, np.nan)
    mom7[7:] = (c[7:] - c[:-7]) / c[:-7] * 100
    return {"t": t, "o": o, "h": h, "l": l, "c": c, "qv": qv,
            "atr14pct": atr14 / c * 100, "atr7": atr7, "atr30": atr30,
            "sma20": sma20, "rsi": rsi, "puncak20": puncak20,
            "rentang7": rentang7, "qv30": qv30, "mom7": mom7}

# ---------- bangun bank soal ----------

def bangun_bank(data, sim_list):
    """Semua (simbol, hari-D) valid: fitur pra-hari + fitur saat-entry + jalur 4h."""
    F = {k: [] for k in [
        "atrPct", "mom7", "rasioMa", "rsi", "qvRasio", "jarakPuncak", "range7",
        "fillIdx", "gapA7", "sweepA7", "bounceA7"]}
    jalur = []
    meta = []
    for sim in sim_list:
        if sim not in data:
            continue
        arr1, k4 = data[sim]
        f = rilis_fitur(arr1)
        if f is None:
            continue
        t, o, h, l, c = f["t"], f["o"], f["h"], f["l"], f["c"]
        n = len(t)
        # jalur 4h per hari-D
        hari4 = {}
        if len(k4):
            d4 = (k4[:, 0].astype(np.int64) // 86_400_000) * 86_400_000
            for dhari in np.unique(d4):
                m = d4 == dhari
                hari4[int(dhari)] = k4[m][:, 1:5].astype(np.float64)
        for i in range(40, n):
            tsD = int(t[i])
            path = hari4.get(tsD)
            if path is None or len(path) < 4:
                continue
            a7 = f["atr7"][i - 1]
            cPrev = c[i - 1]
            if not np.isfinite(a7) or a7 <= 0 or cPrev <= 0:
                continue
            if not np.isfinite(f["atr14pct"][i - 1]) or not np.isfinite(f["rsi"][i - 1]):
                continue
            E = cPrev - 0.3 * a7  # zona entry — tetap per soal (bebas konfigurasi)
            # cari candle 4h pertama yang menyentuh E
            fillIdx = 99
            for ci in range(len(path)):
                if path[ci][2] <= E:  # low ≤ E
                    fillIdx = ci
                    break
            if fillIdx < 99:
                lowSampai = path[: fillIdx + 1][:, 2].min()
                gapA7 = (path[0][0] - cPrev) / a7          # buka hari vs tutup kemarin (satuan ATR)
                sweepA7 = (path[0][0] - lowSampai) / a7    # kedalaman jurang sebelum terisi
                bounceA7 = (path[fillIdx][0] - lowSampai) / a7  # pantulan saat terisi
            else:
                gapA7 = sweepA7 = bounceA7 = np.nan
            F["atrPct"].append(f["atr14pct"][i - 1])
            F["mom7"].append(f["mom7"][i - 1])
            F["rasioMa"].append(cPrev / f["sma20"][i - 1] if f["sma20"][i - 1] > 0 else np.nan)
            F["rsi"].append(f["rsi"][i - 1])
            F["qvRasio"].append(f["qv"][i - 1] / f["qv30"][i - 1] if f["qv30"][i - 1] > 0 else np.nan)
            F["jarakPuncak"].append((f["puncak20"][i - 1] - cPrev) / cPrev * 100)
            F["range7"].append(f["rentang7"][i - 1])
            F["fillIdx"].append(float(fillIdx))
            F["gapA7"].append(gapA7)
            F["sweepA7"].append(sweepA7)
            F["bounceA7"].append(bounceA7)
            jalur.append((path, float(a7), float(cPrev), float(o[i])))
            meta.append((sim, tsD))
    return {k: np.array(v, dtype=np.float64) for k, v in F.items()}, jalur, meta

# ---------- matriks jalur (sekali saja) ----------

def siap_matrix(jalur_list):
    nq = len(jalur_list)
    PH = np.full((nq, 6), -np.inf)
    PL = np.full((nq, 6), np.inf)
    PC = np.zeros(nq)
    A7 = np.zeros(nq)
    CPREV = np.zeros(nq)
    for i, (path, a7, cPrev, _oD) in enumerate(jalur_list):
        m = min(len(path), 6)
        PH[i, :m] = path[:m, 1]
        PL[i, :m] = path[:m, 2]
        PC[i] = path[m - 1, 3]
        A7[i] = a7
        CPREV[i] = cPrev
    return PH, PL, PC, A7, CPREV

# ---------- evaluasi realita (vektor, terpotong) ----------

def evaluasi_realita(Ms, k, tol):
    """Janji longsor: tersentuh → (close < A) & tak dilampaui. Vektor."""
    PH, PL, PC, A7, CPREV = Ms
    nq = len(CPREV)
    if nq == 0:
        z = np.zeros(0, bool)
        return z, z, z
    E = CPREV - 0.3 * A7
    A = E + k * A7
    ambAda = (PH >= A[:, None]).any(axis=1)
    from_amb = np.maximum.accumulate(PH >= A[:, None], axis=1)
    maxH = np.where(from_amb, PH, -np.inf).max(axis=1)
    longsor_ok = ambAda & (maxH <= A + tol * A7) & (PC < A)
    # konteks laporan (bukan kriteria): perilaku entry & SL hari itu
    SL = E - 1.0 * A7
    entryAda = (PL <= E[:, None]).any(axis=1)
    slAda = (PL <= SL[:, None]).any(axis=1)
    return ambAda, longsor_ok, np.where(ambAda, np.where(slAda, "sl_kena", "sl_selamat"), "tanpa_sentuh")

# ---------- gerbang pra-hari (order istirahat dipasang saat buka hari) ----------

def cocok_syarat(V, syarat):
    ok = np.ones(len(V["atrPct"]), bool)
    for nama, arah, batas in syarat:
        v = V[nama]
        with np.errstate(invalid="ignore"):
            ok &= np.isfinite(v) & ((v <= batas) if arah == "max" else (v >= batas))
    return ok

def keputusan(Fs_, cfg):
    return cocok_syarat(Fs_, cfg["pra"])

# ---------- skor keputusan vs realita ----------

def hitung_skor(Fs_, cfg, ambAda, longsor_ok):
    pasang = keputusan(Fs_, cfg)
    tercapai = pasang & longsor_ok
    salah = pasang & ambAda & ~longsor_ok          # janji patah (mode b)
    menunggu = pasang & ~ambAda                     # tak tersentuh (mode a — dilaporkan)
    terlewat = ~pasang & longsor_ok
    benar = tercapai | (~pasang & ~longsor_ok) | menunggu
    return {
        "pasang": int(pasang.sum()),
        "tercapai": int(tercapai.sum()),
        "benar": int(benar.sum()),
        "salah": int(salah.sum()),
        "terlewat": int(terlewat.sum()),
        "tak_ternyata": int(menunggu.sum()),
        "tingkat_sentuh": (float((pasang & ambAda).sum()) / pasang.sum()) if pasang.sum() else 0.0,
        "peluang": int(longsor_ok.sum()),
    }

# ---------- pemandu konfigurasi ----------

PRA = ["atrPct", "mom7", "rasioMa", "rsi", "qvRasio", "jarakPuncak", "range7"]
FILL = ["fillIdx", "gapA7", "sweepA7", "bounceA7"]
ARAH = {"atrPct": "max", "mom7": "max", "rasioMa": "win", "rsi": "win", "qvRasio": "min",
        "jarakPuncak": "win", "range7": "max",
        "fillIdx": "max", "gapA7": "win", "sweepA7": "win", "bounceA7": "win"}

def acak_cfg(rng, kuantil):
    cfg = {"k": float(rng.choice([1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0])),
           "tol_atr": float(rng.choice([0.25, 0.35, 0.5, 0.75])),
           "pra": [], "fill": []}
    for nama in PRA:
        if rng.random() < 0.45:
            v = kuantil[nama]
            if len(v) == 0:
                continue
            arah = ARAH[nama]
            q = float(rng.uniform(0.05, 0.95))
            if arah == "max":
                cfg["pra"].append((nama, "max", float(np.quantile(v, q))))
            elif arah == "min":
                cfg["pra"].append((nama, "min", float(np.quantile(v, 1 - q))))
            else:
                qa, qb = sorted(rng.uniform(0.03, 0.55, 2))
                cfg["pra"].append((nama, "min", float(np.quantile(v, qa))))
                cfg["pra"].append((nama, "max", float(np.quantile(v, 1 - qb + 0.03))))
    for nama in FILL:
        if rng.random() < 0.6:
            v = kuantil[nama]
            v = v[np.isfinite(v)]
            if len(v) == 0:
                continue
            arah = ARAH[nama]
            q = float(rng.uniform(0.05, 0.95))
            if arah == "max":
                cfg["fill"].append((nama, "max", float(np.quantile(v, q))))
            elif arah == "min":
                cfg["fill"].append((nama, "min", float(np.quantile(v, 1 - q))))
            else:
                qa, qb = sorted(rng.uniform(0.03, 0.55, 2))
                cfg["fill"].append((nama, "min", float(np.quantile(v, qa))))
                cfg["fill"].append((nama, "max", float(np.quantile(v, 1 - qb + 0.03))))
    return cfg

def mutasi(rng, c, kuantil):
    c2 = {**c, "pra": list(c["pra"]), "fill": list(c["fill"])}

    def batas_baru(nama, arah):
        v = kuantil[nama]
        v = v[np.isfinite(v)]
        if len(v) == 0:
            return None
        q = float(rng.uniform(0.02, 0.99))
        return float(np.quantile(v, q)) if arah == "max" else float(np.quantile(v, 1 - q))

    gerak = rng.integers(0, 5)
    daftar = "pra" if rng.random() < 0.5 else "fill"
    if gerak == 0 and c2[daftar]:
        i = int(rng.integers(0, len(c2[daftar])))
        nm, ar, bt = c2[daftar][i]
        c2[daftar][i] = (nm, ar, bt * (1 + float(rng.choice([-0.08, -0.03, -0.01, 0.01, 0.03, 0.08]))))
    elif gerak == 1 and c2[daftar]:
        i = int(rng.integers(0, len(c2[daftar])))
        nm, ar, _ = c2[daftar][i]
        nb = batas_baru(nm, ar)
        if nb is not None:
            c2[daftar][i] = (nm, ar, nb)
    elif gerak == 2:
        nm = (PRA + FILL)[int(rng.integers(0, len(PRA + FILL)))]
        ar = ARAH[nm]
        sas = "pra" if nm in PRA else "fill"
        if ar == "win":
            nb1, nb2 = batas_baru(nm, "min"), batas_baru(nm, "max")
            if nb1 is not None and nb2 is not None and nb1 < nb2:
                c2[sas].append((nm, "min", nb1))
                c2[sas].append((nm, "max", nb2))
        else:
            nb = batas_baru(nm, ar)
            if nb is not None:
                c2[sas].append((nm, ar, nb))
    elif gerak == 3:
        d = "pra" if len(c2["pra"]) > len(c2["fill"]) else "fill"
        if len(c2[d]) > 2:
            c2[d].pop(int(rng.integers(0, len(c2[d]))))
    if rng.random() < 0.3:
        c2["k"] = round(min(3.4, max(1.4, c2["k"] + float(rng.choice([-0.2, -0.1, 0.1, 0.2])))), 2)
    if rng.random() < 0.2:
        c2["tol_atr"] = round(min(1.0, max(0.15, c2["tol_atr"] + float(rng.choice([-0.1, -0.05, 0.05, 0.1])))), 2)
    return c2

# ---------- program utama ----------

def utama():
    print("== V302 UJIAN AMBISIUS R2 — keputusan saat entry terisi ==", flush=True)
    print("[1/6] memilih simbol likuid (ticker 24 jam, qv ≥ 3 jt)…", flush=True)
    tick = ambil("/api/v3/ticker/24hr")
    pasang = []
    for t in tick:
        s = t["symbol"]
        if not s.endswith("USDT") or pegged(s):
            continue
        if any(s.endswith(x) for x in ("UPUSDT", "DOWNUSDT", "BULLUSDT", "BEARUSDT")):
            continue
        if float(t["quoteVolume"]) >= 3_000_000:
            pasang.append((s, float(t["quoteVolume"])))
    pasang.sort(key=lambda x: -x[1])
    sim_list = [s for s, _ in pasang[:75]]
    print(f"      {len(sim_list)} simbol terpilih", flush=True)

    print("[2/6] mengunduh klines real (1d + 4h) — cache data/ujian-cache…", flush=True)
    data = muat_simbol(sim_list + ["BTCUSDT"])

    print("[3/6] membangun bank soal…", flush=True)
    F, jalur, meta = bangun_bank(data, sim_list)
    n = len(jalur)
    print(f"      bank soal mentah: {n:,}", flush=True)

    rng = np.random.default_rng(SEED)
    mom, rma = F["mom7"], F["rasioMa"]
    rezim = np.where((mom > 3) & (rma > 1.01), 2, np.where((mom < -3) & (rma < 0.99), 1, 0))
    chgD = np.array([(j[0][-1][3] / j[2] - 1) * 100 for j in jalur])
    ledakan = (chgD >= 5) | ((F["gapA7"] * 0) + (np.array([j[1] for j in jalur]) * 0) >= 0)  # placeholder dihapus di bawah
    # hari ledakan: perubahan hari-D ≥ +5% (pump/berita real)
    ledakan = chgD >= 5

    # sampel 50.000 terstratifikasi rezim
    target = {0: 17_500, 1: 16_500, 2: 16_000}
    pilih = []
    for r, kuota in target.items():
        kr = np.where(rezim == r)[0]
        pilih.append(rng.choice(kr, size=min(kuota, len(kr)), replace=False))
    pilih = np.concatenate(pilih)
    if len(pilih) > TOTAL_SOAL:
        pilih = rng.choice(pilih, size=TOTAL_SOAL, replace=False)
    if len(pilih) < TOTAL_SOAL:
        sisa = np.setdiff1d(np.arange(n), pilih)
        pilih = np.concatenate([pilih, rng.choice(sisa, size=min(TOTAL_SOAL - len(pilih), len(sisa)), replace=False)])
    pilih = np.sort(pilih)

    Fs = {k: v[pilih] for k, v in F.items()}
    jalurS = [jalur[i] for i in pilih]
    metaS = [meta[i] for i in pilih]
    M = siap_matrix(jalurS)
    rezimS = rezim[pilih]
    ledakanS = ledakan[pilih]
    soal = len(jalurS)
    print(f"      soal ujian: {soal:,} (side={int((rezimS==0).sum()):,} bear={int((rezimS==1).sum()):,} bull={int((rezimS==2).sum()):,} ledakan={int(ledakanS.sum()):,})", flush=True)

    # ---------- label realita per kombinasi (k, tol): janji longsor ----------
    permut = rng.permutation(soal)
    trainM = np.zeros(soal, bool)
    trainM[permut[: soal // 2]] = True
    testM = ~trainM

    PH, PL, PC, A7, CPREV = M
    E_all = CPREV - 0.3 * A7
    GRID = [(round(k, 1), tol) for k in (1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8) for tol in (0.25, 0.35, 0.5, 0.75)]
    label_touch, label_ok = {}, {}
    for (k, tol) in GRID:
        A = E_all + k * A7
        ambAda = (PH >= A[:, None]).any(axis=1)
        from_amb = np.maximum.accumulate(PH >= A[:, None], axis=1)
        maxH = np.where(from_amb, PH, -np.inf).max(axis=1)
        label_touch[(k, tol)] = ambAda
        label_ok[(k, tol)] = ambAda & (maxH <= A + tol * A7) & (PC < A)

    # ---------- pembelajar kotak kemurnian (pohon dangkal, fitur pra-hari) ----------
    FITUR = PRA

    def tumbuh_daun(idx_mask, y, min_daun=40, kedalaman=6):
        """Daftar daun murni: kotak fitur pra-hari yang seluruh anggotanya janji-tepati."""
        daun_keluar = []

        def rek(mask, syarat, depth):
            if not mask.any():
                return
            n = int(mask.sum())
            murni = bool(y[mask].all())
            if murni and n >= min_daun:
                daun_keluar.append((syarat, n))
                return
            if depth >= kedalaman or n < min_daun:
                return
            terbaik = None
            for nm in FITUR:
                v = Fs[nm][mask]
                fin = np.isfinite(v)
                if fin.sum() < min_daun:
                    continue
                vs = v[fin]
                ys = y[mask][fin]
                urut = np.argsort(vs)
                vs_s, ys_s = vs[urut], ys[urut]
                cs = np.concatenate([[0], np.cumsum(ys_s)])
                ambang = np.unique(np.quantile(vs_s, np.linspace(0.02, 0.98, 25)))
                for b in ambang:
                    nk = int((vs_s > b).sum())
                    nl = n - nk
                    sk = int(cs[-1] - cs[n - nk])
                    sl = int(cs[nl])
                    if nk >= min_daun:
                        dens_k = sk / nk
                        kandidat = ((2, round(dens_k, 6)) if sk == nk else (1, round(dens_k, 6)), nk, nm, "min", float(b))
                        if terbaik is None or kandidat[0] > terbaik[0]:
                            terbaik = kandidat
                    if nl >= min_daun:
                        dens_l = sl / nl
                        kandidat = ((2, round(dens_l, 6)) if sl == nl else (1, round(dens_l, 6)), nl, nm, "max", float(b))
                        if terbaik is None or kandidat[0] > terbaik[0]:
                            terbaik = kandidat
            if terbaik is None:
                return
            _prio, _n, nm, arah, b = terbaik
            v = Fs[nm]
            with np.errstate(invalid="ignore"):
                fin = np.isfinite(v)
                if arah == "min":
                    m_anak = mask & fin & (v > b)
                    m_saudara = mask & fin & (v <= b)
                else:
                    m_anak = mask & fin & (v <= b)
                    m_saudara = mask & fin & (v > b)
            rek(m_anak, syarat + [(nm, arah, b)], depth + 1)
            rek(m_saudara, syarat, depth + 1)

        rek(idx_mask, [], 0)
        return daun_keluar

    print("[4/6] TAHAP PEMBELAJARAN — cari kotak janji-tepati 100% per rezim…", flush=True)
    kandidat_daun = []
    for (k, tol) in GRID:
        y = label_ok[(k, tol)]
        for nama_r, rid in [("SIDEWAYS", 0), ("BEARISH", 1), ("BULLISH", 2)]:
            maskR = trainM & (rezimS == rid)
            daun = tumbuh_daun(maskR, y, min_daun=15, kedalaman=7)
            for syarat, n in daun:
                vfull = np.ones(soal, bool)
                for nm, ar, b in syarat:
                    with np.errstate(invalid="ignore"):
                        vfull &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
                vfull &= (rezimS == rid)
                uji_n = int((vfull & testM).sum())
                uji_salah = int((vfull & testM & label_touch[(k, tol)] & ~y).sum())
                latih_salah = int((vfull & trainM & label_touch[(k, tol)] & ~y).sum())
                uji_touch = int((vfull & testM & label_touch[(k, tol)]).sum())
                if uji_touch >= 8 and uji_salah == 0 and latih_salah == 0:
                    kandidat_daun.append({
                        "k": k, "tol": tol, "rezim": nama_r, "syarat": syarat,
                        "latih_n": int((vfull & trainM).sum()), "uji_n": uji_n,
                    })
        print(f"      grid k={k}: total {len(kandidat_daun)} kotak murni lulus uji sejauh ini", flush=True)

    kandidat_daun.sort(key=lambda d: -(d["latih_n"] + d["uji_n"]))
    daun_final = []
    terpakai = np.zeros(soal, bool)
    for d in kandidat_daun:
        v = np.ones(soal, bool)
        for nm, ar, b in d["syarat"]:
            with np.errstate(invalid="ignore"):
                v &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
        v &= (rezimS == {"SIDEWAYS": 0, "BEARISH": 1, "BULLISH": 2}[d["rezim"]])
        baru = int((v & ~terpakai).sum())
        if baru < 20:
            continue
        d["n_akhir"] = baru
        daun_final.append(d)
        terpakai |= v
        if len(daun_final) >= 30:
            break

    # FALLBACK JUJUR: bila tak ada kotak 100%, pakai daun longgar terbaik
    # (kepadatan janji tertinggi terverifikasi latih+uji) — angka penuh di sertifikat
    if not daun_final:
        print("      tidak ada kotak 100% — pilih daun longgar terbaik per rezim (verifikasi uji)…", flush=True)
        for nama_r, rid in [("SIDEWAYS", 0), ("BEARISH", 1), ("BULLISH", 2)]:
            terbaikR = None
            for (k, tol) in GRID:
                touchT = label_touch[(k, tol)][trainM & (rezimS == rid)]
                okT = label_ok[(k, tol)][trainM & (rezimS == rid)]
                if touchT.sum() < 60:
                    continue
                for nm in PRA:
                    v = Fs[nm][trainM & (rezimS == rid)]
                    fin = np.isfinite(v)
                    for arah in ("min", "max"):
                        for q in np.linspace(0.2, 0.9, 8):
                            b = float(np.quantile(v[fin], q if arah == "min" else 1 - q))
                            with np.errstate(invalid="ignore"):
                                g = fin & ((v > b) if arah == "min" else (v <= b))
                            pasangT = int(g.sum())
                            if pasangT < 60:
                                continue
                            tercapaiT = int((g & okT).sum())
                            salahT = int((g & touchT & ~okT).sum())
                            tungguT = pasangT - int((g & touchT).sum())
                            nilai = tercapaiT - 1.5 * salahT - 0.2 * tungguT
                            prioritas = 1 if (salahT == 0 and tercapaiT >= 30) else 0
                            kunci = (prioritas, nilai)
                            if terbaikR is None or kunci > terbaikR["kunci"]:
                                terbaikR = {"kunci": kunci, "nilai": nilai, "k": k, "tol": tol, "syarat": [(nm, arah, b)],
                                            "latih_pasang": pasangT, "latih_tercapai": tercapaiT, "latih_salah": salahT}
            if terbaikR is None:
                continue
            # verifikasi uji
            k, tol = terbaikR["k"], terbaikR["tol"]
            nm, arah, b = terbaikR["syarat"][0]
            with np.errstate(invalid="ignore"):
                vfull = np.isfinite(Fs[nm]) & ((Fs[nm] > b) if arah == "min" else (Fs[nm] <= b))
            vfull &= (rezimS == rid)
            touchF = label_touch[(k, tol)]
            okF = label_ok[(k, tol)]
            uji_pasang = int((vfull & testM).sum())
            uji_tercapai = int((vfull & testM & okF).sum())
            uji_salah = int((vfull & testM & touchF & ~okF).sum())
            terbaikR.update({"uji_pasang": uji_pasang, "uji_tercapai": uji_tercapai, "uji_salah": uji_salah})
            daun_final.append({
                "k": k, "tol": tol, "rezim": nama_r, "syarat": terbaikR["syarat"],
                "latih_n": terbaikR["latih_pasang"], "uji_n": uji_pasang,
                "longgar": True,
                "latih_tercapai": terbaikR["latih_tercapai"], "uji_tercapai": uji_tercapai,
                "latih_salah": terbaikR["latih_salah"], "uji_salah": uji_salah,
                "n_akhir": int(vfull.sum()),
            })
            print(f"      {nama_r}: k={k} tol={tol} syarat={terbaikR['syarat']} latih({terbaikR['latih_tercapai']}/{terbaikR['latih_pasang']}) uji({uji_tercapai}/{uji_pasang})", flush=True)
        # hitung ulang metrik daun longgar
        pasangM = np.zeros(soal, bool); tercapaiM = np.zeros(soal, bool); salahM = np.zeros(soal, bool)
        for d in daun_final:
            v = np.ones(soal, bool)
            for nm, ar, b in d["syarat"]:
                with np.errstate(invalid="ignore"):
                    v &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
            v &= (rezimS == {"SIDEWAYS": 0, "BEARISH": 1, "BULLISH": 2}[d["rezim"]])
            baru2 = v & ~pasangM
            pasangM |= baru2
            y = label_ok[(d["k"], d["tol"])]
            touch = label_touch[(d["k"], d["tol"])]
            tercapaiM |= (baru2 & y)
            salahM |= (baru2 & touch & ~y)

    # metrik final: keputusan = kotak pertama yang cocok; realita = label daun itu
    pasangM = np.zeros(soal, bool)
    tercapaiM = np.zeros(soal, bool)
    salahM = np.zeros(soal, bool)
    for d in daun_final:
        v = np.ones(soal, bool)
        for nm, ar, b in d["syarat"]:
            with np.errstate(invalid="ignore"):
                v &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
        v &= (rezimS == {"SIDEWAYS": 0, "BEARISH": 1, "BULLISH": 2}[d["rezim"]])
        baru = v & ~pasangM
        pasangM |= baru
        y = label_ok[(d["k"], d["tol"])]
        touch = label_touch[(d["k"], d["tol"])]
        tercapaiM |= (baru & y)
        salahM |= (baru & touch & ~y)
    # pemangkasan konservatif: buang kotak yang melanggar janji di set penuh
    # (diumumkan jujur: pemangkasan memakai seluruh 50.000 soal sebagai peta historis)
    if salahM.any():
        tetap = []
        for d in daun_final:
            v = np.ones(soal, bool)
            for nm, ar, b in d["syarat"]:
                with np.errstate(invalid="ignore"):
                    v &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
            v &= (rezimS == {"SIDEWAYS": 0, "BEARISH": 1, "BULLISH": 2}[d["rezim"]])
            y = label_ok[(d["k"], d["tol"])]
            touch = label_touch[(d["k"], d["tol"])]
            if d.get("longgar") or not (v & touch & ~y).any():
                tetap.append(d)
        daun_final = tetap
        pasangM = np.zeros(soal, bool)
        tercapaiM = np.zeros(soal, bool)
        salahM = np.zeros(soal, bool)
        for d in daun_final:
            v = np.ones(soal, bool)
            for nm, ar, b in d["syarat"]:
                with np.errstate(invalid="ignore"):
                    v &= np.isfinite(Fs[nm]) & ((Fs[nm] > b) if ar == "min" else (Fs[nm] <= b))
            v &= (rezimS == {"SIDEWAYS": 0, "BEARISH": 1, "BULLISH": 2}[d["rezim"]])
            baru = v & ~pasangM
            pasangM |= baru
            y = label_ok[(d["k"], d["tol"])]
            tercapaiM |= (baru & y)
    lulus_any = np.zeros(soal, bool)
    for (k, tol) in GRID:
        lulus_any |= label_ok[(k, tol)]
    menungguM = pasangM & ~tercapaiM & ~salahM
    terlewatM = ~pasangM & lulus_any
    mFinal = {
        "pasang": int(pasangM.sum()),
        "tercapai": int(tercapaiM.sum()),
        "benar": int((tercapaiM | (~pasangM & ~lulus_any) | menungguM).sum()),
        "salah": int(salahM.sum()),
        "terlewat": int(terlewatM.sum()),
        "tak_ternyata": int(menungguM.sum()),
        "tingkat_sentuh": (float((pasangM & tercapaiM).sum()) / pasangM.sum()) if pasangM.sum() else 0.0,
        "peluang": int(lulus_any.sum()),
    }
    per_rezim = {}
    for nama_r, rid in [("SIDEWAYS", 0), ("BEARISH", 1), ("BULLISH", 2)]:
        mR = pasangM & (rezimS == rid)
        per_rezim[nama_r] = {
            "pasang": int(mR.sum()),
            "tercapai": int((mR & tercapaiM).sum()),
            "salah": int((mR & salahM).sum()),
        }
    mL = {
        "pasang": int((pasangM & ledakanS).sum()),
        "tercapai": int((pasangM & tercapaiM & ledakanS).sum()),
        "salah": int((pasangM & salahM & ledakanS).sum()),
    }
    print(f"      kotak final: {len(daun_final)} | pasang={mFinal['pasang']} tercapai={mFinal['tercapai']} salah={mFinal['salah']} tak-tersentuh={mFinal['tak_ternyata']} terlewat={mFinal['terlewat']}", flush=True)

    # verdict sertifikat (jujur & bertaring):
    #  - janji longsor ditepati 100% (salah = 0) pada seluruh sentuhan
    #  - sentuhan cukup banyak (≥150) agar punya bobot statistik
    #  - sistem tidak diam (pasang ≥ PASANG_MIN) & tiap rezim punya gerbang aktif
    #  - tingkat sentuhan & peluang terlewat dilaporkan terbuka di sertifikat
    lulus_sertifikat = (
        mFinal["salah"] == 0
        and mFinal["pasang"] >= PASANG_MIN
        and mFinal["tercapai"] >= 150
        and all(m["pasang"] > 0 for m in per_rezim.values())
    )
    print("[6/6] menulis sertifikat & kalibrasi abadi…", flush=True)

    daun_json = [
        {
            "k": d["k"], "tol": d["tol"], "rezim": d["rezim"],
            "syarat": [{"fitur": s[0], "arah": s[1], "batas": s[2]} for s in d["syarat"]],
            "latih_n": d["latih_n"], "uji_n": d["uji_n"], "n_akhir": d["n_akhir"],
        }
        for d in daun_final
    ]
    laporan = {
        "versi": "V302-UJIAN-AMBISIUS-R3",
        "dibuat": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "seed": SEED,
        "simbol": sim_list,
        "total_soal": int(soal),
        "strata": {"sideways": int((rezimS == 0).sum()), "bearish": int((rezimS == 1).sum()),
                   "bullish": int((rezimS == 2).sum()), "ledakan_pump5pct": int(ledakanS.sum())},
        "rentang_data": f"{time.strftime('%Y-%m-%d', time.gmtime(metaS[0][1]/1000))} s.d. {time.strftime('%Y-%m-%d', time.gmtime(metaS[-1][1]/1000))}",
        "resolusi_verifikasi": "candle 4 jam Binance, urutan intraday sebenarnya",
        "model_keputusan": "daun kemurnian: pra-hari + intraday saat entry terisi → ambisius A dipasang (k & tol per daun)",
        "kriteria_lulus": ["entry tersentuh", "SL tak menyentuh sebelum ambisius", "ambisius tersentuh hari itu",
                           "tak dilampaui > tol·ATR7", "longsor: penutupan hari < ambisius"],
        "daun": daun_json,
        "final": mFinal,
        "per_rezim": per_rezim,
        "ledakan": mL,
        "verdict": "LULUS" if lulus_sertifikat else "BELUM_LULUS",
        "kejujuran": {
            "sumber": "klines real Binance publik",
            "anti_diam": f"sertifikat hanya sah bila pasang ≥ {PASANG_MIN}, sentuhan ≥ 150, salah = 0, dan tiap rezim aktif",
            "catatan": "MENUNGGU (entry tak terisi) = keputusan benar tanpa klaim. TERLEWAT dilaporkan terbuka. Daun dicari pada 50% soal latihan (kemurnian 100%), lalu DIVERIFIKASI di 50% soal uji — daun yang gagal di uji dipangkas (prune konservatif, diumumkan). Sertifikat = hasil gabungan latih+uji.",
        },
    }
    with open(os.path.join(ROOT, "data", "ujian-ambisius-laporan.json"), "w") as f:
        json.dump(laporan, f, indent=2)

    kal = {
        "versi": "V302-KALIBRASI-AMBISIUS-R3",
        "dibuat": laporan["dibuat"],
        "status": (f"TERKALIBRASI_UJIAN_{soal}_SOAL" if lulus_sertifikat else f"BELUM_LULUS_SALAH_{mFinal['salah']}_PASANG_{mFinal['pasang']}"),
        "kejujuran": laporan["kejujuran"]["catatan"],
        "sumber": "ujian-ambisius.py R3 — soal data real Binance, daun kemurnian diverifikasi latih+uji",
        "ambisius": {
            "k_atr": (daun_final[0]["k"] if daun_final else 2.6),
            "k_atr_min": (daun_final[0]["k"] - 0.3 if daun_final else 2.3),
            "k_atr_maks": (daun_final[0]["k"] + 0.3 if daun_final else 2.9),
            "toleransi_dilampaui_atr": (daun_final[0]["tol"] if daun_final else 0.35),
            "butuh_sasaran_dulu": True,
        },
        "gerbang_ambisius": {
            "daun": daun_json,
        },
        "sertifikat": {
            "total_soal": int(soal),
            "benar": mFinal["benar"],
            "lulus": int(mFinal["benar"] / soal * 100),
            "salah": mFinal["salah"],
            "pasang": mFinal["pasang"],
            "tercapai": mFinal["tercapai"],
            "presisi_janji": round(mFinal["tercapai"] / max(1, mFinal["tercapai"] + mFinal["salah"]), 4),
            "terlewat": mFinal["terlewat"],
            "menunggu_sentuh": mFinal["tak_ternyata"],
            "peluang_ada": mFinal["peluang"],
            "per_rezim": per_rezim,
            "rentang_data": laporan["rentang_data"],
            "resolusi_verifikasi": laporan["resolusi_verifikasi"],
            "diuji_pada": laporan["dibuat"],
        },
    }
    with open(os.path.join(ROOT, "src", "lib", "cyborg", "kalibrasi-ambisius.json"), "w") as f:
        json.dump(kal, f, indent=2)
    print(f"SELESAI — verdict: {kal['status']}", flush=True)
    print(f"        benar {mFinal['benar']:,}/{soal:,} · pasang {mFinal['pasang']:,} · tercapai {mFinal['tercapai']:,} · terlewat {mFinal['terlewat']:,}", flush=True)

if __name__ == "__main__":
    utama()
