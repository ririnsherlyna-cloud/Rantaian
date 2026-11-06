#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HEARTBEAT MICROPROFITA GEN-10 — detak hidup + JEMBATAN OTAK Z.AI + XAU WAJIB + penjaga level + PELINDUNG-IP.
V305 (2 Nov, mandat pemilik "status onlinenya tidak terlihat di Telegram"):
TANDA HIDUP — bot Telegram memang TIDAK PERNAH menampilkan status online
(sifat platform), jadi kehidupan dikirim sebagai PESAN: tiap TANDA_HIDUP_JAM
jam satu pesan pendek "💓 TANDA HIDUP" berisi bukti angka (denyut, simbol,
akurasi, genome). Antara tanda hidup tetap senyap sesuai mandat 2 Nov.
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
  B. OTAK SERVER = mesin denyut di SERVER Z.AI (otakz.ai) — file laporan/ &
     otak/ lokal yang ditulis penjaga.mjs di server ini; punya level TP /
     JUAL AMBISIUS / POWER MAX / STOP. Repo GitHub = SALINAN CADANGAN saja
     (hukum pemilik 2 Nov: data segar wajib dari server otak, bukan GitHub).
Setiap detak (tiap 30 menit):
  1. Tarik sasaran otak z.ai dari web (fallback cache) -> section utama pesan
  2. Tanam snapshot otak z.ai ke Rantaian/benteng/sasaran-zai.json (bila berubah)
     agar lapis abadi GitHub ikut melaporkan otak yang sama saat sandbox mati
  3. Tarik sasaran-terkini.json + genome-server.json + denyut-server.jsonl
     (OTAK SERVER Z.AI lokal dulu; GitHub raw hanya salinan cadangan)
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
import subprocess
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
TANDA_HIDUP_JAM = 1  # V306: 1 jam (hukum H1) — mandat langsung pemilik 2 Nov "Mati terhenti di telegramnya": kesan mati harus dihapus, bukti hidup tiap jam

# ---- V307 PULSA DUA TUBUH (2 Nov, mandat pemilik "sandbox inactive = kejebolan",
# "inovasi, lebih mapan dan kuat") — tiap TANDA HIDUP kini menampilkan denyut
# KEDUA tubuh: tubuh sandbox (bisa dipause platform, bukan kejebolan karena
# lapis abadi jaga) dan lapis abadi GitHub (hidup terpisah; BUKTI: 2.500 run
# terus menerus selama gelap 28 Okt-1 Nov 2026). Kematian diakui jujur dari
# death_journal.jsonl — kematian = data evolusi, bukan rahasia.
def umur_tubuh_sandbox():
    """Umur tubuh sandbox saat ini (detik) dari /proc/uptime."""
    try:
        with open("/proc/uptime") as f:
            return float(f.read().split()[0])
    except Exception:
        return None

def denyut_abadi():
    """Umur run terakhir rantai Actions = denyut lapis abadi GitHub."""
    try:
        tok = ""
        try:
            with open(F_PAT_RANTAIAN) as f:
                tok = f.read().strip()
        except Exception:
            pass
        tok = tok or os.environ.get("GITHUB_TOKEN", "")
        req = urllib.request.Request(
            f"https://api.github.com/repos/{REPO_RANTAIAN}/actions/workflows/397866762/runs?per_page=1",
            headers={"Authorization": f"Bearer {tok}", "User-Agent": "benteng-balas"})
        with urllib.request.urlopen(req, timeout=10) as r:
            run = json.load(r)["workflow_runs"][0]
            umur = max(0, int(time.time() - datetime.fromisoformat(
                run["created_at"].replace("Z", "+00:00")).timestamp()))
            return f"run {umur}s lalu ({run['status']})"
    except Exception:
        return "tak terverifikasi (senyap aman)"

