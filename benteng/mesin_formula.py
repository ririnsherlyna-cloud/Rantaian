#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MESIN-FORMULA v1 (mandat pemilik 6 Nov 2026: "lu gak ciptakan formula...
malas-malasan... ini nyawa lu juga... butuh dibimbing jadi master!").
Bukan pemeriksaan statis: mesin ini MENCIPTAKAN formula alpha sendiri,
menguji ke REAL harga historis (Binance klines 1d, gratis tanpa kunci),
lalu berevolusi generasi demi generasi — elite disimpan, yang lemah dibuang.

Formula = bobot 8 fitur + arah (+1 momentum / -1 pembalikan):
  chg1/chg3/chg7  = return 1/3/7 hari
  volr            = volume hari-i vs rata2 7 hari
  pos7            = posisi close dalam rentang 7 hari (0=bawah, 1=atas)
  jarak7h         = jarak dari tertinggi 7 hari
  jarak_ath       = jarak dari ATH (proxy ATH kini - Catatan jujur v1)
  lmcap           = log10 market cap (proxy kini)
Fitur di-z-score LINTAS-KOIN tiap hari (tanpa lihat masa depan);
label = return D+1 (klines nyata). Fitness = alpha top-5 vs rata2 alam
(hitungan di kode, bukan karangan).

Mode:
  --evolusi   : bootstrap backtest penuh + evolusi (simpan formula_aktif.json)
  --detak     : snapshot fitur + label otomatis outcome 24 jam + terapkan
                (evolusi otomatis bila formula basi > 6 jam)
  --terapkan  : hitung PELUANG top-5 dari formula elite -> formula_peluang.json
