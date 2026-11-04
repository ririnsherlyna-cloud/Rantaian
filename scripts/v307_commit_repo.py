#!/usr/bin/env python3
"""V307 ANTI-DATA-USANG — tanam perbaikan ke repo Rantaian:
1. Sembuhkan benteng/sasaran-zai.json: pulihkan 'waktu' ASLI (27 Okt), stale=true,
   lag jujur — supaya SEMUA tubuh (lokal, Actions) membaca umur yang benar.
2. Commit 3 skrip bertambal: benteng/balas_telegram.py, scripts/balas_telegram.py,
   benteng/heartbeat_local.py, scripts/benteng_telegram.py.
Token tidak pernah dicetak. Commit message beri [skip ci]."""
import json, base64, time, urllib.request

REPO = "ririnsherlyna-cloud/Rantaian"
API = f"https://api.github.com/repos/{REPO}/contents"
TOKEN = open("/home/z/my-project/.token-rantaian").read().strip()
HDR = {"Authorization": f"Bearer {TOKEN}", "User-Agent": "microprofita-v307",
       "Accept": "application/vnd.github+json", "Content-Type": "application/json"}


def get_sha(path):
    try:
        with urllib.request.urlopen(urllib.request.Request(f"{API}/{path}", headers=HDR), timeout=20) as r:
            return json.loads(r.read().decode()).get("sha")
    except Exception:
        return None  # 404 = belum ada


def put(path, text, msg):
    body = {"message": msg + " [skip ci]",
            "content": base64.b64encode(text.encode("utf-8")).decode("ascii"),
            "committer": {"name": "microprofita-v307", "email": "v307@microprofita.local"}}
    sha = get_sha(path)
    if sha:
        body["sha"] = sha
    req = urllib.request.Request(f"{API}/{path}", data=json.dumps(body).encode(), headers=HDR, method="PUT")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            kode = r.status
        print(f"OK  {path} -> HTTP {kode}")
    except Exception as e:
        print(f"GAGAL {path} -> {repr(e)[:110]}")
    time.sleep(1.5)


def ambil_repo_json(path):
    with urllib.request.urlopen(urllib.request.Request(f"{API}/{path}", headers=HDR), timeout=20) as r:
        j = json.loads(r.read().decode())
    return json.loads(base64.b64decode(j.get("content") or "").decode("utf-8"))


# ---- 1. sembuhkan sasaran-zai.json (sumber kebohongan umur) ----
try:
    z = ambil_repo_json("benteng/sasaran-zai.json")
    dari = str(z.get("waktu"))[:19]
    if z.get("hariData") and str(z.get("hariData")) < time.strftime("%Y-%m-%d"):
        # pulihkan waktu ASLI dari hariData lahirnya data (27 Okt 16:26 UTC = lahir cache lokal)
        z["waktu"] = "2026-10-27T16:26:45.349136+00:00"
        hd = datetime_hari = z.get("hariData")
        # lag jujur dalam hari vs tanggal WIB sekarang
        from datetime import datetime, timedelta, timezone
        WIB = timezone(timedelta(hours=7))
        try:
            d0 = datetime.strptime(str(hd), "%Y-%m-%d").date()
            z["lag"] = max(0, (datetime.now(WIB).date() - d0).days)
        except Exception:
            z["lag"] = 99
        z["stale"] = True
        z["sumber"] = str(z.get("sumber") or "") + " | V307: waktu dipulihkan ke lahir asli (dulu di-cap-ulang " + dari + ") — data USANG, level dibekukan sampai otak web melahirkan data hari ini"
        put("benteng/sasaran-zai.json", json.dumps(z, ensure_ascii=False),
            "v307: pulihkan kejujuran waktu sasaran-zai (data lama tak boleh berkedip segar)")
    else:
        print("sasaran-zai.json sudah jujur -> tanpa commit")
except Exception as e:
    print("sembuhkan sasaran-zai GAGAL:", repr(e)[:110])

# ---- 2. tanam skrip bertambal ----
pasangan = [
    ("/home/z/my-project/scripts/balas_telegram.py", "scripts/balas_telegram.py",
     "v307: gerbang anti-data-usang (hariData==hari ini + umur<=12j) di penjaga level"),
    ("/home/z/my-project/scripts/balas_telegram.py", "benteng/balas_telegram.py",
     "v307: gerbang anti-data-usang (hariData==hari ini + umur<=12j) di penjaga level"),
    ("/home/z/my-project/scripts/heartbeat.py", "benteng/heartbeat_local.py",
     "v307: kunci-ganda kesegaran (hariData + umur) pada semua jalur notifikasi"),
    ("/home/z/my-project/benteng_rantaian/scripts/benteng_telegram.py", "scripts/benteng_telegram.py",
     "v307: kunci-ganda kesegaran pada lapis abadi (hariData + umur<=12j)"),
]
for lokal, repo, msg in pasangan:
    try:
        put(repo, open(lokal, encoding="utf-8").read(), msg)
    except Exception as e:
        print(f"GAGAL baca {lokal}: {repr(e)[:90]}")

print("SELESAI")