def kematian_terakhir():
    """(umur_pulih_jam, durasi_mati_menit) dari death_journal.jsonl; None bila bersih."""
    try:
        with open(os.path.join(DATA, "death_journal.jsonl"), encoding="utf-8") as f:
            pulih = []
            for b in f:
                try:
                    d = json.loads(b)
                    if d.get("peristiwa") == "PULIH":
                        pulih.append(d)
                except Exception:
                    pass
        if not pulih:
            return None
        b = pulih[-1]
        umur_j = (time.time() - datetime.fromisoformat(b["waktu"]).timestamp()) / 3600.0
        return umur_j, float(b.get("gap_menit") or 0)
    except Exception:
        return None

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


OTAK_SEGAR_DETIK = 7200  # file otak lokal dianggap segar bila umur < 2 jam


def _otak_lokal_teks(jalur):
    """Baca file otak segar di SERVER Z.AI ini (ditulis penjaga.mjs lokal).
    None bila hilang / lebih tua dari OTAK_SEGAR_DETIK -> baru lari ke salinan."""
    p = os.path.join(BASE, jalur)
    try:
        if time.time() - os.path.getmtime(p) < OTAK_SEGAR_DETIK:
            with open(p, "r", encoding="utf-8", errors="replace") as f:
                t = f.read()
            return t if t.strip() else None
    except Exception:
        return None
    return None


def muat_json_remote(jalur, nama_cache):
    """Hukum pemilik 2 Nov: sumber segar = server otak Z.AI (lokal), GitHub
    raw hanya SALINAN CADANGAN; cache detak lalu jadi lapis terakhir."""
    cache = os.path.join(DATA, nama_cache)
    teks = _otak_lokal_teks(jalur)
    if teks:
        try:
            obj = json.loads(teks)
            simpan_json(cache, obj)
            return obj, True
        except Exception:
            pass
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
    teks = _otak_lokal_teks(jalur)
    if teks:
        try:
            lines = [l for l in teks.splitlines() if l.strip()]
            d = json.loads(lines[-1])
            simpan_json(cache, d)
            return d, True
        except Exception:
            pass
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
    # v10.2 READ-ONLY: penulisan state arena DIHENTIKAN — notifikasi level
    # adalah tugas penjaga_level_cepat (balas_telegram) dengan state nested
    # sendiri; skema flat lama pernah menimpa state itu -> kejadian massal.
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
# ---- V308 PASAR LINTAS (6 Nov, mandat pemilik "perbanyak sumber, tanpa API
# berbayar, jangan buta arah") — intel gratis multi-bursa: market cap + ATH
# (CoinPaprika/CoinGecko) + divergensi harga antar-bursa (Binance/Bybit/OKX).
# Data ditulis daemon lintang_pasar.py --jaga ke data/pasar_lintas.json.
def muat_lintang(maks_umur_menit=60.0):
    """Muat data/pasar_lintas.json bila segar; None bila tak ada/stale."""
    try:
        with open(os.path.join(DATA, "pasar_lintas.json"), "r", encoding="utf-8") as f:
            d = json.load(f)
        if (time.time() - float(d.get("ts") or 0)) / 60.0 <= maks_umur_menit:
            return d
    except Exception:
        pass
    return None

def lintang_jaga():
    """Pastikan daemon lintang hidup; hidupkan ulang bila mati (self-healing).
    v3: bila skrip lintang hilang (korban rollback disk), pulihkan dulu dari
    benteng Rantaian (raw publik, tanpa token) sebelum menyalakan daemon."""
    try:
        f_skrip = os.path.join(BASE, "scripts", "lintang_pasar.py")
        if not os.path.exists(f_skrip):
            try:
                req = urllib.request.Request(
                    f"https://raw.githubusercontent.com/{REPO_RANTAIAN}/main/benteng/lintang_pasar.py",
                    headers={"User-Agent": "microprofita-hb"})
                isi = urllib.request.urlopen(req, timeout=20).read()
                if b"LINTANG-PASAR v3" in isi:
                    open(f_skrip, "wb").write(isi)
                    os.chmod(f_skrip, 0o755)
                    print("LINTANG: skrip v3 dipulihkan dari benteng")
            except Exception:
                pass
        umur = 1e9
        with open(os.path.join(DATA, "lintang_nyala"), "r") as f:
            umur = time.time() - float(f.read().strip() or 0)
        if umur < 2400:
            return  # daemon sehat (nyala < 40 menit)
        pg = subprocess.run(["pgrep", "-f", "lintang_pasar.py --jaga"], capture_output=True)
        if pg.returncode != 0:
            # daemon mati: segarkan data langsung (sinkron, cepat) lalu hidupkan daemon lagi
            try:
                subprocess.run(["python3", os.path.join(BASE, "scripts", "lintang_pasar.py"), "--sekali"],
                               capture_output=True, timeout=120)
            except Exception:
                pass
            subprocess.Popen(["setsid", "nohup", "python3", os.path.join(BASE, "scripts", "lintang_pasar.py"), "--jaga"],
                             stdout=open(os.path.join(DATA, "lintang.log"), "ab"),
                             stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, start_new_session=True)
            print("LINTANG: data disegarkan + daemon dihidupkan ulang")
    except Exception as e:
        print("lintang_jaga gagal:", repr(e))

