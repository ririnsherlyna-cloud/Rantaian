#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Patch v10 (mandat pemilik 2 Nov 2026):
- ath_cepat diganti: universe LUAS (ribuan koin CoinPaprika paging), drop ATH
  80..100%, tanda hidup (volume/perputaran/gerak harga/OI Binance futures),
  kirim kapan pun denyut menyala (dedup harian tetap), + mode dry untuk uji.
- Penanda v7/v8 TIDAK disentuh (protokol RESPON/WD tetap sah).
"""
import re, shutil, sys

F = "/home/z/my-project/scripts/balas_telegram.py"
BAK = "/home/z/my-project/scripts/balas_telegram.py.bak-v9"
shutil.copy2(F, BAK)

src = open(F, encoding="utf-8").read()

MULAI = src.index("def ath_cepat(")
AKHIR = src.index("\n\ndef jalankan(")

BARU = '''def ath_cepat(token, paksa=False, dry=False):
    """MANDAT 2 Nov 2026 — LAPORAN HARIAN KOIN ATH RUNTUH −80%..−100% YANG
    MASIH HIDUP, diseret dari renderan LUAS ribuan koin pasar (paging penuh
    CoinPaprika), BUKAN hanya 100 koin pilihan. Tanda hidup (min. satu):
    volume 24j masih ada, perputaran harga, harga masih bergerak, OI Binance
    futures — koin sepi total dibuang (bukan koin beneran mati). Contoh fase:
    magma, ain, idol pernah runtuh namun masih bernafas. Kirim kapan pun
    denyut menyala (dedup harian WIB: lokal + state lapis abadi; throttle
    10 mnt). dry=True: hitung tanpa kirim & tanpa menulis state (uji aman)."""
    try:
        th = muat_json(F_THROTTLE_81) or {}
        now = time.time()
        if not dry and not paksa and now - float(th.get("ath_terakhir") or 0) < THROTTLE_ATH_81:
            return "throttle"
        if not dry:
            th["ath_terakhir"] = now
            simpan_json(F_THROTTLE_81, th)
        jam = datetime.now(WIB)
        hari_ini = jam.strftime("%Y-%m-%d")
        if not dry:
            st = muat_json(F_ATH_81) or {}
            if st.get("tanggal") == hari_ini:
                return "sudah terkirim lokal"
            try:
                req = urllib.request.Request(REPO_RAW_81, headers={"User-Agent": "benteng-balas"})
                with urllib.request.urlopen(req, timeout=15) as r:
                    if json.loads(r.read().decode("utf-8", "replace")).get("ath_tanggal") == hari_ini:
                        return "sudah terkirim lapis abadi"
            except Exception:
                pass
        # UNIVERSE LUAS (mandat 2 Nov): paging penuh CoinPaprika — ribuan koin
        # by kapitalisasi, bukan pool 100 pilihan.
        data, start = {}, 0
        for _ in range(10):
            try:
                req = urllib.request.Request(f"{PAPRIKA_81}/tickers?limit=500&start={start}",
                                             headers={"User-Agent": "benteng-balas"})
                with urllib.request.urlopen(req, timeout=25) as r:
                    arr = json.loads(r.read().decode())
            except Exception:
                break
            if not isinstance(arr, list) or not arr:
                break
            for x in arr:
                s = str(x.get("symbol") or "").split("-")[0].upper()
                if s and s not in data:
                    usd = (x.get("quotes") or {}).get("USD") or {}
                    if usd:
                        x = dict(x)
                        x["price"] = usd.get("price")
                        x["ath_price"] = usd.get("ath_price")
                        x["percent_from_price_ath"] = usd.get("percent_from_price_ath")
                        x["volume_24h"] = usd.get("volume_24h")
                        x["market_cap"] = usd.get("market_cap")
                        x["percent_change_1h"] = usd.get("percent_change_1h")
                        x["percent_change_24h"] = usd.get("percent_change_24h")
                        data[s] = x
            start += 500
            time.sleep(1.5)
        if not data:
            return "sumber ATH tak terjangkau (jujur menunda)"
        kandidat = []
        for s, e in data.items():
            try:
                drop = -float(e.get("percent_from_price_ath"))
            except Exception:
                drop = None
            p, ath = float(e.get("price") or 0), float(e.get("ath_price") or 0)
            if drop is None and p and ath:
                drop = (1 - p / ath) * 100.0
            if drop is None or not (80.0 <= drop <= 100.0):
                continue
            kandidat.append((s, e, p, ath, drop))
        # OI Binance futures utk kandidat teratas (maks 60) — bukti derivatif hidup;
        # bukan gerbang (banyak koin runtuh tak tercatat futures).
        oi_map = {}
        ks = [s for s, _, _, _, _ in kandidat][:60]

        def _oi(sym):
            try:
                req = urllib.request.Request(
                    f"https://fapi.binance.com/fapi/v1/openInterest?symbol={sym}USDT",
                    headers={"User-Agent": "benteng-balas"})
                with urllib.request.urlopen(req, timeout=8) as r:
                    return sym, float(json.loads(r.read().decode()).get("openInterest") or 0)
            except Exception:
                return sym, 0.0

        if ks and not dry:
            with ThreadPoolExecutor(max_workers=8) as ex:
                for sym, oi in ex.map(_oi, ks):
                    if oi:
                        oi_map[sym] = oi
        hidup, mati = [], 0
        for s, e, p, ath, drop in kandidat:
            vol = float(e.get("volume_24h") or 0)
            mcap = float(e.get("market_cap") or 0)
            chg1 = float(e.get("percent_change_1h") or 0)
            chg24 = float(e.get("percent_change_24h") or 0)
            oi = oi_map.get(s) or 0.0
            oi_usd = oi * p if (oi and p) else 0.0
            tanda = []
            if vol >= 100000:
                tanda.append(f"volume 24j ${vol / 1e6:.1f}jt masih hidup")
            if mcap and vol and vol / mcap >= 0.005:
                tanda.append(f"perputaran {vol / mcap * 100:.1f}%/24j")
            if chg1 or chg24:
                tanda.append(f"harga masih bergerak (1j {chg1:+.1f}% · 24j {chg24:+.1f}%)")
            if oi_usd >= 10000:
                tanda.append(f"OI futures ${oi_usd / 1e6:.2f}jt (pasar derivatif nyata)")
            if tanda:
                hidup.append((s, p, ath, drop, tanda, vol))
            else:
                mati += 1
        if dry:
            return (f"DRY: universe={len(data)} kandidat80_100={len(kandidat)} "
                    f"hidup={len(hidup)} mati={mati} oi_terdeteksi={len(oi_map)}")
        hidup.sort(key=lambda x: -x[5])
        L = ["\\U0001F4C9 <b>LAPORAN HARIAN — KOIN ATH RUNTUH \\u221280%..\\u2212100% YANG MASIH HIDUP</b> (mandat 2 Nov)",
             f"\\U0001F550 {jam.strftime('%H:%M WIB, %d %b %Y')} · diseret dari renderan luas <b>{len(data)} koin</b> pasar "
             "(BUKAN cuma 100 pilihan) · sumber CoinPaprika + OI Binance futures"]
        if hidup:
            L.append("")
            L.append(f"<b>{len(hidup)} koin turun 80\\u2013100% dari ATH dan MASIH HIDUP</b> (urut volume):")
            for s, p, ath, drop, tanda, _ in hidup[:20]:
                L.append(f"\\n<b>{html.escape(s)}</b> \\u2014 turun <b>{drop:.1f}%</b> dari ATH "
                         f"(kini {fmt_harga(p)} vs ATH {fmt_harga(ath)})")
                L.append("   · tanda hidup: " + " · ".join(html.escape(t) for t in tanda))
        else:
            L.append("")
            L.append("Hari ini <b>tidak ada</b> koin di zona \\u221280%..\\u2212100% dengan tanda hidup.")
        if mati:
            L.append(f"\\U0001F5D1 {mati} koin sepi total (tanpa tanda hidup) \\u2014 dibuang, bukan koin beneran mati.")
        L.append("")
        L.append("<i>Contoh fase: magma, ain, idol pernah runtuh namun masih bernafas \\u2014 laporan ini bukti sistem "
                 "memantau pasca-runtuh dari ribuan koin. Dikirim otomatis dari denyut otak z.ai, tanpa menunggu "
                 "apa pun, walau z.ai/ponsel padam.</i>")
        kirim(token, PEMILIK, "\\n".join(L))
        simpan_json(F_ATH_81, {"tanggal": hari_ini, "waktu": time.time(),
                               "oleh": "benteng-balas", "universe": len(data),
                               "hidup": len(hidup), "mati": mati})
        return f"TERKIRIM (universe={len(data)} hidup={len(hidup)} mati={mati})"
    except Exception as e:
        return f"err: {repr(e)[:90]}"
'''

src = src[:MULAI] + BARU + src[AKHIR:]
open(F, "w", encoding="utf-8").write(src)
print("PATCH-OK", len(src), "bytes; backup:", BAK)
