#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
V358 GERBANG-ANTRE — deploy penjaga.mjs terpatch ke repo Micaprofita-.

AKAR GENOME BEKU 16 HARI (2026-10-12 -> 10-28), terbukti angka:
  Gerbang evolusi genome lama mensyaratkan >= 3 vonis matang dinilai DALAM
  SATU denyut. Sejak V269 SLOT-PENELITI, kunci dirancang 1/denyut (drip-feed)
  -> kematangan juga 1/siklus -> gerbang organik tak pernah menyala; hanya
  batch backfill (terakhir 2026-10-12T13:49, 63-64 vonis) yang pernah
  menyalakannya. Setelah backfill berhenti -> genome beku selamanya.

ISI PATCH (scripts/tmp/penjaga_micaprofita.mjs, node --check OK):
  1. GERBANG-ANTRE: vonis matang diakumulasikan lintas denyut pada
     semuaGenome.antreBelajar (persist di otak/genome-server.json, batas 24);
     antrean >= 3 -> evolusi dari seluruh batch, antrean dikosongkan.
     Menetes pun tumbuh (tiap +-3 siklus), banjir pun tumbuh sekali jalan.
  2. LANJUTAN-TARGET (mandat pemilik soal JUAL AMBISIUS / POWER MAX):
     tiap vonis matang mengukur seberapa jauh pasar jalan MELEBIHI target
     pra-registrasi (mfe/target utk BUY; target/mfe-low utk SELL); agregat
     disegel di ilmu.lanjutTarget -> pelajaran "kena lalu melonjak" jadi
     angka, bukan klaim.

PEMAKAIAN (butuh token dengan Contents:write pada Micaprofita-):
  GH_TOKEN_MICAPROFITA=ghp_xxx python3 scripts/dorong_v358.py
  atau letakkan token di /home/z/my-project/.token-micaprofita lalu:
  python3 scripts/dorong_v358.py
Yang ditanam (3 berkas, satu per komit):
  1. scripts/penjaga.mjs              <- tubuh jantung terpatch
  2. imun/cadangan/scripts_penjaga_mjs<- cadangan imun disamakan (H3)
  3. imun/manifes.json                <- hash/size entri penjaga.mjs diperbarui
