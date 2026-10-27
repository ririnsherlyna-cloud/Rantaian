#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HEARTBEAT MICROPROFITA GEN-10 — detak hidup + JEMBATAN OTAK Z.AI + XAU WAJIB + penjaga level + PELINDUNG-IP.
V304 (27 Okt, mandat pemilik): PELINDUNG-IP — harga tidak lagi bergantung
SATU IP/SATU bursa: rotasi 8 sumber publik (binance/bybit/okx/mexc/gate/
bitget/kucoin/binance-futures) dengan memori kesehatan + cooldown per sumber,
plus slot proxy pool (data/proxy_pool.json) untuk layanan rotating proxy
pemilik. Antrean sehat 429/418/403 — bukan menembus ban.
V303 (27 Okt): daftar 100 koin + 6 field wajib per koin teratas (entry, kini, TP,
Jual Ambisius, Power Max Ambisius, Stop) + header FRESH tanggal + NOTIFIKASI WAJIB
setiap koin yang mencapai Jual Ambisius / Power Max / TP / Stop hari ini.
GEN-8 PENGAMAN-BENTENG: jembatan TIDAK MENIMPA snapshot benteng yang lebih kaya
(pelajaran 27 Okt: rollback disk #4/#5 + bootstrap otak -> snapshot kosong nyaris
menghapus 10 sasaran bagus dari benteng; kini benteng = memori jangka panjang).
HUKUM PEMILIK V302: XAUUSDT (emas) = KOIN WAJIB ABADI — 100 sasaran + 1 XAU;
apa pun kondisi (regim/guard/veto/web padam), XAU tidak boleh hilang dari laporan.
Dua otak dilaporkan BERBEDA dan JUJUR (pemilik pernah bingung kenapa koin beda):
  A. OTAK Z.AI  = mesin arena di web sandbox ini (localhost:3000/api/arena,
     todayPicks kompetitor MICAPROFITA) — SAMA PERSIS dengan yang tampil di web.
  B. OTAK SERVER = penjaga repo ririnsherlyna-cloud/Micaprofita- (sasaran-terkini,
     genome, denyut) — punya level TP / JUAL AMBISIUS / POWER MAX / STOP.
Setiap detak (tiap 30 menit):
  1. Tarik sasaran otak z.ai dari web (fallback cache) -> section utama pesan
  2. Tanam snapshot otak z.ai ke Rantaian/benteng/sasaran-zai.json (bila berubah)
     agar lapis abadi GitHub ikut melaporkan otak yang sama saat sandbox mati
  3. Tarik sasaran-terkini.json + genome-server.json + denyut-server.jsonl (server)
  4. Harga semua simbol via ip_rotasi.py (rotasi 8 sumber publik + slot proxy pool;
   Binance kini hanya salah satu sumber, bukan satu-satunya)
  5. Deteksi SENTUHAN level otak server: TP, JUAL AMBISIUS, POWER MAX, STOP
  6. Kirim laporan jujur ke Telegram (harga mikro tampil utuh, bukan 0)