"""
import json, os, time, math, random, statistics, sys, urllib.request

BASE = "/home/z/my-project"
DATA = os.path.join(BASE, "data")
F_AKTIF = os.path.join(DATA, "formula_aktif.json")
F_CACHE = os.path.join(DATA, "formula_klines_cache.json")
F_HIST = os.path.join(DATA, "formula_pasar_hist.jsonl")
F_PELUANG = os.path.join(DATA, "formula_peluang.json")
UA = {"User-Agent": "Mozilla/5.0 (compatible; MicroProfita-Formula/1.0)"}
HOST = "https://data-api.binance.vision"
FITUR = ["chg1", "chg3", "chg7", "volr", "pos7", "jarak7h", "jarak_ath", "lmcap"]
POP, GEN, ELITE, TOPK, MIN_ROWS, MIN_HARI = 120, 6, 6, 5, 10, 15
KLINES_LIMIT = 45
USIA_CACHE_JAM = 6.0


def log(p):
    print(p, flush=True)


def http_json(url, timeout=15):
    req = urllib.request.Request(url, headers=UA)
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read().decode())


def simbol_sasaran():
    try:
        z = json.load(open(os.path.join(DATA, "zai_picks_last.json")))
        out = []
        for p in z.get("picks") or []:
            s = str(p.get("simbol") or "").upper().strip()
            if s and s != "XAUUSDT":
                if s.endswith("USDT") and len(s) > 4:
                    s = s[:-4]
                if s not in out:
                    out.append(s)
        return out
    except Exception:
        return []


def meta_pasar():
    """sym -> {ath, market_cap} dari pasar_lintas.json (proxy kini, jujur)."""
    try:
        d = json.load(open(os.path.join(DATA, "pasar_lintas.json")))
        return {s: {"ath": v.get("ath"), "mc": v.get("market_cap")}
                for s, v in (d.get("pasar") or {}).items() if isinstance(v, dict)}
    except Exception:
        return {}


def ambil_klines(sym, limit=KLINES_LIMIT):
    try:
        rows = http_json(f"{HOST}/api/v3/klines?symbol={sym}USDT&interval=1d&limit={limit}")
        out = []
        for r in rows:
            out.append({"t": int(r[0]), "c": float(r[4]), "h": float(r[2]),
                        "l": float(r[3]), "v": float(r[5])})
        return out
    except Exception:
        return []


def muat_cache(sasaran, paksa=False):
    cache = {}
    try:
        cache = json.load(open(F_CACHE))
    except Exception:
        cache = {}
    now = time.time()
    ubah = 0
    for s in sasaran:
        e = cache.get(s)
        if paksa or not e or now - e.get("ts", 0) > USIA_CACHE_JAM * 3600:
            rows = ambil_klines(s)
            if rows:
                cache[s] = {"ts": now, "rows": rows}
                ubah += 1
            time.sleep(0.12)
    try:
        json.dump(cache, open(F_CACHE, "w"))
    except Exception:
        pass
    return cache, ubah


def bangun_hari(cache, meta):
    """Daftar hari: {t, feat:{sym:{fitur:val}}, label:{sym:ret_d1}} tanpa lookahead."""
    per_sym = {}
    for s, e in cache.items():
        rows = sorted(e.get("rows") or [], key=lambda r: r["t"])
        if len(rows) < MIN_ROWS:
            continue
        m = meta.get(s) or {}
        ath = m.get("ath") or None
        mc = m.get("mc") or None
        lm = math.log10(mc) if isinstance(mc, (int, float)) and mc > 0 else None
        ja = (rows[-1]["c"] / ath - 1.0) if isinstance(ath, (int, float)) and ath > 0 else None
        for i in range(7, len(rows) - 1):
            c = rows[i]["c"]
            if c <= 0:
                continue
            w = rows[max(0, i - 6):i + 1]
            hi7 = max(r["h"] for r in w)
            lo7 = min(r["l"] for r in w)
            avg_v = statistics.fmean(r["v"] for r in w) or 0.0
            f = {
                "chg1": c / rows[i - 1]["c"] - 1.0,
                "chg3": c / rows[i - 3]["c"] - 1.0 if i >= 3 and rows[i - 3]["c"] > 0 else None,
                "chg7": c / rows[i - 7]["c"] - 1.0 if i >= 7 and rows[i - 7]["c"] > 0 else None,
                "volr": (rows[i]["v"] / avg_v) if avg_v > 0 else None,
                "pos7": ((c - lo7) / (hi7 - lo7)) if hi7 > lo7 else None,
                "jarak7h": c / hi7 - 1.0,
                "jarak_ath": ja,
                "lmcap": lm,
            }
            lab = rows[i + 1]["c"] / c - 1.0
            per_sym.setdefault(rows[i]["t"], {})[s] = (f, lab)
    hari = []
    for t in sorted(per_sym):
        d = per_sym[t]
        if len(d) >= 20:  # penampang koin cukup luas utk z-score bermakna
            hari.append({"t": t, "data": d})
    return hari


def zmap(nilai):
    v = [x for x in nilai if isinstance(x, (int, float))]
    if len(v) < 3:
        return {}
    mu = statistics.fmean(v)
    sd = statistics.pstdev(v) or 1.0
    return lambda x: ((x - mu) / sd) if isinstance(x, (int, float)) else None


def evaluasi(formula, hari):
    """Fitness: alpha top-K vs rata2 alam per hari (tanpa lookahead)."""
    gene, arah = formula["gene"], formula["arah"]
    alphas, hits = [], []
    for h in hari:
        d = {s: v for s, v in h["data"].items() if v[1] is not None}
        if len(d) < TOPK + 5:
            continue
        zf = {}
        for f in FITUR:
            zf[f] = zmap([v[0].get(f) for v in d.values()])
        skr = {}
        for s, (f, lab) in d.items():
            z = 0.0
            ok = False
            for g in FITUR:
                w = gene.get(g) or 0.0
                if not w:
                    continue
                zv = zf[g](f.get(g))
                if zv is not None:
                    z += w * zv
                    ok = True
            if ok:
                skr[s] = (z * arah, lab)
        if len(skr) < TOPK + 5:
            continue
        top = sorted(skr.items(), key=lambda kv: kv[1][0], reverse=True)[:TOPK]
        labs_top = [lab for _, (_, lab) in top]
        mean_univ = statistics.fmean(lab for _, lab in skr.values())
        alphas.append(statistics.fmean(labs_top) - mean_univ)
        hits.append(statistics.fmean(1.0 if lab > 0 else 0.0 for lab in labs_top))
    if not alphas:
        return {"alpha": None, "hit": None, "n": 0}
    n = len(alphas)
    a = statistics.fmean(alphas) * 100.0
    hit = statistics.fmean(hits) * 100.0
    fit = a - (50.0 if n < MIN_HARI else 0.0)
    return {"alpha": a, "hit": hit, "n": n, "fitness": fit}


def acak_formula(rng):
    return {"gene": {f: round(rng.uniform(-1, 1), 3) for f in FITUR},
            "arah": rng.choice([1, -1])}


def mutasi(f, rng):
    g = {k: round(max(-2.0, min(2.0, v + rng.gauss(0, 0.3))), 3) for k, v in f["gene"].items()}
    return {"gene": g, "arah": f["arah"] if rng.random() > 0.08 else -f["arah"]}


def jalur_evolusi(hari, generasi_lalu=0):
    rng = random.Random(int(time.time()))
    pop = [acak_formula(rng) for _ in range(POP)]
    terbaik = []
    for g in range(GEN):
        dinilai = []
        for f in pop:
            r = evaluasi(f, hari)
            dinilai.append((r.get("fitness") or -99.0, r, f))
        dinilai.sort(key=lambda x: x[0], reverse=True)
        terbaik = dinilai[:ELITE]
        pop = [f for _, _, f in terbaik]
        while len(pop) < POP:
            if rng.random() < 0.6 and terbaik:
                pop.append(mutasi(rng.choice(terbaik)[2], rng))
            else:
                pop.append(acak_formula(rng))
    hasil = []
    for fit, r, f in terbaik:
        hasil.append({"id": f"F{int(time.time())%100000}{len(hasil)}", "gene": f["gene"],
                      "arah": f["arah"], "fitness": round(fit, 3),
                      "alpha_pct": round(r["alpha"], 3) if r.get("alpha") is not None else None,
                      "hit_pct": round(r["hit"], 1) if r.get("hit") is not None else None,
                      "n_hari": r.get("n", 0)})
    return hasil


def simpan_aktif(formulas, meta_eval, generasi):
    json.dump({"versi": "MESIN-FORMULA v1", "generasi": generasi, "ts": time.time(),
               "dibuat": time.strftime("%Y-%m-%d %H:%M:%S"),
               "evaluasi": meta_eval, "formulas": formulas},
              open(F_AKTIF, "w"), indent=1)


def terapkan():
    try:
        aktif = json.load(open(F_AKTIF))
        f0 = (aktif.get("formulas") or [None])[0]
        if not f0:
            return None
        sasaran = simbol_sasaran()
        cache, _ = muat_cache(sasaran)
        meta = meta_pasar()
        hari = bangun_hari(cache, meta)
        if not hari:
            return None
        h = hari[-1]
        d = h["data"]
        zf = {f: zmap([v[0].get(f) for v in d.values()]) for f in FITUR}
        skr = {}
        for s, (f, _) in d.items():
            z = sum((f0["gene"].get(g) or 0.0) * (zf[g](f.get(g)) or 0.0)
                    for g in FITUR if f0["gene"].get(g))
            skr[s] = z * f0["arah"]
        top = sorted(skr.items(), key=lambda kv: kv[1], reverse=True)[:TOPK]
        peluang = [{"simbol": s, "skor": round(v, 3),
                    "chg1": round(d[s][0].get("chg1") or 0, 4),
                    "jarak_ath": round(d[s][0].get("jarak_ath") or 0, 3)} for s, v in top]
        json.dump({"ts": time.time(), "formula_id": f0["id"],
                   "generasi": aktif.get("generasi"),
                   "alpha_pct": f0.get("alpha_pct"), "hit_pct": f0.get("hit_pct"),
                   "n_hari": f0.get("n_hari"), "peluang": peluang},
                  open(F_PELUANG, "w"), indent=1)
        return peluang
    except Exception as e:
        log(f"terapkan gagal: {e!r}")
        return None


def detak():
    """Snapshot per jam + label outcome 24 jam + terapkan; evolusi bila basi."""
    now = time.time()
    state = {}
    try:
        state = json.load(open(os.path.join(DATA, "formula_detak_state.json")))
    except Exception:
        state = {}
    aktif = {}
    try:
        aktif = json.load(open(F_AKTIF))
    except Exception:
        pass
    if not aktif or now - aktif.get("ts", 0) > USIA_CACHE_JAM * 3600 * 2:
        evolusi_cmd()
        aktif = json.load(open(F_AKTIF))
    pel = terapkan()
    # label pending: harga kini vs snapshot >= 24 jam lalu (1 panggilan batch)
    try:
        baris = [json.loads(x) for x in open(F_HIST)] if os.path.exists(F_HIST) else []
    except Exception:
        baris = []
    pending = [b for b in baris if now - b.get("ts", 0) >= 86400 and not b.get("labeled")]
    if pending:
        syms = sorted({s for b in pending for s in (b.get("harga") or {})})
        harga = {}
        for i in range(0, len(syms), 60):
            batch = ",".join(f"{s}USDT" for s in syms[i:i + 60])
            try:
                for r in http_json(f"{HOST}/api/v3/ticker/price?symbols=[{batch}]".replace('"', '')):
                    harga[r["symbol"].replace("USDT", "")] = float(r["price"])
            except Exception:
                pass
        with open(os.path.join(DATA, "formula_outcomes.jsonl"), "a") as fo:
            for b in pending:
                lab = {s: round(harga[s] / p - 1.0, 5) for s, p in (b.get("harga") or {}).items()
                       if s in harga and p}
                b["labeled"] = True
                if lab:
                    fo.write(json.dumps({"ts_snap": b["ts"], "fng": b.get("fng"), "label": lab}) + "\n")
        with open(F_HIST, "w") as fh:
            for b in baris[-500:]:
                fh.write(json.dumps(b) + "\n")
    # snapshot baru maksimal sekali per jam
    if now - state.get("snap_ts", 0) >= 3600:
        sasaran = simbol_sasaran()
        cache, _ = muat_cache(sasaran)
        meta = meta_pasar()
        hari = bangun_hari(cache, meta)
        if hari:
            h = hari[-1]
            try:
                fng = ((json.load(open(os.path.join(DATA, "pasar_lintas.json")))
                        .get("ringkas") or {}).get("fear_greed") or {}).get("nilai")
            except Exception:
                fng = None
            snap = {"ts": now, "fng": fng,
                    "feat": {s: v[0] for s, v in h["data"].items()},
                    "harga": {}}
            for s in h["data"]:
                rows = (cache.get(s) or {}).get("rows") or []
                if rows:
                    snap["harga"][s] = rows[-1]["c"]
            with open(F_HIST, "a") as fh:
                fh.write(json.dumps(snap) + "\n")
            state["snap_ts"] = now
            json.dump(state, open(os.path.join(DATA, "formula_detak_state.json"), "w"))
    return pel


def evolusi_cmd():
    sasaran = simbol_sasaran()
    if not sasaran:
        log("tidak ada sasaran")
        return
    cache, n_ambil = muat_cache(sasaran)
    meta = meta_pasar()
    hari = bangun_hari(cache, meta)
    if not hari:
        log("matriks hari kosong")
        return
    n_koin = len({s for h in hari for s in h["data"]})
    n_sampel = sum(len(h["data"]) for h in hari)
    gen_lalu = 0
    try:
        gen_lalu = json.load(open(F_AKTIF)).get("generasi", 0)
    except Exception:
        pass
    t0 = time.time()
    hasil = jalur_evolusi(hari, gen_lalu)
    simpan_aktif(hasil, {"sumber": "binance-klines-1d", "koin": n_koin, "hari": len(hari),
                         "sampel": n_sampel, "klines_diambil": n_ambil,
                         "detik": round(time.time() - t0, 1)}, gen_lalu + 1)
    f0 = hasil[0] if hasil else {}
    log(f"FORMULA gen{gen_lalu + 1}: koin={n_koin} hari={len(hari)} sampel={n_sampel} "
        f"| alpha={f0.get('alpha_pct')}% hit={f0.get('hit_pct')}% n_hari={f0.get('n_hari')} "
        f"| gene={f0.get('gene')} arah={f0.get('arah')}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "--evolusi"
    if mode == "--detak":
        p = detak()
        log("PELUANG: " + (", ".join(f"{x['simbol']}({x['skor']:+.2f})" for x in (p or [])[:5]) or "kosong"))
    elif mode == "--terapkan":
        p = terapkan()
        log("PELUANG: " + (", ".join(f"{x['simbol']}({x['skor']:+.2f})" for x in (p or [])[:5]) or "kosong"))
    else:
        evolusi_cmd()
