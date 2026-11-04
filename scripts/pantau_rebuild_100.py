#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pantau rebuild 100 koin: poll arena API sampai MICAPROFITA >= 90 picks
atau batas waktu. Cetak progres bootstrap tiap poll."""
import json
import time
import urllib.request

BATAS = 420  # 7 menit
MULAI = time.time()
coba = 0
while time.time() - MULAI < BATAS:
    coba += 1
    try:
        with urllib.request.urlopen(urllib.request.Request(
                "http://localhost:3000/api/arena",
                headers={"User-Agent": "microprofita-hb"}), timeout=20) as r:
            j = json.loads(r.read().decode())
        tp = j.get("todayPicks") or []
        mine = [p for p in tp if p.get("competitor") == "MICAPROFITA"]
        bs = j.get("bootstrap") or {}
        print(f"poll#{coba} {time.strftime('%H:%M:%S')} MICAPROFITA={len(mine)} "
              f"bootstrap={bs.get('status')}/{bs.get('progress')} "
              f"err={bs.get('error') or '-'}", flush=True)
        if len(mine) >= 90:
            print("REBUILD-100: BERHASIL ->", len(mine), "picks")
            break
    except Exception as e:
        print(f"poll#{coba} gagal: {repr(e)[:80]}", flush=True)
    time.sleep(25)
else:
    print("REBUILD-100: belum selesai dalam batas waktu (bootstrap mungkin masih memproses)")
