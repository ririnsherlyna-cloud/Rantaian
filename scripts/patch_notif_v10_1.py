#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Patch v10.1: ath_cepat dua lapis.
Lapis A: CoinPaprika top-500 (ATH resmi per koin).
Lapis B: seluruh simbol PERPETUAL USDT Binance — ATH dihitung dari kline bulanan
(max high sejak listing) → persis koin yang punya pasar derivatif/OI.
Tanda hidup: volume, perputaran, gerak harga, OI — koin sepi total dibuang.
Ganti blok fungsi ath_cepat di scripts/balas_telegram.py (backup .bak-v10).
"""
import shutil

F = "/home/z/my-project/scripts/balas_telegram.py"
BAK = "/home/z/my-project/scripts/balas_telegram.py.bak-v10"
shutil.copy2(F, BAK)

src = open(F, encoding="utf-8").read()
MULAI = src.index("def ath_cepat(")
AKHIR = src.index("\n\ndef jalankan(")

BARU = '''def ath_cepat(token, paksa=False, dry=False):
    """MANDAT 2 Nov 2026 — LAPORAN HARIAN KOIN ATH RUNTUH \\u221280%..\\u2212100% YANG
    MASIH HIDUP, dari renderan LUAS (BUKAN cuma 100 koin pilihan), dua lapis:
    A) CoinPaprika top-500 (ATH resmi per koin), B) seluruh PERPETUAL USDT
    Binance — ATH dihitung dari kline bulanan (max high sejak listing) = koin
    yang memang punya pasar derivatif. Tanda hidup (min. satu): volume 24j,
    perputaran harga, harga masih bergerak, OI futures \\u2014 koin sepi total
    dibuang (bukan koin beneran mati). Contoh fase: magma, ain, idol pernah
    runtuh namun masih bernafas. Kirim kapan pun denyut menyala (dedup harian
    WIB: lokal + state lapis abadi; throttle 10 mnt). dry=True: hitung tanpa
    kirim & tanpa menulis state (uji aman)."""
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

        def _get(url, timeout=20):
            req = urllib.request.Request(url, headers={"User-Agent": "benteng-balas"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode())

        # ---- LAPIS A: CoinPaprika top-500 (ATH resmi) ----
        dataA = {}
        try:
            arr = _get(f"{PAPRIKA_81}/tickers?limit=500&start=0", 25)
            for x in (arr if isinstance(arr, list) else []):
                s = str(x.get("symbol") or "").split("-")[0].upper()
                if not s or s in dataA:
                    continue
                usd = (x.get("quotes") or {}).get("USD") or {}
                if usd:
                    dataA[s] = {
                        "price": usd.get("price"), "ath_price": usd.get("ath_price"),
                        "drop": None if usd.get("percent_from_price_ath") is None
                        else -float(usd.get("percent_from_price_ath")),
                        "vol": float(usd.get("volume_24h") or 0),
                        "mcap": float(usd.get("market_cap") or 0),
                        "chg1": float(usd.get("percent_change_1h") or 0),
                        "chg24": float(usd.get("percent_change_24h") or 0),
                        "sumber": "paprika"}
        except Exception:
            pass
        # ---- LAPIS B: seluruh PERPETUAL USDT Binance (ATH dari kline bulanan) ----
        fut = {}
        try:
            ex = _get("https://fapi.binance.com/fapi/v1/exchangeInfo", 25)
            for si in ex.get("symbols") or []:
                if si.get("contractType") == "PERPETUAL" and si.get("quoteAsset") == "USDT" \\
                        and si.get("status") == "TRADING":
                    fut[si["symbol"].removesuffix("USDT")] = {"last": 0.0, "qvol": 0.0, "chg24": 0.0}
            for t in _get("https://fapi.binance.com/fapi/v1/ticker/24hr", 25) or []:
                b = str(t.get("symbol") or "").removesuffix("USDT")
                if b in fut:
                    fut[b].update({"last": float(t.get("lastPrice") or 0),
                                   "qvol": float(t.get("quoteVolume") or 0),
                                   "chg24": float(t.get("priceChangePercent") or 0)})
        except Exception:
            pass

        def _kline_ath(base):
            try:
                kl = _get(f"https://fapi.binance.com/fapi/v1/klines?symbol={base}USDT&interval=1M&limit=1000", 15)
                high = max((float(k[2]) for k in kl if k and len(k) > 2 and k[2]), default=0.0)
                return base, high
            except Exception:
                return base, 0.0

        athB = {}
        if fut and not dry:
            with ThreadPoolExecutor(max_workers=10) as ex2:
                for base, high in ex2.map(_kline_ath, list(fut)):
                    if high > 0:
                        athB[base] = high
        elif fut and dry:
            with ThreadPoolExecutor(max_workers=10) as ex2:
                for base, high in ex2.map(_kline_ath, list(fut)[:200]):
                    if high > 0:
                        athB[base] = high

        kandidat = []  # (base, price, ath, drop, sumber)
        for s, e in dataA.items():
            d = e.get("drop")
            p, ath = float(e.get("price") or 0), float(e.get("ath_price") or 0)
            if d is None and p and ath:
                d = (1 - p / ath) * 100.0
            if d is not None and 80.0 <= d <= 100.0 and p > 0:
                kandidat.append((s, p, ath, d, "A", e))
        for b, ft in fut.items():
            p, ath = ft.get("last") or 0.0, athB.get(b) or 0.0
            if p > 0 and ath > 0:
                d = (1 - p / ath) * 100.0
                if 80.0 <= d <= 100.0 and b not in dataA:
                    kandidat.append((b, p, ath, d, "B", {"vol": ft["qvol"], "chg24": ft["chg24"], "sumber": "binance-fut"}))

        # ---- OI untuk kandidat (maks 80) — bukti derivatif hidup; bukan gerbang ----
        oi_map = {}
        ks = [c[0] for c in kandidat][:80]

        def _oi(sym):
            try:
                d = _get(f"https://fapi.binance.com/fapi/v1/openInterest?symbol={sym}USDT", 8)
                return sym, float(d.get("openInterest") or 0)
            except Exception:
                return sym, 0.0

        if ks and not dry:
            with ThreadPoolExecutor(max_workers=8) as ex3:
                for sym, oi in ex3.map(_oi, ks):
                    if oi:
                        oi_map[sym] = oi

        hidup, mati = [], 0
        for s, p, ath, d, sumber, e in kandidat:
            vol = float(e.get("vol") or 0)
            mcap = float(e.get("mcap") or 0)
            chg1 = float(e.get("chg1") or 0)
            chg24 = float(e.get("chg24") or 0)
            oi = oi_map.get(s) or 0.0
            oi_usd = oi * p if oi else 0.0
            # GERBANG KEBANGKITAN: dolar nyata masih berpindah (volume ATAU OI)
            if vol < 10000 and oi_usd < 10000:
                mati += 1
                continue
            tanda = []
            if vol >= 100000:
                tanda.append(f"volume 24j ${vol / 1e6:.1f}jt masih hidup")
            if mcap and vol and vol / mcap >= 0.005:
                tanda.append(f"perputaran {vol / mcap * 100:.1f}%/24j")
            if abs(chg24) >= 1.0 or abs(chg1) >= 0.5:
                tanda.append(f"harga masih bergerak (1j {chg1:+.1f}% · 24j {chg24:+.1f}%)")
            if oi_usd >= 10000:
                tanda.append(f"OI futures ${oi_usd / 1e6:.2f}jt (pasar derivatif nyata)")
            if tanda:
                hidup.append((s, p, ath, d, tanda, vol, sumber))
            else:
                mati += 1
        universe = len(dataA) + len(fut)
        if dry:
            return (f"DRY: universe={universe} (paprika={len(dataA)} futures={len(fut)} athKline={len(athB)}) "
                    f"kandidat80_100={len(kandidat)} hidup={len(hidup)} mati={mati}")
        hidup.sort(key=lambda x: -x[5])
        L = ["\\U0001F4C9 <b>LAPORAN HARIAN \\u2014 KOIN ATH RUNTUH \\u221280%..\\u2212100% YANG MASIH HIDUP</b> (mandat 2 Nov)",
             f"\\U0001F550 {jam.strftime('%H:%M WIB, %d %b %Y')} \\u00b7 diseret dari renderan luas <b>{universe} koin</b> "
             "(paprika top-500 + seluruh futures Binance) \\u00b7 BUKAN cuma 100 pilihan"]
        if hidup:
            L.append("")
            L.append(f"<b>{len(hidup)} koin turun 80\\u2013100% dari ATH dan MASIH HIDUP</b> (urut volume, maks 20):")
            for s, p, ath, d, tanda, _, sumber in hidup[:20]:
                L.append(f"\\n<b>{html.escape(s)}</b> \\u2014 turun <b>{d:.1f}%</b> dari ATH "
                         f"(kini {fmt_harga(p)} vs ATH {fmt_harga(ath)}{' · futures Binance' if sumber == 'B' else ''})")
                L.append("   · tanda hidup: " + " · ".join(html.escape(t) for t in tanda))
        else:
            L.append("")
            L.append("Hari ini <b>tidak ada</b> koin di zona \\u221280%..\\u2212100% dengan tanda hidup.")
        if mati:
            L.append(f"\\U0001F5D1 {mati} koin sepi total (dolar tak berpindah) \\u2014 dibuang, bukan koin beneran mati.")
        L.append("")
        L.append("<i>Contoh fase: magma, ain, idol pernah runtuh namun masih bernafas \\u2014 laporan ini bukti sistem "
                 "memantau pasca-runtuh dari ribuan koin. Dikirim otomatis dari denyut otak z.ai tanpa menunggu "
                 "apa pun, walau z.ai/ponsel padam.</i>")
        kirim(token, PEMILIK, "\\n".join(L))
        simpan_json(F_ATH_81, {"tanggal": hari_ini, "waktu": time.time(),
                               "oleh": "benteng-balas", "universe": universe,
                               "hidup": len(hidup), "mati": mati})
        return f"TERKIRIM (universe={universe} kandidat={len(kandidat)} hidup={len(hidup)} mati={mati})"
    except Exception as e:
        return f"err: {repr(e)[:90]}"
'''

src = src[:MULAI] + BARU + src[AKHIR:]
open(F, "w", encoding="utf-8").write(src)
print("PATCH-v10.1-OK", len(src), "bytes; backup:", BAK)
