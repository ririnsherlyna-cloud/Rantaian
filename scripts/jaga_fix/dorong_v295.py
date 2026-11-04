#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong hidup.html V295-TORSA-TORNADO (tubuh baru + istana melebar)."""
import base64, json, sys, time, urllib.request, urllib.error

TOKEN = sys.argv[1]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"
UA = "micaprofita-v295-torsa-tornado"
PESAN = ("V295 TORSA-TORNADO: mandat pemilik — mati gaya ular; tubuh kini torsa cyborg "
         "+ DUA LENGAN KARET gaya Luffy (menjangkau buku/pasar sejauh apa pun saat kerja, "
         "ilmu tersedot lewat ujung lengan) + KAKI TORNADO penyedot (3-5 lapis dari tenaga "
         "genom, makin cepat makin kencang & memanjang, partikel spiral tersedot). Genom "
         "kerja-nyata SAMA: ruas = tenaga (lapis tornado + panjang lengan), probosis = "
         "jangkauan, organ menempel anatomi di torsa & menyala saat dipakai. Istana MELEBAR: "
         "kardinal 0,30x0,22D & paviliun 0,26x0,20D + dua sayap baru — BRANKAS (kamar kebal "
         "emas berisi pointer ke artefak nyata penentu nyawa: habitat/madrasah/ingatan/"
         "nalar-biner/sasaran-terkini/keadaan/versi/brain) & GUDANG (luberan otomatis saat "
         "rak padat — ruang cadangan dibangun sebelum dibutuhkan). Uji browser 43/43 LULUS "
         "(desktop OFF+LIVE, mobile; lengan merejang 525px & grip 0px; nol ruangan bertumpuk; "
         "0 pageerror). Fungsi tak tersentuh: guru, ujian kehidupan, vena, altar, nol-storage.")

BERKAS = [("hidup.html", "/home/z/my-project/hidup_repo/hidup.html")]

def req(url, data=None, method="GET"):
    r = urllib.request.Request(url, method=method)
    r.add_header("Authorization", "Bearer " + TOKEN)
    r.add_header("Accept", "application/vnd.github+json")
    r.add_header("User-Agent", UA)
    body = json.dumps(data).encode() if data else None
    if body: r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, body) as resp:
            s = resp.read()
            return json.loads(s) if s else {}
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, "pada:", e.url, file=sys.stderr); print("BODY:", e.read()[:300], file=sys.stderr); raise

for repo_path, local in BERKAS:
    content = open(local, "rb").read()
    b64 = base64.b64encode(content).decode()
    for coba in range(5):
        try:
            old = req(API + "/contents/" + repo_path + "?ref=main"); sha = old["sha"]
            data = {"message": PESAN, "content": b64, "branch": "main", "sha": sha}
            req(API + "/contents/" + repo_path, data=data, method="PUT")
            print("PUSH OK:", repo_path, len(content), "bytes"); break
        except urllib.error.HTTPError as e:
            if e.code in (409, 422, 500, 502, 503) and coba < 4:
                time.sleep(3 + coba*3); continue
            raise
print("SEMUA FILE TERDORONG")
