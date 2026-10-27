#!/usr/bin/env python3
# ═══════════════════════════════════════════════════════════════════
# UJIAN RAHASIA — KOLEKTOR KEBENARAN DARI DATA NYATA BINANCE
# ═══════════════════════════════════════════════════════════════════
# Mandat pemilik: kumpulkan ratusan soal dari data NYATA — koin yang
# naik 100% hingga 24000% (bahkan lebih, "lonjakan gila") di Binance.
#
# Cara jujur (tanpa fabrikasi):
#   1. Ambil seluruh pasangan SPOT USDT status TRADING (exchangeInfo)
#   2. Untuk tiap koin: 1 permintaan klines bulanan (interval=1M,
#      limit=1000) = SEKALI ambil sepanjang sejarah listing
#   3. Cache mentah → db/ujian-rahasia/klines/<SYM>.json (bisa lanjut)
#   4. Hitung kebenaran dasar: lonjakan maksimum = (high bulan puncak
#      / low TERENDAH sebelum bulan itu − 1) × 100. Low wajib dari
#      bulan SEBELUM puncak (urutan low→high terjamin dari candle
#      bulanan; gerakan dalam satu candle tak bisa dipastikan
#      urutannya → tidak dipakai, catatan jujur).
#   5. Simpan db/ujian-rahasia/kebenaran.json (semua koin, termasuk
#      yang tak tembus 100% = sumber soal jebakan)
#
# Mode HEMAT: jeda 0.9–1.4 dtk antar permintaan + rotasi host
# api/binance api1..api4 + backoff panjang saat 418/429.
# ═══════════════════════════════════════════════════════════════════
import json, os, time, random, sys, urllib.request, urllib.error

ROOT = "/home/z/my-project"
CACHE = f"{ROOT}/db/ujian-rahasia/klines"
MASTER = f"{ROOT}/db/ujian-rahasia/kebenaran.json"
os.makedirs(CACHE, exist_ok=True)
LOGP = f"{ROOT}/scripts/ujian_kumpul.log"

def log(m):
    with open(LOGP, "a") as f:
        f.write(f"[{time.strftime('%F %T')}] {m}\n")

HOSTS = [
    "https://api.binance.com",
    "https://api1.binance.com",
    "https://api2.binance.com",
    "https://api3.binance.com",
    "https://api4.binance.com",
]

# aset stabil / bukan-koin (tak wajar diuji lonjakannya)
STABLE = {
    "USDT","USDC","FDUSD","TUSD","USDP","DAI","BUSD","UST","USDS","SUSD",
    "USD1","USDE","XUSD","AEUR","EURI","EUR","GBP","TRY","BRL","ARS","UAH",
    "RUB","ZAR","JPY","IDRT","NGN","COP","MXN","PLN","RON","HUF","CZK",
}
LEV_SFX = ("UP","DOWN","3L","3S","BULL","BEAR")

def get_json(url, timeout=40):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) MICAPROFITA-UJIAN/1.0",
        "Accept": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

def fetch_tahan(path):
    """Permintaan dengan rotasi host + backoff HEMAT. None = gagal total."""
    for coba in range(8):
        host = HOSTS[coba % len(HOSTS)]
        try:
            return get_json(host + path)
        except urllib.error.HTTPError as e:
            if e.code in (418, 429):
                t = 25 * (coba + 1)
                log(f"  HTTP {e.code} (limit/ban) → tunggu {t} dtk, host {host.split('//')[1]}")
                time.sleep(t)
            elif e.code in (400, 404):
                log(f"  HTTP {e.code} → simbol bermasalah, host {host.split('//')[1]}")
                return None
            else:
                log(f"  HTTP {e.code} → host {host.split('//')[1]}")
                time.sleep(3)
        except Exception as ex:
            log(f"  err: {type(ex).__name__}: {ex} → host {host.split('//')[1]}")
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
            # koin dengan angka/dollar di nama = turunan berleverase
            if any(ch.isdigit() for ch in base): continue
            if not s.get("isSpotTradingAllowed", False): continue
            simbol.append(s["symbol"])
        except Exception:
            continue
    return sorted(set(simbol))

