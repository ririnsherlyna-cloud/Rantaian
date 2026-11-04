#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""PELINDUNG-IP (V304, mandat pemilik 27 Okt): mesin rotasi sumber harga agar
sistem tidak lagi bergantung pada SATU IP / SATU bursa.

Kenyataan yang jujur (ditulis di laporan pemilik):
  - sandbox hanya punya 1 egress IP; kita tidak bisa menggantinya sendiri.
  - jalan keluarnya DIVERSITAS: 8 sumber publik = 8 kelompok IP berbeda,
    diputar otomatis (round-robin + memori kesehatan per sumber).
  - slot PROXY POOL: pemilik tinggal menempel daftar proxy (mis. layanan
    rotating 500 IP) di data/proxy_pool.json {"aktif": true, "proxy": [...]}
    -> mesin ini langsung memutarnya; proxy gagal di-cooldown otomatis.
    Hanya proxy http/https yang didukung (socks dilewati dengan aman).

Peringatan kejujuran: proxy publik gratis berisiko mengacukan harga
(man-in-the-middle) -> untuk data trading, rotasi sumber resmi lebih aman
daripada proxy gratis acak.

Protokol sehat (anti-ban, bukan menembus ban):
  429/418 -> cooldown 10 menit; 403 -> cooldown 30 menit;
  gagal beruntun 3x -> cooldown 30 menit; sukses -> reset.
Semua sumber diambil TANPA parameter simbol (ticker penuh, filter lokal)
agar 1 simbol tak-valid tidak bisa membunuh batch (pelajaran HTTP 400).

