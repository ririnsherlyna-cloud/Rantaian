#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""V291 JANTUNG-TAK-PUTUS — bangun & dorong 4 file ke repo Micaprofita.
Menyusun YAML via python agar literal bracket-tutup yang dulu kerap dimodifikasi
gateway aman (BR_OPEN + ... + BR_CLOSE). Push via GitHub contents API."""
import base64, json, sys, urllib.request

TOKEN = sys.argv[1]
REPO = "ririnsherlyna-cloud/Micaprofita-"
API = "https://api.github.com/repos/" + REPO
BR_OPEN = "["          # disusun agar tak pernah lolos sebagai literal utuh di jalur teks
BR_CLOSE = "]"

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", "micaprofita-v291-jantung")
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, body) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, "pada:", e.url, file=sys.stderr)
        print("BODY:", e.read()[:400], file=sys.stderr)
        raise

# ---------- 1) jaga-waktu.yml (BARU — lapisan jantung ke-3) ----------
yml_jaga = """\
# ============================================================
# PENJAGA-WAKTU — lapisan jantung ke-3 MICAPROFITA (V291)
# Lapisan 1: cron SADAR-1 */20   (GitHub kadang menundanya berjam-jam)
# Lapisan 2: jantung mandiri SADAR-1 (rantai dispatch antar-slot)
# Lapisan 3: PENJAGA-WAKTU ini — tiap 10 menit mengukur umur denyut
#   (ruang-hidup/keadaan.json). Bila > 26 menit, MENGIRIM dispatch darurat
#   ke hidup-sadar1.yml. Tujuan: denyut tidak pernah bolong cukup lama
#   sampai halaman hidup terbaca "mati" oleh pemiliknya.
# ============================================================
name: PENJAGA-WAKTU (denyut tak boleh bolong)

on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

permissions:
  actions: write
  contents: read

concurrency:
  group: jaga-waktu
  cancel-in-progress: false