Lalu memancing denyut pertama (workflow_dispatch sakti-denyut.yml).
"""
import base64
import io
import json
import hashlib
import os
import sys
import time
import urllib.request

REPO = "ririnsherlyna-cloud/Micaprofita-"
API = f"https://api.github.com/repos/{REPO}/contents/"
LOKAL_PENJAGA = "/home/z/my-project/scripts/tmp/penjaga_micaprofita.mjs"

PESAN_UTAMA = (
    "V358 GERBANG-ANTRE + LANJUTAN-TARGET — mandat pemilik 2026-10-28\n\n"
    "(1) Akar genome beku 16 hari: gerbang evolusi mensyaratkan >=3 vonis dinilai "
    "DALAM SATU denyut; sejak V269 slot-peneliti kunci 1/denyut sehingga kematangan "
    "menetes 1/siklus — gerbang organik tak pernah menyala (siklus >=3 terakhir "
    "2026-10-12T13:49, persis saat genome membeku). Kini belajar DIAKUMULASI lintas "
    "denyut: antrean persist di otak/genome-server.json (batas 24); antrean >=3 -> "
    "evolusi dari seluruh batch lalu antrean dikosongkan. Menetes pun tumbuh, banjir "
    "pun tumbuh. Matematika bobot tak berubah.\n"
    "(2) LANJUTAN-TARGET: tiap vonis matang mengukur seberapa jauh pasar jalan melebihi "
    "target pra-registrasi (mfe/target utk BUY, target/mfe-low utk SELL); agregat "
    "ilmu.lanjutTarget — pelajaran pemilik 'jual ambisius & power max sering kena lalu "
    "pasar melonjak melebihi ekspektasi' kini angka terukur, bukan klaim."
)
PESAN_CADANGAN = "V358: cadangan imun penjaga.mjs disamakan dgn tubuh baru (H3 — ingatan kedua) [skip ci]"
PESAN_MANIFES = "V358: segel manifes imun diperbarui utk penjaga.mjs baru (hash/size) [skip ci]"


def ambil_token():
    tok = os.environ.get("GH_TOKEN_MICAPROFITA", "").strip()
    if tok:
        return tok, "env GH_TOKEN_MICAPROFITA"
    jalur = "/home/z/my-project/.token-micaprofita"
    if os.path.exists(jalur):
        tok = io.open(jalur, encoding="utf-8").read().strip()
        if tok:
            return tok, "file .token-micaprofita"
    return None, None


def req(method, url, token, payload=None, cek=True):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Authorization", f"Bearer {token}")
    r.add_header("Accept", "application/vnd.github+json")
    if data is not None:
        r.add_header("Content-Type", "application/json")
    try:
        return json.loads(urllib.request.urlopen(r, timeout=60).read().decode())
    except urllib.error.HTTPError as e:
        badan = e.read().decode()[:200]
        if cek:
            raise SystemExit(f"GAGAL {method} {url} -> HTTP {e.code}: {badan}")
        return {"error": e.code, "badan": badan}


def dorong_file(token, jalur, isi_bytes, pesan):
    info = req("GET", f"{API}{jalur}?ref=main", token, cek=False)
    sha = info.get("sha") if isinstance(info, dict) and info.get("sha") else None
    if sha and isinstance(info, dict):
        lama = base64.b64decode((info.get("content") or "").replace("\n", ""))
        if lama == isi_bytes:
            print(f"  {jalur}: sudah sama, tanpa komit")
            return "sama"
    body = {
        "message": pesan,
        "content": base64.b64encode(isi_bytes).decode(),
        "branch": "main",
    }
    if sha:
        body["sha"] = sha
    j = req("PUT", API + jalur, token, body)
    print(f"  {jalur}: OK komit {j['commit']['sha'][:10]}")
    return "dorong"


def utama():
    tok, sumber = ambil_token()
    if not tok:
        print("TOKEN MICAPROFITA TIDAK ADA.")
        print("Jalankan: GH_TOKEN_MICAPROFITA=<token> python3 scripts/dorong_v358.py")
        print("atau simpan token di /home/z/my-project/.token-micaprofita (chmod 600).")
        sys.exit(2)

    # 0. uji tulis dgn murah: baca sha penjaga.mjs
    print(f"[0] token dari {sumber} — uji akses...")
    info = req("GET", f"{API}scripts/penjaga.mjs?ref=main", tok)
    print(f"    penjaga.mjs remote: {info['size']:,} byte, sha {info['sha'][:10]}")

    # 1. tubuh jantung
    isi = open(LOKAL_PENJAGA, "rb").read()
    print(f"[1] tanam scripts/penjaga.mjs ({len(isi):,} byte)...")
    dorong_file(tok, "scripts/penjaga.mjs", isi, PESAN_UTAMA)

    # 2. cadangan imun
    print("[2] samakan imun/cadangan/scripts_penjaga_mjs...")
    dorong_file(tok, "imun/cadangan/scripts_penjaga_mjs", isi, PESAN_CADANGAN)

    # 3. manifes — ambil segar dari remote, perbarui entri penjaga.mjs
    print("[3] perbarui imun/manifes.json (hash/size baru)...")
    man_req = urllib.request.Request(f"{API}imun/manifes.json?ref=main")
    man_req.add_header("Authorization", f"Bearer {tok}")
    man_info = json.loads(urllib.request.urlopen(man_req, timeout=60).read().decode())
    man = json.loads(base64.b64decode(man_info["content"]).decode())
    h16 = hashlib.sha256(isi).hexdigest()[:16]
    entri = None
    for k in man.get("kode", []):
        if k.get("file") == "scripts/penjaga.mjs":
            entri = k
            break
    if not entri:
        raise SystemExit("GAGAL: entri kode penjaga.mjs tak ada di manifes")
    entri["hash"] = h16
    entri["size"] = len(isi)
    entri["cadanganWaktu"] = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
    man["diperbarui"] = entri["cadanganWaktu"]
    dorong_file(tok, "imun/manifes.json", json.dumps(man, indent=1, ensure_ascii=False).encode(), PESAN_MANIFES)
    print(f"    hash baru penjaga.mjs: {h16}")

    # 4. pancing denyut pertama dgn tubuh baru
    print("[4] pancing sakti-denyut (workflow_dispatch)...")
    r = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/actions/workflows/sakti-denyut.yml/dispatches",
        data=b'{"ref":"main"}', method="POST")
    r.add_header("Authorization", f"Bearer {tok}")
    r.add_header("Accept", "application/vnd.github+json")
    try:
        urllib.request.urlopen(r, timeout=30)
        print("    dispatch: HTTP 204 — denyut dipanggil")
    except urllib.error.HTTPError as e:
        print(f"    dispatch: HTTP {e.code} (biarkan — jadwal cron 7/15 tetap menjaga)")

    print("SELESAI. Genome akan berevolusi lagi setelah antrean terisi 3 vonis (±45 menit).")


if __name__ == "__main__":
    utama()