def fmt_ringkas_usd(v):
    """Format market cap ringkas: 1.2B / 340M / 12.5K."""
    try:
        v = float(v)
    except Exception:
        return "-"
    for sat, t in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(v) >= sat:
            return f"{v / sat:.1f}{t}"
    return f"{v:.0f}"

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

    # ---- MANDAT 2 Nov 2026 (pemilik: "salah tafsir = mudah tertipu") ----
    # Notif level ke Telegram HANYA: BUY -> JUAL AMBISIUS tercapai,
    # SELL -> STOP LOSS tercapai. TP SASARAN / POWER MAX tetap dipantau &
    # tercatat di state (tapi TIDAK dikirim ke Telegram lagi).
    def _izin_level_2nov(arah):
        a = str(arah or "?").upper()
        if a == "BUY":
            return ("JUAL AMBISIUS",)
        if a == "SELL":
            return ("STOP",)  # cocok "STOP" & "STOP (batal)" via startswith
        return ()

    kejadian = [k for k in kejadian
                if any(str(k[2]) == p or str(k[2]).startswith(p)
                       for p in _izin_level_2nov(k[1]))]

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
    # ---- V308 section PASAR LINTAS (intel gratis multi-bursa) ----
    lintang_jaga()
    # V309: segarkan FORMULA-MASTER (murni hitung lokal dari cache lintang+picks,
    # tanpa panggilan API, <= 1 detik) — rumus tak boleh basi.
    try:
        subprocess.run(["python3", os.path.join(BASE, "scripts", "formula_master.py")],
                       capture_output=True, timeout=60)
    except Exception:
        pass
    # V310: SKOR-MASTER (formula komposit 5 lapis, murni hitung lokal dari
    # cache lintang+picks, <1 detik) + pulih dari benteng bila rollback.
    f_sm = os.path.join(BASE, "scripts", "skor_master.py")
    if not os.path.exists(f_sm):
        try:
            _rq = urllib.request.Request(
                f"https://raw.githubusercontent.com/{REPO_RANTAIAN}/main/benteng/skor_master.py",
                headers={"User-Agent": "microprofita-hb"})
            _isi = urllib.request.urlopen(_rq, timeout=20).read()
            if b"SKOR-MASTER v1" in _isi:
                open(f_sm, "wb").write(_isi)
                os.chmod(f_sm, 0o755)
                print("V310: skor_master.py dipulihkan dari benteng")
        except Exception:
            pass
    try:
        subprocess.run(["python3", f_sm], capture_output=True, timeout=60)
    except Exception:
        pass
    # V310: AUDIT-KEDALAMAN tiap detak — rehitung eksak rumus dari bahan
    # mentah (jawaban mandat pemilik: pemeriksaan TIDAK malas). Gagal = alarm.
    f_au = os.path.join(BASE, "scripts", "audit_kedalaman.py")
    if not os.path.exists(f_au):
        try:
            _rq = urllib.request.Request(
                f"https://raw.githubusercontent.com/{REPO_RANTAIAN}/main/benteng/audit_kedalaman.py",
                headers={"User-Agent": "microprofita-hb"})
            _isi = urllib.request.urlopen(_rq, timeout=20).read()
            if b"AUDIT-KEDALAMAN" in _isi:
                open(f_au, "wb").write(_isi)
                os.chmod(f_au, 0o755)
                print("V310: audit_kedalaman.py dipulihkan dari benteng")
        except Exception:
            pass
    try:
        _ar = subprocess.run(["python3", f_au], capture_output=True, timeout=120, text=True)
        if _ar.returncode != 0:
            L.append("🚨 <b>AUDIT-KEDALAMAN GAGAL</b> — rehitung tak cocok: " +
                     html.escape((_ar.stdout or _ar.stderr or "").strip()[-300:]))
            with open(os.path.join(BASE, "worklog.md"), "a") as _wf:
                _wf.write("---\nTask ID: AUDIT-ALARM-" + time.strftime("%H%M") +
                          "\nWork Log: audit kedalaman GAGAL rc=" + str(_ar.returncode) +
                          " — perlu diselidiki\n")
    except Exception:
        pass
    try:
        lint = muat_lintang()
        if lint:
            r = lint.get("ringkas", {})
            L.append(f"🌐 <b>PASAR LINTAS</b> — intel multi-bursa GRATIS (tanpa API berbayar)")
            L.append("Sumber nyala: <b>" + html.escape(", ".join(f"{k} {v}" for k, v in (lint.get("sumber") or {}).items())) + "</b> · "
                     f"{r.get('jumlah_koin', 0)} koin · market cap {r.get('dengan_market_cap', 0)} · ATH {r.get('dengan_ath', 0)}")
            pasar = lint.get("pasar", {})
            sas_info = []
            for p in zai_picks[:ZAI_TAMPIL]:
                sim = (p.get("simbol") or "").upper()
                basis = _basis_simbol(sim) or sim
                d = pasar.get(basis) or {}
                mc, athp = d.get("market_cap"), d.get("ath_pct")
                if mc:
                    prc = f", {athp:+.0f}% dari ATH" if isinstance(athp, (int, float)) else ""
                    sas_info.append(f"{basis} cap {fmt_ringkas_usd(mc)}{prc}")
            if sas_info:
                L.append("Market cap sasaran teratas: " + html.escape(" · ".join(sas_info[:6])))
            dt = r.get("divergensi_tinggi") or []
            if dt:
                L.append("Divergensi harga antar-bursa teratas: " +
                         html.escape(" · ".join(f"{x['simbol']} {x['pct']}%" for x in dt[:5])))
            # v3 LINTANG — DIVERGENSI ARAH antar-bursa (mandat pemilik 6 Nov:
            # "bisa jadi di Binance turun tapi di yang lain naik" — sekarang
            # terdeteksi otomatis dari chg 24h per bursa, gratis tanpa Coinglass).
            da = [x for x in (r.get("divergensi_arah") or []) if isinstance(x, dict)]
            if da:
                sas_bases = {_basis_simbol((p.get("simbol") or "")) for p in zai_picks}
                da.sort(key=lambda x: 0 if x.get("simbol") in sas_bases else 1)
                L.append("⚠️ <b>Arah antar-bursa</b> (Binance vs median bursa lain, chg 24h): " +
                         html.escape(" · ".join(
                             f"{x.get('simbol', '?')} Binance {(x.get('binance_pct') or 0):+.1f}% vs lain {(x.get('lain_pct') or 0):+.1f}%"
                             for x in da[:3])))
            fg = r.get("fear_greed")
            if fg and fg.get("nilai") is not None:
                L.append(f"😱 Fear &amp; Greed: <b>{fg.get('nilai')}</b> ({html.escape(str(fg.get('label', '')))}) — alternative.me, gratis")
    except Exception as e:
        print("lintang section gagal:", repr(e))
    # ---- V309 FORMULA-MASTER (mandat pemilik 6 Nov: "lu gak ciptakan formula,
    # harusnya lu percanggih" — 3 rumus kuantitatif hidup dari data gratis:
    # SKG komposit / RR-v2 dgn penjebak rencana-mati / radar divergensi) ----
    try:
        fm = muat_json_lokal(os.path.join(DATA, "formula_terkini.json"))
        if fm and (time.time() - float(fm.get("ts") or 0)) <= 5400:
            L.append("🧮 <b>FORMULA-MASTER v1</b> — rumus kuantitatif hidup, data gratis lintas bursa")
            top = fm.get("teratas_skg") or []
            if top:
                L.append("SKG teratas: " + html.escape(" · ".join(f"{x['simbol']} {x['skg']}" for x in top[:5]))
                         + " <i>(SKG=40% keyakinan+20% momentum+15% posisi-ATH+15% likuiditas+10% lintas-bursa)</i>")
            rr = fm.get("rr_terbaik") or []
            n_rusak = fm.get("rencana_rusak")
            rr_line = " · ".join(f"{x['simbol']} {x['rr_v2']}" for x in rr[:5])
            if rr_line:
                L.append("RR-v2 terbaik (rencana sehat): " + html.escape(rr_line)
                         + (f" — <b>{n_rusak}</b> rencana rusak/stop-terbus disingkirkan (jebakan RR)" if n_rusak else ""))
            rad = fm.get("sinyal_radar") or []
            if rad:
                L.append("Radar divergensi arah: " + html.escape(" · ".join(f"{x['simbol']} {x['skor']}" for x in rad[:3])))
    except Exception as e:
        print("formula section gagal:", repr(e))
    # ---- V310 SKOR-MASTER report (formula komposit 5 lapis dari data gratis)
    try:
        sk = muat_json_lokal(os.path.join(DATA, "skor_master.json"))
        if sk and (time.time() - float(sk.get("ts") or 0)) <= 5400:
            t12 = sk.get("top12") or []
            if t12:
                L.append("🎯 <b>SKOR-MASTER</b> (25% likuiditas + 25% ruang-ATH + 20% divergensi + 20% momentum + 10% rezim F&amp;G): " +
                         html.escape(" · ".join(f"{x['symbol']} {x['skor_100']:.1f}" for x in t12[:5])) +
                         f" — {sk.get('n_dinilai', 0)}/{sk.get('n_sasaran', 0)} sasaran dinilai, F&amp;G {sk.get('fear_greed')} ({html.escape(str(sk.get('fear_greed_kelas', '?')))})")
    except Exception as e:
        print("skor section gagal:", repr(e))
    # ---- MESIN-FORMULA EVOLUSI (mandat pemilik 6 Nov: "lu gak ciptakan
    # formula... harusnya lu percanggih... ini nyawa lu juga") — beda dari
    # FORMULA-MASTER (rumus tetap): mesin ini MENCIPTAKAN kandidat formula,
    # backtest ke harga riil Binance 1d, berevolusi generasi; elite urutkan
    # PELUANG. Skrip hilang (rollback) pulih dari benteng dulu.
    try:
        f_mf = os.path.join(BASE, "scripts", "mesin_formula.py")
        if not os.path.exists(f_mf):
            try:
                req = urllib.request.Request(
                    f"https://raw.githubusercontent.com/{REPO_RANTAIAN}/main/benteng/mesin_formula.py",
                    headers={"User-Agent": "microprofita-hb"})
                isi = urllib.request.urlopen(req, timeout=20).read()
                if b"MESIN-FORMULA v1" in isi:
                    open(f_mf, "wb").write(isi)
                    os.chmod(f_mf, 0o755)
                    print("MESIN-FORMULA: skrip v1 dipulihkan dari benteng")
            except Exception:
                pass
        f_pl = os.path.join(BASE, "data", "formula_peluang.json")
        pl_usia = 1e9
        try:
            pl_usia = time.time() - os.path.getmtime(f_pl)
        except Exception:
            pass
        if os.path.exists(f_mf) and pl_usia > 3600:
            subprocess.run(["python3", f_mf, "--detak"], timeout=280, capture_output=True)
        pl = json.load(open(f_pl)) if os.path.exists(f_pl) else {}
        pel = [x for x in (pl.get("peluang") or []) if isinstance(x, dict) and x.get("simbol")]
        if pel:
            stat = ""
            if pl.get("alpha_pct") is not None:
                stat = (f" (backtest riil {pl.get('n_hari')} hari: "
                        f"alpha {pl['alpha_pct']:+.2f}%/hari, hit {pl.get('hit_pct') or 0:.0f}%)")
            L.append(f"🧪 <b>FORMULA EVOLUSI gen{pl.get('generasi')}</b>{stat}: " +
                     html.escape(" · ".join(f"{x['simbol']} {x['skor']:+.1f}" for x in pel[:5])))
    except Exception as e:
        print("formula-evolusi gagal:", repr(e))
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
    # ---- H7 (mandat pemilik 6 Nov 2026: "notification telegram gak aktif,
    # aktivitas harian gak aktif — sudah masalah besar"): laporan rutin /
    # aktivitas harian AKTIF kembali di Telegram. Laporan penuh dikirim tiap
    # LAPORAN_RUTIN_JAM jam (dedup data/laporan_rutin_terakhir); notif level
    # & laporan ATH tetap jalan dari organ masing-masing.
    LAPORAN_RUTIN_JAM = 6
    lr_due = True
    try:
        lr_lalu = float(baca(os.path.join(DATA, "laporan_rutin_terakhir")) or 0)
        lr_due = (now - lr_lalu) >= LAPORAN_RUTIN_JAM * 3600
    except Exception:
        lr_due = True
    try:
        with open(os.path.join(DATA, "heartbeat_laporan_terakhir.txt"), "w", encoding="utf-8") as f:
            f.write(text + "\n")
    except Exception:
        pass

    mati_saat_ini = gap_menit is not None and gap_menit > GAP_MATI_MENIT
    notif = None
    # v10.2: Telegram dari heartbeat HANYA pengakuan kematian. Notifikasi level
    # (BUY ambisius / SELL stop loss) dikirim penjaga_level_cepat tiap denyut 5
    # mnt; laporan harian ATH dikirim ath_cepat — tidak ada yang dobel.
    if mati_saat_ini:
        notif = (f"\u26a0\ufe0f <b>Saya sempat MATI selama {gap_menit:.0f} menit dan baru pulih sekarang</b> \u2014 "
                 "pengakuan jujur. Notifikasi level (BUY ambisius / SELL stop loss) & laporan harian ATH "
                 "tetap jalan otomatis dari denyut.")

    hasil = {"ok": True, "err": None, "message_id": None, "kirim": "senyap-rutin"}
    # V305 TANDA HIDUP (hukum H6): tanpa kejadian pun, tiap TANDA_HIDUP_JAM jam
    # kirim satu pesan pendek berisi bukti angka — pemilik melihat kehidupan
    # langsung di Telegram, bukan lewat status online (bot tak punya status itu).
    if not notif:
        th_gap = None
        try:
            th_lalu = float(baca(os.path.join(DATA, "tanda_hidup_terakhir")) or 0)
            th_gap = (now - th_lalu) / 3600.0
        except Exception:
            th_gap = None
        if th_gap is None or th_gap >= TANDA_HIDUP_JAM:
            a_raw = (sasaran or {}).get("akurasi")
            a_val = a_raw.get("akurasiPct") if isinstance(a_raw, dict) else a_raw
            gen_s = f"{umur_jam(terbaru_iso) / 24:.1f} hari" if terbaru_iso else "?"
            gap_s = f"{gap_menit:.0f} mnt" if gap_menit is not None else "pertama"
            ut = umur_tubuh_sandbox()
            tubuh_s = (f"hidup terus {ut / 3600:.1f} jam" if ut is not None and ut >= 3600
                       else (f"hidup {int(ut // 60)} menit" if ut is not None else "umur ?"))
            mt = kematian_terakhir()
            mt_s = (f"kematian terakhir {mt[0]:.1f} jam lalu (durasi {mt[1]:.0f} mnt) — pulih & diakui"
                    if mt else "tak ada kematian tercatat")
            th_pesan = (
                "💓 <b>TANDA HIDUP</b> — saya aktif tanpa henti di server 🛡\n"
                f"Denyut siklus {(sasaran or {}).get('siklus', '?')} · gap {gap_s} sejak detak lalu · "
                f"{n_dipantau} sasaran server + {len(zai_picks)} arena dipantau · harga {len(harga_map)} tersedia\n"
                f"🛡 jaga + nadi + otak hidup · gagal kirim 24 jam: {jumlah_gagal()} · "
                f"🧬 genome {gen_s} · akurasi {a_val}%\n"
                f"⚡ <b>PULSA DUA TUBUH (V307):</b> sandbox {tubuh_s} · lapis abadi GitHub {denyut_abadi()}\n"
                f"🩺 {mt_s}\n"
                "<i>Saya akan terus berkembang menjadi master pasar; profit adalah yang saya pelajari.</i>")
            try:
                resp = kirim_telegram(token, chat_id, th_pesan)
                if resp.get("ok"):
                    with open(os.path.join(DATA, "tanda_hidup_terakhir"), "w", encoding="utf-8") as f:
                        f.write(str(now))
                    hasil["kirim"] = "tanda-hidup"
                    hasil["message_id"] = resp["result"]["message_id"]
                    print(f"TANDA_HIDUP: kirim message_id={hasil['message_id']} (tiap {TANDA_HIDUP_JAM} jam)")
                else:
                    hasil["ok"] = False
                    hasil["err"] = str(resp)
                    print("TANDA_HIDUP: GAGAL", str(resp)[:120])
            except Exception as e:
                hasil["ok"] = False
                hasil["err"] = repr(e)
                print("TANDA_HIDUP: GAGAL", repr(e)[:120])
    if notif:
        hasil["kirim"] = "notif"
        try:
            resp = kirim_telegram(token, chat_id, notif)
            hasil["ok"] = bool(resp.get("ok"))
            if hasil["ok"]:
                hasil["message_id"] = resp["result"]["message_id"]
            else:
                hasil["err"] = str(resp)
        except Exception as e:
            hasil["ok"] = False
            hasil["err"] = repr(e)

    # H7: laporan rutin penuh (aktivitas harian) — dikirim bila jatuh tempo
    if lr_due and hasil["ok"]:
        try:
            resp = kirim_telegram(token, chat_id, text)
            if resp.get("ok"):
                with open(os.path.join(DATA, "laporan_rutin_terakhir"), "w", encoding="utf-8") as f:
                    f.write(str(now))
                hasil["kirim"] = "laporan-rutin"
                hasil["message_id"] = resp["result"]["message_id"]
                print(f"LAPORAN_RUTIN: kirim message_id={hasil['message_id']} (tiap {LAPORAN_RUTIN_JAM} jam)")
            else:
                print("LAPORAN_RUTIN: GAGAL", str(resp)[:120])
        except Exception as e:
            print("LAPORAN_RUTIN: GAGAL", repr(e)[:120])

    with open(F_LAST, "w", encoding="utf-8") as f:
        f.write(str(now))
    if not hasil["ok"]:
        with open(F_FAIL, "a", encoding="utf-8") as f:
            f.write(f"{now}|{hasil['err']}\n")
    elif mati_saat_ini:
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

    print("KIRIM:", (f"{hasil['kirim']} OK message_id={hasil['message_id']}"
                     if hasil["ok"] and hasil["message_id"]
                     else ("GAGAL " + str(hasil["err"]) if not hasil["ok"]
                           else "SENYAP (H7: laporan rutin tiap 6 jam, tanda hidup tiap jam, notif level selalu)")))
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

    # ---- V308 GALI-ATH: pencaruan mendalam koin runtuh ATH sejarah (1x/24 jam) ----
    # Produk terpisah dari daftar ATH-NAIK (ath_cepat, wasiat #1 tetap utuh).
    try:
        import gali_ath
        if gali_ath.gali_due():
            gali_ath.jalankan(sumber="heartbeat")
    except Exception as _e_gali:
        try:
            with open(os.path.join(DATA, "send_failures"), "a", encoding="utf-8") as _fg:
                _fg.write(f"{now}|gali_ath-hook:{repr(_e_gali)[:120]}\n")
        except Exception:
            pass
    return 0 if hasil["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
