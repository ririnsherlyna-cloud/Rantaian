#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ambil data HIDUP dari repo Micaprofita- (remote): genome, denyut, workflow, telegram?"""
import json
import urllib.request
from datetime import datetime, timezone

BASE = "https://api.github.com"
RAW = "https://raw.githubusercontent.com/ririnsherlyna-cloud/Micaprofita-/main"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()


def get(url, raw=False):
    h = {"User-Agent": "microprofita-diag", "Accept": "application/vnd.github+json"}
    if not raw:
        h["Authorization"] = f"Bearer {TOKEN}"
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = r.read().decode("utf-8", "replace")
            return d if raw else json.loads(d)
    except urllib.error.HTTPError as e:
        return None


def umur(iso):
    try:
        t = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - t).total_seconds() / 3600
    except Exception:
        return None


print("=== GENOME HIDUP (remote otak/genome-server.json) ===")
g = get(f"{RAW}/otak/genome-server.json")
if g:
    terbaru, gen, belajar = None, 0, 0

    def telusur(d):
        global terbaru, gen, belajar
        if isinstance(d, dict):
            iso = d.get("diperbarui")
            if iso and (terbaru is None or umur(iso) < umur(terbaru)):
                terbaru = iso
            gen = max(gen, int(d.get("generasi") or 0))
            belajar += int(d.get("belajar") or 0)
            for v in d.values():
                telusur(v)
    telusur(g)
    print(f"terakhir tumbuh: {terbaru} ({umur(terbaru):.1f} jam lalu) | generasi maks: {gen} | total belajar: {belajar}")
else:
    print("gagal ambil")

print("\n=== DENYUT HIDUP (remote laporan/denyut-server.jsonl) ===")
raw = get(f"{RAW}/laporan/denyut-server.jsonl", raw=True)
if raw:
    lines = [l for l in raw.splitlines() if l.strip()]
    d = json.loads(lines[-1])
    print("total baris:", len(lines))
    kunci = ("dihasilkan", "waktu", "ts", "timestamp", "siklus", "versi", "protokol", "akurasi")
    print("terakhir:", json.dumps({k: d.get(k) for k in kunci if k in d}, ensure_ascii=False)[:400])
    print("kunci tersedia:", sorted(d.keys())[:25])
else:
    print("gagal ambil")

print("\n=== WORKFLOW sakti-denyut.yml REMOTE (cek Telegram) ===")
w = get(f"{RAW}/.github/workflows/sakti-denyut.yml", raw=True)
if w:
    print("panjang:", len(w), "karakter")
    for i, line in enumerate(w.splitlines()):
        low = line.lower()
        if "telegram" in low or "sendmessage" in low or "secret" in low:
            print(f"{i+1:4}: {line.strip()[:120]}")
else:
    print("gagal ambil")
