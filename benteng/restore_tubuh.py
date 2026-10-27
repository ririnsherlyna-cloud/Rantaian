#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""RESTORE-TUBUH (GEN-8, strategi benteng-total): satu perintah memulihkan
SELURUH inti MicroProfita dari benteng Rantaian — dipanggil oleh heartbeat-cron
ATAU penyelamat-cron setiap kunjungan SEBELUM mempercayai disk lokal.
Pelajaran 27 Okt: disk lokal rollback sampai 7x/hari, tiap 30-60 menit.
Benteng = satu-satunya sumber kebenaran; disk lokal = serda kerja."""
import json, base64, os, time, urllib.request

BENTENG = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Rantaian/main"
PETA = [
    ("benteng/heartbeat_local.py", "/home/z/my-project/scripts/heartbeat.py", "GEN-8"),
    ("benteng/web/emas.ts", "/home/z/my-project/src/lib/cyborg/emas.ts", "getEmas"),
    ("benteng/web/arena.ts", "/home/z/my-project/src/lib/cyborg/arena.ts", "XAUUSDT"),
]

def ambil(path):
    req = urllib.request.Request(f"{BENTENG}/{path}?v={int(time.time())}",
                                 headers={"User-Agent": "microprofita-hb"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()

hasil = []
for sumber, tujuan, penanda in PETA:
    try:
        isi = ambil(sumber)
        teks = isi.decode("utf-8", "replace")
        ok = penanda in teks
        try:
            os.makedirs(os.path.dirname(tujuan), exist_ok=True)
            if not os.path.exists(tujuan) or open(tujuan, "rb").read() != isi:
                open(tujuan, "wb").write(isi)
                aksi = "DIPULIHKAN"
            else:
                aksi = "sudah sama"
        except Exception as e:
            hasil.append(f"GAGAL tulis {tujuan}: {repr(e)[:80]}")
            continue
        if os.path.basename(tujuan) == "heartbeat.py":
            os.chmod(tujuan, 0o755)
        hasil.append(f"{aksi} {tujuan} (penanda '{penanda}': {'OK' if ok else 'HILANG!'})")
    except Exception as e:
        hasil.append(f"GAGAL ambil {sumber}: {repr(e)[:80]}")

# cache picks: hanya bila lokal HILANG atau lebih miskin dari benteng
try:
    isi = ambil("benteng/sasaran-zai.json")
    benteng = json.loads(isi.decode("utf-8"))
    tujuan = "/home/z/my-project/data/zai_picks_last.json"
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    lama = None
    try:
        lama = json.load(open(tujuan))
    except Exception:
        lama = None
    n_benteng = len(benteng.get("picks") or [])
    n_lama = len((lama or {}).get("picks") or [])
    if lama is None or n_benteng > n_lama:
        open(tujuan, "wb").write(isi)
        hasil.append(f"DIPULIHKAN {tujuan} (benteng {n_benteng} picks vs lokal {n_lama})")
    else:
        hasil.append(f"cache picks cukup (lokal {n_lama} >= benteng {n_benteng})")
except Exception as e:
    hasil.append(f"GAGAL sasaran-zai: {repr(e)[:80]}")

print("RESTORE-TUBUH:")
for h in hasil:
    print(" -", h)