def ambil_klines(sym):
    keluar = f"{CACHE}/{sym}.json"
    if os.path.exists(keluar):
        return "cache"
    kl = fetch_tahan(f"/api/v3/klines?symbol={sym}&interval=1M&limit=1000")
    if kl is None:
        return None
    tmp = keluar + ".tmp"
    with open(tmp, "w") as f:
        json.dump(kl, f)
    os.replace(tmp, keluar)
    return "baru"

def ambil_semua():
    simbol = daftar_simbol()
    log(f"TOTAL pasangan USDT layak uji: {len(simbol)}")
    n_baru = n_cache = n_gagal = 0
    t0 = time.time()
    max_detik = int(os.environ.get("UJIAN_MAX_DETIK", "0"))  # 0 = tanpa batas
    for i, sym in enumerate(simbol, 1):
        if max_detik and time.time() - t0 > max_detik:
            log(f"JEDA AMAN di {i-1}/{len(simbol)} (batas {max_detik} dtk) — lanjutkan dgn panggilan berikutnya (cache = resume)")
            return
        try:
            h = ambil_klines(sym)
        except Exception as ex:
            h, ex_str = None, str(ex)
            log(f"  {sym}: EXCEPTION {ex_str}")
        if h == "baru":
            n_baru += 1
            time.sleep(random.uniform(0.75, 1.1))  # HEMAT
        elif h == "cache":
            n_cache += 1
        else:
            n_gagal += 1
            time.sleep(2)
        if i % 20 == 0 or i == len(simbol):
            log(f"PROGRES {i}/{len(simbol)} (baru={n_baru} cache={n_cache} gagal={n_gagal})")
    log(f"SELESAI AMBIL: baru={n_baru} cache={n_cache} gagal={n_gagal}")

def bulan_str(ms):
    return time.strftime("%Y-%m", time.gmtime(ms / 1000))

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
        lows  = [float(k[3]) for k in kl]
        highs = [float(k[2]) for k in kl]
        bulan = [bulan_str(k[0]) for k in kl]
        best = None
        # low wajib dari bulan SEBELUM bulan puncak (urutan terjamin)
        for i in range(1, len(kl)):
            prefix = lows[:i]
            base = min(prefix)
            if base <= 0: continue
            g = round((highs[i] / base - 1.0) * 100.0, 4)
            if best is None or g > best["gainPct"]:
                best = {
                    "gainPct": g,
                    "bulanLow": bulan[prefix.index(base)],
                    "bulanPuncak": bulan[i],
                    "hargaLow": base,
                    "hargaHigh": highs[i],
                }
        if best is None:
            # umur < 2 bulan → tak bisa dipastikan urutan; catat jujur
            baris.append({
                "simbol": sym, "gainPct": 0.0, "bulanLow": None,
                "bulanPuncak": None, "hargaLow": None, "hargaHigh": highs[-1],
                "jumlahBulan": len(kl), "catatan": "umur<2bulan-tak-dinilai",
            })
            continue
        best.update({"simbol": sym, "jumlahBulan": len(kl), "catatan": "ok"})
        baris.append(best)
    baris.sort(key=lambda b: b["gainPct"], reverse=True)
    with open(MASTER, "w") as f:
        json.dump({"sumber": "Binance spot api.binance.com /api/v3/klines interval=1M",
                   "caraHitung": "gain = (high bulan puncak / low terendah bulan-bulan sebelum puncak - 1) x 100, dibulatkan 4 desimal",
                   "diambil": time.strftime("%F %T"), "jumlah": len(baris), "koin": baris}, f, indent=1)
    n100 = sum(1 for b in baris if b["gainPct"] >= 100)
    n1k  = sum(1 for b in baris if b["gainPct"] >= 1000)
    n5k  = sum(1 for b in baris if b["gainPct"] >= 5000)
    n24k = sum(1 for b in baris if b["gainPct"] >= 24000)
    log(f"MASTER: {len(baris)} koin | ≥100%: {n100} | ≥1000%: {n1k} | ≥5000%: {n5k} | ≥24000%: {n24k}")
    log("TOP-10 GILA: " + ", ".join(f"{b['simbol']}=+{b['gainPct']:.0f}%" for b in baris[:10]))

if __name__ == "__main__":
    aksi = sys.argv[1] if len(sys.argv) > 1 else "semua"
    if aksi in ("semua", "ambil"):
        log("── MULAI KUMPUL DATA NYATA ──")
        ambil_semua()
    if aksi in ("semua", "master"):
        hitung_master()
        log("── SELESAI ──")
