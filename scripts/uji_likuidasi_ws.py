#!/usr/bin/env python3
# UJI-WS v1 — satu koneksi websocket Binance Futures untuk memvalidasi 3 hal sekaligus:
#   (1) koneksi WS hidup (jalur yang disarankan Binance, tidak kena blokir REST),
#   (2) aliran likuidasi !forceOrder@arr -> bahan bakar long vs short (insight pemilik),
#   (3) funding via !markPrice@arr + CVD mentah via aggTrade (aksi agresif beli/jual).
# Durasi pendek (35 detik) supaya sopan. Hasil ke data/uji_ws_hasil.json.
import json, time, io, sys
import websocket

DURASI = 35
URL = "wss://fstream.binance.com/stream?streams=!forceOrder@arr/!markPrice@arr/btcusdt@aggTrade"
HASIL = {"waktu": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "ws_ok": False}

likuid = {"long": 0, "short": 0, "contoh": []}   # S=SELL -> posisi LONG dilikuidasi
cvd = {"beli": 0.0, "jual": 0.0, "n": 0}          # m=false -> taker BELI (agresif)
mark = {}                                          # simbol -> {mark, funding}

try:
    ws = websocket.create_connection(URL, timeout=15)
    ws.settimeout(5)
    t0 = time.time()
    while time.time() - t0 < DURASI:
        try:
            raw = ws.recv()
        except Exception:
            continue  # diam 5 detik saja, lanjut menunggu
        try:
            d = json.loads(raw)
        except Exception:
            continue
        st, data = d.get("stream", ""), d.get("data", {})
        if "forceOrder" in st:
            o = data.get("o", {})
            if o.get("S") == "SELL":
                likuid["long"] += 1
            elif o.get("S") == "BUY":
                likuid["short"] += 1
            if len(likuid["contoh"]) < 6 and o:
                likuid["contoh"].append({"simbol": o.get("s"), "sisi": o.get("S"),
                                         "harga": o.get("ap"), "qty": o.get("q")})
        elif "aggTrade" in st:
            q = float(data.get("q", 0))
            cvd["n"] += 1
            if data.get("m") is False:
                cvd["beli"] += q
            else:
                cvd["jual"] += q
        elif "markPrice" in st:
            if isinstance(data, list):
                for m in data:
                    if m.get("s") in ("BTCUSDT", "ETHUSDT", "SYNUSDT"):
                        mark[m["s"]] = {"mark": m.get("p"), "funding": m.get("r"),
                                        "next_funding_ts": m.get("T")}
    ws.close()
    HASIL["ws_ok"] = True
except Exception as e:
    HASIL["gagal"] = str(e)[:250]
    print(f"WS GAGAL: {str(e)[:250]}")

if HASIL["ws_ok"]:
    cvd_net = cvd["beli"] - cvd["jual"]
    HASIL.update({"likuidasi": likuid, "cvd_btc": {"taker_beli": cvd["beli"], "taker_jual": cvd["jual"],
                                                   "net": round(cvd_net, 3), "n_aggtrade": cvd["n"]},
                  "mark_funding": mark})
    print(f"WS OK — {DURASI}s dengarkan:")
    print(f"  LIKUIDASI: {likuid['long']} long dilikuidasi, {likuid['short']} short dilikuidasi")
    for c in likuid["contoh"]:
        print(f"    contoh: {c['simbol']} sisi {c['sisi']} harga {c['harga']} qty {c['qty']}")
    print(f"  CVD mentah BTCUSDT: taker beli {cvd['beli']:.3f} BTC vs taker jual {cvd['jual']:.3f} BTC -> net {cvd_net:+.3f} BTC ({cvd['n']} aggTrade)")
    for s, m in mark.items():
        f = float(m["funding"]) * 100 if m["funding"] else None
        print(f"  MARK {s}: {m['mark']} | funding {f:+.4f}%/8h")

with io.open("/home/z/my-project/data/uji_ws_hasil.json", "w", encoding="utf-8") as f:
    json.dump(HASIL, f, ensure_ascii=False, indent=1)
sys.exit(0 if HASIL["ws_ok"] else 1)