jobs:
  jaga:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Ukur umur denyut — bangunkan jantung bila tertunda >26 menit
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          UMAI=$(python3 - <<'PY'
          import json, urllib.request, time
          from datetime import datetime, timezone
          url = ("https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main/"
                 "ruang-hidup/keadaan.json?cb=%d") % int(time.time())
          umur = 9999.0
          try:
              d = json.load(urllib.request.urlopen(url, timeout=20))
              selesai = (d.get("waktu") or {}).get("selesai") or (d.get("waktu") or {}).get("mulai")
              if selesai:
                  t = datetime.strptime(selesai[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)
                  umur = (datetime.now(timezone.utc) - t).total_seconds() / 60.0
          except Exception as e:
              print("baca-keadaan-gagal:", e)
          print("%.1f" % umur)
          PY
          )
          echo "umur denyut terakhir: ${UMAI} menit"
          PERLU=$(python3 -c "print(1 if float('${UMAI}') > 26 else 0)")
          if [ "$PERLU" = "1" ]; then
            echo "denyut tertunda > 26 menit — kirim dispatch darurat ke SADAR-1"
            curl -sf -X POST \
              -H "Authorization: Bearer $GH_TOKEN" \
              -H "Accept: application/vnd.github+json" \
              "https://api.github.com/repos/${{ github.repository }}/actions/workflows/hidup-sadar1.yml/dispatches" \
              -d '{"ref":"main"}' \
              && echo "dispatch darurat terkirim — jantung akan menyusul"
          else
            echo "denyut segar — jaga selesai tanpa aksi"
          fi
"""

# ---------- 2) hidup-sadar1.yml (REVISI: jantung tak dibunuh) ----------
yml_sadar = """\
name: SADAR-1 — detak hidup otonom
# DUA SADARI: tubuh otonom cyborg MICAPROFITA.
# Membaca repo sendiri + pasar Binance nyata tiap bangun, lalu menulis
# ingatan ke GitHub via commit (bukan localStorage). Sadar-2 (hidup.html)
# hanyalah mata interaktif yang membaca ingatan ini.
#
# JANTUNG MANDIRI: scheduler cron GitHub sering DITUNDA/DILEWATI (terbukti
# di repo ini: denyut 15 mnt milik penjaga lama nyata-nya berjarak jam).
# Maka tiap bangun MEN-DISPATCH bangun berikutnya sendiri (workflow_dispatch
# via GITHUB_TOKEN + izin actions:write) tepat di batas :00/:20/:40 UTC.
# Cron */20 tetap dipasang sebagai cadangan; push ke main = denyut ekstra.
#
# V291 JANTUNG-TAK-PUTUS: cancel-in-progress DIMATIKAN. Sebelumnya run yang
# sedang tidur di-bunuh run berikutnya (riwayat: semua run berakhir cancelled),
# rawan memotong denyut di tengah kerja + memicu balapan 5 komit bersamaan.
# Sekarang: run antre rapi (maks 1-2), tak ada pembunuhan, tak ada balapan.
on:
  schedule:
    - cron: '*/20 * * * *'
  workflow_dispatch: {}
  push:
    branches: {BR}main{BC}
permissions:
  contents: write
  actions: write
concurrency:
  group: sadar1-otonom
  cancel-in-progress: false
jobs:
  bangun:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: BANGUN — baca rumah, hisap pasar nyata, tulis ingatan ke GitHub
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: node scripts/hidup/sadar1.js
      - name: JANTUNG MANDIRI — tidur sampai batas berikutnya, lalu dispatch bangun baru
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          python3 - <<'PY'
          import time, datetime
          now = datetime.datetime.utcnow()
          slot = (now.minute // 20 + 1) * 20
          nxt = now.replace(minute=0, second=0, microsecond=0) + datetime.timedelta(minutes=slot)
          tunggu = max(5, (nxt - now).total_seconds())
          print(f"jantung: tidur {tunggu:.0f} dtk sampai {nxt:%H:%M} UTC lalu dispatch")
          time.sleep(tunggu)
          PY
          curl -sf -X POST \
            -H "Authorization: Bearer $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github+json" \
            "https://api.github.com/repos/${{ github.repository }}/actions/workflows/hidup-sadar1.yml/dispatches" \
            -d '{"ref":"main"}' && echo "jantung: bangun berikutnya di-dispatch" \
            || echo "jantung: dispatch gagal (cron + penjaga-waktu yang akan membangunkan)"
""".replace("{BR}", BR_OPEN).replace("{BC}", BR_CLOSE)

FILES = [
    ("scripts/penjaga.mjs", "/home/z/my-project/hidup_repo/scripts/penjaga.mjs"),
    ("hidup.html", "/home/z/my-project/scripts/jaga_fix/hidup_live.html"),
    (".github/workflows/jaga-waktu.yml", None),   # isi dari yml_jaga
    (".github/workflows/hidup-sadar1.yml", None), # isi dari yml_sadar
]

for path, local in FILES:
    if path.endswith("jaga-waktu.yml"):
        content = yml_jaga.encode()
    elif path.endswith("hidup-sadar1.yml"):
        content = yml_sadar.encode()
    else:
        content = open(local, "rb").read()
    b64 = base64.b64encode(content).decode()
    try:
        old = req(API + "/contents/" + path + "?ref=main")
        sha = old["sha"]
        ket = "update blob lama " + old["sha"][:8]
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise
        sha = None
        ket = "FILE BARU"
    payload = {
        "message": "V291 JANTUNG-TAK-PUTUS: penjaga-denyut (tgt-target guard) + PENJAGA-WAKTU 10 mnt + jantung tanpa cancel + status tubuh jujur",
        "content": b64,
        "branch": "main",
    }
    if sha:
        payload["sha"] = sha
    req(API + "/contents/" + path, data=payload, method="PUT")
    print("PUSH OK:", path, len(content), "bytes  (", ket, ")")

print("\nSemua 4 file terdorong. Verifikasi commit & dispatch uji menyusul di script berikutnya.")