State: data/sumber_state.json, data/proxy_state.json.
"""
import json
import os
import time
import urllib.error
import urllib.request

DATA = "/home/z/my-project/data"
STATE_SUMBER = os.path.join(DATA, "sumber_state.json")
STATE_PROXY = os.path.join(DATA, "proxy_state.json")
POOL_PATH = os.path.join(DATA, "proxy_pool.json")

COOLDOWN_429 = 600      # rate limit / ban sinyal Bybit-Binance
COOLDOWN_403 = 1800     # IP diblokir
COOLDOWN_BIASA = 90     # galat jaringan biasa
COOLDUN_BERUNTUN = 1800 # 3x gagal beruntun

HEAD = {"User-Agent": "microprofita-pelindung-ip/1.0"}


# ---------------- state ----------------
def _muat(path):
    try:
        with open(path) as f:
            j = json.load(f)
        return j if isinstance(j, dict) else {}
    except Exception:
        return {}


def _simpan(path, st):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(st, f)
    except Exception:
        pass


def _catat_ok(nama):
    st = _muat(STATE_SUMBER)
    st[nama] = {"gagal": 0, "cooldown_sampai": 0, "ok_terakhir": round(time.time())}
    _simpan(STATE_SUMBER, st)


def _catat_gagal(nama, kode):
    """kode: int status HTTP atau string galat."""
    st = _muat(STATE_SUMBER)
    e = st.get(nama) or {}
    gagal = int(e.get("gagal") or 0) + 1
    if kode == 429 or kode == 418:
        cd = COOLDOWN_429
    elif kode == 403:
        cd = COOLDOWN_403
    elif gagal >= 3:
        cd = COOLDUN_BERUNTUN
    else:
        cd = COOLDOWN_BIASA
    st[nama] = {"gagal": gagal, "cooldown_sampai": round(time.time() + cd),
                "ok_terakhir": e.get("ok_terakhir") or 0, "galat_terakhir": str(kode)[:80]}
    _simpan(STATE_SUMBER, st)


# ---------------- proxy pool (slot pemilik) ----------------
def _pool():
    j = _muat(POOL_PATH)
    if not j.get("aktif"):
        return []
    out = []
    for p in (j.get("proxy") or []):
        p = str(p).strip()
        if p and not p.startswith("socks"):  # socks butuh PySocks -> dilewati aman
            out.append(p)
    return out


def _proxy_siap():
    """Pool yang tidak sedang cooldown."""
    st = _muat(STATE_PROXY)
    now = time.time()
    siap = []
    for p in _pool():
        e = st.get(p) or {}
        if float(e.get("cooldown_sampai") or 0) <= now:
            siap.append(p)
    return siap


def _catat_proxy(p, ok):
    st = _muat(STATE_PROXY)
    e = st.get(p) or {}
    gagal = 0 if ok else int(e.get("gagal") or 0) + 1
    entri = {"gagal": gagal, "cooldown_sampai": 0 if ok else round(time.time() + COOLDUN_BERUNTUN)}
    if ok:
        entri["ok_terakhir"] = round(time.time())
    st[p] = entri
    _simpan(STATE_PROXY, st)


def _buka(url, timeout=25):
    """GET -> bytes. Lewati proxy pool bergilir bila ada; fallback langsung."""
    req = urllib.request.Request(url, headers=HEAD)
    siap = _proxy_siap()
    if not siap:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read()
    st = _muat(STATE_PROXY)
    awal = int(st.get("_penunjuk", 0))
    for i in range(min(3, len(siap))):
        p = siap[(awal + i) % len(siap)]
        try:
            opener = urllib.request.build_opener(
                urllib.request.ProxyHandler({"http": p, "https": p}))
            with opener.open(req, timeout=timeout) as r:
                isi = r.read()
            _catat_proxy(p, True)
            st = _muat(STATE_PROXY)
            st["_penunjuk"] = awal + i + 1
            _simpan(STATE_PROXY, st)
            return isi
        except Exception:
            _catat_proxy(p, False)
    # semua proxy gagal -> langsung (laporan tetap hidup, kejujuran > panik)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _get_json(url, timeout=25):
    return json.loads(_buka(url, timeout).decode())


# ---------------- 8 sumber publik (semua tanpa parameter simbol) ----------------
def _filter_usdt(pasangan_harga, bases):
    out = {}
    for sym, harga in pasangan_harga:
        if sym.endswith("USDT"):
            b = sym[:-4]
            if b in bases and b not in out:
                try:
                    v = float(harga)
                    if v > 0:
                        out[b] = v
                except (TypeError, ValueError):
                    continue
    return out


def s_binance(bases):
    host = ("https://data-api.binance.vision", "https://api.binance.com",
            "https://api-gcp.binance.com")
    for h in host:
        try:
            arr = _get_json(h + "/api/v3/ticker/price")
            return _filter_usdt([(x.get("symbol"), x.get("price")) for x in arr], bases)
        except urllib.error.HTTPError as e:
            if e.code in (403, 418, 429):
                continue
            raise
    return {}


def s_mexc(bases):
    arr = _get_json("https://api.mexc.com/api/v3/ticker/price")
    return _filter_usdt([(x.get("symbol"), x.get("price")) for x in arr], bases)


def s_bybit(bases):
    lst = ((_get_json("https://api.bybit.com/v5/market/tickers?category=spot")
            or {}).get("result") or {}).get("list") or []
    return _filter_usdt([(x.get("symbol"), x.get("lastPrice")) for x in lst], bases)


def s_okx(bases):
    lst = (_get_json("https://www.okx.com/api/v5/market/tickers?instType=SPOT")
           or {}).get("data") or []
    return _filter_usdt([(x.get("instId", "").replace("-", ""), x.get("last"))
                         for x in lst], bases)


def s_gate(bases):
    arr = _get_json("https://api.gateio.ws/api/v4/spot/tickers")
    return _filter_usdt([(x.get("currency_pair", "").replace("_", ""), x.get("last"))
                         for x in arr], bases)


def s_bitget(bases):
    lst = (_get_json("https://api.bitget.com/api/v2/spot/market/tickers")
           or {}).get("data") or []
    return _filter_usdt([(x.get("symbol"), x.get("lastPr") or x.get("last") or x.get("close"))
                         for x in lst], bases)


def s_kucoin(bases):
    lst = ((_get_json("https://api.kucoin.com/api/v1/market/allTickers")
            or {}).get("data") or {}).get("ticker") or []
    return _filter_usdt([(x.get("symbol", "").replace("-", ""), x.get("last"))
                         for x in lst], bases)


def s_binance_futures(bases):
    arr = _get_json("https://fapi.binance.com/fapi/v1/ticker/price")
    return _filter_usdt([(x.get("symbol"), x.get("price")) for x in arr], bases)


SUMBER = {
    "binance": s_binance,
    "bybit": s_bybit,
    "okx": s_okx,
    "mexc": s_mexc,
    "gate": s_gate,
    "bitget": s_bitget,
    "kucoin": s_kucoin,
    "binance-futures": s_binance_futures,
}


# ---------------- rotasi ----------------
def urutan_sehat():
    """Round-robin mulai dari penunjuk global; sumber cooldown ditaruh belakang."""
    st = _muat(STATE_SUMBER)
    now = time.time()
    nama = list(SUMBER)
    siap = [n for n in nama if float((st.get(n) or {}).get("cooldown_sampai") or 0) <= now]
    dingin = [n for n in nama if n not in siap]
    idx = int(st.get("_penunjuk", 0)) % len(siap) if siap else 0
    st["_penunjuk"] = idx + 1
    _simpan(STATE_SUMBER, st)
    return siap[idx:] + siap[:idx] + dingin


def batch_harga(bases):
    """Kembalikan (map {basis: harga}, label, statistik-ringkas).
    Mengumpulkan dari banyak sumber sampai semua basis ketemu."""
    bases = set(bases or [])
    if not bases:
        return {}, "rotasi:kosong", "tidak ada sasaran"
    out, pakai, galat = {}, [], []
    t0 = time.time()
    for nama in urutan_sehat():
        if len(out) >= len(bases):
            break
        try:
            m = SUMBER[nama](bases - set(out))
            _catat_ok(nama)
            if m:
                out.update(m)
                pakai.append(nama)
        except urllib.error.HTTPError as e:
            _catat_gagal(nama, e.code)
            galat.append(f"{nama}:{e.code}")
        except Exception as e:
            _catat_gagal(nama, repr(e))
            galat.append(f"{nama}:{repr(e)[:40]}")
    label = "rotasi:" + ("+".join(pakai) if pakai else "padam")
    stat = f"{len(out)}/{len(bases)} simbol dari {len(pakai)} sumber dalam {time.time() - t0:.1f}s"
    if galat:
        stat += " | " + "; ".join(galat[:3])
    return out, label, stat


def status_ringkas():
    """Satu baris untuk laporan Telegram."""
    st = _muat(STATE_SUMBER)
    now = time.time()
    siap = sum(1 for n in SUMBER if float((st.get(n) or {}).get("cooldown_sampai") or 0) <= now)
    pool = _pool()
    ps = _proxy_siap()
    return (f"{siap}/{len(SUMBER)} sumber siap · rotasi ON · "
            f"proxy {len(ps)}/{len(pool)}")


if __name__ == "__main__":
    m, s, stat = batch_harga({"BTC", "ETH", "XAU", "SOL"})
    print("UJI:", s, "|", stat)
    print("sampel:", {k: m[k] for k in list(m)[:4]})
    print("STATUS:", status_ringkas())