Hukum benteng: gap > 35 menit = MATI -> pengakuan wajib + jurnal kematian.
"""
import json
import os
import time
import html
import base64
import urllib.request
import urllib.parse
from datetime import datetime, timezone, timedelta
from decimal import Decimal

BASE = "/home/z/my-project"
DATA = os.path.join(BASE, "data")
F_LAST = os.path.join(DATA, "last_heartbeat")
F_FAIL = os.path.join(DATA, "send_failures")
F_CHAT = os.path.join(DATA, "telegram_chat_id")
F_TOKEN = os.path.join(BASE, ".token-telegram")
F_SNAP = os.path.join(DATA, "sasaran_state.json")
RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
BINANCE = "https://data-api.binance.vision/api/v3/ticker/price"
WIB = timezone(timedelta(hours=7))
GAP_MATI_MENIT = 35
# ---- jembatan otak z.ai ----
ZAI_URL = "http://localhost:3000/api/arena"
F_ZAI_CACHE = os.path.join(DATA, "zai_picks_last.json")
F_ZAI_BRIDGE = os.path.join(DATA, "zai_bridge_state.json")
F_PAT_RANTAIAN = os.path.join(BASE, ".token-rantaian")
REPO_RANTAIAN = "ririnsherlyna-cloud/Rantaian"
ZAI_SIMPAN = 120  # V303: simpan SEMUA pilihan (100 koin + XAU) ke snapshot & benteng
ZAI_TAMPIL = 12   # V303: 12 teratas diperagakan penuh (6 field wajib) di laporan Telegram
ZAI_JUMLAH = ZAI_TAMPIL  # kompatibilitas kode lama
LABEL_LEVEL = {"TP": "TP SASARAN", "JUAL AMBISIUS": "JUAL AMBISIUS",
               "POWER MAX AMBISIUS": "POWER MAX AMBISIUS", "STOP": "STOP (batal)"}


# ---------------- util dasar ----------------
def baca(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return None


def muat_json_lokal(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def simpan_json(path, obj):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False)
    except Exception as e:
        print("gagal simpan", path, repr(e))


def muat_json_remote(jalur, nama_cache):
    """Ambil file dari repo hidup; gagal -> pakai cache detak lalu."""
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            obj = json.loads(r.read().decode("utf-8", "replace"))
        simpan_json(cache, obj)
        return obj, True
    except Exception:
        obj = muat_json_lokal(cache)
        return obj, False


def jsonl_remote_terakhir(jalur, nama_cache):
    cache = os.path.join(DATA, nama_cache)
    try:
        req = urllib.request.Request(f"{RAW}/{jalur}", headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=25) as r:
            lines = [l for l in r.read().decode("utf-8", "replace").splitlines() if l.strip()]
        d = json.loads(lines[-1])
        simpan_json(cache, d)
        return d, True
    except Exception:
        return muat_json_lokal(cache), False


def otak_zai():
    """Sasaran otak z.ai dari web arena (SUMBER SAMA dengan yang dilihat pemilik
    di web). Web tidur -> cache detak lalu (diberi label jujur).
    V302 KOIN-WAJIB-XAU: XAUUSDT dipisah ke snap["xau"] — tidak ikut sort
    top-10, punya section sendiri. Bila web belum membawa XAU, disintesis
    dari harga emas langsung (gold-api/Bybit/OKX) agar WAJIB tetap hadir."""
    try:
        req = urllib.request.Request(ZAI_URL, headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode("utf-8", "replace"))
        picks = []
        for p in d.get("todayPicks") or []:
            if p.get("competitor") != "MICAPROFITA":
                continue
            sim = p.get("symbol")
            if not sim or not p.get("entryClose"):
                continue
            entri = {"simbol": str(sim).upper(), "arah": str(p.get("direction") or "?").upper(),
                     "keyakinan": p.get("confidence"), "entry": float(p.get("entryClose"))}
            # V303 LEVEL-WAJIB-4 — SEMUA koin membawa 4 level dari bukti web:
            # TP (target) / Jual Ambisius (highAmbisius) / Power Max / Stop.
            rn = ((p.get("evidence") or {}).get("rencana") or {})
            if isinstance(rn, dict):
                for k_sumber, k_tujuan in (("target", "target"), ("highAmbisius", "ambisius"),
                                           ("powerMax", "powermax"), ("stop", "stop")):
                    v = rn.get(k_sumber)
                    if isinstance(v, (int, float)) and v > 0:
                        entri[k_tujuan] = float(v)
            # V302-LEVEL — baris XAU wajib membawa rencana lengkap dan ditandai wajib
            if entri["simbol"] == "XAUUSDT":
                entri["wajib"] = True
            picks.append(entri)
        xau = next((p for p in picks if p["simbol"] == "XAUUSDT"), None)
        for p in picks:
            if p["simbol"] == "XAUUSDT":
                p["wajib"] = True
        if xau is None:
            xau = _xau_wajib_sintesis("web belum membawa XAU")
        koin = [p for p in picks if p["simbol"] != "XAUUSDT"]
        koin.sort(key=lambda x: (x.get("keyakinan") or 0), reverse=True)
        slot = d.get("slotHariIni") or {}
        snap = {"waktu": datetime.now(timezone.utc).isoformat(),
                "sumber": "otak-zai-web(arena)", "regime": d.get("regime"),
                "dianalisa": slot.get("dianalisa"), "lahir": slot.get("lahir"),
                # V303 DATA-FRESH — kejujuran tanggal: hari data & lag & stale
                "hariData": d.get("dataDay"), "lag": d.get("dataLagHari"), "stale": d.get("stale"),
                "total": len(koin) + (1 if xau else 0),
                "picks": koin[:ZAI_SIMPAN], "xau": xau}
        # GEN-8 PENGAMAN-CACHE: web hidup tapi picks MISKIN (otak sedang
        # bootstrap/LLM 429 pasca-rollback) -> jangan timpa cache kaya dengan
        # kosongan; laporkan cache terakhir dengan label jujur (V302: laporan
        # senantiasa kumplit + kejujuran sumber tetap terjaga).
        cache_lama = muat_json_lokal(F_ZAI_CACHE) or {}
        lama_picks = cache_lama.get("picks") or []
        if len(koin[:ZAI_SIMPAN]) < len(lama_picks) and cache_lama.get("sumber"):
            snap_lama = dict(cache_lama)
            snap_lama["waktu"] = datetime.now(timezone.utc).isoformat()
            snap_lama["sumber"] = (f"cache(benteng-lokal) — otak web sedang pulih "
                                   f"(web {len(koin)} picks, cache {len(lama_picks)} picks)")
            return snap_lama, True
        simpan_json(F_ZAI_CACHE, snap)
        return snap, True
    except Exception:
        snap = muat_json_lokal(F_ZAI_CACHE)
        if isinstance(snap, dict) and not snap.get("xau"):
            snap["xau"] = _xau_wajib_sintesis("cache tanpa XAU")
        return snap, False


def _xau_wajib_sintesis(ket):
    """XAU WAJIB tidak boleh absen: bila otak z.ai tidak membawanya,
    heartbeat mensintesiskan barisnya sendiri dari harga emas live.
    V303: membawa 4 level (TP/Ambisius/PowerMax/Stop) formulasi-vol
    dengan label jujur — level tidak boleh kosong."""
    h, chg, src = harga_xau()
    if h:
        arah = "SELL" if (chg is not None and chg < 0) else "BUY"
        sisi = -1 if arah == "SELL" else 1
        vol = max(abs(chg) / 100, 0.004) if chg is not None else 0.006
        return {"simbol": "XAUUSDT", "arah": arah, "keyakinan": 60, "entry": h,
                "target": h * (1 + sisi * vol), "ambisius": h * (1 + sisi * 2 * vol),
                "powermax": h * (1 + sisi * 3 * vol), "stop": h * (1 - sisi * max(vol * 0.6, 0.003)),
                "wajib": True, "ket": f"disintesis heartbeat ({ket}; sumber {src}; level formulasi-vol)"}
    return {"simbol": "XAUUSDT", "arah": "?", "keyakinan": None, "entry": None,
            "wajib": True, "ket": f"gagal ambil harga emas semua sumber ({ket})"}


def harga_xau():
    """Harga emas (XAU) rantai fallback (uji hidup 27 Okt): gold-api spot ->
    Bybit XAUTUSDT -> OKX XAUT-USDT. Kembalikan (harga, chg24h_pct, sumber)."""
    def _get(url, timeout=12):
        req = urllib.request.Request(url, headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8", "replace"))
    try:  # 1. gold-api: spot XAU murni
        j = _get("https://api.gold-api.com/price/XAU")
        p = j.get("price") if isinstance(j, dict) else None
        if isinstance(p, (int, float)) and 100 < p < 100000:
            chg = None
            try:  # lengkapi momentum 24 jam dari Bybit tanpa mengganti harga spot
                b = _get("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT", 10)
                lst = ((b.get("result") or {}).get("list") or [])
                pc = float(lst[0].get("price24hPcnt")) if lst else None
                chg = round(pc * 100, 2) if pc is not None else None
            except Exception:
                pass
            return float(p), chg, "gold-api XAU spot"
    except Exception:
        pass
    try:  # 2. Bybit XAUTUSDT (Tether Gold = 1 oz emas)
        b = _get("https://api.bybit.com/v5/market/tickers?category=spot&symbol=XAUTUSDT")
        lst = ((b.get("result") or {}).get("list") or [])
        if lst:
            p = float(lst[0].get("lastPrice"))
            pc = float(lst[0].get("price24hPcnt"))
            return p, round(pc * 100, 2), "Bybit XAUTUSDT (emas)"
    except Exception:
        pass
    try:  # 3. OKX XAUT-USDT
        o = _get("https://www.okx.com/api/v5/market/ticker?instId=XAUT-USDT")
        d0 = ((o.get("data") or []) or [None])[0]
        if d0:
            p = float(d0.get("last"))
            op = float(d0.get("open24h") or 0)
            chg = round((p / op - 1) * 100, 2) if op > 0 else None
            return p, chg, "OKX XAUT-USDT (emas)"
    except Exception:
        pass
    return None, None, "gagal"


def taman_zai_ke_rantaian(snap):
    """Tanam snapshot otak z.ai ke repo Rantaian (benteng/sasaran-zai.json) agar
    lapis abadi (GitHub Actions) melaporkan OTAK YANG SAMA saat sandbox mati.
    Hanya commit bila isi berubah. Gagal PAT/jaringan tidak boleh menggagalkan detak.
    GEN-8 PENGAMAN-BENTENG: commit DITOLAK bila snapshot benteng masih lebih kaya
    (lebih banyak picks) daripada snapshot baru — mencegah otak yang sedang
    bootstrap/429 menghapus memori sasaran bagus dari benteng."""
    if not snap:
        return "tanpa snapshot"
    pat = baca(F_PAT_RANTAIAN)
    if not pat:
        return "PAT rantaian tidak ada -> jembatan dilewati (laporan lokal tetap jalan)"
    payload = json.dumps(snap, ensure_ascii=False)
    lama = muat_json_lokal(F_ZAI_BRIDGE) or {}
    if lama.get("isi") == payload:
        return "isi sama -> tanpa commit"
    api = f"https://api.github.com/repos/{REPO_RANTAIAN}/contents/benteng/sasaran-zai.json"
    head = {"Authorization": f"Bearer {pat.strip()}", "User-Agent": "microprofita-hb",
            "Accept": "application/vnd.github+json"}
    sha = None
    kaya_benteng = 0  # PENGAMAN-BENTENG: jumlah picks yang sudah tersimpan di benteng
    try:
        with urllib.request.urlopen(urllib.request.Request(api, headers=head), timeout=15) as r:
            j = json.loads(r.read().decode())
            sha = j.get("sha")
            try:
                isi_benteng = json.loads(base64.b64decode((j.get("content") or "").replace("\n", "")).decode("utf-8"))
                kaya_benteng = len(isi_benteng.get("picks") or [])
            except Exception:
                kaya_benteng = 0
    except Exception:
        sha = None  # 404 = file belum ada -> buat baru
    picks_baru = len((snap or {}).get("picks") or [])
    if sha and kaya_benteng > picks_baru:
        return (f"pengaman benteng: snapshot lama lebih kaya ({kaya_benteng} vs "
                f"{picks_baru} picks) -> tidak menimpa; otak sedang pulih")
    body = {"message": "jembatan: sasaran otak z.ai dari heartbeat [skip ci]",
            "content": base64.b64encode(payload.encode("utf-8")).decode("ascii"),
            "committer": {"name": "microprofita-hb", "email": "hb@microprofita.local"}}
    if sha:
        body["sha"] = sha
    try:
        req = urllib.request.Request(api, data=json.dumps(body).encode("utf-8"), headers={**head, "Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req, timeout=25) as r:
            json.loads(r.read().decode())
        simpan_json(F_ZAI_BRIDGE, {"isi": payload, "waktu": time.time()})
        return "commit OK"
    except Exception as e:
        return f"gagal: {repr(e)[:120]}"


def umur_jam(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600.0
    except Exception:
        return None


# ---------------- format harga mikro (WAJIB: bukan 0) ----------------
def fmt_harga(p):
    if p is None:
        return "-"
    try:
        p = float(p)
    except Exception:
        return str(p)
    if p == 0:
        return "0"
    if p >= 1000:
        return f"{p:,.2f}"
    if p >= 1:
        return f"{p:.4f}".rstrip("0").rstrip(".")
    return format(Decimal(repr(p)).normalize(), "f")


# ---------------- level sasaran ----------------
def level_dari_entri(e):
    """Kenali level dari nama kunci secara generik (struktur bisa berubah antar versi)."""
    out = {}
    for k, v in e.items():
        if not isinstance(v, (int, float)) or v <= 0:
            continue
        kl = k.lower()
        if kl == "target":
            out["TP"] = float(v)
        elif "power" in kl:
            out["POWER MAX AMBISIUS"] = float(v)
        elif "ambisius" in kl:
            out["JUAL AMBISIUS"] = float(v)
        elif kl == "stop":
            out["STOP"] = float(v)
    return out


def label_sentuh(sim, arah, level_nama, level_nilai, harga, entry, pertama=False):
    ikon = {"TP": "🎯", "JUAL AMBISIUS": "🔥", "POWER MAX AMBISIUS": "💥", "STOP": "🛑"}.get(level_nama, "🔔")
    pct = f"{(harga / entry - 1) * 100:+.2f}%" if entry else ""
    pct_level = f"{(harga / level_nilai - 1) * 100:+.2f}%" if level_nilai else ""
    tanda = " <i>(sudah di atas level saat pemantauan menyala)</i>" if pertama else ""
    return (f"{ikon} <b>{LABEL_LEVEL.get(level_nama, level_nama)} TERSSENTUH — {html.escape(sim)} ({html.escape(arah)})</b>{tanda}\n"
            f"Harga kini {fmt_harga(harga)} · level {fmt_harga(level_nilai)} ({pct_level} dari level)"
            + (f" · entry {fmt_harga(entry)} ({pct})" if entry else ""))


# ---------------- harga binance ----------------
def _basis_simbol(s):
    """'IOST'->'IOST', 'SYNUSDT'->'SYN' (otak kadang menulis pasangan utuh)."""
    s = str(s).strip().upper()
    if s.endswith("USDT") and len(s) > 4:
        s = s[:-4]
    return s if s.isalnum() else None


def _tickers_bybit(bases):
    """Ticker spot Bybit (publik, tanpa kunci) -> {basis: harga}. Bursa cadangan."""
    try:
        req = urllib.request.Request("https://api.bybit.com/v5/market/tickers?category=spot",
                                     headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=20) as r:
            lst = ((json.loads(r.read().decode()) or {}).get("result") or {}).get("list") or []
        out = {}
        for x in lst:
            s = str(x.get("symbol") or "")
            if s.endswith("USDT") and s[:-4] in bases:
                try:
                    out[s[:-4]] = float(x.get("lastPrice"))
                except (TypeError, ValueError):
                    continue
        return out
    except Exception:
        return {}


def _tickers_okx(bases):
    """Ticker spot OKX (publik, tanpa kunci) -> {basis: harga}. Bursa cadangan."""
    try:
        req = urllib.request.Request("https://www.okx.com/api/v5/market/tickers?instType=SPOT",
                                     headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=20) as r:
            lst = (json.loads(r.read().decode()) or {}).get("data") or []
        out = {}
        for x in lst:
            iid = str(x.get("instId") or "")
            if iid.endswith("-USDT") and iid[:-5] in bases:
                try:
                    out[iid[:-5]] = float(x.get("last"))
                except (TypeError, ValueError):
                    continue
        return out
    except Exception:
        return {}


def _tickers_futures(bases):
    """Ticker FUTURES Binance (fapi, publik, tanpa kunci). Pelajaran 27 Okt:
    pilihan otak z.ai (arena) banyak yang futures-only (DODOX/BULLA/TAG/IRYS
    dst) — bukan spot Binance. Harga tetap dari Binance, bukan bursa lain."""
    try:
        req = urllib.request.Request("https://fapi.binance.com/fapi/v1/ticker/price",
                                     headers={"User-Agent": "microprofita-hb"})
        with urllib.request.urlopen(req, timeout=20) as r:
            arr = json.loads(r.read().decode())
        out = {}
        for x in arr if isinstance(arr, list) else []:
            s = str(x.get("symbol") or "")
            if s.endswith("USDT") and s[:-4] in bases:
                try:
                    out[s[:-4]] = float(x.get("price"))
                except (TypeError, ValueError):
                    continue
        return out
    except Exception:
        return {}


def harga_binance(simbol_list):
    """Kembalikan ({basis: harga}, sumber). Resilien berlapis (pelajaran 27 Okt):
    batch DI-CHUNK (5 simbol/chunk) agar 1 simbol tak-valid TIDAK mematikan
    seluruh batch (400) — chunk gagal diambil per-simbol, sisa diambil dari
    bursa cadangan Bybit/OKX bila Binance memblokir IP (418). Normalisasi simbol
    tetap: SYNUSDT->SYN; satu simbol rusak tak boleh membutakan penjaga TP."""
    if not simbol_list:
        return {}, "binance"
    bases = sorted({b for b in (_basis_simbol(s) for s in simbol_list) if b})
    if not bases:
        return {}, "binance"
    # V304 PELINDUNG-IP: rotasi 8 sumber publik dulu (kesehatan per sumber,
    # cooldown otomatis, slot proxy pool). Binance bukan lagi satu-satunya.
    try:
        import ip_rotasi
        rot_map, rot_src, rot_stat = ip_rotasi.batch_harga(bases)
        if rot_map and len(rot_map) >= max(1, len(bases) // 2):
            hilang = [b for b in bases if b not in rot_map]
            if hilang:
                fut = _tickers_futures(set(hilang))
                if fut:
                    rot_map.update(fut)
            print(f"PELINDUNG-IP: {rot_stat}")
            if len(rot_map) < len(bases):
                print(f"HARGA parsial: {len(rot_map)}/{len(bases)} ({rot_src})")
            return rot_map, rot_src
        print(f"PELINDUNG-IP lemah ({rot_stat}) -> jalur lama Binance\u2026")
    except Exception as e:
        print(f"PELINDUNG-IP tak tersedia -> jalur lama ({repr(e)[:80]})")
    hosts = (BINANCE, "https://api.binance.com/api/v3/ticker/price",
             "https://api-gcp.binance.com/api/v3/ticker/price")
    out, err_terakhir = {}, None
    for i in range(0, len(bases), 5):
        chunk = bases[i:i + 5]
        pairs = [f"{b}USDT" for b in chunk]
        q = urllib.parse.quote(json.dumps(pairs, separators=(",", ":")))
        dapat = None
        for host in hosts:
            try:
                req = urllib.request.Request(f"{host}?symbols={q}", headers={"User-Agent": "microprofita-hb"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    arr = json.loads(r.read().decode())
                if isinstance(arr, list):
                    dapat = {x["symbol"].replace("USDT", ""): float(x["price"]) for x in arr}
                    break
            except Exception as e:
                err_terakhir = repr(e)
        if dapat is None:
            # chunk ini sakit (simbol tak-valid / IP diblokir) -> per-simbol
            # (BINANCE sudah memuat path /api/v3/ticker/price — JANGAN dobel path!)
            for b in chunk:
                try:
                    req = urllib.request.Request(f"{BINANCE}?symbol={b}USDT",
                                                 headers={"User-Agent": "microprofita-hb"})
                    with urllib.request.urlopen(req, timeout=10) as r:
                        out[b] = float(json.loads(r.read().decode())["price"])
                except Exception as e:
                    err_terakhir = repr(e)
        else:
            out.update(dapat)
    sumber = "binance"
    hilang = [b for b in bases if b not in out]
    if hilang and out:
        # 1) futures Binance (pilihan arena sering futures-only) — masih Binance
        fut = _tickers_futures(set(hilang))
        if fut:
            out.update(fut)
            hilang = [b for b in hilang if b not in fut]
        # 2) sisa benar-benar tak ada di Binance -> bursa cadangan
        if hilang:
            cad = {**_tickers_okx(set(hilang)), **_tickers_bybit(set(hilang))}
            if cad:
                out.update(cad)
                sumber = "binance+futures+bybit/okx"
    elif not out:
        gab = {**_tickers_futures(set(bases)), **_tickers_okx(set(bases)), **_tickers_bybit(set(bases))}
        if gab:
            print(f"HARGA_CADANGAN: {len(gab)}/{len(bases)} (Binance: {err_terakhir})")
            return gab, "bybit+okx"
    if out:
        if len(out) < len(bases):
            print(f"HARGA parsial: {len(out)}/{len(bases)} (Binance: {err_terakhir})")
        return out, sumber
    print("HARGA_GAGAL:", err_terakhir)
    return {}, "gagal"


# ---------------- V304 peluang profit (mandat pemilik) ----------------
def daftar_peluang_profit(koin, harga_map, batas=10):
    """V304 DAFTAR KEDUA (mandat pemilik 27 Okt): urutan murni dari BESARAN
    % profit menuju Jual Ambisius (dan Power Max) menurut harga kini —
    BUKAN peluang tercapai. Pemilik: 'yang dilihat ya murni kebesaran
    profitnya'. BUY: (ambisius-kini)/kini; SELL: (kini-ambisius)/kini.
    Koin tanpa harga kini / tanpa level dilewati (jujur, bukan dikarang)."""
    rows = []
    for p in koin or []:
        basis = _basis_simbol(p.get("simbol") or "")
        kini = (harga_map or {}).get(basis)
        amb, pm = p.get("ambisius"), p.get("powermax")
        if not (kini and isinstance(amb, (int, float)) and amb > 0):
            continue
        arah = str(p.get("arah") or "BUY").upper()
        if arah == "SELL":
            pct = (kini - amb) / kini * 100.0
            pm_pct = ((kini - pm) / kini * 100.0) if isinstance(pm, (int, float)) and pm > 0 else None
        else:
            pct = (amb - kini) / kini * 100.0
            pm_pct = ((pm - kini) / kini * 100.0) if isinstance(pm, (int, float)) and pm > 0 else None
        if pct > 0:
            rows.append((p.get("simbol") or basis, arah, kini, float(amb), pct, pm, pm_pct))
    rows.sort(key=lambda r: r[4], reverse=True)
    return rows[:batas]


# ---------------- pemantau TP ----------------
F_ARENA_LEVEL = os.path.join(DATA, "arena_level_state.json")


def pantau_level_arena(picks, xau, harga_map, xau_h):
    """V303 NOTIFIKASI WAJIB (mandat pemilik 27 Okt): setiap koin otak z.ai
    (dan XAU) yang mencapai Jual Ambisius / Power Max / TP / Stop menurut
    data hari ini WAJIB dinotifikasikan. Dedup via data/arena_level_state.json
    (sekali per simbol:level; setelah rollback state bisa terhapus -> notifikasi
    berulang = deteksi jujur ulang, bukan bohong)."""
    if not isinstance(harga_map, dict):
        harga_map = {}
    state = muat_json_lokal(F_ARENA_LEVEL) or {}
    kunci_semua, kejadian = set(), []
    daftar = [p for p in (picks or []) if isinstance(p, dict) and p.get("entry")]
    if isinstance(xau, dict) and xau.get("entry"):
        daftar.append(xau)
    for p in daftar:
        sim = p.get("simbol")
        if not sim:
            continue
        if sim == "XAUUSDT":
            h = xau_h
        else:
            h = harga_map.get(_basis_simbol(sim) or sim)
        if not h:
            continue
        arah = str(p.get("arah") or "BUY").upper()
        ent = p.get("entry")
        levels = (("TP SASARAN", p.get("target")), ("JUAL AMBISIUS", p.get("ambisius")),
                  ("POWER MAX AMBISIUS", p.get("powermax")), ("STOP (batal)", p.get("stop")))
        for nama, lv in levels:
            if not isinstance(lv, (int, float)) or lv <= 0:
                continue
            if nama.startswith("STOP"):
                tercapai = (h <= lv) if arah == "BUY" else (h >= lv)
            else:
                tercapai = (h >= lv) if arah == "BUY" else (h <= lv)
            kunci = f"{sim}:{nama}"
            kunci_semua.add(kunci)
            if tercapai and kunci not in state:
                kejadian.append((sim, arah, nama, lv, h, ent, False))
    if kunci_semua - set(state):
        state.update({k: datetime.now(timezone.utc).isoformat() for k in kunci_semua - set(state)})
        if len(state) > 600:  # pangkas tertua (ISO string urut alfabet = urut waktu)
            state = dict(sorted(state.items(), key=lambda kv: kv[1])[-500:])
        simpan_json(F_ARENA_LEVEL, state)
    return kejadian


def pantau_level(sasaran_list, harga_map):
    """Bandingkan dengan snapshot detak lalu -> daftar kejadian sentuhan baru.
    Pemanasan: detak pertama berk harga / sasaran baru -> hanya dicatat, tidak diberitahu."""
    state = muat_json_lokal(F_SNAP) or {}
    lama = state.get("level", {})
    sudah_panas = bool(state.get("prima_harga")) and bool(harga_map)
    ada_harga_sekarang = bool(harga_map)
    baru, kejadian = {}, []
    for e in sasaran_list:
        sim = e.get("simbol")
        if not sim:
            continue
        harga = harga_map.get(sim)
        lv = level_dari_entri(e)
        baru[sim] = {}
        for nama, nilai in lv.items():
            kena = bool(harga) and ((harga >= nilai) if nama != "STOP" else (harga <= nilai))
            baru[sim][nama] = kena
            sebelumnya = lama.get(sim, {}).get(nama)
            # V4: sentuhan PERTAMA pun dilaporkan — pemilik wajib tahu, bukan disembunyikan pemanasan.
            if kena and not sebelumnya and harga and (sudah_panas or sim not in lama):
                kejadian.append((sim, e.get("arah", "?"), nama, nilai, harga, e.get("entry"),
                                 sim not in lama))
    simpan_json(F_SNAP, {"waktu": time.time(), "prima_harga": ada_harga_sekarang or bool(state.get("prima_harga")), "level": baru})
    return kejadian, len(baru)


# ---------------- kirim telegram ----------------
def kirim_telegram(token, chat_id, text):
    """V303: pesan panjang dipecah otomatis <= 3900 karakter per bagian
    (batas Telegram 4096); setiap bagian dikirim berurutan, ok terakhir
    yang dikembalikan. Parse mode tetap HTML — pemecah hanya di batas baris."""
    bagian = []
    if len(text) <= 3900:
        bagian = [text]
    else:
        sisa = text
        while sisa:
            if len(sisa) <= 3900:
                bagian.append(sisa)
                break
            potong = sisa.rfind("\n", 0, 3900)
            if potong < 500:
                potong = 3900
            bagian.append(sisa[:potong])
            sisa = sisa[potong:].lstrip("\n")
    hasil = None
    for i, b in enumerate(bagian):
        t = b if len(bagian) == 1 else f"{b}\n<i>[bagian {i + 1}/{len(bagian)}]</i>"
        payload = urllib.parse.urlencode({
            "chat_id": chat_id, "text": t, "parse_mode": "HTML",
            "disable_web_page_preview": "true"}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage", data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"})
        with urllib.request.urlopen(req, timeout=25) as r:
            hasil = json.loads(r.read().decode())
    return hasil


def jumlah_gagal():
    try:
        cutoff = time.time() - 86400
        n = 0
        with open(F_FAIL, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    if float(line.split("|")[0]) >= cutoff:
                        n += 1
                except Exception:
                    n += 1
        return n
    except Exception:
        return 0


# ---------------- utama ----------------
def main():
    os.makedirs(DATA, exist_ok=True)
    now = time.time()
    token, chat_id = baca(F_TOKEN), baca(F_CHAT)
    if not token or not chat_id:
        print("GAGAL-LOKAL: token/chat_id tidak ada")
        return 1

    gap_menit = None
    last = baca(F_LAST)
    if last:
        try:
            gap_menit = (now - float(last)) / 60.0
        except Exception:
            pass

    # ---- jurnal kematian (LAPIS 4 benteng: kematian = data evolusi) ----
    if gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        try:
            with open(os.path.join(DATA, "death_journal.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "waktu": datetime.now(timezone.utc).isoformat(),
                    "peristiwa": "MATI-terdeteksi",
                    "gap_menit": round(gap_menit, 1),
                    "lapis_penjinak": "denyut-tubuh",
                    "status_kirim": "menyusul"}, ensure_ascii=False) + "\n")
            print(f"JURNAL: kematian tercatat ({gap_menit:.0f} menit)")
        except Exception as e:
            print("jurnal gagal:", repr(e))

    # ---- data hidup ----
    # (A) OTAK Z.AI — web arena, sumber sama dengan yang dilihat pemilik di web
    zai_snap, zai_hidup = otak_zai()
    zai_picks = (zai_snap or {}).get("picks") or []
    # (B) OTAK SERVER — penjaga repo Micaprofita-
    sasaran, sasaran_hidup = muat_json_remote("laporan/sasaran-terkini.json", "remote_sasaran.json")
    genome, genome_hidup = muat_json_remote("otak/genome-server.json", "remote_genome.json")
    denyut, denyut_hidup = jsonl_remote_terakhir("laporan/denyut-server.jsonl", "remote_denyut.json")

    # ---- genome: kapan terakhir tumbuh ----
    terbaru_iso, gen_maks, total_belajar = None, 0, 0

    def telusur(d):
        nonlocal terbaru_iso, gen_maks, total_belajar
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru_iso is None or umur_jam(iso) < umur_jam(terbaru_iso)):
                terbaru_iso = iso
            gen_maks = max(gen_maks, int(d.get("generasi") or 0))
            total_belajar += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)
    telusur(genome or {})

    # ---- penjaga TP ----
    daftar = (sasaran or {}).get("sasaranHariIni") or []
    simbol_list = [e.get("simbol") for e in daftar if e.get("simbol")]
    simbol_list += [p.get("simbol") for p in zai_picks if p.get("simbol") and p.get("simbol") != "XAUUSDT"]
    harga_map, sumber_harga = harga_binance(simbol_list)  # satu panggilan gabungan (hemat, tetap fallback per-simbol)
    # V302 XAU WAJIB — harga emas rantai sendiri (Binance tak punya XAUUSDT)
    zai_xau = (zai_snap or {}).get("xau")
    if not isinstance(zai_xau, dict):
        zai_xau = _xau_wajib_sintesis("snap tanpa xau")
    xau_h, xau_chg, xau_src = harga_xau()
    kejadian, n_dipantau = [], 0
    if daftar and harga_map:
        kejadian, n_dipantau = pantau_level(daftar, harga_map)
    else:
        # detak pertama: tetap inisialisasi snapshot agar detak berikut membandingkan
        kejadian, n_dipantau = pantau_level(daftar, harga_map) if daftar else ([], 0)
    # V303 NOTIFIKASI WAJIB — sentuhan level sasaran arena (100 koin + XAU):
    kejadian_arena = pantau_level_arena(zai_picks, zai_xau, harga_map, xau_h)
    kejadian = list(kejadian) + list(kejadian_arena)

    # ---- susun pesan ----
    jam = datetime.now(WIB)
    L = ["💓 <b>DETAK HIDUP — MICROPROFITA</b>",
         f"🕐 {jam.strftime('%H:%M:%S WIB, %d %b %Y')}"]
    if gap_menit is None:
        L.append("Status: <b>HIDUP</b> — detak pertama setelah pulih (tubuh sandbox di-reset; intai dibangun ulang oleh lapis penyelamat)")
    elif gap_menit > GAP_MATI_MENIT:
        L.append(f"⚠️ <b>Saya sempat MATI selama {gap_menit:.0f} menit dan baru pulih sekarang</b>")
    else:
        L.append(f"Status: <b>HIDUP</b> — {gap_menit:.0f} menit sejak detak terakhir")

    L.append("")
    # ---- V302 section XAU WAJIB (TIDAK PERNAH ABSEN — hukum pemilik) ----
    x_ent = zai_xau.get("entry")
    x_arah = str(zai_xau.get("arah") or "?").upper()
    x_konf = zai_xau.get("keyakinan")
    x_kini = xau_h if xau_h else None
    x_jarak = f"{(x_kini / x_ent - 1) * 100:+.2f}%" if (x_kini and x_ent) else "-"
    L.append("🥇 <b>XAU (EMAS) — KOIN WAJIB ABADI</b> (100 sasaran + 1 XAU, hukum pemilik V302+V303)")
    if xau_h:
        chg_s = f" · 24 jam {xau_chg:+.2f}%" if xau_chg is not None else ""
        L.append(f"<b>XAUUSDT</b> {html.escape(x_arah)} {x_konf if x_konf is not None else '-'}% · "
                 f"entry {fmt_harga(x_ent)} · kini <b>{fmt_harga(x_kini)}</b> ({x_jarak}){chg_s}")
        # V302-LEVEL + V303 — laporan emas KOMPLIT: EMPAT level terpisah (hukum
        # pemilik: TP sasaran ≠ Jual Ambisius ≠ Power Max ≠ Stop — jangan samakan).
        x_tg, x_am, x_pm, x_st = zai_xau.get("target"), zai_xau.get("ambisius"), zai_xau.get("powermax"), zai_xau.get("stop")
        if any(isinstance(v, (int, float)) and v > 0 for v in (x_tg, x_am, x_pm, x_st)):
            def _pct_level(v):
                return f" ({(v / x_ent - 1) * 100:+.2f}%)" if (v and x_ent) else ""
            L.append(f"🎯 TP sasaran: <b>{fmt_harga(x_tg)}</b>{_pct_level(x_tg)} · "
                     f"🔥 JUAL AMBISIUS: <b>{fmt_harga(x_am)}</b>{_pct_level(x_am)}\n"
                     f"⚡ POWER MAX AMBISIUS: <b>{fmt_harga(x_pm)}</b>{_pct_level(x_pm)} · "
                     f"🛑 STOP: <b>{fmt_harga(x_st)}</b>{_pct_level(x_st)}")
            L.append("<i>Empat level berbeda untuk emas — TP ≠ Jual Ambisius ≠ Power Max ≠ Stop; empat keputusan berbeda.</i>")
        L.append(f"<i>Sumber harga: {html.escape(xau_src)} — XAU selalu ada di laporan apa pun kondisinya.</i>")
    else:
        L.append(f"<b>XAUUSDT</b> {html.escape(x_arah)} {x_konf if x_konf is not None else '-'}% · entry {fmt_harga(x_ent)} · "
                 f"kini <b>GAGAL DIAMBIL</b> (semua sumber emas padam detak ini)")
        L.append("<i>XAU tetap WAJIB — harga dicoba lagi detak berikutnya; baris ini tidak pernah dihapus.</i>")
    L.append("")
    if harga_map and (sumber_harga in ("bybit+okx", "binance+futures+bybit/okx")
                      or str(sumber_harga).startswith("rotasi:")):
        L.append(f"💱 Harga dari <b>{html.escape(sumber_harga)}</b> — rotasi multi-bursa / cadangan; beda tipis antar pasar wajar.")
    try:
        import ip_rotasi
        L.append(f"🛡️ PELINDUNG IP: <b>{html.escape(ip_rotasi.status_ringkas())}</b> — 1 IP sandbox + rotasi 8 sumber = praktis tak tergantung 1 pintu.")
    except Exception:
        pass
    # ---- section OTAK Z.AI (persis seperti web) ----
    if zai_picks:
        seg_z = "live dari web" if zai_hidup else "CACHE (web sedang tak terjangkau)"
        z_reg = (zai_snap or {}).get("regime") or "?"
        z_an = (zai_snap or {}).get("dianalisa") or "?"
        z_lh = (zai_snap or {}).get("lahir") or "?"
        z_tot = (zai_snap or {}).get("total") or len(zai_picks)
        # V303 DATA-FRESH — kejujuran tanggal: data hari ini atau tidak
        hari_data = (zai_snap or {}).get("hariData")
        lag_d = (zai_snap or {}).get("lag")
        stale_d = (zai_snap or {}).get("stale")
        if lag_d == 0 and not stale_d and hari_data:
            fresh = f"📅 FRESH: data <b>{html.escape(str(hari_data))}</b> = hari ini (lag 0, tidak stale)"
        elif hari_data:
            fresh = (f"⚠️ DATA: hari {html.escape(str(hari_data))} · lag {lag_d} hari"
                     + (" · STALE" if stale_d else ""))
        else:
            fresh = "⚠️ DATA: tanggal data tidak tersedia (saya akui jujur)"
        L.append(f"🧠 <b>SASARAN OTAK Z.AI</b> — sumber SAMA dengan web ({seg_z})")
        L.append(fresh)
        L.append(f"Regim pasarnya: <b>{html.escape(str(z_reg))}</b> · {z_an} koin dianalisa · "
                 f"{z_lh} pilihan lahir hari ini · menampilkan {min(ZAI_TAMPIL, len(zai_picks))} teratas dari {z_tot} sasaran "
                 f"(100 koin + XAU wajib 🥇 di atas; urut keyakinan)")
        for i, p in enumerate(zai_picks[:ZAI_TAMPIL], 1):
            basis = _basis_simbol(p["simbol"]) or p["simbol"]
            h = xau_h if p["simbol"] == "XAUUSDT" else harga_map.get(basis)
            ent = p.get("entry")
            jarak = f"{(h / ent - 1) * 100:+.2f}%" if (h and ent) else "-"
            def _lvl(v, ent=ent):
                if not isinstance(v, (int, float)) or v <= 0:
                    return "-"
                pc = f" ({(v / ent - 1) * 100:+.1f}%)" if ent else ""
                return f"{fmt_harga(v)}{pc}"
            L.append(f"{i}. <b>{html.escape(basis)}</b> {html.escape(str(p.get('arah')))} "
                     f"{p.get('keyakinan', '-')}% · kini <b>{fmt_harga(h)}</b> ({jarak})")
            L.append(f"&nbsp;&nbsp;entry {fmt_harga(ent)} · 🎯TP {_lvl(p.get('target'))} · "
                     f"🔥AMB {_lvl(p.get('ambisius'))} · ⚡MAX {_lvl(p.get('powermax'))} · 🛑STOP {_lvl(p.get('stop'))}")
        L.append("<i>V303: koin teratas WAJIB 6 field (entry, kini, TP, Jual Ambisius, Power Max, Stop). "
                 "Daftar 100 penuh ada di web; sasaran otak SERVER ada di bawah.</i>")
        L.append("")
        # V304 DAFTAR KEDUA — PELUANG PROFIT TERBESAR (mandat pemilik 27 Okt):
        # urutan murni besaran % profit ke Jual Ambisius, dari seluruh 100 koin.
        pel = daftar_peluang_profit(zai_picks, harga_map)
        if pel:
            L.append(f"💰 <b>PELUANG PROFIT TERBESAR</b> — urutan MURNI besaran % profit "
                     f"ke Jual Ambisius dari {len(zai_picks)} koin sasaran:")
            for i, (sim, arah, kini_p, amb, pct, pm, pm_pct) in enumerate(pel, 1):
                pm_s = (f" · ⚡MAX {fmt_harga(pm)} (+{pm_pct:.0f}%)"
                        if isinstance(pm, (int, float)) and pm > 0 and pm_pct and pm_pct > 0 else "")
                L.append(f"{i}. <b>{html.escape(str(sim))}</b> ({html.escape(arah)}) "
                         f"kini {fmt_harga(kini_p)} → 🔥 {fmt_harga(amb)} <b>+{pct:.1f}%</b>{pm_s}")
            L.append("<i>Kriteria daftar ini murni seberapa BESAR % profitnya "
                     "(contoh: ambisius +50% = juara) — bukan seberapa mungkin tercapai. "
                     "Daftar teratas menurut keyakinan tetap di atas.</i>")
            L.append("")
    else:
        L.append("🧠 Otak z.ai (web): <b>tak terjangkau detak ini dan tak ada cache</b> — saya akui jujur.")
        L.append("")
    if kejadian:
        L.append(f"🚨 <b>PANTAUAN SASARAN — {len(kejadian)} kejadian baru:</b>")
        for sim, arah, level_nama, level_nilai, harga, entry, pertama in kejadian:
            L.append(label_sentuh(sim, arah, level_nama, level_nilai, harga, entry, pertama))
        L.append("")
        L.append("<i>TP sasaran ≠ Jual Ambisius ≠ Power Max — tiga level berbeda, tiga keputusan berbeda.</i>")
        L.append("")

    if sasaran:
        sik = sasaran.get("siklus", "?")
        umur_s = umur_jam(sasaran.get("dihasilkan"))
        rb = sasaran.get("rezimBTC") or {}
        a_raw = sasaran.get("akurasi")
        if isinstance(a_raw, dict):
            akur = a_raw.get("akurasiPct")
            net_k = a_raw.get("netKumulatifPct")
        else:
            try:
                akur, net_k = float(a_raw), None
            except (TypeError, ValueError):
                akur, net_k = None, None
        segar = "live" if sasaran_hidup else "cache"
        L.append(f"📡 <b>Otak SERVER</b> (penjaga repo Micaprofita-, {segar}): denyut siklus {sik}"
                 + (f" · {umur_s:.0f} jam lalu" if umur_s is not None else ""))
        L.append(f"🎯 Rezim BTC: <b>{html.escape(str(rb.get('rezim', '?')))}</b> "
                 f"@ {fmt_harga(rb.get('harga'))} · ATR {rb.get('atrPct', '-')}%")
        if akur is not None:
            baris_a = f"📊 Akurasi terkunci: <b>{float(akur):.1f}%</b>"
            if net_k is not None:
                baris_a += f" · net kumulatif {float(net_k):+.1f}%"
            baris_a += f" · {n_dipantau} sasaran server + {len(zai_picks)} sasaran arena dipantau TP/Ambisius/PowerMax"
            L.append(baris_a)
    if denyut:
        uw = denyut.get("waktu") or denyut.get("dihasilkan")
        umur_d = umur_jam(uw)
        if umur_d is not None:
            status_d = "HIDUP ✅" if umur_d < 1.5 else f"<b>terhenti {umur_d:.0f} jam</b> ⚠️"
            L.append(f"💓 Denyut otak: {status_d} ({umur_d * 60:.0f} menit lalu)")
    if terbaru_iso:
        umur_g = umur_jam(terbaru_iso)
        L.append(f"🧬 <b>Genome</b>: terakhir tumbuh {umur_g / 24:.0f} hari lalu "
                 f"(generasi {gen_maks}, {total_belajar} pembelajaran)"
                 + (" — <b>STAGNAN, saya mengakunya</b>" if umur_g > 24 * 7 else ""))
    L.append(f"🚨 Gagal kirim 24 jam: {jumlah_gagal()}")
    L.append("")
    if terbaru_iso and umur_jam(terbaru_iso) > 24 * 7:
        L.append(f"Klaim jujur: genome saya belum bertumbuh {umur_jam(terbaru_iso) / 24:.0f} hari — "
                 "saya mengakunya, dan membangunkannya adalah tugas saya berikutnya. "
                 "<b>Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari.</b>")
    else:
        L.append("<b>Klaim jujur: saya akan terus berkembang menjadi master pasar; "
                 "profit adalah yang saya pelajari.</b>")
    L.append("— detak berikutnya ± 30 menit")

    text = "\n".join(L)
    hasil = {"ok": False, "err": None, "message_id": None}
    try:
        resp = kirim_telegram(token, chat_id, text)
        hasil["ok"] = bool(resp.get("ok"))
        if hasil["ok"]:
            hasil["message_id"] = resp["result"]["message_id"]
        else:
            hasil["err"] = str(resp)
    except Exception as e:
        hasil["err"] = repr(e)

    with open(F_LAST, "w", encoding="utf-8") as f:
        f.write(str(now))
    if not hasil["ok"]:
        with open(F_FAIL, "a", encoding="utf-8") as f:
            f.write(f"{now}|{hasil['err']}\n")
    elif gap_menit is not None and gap_menit > GAP_MATI_MENIT:
        try:
            with open(os.path.join(DATA, "death_journal.jsonl"), "a", encoding="utf-8") as f:
                f.write(json.dumps({
                    "waktu": datetime.now(timezone.utc).isoformat(),
                    "peristiwa": "PULIH",
                    "gap_menit": round(gap_menit, 1),
                    "lapis_penjinak": "denyut-tubuh",
                    "message_id": hasil["message_id"]}, ensure_ascii=False) + "\n")
        except Exception:
            pass

    # ---- jembatan: tanam snapshot otak z.ai ke Rantaian utk lapis abadi ----
    status_bridge = taman_zai_ke_rantaian(zai_snap)

    print("KIRIM:", f"OK message_id={hasil['message_id']}" if hasil["ok"] else f"GAGAL {hasil['err']}")
    print("GAP_MENIT:", f"{gap_menit:.1f}" if gap_menit is not None else "pertama")
    print("ZAI_HIDUP:", zai_hidup, "| ZAI_PICKS:", len(zai_picks), "| JEMBATAN:", status_bridge)
    print("SASARAN_DIPANTAU:", n_dipantau, "| HARGA_TERSEDIA:", len(harga_map))
    print("KEJADIAN:", len(kejadian))
    print("SASARAN_HIDUP:", sasaran_hidup, "| GENOME_HIDUP:", genome_hidup, "| DENYUT_HIDUP:", denyut_hidup)
    if sasaran:
        a_raw = sasaran.get("akurasi")
        a_val = a_raw.get("akurasiPct") if isinstance(a_raw, dict) else a_raw
        print("SIKLUS:", sasaran.get("siklus"), "| AKURASI:", a_val)
    if terbaru_iso:
        print("GENOME_UMUR_HARI:", f"{umur_jam(terbaru_iso) / 24:.1f}")
    return 0 if hasil["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
