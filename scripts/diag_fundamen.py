#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Diagnosa gerbang fundamental v10.4: sebab penolakan 30 finalis ATH."""
import sys, os, json, time, urllib.request, urllib.parse
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, "/home/z/my-project/scripts")
os.chdir("/home/z/my-project")
import balas_telegram as bt

PAP = bt.PAPRIKA_81
req = urllib.request.Request(f"{PAP}/tickers?limit=500&start=0", headers={"User-Agent": "benteng-balas"})
arr = json.loads(urllib.request.urlopen(req, timeout=25).read().decode())
id_pap = {}
dataA = {}
for x in arr:
    s = str(x.get("symbol") or "").split("-")[0].upper()
    if s and s not in id_pap and x.get("id"):
        id_pap[s] = str(x.get("id"))
    if not s or s in dataA:
        continue
    usd = (x.get("quotes") or {}).get("USD") or {}
    if usd:
        d = None if usd.get("percent_from_price_ath") is None else -float(usd.get("percent_from_price_ath"))
        dataA[s] = {"price": usd.get("price"), "ath": usd.get("ath_price"), "drop": d,
                    "vol": float(usd.get("volume_24h") or 0)}
kand = [(s, e["vol"]) for s, e in dataA.items() if e["drop"] is not None and 80 <= e["drop"] <= 100 and e["vol"] >= 10000]
kand.sort(key=lambda t: -t[1])
print("kandidat paprika hidup-vol:", len(kand), "| finalis:", [s for s, _ in kand[:30]])

GT = ""
try:
    GT = open("/home/z/my-project/.token-rantaian").read().strip()
except Exception:
    pass

def cek(s):
    cid = id_pap.get(s)
    if not cid:
        return s, "ID_TAK_KETEMU", ""
    try:
        c = json.loads(urllib.request.urlopen(urllib.request.Request(
            f"{PAP}/coins/{cid}", headers={"User-Agent": "benteng-balas"}), timeout=15).read().decode())
    except Exception as e:
        return s, "PAPRIKA_GAGAL", repr(e)[:40]
    tags = [str((t or {}).get("id", "")) + str((t or {}).get("name", "")) for t in (c.get("tags") or [])]
    if any("meme" in t.lower() for t in tags):
        return s, "MEME", ",".join(t for t in tags if "meme" in t.lower())[:40]
    if c.get("is_active") is False:
        return s, "TAK_AKTIF", ""
    urls = c.get("urls") or {}
    repo = None
    for k in ("source_code", "technical_doc"):
        for u in (urls.get(k) or []):
            if "github.com" in str(u):
                repo = "/".join(str(u).rstrip("/").replace("https://github.com/", "").split("/")[:2])
                break
        if repo:
            break
    if not repo:
        return s, "TANPA_REPO", str(list(urls.keys()))[:40]
    hdr = {"User-Agent": "benteng-balas"}
    if GT:
        hdr["Authorization"] = f"Bearer {GT}"
    try:
        rj = json.loads(urllib.request.urlopen(urllib.request.Request(
            f"https://api.github.com/repos/{repo}", headers=hdr), timeout=15).read().decode())
    except Exception as e:
        return s, "REPO_GAGAL", repo + " " + repr(e)[:40]
    if rj.get("archived"):
        return s, "REPO_ARSIP", repo
    pushed = str(rj.get("pushed_at") or "")
    try:
        t1 = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
        up = (datetime.now(timezone.utc) - t1).days
    except Exception:
        return s, "PUSH_TAK_TERBACA", repo
    if up > 400:
        return s, "TIM_PASIF", f"{repo} {up}h"
    return s, "LOLOS", f"{repo} {up}h"

with ThreadPoolExecutor(max_workers=6) as ex:
    for s, status, ket in ex.map(cek, [x for x, _ in kand[:30]]):
        print(f"{s:12s} {status:16s} {ket}")
