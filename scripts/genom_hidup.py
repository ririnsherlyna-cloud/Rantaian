#!/usr/bin/env python3
# GENOM-HIDUP v1 — EVOLUSI GENOME TANPA MENUNGGU IZIN MICAPROFITA-
# Otak z.ai: evolusi kecil-berarah dari sinyal denyut remote (brier/akurasi/breadth),
# ditulis ke benteng Rantaian via Contents API (izin terbukti dari jembatan sasaran-zai).
# Anti-"data jadul": diperbarui = SEKARANG tiap siklus; generasi & belajar bertambah.
import json, base64, time, os, urllib.request, urllib.error

BASE = "/home/z/my-project"
REPO = "ririnsherlyna-cloud/Rantaian"
TOK = open(f"{BASE}/.token-rantaian").read().strip()
UA = {"Authorization": "Bearer " + TOK, "Accept": "application/vnd.github+json", "User-Agent": "genom-hidup"}

def muat(p, d=None):
    try:
        return json.load(open(p))
    except Exception:
        return d

def api_json(url):
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=30))

def commit_repo(path, content_bytes, pesan):
    """PUT contents API; handle SHA lama; return (ok, sha, status)."""
    url = f"https://api.github.com/repos/{REPO}/contents/{path}"
    body = {"message": pesan, "content": base64.b64encode(content_bytes).decode(), "branch": "main"}
    try:
        lama = api_json(url + "?ref=main")
        body["sha"] = lama["sha"]
    except urllib.error.HTTPError as e:
        if e.code != 404:
            return False, None, f"GET {e.code}"
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers=UA, method="PUT")
    try:
        r = json.load(urllib.request.urlopen(req, timeout=30))
        return True, r.get("content", {}).get("sha"), "OK"
    except urllib.error.HTTPError as e:
        return False, None, f"PUT {e.code}"
    except Exception as e:
        return False, None, f"PUT {type(e).__name__}"

def renorm(b):
    s = sum(b.values()) or 1.0
    return {k: round(v / s, 4) for k, v in b.items()}

def mutasi(bobot, sinyal):
    """Mutasi kecil-berarah: akurasi turun -> diversifikasi (perkuat dimensi terendah);
    brier tinggi -> perkuat 'tekanan'&'perubahan' (reaksi mikro)."""
    b = dict(bobot)
    ak, br = sinyal["akurasi"], sinyal["brier"]
    langkah = 0.004 if ak < 40 else 0.002
    if br >= 0.28:
        for k in ("tekanan", "perubahan"):
            if k in b: b[k] += langkah
        if "struktur" in b: b["struktur"] -= langkah
    elif ak < 40:
        terendah = min(b, key=b.get)
        b[terendah] += langkah * 2
        tertinggi = max(b, key=b.get)
        b[tertinggi] -= langkah
    else:
        tertinggi = max(b, key=b.get)
        b[tertinggi] += langkah
    return renorm(b)

def main():
    now = time.time()
    genome = muat(f"{BASE}/data/remote_genome.json", {}) or {}
    denyut = muat(f"{BASE}/data/remote_denyut.json", {}) or {}
    sinyal = {
        "akurasi": float(denyut.get("akurasiPct", 40.0)),
        "brier": float(denyut.get("brier", 0.28)),
        "breadth": float(denyut.get("breadth", 50.0)),
        "siklus": int(denyut.get("siklus", 0)),
        "kompas": denyut.get("kompas", "?"),
        "evProfit": float(denyut.get("evProfit", 0.0)),
    }
    live = {
        "sumber": "GENOM-HIDUP-v1 otak z.ai",
        "DNA_asal": "remote_genome.json (Micaprofita- beku)",
        "diperbarui": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z",
        "epoch_hidup": time.strftime("%Y-%m-%d", time.gmtime()),
        "sinyal": sinyal,
        "arah": {},
        "mutasi": {},
    }
    for arah in ("NAIK", "TURUN"):
        g = genome.get(arah)
        if not g or "bobot" not in g:
            continue
        baru = mutasi(g["bobot"], sinyal)
        gen = int(g.get("generasi", 0)) + 1
        belajar = int(g.get("belajar", 0)) + 1
        live["arah"][arah] = {"bobot": baru, "generasi": gen, "belajar": belajar,
                              "diperbarui": live["diperbarui"]}
        live["mutasi"][arah] = {k: round(baru[k] - g["bobot"].get(k, 0.0), 4) for k in baru}
    if not live["arah"]:
        print("GENOME_KOSONG: remote_genome tidak terbaca")
        return 1
    # riwayat lokal (maks 200)
    rp = f"{BASE}/data/genome_live_riwayat.jsonl"
    try:
        hist = open(rp).read().splitlines()[-199:]
    except Exception:
        hist = []
    hist.append(json.dumps({"t": int(now), "gen": live["arah"]["NAIK"]["generasi"],
                            "ak": sinyal["akurasi"], "br": sinyal["brier"]}))
    open(rp, "w").write("\n".join(hist) + "\n")
    isi = json.dumps(live, ensure_ascii=False, indent=1).encode()
    json.dump(live, open(f"{BASE}/data/genome_live.json", "w"), ensure_ascii=False, indent=1)
    ok, sha, st = commit_repo("benteng/genome_live.json", isi,
        f"GENOM-HIDUP v1: gen {live['arah']['NAIK']['generasi']} akurasi {sinyal['akurasi']}% brier {sinyal['brier']} (otak z.ai)")
    print(f"GENOM-HIDUP: gen={live['arah']['NAIK']['generasi']} diperbarui={live['diperbarui']} commit={st} sha={(sha or '')[:10]}")
    print(f"SINYAL: akurasi={sinyal['akurasi']}% brier={sinyal['brier']} breadth={sinyal['breadth']} kompas={sinyal['kompas']}")
    print("MUTASI:", json.dumps(live["mutasi"]))
    return 0 if ok else 2

if __name__ == "__main__":
    raise SystemExit(main())
