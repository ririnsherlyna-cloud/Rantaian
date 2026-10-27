#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# UJIAN RAHASIA HARIAN — KOLEKTOR KEBENARAN DATA NYATA BINANCE
# ═══════════════════════════════════════════════════════════════════
# Mandat pemilik: "1230 soal ujian gila koin terbang HARIAN" — koin
# yang dalam SEKALI HARI (1 candle harian) melonjak dari 100% hingga
# ribuan persen — yang membuat banyak master terliquidasi.
#
# Cara jujur (tanpa fabrikasi):
#   1. Ambil seluruh pasangan SPOT USDT status TRADING (exchangeInfo)
#   2. Untuk tiap koin: klines HARIAN (interval=1d) SEPANJANG SEJARAH
#      dengan paginasi startTime (limit 1000/halaman) — semua nyata.
#   3. Cache mentah → db/ujian-rahasia/harian/klines/<SYM>.json (resume)
#   4. Kebenaran harian: gainHarian(t) = (high[t] / close[t-1] − 1) × 100
#      = koin naik X% DALAM SEHARI dibanding penutupan kemarin.
#      Hari pertama listing (tanpa close sebelumnya) tidak dinilai — jujur.
#   5. Simpan db/ujian-rahasia/harian/kebenaran-harian.json
#
# Mode HEMAT: jeda 0.75–1.1 dtk + rotasi host (termasuk mirror publik
# data-api.binance.vision) + backoff panjang saat 418/429 + resume cache.
# ═══════════════════════════════════════════════════════════════════
import json, os, time, random, sys, urllib.request, urllib.error, urllib.parse

ROOT = "/home/z/my-project"
CACHE = f"{ROOT}/db/ujian-rahasia/harian/klines"
MASTER = f"{ROOT}/db/ujian-rahasia/harian/kebenaran-harian.json"
os.makedirs(CACHE, exist_ok=True)
LOGP = f"{ROOT}/scripts/ujian_harian_kumpul.log"

def log(m):
    print(m, flush=True)
    with open(LOGP, "a") as f:
        f.write(f"[{time.strftime('%F %T')}] {m}\n")

HOSTS = [
    "https://api.binance.com",
    "https://data-api.binance.vision",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
]

STABLE = {
    "USDT","USDC","FDUSD","TUSD","USDP","DAI","BUSD","UST","USDS","SUSD",
    "USD1","USDE","XUSD","AEUR","EURI","EUR","GBP","TRY","BRL","ARS","UAH",
    "RUB","ZAR","JPY","IDRT","NGN","COP","MXN","PLN","RON","HUF","CZK",
}
LEV_SFX = ("UP","DOWN","3L","3S","BULL","BEAR")

def get_json(url, timeout=40):
    url = urllib.parse.quote(url, safe=":/?&=.%-_~")  # dukung simbol non-ASCII (koin CJK nyata)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) MICAPROFITA-UJIAN/1.0",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def fetch_tahan(path):
    """Permintaan dengan rotasi host + backoff. None = gagal total."""
    for coba in range(10):
        host = HOSTS[coba % len(HOSTS)]
        try:
            return get_json(host + path)
        except urllib.error.HTTPError as e:
            if e.code in (418, 429):
                t = 25 * (coba + 1)
                log(f"  HTTP {e.code} (limit/ban) → tunggu {t} dtk")
                time.sleep(t)
            elif e.code in (400, 404):
                log(f"  HTTP {e.code} → simbol bermasalah")
                return None
            else:
                log(f"  HTTP {e.code} → host {host.split('//')[1]}")
                time.sleep(3)
        except Exception as ex:
            log(f"  err: {type(ex).__name__}: {ex}")
            time.sleep(4)
    return None

def daftar_simbol():
    info = fetch_tahan("/api/v3/exchangeInfo?permissions=SPOT")
    if not info:
        log("FATAL: exchangeInfo gagal")
        sys.exit(1)
    simbol = []
    for s in info.get("symbols", []):
        try:
            if s.get("status") != "TRADING": continue
            if s.get("quoteAsset") != "USDT": continue
            base = s.get("baseAsset", "")
            if base in STABLE: continue
            if base.endswith(LEV_SFX): continue
            if any(ch.isdigit() for ch in base): continue
            if not s.get("isSpotTradingAllowed", False): continue
            simbol.append(s["symbol"])
        except Exception:
            continue
    return sorted(set(simbol))

def ambil_harian(sym):
    """Klines harian penuh dgn paginasi. Return 'cache'/'baru'/None."""
    keluar = f"{CACHE}/{sym}.json"
    if os.path.exists(keluar):
        return "cache"
    semua = []
    start = 0
    while True:
        kl = fetch_tahan(
            f"/api/v3/klines?symbol={sym}&interval=1d&limit=1000&startTime={start}")
        if kl is None:
            return None if not semua else ("sebagian", semua)
        semua.extend(kl)
        if len(kl) < 1000:
            break
        start = int(kl[-1][0]) + 86400000  # lanjut hari setelah candle terakhir
        time.sleep(random.uniform(0.35, 0.6))  # antar-halaman
    tmp = keluar + ".tmp"
    with open(tmp, "w") as f:
        json.dump(semua, f)
    os.replace(tmp, keluar)
    return "baru"

