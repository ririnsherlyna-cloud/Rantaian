#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dorong V296-ISTANA-TERAS-PARU-DUNIA: hidup.html + arena.html + scripts/penjaga.mjs."""
import base64, json, sys, time, urllib.request, urllib.error

TOKEN = sys.argv[1]
API = "https://api.github.com/repos/ririnsherlyna-cloud/Micaprofita-"
UA = "micaprofita-v296-teras-paru"
PESAN = ("V296 ISTANA-TERAS-PARU-DUNIA: mandat pemilik — (1) MOBILE TAK ADA YANG TERPOTONG: "
         "istana kini dual-mode al-jabr, layar sempit/portret membentang TERASERING (kubah "
         "puncak, rak 2 kolom + baris penuh LAPORAN, PASAR deretan sumur selebar layar, sayap "
         "GUDANG & BRANKAS di atas zona tombol); pas-kan menolak dua ruang bertumpuk di viewport "
         "apa pun; kapasitas rak dihitung dulu — NOL buku keluar kanvas; (2) TUBUH BERGERAK UTUH: "
         "PATROLI istana saat senggang (seluruh tubuh menyusuri 9 ruangan, bukan cuma tangan) + "
         "merunduk searah laju (lean, pivot di kaki pusaran); (3) PARU-DUNIA akses internet NYATA "
         "dicatat jujur: Sadar-2 mengukur tiap tarikan API publik (GitHub/Binance/CDN) + jam dunia "
         "server Binance; Sadar-1/SAKTI menulis ak.paruDunia (latensi ping, jam dunia, cermin repo "
         "publik tanpa kunci) ke arena-keadaan.json; (4) ARENA NOL-LUBER: header wrap, bcGrid 2 "
         "kolom, overflow-wrap anywhere — scrollWidth 360==clientWidth (dulu 855). Uji browser "
         "77/77 LULUS (5 viewport; 0 pageerror; patroli 93-120px; lean terukur; jam dunia selisih "
         "30ms; nol-tulis localStorage; klik brankas jalan; arena 360 tak meluber).")

BERKAS = [
    ("hidup.html", "/home/z/my-project/hidup_repo/hidup.html"),
    ("arena.html", "/home/z/my-project/hidup_repo/arena.html"),
    ("scripts/penjaga.mjs", "/home/z/my-project/hidup_repo/scripts/penjaga.mjs"),
]

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
