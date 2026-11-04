#!/usr/bin/env python3
"""SEGARKAN DATA REMOTE — pipa anti-jadul (FIX kebocoran data usang).

Masalah: heartbeat.py lama mengambil genome/denyut/sasaran lewat
raw.githubusercontent.com — CDN raw menyajikan SNAPSHOT USANG untuk repo
yang berdenyut tiap 15 menit, sehingga laporan Telegram berisi data jadul.

Solusi: ambil lewat GitHub Contents/Blob API (object store repo — selalu
versi commit terbaru), pakai .token-rantaian. Token tidak pernah dicetak.
Output: data/remote_genome.json, data/remote_denyut.json, data/remote_sasaran.json
"""
import base64
import json
import os
import sys
import time
import urllib.request

REPO = "ririnsherlyna-cloud/Micaprofita-"
API = f"https://api.github.com/repos/{REPO}"
DATA = "/home/z/my-project/data"
TOK_FILE = "/home/z/my-project/.token-rantaian"

SASARAN_KANDIDAT = [
    "otak/sasaran-server.json",
    "laporan/sasaran-server.json",
    "otak/sasaran.json",
]


def get(url, timeout=30):
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + open(TOK_FILE).read().strip(),
            "Accept": "application/vnd.github+json",
            "User-Agent": "microprofita-segarkan",
        },
    )
    return urllib.request.urlopen(req, timeout=timeout)


def ambil_file(jalur):
    """Ambil isi file via Contents API; file >1MB otomatis lewat Blob API."""
    try:
        d = json.load(get(f"{API}/contents/{jalur}?ref=main"))
        if d.get("content") is not None:
            return base64.b64decode(d["content"]), d.get("size", 0)
        # file besar -> blob API (base64 murni)
        b = json.load(get(f"{API}/git/blobs/{d['sha']}"))
        return base64.b64decode(b["content"]), d.get("size", 0)
    except Exception as e:
        print(f"  GAGAL {jalur}: {type(e).__name__}: {e}")
        return None, 0


def simpan(path, objek):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(objek, f, ensure_ascii=False)
    os.replace(tmp, path)


def main():
    hasil = {}

    # 1) DENYUT — baris terakhir laporan/denyut-server.jsonl (bisa besar)
    isi, ukuran = ambil_file("laporan/denyut-server.jsonl")
    if isi:
        lines = [l for l in isi.decode("utf-8", "replace").splitlines() if l.strip()]
        denyut = json.loads(lines[-1])
        simpan(f"{DATA}/remote_denyut.json", denyut)
        hasil["denyut"] = {
            "siklus": denyut.get("siklus"),
            "waktu": denyut.get("waktu"),
            "akurasiPct": denyut.get("akurasiPct"),
            "baris_jsonl": len(lines),
            "ukuran_byte": ukuran,
        }
        # simpan jsonl utuh sebagai arsip denyut (opsional, untuk bedah)
        with open(f"{DATA}/denyut-server_terakhir.jsonl", "wb") as f:
            f.write(isi)

    # 2) GENOME
    isi, _ = ambil_file("otak/genome-server.json")
    if isi:
        genome = json.loads(isi.decode("utf-8", "replace"))
        simpan(f"{DATA}/remote_genome.json", genome)
        cap = []
        for jalur in ("NAIK", "TURUN"):
            c = genome.get(jalur)
            if isinstance(c, dict):
                cap.append(f"{jalur} diperbarui {c.get('diperbarui', '?')} belajar {c.get('belajar', '?')}")
        hasil["genome"] = "; ".join(cap)

    # 3) SASARAN — snapshot jembatan ZAI hidup di repo Rantaian (bukan repo otak)
    try:
        import urllib.request as _u
        req = _u.Request(
            "https://api.github.com/repos/ririnsherlyna-cloud/Rantaian/contents/benteng/sasaran-zai.json?ref=main",
            headers={
                "Authorization": "Bearer " + open(TOK_FILE).read().strip(),
                "Accept": "application/vnd.github+json",
                "User-Agent": "microprofita-segarkan",
            },
        )
        d = json.load(_u.urlopen(req, timeout=30))
        obj = json.loads(base64.b64decode(d.get("content") or "").decode("utf-8", "replace"))
        simpan(f"{DATA}/remote_sasaran.json", obj)
        n = len((obj or {}).get("picks") or [])
        hasil["sasaran"] = f"benteng/sasaran-zai.json ({n} picks)"
    except Exception as e:
        print(f"  GAGAL sasaran-zai: {type(e).__name__}: {e}")

    print("SEGARKAN SELESAI:")
    for k, v in hasil.items():
        print(f"  {k}: {v}")
    if "denyut" not in hasil:
        print("  PERINGATAN: denyut gagal — jangan pakai cache lama tanpa label!")
        sys.exit(1)


if __name__ == "__main__":
    main()