def ambil_semua():
    simbol = daftar_simbol()
    log(f"TOTAL pasangan USDT layak uji (harian): {len(simbol)}")
    n_baru = n_cache = n_gagal = 0
    t0 = time.time()
    max_detik = int(os.environ.get("UJIAN_MAX_DETIK", "0"))
    for i, sym in enumerate(simbol, 1):
        if max_detik and time.time() - t0 > max_detik:
            log(f"JEDA AMAN di {i-1}/{len(simbol)} (batas {max_detik} dtk) — resume nanti")
            return
        try:
            h = ambil_harian(sym)
        except Exception as ex:
            h, _ = None, str(ex)
            log(f"  {sym}: EXCEPTION {ex}")
        if h == "baru":
            n_baru += 1
            time.sleep(random.uniform(0.75, 1.1))
        elif h == "cache":
            n_cache += 1
        else:
            n_gagal += 1
            time.sleep(2)
        if i % 25 == 0 or i == len(simbol):
            log(f"PROGRES {i}/{len(simbol)} (baru={n_baru} cache={n_cache} gagal={n_gagal})")
    log(f"SELESAI AMBIL: baru={n_baru} cache={n_cache} gagal={n_gagal}")

def tgl_str(ms):
    return time.strftime("%Y-%m-%d", time.gmtime(ms / 1000))

def hitung_master():
    baris = []
    for fn in sorted(os.listdir(CACHE)):
        if not fn.endswith(".json"): continue
        sym = fn[:-5]
        try:
            with open(f"{CACHE}/{fn}") as f:
                kl = json.load(f)
        except Exception:
            continue
        if not isinstance(kl, list) or len(kl) == 0: continue
        highs = [float(k[2]) for k in kl]
        closes = [float(k[4]) for k in kl]
        tgl = [tgl_str(k[0]) for k in kl]
        best = None
        hari_gila = []  # semua hari gain >= 100%
        hari_50 = 0
        for t in range(1, len(kl)):
            if closes[t-1] <= 0 or highs[t] <= 0: continue
            g = round((highs[t] / closes[t-1] - 1.0) * 100.0, 4)
            if g >= 50: hari_50 += 1
            if g >= 100:
                hari_gila.append({
                    "tanggal": tgl[t], "gainPct": g,
                    "closeSebelum": closes[t-1], "highHari": highs[t],
                })
            if best is None or g > best["gainPct"]:
                best = {
                    "gainPct": g, "tanggalPuncak": tgl[t],
                    "closeSebelum": closes[t-1], "highHari": highs[t],
                }
        if best is None or len(kl) < 2:
            baris.append({
                "simbol": sym, "gainPct": 0.0, "tanggalPuncak": None,
                "closeSebelum": None, "highHari": closes[-1],
                "jumlahHari": len(kl), "jumlahHariGila100": 0,
                "jumlahHariGila50": 0, "catatan": "umur<2hari-tak-dinilai",
            })
            continue
        best.update({
            "simbol": sym, "jumlahHari": len(kl),
            "jumlahHariGila100": len(hari_gila), "jumlahHariGila50": hari_50,
            "hariGila": hari_gila[:80],  # cap ukuran (terurut waktu; cukup utk soal)
            "catatan": "ok",
        })
        baris.append(best)
    baris.sort(key=lambda b: b["gainPct"], reverse=True)
    with open(MASTER, "w") as f:
        json.dump({
            "sumber": "Binance spot api.binance.com /api/v3/klines interval=1d (paginasi penuh)",
            "caraHitung": "gainHarian(t) = (high[t]/close[t-1] - 1) x 100, round 4 desimal; hari pertama listing tak dinilai",
            "diambil": time.strftime("%F %T"), "jumlah": len(baris), "koin": baris,
        }, f, indent=1)
    n100 = sum(1 for b in baris if b["gainPct"] >= 100)
    n200 = sum(1 for b in baris if b["gainPct"] >= 200)
    n500 = sum(1 for b in baris if b["gainPct"] >= 500)
    n1k  = sum(1 for b in baris if b["gainPct"] >= 1000)
    n5k  = sum(1 for b in baris if b["gainPct"] >= 5000)
    n24k = sum(1 for b in baris if b["gainPct"] >= 24000)
    log(f"MASTER HARIAN: {len(baris)} koin | sehari ≥100%: {n100} | ≥200%: {n200} | ≥500%: {n500} | ≥1000%: {n1k} | ≥5000%: {n5k} | ≥24000%: {n24k}")
    log("TOP-15 GILA HARIAN: " + ", ".join(f"{b['simbol']}=+{b['gainPct']:.0f}%({b['tanggalPuncak']})" for b in baris[:15]))

if __name__ == "__main__":
    aksi = sys.argv[1] if len(sys.argv) > 1 else "semua"
    if aksi in ("semua", "ambil"):
        log("── MULAI KUMPUL DATA NYATA HARIAN ──")
        ambil_semua()
    if aksi in ("semua", "master"):
        hitung_master()
        log("── SELESAI ──")
