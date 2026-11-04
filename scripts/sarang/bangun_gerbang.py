#!/usr/bin/env python3
"""
BANGUN GERBANG — menyusun public/gerbang.json (peta hidup arena wadah).
Sumber live_url (urutan prioritas):
  1) scripts/sarang/host_publik.txt  — belajar-otomatis: ditulis route
     /api/arena dari header Host saat siapa pun membuka link preview;
  2) scripts/sarang/gerbang_config.json (live_url) — isian manual.
Idempoten: hanya menulis bila substansi berubah (anti-commit-noise).
Dipanggil jantung arena tiap denyut, atau manual.
"""
import datetime
import json
import os
import urllib.request

P = "/home/z/my-project"
KELUAR = f"{P}/public/gerbang.json"
HOST_FILE = f"{P}/scripts/sarang/host_publik.txt"
KONFIG = f"{P}/scripts/sarang/gerbang_config.json"


def live_url():
    try:
        with open(HOST_FILE) as f:
            h = f.read().strip()
        if h.startswith("http"):
            return h, "belajar-otomatis-dari-header-host"
    except Exception:
        pass
    try:
        with open(KONFIG) as f:
            c = json.load(f)
        if c.get("live_url"):
            return c["live_url"], "konfig-manual"
    except Exception:
        pass
    return None, "belum-diketahui"


def arena_hidup():
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/api/arena", timeout=30) as r:
            return r.status == 200
    except Exception:
        return False


def main():
    url, sumber = live_url()
    hidup = arena_hidup()
    isi = {
        "live_url": url,
        "live_sumber": sumber,
        "arena_hidup": hidup,
        "sumber": "jantung-arena-wadah v3 (denyut 15 menit)",
        "catatan": "Halaman cermin menyambung OTOMATIS ke live_url bila arena wadah hidup; bila tidak, memakai snapshot arena-keadaan.json (juga didorong otomatis).",
    }
    lama = None
    try:
        with open(KELUAR) as f:
            lama = json.load(f)
    except Exception:
        pass
    if (
        lama
        and lama.get("live_url") == isi["live_url"]
        and lama.get("live_sumber") == isi["live_sumber"]
        and lama.get("arena_hidup") == isi["arena_hidup"]
    ):
        print("gerbang: sama — tanpa tulis")
        return
    isi["diperbarui_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    tmp = KELUAR + ".tmp"
    with open(tmp, "w") as f:
        json.dump(isi, f, ensure_ascii=False, indent=1)
    os.replace(tmp, KELUAR)
    print(f"gerbang: ditulis (live_url={url or 'null'}, hidup={hidup}, sumber={sumber})")


if __name__ == "__main__":
    main()
